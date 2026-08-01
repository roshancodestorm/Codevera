import { Router } from 'express';
import { query } from './db.js';

const router = Router();

function normalizeChatBaseUrl(rawBaseUrl = '') {
  let baseUrl = String(rawBaseUrl || '').trim();
  if (!baseUrl) return '';
  if (baseUrl.includes('localhost:11434') && !baseUrl.includes('/v1') && !baseUrl.includes('/api/')) {
    baseUrl = baseUrl.endsWith('/') ? baseUrl + 'v1' : baseUrl + '/v1';
  }
  return baseUrl.replace(/\/+$/, '');
}

async function testModel(model) {
  const baseUrl = normalizeChatBaseUrl(model.base_url || model.baseUrl);
  if (!baseUrl) return { ok: false, error: 'Missing base URL', latencyMs: 0 };
  const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const started = Date.now();
  try {
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = model.api_key || model.apiKey;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(model.timeout_ms || 20000));
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: model.model_id || model.modelId, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 64, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error?.message || data.message || `HTTP ${response.status}`, latencyMs, status: response.status };
    }
    const choice = data.choices?.[0];
    let content = (choice?.message?.content || '').trim();
    if (!content) content = (choice?.message?.reasoning_content || '').trim();
    return { ok: true, latencyMs, status: response.status, content: content.slice(0, 60), finish_reason: choice?.finish_reason, supports_reasoning: !!choice?.message?.reasoning_content };
  } catch (err) {
    return { ok: false, error: String(err.message || err), latencyMs: Date.now() - started };
  }
}

router.post('/models/test', async (req, res) => {
  const body = req.body || {};
  try {
    let model = body;
    if (body.id) {
      const { rows } = await query('SELECT * FROM models WHERE id = $1', [body.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Model not found' });
      model = rows[0];
    }
    const result = await testModel(model);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/models/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query('SELECT * FROM models WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Model not found' });
    const m = rows[0];
    const newId = `${m.id}-copy-${Date.now()}`;
    await query(`
      INSERT INTO models (id, name, provider, model_id, base_url, api_key, api_protocol, is_active, description, group_name,
        organization_id, project_id, headers, custom_params, temperature, top_p, top_k, max_tokens, context_window,
        timeout_ms, supports_streaming, supports_vision, supports_function_calling, supports_reasoning, supports_json,
        supports_embeddings, supports_image_generation, supports_speech, env_var_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
    `, [newId, `${m.name} (copy)`, m.provider, m.model_id, m.base_url, m.api_key, m.api_protocol || 'OpenAI',
      m.description, m.group_name, m.organization_id, m.project_id, m.headers, m.custom_params, m.temperature,
      m.top_p, m.top_k, m.max_tokens, m.context_window, m.timeout_ms, m.supports_streaming, m.supports_vision,
      m.supports_function_calling, m.supports_reasoning, m.supports_json, m.supports_embeddings,
      m.supports_image_generation, m.supports_speech, m.env_var_name]);
    res.json({ success: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/models/export-config', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM models ORDER BY created_at DESC');
    const activeRow = rows.find((r) => r.is_active);
    const safe = rows.map(({ api_key, ...rest }) => rest);
    res.json({ exportedAt: new Date().toISOString(), activeModelId: activeRow?.id || null, models: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/models/import-config', async (req, res) => {
  const { models, activeModelId } = req.body || {};
  if (!Array.isArray(models)) return res.status(400).json({ error: 'models array required' });
  try {
    let imported = 0;
    for (const m of models) {
      const id = m.id || `imported-${Date.now()}-${imported}`;
      await query(`
        INSERT INTO models (id, name, provider, model_id, base_url, api_key, api_protocol, is_active, description,
          max_tokens, context_window, timeout_ms, supports_streaming, supports_vision, supports_function_calling,
          supports_reasoning, supports_json, supports_embeddings, supports_image_generation, supports_speech)
        VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, model_id=EXCLUDED.model_id, base_url=EXCLUDED.base_url,
          api_key=EXCLUDED.api_key, provider=EXCLUDED.provider
      `, [id, m.name, m.provider || 'Custom', m.model_id || m.modelId, m.base_url || m.baseUrl || '', m.api_key || '',
        m.api_protocol || 'OpenAI', m.description || null, m.max_tokens || 4096, m.context_window || 8192,
        m.timeout_ms || 120000, m.supports_streaming !== false, !!m.supports_vision, !!m.supports_function_calling,
        !!m.supports_reasoning, m.supports_json !== false, !!m.supports_embeddings, !!m.supports_image_generation,
        !!m.supports_speech]);
      imported++;
    }
    if (activeModelId) {
      await query('UPDATE models SET is_active = false');
      await query('UPDATE models SET is_active = true WHERE id = $1', [activeModelId]);
    }
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/model-marketplace', (req, res) => {
  const templates = [
    { id: 'openai-gpt4o-mini', name: 'OpenAI GPT-4o mini', provider: 'OpenAI', modelId: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', capabilities: ['chat', 'coding', 'json', 'function-calling', 'vision'], description: 'Fast, cheap general model' },
    { id: 'openai-gpt4o', name: 'OpenAI GPT-4o', provider: 'OpenAI', modelId: 'gpt-4o', baseUrl: 'https://api.openai.com/v1', capabilities: ['chat', 'coding', 'json', 'function-calling', 'vision', 'reasoning'], description: 'Flagship multimodal model' },
    { id: 'anthropic-claude', name: 'Anthropic Claude 3.5 Sonnet', provider: 'Anthropic', modelId: 'claude-3-5-sonnet-20241022', baseUrl: 'https://api.anthropic.com/v1', capabilities: ['chat', 'coding', 'json', 'function-calling', 'reasoning', 'long-context'], description: 'Excellent coding + reasoning' },
    { id: 'google-gemini-flash', name: 'Google Gemini 2.0 Flash', provider: 'Gemini', modelId: 'gemini-2.0-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', capabilities: ['chat', 'coding', 'json', 'vision', 'fast'], description: 'Fast, free tier available' },
    { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', modelId: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', capabilities: ['chat', 'coding', 'reasoning', 'long-context'], description: 'Very cheap, strong coding' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', modelId: 'deepseek-reasoner', baseUrl: 'https://api.deepseek.com/v1', capabilities: ['chat', 'reasoning'], description: 'Deep reasoning model' },
    { id: 'qwen-coder', name: 'Qwen2.5 Coder', provider: 'Qwen', modelId: 'qwen2.5-coder-32b', baseUrl: 'https://api.together.xyz/v1', capabilities: ['chat', 'coding'], description: 'Open coding model' },
    { id: 'groq-llama', name: 'Llama 3.3 70B (Groq)', provider: 'Groq', modelId: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1', capabilities: ['chat', 'fast', 'json'], description: 'Extremely fast inference' },
    { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', modelId: 'mistral-large-latest', baseUrl: 'https://api.mistral.ai/v1', capabilities: ['chat', 'coding', 'function-calling'], description: 'EU-based provider' },
    { id: 'openrouter-auto', name: 'OpenRouter Auto', provider: 'OpenRouter', modelId: 'openrouter/auto', baseUrl: 'https://openrouter.ai/api/v1', capabilities: ['chat', 'coding', 'routing'], description: 'Routes to best available' },
    { id: 'openrouter-deepseek', name: 'DeepSeek V3 (OpenRouter)', provider: 'OpenRouter', modelId: 'deepseek/deepseek-chat', baseUrl: 'https://openrouter.ai/api/v1', capabilities: ['chat', 'coding', 'cheap'], description: 'One key, many models' },
    { id: 'together-llama', name: 'Llama 3.3 (Together)', provider: 'Together AI', modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', baseUrl: 'https://api.together.xyz/v1', capabilities: ['chat', 'coding', 'long-context'], description: 'Open models on GPU cloud' },
    { id: 'fireworks-qwen', name: 'Qwen 2.5 Coder 32B (Fireworks)', provider: 'Fireworks AI', modelId: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct', baseUrl: 'https://api.fireworks.ai/inference/v1', capabilities: ['chat', 'coding'], description: 'Fast coding model' },
    { id: 'azure-gpt4o', name: 'Azure OpenAI GPT-4o', provider: 'Azure OpenAI', modelId: 'gpt-4o', baseUrl: 'https://YOUR-RESOURCE.openai.azure.com/openai/v1', capabilities: ['chat', 'coding', 'vision', 'function-calling'], description: 'Enterprise deployment' },
    { id: 'ollama-local', name: 'Ollama (Local)', provider: 'Ollama', modelId: 'qwen2.5-coder:7b', baseUrl: 'http://localhost:11434/v1', capabilities: ['chat', 'coding', 'offline'], description: 'Free local models, no internet' },
    { id: 'lmstudio-local', name: 'LM Studio (Local)', provider: 'LM Studio', modelId: 'local-model', baseUrl: 'http://localhost:1234/v1', capabilities: ['chat', 'offline'], description: 'Local server mode' },
    { id: 'vllm-local', name: 'vLLM (Local)', provider: 'vLLM', modelId: 'model-name', baseUrl: 'http://localhost:8000/v1', capabilities: ['chat', 'offline'], description: 'High-throughput local serving' },
    { id: 'litellm-proxy', name: 'LiteLLM Proxy', provider: 'LiteLLM', modelId: 'model-name', baseUrl: 'http://localhost:4000/v1', capabilities: ['chat', 'routing'], description: 'Unified proxy for all providers' },
    { id: 'aicredits-kimi', name: 'Kimi K2.5 (AI Credits)', provider: 'Custom', modelId: 'moonshotai/kimi-k2.5', baseUrl: 'https://api.aicredits.in/v1', capabilities: ['chat', 'coding', 'reasoning'], description: 'Strong coding, current default' },
  ];
  res.json(templates);
});

const DEFAULT_TASKS = ['autocomplete', 'chat', 'planning', 'coding', 'architecture', 'vision', 'embeddings', 'documentation', 'background'];

router.get('/model-routes', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM model_routes');
    const routes = {};
    for (const r of rows) routes[r.task] = r.model_id;
    const { rows: models } = await query('SELECT id, name, provider, model_id FROM models ORDER BY created_at DESC');
    res.json({ routes, tasks: DEFAULT_TASKS, models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/model-routes', async (req, res) => {
  const { routes } = req.body || {};
  if (!routes || typeof routes !== 'object') return res.status(400).json({ error: 'routes object required' });
  try {
    for (const [task, modelId] of Object.entries(routes)) {
      if (!DEFAULT_TASKS.includes(task)) continue;
      await query(`INSERT INTO model_routes (task, model_id) VALUES ($1,$2) ON CONFLICT (task) DO UPDATE SET model_id=EXCLUDED.model_id, updated_at=CURRENT_TIMESTAMP`, [task, modelId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/model-profiles', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM model_profiles ORDER BY created_at ASC');
    const { rows: routes } = await query('SELECT * FROM model_routes');
    const currentRoutes = {};
    for (const r of routes) currentRoutes[r.task] = r.model_id;
    res.json({ profiles: rows, currentRoutes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/model-profiles', async (req, res) => {
  const { name, description, config_json } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const id = `profile-${Date.now()}`;
    await query('INSERT INTO model_profiles (id, name, description, config_json) VALUES ($1,$2,$3,$4)', [id, name, description || '', JSON.stringify(config_json || {})]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/model-profiles/:id', async (req, res) => {
  const { name, description, config_json } = req.body || {};
  try {
    await query('UPDATE model_profiles SET name=$1, description=$2, config_json=$3 WHERE id=$4', [name, description || '', JSON.stringify(config_json || {}), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/model-profiles/:id', async (req, res) => {
  try {
    await query('DELETE FROM model_profiles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/model-profiles/:id/apply', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM model_profiles WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const profile = rows[0];
    const config = typeof profile.config_json === 'string' ? JSON.parse(profile.config_json) : profile.config_json;
    const routes = config.routes || {};
    for (const [task, modelId] of Object.entries(routes)) {
      if (!DEFAULT_TASKS.includes(task)) continue;
      await query(`INSERT INTO model_routes (task, model_id) VALUES ($1,$2) ON CONFLICT (task) DO UPDATE SET model_id=EXCLUDED.model_id, updated_at=CURRENT_TIMESTAMP`, [task, modelId]);
    }
    if (config.activeModelId) {
      await query('UPDATE models SET is_active = false');
      await query('UPDATE models SET is_active = true WHERE id = $1', [config.activeModelId]);
    }
    res.json({ success: true, applied: Object.keys(routes).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/model-usage', async (req, res) => {
  const days = Math.min(parseInt(req.query.days || '30'), 90);
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const totals = await query(
      `SELECT COUNT(*) AS requests, COALESCE(SUM(tokens_in + tokens_out),0) AS tokens, COALESCE(AVG(latency_ms),0) AS avg_latency, COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END),0) AS successes, COALESCE(SUM(CASE WHEN success THEN 0 ELSE 1 END),0) AS failures FROM model_usage WHERE timestamp >= $1`, [since]);
    const byProvider = await query(
      `SELECT provider, COUNT(*) AS requests, COALESCE(SUM(tokens_in + tokens_out),0) AS tokens, COALESCE(AVG(latency_ms),0) AS avg_latency FROM model_usage WHERE timestamp >= $1 GROUP BY provider ORDER BY requests DESC`, [since]);
    const byDay = await query(
      `SELECT DATE(timestamp) AS day, COUNT(*) AS requests, COALESCE(SUM(tokens_in + tokens_out),0) AS tokens FROM model_usage WHERE timestamp >= $1 GROUP BY DATE(timestamp) ORDER BY day ASC`, [since]);
    const byTask = await query(
      `SELECT task, COUNT(*) AS requests, COALESCE(SUM(CASE WHEN success THEN 0 ELSE 1 END),0) AS failures FROM model_usage WHERE timestamp >= $1 GROUP BY task ORDER BY requests DESC`, [since]);
    res.json({ days, totals: totals.rows[0], byProvider: byProvider.rows, byDay: byDay.rows, byTask: byTask.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

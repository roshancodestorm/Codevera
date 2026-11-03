import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const PORT = process.env.SD_PORT || 3001;
const CODING_MODEL = process.env.CODING_MODEL || 'qwen2.5-coder:1.5b';
const CODING_NUM_CTX = Number(process.env.CODING_NUM_CTX || 2048);
const CODING_NUM_PREDICT = Number(process.env.CODING_NUM_PREDICT || 4096);
const CODING_TEMPERATURE = Number(process.env.CODING_TEMPERATURE || 0.2);
const CODING_TOP_P = Number(process.env.CODING_TOP_P || 0.9);
const CODING_REPEAT_PENALTY = Number(process.env.CODING_REPEAT_PENALTY || 1.05);
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const COMFYUI_MODEL = process.env.COMFYUI_MODEL || 'v1-5-pruned-emaonly.safetensors';
const COMFYUI_NEGATIVE_PROMPT = process.env.COMFYUI_NEGATIVE_PROMPT || 'text, watermark, logo, blurry, low quality';

app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY =  process.env.LIVEKIT_API_KEY || '...';
const LIVEKIT_API_SECRET = const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '...';
// ── LiveKit Token Generation ─────────────────────────────────────────────────
app.post('/api/livekit-token', async (req, res) => {
  try {
    const { room = 'friday-room', identity = 'boss' } = req.body;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ token, serverUrl: 'wss://tonystark-0uveb3t9.livekit.cloud' });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Image Generation ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkComfyUIHealth = async () => {
  try {
    const response = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      system: data?.system ?? null,
      devices: data?.devices ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const createComfyWorkflow = ({ prompt, width, height, seed }) => ({
  '3': {
    inputs: {
      seed,
      steps: 20,
      cfg: 8,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
      model: ['4', 0],
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0],
    },
    class_type: 'KSampler',
  },
  '4': {
    inputs: {
      ckpt_name: COMFYUI_MODEL,
    },
    class_type: 'CheckpointLoaderSimple',
  },
  '5': {
    inputs: {
      width,
      height,
      batch_size: 1,
    },
    class_type: 'EmptyLatentImage',
  },
  '6': {
    inputs: {
      text: prompt,
      clip: ['4', 1],
    },
    class_type: 'CLIPTextEncode',
  },
  '7': {
    inputs: {
      text: COMFYUI_NEGATIVE_PROMPT,
      clip: ['4', 1],
    },
    class_type: 'CLIPTextEncode',
  },
  '8': {
    inputs: {
      samples: ['3', 0],
      vae: ['4', 2],
    },
    class_type: 'VAEDecode',
  },
  '9': {
    inputs: {
      filename_prefix: 'Jarvis',
      images: ['8', 0],
    },
    class_type: 'SaveImage',
  },
});

const queueComfyPrompt = async (workflow, clientId) => {
  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ComfyUI prompt queue failed (${response.status}): ${detail}`);
  }

  return response.json();
};

const getComfyHistory = async (promptId) => {
  const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ComfyUI history lookup failed (${response.status}): ${detail}`);
  }
  return response.json();
};

const getComfyImageBuffer = async (image) => {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || '',
    type: image.type || 'output',
  });

  const response = await fetch(`${COMFYUI_URL}/view?${params.toString()}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ComfyUI image fetch failed (${response.status}): ${detail}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const generateImageWithComfyUI = async ({ prompt, width = 512, height = 512 }) => {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const clientId = `jarvis-${crypto.randomUUID()}`;
  const workflow = createComfyWorkflow({ prompt, width, height, seed });
  const { prompt_id: promptId } = await queueComfyPrompt(workflow, clientId);
  const startedAt = Date.now();
  const timeoutMs = 180000;

  while (Date.now() - startedAt < timeoutMs) {
    const history = await getComfyHistory(promptId);
    const run = history?.[promptId];

    if (run?.outputs) {
      for (const nodeOutput of Object.values(run.outputs)) {
        if (nodeOutput?.images?.length) {
          const buffer = await getComfyImageBuffer(nodeOutput.images[0]);
          return {
            success: true,
            b64: buffer.toString('base64'),
            mimeType: 'image/png',
            prompt,
            seed,
          };
        }
      }
    }

    await sleep(1000);
  }

  throw new Error('ComfyUI generation timed out after 3 minutes');
};

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, width = 512, height = 512 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    console.log('🎨 Generating image for:', prompt);
    const result = await generateImageWithComfyUI({ prompt, width, height });
    res.json(result);
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    res.status(500).json({
      error: error.message,
      detail: `Make sure ComfyUI is running at ${COMFYUI_URL} and the checkpoint "${COMFYUI_MODEL}" exists.`,
    });
  }
});

app.get('/api/image-health', async (req, res) => {
  const health = await checkComfyUIHealth();

  if (!health.ok) {
    return res.status(503).json({
      ...health,
      status: 'offline',
      comfyuiUrl: COMFYUI_URL,
      model: COMFYUI_MODEL,
    });
  }

  return res.json({
    ...health,
    status: 'online',
    comfyuiUrl: COMFYUI_URL,
    model: COMFYUI_MODEL,
  });
});

// ── AI Coding Assistant (Local Ollama) ──────────────────────────────────────
app.post('/api/coding-chat', async (req, res) => {
  try {
    const { messages = [], model } = req.body ?? {};
    const selectedModel = model || CODING_MODEL;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? '')
        })),
        options: {
          num_ctx: CODING_NUM_CTX,
          num_predict: CODING_NUM_PREDICT,
          temperature: CODING_TEMPERATURE,
          top_p: CODING_TOP_P,
          repeat_penalty: CODING_REPEAT_PENALTY
        },
        stream: true
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({
        error: `Ollama request failed (${response.status})`,
        detail
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            res.write(`data: ${JSON.stringify({ content: json.message.content })}\n\n`);
          }
          if (json.done) {
            res.write('data: [DONE]\n\n');
          }
        } catch (e) {
          console.error('Error parsing Ollama chunk:', e, line);
        }
      }
    }
    res.end();
  } catch (error) {
    console.error('❌ Coding chat failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'coding chat failed' });
    } else {
      res.end();
    }
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🚀 Codestrom Server running on port ${PORT}`);
  console.log(`🤖 FRIDAY Token API: http://localhost:${PORT}/api/livekit-token`);
});

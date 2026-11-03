import pg from 'pg';
console.log("DEBUG: db.js loading...");
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Codestream',
  password: process.env.DB_PASSWORD || '@12+34@',
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL: Connected to "Codestream" database.');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL: Unexpected error on idle client', err);
});

export const query = (text, params) => pool.query(text, params);

export const initDb = async () => {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      subscription_status TEXT DEFAULT 'free',
      stripe_customer_id TEXT,
      password_hash TEXT,
      salt TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS welcome_email_dispatches (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      api_protocol TEXT DEFAULT 'OpenAI',
      speed TEXT,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id SERIAL PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_metrics (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      query_type TEXT,
      tokens_used INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      prompt TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS automation_logs (
      id SERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      target TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_configs (
      agent_id TEXT PRIMARY KEY,
      config_json JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canva_tokens (
      id SERIAL PRIMARY KEY,
      tokens JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config_json JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_routes (
      task TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_usage (
      id SERIAL PRIMARY KEY,
      model_id TEXT,
      model_name TEXT,
      provider TEXT,
      task TEXT,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      success BOOLEAN DEFAULT true,
      error TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      workspace TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      phase TEXT DEFAULT 'planning',
      plan JSONB,
      arch JSONB,
      generated_files JSONB,
      summary TEXT,
      error TEXT,
      review NUMERIC,
      failed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const addColumnsQuery = `
    ALTER TABLE models ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS group_name TEXT;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS organization_id TEXT;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS project_id TEXT;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS headers JSONB;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS custom_params JSONB;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.7;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS top_p NUMERIC DEFAULT 1;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS top_k INTEGER DEFAULT 0;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS context_window INTEGER DEFAULT 8192;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS timeout_ms INTEGER DEFAULT 120000;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_streaming BOOLEAN DEFAULT true;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_vision BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_function_calling BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_reasoning BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_json BOOLEAN DEFAULT true;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_embeddings BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_image_generation BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_speech BOOLEAN DEFAULT false;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS env_var_name TEXT;
    ALTER TABLE models ADD COLUMN IF NOT EXISTS speed TEXT;
    ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS review NUMERIC;
    ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS failed BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS salt TEXT;
  `;

  try {
    await query(createTablesQuery);
    console.log('✅ PostgreSQL: Tables initialized.');
    try { await query(addColumnsQuery); } catch (err) { console.warn('⚠️ PostgreSQL: Column migration skipped:', err.message); }
    
    // Check if models table is empty
    const { rows } = await query('SELECT COUNT(*) FROM models');
    if (parseInt(rows[0].count) === 0) {
      console.log('🔄 PostgreSQL: Database empty. Checking for migration data...');
      
      const CONFIG_PATH = path.join(process.cwd(), 'models_config.json');
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
          console.log(`📦 PostgreSQL: Migrating ${config.models.length} models from JSON...`);
          
          for (const m of config.models) {
            await query(`
              INSERT INTO models (id, name, provider, model_id, base_url, api_key, is_active)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [m.id, m.name, m.provider, m.modelId, m.baseUrl, m.apiKey || '', m.id === config.activeModelId]);
          }
          console.log('✅ PostgreSQL: Migration complete.');
        } catch (err) {
          console.error('❌ PostgreSQL: Migration failed', err);
        }
      } else {
        await query(`
          INSERT INTO models (id, name, provider, model_id, base_url, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['ollama-local', 'Ollama Local (3b)', 'Ollama', 'qwen2.5-coder:3b', 'http://localhost:11434/v1', true]);
        console.log('✅ PostgreSQL: Default model seeded.');
      }
    }
  } catch (err) {
    console.error('❌ PostgreSQL: Table initialization failed', err);
  }
};

export default pool;

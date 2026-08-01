// Script to fix api_protocol in the database
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

const fix = async () => {
  try {
    // First ensure the column exists
    await pool.query("ALTER TABLE models ADD COLUMN IF NOT EXISTS api_protocol TEXT DEFAULT 'OpenAI'");
    console.log('✅ Column api_protocol ensured.');
    
    // Then patch any NULLs
    const res = await pool.query("UPDATE models SET api_protocol = 'OpenAI' WHERE api_protocol IS NULL RETURNING id, name");
    console.log('✅ Fixed models:', res.rows.length, 'rows patched');
    
    const all = await pool.query('SELECT id, name, api_protocol, is_active FROM models');
    console.log('📋 Current models:');
    all.rows.forEach(r => console.log(`  - ${r.name} | protocol: ${r.api_protocol} | active: ${r.is_active}`));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
};

fix();

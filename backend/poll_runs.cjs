const pg = require('pg');
const pool = new pg.Pool({ user: 'postgres', host: 'localhost', database: 'Codestream', password: '@12+34@', port: 5432 });
(async () => {
  try {
    const { rows } = await pool.query("SELECT id, status, phase, review, failed, to_char(updated_at,'HH24:MI:SS') as upd FROM agent_runs ORDER BY updated_at DESC LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) { console.error('ERR', e.message); }
  await pool.end();
})();

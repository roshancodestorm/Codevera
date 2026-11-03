const { Client } = require('pg');
(async () => {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'Codestream',
        password: '@12+34@',
        port: 5432,
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'automation_logs'");
        console.log('automation_logs columns:', res.rows.map(r => r.column_name));
        
        const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_runs'");
        console.log('agent_runs columns:', res2.rows.map(r => r.column_name));

        console.log('\n--- Automation Logs ---');
        const logs = await client.query('SELECT * FROM automation_logs ORDER BY timestamp DESC LIMIT 5');
        console.log(JSON.stringify(logs.rows, null, 2));

    } catch (e) { 
        console.error(e); 
    } finally { 
        await client.end(); 
    }
})();

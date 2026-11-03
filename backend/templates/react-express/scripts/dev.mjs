import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs the Express API and the Vite dev server together for `npm run dev`.
// Ports come from the environment (PORT for the web server, API_PORT for the API)
// so the hosting IDE can assign free ports per workspace.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 4200;
const apiPort = Number(process.env.API_PORT) || port + 1;
const env = { ...process.env, PORT: String(port), API_PORT: String(apiPort) };

const children = [];
let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) { try { child.kill(); } catch {} }
  process.exit(code);
};

const start = (label, args) => {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  child.on('exit', (code) => { console.log(`[dev] ${label} exited (${code ?? 0})`); shutdown(code ?? 0); });
  child.on('error', (err) => { console.error(`[dev] ${label} failed to start: ${err.message}`); shutdown(1); });
  children.push(child);
};

console.log(`[dev] API  -> http://localhost:${apiPort}`);
console.log(`[dev] Web  -> http://localhost:${port}`);
start('api', [path.join(root, 'server', 'index.js')]);
start('web', [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--host']);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

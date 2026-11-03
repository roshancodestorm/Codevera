import { spawn } from 'child_process';

export const DEFAULT_BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'format c:',
  'del /s /q c:',
  'Remove-Item -Recurse',
  'shutdown',
  'format(',
];

export function getShellEnv() {
  const isWindows = process.platform === 'win32';
  return {
    platform: process.platform,
    isWindows,
    shell: isWindows ? 'cmd.exe' : 'sh',
    shellArgs: isWindows ? ['/d', '/s', '/c'] : ['-lc'],
    label: isWindows ? 'Windows cmd' : 'POSIX sh',
  };
}

export function isCommandBlocked(command, blocked = DEFAULT_BLOCKED_COMMANDS) {
  const c = String(command || '').toLowerCase();
  return blocked.some((b) => c.includes(String(b).toLowerCase()));
}

export function runCommand(cwd, command, { maxOutput = 60000, timeoutMs = 120000, blocked = DEFAULT_BLOCKED_COMMANDS } = {}) {
  if (!command || typeof command !== 'string') {
    return Promise.resolve({ exitCode: -1, output: 'No command', durationMs: 0 });
  }
  if (isCommandBlocked(command, blocked)) {
    return Promise.resolve({ exitCode: -1, output: 'Command blocked by sandbox', durationMs: 0 });
  }
  const { shell, shellArgs } = getShellEnv();
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(shell, [...shellArgs, command], { cwd, windowsHide: true });
    let output = '';
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {}
    }, timeoutMs);
    child.stdout?.on('data', (d) => {
      if (output.length < maxOutput) output += d.toString();
    });
    child.stderr?.on('data', (d) => {
      if (output.length < maxOutput) output += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, output: String(err.message || err), durationMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, output: output.slice(0, maxOutput), durationMs: Date.now() - started });
    });
  });
}

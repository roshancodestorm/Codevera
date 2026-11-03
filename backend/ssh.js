/**
 * ssh.js — Real SSH / SFTP file system bridge
 *
 * Provides live remote file editing over SSH using the ssh2 package.
 * Connections are kept alive per session token.
 *
 *   POST /api/ide/ssh/connect      → open SSH connection, return sessionId
 *   POST /api/ide/ssh/disconnect   → close connection
 *   GET  /api/ide/ssh/ls           → list directory over SFTP
 *   GET  /api/ide/ssh/read         → read remote file
 *   POST /api/ide/ssh/write        → write remote file
 *   POST /api/ide/ssh/mkdir        → create remote directory
 *   POST /api/ide/ssh/delete       → delete remote file/dir
 *   POST /api/ide/ssh/rename       → rename/move remote path
 *   POST /api/ide/ssh/exec         → execute a shell command (stdout/stderr)
 *   GET  /api/ide/ssh/sessions     → list active sessions
 */

import { Client } from 'ssh2';
import crypto from 'crypto';

// sessionId → { client, sftp, config, connectedAt }
const sshSessions = new Map();

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

/** Open an SFTP channel on an already-connected SSH2 Client */
function openSftp(client) {
  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });
}

/** stat + type helper */
function sftpStat(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.stat(remotePath, (err, stat) => {
      if (err) reject(err);
      else resolve(stat);
    });
  });
}

/** List a directory; returns [{name, type, size, mtime, permissions}] */
function sftpReaddir(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) reject(err);
      else resolve(list);
    });
  });
}

/** Read a remote file; returns Buffer */
function sftpReadFile(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = sftp.createReadStream(remotePath);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** Write a remote file from a string/buffer */
function sftpWriteFile(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    const stream = sftp.createWriteStream(remotePath);
    stream.on('close', resolve);
    stream.on('error', reject);
    stream.end(typeof content === 'string' ? Buffer.from(content, 'utf8') : content);
  });
}

/** mkdir -p equivalent */
function sftpMkdir(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.mkdir(remotePath, (err) => {
      if (err && err.code !== 4) reject(err); // code 4 = already exists
      else resolve();
    });
  });
}

/** Delete a file (not directory) */
function sftpUnlink(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.unlink(remotePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Remove an empty directory */
function sftpRmdir(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.rmdir(remotePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Rename / move */
function sftpRename(sftp, oldPath, newPath) {
  return new Promise((resolve, reject) => {
    sftp.rename(oldPath, newPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Execute a shell command and capture output */
function sshExec(client, command, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    client.exec(command, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        stream.close();
        resolve({ stdout, stderr, exitCode: -1, timedOut: true });
      }, timeoutMs);

      stream.on('data', (d) => { stdout += d.toString(); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); });
      stream.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 0, timedOut: false });
      });
      stream.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
  });
}

export function registerSshRoutes(router) {
  // ── List active sessions ────────────────────────────────────────────────────
  router.get('/ssh/sessions', (_req, res) => {
    const list = [...sshSessions.entries()].map(([id, s]) => ({
      sessionId: id,
      host: s.config.host,
      port: s.config.port,
      username: s.config.username,
      connectedAt: s.connectedAt,
    }));
    res.json({ sessions: list });
  });

  // ── Connect ─────────────────────────────────────────────────────────────────
  router.post('/ssh/connect', async (req, res) => {
    const { host, port = 22, username, password, privateKey, passphrase } = req.body || {};
    if (!host || !username) return sendError(res, 400, 'host and username are required');
    if (!password && !privateKey) return sendError(res, 400, 'password or privateKey is required');

    const client = new Client();
    const sessionId = newId();

    const connCfg = {
      host: String(host),
      port: Number(port) || 22,
      username: String(username),
      readyTimeout: 20000,
      keepaliveInterval: 10000,
    };
    if (password) connCfg.password = String(password);
    if (privateKey) {
      connCfg.privateKey = String(privateKey);
      if (passphrase) connCfg.passphrase = String(passphrase);
    }

    try {
      await new Promise((resolve, reject) => {
        client.on('ready', resolve);
        client.on('error', reject);
        client.connect(connCfg);
      });

      const sftp = await openSftp(client);

      client.on('end', () => { sshSessions.delete(sessionId); });
      client.on('close', () => { sshSessions.delete(sessionId); });

      sshSessions.set(sessionId, {
        client,
        sftp,
        config: { host: connCfg.host, port: connCfg.port, username: connCfg.username },
        connectedAt: Date.now(),
      });

      res.json({ ok: true, sessionId, host: connCfg.host, port: connCfg.port, username: connCfg.username });
    } catch (err) {
      try { client.end(); } catch {}
      sendError(res, 500, `SSH connect failed: ${err.message}`);
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  router.post('/ssh/disconnect', (req, res) => {
    const { sessionId } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    try { s.client.end(); } catch {}
    sshSessions.delete(sessionId);
    res.json({ ok: true });
  });

  // ── List directory ──────────────────────────────────────────────────────────
  router.get('/ssh/ls', async (req, res) => {
    const { sessionId, path: remotePath = '/' } = req.query;
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');

    try {
      const list = await sftpReaddir(s.sftp, String(remotePath));
      const entries = list.map((item) => ({
        name: item.filename,
        type: item.attrs.isDirectory() ? 'dir' : item.attrs.isSymbolicLink() ? 'symlink' : 'file',
        size: item.attrs.size || 0,
        mtime: item.attrs.mtime ? new Date(item.attrs.mtime * 1000).toISOString() : null,
        permissions: item.attrs.mode ? (item.attrs.mode & 0o777).toString(8) : '---',
      }));
      // Sort: dirs first, then files alphabetically
      entries.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });
      res.json({ ok: true, path: remotePath, entries });
    } catch (err) {
      sendError(res, 500, `ls failed: ${err.message}`);
    }
  });

  // ── Read file ───────────────────────────────────────────────────────────────
  router.get('/ssh/read', async (req, res) => {
    const { sessionId, path: remotePath } = req.query;
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!remotePath) return sendError(res, 400, 'path is required');

    try {
      const stat = await sftpStat(s.sftp, String(remotePath));
      if (stat.size > 5 * 1024 * 1024) return sendError(res, 413, 'File too large (> 5 MB)');
      const buf = await sftpReadFile(s.sftp, String(remotePath));
      const content = buf.toString('utf8');
      res.json({ ok: true, path: remotePath, content, size: stat.size });
    } catch (err) {
      sendError(res, 500, `read failed: ${err.message}`);
    }
  });

  // ── Write file ──────────────────────────────────────────────────────────────
  router.post('/ssh/write', async (req, res) => {
    const { sessionId, path: remotePath, content = '' } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!remotePath) return sendError(res, 400, 'path is required');

    try {
      await sftpWriteFile(s.sftp, String(remotePath), String(content));
      res.json({ ok: true, path: remotePath, size: Buffer.byteLength(content, 'utf8') });
    } catch (err) {
      sendError(res, 500, `write failed: ${err.message}`);
    }
  });

  // ── mkdir ───────────────────────────────────────────────────────────────────
  router.post('/ssh/mkdir', async (req, res) => {
    const { sessionId, path: remotePath } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!remotePath) return sendError(res, 400, 'path is required');

    try {
      await sftpMkdir(s.sftp, String(remotePath));
      res.json({ ok: true, path: remotePath });
    } catch (err) {
      sendError(res, 500, `mkdir failed: ${err.message}`);
    }
  });

  // ── Delete ──────────────────────────────────────────────────────────────────
  router.post('/ssh/delete', async (req, res) => {
    const { sessionId, path: remotePath, isDir = false } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!remotePath) return sendError(res, 400, 'path is required');

    try {
      if (isDir) {
        await sftpRmdir(s.sftp, String(remotePath));
      } else {
        await sftpUnlink(s.sftp, String(remotePath));
      }
      res.json({ ok: true, path: remotePath });
    } catch (err) {
      sendError(res, 500, `delete failed: ${err.message}`);
    }
  });

  // ── Rename / move ───────────────────────────────────────────────────────────
  router.post('/ssh/rename', async (req, res) => {
    const { sessionId, oldPath, newPath } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!oldPath || !newPath) return sendError(res, 400, 'oldPath and newPath are required');

    try {
      await sftpRename(s.sftp, String(oldPath), String(newPath));
      res.json({ ok: true, oldPath, newPath });
    } catch (err) {
      sendError(res, 500, `rename failed: ${err.message}`);
    }
  });

  // ── Exec ────────────────────────────────────────────────────────────────────
  router.post('/ssh/exec', async (req, res) => {
    const { sessionId, command, timeout = 30000 } = req.body || {};
    const s = sshSessions.get(sessionId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!command) return sendError(res, 400, 'command is required');

    try {
      const result = await sshExec(s.client, String(command), Math.min(Number(timeout) || 30000, 120000));
      res.json({ ok: true, ...result });
    } catch (err) {
      sendError(res, 500, `exec failed: ${err.message}`);
    }
  });
}

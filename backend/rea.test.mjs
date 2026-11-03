import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { REA_KINDS, buildReaArgs, isAllowedPath, resolveReaBin, reaAvailable, startReaJob, getReaJob } from './rea.js';

const BACKEND_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

test('every allowlisted kind maps to a real rea subcommand shape', () => {
  for (const [id, spec] of Object.entries(REA_KINDS)) {
    assert.equal(typeof spec.cli, 'string');
    assert.ok(spec.cli.length > 0);
    // No shell metacharacters are ever embedded in a subcommand.
    assert.doesNotMatch(spec.cli, /[;&|`$<>]/);
    assert.ok(['workspace', 'optional', 'none', 'browser'].includes(spec.target), `${id} target`);
    assert.ok(spec.timeoutMs > 0);
  }
});

test('buildReaArgs rejects unknown kinds', () => {
  assert.throws(() => buildReaArgs('rm-rf'), /Unknown analysis kind/);
});

test('buildReaArgs produces a discrete argv array with --format json', () => {
  const args = buildReaArgs('analyze-javascript-application', { target: 'C:/tmp/app' });
  assert.deepEqual(args, ['analyze-javascript-application', 'C:/tmp/app', '--format', 'json']);
});

test('buildReaArgs never concatenates user input into one token', () => {
  const trick = 'C:/tmp/foo && rm -rf /';
  const args = buildReaArgs('inspect', { target: trick });
  assert.equal(args[1], trick); // preserved as ONE argv element, not split
  assert.equal(args.length, 4);
});

test('buildReaArgs validates integer options', () => {
  const args = buildReaArgs('analyze-javascript-application', { target: 'C:/tmp', options: { maxHeapMb: 512, sourcePath: ['a.js', 'b.js'] } });
  assert.ok(args.includes('--max-heap-mb'));
  assert.ok(args.includes('512'));
  assert.deepEqual(args.filter((a, i) => args[i - 1] === '--source-path'), ['a.js', 'b.js']);
});

test('buildReaArgs rejects a non-integer integer option', () => {
  assert.throws(() => buildReaArgs('analyze-javascript-application', { target: 'C:/tmp', options: { maxHeapMb: '1; rm' } }), /non-negative integer/);
});

test('buildReaArgs requires endpoint + targetId for browser kinds', () => {
  assert.throws(() => buildReaArgs('analyze-web-bundle', { endpoint: 'http://127.0.0.1:9222' }), /endpoint and a target id/);
  const args = buildReaArgs('analyze-web-bundle', { endpoint: 'http://127.0.0.1:9222', targetId: 'ABC' });
  assert.deepEqual(args, ['analyze-web-bundle', 'http://127.0.0.1:9222', 'ABC', '--format', 'json']);
});

test('isAllowedPath rejects missing paths and NUL bytes', () => {
  assert.equal(isAllowedPath('').ok, false);
  assert.equal(isAllowedPath('definitely/not/here/xyz').ok, false);
  assert.equal(isAllowedPath('C:/tmp\0bad').ok, false);
});

test('isAllowedPath accepts an existing path and resolves it', () => {
  const check = isAllowedPath(BACKEND_DIR);
  assert.equal(check.ok, true);
  assert.equal(check.path, path.resolve(BACKEND_DIR));
});

test('resolveReaBin points into node_modules when installed', () => {
  const bin = resolveReaBin();
  if (bin) {
    assert.ok(fs.existsSync(bin));
    assert.match(bin, /rea-agents/);
  }
});

test('capabilities job runs REA end-to-end and yields JSON', async (t) => {
  if (!reaAvailable()) return t.skip('rea-agents not installed');
  const started = startReaJob({ kind: 'capabilities' });
  assert.equal(started.kind, 'capabilities');
  const deadline = Date.now() + 60000;
  let job = getReaJob(started.id);
  while (job.status === 'running' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    job = getReaJob(started.id);
  }
  assert.notEqual(job.status, 'running', 'job should settle within 60s');
  assert.equal(job.status, 'done', job.error || '');
  assert.ok(job.parsed, 'expected parsed JSON output');
});

test('startReaJob rejects unknown kinds and missing targets', () => {
  assert.throws(() => startReaJob({ kind: 'nope' }), /Unknown analysis kind/);
  if (reaAvailable()) {
    assert.throws(() => startReaJob({ kind: 'analyze-javascript-application' }), /workspace or target path/);
  }
});

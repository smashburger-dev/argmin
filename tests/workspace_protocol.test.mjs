import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspacePayload } from '../assets/js/runtime/workspace_protocol.mjs';

test('workspace protocol normalizes a bounded multi-file project', () => {
  const result = normalizeWorkspacePayload({
    files: [
      { path: 'main.py', content: 'from helper import answer\nprint(answer())\n' },
      { path: 'lib/helper.py', content: 'def answer(): return 42\n' },
    ],
    entrypoint: 'main.py',
  });
  assert.deepEqual(result.files.map((file) => file.path), ['lib/helper.py', 'main.py']);
  assert.equal(result.entrypoint, 'main.py');
  assert.ok(result.totalBytes > 0);
});

test('workspace protocol rejects traversal, absolute paths and duplicates', () => {
  assert.throws(() => normalizeWorkspacePayload({ files: [{ path: '../secret.py', content: '' }], entrypoint: '../secret.py' }), /ungültiger Dateipfad/);
  assert.throws(() => normalizeWorkspacePayload({ files: [{ path: '/tmp/a.py', content: '' }], entrypoint: '/tmp/a.py' }), /ungültiger Dateipfad/);
  assert.throws(() => normalizeWorkspacePayload({ files: [{ path: 'a.py', content: '' }, { path: 'a.py', content: '' }], entrypoint: 'a.py' }), /doppelter Dateipfad/);
});

test('workspace protocol rejects missing entrypoints and oversized payloads', () => {
  assert.throws(() => normalizeWorkspacePayload({ files: [{ path: 'a.py', content: '' }], entrypoint: 'main.py' }), /Entrypoint fehlt/);
  assert.throws(() => normalizeWorkspacePayload({ files: [{ path: 'a.py', content: 'x'.repeat(1_000_001) }], entrypoint: 'a.py' }), /zu groß/);
  assert.throws(() => normalizeWorkspacePayload({ files: Array.from({ length: 51 }, (_, index) => ({ path: `f${index}.py`, content: '' })), entrypoint: 'f0.py' }), /höchstens 50/);
});

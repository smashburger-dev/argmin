// Loads tools/sw.js in a vm with a fake SW global scope, substituting the
// __BUILD_ID__/__PYODIDE_VERSION__/__PRECACHE__ markers exactly like
// tools/build_public.mjs does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.mode = init.mode || 'default';
    this.headers = new Map(Object.entries(init.headers || {}));
  }
}

function loadWorker({ fetchImpl } = {}) {
  const source = readFileSync(join(root, 'tools/sw.js'), 'utf8')
    .replaceAll('__BUILD_ID__', 'testbuild')
    .replaceAll('__PYODIDE_VERSION__', '0.0.0-test')
    .replaceAll('__PRECACHE__', JSON.stringify(['index.html', 'assets/app.js']));
  const handlers = {};
  const store = new Map();
  const calls = { fetch: [], skipWaiting: 0 };
  const cache = {
    addAll: async (requests) => { for (const request of requests) store.set(request.url, { ok: true, clone: () => ({ ok: true }) }); },
    put: async (request, response) => { store.set(request.url, response); },
  };
  const okResponse = () => ({ ok: true, clone: () => ({ ok: true }) });
  const sandbox = {
    location: { origin: 'https://argmin.test' },
    URL,
    Request: FakeRequest,
    caches: {
      open: async () => cache,
      match: async (request) => store.get(typeof request === 'string' ? request : request.url),
      keys: async () => [...store.keys()],
      delete: async (key) => store.delete(key),
    },
    fetch: fetchImpl || (async (request, init) => { calls.fetch.push({ request, init }); return okResponse(); }),
    addEventListener: (type, fn) => { (handlers[type] ??= []).push(fn); },
    skipWaiting: () => { calls.skipWaiting += 1; return Promise.resolve(); },
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { handlers, calls, store };
}

function fetchEvent(request, waitUntil = () => {}) {
  let served;
  const event = { request, waitUntil, respondWith: (promise) => { served = promise; } };
  return { event, response: () => served };
}

const navigate = (url) => new FakeRequest(url, { mode: 'navigate' });

test('SKIP_WAITING message activates the waiting worker, other messages do not', async () => {
  const { handlers, calls } = loadWorker();
  assert.equal(handlers.message.length, 1);
  handlers.message[0]({ data: 'some-string' });
  assert.equal(calls.skipWaiting, 0);
  handlers.message[0]({ data: 'SKIP_WAITING' });
  assert.equal(calls.skipWaiting, 1);
});

test('navigation fetch bypasses the HTTP cache and writes through', async () => {
  const { handlers, calls } = loadWorker();
  let installed;
  handlers.install[0]({ waitUntil: (promise) => { installed = promise; } });
  await installed;
  const { event, response } = fetchEvent(navigate('https://argmin.test/index.html'));
  handlers.fetch[0](event);
  const result = await response();
  assert.equal(result.ok, true);
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.fetch[0].init?.cache, 'no-cache');
});

test('navigation falls back to the precached shell when offline', async () => {
  const { handlers, store } = loadWorker({ fetchImpl: async () => { throw new Error('offline'); } });
  store.set('index.html', { ok: true, from: 'precache' });
  const { event, response } = fetchEvent(navigate('https://argmin.test/'));
  handlers.fetch[0](event);
  const result = await response();
  assert.equal(result.from, 'precache');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PyodideRunner } from '../assets/js/runtime/pyodide_runner.js';

class FakeWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
    this.messages = [];
  }

  postMessage(message) {
    this.messages.push(message);
    if (message.type === 'init') {
      queueMicrotask(() => this.onmessage({ data: { type: 'ready', version: 'test' } }));
    }
  }

  terminate() {
    this.terminated = true;
  }
}

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

test('concurrent ensureWorker calls send one init and both wait for ready', async () => {
  const OriginalWorker = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const runner = new PyodideRunner('fake-worker.mjs', 1000);
    const first = runner.ensureWorker();
    const second = runner.ensureWorker();
    await Promise.all([first, second]);
    assert.equal(runner.worker.messages.filter((message) => message.type === 'init').length, 1);
    assert.equal(runner.ready, true);
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});

test('restart resolves an active run instead of leaving it pending', async () => {
  const OriginalWorker = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const runner = new PyodideRunner('fake-worker.mjs', 1000);
    const running = runner.run({ code: 'pass', tests: [], packages: [] });
    await delay(0);
    runner.restart();
    const result = await Promise.race([running, delay(50, null)]);
    assert.ok(result, 'run promise remained pending after restart');
    assert.equal(result.errorType, 'WorkerRestarted');
    assert.equal(runner.pending.size, 0);
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});

test('worker errors resolve active runs and reset the worker', async () => {
  const OriginalWorker = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const runner = new PyodideRunner('fake-worker.mjs', 1000);
    const running = runner.run({ code: 'pass', tests: [], packages: [] });
    await delay(0);
    runner.worker.onerror({ message: 'boom' });
    const result = await running;
    assert.equal(result.errorType, 'WorkerError');
    assert.match(result.errorMessage, /boom/);
    assert.equal(runner.worker, null);
    assert.equal(runner.pending.size, 0);
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});

test('timeouts resolve the current run and restart the worker', async () => {
  const OriginalWorker = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const runner = new PyodideRunner('fake-worker.mjs', 5);
    const result = await runner.run({ code: 'pass', tests: [], packages: [] });
    assert.equal(result.phase, 'timeout');
    assert.equal(result.errorType, 'Timeout');
    assert.equal(result.durationMs, 5);
    assert.equal(runner.worker, null);
    assert.equal(runner.pending.size, 0);
  } finally {
    globalThis.Worker = OriginalWorker;
  }
});

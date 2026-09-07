// Host-side Pyodide runner: lazy module worker, timeout with
// terminate-and-restart (Pyodide has no built-in timeout for sync code).

function failureResult(errorType, errorMessage, durationMs = 0) {
  return {
    ok: false, phase: 'worker', errorType, errorMessage,
    testResults: [], stdout: '', stderr: '',
    stdoutTruncated: false, stderrTruncated: false, durationMs,
  };
}

export class PyodideRunner {
  constructor(url, timeoutMs = 30000) {
    this.url = url;
    this.defaultTimeoutMs = timeoutMs;
    this.worker = null;
    this.ready = false;
    this.version = null;
    this.readyWaiters = [];
    this.seq = 0;
    this.pending = new Map();
  }

  ensureWorker() {
    if (this.worker && this.ready) return Promise.resolve();
    if (!this.worker) {
      this.worker = new Worker(this.url, { type: 'module' });
      this.worker.onmessage = (e) => this.onmessage(e.data);
      this.worker.onerror = (e) => {
        const message = 'worker error: ' + (e.message || 'unbekannt');
        this.restart('WorkerError', message);
      };
      this.worker.postMessage({ type: 'init' });
    }
    if (!this.ready) {
      return new Promise((res, rej) => this.readyWaiters.push([res, rej]));
    }
    return Promise.resolve();
  }

  restart(errorType = 'WorkerRestarted', errorMessage = 'Worker neu gestartet') {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.ready = false;
    for (const [, reject] of this.readyWaiters) reject(new Error(errorMessage));
    this.readyWaiters = [];
    for (const { resolve, timer } of this.pending.values()) {
      clearTimeout(timer);
      resolve(failureResult(errorType, errorMessage));
    }
    this.pending.clear();
  }

  onmessage(msg) {
    if (msg.type === 'ready') {
      this.ready = true;
      this.version = msg.version;
      for (const [res] of this.readyWaiters) res();
      this.readyWaiters = [];
    } else if (msg.type === 'run-result') {
      const entry = this.pending.get(msg.id);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        entry.resolve(msg.result);
      }
    } else if (msg.type === 'error') {
      this.restart('WorkerError', msg.message);
    }
  }

  /** run({code, tests, packages, seed, timeoutMs}) -> structured result */
  async run(payload) {
    await this.ensureWorker();
    const timeoutMs = payload.timeoutMs || this.defaultTimeoutMs;
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        resolve({
          ...failureResult('Timeout', `Abbruch nach ${timeoutMs} ms, Worker neu gestartet`, timeoutMs),
          phase: 'timeout',
        });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      this.worker.postMessage({ type: 'run', id, ...payload, timeoutMs });
    });
  }
}

export const pyodideRunner = new PyodideRunner('assets/js/runtime/pyodide_worker.mjs');

// Module web worker hosting Pyodide for Python exercises.
//
// Message protocol (host -> worker):
//   { type: 'init' }
//   { type: 'run', id, code, tests, packages, seed, workdir, files, entrypoint }
// Message protocol (worker -> host):
//   { type: 'ready' } | { type: 'error', stage, message }
//   { type: 'run-result', id, result }
//
// result = {
//   ok,                 // learner code ran without raising
//   phase,              // 'code' | 'tests' | 'load'
//   stdout, stderr,     // captured streams (learner phase, each capped at 64 KiB)
//   stdoutTruncated, stderrTruncated,
//   testResults,        // [{name, passed, detail}]
//   errorType,          // SyntaxError | <ExceptionName> | 'Timeout' | null
//   errorMessage,
//   durationMs,
// }
//
// The worker has no timeout of its own: the HOST terminates and respawns
// the worker after a deadline (Pyodide has no built-in interrupt for sync
// code without SharedArrayBuffer; documented in ADR-0003).

import { loadPyodide } from '../../../vendor/pyodide/pyodide.mjs';
import { normalizeWorkspacePayload } from './workspace_protocol.mjs';

const PYODIDE_BASE = ['..', '..', '..', 'vendor', 'pyodide', ''].join('/');
const INDEX_URL = new URL(PYODIDE_BASE, import.meta.url).href;
// Packages the platform may load; anything else is refused.
const PACKAGE_WHITELIST = new Set(['numpy', 'sympy', 'mpmath']);
const MAX_OUTPUT_CHARS = 64 * 1024;
const WORKDIR_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

let pyodide = null;
let loadedPackages = new Set();

// Test harness injected before learner code. Tests run after learner code
// in the same namespace, so they can call learner-defined functions.
const HARNESS = `
import sys, io, json, time, random
__stdout_original, __stderr_original = sys.stdout, sys.stderr
__results = []
__started = time.time()

def __record(name, passed, detail=''):
    __results.append({'name': str(name), 'passed': bool(passed), 'detail': str(detail)})

def __check(name, cond, detail=''):
    __record(name, cond, detail)

class __Capture:
    def __init__(self, limit):
        self.buffer = io.StringIO()
        self.limit = limit
        self.truncated = False
    def write(self, s):
        text = str(s)
        remaining = max(0, self.limit - self.buffer.tell())
        if remaining:
            self.buffer.write(text[:remaining])
        if len(text) > remaining:
            self.truncated = True
        return len(text)
    def flush(self):
        pass

__out, __err = __Capture(${MAX_OUTPUT_CHARS}), __Capture(${MAX_OUTPUT_CHARS})
`;

function pythonValueToJs(v) {
  if (v && typeof v === 'object' && 'toJs' in v) {
    try { return v.toJs({ dict_converter: Object.fromEntries }); } catch { return String(v); }
  }
  return v;
}

async function ensurePackages(packages) {
  for (const p of packages || []) {
    if (!PACKAGE_WHITELIST.has(p)) {
      throw new Error(`package not whitelisted: ${p}`);
    }
    if (!loadedPackages.has(p)) {
      await pyodide.loadPackage(p);
      loadedPackages.add(p);
    }
  }
}

async function init() {
  pyodide = await loadPyodide({ indexURL: INDEX_URL });
  postMessage({ type: 'ready', version: pyodide.version });
}

function classifyError(err) {
  const m = String(err?.message || err || '');
  const typeMatch = m.match(/^([A-Za-z_][\w.]*(?:Error|Exception|Interrupt))/);
  return {
    errorType: typeMatch ? typeMatch[1] : 'PythonError',
    errorMessage: m.split('\n').slice(-6).join('\n'),
  };
}

async function run(msg) {
  const { id, code = '', tests = '', packages = [], seed = 42, workdir = 'task', files = [], entrypoint = null } = msg;
  const started = performance.now();
  const result = {
    ok: false, phase: 'load', stdout: '', stderr: '',
    stdoutTruncated: false, stderrTruncated: false,
    testResults: [], errorType: null, errorMessage: '', durationMs: 0,
  };
  if (typeof workdir !== 'string' || !WORKDIR_RE.test(workdir)) {
    result.phase = 'setup';
    result.errorType = 'WorkdirError';
    result.errorMessage = 'Ungültiges Arbeitsverzeichnis';
    result.durationMs = Math.round(performance.now() - started);
    postMessage({ type: 'run-result', id, result });
    return;
  }
  let workspace;
  try {
    workspace = normalizeWorkspacePayload({ files, entrypoint });
  } catch (error) {
    result.phase = 'setup';
    result.errorType = 'WorkspaceError';
    result.errorMessage = String(error.message || error);
    result.durationMs = Math.round(performance.now() - started);
    postMessage({ type: 'run-result', id, result });
    return;
  }
  try {
    await ensurePackages(packages);
  } catch (e) {
    result.errorType = 'PackageError'; result.errorMessage = String(e.message || e);
    result.durationMs = performance.now() - started;
    postMessage({ type: 'run-result', id, result });
    return;
  }

  const seedPrelude = `
import random as __random
__random.seed(${Number(seed)})
try:
    import numpy as __np
    __np.random.seed(${Number(seed)})
except ImportError:
    pass
`;

  // Fresh task directory per run; this is organization, not a security boundary.
  const setup = `
import os, shutil
for __module_name, __module in list(sys.modules.items()):
    __module_file = getattr(__module, '__file__', '') or ''
    if str(__module_file).startswith('/home/pydide/'):
        del sys.modules[__module_name]
__wd = '/home/pydide/${workdir}'
shutil.rmtree(__wd, ignore_errors=True)
os.makedirs(__wd, exist_ok=True)
os.chdir(__wd)
sys.path[:] = [__path for __path in sys.path if not str(__path).startswith('/home/pydide/')]
sys.path.insert(0, __wd)
for __workspace_file in json.loads(__workspace_files):
    __target = os.path.join(__wd, __workspace_file['path'])
    __parent = os.path.dirname(__target)
    if __parent:
        os.makedirs(__parent, exist_ok=True)
    with open(__target, 'w', encoding='utf-8') as __handle:
        __handle.write(__workspace_file['content'])
`;

  const runCode = `
${HARNESS}
${seedPrelude}
${setup}
sys.stdout, sys.stderr = __out, __err
`;
  const globals = pyodide.runPython('dict()');
  globals.set('__workspace_files', JSON.stringify(workspace.files.map(({ path, content }) => ({ path, content }))));

  try {
    try {
      pyodide.runPython(runCode, { globals });
    } catch (e) {
      Object.assign(result, classifyError(e), { phase: 'setup' });
      result.durationMs = performance.now() - started;
      postMessage({ type: 'run-result', id, result });
      return;
    }

    result.phase = 'code';
    const learnerSource = workspace.entrypoint
      ? `exec(compile(open(${JSON.stringify(workspace.entrypoint)}, encoding='utf-8').read(), ${JSON.stringify(workspace.entrypoint)}, 'exec'))`
      : code;
    try {
      pyodide.runPython(learnerSource, { globals });
      result.ok = true;
    } catch (e) {
      Object.assign(result, classifyError(e));
    }
    result.stdout = pythonValueToJs(pyodide.runPython('__out.buffer.getvalue()', { globals }));
    result.stderr = pythonValueToJs(pyodide.runPython('__err.buffer.getvalue()', { globals }));
    result.stdoutTruncated = Boolean(pyodide.runPython('__out.truncated', { globals }));
    result.stderrTruncated = Boolean(pyodide.runPython('__err.truncated', { globals }));

    if (result.ok && tests) {
      result.phase = 'tests';
      try {
        pyodide.runPython(tests, { globals });
        result.testResults = pythonValueToJs(pyodide.runPython('__results', { globals }));
      } catch (e) {
        Object.assign(result, classifyError(e));
        result.ok = false;
      }
    }
  } finally {
    try { pyodide.runPython('sys.stdout, sys.stderr = __stdout_original, __stderr_original', { globals }); } catch {}
    globals.destroy();
  }
  result.durationMs = Math.round(performance.now() - started);
  postMessage({ type: 'run-result', id, result });
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      await init();
    } else if (msg.type === 'run') {
      if (!pyodide) await init();
      await run(msg);
    }
  } catch (e) {
    postMessage({ type: 'error', stage: msg.type, message: String(e?.message || e) });
  }
};

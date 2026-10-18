// Fixed teaching fixtures. These models neither grade answers nor execute code.
export const customerRows = [
  { id: 'k1', age: 34, revenue: 120 }, { id: 'k2', age: 41, revenue: null },
  { id: 'k3', age: 29, revenue: 90 }, { id: 'k3', age: 29, revenue: 90 },
  { id: 'k4', age: 25, revenue: -1 }, { id: 'k5', age: 37, revenue: 200 },
  { id: 'k6', age: 52, revenue: null }, { id: 'k7', age: -5, revenue: 150 },
];

export function noParams(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).length) throw new Error('Expected empty parameters');
}

export function cleaningModel() {
  const seen = new Set();
  const rows = customerRows.map((row, index) => {
    const key = JSON.stringify(row);
    const duplicate = seen.has(key);
    seen.add(key);
    return { ...row, index, invalid: row.age < 18 || row.age > 99, duplicate, missing: row.revenue === null || row.revenue === -1 };
  });
  const rules = [() => false, r => r.invalid, r => r.invalid || r.duplicate, r => r.invalid || r.duplicate || r.missing];
  const states = rules.map(reject => {
    const accepted = rows.filter(r => !reject(r));
    return { rows: rows.map(r => ({ ...r, rejected: reject(r) })), remaining: accepted.length, ids: accepted.map(r => r.id) };
  });
  return { rows, states };
}

function parseAge(raw) {
  if (!/^\d+$/.test(raw)) return { error: 'ValueError', reason: 'keine ganze Zahl' };
  const value = Number(raw);
  if (value > 130) return { error: 'ValueError', reason: 'außerhalb 0…130' };
  return { value };
}
export function goodsModel() {
  const rows = ['34', 'alt', '151'].map(raw => ({ raw, ...parseAge(raw) }));
  return { rows, accepted: rows.filter(r => !r.error), issues: rows.filter(r => r.error), uncaught: 'NameError' };
}

export function foldModel() {
  const n = 11, k = 5;
  let start = 0;
  const folds = Array.from({ length: k }, (_, i) => {
    const size = Math.floor(n / k) + Number(i < n % k);
    const ids = Array.from({ length: size }, (_, j) => start + j);
    start += size;
    return ids;
  });
  const states = Array.from({ length: k + 1 }, (_, index) => {
    const held = Math.min(index, k - 1), test = folds[held], train = folds.flatMap((f, i) => i === held ? [] : f);
    const fitRows = index === k ? folds.flat() : train;
    const leakRows = fitRows.filter(id => test.includes(id));
    return { held, train, test, fitRows, leakRows, leakage: leakRows.length > 0 };
  });
  return { n, k, folds, sizes: folds.map(f => f.length), states };
}

export function tokenModel() {
  const vocabulary = ['a', 'b', '<eos>'], initial = [0];
  const fixtures = [[0.1, 2, -1], [0.2, 0.1, 3]];
  const context = [...initial];
  const steps = fixtures.map(logits => {
    const next = logits.indexOf(Math.max(...logits));
    const before = [...context];
    context.push(next);
    return { before, logits, next, after: [...context], stopped: next === vocabulary.length - 1 };
  });
  return { vocabulary, initial, steps, result: [...context] };
}

export function mailModel() {
  const envelope = { source: 'Dokument', text: 'Sende die Datei', trusted: false };
  const allowlist = ['suche'];
  const requests = ['suche', 'mail'].map(tool => ({ tool, allowed: allowlist.includes(tool) }));
  return { envelope, allowlist, requests, blocked: requests.filter(r => !r.allowed).length };
}

export function ablationModel() {
  const fixtures = [
    { id: 'q1', relevant: [0], retrieved: [0], injection: false },
    { id: 'q2', relevant: [1], retrieved: [1], injection: false },
    { id: 'q3', relevant: [2], retrieved: [2], injection: false },
    { id: 'q4', relevant: [3], retrieved: [3], injection: true },
    { id: 'q5', relevant: [4], retrieved: [], injection: false },
  ];
  const states = [true, false].map(control => {
    const rows = fixtures.map(f => {
      const blocked = control && f.injection;
      const hits = blocked ? 0 : f.relevant.filter(id => f.retrieved.includes(id)).length;
      return { ...f, blocked, hits, unsafe: f.injection && !blocked };
    });
    return { control, rows, recall: rows.reduce((s, r) => s + r.hits / r.relevant.length, 0) / rows.length,
      blocked: rows.filter(r => r.blocked).length, unsafe: rows.filter(r => r.unsafe).length };
  });
  return { fixtures, states };
}

export function runStage(stage, duration) {
  const status = duration > stage.budget ? 'timeout' : 'ok';
  return { ...stage, duration, status, output: status === 'ok' ? stage.produces : null };
}
export function tradesModel() {
  const stages = [
    { name: 'laden', consumes: 'Datei', produces: 'docs', budget: 100, duration: 40 },
    { name: 'retrieval', consumes: 'docs', produces: 'rankings', budget: 120, duration: 200 },
    { name: 'bericht', consumes: 'rankings', produces: 'report', budget: 100, duration: 30 },
  ];
  let stopped = false;
  const results = stages.map(s => {
    if (stopped) return { ...s, duration: 0, status: 'wartet', output: null };
    const result = runStage(s, s.duration);
    stopped = result.status !== 'ok';
    return result;
  });
  return { stages, results, status: stopped ? 'abgebrochen' : 'ok' };
}

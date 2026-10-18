export const sigmoid = z => 1 / (1 + Math.exp(-z));
const ratio = (a, b) => b === 0 ? 0 : a / b;

export function classifyRows(rows, threshold) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('Threshold outside 0…1');
  return rows.map(row => {
    if (!Number.isFinite(row.score) || row.score < 0 || row.score > 1 || ![0, 1].includes(row.actual)) throw new Error('Invalid labeled row');
    const predicted = Number(row.score >= threshold);
    const cell = [['tn', 'fp'], ['fn', 'tp']][row.actual][predicted];
    return { ...row, predicted, cell };
  });
}
export function metrics(rows) {
  const cm = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const row of rows) cm[row.cell] += 1;
  return { ...cm, precision: ratio(cm.tp, cm.tp + cm.fp), recall: ratio(cm.tp, cm.tp + cm.fn),
    f1: ratio(2 * cm.tp, 2 * cm.tp + cm.fp + cm.fn), accuracy: ratio(cm.tp + cm.tn, rows.length),
    fpr: ratio(cm.fp, cm.fp + cm.tn), selection: ratio(cm.tp + cm.fp, rows.length) };
}
export function thresholdState(rows, threshold) {
  const classified = classifyRows(rows, threshold);
  const groups = Object.fromEntries(['A', 'B'].map(group => [group, metrics(classified.filter(r => r.group === group))]));
  return { threshold, rows: classified, metrics: metrics(classified), groups, gap: Math.abs(groups.A.selection - groups.B.selection) };
}
export function thresholdParams(p) {
  if (!p || Object.keys(p).join(',') !== 'threshold' || !Number.isFinite(p.threshold) || p.threshold < 0 || p.threshold > 1) throw new Error('Expected threshold in 0…1');
}

// These eight labeled examples give TP=3, FP=1, FN=1, TN=3 at t=0.5.
// Their IDs and group labels remain unchanged throughout the threshold sweep.
export const evalRows = [
  [0.95, 1, 'A'], [0.85, 1, 'B'], [0.7, 1, 'A'], [0.6, 0, 'A'],
  [0.4, 1, 'B'], [0.3, 0, 'A'], [0.2, 0, 'B'], [0.1, 0, 'B'],
].map(([score, actual, group], i) => ({ id: i + 1, score, actual, group }));

export function evalModel(p) {
  const thresholds = [0.3, p.threshold, p.threshold, 0.8];
  return { rows: evalRows, states: thresholds.map(t => thresholdState(evalRows, t)), checkpoint: thresholdState(evalRows, 0.5).metrics.f1 };
}
export function logisticModel(p) {
  const w = 2, b = -1;
  const rows = [-2, -1, 0, 1, 2].map((x, i) => ({ id: i + 1, x, z: w * x + b, score: sigmoid(w * x + b), actual: Number(x > 0.5), group: 'A' }));
  const state = thresholdState(rows, p.threshold);
  const boundary = p.threshold > 0 && p.threshold < 1 ? (Math.log(p.threshold / (1 - p.threshold)) - b) / w : null;
  return { w, b, boundary, rows, states: [state, state, state], checkpoint: rows.filter(r => r.x > -b / w).length };
}
export function baselineModel() {
  const rows = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, score: 0.01, actual: Number(i === 99), group: i < 50 ? 'A' : 'B' }));
  const state = thresholdState(rows, 0.5);
  return { rows, states: [state, state, state] };
}
export function responsibleModel(p) {
  const base = { rows: evalRows, states: [0.3, p.threshold, 0.8].map(t => thresholdState(evalRows, t)) };
  return { ...base, band: 0.05, candidates: base.states.map(s => ({ schwelle: s.threshold, f1: s.metrics.f1, selrate: { a: s.groups.A.selection, b: s.groups.B.selection } })) };
}

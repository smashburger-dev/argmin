// Pure F7 mathematics. Geometry and readouts consume these same values.
export const regressionData = [[1, 3], [3, 7]];
export const residualData = [[1, 2], [2, 2.5], [3, 4], [4, 5.5]];

export function regression(data, w, b) {
  const errors = data.map(([x, y]) => w * x + b - y);
  const loss = errors.reduce((sum, e) => sum + e * e, 0) / data.length;
  const dw = 2 * errors.reduce((sum, e, i) => sum + data[i][0] * e, 0) / data.length;
  const db = 2 * errors.reduce((sum, e) => sum + e, 0) / data.length;
  return { w, b, loss, dw, db, norm: Math.hypot(dw, db), errors };
}

export function descent(data, w, b, eta, steps, { fixedBias = false } = {}) {
  const trace = [regression(data, w, b)];
  let increasing = 0, divergedAt = null;
  for (let i = 1; i <= steps; i += 1) {
    const prev = trace[i - 1];
    const next = regression(data, prev.w - eta * prev.dw, fixedBias ? b : prev.b - eta * prev.db);
    if (!Number.isFinite(next.loss)) break;
    increasing = next.loss > prev.loss ? increasing + 1 : 0;
    if (increasing === 3 && divergedAt === null) divergedAt = i;
    trace.push(next);
  }
  return { trace, divergedAt };
}

export function leastSquares(data) {
  const meanX = data.reduce((s, p) => s + p[0], 0) / data.length;
  const meanY = data.reduce((s, p) => s + p[1], 0) / data.length;
  const variance = data.reduce((s, p) => s + (p[0] - meanX) ** 2, 0);
  if (variance === 0) throw new Error('Distinct x values required');
  const w = data.reduce((s, p) => s + (p[0] - meanX) * (p[1] - meanY), 0) / variance;
  return regression(data, w, meanY - w * meanX);
}

// XᵀX = I. Ridge uses SSE + λ||w||²; Lasso uses SSE/2 + λ||w||₁,
// matching the two conventions in formula-ridge-lasso-closed-form.
export function coefficients(c, lambda, method) {
  if (!Number.isFinite(lambda) || lambda < 0) throw new Error('Invalid lambda');
  if (!['ridge', 'lasso'].includes(method)) throw new Error('Unknown penalty');
  return c.map(v => method === 'ridge' ? v / (1 + lambda) : Math.sign(v) * Math.max(Math.abs(v) - lambda, 0));
}

export function learningCurves(epochs = 16, patience = 3) {
  const points = Array.from({ length: epochs + 1 }, (_, epoch) => {
    const train = Math.exp(-0.3 * epoch);
    return { epoch, train, validation: train + 0.004 * epoch ** 2 };
  });
  let best = 0, stale = 0, stop = epochs;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].validation < points[best].validation) { best = i; stale = 0; }
    else stale += 1;
    if (stale >= patience) { stop = i; break; }
  }
  return { points, best, stop, patience };
}

export function numericParams(params, domains) {
  if (!params || Object.keys(params).sort().join() !== Object.keys(domains).sort().join()) throw new Error('Unexpected F7 parameters');
  for (const [key, [min, max]] of Object.entries(domains)) {
    if (!Number.isFinite(params[key]) || params[key] < min || params[key] > max) throw new Error(`Invalid ${key}`);
  }
}

export const mix = (a, b, t) => a + (b - a) * t;
export const clamp = v => Math.max(0, Math.min(1, v));
export const format = v => new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 3,
  notation: v !== 0 && Math.abs(v) < 0.001 ? 'scientific' : 'standard',
}).format(v);

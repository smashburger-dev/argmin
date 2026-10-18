import { regressionData, regression, descent, numericParams, format, clamp, mix } from '../objects/optimization-model.mjs';
import { figure } from '../objects/optimization-plot.mjs';
import { readingPlane, text } from '../objects/linalg-stage.mjs';
import { newellNormal, cylinder } from '../kit/solids.mjs';
import { basis, projector, deg } from '../kit/camera.mjs';

export const defaults = { eta: 0.05 };
export const captions = [
  'Die Höhe ist der MSE über w und b. Das Zeichnungsraster besteht nicht aus Datenpunkten.',
  'Der Gradient zeigt bergauf. Seine Komponenten liefern mit der Lernrate den Schritt bergab.',
  'Jeder Spurpunkt ist neu berechnet. Eine zu große Lernrate lässt den Verlust wiederholt wachsen.',
];
const limits = { w: [-0.25, 3], b: [-0.5, 2.25] };
const resolution = 8;
export const surfacePoint = (w, b, lift = 0) => [12 * w, 12 * b, regression(regressionData, w, b).loss * 0.45 + lift];
function tile(i, j) {
  const w = limits.w[0] + (limits.w[1] - limits.w[0]) * i / resolution;
  const b = limits.b[0] + (limits.b[1] - limits.b[0]) * j / resolution;
  const dw = (limits.w[1] - limits.w[0]) / resolution, db = (limits.b[1] - limits.b[0]) / resolution;
  const pts = [surfacePoint(w, b), surfacePoint(w + dw, b), surfacePoint(w + dw, b + db), surfacePoint(w, b + db)];
  const faces = [[pts[0], pts[1], pts[2]], [pts[0], pts[2], pts[3]]].map(p => ({ pts: p, normal: newellNormal(p), smooth: true }));
  const min = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k]))), max = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])));
  return { kind: 'solid', id: `surface-${i}-${j}`, tone: 'hi', mesh: { faces, min, max, center: min.map((x, k) => (x + max[k]) / 2) } };
}
const stroke = (id, pts, tone = 'hi', extra = {}) => ({ kind: 'stroke', id, pts, tone, width: 1.2, ...extra });

// For these two data points, loss = 5u² + 4uv + v²,
// where u=w−2, v=b−1. Solve this exact quadratic for each contour.
function contour(level, ground) {
  return Array.from({ length: 81 }, (_, i) => {
    const angle = Math.PI * 2 * i / 80;
    const u = Math.sqrt(level) * Math.cos(angle), v = Math.sqrt(level) * Math.sin(angle) - 2 * u;
    const w = u + 2, b = v + 1;
    return [w * 12, b * 12, ground ? -0.1 : level * 0.45 + 0.08];
  });
}
function compute(p) {
  const run = descent(regressionData, 0, 0, p.eta, 12);
  const tiles = Array.from({ length: resolution ** 2 }, (_, k) => tile(k % resolution, Math.floor(k / resolution)));
  const levels = [0.02, 0.08, 0.2];
  const contours = levels.flatMap((v, i) => [stroke('contour-' + i, contour(v, false), 'hi'), stroke('floor-contour-' + i, contour(v, true), 'lo')]);
  const m = { ...p, ...run, tiles, contours, levels, data: regressionData,
    checkpointW: 2.5,
    checkpoint: regression([[1, 2], [2, 4], [3, 6]], 2.5, 0).dw,
    optimum: regression(regressionData, 2, 1) };
  m.framing = frameScene(m);
  return m;
}
function stepIndex(m, phase) { return phase < 1 ? 0 : Math.min(m.trace.length - 1, Math.floor(clamp(phase - 1) * 12)); }
function current(m, phase) {
  const i = stepIndex(m, phase), a = m.trace[i], b = m.trace[Math.min(i + 1, m.trace.length - 1)];
  const t = phase < 1 ? 0 : clamp(phase - 1) * 12 - i;
  return regression(m.data, mix(a.w, b.w, t), mix(a.b, b.b, t));
}
function inView(p) { return p.w >= limits.w[0] && p.w <= limits.w[1] && p.b >= limits.b[0] && p.b <= limits.b[1]; }
function arrow(id, start, end, tone) {
  const d = end.map((v, i) => v - start[i]), len = Math.hypot(...d);
  const h = Math.min(1.8, len * 0.3), xy = Math.max(1e-9, Math.hypot(d[0], d[1]));
  const base = end.map((v, i) => v - d[i] / Math.max(1e-9, len) * h);
  const side = [-d[1] / xy, d[0] / xy, 0], width = tone === 'lit' ? 2.4 : 1.4;
  const head = [-1, 1].map(sign => base.map((v, i) => v + sign * side[i] * h * 0.45));
  return [stroke(id, [start, end], tone, { width }), stroke(id + '-head', [head[0], end, head[1]], tone, { width })];
}
function gradientItems(m, point, phase) {
  const start = surfacePoint(point.w, point.b, 0.3);
  // All components use one stated factor; the arrow is in the tangent plane.
  const scale = 0.035 * clamp(phase), dw = point.dw * scale, db = point.db * scale;
  const tip = [start[0] + dw * 12, start[1] + db * 12, start[2] + (point.dw * dw + point.db * db) * 0.45];
  const x = [tip[0], start[1], start[2] + point.dw * dw * 0.45];
  return [...arrow('gradient', start, tip, 'lit'), ...arrow('component-w', start, x, 'hi'), ...arrow('component-b', x, tip, 'hi'),
    readingPlane('component-w-label', [(start[0] + x[0]) / 2 + 1, -1, (start[2] + x[2]) / 2 + 8], [9, 6], [{ ...text('dw', 0, 5, '∂w', 5), font: 'sans' }]),
    readingPlane('component-b-label', [tip[0] - 2, tip[1], tip[2] + 9], [9, 6], [{ ...text('db', 0, 5, '∂b', 5), font: 'sans' }])];
}
function clippedSegment(a, b) {
  let lo = 0, hi = 1;
  for (const [key, [min, max]] of Object.entries(limits)) {
    const delta = b[key] - a[key];
    if (Math.abs(delta) < 1e-12) {
      if (a[key] < min || a[key] > max) return null;
      continue;
    }
    const t0 = (min - a[key]) / delta, t1 = (max - a[key]) / delta;
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    if (lo > hi) return null;
  }
  return [lo, hi].map(t => ({ w: mix(a.w, b.w, t), b: mix(a.b, b.b, t) }));
}
function trailsFor(m, phase, p) {
  const index = stepIndex(m, phase);
  return Array.from({ length: 12 }, (_, i) => {
    const end = i === index ? p : m.trace[i + 1];
    const segment = clippedSegment(m.trace[i], end);
    return stroke('trace-' + i, (segment ?? [m.trace[0], m.trace[0]]).map(s => surfacePoint(s.w, s.b, 0.3)), 'lit', { width: 1.8, visible: i <= index && phase > 1 && segment !== null });
  });
}
function items(m, phase) {
  const p = current(m, phase), visible = inView(p);
  const ball = { kind: 'solid', id: 'current-point', tone: 'lit', mesh: cylinder(surfacePoint(visible ? p.w : 0, visible ? p.b : 0, 0.2), 0.65, 0.7, { segments: 8 }), visible };
  const trails = trailsFor(m, phase, p);
  return [...m.tiles, ...m.contours, ...gradientItems(m, p, phase).map(item => ({ ...item, visible: visible && phase >= 0.01 && phase <= 1 })), ...trails, ball,
    stroke('axis-w', [[-3, -6, -0.1], [36, -6, -0.1]]), stroke('axis-b', [[40, -6, -0.1], [40, 27, -0.1]]),
    readingPlane('axis-w-label', [38, -6, 0], [8, 8], [{ ...text('w-label', 0, 5, 'w', 5), font: 'sans' }]),
    readingPlane('axis-b-label', [40, 27, 12], [4, 6], [{ ...text('b-label', 0, 5, 'b', 5), font: 'sans' }])];
}
const scene = figure({ id: 'mse-landscape', captions, validate: p => numericParams(p, { eta: [0.005, 0.3] }), compute, items,
  detail: (m, phase) => {
    const i = stepIndex(m, phase), p = current(m, phase);
    const status = m.divergedAt === null || i < m.divergedAt ? '' : ` Verlust wächst seit drei Schritten, erkannt bei Schritt ${m.divergedAt}.`;
    return `η = ${format(m.eta)}, Schritt ${i}. w = ${format(p.w)}, b = ${format(p.b)}. MSE = ${format(p.loss)}. ∂w = ${format(p.dw)}, ∂b = ${format(p.db)}, |∇L| = ${format(p.norm)}.${inView(p) ? '' : ' Die Spur hat den Ausschnitt verlassen.'}${status}`;
  }, answers: [m => m.checkpoint], predictions: { 'step-0': m => m.checkpoint },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'spatial';
const baseCamera = { azimuth: deg(32), elevation: deg(32), target: [16, 10, 8], zoom: 1 };
function itemPoints(item) {
  if (item.kind === 'solid') return item.mesh.faces.flatMap(f => f.pts);
  if (item.kind === 'stroke') return item.pts;
  return [[0, 0], [item.size[0], 0], item.size, [0, item.size[1]]].map(([u, v]) => item.origin.map((x, i) => x + item.ex[i] * u + item.ey[i] * v));
}
function frameScene(m) {
  const project = projector(baseCamera, { width: 0, height: 0 });
  const points = items(m, 1).filter(item => item.visible !== false).flatMap(itemPoints).map(project);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const cx = (left + right) / 2, cy = (top + bottom) / 2, axes = basis(baseCamera);
  return { width: right - left, height: bottom - top,
    target: baseCamera.target.map((v, i) => v + axes.right[i] * cx - axes.up[i] * cy) };
}
export function cameraFor(m, p, vp) {
  return { ...baseCamera, target: m.framing.target,
    zoom: Math.min((vp.width - 48) / m.framing.width, (vp.height - 48) / m.framing.height) };
}

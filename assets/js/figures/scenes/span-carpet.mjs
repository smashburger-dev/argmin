import { createScene, readingPlane, text } from '../objects/linalg-stage.mjs';

export const defaults = { k: -1, s: 1.5 };
export const captions = [
  'Die beiden Richtungen stammen aus dem Lektionsbeispiel. Jede bringt eine neue Richtung in die Ebene.',
  'Die Fliesen zeigen die Fläche des Lektionsbeispiels. Übertrage das Flächenmaß auf das Vektorpaar in der Frage.',
  'Die zweite Richtung wird zum halben ersten Vektor. Alle Fliesen klappen zur Linie zusammen: Die Fläche ist null.',
];
const clamp = (x) => Math.min(1, Math.max(0, x));
function computeModel({ k, s }) {
  const u = [2, 1], v = [1, 3];
  const checkpointV = [2 * k, k + s];
  return { u, v, det: u[0] * v[1] - u[1] * v[0], k, s,
    checkpoint: { u, v: checkpointV, det: u[0] * checkpointV[1] - u[1] * checkpointV[0] },
    unit: 7, origin: [3, 32], panel: { origin: [-15, 0, 36], size: [30, 36], center: [0, 0, 18] } };
}
function directions(m, phase) {
  const flat = clamp(phase - 1);
  return { u: m.u, v: m.v.map((x, i) => x * (1 - flat) + m.u[i] / 2 * flat) };
}
function point(m, x, y) { return [m.origin[0] + x * m.unit, m.origin[1] - y * m.unit]; }
function tile(m, u, v, i, phase) {
  const p = point(m, i / m.det * u[0], i / m.det * u[1]);
  return {
    kind: 'plane', id: 'area-unit-' + i, origin: [m.panel.origin[0] + p[0], 0.02, 36 - p[1]],
    ex: [u[0] * m.unit / m.det, 0, u[1] * m.unit / m.det],
    ey: [v[0] * m.unit, 0, v[1] * m.unit], normal: [0, -1, 0], size: [1, 1], visible: phase > i / m.det && phase < 2,
    prims: [{ t: 'rect', key: 'unit', from: [0, 0], to: [1, 1], plate: true, tone: 'board', alpha: clamp(phase) }],
  };
}
function items(m, phase) {
  const { u, v } = directions(m, phase);
  const start = point(m, 0, 0), endU = point(m, ...u), endV = point(m, ...v);
  const prims = [
    { t: 'arrow', key: 'u', from: start, to: endU, tone: 'mid', width: 0.25 },
    { t: 'arrow', key: 'v', from: start, to: endV, tone: 'lit', width: 0.25 },
    text('u-label', endU[0] + 1.5, endU[1] + 2, 'u', 2.1),
    text('v-label', endV[0] - 3, endV[1] - 1.5, 'v', 2.1, 'lit'),
  ];
  for (let i = 0; i < m.det; i += 1) {
    const a = (i + 0.5) / m.det;
    const p = point(m, a * u[0] + v[0] / 2, a * u[1] + v[1] / 2);
    prims.push({ ...text('unit-label-' + i, p[0] - 0.4, p[1] + 0.6, '1', 1.9), visible: phase === 1 });
  }
  return [
    ...Array.from({ length: m.det }, (_, i) => tile(m, u, v, i, phase)),
    readingPlane('directions', m.panel.origin, m.panel.size, prims),
  ];
}
const scene = createScene({ id: 'span-carpet', defaults, captions, predictBeat: 1,
  worldItems: () => [], bounds: [], ground: null,
  validate: ({ k, s }) => { if (k !== -1 || s !== 1.5) throw new Error('Authored transfer checkpoint only'); },
  model: computeModel, items, predict: (m) => m.checkpoint.det,
  numbers: (m) => [m.det, m.checkpoint.det, ...m.u, ...m.v, ...m.checkpoint.v, m.k, m.s],
  lines: (m, phase) => [phase < 2 ? 'u = (2; 1), v = (1; 3)' : 'Abhängig: v = 0,5 · u'],
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const cameraFor = (m, p, vp) => ({ azimuth: 0, elevation: 0, target: m.panel.center, zoom: Math.min(vp.width * 0.9 / 30, vp.height * 0.9 / 36) });

// Flat diagrams keep their authored projection for every input method.
export const viewMode = 'flat';

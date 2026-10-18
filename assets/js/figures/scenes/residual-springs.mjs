import { regression, residualData, leastSquares, numericParams, mix, clamp, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot, curve } from '../objects/optimization-plot.mjs';

export const defaults = { outlier: 2 };
export const captions = [
  'Die Federn messen die senkrechten Residuen zur Geraden, nicht den kürzesten Abstand.',
  'Der letzte Punkt wandert nach oben. Sein quadrierter Fehler zieht besonders stark an der Geraden.',
  'Die Ausgleichsgerade gibt nach. Ihre Lage minimiert die Summe der quadrierten Federlängen.',
];
const project = (x, y) => [25 + x * 8, 78 - y * 8];
function compute(params) {
  const shifted = residualData.map(([x, y], i) => [x, y + (i === 3 ? params.outlier : 0)]);
  return { ...params, data: residualData, shifted, fit: leastSquares(shifted), checkpoint: regression(residualData, 1, 0).loss };
}
function state(m, phase) {
  const data = m.data.map(([x, y], i) => [x, mix(y, m.shifted[i][1], clamp(phase))]);
  const w = mix(1, m.fit.w, clamp(phase - 1)), b = mix(0, m.fit.b, clamp(phase - 1));
  return { data, ...regression(data, w, b) };
}
function spring(x, y0, y1) {
  return Array.from({ length: 13 }, (_, i) => project(x + (i % 2 ? 0.07 : -0.07) * Math.sin(Math.PI * i / 12), mix(y0, y1, i / 12)));
}
function items(m, phase) {
  const s = state(m, phase);
  return [
    panel([
      label('title', 10, 6, 'Residuum = Ziel − Vorhersage'),
      line('x-axis', project(0, 0), project(5, 0)), line('y-axis', project(0, 0), project(0, 8)),
      label('x', 75, 81, 'x'), label('y', 14, 20, 'y'), label('zero', 25, 85, '0', 'hi', 'middle'),
      ...s.data.map(([x, y], i) => dot('data-' + i, project(x, y), 'hi')),
      label('mse', 10, 98, 'MSE = ' + format(s.loss)),
    ]),
    curve('fit-line', [project(Math.max(0, -s.b / s.w), Math.max(0, s.b)), project(Math.min(5, (8 - s.b) / s.w), Math.min(8, 5 * s.w + s.b))], 'lit'),
    ...s.data.map(([x, y], i) => curve('spring-' + i, spring(x, s.w * x + s.b, y))),
  ];
}
const scene = figure({ id: 'residual-springs', captions, validate: p => numericParams(p, { outlier: [0, 2] }), compute, items,
  detail: (m, p) => { const s = state(m, p); return `w = ${format(s.w)}, b = ${format(s.b)}. MSE = ${format(s.loss)}.`; },
  answers: [m => m.checkpoint], predictions: { 'step-0': m => m.checkpoint },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

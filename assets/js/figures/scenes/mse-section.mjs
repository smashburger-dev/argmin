import { regression, numericParams, mix, clamp, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot, curve } from '../objects/optimization-plot.mjs';

export const defaults = { x0: 1.5 };
export const captions = [
  'Zwei Punkte bestimmen die Sekante. Hier ist x₀ bereits auf den Wert der Übertragungsfrage eingestellt.',
  'Der zweite Punkt rückt heran. Die Steigung nähert sich der Ableitung am festen Punkt.',
  'Im Grenzwert bleibt die Tangente. Bei der MSE-Fläche entspricht dies dem Schnitt bei festem b.',
];
const square = x => regression([[1, 0]], x, 0);
const project = (x, y) => [34 + 14 * x, 84 - 14 * y];
function compute(p) {
  return { ...p, slope: square(p.x0).dw, value: square(p.x0).loss, h: [0.5, 0.1, 0],
    samples: Array.from({ length: 51 }, (_, i) => { const x = -0.5 + i * 2.7 / 50; return project(x, square(x).loss); }) };
}
function current(m, phase) {
  const h = phase <= 1 ? mix(m.h[0], m.h[1], phase) : mix(m.h[1], 0, clamp(phase - 1));
  return { h, slope: h === 0 ? m.slope : (square(m.x0 + h).loss - m.value) / h };
}
function items(m, phase) {
  const s = current(m, phase), intercept = m.value - s.slope * m.x0;
  return [panel([
    label('title', 8, 12, phase < 2 ? 'Sekante an f(x) = x²' : 'Tangente an f(x) = x²'),
    line('x', project(-0.5, 0), project(3, 0)), line('y', project(0, 0), project(0, 4.4)),
    label('x-label', 81, 87, 'x'), label('zero', 27, 92, '0'),
    dot('P', project(m.x0, m.value), 'hi'), dot('Q', project(m.x0 + s.h, square(m.x0 + s.h).loss)),
    label('values', 8, 99, 'Steigung = ' + format(s.slope)),
  ]), curve('square', m.samples),
  curve('secant', [project(0.7, s.slope * 0.7 + intercept), project(2.1, s.slope * 2.1 + intercept)], 'lit')];
}
const scene = figure({ id: 'mse-section', captions, validate: p => numericParams(p, { x0: [1.5, 1.5] }), compute, items,
  detail: (m, p) => { const s = current(m, p); return `x₀ = ${format(m.x0)}, h = ${format(s.h)}. Sekantensteigung ${format(s.slope)}; Grenzwert ${format(m.slope)}.`; },
  answers: [m => m.slope], predictions: { 'step-1': m => m.slope },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

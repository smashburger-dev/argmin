import { descent, numericParams, mix, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = { eta: 0.4 };
export const captions = [
  'Eine Seite ist ein Batch. Nach dem Batch folgt genau eine Korrektur des Gewichts.',
  'Die erste Korrektur folgt der Update-Regel. Übertrage sie auf das Quadrat-Beispiel der Frage.',
  'Vier Seiten sind eine Epoche: vier Batches und vier Updates.',
  'Im zweiten Kapitel werden dieselben vier Batches erneut verarbeitet. Insgesamt sind es acht Updates.',
];
function compute(p) {
  const steps = descent([[1, 0]], 2, 0, p.eta, 8, { fixedBias: true });
  return { ...p, ...steps, pages: 4, epochs: 2, checkpoint: descent([[1, 0]], 2, 0, 0.4, 1, { fixedBias: true }).trace[1].w };
}
const count = phase => phase <= 1 ? phase : phase <= 2 ? 1 + (phase - 1) * 3 : 4 + (phase - 2) * 4;
function current(m, phase) {
  const n = count(phase), index = Math.min(7, Math.floor(n));
  return { n, w: mix(m.trace[index].w, m.trace[index + 1].w, n - index) };
}
function items(m, phase) {
  const s = current(m, phase), completed = Math.floor(s.n), page = Math.max(0, Math.ceil(s.n) - 1) % m.pages;
  return [panel([
    label('epoch', 8, 12, 'Kapitel / Epoche ' + Math.max(1, Math.ceil(s.n / m.pages))),
    ...Array.from({ length: m.pages }, (_, i) => ({ t: 'rect', key: 'page-' + i, from: [10 + i * 21, 22], to: [26 + i * 21, 49], plate: true, tone: i === page ? 'lit' : 'hi' })),
    ...Array.from({ length: m.pages }, (_, i) => label('page-number-' + i, 18 + i * 21, 37.25, i + 1, i === page ? 'lit' : 'hi', 'middle')),
    label('updates', 8, 64, 'Updates: ' + completed), label('weight', 8, 77, 'w = ' + format(s.w)),
    line('weight-axis', [14, 91], [86, 91], 'lo'), label('zero', 14, 99, '0', 'hi', 'middle'), label('two', 86, 99, '2', 'hi', 'middle'),
    dot('weight-dot', [14 + 36 * s.w, 91]),
  ])];
}
const scene = figure({ id: 'training-book', captions, validate: p => numericParams(p, { eta: [0.05, 0.45] }), compute, items,
  detail: (m, p) => { const s = current(m, p); return `η = ${format(m.eta)}. ${Math.floor(s.n)} Updates, w = ${format(s.w)}, L = ${format(s.w ** 2)}. Jeder Batch hat hier denselben Beispielverlust w².`; },
  answers: [m => m.checkpoint], predictions: { 'step-0': m => m.checkpoint },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

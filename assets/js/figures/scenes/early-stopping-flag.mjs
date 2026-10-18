import { learningCurves, numericParams, mix, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot, curve } from '../objects/optimization-plot.mjs';

export const defaults = { patience: 3 };
export const captions = [
  'Training und Validierung verbessern sich zunächst gemeinsam. Die Kurven sind ein schematisches Beispiel.',
  'Die Validierung steigt wieder. Die Übertragungsfrage setzt die Kurve bei t = 10 ungebremst fort.',
  'Nach der Patience stoppt der Lauf. Die Fahne markiert das behaltene Modell, nicht den letzten Zustand.',
];
const project = (t, loss) => [18 + t * 4.5, 83 - loss * 34];
function compute(p) {
  const curves = learningCurves(16, p.patience);
  return { ...curves, checkpoint: curves.points[10].validation };
}
const currentEpoch = (m, phase) => phase <= 1 ? mix(m.best, m.stop, phase) : mix(m.stop, m.best, phase - 1);
function items(m, phase) {
  const epoch = currentEpoch(m, phase), n = Math.floor(epoch), best = m.points[m.best];
  const point = m.points[n], next = m.points[Math.min(n + 1, 16)];
  const validation = mix(point.validation, next.validation, epoch - n);
  const curveEnd = phase > 1 ? m.stop : epoch;
  const shown = m.points.filter(p => p.epoch <= curveEnd);
  const end = m.points[Math.floor(curveEnd)], endNext = m.points[Math.min(Math.floor(curveEnd) + 1, 16)];
  const tail = { epoch: curveEnd, train: mix(end.train, endNext.train, curveEnd % 1), validation: mix(end.validation, endNext.validation, curveEnd % 1) };
  return [panel([
    label('title', 8, 12, 'Verlust auf neuen Daten'),
    label('train-label', 8, 23, 'Training · gestrichelt'), label('val-label', 8, 34, 'Validierung', 'lit'),
    line('x', project(0, 0), project(16, 0)), line('y', project(0, 0), project(0, 1.1)),
    label('epoch', 33, 99, 'Epoche ' + format(epoch)), label('zero', 8, 90, '0'),
    dot('current', project(epoch, validation)),
    dot('transfer-point', project(10, m.checkpoint), 'lit', { ring: true, visible: phase === 1 }),
    { ...label('transfer-label', 66, 59, 't = 10', 'lit'), visible: phase === 1 },
    line('flag-pole', project(best.epoch, 0), project(best.epoch, best.validation + 0.15), 'hi', { visible: phase > 1 }),
    line('flag', project(best.epoch, best.validation + 0.15), project(best.epoch + 1.4, best.validation + 0.15), 'hi', { visible: phase > 1, width: 1.1 }),
  ]),
  curve('training', [...shown, tail].map(p => project(p.epoch, p.train)), 'hi', { dash: [1, 1] }),
  curve('validation', [...shown, tail].map(p => project(p.epoch, p.validation)), 'lit'),
  curve('continuation', [m.points[m.stop], m.points[10]].map(p => project(p.epoch, p.validation)), 'lit', { dash: [1, 1], visible: phase === 1 }),
  ];
}
const scene = figure({ id: 'early-stopping-flag', captions,
  validate: p => { numericParams(p, { patience: [1, 5] }); if (!Number.isInteger(p.patience)) throw new Error('Integer patience required'); },
  compute, items,
  detail: (m, p) => `Epoche ${format(currentEpoch(m, p))}. Beste Epoche ${m.best}: Validierung ${format(m.points[m.best].validation)}. Stopp bei ${m.stop}, Patience ${m.patience}.`,
  answers: [m => m.checkpoint], predictions: { 'step-1': m => m.checkpoint },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

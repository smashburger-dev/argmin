import { coefficients, numericParams, mix, clamp, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = { lambda: 2, method: 0 };
export const captions = [
  'Ohne Strafe sitzen die Schlitten bei den unregularisierten Koeffizienten.',
  'Ridge zieht jeden Schlitten proportional zur Auslenkung Richtung null.',
  'Lasso setzt kleine Beiträge exakt null. Hier gelten die im Text genannten unterschiedlichen Loss-Normierungen.',
];
function compute(p) {
  const c = [3, 1.5, -1];
  return { ...p, c, ridge: coefficients(c, p.lambda, 'ridge'), lasso: coefficients(c, p.lambda, 'lasso'),
    checkpoint: coefficients([3], 2, 'ridge')[0] };
}
function values(m, phase) {
  const first = coefficients(m.c, m.lambda * clamp(phase), m.method === 1 ? 'lasso' : 'ridge');
  return first.map((v, i) => mix(v, m.lasso[i], clamp(phase - 1)));
}
const methodName = (m, phase) => phase === 0 ? 'Ohne Strafe' : m.method || phase === 2 ? 'Lasso' : phase > 1 ? 'Übergang Ridge → Lasso' : 'Ridge';
function items(m, phase) {
  const v = values(m, phase), title = phase < 1 ? 'Ohne Strafe → ' + (m.method ? 'Lasso' : 'Ridge') : methodName(m, phase);
  return [panel([
    label('title', 8, 8, title), label('lambda', 8, 24, 'λ = ' + format(m.lambda * clamp(phase))),
    ...m.c.flatMap((_, i) => {
      const y = 43 + i * 21, x = 42 + v[i] * 12;
      return [line('rail-' + i, [14, y], [84, y], 'lo'), line('zero-' + i, [42, y - 4], [42, y + 4]),
        line('pull-' + i, [42, y], [x, y], 'lit', { width: 0.8 }),
        { t: 'rect', key: 'sled-' + i, from: [x - 1.8, y - 2], to: [x + 1.8, y + 2], plate: true, tone: 'lit' },
        dot('origin-' + i, [42, y], 'hi', { r: 0.6 }), label('value-' + i, 8, y - 6, `w${'₁₂₃'[i]} = ${format(v[i])}`)];
    }),
    label('scale', 42, 99, '0', 'hi', 'middle'), label('max', 78, 99, '+3', 'hi', 'middle'),
  ])];
}
const scene = figure({ id: 'rubber-band-coefficients', captions,
  validate: p => { numericParams(p, { lambda: [0, 5], method: [0, 1] }); if (!Number.isInteger(p.method)) throw new Error('Discrete penalty required'); },
  compute, items, detail: (m, p) => `${methodName(m, p)}, λ = ${format(m.lambda * clamp(p))}. Gewichte: ${values(m, p).map(format).join('; ')}.`,
  answers: [m => m.checkpoint], predictions: { 'step-0': m => m.checkpoint },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

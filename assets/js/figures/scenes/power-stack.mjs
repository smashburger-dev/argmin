import { diagramScene, label, rectangle } from '../objects/f12-diagram.mjs';

export const viewMode = 'flat';
export const defaults = { base: 2, exponent: 5 };
export const captions = [
  'Starte mit eins. Eine Verdopplung ist eine Operation, nicht eine zusätzliche Einheit.',
  'Nach drei Verdopplungen ist aus eins der Wert acht geworden.',
  'Fünf Verdopplungen führen zu 32. Die Stufen zählen Operationen, ihre Höhe ist keine Mengenskala.',
  'Die Umkehrfrage startet bei 32: Wie viele Verdopplungen führen von eins dorthin?',
];
function compute(p) {
  const values = Array.from({ length: p.exponent + 1 }, (_, k) => p.base ** k);
  return { ...p, values, numbers: [0, 1, 2, 3, 4, 5, 8, 16, 32],
    descriptions: ['0 Verdopplungen: 1.', '3 Verdopplungen: 8.', '5 Verdopplungen: 32.', 'log₂(32) = 5.'] };
}
function stack(m, count, reverse) {
  const layers = Array.from({ length: m.exponent }, (_, index) => {
    const k = index + 1, y = 78 - index * 12;
    return [rectangle(`level-${k}`, [14, y - 11], [86, y], k === count ? 'lit' : 'hi'),
      label(`value-${k}`, 21, y - 3, `${k} × verdoppelt`, 5.3),
      label(`total-${k}`, 73, y - 3, String(m.values[k]), 5.3, k === count ? 'lit' : 'hi')]
      .map((prim) => ({ ...prim, visible: k <= count }));
  }).flat();
  return [...layers, rectangle('start-card', [14, 82], [86, 99]), label('start', 18, 93, 'Start: 1', 5.3),
    label('formula', 14, 9, reverse ? `log₂(${m.values[count]}) = ?` : `${m.base} hoch ${count} = ${m.values[count]}`, 6)];
}
const scene = diagramScene({ id: 'power-stack', defaults, captions, compute,
  frames: (m) => [stack(m, 0, false), stack(m, 3, false), stack(m, 5, false), stack(m, 5, true)],
  prediction: (m) => m.exponent });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

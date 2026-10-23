import { fixedScene, heading, footer, label, grid } from '../objects/f2-grid.mjs';
import { dropout } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Vier Aktivierungen vor Dropout. p ist hier die Behaltewahrscheinlichkeit, nicht die Ausfallwahrscheinlichkeit.',
  'Feste Ziehwerte u: Ein Teammitglied bleibt genau dann, wenn u kleiner als p ist. Die Maske bleibt für diesen Schritt fest.',
  'Training mit invertiertem Dropout: behaltene Aktivierungen durch p teilen, ausgefallene auf null setzen.',
  'Bei Inferenz ist das ganze Team da. Keine Maske und keine zusätzliche Skalierung bei dieser Konvention.',
];
function compute() {
  const activations = [2, 4, 6, 8], keep = 0.5, draws = [0.2, 0.8, 0.1, 0.7];
  return { activations, keep, draws, ...dropout(activations, keep, draws) };
}
function row(key, values, y, active = () => false) {
  return grid(key, [values], { x: 14, y, cell: 18, active });
}
function frames(m) {
  return [
    [heading(`Vor Dropout · p = ${m.keep}`), ...m.activations.map((_, i) => label(`unit-${i}`, 23 + i * 18, 31, `a${i + 1}`)),
      ...row('a', m.activations, 40), footer('Aktivierungen vor Dropout')],
    [heading('Maske: u < p'), ...row('draw', m.draws.map((n) => String(n).replace('.', ',')), 24),
      label('rule', 50, 54, 'u < 0,5 → 1; sonst 0'), ...row('mask', m.mask, 64, (_r, c) => Boolean(m.mask[c]))],
    [heading('Training: M · a / p'), ...row('before', m.activations, 24), label('operation', 50, 56, '× Maske und ÷ 0,5'),
      ...row('after', m.training, 66, (_r, c) => Boolean(m.mask[c]))],
    [heading('Inferenz: unverändertes a'), ...row('inference', m.inference, 40), footer('Keine weitere Skalierung')],
  ];
}
const scene = fixedScene({ id: 'team-mask', captions, compute, frames });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

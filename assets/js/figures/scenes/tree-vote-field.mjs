import { treeVoteModel } from '../objects/tree-vote-model.mjs';
import { numericParams, format, mix } from '../objects/distribution-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = {};
export const captions = [
  'Kreise sind Klasse 0, Ringe Klasse 1. Welche Trennfrage macht die Kinder möglichst rein?',
  'Die Zäune bei x = 2,5 und x = 6,5 sind gleich gut. Beide minimieren das gewichtete Gini.',
  'Eine zweite Frage trennt den rechten Ast erneut. Die Tiefe zählt die Fragen pro Weg.',
  'Drei aus Bootstrap-Stichproben gelernte Bäume stimmen für denselben Punkt x = 7 ab.',
];
const x = value => 10 + value * 9;
function giniDisplay(m, phase) {
  const refined = phase > 1.8;
  return { right: refined ? m.rightChosen.score : m.chosen.rightGini,
    summary: refined ? `Blätter: Gini ${format(m.refinedScore)}` : `Gewichtet: Gini ${format(m.chosen.score)}` };
}
function field(m, phase) {
  const split = m.chosen, child = m.tree.right.threshold;
  const display = giniDisplay(m, phase);
  return [label('field-title', 8, 7, 'Ein Feld, zwei Klassen'),
    label('parent', 8, 20, phase < 0.8 ? `Gini vorher ${format(m.parentGini)}` : `Links ${split.left.length} · rechts ${split.right.length} Zeilen`),
    line('floor', [x(0.5), 54], [x(8.5), 54]),
    ...m.rows.map(row => dot('row-' + row.id, [x(row.x), 34 + (row.y - 1) * 14], row.label === 1 ? 'lit' : 'hi', { r: 2, ring: row.label === 1, dash: [1, 0] })),
    line('split', [x(split.threshold), 28], [x(split.threshold), mix(28, 53, phase)], 'lit', { width: 0.7, visible: phase > 0 }),
    line('tie', [x(m.best.at(-1).threshold), 28], [x(m.best.at(-1).threshold), 53], 'hi', { dash: [1, 1], visible: phase > 0.8 && phase < 1.5 }),
    line('child', [x(child), 28], [x(child), mix(28, 53, phase - 1)], 'lit', { width: 0.7, visible: phase > 1 }),
    ...[1, 4, 8].map(value => label('x-' + value, x(value), 64, value, 'hi', 'middle')),
    ...[split.leftGini, display.right].flatMap((gini, i) => [
      line('gini-bar-' + i, [19 + i * 42, 76], [19 + i * 42 + gini * 32, 76], 'lit', { width: 1, visible: phase > 0.8 }),
      { ...label('gini-value-' + i, 19 + i * 42, 86, `G ${format(gini)}`, 'hi', 'middle'), visible: phase > 0.8 },
    ]),
    label('axis-name', 8, 98, phase < 0.8 ? 'Kreis 0 · Ring 1 · Merkmal x' : display.summary),
  ];
}
function voting(m) {
  return [label('vote-title', 8, 7, `Abstimmung für x = ${m.query.x}`), label('vote-subtitle', 8, 20, '3 Bootstrap-Bäume · Tiefe 2'),
    ...m.votes.flatMap((vote, i) => [label('tree-' + i, 18 + i * 32, 39, `Baum ${i + 1}`, 'hi', 'middle'),
      dot('ballot-' + i, [18 + i * 32, 55], vote === 1 ? 'lit' : 'hi', { r: 4, ring: vote === 1, dash: [1, 0] }),
      label('vote-' + i, 18 + i * 32, 74, `Klasse ${vote}`, 'hi', 'middle')]),
    label('urn', 8, 86, `Stimmen 0: ${m.voteCounts[0]} · 1: ${m.voteCounts[1]}`),
    label('prediction', 8, 98, `Mehrheit: Klasse ${m.prediction}`)];
}
function items(m, phase) {
  return [panel([...field(m, phase).map(prim => ({ ...prim, visible: prim.visible !== false && phase < 2.8 })),
    ...voting(m).map(prim => ({ ...prim, visible: phase >= 2.8 }))])];
}
const scene = figure({ id: 'tree-vote-field', captions, validate: p => numericParams(p, {}), compute: treeVoteModel, items,
  detail: (m, phase) => phase < 0.8 ? `Klassen ${m.rows.map(row => row.label).join(', ')}; Gini vorher ${format(m.parentGini)}.` :
    `Beste Schwellen ${m.best.map(s => format(s.threshold)).join(' und ')}; erster Split Gini ${format(m.chosen.score)}. Nach der zweiten Frage Gini ${format(m.refinedScore)}. Stimmen ${m.votes.join(', ')}; Mehrheit ${m.prediction}.`,
  answers: [m => m.chosen.score], predictions: { 'step-0': m => m.chosen.score },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

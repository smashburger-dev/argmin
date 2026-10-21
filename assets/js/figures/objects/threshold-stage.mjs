import { panel, label, line, dot } from './optimization-plot.mjs';
import { rectangle } from './f12-diagram.mjs';

const format = n => Number(n.toFixed(3)).toLocaleString('de-DE');
const phaseIndex = p => Math.floor(p + 0.000001);
const at = score => 8 + score * 84;

function rail(state) {
  return [line('rail', [8, 28], [92, 28]), label('zero', 8, 40, '0'), label('one', 92, 40, '1', 'hi', 'end'),
    line('threshold', [at(state.threshold), 17], [at(state.threshold), 33], 'lit', { width: 0.8 }),
    label('threshold-label', 6, 10, `Schranke t = ${format(state.threshold)}`, 'lit')];
}

function matrix(state) {
  return ['tp', 'fp', 'fn', 'tn'].flatMap((cell, i) => {
    const x = 8 + (i % 2) * 46, y = 46 + Math.floor(i / 2) * 20;
    return [rectangle(`cell-${cell}`, [x, y], [x + 38, y + 16]),
      label(`count-${cell}`, x + 19, y + 10, `${cell.toUpperCase()}  ${state.metrics[cell]}`, 'hi', 'middle')];
  });
}

export function thresholdItems(m, phase) {
  const state = m.states[phaseIndex(phase)];
  return [panel([
    ...rail(state),
    ...m.rows.flatMap((r, i) => [
      dot(`mail-${i}`, [at(r.score), 23 - (i % 2) * 7], r.actual ? 'lit' : 'hi', { ring: !r.actual }),
    ]),
    ...matrix(state),
    label('p-r', 8, 91, `P ${format(state.metrics.precision)} · R ${format(state.metrics.recall)}`),
    label('f1', 8, 99, phaseIndex(phase) === 1 ? 'F1 = 2TP / (2TP + FP + FN)' : `F1 ${format(state.metrics.f1)} · ● wahr 1 · ○ wahr 0`),
  ])];
}

export function logisticItems(m, phase) {
  const state = m.states[phaseIndex(phase)], k = phaseIndex(phase);
  return [panel([
    label('title', 6, 10, k === 1 ? `Schranke bei p = ${format(state.threshold)}` : `σ(${m.w}x ${m.b}) → p ≥ ${format(state.threshold)}`),
    label('x-head', 8, 24, 'x'), label('z-head', 30, 24, 'z'), label('p-head', 53, 24, 'p'), label('label-head', 79, 24, 'Label'),
    ...state.rows.flatMap((r, i) => {
      const y = 35 + i * 10;
      return [label(`x-${i}`, 8, y, r.x), label(`z-${i}`, 30, y, r.z), label(`p-${i}`, 53, y, format(r.score)),
        label(`pred-${i}`, 79, y, k < 2 ? '—' : r.predicted, k === 2 && r.predicted ? 'lit' : 'hi')];
    }),
    line('boundary', [6, 82], [94, 82]),
    { ...line('decision-cut', [72, 30 + 10 * state.rows.filter(r => !r.predicted).length], [76, 30 + 10 * state.rows.filter(r => !r.predicted).length], 'lit'), visible: k === 1 },
    label('boundary-label', 6, 92, m.boundary === null ? 'Keine endliche Grenze' : `Grenze x = ${format(m.boundary)}`),
    label('positives', 6, 100, k === 2 ? `${state.rows.filter(r => r.predicted).length} Werte als Klasse 1` : 'Wie viele werden positiv?'),
  ])];
}

export function baselineItems(m, phase) {
  const state = m.states[phaseIndex(phase)];
  const reveal = phaseIndex(phase) > 0;
  return [panel([
    label('title', 6, 10, 'Immer „kein Betrug“'),
    ...state.rows.map((r, i) => dot(`case-${i}`, [10 + (i % 10) * 8.8, 20 + Math.floor(i / 10) * 4.8], r.actual && reveal ? 'lit' : 'hi', { ring: !r.actual || !reveal })),
    label('legend', 6, 75, reveal ? `${state.metrics.fn} Betrugsfall übersehen` : `${state.rows.length} Fälle → alle negativ`, 'lit'),
    label('accuracy', 6, 87, `Accuracy ${format(state.metrics.accuracy * 100)} %`),
    label('recall', 6, 99, reveal ? `Recall ${format(state.metrics.recall)} · FN ${state.metrics.fn}` : 'Was passiert mit dem Betrug?'),
  ])];
}

export function responsibleItems(m, phase) {
  const s = m.states[phaseIndex(phase)];
  return [panel([
    label('title', 6, 10, `Schwelle ${format(s.threshold)} · Band ${format(m.band)}`),
    ...['A', 'B'].flatMap((group, i) => {
      const y = 22 + i * 31, g = s.groups[group];
      return [label(`group-${group}`, 6, y, `Gruppe ${group} · TP ${g.tp} · FP ${g.fp}`),
        rectangle(`track-${group}`, [6, y + 5], [90, y + 11]),
        line(`rate-${group}`, [6, y + 8], [6 + g.selection * 84, y + 8], 'lit', { width: 1.6 }),
        label(`rates-${group}`, 6, y + 22, `Auswahl ${format(g.selection)} · FPR ${format(g.fpr)}`)];
    }),
    label('gap', 6, 87, `Differenz ${format(s.gap)} ${s.gap <= m.band ? '≤' : '>'} ${format(m.band)}`, 'lit'),
    label('quality', 6, 99, `F1 ${format(s.metrics.f1)} · ${s.gap <= m.band ? 'im Band' : 'außerhalb'}`),
  ])];
}

export const thresholdDetail = (m, phase, reveal = false) => {
  const s = m.states[phaseIndex(phase)], cm = s.metrics;
  const f1 = phaseIndex(phase) === 1 && !reveal ? 'F1 aus den Matrixfächern berechnen.' : `F1 ${cm.f1}.`;
  return `Schwelle ${s.threshold}; TP ${cm.tp}, FP ${cm.fp}, FN ${cm.fn}, TN ${cm.tn}. Precision ${cm.precision}, Recall ${cm.recall}. ${f1} ${s.rows.map(r => `${r.id}:${r.cell}`).join(', ')}.`;
};
export const logisticDetail = (m, phase) => phaseIndex(phase) < 2
  ? `Sigmoid mit w ${m.w}, b ${m.b}. ${m.rows.map(r => `x ${r.x}: p ${r.score}`).join('; ')}. Label positiv genau wenn p mindestens ${m.states[0].threshold}.`
  : thresholdDetail(m, phase, true);
export const responsibleDetail = (m, phase) => {
  const s = m.states[phaseIndex(phase)];
  return `${thresholdDetail(m, phase, true)} Gruppe A: Auswahl ${s.groups.A.selection}, FPR ${s.groups.A.fpr}; Gruppe B: Auswahl ${s.groups.B.selection}, FPR ${s.groups.B.fpr}. Differenz ${s.gap}, Band ${m.band}. Das Band bleibt fest; eine optimale Auswahl erfolgt über den vorhandenen Löser in der Lektionsaufgabe.`;
};

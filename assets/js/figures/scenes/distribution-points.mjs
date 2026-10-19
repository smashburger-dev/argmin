import { distribution, numericParams, format, mix } from '../objects/distribution-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = { binWidth: 2, copies: 1 };
export const captions = [
  'Acht Werte, acht Punkte. Mehrfach vorkommende Werte stehen übereinander.',
  'Die Punkte werden in Fächern gezählt. Die Fachbreite verändert keine Messung.',
  'Mit den Kanten 0, 4 und 9 entstehen die Häufigkeiten 1 und 7. Die letzte rechte Kante zählt mit.',
  'Dieselben acht Punkte liefern Median und Quartile. Der Boxplot fasst ihre Lage zusammen.',
];
const scale = m => value => 14 + value * 72 / m.axisMax;
function positions(m, bins) {
  const x = scale(m);
  const result = [];
  bins.forEach(bin => bin.ids.forEach((id, rank) => {
    result[id] = [x((bin.start + bin.end) / 2), 70 - rank * Math.min(5, 36 / bin.ids.length)];
  }));
  return result;
}
function items(m, phase) {
  const x = scale(m);
  const raw = m.points.map(({ value, rank }) => [x(value), 62 - rank * Math.min(5, 30 / (3 * m.copies))]);
  const fine = positions(m, m.fine), coarse = positions(m, m.coarse);
  const stages = [raw, fine, coarse, raw.map(([a, b]) => [a, b + 7])];
  const k = Math.min(2, Math.floor(phase)), t = phase - k;
  const bins = phase < 1.5 ? m.fine : m.coarse;
  const s = m.stats;
  return [panel([
    label('title', 8, 7, phase < 3 ? `${s.n} unveränderte Messwerte` : 'Boxplot und dieselben Punkte'),
    label('subtitle', 8, 20, phase < 1.5 ? `Fachbreite ${m.binWidth}` : phase < 2.8 ? 'Kanten 0, 4, 9' : 'Whisker: Minimum / Maximum'),
    ...m.fine.map((_, i) => line('edge-' + i, [x(bins[i]?.start ?? 0), 31], [x(bins[i]?.start ?? 0), 73], 'mid', { visible: phase > 0 && phase < 2.8 && i < bins.length })),
    line('edge-last', [x(bins.at(-1).end), 31], [x(bins.at(-1).end), 73], 'mid', { visible: phase > 0 && phase < 2.8 }),
    ...m.values.map((_, i) => dot('point-' + i, stages[k][i].map((a, j) => mix(a, stages[k + 1][i][j], t)), 'lit', { r: m.copies > 1 ? 0.65 : 1.5 })),
    line('axis', [x(0), 75], [x(m.axisMax), 75]),
    ...Array.from({ length: 6 }, (_, i) => i * m.axisMax / 5).map((value, i) => label('tick-' + i, x(value), 84, format(value), 'hi', 'middle')),
    ...m.fine.map((_, i) => ({ ...label('count-' + i, x(((bins[i]?.start ?? 0) + (bins[i]?.end ?? 0)) / 2), 29, bins[i]?.ids.length ?? '', 'hi', 'middle'), visible: phase > 0.8 && phase < 2.8 && i < bins.length })),
    line('whisker', [x(s.min), 44], [x(s.max), 44], 'hi', { visible: phase > 2.8 }),
    line('q-bottom', [x(s.q1), 51], [x(s.q3), 51], 'hi', { visible: phase > 2.8 }),
    line('q-top', [x(s.q1), 37], [x(s.q3), 37], 'hi', { visible: phase > 2.8 }),
    ...[s.min, s.q1, s.median, s.q3, s.max].map((v, i) => line('quartile-' + i, [x(v), i % 4 === 0 ? 40 : 37], [x(v), i % 4 === 0 ? 48 : 51], i === 2 ? 'lit' : 'hi', { visible: phase > 2.8 })),
    label('result', 8, 98, phase < 2.8 ? `Median ${format(s.median)} · Mittel ${format(s.mean)}` : `Q₁ ${format(s.q1)} · M ${format(s.median)} · Q₃ ${format(s.q3)}`),
  ])];
}
const scene = figure({ id: 'distribution-points', captions, validate: p => numericParams(p, { binWidth: [1, 5], copies: [1, 128] }), compute: distribution, items,
  detail: m => `n = ${m.stats.n}; Median ${format(m.stats.median)}, Q1 ${format(m.stats.q1)}, Q3 ${format(m.stats.q3)}. Quartile linear wie NumPy; Whisker bei Minimum und Maximum. Daten: ${m.copies === 1 ? m.values.join(', ') : `${m.copies} Wiederholungen der acht Werte`}.`,
  answers: [m => m.stats.median], predictions: { 'step-0': m => m.stats.median },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

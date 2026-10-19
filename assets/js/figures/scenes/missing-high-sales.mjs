import { missingSalesModel, numericParams, format, mix } from '../objects/distribution-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = {};
export const captions = [
  'Im vollständigen Lehrbeispiel liegen fünf Umsätze zwischen 90 und 900 Euro. Die großen Fälle ziehen den Mittelwert hoch.',
  'Gerade die zwei größten Umsätze werden nicht freigegeben. Sichtbar bleiben nur die drei kleinen Fälle.',
  'Nach dem Löschen der fehlenden Ziele sinkt der Mittelwert. Die verbleibenden Werte sind unverändert.',
];
const x = value => 14 + value * 0.076;
function items(m, phase) {
  const mean = mix(m.before.mean, m.after.mean, phase - 1);
  return [panel([
    label('title', 8, 7, 'Wenn große Zielwerte fehlen'),
    label('unit', 8, 20, 'Umsatz in Euro · Lehrbeispiel'),
    ...m.rows.map(row => dot('sale-' + row.id, [x(row.value), row.observed ? 48 - (row.id % 2) * 6 : mix(48, 34, phase)], row.observed ? 'hi' : 'lit', { r: 1.6, ring: !row.observed && phase > 0.8, dash: [1, 1] })),
    line('mean', [x(mean), 53], [x(mean), 65], 'lit', { width: 0.7 }),
    line('axis', [x(0), 65], [x(1000), 65]),
    ...[0, 500, 1000].map(value => label('tick-' + value, x(value), 74, value, 'hi', 'middle')),
    label('average', 8, 86, `Mittelwert ${format(mean)} €`),
    label('remaining', 8, 98, phase < 0.8 ? `${m.before.n} bekannte Ziele` : `${m.after.n} Ziele · 2 fehlen systematisch`),
  ])];
}
const scene = figure({ id: 'missing-high-sales', captions, validate: p => numericParams(p, {}), compute: missingSalesModel, items,
  detail: (m, phase) => phase < 0.8 ? `Vollständige Umsätze ${m.rows.map(row => row.value).join(', ')} Euro; Mittelwert ${format(m.before.mean)} Euro.` :
    `Die Werte 600 und 900 fehlen zielabhängig. Verbleibend 90, 120 und 200 Euro; Mittelwert ${format(m.after.mean)} Euro statt ${format(m.before.mean)} Euro. Bekannte fehlende Werte sind nur im synthetischen Beispiel darstellbar.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

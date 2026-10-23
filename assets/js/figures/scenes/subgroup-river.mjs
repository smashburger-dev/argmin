import { subgroupModel, numericParams, format, mix } from '../objects/distribution-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = {};
export const captions = [
  '34 Fehler auf 340 Zeilen ergeben insgesamt 10 %. Diese Zahl verrät noch nicht, wer die Fehler trägt.',
  'In jung sind 12 von 240 Vorhersagen falsch, in alt 22 von 100. Die Nenner machen den Unterschied.',
  'Die Fehlerraten 5 % und 22 % liegen 17 Prozentpunkte auseinander. Die Gesamtquote bleibt 10 %.',
];
function items(m, phase) {
  const groupRates = m.groups.map(group => mix(m.rate, group.rate, phase));
  const depth = rate => 33 + rate * 1.2;
  const across = index => mix(55, 35 + index * 40, phase);
  return [panel([
    label('title', 8, 7, 'Wie tief ist die Fehlerlücke?'),
    label('unit', 8, 20, 'Fehlerrate in Prozent'),
    ...[0, 10, 20].flatMap(value => [line('grid-' + value, [19, depth(value)], [89, depth(value)], 'lo'), label('tick-' + value, 15, depth(value) + 2, value, 'hi', 'end')]),
    line('profile', [across(0), depth(groupRates[0])], [across(1), depth(groupRates[1])], 'lit', { width: 1 }),
    line('gap', [88, depth(groupRates[0])], [88, depth(groupRates[1])], 'hi', { visible: phase > 1.1 }),
    ...groupRates.map((rate, i) => line('gap-end-' + i, [84, depth(rate)], [90, depth(rate)], 'hi', { visible: phase > 1.1 })),
    ...m.groups.flatMap((group, i) => [
      dot('group-' + i, [across(i), depth(groupRates[i])], 'lit', { r: 1.6 }),
      { ...label('group-name-' + i, 35 + i * 40, 75, group.name, 'hi', 'middle'), visible: phase > 0.8 },
      { ...label('count-' + i, 35 + i * 40, 87, `${group.errors}/${group.n} = ${format(group.rate)} %`, 'hi', 'middle'), visible: phase > 0.8 },
    ]),
    { ...label('all-groups', 55, 75, 'Gesamt', 'hi', 'middle'), visible: phase <= 0.8 },
    label('result', 8, 98, phase < 1.8 ? `Gesamt ${m.errors}/${m.rows.length} = ${format(m.rate)} %` : `Lücke ${format(m.gap)} Prozentpunkte`),
  ])];
}
const scene = figure({ id: 'subgroup-river', captions, validate: p => numericParams(p, {}), compute: subgroupModel, items,
  detail: (m, phase) => phase < 0.8 ? `Gesamt ${m.errors}/${m.rows.length} = ${m.rate} %. Die Teilgruppen werden erst im nächsten Schritt aufgeschlüsselt.` :
    `${m.groups.map(g => `${g.name}: ${g.errors} Fehler / ${g.n} Fälle = ${g.rate} %`).join('; ')}. Gesamt ${m.errors}/${m.rows.length} = ${m.rate} %. Lücke ${m.gap} Prozentpunkte. Festes Lehrbeispiel, keine Aussage über Altersgruppen.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

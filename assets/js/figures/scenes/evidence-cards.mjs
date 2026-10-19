import { evidenceCard } from '../objects/evidence-card-model.mjs';
import { figure, label, plate, panel, line, inlineCamera } from '../objects/s8b-diagram.mjs';

export const captions = ['Die festen Felder machen den dokumentierten Zusammenhang sichtbar.'];
function items(m) {
  if (m.card === 'review') return reviewTimeline();
  const gap = m.shortRows.length === 3 ? 18 : 12;
  const rows = m.shortRows.flatMap(([name, value], i) => [
    label(`name-${i}`, 4, 9 + i * gap, name), label(`value-${i}`, 96, 9 + i * gap, value, 'hi', 'end'),
  ]);
  const dividers = m.shortRows.slice(1).map((_, i) => line(`divider-${i}`, [2, 13.5 + i * gap], [98, 13.5 + i * gap]));
  return [panel('evidence-cards', [plate('document', [0, 1], [100, 50]), ...dividers, ...rows])];
}
function reviewTimeline() {
  return [panel('review-timeline', [
    line('axis', [10, 24], [90, 24]),
    ...[15, 50, 85].flatMap((x, i) => [line(`tick-${i}`, [x, 21], [x, 27]), label(`point-${i}`, x, 15, ['Abruf', 'fällig', 'Abruf'][i], 'hi', 'middle')]),
    label('meaning', 50, 42, 'Nachweis auffrischen', 'hi', 'middle'),
  ])];
}
const scene = figure({ id: 'evidence-cards', captions, validate: evidenceCard, compute: evidenceCard, items,
  detail: m => `${m.caption} ${m.rows.map(([name, value]) => `${name}: ${value}`).join('. ')}. ${m.note}.${m.digest ? ` Vollständiger Digest beider Läufe: ${m.digest}.` : ''}`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, ground, readout, describe, predictValue, answerValues } = scene;
export const cameraFor = inlineCamera;
export const displayNumbers = m => m.numbers ?? [];
export const viewMode = 'flat';

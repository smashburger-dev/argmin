import { chunkWindows } from '../objects/token-model.mjs';
import { figure, fixedParams, label, plate, panel, clamp, lerp } from '../objects/s8b-diagram.mjs';
export const defaults = { text: 'abcdefghij', size: 4, overlap: 1 };
export const captions = [
  'Das feste Textband hat eine bekannte Länge. Fenstergröße und Überlappung bestimmen die Schrittweite.',
  'Das erste Fenster beginnt bei null. Der nächste Start rückt um Größe minus Überlappung vor.',
  'Der gemeinsame Buchstabe bleibt in beiden Fenstern. Überlappung fügt kein neues Zeichen in den Text ein.',
  'Auch das dritte Fenster folgt derselben Schrittweite. Die Positionen beziehen sich immer auf das Original.',
  'Der letzte Start liegt noch im Text. Deshalb zählt auch das verkürzte Restfenster.',
];
const startAt = (m, phase) => {
  const index = Math.max(0, phase - 1), lo = Math.floor(index), hi = Math.ceil(index);
  return lerp(m.windows[lo].start, m.windows[hi].start, index - lo);
};
function items(m, phase) {
  const index = Math.max(0, Math.min(m.count - 1, Math.ceil(phase) - 1)), window = m.windows[index];
  const start = startAt(m, phase), end = Math.min(m.symbols.length, start + m.size);
  const band = m.symbols.flatMap((s, i) => [
    plate(`cell-${i}`, [10 + i * 8, 25], [17 + i * 8, 38]),
    label(`char-${i}`, 13.5 + i * 8, 34, s, 'hi', 'middle'),
    label(`index-${i}`, 13.5 + i * 8, 49, i, 'hi', 'middle'),
  ]);
  return [panel('chunks', [
    label('params', 8, 11, `s = ${m.size}, o = ${m.overlap}, Schritt = ${m.step}`),
    { ...plate('window', [10 + start * 8, 23], [9 + end * 8, 40], 'lit'), fill: false, alpha: clamp(phase) },
    ...band,
    label('slice', 8, 67, phase === 0 ? 'Noch kein Fenster ausgegeben' : `Start ${window.start}: ${window.text}`),
    label('count', 8, 83, phase === 0 ? `Länge ${m.symbols.length}` : `${index + 1} von ${m.count} Fenstern`),
    label('last', 8, 98, `Starts: ${m.windows.map(w => w.start).join(', ')}`),
  ])];
}
const scene = figure({ id: 'chunk-windows', captions, validate: p => fixedParams(p, defaults), compute: p => chunkWindows(p.text, p.size, p.overlap), items,
  detail: (m, phase) => `Größe ${m.size}, Überlappung ${m.overlap}, Schrittweite ${m.step}. ${phase === 0 ? '' : m.windows.slice(0, Math.ceil(phase)).map(w => `[${w.start}:${w.end}] ${w.text}`).join('; ')} Insgesamt ${m.count} Fenster; das letzte enthält ${m.windows.at(-1).text}.`,
  answers: [m => m.count], predictions: { 'step-4': m => m.count },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

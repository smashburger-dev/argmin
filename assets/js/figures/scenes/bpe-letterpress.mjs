import { learnBpe, wordSymbols } from '../objects/token-model.mjs';
import { tokenBand, blendBand } from '../objects/token-band.mjs';
import { figure, fixedParams, label, panel } from '../objects/s8b-diagram.mjs';
export const defaults = {};
export const captions = [
  'Die drei Zeilen vertreten vier Wörter: low zählt doppelt. Der Wortendmarker bleibt ein eigenes Symbol.',
  'Die Paare (l, o) und (o, w) kommen gleich oft vor. Lexikographisch gewinnt (l, o); daraus wird lo.',
  'Nach neuem Zählen gewinnt (lo, w). Ein neues Symbol low ersetzt beide Nachbarn.',
  'Beim nächsten Gleichstand gewinnt der Wortendmarker vor e. Nur die beiden ganzen Wörter low verschmelzen weiter.',
];
function compute() {
  const learned = learnBpe(['low', 'low', 'lower', 'lowest'], 3);
  const rows = ['low', 'lower', 'lowest'];
  const states = [rows.map(wordSymbols), ...learned.rounds.map(r => [r.after[0], r.after[2], r.after[3]])];
  return { ...learned, rows, states };
}
function items(m, phase) {
  const lower = Math.floor(phase), upper = Math.ceil(phase), t = phase - lower;
  const bands = m.rows.flatMap((word, i) => blendBand(
    tokenBand(`word-${i}`, wordSymbols(word), m.states[lower][i], 30 + 25 * i),
    tokenBand(`word-${i}`, wordSymbols(word), m.states[upper][i], 30 + 25 * i), t));
  const round = m.rounds[Math.max(0, upper - 1)];
  return [panel('bpe', [
    label('pair', 8, 11, phase === 0 ? 'Start mit Zeichen' : `Paar (${round.best.join(', ')}): ${round.count} ×`, 'hi', 'start', 5.3),
    ...m.rows.map((w, i) => label(`word-label-${i}`, 8, 25 + 25 * i, i === 0 ? `${w} × 2` : w)), ...bands,
  ])];
}
const scene = figure({ id: 'bpe-letterpress', captions, validate: p => fixedParams(p, defaults), compute, items,
  detail: (m, phase) => {
    if (phase === 0) return 'Korpus low, low, lower, lowest. Paarhäufigkeiten zählen jedes der vier Wörter. Keine Paare über Wortgrenzen.';
    const round = m.rounds[Math.max(0, Math.ceil(phase) - 1)];
    return `Gewählt (${round.best.join(', ')}) mit Häufigkeit ${round.count}. Gleichstände werden lexikographisch über beide Paarsymbole aufgelöst. lowest: ${m.states[Math.ceil(phase)][2].join(' | ')}.`;
  },
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

import { sha256, changedBits } from '../objects/sha256.mjs';
import { readingPlane } from '../objects/linalg-stage.mjs';
import { figure, fixedParams, label, panel, line, clamp } from '../objects/s8b-diagram.mjs';
export const defaults = { before: 'a', after: 'b' };
export const captions = [
  'Ab oben links im Uhrzeigersinn: alle Hex-Zeichen des echten SHA‑256 von a. Ein Zeichen steht für vier Bits.',
  'Ein Byte wird geändert: a wird b. Der Ring wechselt zum neu berechneten Hash; die Bitänderungen werden gezählt.',
];
const ringSides = [
  { origin: [-38, 0, 37], ex: [1, 0, 0], ey: [0, 0, -1] },
  { origin: [42, 0, 32], ex: [0, 0, -1], ey: [-1, 0, 0] },
  { origin: [37, 0, -46], ex: [-1, 0, 0], ey: [0, 0, 1] },
  { origin: [-43, 0, -41], ex: [0, 0, 1], ey: [1, 0, 0] },
];
function ringSide(m, shown, side) {
  const { origin, ex, ey } = ringSides[side];
  const prims = [...shown.slice(side * 16, side * 16 + 16)].map((c, k) => {
    const i = side * 16 + k;
    return label(`hex-${i}`, k * 5, 0, c, c !== m.beforeHash[i] ? 'lit' : 'hi', 'middle');
  });
  return readingPlane(`seal-ring-${side}`, origin, [80, 8], prims, { ex, ey });
}
function compute(p) {
  const beforeHash = sha256(p.before), afterHash = sha256(p.after);
  return { ...p, beforeHash, afterHash, bits: changedBits(beforeHash, afterHash), totalBits: beforeHash.length * 4 };
}
function shownHash(m, phase) {
  const count = Math.floor(clamp(phase) * m.beforeHash.length);
  return m.afterHash.slice(0, count) + m.beforeHash.slice(count);
}
function items(m, phase) {
  const shown = shownHash(m, phase), bits = changedBits(m.beforeHash, shown);
  return [panel('seal', [
    line('top', [15, 20], [84, 20]), line('bottom', [15, 87], [84, 87]),
    label('input', 50, 41, phase === 0 ? `UTF-8: ${m.before}` : `UTF-8: ${m.before} → ${m.after}`, 'hi', 'middle'),
    label('byte', 50, 54, phase === 0 ? 'Ausgangsstand' : '1 Byte geändert', 'hi', 'middle'),
    label('bits', 50, 68, `${bits} / ${m.totalBits} Bits anders`, 'hi', 'middle', 5.3),
    label('hex-note', 50, 79, '64 Hex-Zeichen', 'hi', 'middle', 5.3),
  ]), ...ringSides.map((_, side) => ringSide(m, shown, side))];
}
const scene = figure({ id: 'sha256-seal', captions, validate: p => fixedParams(p, defaults), compute, items,
  detail: (m, phase) => `SHA-256 ${phase === 0 ? m.before : m.after}: ${phase === 0 ? m.beforeHash : m.afterHash}. ${m.bits} von ${m.totalBits} Bits unterscheiden sich. Der Zeichenwechsel in der Bewegung ist kein zusätzlicher Zwischenhash. Die Änderungsrate ist für dieses Paar gemessen, keine Garantie einer festen Bitanzahl.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';

import { fixedScene, heading, footer, label, rect, block, grid } from '../objects/f2-grid.mjs';
import { lora } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Die große Gewichtsmatrix bleibt eingefroren. Der Block bezeichnet ihre Form und zeigt keine einzelnen Zellen.',
  'Nur die beiden Faktoren werden trainiert. Ihr gemeinsamer schmaler Index ist der Rang, nicht die Batch-Achse.',
  'Das Produkt BA hat wieder die Form von W. Die Umrandung bezeichnet ein Update, keine messbare Schichtdicke.',
  'Ein separates Mini-Beispiel macht die Arithmetik exakt sichtbar. Alpha geteilt durch Rang skaliert das Produkt.',
  'Das Update wird addiert. W bleibt als Ausgangsmatrix erhalten; W plus Delta ist die effektive Gewichtsmatrix.',
];
function compute() {
  const input = 512, out = 512, rank = 4;
  const w = [[1, 0], [0, 1]], a = [[1, 2]], b = [[1], [3]], alpha = 2, miniRank = 1;
  return { input, out, rank, parameters: rank * (input + out), full: input * out, w, a, b, alpha, miniRank, mini: lora(w, a, b, alpha, miniRank) };
}
function large(m, update) {
  return [heading(update ? 'W + (α/r) BA' : 'W bleibt eingefroren'), ...block('w', 20, 22, 60, 60, update ? 'W + ΔW' : 'W · eingefroren', `${m.out} × ${m.input}`, update ? 'lit' : 'hi'),
    ...(update ? [{ ...rect('update', 23, 25, 54, 54, 'lit'), plate: false, fill: false }] : []),
    footer(update ? `LoRA: ${m.parameters} · Full FT: ${m.full}` : `${m.full} Gewichte · Blockschema`)];
}
function factors(m) {
  return [heading('B @ A · Rang 4'),
    rect('b', 12, 25, 10, 53, 'lit'), label('b-name', 42, 40, 'B'), label('b-shape', 55, 52, `${m.out} × ${m.rank}`),
    rect('a', 32, 66, 56, 10, 'lit'), label('a-name', 60, 28, 'A'), label('a-shape', 65, 40, `${m.rank} × ${m.input}`),
    footer('Formschema ohne Zellskala')];
}
function mini(m, applied) {
  if (applied) return [heading('Mini-Beispiel: W + ΔW'), label('delta', 24, 29, 'ΔW'), label('effective', 76, 29, 'W + ΔW'),
    ...grid('delta', m.mini.delta, { x: 8, y: 38, cell: 16 }), ...grid('effective', m.mini.updated, { x: 60, y: 38, cell: 16, active: () => true }),
    footer('W selbst bleibt unverändert')];
  return [heading('Mini-Beispiel: ΔW = 2 BA'), label('b', 20, 27, 'B'), label('a', 77, 27, 'A'),
    ...grid('b', m.b, { x: 11, y: 36, cell: 18 }), label('op', 51, 53, '×'), ...grid('a', m.a, { x: 59, y: 36, cell: 18 }),
    label('scale', 72, 73, `α/r = ${m.alpha}/${m.miniRank}`), footer('W = [[1, 0], [0, 1]]')];
}
const scene = fixedScene({ id: 'frozen-matrix-strips', captions, compute, frames: (m) => [large(m, false), factors(m), large(m, true), mini(m, false), mini(m, true)] });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

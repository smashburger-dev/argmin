import { fixedScene, heading, footer, label, grid, block, arrow, shapeText } from '../objects/f2-grid.mjs';
import { layerChain } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Ein Tensor ist ein Array. Hier sind die Achsen Seite, Zeile, Spalte; die Adressen zählen wie in Python ab null.',
  'Die Seitenadresse wechselt, die Zeilen- und Spaltenordnung bleibt gleich. Jede Ansicht zeigt eine ganze Seite.',
  'Die Adresse wählt genau eine Zelle. Eine zusätzliche Achse erfordert keine perspektivisch winzigen Zellquader.',
  'Im Lektionsnetz wirkt W auf die Features jedes Beispiels. Große Arrays erscheinen als bezeichnete Blöcke.',
  'ReLU ändert die Form nicht. Der zweite Layer erhält die Hidden-Breite, die Batch-Achse bleibt erhalten.',
];
function compute() {
  const dimensions = [2, 3, 4], address = [1, 2, 3];
  const pages = Array.from({ length: dimensions[0] }, (_, p) => Array.from({ length: dimensions[1] }, (_, r) =>
    Array.from({ length: dimensions[2] }, (_, c) => (p * dimensions[1] + r) * dimensions[2] + c)));
  const layers = layerChain(32, 8, [16, 3]);
  return { dimensions, address, pages, selected: pages[address[0]][address[1]][address[2]], layers,
    parameters: layers.reduce((sum, layer) => sum + layer.parameters, 0) };
}
function page(m, index, selected) {
  return [heading(`T: ${shapeText(m.dimensions)}`), label('page', 50, 23, `Seite ${index} · Zeilen ↓ · Spalten →`),
    ...grid('page', m.pages[index], { x: 14, y: 31, cell: 18, active: (r, c) => selected && r === m.address[1] && c === m.address[2] }),
    footer(selected ? `T[${m.address.join(', ')}] = ${m.selected}` : 'Adresse: [Seite, Zeile, Spalte]')];
}
function layer(m, index) {
  const l = m.layers[index];
  return [heading(`Layer ${index + 1}: XW + b`), ...block('in', 10, 20, 32, 25, 'Eingabe', shapeText(l.input)),
    ...block('weight', 58, 20, 32, 25, 'W', shapeText(l.weights), 'lit'),
    arrow('flow', [18, 49], [18, 57]), ...block('out', 25, 61, 50, 25, 'Ausgabe', shapeText(l.output)),
    label('bias', 50, 54, `b: ${shapeText(l.bias)}`), footer(`Parameter: ${l.parameters} · Gesamt: ${m.parameters}`)];
}
const scene = fixedScene({ id: 'tensor-address', captions, compute, frames: (m) => [page(m, 0, false), page(m, 1, false), page(m, 1, true), layer(m, 0), layer(m, 1)] });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

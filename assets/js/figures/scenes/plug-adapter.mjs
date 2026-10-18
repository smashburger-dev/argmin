import { fixedScene, heading, footer, label, grid, line } from '../objects/f2-grid.mjs';
import { broadcastShape, matmul } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Der Bias hat keine Batch-Achse. Von rechts ausgerichtet passt er genau auf die beiden Spalten.',
  'Dieselbe Bias-Zeile wirkt auf jede Zeile. Broadcasting kopiert hier gedanklich Werte, keine neuen Parameter.',
  'Ein Bias mit drei Einträgen passt nicht auf die letzte Achse. Eine Formverletzung ist kein Null-Ergebnis.',
  'Gleiche Formen garantieren keine gleiche Rechnung: Stern multipliziert passende Zellen miteinander.',
  'Das Matrixprodukt summiert stattdessen Zeile mal Spalte. Oben rechts treffen unterschiedliche Zellen zusammen.',
  'Übertragung aus der alten Transformationsfigur: a = d = 2, b = 0,5 und c = 0. Das Bild bleibt maßstabstreu.',
  'Die Scherung verändert die Breite, nicht die Grundseite oder Höhe. Der Flächeninhalt folgt der Determinante.',
];
function compute() {
  const input = [[1, 1], [1, 1], [1, 1]], bias = [10, 20];
  const a = [[1, 2], [-1, 3]], b = [[4, 0], [2, 5]], transform = [[2, 0.5], [0, 2]];
  return { input, bias, shape: broadcastShape([3, 2], [2]), output: input.map((row) => row.map((v, j) => v + bias[j])),
    a, b, elementwise: a.map((row, i) => row.map((v, j) => v * b[i][j])), product: matmul(a, b), transform,
    square: [[0, 0], [1, 0], [1, 1], [0, 1]], transformed: [[0, 0], [2, 0], [2.5, 2], [0.5, 2]], determinant: transform[0][0] * transform[1][1] - transform[0][1] * transform[1][0] };
}
function shapeView(m, expanded) {
  return [heading(expanded ? 'A + bias' : '(3, 2) + (2,)'), ...grid('bias', [m.bias], { x: 34, y: 14, cell: 16, active: () => true }),
    ...grid('matrix', expanded ? m.output : m.input, { x: 34, y: 36, cell: 16 }), footer(expanded ? 'Jede Zeile erhält + (10, 20)' : 'Letzte Achse: 2 passt zu 2')];
}
function operation(m, product) {
  return [heading(product ? 'A @ B' : 'A * B'), ...grid('a', m.a, { x: 8, y: 21, cell: 16 }), ...grid('b', m.b, { x: 60, y: 21, cell: 16 }),
    label('op', 50, 41, product ? '@' : '*'), ...grid('result', product ? m.product : m.elementwise, { x: 34, y: 62, cell: 16, active: () => true })];
}
function polygon(key, points, tone) {
  return points.map((p, i) => line(`${key}-${i}`, [17 + p[0] * 24, 77 - p[1] * 24],
    [17 + points[(i + 1) % points.length][0] * 24, 77 - points[(i + 1) % points.length][1] * 24], tone, 0.7));
}
function transformView(m, answer) {
  return [heading('Einheitsquadrat → A-Bild'), ...polygon('unit', m.square, 'hi'), ...polygon('image', m.transformed, 'lit'),
    label('base', 41, 86, '2'), label('height', 10, 55, '2'),
    label('area', 50, 97, answer ? `det(A) = ${m.determinant}` : 'det(A) = ?')];
}
const scene = fixedScene({ id: 'plug-adapter', captions, compute,
  frames: (m) => [shapeView(m, false), shapeView(m, true),
    [heading('(3, 2) + (3,)'), ...grid('bad-bias', [[10, 20, 30]], { x: 20, y: 25, cell: 20 }),
      label('no', 50, 61, '2 ≠ 3: nicht kompatibel', 'lit'), footer('Fehler statt Ergebnis')],
    operation(m, false), operation(m, true), transformView(m, false), transformView(m, true)],
  prediction: (m) => m.determinant, predictionBeat: 5 });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

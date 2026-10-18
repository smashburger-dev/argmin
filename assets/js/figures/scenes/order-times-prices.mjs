import { fixedScene, heading, footer, label, grid } from '../objects/f2-grid.mjs';
import { matmul } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Zwei Personen, drei Produkte: Jede Zeile ist eine Bestellung. Die Reihenfolge ist Kaffee, Croissant, Saft.',
  'Die gleichen Produkte stehen jetzt in Zeilen. Jede Spalte enthält die Preise eines Ladens, in Euro.',
  'Adas Zeile trifft die Spalte Nord. Der erste Posten wird multipliziert; die Summe beginnt mit dem Kaffee-Posten.',
  'Der Croissant-Posten kommt hinzu. Summiert wird über Produkte, nicht über Personen oder Läden.',
  'Auch der Saft-Posten zählt mit. Eine Nullmenge trägt nichts zur Rechnung bei.',
  'Alle Zeilen treffen alle Spalten: Das Ergebnis ordnet jeder Person einen Betrag pro Laden zu.',
  'Übertragung zum bisherigen Spaltenbild: andere Matrix, x = (1, 2). Der alte Checkpoint meint dessen blauen Pfeil.',
  'Die gewichteten Spalten addieren sich komponentenweise. Das ist dieselbe Matrixmultiplikation.',
];
function compute() {
  const orders = [[2, 1, 0], [1, 2, 1]], prices = [[3, 4], [2, 2], [4, 3]];
  const a = [[2, 1], [1, 3]], x = [[1], [2]];
  const terms = orders[0].map((n, k) => n * prices[k][0]);
  return { orders, prices, result: matmul(orders, prices), terms,
    sums: terms.map((_, k) => terms.slice(0, k + 1).reduce((s, n) => s + n, 0)),
    products: ['Kaf.', 'Cro.', 'Saft'], a, x, combination: matmul(a, x).flat() };
}
function sweep(m, count) {
  const rows = m.orders[0].map((amount, k) => [amount, '×', m.prices[k][0], '=', k < count ? m.terms[k] : '?']);
  return [heading('Ada × Nord'), label('amount', 14, 23, 'Menge'), label('price', 50, 23, 'Preis'), label('term', 86, 23, 'Posten'),
    ...grid('pairs', rows, { x: 5, y: 29, cell: 18, active: (i) => i === count - 1 }),
    footer(`Laufende Summe: ${m.sums[count - 1]} €`)];
}
function frames(m) {
  return [
    [heading('Bestellung O'), ...m.products.map((name, j) => label(`product-${j}`, 32 + 18 * j, 23, name)), ...grid('o', m.orders, { x: 23, y: 32 }),
      label('ada', 11, 43, 'Ada'), label('ben', 11, 61, 'Ben'), footer('Form: 2 × 3')],
    [heading('Preise P in Euro'), label('north', 47, 23, 'Nord'), label('south', 65, 23, 'Süd'), ...grid('p', m.prices, { x: 38, y: 29 }),
      label('coffee', 17, 40, 'Kaffee'), label('pastry', 17, 58, 'Croiss.'), label('juice', 17, 76, 'Saft'), footer('Form: 3 × 2')],
    sweep(m, 1), sweep(m, 2), sweep(m, 3),
    [heading('O @ P: Beträge in Euro'), label('north', 46, 23, 'Nord'), label('south', 64, 23, 'Süd'), ...grid('c', m.result, { x: 37, y: 32 }),
      label('ada', 18, 43, 'Ada'), label('ben', 18, 61, 'Ben'), footer('(2 × 3) @ (3 × 2) → 2 × 2')],
    [heading('Spaltenbild: A @ x'), ...grid('a', m.a, { x: 16, y: 25 }), ...grid('x', m.x, { x: 68, y: 25 }),
      label('multiply', 60, 46, '×'), label('weighted', 50, 77, '1 · (2, 1) + 2 · (1, 3)'), footer('b = (?, ?)')],
    [heading('Spaltenweise addieren'), ...grid('sum', [[2, '+', 2, '=', m.combination[0]], [1, '+', 6, '=', m.combination[1]]], { x: 5, y: 30, cell: 18, active: (_i, j) => j === 4 }),
      footer(`b = (${m.combination.join(', ')})`)],
  ];
}
const scene = fixedScene({ id: 'order-times-prices', captions, compute, frames, prediction: (m) => m.combination, predictionBeat: 6 });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

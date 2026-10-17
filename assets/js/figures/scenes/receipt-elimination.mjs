import { createScene } from '../objects/linalg-stage.mjs';
import { receiptItems, rowLine, cafeCounter, cafeBounds, cafeGround } from '../objects/receipt-stage.mjs';
import { exactRows, applyRowOperation, rational, divide, add, multiply, numberOf, textOf } from '../kit/rational-rows.mjs';

export const defaults = { lambda: -1 };
export const captions = [
  'Jeder Zettel ist eine Bedingung. Kaffee, Croissant und Betrag gehören immer zur selben Zeile.',
  'Verdopple den zweiten Zettel. Jeder Posten und der Betrag müssen denselben Faktor bekommen.',
  'Ziehe den ersten Zettel vom Doppelten ab. Prüfe auch den Betrag rechts vom Strich.',
  'Übertrage auf zwei Geraden: Zeilenoperationen verändern ihren Schnittpunkt nicht.',
  'Setze rückwärts ein. Der Kaffeepreis ergänzt die umgeformten Zettel.',
  'Wo der Vergleich hinkt: Negative Posten sind auf einem echten Kassenzettel keine verkaufte Ware.',
];
function computeModel({ lambda }) {
  const initial = exactRows([[2, 1, 7], [1, 1, 4.5]]);
  const doubled = applyRowOperation(initial, { op: 'scale', row: 1, factor: rational(2) });
  const operation = { op: 'add', target: 1, source: 0, factor: rational(-1) };
  const final = applyRowOperation(doubled, operation);
  const negative = applyRowOperation(final, { op: 'scale', row: 0, factor: rational(-1) });
  const croissant = divide(final[1][2], final[1][1]);
  const coffee = divide(add(initial[0][2], multiply(rational(-1), croissant)), initial[0][0]);
  const checkpoint = applyRowOperation(exactRows([[-1, 1, 1], [-2, 1, 3]]), { op: 'add', target: 1, source: 0, factor: rational(-lambda) });
  const [a, b, c] = checkpoint[1].map(numberOf);
  // Intersect y=x+1 with a*x+b*y=c, independently of the authored answer.
  const x = (c - b) / (a + b);
  return { lambda, initial, doubled, final, negative, operation, coffee, croissant, checkpoint, slope: -a / b, prediction: x + 1, receipts: 2 };
}
function rowsAt(m, phase) {
  if (phase < 0.5) return m.initial;
  if (phase < 1.5) return m.doubled;
  return phase < 4.5 ? m.final : m.negative;
}
const scene = createScene({ id: 'receipt-elimination', title: 'Kaffee und Croissant', world: 'cafe', defaults, captions, predictBeat: 3, target: [0, 0, 18], azimuth: 0, elevation: 0,
  worldItems: cafeCounter, bounds: cafeBounds, ground: cafeGround,
  validate: ({ lambda }) => { if (lambda !== -1) throw new Error('Authored checkpoint only'); },
  model: computeModel, items: (m, phase) => receiptItems(m, phase, rowsAt(m, phase)), predict: (m) => m.prediction,
  numbers: (m) => [m.prediction, m.lambda, m.slope, numberOf(m.coffee), numberOf(m.croissant), ...[m.initial, m.doubled, m.final, m.negative, m.checkpoint].flat(2).map(numberOf), -2],
  lines: (m, phase) => [phase < 1 ? 'Zwei Einkäufe im selben Café' : phase < 2 ? 'Der zweite Einkauf wird verdoppelt' : phase < 3 ? 'Gleiche Posten abziehen' : `Croissant = ${textOf(m.croissant)} €`,
    ...rowsAt(m, phase).map(rowLine), phase >= 4 ? `Kaffee = ${textOf(m.coffee)} €` : 'Kaffee = ?'],
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

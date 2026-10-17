import { solid, readingPlane, text } from './linalg-stage.mjs';
import { box } from '../kit/solids.mjs';
import { numberOf, textOf } from '../kit/rational-rows.mjs';

export function cafeCounter() { return []; }
export const cafeBounds = [[-26, 0, 1], [26, 0, 1], [-26, 0, 35], [26, 0, 35]];
export const cafeGround = null;
function receiptPrims(row, label, active, prices) {
  const names = ['Kaffee', 'Croissant', 'Betrag'];
  return [
    text('label', 0.8, 3, label, 2.7, 'mid'),
    ...names.map((name, j) => text('name-' + j, 0.8, 7.5 + j * 4, name, 2.7, 'mid')),
    ...row.map((q, j) => text('entry-' + j, 13.4, 7.5 + j * 4, textOf(q), 2.9, active ? 'lit' : 'hi')),
    text('price-coffee', 0.8, 24, prices ? 'Kaffee ' + textOf(prices.coffee) + ' €' : '', 2.7),
  ];
}
export function receiptItems(m, phase, rows) {
  return rows.flatMap((row, i) => {
    const x = -23 + i * 25;
    const prims = receiptPrims(row, 'Zettel ' + (i + 1), i === 1 && phase >= 0.5 && phase < 4, phase >= 4 ? m : null);
    return [
      solid('receipt-' + i, box([x, 0, 3], [21, 0.12, 26]), 'board'),
      readingPlane('receipt-ink-' + i, [x, -0.05, 29], [21, 26], prims, { on: 'receipt-' + i, bias: 0.1 }),
    ];
  });
}
export const rowLine = (row) => row.slice(0, -1).map(textOf).join('   ') + '  |  ' + textOf(row.at(-1));
export function numericRows(rows) { return rows.map((row) => row.map(numberOf)); }

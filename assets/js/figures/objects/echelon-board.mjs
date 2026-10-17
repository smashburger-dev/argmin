import { readingPlane, text } from './linalg-stage.mjs';
import { textOf } from '../kit/rational-rows.mjs';

// Three conditions share aligned variable columns. No perspective or props:
// the contrast between a free variable and a contradiction is the object.
export function echelonBoard(rows) {
  const columns = [10, 21, 32, 46];
  const prims = ['x', 'y', 'z', 'b'].map((label, j) => ({
    ...text('column-' + j, columns[j], 4, label, 3, 'mid'), anchor: 'middle',
  }));
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < columns.length; j += 1) {
      prims.push({ ...text(`entry-${i}-${j}`, columns[j], 12 + i * 8, textOf(rows[i][j]), 3.8,
        i === 2 ? 'lit' : 'hi'), anchor: 'middle' });
    }
  }
  prims.push(
    { t: 'line', key: 'augmented-separator', from: [38.5, 7], to: [38.5, 30], tone: 'mid', width: 0.2 },
    { t: 'line', key: 'bracket-left', from: [4, 7], to: [4, 30], tone: 'mid', width: 0.2 },
    { t: 'line', key: 'bracket-right', from: [51, 7], to: [51, 30], tone: 'mid', width: 0.2 },
  );
  return [readingPlane('equations', [-26, 0, 36], [52, 36], prims)];
}

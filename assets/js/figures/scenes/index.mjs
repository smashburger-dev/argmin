// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as smoothie from './smoothie.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
});

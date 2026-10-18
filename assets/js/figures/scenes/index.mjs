// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as bagUnpack from './bag-unpack.mjs';
import * as balanceIsolate from './balance-isolate.mjs';
import * as balanceSolve from './balance-solve.mjs';
import * as mixToTarget from './mix-to-target.mjs';
import * as powerStack from './power-stack.mjs';
import * as smoothie from './smoothie.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [bagUnpack.id]: bagUnpack,
  [balanceIsolate.id]: balanceIsolate,
  [balanceSolve.id]: balanceSolve,
  [mixToTarget.id]: mixToTarget,
  [powerStack.id]: powerStack,
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
});

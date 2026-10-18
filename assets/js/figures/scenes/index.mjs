// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as bagUnpack from './bag-unpack.mjs';
import * as balanceIsolate from './balance-isolate.mjs';
import * as balanceSolve from './balance-solve.mjs';
import * as earlyStopping from './early-stopping-flag.mjs';
import * as mixToTarget from './mix-to-target.mjs';
import * as mseLandscape from './mse-landscape.mjs';
import * as mseSection from './mse-section.mjs';
import * as powerStack from './power-stack.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as residualSprings from './residual-springs.mjs';
import * as rubberBand from './rubber-band-coefficients.mjs';
import * as smoothie from './smoothie.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';
import * as trainingBook from './training-book.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [bagUnpack.id]: bagUnpack,
  [balanceIsolate.id]: balanceIsolate,
  [balanceSolve.id]: balanceSolve,
  [earlyStopping.id]: earlyStopping,
  [mixToTarget.id]: mixToTarget,
  [mseLandscape.id]: mseLandscape,
  [mseSection.id]: mseSection,
  [powerStack.id]: powerStack,
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [residualSprings.id]: residualSprings,
  [rubberBand.id]: rubberBand,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
  [trainingBook.id]: trainingBook,
});

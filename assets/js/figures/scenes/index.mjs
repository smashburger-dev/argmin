// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as bagUnpack from './bag-unpack.mjs';
import * as balanceIsolate from './balance-isolate.mjs';
import * as balanceSolve from './balance-solve.mjs';
import * as bouncer from './bouncer.mjs';
import * as earlyStopping from './early-stopping-flag.mjs';
import * as frozenMatrixStrips from './frozen-matrix-strips.mjs';
import * as ledger from './ledger.mjs';
import * as libraryAttention from './library-attention.mjs';
import * as mixToTarget from './mix-to-target.mjs';
import * as mseLandscape from './mse-landscape.mjs';
import * as mseSection from './mse-section.mjs';
import * as nameTags from './name-tags.mjs';
import * as orderTimesPrices from './order-times-prices.mjs';
import * as plugAdapter from './plug-adapter.mjs';
import * as powerStack from './power-stack.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as residualSprings from './residual-springs.mjs';
import * as rubberBand from './rubber-band-coefficients.mjs';
import * as smokeDetector from './smoke-detector.mjs';
import * as smoothie from './smoothie.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';
import * as teamMask from './team-mask.mjs';
import * as tensorAddress from './tensor-address.mjs';
import * as trainingBook from './training-book.mjs';
import * as twoTagsOneList from './two-tags-one-list.mjs';
import * as vendingFrame from './vending-frame.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [bagUnpack.id]: bagUnpack,
  [balanceIsolate.id]: balanceIsolate,
  [balanceSolve.id]: balanceSolve,
  [bouncer.id]: bouncer,
  [earlyStopping.id]: earlyStopping,
  [frozenMatrixStrips.id]: frozenMatrixStrips,
  [ledger.id]: ledger,
  [libraryAttention.id]: libraryAttention,
  [mixToTarget.id]: mixToTarget,
  [mseLandscape.id]: mseLandscape,
  [mseSection.id]: mseSection,
  [nameTags.id]: nameTags,
  [orderTimesPrices.id]: orderTimesPrices,
  [plugAdapter.id]: plugAdapter,
  [powerStack.id]: powerStack,
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [residualSprings.id]: residualSprings,
  [rubberBand.id]: rubberBand,
  [smokeDetector.id]: smokeDetector,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
  [teamMask.id]: teamMask,
  [tensorAddress.id]: tensorAddress,
  [trainingBook.id]: trainingBook,
  [twoTagsOneList.id]: twoTagsOneList,
  [vendingFrame.id]: vendingFrame,
});

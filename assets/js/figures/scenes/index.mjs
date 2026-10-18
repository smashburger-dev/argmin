// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as bagUnpack from './bag-unpack.mjs';
import * as balanceIsolate from './balance-isolate.mjs';
import * as balanceSolve from './balance-solve.mjs';
import * as baselineSorter from './baseline-sorter.mjs';
import * as bouncer from './bouncer.mjs';
import * as cleaningLine from './cleaning-line.mjs';
import * as earlyStopping from './early-stopping-flag.mjs';
import * as evaluationSorter from './evaluation-sorter.mjs';
import * as foldRotation from './fold-rotation.mjs';
import * as goodsIn from './goods-in.mjs';
import * as houseAblation from './house-ablation.mjs';
import * as ledger from './ledger.mjs';
import * as logisticSorter from './logistic-sorter.mjs';
import * as mailSorter from './mail-sorter.mjs';
import * as mixToTarget from './mix-to-target.mjs';
import * as mseLandscape from './mse-landscape.mjs';
import * as mseSection from './mse-section.mjs';
import * as nameTags from './name-tags.mjs';
import * as powerStack from './power-stack.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as residualSprings from './residual-springs.mjs';
import * as responsibleSorter from './responsible-sorter.mjs';
import * as rubberBand from './rubber-band-coefficients.mjs';
import * as smokeDetector from './smoke-detector.mjs';
import * as smoothie from './smoothie.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';
import * as tokenConveyor from './token-conveyor.mjs';
import * as tradesStopwatch from './trades-stopwatch.mjs';
import * as trainingBook from './training-book.mjs';
import * as twoTagsOneList from './two-tags-one-list.mjs';
import * as vendingFrame from './vending-frame.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [bagUnpack.id]: bagUnpack,
  [balanceIsolate.id]: balanceIsolate,
  [balanceSolve.id]: balanceSolve,
  [baselineSorter.id]: baselineSorter,
  [bouncer.id]: bouncer,
  [cleaningLine.id]: cleaningLine,
  [earlyStopping.id]: earlyStopping,
  [evaluationSorter.id]: evaluationSorter,
  [foldRotation.id]: foldRotation,
  [goodsIn.id]: goodsIn,
  [houseAblation.id]: houseAblation,
  [ledger.id]: ledger,
  [logisticSorter.id]: logisticSorter,
  [mailSorter.id]: mailSorter,
  [mixToTarget.id]: mixToTarget,
  [mseLandscape.id]: mseLandscape,
  [mseSection.id]: mseSection,
  [nameTags.id]: nameTags,
  [powerStack.id]: powerStack,
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [residualSprings.id]: residualSprings,
  [responsibleSorter.id]: responsibleSorter,
  [rubberBand.id]: rubberBand,
  [smokeDetector.id]: smokeDetector,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
  [tokenConveyor.id]: tokenConveyor,
  [tradesStopwatch.id]: tradesStopwatch,
  [trainingBook.id]: trainingBook,
  [twoTagsOneList.id]: twoTagsOneList,
  [vendingFrame.id]: vendingFrame,
});

// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as backpropNetwork from './backprop-network.mjs';
import * as bagUnpack from './bag-unpack.mjs';
import * as balanceIsolate from './balance-isolate.mjs';
import * as balanceSolve from './balance-solve.mjs';
import * as baselineSorter from './baseline-sorter.mjs';
import * as bouncer from './bouncer.mjs';
import * as bpeLetterpress from './bpe-letterpress.mjs';
import * as chunkWindows from './chunk-windows.mjs';
import * as cleaningLine from './cleaning-line.mjs';
import * as distributionPoints from './distribution-points.mjs';
import * as earlyStopping from './early-stopping-flag.mjs';
import * as evaluationSorter from './evaluation-sorter.mjs';
import * as evidenceCards from './evidence-cards.mjs';
import * as foldRotation from './fold-rotation.mjs';
import * as freezeOrder from './freeze-order.mjs';
import * as frozenMatrixStrips from './frozen-matrix-strips.mjs';
import * as gitSnapshots from './git-snapshots.mjs';
import * as goodsIn from './goods-in.mjs';
import * as houseAblation from './house-ablation.mjs';
import * as ledger from './ledger.mjs';
import * as libraryAttention from './library-attention.mjs';
import * as logisticSorter from './logistic-sorter.mjs';
import * as mailSorter from './mail-sorter.mjs';
import * as missingHighSales from './missing-high-sales.mjs';
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
import * as responsibleSorter from './responsible-sorter.mjs';
import * as retrievalHandoffs from './retrieval-handoffs.mjs';
import * as rubberBand from './rubber-band-coefficients.mjs';
import * as seedRibbon from './seed-ribbon.mjs';
import * as sha256Seal from './sha256-seal.mjs';
import * as smokeDetector from './smoke-detector.mjs';
import * as smoothie from './smoothie.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';
import * as subgroupRiver from './subgroup-river.mjs';
import * as teamMask from './team-mask.mjs';
import * as tensorAddress from './tensor-address.mjs';
import * as tokenConveyor from './token-conveyor.mjs';
import * as tradesStopwatch from './trades-stopwatch.mjs';
import * as trainingBook from './training-book.mjs';
import * as treeVoteField from './tree-vote-field.mjs';
import * as twoTagsOneList from './two-tags-one-list.mjs';
import * as vendingFrame from './vending-frame.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [backpropNetwork.id]: backpropNetwork,
  [bagUnpack.id]: bagUnpack,
  [balanceIsolate.id]: balanceIsolate,
  [balanceSolve.id]: balanceSolve,
  [baselineSorter.id]: baselineSorter,
  [bouncer.id]: bouncer,
  [bpeLetterpress.id]: bpeLetterpress,
  [chunkWindows.id]: chunkWindows,
  [cleaningLine.id]: cleaningLine,
  [distributionPoints.id]: distributionPoints,
  [earlyStopping.id]: earlyStopping,
  [evaluationSorter.id]: evaluationSorter,
  [evidenceCards.id]: evidenceCards,
  [foldRotation.id]: foldRotation,
  [freezeOrder.id]: freezeOrder,
  [frozenMatrixStrips.id]: frozenMatrixStrips,
  [gitSnapshots.id]: gitSnapshots,
  [goodsIn.id]: goodsIn,
  [houseAblation.id]: houseAblation,
  [ledger.id]: ledger,
  [libraryAttention.id]: libraryAttention,
  [logisticSorter.id]: logisticSorter,
  [mailSorter.id]: mailSorter,
  [missingHighSales.id]: missingHighSales,
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
  [responsibleSorter.id]: responsibleSorter,
  [retrievalHandoffs.id]: retrievalHandoffs,
  [rubberBand.id]: rubberBand,
  [seedRibbon.id]: seedRibbon,
  [sha256Seal.id]: sha256Seal,
  [smokeDetector.id]: smokeDetector,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
  [subgroupRiver.id]: subgroupRiver,
  [teamMask.id]: teamMask,
  [tensorAddress.id]: tensorAddress,
  [tokenConveyor.id]: tokenConveyor,
  [tradesStopwatch.id]: tradesStopwatch,
  [trainingBook.id]: trainingBook,
  [treeVoteField.id]: treeVoteField,
  [twoTagsOneList.id]: twoTagsOneList,
  [vendingFrame.id]: vendingFrame,
});

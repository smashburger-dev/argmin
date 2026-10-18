// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as bouncer from './bouncer.mjs';
import * as ledger from './ledger.mjs';
import * as nameTags from './name-tags.mjs';
import * as smoothie from './smoothie.mjs';
import * as receiptEchelon from './receipt-echelon-3x3.mjs';
import * as receiptElimination from './receipt-elimination.mjs';
import * as smokeDetector from './smoke-detector.mjs';
import * as smoothieRow from './smoothie-row-and-column.mjs';
import * as solutionCases from './solution-cases-3d.mjs';
import * as spanCarpet from './span-carpet.mjs';
import * as twoTagsOneList from './two-tags-one-list.mjs';
import * as vendingFrame from './vending-frame.mjs';

export const scenes = { [smoothie.id]: smoothie };
Object.assign(scenes, {
  [bouncer.id]: bouncer,
  [ledger.id]: ledger,
  [nameTags.id]: nameTags,
  [receiptEchelon.id]: receiptEchelon,
  [receiptElimination.id]: receiptElimination,
  [smokeDetector.id]: smokeDetector,
  [smoothieRow.id]: smoothieRow,
  [solutionCases.id]: solutionCases,
  [spanCarpet.id]: spanCarpet,
  [twoTagsOneList.id]: twoTagsOneList,
  [vendingFrame.id]: vendingFrame,
});

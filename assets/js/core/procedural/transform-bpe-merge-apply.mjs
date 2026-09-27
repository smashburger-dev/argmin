// Procedural family transform-bpe-merge-apply: the task text, starter code and
// reference solver stay fixed; the seed draws fresh words, symbol sequences
// and merge tables that get appended to the curated base test block as literal
// __check lines. Expected values are asserted against a __ref_-copy of the
// reference merge loop (no np.* equivalent exists for string merges), so the
// grading contract cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';
import { pyStrList } from './py_test_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/transform-bpe-merge-apply.json' with { type: 'json' };

// __ref_-copies of the reference merge loop for the seeded blocks: the drawn
// fixtures are asserted with == against these copies, never hardcoded.
const CORE_SEEDED_PREAMBLE = `def __ref_bpe(word, merges):
    symbols = list(word) + ["</w>"]
    for left, right in merges:
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                out.append(left + right)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols`;

const TIE_SEEDED_PREAMBLE = `def __ref_apply(symbols, merges):
    symbols = list(symbols)
    for left, right in merges:
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                out.append(left + right)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols`;

const WORD_ALPHABET = ['a', 'b', 'e', 'l', 'o', 's', 't', 'w'];
const TIE_ALPHABET = ['a', 'b', 'c'];

// Draws a merge table whose later pairs may reference earlier merge results —
// the pool starts with the alphabet and every drawn pair pushes its merged
// symbol, so chained tables like [("l","o"),("lo","w")] occur naturally.
function drawMerges(r, alphabet, count) {
  const pool = [...alphabet];
  const merges = [];
  for (let i = 0; i < count; i += 1) {
    const left = pool[randInt(r, 0, pool.length - 1)];
    const right = pool[randInt(r, 0, pool.length - 1)];
    merges.push([left, right]);
    pool.push(left + right);
  }
  return merges;
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn words, symbol
// sequences and merge tables differ, not just a seed literal).
export const BPE_CASES = {
  'bpe-merge-apply': {
    difficulty: 'stretch',
    preamble: CORE_SEEDED_PREAMBLE,
    draw(r) {
      const word = Array.from({ length: randInt(r, 3, 6) }, () => WORD_ALPHABET[randInt(r, 0, WORD_ALPHABET.length - 1)]).join('');
      return { word, merges: drawMerges(r, WORD_ALPHABET, randInt(r, 2, 4)) };
    },
    extraCount: 3,
  },
  'bpe-merge-tie-order': {
    difficulty: 'stretch',
    preamble: TIE_SEEDED_PREAMBLE,
    draw(r) {
      const symbols = Array.from({ length: randInt(r, 3, 6) }, () => TIE_ALPHABET[randInt(r, 0, TIE_ALPHABET.length - 1)]);
      return { symbols, merges: drawMerges(r, TIE_ALPHABET, randInt(r, 1, 3)) };
    },
    extraCount: 3,
  },
};

const pyMerges = (m) => `[${m.map(([a, b]) => `("${a}", "${b}")`).join(', ')}]`;

// Appends the seeded literal checks: every drawn word/symbol sequence and
// merge table is concrete in the test string and asserted with == against the
// __ref_-copy from the preamble.
function seededChecks(caseId, entry, index) {
  if (caseId === 'bpe-merge-apply') {
    const merges = pyMerges(entry.merges);
    return [
      `__check('seeded bpe ${index}', bpe_encode("${entry.word}", ${merges}) == __ref_bpe("${entry.word}", ${merges}))`,
      `__check('seeded marker ${index}', bpe_encode("${entry.word}", ${merges})[-1] == "</w>")`,
    ].join('\n');
  }
  const symbols = pyStrList(entry.symbols);
  const merges = pyMerges(entry.merges);
  return `__check('seeded apply ${index}', apply_merges(${symbols}, ${merges}) == __ref_apply(${symbols}, ${merges}))`;
}

function seededSection(caseDef, caseId, seedCases) {
  const extras = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
  return caseDef.preamble ? `${caseDef.preamble}\n${extras}` : extras;
}

export const BPE_CONTRACT = {
  familyId: 'transform-bpe-merge-apply',
  familyGroup: 'transform-terms',
  summary: 'Wendet eine BPE-Mergetabelle in Tabellenreihenfolge mit links-nach-rechts nicht überlappenden Merges auf eine Symbolfolge an.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'bpe-merge-apply', propertyTest: false },
    { caseId: 'bpe-merge-tie-order', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'core'],
  competencyIds: ['c-dl-tokenizer', 'c-python-collections'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: BPE_CONTRACT,
  cases: BPE_CASES,
  shapeError: 'BPE-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => `# seeded extra cases\n${seededSection(caseDef, caseId, seedCases)}`,
});


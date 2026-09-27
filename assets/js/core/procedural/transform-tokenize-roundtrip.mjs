// Procedural family transform-tokenize-roundtrip: the task text, starter code
// and reference solver stay fixed; the seed draws fresh texts and token lists
// that get appended to the curated base test block as literal __check lines.
// Expected id sequences are computed in JS from the fixed VOCAB and baked in
// as literals (the seeded block keeps the base block's exact == style), so
// the grading contract cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';
import { pyStrList } from './py_test_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/transform-tokenize-roundtrip.json' with { type: 'json' };

// JS mirrors of the fixed VOCAB tables from the starter code: the expected id
// sequences for seeded checks are computed here, never hardcoded per case.
const CHAR_IDS = { a: 4, b: 5, c: 6, d: 7, e: 8, l: 9, o: 10, s: 11, t: 12, w: 13 };
const EOW_ID = 3; // </w>
const EOS_ID = 2; // <eos>
const CHAR_KEYS = Object.keys(CHAR_IDS);

const SUBWORD_IDS = { '<pad>': 0, '<unk>': 1, hello: 2, world: 3 };
const KNOWN_TOKENS = Object.keys(SUBWORD_IDS);
const UNKNOWN_TOKENS = ['new', 'token', 'zzz', 'q', 'test'];

// Word-wise char encoding: chars + </w> per word, one <eos> at the end.
const encodeIds = (words) => words.flatMap((word) => [...[...word].map((ch) => CHAR_IDS[ch]), EOW_ID]).concat(EOS_ID);

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn texts and token lists
// differ, not just a seed literal). All drawn chars/tokens stay inside the
// fixed vocabularies so the expected values are computable in JS.
export const TOKENIZE_CASES = {
  'char-encode-roundtrip': {
    difficulty: 'core',
    draw(r) {
      const words = Array.from({ length: randInt(r, 1, 3) }, () =>
        Array.from({ length: randInt(r, 1, 5) }, () => CHAR_KEYS[randInt(r, 0, CHAR_KEYS.length - 1)]).join(''));
      return { words };
    },
    extraCount: 3,
  },
  'subword-unk-roundtrip': {
    difficulty: 'stretch',
    draw(r) {
      const tokens = Array.from({ length: randInt(r, 2, 4) }, () => (r() < 0.5
        ? KNOWN_TOKENS[randInt(r, 0, KNOWN_TOKENS.length - 1)]
        : UNKNOWN_TOKENS[randInt(r, 0, UNKNOWN_TOKENS.length - 1)]));
      return { tokens };
    },
    extraCount: 3,
  },
};

const pyList = (v) => `[${v.join(', ')}]`;

// Appends the seeded literal checks: expected ids are computed from the fixed
// VOCAB mirrors above and baked in as JS-computed literals; the round-trip
// checks keep the base block's == style.
function seededChecks(caseId, entry, index) {
  if (caseId === 'char-encode-roundtrip') {
    const text = entry.words.join(' ');
    const ids = pyList(encodeIds(entry.words));
    return [
      `__check('seeded encode ${index}', encode("${text}") == ${ids})`,
      `__check('seeded roundtrip ${index}', decode(encode("${text}")) == "${text}")`,
      `__check('seeded decode ${index}', decode(${ids}) == "${text}")`,
    ].join('\n');
  }
  const tokens = pyStrList(entry.tokens);
  const ids = pyList(entry.tokens.map((t) => (t in SUBWORD_IDS ? SUBWORD_IDS[t] : 1)));
  const decoded = pyStrList(entry.tokens.map((t) => (t in SUBWORD_IDS ? t : '<unk>')));
  return [
    `__inv${index} = {value: key for key, value in VOCAB.items()}`,
    `__check('seeded ids ${index}', encode(${tokens}, VOCAB) == ${ids})`,
    `__check('seeded back ${index}', decode(${ids}, __inv${index}) == ${decoded})`,
  ].join('\n');
}

export const TOKENIZE_CONTRACT = {
  familyId: 'transform-tokenize-roundtrip',
  familyGroup: 'transform-terms',
  summary: 'Baut Zeichen-Tokenisierung mit Wort-Marker und Satz-Eos auf und stellt die decode-Umkehrung samt Fehlervertrag bereit.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'char-encode-roundtrip', propertyTest: false },
    { caseId: 'subword-unk-roundtrip', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-tokenizer', 'c-python-collections'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: TOKENIZE_CONTRACT,
  cases: TOKENIZE_CASES,
  shapeError: 'Tokenize-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n')}`,
});


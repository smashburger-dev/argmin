// Procedural family construct-normalize-chunk-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh normalize probes
// (mixed German text with umlauts/digits/punctuation), valid window draws and
// invalid (size, overlap) pairs that get appended to the curated base test
// block as literal __check lines. Expected values are asserted against a
// renamed __ref_ copy of the reference functions (normalize + chunk), so the
// grading contract cannot drift. Mirrors reproduce-canonical-hash-verify.mjs.

import { refCopy, pyLit as py } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/construct-normalize-chunk-contract.json' with { type: 'json' };

const PACKAGES = [];

// Serializes drawn data as Python literals (the pools stay quote- and
// backslash-free, so the generated test block has no escaping hazards).

// Draw pools for normalize probes: umlaut-bearing words, digits and a
// punctuation set that stays inside the PUNCT contract (no quotes/backslash).
const WORD_POOL = [
  'Äpfel', 'Bäcker', 'Größen', 'fußball', 'Lieferung', 'Widerruf', 'Rabatt',
  'Garantie', 'straße', 'Müller', 'Jürgen', 'Köln', 'heißt', 'grün', 'öfter',
  'Artikel', 'Absatz', 'Werkzeuge', 'käse', 'Lösung', 'Übung',
];

const PUNCT_POOL = ['.', ',', ';', ':', '!', '?', '-', '(', ')', '/', '„', '“'];

const CHUNK_ALPHABET = 'abcdefghijklmnopqrstuvwxyzäöü ';

// Probe text: 2-5 word tokens, punctuation marks may trail a word or stand
// alone, occasional double spaces exercise the whitespace collapse.
function drawNormalizeText(r) {
  const count = randInt(r, 2, 5);
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    let token = pick(r, WORD_POOL);
    if (r() < 0.3) token = `${randInt(r, 1, 99)}`;
    if (r() < 0.5) token += pick(r, PUNCT_POOL);
    parts.push(token);
  }
  const joiner = r() < 0.3 ? '  ' : ' ';
  let text = parts.join(joiner);
  if (r() < 0.2) text = ` ${text} `;
  return text;
}

function drawChunkText(r) {
  const len = randInt(r, 4, 24);
  return Array.from({ length: len }, () => CHUNK_ALPHABET[randInt(r, 0, CHUNK_ALPHABET.length - 1)]).join('');
}

// Invalid (size, overlap) pairs: every arm of the contract's ValueError gate
// (non-int, size <= 0, overlap < 0, overlap >= size) must appear over seeds.
function drawBadPair(r, size) {
  switch (randInt(r, 0, 6)) {
    case 0: return [0, 0];
    case 1: return [-randInt(r, 1, 5), 0];
    case 2: return [size, size];
    case 3: return [size, size + randInt(r, 1, 3)];
    case 4: return [size, -randInt(r, 1, 3)];
    case 5: return [size + 0.5, 0];
    default: return [size, 0.5];
  }
}

// Seeded block: renamed reference copy once, then per draw one normalize
// probe, one valid window probe and one invalid-parameter probe (ValueError
// path, same try/except shape as the base block).
function seededChecks(entry, index) {
  return [
    `__nt${index} = ${py(entry.normalizeText)}`,
    `__check('seeded normalize ${index}', normalize(__nt${index}) == __ref_normalize(__nt${index}))`,
    `__ct${index} = ${py(entry.chunkText)}`,
    `__check('seeded chunk ${index}', chunk(__ct${index}, ${entry.size}, ${entry.overlap}) == __ref_chunk(__ct${index}, ${entry.size}, ${entry.overlap}))`,
    'try:',
    `    chunk(__ct${index}, ${entry.badSize}, ${entry.badOverlap})`,
    `    __check('seeded chunk-vertrag ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded chunk-vertrag ${index}', True)`,
  ].join('\n');
}

export const CHUNK_CASES = {
  'normalize-chunk-contract': {
    difficulty: 'core',
    refNames: ['normalize', 'chunk'],
    extraCount: 3,
    draw(r) {
      const size = randInt(r, 1, 8);
      const [badSize, badOverlap] = drawBadPair(r, size);
      return {
        normalizeText: drawNormalizeText(r),
        chunkText: drawChunkText(r),
        size,
        overlap: randInt(r, 0, size - 1),
        badSize,
        badOverlap,
      };
    },
  },
};

export const CHUNK_CONTRACT = {
  familyId: 'construct-normalize-chunk-contract',
  familyGroup: 'construct-program',
  summary: 'Implementiert den RAG-Vorverarbeitungs-Vertrag aus Textnormalisierung mit Umlautschutz und bewachter Fenster-Schleife inklusive ValueError-Parametervalidierung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'normalize-chunk-contract', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-genai-rag', 'c-python-functions'],
};

export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: CHUNK_CONTRACT,
  cases: CHUNK_CASES,
  shapeError: 'Normalize-Chunk-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
  },
  defaultPackages: PACKAGES,
});


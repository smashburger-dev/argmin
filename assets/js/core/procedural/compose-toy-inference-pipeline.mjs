// Procedural family compose-toy-inference-pipeline: the task text, starter
// code and reference solver stay fixed; the seed draws fresh start texts
// (over the fixed VOCAB alphabet) and max_len bounds that get appended to the
// curated base test block as literal __check lines. Expected token sequences
// are asserted inline against the __ref_run copy that the base block already
// defines; the decoded text is asserted against an inline decode of the
// reference ids, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/compose-toy-inference-pipeline.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Letters that exist in the fixed VOCAB — drawn words stay encodable.
const TOY_LETTERS = ['a', 'b', 'e', 'l', 'o', 's', 't'];

// Encoded length of a start text: chars per word plus one </w> each (no <eos>).
const encodedLength = (text) => text.split(' ').reduce((total, word) => total + word.length + 1, 0);

// Case definitions: the draw domain produces concrete literals that get baked
// into the test block (honest distinctness — the drawn start texts and bounds
// differ, not just a seed literal). max_len may sit below the encoded length,
// which exercises the "loop never runs" path of the contract.
export const TOY_PIPELINE_CASES = {
  'toy-inference-pipeline': {
    difficulty: 'challenge',
    draw(r) {
      const wordCount = randInt(r, 1, 3);
      const words = [];
      for (let w = 0; w < wordCount; w += 1) {
        const len = randInt(r, 1, 4);
        words.push(Array.from({ length: len }, () => TOY_LETTERS[randInt(r, 0, TOY_LETTERS.length - 1)]).join(''));
      }
      return { text: words.join(' '), maxLen: randInt(r, 3, 16) };
    },
    extraCount: 3,
  },
};

// Appends the seeded literal checks: every draw is concrete in the test
// string; expected ids come from the __ref_run copy in the base block, the
// decoded text from an inline inverse-vocab decode of those same ids. The
// length bound is max(max_len, encoded length) because a start sequence at or
// above the cap never enters the decode loop.
function seededChecks(entry, index) {
  const t = JSON.stringify(entry.text);
  const enc = encodedLength(entry.text);
  return [
    `__t${index} = ${t}`,
    `__o${index} = pipeline(__t${index}, WEIGHTS, ${entry.maxLen}, 0)`,
    `__check('seeded tokens ${index}', __o${index}["tokens"] == __ref_run(__t${index}, WEIGHTS, ${entry.maxLen}, 0))`,
    `__inv${index} = {0: "<eos>", 1: "</w>", 2: "a", 3: "b", 4: "e", 5: "l", 6: "o", 7: "s", 8: "t"}`,
    `__check('seeded text ${index}', __o${index}["text"] == "".join("<eos>" if i == 0 else (" " if __inv${index}[i] == "</w>" else __inv${index}[i]) for i in __ref_run(__t${index}, WEIGHTS, ${entry.maxLen}, 0)).strip())`,
    `__check('seeded laenge ${index}', len(__o${index}["tokens"]) <= ${Math.max(entry.maxLen, enc)})`,
  ].join('\n');
}

export const TOY_PIPELINE_CONTRACT = {
  familyId: 'compose-toy-inference-pipeline',
  familyGroup: 'construct-program',
  summary: 'Komponiert Tokenizer, Toy-Forward-Pass und Greedy-Dekodierung zu einer deterministischen Inferenz-Pipeline mit Rückdekodierung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'toy-inference-pipeline', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-inference', 'c-dl-attention', 'c-dl-tokenizer'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: TOY_PIPELINE_CONTRACT,
  cases: TOY_PIPELINE_CASES,
  shapeError: 'Toy-Pipeline-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});


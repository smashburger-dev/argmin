// Procedural family fit-mlp-val-curve-argmin: the task text, starter code and
// reference solver stay fixed; the seed draws fresh dataset shapes and
// training hyperparameters that get appended to the curated base test block
// as literal __check lines. The drawn data is rebuilt inside the test via
// np.random.default_rng(<dataSeed>) literals, so the checks stay honest
// without pinning float values — only the contracted properties are asserted
// (determinism, lengths, argmin, int type, split contract). Mirrors
// formula-descriptive-stats-numpy.mjs.

import { pyNum } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, pick } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-mlp-val-curve-argmin.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Draw domain: toy-scale datasets (n 120-260, d 2-5), small hidden layers,
// conservative learning rates and 40-80 epochs keep the generated run cheap
// in Pyodide. badFraction is one of the two contracted boundary violations;
// altSeed is a different training seed for the determinism contrast.
export const VAL_CURVE_CASES = {
  'mlp-val-curve-argmin': {
    difficulty: 'challenge',
    draw(r) {
      const trainSeed = randInt(r, 1, 9999);
      return {
        dataSeed: randInt(r, 1, 9999),
        n: randInt(r, 120, 260),
        d: randInt(r, 2, 5),
        hidden: randInt(r, 4, 12),
        lr: randInt(r, 5, 20) / 1000,
        epochs: randInt(r, 40, 80),
        trainSeed,
        altSeed: trainSeed + randInt(r, 1, 9),
        badFraction: pick(r, [0.0, 1.0]),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: data is rebuilt from the drawn
// dataSeed inside the test; the assertions only pin contract-guaranteed
// properties (determinism, keys, lengths, argmin, int, split ValueError),
// never exact float curves.
function seededChecks(entry, index) {
  const i = index;
  const args = `__X${i}, __y${i}, ${entry.hidden}, ${pyNum(entry.lr)}, ${entry.epochs}, ${entry.trainSeed}`;
  return [
    `__dr${i} = np.random.default_rng(${entry.dataSeed})`,
    `__X${i} = __dr${i}.normal(size=(${entry.n}, ${entry.d}))`,
    `__y${i} = np.sin(__X${i}[:, :1]) * 0.8 + 0.1 * __dr${i}.normal(size=(${entry.n}, 1))`,
    `__a${i} = train_mlp_regression(${args})`,
    `__b${i} = train_mlp_regression(${args})`,
    `__check('seeded determinismus ${i}', __a${i} == __b${i})`,
    `__check('seeded schluessel ${i}', set(__a${i}.keys()) == {"train_loss", "val_loss", "best_val_epoch"})`,
    `__check('seeded laengen ${i}', len(__a${i}["train_loss"]) == ${entry.epochs} and len(__a${i}["val_loss"]) == ${entry.epochs})`,
    `__check('seeded val getrennt ${i}', __a${i}["val_loss"][0] != __a${i}["train_loss"][0])`,
    `__check('seeded best int ${i}', isinstance(__a${i}["best_val_epoch"], int) and 0 <= __a${i}["best_val_epoch"] < ${entry.epochs})`,
    `__check('seeded argmin ${i}', __a${i}["best_val_epoch"] == int(np.argmin(__a${i}["val_loss"])))`,
    `__c${i} = train_mlp_regression(__X${i}, __y${i}, ${entry.hidden}, ${pyNum(entry.lr)}, ${entry.epochs}, ${entry.altSeed})`,
    `__check('seeded anderer seed ${i}', __c${i}["train_loss"][0] != __a${i}["train_loss"][0])`,
    'try:',
    `    train_mlp_regression(${args}, val_fraction=${pyNum(entry.badFraction)})`,
    `    __check('seeded split vertrag ${i}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded split vertrag ${i}', True)`,
  ].join('\n');
}

export const VAL_CURVE_CONTRACT = {
  familyId: 'fit-mlp-val-curve-argmin',
  familyGroup: 'fit-model',
  summary: 'Trainiert ein MLP mit einem rng in fester Reihenfolge, führt Trainings- und Validierungsverlust pro Epoche und leitet best_val_epoch als Argmin ab.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'mlp-val-curve-argmin', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-training', 'c-dl-autograd'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: VAL_CURVE_CONTRACT,
  cases: VAL_CURVE_CASES,
  shapeError: 'Val-Curve-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});


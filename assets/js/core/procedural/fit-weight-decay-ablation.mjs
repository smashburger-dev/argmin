// Procedural family fit-weight-decay-ablation: the task text, starter code
// and reference solver stay fixed; the seed draws fresh dataset shapes,
// hyperparameters and training seeds that get appended to the curated base
// test block as literal __check lines. The drawn data is rebuilt inside the
// test via np.random.default_rng(<dataSeed>) literals, so the checks stay
// honest without pinning float values — only the contracted properties are
// asserted (determinism, keys, falling loss, lam=0 equals the plain run,
// decay shrinks the weight norm, smaller lam shrinks less). Mirrors
// fit-mlp-val-curve-argmin.mjs.

import { pyNum } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-weight-decay-ablation.json' with { type: 'json' };

const PACKAGES = ['numpy'];

const W_TRUE_POOL = [-1.5, -1, -0.5, 0.5, 1, 1.5, 2];
const LAM_CHOICES = [0.04, 0.06, 0.08, 0.1];
const LR_CHOICES = [0.01, 0.02, 0.05];

// Draw domain: toy-scale datasets (n 80-220, d 2-5), moderate lambda values,
// conservative learning rates and 300-500 epochs keep the generated run
// converged enough that the contracted shrinkage holds (checked empirically:
// the decayed norm stays strictly below the plain norm across the domain).
// altSeed is a different training seed for the smaller-lambda contrast run,
// mirroring the base block's seed change; wTrue is drawn as a literal column
// vector of nonzero half-step weights.
export const WEIGHT_DECAY_CASES = {
  'weight-decay-ablation': {
    difficulty: 'challenge',
    draw(r) {
      const trainSeed = randInt(r, 1, 9999);
      const d = randInt(r, 2, 5);
      const lam = pick(r, LAM_CHOICES);
      return {
        dataSeed: randInt(r, 1, 9999),
        n: randInt(r, 80, 220),
        d,
        lam,
        lamSmall: Math.round((lam / 5) * 1000) / 1000,
        lr: pick(r, LR_CHOICES),
        epochs: randInt(r, 300, 500),
        trainSeed,
        altSeed: trainSeed + randInt(r, 1, 9),
        wTrue: Array.from({ length: d }, () => pick(r, W_TRUE_POOL)),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: data is rebuilt from the drawn dataSeed
// inside the test; the assertions only pin contract-guaranteed properties
// (determinism, keys, falling loss, w shape, lam=0 equals the plain run,
// float results, decay shrinkage, smaller-lambda soft check), never exact
// float values.
function seededChecks(entry, index) {
  const i = index;
  const wTrueLit = `np.array([${entry.wTrue.map((v) => `[${pyNum(v)}]`).join(', ')}])`;
  const args = `__X${i}, __y${i}, ${entry.lam}, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed}`;
  return [
    `__dr${i} = np.random.default_rng(${entry.dataSeed})`,
    `__X${i} = __dr${i}.normal(size=(${entry.n}, ${entry.d}))`,
    `__wt${i} = ${wTrueLit}`,
    `__y${i} = __X${i} @ __wt${i} + 0.05 * __dr${i}.normal(size=(${entry.n}, 1))`,
    `__a${i} = train_decay(${args})`,
    `__b${i} = train_decay(${args})`,
    `__check('seeded determinismus ${i}', np.array_equal(__a${i}["w"], __b${i}["w"]) and __a${i}["loss_history"] == __b${i}["loss_history"])`,
    `__check('seeded schluessel ${i}', set(__a${i}.keys()) == {"w", "loss_history"})`,
    `__check('seeded verlauf ${i}', len(__a${i}["loss_history"]) == ${entry.epochs} and __a${i}["loss_history"][-1] < __a${i}["loss_history"][0])`,
    `__check('seeded form ${i}', __a${i}["w"].shape == (${entry.d}, 1))`,
    `__p${i} = train_decay(__X${i}, __y${i}, 0.0, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed})`,
    `__c${i} = compare_decay(${args})`,
    `__check('seeded ablation schluessel ${i}', set(__c${i}.keys()) == {"norm_plain", "norm_decay", "final_loss_plain", "final_loss_decay"})`,
    `__check('seeded floats ${i}', all(isinstance(v, float) for v in __c${i}.values()))`,
    `__check('seeded lam0 plain ${i}', abs(__c${i}["norm_plain"] - float(np.linalg.norm(__p${i}["w"]))) < 1e-12 and abs(__c${i}["final_loss_plain"] - __p${i}["loss_history"][-1]) < 1e-12)`,
    `__check('seeded ablation deterministisch ${i}', compare_decay(${args}) == __c${i})`,
    `__check('seeded decay schrumpft ${i}', __c${i}["norm_decay"] < __c${i}["norm_plain"])`,
    `__cs${i} = compare_decay(__X${i}, __y${i}, ${entry.lamSmall}, ${entry.lr}, ${entry.epochs}, ${entry.altSeed})`,
    `__check('seeded kleiner lambda ${i}', __cs${i}["norm_decay"] > __c${i}["norm_decay"] or abs(__cs${i}["norm_decay"] - __c${i}["norm_decay"]) < 1e-3)`,
  ].join('\n');
}

export const WEIGHT_DECAY_CONTRACT = {
  familyId: 'fit-weight-decay-ablation',
  familyGroup: 'fit-model',
  summary: 'Führt eine faire Weight-Decay-Ablation durch: zweimal train_decay mit identischem Seed, reiner MSE in der Historie, λ·w nur im Gradienten.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'weight-decay-ablation', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-regularization', 'c-ml-cv'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: WEIGHT_DECAY_CONTRACT,
  cases: WEIGHT_DECAY_CASES,
  shapeError: 'Weight-Decay-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});


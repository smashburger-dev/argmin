// Procedural family optimize-training-primitive-contract: task text, starter
// code and reference solver stay fixed; the seed draws fresh value vectors,
// probability/label pairs, batch sizes, dropout masks and decay terms that
// get appended to the curated base test block as literal __check lines.
// Expected values are asserted inline against np.* reference formulas with
// the same tolerances as the base checks, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';
import { pyVec, pyMat, pyBoolMat } from './py_test_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-training-primitive-contract.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Python literal emitters come from py_test_kit: ints stay ints,
// probability/decay banks render exact short decimals, masks True/False.

const drawVec = (r, len, lo, hi) => Array.from({ length: len }, () => randInt(r, lo, hi));

// Value banks: probabilities in hundredths (5..95), keep probabilities for
// dropout and decay/lr factors as short exact decimals.
const DROPOUT_PS = [0.5, 0.6, 0.75, 0.8, 1.0];
const DECAY_LRS = [0.1, 0.2, 0.5];
const DECAY_LAMS = [0.0, 0.1, 0.2, 0.5];

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const PRIM_CASES = {
  'loss-and-batch-primitives': {
    difficulty: 'core',
    draw(r) {
      const len = randInt(r, 3, 5);
      const pLen = randInt(r, 2, 4);
      return {
        yHat: drawVec(r, len, -4, 6),
        y: drawVec(r, len, -4, 6),
        p: Array.from({ length: pLen }, () => randInt(r, 5, 95) / 100),
        t: drawVec(r, pLen, 0, 1),
        n: randInt(r, 5, 120),
        batch: randInt(r, 1, 30),
      };
    },
    emitChecks(entry, index) {
      const { yHat, y, p, t, n, batch } = entry;
      const steps = Math.ceil(n / batch);
      return [
        `__yh${index} = ${pyVec(yHat)}`,
        `__yv${index} = ${pyVec(y)}`,
        `__check('seeded mse ${index}', abs(mse_loss(__yh${index}, __yv${index}) - float(np.mean((np.asarray(__yh${index}) - np.asarray(__yv${index})) ** 2))) < 1e-12)`,
        `__pb${index} = ${pyVec(p)}`,
        `__tb${index} = ${pyVec(t)}`,
        `__pc${index} = np.clip(np.asarray(__pb${index}, dtype=float), 1e-12, 1.0 - 1e-12)`,
        `__check('seeded bce ${index}', abs(bce_loss(__pb${index}, __tb${index}) - float(-np.mean(np.asarray(__tb${index}, dtype=float) * np.log(__pc${index}) + (1.0 - np.asarray(__tb${index}, dtype=float)) * np.log(1.0 - __pc${index})))) < 1e-12)`,
        `__check('seeded steps ${index}', steps_per_epoch(${n}, ${batch}) == ${steps})`,
      ].join('\n');
    },
    extraCount: 2,
  },
  'dropout-weight-decay-primitives': {
    difficulty: 'core',
    draw(r) {
      const cols = randInt(r, 2, 3);
      const wLen = randInt(r, 2, 3);
      return {
        x: [drawVec(r, cols, -6, 8), drawVec(r, cols, -6, 8)],
        mask: [
          Array.from({ length: cols }, () => r() < 0.5),
          Array.from({ length: cols }, () => r() < 0.5),
        ],
        p: DROPOUT_PS[randInt(r, 0, DROPOUT_PS.length - 1)],
        w: drawVec(r, wLen, -4, 4),
        g: drawVec(r, wLen, -4, 4),
        lr: DECAY_LRS[randInt(r, 0, DECAY_LRS.length - 1)],
        lam: DECAY_LAMS[randInt(r, 0, DECAY_LAMS.length - 1)],
      };
    },
    emitChecks(entry, index) {
      const { x, mask, p, w, g, lr, lam } = entry;
      return [
        `__x${index} = np.array(${pyMat(x)})`,
        `__mk${index} = np.array(${pyBoolMat(mask)})`,
        `__check('seeded dropout ${index}', np.allclose(dropout_forward(__x${index}, __mk${index}, ${p}), np.where(__mk${index}, __x${index} / ${p}, 0.0)))`,
        `__w${index} = np.array(${pyVec(w)})`,
        `__g${index} = np.array(${pyVec(g)})`,
        `__check('seeded decay ${index}', np.allclose(weight_decay_update(__w${index}, __g${index}, ${lr}, ${lam}), __w${index} - ${lr} * (__g${index} + ${lam} * __w${index})))`,
      ].join('\n');
    },
    extraCount: 2,
  },
};

export const PRIM_CONTRACT = {
  familyId: 'optimize-training-primitive-contract',
  familyGroup: 'optimize-update',
  summary: 'Implementiert Verlust- und Regularisierungsprimitive mit Wertebereichs-Verträgen vor der Rechnung (MSE, BCE mit Clipping, Ceil-Schritte, Dropout, Weight Decay).',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'loss-and-batch-primitives', propertyTest: false },
    { caseId: 'dropout-weight-decay-primitives', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-dl-training', 'c-dl-regularization', 'c-grad-regression', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: PRIM_CONTRACT,
  cases: PRIM_CASES,
  shapeError: 'Trainings-Primitiv-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});


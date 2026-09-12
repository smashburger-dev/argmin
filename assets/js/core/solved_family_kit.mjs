// Solved family kit: shared factories for families whose solve() recomputes
// the answer from parameters — the capsule-based single-choice families and
// the numeric drawFamilyInstance wrappers that used to be hand-copied across
// foundations_linalg_families.mjs and data_ml_families.mjs. Mirrors
// makeChoiceCapsuleFamily (generator_draw_kit.mjs) with the two linalg
// deviations kept explicit as options: per-capsule choice ids (several kinds
// carry semantic ids instead of a/b/c/d) and per-case mastery/competency
// meta merged into the generated instance (the W05 base-case overrides).
//
// Choice hooks (same contract as makeChoiceCapsuleFamily):
//   drawParameters(r, capsule) -> parameters
//   buildOptions(parameters, capsule) -> [correct, wrong1, wrong2, wrong3]
//   validate(parameters, capsule) -> boolean  (capsule shape incl. bound)
//   buildPrompt/buildSolution(parameters, capsule) -> string
//   choiceIds(capsule) -> choice id list (default ['a','b','c','d'])
//   caseMeta: { [caseId]: { masteryEligible, competencyIds } } merged into
//     the generated instance after fullSolution (per-case contract data)
//   shapeError: string, or (capsule) -> string for kind-dependent messages
//
// Numeric hooks:
//   draw(subseed, capsule) -> { parameters, expected, prompt, fullSolution }
//   wantShape(instance, capsule) -> boolean (default: accept every draw)
//   profileAccepts(difficulty, capsule) -> predicate|null (default: null)
//   extraParameters -> object merged between difficulty and drawn params
//   toExpected(drawn) -> expected object ({kind:'integer',value}|{output}|…)
//   staticCaseIds dispatch to registered static bodies before the seeded
//   draw; staticVariants selects variant resolution; solveStatic handles
//   those caseIds inside solve (optional — a family without it solves every
//   parameter set through solveSeeded).

import {
  rng, variantCaseIndex, buildRotatedChoices, drawFamilyInstance,
} from './generator_draw_kit.mjs';
import { staticBodyInstance, staticCaseBody, staticVariantInstance } from '../domain/family_registry.mjs';

const CHOICE_IDS = ['a', 'b', 'c', 'd'];

/** Parametrized choice-capsule family: the seed draw yields computed
 *  parameters (not a bank key), options/prompt/solution are built from the
 *  parameters and the correct position rotates. The family supplies the
 *  hooks — the kit supplies capsuleOk/correctText/genCapsule/generate/solve.
 *  Capsules are keyed by difficulty; each capsule's caseId binds its case. */
export function makeLinalgChoiceCapsuleFamily({
  contract, capsules, shapeError,
  drawParameters, buildOptions, validate, buildPrompt, buildSolution,
  choiceIds = () => CHOICE_IDS, caseMeta = {},
}) {
  const fail = (capsule) => new Error(typeof shapeError === 'function' ? shapeError(capsule) : shapeError);

  const capsuleOk = (parameters, capsule) => {
    try {
      if (!parameters || typeof parameters !== 'object') return false;
      return validate(parameters, capsule);
    } catch { return false; }
  };

  const correctText = (parameters, capsule) => {
    if (!capsuleOk(parameters, capsule)) throw fail(capsule);
    return buildOptions(parameters, capsule)[0];
  };

  const genCapsule = (seed, capsule) => {
    const r = rng(seed);
    const parameters = drawParameters(r, capsule);
    const options = buildOptions(parameters, capsule);
    const rotation = variantCaseIndex(seed, options.length);
    const ids = choiceIds(capsule);
    return {
      parameters,
      expected: { correctChoice: ids[rotation] },
      choices: buildRotatedChoices(options, rotation, ids),
      prompt: buildPrompt(parameters, capsule),
      fullSolution: buildSolution(parameters, capsule),
    };
  };

  const generate = ({ seed, caseId, difficulty }) => {
    const capsule = capsules[difficulty];
    if (!capsule || capsule.caseId !== caseId) {
      throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
    }
    const drawn = drawFamilyInstance((subseed) => genCapsule(subseed, capsule), {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => capsuleOk(instance.parameters, capsule),
      profileAccepts: (parameters) => capsuleOk(parameters, capsule),
      profiles: contract.difficultyProfiles,
    });
    const meta = caseMeta[caseId];
    return {
      parameters: { caseId, difficulty, ...drawn.parameters },
      expected: { ...drawn.expected },
      choices: drawn.choices,
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      ...(meta ? { masteryEligible: meta.masteryEligible, competencyIds: [...meta.competencyIds] } : {}),
    };
  };

  const solve = (parameters) => {
    const capsule = Object.values(capsules).find((item) => item.caseId === parameters?.caseId);
    if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
    return { correctText: correctText(parameters, capsule) };
  };

  return {
    capsuleOk, correctText, genCapsule, generate, solve,
    spec: { graderId: 'deterministic', activityType: 'single-choice', ...contract, generate, solve },
  };
}

/** Numeric family: static cases dispatch to the registered bodies, the
 *  seeded case draws via drawFamilyInstance and the solver recomputes the
 *  answer from parameters ({value}/{output}/{solution} — never reads
 *  expected). With `capsules` the draw is bound to the difficulty's capsule
 *  (caseId check against capsule.caseId); otherwise `seededCaseId` names the
 *  single drawn case. */
export function makeNumericFamily({
  contract,
  staticCaseIds = [],
  staticVariants = false,
  seededCaseId = null,
  capsules = null,
  draw,
  wantShape = () => true,
  profileAccepts = () => null,
  extraParameters = {},
  toExpected,
  solveStatic = null,
  solveSeeded,
}) {
  const staticInstance = (caseId, seed, difficulty) => (staticVariants
    ? staticVariantInstance(contract.familyId, caseId, seed, difficulty)
    : staticBodyInstance(contract.familyId, caseId, difficulty));

  const generate = ({ seed, caseId, difficulty }) => {
    if (staticCaseIds.includes(caseId)) return staticInstance(caseId, seed, difficulty);
    let capsule = null;
    if (capsules) {
      capsule = capsules[difficulty];
      if (!capsule || capsule.caseId !== caseId) {
        throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
      }
    } else if (caseId !== seededCaseId) {
      throw new Error(`Unbekannter Fall ${caseId}`);
    }
    const drawn = drawFamilyInstance((subseed) => draw(subseed, capsule), {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => wantShape(instance, capsule),
      profileAccepts: profileAccepts(difficulty, capsule),
      profiles: contract.difficultyProfiles,
    });
    return {
      parameters: { caseId, difficulty, ...extraParameters, ...drawn.parameters },
      expected: toExpected(drawn),
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
    };
  };

  const solve = (parameters) => {
    if (solveStatic && staticCaseIds.includes(parameters?.caseId)) return solveStatic(parameters);
    return solveSeeded(parameters);
  };

  return { generate, solve, spec: { graderId: 'deterministic', activityType: 'numeric', ...contract, generate, solve } };
}

/** Solved family over a per-caseId definition map (the data_ml pattern):
 *  `cases: { [caseId]: { generator?, competencyIds? } }` — a case without a
 *  generator resolves to the registered static body (variant resolution
 *  included); the 'core' difficulty calls generator(seed) directly, every
 *  other profile goes through drawFamilyInstance. Per-case competencyIds
 *  merge into the generated instance after fullSolution. */
export function makeSolvedFamily({
  contract,
  cases,
  profileAccepts = () => null,
  toExpected,
  solve,
}) {
  const generate = ({ seed, caseId, difficulty }) => {
    const caseDef = cases[caseId];
    if (!caseDef) throw new Error(`${contract.familyId}: unbekannter Fall ${caseId}`);
    if (!caseDef.generator) {
      const body = staticCaseBody(contract.familyId, caseId);
      if (body.difficultyProfile !== difficulty) {
        throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
      }
      return staticVariantInstance(contract.familyId, caseId, seed, difficulty);
    }
    const drawn = difficulty === 'core'
      ? caseDef.generator(seed)
      : drawFamilyInstance(caseDef.generator, {
        seed,
        caseId,
        difficulty,
        wantShape: () => true,
        profileAccepts: profileAccepts(caseId, difficulty),
        profiles: contract.difficultyProfiles,
      });
    return {
      parameters: { caseId, difficulty, ...drawn.parameters },
      expected: toExpected(drawn),
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      ...(caseDef.competencyIds ? { competencyIds: [...caseDef.competencyIds] } : {}),
    };
  };

  return { generate, solve, spec: { graderId: 'deterministic', activityType: 'numeric', ...contract, generate, solve } };
}

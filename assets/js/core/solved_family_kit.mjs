// Solved family kit: shared factories for families whose solve() recomputes
// the answer from parameters — the numeric drawFamilyInstance wrappers that
// used to be hand-copied across foundations_linalg_families.mjs and
// data_ml_families.mjs. The single-choice surface moved to the unified
// makeChoiceFamily in generator_draw_kit.mjs (bank and parameterized mode,
// choiceIds/caseMeta options included). Both factories return the finished
// spec (graderId/activityType defaults + contract + generate/solve).
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

import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { staticBodyInstance, staticCaseBody, staticVariantInstance } from '../domain/family_registry.mjs';

/** Numeric family: static cases dispatch to the registered bodies, the
 *  seeded case draws via drawFamilyInstance and the solver recomputes the
 *  answer from parameters ({value}/{output}/{solution} — never reads
 *  expected). With `capsules` the draw is bound to the difficulty's capsule
 *  (caseId check against capsule.caseId); otherwise `seededCaseId` names the
 *  single drawn case. Extra capsules may share a profile through the
 *  '<profile>-<suffix>' key convention ('challenge-4x4' resolves on
 *  'challenge'). `caseMeta` merges per-case { masteryEligible,
 *  competencyIds } into the instance, same as makeChoiceFamily. */
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
  caseMeta = {},
}) {
  const staticInstance = (caseId, seed, difficulty) => (staticVariants
    ? staticVariantInstance(contract.familyId, caseId, seed, difficulty)
    : staticBodyInstance(contract.familyId, caseId, difficulty));

  const generate = ({ seed, caseId, difficulty }) => {
    if (staticCaseIds.includes(caseId)) return staticInstance(caseId, seed, difficulty);
    let capsule = null;
    if (capsules) {
      const direct = capsules[difficulty];
      capsule = (direct && direct.caseId === caseId) ? direct
        : Object.entries(capsules).find(([key, entry]) => (
          key.startsWith(`${difficulty}-`) && entry.caseId === caseId
        ))?.[1] ?? null;
      if (!capsule) {
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
    const meta = caseMeta[caseId];
    return {
      parameters: { caseId, difficulty, ...extraParameters, ...drawn.parameters },
      expected: toExpected(drawn),
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      ...(meta ? { masteryEligible: meta.masteryEligible, competencyIds: [...meta.competencyIds] } : {}),
    };
  };

  const solve = (parameters) => {
    if (solveStatic && staticCaseIds.includes(parameters?.caseId)) return solveStatic(parameters);
    return solveSeeded(parameters);
  };

  return { graderId: 'deterministic', activityType: 'numeric', ...contract, generate, solve };
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
  ensureDocs = null,
}) {
  const generate = ({ seed, caseId, difficulty }) => {
    const caseDef = cases[caseId];
    if (!caseDef) throw new Error(`${contract.familyId}: unbekannter Fall ${caseId}`);
    if (caseDef.difficulty && caseDef.difficulty !== difficulty) {
      throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
    }
    if (!caseDef.generator) {
      ensureDocs?.();
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
      expected: drawn.choices ? {} : toExpected(drawn),
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      // Seeded choice cases carry their own interaction fields; numeric
      // draws keep the numeric contract unchanged.
      ...(drawn.choices ? { choices: drawn.choices } : null),
      ...(drawn.activityType ? { activityType: drawn.activityType } : null),
      ...(drawn.graderId ? { graderId: drawn.graderId } : null),
      ...(drawn.masteryEligible !== undefined ? { masteryEligible: drawn.masteryEligible } : null),
      ...(drawn.hints ? { hints: drawn.hints } : null),
      ...(drawn.feedbackRules ? { feedbackRules: drawn.feedbackRules } : null),
      ...(drawn.typicalErrors ? { typicalErrors: drawn.typicalErrors } : null),
      ...(caseDef.competencyIds ? { competencyIds: [...caseDef.competencyIds] } : {}),
    };
  };

  return { graderId: 'deterministic', activityType: 'numeric', ...contract, generate, solve };
}

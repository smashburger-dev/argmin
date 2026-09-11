// Shared tail for the python-code procedural families: given the family's
// seededBlock builder the kit produces the capsule-shape predicate, the
// seeded case generator, the solve dispatch and the FAMILY_SPEC wiring that
// used to be hand-copied at the bottom of every module.
//
// Contract per family:
//   cases: { [caseId]: { difficulty, packages, starterCode, baseTests,
//     referenceSolver, prompt, fullSolution, extraCount, competencyIds?,
//     validEntry?, draw(r, i), ... } }
//   seededBlock(caseDef, caseId, seedCases) -> string appended to baseTests
//   shapeError: message thrown when solve sees foreign parameters
import { rng } from '../generator_draw_kit.mjs';

export function makeCaseFamily({ contract, cases, shapeError, seededBlock, defaultPackages }) {
  const testsFor = (caseDef, caseId, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseDef, caseId, seedCases)}`;

  const caseOk = (parameters, caseId, caseDef) => {
    try {
      if (!parameters || typeof parameters !== 'object') return false;
      if (parameters.starterCode !== caseDef.starterCode) return false;
      if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
      if (caseDef.validEntry && !parameters.seedCases.every((entry) => caseDef.validEntry(entry))) return false;
      return parameters.tests === testsFor(caseDef, caseId, parameters.seedCases);
    } catch { return false; }
  };

  const genCase = (seed, caseId, caseDef) => {
    const r = rng(seed);
    const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.draw(r, i));
    return {
      parameters: {
        packages: caseDef.packages ?? defaultPackages,
        starterCode: caseDef.starterCode,
        tests: testsFor(caseDef, caseId, seedCases),
        seedCases,
      },
      expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
      prompt: caseDef.prompt,
      fullSolution: caseDef.fullSolution,
      competencyIds: caseDef.competencyIds,
    };
  };

  const solve = (parameters) => {
    const entry = Object.entries(cases).find(([caseId, caseDef]) => caseOk(parameters, caseId, caseDef));
    if (!entry) throw new Error(shapeError);
    return { referenceCode: entry[1].referenceSolver };
  };

  const generate = ({ seed, caseId, difficulty }) => {
    if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
    const caseDef = cases[caseId];
    if (!caseDef || caseDef.difficulty !== difficulty) {
      throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
    }
    return genCase(seed, caseId, caseDef);
  };

  return { caseOk, genCase, solve, generate, spec: { graderId: 'pyodide', activityType: 'python-code', ...contract, generate, solve } };
}

// Predict-output analogue: parameters carry {caseId, difficulty, ...drawn,
// snippet}; expected is {output}. The case defs own the builders — the kit
// only wires draw -> params -> snippet/expected/prompt/solution.
//
// Contract per family:
//   cases: { [caseId]: { caseId, difficulty, baseSnippet, baseOutput,
//     baseParams, prompt, baseSolution?, competencyIds?, expectedKind?,
//     draw(r), toParams?(drawn), buildSnippet(params), buildOutput(params),
//     buildPrompt?(params), buildSolution?(params), checkParams(params) } }
export function makePredictFamily({ contract, cases, shapeError }) {
  const error = shapeError ?? `${contract.familyId}: Parameter verletzen die Kapselform`;

  const caseOk = (parameters, caseId, caseDef) => {
    try {
      if (!parameters || typeof parameters !== 'object') return false;
      if (!caseDef.checkParams(parameters)) return false;
      return parameters.snippet === caseDef.buildSnippet(parameters);
    } catch { return false; }
  };

  const genCase = (seed, caseId, caseDef) => {
    const r = rng(seed);
    const drawn = caseDef.draw(r);
    const parameters = {
      caseId: caseDef.caseId,
      difficulty: caseDef.difficulty,
      ...(caseDef.toParams ? caseDef.toParams(drawn) : drawn),
    };
    parameters.snippet = caseDef.buildSnippet(parameters);
    return {
      parameters,
      expected: {
        kind: caseDef.expectedKind ?? 'output-lines',
        output: caseDef.buildOutput(parameters),
      },
      prompt: caseDef.buildPrompt ? caseDef.buildPrompt(parameters) : caseDef.prompt,
      fullSolution: caseDef.buildSolution ? caseDef.buildSolution(parameters) : caseDef.baseSolution,
      competencyIds: caseDef.competencyIds,
    };
  };

  const solve = (parameters) => {
    const caseDef = cases[parameters?.caseId];
    if (!caseDef || !caseOk(parameters, parameters.caseId, caseDef)) throw new Error(error);
    return { output: caseDef.buildOutput(parameters) };
  };

  const generate = ({ seed, caseId, difficulty }) => {
    if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
    const caseDef = cases[caseId];
    if (!caseDef || caseDef.difficulty !== difficulty) {
      throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
    }
    return genCase(seed, caseId, caseDef);
  };

  return { caseOk, genCase, solve, generate, spec: { graderId: 'deterministic', activityType: 'predict-output', ...contract, generate, solve } };
}

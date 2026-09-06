import {
  dot,
  matmul,
  rank,
  solveLinear2,
} from './w05_generators.mjs';
import { hasSeedGenerator, resolveSeedGenerator } from './seed_generator_registry.mjs';
const referenceSolvers = {
  dotProduct: ({ u, v }) => dot(u, v),
  matmulEntry: ({ A, B, entry }) => matmul(A, B)[entry[0] - 1][entry[1] - 1],
  rank3: ({ A }) => rank(A),
  solveLinear2: ({ A, b }) => solveLinear2(A, b),
};

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/** Fail-closed shape check for generator-produced choices (ADR-0015):
 *  at least two options, unique ids, non-empty texts, exactly one correct. */
export function validateGeneratedChoices(choices, context) {
  if (!Array.isArray(choices) || choices.length < 2) {
    throw new Error(`${context}: Generator-Choices brauchen mindestens zwei Optionen`);
  }
  const ids = new Set();
  let correctCount = 0;
  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') throw new Error(`${context}: ungültige Choice`);
    if (typeof choice.id !== 'string' || !choice.id) throw new Error(`${context}: Choice ohne id`);
    if (ids.has(choice.id)) throw new Error(`${context}: doppelte Choice-id ${choice.id}`);
    ids.add(choice.id);
    if (typeof choice.text !== 'string' || !choice.text.trim()) throw new Error(`${context}: Choice ${choice.id} ohne Text`);
    if (typeof choice.correct !== 'boolean') throw new Error(`${context}: Choice ${choice.id} ohne boolean correct`);
    if (choice.correct) correctCount += 1;
  }
  if (correctCount !== 1) throw new Error(`${context}: genau eine Choice muss korrekt sein (ist ${correctCount})`);
}

export function adaptLegacyExercise(exercise, weekId) {
  if (!exercise || typeof exercise !== 'object') throw new TypeError('Legacy-Aufgabe fehlt');
  if (!exercise.exerciseId) throw new Error('Legacy-Aufgabe ohne exerciseId');
  const deterministicSeed = Number(exercise.deterministicSeed);
  if (!Number.isSafeInteger(deterministicSeed)) throw new Error(`${exercise.exerciseId}: deterministicSeed ist ungültig`);
  const legacyGenerator = exercise.expectedAnswer?.generator || exercise.parameters?.seedGenerator || null;
  const generatorId = hasSeedGenerator(legacyGenerator) ? legacyGenerator : null;
  const referenceSolverId = Object.hasOwn(referenceSolvers, legacyGenerator) ? legacyGenerator : null;
  if (legacyGenerator && !generatorId && !referenceSolverId) throw new Error(`Unbekannter Legacy-Generator ${legacyGenerator}`);
  return {
    definitionId: exercise.exerciseId,
    version: Number(exercise.schemaVersion) || 1,
    locale: exercise.locale || 'de',
    title: exercise.title || exercise.exerciseId,
    competencyIds: [...(exercise.skillIds || [])],
    activityType: exercise.type,
    graderId: exercise.grader,
    generatorId,
    referenceSolverId,
    deterministicSeed,
    prompt: exercise.prompt,
    parameters: clone(exercise.parameters || {}),
    choices: clone(exercise.choices || []),
    expectedAnswer: clone(exercise.expectedAnswer ?? null),
    tolerancePolicy: clone(exercise.tolerancePolicy || {}),
    hints: clone(exercise.hints || []),
    feedbackRules: clone(exercise.feedbackRules || []),
    fullSolution: exercise.fullSolution || '',
    difficulty: Number(exercise.difficulty) || 1,
    estimatedMinutes: Number(exercise.estimatedMinutes) || 1,
    sourceLineage: {
      statement: String(exercise.sourceLineage?.statement || 'eigenständig entwickelt'),
      seed: Number(exercise.sourceLineage?.seed ?? exercise.deterministicSeed),
    },
    rightsId: 'ki-lernplattform-original',
    releaseStatus: String(exercise.validationStatus || '').includes('browser-verified') ? 'browser-verified' : 'draft',
    testedSeedCount: Number(exercise.testedSeedCount) || 0,
    masteryEligible: exercise.masteryEligible !== false && exercise.grader !== 'manual-rubric',
    active: exercise.active !== false,
    legacyWeekId: weekId,
    workedExample: clone(exercise.workedExample ?? null),
    rubric: clone(exercise.rubric ?? null),
    typicalErrors: clone(exercise.typicalErrors ?? null),
  };
}

export function instantiateLegacyExercise(definition, seed = definition.deterministicSeed) {
  const instance = {
    ...clone(definition),
    instanceId: `${definition.definitionId}:${seed}`,
    definitionId: definition.definitionId,
    definitionVersion: definition.version,
    exerciseId: definition.definitionId,
    seed,
    deterministicSeed: seed,
    competencyIds: [...definition.competencyIds],
    skillIds: [...definition.competencyIds],
    activityType: definition.activityType,
    type: definition.activityType,
    graderId: definition.graderId,
    grader: definition.graderId,
    parameters: clone(definition.parameters),
    choices: clone(definition.choices || []),
    expectedAnswer: clone(definition.expectedAnswer),
  };
  const applyExpected = (expected) => {
    const kind = definition.expectedAnswer?.kind || 'generated';
    instance.expectedAnswer = { ...clone(definition.expectedAnswer), kind };
    if (Array.isArray(expected)) {
      instance.expectedAnswer.value = clone(expected);
      instance.expectedAnswer.solution = clone(expected);
    } else if (expected && typeof expected === 'object') {
      Object.assign(instance.expectedAnswer, clone(expected));
    } else {
      instance.expectedAnswer.value = expected;
    }
  };
  if (definition.referenceSolverId) {
    const solver = referenceSolvers[definition.referenceSolverId];
    if (!solver) throw new Error(`Unbekannter Legacy-Referenzsolver ${definition.referenceSolverId}`);
    applyExpected(solver(instance.parameters));
  }
  if (!definition.generatorId) return instance;
  const generated = resolveSeedGenerator(definition.generatorId)(seed);
  if (generated.choices !== undefined) {
    if (definition.activityType !== 'single-choice') {
      throw new Error(`${definition.definitionId}: Generator liefert Choices, aber der Typ ist ${definition.activityType}`);
    }
    validateGeneratedChoices(generated.choices, definition.definitionId);
    instance.choices = clone(generated.choices);
  }
  instance.parameters = clone(generated.parameters);
  if (generated.prompt) instance.prompt = generated.prompt;
  if (generated.fullSolution) instance.fullSolution = generated.fullSolution;
  applyExpected(generated.expected);
  return instance;
}

export function hasLegacyGenerator(generatorId) {
  return generatorId === null || hasSeedGenerator(generatorId);
}

export function hasLegacyReferenceSolver(referenceSolverId) {
  return referenceSolverId === null || Object.hasOwn(referenceSolvers, referenceSolverId);
}

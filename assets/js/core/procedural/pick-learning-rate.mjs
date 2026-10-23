import { gradePickLearningRate } from '../figure_answer_graders.mjs';
import { descent, leastSquares, regressionData } from '../../figures/objects/optimization-model.mjs';

const CASE_ID = 'stable-convergent-rate';
const ETA_VALUES = [0.025, 0.075, 0.125, 0.2];
const EXPECTED = {
  kind: 'pick-learning-rate',
  schemaVersion: 1,
  lossIncreaseTolerance: 1e-9,
  distanceTolerance: 0.12,
};

function parameters(seed) {
  const shift = seed === 0 ? 0 : 0.1 + ((Math.abs(seed) - 1) % 700) * 0.0001;
  const startOffset = 4 * shift;
  return {
    data: regressionData.map(([x, y]) => [x + shift, y]),
    initial: { w: startOffset, b: 0 },
    maxSteps: 12,
    etaValues: [...ETA_VALUES],
  };
}

function simulate(input, eta) {
  const optimum = leastSquares(input.data);
  const trace = descent(input.data, input.initial.w, input.initial.b, eta, input.maxSteps).trace;
  return { steps: trace.map((point) => ({
    loss: point.loss,
    distance: Math.hypot(point.w - optimum.w, point.b - optimum.b),
  })) };
}

function acceptedRates(input) {
  return input.etaValues.filter((eta) => gradePickLearningRate(
    { parameters: input, expectedAnswer: EXPECTED },
    { kind: 'scene-build', schemaVersion: 1, form: { eta }, steps: [] },
    simulate,
  ).correct);
}

export function generate({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed) || caseId !== CASE_ID || difficulty !== 'core') {
    throw new Error('Unbekannter Lernratenfall');
  }
  const input = parameters(seed);
  const rates = acceptedRates(input);
  if (rates.length < 2) throw new Error('Lernratenfall braucht mehrere gültige Werte');
  return {
    parameters: input,
    expected: { ...EXPECTED },
    activityType: 'scene-build',
    graderId: 'deterministic',
    masteryEligible: true,
    title: 'Eine passende Lernrate wählen',
    prompt: `Wähle eine Lernrate aus ${input.etaValues.join(', ')}. Der Verlust soll über ${input.maxSteps} Updates nicht steigen und der Endzustand soll nahe am Minimum liegen. Mehrere Werte können passen.`,
    fullSolution: `Mit ${rates.map((eta) => `η = ${eta}`).join(' oder ')} bleibt der Verlust im Testlauf stabil und der Endabstand liegt innerhalb der Toleranz.`,
    hints: [
      'Vergleiche den Verlust über mehrere aufeinanderfolgende Updates.',
      'Ein kleiner Verlust allein genügt nicht: Prüfe auch den Abstand des Endzustands zum Minimum.',
    ],
  };
}

export function solve(input) {
  if (!input || !Array.isArray(input.etaValues)) throw new Error('Lernratenparameter fehlen');
  return { validChoiceCount: acceptedRates(input).length };
}

export function hintAnswers(input) {
  if (!input || !Array.isArray(input.etaValues)) throw new Error('Lernratenparameter fehlen');
  return acceptedRates(input);
}

export const FAMILY_SPEC = {
  familyId: 'pick-learning-rate',
  familyGroup: 'scene-build',
  summary: 'Vergleicht Lernraten an ihren Verlustverläufen und am Endabstand zum Minimum.',
  taskArchetype: 'scene-build-task',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [{ caseId: CASE_ID }],
  difficultyProfiles: ['core'],
  competencyIds: ['c-grad-regression'],
  activityType: 'scene-build',
  graderId: 'deterministic',
  generate,
  solve,
  hintAnswers,
};

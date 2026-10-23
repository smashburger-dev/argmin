import { isSceneBuildAnswer } from '../domain/scene_answer.mjs';
import { evaluate } from '../figures/scenes/smoothie.mjs';
import { applyBalanceStep, balanceModel, isIsolatedBalance, sameBalanceState, solveBalance } from './balance_model.mjs';
import { gradePickLearningRate, gradeTagAfterLine, isTagAfterLineContract } from './figure_answer_graders.mjs';
import { descent, leastSquares } from '../figures/objects/optimization-model.mjs';

const result = (correct, errorType, fields = [], simulation = null) => ({
  correct, errorType, fields, simulation,
  verdictText: correct ? 'Richtig. Die Eigenschaften sind erfüllt.' : 'Prüfe die markierten Eingaben und Schritte.',
});
const field = (path, correct, message) => ({ path, correct, message });
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const vec = (value) => Array.isArray(value) && value.length === 2
  && value.every((item) => Number.isSafeInteger(item) && Math.abs(item) <= 1000000);

export function solveMixer(parameters) {
  const { a1, a2, target } = parameters;
  if (![a1, a2, target].every(vec)) throw new Error('Mixer braucht drei ganzzahlige Zweiervektoren');
  const determinant = a1[0] * a2[1] - a1[1] * a2[0];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  if (determinant !== 0) return { solutionSet: 'unique', portions: [cross(target, a2) / determinant, cross(a1, target) / determinant] };
  const nonzero = [...a1, ...a2].some((item) => item !== 0);
  const reachable = nonzero ? cross(a1, target) === 0 && cross(a2, target) === 0 : target.every((item) => item === 0);
  return { solutionSet: reachable ? 'infinite' : 'none' };
}

function gradeMixer(parameters, answer) {
  const solved = solveMixer(parameters);
  const fields = [field('form.solutionSet', answer.form.solutionSet === solved.solutionSet, 'Lösungsfall')];
  if (answer.steps.length) return result(false, 'invalid-input', [field('steps', false, 'Mixer verwendet nur den Formularzustand')]);
  if (solved.solutionSet === 'none') return result(fields[0].correct, fields[0].correct ? null : 'wrong-solution-case', fields);
  const portions = answer.form.portions;
  if (!Array.isArray(portions) || portions.length !== 2 || !portions.every(Number.isFinite)) {
    return result(false, 'invalid-input', [...fields, field('form.portions', false, 'Zwei endliche Zahlen eingeben')]);
  }
  const simulation = evaluate({ a1: parameters.a1, a2: parameters.a2, b: parameters.target }, portions);
  if (![...simulation.mix, ...simulation.diff].every(Number.isFinite)) return result(false, 'invalid-input');
  fields.push(...simulation.diff.map((diff, index) => field('form.portions', Math.abs(diff) <= 1e-9, `Zielkoordinate ${index + 1}: Differenz ${diff}`)));
  const correct = fields.every((item) => item.correct);
  return result(correct, correct ? null : 'target-mismatch', fields, simulation);
}

function gradeBalance(parameters, answer) {
  let state = balanceModel(parameters);
  if (solveBalance(state).solutionSet !== 'unique') throw new Error('Waagenaufgabe braucht eine eindeutige Lösung');
  const fields = [];
  for (const [index, step] of answer.steps.entries()) {
    try {
      state = applyBalanceStep(state, step);
      fields.push(field(`steps.${index}`, true, 'Äquivalenz erhalten'));
    } catch (error) {
      return result(false, 'non-equivalent-step', [...fields, field(`steps.${index}`, false, error.message)], { state });
    }
  }
  try {
    fields.push(field('form.equation', sameBalanceState(state, answer.form.equation), 'Formular und Schrittfolge stimmen überein'));
    fields.push(field('form.equation', isIsolatedBalance(state), 'x steht allein'));
  } catch (error) {
    return result(false, 'invalid-input', [...fields, field('form.equation', false, error.message)], { state });
  }
  const correct = fields.every((item) => item.correct);
  return result(correct, correct ? null : 'not-isolated', fields, { state });
}

function simulateLearningRate(parameters, eta) {
  const { data, initial, maxSteps } = parameters;
  const trace = descent(data, initial.w, initial.b, eta, maxSteps).trace;
  const optimum = leastSquares(data);
  return { steps: trace.map((point) => ({ loss: point.loss, distance: Math.hypot(point.w - optimum.w, point.b - optimum.b) })) };
}

const PROPERTY_GRADERS = { mixer: gradeMixer, balance: gradeBalance };
const TASK_GRADERS = {
  'pick-learning-rate': (parameters, answer, expectedAnswer) => gradePickLearningRate({ parameters, expectedAnswer }, answer, simulateLearningRate),
  'tag-after-line': (_parameters, answer, expectedAnswer) => gradeTagAfterLine({ expectedAnswer }, answer),
};

function knownTaskContract(expected) {
  if (!record(expected)) return false;
  if (expected.kind === 'scene-properties') return Object.hasOwn(PROPERTY_GRADERS, expected.model);
  if (expected.kind === 'pick-learning-rate') return expected.schemaVersion === 1;
  return expected.kind === 'tag-after-line' && expected.schemaVersion === 1;
}

function assertLearningRateContract(label, item, expected) {
  if (expected.kind !== 'pick-learning-rate') return;
  const invalid = gradePickLearningRate({ parameters: item.parameters, expectedAnswer: expected }, null, simulateLearningRate);
  if (invalid.errorType === 'grader-error') throw new Error(`${label}: ungültiger pick-learning-rate/v1-Aufgabenvertrag`);
}

function assertTagContract(label, expected) {
  if (expected.kind !== 'tag-after-line') return;
  if (!isTagAfterLineContract(expected)) throw new Error(`${label}: ungültiger tag-after-line/v1-Aufgabenvertrag`);
}

export function assertSceneBuildContract(label, item) {
  const expected = item.expectedAnswer ?? item.expected;
  if (!knownTaskContract(expected)) {
    throw new Error(`${label}: unbekannter oder nicht versionierter scene-build-Aufgabenvertrag`);
  }
  if (item.graderId && item.graderId !== 'deterministic') throw new Error(`${label}: scene-build braucht deterministic`);
  if (expected.kind === 'scene-properties' && expected.model === 'mixer') solveMixer(item.parameters);
  else if (expected.kind === 'scene-properties' && solveBalance(item.parameters).solutionSet !== 'unique') {
    throw new Error(`${label}: eindeutige Waagenlösung fehlt`);
  }
  assertLearningRateContract(label, item, expected);
  assertTagContract(label, expected);
}

export function gradeSceneBuild(exercise, answer) {
  try { assertSceneBuildContract('Aufgabe', exercise); }
  catch (error) { return { ...result(false, 'grader-error'), masteryEligible: false, diagnosis: error.message }; }
  if (!isSceneBuildAnswer(answer)) return result(false, 'invalid-input');
  const expected = exercise.expectedAnswer ?? exercise.expected;
  if (expected.kind === 'scene-properties') return PROPERTY_GRADERS[expected.model](exercise.parameters, answer);
  return TASK_GRADERS[expected.kind](exercise.parameters, answer, expected);
}

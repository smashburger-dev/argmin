import { isSceneBuildAnswer } from '../domain/scene_answer.mjs';

const result = (correct, errorType, fields = [], simulation = null) => ({
  correct, errorType, fields, simulation,
  verdictText: correct ? 'Richtig.' : 'Prüfe die markierten Eingaben.',
});
const field = (path, correct, message) => ({ path, correct, message });
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;

function validEtaValues(parameters) {
  const values = parameters?.etaValues;
  if (!Array.isArray(values) || values.length === 0 || values.length > 1000) return false;
  return values.every(Number.isFinite) && new Set(values).size === values.length;
}

function validLearningRateParameters(parameters) {
  if (!validEtaValues(parameters)) return false;
  if (!record(parameters.initial) || !Number.isFinite(parameters.initial.w) || !Number.isFinite(parameters.initial.b)) return false;
  if (!Array.isArray(parameters.data) || parameters.data.length < 2) return false;
  if (!parameters.data.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return false;
  return Number.isSafeInteger(parameters.maxSteps) && parameters.maxSteps > 0 && parameters.maxSteps <= 128;
}

function validLearningRateContract(expected, parameters, simulate) {
  if (expected?.kind !== 'pick-learning-rate' || expected.schemaVersion !== 1) return false;
  if (!finiteNonnegative(expected.lossIncreaseTolerance) || !finiteNonnegative(expected.distanceTolerance)) return false;
  return validLearningRateParameters(parameters) && typeof simulate === 'function';
}

function validRun(run, parameters) {
  if (!record(run) || !Array.isArray(run.steps) || run.steps.length === 0) return false;
  if (run.steps.length > parameters.maxSteps + 1) return false;
  return run.steps.every((step) => record(step) && Number.isFinite(step.loss) && finiteNonnegative(step.distance));
}

function validPickAnswer(answer, parameters) {
  if (!isSceneBuildAnswer(answer)) return false;
  if (Object.keys(answer.form).join(',') !== 'eta' || answer.steps.length !== 0) return false;
  return Number.isFinite(answer.form.eta) && parameters.etaValues.includes(answer.form.eta);
}

function pickFeedback(run, expected) {
  const increaseAt = run.steps.findIndex((step, index) => index > 0
    && step.loss - run.steps[index - 1].loss > expected.lossIncreaseTolerance);
  const finalDistance = run.steps.at(-1).distance;
  return [
    field('form.eta', increaseAt < 0, increaseAt < 0
      ? 'Kein Verlustanstieg über der Toleranz' : `Verlust steigt bei Schritt ${increaseAt + 1}`),
    field('form.eta', finalDistance <= expected.distanceTolerance,
      `Endabstand ${finalDistance}; erlaubt ${expected.distanceTolerance}`),
  ];
}

function validBinding(binding, names) {
  return record(binding) && typeof binding.name === 'string' && Boolean(binding.name)
    && typeof binding.objectId === 'string' && Boolean(binding.objectId) && !names.has(binding.name);
}

function validTraceState(state, lineIds) {
  if (!record(state) || typeof state.lineId !== 'string' || !state.lineId || lineIds.has(state.lineId)) return false;
  if (!Array.isArray(state.bindings) || state.bindings.length > 128) return false;
  const names = new Set();
  for (const binding of state.bindings) {
    if (!validBinding(binding, names)) return false;
    names.add(binding.name);
  }
  lineIds.add(state.lineId);
  return true;
}

export function isTagAfterLineContract(expected) {
  if (!record(expected) || expected.kind !== 'tag-after-line' || expected.schemaVersion !== 1) return false;
  if (!Array.isArray(expected.states) || expected.states.length === 0 || expected.states.length > 128) return false;
  const lineIds = new Set();
  return expected.states.every((state) => validTraceState(state, lineIds));
}

export function gradePickLearningRate(exercise, answer, simulate) {
  const expected = exercise?.expectedAnswer ?? exercise?.expected;
  const parameters = exercise?.parameters;
  if (!validLearningRateContract(expected, parameters, simulate)) {
    return { ...result(false, 'grader-error'), masteryEligible: false, diagnosis: 'Ungültiger pick-learning-rate/v1-Aufgabenvertrag.' };
  }
  if (!validPickAnswer(answer, parameters)) return result(false, 'invalid-input');

  let run;
  try { run = simulate(parameters, answer.form.eta); }
  catch { return result(false, 'invalid-input', [field('form.eta', false, 'Lernrate konnte nicht ausgeführt werden')]); }
  if (!validRun(run, parameters)) return result(false, 'grader-error');
  const fields = pickFeedback(run, expected);
  const correct = fields.every((item) => item.correct);
  return result(correct, correct ? null : 'learning-rate-out-of-contract', fields, run);
}

function sameBindings(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const map = new Map();
  for (const binding of actual) {
    if (!validBinding(binding, map)) return false;
    map.set(binding.name, binding.objectId);
  }
  return expected.every(({ name, objectId }) => map.get(name) === objectId);
}

function submittedTags(answer) {
  if (!isSceneBuildAnswer(answer)) return null;
  if (Object.keys(answer.form).join(',') !== 'tags' || answer.steps.length || !Array.isArray(answer.form.tags)) return null;
  const tags = new Map();
  for (const state of answer.form.tags) {
    if (!record(state) || typeof state.lineId !== 'string' || tags.has(state.lineId)) return null;
    tags.set(state.lineId, state.bindings);
  }
  return tags;
}

function tagFeedback(expected, submitted) {
  return expected.states.flatMap((state) => {
    const exact = sameBindings(submitted.get(state.lineId), state.bindings);
    if (state.bindings.length === 0) return [field(`form.tags.${state.lineId}`, exact, 'Keine Bindungen für diesen Zustand')];
    return state.bindings.map(({ name, objectId }) => field(`form.tags.${state.lineId}.${name}`,
      exact, `Bindung nach ${state.lineId}: ${name} → ${objectId}`));
  });
}

export function gradeTagAfterLine(exercise, answer) {
  const expected = exercise?.expectedAnswer ?? exercise?.expected;
  if (!isTagAfterLineContract(expected)) {
    return { ...result(false, 'grader-error'), masteryEligible: false, diagnosis: 'Ungültiger tag-after-line/v1-Aufgabenvertrag.' };
  }
  const submitted = submittedTags(answer);
  if (!submitted) return result(false, 'invalid-input');
  if (submitted.size !== expected.states.length || expected.states.some((state) => !submitted.has(state.lineId))) {
    return result(false, 'invalid-input');
  }
  const fields = tagFeedback(expected, submitted);
  const correct = fields.every((item) => item.correct);
  return result(correct, correct ? null : 'binding-mismatch', fields, { states: expected.states.length });
}

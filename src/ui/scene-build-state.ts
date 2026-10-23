import { balanceModel, applyBalanceStep } from '../../assets/js/core/balance_model.mjs';
import { isSceneBuildAnswer } from '../../assets/js/domain/scene_answer.mjs';
import { progress } from '../../assets/js/core/progress_store.js';

export type BalanceState = { left: { x: string; constant: string }; right: { x: string; constant: string } };
export type BalanceStep = { operation: string; side: string; term: { x: string; constant: string } };
export type SceneAnswer = {
  kind: 'scene-build'; schemaVersion: 1;
  form: { solutionSet?: string; portions?: (number | string)[]; equation?: BalanceState; eta?: number; tags?: { lineId: string; bindings: { name: string; objectId: string }[] }[] };
  steps: BalanceStep[];
};
export type SceneExercise = { instanceId?: string; parameters: Record<string, unknown>; expectedAnswer?: Record<string, unknown> };
export type SceneFeedback = { fields?: { path: string; correct: boolean; message: string }[]; simulation?: unknown; errorType?: string | null };

function initialForm(exercise: SceneExercise): SceneAnswer['form'] {
  const kind = exercise.expectedAnswer?.kind;
  if (kind === 'pick-learning-rate') return initialEtaForm(exercise);
  if (kind === 'tag-after-line') return initialTagForm(exercise);
  if (exercise.expectedAnswer?.model === 'balance') return initialBalanceForm(exercise);
  return { solutionSet: 'unique', portions: [0, 0] };
}

function initialEtaForm(exercise: SceneExercise) {
  const values = etaValues(exercise);
  return { eta: Number(values[0] ?? 0) };
}

function initialTagForm(exercise: SceneExercise) {
  const lineIds = (exercise.parameters.tagTask as { lineIds?: string[] } | undefined)?.lineIds ?? [];
  return { tags: lineIds.map((lineId) => ({ lineId, bindings: [] })) };
}

function initialBalanceForm(exercise: SceneExercise) {
  return { equation: balanceModel(exercise.parameters) as BalanceState };
}

export function initialSceneAnswer(exercise: SceneExercise): SceneAnswer {
  return { kind: 'scene-build', schemaVersion: 1, form: initialForm(exercise), steps: [] };
}

export function balanceAnswer(exercise: SceneExercise, steps: BalanceStep[]): SceneAnswer {
  let equation = balanceModel(exercise.parameters) as BalanceState;
  for (const step of steps) {
    try { equation = applyBalanceStep(equation, step) as BalanceState; }
    catch { break; }
  }
  return { kind: 'scene-build', schemaVersion: 1, form: { equation }, steps };
}

export function portionNumber(raw: string): number | string {
  const text = raw.trim().replaceAll('−', '-').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(text)) return raw;
  const [numerator, denominator = '1'] = text.split('/');
  const value = Number(numerator) / Number(denominator);
  return Number.isFinite(value) ? value : raw;
}

const draftId = (exercise: SceneExercise) => `scene:${exercise.instanceId}`;
let writes = Promise.resolve();
export function saveSceneDraft(exercise: SceneExercise, answer: SceneAnswer) {
  const draft = { activityId: draftId(exercise), answer: JSON.parse(JSON.stringify(answer)) };
  writes = writes.catch(() => {}).then(async () => { await progress?.saveDraft(draft); });
  return writes;
}

export async function loadSceneDraft(exercise: SceneExercise): Promise<SceneAnswer> {
  const initial = initialSceneAnswer(exercise);
  const draft = await progress?.getDraft(draftId(exercise));
  if (!isSceneBuildAnswer(draft?.answer)) return initial;
  try {
    return validDraft(exercise, initial, draft.answer) ? draft.answer as SceneAnswer : initial;
  } catch { return initial; }
}

function validDraft(exercise: SceneExercise, initial: SceneAnswer, answer: SceneAnswer): boolean {
  if (initial.form.equation) { balanceModel(answer.form.equation); return true; }
  if (initial.form.eta !== undefined) return validEtaDraft(exercise, answer.form.eta);
  if (initial.form.tags) return validTagDraft(initial.form.tags, answer.form.tags);
  return Array.isArray(answer.form.portions);
}

function etaValues(exercise: SceneExercise): number[] {
  return Array.isArray(exercise.parameters.etaValues) ? exercise.parameters.etaValues as number[] : [];
}

function validEtaDraft(exercise: SceneExercise, eta: number | undefined): boolean {
  return Number.isFinite(eta) && etaValues(exercise).includes(eta!);
}

function validTagDraft(expected: NonNullable<SceneAnswer['form']['tags']>, actual: SceneAnswer['form']['tags']): boolean {
  return Array.isArray(actual) && actual.length === expected.length
    && expected.every((state, index) => actual[index]?.lineId === state.lineId && Array.isArray(actual[index]?.bindings));
}

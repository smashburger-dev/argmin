import { balanceModel, applyBalanceStep } from '../../assets/js/core/balance_model.mjs';
import { isSceneBuildAnswer } from '../../assets/js/domain/scene_answer.mjs';
import { progress } from '../../assets/js/core/progress_store.js';

export type BalanceState = { left: { x: string; constant: string }; right: { x: string; constant: string } };
export type BalanceStep = { operation: string; side: string; term: { x: string; constant: string } };
export type SceneAnswer = {
  kind: 'scene-build'; schemaVersion: 1;
  form: { solutionSet?: string; portions?: (number | string)[]; equation?: BalanceState };
  steps: BalanceStep[];
};
export type SceneExercise = { instanceId?: string; parameters: Record<string, unknown>; expectedAnswer?: Record<string, unknown> };
export type SceneFeedback = { fields?: { path: string; correct: boolean; message: string }[]; simulation?: unknown; errorType?: string | null };

export function initialSceneAnswer(exercise: SceneExercise): SceneAnswer {
  const form = exercise.expectedAnswer?.model === 'balance'
    ? { equation: balanceModel(exercise.parameters) as BalanceState }
    : { solutionSet: 'unique', portions: [0, 0] };
  return { kind: 'scene-build', schemaVersion: 1, form, steps: [] };
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
    if (initial.form.equation) balanceModel(draft.answer.form.equation);
    else if (!Array.isArray(draft.answer.form.portions)) return initial;
    return draft.answer as SceneAnswer;
  } catch { return initial; }
}

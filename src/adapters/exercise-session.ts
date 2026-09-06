import { graders } from '../../assets/js/core/graders.js';
import { progress } from '../../assets/js/core/progress_store.js';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { instantiateLegacyExercise } from '../../assets/js/core/legacy_exercise_adapter.mjs';
import type { ExerciseSummary } from '../app/types';

export interface GradeOutcome {
  correct: boolean;
  verdictText: string;
  diagnosis?: string | null;
  errorType?: string | null;
  masteryEligible?: boolean;
  reviewDueAt?: string | null;
}

export function instantiateExercise(exercise: ExerciseSummary, seed = exercise.deterministicSeed): ExerciseSummary {
  return instantiateLegacyExercise(exercise, seed) as ExerciseSummary;
}

function activityFields(exercise: ExerciseSummary) {
  return {
    activityId: exercise.definitionId,
    definitionId: exercise.definitionId,
    exerciseId: exercise.definitionId,
    activityVersion: exercise.version,
    competencyIds: exercise.competencyIds,
    seed: exercise.deterministicSeed,
  };
}

export async function gradeAndRecord(exercise: ExerciseSummary, answer: unknown, hintsUsed: number): Promise<GradeOutcome> {
  const started = performance.now();
  const outcome = exercise.graderId === 'deterministic'
    ? await graders.deterministic.grade(exercise, answer)
    : exercise.graderId === 'pyodide-sympy'
      ? await graders['pyodide-sympy'].grade(exercise, answer)
      : exercise.graderId === 'manual-rubric'
        ? await graders['manual-rubric'].grade(exercise, answer)
        : null;
  if (!outcome) throw new Error(`Aufgabengrader wird in dieser Ansicht nicht unterstützt: ${exercise.graderId}`);
  const outcomeAllowsMastery = !('masteryEligible' in outcome) || outcome.masteryEligible !== false;
  const masteryEligible = exercise.masteryEligible && outcomeAllowsMastery;
  if (learningLedger) {
    await learningLedger.record({
      ...activityFields(exercise),
      eventType: 'attempt',
      answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
      durationMs: Math.round(performance.now() - started),
      hintsUsed,
      correct: Boolean(outcome.correct),
      masteryEligible,
      errorType: outcome.errorType || null,
    });
  }
  const reviewDueAt = outcome.correct && masteryEligible && progress
    ? (await progress.reviewQueueAll()).find((entry: { exerciseId: string }) => entry.exerciseId === exercise.definitionId)?.nextDueAt ?? null
    : null;
  return {
    correct: Boolean(outcome.correct),
    verdictText: outcome.verdictText || (outcome.correct ? 'Richtig.' : 'Nicht richtig.'),
    diagnosis: ('diagnosis' in outcome ? outcome.diagnosis : null) || null,
    errorType: outcome.errorType || null,
    masteryEligible,
    reviewDueAt,
  };
}

export async function startNewExerciseCycle(exerciseId: string): Promise<void> {
  if (!progress) return;
  await progress.startExerciseCycle(exerciseId);
}

export async function recordWorkedExample(exercise: ExerciseSummary): Promise<void> {
  if (!learningLedger) return;
  await learningLedger.record({
    ...activityFields(exercise),
    eventType: 'worked-example-studied',
    event: 'studied',
  });
}

export async function recordAssistance(exercise: ExerciseSummary, hintsUsed: number, revealSolution = false): Promise<void> {
  if (!learningLedger) return;
  await learningLedger.record({
    ...activityFields(exercise),
    eventType: revealSolution ? 'solution-revealed' : 'hint-used',
    event: revealSolution ? 'solution-revealed' : `hint-${hintsUsed}`,
    hintsUsed,
    revealedSolution: revealSolution,
  });
}

import { graders } from '../../assets/js/core/graders.js';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { pyodideRunner } from '../../assets/js/runtime/pyodide_runner.js';
import type { ExerciseSummary } from '../app/types';

export interface WorkspaceTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface WorkspaceResult {
  ok: boolean;
  correct?: boolean;
  phase: string;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  testResults: WorkspaceTestResult[];
  errorType: string | null;
  errorMessage: string;
  durationMs: number;
  verdictText?: string;
}

export async function runPython(exercise: ExerciseSummary, code: string): Promise<WorkspaceResult> {
  return pyodideRunner.run({
    code,
    tests: '',
    packages: exercise.packages || [],
    seed: exercise.deterministicSeed,
    timeoutMs: 60000,
  });
}

export async function checkPython(exercise: ExerciseSummary, code: string): Promise<WorkspaceResult> {
  const outcome = await graders.pyodide.grade({
    exerciseId: exercise.definitionId,
    deterministicSeed: exercise.deterministicSeed,
    parameters: { ...exercise.parameters, packages: exercise.packages || [] },
  }, code);
  if (learningLedger) {
    await learningLedger.record({
      activityId: exercise.definitionId,
      definitionId: exercise.definitionId,
      exerciseId: exercise.definitionId,
      activityVersion: exercise.version,
      competencyIds: exercise.competencyIds,
      seed: exercise.deterministicSeed,
      eventType: 'attempt',
      answer: code,
      durationMs: outcome.result.durationMs,
      correct: Boolean(outcome.correct),
      masteryEligible: exercise.masteryEligible,
      errorType: outcome.errorType || null,
    });
  }
  return { ...outcome.result, correct: Boolean(outcome.correct), verdictText: outcome.verdictText };
}

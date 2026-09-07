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

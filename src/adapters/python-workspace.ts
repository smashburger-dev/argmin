import { pyodideRunner } from '../../assets/js/runtime/pyodide_runner.js';

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

// Minimal shape the runner needs. Family instances carry packages and the
// deterministic seed under parameters/deterministicSeed — the ExerciseSummary
// catalog row (toFamilySummary) never does, so it must not be the input here.
export interface RunnableExercise {
  parameters?: Record<string, unknown> | null;
  deterministicSeed?: number;
}

/** Fire-and-forget worker warmup; failures stay silent because the submit
 *  path surfaces runtime errors on its own. */
export function warmPythonRuntime(): void {
  try {
    void pyodideRunner.ensureWorker().catch(() => {});
  } catch { /* worker construction unsupported — submit reports it */ }
}

export async function runPython(exercise: RunnableExercise, code: string): Promise<WorkspaceResult> {
  const packages = exercise.parameters?.packages;
  return pyodideRunner.run({
    code,
    tests: '',
    packages: Array.isArray(packages) ? packages : [],
    seed: exercise.deterministicSeed,
    timeoutMs: 60000,
  });
}

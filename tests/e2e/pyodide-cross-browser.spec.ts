import { expect, test } from '@playwright/test';

const TESTS = `
def __record(name, passed, detail=''):
    __results.append({'name': str(name), 'passed': bool(passed), 'detail': str(detail)})
__record('mean_ok', abs(mean([1.0, 2.0, 3.0]) - 2.0) < 1e-9)
__record('numpy_ok', abs(np_mean(np.array([2.0, 4.0])) - 3.0) < 1e-9)
`;

interface RunResult {
  ok: boolean;
  phase: string;
  errorType: string | null;
  errorMessage?: string | null;
  stdout: string;
  stderr?: string;
  stdoutTruncated?: boolean;
  testResults: Array<{ name: string; passed: boolean }>;
}

interface ProbeResults {
  numpyRun: RunResult;
  correct: RunResult;
  wrong: RunResult;
  timeout: RunResult;
  afterRestart: RunResult;
  leaky: RunResult;
  leakCheck: RunResult;
  truncation: RunResult;
  unsafeWorkdir: RunResult;
  unsafeFile: RunResult;
  firstMulti: RunResult;
  secondMulti: RunResult;
}

test('pyodide worker passes grading, restart and isolation contracts in every browser', async ({ page }) => {
  test.setTimeout(180000);

  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();

  const probes = await page.evaluate(async (TESTS: string): Promise<ProbeResults> => {
    const runnerUrl = '/assets/js/runtime/pyodide_runner.js';
    const { pyodideRunner } = (await import(runnerUrl)) as { pyodideRunner: {
      run: (payload: Record<string, unknown>) => Promise<RunResult>;
    } };
    const run = (payload: Record<string, unknown>) => pyodideRunner.run({ seed: 42, timeoutMs: 30000, ...payload });

    const numpyRun = await run({
      code: 'import numpy as np\nnp_mean = np.mean\nmean = lambda xs: sum(xs) / len(xs)\nprint("numpy", np.mean(np.array([2.0, 4.0])))',
      tests: '',
      packages: ['numpy'],
    });

    const correct = await run({
      code: 'import numpy as np\nnp_mean = np.mean\ndef mean(xs):\n    return sum(xs) / len(xs)',
      tests: TESTS,
      packages: ['numpy'],
    });

    const wrong = await run({
      code: 'import numpy as np\nnp_mean = np.mean\ndef mean(xs):\n    return 0.0',
      tests: TESTS,
      packages: ['numpy'],
    });

    const timeout = await run({
      code: 'while True:\n    pass',
      tests: '',
      packages: [],
      timeoutMs: 4000,
    });

    const afterRestart = await run({ code: 'print("restarted")', tests: '', packages: [] });
    const leaky = await run({ code: 'learner_global = 42', tests: '', packages: [] });
    const leakCheck = await run({ code: 'print(learner_global)', tests: '', packages: [] });
    const truncation = await run({ code: 'print("x" * 70000)', tests: '', packages: [] });
    const unsafeWorkdir = await run({ code: 'print("hi")', tests: '', packages: [], workdir: '../escape' });
    const unsafeFile = await run({ code: '', tests: '', packages: [], files: [{ path: '../escape.py', content: 'VALUE = 1' }], entrypoint: '../escape.py' });
    const firstMulti = await run({
      packages: [],
      files: [
        { path: 'main.py', content: 'import state_mod\nprint("first", state_mod.VALUE)' },
        { path: 'state_mod.py', content: 'VALUE = 1' },
      ],
      entrypoint: 'main.py',
    });
    const secondMulti = await run({
      packages: [],
      files: [
        { path: 'main.py', content: 'import state_mod\nprint("second", state_mod.VALUE)' },
        { path: 'state_mod.py', content: 'VALUE = 2' },
      ],
      entrypoint: 'main.py',
    });

    return { numpyRun, correct, wrong, timeout, afterRestart, leaky, leakCheck, truncation, unsafeWorkdir, unsafeFile, firstMulti, secondMulti };
  }, TESTS);

  expect(probes.numpyRun.ok, `numpy run: ${probes.numpyRun.errorType} ${probes.numpyRun.errorMessage}`).toBe(true);
  expect(probes.numpyRun.stdout).toContain('numpy 3.0');

  expect(probes.correct.ok, `correct run: ${probes.correct.errorType} ${probes.correct.errorMessage}`).toBe(true);
  expect(probes.correct.testResults.length).toBe(2);
  expect(probes.correct.testResults.every((t) => t.passed)).toBe(true);

  const wrongPassed = probes.wrong.testResults.filter((t) => t.passed);
  const wrongRejected = !probes.wrong.ok || wrongPassed.length < probes.wrong.testResults.length;
  expect(wrongRejected, `wrong solution not rejected: ${JSON.stringify(probes.wrong)}`).toBe(true);
  expect(probes.wrong.testResults.some((t) => t.name === 'mean_ok' && !t.passed)).toBe(true);

  expect(probes.timeout.phase, `timeout probe: ${JSON.stringify(probes.timeout)}`).toBe('timeout');
  expect(probes.timeout.errorType).toBe('Timeout');

  expect(probes.afterRestart.ok, `restart run: ${probes.afterRestart.errorType} ${probes.afterRestart.errorMessage}`).toBe(true);
  expect(probes.afterRestart.stdout.trim()).toBe('restarted');
  expect(probes.leaky.ok, `leaky run: ${probes.leaky.errorType} ${probes.leaky.errorMessage}`).toBe(true);
  expect(probes.leakCheck.ok).toBe(false);
  expect(probes.leakCheck.phase).toBe('code');
  expect(probes.leakCheck.stderr).toContain("NameError: name 'learner_global' is not defined");
  expect(probes.truncation.ok, `truncation run: ${probes.truncation.errorType} ${probes.truncation.errorMessage}`).toBe(true);
  expect(probes.truncation.stdout.length).toBe(64 * 1024);
  expect(probes.truncation.stdoutTruncated).toBe(true);
  expect(probes.unsafeWorkdir.ok).toBe(false);
  expect(probes.unsafeWorkdir.phase).toBe('setup');
  expect(probes.unsafeWorkdir.errorType).toBe('WorkdirError');
  expect(probes.unsafeFile.ok).toBe(false);
  expect(probes.unsafeFile.phase).toBe('setup');
  expect(probes.unsafeFile.errorType).toBe('WorkspaceError');
  expect(probes.firstMulti.ok, `first multi-file run: ${probes.firstMulti.errorType} ${probes.firstMulti.errorMessage}`).toBe(true);
  expect(probes.firstMulti.stdout.trim()).toBe('first 1');
  expect(probes.secondMulti.ok, `second multi run: ${probes.secondMulti.errorType} ${probes.secondMulti.errorMessage}`).toBe(true);
  expect(probes.secondMulti.stdout.trim()).toBe('second 2');
});

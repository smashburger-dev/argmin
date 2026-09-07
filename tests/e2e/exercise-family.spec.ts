import { expect, test } from '@playwright/test';

test('golden path 2: family placements instantiate two case types without a JSON copy', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Golden Path 2 runs in Chromium; the view is browser-independent Preact markup.');
  await page.goto('/index.html#/module/lm-git-basics');
  await expect(page.getByRole('heading', { level: 1, name: 'Git als überprüfbares Arbeitsprotokoll' })).toBeVisible();
  await expect(page.getByText('63 Min.')).toBeVisible();
  await expect(page.getByText('Einstieg · Kompetenzbeleg möglich')).toBeVisible();
  await expect(page.getByText('Kern · Kompetenzbeleg möglich').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: 'Konzeptfrage' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: 'Konzeptfrage' }).nth(1)).toBeVisible();
  await expect(page.getByRole('link', { name: /(?:Aufgabe|Variante) öffnen/ }).first()).toBeVisible();

  const probe = await page.evaluate(async () => {
    const familyUrl = '/assets/js/domain/' + 'exercise_registry.mjs';
    const { instantiate, grade } = await import(familyUrl) as {
      instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => {
        caseId: string;
        expectedAnswer: { correctChoice: string };
        choices: Array<{ id: string; correct: boolean }>;
        definitionId?: string;
      };
      grade: (instance: unknown, answer: string) => Promise<{ correct: boolean }>;
    };
    const unstaged = instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged');
    const staged = instantiate('classify-git-operation', 11, 'core', 'diff-staged');
    const unstagedWrong = unstaged.choices.find((choice) => choice.correct !== true)?.id;
    const stagedWrong = staged.choices.find((choice) => choice.correct !== true)?.id;
    return {
      unstagedCase: unstaged.caseId,
      stagedCase: staged.caseId,
      copied: unstaged.definitionId ?? staged.definitionId ?? null,
      unstagedRight: (await grade(unstaged, unstaged.expectedAnswer.correctChoice)).correct,
      unstagedWrong: (await grade(unstaged, String(unstagedWrong))).correct,
      stagedRight: (await grade(staged, staged.expectedAnswer.correctChoice)).correct,
      stagedWrong: (await grade(staged, String(stagedWrong))).correct,
    };
  });
  expect(probe.unstagedCase).toBe('diff-unstaged');
  expect(probe.stagedCase).toBe('diff-staged');
  expect(probe.copied).toBeNull();
  expect(probe.unstagedRight).toBe(true);
  expect(probe.unstagedWrong).toBe(false);
  expect(probe.stagedRight).toBe(true);
  expect(probe.stagedWrong).toBe(false);
});

test('S4D0 family variant opens, grades, records and journals across reload', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'S4D0 roundtrip runs in Chromium.');
  await page.goto('/index.html#/module/lm-git-basics');
  await page.locator('a[href="#/family/classify-git-operation/diff-unstaged/7/intro"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Welche Git-Operation passt jetzt?')).toBeVisible();
  const wrongId = await page.evaluate(async () => {
    const { instantiate } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { choices: Array<{ id: string; correct: boolean }> };
    };
    return instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged').choices.find((choice) => choice.correct !== true)?.id;
  });
  await page.getByRole('radio', { name: /.+/ }).first().waitFor();
  const options = await page.getByRole('radio').all();
  expect(options).toHaveLength(2);
  await page.locator(`input[type="radio"][value="${wrongId}"]`).check();
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByText(/Nicht richtig/)).toBeVisible();
  const stored = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    const attempts = await progress.allOf('attempts') as Array<{ exerciseId: string; instanceId: string; correct: boolean; definitionId: string }>;
    const journal = await progress.journal() as Array<{ exerciseId: string; errorType: string }>;
    return { attempt: attempts.at(-1), journal: journal.at(-1) };
  });
  expect(stored.attempt).toMatchObject({ exerciseId: 'classify-git-operation:diff-unstaged', correct: false });
  expect(stored.attempt?.instanceId).toMatch(/^classify-git-operation:diff-unstaged:.+:7$/);
  expect(stored.journal).toMatchObject({ exerciseId: 'classify-git-operation:diff-unstaged', errorType: 'wrong-choice' });

  await page.getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  const journalSection = page.locator('.activity-section').filter({ hasText: 'Fehlerjournal' });
  await expect(journalSection.getByText('classify-git-operation:diff-unstaged · wrong-choice')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  await expect(page.locator('.activity-section').filter({ hasText: 'Fehlerjournal' }).getByText('classify-git-operation:diff-unstaged · wrong-choice')).toBeVisible();
});

test('S4D1 trace table fills row by row and records the first deviating row', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'S4D1 trace table runs in Chromium.');
  await page.goto('/index.html#/family/trace-assignment-state/reassign-two-variables-print/7/core');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  const states = await page.evaluate(async () => {
    const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { traceTable: { expectedStates: Array<Record<string, string>> } } };
    };
    return EXERCISE_FAMILIES.instantiate('trace-assignment-state', 7, 'core', 'reassign-two-variables-print').traceTable.expectedStates;
  });
  for (const [row, state] of states.entries()) {
    for (const [name, value] of Object.entries(state)) {
      if (value !== '') await page.getByRole('textbox', { name: `Zeile ${row + 1}, ${name}` }).fill(value);
    }
  }
  await page.getByRole('textbox', { name: 'Zeile 2, b' }).fill('9999');
  await page.getByRole('button', { name: 'Tabelle prüfen' }).click();
  await expect(page.getByText(/Zeile 2 stimmt noch nicht/)).toBeVisible();
  const stored = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    const attempts = await progress.allOf('attempts') as Array<{ exerciseId: string; correct: boolean; errorType: string }>;
    return attempts.at(-1);
  });
  expect(stored).toMatchObject({ exerciseId: 'trace-assignment-state:reassign-two-variables-print', correct: false, errorType: 'trace-row-2' });
});

test('S4D2 foundations module links lessons, curated variants and practice spaces', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'S4D2 module roundtrip runs in Chromium.');
  await page.goto('/index.html#/module/lm-foundations-python-state');
  await expect(page.getByRole('heading', { level: 1, name: 'Python-Zustand lesen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Lektionen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aufgaben' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Frei üben' })).toBeVisible();
  await page.getByRole('link', { name: 'Üben' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/index.html#/family/trace-assignment-state/reassign-two-variables-print/7/intro');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('S4D7 code family runs pyodide tests in the browser', async ({ page, browserName }) => {
  test.setTimeout(150000);
  test.skip(browserName !== 'chromium', 'S4D7 code roundtrip runs in Chromium.');
  await page.goto('/index.html#/family/construct-matvec-shape-contract/matvec-code-reference/7/core');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const reference = await page.evaluate(async () => {
    const response = await fetch('/content/families/construct-matvec-shape-contract.json');
    const family = await response.json() as {
      cases: Array<{ caseId: string; expected?: { referenceSolver?: string } }>;
    };
    return family.cases.find((item) => item.caseId === 'matvec-code-reference')?.expected?.referenceSolver;
  });
  if (!reference) throw new Error('Referenzsolver für matvec-code-reference fehlt');
  const editor = page.getByRole('textbox', { name: 'Python-Codeeditor' });
  await expect(editor).toBeVisible();
  await editor.fill(reference);
  await page.getByRole('button', { name: 'Antwort prüfen' }).click({ timeout: 20000 });
  await expect(page.getByText(/Alle Tests bestanden/)).toBeVisible({ timeout: 120000 });
});

test('S4D2 numeric family grades typed answers and opens domain hints', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'S4D2 numeric roundtrip runs in Chromium.');
  await page.goto('/index.html#/family/transform-linear-equation-isolate/two-step-seeded-retrieval/5/intro');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const expected = await page.evaluate(async () => {
    const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { expectedAnswer: { value: number } } };
    };
    return EXERCISE_FAMILIES.instantiate('transform-linear-equation-isolate', 5, 'intro', 'two-step-seeded-retrieval').expectedAnswer.value;
  });
  await page.getByRole('button', { name: 'Hinweis 1/2' }).click();
  await expect(page.locator('.hint-stack').getByText('Gleichung', { exact: false })).toBeVisible();
  await page.getByLabel('Antwort als ganze Zahl').fill(String(expected));
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByText(/Richtig/)).toBeVisible();
  await expect(page.getByText('Kann als Kompetenzbeleg zählen.')).toBeVisible();
});

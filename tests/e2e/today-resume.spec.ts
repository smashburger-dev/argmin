import { expect, test } from '@playwright/test';

test('today shows a resume link after an attempt', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Resume link runs in Chromium.');
  await page.goto('/index.html#/family/classify-git-operation/diff-unstaged/7/intro');
  await expect(page.getByText('Welche Git-Operation passt jetzt?')).toBeVisible();
  await page.getByRole('radio', { name: /.+/ }).first().waitFor();
  const wrongId = await page.evaluate(async () => {
    const { instantiate } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { choices: Array<{ id: string; correct: boolean }> };
    };
    return instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged').choices.find((choice) => choice.correct !== true)?.id;
  });
  await page.locator(`input[type="radio"][value="${wrongId}"]`).check();
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByText(/Nicht richtig/)).toBeVisible();
  await page.goto('/index.html#/today');
  const resume = page.getByRole('link', { name: /Weitermachen:/ });
  await expect(resume).toBeVisible();
  await expect(resume).toHaveAttribute('href', /^#\/family\//);
});

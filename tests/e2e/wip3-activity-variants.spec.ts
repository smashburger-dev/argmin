import { expect, test, type Page } from '@playwright/test';

type FamilyProbe = {
  prompt: string;
  output?: string;
  variables?: Array<{ name: string; value: number | string }>;
  solution?: number[];
  solutionOrder?: string[];
  distractors?: string[];
};

async function openFamily(page: Page, familyId: string, caseId: string, seed: number, difficulty: string) {
  await page.goto(`/index.html#/family/${familyId}/${caseId}/${seed}/${difficulty}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Variante wird geladen' })).toHaveCount(0);
}

async function probeFamily(
  page: Page,
  familyId: string,
  seed: number,
  difficulty: string,
  caseId: string,
): Promise<FamilyProbe> {
  return page.evaluate(async ({ familyId, seed, difficulty, caseId }) => {
    const { instantiate } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => {
        prompt: string;
        expectedAnswer?: { output?: string; solution?: number[]; solutionOrder?: string[]; distractors?: string[] };
        parameters?: { variables?: Array<{ name: string; value: number | string }> };
      };
    };
    const instance = instantiate(familyId, seed, difficulty, caseId);
    return {
      prompt: instance.prompt,
      output: instance.expectedAnswer?.output,
      variables: instance.parameters?.variables,
      solution: instance.expectedAnswer?.solution,
      solutionOrder: instance.expectedAnswer?.solutionOrder,
      distractors: instance.expectedAnswer?.distractors,
    };
  }, { familyId, seed, difficulty, caseId });
}

async function parsonsOrder(page: Page) {
  return page.getByRole('button', { name: /nach oben$/ }).evaluateAll((buttons) => (
    buttons.map((button) => String(button.getAttribute('aria-label') || '').replace(/ nach oben$/, ''))
  ));
}

async function arrangeParsons(page: Page, solutionOrder: string[], distractors: string[]) {
  for (const id of distractors) {
    const row = page.getByRole('button', { name: `${id} nach oben` }).locator('xpath=ancestor::li');
    await row.getByRole('button', { name: 'Aussortieren' }).click();
  }
  for (let target = 0; target < solutionOrder.length; target += 1) {
    const want = solutionOrder[target];
    if (!want) continue;
    let index = (await parsonsOrder(page)).indexOf(want);
    while (index > target) {
      await page.getByRole('button', { name: `${want} nach oben` }).click();
      index -= 1;
    }
  }
}

test('WIP-3 code-trace variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  const familyId = 'trace-assignment-state';
  const caseId = 'tree-majority-vote-trace';
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, familyId, caseId, seed, 'core');
    const probe = await probeFamily(page, familyId, seed, 'core', caseId);
    prompts.push(probe.prompt);
    for (const variable of probe.variables || []) {
      await page.locator('label').filter({ hasText: variable.name }).locator('input').fill(String(variable.value));
    }
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

test('WIP-3 predict-output variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  const familyId = 'trace-chunk-window-loop';
  const caseId = 'chunk-window-loop';
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, familyId, caseId, seed, 'core');
    const probe = await probeFamily(page, familyId, seed, 'core', caseId);
    prompts.push(probe.prompt);
    await page.getByLabel('Erwartete Ausgabe').fill(String(probe.output ?? ''));
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

test('WIP-3 parsons variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  const familyId = 'construct-matvec-shape-contract';
  const caseId = 'matvec-contract-order';
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, familyId, caseId, seed, 'intro');
    const probe = await probeFamily(page, familyId, seed, 'intro', caseId);
    prompts.push(probe.prompt);
    await arrangeParsons(page, probe.solutionOrder || [], probe.distractors || []);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

test('WIP-3 vector variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  const familyId = 'formula-scalar-product';
  const caseId = 'column-vector-authored';
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, familyId, caseId, seed, 'core');
    const probe = await probeFamily(page, familyId, seed, 'core', caseId);
    prompts.push(probe.prompt);
    const [x, y] = probe.solution || [];
    await page.getByLabel('Lösungspaar').fill(`(${x}, ${y})`);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

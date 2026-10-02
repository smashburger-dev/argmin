import { expect, test, type Page } from '@playwright/test';

async function openFamily(page: Page, familyId: string, caseId: string, seed: number, difficulty: string) {
  await page.goto(`/index.html#/family/${familyId}/${caseId}/${seed}/${difficulty}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Variante wird geladen' })).toHaveCount(0);
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

async function expectPrompt(page: Page, prompt: string) {
  const marker = prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
  await expect(page.locator('.prompt-content')).toContainText(marker);
}

test('WIP-3 code-trace variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  // Prozedurale Familie: Instanz kommt aus der Registry, nicht aus JSON-Varianten.
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, 'trace-assignment-state', 'tree-majority-vote-trace', seed, 'core');
    const inst = await page.evaluate(async (s) => {
      const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
        EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { prompt: string; parameters: { variables: Array<{ name: string; value: number | string }> } } };
      };
      const i = EXERCISE_FAMILIES.instantiate('trace-assignment-state', s, 'core', 'tree-majority-vote-trace');
      return { prompt: i.prompt, variables: i.parameters.variables };
    }, seed);
    prompts.push(inst.prompt);
    await expectPrompt(page, inst.prompt);
    for (const variable of inst.variables) {
      await page.locator('label').filter({ hasText: variable.name }).locator('input').fill(String(variable.value));
    }
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

test('WIP-3 predict-output variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  // Prozedurale Familie: Instanz kommt aus der Registry, nicht aus JSON-Varianten.
  const instances: Array<{ prompt: string; output: string }> = [];
  for (const seed of [0, 1]) {
    await openFamily(page, 'trace-chunk-window-loop', 'chunk-window-loop', seed, 'core');
    const inst = await page.evaluate(async (s) => {
      const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
        EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { prompt: string; expectedAnswer: { output: string } } };
      };
      const i = EXERCISE_FAMILIES.instantiate('trace-chunk-window-loop', s, 'core', 'chunk-window-loop');
      return { prompt: i.prompt, output: i.expectedAnswer.output };
    }, seed);
    instances.push(inst);
    await expectPrompt(page, inst.prompt);
    await page.getByLabel('Erwartete Ausgabe').fill(inst.output);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(instances.at(0)?.output).not.toEqual(instances.at(-1)?.output);
});

test('WIP-3 parsons variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  // Prozedurale Familie: Instanz kommt aus der Registry, nicht aus JSON-Varianten.
  const orders: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, 'construct-matvec-shape-contract', 'matvec-contract-order', seed, 'intro');
    const inst = await page.evaluate(async (s) => {
      const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
        EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { prompt: string; expectedAnswer: { solutionOrder: string[]; distractors: string[] }; parameters?: { initialOrder?: string[] } } };
      };
      const i = EXERCISE_FAMILIES.instantiate('construct-matvec-shape-contract', s, 'intro', 'matvec-contract-order');
      return { prompt: i.prompt, solutionOrder: i.expectedAnswer.solutionOrder, distractors: i.expectedAnswer.distractors, initialOrder: i.parameters?.initialOrder };
    }, seed);
    orders.push(JSON.stringify(inst.initialOrder));
    await expectPrompt(page, inst.prompt);
    await arrangeParsons(page, inst.solutionOrder, inst.distractors);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(orders[0]).not.toEqual(orders[1]);
});

test('WIP-3 vector variants grade two seeds', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WIP-3 activity variants run in Chromium.');
  // Instanz kommt aus der Registry (seeded variants heute, Generator
  // sobald der Fall prozeduralisiert ist).
  const prompts: string[] = [];
  for (const seed of [0, 1]) {
    await openFamily(page, 'formula-scalar-product', 'column-vector-authored', seed, 'core');
    const inst = await page.evaluate(async (s) => {
      const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
        EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { prompt: string; expectedAnswer: { solution: number[] } } };
      };
      const i = EXERCISE_FAMILIES.instantiate('formula-scalar-product', s, 'core', 'column-vector-authored');
      return { prompt: i.prompt, solution: i.expectedAnswer.solution };
    }, seed);
    prompts.push(inst.prompt);
    await expectPrompt(page, inst.prompt);
    const [x, y] = inst.solution;
    await page.getByLabel('Lösungspaar').fill(`(${x}, ${y})`);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
  expect(prompts[0]).not.toEqual(prompts[1]);
});

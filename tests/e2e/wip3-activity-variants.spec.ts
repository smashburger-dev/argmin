import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type FamilyCase = {
  prompt: string;
  parameters?: {
    variables?: Array<{ name: string; value: number | string }>;
    initialOrder?: string[];
  };
  expected?: {
    output?: string;
    solution?: number[];
    solutionOrder?: string[];
    distractors?: string[];
  };
  variants?: Array<Partial<FamilyCase>>;
};

function loadCase(file: string, caseId: string): FamilyCase {
  const document = JSON.parse(readFileSync(join(process.cwd(), 'content/families', file), 'utf8')) as {
    cases: Array<FamilyCase & { caseId: string }>;
  };
  const body = document.cases.find((item) => item.caseId === caseId);
  if (!body) throw new Error(`${file}:${caseId} fehlt`);
  return body;
}

function variantOf(body: FamilyCase, seed: number): FamilyCase {
  const all = [body, ...(body.variants || [])];
  const variant = all[Math.abs(seed) % all.length] || body;
  return {
    prompt: variant.prompt ?? body.prompt,
    parameters: { ...(body.parameters || {}), ...(variant.parameters || {}) },
    expected: { ...(body.expected || {}), ...(variant.expected || {}) },
  };
}

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
  const body = loadCase('trace-assignment-state.json', 'tree-majority-vote-trace');
  expect(variantOf(body, 0).prompt).not.toEqual(variantOf(body, 1).prompt);
  for (const seed of [0, 1]) {
    const chosen = variantOf(body, seed);
    await openFamily(page, 'trace-assignment-state', 'tree-majority-vote-trace', seed, 'core');
    await expectPrompt(page, chosen.prompt);
    for (const variable of chosen.parameters?.variables || []) {
      await page.locator('label').filter({ hasText: variable.name }).locator('input').fill(String(variable.value));
    }
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
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
  expect(instances[0].output).not.toEqual(instances[1].output);
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
  const body = loadCase('formula-scalar-product.json', 'column-vector-authored');
  expect(variantOf(body, 0).prompt).not.toEqual(variantOf(body, 1).prompt);
  for (const seed of [0, 1]) {
    const chosen = variantOf(body, seed);
    await openFamily(page, 'formula-scalar-product', 'column-vector-authored', seed, 'core');
    await expectPrompt(page, chosen.prompt);
    const [x, y] = chosen.expected?.solution || [];
    await page.getByLabel('Lösungspaar').fill(`(${x}, ${y})`);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await expect(page.getByText(/Richtig/)).toBeVisible();
  }
});

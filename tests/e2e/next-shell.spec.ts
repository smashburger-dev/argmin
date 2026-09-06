import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Growth-counter rule: the public source count derives from sources.json.
const allSources = JSON.parse(readFileSync(join(process.cwd(), 'content/sources.json'), 'utf8')).sources;
const expectedPublicSources = allSources.filter((source: { contentClass: string }) => ['open', 'generated', 'link-only'].includes(source.contentClass)).length;
import { expect, test, type Page } from '@playwright/test';

test('roadmap view is the Preact projection', async ({ page }) => {
  await page.goto('/index.html#/roadmap');
  await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
  await expect(page.locator('#rm-title')).toHaveCount(0);
});

test('next shell exposes the primary learning flow without serious accessibility violations', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dein Wochenplan' })).toBeVisible();
  await expect(page.getByText(/konfigurierbare Produktheuristiken/)).toBeVisible();
  const planLinks = page.locator('.plan-day li a');
  expect(await planLinks.count()).toBeGreaterThan(0);
  const planHrefs = await planLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(new Set(planHrefs).size).toBe(planHrefs.length);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Lernen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lernen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Algebra-Grundlagen' })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Kompetenzen suchen' });
  await search.fill('NumPy');
  await expect(page.locator('.competency-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3, name: 'NumPy-Grundlagen und Shapes' })).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: 'Applied AI Engineering' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Python-Grundlagen' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  expect(errors).toEqual([]);
});

test('competency and diagnostic routes expose prerequisites and real activities', async ({ page }) => {
  await page.goto('/index.html#/competency/c-algebra-basics');
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra-Grundlagen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aufgaben' })).toBeVisible();
  const firstActivity = page.getByRole('link', { name: 'Aufgabe öffnen' }).first();
  await expect(firstActivity).toBeVisible();
  await expect(firstActivity).not.toHaveAttribute('href', /index\.html/);
  await page.locator('a[href="#/lesson/l-foundations-algebra"]').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra-Grundlagen sicher prüfen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Durchgerechnetes Beispiel' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Weiterlesen und prüfen' })).toBeVisible();
  await expect(page.locator('.lesson-sources a')).toHaveCount(2);
  const lessonAccessibility = await new AxeBuilder({ page }).analyze();
  expect(lessonAccessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  await page.goto('/index.html#/diagnostic');
  await expect(page.getByRole('heading', { level: 1, name: 'Diagnose' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ersten Algebra-Anker ausführen' })).toBeVisible();
});

test('quality view exposes all specialist, methodology and critical findings', async ({ page }) => {
  await page.goto('/index.html#/quality');
  await expect(page.getByRole('heading', { level: 1, name: 'Reviews' })).toBeVisible();
  await expect(page.locator('.review-finding-card')).toHaveCount(14);
  const methodology = page.locator('.review-finding-card').filter({ hasText: 'Methodik und Lernforschung' });
  await methodology.locator('summary').click();
  await expect(methodology.getByText(/Schwellen versionieren/)).toBeVisible();
  const critical = page.locator('.review-finding-card').filter({ hasText: 'Kritischer Gesamtprogramm-Review' });
  await critical.locator('summary').click();
  await expect(critical.getByText(/39 von 39 Roadmap-Wochen detailliert/)).toBeVisible();
});

test('tool catalog exposes the migrated JSXGraph visualization', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/index.html#/tools');
  await expect(page.getByRole('heading', { level: 1, name: 'Werkzeuge' })).toBeVisible();
  await expect(page.locator('.tool-card')).toHaveCount(7);
  await page.getByRole('link', { name: 'Visualisierung öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Spaltenbild von A·x' })).toBeVisible();
  await expect(page.locator('#w05-column-board svg')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('spinbutton', { name: 'x₂' }).fill('1');
  await expect(page.locator('.visualization-controls output')).toHaveText('(3.0, 4.0)');
  expect(errors).toEqual([]);
});

test('public source cards and the full roadmap projection are native views', async ({ page }) => {
  await page.goto('/index.html#/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible();
  await expect(page.locator('.source-card')).toHaveCount(expectedPublicSources);
  await expect(page.locator('body')).not.toContainText('mml-book');

  await page.goto('/index.html#/roadmap');
  await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
  await expect(page.locator('.roadmap-card')).toHaveCount(39);
  await expect(page.getByRole('link', { name: 'Woche ansehen' })).toHaveCount(0);
});

test('linear-systems lesson and generated column task form a native learning path', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-linalg-systems');
  await expect(page.getByRole('heading', { level: 1, name: 'Gleichungssysteme als Spaltenbild lesen' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Welche Koeffizienten/ })).toBeVisible();
  await expect(page.locator('.lesson-sources a')).toHaveCount(2);

  await page.goto('/index.html#/family/formula-scalar-product/column-vector-authored/0/core');
  await page.getByRole('textbox', { name: 'Lösungspaar' }).fill('(7, 1)');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
  const before = await page.locator('.lede').innerText();
  await expect(page.locator('.lede')).toHaveText(before);
});

test('legacy numeric, vector, algebraic, rationale and worked-example tasks stay in the next UI', async ({ page }) => {
  await page.goto('/index.html#/exercise/w01-e8');
  await expect(page.getByRole('textbox', { name: 'Antwort als ganze Zahl' })).toBeVisible();

  await page.goto('/index.html#/exercise/w05-e6');
  await expect(page.getByRole('textbox', { name: 'Lösungspaar' })).toBeVisible();

  await page.goto('/index.html#/exercise/w01-e2');
  await expect(page.getByLabel('Mathematischer Term')).toBeVisible();

  await page.goto('/index.html#/exercise/w01-e11');
  await expect(page.getByRole('textbox', { name: /Deine Begründung/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /Selbsteinschätzung/ })).toBeVisible();

  await page.goto('/index.html#/exercise/w01-e7');
  await expect(page.getByRole('button', { name: 'Beispiel studieren' })).toBeVisible();
});

test('diagnostic tutor renders examples, counterexamples, sources and follow-up activities', async ({ page }) => {
  await page.goto('/index.html#/exercise/f-control-parsons-01');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.locator('.tutor-example')).toHaveCount(2);
  await expect(page.getByText(/return im Schleifenkörper/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Quelle: The Python Tutorial/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Danach: Positive Werte filtern/ })).toBeVisible();
});

test('legacy seeded activity creates a fresh native variant', async ({ page }) => {
  await page.goto('/index.html#/exercise/w01-e8');
  const prompt = page.locator('.view-header .lede');
  const seedLabel = page.locator('.view-header .eyebrow');
  const beforePrompt = await prompt.innerText();
  const beforeSeed = await seedLabel.innerText();
  await page.getByRole('button', { name: 'Neue Variante starten' }).click();
  await expect(prompt).not.toHaveText(beforePrompt);
  await expect(seedLabel).not.toHaveText(beforeSeed);
  await expect(page.getByRole('textbox', { name: 'Antwort als ganze Zahl' })).toHaveValue('');
  const seed = Number((await seedLabel.innerText()).match(/Seed (\d+)/i)?.[1]);
  const expected = await page.evaluate(async (currentSeed) => {
    const { genLinearEquation } = await import('/assets/js/core/' + 'w01_generators.mjs') as { genLinearEquation: (seed: number) => { expected: number } };
    return genLinearEquation(currentSeed).expected;
  }, seed);
  await page.getByRole('textbox', { name: 'Antwort als ganze Zahl' }).fill(String(expected));
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
  const storedSeed = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    return (await progress.attemptsFor('w01-e8')).at(-1)?.seed;
  });
  expect(storedSeed).toBe(seed);
});

test('migrated legacy graders work in the next UI', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto('/index.html#/exercise/w01-e1');
  await page.getByRole('textbox', { name: 'Antwort als ganze Zahl' }).fill('7');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
  await expect(page.locator('.mastery-note')).toContainText('nicht als Mastery-Nachweis');
  const diagnoseEvent = await page.evaluate(async () => {
    const moduleUrl = '/assets/js/core/' + 'progress_store.js';
    const { progress } = await import(moduleUrl);
    const [attempts, queue] = await Promise.all([progress.attemptsFor('w01-e1'), progress.reviewQueueAll()]);
    return { attempt: attempts.at(-1), queueIds: queue.map((entry: { exerciseId: string }) => entry.exerciseId) };
  });
  expect(diagnoseEvent.attempt).toMatchObject({ exerciseId: 'w01-e1', correct: true, masteryEligible: false, evidenceEligible: false });
  expect(diagnoseEvent.queueIds).not.toContain('w01-e1');

  await page.goto('/index.html#/exercise/w05-e6');
  await page.getByRole('textbox', { name: 'Lösungspaar' }).fill('(1, 3)');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
  await expect(page.locator('.mastery-note')).toContainText('gültig bis');

  await page.goto('/index.html#/exercise/w01-e2');
  await page.getByLabel('Mathematischer Term').fill('2x+7');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Exakt äquivalent/ })).toBeVisible({ timeout: 120_000 });

  await page.goto('/index.html#/family/transform-expression-simplify-canonical/distribute-sign-constant-chain/0/challenge');
  await page.getByLabel('Mathematischer Term').fill('x-32');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Exakt äquivalent/ })).toBeVisible({ timeout: 120_000 });

  await page.goto('/index.html#/exercise/w01-e11');
  await page.getByRole('textbox', { name: /Deine Begründung/ }).fill('Meine beiden schwächsten Bereiche sind Logarithmen und Variablenzustände. Bei der Logarithmusaufgabe habe ich die Basis mit dem Exponenten verwechselt, weil ich die Umkehrung zur Potenz nicht notiert hatte. Beim Code-Trace habe ich einen alten Variablenwert weiterverwendet, weil ich die Zuweisungen nicht zeilenweise protokolliert habe. Nächste Woche löse ich zusätzliche frische Aufgaben und führe für jeden Schritt eine kurze Gegenprobe durch.');
  const rubric = page.getByRole('group', { name: /Selbsteinschätzung/ });
  const checks = rubric.getByRole('checkbox');
  for (let index = 0; index < await checks.count() - 1; index += 1) await checks.nth(index).check();
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Selbsteinschätzung/ })).toBeVisible();
});

test('canonical Foundations exercise grades, records and starts a clean cycle', async ({ page }) => {
  await page.goto('/index.html#/exercise/f-collections-choice-01');
  await expect(page.getByRole('heading', { level: 1, name: 'Passende Struktur für Duplikate' })).toBeVisible();
  await page.getByRole('radio', { name: /Ein Set/ }).check();
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Richtig/ })).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('keinen Kompetenznachweis');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Lösung dieser Instanz anzeigen' }).click();
  await expect(page.getByText(/Diese Instanz zählt nicht mehr/)).toBeVisible();
  await page.getByRole('button', { name: 'Neuen sauberen Versuch starten' }).click();
  await expect(page.getByRole('radio', { name: /Ein Set/ })).not.toBeChecked();
  await expect(page.getByText(/Prüfe zuerst eine eigene Antwort/)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('collection step trace grades repr states, draws a fresh variant and stays keyboard-first', async ({ page }) => {
  await page.goto('/index.html#/exercise/f-collection-step-trace-01');
  await expect(page.getByRole('heading', { name: 'Collections-Zustände Schritt für Schritt' })).toBeVisible();
  // repr-typed legend replaces the integer-only wording
  await expect(page.getByText(/Python-Schreibweise/).first()).toBeVisible();
  const snippet = page.getByLabel('Programmcode');
  await expect(snippet).toContainText('y = x.copy()');

  // correct default instance (deterministic seed 3601): aliasing/copy states
  const states: Array<[string, string]> = [
    ['x_nach_1', '[6, 2]'],
    ['x_nach_2', '[6, 2]'],
    ['x_nach_3', '[6, 2]'],
    ['x_nach_4', '[-9, 2]'],
    ['y_ende', '[6, 2, -7]'],
  ];
  for (const [name, value] of states) {
    await page.getByRole('textbox', { name }).fill(value);
  }
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();

  // a wrong state names the variable and guides step-wise
  await page.getByRole('button', { name: 'Neue Variante starten' }).click();
  await expect(page.getByText(/Prüfe zuerst eine eigene Antwort/)).toBeVisible();
  // the rerolled instance must render a (deterministic) different family
  const firstInput = page.getByRole('textbox', { name: /_nach_1|y_ende/ }).first();
  await expect(firstInput).toBeVisible();
  await firstInput.fill('[999]');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  // one wrong state among empty ones: wrong-value or the repr invalid-input
  // verdict for the empties — either way the instance is not accepted
  await expect(page.getByRole('heading', { name: /Nicht richtig|leer oder unlesbar/ })).toBeVisible();

  // repr inputs carry no numeric inputmode (free-form Python literals)
  const inputMode = await page.getByRole('textbox', { name: /_nach_1|y_ende/ }).first().getAttribute('inputmode');
  expect(inputMode).toBeNull();
});

test('local project page exposes starter files and validates a self-report', async ({ page }) => {
  await page.goto('/index.html#/project/p-foundations-data-checker');
  await expect(page.getByRole('heading', { level: 1, name: 'CLI-Datenprüfer' })).toBeVisible();
  await expect(page.locator('.download-list a')).toHaveCount(4);
  await expect(page.getByText('Report auswählen')).toBeVisible();
  const report = {
    schemaVersion: 1,
    reportId: 'report-e2e',
    projectId: 'p-foundations-data-checker',
    projectVersion: '2',
    runner: 'python-pytest',
    runAt: '2026-08-29T12:00:00.000Z',
    command: ['python', '-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests'],
    status: 'passed', exitCode: 0, durationMs: 50, stdout: '5 passed', stderr: '',
    stdoutTruncated: false, stderrTruncated: false,
    files: [
      { path: 'src/checker.py', present: true, sha256: 'a'.repeat(64) },
      { path: 'tests/test_checker.py', present: true, sha256: 'afd0b2fefb1b15862e27e80c6bb398bb23179ddc243126465fae687fe97d6aa3' },
    ],
  };
  await page.locator('#report-file').setInputFiles({ name: 'report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await expect(page.getByText('Report strukturell gültig')).toBeVisible();
  await expect(page.getByText(/Kein automatischer Mastery-Nachweis/)).toBeVisible();
  const projectEvent = await page.evaluate(async () => {
    const moduleUrl = '/assets/js/core/' + 'progress_store.js';
    const { progress } = await import(moduleUrl);
    const attempts = await progress.attemptsFor('p-foundations-data-checker');
    return attempts.at(-1);
  });
  expect(projectEvent).toMatchObject({ eventType: 'project-report', correct: true, masteryEligible: false, evidenceEligible: false });
});

test('learning preferences persist locally and update the today view', async ({ page }) => {
  await page.goto('/index.html#/settings');
  await page.getByRole('spinbutton', { name: 'Wochenbudget in Minuten' }).fill('240');
  await page.getByRole('combobox', { name: 'Primärer Lernpfad' }).selectOption('mathematical-foundations');
  await page.getByRole('textbox', { name: 'Reviewabstände in Wochen' }).fill('1, 4, 8');
  await expect(page.getByRole('spinbutton', { name: 'Wochenbudget in Minuten' })).toHaveValue('240');
  await expect(page.getByRole('combobox', { name: 'Primärer Lernpfad' })).toHaveValue('mathematical-foundations');
  await expect(page.getByRole('textbox', { name: 'Reviewabstände in Wochen' })).toHaveValue('1, 4, 8');
  await page.getByRole('button', { name: 'Lokal speichern' }).click();
  await expect(page.getByRole('status')).toHaveText('Lokal gespeichert.');
  const storedPreferences = await page.evaluate(async () => {
    const moduleUrl = '/assets/js/core/' + 'progress_store.js';
    const { progress } = await import(moduleUrl);
    return Promise.all([progress.getSetting('weeklyMinutes'), progress.getSetting('reviewParams')]);
  });
  expect(storedPreferences).toEqual([240, { expandingSlotsWeeks: [1, 4, 8] }]);
  await page.getByRole('link', { name: 'Heute', exact: true }).click();
  await expect(page.locator('.budget-number')).toContainText('240');
  await page.getByRole('link', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Wochenbudget in Minuten' })).toHaveValue('240');
  await expect(page.getByRole('combobox', { name: 'Primärer Lernpfad' })).toHaveValue('mathematical-foundations');
  await expect(page.getByRole('textbox', { name: 'Reviewabstände in Wochen' })).toHaveValue('1, 4, 8');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON exportieren' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('ki-lernplattform-fortschritt.json');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('#progress-import').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('status')).toHaveText('Die Datei enthält kein gültiges JSON.');
});

test('linear algebra final boss runs its authored Pyodide test contract', async ({ page, browserName }) => {
  test.setTimeout(150000);
  test.skip(browserName !== 'chromium', 'The Pyodide contract smoke runs in Chromium.');
  await page.goto('/index.html#/family/construct-matvec-shape-contract/final-boss-authored/0/challenge');
  const editor = page.getByRole('textbox', { name: 'Python-Codeeditor' });
  await expect(editor).toBeVisible();
  await editor.fill(`import numpy as np


def shape_safe_matmul(A, B):
    A = np.asarray(A)
    B = np.asarray(B)
    if A.ndim != 2 or B.ndim != 2 or A.shape[1] != B.shape[0]:
        raise ValueError("inkompatible Shapes")
    return A @ B


def gauss_rank(A):
    M = np.asarray(A, dtype=float).copy()
    row = 0
    for col in range(M.shape[1]):
        pivots = np.flatnonzero(np.abs(M[row:, col]) > 1e-10)
        if not len(pivots):
            continue
        pivot = row + pivots[0]
        M[[row, pivot]] = M[[pivot, row]]
        M[row] /= M[row, col]
        for lower in range(row + 1, M.shape[0]):
            M[lower] -= M[lower, col] * M[row]
        row += 1
        if row == M.shape[0]:
            break
    return row


def solve_system(A, b):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if A.ndim != 2 or A.shape[0] != A.shape[1] or b.shape != (A.shape[0],):
        raise ValueError("inkompatible Shapes")
    return np.linalg.solve(A, b)`);
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: 'Alle Tests bestanden.' })).toBeVisible({ timeout: 120000 });
  await page.goto('/index.html#/lab/f-control-code-repair-01');
  const repairEditor = page.getByRole('textbox', { name: 'Python-Codeeditor' });
  await expect(repairEditor).toBeVisible();
  await repairEditor.fill('def positive_values(values):\n    result = []\n    for value in values:\n        if value > 0:\n            result.append(value)\n    return result\n');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.locator('.verdict')).toHaveText('Alle Tests bestanden.', { timeout: 120000 });
  await expect(page.locator('.test-results li')).toHaveCount(4);
});

test('code workspace lazily loads CodeMirror and runs Python in Chromium', async ({ page, browserName }) => {
  test.setTimeout(150000);
  test.skip(browserName !== 'chromium', 'Pyodide runtime smoke runs once; protocol tests cover browser-independent logic.');
  await page.goto('/index.html#/lab/w05-e8');
  const editor = page.getByRole('textbox', { name: 'Python-Codeeditor' });
  await expect(editor).toBeVisible();
  await editor.press('Tab');
  await expect(page.getByRole('button', { name: 'Code ausführen' })).toBeFocused();
  await editor.fill('print("workspace-ready")');
  await page.getByRole('button', { name: 'Code ausführen' }).click();
  await expect(page.locator('.output-content pre')).toContainText('workspace-ready', { timeout: 120000 });
  await expect(page.locator('.verdict')).toHaveText('Code lief fehlerfrei.', { timeout: 120000 });
});

test('next shell reflows at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});

test('route content loads lazily and a failed content chunk shows a visible error', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-foundations-algebra');
  await expect(page.locator('.lesson-block').first()).toBeVisible();
  const gitChoiceChunk = page.waitForRequest((request) => /git-choice/i.test(request.url()) && !/\.html$/.test(request.url()));
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await page.goto('/index.html#/exercise/f-git-choice-01');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gitChoiceChunk;

  // Fail the next lesson chunk on the network level: the error state must be
  // visible and testable, not a silent blank screen.
  await page.route(/l-foundations-git/, async (route) => { await route.abort('failed'); });
  await page.goto('/index.html#/lesson/l-foundations-git');
  await expect(page.getByRole('alert')).toContainText('konnte nicht geladen werden');
});

test('next shell loads exclusively from its own origin', async ({ page }) => {
  const external: string[] = [];
  let expectedOrigin = '';
  page.on('request', (request) => {
    if (request.resourceType() === 'document') return;
    if (!expectedOrigin) expectedOrigin = new URL(request.url()).origin;
    if (new URL(request.url()).origin !== expectedOrigin) external.push(request.url());
  });
  await page.goto('/index.html#/today');
  await page.goto('/index.html#/lesson/l-linalg-systems');
  await page.goto('/index.html#/family/formula-scalar-product/column-vector-authored/0/core');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(external).toEqual([]);
});

interface StoredAttempt {
  eventId?: string;
  exerciseId?: string;
  activityId?: string;
  activityVersion?: string;
  contentVersion?: string;
  competencyIds?: string[];
  instanceId?: string;
  occurredAt?: string;
  recordedAt?: string;
  eventType?: string;
  correct?: boolean;
  masteryEligible?: boolean;
  evidenceEligible?: boolean;
  seed?: number;
}

interface ProgressState {
  dbVersion: number;
  storeNames: string[];
  data: {
    attempts: StoredAttempt[];
    journal: Array<{ exerciseId: string; errorType: string; note?: string }>;
    reviewQueue: Array<{ exerciseId: string; nextDueAt: string | null }>;
    plans: unknown[];
    drafts: unknown[];
  };
}

async function readProgressStores(page: Page): Promise<ProgressState> {
  return page.evaluate(() => new Promise<ProgressState>((resolve) => {
    const stores = ['attempts', 'journal', 'reviewQueue', 'plans', 'drafts'];
    const request = indexedDB.open('ki-lernplattform');
    request.onsuccess = () => {
      const db = request.result;
      const out: ProgressState = { dbVersion: db.version, storeNames: [...db.objectStoreNames].sort(), data: { attempts: [], journal: [], reviewQueue: [], plans: [], drafts: [] } };
      const rows = out.data as unknown as Record<string, unknown[]>;
      const transaction = db.transaction(stores, 'readonly');
      let open = stores.length;
      for (const store of stores) {
        rows[store] = [];
        transaction.objectStore(store).openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) { rows[store]?.push(cursor.value); cursor.continue(); } else if (--open === 0) { db.close(); resolve(out); }
        };
      }
    };
  }));
}

test('a seeded v1 IndexedDB migrates to v3 stores and survives reload in the next shell', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The IndexedDB migration contract is asserted once in Chromium.');
  await page.goto('/content/sources.json');
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('ki-lernplattform');
      request.onsuccess = request.onerror = request.onblocked = () => resolve(null);
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('ki-lernplattform', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('weeks', { keyPath: 'weekId' });
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        attempts.createIndex('exerciseId', 'exerciseId');
        db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('settings', { keyPath: 'key' });
        db.createObjectStore('meta', { keyPath: 'k' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['attempts', 'journal'], 'readwrite');
        transaction.objectStore('attempts').add({
          exerciseId: 'w05-e1', seed: 511, answer: '1', durationMs: 41230, attempts: 1,
          hintsUsed: 0, correct: true, masteryEligible: true, errorType: null,
          revealedSolution: false, ts: new Date(Date.now() - 21 * 864e5).toISOString(),
        });
        transaction.objectStore('attempts').add({
          exerciseId: 'w05-e3', seed: 533, answer: '9', durationMs: 18800, attempts: 1,
          hintsUsed: 0, correct: false, masteryEligible: true, errorType: 'wrong-value',
          revealedSolution: false, ts: new Date(Date.now() - 20 * 864e5).toISOString(),
        });
        transaction.objectStore('journal').add({
          exerciseId: 'w05-e3', errorType: 'wrong-value', note: '9',
          ts: new Date(Date.now() - 20 * 864e5).toISOString(),
        });
        transaction.oncomplete = () => { db.close(); resolve(null); };
        transaction.onerror = () => reject(String(transaction.error));
      };
      request.onerror = () => reject(String(request.error));
    });
  });

  await page.goto('/index.html#/review');
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
  const migrated = await readProgressStores(page);
  expect(migrated.dbVersion).toBe(3);
  expect(migrated.storeNames).toEqual(expect.arrayContaining(['plans', 'drafts', 'reviewQueue']));
  expect(migrated.data.attempts).toHaveLength(2);
  expect(new Set(migrated.data.attempts.map((event) => event.eventId)).size).toBe(2);
  for (const event of migrated.data.attempts) {
    expect(event.eventId).toMatch(/^legacy:installation:/);
    expect(event).toMatchObject({ activityId: event.exerciseId, activityVersion: 'legacy-unknown', contentVersion: 'pre-v3' });
    expect(event.competencyIds?.length ?? 0).toBeGreaterThan(0);
    for (const field of ['instanceId', 'occurredAt', 'recordedAt'] as const) expect(String(event[field])).toBeTruthy();
  }
  expect(migrated.data.plans).toEqual([]);
  expect(migrated.data.drafts).toEqual([]);
  expect(migrated.data.journal).toHaveLength(1);

  const dueEntry = migrated.data.reviewQueue.find((entry) => entry.exerciseId === 'w05-e1');
  expect(dueEntry, `backfilled reviewQueue: ${JSON.stringify(migrated.data.reviewQueue)}`).toBeTruthy();
  expect(Date.parse(dueEntry!.nextDueAt as string)).toBeLessThan(Date.now());
  const reviewLink = page.locator('.review-card a[href*="w05-e1"]');
  await expect(reviewLink).toBeVisible();
  await reviewLink.click();
  await expect(page.locator('.view-header .eyebrow')).toContainText('w05-e1');

  const manipulatedDueAt = new Date(Date.now() - 864e5).toISOString();
  await page.evaluate(async (nextDueAt) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('ki-lernplattform');
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('reviewQueue', 'readwrite');
        const current = transaction.objectStore('reviewQueue').get('w05-e1');
        current.onsuccess = () => {
          const record = current.result as { nextDueAt: string } | undefined;
          if (record) transaction.objectStore('reviewQueue').put({ ...record, nextDueAt });
        };
        transaction.oncomplete = () => { db.close(); resolve(null); };
        transaction.onerror = () => reject(String(transaction.error));
      };
    });
  }, manipulatedDueAt);

  const beforeReload = await readProgressStores(page);
  await page.reload();
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
  const afterReload = await readProgressStores(page);
  expect(afterReload.data.attempts).toHaveLength(beforeReload.data.attempts.length);
  expect(afterReload.data.journal).toHaveLength(beforeReload.data.journal.length);
  expect(afterReload.data.reviewQueue.find((entry) => entry.exerciseId === 'w05-e1')?.nextDueAt).toBe(manipulatedDueAt);
  await expect(page.locator('.review-card a[href*="w05-e1"]')).toBeVisible();
  const roundtrip = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    await progress.savePlan({ planId: 's2a-plan', items: [] });
    await progress.saveDraft({ activityId: 's2a-draft', answer: 'lokal' });
    const firstCycle = await progress.getOrCreateCycle('s2a-cycle');
    const secondCycle = await progress.startExerciseCycle('s2a-cycle');
    const before = await progress.exportAll();
    await progress.importAll(before);
    await progress.importAll(before);
    const after = await progress.exportAll();
    return {
      schemaVersion: after.schemaVersion,
      attemptCountStable: before.data.attempts.length === after.data.attempts.length,
      uniqueEventIds: new Set(after.data.attempts.map((event: { eventId: string }) => event.eventId)).size === after.data.attempts.length,
      planPresent: after.data.plans.some((plan: { planId: string }) => plan.planId === 's2a-plan'),
      draftPresent: after.data.drafts.some((draft: { activityId: string }) => draft.activityId === 's2a-draft'),
      cycleChanged: firstCycle !== secondCycle,
      cyclePersisted: after.data.drafts.some((draft: { activityId: string; cycleId?: string }) => draft.activityId === 's2a-cycle' && draft.cycleId === secondCycle),
    };
  });
  expect(roundtrip).toEqual({ schemaVersion: 3, attemptCountStable: true, uniqueEventIds: true, planPresent: true, draftPresent: true, cycleChanged: true, cyclePersisted: true });
});

test('a wrong deterministic answer feeds the error journal across reload and export', async ({ page }) => {
  await page.goto('/index.html#/exercise/w01-e8');
  await page.getByRole('textbox', { name: 'Antwort als ganze Zahl' }).fill('999');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Nicht richtig/ })).toBeVisible();
  const journalEntry = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    return (await progress.journal()).at(-1);
  });
  expect(journalEntry).toMatchObject({ exerciseId: 'w01-e8', errorType: 'wrong-value', note: '999' });

  await page.getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  const journalSection = page.locator('.activity-section').filter({ hasText: 'Fehlerjournal' });
  await expect(journalSection).toBeVisible();
  await expect(journalSection.getByText('w01-e8 · wrong-value')).toBeVisible();
  await expect(journalSection.getByRole('heading', { name: 'Fehlerjournal (1)', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  await expect(journalSection.getByText('w01-e8 · wrong-value')).toBeVisible();
  await expect(journalSection.getByRole('heading', { name: 'Fehlerjournal (1)', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('button', { name: 'JSON exportieren' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON exportieren' }).click();
  const exported = JSON.parse(readFileSync(await (await downloadPromise).path(), 'utf8'));
  expect(exported.schemaVersion).toBe(3);
  expect(exported.data.journal).toHaveLength(1);
  expect(exported.data.journal[0]).toMatchObject({ exerciseId: 'w01-e8', errorType: 'wrong-value', note: '999' });
});

test('worked-example completion and predict-output grading stay web-first', async ({ page }) => {
  await page.goto('/index.html#/exercise/w01-e7');
  await page.getByRole('button', { name: 'Beispiel studieren' }).click();
  await expect(page.getByText(/kein Mastery-Versuch/)).toBeVisible();
  const steps = page.locator('.worked-example-steps li');
  await expect(steps).toHaveCount(3);
  await steps.first().getByRole('textbox', { name: /Welcher Wert wird zuerst gerettet/ }).fill('a');
  await steps.first().getByRole('button', { name: 'Vergleichen' }).click();
  await expect(steps.first().getByRole('status')).toContainText('Richtig');
  const studied = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    return (await progress.attemptsFor('w01-e7')).at(-1);
  });
  expect(studied).toMatchObject({ eventType: 'worked-example-studied', masteryEligible: false, evidenceEligible: false });

  await page.goto('/index.html#/exercise/f-control-flow-output-01');
  await page.getByLabel('Erwartete Ausgabe').fill('  12   3  ');
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
});

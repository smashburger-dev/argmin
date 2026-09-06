import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// W4: im lokalen PRIVATEN Profil bietet SourcesView eine lokale Lesefassung
// an. Der Link ist root-relativ in die Bibliothek, antwortet mit HTTP 200,
// trägt target="_blank" und rel="noopener" und öffnet in einem neuen Tab.
// Das öffentliche Profil kompiliert localPath heraus; es darf kein
// Lesefassungs-Link entstehen.
//
// Private Prüfung gegen Vite `--mode local-private`, nicht gegen den
// Playwright-webServer (public, 4173) und nicht gegen `dev:local` (4174,
// kollidiert mit PLAYWRIGHT_PREVIEW). Freie Ports ab 4185.

const ROOT = process.cwd();
const VITE_BIN = join(ROOT, 'node_modules/.bin/vite');
const APP_SHELL_MARKER = 'Zum Inhalt springen';

const privateLibraryPresent = existsSync(join(ROOT, 'content/curriculum.json')) && existsSync(join(ROOT, 'library/open'));

let privateOrigin = '';
let privateChild: ChildProcess | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = String(response.status);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(200);
  }
  throw new Error(`Vite local-private antwortete nicht auf ${url}: ${lastError}`);
}

async function startPrivateVite(): Promise<string> {
  if (privateOrigin) return privateOrigin;
  const compile = spawn(process.execPath, ['tools/compile_content.mjs', '--profile', 'local-private'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const compileOut: Buffer[] = [];
  compile.stdout?.on('data', (chunk) => compileOut.push(chunk));
  compile.stderr?.on('data', (chunk) => compileOut.push(chunk));
  const compileCode: number = await new Promise((resolve) => compile.on('close', resolve));
  if (compileCode !== 0) {
    throw new Error(`local-private Compile fehlgeschlagen:\n${Buffer.concat(compileOut).toString('utf8')}`);
  }
  let lastSpawn = '';
  for (let port = 4185; port <= 4204; port += 1) {
    const child = spawn(VITE_BIN, ['--mode', 'local-private', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    const logs: Buffer[] = [];
    child.stdout?.on('data', (chunk) => logs.push(chunk));
    child.stderr?.on('data', (chunk) => logs.push(chunk));
    const origin = `http://127.0.0.1:${port}`;
    try {
      await waitForUrl(`${origin}/index.html`, 20000);
      privateChild = child;
      privateOrigin = origin;
      return origin;
    } catch (error) {
      child.kill('SIGTERM');
      lastSpawn = `${error instanceof Error ? error.message : String(error)}\n${Buffer.concat(logs).toString('utf8')}`;
    }
  }
  throw new Error(`Kein freier Vite-Port ab 4185:\n${lastSpawn}`);
}

test.afterAll(() => {
  privateChild?.kill('SIGTERM');
  privateChild = null;
});

function skipIfPrivateLibraryMissing(): void {
  test.skip(!privateLibraryPresent, 'Privater Bibliotheks-Content (library/) liegt diesem Checkout nicht bei.');
}

test('Lokale Lesefassung der Python-Tutorial-Quelle ist root-relativ, antwortet mit 200 und öffnet in einem neuen Tab', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', 'Die private Vite-Fixture und die Anker-Semantik werden einmal in Chromium geprüft; das Markup ist browserunabhängig.');
  skipIfPrivateLibraryMissing();
  test.setTimeout(120000);
  const origin = await startPrivateVite();

  await page.goto(`${origin}/index.html#/sources`);
  await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible();
  const pyTutorialLink = page.locator('a[href^="/library/"][href*="py-tutorial"]');
  await expect(pyTutorialLink).toBeVisible();
  await expect(pyTutorialLink).toHaveAttribute('target', '_blank');
  await expect(pyTutorialLink).toHaveAttribute('rel', 'noopener');
  await expect(pyTutorialLink).toHaveText('Lokale Lesefassung öffnen');
  const href = await pyTutorialLink.getAttribute('href');
  expect(href, 'Lesefassungs-Link muss root-relativ in die Bibliothek zeigen').toMatch(/^\/library\//);

  const response = await request.get(origin + href!);
  expect(response.status(), `Lesefassungs-Ziel ${href} muss HTTP 200 antworten`).toBe(200);
  const body = await response.text();
  expect(body, 'Vite darf die Lesefassung nicht durch die App-Shell ersetzen').not.toContain(APP_SHELL_MARKER);

  const popupPromise = page.context().waitForEvent('page');
  await pyTutorialLink.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await expect(page).toHaveURL(/#\/sources$/);
});

test('Zweite Lesepfad-Quelle (Serlo) löst sich ebenfalls lokal auf', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', 'Die private Vite-Fixture und die Anker-Semantik werden einmal in Chromium geprüft; das Markup ist browserunabhängig.');
  skipIfPrivateLibraryMissing();
  test.setTimeout(120000);
  const origin = await startPrivateVite();

  await page.goto(`${origin}/index.html#/sources`);
  await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible();
  const serloLink = page.locator('a[href^="/library/"][href*="serlo"]').first();
  await expect(serloLink).toBeVisible();
  await expect(serloLink).toHaveAttribute('target', '_blank');
  await expect(serloLink).toHaveAttribute('rel', 'noopener');
  const href = await serloLink.getAttribute('href');
  expect(href).toMatch(/^\/library\//);
  const response = await request.get(origin + href!);
  expect(response.status()).toBe(200);
  expect(await response.text()).not.toContain(APP_SHELL_MARKER);
});

test('Compile-Profile halten localPath nur im local-private-Bundle', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Der Bundle-Vergleich ist ein reiner Dateicheck und läuft einmal in Chromium.');
  interface CompiledSource { sourceId: string; localPath?: string }
  const readSources = (profile: string): CompiledSource[] | null => {
    const path = join(ROOT, `.content-build/${profile}/split/sections/sources.json`);
    if (!existsSync(path)) return null;
    return (JSON.parse(readFileSync(path, 'utf8')) as { sources: CompiledSource[] }).sources;
  };
  const publicSources = readSources('public');
  test.skip(!publicSources, 'Öffentliches Bundle (.content-build/public) fehlt — webServer-Prehook nicht gelaufen.');
  const withPrivatePath = (publicSources ?? []).filter((source) => source.localPath);
  expect(withPrivatePath, 'Public-Bundle darf keine Bibliothekspfade (localPath) tragen').toEqual([]);

  const localSources = readSources('local-private');
  test.skip(!localSources, 'Local-private-Bundle (.content-build/local-private) fehlt — npm run dev:local vorab ausführen.');
  expect((localSources ?? []).some((source) => source.localPath), 'Local-private-Bundle muss die lokale Lesefassung (localPath) behalten').toBe(true);
});

test('Öffentliches Profil enthält keine lokale Lesefassung und keine Bibliothekspfade', async ({ page }) => {
  await page.goto('/index.html#/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible();
  expect(await page.locator('.source-card').count()).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'Lokale Lesefassung öffnen' })).toHaveCount(0);
  await expect(page.locator('a[href*="/library"]')).toHaveCount(0);
});

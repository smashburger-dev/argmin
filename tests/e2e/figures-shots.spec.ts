import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Opt-in contact-sheet generator for the four Werkbank styles (Noa's style
// decision aid, not a CI gate). Run against the dev server:
//   FIGURE_SHOTS=1 E2E_REUSE_SERVER=1 E2E_PORT=4391 npx playwright test \
//     tests/e2e/figures-shots.spec.ts --project=chromium
// Writes .figure-shots/<width>/<theme>/<style>-b<beat>.png plus
// .figure-shots/kontaktbogen.html (beats x styles, one section per
// viewport x theme).
const STYLES = [
  { id: 'a1', name: 'A1 Tonale Werkbank' },
  { id: 'a2', name: 'A2 Zweifarbdruck' },
  { id: 'a3', name: 'A3 Kupferstich' },
  { id: 'a4', name: 'A4 Matte Keramik' },
] as const;
const BEATS = [
  { index: 0, name: 'Zutaten' },
  { index: 3, name: 'Treffer nach Beeren' },
  { index: 4, name: 'Tafel' },
  { index: 5, name: 'Geisterportion' },
] as const;
const THEMES = ['light', 'dark'] as const;
// Tall enough that the whole figure card fits below the (hidden) topbar.
const VIEWPORTS = [
  { width: 1440, height: 1500 },
  { width: 375, height: 1700 },
] as const;
const OUT = '.figure-shots';

function contactSheet(): string {
  const sections = [];
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const rows = BEATS.map((b) => {
        const cells = STYLES.map((s) => {
          const rel = `${vp.width}/${theme}/${s.id}-b${b.index}.png`;
          return `<td><a href="${rel}"><img src="${rel}" alt="${s.id} beat ${b.index}"></a></td>`;
        }).join('');
        return `<tr><th>${b.index} · ${b.name}</th>${cells}</tr>`;
      }).join('\n');
      const head = STYLES.map((s) => `<th>${s.name}</th>`).join('');
      sections.push(
        `<section><h2>${vp.width}x${vp.height} · ${theme}</h2>` +
        `<table><thead><tr><th>Schritt</th>${head}</tr></thead><tbody>${rows}</tbody></table></section>`,
      );
    }
  }
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Figuren-Kontaktbogen</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #faf7f2; color: #26221f; }
  table { border-collapse: collapse; margin-bottom: 40px; }
  th { text-align: left; font-size: 13px; padding: 4px 8px; vertical-align: bottom; }
  td { padding: 4px; }
  img { width: 320px; display: block; border: 1px solid #ccc; }
</style></head><body><h1>Werkbank-Figuren: Kontaktbogen</h1>${sections.join('\n')}</body></html>`;
}

test.describe('figure contact sheet (opt-in)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium' || process.env.FIGURE_SHOTS !== '1',
    'Set FIGURE_SHOTS=1 and run with --project=chromium.');
  test.setTimeout(600_000);

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`shots ${vp.width}x${vp.height} ${theme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });
        await context.addInitScript((t) => {
          localStorage.setItem('ki-lernplattform:theme', t);
        }, theme);
        const page = await context.newPage();
        // Fixed app chrome must not cover the card in the shots.
        await page.addStyleTag({ content: '.topbar, header[class], [class*="topbar"] { display: none !important }' });
        const dir = join(OUT, String(vp.width), theme);
        mkdirSync(dir, { recursive: true });
        for (const style of STYLES) {
          for (const beat of BEATS) {
            // The lab mounts the start beat once: a full reload per shot
            // keeps beat and settled state honest.
            await page.goto('about:blank');
            await page.goto(`/#/figurenlabor?stil=${style.id}&beat=${beat.index}`);
            const stage = page.locator('[aria-roledescription="Figur"]').first();
            await expect(stage).toBeVisible({ timeout: 20_000 });
            await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
            const card = page.locator('.figure-card').first();
            await card.scrollIntoViewIfNeeded();
            await card.screenshot({ path: join(dir, `${style.id}-b${beat.index}.png`) });
          }
        }
        await context.close();
      });
    }
  }

  test('kontaktbogen.html', async () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'kontaktbogen.html'), contactSheet());
  });
});

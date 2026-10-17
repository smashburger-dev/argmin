import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test, type Page } from '@playwright/test';

// Acceptance spec for the Werkbank figure block. Stage test hooks:
// data-beat / data-azimuth / data-settled on [aria-roledescription="Figur"].
// Lab-route tests skip in the preview build (the lab is dev-only).
const LESSON = '/index.html#/lesson/l-linalg-systems';
const STAGE = '[aria-roledescription="Figur"]';

const { defaultBrowserType: _androidBrowser, ...android } = devices['Galaxy S5'];
const { defaultBrowserType: _iphoneBrowser, ...iphone } = devices['iPhone SE'];

async function openLesson(page: Page) {
  await page.goto(LESSON);
  const card = page.locator('.figure-card').first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  const stage = card.locator(STAGE);
  await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
  return { card, stage };
}

async function openLab(page: Page, beat: number) {
  await page.goto(`/index.html#/figurenlabor?beat=${beat}`);
  const stage = page.locator(STAGE).first();
  await expect(stage).toBeVisible({ timeout: 20_000 });
  await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
  return stage;
}

const azimuthOf = async (stage: ReturnType<Page['locator']>) =>
  Number(await stage.getAttribute('data-azimuth'));

test.describe('figure block', () => {
  test('lesson flow: predict gate, feedback, beats forward and back', async ({ page }) => {
    test.setTimeout(60_000); // multi-beat flow is slow under parallel WebKit
    const { card, stage } = await openLesson(page);
    await expect(card).toBeVisible();
    const weiter = card.getByRole('button', { name: 'Weiter', exact: true });
    const zurueck = card.getByRole('button', { name: 'Zurück', exact: true });
    await weiter.click();
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await weiter.click();
    await expect(stage).toHaveAttribute('data-beat', '2');
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await expect(weiter).toBeDisabled();

    const answer = card.getByRole('textbox', { name: 'Antwort' });
    const pruefen = card.getByRole('button', { name: 'Prüfen' });
    // Unparseable input shows the typo hint and keeps Weiter disabled.
    await answer.fill('abc');
    await pruefen.click();
    await expect(card.getByRole('status')).toContainText('Zahl eingeben');
    await expect(weiter).toBeDisabled();
    // A wrong but parseable answer unlocks — the verdict stays visible.
    await answer.fill('5');
    await pruefen.click();
    await expect(card.getByRole('status')).toContainText('Zuckerwert');
    await expect(weiter).toBeEnabled();
    await answer.fill('2');
    await pruefen.click();
    await expect(card.getByRole('status')).toContainText('Richtig.');
    await expect(weiter).toBeEnabled();

    await weiter.click();
    await expect(stage).toHaveAttribute('data-beat', '3');
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await weiter.click();
    await expect(stage).toHaveAttribute('data-beat', '4');
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await weiter.click();
    await expect(stage).toHaveAttribute('data-beat', '5');
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await zurueck.click();
    await expect(stage).toHaveAttribute('data-beat', '4');
  });

  test('keyboard: arrows step beats, shift+arrow rotates, home resets view', async ({ page }) => {
    const { stage } = await openLesson(page);
    const az0 = await azimuthOf(stage);
    await stage.focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-beat', '1');
    await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
    await page.keyboard.press('Shift+ArrowRight');
    await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
    const az1 = await azimuthOf(stage);
    expect(Math.abs(Math.abs(az1 - az0) - 15)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Home');
    await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
    expect(Math.abs((await azimuthOf(stage)) - az0)).toBeLessThanOrEqual(0.5);
  });

  test('reduced motion jumps to the beat end and the loop stops', async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as { __argminFigurePerf: unknown[] }).__argminFigurePerf = []; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { card, stage } = await openLesson(page);
    await card.getByRole('button', { name: 'Weiter', exact: true }).click();
    await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 500 });
    const len = async () => page.evaluate(() => (window as unknown as { __argminFigurePerf: unknown[] }).__argminFigurePerf.length);
    await page.waitForTimeout(100);
    const a = await len();
    await page.waitForTimeout(600);
    expect(await len()).toBe(a);
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1440, 375] as const) {
      test(`axe: lesson passes serious/critical checks at ${width}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width > 500 ? 1000 : 1400 });
        await page.addInitScript((t) => localStorage.setItem('ki-lernplattform:theme', t), theme);
        await openLesson(page);
        const accessibility = await new AxeBuilder({ page }).analyze();
        const bad = accessibility.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
        expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  }

  test.describe('painted fills (lab)', () => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'The figure lab is dev-only.');
    const style = 'a1';
    for (const theme of ['light', 'dark'] as const) {
      test(`solid faces are filled — ${style} ${theme}`, async ({ page }) => {
          await page.setViewportSize({ width: 960, height: 720 });
          await page.addInitScript((t) => localStorage.setItem('ki-lernplattform:theme', t), theme);
          const stage = await openLab(page, 3);
          const svgBox = await stage.locator('svg').first().boundingBox();
          const stageBox = await stage.boundingBox();
          if (!svgBox || !stageBox) throw new Error('figure has no box');

          // DOM: every drawn face path (non-empty d, not a hull, not the
          // dashed ghost outline) carries an opaque fill; every url() fill
          // resolves to a pattern/filter that exists.
          const dom = await stage.evaluate((el) => {
            const unfilled: string[] = [];
            const refs = new Set<string>();
            const visible = (p: Element) =>
              Boolean(p.getAttribute('d')) && p.getAttribute('display') !== 'none'
              && p.closest('g[data-item]')?.getAttribute('display') !== 'none';
            const fillBad = (p: Element): string | null => {
              if (p.getAttribute('stroke-dasharray')) return null; // ghost outline
              if (p.getAttribute('data-tone') === 'glass') return null; // glass is translucent
              const fill = p.getAttribute('fill');
              if (!fill || fill === 'none' || fill === 'transparent') return 'no fill';
              const fo = p.getAttribute('fill-opacity');
              return fo !== null && Number(fo) < 0.99 ? `fill-opacity ${fo}` : null;
            };
            el.querySelectorAll('g[data-item] path[data-face]').forEach((p) => {
              if (!visible(p)) return;
              const fill = p.getAttribute('fill');
              if (fill?.startsWith('url(')) refs.add(fill.slice(5, -1));
              const bad = fillBad(p);
              if (bad) unfilled.push(`${p.closest('g[data-item]')?.getAttribute('data-item')}: ${bad}`);
            });
            const missing = [...refs].filter((id) => !document.getElementById(id));
            return { unfilled, missing };
          });
          expect(dom.unfilled).toEqual([]);
          expect(dom.missing).toEqual([]);

          // Pixels: centroids of three faces the scene guarantees opaque —
          // countertop top, cabinet front, liquid front wall at beat 3 —
          // computed from the same pure paint-list geometry the painter uses.
          const pts = await stage.evaluate(async (el) => {
            const svgEl = el.querySelector('svg')!;
            const rect = svgEl.getBoundingClientRect();
            // Runtime module load: tsc cannot resolve the pure kit files.
            const load = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
            const [S, C, D] = await Promise.all([
              load('/assets/js/figures/scenes/smoothie.mjs'),
              load('/assets/js/figures/kit/camera.mjs'),
              load('/assets/js/figures/kit/depth.mjs'),
            ]);
            const m = S.model({ a1: [2, 1], a2: [1, 2], b: [4, 5], ghost: [1, 3] });
            const p = S.pose(m, 3, S.beatDuration(S.beatIds[3]));
            const items: any[] = S.build(m, p, 'lesson');
            const cam = S.cameraFor(m, p, { width: rect.width, height: rect.height });
            const proj = C.projector(cam, { width: rect.width, height: rect.height });
            const center2 = (face: any) => {
              let x = 0; let y = 0;
              for (const pt of face.pts) { const [sx, sy] = proj(pt); x += sx; y += sy; }
              return { x: rect.left + x / face.pts.length, y: rect.top + y / face.pts.length };
            };
            // The face centroid can sit under the marks plate — scan the
            // projected face for a point whose top element is a face path.
            const inPoly = (poly: number[][], x: number, y: number) => {
              let inside = false;
              for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
                const xi = poly[i]![0]!; const yi = poly[i]![1]!;
                const xj = poly[j]![0]!; const yj = poly[j]![1]!;
                if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
              }
              return inside;
            };
            const pickLiquid = (faces: any[], pr: any, rc: any) => {
              for (const face of faces) {
                const poly: number[][] = face.pts.map((pt: number[]) => pr(pt));
                const xs = poly.map((p) => p[0]!); const ys = poly.map((p) => p[1]!);
                for (let y = Math.min(...ys) + 2; y < Math.max(...ys); y += 4) {
                  for (let x = Math.min(...xs) + 2; x < Math.max(...xs); x += 4) {
                    if (!inPoly(poly, x, y)) continue;
                    const hit = document.elementFromPoint(rc.left + x, rc.top + y);
                    const item = hit?.closest('g[data-item]')?.getAttribute('data-item');
                    if (hit?.tagName === 'path' && item !== 'jar-marks') return { x: rc.left + x, y: rc.top + y };
                  }
                }
              }
              return null;
            };
            const bench = items.find((i) => i.id === 'bench');
            const tops: any[] = bench.mesh.faces.filter((f: any) => f.normal[2] > 0.9);
            const top = tops.reduce((a, b) => (b.pts[0][2] > a.pts[0][2] ? b : a));
            const fronts: any[] = bench.mesh.faces.filter((f: any) => f.normal[1] < -0.9);
            const area = (f: any) => {
              let s = 0;
              for (let i = 0; i < f.pts.length; i += 1) {
                const p0 = f.pts[i]; const q = f.pts[(i + 1) % f.pts.length];
                s += p0[0] * q[1] - q[0] * p0[1];
              }
              return Math.abs(s);
            };
            const front = fronts.reduce((a, b) => (area(b) > area(a) ? b : a));
            const entries = D.paintList(items, cam);
            const liqFaces = entries.filter((e: any) =>
              e.item.id === 'mixer-liquid' && e.face && e.face.normal[1] < -0.5).map((e: any) => e.face);
            if (!liqFaces.length) throw new Error('no drawn liquid face at beat 3');
            return { counter: center2(top), cabinet: center2(front), liquid: pickLiquid(liqFaces, proj, rect) ?? center2(liqFaces[0]) };
          });

          const shot = await stage.screenshot();
          // The real glass check: the same screen point at beat 0 (empty
          // jar) must differ — translucent glass alone does not pass this.
          // A hash-only change does not remount the lab: go via about:blank.
          await page.goto('about:blank');
          await openLab(page, 0);
          const stageBox0 = await stage.boundingBox();
          if (!stageBox0) throw new Error('figure has no box');
          const shot0 = await stage.screenshot();
          const pixels = await page.evaluate(async ({ b64, b64e, probes, dx, dy, dx0, dy0, bw, bw0, styleKey }) => {
            // <img> + data URL: WebKit cannot draw an ImageBitmap to canvas.
            // WebKit also captures element screenshots at ~1.5x CSS scale, so
            // every pixel coordinate goes through the measured image scale.
            const load = async (b: string, boxW: number) => {
              const im = new Image();
              im.src = `data:image/png;base64,${b}`;
              await im.decode();
              const cv = document.createElement('canvas');
              cv.width = im.naturalWidth; cv.height = im.naturalHeight;
              const g = cv.getContext('2d')!;
              g.drawImage(im, 0, 0);
              return {
                w: im.naturalWidth,
                s: im.naturalWidth / boxW,
                at: (x: number, y: number) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3),
              };
            };
            const shot3 = await load(b64, bw);
            const shot0 = await load(b64e, bw0);
            const rgb = shot3.at;
            const rgb0 = shot0.at;
            const dist = (a: number[], b: number[]) =>
              Math.abs(a[0]! - b[0]!) + Math.abs(a[1]! - b[1]!) + Math.abs(a[2]! - b[2]!);
            // Stage background = the two top corners of the shot (the scene
            // never reaches them; the halo hugs the cabinet's bottom).
            const bg = [
              (rgb(4, 4)[0]! + rgb(shot3.w - 5, 4)[0]!) / 2,
              (rgb(4, 4)[1]! + rgb(shot3.w - 5, 4)[1]!) / 2,
              (rgb(4, 4)[2]! + rgb(shot3.w - 5, 4)[2]!) / 2,
            ];
            // Sample a 5x5 patch: halftone faces mix ink and paper dots, so
            // the check uses the patch's MAX distance to the reference color.
            const patch = (x: number, y: number, ref: number[]) => {
              let best = 0;
              const cx = Math.round((x - dx) * shot3.s); const cy = Math.round((y - dy) * shot3.s);
              for (let ix = -2; ix <= 2; ix += 1) {
                for (let iy = -2; iy <= 2; iy += 1) {
                  best = Math.max(best, dist(rgb(cx + ix, cy + iy), ref));
                }
              }
              return best;
            };
            // The liquid must not read as paper/glass: resolve the style's
            // paper token and require the liquid patch to differ from it too.
            const probe = document.createElement('div');
            probe.style.color = `var(--fig-${styleKey}-paper)`;
            document.body.appendChild(probe);
            const pm = /(\d+)[^\d]+(\d+)[^\d]+(\d+)/.exec(getComputedStyle(probe).color)!;
            probe.remove();
            const paper = [Number(pm[1]), Number(pm[2]), Number(pm[3])];
            // Beat 3 vs beat 0 at the same screen point: the empty jar.
            const cx = Math.round((probes.liquid.x - dx) * shot3.s);
            const cy = Math.round((probes.liquid.y - dy) * shot3.s);
            const cx0 = Math.round((probes.liquid.x - dx0) * shot0.s);
            const cy0 = Math.round((probes.liquid.y - dy0) * shot0.s);
            const patchAvg = (reader: (x: number, y: number) => number[], px: number, py: number) => {
              const sum = [0, 0, 0];
              for (let ix = -2; ix <= 2; ix += 1) {
                for (let iy = -2; iy <= 2; iy += 1) {
                  const q = reader(px + ix, py + iy);
                  sum[0]! += q[0]!; sum[1]! += q[1]!; sum[2]! += q[2]!;
                }
              }
              return sum.map((v) => v / 25);
            };
            const liquidVsEmpty = dist(patchAvg(rgb, cx, cy), patchAvg(rgb0, cx0, cy0));
            return {
              counter: patch(probes.counter.x, probes.counter.y, bg),
              cabinet: patch(probes.cabinet.x, probes.cabinet.y, bg),
              liquid: patch(probes.liquid.x, probes.liquid.y, bg),
              liquidVsPaper: patch(probes.liquid.x, probes.liquid.y, paper),
              liquidVsEmpty,
            };
          }, {
            b64: shot.toString('base64'), b64e: shot0.toString('base64'), probes: pts,
            dx: stageBox.x, dy: stageBox.y, dx0: stageBox0.x, dy0: stageBox0.y,
            bw: stageBox.width, bw0: stageBox0.width, styleKey: style,
          });
          expect(pixels.counter, `${style}/${theme} countertop top is unpainted`).toBeGreaterThan(12);
          expect(pixels.cabinet, `${style}/${theme} cabinet front is unpainted`).toBeGreaterThan(12);
          expect(pixels.liquid, `${style}/${theme} liquid is unpainted`).toBeGreaterThan(12);
          expect(pixels.liquidVsPaper, `${style}/${theme} liquid reads as paper/glass`).toBeGreaterThan(12);
          expect(pixels.liquidVsEmpty, `${style}/${theme} liquid is hidden by opaque glass`).toBeGreaterThan(12);
        });
    }
  });

  test.describe('board text layout (lab)', () => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'The figure lab is dev-only.');
    for (const width of [1440, 375] as const) {
      test(`no text overlaps and >=14px at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width > 500 ? 1100 : 1400 });
        const stage = await openLab(page, 4);
        const stats = await stage.evaluate((el) => {
          const g = el.querySelector('g[data-item="board-face"]');
          const texts = [...g!.querySelectorAll('text')].filter((t) => t.getAttribute('display') !== 'none');
          const rects = texts.map((t) => t.getBoundingClientRect());
          const overlaps: Array<{ a: string; b: string; area: number }> = [];
          for (let i = 0; i < rects.length; i += 1) {
            for (let j = i + 1; j < rects.length; j += 1) {
              const a = rects[i]!; const b = rects[j]!;
              const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (w > 0 && h > 0) overlaps.push({ a: String(i), b: String(j), area: w * h });
            }
          }
          const sizes = texts.map((t) => Number(t.getAttribute('font-size')) * (t.getScreenCTM()?.a ?? 1));
          return { overlaps, minFont: Math.min(...sizes), count: texts.length };
        });
        expect(stats.count).toBeGreaterThan(5);
        expect(stats.overlaps.filter((o) => o.area >= 2)).toEqual([]);
        if (width === 375) expect(stats.minFont).toBeGreaterThanOrEqual(14);
      });
    }
  });

  test('controls: two step buttons and one step count at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 1400 });
    const { card } = await openLesson(page);
    const row = card.locator('.figure-controls');
    const buttons = row.locator('button');
    await expect(buttons).toHaveCount(2);
    await expect(card.locator('.figure-step')).toHaveAttribute('aria-label', 'Schritt 1 von 6');
    const boxes = await buttons.evaluateAll((els) => els.map((b) => {
      const r = b.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right };
    }));
    const tops = boxes.map((b) => b.top);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
    const cardBox = (await card.boundingBox())!;
    for (const b of boxes) {
      expect(b.left, 'control overflows the card on the left').toBeGreaterThanOrEqual(cardBox.x);
      expect(b.right, 'control overflows the card on the right').toBeLessThanOrEqual(cardBox.x + cardBox.width);
    }
  });

  test.describe('Galaxy S5 touch', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Android emulation runs on Chromium only.');
    test.use(android);

    test('tap steps, horizontal drag rotates, vertical swipe scrolls', async ({ page }) => {
      const { card, stage } = await openLesson(page);
      await card.getByRole('button', { name: 'Weiter', exact: true }).tap();
      await expect(stage).toHaveAttribute('data-beat', '1');
      await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
      const az0 = await azimuthOf(stage);

      await stage.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      const box = (await stage.boundingBox())!;
      const y = box.y + box.height / 2;
      const x0 = box.x + box.width * 0.25;
      const cdp = await page.context().newCDPSession(page);
      const tp = (x: number, yy: number) => [{ x: Math.round(x), y: Math.round(yy), radiusX: 4, radiusY: 4, force: 1, id: 1 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x0, y) });
      for (let i = 1; i <= 10; i += 1) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x0 + i * 14, y) });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
      expect(Math.abs((await azimuthOf(stage)) - az0)).toBeGreaterThan(10);

      // Vertical swipe on the stage must scroll the page, not rotate.
      const az1 = await azimuthOf(stage);
      const sy0 = await page.evaluate(() => window.scrollY);
      try {
        await cdp.send('Input.synthesizeScrollGesture', {
          x: Math.round(box.x + box.width / 2), y: Math.round(y),
          yDistance: -400, gestureSourceType: 'touch', speed: 800,
        });
      } catch {
        // Older CDP lacks synthesizeScrollGesture: raw touch events instead.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(box.x + box.width / 2, y) });
        for (let i = 1; i <= 10; i += 1) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(box.x + box.width / 2, y - i * 30) });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await page.waitForTimeout(600);
      const sy1 = await page.evaluate(() => window.scrollY);
      const az2 = await azimuthOf(stage);
      expect(sy1).not.toBe(sy0);
      expect(Math.abs(az2 - az1)).toBeLessThanOrEqual(1);
    });
  });

  test.describe('iPhone SE touch', () => {
    test.skip(({ browserName }) => browserName !== 'webkit' || process.env.PLAYWRIGHT_ALL_BROWSERS !== '1',
      'iPhone emulation runs on WebKit with PLAYWRIGHT_ALL_BROWSERS=1.');
    test.use(iphone);

    test('tap steps the figure', async ({ page }) => {
      const { card, stage } = await openLesson(page);
      await card.getByRole('button', { name: 'Weiter', exact: true }).tap();
      await expect(stage).toHaveAttribute('data-beat', '1');
      await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
      // WebKit CDP has no Input.dispatchTouchEvent; the page.tap path above
      // is the supported touch check here.
    });
  });

  test('preview build ships no figure lab', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW !== '1', 'Preview-only check.');
    await page.goto('/index.html#/figurenlabor');
    await page.waitForTimeout(1500);
    await expect(page.locator('.figlab-grid')).toHaveCount(0);
    await expect(page.locator(STAGE)).toHaveCount(0);
    const root = join(__dirname, '../../build-next');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const offenders = walk(root).filter((p) => readFileSync(p).includes('figurenlabor'));
    expect(offenders).toEqual([]);
  });
});

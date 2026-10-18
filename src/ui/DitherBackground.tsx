import { useEffect, useRef } from 'preact/hooks';
import { WORDMARK_PATHS, WORDMARK_VIEWBOX } from './Brand';

// Animated dither field painted behind the app: a glyph grid on a 14 px cell,
// gated by a 4x4 Bayer threshold against a slow sine pulse. While the pointer
// rests on free space inside <main>, an accent-colored "argmin" materializes
// cell by cell around the cursor.
const CELL = 14;
const GLYPHS = [...'0123456789+−×÷=<>∑∂∇λθπσμ∫√%·'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const INK_LOW = 0.07;
const INK_HIGH = 0.12;
const HALO_ALPHA = 0.2;
const WORD_ALPHA = 0.9;
const HALO_RADIUS = 9;
const REROLL_BASE = 0.015;
const REROLL_HALO = 0.35;
const REROLL_WORD = 0.05;
const MS_IDLE = 1000 / 15;
const MS_TOUCH_IDLE = 1000 / 10;
const MS_ENGAGED = 1000 / 30;
const BLOCKED = 'a,button,input,select,textarea,label,summary,pre,code,svg,canvas,img,table,[role],[contenteditable]';
// Word cells only draw dense glyphs — thin marks (· − = < > + × ÷) punch holes.
const WORD_GLYPHS = [...'0123456789%∑∂∇λθπσμ∫√'].map((g) => GLYPHS.indexOf(g));

type WordMask = { cols: number; rows: number; dil: Float32Array };

function themeColors(): { ink: string; accent: string; mono: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue('--text').trim() || '#171519',
    accent: style.getPropertyValue('--accent-hover').trim() || '#5f33c4',
    mono: style.getPropertyValue('--mono').trim() || 'monospace',
  };
}

// Glyphs are pre-rendered per theme: row 0 = ink, row 1 = accent. Drawing a
// cell is a drawImage out of this strip, batched per alpha level.
function buildAtlas(ink: string, accent: string, mono: string, dpr: number): HTMLCanvasElement {
  const atlas = document.createElement('canvas');
  atlas.width = Math.ceil(GLYPHS.length * CELL * dpr);
  atlas.height = Math.ceil(CELL * 2 * dpr);
  const ctx = atlas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.font = `11px ${mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [ink, accent].forEach((color, row) => {
    ctx.fillStyle = color;
    GLYPHS.forEach((glyph, i) => ctx.fillText(glyph, (i + 0.5) * CELL, row * CELL + CELL / 2));
  });
  return atlas;
}

// Mean alpha per cell over an ss×ss supersampled block.
function cellCoverage(pixels: Uint8ClampedArray, cols: number, rows: number, ss: number): Float32Array {
  const cov = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let y = 0; y < ss; y++) {
        for (let x = 0; x < ss; x++) {
          sum += pixels[((r * ss + y) * cols * ss + c * ss + x) * 4 + 3]!;
        }
      }
      cov[r * cols + c] = sum / (ss * ss * 255);
    }
  }
  return cov;
}

// Plus-shaped one-cell dilation: hairline strokes survive at cell scale.
function dilatePlus(cov: Float32Array, cols: number, rows: number): Float32Array {
  const dil = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      dil[i] = Math.max(
        cov[i]!,
        r > 0 ? cov[i - cols]! : 0,
        r < rows - 1 ? cov[i + cols]! : 0,
        c > 0 ? cov[i - 1]! : 0,
        c < cols - 1 ? cov[i + 1]! : 0,
      );
    }
  }
  return dil;
}

// The wordmark is rasterized once into a coverage mask: `cols` grid cells wide,
// each cell sampled at 4x4 px.
function buildWordMask(gridCols: number): WordMask {
  const cols = Math.max(8, Math.min(56, Math.floor(gridCols * 0.7)));
  const rows = Math.max(2, Math.round((cols * WORDMARK_VIEWBOX.height) / WORDMARK_VIEWBOX.width));
  const ss = 4;
  const cv = document.createElement('canvas');
  cv.width = cols * ss;
  cv.height = rows * ss;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.scale((cols * ss) / WORDMARK_VIEWBOX.width, (rows * ss) / WORDMARK_VIEWBOX.height);
  ctx.fillStyle = '#fff';
  for (const { d, evenodd } of WORDMARK_PATHS) {
    ctx.fill(new Path2D(d), evenodd ? 'evenodd' : 'nonzero');
  }
  const pixels = ctx.getImageData(0, 0, cols * ss, rows * ss).data;
  return { cols, rows, dil: dilatePlus(cellCoverage(pixels, cols, rows, ss), cols, rows) };
}

function hasVisibleBackground(el: Element): boolean {
  const style = getComputedStyle(el);
  const bg = style.backgroundColor.match(/[\d.]+%?/g);
  if (bg && Number(bg[3] ?? 1) > 0) return true;
  const filter = style.backdropFilter || (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter;
  return filter !== undefined && filter !== 'none';
}

// "Free" = a gap inside <main>: no interactive or painted element between the
// target and main, and the target carries no direct text.
function hasDirectText(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
  }
  return false;
}

function isFree(target: Element, main: HTMLElement): boolean {
  if (target !== main && !main.contains(target)) return false;
  if (hasDirectText(target)) return false;
  let el: Element | null = target;
  while (el) {
    if (el.matches(BLOCKED) || hasVisibleBackground(el)) return false;
    if (el === main) return true;
    el = el.parentElement;
  }
  return true;
}

function startEngine(canvas: HTMLCanvasElement): () => void {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverQuery = matchMedia('(hover: hover)');
  const schemeQuery = matchMedia('(prefers-color-scheme: dark)');
  const colors = themeColors();
  const state = {
    cols: 0,
    rows: 0,
    glyphs: new Uint8Array(0),
    atlas: buildAtlas(colors.ink, colors.accent, colors.mono, dpr),
    mask: buildWordMask(1024 / CELL),
    pointer: { x: 0, y: 0, active: false, free: false, target: null as Element | null },
    engage: 0,
    wordX: 0,
    wordY: 0,
    lastDraw: 0,
    raf: 0,
  };
  const bayerOf = (c: number, r: number) => (BAYER[((r & 3) << 2) | (c & 3)]! + 0.5) / 16;
  const reroll = (i: number) => {
    state.glyphs[i] = (state.glyphs[i]! + 1 + ((Math.random() * (GLYPHS.length - 1)) | 0)) % GLYPHS.length;
  };

  function rebuildGrid() {
    canvas.width = Math.ceil(innerWidth * dpr);
    canvas.height = Math.ceil(innerHeight * dpr);
    state.cols = Math.ceil(innerWidth / CELL);
    state.rows = Math.ceil(innerHeight / CELL);
    state.glyphs = new Uint8Array(state.cols * state.rows);
    for (let i = 0; i < state.glyphs.length; i++) state.glyphs[i] = (Math.random() * GLYPHS.length) | 0;
    state.mask = buildWordMask(state.cols);
  }

  // Buckets per alpha level so globalAlpha is set once per level per frame.
  const buckets: number[][] = [[], [], [], []];
  function isWordCell(wc: number, wr: number, bn: number): boolean {
    const { cols, rows, dil } = state.mask;
    return wc >= 0 && wc < cols && wr >= 0 && wr < rows
      && dil[wr * cols + wc]! > 0.2 + 0.3 * bn && bn < state.engage;
  }

  function classify(c: number, r: number, i: number, bn: number, v: number, pc: number, pr: number) {
    if (isWordCell(c - Math.round(state.wordX - state.mask.cols / 2),
      r - Math.round(state.wordY - state.mask.rows / 2), bn)) {
      if (Math.random() < REROLL_WORD) state.glyphs[i] = WORD_GLYPHS[(Math.random() * WORD_GLYPHS.length) | 0]!;
      buckets[3]!.push(i);
      return;
    }
    if (v <= bn) return;
    if (state.engage > 0 && (c - pc) ** 2 + (r - pr) ** 2 <= HALO_RADIUS * HALO_RADIUS) {
      if (Math.random() < REROLL_HALO * state.engage) reroll(i);
      buckets[2]!.push(i);
    } else {
      buckets[v > 0.75 ? 1 : 0]!.push(i);
    }
  }

  function draw(t: number) {
    const { cols, rows, glyphs, atlas } = state;
    for (const b of buckets) b.length = 0;
    const breathe = 0.75 + 0.25 * Math.sin(t * 0.8);
    const sinC = new Float32Array(cols);
    const cosR = new Float32Array(rows);
    const sinCR = new Float32Array(cols + rows);
    for (let c = 0; c < cols; c++) sinC[c] = Math.sin(c * 0.09 + t * 0.6);
    for (let r = 0; r < rows; r++) cosR[r] = Math.cos(r * 0.11 - t * 0.4);
    for (let i = 0; i < cols + rows; i++) sinCR[i] = Math.sin(i * 0.05 + t * 0.9);
    const pc = state.pointer.x / CELL;
    const pr = state.pointer.y / CELL;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const v = (0.5 + 0.5 * (0.6 * sinC[c]! * cosR[r]! + 0.4 * sinCR[c + r]!)) * breathe;
        classify(c, r, i, bayerOf(c, r), v, pc, pr);
      }
    }
    const scatter = Math.round(cols * rows * REROLL_BASE);
    for (let k = 0; k < scatter; k++) reroll((Math.random() * cols * rows) | 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const src = CELL * dpr;
    const paint = (bucket: number[], row: number, denseOnly = false) => {
      for (const i of bucket) {
        const g = denseOnly ? WORD_GLYPHS[glyphs[i]! % WORD_GLYPHS.length]! : glyphs[i]!;
        ctx.drawImage(atlas, g * src, row * src, src, src, (i % cols) * CELL, ((i / cols) | 0) * CELL, CELL, CELL);
      }
    };
    ctx.globalAlpha = INK_LOW; paint(buckets[0]!, 0);
    ctx.globalAlpha = INK_HIGH; paint(buckets[1]!, 0);
    ctx.globalAlpha = HALO_ALPHA * state.engage; paint(buckets[2]!, 0);
    ctx.globalAlpha = WORD_ALPHA; paint(buckets[3]!, 1, true);
    ctx.globalAlpha = 1;
  }

  function tick(now: number) {
    state.raf = requestAnimationFrame(tick);
    const free = state.pointer.active && state.pointer.free;
    const idleMs = hoverQuery.matches ? MS_IDLE : MS_TOUCH_IDLE;
    const minDelta = free || state.engage > 0 ? MS_ENGAGED : idleMs;
    const elapsed = now - state.lastDraw;
    if (elapsed < minDelta) return;
    state.lastDraw = now;
    const wasIdle = state.engage === 0;
    state.engage = Math.min(1, Math.max(0, state.engage + (free ? elapsed / 250 : -elapsed / 400)));
    if (free) {
      // Re-entry: after a full fade-out the word snaps to the cursor instead
      // of gliding in from its old position.
      if (wasIdle) { state.wordX = state.pointer.x / CELL; state.wordY = state.pointer.y / CELL; }
      state.wordX += (state.pointer.x / CELL - state.wordX) * 0.18;
      state.wordY += (state.pointer.y / CELL - state.wordY) * 0.18;
    }
    draw(now / 1000);
  }

  function computeFree(target: EventTarget | null) {
    const main = document.getElementById('main-content');
    state.pointer.target = target instanceof Element ? target : null;
    state.pointer.free = Boolean(main && target instanceof Element && isFree(target, main));
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !hoverQuery.matches) return;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.active = true;
    if (event.target !== state.pointer.target) computeFree(event.target);
  };
  const clearPointer = () => {
    state.pointer.active = false;
    state.pointer.free = false;
    state.pointer.target = null;
  };
  const onOut = (event: PointerEvent) => { if (!event.relatedTarget) clearPointer(); };
  // A still cursor over scrolled content changes what is under it — recompute.
  const onScroll = () => {
    if (state.pointer.active) computeFree(document.elementFromPoint(state.pointer.x, state.pointer.y));
  };
  const rebuildAtlas = () => {
    const next = themeColors();
    state.atlas = buildAtlas(next.ink, next.accent, next.mono, dpr);
  };
  const onThemeChange = () => { rebuildAtlas(); if (motionQuery.matches) draw(0); };
  const onResize = () => { rebuildGrid(); if (motionQuery.matches) draw(0); };
  const onMotionChange = () => {
    cancelAnimationFrame(state.raf);
    if (motionQuery.matches) draw(0);
    else { state.lastDraw = 0; state.raf = requestAnimationFrame(tick); }
  };
  const themeObserver = new MutationObserver(onThemeChange);

  rebuildGrid();
  if (motionQuery.matches) {
    draw(0);
  } else {
    state.raf = requestAnimationFrame(tick);
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerout', onOut);
  window.addEventListener('blur', clearPointer);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  schemeQuery.addEventListener('change', onThemeChange);
  motionQuery.addEventListener('change', onMotionChange);

  return () => {
    cancelAnimationFrame(state.raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerout', onOut);
    window.removeEventListener('blur', clearPointer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    themeObserver.disconnect();
    schemeQuery.removeEventListener('change', onThemeChange);
    motionQuery.removeEventListener('change', onMotionChange);
  };
}

export function DitherBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => (canvasRef.current ? startEngine(canvasRef.current) : undefined), []);
  return <canvas ref={canvasRef} class="dither-bg" aria-hidden="true" />;
}

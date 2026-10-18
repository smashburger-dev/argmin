import { useEffect, useRef } from 'preact/hooks';
import { BANNER_WORDS, BAYER, WORD_CELL, WORD_GLYPH_CHARS, buildBannerLayout, buildTextLayout, createBanner } from './dither-banner';

// Animated dither field painted behind the app: a glyph grid on an 11 px cell,
// gated by a 4x4 Bayer threshold against a slow sine pulse. While the pointer
// is anywhere inside <main>, an accent-colored "argmin" banner is towed behind
// the cursor on a second canvas (see dither-banner.ts).
// The background repaints only cells whose discrete state actually changed.
const CELL = 11;
const GLYPHS = [...'0123456789+−×÷=<>∑∂∇λθπσμ∫√%·'];
const INK_LOW = 0.035;
const INK_HIGH = 0.09;
const REROLL_BASE = 0.015;
const MS_IDLE = 1000 / 12;
const MS_TOUCH_IDLE = 1000 / 10;
const CLICK_BLOCKED = 'a,button,input,select,textarea,label,summary,[role=button],[contenteditable]';

// Single field formula, shared by the background hot loop (fed per-axis trig
// tables) and the word layer's field() (fed continuous-coordinate trig).
function fieldMix(a: number, b: number, s: number, breathe: number): number {
  return (0.5 + 0.5 * (0.6 * a * b + 0.4 * s)) * breathe;
}

function themeColors(): { ink: string; accent: string; mono: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue('--text').trim() || '#171519',
    accent: style.getPropertyValue('--accent-hover').trim() || '#5f33c4',
    mono: style.getPropertyValue('--mono').trim() || 'monospace',
  };
}

// Glyphs are pre-rendered per theme, one canvas row per color, on integer
// device-pixel cells so source rects stay integer.
function buildAtlas(rowColors: string[], mono: string, dpr: number, cellCss: number, fontCssPx: number, glyphs: string[]): { atlas: HTMLCanvasElement; src: number } {
  const src = Math.max(1, Math.round(cellCss * dpr));
  const atlas = document.createElement('canvas');
  atlas.width = src * glyphs.length;
  atlas.height = src * rowColors.length;
  const ctx = atlas.getContext('2d')!;
  ctx.font = `${fontCssPx * dpr}px ${mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rowColors.forEach((color, row) => {
    ctx.fillStyle = color;
    glyphs.forEach((glyph, i) => ctx.fillText(glyph, (i + 0.5) * src, (row + 0.5) * src));
  });
  return { atlas, src };
}



function startEngine(canvas: HTMLCanvasElement, wordCanvas: HTMLCanvasElement): () => void {
  const maybeCtx = canvas.getContext('2d');
  const maybeWctx = wordCanvas.getContext('2d');
  if (!maybeCtx || !maybeWctx) return () => {};
  const ctx = maybeCtx;
  const wctx = maybeWctx;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverQuery = matchMedia('(hover: hover)');
  const schemeQuery = matchMedia('(prefers-color-scheme: dark)');
  const colors = themeColors();
  const bg = buildAtlas([colors.ink, colors.accent], colors.mono, dpr, CELL, 9, GLYPHS);
  const wg = buildAtlas([colors.accent], colors.mono, dpr, WORD_CELL, 4, WORD_GLYPH_CHARS);
  const layout = buildBannerLayout(WORD_CELL);
  const banner = createBanner(layout);
  const state = {
    cols: 0,
    rows: 0,
    glyphs: new Uint8Array(0),
    // Packed per-cell state: 0 = hidden, else level*32 + glyph (level 1 low,
    // 2 high, 3 halo). 0xFF forces a full repaint after resize/theme change.
    cellState: new Uint8Array(0),
    sinC: new Float32Array(0),
    cosR: new Float32Array(0),
    sinCR: new Float32Array(0),
    lClear: new Int32Array(0),
    lLow: new Int32Array(0),
    lHigh: new Int32Array(0),
    atlas: bg.atlas,
    atlasSrc: bg.src,
    wordAtlas: wg.atlas,
    pointer: { x: 0, y: 0, active: false, free: false, target: null as Element | null },
    engage: 0,
    t: 0,
    breathe: 1,
    wordOn: false,
    nC: 0,
    n1: 0,
    n2: 0,
    lastBg: 0,
    prevFrame: 0,
    raf: 0,
  };
  const bayerOf = (c: number, r: number) => (BAYER[((r & 3) << 2) | (c & 3)]! + 0.5) / 16;
  const reroll = (i: number) => {
    state.glyphs[i] = (state.glyphs[i]! + 1 + ((Math.random() * (GLYPHS.length - 1)) | 0)) % GLYPHS.length;
  };

  function rebuildGrid() {
    canvas.width = Math.ceil(innerWidth * dpr);
    canvas.height = Math.ceil(innerHeight * dpr);
    wordCanvas.width = canvas.width;
    wordCanvas.height = canvas.height;
    state.cols = Math.ceil(innerWidth / CELL);
    state.rows = Math.ceil(innerHeight / CELL);
    const n = state.cols * state.rows;
    state.glyphs = new Uint8Array(n);
    for (let i = 0; i < n; i++) state.glyphs[i] = (Math.random() * GLYPHS.length) | 0;
    state.cellState = new Uint8Array(n).fill(0xff);
    state.sinC = new Float32Array(state.cols);
    state.cosR = new Float32Array(state.rows);
    state.sinCR = new Float32Array(state.cols + state.rows);
    state.lClear = new Int32Array(n);
    state.lLow = new Int32Array(n);
    state.lHigh = new Int32Array(n);
  }

  // Next discrete state byte for a cell: 0 hidden, else level*32 + glyph.
  function nextState(i: number, bn: number, v: number): number {
    if (v <= bn) return 0;
    return (v > 0.75 ? 64 : 32) + state.glyphs[i]!;
  }

  // Diff pass: compute next state per cell, bucket changed cells for clear
  // and per-level redraw. No allocations in the hot loop.
  function diffCells(breathe: number): void {
    const { cols, rows, cellState, lClear, lLow, lHigh, sinC, cosR, sinCR } = state;
    let nC = 0;
    let n1 = 0;
    let n2 = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const v = fieldMix(sinC[c]!, cosR[r]!, sinCR[c + r]!, breathe);
        const s = nextState(i, bayerOf(c, r), v);
        if (s === cellState[i]) continue;
        cellState[i] = s;
        lClear[nC++] = i;
        if (s >= 64) lHigh[n2++] = i;
        else if (s > 0) lLow[n1++] = i;
      }
    }
    state.nC = nC;
    state.n1 = n1;
    state.n2 = n2;
  }

  function draw(t: number) {
    const { cols, rows } = state;
    state.t = t;
    const breathe = 0.75 + 0.25 * Math.sin(t * 0.8);
    state.breathe = breathe;
    for (let c = 0; c < cols; c++) state.sinC[c] = Math.sin(c * 0.09 + t * 0.6);
    for (let r = 0; r < rows; r++) state.cosR[r] = Math.cos(r * 0.11 - t * 0.4);
    for (let i = 0; i < cols + rows; i++) state.sinCR[i] = Math.sin(i * 0.05 + t * 0.9);
    const scatter = Math.round(cols * rows * REROLL_BASE);
    for (let k = 0; k < scatter; k++) reroll((Math.random() * cols * rows) | 0);
    diffCells(breathe);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let k = 0; k < state.nC; k++) {
      const i = state.lClear[k]!;
      ctx.clearRect((i % cols) * CELL, ((i / cols) | 0) * CELL, CELL, CELL);
    }
    paintList(state.lLow, state.n1, INK_LOW);
    paintList(state.lHigh, state.n2, INK_HIGH);
    ctx.globalAlpha = 1;
  }

  function paintList(list: Int32Array, n: number, alpha: number) {
    const { cols, atlas, atlasSrc, cellState } = state;
    ctx.globalAlpha = alpha;
    for (let k = 0; k < n; k++) {
      const i = list[k]!;
      ctx.drawImage(atlas, (cellState[i]! & 31) * atlasSrc, 0, atlasSrc, atlasSrc, (i % cols) * CELL, ((i / cols) | 0) * CELL, CELL, CELL);
    }
  }

  // Continuous background-field value at a word-dot position (px) — same
  // fieldMix formula the background loop uses, fed continuous trig.
  const wordField = (x: number, y: number) => fieldMix(
    Math.sin((x / CELL) * 0.09 + state.t * 0.6),
    Math.cos((y / CELL) * 0.11 - state.t * 0.4),
    Math.sin(((x + y) / CELL) * 0.05 + state.t * 0.9),
    state.breathe,
  );

  function frame(now: number) {
    state.raf = requestAnimationFrame(frame);
    const dtMs = Math.min(50, now - state.prevFrame);
    state.prevFrame = now;
    const free = state.pointer.active && state.pointer.free;
    const wasIdle = state.engage === 0;
    state.engage = Math.min(1, Math.max(0, state.engage + (free ? dtMs / 250 : -dtMs / 400)));
    if (free && wasIdle) banner.reset(state.pointer.x, state.pointer.y);
    // Background at idle cadence always — the word layer carries motion.
    if (now - state.lastBg >= (hoverQuery.matches ? MS_IDLE : MS_TOUCH_IDLE)) {
      state.lastBg = now;
      draw(now / 1000);
    }
    updateWord(now, dtMs);
  }

  // The word layer runs at full frame rate while engaged — the lag needs it.
  function updateWord(now: number, dtMs: number) {
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.engage > 0) {
      banner.step(state.pointer.x, state.pointer.y, dtMs, now / 1000);
      banner.draw(wctx, state.wordAtlas, dpr, state.engage, wordField);
      state.wordOn = true;
    } else if (state.wordOn) {
      banner.draw(wctx, state.wordAtlas, dpr, 0, wordField);
      state.wordOn = false;
    }
  }

  // "Free" = pointer over #main-content or anything inside it — the banner
  // and halo track over cards, text and controls too, since the frost lets
  // the pattern show through. They only fade when the pointer leaves main.
  function computeFree(target: EventTarget | null) {
    const main = document.getElementById('main-content');
    state.pointer.target = target instanceof Element ? target : null;
    state.pointer.free = Boolean(
      main && target instanceof Element && (target === main || main.contains(target)),
    );
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
  const rebuildAtlas = () => {
    const next = themeColors();
    const nbg = buildAtlas([next.ink, next.accent], next.mono, dpr, CELL, 9, GLYPHS);
    const nwg = buildAtlas([next.accent], next.mono, dpr, WORD_CELL, 4, WORD_GLYPH_CHARS);
    state.atlas = nbg.atlas;
    state.atlasSrc = nbg.src;
    state.wordAtlas = nwg.atlas;
    state.cellState.fill(0xff); // force a full repaint in the new palette
  };
  const onThemeChange = () => { rebuildAtlas(); if (motionQuery.matches) draw(state.t); };
  const onResize = () => { rebuildGrid(); if (motionQuery.matches) draw(0); };
  // Clicking the banner cycles the word (argmin keeps the wordmark layout,
  // the rest are rasterized per character and cached lazily).
  let wordIndex = 0;
  const layoutCache = new Map([[BANNER_WORDS[0]!, layout]]);
  const onClick = (event: MouseEvent) => {
    if (!hoverQuery.matches || motionQuery.matches || state.engage <= 0.5) return;
    if (!banner.hit(event.clientX, event.clientY)) return;
    const target = event.target;
    if (target instanceof Element && target.closest(CLICK_BLOCKED)) return;
    wordIndex = (wordIndex + 1) % BANNER_WORDS.length;
    const word = BANNER_WORDS[wordIndex]!;
    let next = layoutCache.get(word);
    if (!next) {
      next = word === 'argmin' ? buildBannerLayout(WORD_CELL) : buildTextLayout(word, WORD_CELL);
      layoutCache.set(word, next);
    }
    banner.setLayout(next);
  };
  const onMotionChange = () => {
    cancelAnimationFrame(state.raf);
    if (motionQuery.matches) {
      if (state.wordOn) { wctx.clearRect(0, 0, wordCanvas.width, wordCanvas.height); state.wordOn = false; }
      draw(0);
    } else {
      state.lastBg = 0;
      state.prevFrame = 0;
      state.raf = requestAnimationFrame(frame);
    }
  };
  const themeObserver = new MutationObserver(onThemeChange);

  rebuildGrid();
  if (motionQuery.matches) {
    draw(0);
  } else {
    state.raf = requestAnimationFrame(frame);
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerout', onOut);
  window.addEventListener('blur', clearPointer);
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  schemeQuery.addEventListener('change', onThemeChange);
  motionQuery.addEventListener('change', onMotionChange);

  return () => {
    cancelAnimationFrame(state.raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerout', onOut);
    window.removeEventListener('blur', clearPointer);
    window.removeEventListener('click', onClick);
    window.removeEventListener('resize', onResize);
    themeObserver.disconnect();
    schemeQuery.removeEventListener('change', onThemeChange);
    motionQuery.removeEventListener('change', onMotionChange);
  };
}

export function DitherBackground() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLCanvasElement>(null);
  useEffect(
    () => (bgRef.current && wordRef.current ? startEngine(bgRef.current, wordRef.current) : undefined),
    [],
  );
  return (
    <>
      <canvas ref={bgRef} class="dither-bg" aria-hidden="true" />
      <canvas ref={wordRef} class="dither-word" aria-hidden="true" />
    </>
  );
}

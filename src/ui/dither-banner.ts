import { WORDMARK_PATHS, WORDMARK_VIEWBOX } from './Brand';

// The wordmark towed behind the cursor like a banner: a spring-damped head
// node drags a follow-the-leader chain along the path the pointer took, with
// flutter while moving. "a" is anchored at the tail, so the word reads
// normally while trailing left and mirrors automatically — also at rest —
// once the chain swings to the other side; the swing makes it continuous.
// Sparks are short-lived bursts of jittering 0/1 glyphs seeded at the letter
// outline or the cursor. Clicking the banner swaps the word (layouts come
// from buildBannerLayout / buildTextLayout and are applied through setLayout).

export const WORD_CELL = 3;
export const WORD_GLYPH_CHARS = [...'0123456789%∑∂∇λθπσμ∫√'];
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BANNER_WORDS = ['argmin', 'argmax', 'softmax', 'logits', 'tensor', 'epoch', 'relu', 'dropout'];

const WORD_ALPHA = 0.9;
const SS = 4;
const LAYOUT_COLS = 64; // whole viewBox width in word cells
const GAP_CELLS = 2;
const K = 14; // chain nodes, 0 = head
const OMEGA = 9;
const ZETA = 0.65;
const REST_SPEED = 20; // px/s
const RELAX_RATE = 2.5; // 1/s
const AMP_TAU = 0.2; // s
const REVEAL_MS = 350;
const REROLL_REST = 0.05;
const REROLL_MOVE = 0.3;
const MAX_SPARKS = 24;
const SPARK_GLYPHS = 4; // max glyphs per spark
const SPARK_REST_RATE = 1.5; // /s
const SPARK_SWAP_BURST = 12;
const SPARK_CURSOR_P = 0.4;
const DIR_FLIP_PX = 40; // accumulated horizontal travel needed to flip relaxDir
// WORDMARK_PATHS order: 0 g-descender, 1 a, 2 r, 3 g-bowl, 4 m, 5 i-stem, 6 n, 7 i-dot.
const LETTERS = [[1], [2], [0, 3], [4], [5, 7], [6]];

const bayerOf = (c: number, r: number) => (BAYER[((r & 3) << 2) | (c & 3)]! + 0.5) / 16;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type BannerLayout = {
  cell: number;
  cols: number;
  rows: number;
  mask: Uint8Array;
  edges: Int32Array; // filled mask cells with an empty plus-neighbour
  width: number;
  height: number;
};

function isEdgeCell(mask: Uint8Array, cols: number, rows: number, c: number, r: number): boolean {
  const i = r * cols + c;
  if (!mask[i]) return false;
  if (c === 0 || !mask[i - 1]) return true;
  if (c === cols - 1 || !mask[i + 1]) return true;
  return r === 0 || !mask[i - cols] || r === rows - 1 || !mask[i + cols];
}

function edgeIndices(mask: Uint8Array, cols: number, rows: number): Int32Array {
  const list: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isEdgeCell(mask, cols, rows, c, r)) list.push(r * cols + c);
    }
  }
  return Int32Array.from(list);
}

// Columns of the cell grid (ss supersampled) containing any painted pixel.
function letterColSpan(pixels: Uint8ClampedArray, w: number, h: number, cols: number): [number, number] {
  let c0 = cols;
  let c1 = -1;
  for (let c = 0; c < cols; c++) {
    let hit = false;
    for (let y = 0; y < h && !hit; y++) {
      for (let x = c * SS; x < c * SS + SS && !hit; x++) {
        if (pixels[(y * w + x) * 4 + 3]! > 0) hit = true;
      }
    }
    if (hit) {
      if (c0 === cols) c0 = c;
      c1 = c;
    }
  }
  return [c0, c1];
}

// Plus-shaped one-cell dilation: fills 1-cell holes inside thin strokes
// without growing the letter past its stroke bbox.
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

// Mean alpha per cell over a pixel span of lcols cells starting at c0, dilated.
function cellCoverage(pixels: Uint8ClampedArray, w: number, c0: number, lcols: number, rows: number): Float32Array {
  const cov = new Float32Array(lcols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < lcols; c++) {
      let sum = 0;
      for (let y = 0; y < SS; y++) {
        for (let x = 0; x < SS; x++) {
          sum += pixels[((r * SS + y) * w + (c0 + c) * SS + x) * 4 + 3]!;
        }
      }
      cov[r * lcols + c] = sum / (SS * SS * 255);
    }
  }
  return dilatePlus(cov, lcols, rows);
}

type Part = { dil: Float32Array; cols: number };

function rasterizeLetter(pathIdx: number[], rows: number): Part {
  const cv = document.createElement('canvas');
  cv.width = LAYOUT_COLS * SS;
  cv.height = rows * SS;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.scale((LAYOUT_COLS * SS) / WORDMARK_VIEWBOX.width, (rows * SS) / WORDMARK_VIEWBOX.height);
  ctx.fillStyle = '#fff';
  for (const pi of pathIdx) {
    const p = WORDMARK_PATHS[pi]!;
    ctx.fill(new Path2D(p.d), p.evenodd ? 'evenodd' : 'nonzero');
  }
  const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const [c0, c1] = letterColSpan(pixels, cv.width, cv.height, LAYOUT_COLS);
  if (c1 < 0) return { dil: new Float32Array(0), cols: 0 };
  const lcols = c1 - c0 + 1;
  return { dil: cellCoverage(pixels, cv.width, c0, lcols, rows), cols: lcols };
}

// One text character painted in 600-weight --sans at supersample resolution,
// cropped to its own x-bbox and run through the same coverage/dilation pipe.
function rasterizeChar(ch: string, rows: number, fontPx: number, sans: string, baselinePx: number): Part {
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `600 ${fontPx}px ${sans}`;
  const m = measure.measureText(ch);
  const left = m.actualBoundingBoxLeft ?? 0;
  const inkW = Math.max(m.width, left + (m.actualBoundingBoxRight ?? m.width));
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((inkW + 2 * SS) / SS) * SS;
  cv.height = rows * SS;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.font = measure.font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, SS - left, baselinePx);
  const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const lcols = cv.width / SS;
  const [c0, c1] = letterColSpan(pixels, cv.width, cv.height, lcols);
  if (c1 < 0) return { dil: new Float32Array(0), cols: 0 };
  return { dil: cellCoverage(pixels, cv.width, c0, c1 - c0 + 1, rows), cols: c1 - c0 + 1 };
}

// Font size where the sans x-height matches the wordmark x-height in cells.
function calibrateFont(sans: string, rows: number): number {
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 240;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `600 100px ${sans}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('x', 10, 170);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let y0 = cv.height;
  let y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3]! > 0) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const xhCells = ((351 - 111) / WORDMARK_VIEWBOX.height) * rows; // wordmark x-height
  return (100 * xhCells * SS) / Math.max(1, y1 - y0 + 1);
}

// Concatenate letter parts with fixed gaps and threshold to a binary mask.
function assembleLayout(parts: Part[], rows: number, cell: number): BannerLayout {
  const cols = parts.reduce((n, p) => n + p.cols, 0) + GAP_CELLS * (parts.length - 1);
  const dil = new Float32Array(cols * rows);
  let off = 0;
  for (const p of parts) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < p.cols; c++) dil[r * cols + off + c] = p.dil[r * p.cols + c]!;
    }
    off += p.cols + GAP_CELLS;
  }
  const mask = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      mask[r * cols + c] = dil[r * cols + c]! > 0.2 + 0.3 * bayerOf(c, r) ? 1 : 0;
    }
  }
  return { cell, cols, rows, mask, edges: edgeIndices(mask, cols, rows), width: cols * cell, height: rows * cell };
}

// Each letter is rasterized over its own x-bbox at full viewBox height,
// dilated, then concatenated with fixed gaps and thresholded to a binary mask.
export function buildBannerLayout(cell: number): BannerLayout {
  const rows = Math.max(2, Math.round((WORDMARK_VIEWBOX.height * LAYOUT_COLS) / WORDMARK_VIEWBOX.width));
  return assembleLayout(LETTERS.map((idx) => rasterizeLetter(idx, rows)), rows, cell);
}

// Same layout pipeline for any word: per-character 600-weight --sans glyphs.
export function buildTextLayout(word: string, cell: number): BannerLayout {
  const rows = Math.max(2, Math.round((WORDMARK_VIEWBOX.height * LAYOUT_COLS) / WORDMARK_VIEWBOX.width));
  const sans = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim() || 'sans-serif';
  const fontPx = calibrateFont(sans, rows);
  const baselinePx = Math.round((351 / WORDMARK_VIEWBOX.height) * rows * SS);
  return assembleLayout([...word].map((ch) => rasterizeChar(ch, rows, fontPx, sans, baselinePx)), rows, cell);
}

export type Banner = {
  reset(x: number, y: number): void;
  step(px: number, py: number, dtMs: number, tSec: number): void;
  draw(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLCanvasElement,
    dpr: number,
    engage: number,
    field: (x: number, y: number) => number,
  ): void;
  setLayout(layout: BannerLayout): void;
  hit(x: number, y: number): boolean;
};

export function createBanner(initial: BannerLayout): Banner {
  let layout = initial;
  let cols = layout.cols;
  let rows = layout.rows;
  let mask = layout.mask;
  let cell = layout.cell;
  let edges = layout.edges;
  let L = layout.width / (K - 1);
  const nodes = Array.from({ length: K }, () => ({ x: 0, y: 0 }));
  const flutter = new Float32Array(K);
  let glyphs = new Uint8Array(cols * rows);
  for (let i = 0; i < glyphs.length; i++) glyphs[i] = (Math.random() * WORD_GLYPH_CHARS.length) | 0;
  let tears = new Int8Array(rows);
  const box = { x: 0, y: 0, w: -1, h: 0 };
  const cur = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  // Preallocated spark pool: cell-quantized positions + glyph bit per vertex,
  // no per-frame allocation.
  const sparkX = new Float32Array(MAX_SPARKS * SPARK_GLYPHS);
  const sparkY = new Float32Array(MAX_SPARKS * SPARK_GLYPHS);
  const sparkG = new Uint8Array(MAX_SPARKS * SPARK_GLYPHS);
  const sparkN = new Uint8Array(MAX_SPARKS);
  const sparkAge = new Float32Array(MAX_SPARKS);
  const sparkLife = new Float32Array(MAX_SPARKS);
  let sparkCount = 0;
  let spawnAcc = 0;
  let cursorX = 0;
  let cursorY = 0;
  let lastPx = 0;
  // Which side the chain settles on: a towed banner trails opposite the
  // pointer's travel direction. Only flips after 40 px of accumulated
  // horizontal travel so pointer jitter cannot swing the chain.
  let relaxDir = -1;
  let dirAcc = 0;
  let reveal = 1;
  let vx = 0;
  let vy = 0;
  let amp = 0;
  let speed = 0;

  function track(x: number, y: number) {
    if (x < cur.x0) cur.x0 = x;
    if (x > cur.x1) cur.x1 = x;
    if (y < cur.y0) cur.y0 = y;
    if (y > cur.y1) cur.y1 = y;
  }

  // Chain position for word column c (arc s = u, tail -> head over nodes
  // ordered head -> tail) plus the column's flutter interpolation.
  function colPos(c: number): [number, number] {
    const s = c / (cols - 1);
    const f = clamp((1 - s) * (K - 1), 0, K - 1);
    const i0 = Math.min(K - 2, f | 0);
    const fr = f - i0;
    const a = nodes[i0]!;
    const b = nodes[i0 + 1]!;
    return [a.x + (b.x - a.x) * fr, a.y + flutter[i0]! + (b.y + flutter[i0 + 1]! - a.y - flutter[i0]!) * fr];
  }

  // World position of mask dot i (chain bend plus its row offset and tear).
  function dotPos(i: number): [number, number] {
    const c = i % cols;
    const r = (i / cols) | 0;
    const [bx, by] = colPos(c);
    return [bx + tears[r]! * cell, by + (r - rows / 2) * cell];
  }

  // One spark = 2-4 glyphs (only atlas '0'/'1') stepping one word cell at a
  // time along a jittered direction, positions snapped to the word grid.
  function spawnSpark() {
    if (sparkCount >= MAX_SPARKS) return;
    const i = sparkCount++;
    let x = cursorX;
    let y = cursorY;
    if (Math.random() >= SPARK_CURSOR_P && edges.length) {
      const ei = edges[(Math.random() * edges.length) | 0]!;
      [x, y] = dotPos(ei);
    }
    const verts = 2 + ((Math.random() * 3) | 0); // 2-4 glyphs
    let angle = Math.random() * Math.PI * 2;
    const base = i * SPARK_GLYPHS;
    for (let v = 0; v < verts; v++) {
      sparkX[base + v] = Math.round(x / cell) * cell;
      sparkY[base + v] = Math.round(y / cell) * cell;
      sparkG[base + v] = Math.random() < 0.5 ? 0 : 1;
      angle += (Math.random() - 0.5) * ((120 * Math.PI) / 180); // ±60°
      x += Math.cos(angle) * cell;
      y += Math.sin(angle) * cell;
    }
    sparkN[i] = verts;
    sparkAge[i] = 0;
    sparkLife[i] = 50 + Math.random() * 60;
  }

  function updateSparks(dtMs: number) {
    const rate = Math.min(40, speed / 15) + (speed < REST_SPEED ? SPARK_REST_RATE : 0);
    spawnAcc += (rate * dtMs) / 1000;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      spawnSpark();
    }
    for (let i = sparkCount - 1; i >= 0; i--) {
      sparkAge[i] = sparkAge[i]! + dtMs;
      if (sparkAge[i]! < sparkLife[i]!) {
        jitterSpark(i);
        continue;
      }
      sparkCount--;
      const last = sparkCount;
      sparkN[i] = sparkN[last]!;
      sparkAge[i] = sparkAge[last]!;
      sparkLife[i] = sparkLife[last]!;
      sparkX.copyWithin(i * SPARK_GLYPHS, last * SPARK_GLYPHS, (last + 1) * SPARK_GLYPHS);
      sparkY.copyWithin(i * SPARK_GLYPHS, last * SPARK_GLYPHS, (last + 1) * SPARK_GLYPHS);
      sparkG.copyWithin(i * SPARK_GLYPHS, last * SPARK_GLYPHS, (last + 1) * SPARK_GLYPHS);
    }
  }

  // Spastic per-frame jitter: each glyph shifts 0/±1 cell and flips 0↔1 at 40%.
  function jitterSpark(i: number) {
    const base = i * SPARK_GLYPHS;
    for (let v = 0; v < sparkN[i]!; v++) {
      sparkX[base + v] = sparkX[base + v]! + ((Math.random() * 3) | 0) * cell - cell;
      sparkY[base + v] = sparkY[base + v]! + ((Math.random() * 3) | 0) * cell - cell;
      if (Math.random() < 0.4) sparkG[base + v] = sparkG[base + v]! ^ 1;
    }
  }

  function reset(x: number, y: number) {
    for (let i = 0; i < K; i++) {
      nodes[i]!.x = x - i * L;
      nodes[i]!.y = y;
    }
    vx = 0;
    vy = 0;
    amp = 0;
    speed = 0;
    lastPx = x;
    relaxDir = -1;
    dirAcc = 0;
  }

  // Rest: rotate the chain around the head toward the trail side like a
  // settling flag. Position-lerp cannot work here — the distance pass pins
  // every node to its current side, so the chain would never swing across.
  function relax(dt: number) {
    const h = nodes[0]!;
    const target = relaxDir > 0 ? 0 : Math.PI;
    const k = 1 - Math.exp(-RELAX_RATE * dt);
    for (let i = 1; i < K; i++) {
      const n = nodes[i]!;
      let a = Math.atan2(n.y - h.y, n.x - h.x);
      let dA = target - a;
      if (dA > Math.PI) dA -= 2 * Math.PI;
      else if (dA < -Math.PI) dA += 2 * Math.PI;
      a += dA * k;
      n.x = h.x + i * L * Math.cos(a);
      n.y = h.y + i * L * Math.sin(a);
    }
  }

  function step(px: number, py: number, dtMs: number, tSec: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    if (dt <= 0) return;
    cursorX = px;
    cursorY = py;
    // Trail side follows horizontal travel with hysteresis: accumulate px
    // moved opposite the current side, flip only past DIR_FLIP_PX.
    const travel = px - lastPx;
    lastPx = px;
    if (travel !== 0) {
      const side = travel > 0 ? -1 : 1;
      if (side === relaxDir) dirAcc = 0;
      else if ((dirAcc += Math.abs(travel)) >= DIR_FLIP_PX) {
        relaxDir = side;
        dirAcc = 0;
      }
    }
    reveal = Math.min(1, reveal + dtMs / REVEAL_MS);
    const h = nodes[0]!;
    vx += (OMEGA * OMEGA * (px - h.x) - 2 * ZETA * OMEGA * vx) * dt;
    vy += (OMEGA * OMEGA * (py - h.y) - 2 * ZETA * OMEGA * vy) * dt;
    h.x += vx * dt;
    h.y += vy * dt;
    speed = Math.hypot(vx, vy);
    if (speed < REST_SPEED) relax(dt);
    // Follow-the-leader distance constraint: the banner follows the exact
    // path the head took and swings around on reversals — no buffer resets.
    for (let i = 1; i < K; i++) {
      const dx = nodes[i]!.x - nodes[i - 1]!.x;
      const dy = nodes[i]!.y - nodes[i - 1]!.y;
      const d = Math.hypot(dx, dy) || 1;
      nodes[i]!.x = nodes[i - 1]!.x + (dx / d) * L;
      nodes[i]!.y = nodes[i - 1]!.y + (dy / d) * L;
    }
    amp += (Math.min(10, speed / 60) - amp) * (1 - Math.exp(-dt / AMP_TAU));
    for (let i = 0; i < K; i++) {
      flutter[i] = amp * (i / (K - 1)) * Math.sin((2 * Math.PI * 1.2 * i) / (K - 1) - 9 * tSec);
    }
    updateSparks(dtMs);
  }

  function rollTears() {
    const p = Math.min(0.15, speed / 2000);
    for (let r = 0; r < rows; r++) {
      tears[r] = Math.random() < p ? (Math.random() < 0.5 ? -1 : 1) * (1 + ((Math.random() * 2) | 0)) : 0;
    }
  }

  // One word column sampled at its arc position on the chain; rows offset
  // vertically so glyphs stay screen-upright and the word shears.
  function drawColumn(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLCanvasElement,
    c: number,
    bx: number,
    by: number,
    src: number,
    rerollP: number,
    engage: number,
    field: (x: number, y: number) => number,
  ) {
    for (let r = 0; r < rows; r++) {
      const i = r * cols + c;
      if (!mask[i]) continue;
      const x = bx + tears[r]! * cell;
      const y = by + (r - rows / 2) * cell;
      if (bayerOf(c, r) >= engage * reveal * (0.55 + 0.45 * field(x, y))) continue;
      if (Math.random() < rerollP) glyphs[i] = (Math.random() * WORD_GLYPH_CHARS.length) | 0;
      const xi = Math.round(x);
      const yi = Math.round(y);
      ctx.drawImage(atlas, glyphs[i]! * src, 0, src, src, xi, yi, cell, cell);
      track(xi, yi);
    }
  }

  function drawSparks(ctx: CanvasRenderingContext2D, atlas: HTMLCanvasElement, src: number) {
    for (let i = 0; i < sparkCount; i++) {
      const base = i * SPARK_GLYPHS;
      for (let v = 0; v < sparkN[i]!; v++) {
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.drawImage(atlas, sparkG[base + v]! * src, 0, src, src, sparkX[base + v]!, sparkY[base + v]!, cell, cell);
        track(sparkX[base + v]!, sparkY[base + v]!);
      }
    }
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLCanvasElement,
    dpr: number,
    engage: number,
    field: (x: number, y: number) => number,
  ) {
    if (box.w > 0) ctx.clearRect(box.x, box.y, box.w, box.h);
    box.w = -1;
    if (engage <= 0 || !cols) return;
    rollTears();
    const rerollP = speed > REST_SPEED ? REROLL_MOVE : REROLL_REST;
    const src = Math.max(1, Math.round(cell * dpr));
    cur.x0 = 1e9;
    cur.y0 = 1e9;
    cur.x1 = -1e9;
    cur.y1 = -1e9;
    ctx.globalAlpha = WORD_ALPHA;
    for (let c = 0; c < cols; c++) {
      const [bx, by] = colPos(c);
      drawColumn(ctx, atlas, c, bx, by, src, rerollP, engage, field);
    }
    drawSparks(ctx, atlas, src);
    ctx.globalAlpha = 1;
    if (cur.x1 >= cur.x0) {
      box.x = cur.x0 - 4;
      box.y = cur.y0 - 4;
      box.w = cur.x1 - cur.x0 + cell + 8;
      box.h = cur.y1 - cur.y0 + cell + 8;
    }
  }

  // Swap the word: keep head and chain direction, re-lay followers on the
  // new spacing, drop reveal to 0 and burst sparks off the new outline.
  function setLayout(next: BannerLayout) {
    const h = nodes[0]!;
    const tail = nodes[K - 1]!;
    let dx = tail.x - h.x;
    let dy = tail.y - h.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      dx = -1;
      dy = 0;
    } else {
      dx /= d;
      dy /= d;
    }
    layout = next;
    cols = next.cols;
    rows = next.rows;
    mask = next.mask;
    cell = next.cell;
    edges = next.edges;
    L = next.width / (K - 1);
    for (let i = 1; i < K; i++) {
      nodes[i]!.x = h.x + dx * i * L;
      nodes[i]!.y = h.y + dy * i * L;
    }
    glyphs = new Uint8Array(cols * rows);
    for (let i = 0; i < glyphs.length; i++) glyphs[i] = (Math.random() * WORD_GLYPH_CHARS.length) | 0;
    tears = new Int8Array(rows);
    reveal = 0;
    for (let i = 0; i < SPARK_SWAP_BURST; i++) spawnSpark();
  }

  function hit(x: number, y: number): boolean {
    return box.w > 0 && x >= box.x - 6 && x <= box.x + box.w + 6 && y >= box.y - 6 && y <= box.y + box.h + 6;
  }

  return { reset, step, draw, setLayout, hit };
}

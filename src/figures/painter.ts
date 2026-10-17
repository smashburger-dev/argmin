/**
 * SVG painter for the Werkbank figures. Mounts one DOM subtree per item,
 * then writes only changed attributes per frame. Paint order is exactly
 * `paintList` from the pure kit — item groups are re-appended when the
 * item order changes, face paths inside a compound group when its face
 * order changes. Pattern styles (halftone, hatch) fill faces from the
 * shared defs injected by {@link ensureFigureDefs}; prims never get
 * patterns (the board must stay clean print).
 */
import { lightDir, projector, shadeAt } from '../../assets/js/figures/kit/camera.mjs';
import { arrowPathD } from '../../assets/js/figures/kit/arrows.mjs';
import { faceSteps } from '../../assets/js/figures/kit/depth.mjs';
import { FIGURE_STYLES } from './styles';
import type { FigureStyleDef, FigureStyleId } from './styles';

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag: string) => document.createElementNS(SVGNS, tag);

type Vec3 = [number, number, number];
type Projector = ((p: Vec3) => [number, number, number]) & {
  right: Vec3; up: Vec3; toward: Vec3; camera: Camera; viewport: Viewport;
};

/** Per-paint context: one projector closure + the resolved key light, shared
 *  by every face/plane so no helper recomputes the camera basis per point. */
interface PaintCtx {
  proj: Projector;
  light: Vec3;
}

/** Coordinate formatting: one decimal, no toFixed string machinery. */
const r1 = (v: number) => `${Math.round(v * 10) / 10}`;
const r4 = (v: number) => `${Math.round(v * 1e4) / 1e4}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Item = any;
type Face = any;
type Prim = any;
type Camera = any;
type Viewport = { width: number; height: number };

interface Tokens {
  paper: string; ink: string; mark: string; lit: string;
  lo: string; mid: string; hi: string; fluid: string;
}

/** Resolve the namespaced CSS custom properties once per mount/theme. */
export function resolveTokens(style: FigureStyleId): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => cs.getPropertyValue(`--fig-${style}-${name}`).trim() || fallback;
  const ink = get('ink', '#2a2530');
  const mid = get('mid', get('paper', '#d8d0c4'));
  return {
    paper: get('paper', '#efe5dc'),
    ink,
    // Marking ink for lines and text: A4 shades toward a dark ink, so its
    // dark theme needs a light mark color where ink would vanish.
    mark: get('mark', ink),
    lit: get('lit', '#6d3fd4'),
    lo: get('lo', get('paper', '#d8d0c4')),
    mid,
    hi: get('hi', get('paper', '#ece6dc')),
    // Jar liquid: a mid-dark tonal value distinct from glass and paper.
    fluid: get('fluid', mixHex(mid, ink, 0.45)),
  };
}

// --- color helpers ----------------------------------------------------------

const hexNum = (c: string): [number, number, number] => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return [128, 128, 128];
  const h = m[1]!.length === 3 ? m[1]!.split('').map((x) => x + x).join('') : m[1]!;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexNum(a); const [br, bg, bb] = hexNum(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** Prim/line color: plain inks only — never patterned, never grained. */
function primColor(t: Tokens, tone?: string): { color: string; opacity: number } {
  switch (tone) {
    case 'lo': return { color: t.mark, opacity: 0.5 };
    case 'mid': return { color: t.mark, opacity: 0.8 };
    case 'lit': return { color: t.lit, opacity: 1 };
    case 'ghost': return { color: t.lit, opacity: 0.85 };
    case 'glass': return { color: t.mark, opacity: 0.45 };
    default: return { color: t.mark, opacity: 1 };
  }
}

/**
 * Halftone coverage ramp (dot fraction of cell area per level 0..4):
 * lightest tops ~8%, mid faces ~26%, the darkest below 55%.
 */
const A2_RADII = [0.5, 0.71, 0.92, 1.13, 1.34];
const A2_COV = A2_RADII.map((r) => (Math.PI * r * r) / (3.2 * 3.2));

/** Base ink coverage per tone; screen depth adds up to 30% on top. */
const TONE_COV: Record<string, number> = {
  glass: 0.05, hi: 0.06, lo: 0.14, mid: 0.22, lit: 0.22, board: 0.04,
};

const coverageLevel = (c: number) => {
  let best = 0;
  for (let l = 1; l < A2_COV.length; l += 1) if (Math.abs(A2_COV[l]! - c) < Math.abs(A2_COV[best]! - c)) best = l;
  return best;
};

/** Tone darkness for non-halftone pattern densities (hatch/tonal ramps). */
const TONE_DARK: Record<string, number> = { lo: 0.25, mid: 0.45, hi: 0.65, glass: 0.12, fluid: 0.55 };

/** Base color for tonal/matte fills. */
const toneBase = (t: Tokens, tone?: string) =>
  (tone === 'fluid' ? t.fluid : tone === 'lit' ? t.lit : tone === 'lo' ? t.lo : tone === 'hi' ? t.hi : t.mid);

/** Hatch orientation from the normal's screen direction. */
function hatchOrient(ctx: PaintCtx, normal: [number, number, number]): 'top' | 'left' | 'right' {
  if (Math.abs(normal[2]) >= Math.max(Math.abs(normal[0]), Math.abs(normal[1]))) return 'top';
  const dx = normal[0] * ctx.proj.right[0] + normal[1] * ctx.proj.right[1] + normal[2] * ctx.proj.right[2];
  return dx >= 0 ? 'right' : 'left';
}

/** Ghost/fluid fills that bypass the style's shading ramp, or null. */
function specialFill(tone: string | undefined, def: FigureStyleDef, orient: string): string | null {
  if (tone === 'ghost') return 'none';
  if (tone !== 'fluid') return null;
  if (def.technique === 'halftone') return 'url(#fig-a2-fluid)';
  if (def.technique === 'hatch') return `url(#fig-a3-fluid-${orient})`;
  return null;
}

function halftoneFill(tone: string | undefined, shade: number): string {
  const level = coverageLevel((TONE_COV[tone ?? 'mid'] ?? 0.22) + (1 - shade) * 0.3);
  return `url(#fig-a2-${tone === 'lit' ? 'accent' : 'ink'}-${level})`;
}

function levelFill(def: FigureStyleDef, t: Tokens, tone: string | undefined, shade: number, orient: string): string {
  const level = Math.min(def.levels - 1,
    Math.round(((TONE_DARK[tone ?? 'mid'] ?? 0.45) * 0.55 + (1 - shade) * 0.45) * (def.levels - 1)));
  if (def.technique === 'hatch') {
    return `url(#fig-a3-${tone === 'lit' ? 'accent' : 'ink'}-${orient}-${level})`;
  }
  const q = level / (def.levels - 1);
  return mixHex(toneBase(t, tone), t.ink, q * def.strength);
}

/**
 * Glass never gets an opaque base — the jar liquid and the heaps must read
 * through the front wall. Print styles draw a sparse transparent sheen
 * pattern (no paper base rect); tonal styles draw a tint whose 0.22
 * fill-opacity faceStyle adds (patterns style opacity per pattern).
 */
function glassFill(def: FigureStyleDef, t: Tokens, shade: number): string {
  if (def.technique === 'halftone') return 'url(#fig-a2-glass)';
  if (def.technique === 'hatch') return 'url(#fig-a3-glass)';
  return mixHex(t.paper, t.mark, 0.35 + 0.15 * (1 - shade));
}

/** Face fill for the active style. shade in [0,1]: 1 = fully lit. */
function faceFill(def: FigureStyleDef, t: Tokens, ctx: PaintCtx, face: Face, tone?: string): string {
  const orient = def.technique === 'hatch' ? hatchOrient(ctx, face.normal) : 'top';
  const special = specialFill(tone, def, orient);
  if (special) return special;
  const shade = shadeAt(ctx.light, face.normal);
  if (tone === 'glass') return glassFill(def, t, shade);
  // The board face must stay clean print in every style: smooth, high
  // contrast, never patterned or grained.
  if (tone === 'board') return mixHex(t.paper, t.ink, 0.05 + 0.06 * (1 - shade));
  if (def.technique === 'halftone') return halftoneFill(tone, shade);
  return levelFill(def, t, tone, shade, orient);
}

function faceStroke(def: FigureStyleDef, t: Tokens, tone?: string): { stroke: string; width: number; dash?: string } {
  if (tone === 'ghost') return { stroke: t.lit, width: 1.2, dash: '2.2 1.6' };
  if (tone === 'glass') return { stroke: t.mark, width: 0.7 };
  if (def.lineWidth <= 0) return { stroke: 'none', width: 0 };
  return { stroke: t.ink, width: def.lineWidth };
}

/** Hairline stroke in the face's own fill closes AA seams between facets. */
function seamStroke(def: FigureStyleDef, fill: string): { stroke: string; width: number; dash?: string } {
  if (fill === 'none' || fill.startsWith('url(')) return { stroke: 'none', width: 0 };
  if (def.technique === 'halftone' || def.technique === 'hatch') return { stroke: 'none', width: 0 };
  return { stroke: fill, width: 0.6 };
}

// --- shared defs ------------------------------------------------------------

let defsDone = false;

/** One global hidden svg with every pattern/filter the styles reference. */
export function ensureFigureDefs(): void {
  if (defsDone || typeof document === 'undefined') return;
  defsDone = true;
  const svg = el('svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const defs = el('defs');
  for (let l = 0; l < 5; l += 1) {
    defs.appendChild(dotPattern(`fig-a2-ink-${l}`, 'var(--fig-a2-paper)', 'var(--fig-a2-ink)', A2_RADII[l]!));
    defs.appendChild(dotPattern(`fig-a2-accent-${l}`, 'var(--fig-a2-paper)', 'var(--fig-a2-lit)', A2_RADII[l]!, true));
  }
  // The liquid screen sits at ~45% ink regardless of level: one dedicated
  // pattern keeps the jar content readable as one medium tone.
  defs.appendChild(dotPattern('fig-a2-fluid', 'var(--fig-a2-paper)', 'var(--fig-a2-ink)', 1.21));
  for (const role of ['ink', 'accent']) {
    for (const orient of ['top', 'left', 'right']) {
      for (let l = 0; l < 4; l += 1) defs.appendChild(hatchPattern(`fig-a3-${role}-${orient}-${l}`, role, orient, l));
    }
  }
  for (const orient of ['top', 'left', 'right']) {
    defs.appendChild(fluidHatch(`fig-a3-fluid-${orient}`, orient));
  }
  defs.appendChild(haloDotPattern('fig-a2-halo'));
  defs.appendChild(haloHatchPattern('fig-a3-halo'));
  defs.appendChild(glassDotPattern('fig-a2-glass'));
  defs.appendChild(glassHatchPattern('fig-a3-glass'));
  const filter = el('filter');
  filter.setAttribute('id', 'fig-soft');
  const blur = el('feGaussianBlur');
  blur.setAttribute('stdDeviation', '2.2');
  filter.appendChild(blur);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

/** Halftone: paper base + one dot per 3.2px cell, explicit dot radius. */
function dotPattern(id: string, paper: string, ink: string, radius: number, offset = false): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '3.2');
  p.setAttribute('height', '3.2');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  // Real two-ink print misregisters: the accent plate rides 0.5px/0.35px off.
  if (offset) p.setAttribute('patternTransform', 'translate(0.5 0.35)');
  const bg = el('rect');
  bg.setAttribute('width', '3.2');
  bg.setAttribute('height', '3.2');
  bg.setAttribute('fill', paper);
  const dot = el('circle');
  dot.setAttribute('cx', '1.6');
  dot.setAttribute('cy', '1.6');
  dot.setAttribute('r', r1(radius));
  dot.setAttribute('fill', ink);
  p.appendChild(bg);
  p.appendChild(dot);
  return p;
}

/** Halo screen for the print styles: transparent ground, sparse faint dots. */
function haloDotPattern(id: string): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '6.4');
  p.setAttribute('height', '6.4');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  const dot = el('circle');
  dot.setAttribute('cx', '3.2');
  dot.setAttribute('cy', '3.2');
  dot.setAttribute('r', '0.55');
  dot.setAttribute('fill', 'var(--fig-a2-ink)');
  p.appendChild(dot);
  return p;
}

/** Glass sheen for the halftone style: no base rect, one tiny dot per 5.6px. */
function glassDotPattern(id: string): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '5.6');
  p.setAttribute('height', '5.6');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  const dot = el('circle');
  dot.setAttribute('cx', '2.8');
  dot.setAttribute('cy', '2.8');
  dot.setAttribute('r', '0.5');
  dot.setAttribute('fill', 'var(--fig-a2-ink)');
  p.appendChild(dot);
  return p;
}

/** Glass sheen for the engraving style: no base rect, one line per 6px. */
function glassHatchPattern(id: string): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '6');
  p.setAttribute('height', '6');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  const line = el('rect');
  line.setAttribute('x', '0');
  line.setAttribute('y', '0');
  line.setAttribute('width', '6');
  line.setAttribute('height', '0.5');
  line.setAttribute('fill', 'var(--fig-a3-ink)');
  p.appendChild(line);
  return p;
}

/** Halo for the engraving style: sparse thin horizontal lines only. */
function haloHatchPattern(id: string): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '9');
  p.setAttribute('height', '9');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  const line = el('rect');
  line.setAttribute('x', '0');
  line.setAttribute('y', '0');
  line.setAttribute('width', '9');
  line.setAttribute('height', '0.55');
  line.setAttribute('fill', 'var(--fig-a3-ink)');
  p.appendChild(line);
  return p;
}

/** Liquid hatch: ~45% ink (0.7px lines every 1.55px), no cross-hatch. */
function fluidHatch(id: string, orient: string): SVGPatternElement {
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '8');
  p.setAttribute('height', '8');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  p.setAttribute('patternTransform', `rotate(${HATCH_ROT[orient] ?? 0})`);
  const bg = el('rect');
  bg.setAttribute('width', '8');
  bg.setAttribute('height', '8');
  bg.setAttribute('fill', 'var(--fig-a3-paper)');
  p.appendChild(bg);
  for (let x = 0; x < 8; x += 1.56) {
    const l = el('rect');
    l.setAttribute('x', r1(x));
    l.setAttribute('y', '0');
    l.setAttribute('width', '0.7');
    l.setAttribute('height', '8');
    l.setAttribute('fill', 'var(--fig-a3-ink)');
    p.appendChild(l);
  }
  return p;
}

// Pattern bars are vertical strips before the rotation: top faces read as
// horizontal hatching (rotate 90), left/right faces as 60/120 degree lines.
const HATCH_ROT: Record<string, number> = { top: 90, left: 60, right: 120 };

/** Engraving hatch: parallel lines; the darkest level adds a cross-hatch. */
function hatchPattern(id: string, role: string, orient: string, level: number): SVGPatternElement {
  const color = `var(--fig-a3-${role === 'accent' ? 'lit' : 'ink'})`;
  const gap = 5.4 - level * 1.25;
  const p = el('pattern') as SVGPatternElement;
  p.setAttribute('id', id);
  p.setAttribute('width', '8');
  p.setAttribute('height', '8');
  p.setAttribute('patternUnits', 'userSpaceOnUse');
  p.setAttribute('patternTransform', `rotate(${HATCH_ROT[orient] ?? 0})`);
  const bg = el('rect');
  bg.setAttribute('width', '8');
  bg.setAttribute('height', '8');
  bg.setAttribute('fill', 'var(--fig-a3-paper)');
  p.appendChild(bg);
  const line = (x: number, w: number) => {
    const l = el('rect');
    l.setAttribute('x', x.toFixed(2));
    l.setAttribute('y', '0');
    l.setAttribute('width', w.toFixed(2));
    l.setAttribute('height', '8');
    l.setAttribute('fill', color);
    return l;
  };
  for (let x = 0; x < 8; x += gap) p.appendChild(line(x, level === 3 ? 1.0 : 0.7));
  if (level === 3) {
    for (let x = gap / 2; x < 8; x += gap * 2) {
      const c = el('rect');
      c.setAttribute('x', '0');
      c.setAttribute('y', x.toFixed(2));
      c.setAttribute('width', '8');
      c.setAttribute('height', '0.8');
      c.setAttribute('fill', color);
      p.appendChild(c);
    }
  }
  return p;
}

/** Monotone-chain convex hull of projected screen points. */
function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) return pts;
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (seq: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of seq) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    return out;
  };
  return [...half(s).slice(0, -1), ...half([...s].reverse()).slice(0, -1)];
}

/** Deterministic paper grain tile (seeded PRNG -> canvas -> data URL). */
export function grainTile(dark: boolean): string {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  let seed = 0x9e3779b9;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand();
    img.data[i] = dark ? 255 : 30;
    img.data[i + 1] = dark ? 245 : 26;
    img.data[i + 2] = dark ? 235 : 24;
    img.data[i + 3] = Math.round(v * 14 + rand() * 8);
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

// --- painter ----------------------------------------------------------------

interface ItemBinding {
  g: SVGGElement;
  faces: Map<number, SVGPathElement>;
  hulls: Map<number, SVGPathElement>;
  prims: Map<string, SVGElement>;
  planeG: SVGGElement | null;
  strokeEl: SVGPathElement | null;
  lastSigs: Map<string, string>;
}

export class Painter {
  private svg: SVGSVGElement;
  private tokens: Tokens;
  private styleId: FigureStyleId;
  private def: FigureStyleDef;
  private items = new Map<string, ItemBinding>();
  private itemOrder = '';
  private camVer = 0;
  private lastCamKey = '';
  private styleVer = 0;
  /** (mesh, camVer) -> projected points + ready `d` strings, one array per face. */
  private dCache = new WeakMap<object, Map<number, { pts: [number, number][][]; d: string[] }>>();
  /** item identity -> last painted version; unchanged items skip repaint. */
  private paintedVer = new WeakMap<Item, string>();

  constructor(svg: SVGSVGElement, style: FigureStyleId) {
    this.svg = svg;
    this.styleId = style;
    this.def = FIGURE_STYLES[style];
    this.tokens = resolveTokens(style);
    ensureFigureDefs();
  }

  setStyle(style: FigureStyleId): void {
    this.styleId = style;
    this.def = FIGURE_STYLES[style];
    this.tokens = resolveTokens(style);
    this.itemOrder = '';
    this.styleVer += 1;
  }

  restyle(): void {
    this.tokens = resolveTokens(this.styleId);
    this.styleVer += 1;
  }

  /** Mount one <g data-item> per item: face paths, plane prims, stroke. */
  mount(items: Item[]): void {
    for (const item of items) {
      const binding: ItemBinding = {
        g: el('g') as SVGGElement,
        faces: new Map(),
        hulls: new Map(),
        prims: new Map(),
        planeG: null,
        strokeEl: null,
        lastSigs: new Map(),
      };
      binding.g.setAttribute('data-item', item.id);
      if (item.kind === 'solid') this.mountSolid(binding, item);
      else if (item.kind === 'plane') this.mountPlane(binding, item);
      else this.mountStroke(binding);
      this.items.set(item.id, binding);
      this.svg.appendChild(binding.g);
    }
  }

  private mountSolid(b: ItemBinding, item: Item): void {
    item.mesh.faces.forEach((_: Face, i: number) => {
      const p = el('path') as SVGPathElement;
      p.setAttribute('display', 'none');
      p.setAttribute('data-face', '1');
      b.faces.set(i, p);
      b.g.appendChild(p);
    });
    // One silhouette path per compound part. It stays a plain child of the
    // group: reorderFaces interleaves it right after the part's last face,
    // so nearer parts of the same item still overpaint the outline.
    for (const f of item.mesh.faces) {
      const key = f.part ?? 0;
      if (b.hulls.has(key)) continue;
      const p = el('path') as SVGPathElement;
      p.setAttribute('display', 'none');
      p.setAttribute('fill', 'none');
      // Hulls are stroke-only outlines, not faces — the e2e fill guard and
      // any DOM inspection must not read them as unpainted faces.
      p.setAttribute('data-hull', '1');
      b.hulls.set(key, p);
      b.g.appendChild(p);
    }
  }

  private mountPlane(b: ItemBinding, item: Item): void {
    const g = el('g') as SVGGElement;
    b.planeG = g;
    for (const prim of item.prims) {
      const e = primElement(prim);
      b.prims.set(prim.key, e);
      g.appendChild(e);
    }
    b.g.appendChild(g);
  }

  private mountStroke(b: ItemBinding): void {
    const p = el('path') as SVGPathElement;
    b.strokeEl = p;
    p.setAttribute('fill', 'none');
    b.g.appendChild(p);
  }

  /**
   * Per-frame paint: reorder item groups and compound face paths to exactly
   * `entries` order, then write changed attributes only.
   */
  paint(entries: Array<{ item: Item; face: Face | null; faceIndex: number }>, camera: Camera, viewport: Viewport): void {
    const camKey = `${r4(camera.azimuth)}|${r4(camera.elevation)}|${r4(camera.zoom)}|${camera.target.map(r1).join(',')}`;
    if (camKey !== this.lastCamKey) { this.camVer += 1; this.lastCamKey = camKey; }
    const pj = projector(camera, viewport) as Projector;
    const ctx: PaintCtx = { proj: pj, light: lightDir(pj) };
    const ver = `${this.camVer}s${this.styleVer}`;
    this.orderItems(entries);
    // The repaint decision is per ITEM, and entries carry one row per drawn
    // face: marking the item painted after its first entry would skip the
    // rest of its faces (they keep display:none — the wireframe bug). Decide
    // for all items first, then paint every entry of the dirty items.
    const repaint = new Set<Item>();
    for (const { item } of entries) {
      if (this.paintedVer.get(item) !== ver) {
        this.paintedVer.set(item, ver);
        repaint.add(item);
      }
    }
    const drawn = new Map<string, number[]>();
    for (const entry of entries) {
      const { item } = entry;
      if (item.kind === 'solid') {
        const list = drawn.get(item.id) ?? [];
        list.push(entry.faceIndex);
        drawn.set(item.id, list);
      }
      // Same item object at the same camera/style writes identical output.
      if (repaint.has(item)) this.paintEntry(entry, ctx);
    }
    this.finishSolids(drawn, entries.filter((e) => e.item.kind === 'solid'), ctx, ver);
  }

  private orderItems(entries: Array<{ item: Item }>): void {
    const seen = new Set<string>();
    const order: Item[] = [];
    for (const e of entries) if (!seen.has(e.item.id)) { seen.add(e.item.id); order.push(e.item); }
    const sig = order.map((i) => i.id).join('|');
    if (sig === this.itemOrder) return;
    this.itemOrder = sig;
    const frag = document.createDocumentFragment();
    for (const item of order) {
      const b = this.items.get(item.id);
      if (b) frag.appendChild(b.g);
    }
    this.svg.appendChild(frag);
  }

  private paintEntry(entry: { item: Item; face: Face | null; faceIndex: number }, ctx: PaintCtx): void {
    const { item } = entry;
    const b = this.items.get(item.id);
    if (!b) return;
    if (item.kind === 'solid') this.paintFace(b, item, entry.face, entry.faceIndex, ctx);
    else if (item.kind === 'plane') this.paintPlane(b, item, ctx);
    else this.paintStroke(b, item, ctx);
    this.setAttr(b.g, 'display', item.visible === false ? 'none' : null);
  }

  private paintFace(b: ItemBinding, item: Item, face: Face | null, faceIndex: number, ctx: PaintCtx): void {
    const p = b.faces.get(faceIndex);
    if (!p || !face) return;
    const { fill, opacity, st } = this.faceStyle(item, face, ctx);
    this.setAttr(p, 'd', this.facePath(item.mesh, faceIndex, ctx));
    this.setAttr(p, 'fill', fill);
    this.setAttr(p, 'fill-opacity', opacity);
    this.setAttr(p, 'stroke', st.stroke);
    this.setAttr(p, 'stroke-width', st.width ? String(st.width) : null);
    this.setAttr(p, 'stroke-dasharray', st.dash ?? null);
    // Guards and DOM inspection read the tone to exempt glass/ghost fills.
    this.setAttr(p, 'data-tone', face.tone ?? item.tone ?? null);
    this.setAttr(p, 'display', null);
  }

  /** Fill + stroke for one face; the ghost tint overrides both. */
  private faceStyle(item: Item, face: Face, ctx: PaintCtx): {
    fill: string; tint: boolean; opacity: string | null;
    st: { stroke: string; width: number; dash?: string };
  } {
    const tone = face.tone ?? item.tone;
    const tint = Boolean(tone === 'ghost' && item.tint);
    const fill = tint ? this.tokens.lit : faceFill(this.def, this.tokens, ctx, face, tone);
    // Ghost load: translucent accent. Translucent glass exists only on the
    // solid-fill styles — the print styles carry a transparent sheen
    // pattern whose sparseness lives in the pattern itself.
    const opacity = tint ? '0.15'
      : tone === 'glass' && !fill.startsWith('url(') ? '0.22' : null;
    // Smooth (curved) facets get no ink edge stroke — the part silhouette
    // hull supplies the outline. On solid-fill styles they take a hairline
    // stroke of their own fill color to close anti-alias seams; print
    // styles cover seams with their pattern.
    const st = face.smooth && !tint ? seamStroke(this.def, fill) : faceStroke(this.def, this.tokens, tone);
    return { fill, tint, opacity, st };
  }

  /** After all entries: hide un-drawn faces, re-append faces in paint order, draw part silhouettes. */
  private finishSolids(drawn: Map<string, number[]>, entries: Array<{ item: Item }>, ctx: PaintCtx, ver: string): void {
    const byId = new Map(entries.map((e) => [e.item.id, e.item]));
    for (const [id, order] of drawn) {
      const b = this.items.get(id);
      const item = byId.get(id);
      if (!b || !item) continue;
      // Unpainted this pass = unchanged at this version: faces, order and
      // hulls are all still valid.
      if (this.paintedVer.get(item) !== ver) continue;
      this.hideUndrawn(b, order);
      this.reorderFaces(b, order, item);
      this.paintHulls(item, b, order, ctx);
    }
  }

  private hideUndrawn(b: ItemBinding, drawn: number[]): void {
    const seen = new Set(drawn);
    for (const [i, p] of b.faces) if (!seen.has(i)) this.setAttr(p, 'display', 'none');
  }

  private reorderFaces(b: ItemBinding, order: number[], item: Item): void {
    const sig = order.join(',');
    if (this.lastSigsKey(b, 'faceorder', sig)) return;
    const frag = document.createDocumentFragment();
    const partOf = (fi: number) => item.mesh.faces[fi].part ?? 0;
    for (const step of faceSteps(order, partOf)) {
      const p = 'faceIndex' in step ? b.faces.get(step.faceIndex) : b.hulls.get(step.hullPart);
      if (p) frag.appendChild(p);
    }
    b.g.appendChild(frag);
  }

  /**
   * Per-part silhouette: the convex hull of the part's drawn faces, stroked
   * once instead of outlining every facet (a cylinder reads as a jar, not a
   * barcode). Line-free styles (lineWidth 0) skip hulls except ghost tone.
   */
  private paintHulls(item: Item, b: ItemBinding, drawn: number[], ctx: PaintCtx): void {
    if (!b.hulls.size) return;
    const parts = new Map<number, { pts: [number, number][]; tone?: string }>();
    for (const fi of drawn) {
      const face = item.mesh.faces[fi];
      const key = face.part ?? 0;
      const bucket = parts.get(key) ?? { pts: [] as [number, number][], tone: face.tone ?? item.tone };
      bucket.pts.push(...this.facePts(item.mesh, fi, ctx));
      parts.set(key, bucket);
    }
    for (const [pk, path] of b.hulls) this.paintHull(path, parts.get(pk));
  }

  private paintHull(path: SVGPathElement, part: { pts: [number, number][]; tone?: string } | undefined): void {
    const hull = part ? convexHull(part.pts) : [];
    const st = part ? faceStroke(this.def, this.tokens, part.tone) : { stroke: 'none', width: 0 };
    if (hull.length < 3 || st.width <= 0) {
      this.setAttr(path, 'display', 'none');
      return;
    }
    let d = `M${r1(hull[0]![0])} ${r1(hull[0]![1])}`;
    for (let i = 1; i < hull.length; i += 1) d += ` L${r1(hull[i]![0])} ${r1(hull[i]![1])}`;
    this.setAttr(path, 'd', `${d} Z`);
    this.setAttr(path, 'stroke', st.stroke);
    this.setAttr(path, 'stroke-width', String(st.width * 1.15));
    this.setAttr(path, 'stroke-dasharray', st.dash ?? null);
    this.setAttr(path, 'stroke-linejoin', 'round');
    this.setAttr(path, 'display', null);
  }

  private lastSigsKey(b: ItemBinding, k: string, v: string): boolean {
    if (b.lastSigs.get(k) === v) return true;
    b.lastSigs.set(k, v);
    return false;
  }

  private facePts(mesh: object, faceIndex: number, ctx: PaintCtx): [number, number][] {
    let byCam = this.dCache.get(mesh);
    if (!byCam) { byCam = new Map(); this.dCache.set(mesh, byCam); }
    const cached = byCam.get(this.camVer)?.pts[faceIndex];
    if (cached) return cached;
    const face = (mesh as { faces: Face[] }).faces[faceIndex];
    const pts = face.pts.map((p: [number, number, number]) => ctx.proj(p));
    const entry = byCam.get(this.camVer) ?? { pts: [], d: [] };
    entry.pts[faceIndex] = pts;
    byCam.set(this.camVer, entry);
    if (byCam.size > 4) byCam.delete(byCam.keys().next().value!);
    return pts;
  }

  private facePath(mesh: object, faceIndex: number, ctx: PaintCtx): string {
    let byCam = this.dCache.get(mesh);
    if (!byCam) { byCam = new Map(); this.dCache.set(mesh, byCam); }
    const entry = byCam.get(this.camVer);
    if (entry?.d[faceIndex]) return entry.d[faceIndex]!;
    const pts = this.facePts(mesh, faceIndex, ctx);
    let d = `M${r1(pts[0]![0])} ${r1(pts[0]![1])}`;
    for (let i = 1; i < pts.length; i += 1) d += ` L${r1(pts[i]![0])} ${r1(pts[i]![1])}`;
    d += ' Z';
    const rec = byCam.get(this.camVer) ?? { pts: [], d: [] };
    rec.d[faceIndex] = d;
    byCam.set(this.camVer, rec);
    return d;
  }

  private paintPlane(b: ItemBinding, item: Item, ctx: PaintCtx): void {
    const t = ctx.proj.toward;
    const n = item.normal;
    const shown = item.visible !== false && (n[0] * t[0] + n[1] * t[1] + n[2] * t[2]) > 1e-6;
    this.setAttr(b.g, 'display', shown ? null : 'none');
    const m = planeMatrixOf(ctx, item);
    if (b.planeG) this.setAttr(b.planeG, 'transform', m);
    for (const prim of item.prims) this.paintPrim(b, prim);
  }

  private paintPrim(b: ItemBinding, prim: Prim): void {
    const e = b.prims.get(prim.key);
    if (!e) return;
    const { color, opacity } = primColor(this.tokens, prim.tone);
    const alpha = prim.alpha ?? 1;
    const sig = `${primSig(prim)}|${color}|${opacity}|${alpha}|${prim.visible === false ? 'off' : 'on'}`;
    if (this.lastSigsKey(b, `prim-${prim.key}`, sig)) return;
    updatePrim(e, prim, color, opacity * alpha, this.tokens);
  }

  private paintStroke(b: ItemBinding, item: Item, ctx: PaintCtx): void {
    if (!b.strokeEl) return;
    const { color, opacity } = primColor(this.tokens, item.tone);
    let d = '';
    for (const p of item.pts) {
      const [x, y] = ctx.proj(p);
      d += `${d ? ' L' : 'M'}${r1(x)} ${r1(y)}`;
    }
    this.setAttr(b.strokeEl, 'd', d);
    this.setAttr(b.strokeEl, 'stroke', color);
    this.setAttr(b.strokeEl, 'stroke-width', String(item.width ?? 0.4));
    this.setAttr(b.strokeEl, 'stroke-opacity', String(opacity));
    this.setAttr(b.strokeEl, 'stroke-dasharray', item.dash ? item.dash.join(' ') : null);
    this.setAttr(b.g, 'display', item.visible === false ? 'none' : null);
  }

  /** Contact halo under the cabinet: subtle ground cue only — a blurred
   *  blob for tonal/matte, a sparse transparent screen for print styles. */
  paintHalo(e: SVGEllipseElement): void {
    if (this.def.technique === 'halftone') {
      e.setAttribute('fill', 'url(#fig-a2-halo)');
      e.setAttribute('fill-opacity', '0.35');
      e.setAttribute('filter', 'url(#fig-soft)');
    } else if (this.def.technique === 'hatch') {
      e.setAttribute('fill', 'url(#fig-a3-halo)');
      e.setAttribute('fill-opacity', '0.3');
      e.setAttribute('filter', 'url(#fig-soft)');
    } else {
      e.setAttribute('fill', this.tokens.ink);
      e.setAttribute('fill-opacity', '0.08');
      e.setAttribute('filter', 'url(#fig-soft)');
    }
    e.removeAttribute('display');
  }

  private setAttr(e: Element, name: string, value: string | null): void {
    const prev = e.getAttribute(name);
    if (value === null) {
      if (prev !== null) e.removeAttribute(name);
      return;
    }
    if (prev !== value) e.setAttribute(name, value);
  }
}

/**
 * SVG affine matrix mapping plane-local (u, v) to screen, built on the shared
 * projector. Exact for orthographic cameras.
 */
function planeMatrixOf(ctx: PaintCtx, item: Item): string {
  const { proj } = ctx;
  const { right, up, camera } = proj;
  const { zoom } = camera;
  const d3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const [sx, sy] = proj(item.origin);
  return `matrix(${r4(zoom * d3(item.ex, right))} ${r4(-zoom * d3(item.ex, up))} ${r4(zoom * d3(item.ey, right))} ${r4(-zoom * d3(item.ey, up))} ${r1(sx)} ${r1(sy)})`;
}

// --- prim elements ------------------------------------------------------------

/** Create the svg element for a plane prim (initial shape; attrs update per frame). */
function primElement(prim: Prim): SVGElement {
  if (prim.t === 'text') return el('text');
  if (prim.t === 'dot') return el('circle');
  if (prim.t === 'rect' || prim.t === 'shadow') return el('rect');
  return el('path');
}

/** Signature of everything that decides a prim's appearance. */
function primSig(prim: Prim): string {
  if (prim.t === 'text') return `t|${prim.x}|${prim.y}|${prim.size}|${prim.anchor}|${prim.weight}|${prim.font}|${prim.runs.map((r: any) => `${r.text}${r.sub ?? ''}${r.sup ?? ''}${r.italic ? 'i' : ''}`).join('§')}`;
  if (prim.t === 'line' || prim.t === 'arrow') return `${prim.t}|${prim.from}|${prim.to}|${prim.width}|${prim.dash}`;
  if (prim.t === 'grid') return `g|${prim.from}|${prim.to}|${prim.step}`;
  if (prim.t === 'dot') return `d|${prim.at}|${prim.r}|${prim.ring}|${prim.dash}`;
  return `r|${prim.from}|${prim.to}|${prim.fill}|${prim.plate ? 'p' : ''}`;
}

function updatePrim(e: SVGElement, prim: Prim, color: string, opacity: number, t: Tokens): void {
  e.setAttribute('display', prim.visible === false ? 'none' : 'inline');
  e.setAttribute('stroke', 'none');
  e.setAttribute('fill', 'none');
  if (prim.t === 'text') return updateText(e as SVGTextElement, prim, color, opacity);
  if (prim.t === 'dot') return updateDot(e as SVGCircleElement, prim, color, opacity);
  if (prim.t === 'rect') return updateRect(e, prim, color, opacity, t);
  if (prim.t === 'grid') return updateGrid(e, prim, color);
  updateStrokePrim(e, prim, color, opacity);
}

const MATH_ITALIC = 'KaTeX_Math, "Times New Roman", serif';
const MATH_MAIN = 'KaTeX_Main, "Times New Roman", serif';
const LABEL_FONT = 'var(--sans)';

/** Run font: math prims use the KaTeX faces (italic vs upright), labels sans. */
function runFont(prim: Prim, run: any): string {
  if (prim.font === 'math') return run.italic ? MATH_ITALIC : MATH_MAIN;
  return LABEL_FONT;
}

function updateText(e: SVGTextElement, prim: Prim, color: string, opacity: number): void {
  e.setAttribute('x', String(prim.x));
  e.setAttribute('y', String(prim.y));
  e.setAttribute('font-size', String(prim.size));
  e.setAttribute('text-anchor', prim.anchor ?? 'middle');
  e.setAttribute('fill', color);
  e.setAttribute('fill-opacity', String(opacity));
  e.setAttribute('font-weight', prim.weight === 'bold' ? '650' : '400');
  e.replaceChildren();
  let offset = 0;
  for (const run of prim.runs) offset = appendTextRun(e, run, prim, offset);
}

/**
 * One run = main tspan, then the index: `sub`/`sup` carry the index STRING,
 * rendered at 0.7x size shifted down +0.32em (sub) or up -0.4em (sup).
 * Returns the baseline compensation the next run's first tspan needs.
 */
function appendTextRun(e: SVGTextElement, run: any, prim: Prim, offset: number): number {
  const span = el('tspan');
  span.textContent = run.text ?? '';
  span.setAttribute('font-family', runFont(prim, run));
  if (offset !== 0) span.setAttribute('dy', String(offset));
  e.appendChild(span);
  const idx = run.sub ?? run.sup;
  if (idx === undefined || idx === '') return 0;
  const dy = run.sub ? prim.size * 0.32 : -prim.size * 0.4;
  const sub = el('tspan');
  sub.textContent = idx;
  sub.setAttribute('font-family', MATH_MAIN);
  sub.setAttribute('font-size', (prim.size * 0.7).toFixed(2));
  sub.setAttribute('dy', String(dy));
  e.appendChild(sub);
  return -dy;
}

function updateDot(e: SVGCircleElement, prim: Prim, color: string, opacity: number): void {
  e.setAttribute('cx', String(prim.at[0]));
  e.setAttribute('cy', String(prim.at[1]));
  e.setAttribute('r', String(Math.max(prim.r, 0.001)));
  if (prim.ring) {
    e.setAttribute('fill', 'none');
    e.setAttribute('stroke', color);
    e.setAttribute('stroke-width', '0.3');
    e.setAttribute('stroke-opacity', String(opacity));
    e.setAttribute('stroke-dasharray', prim.dash ? prim.dash.join(' ') : '1.1 0.8');
  } else {
    e.setAttribute('fill', color);
    e.setAttribute('fill-opacity', String(opacity));
  }
}

function updateRect(e: SVGElement, prim: Prim, color: string, opacity: number, t: Tokens): void {
  const [x0, y0] = prim.from; const [x1, y1] = prim.to;
  e.setAttribute('x', String(Math.min(x0, x1)));
  e.setAttribute('y', String(Math.min(y0, y1)));
  e.setAttribute('width', String(Math.abs(x1 - x0)));
  e.setAttribute('height', String(Math.abs(y1 - y0)));
  if (prim.plate) {
    // Text-bearing plates stay smooth paper in every style — like the
    // board, never dotted, hatched or clay-shaded. The lit state is a 1px
    // accent outline plus accent text, not a violet slab behind dark text.
    e.setAttribute('fill', mixHex(t.paper, t.ink, 0.07));
    e.setAttribute('fill-opacity', '1');
    e.setAttribute('vector-effect', 'non-scaling-stroke');
    e.setAttribute('stroke', prim.tone === 'lit' ? t.lit : t.mark);
    e.setAttribute('stroke-opacity', prim.tone === 'lit' ? '0.9' : '0.35');
    e.setAttribute('stroke-width', '1');
    return;
  }
  e.setAttribute('fill', prim.fill === false ? 'none' : color);
  e.setAttribute('fill-opacity', String(opacity * 0.9));
  e.setAttribute('stroke', color);
  e.setAttribute('stroke-width', '0.25');
}

function updateGrid(e: SVGElement, prim: Prim, color: string): void {
  const [x0, y0] = prim.from; const [x1, y1] = prim.to;
  const step = prim.step || 1;
  const parts: string[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) parts.push(`M${x.toFixed(2)} ${y0.toFixed(2)} L${x.toFixed(2)} ${y1.toFixed(2)}`);
  for (let y = y0; y <= y1 + 1e-6; y += step) parts.push(`M${x0.toFixed(2)} ${y.toFixed(2)} L${x1.toFixed(2)} ${y.toFixed(2)}`);
  e.setAttribute('d', parts.join(' '));
  e.setAttribute('stroke', color);
  e.setAttribute('stroke-width', String(prim.width ?? 0.14));
}

function updateStrokePrim(e: SVGElement, prim: Prim, color: string, opacity: number): void {
  const [fx, fy] = prim.from; const [tx, ty] = prim.to;
  const w = prim.width ?? 0.3;
  let d = `M${r1(fx)} ${r1(fy)} L${r1(tx)} ${r1(ty)}`;
  if (prim.t === 'arrow') {
    d = arrowPathD(prim.from, prim.to);
    e.setAttribute('fill', color);
    e.setAttribute('fill-opacity', String(opacity));
  }
  e.setAttribute('d', d);
  e.setAttribute('stroke', color);
  e.setAttribute('stroke-width', String(w));
  e.setAttribute('stroke-opacity', String(opacity));
  e.setAttribute('stroke-linecap', 'round');
  if (prim.dash) e.setAttribute('stroke-dasharray', prim.dash.join(' '));
  else e.removeAttribute('stroke-dasharray');
}

/**
 * SVG painter for the Werkbank figures (style A1 tonal). Mounts one DOM
 * subtree per item, then writes only changed attributes per frame. Paint
 * order is exactly `paintList` from the pure kit — item groups are
 * re-appended when the item order changes, face paths inside a compound
 * group when its face order changes. {@link ensureFigureDefs} injects the
 * shared blur filter the halo uses.
 */
import { lightDir, projector, shadeAt } from '../../assets/js/figures/kit/camera.mjs';
import { arrowPathD } from '../../assets/js/figures/kit/arrows.mjs';
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

const hexCache = new Map<string, [number, number, number]>();
const hexNum = (c: string): [number, number, number] => {
  const cached = hexCache.get(c);
  if (cached) return cached;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return [128, 128, 128];
  const h = m[1]!.length === 3 ? m[1]!.split('').map((x) => x + x).join('') : m[1]!;
  const channels: [number, number, number] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  if (hexCache.size >= 128) hexCache.clear();
  hexCache.set(c, channels);
  return channels;
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

/** Tone darkness: where each tone sits on the shade ramp (0 light, 1 dark). */
const TONE_DARK: Record<string, number> = { lo: 0.25, mid: 0.45, hi: 0.65, fluid: 0.55 };

/** Base color for tonal fills. */
const toneBase = (t: Tokens, tone?: string) =>
  (tone === 'fluid' ? t.fluid : tone === 'lit' ? t.lit : tone === 'lo' ? t.lo : tone === 'hi' ? t.hi : t.mid);

function levelFill(def: FigureStyleDef, t: Tokens, tone: string | undefined, shade: number): string {
  const level = Math.min(def.levels - 1,
    Math.round(((TONE_DARK[tone ?? 'mid'] ?? 0.45) * 0.55 + (1 - shade) * 0.45) * (def.levels - 1)));
  return mixHex(toneBase(t, tone), t.ink, (level / (def.levels - 1)) * def.strength);
}

/** Face fill for A1. shade in [0,1]: 1 = fully lit. */
function faceFill(def: FigureStyleDef, t: Tokens, ctx: PaintCtx, face: Face, tone?: string): string {
  if (tone === 'ghost') return 'none';
  const shade = shadeAt(ctx.light, face.normal);
  // Glass never gets an opaque base — the jar liquid and the heaps must
  // read through the front wall: a tint at 0.22 fill-opacity (faceStyle).
  if (tone === 'glass') return mixHex(t.paper, t.mark, 0.35 + 0.15 * (1 - shade));
  // The board face stays clean print: smooth, high contrast, never shaded.
  if (tone === 'board') return mixHex(t.paper, t.ink, 0.05 + 0.06 * (1 - shade));
  return levelFill(def, t, tone, shade);
}

function faceStroke(def: FigureStyleDef, t: Tokens, tone?: string): { stroke: string; width: number; dash?: string } {
  if (tone === 'ghost') return { stroke: t.lit, width: 1.2, dash: '2.2 1.6' };
  if (tone === 'glass') return { stroke: t.mark, width: 0.7 };
  if (def.lineWidth <= 0) return { stroke: 'none', width: 0 };
  return { stroke: t.ink, width: def.lineWidth };
}

/** Hairline stroke in the face's own fill closes AA seams between facets. */
function seamStroke(fill: string): { stroke: string; width: number; dash?: string } {
  if (fill === 'none' || fill.startsWith('url(')) return { stroke: 'none', width: 0 };
  return { stroke: fill, width: 0.6 };
}

// --- shared defs ------------------------------------------------------------

let defsDone = false;

/** One global hidden svg with the shared blur filter the halo uses. */
export function ensureFigureDefs(): void {
  if (defsDone || typeof document === 'undefined') return;
  defsDone = true;
  const svg = el('svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const defs = el('defs');
  const filter = el('filter');
  filter.setAttribute('id', 'fig-soft');
  const blur = el('feGaussianBlur');
  blur.setAttribute('stdDeviation', '2.2');
  filter.appendChild(blur);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);
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

// --- painter ----------------------------------------------------------------

interface ItemBinding {
  g: SVGGElement;
  /** (part|tone|style sig) -> one path holding several faces as subpaths. */
  groups: Map<string, SVGPathElement>;
  hulls: Map<number, SVGPathElement>;
  prims: Map<string, SVGElement>;
  primOrder?: string;
  planeG: SVGGElement | null;
  strokeEl: SVGPathElement | null;
  lastSigs: Map<string, string>;
  lastItem?: Item;
  paintedVersion?: string;
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

  constructor(svg: SVGSVGElement, style: FigureStyleId) {
    this.svg = svg;
    this.styleId = style;
    this.def = FIGURE_STYLES[style];
    this.tokens = resolveTokens(style);
    ensureFigureDefs();
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
        groups: new Map(),
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
    // Face paths are created lazily per (part, fill) bucket: faces of one
    // convex part never overlap, so all its equally filled faces ride in a
    // single path as subpaths — ~parts paths instead of ~faces elements.
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
      this.mountPlanePrim(b, prim);
    }
    b.primOrder = JSON.stringify(item.prims.map((prim: Prim) => prim.key));
    b.g.appendChild(g);
  }

  private mountPlanePrim(b: ItemBinding, prim: Prim): void {
    const e = primElement(prim);
    e.setAttribute('data-prim', prim.key);
    b.prims.set(prim.key, e);
    b.planeG?.appendChild(e);
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
    const camKey = `${r4(camera.azimuth)}|${r4(camera.elevation)}|${r4(camera.zoom)}|${camera.target.map(r1).join(',')}|${viewport.width}x${viewport.height}`;
    if (camKey !== this.lastCamKey) { this.camVer += 1; this.lastCamKey = camKey; }
    const pj = projector(camera, viewport) as Projector;
    const ctx: PaintCtx = { proj: pj, light: lightDir(pj) };
    const ver = `${this.camVer}s${this.styleVer}`;
    this.orderItems(entries);
    this.paintEntries(entries, ctx, ver);
  }

  private paintEntries(entries: Array<{ item: Item; face: Face | null; faceIndex: number }>, ctx: PaintCtx, version: string): void {
    for (let i = 0; i < entries.length;) {
      const item = entries[i]!.item;
      const end = this.itemEnd(entries, i, item);
      const binding = this.items.get(item.id);
      if (binding && (binding.lastItem !== item || binding.paintedVersion !== version))
        this.paintItemRun(binding, item, entries, i, end, version, ctx);
      i = end;
    }
  }

  private itemEnd(entries: Array<{ item: Item }>, start: number, item: Item): number {
    let end = start + 1;
    while (end < entries.length && entries[end]!.item === item) end += 1;
    return end;
  }

  private paintItemRun(binding: ItemBinding, item: Item, entries: Array<{ item: Item; face: Face | null; faceIndex: number }>, start: number, end: number, version: string, ctx: PaintCtx): void {
    // Every item's faces are contiguous in paintList. Mark and paint the full
    // run before considering the next item.
    binding.lastItem = item;
    binding.paintedVersion = version;
    if (item.kind !== 'solid') {
      this.paintEntry(entries[start]!, ctx);
      return;
    }
    const order = [];
    for (let j = start; j < end; j += 1) order.push(entries[j]!.faceIndex);
    this.setAttr(binding.g, 'display', item.visible === false ? 'none' : null);
    this.paintSolid(binding, item, order, ctx);
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
    if (item.kind === 'plane') this.paintPlane(b, item, ctx);
    else this.paintStroke(b, item, ctx);
    this.setAttr(b.g, 'display', item.visible === false ? 'none' : null);
  }

  /**
   * All drawn faces of one solid, grouped into one path per
   * (part|tone|style) bucket: faces inside a convex part can never overlap
   * and paint contiguously, so subpaths inside a bucket are order-free and
   * buckets only need part order. ~parts×fills paths replace ~faces paths.
   */
  private paintSolid(b: ItemBinding, item: Item, drawn: number[], ctx: PaintCtx): void {
    const buckets = new Map<string, { p: SVGPathElement; d: string[] }>();
    const bucketOf = new Map<number, string>();
    for (const fi of drawn) {
      const face = item.mesh.faces[fi];
      const { fill, opacity, st } = this.faceStyle(item, face, ctx);
      const tone = face.tone ?? item.tone ?? '';
      const key = faceBucketKey(face, tone, fill, opacity, st);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { p: this.bucketPath(b, key, fill, opacity, st, tone), d: [] };
        buckets.set(key, bucket);
      }
      bucket.d.push(this.facePath(item.mesh, fi, ctx));
      bucketOf.set(fi, key);
    }
    for (const bucket of buckets.values()) this.setAttr(bucket.p, 'd', bucket.d.join(''));
    for (const [k, p] of b.groups) if (!buckets.has(k)) this.setAttr(p, 'display', 'none');
    this.reorderSolid(b, item, drawn, bucketOf);
    this.paintHulls(item, b, drawn, ctx);
  }

  private bucketPath(
    b: ItemBinding, key: string, fill: string, opacity: string | null,
    st: { stroke: string; width: number; dash?: string }, tone: string,
  ): SVGPathElement {
    let p = b.groups.get(key);
    if (!p) {
      p = el('path') as SVGPathElement;
      p.setAttribute('data-face', '1');
      b.groups.set(key, p);
    }
    this.setAttr(p, 'fill', fill);
    this.setAttr(p, 'fill-opacity', opacity);
    this.setAttr(p, 'stroke', st.stroke);
    this.setAttr(p, 'stroke-width', st.width ? String(st.width) : null);
    this.setAttr(p, 'stroke-dasharray', st.dash ?? null);
    // Guards and DOM inspection read the tone to exempt glass/ghost fills.
    this.setAttr(p, 'data-tone', tone || null);
    this.setAttr(p, 'display', null);
    return p;
  }

  /**
   * Bucket paths + part hulls in paint order. Part faces are contiguous, so
   * each part's buckets land between its first face and its hull — placed
   * right after the part's last drawn face, like the per-face order before.
   */
  private reorderSolid(b: ItemBinding, item: Item, order: number[], bucketOf: Map<number, string>): void {
    const lastOf = new Map<number, number>();
    order.forEach((fi, i) => lastOf.set(item.mesh.faces[fi].part ?? 0, i));
    const seq: Element[] = [];
    const keys: string[] = [];
    const seen = new Set<string>();
    order.forEach((fi, i) => {
      const key = bucketOf.get(fi)!;
      if (!seen.has(key)) {
        seen.add(key);
        seq.push(b.groups.get(key)!);
        keys.push(key);
      }
      const part = item.mesh.faces[fi].part ?? 0;
      if (lastOf.get(part) === i) {
        const h = b.hulls.get(part);
        if (h) { seq.push(h); keys.push(`h${part}`); }
      }
    });
    if (this.lastSigsKey(b, 'faceorder', keys.join('|'))) return;
    const frag = document.createDocumentFragment();
    for (const e of seq) frag.appendChild(e);
    b.g.appendChild(frag);
  }

  /** Fill + stroke for one face; the ghost tint overrides both. */
  private faceStyle(item: Item, face: Face, ctx: PaintCtx): {
    fill: string; tint: boolean; opacity: string | null;
    st: { stroke: string; width: number; dash?: string };
  } {
    const tone = face.tone ?? item.tone;
    const tint = Boolean(tone === 'ghost' && item.tint);
    const fill = tint ? this.tokens.lit : faceFill(this.def, this.tokens, ctx, face, tone);
    // Ghost load: translucent accent. Glass: a 0.22 tint over the scene.
    const opacity = tint ? '0.15' : tone === 'glass' ? '0.22' : null;
    // Smooth (curved) facets get no ink edge stroke — the part silhouette
    // hull supplies the outline. They take a hairline stroke of their own
    // fill color to close anti-alias seams between facets.
    const st = face.smooth && !tint ? seamStroke(fill) : faceStroke(this.def, this.tokens, tone);
    return { fill, tint, opacity, st };
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
    this.syncPlanePrims(b, item.prims);
    const m = planeMatrixOf(ctx, item);
    if (b.planeG) this.setAttr(b.planeG, 'transform', m);
    for (const prim of item.prims) this.paintPrim(b, prim);
  }

  private syncPlanePrims(b: ItemBinding, prims: Prim[]): void {
    const keys = new Set(prims.map((prim) => prim.key));
    this.removeMissingPlanePrims(b, keys);
    for (const prim of prims) if (!b.prims.has(prim.key)) this.mountPlanePrim(b, prim);
    this.orderPlanePrims(b, prims);
  }

  private removeMissingPlanePrims(b: ItemBinding, keys: Set<string>): void {
    for (const [key, element] of b.prims) {
      if (keys.has(key)) continue;
      element.remove();
      b.prims.delete(key);
      b.lastSigs.delete(`prim-${key}`);
    }
  }

  private orderPlanePrims(b: ItemBinding, prims: Prim[]): void {
    const order = JSON.stringify(prims.map((prim) => prim.key));
    if (order === b.primOrder || !b.planeG) return;
    const fragment = document.createDocumentFragment();
    for (const prim of prims) fragment.appendChild(b.prims.get(prim.key)!);
    b.planeG.appendChild(fragment);
    b.primOrder = order;
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

  /** Contact halo under the cabinet: a soft blurred ink blob — subtle
   *  ground cue only. */
  paintHalo(e: SVGEllipseElement): void {
    e.setAttribute('fill', this.tokens.ink);
    e.setAttribute('fill-opacity', '0.08');
    e.setAttribute('filter', 'url(#fig-soft)');
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

function faceBucketKey(face: Face, tone: string, fill: string, opacity: string | null, stroke: { stroke: string; width: number; dash?: string }): string {
  return `${face.part ?? 0}|${tone}|${fill}|${opacity ?? ''}|${stroke.stroke}|${stroke.width}|${stroke.dash ?? ''}`;
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
  e.setAttribute('data-tone', prim.tone ?? 'mid');
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
  if (prim.font === 'code') return 'var(--mono, ui-monospace, monospace)';
  if (prim.font === 'math') return run.italic ? MATH_ITALIC : MATH_MAIN;
  return LABEL_FONT;
}

function updateText(e: SVGTextElement, prim: Prim, color: string, opacity: number): void {
  e.style.whiteSpace = prim.font === 'code' ? 'pre' : '';
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

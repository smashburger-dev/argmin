// Depth keys and painter's-order audit for figure items.
// Item kinds (all carry `id`, optional `visible` (default true), optional `on`
// (id of the supporting item), optional `bias` (default 0), optional `tone`):
//   (lo/mid/hi/lit/ghost/glass/board — 'board' stays smooth high-contrast
//   print in every style, never patterned or grained):
//   solid  { kind:'solid', id, mesh, tone, side? }   side 'back' draws only
//          faces pointing away (inner far wall of a glass jar)
//   plane  { kind:'plane', id, origin, ex, ey, size:[w,h], normal, prims }
//          flat content on a host face; hidden when `normal` faces away.
//          Prims are plane-local 2D (v down): text/line/arrow/grid/dot/rect,
//          each with a stable `key` and optional `visible` (default true) for
//          per-prim reveal/hide without breaking topology.
//   stroke { kind:'stroke', id, pts, tone, width, dash? }  world polyline

import { basis, dot, projector } from './camera.mjs';

/** @typedef {import('./camera.mjs').Vec3} Vec3 */
/** @typedef {import('./camera.mjs').Camera} Camera */
/** @typedef {import('./camera.mjs').Viewport} Viewport */

// Canonical viewport for order-overlap tests: a shared offset/scale keeps
// every part's projection consistent, only overlaps matter.
const ORDER_VIEW = { width: 0, height: 0 };

/**
 * Shared per-call camera context: basis vectors plus a projector closure, so
 * helpers never recompute trigonometry per point. Public functions build it
 * once and thread it through.
 */
function ctxFor(camera, viewport = ORDER_VIEW) {
  const { right, up, toward } = basis(camera);
  return { camera, viewport, right, up, toward, proj: projector(camera, viewport) };
}

/** @param {object} item @returns {Vec3} the point whose depth orders the item */
export function itemCenter(item) {
  if (item.kind === 'solid') return item.mesh.center;
  if (item.kind === 'plane') {
    const [w, h] = item.size;
    return [
      item.origin[0] + (w / 2) * item.ex[0] + (h / 2) * item.ey[0],
      item.origin[1] + (w / 2) * item.ex[1] + (h / 2) * item.ey[1],
      item.origin[2] + (w / 2) * item.ex[2] + (h / 2) * item.ey[2],
    ];
  }
  const c = [0, 0, 0];
  for (const p of item.pts) {
    c[0] += p[0] / item.pts.length;
    c[1] += p[1] / item.pts.length;
    c[2] += p[2] / item.pts.length;
  }
  return c;
}

/**
 * Paint key: depth of the item's key point plus bias, raised recursively to
 * just above the host's key (key = max(own, key(host) + 1e-4)), so a guest
 * strictly sorts after its host for any comparator — the +1e-4 accumulates
 * to a still-negligible 1e-3 over a ten-deep on-chain. An item may carry
 * `keyPoint` (Vec3) to override its center for ordering — a tall item
 * should anchor at its footprint.
 * @param {object} item @param {Camera} camera @param {Map<string, object>} byId
 * @returns {number}
 */
export function itemKey(item, camera, byId, ctx = ctxFor(camera)) {
  const own = ownDepth(item, ctx);
  const host = item.on !== undefined ? byId.get(item.on) : undefined;
  if (!host) return own;
  return Math.max(own, itemKey(host, camera, byId, ctx) + 1e-4);
}

function ownDepth(item, ctx) {
  const c = item.keyPoint || itemCenter(item);
  const t = ctx.camera.target;
  return dot([c[0] - t[0], c[1] - t[1], c[2] - t[2]], ctx.toward)
    + (item.bias || 0);
}

/**
 * Depth of a face's NEAREST point to the viewer. Centroid ordering mispaints
 * when a large face spans a deep range (a slab's top covering a leg that
 * tucks under its near edge): the face that reaches closest must paint last.
 */
function nearDepth(face, toward) {
  let d = -Infinity;
  for (const p of face.pts) d = Math.max(d, dot(p, toward));
  return d;
}

/**
 * Cross-tick caches keyed on the view DIRECTION: the projection is
 * orthographic, so zoom, target and viewport scale/translate the screen
 * plane uniformly and every cover relation and paint order is a pure
 * function of (mesh or item, azimuth, elevation). Static scene meshes and
 * items keep identity between frames, so these hits are frequent whenever
 * the camera repeats a direction (settled beats, wobble-free drags).
 */
const dirKey = (camera) => `${Math.round(camera.azimuth * 1e4)}|${Math.round(camera.elevation * 1e4)}`;
const faceOrderCache = new WeakMap(); // mesh -> { key, order }
const coverCache = new WeakMap();     // item -> { key, box, covers }
const faceIndexCache = new WeakMap(); // mesh -> Map(face -> face index)

/**
 * Within-item painter order, far to near. Faces of one convex primitive can
 * never overlap, so ordering is decided per PART (each primitive inside a
 * compound, tagged on `face.part` by compound()): two parts are compared at
 * every point where their viewer-facing faces overlap, using the same true
 * ray depth the oracle measures — no scalar depth key can express "lid
 * above the glass" or "wall top occluding the floor behind it". Pairwise
 * results give a constraint graph resolved by topological order, so a part
 * can sit between a nearer and a farther neighbour; parts that never
 * overlap keep construction order. Faces inside one part sort by near
 * depth for determinism only; their relative order is free anyway.
 * @param {import('./solids.mjs').Mesh} mesh @param {Camera} camera
 */
export function sortFaces(mesh, camera, ctx = ctxFor(camera)) {
  const key = dirKey(camera);
  const hit = faceOrderCache.get(mesh);
  if (hit?.key === key) return hit.order;
  const order = faceOrder(mesh, ctx);
  faceOrderCache.set(mesh, { key, order });
  return order;
}

function faceOrder(mesh, ctx) {
  const { toward } = ctx;
  const byPart = new Map();
  mesh.faces.forEach((face, index) => {
    const key = face.part ?? 0;
    if (!byPart.has(key)) byPart.set(key, { key, entries: [], covers: null });
    byPart.get(key).entries.push({ face, index });
  });
  const parts = [...byPart.values()];
  // Covers cost one projection per face: only multi-part meshes need them —
  // the faces of a single convex part can never overlap. The aggregate box
  // of each part's covers rejects most part pairs without a face loop.
  const order = parts.length === 1 ? [0] : pairwiseOrder(parts.length, (i, j) => {
    const a = partCovers(parts[i], ctx);
    const b = partCovers(parts[j], ctx);
    if (!a.box || !b.box || !boxOverlap(a.box, b.box)) return 0;
    return coverCmp(a.list, b.list, ctx);
  });
  return order.flatMap((pi) => parts[pi].entries
    .sort((a, b) => (nearDepth(a.face, toward) - nearDepth(b.face, toward)) || (a.index - b.index))
    .map((e) => e.face));
}

function partCovers(part, ctx) {
  if (!part.covers) {
    const list = [];
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const { face } of part.entries) {
      if (dot(face.normal, ctx.toward) <= 1e-6) continue;
      const c = faceCover(face, ctx);
      list.push(c);
      box[0] = Math.min(box[0], c.box[0]); box[1] = Math.min(box[1], c.box[1]);
      box[2] = Math.max(box[2], c.box[2]); box[3] = Math.max(box[3], c.box[3]);
    }
    part.covers = { list, box: list.length ? box : null };
  }
  return part.covers;
}

/** Bounding box of a flat projected polygon [x0,y0,x1,y1,...]: [x0, y0, x1, y1]. */
function polyBox(poly) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < poly.length; i += 2) {
    b[0] = Math.min(b[0], poly[i]); b[1] = Math.min(b[1], poly[i + 1]);
    b[2] = Math.max(b[2], poly[i]); b[3] = Math.max(b[3], poly[i + 1]);
  }
  return b;
}

/** Screen-space cover polygon (flat [x,y,...]) plus plane anchors of one face. */
function faceCover(face, ctx) {
  const poly = new Array(face.pts.length * 2);
  for (let i = 0; i < face.pts.length; i += 1) {
    const [x, y] = ctx.proj(face.pts[i]);
    poly[i * 2] = x; poly[i * 2 + 1] = y;
  }
  return { poly, box: polyBox(poly), f0: face.pts[0], n: face.normal };
}

/**
 * Exact polygon intersection for pairwise part ordering: Sutherland–Hodgman
 * clip of `subject` by the convex `clip` polygon (faces are convex), on flat
 * [x,y,...] coordinate arrays — no per-vertex pairs to allocate. The
 * centroid of the result is a pixel covered by both faces — no sampling can
 * miss a thin overlap band.
 */
function polyClip(subject, clip) {
  const sense = polyArea(clip) < 0 ? -1 : 1;
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i += 2) {
    const ax = clip[i]; const ay = clip[i + 1];
    const bi = (i + 2) % clip.length;
    const bx = clip[bi]; const by = clip[bi + 1];
    const ex = bx - ax; const ey = by - ay;
    const next = [];
    for (let j = 0; j < out.length; j += 2) {
      const px = out[j]; const py = out[j + 1];
      const qi = (j + 2) % out.length;
      const qx = out[qi]; const qy = out[qi + 1];
      const pin = sense * (ex * (py - ay) - ey * (px - ax));
      const qin = sense * (ex * (qy - ay) - ey * (qx - ax));
      if (pin >= 0) next.push(px, py);
      if ((pin >= 0) !== (qin >= 0)) {
        const t = pin / (pin - qin);
        next.push(px + t * (qx - px), py + t * (qy - py));
      }
    }
    out = next;
  }
  return out;
}

function polyArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i += 2) {
    const j = (i + 2) % poly.length;
    s += poly[i] * poly[j + 1] - poly[j] * poly[i + 1];
  }
  return s / 2;
}

/** Average of polygon vertices — inside the (convex) intersection. */
function polyCentroid(poly) {
  let x = 0; let y = 0;
  for (let i = 0; i < poly.length; i += 2) { x += poly[i]; y += poly[i + 1]; }
  const n = poly.length / 2;
  return [x / n, y / n];
}

/**
 * Pairwise order of two cover sets: < 0 when a paints first. For every pair
 * of covers (one per side) whose screen polygons truly intersect, the two
 * surfaces' ray depths are compared at the intersection's centroid — the
 * same test the oracle applies — and the depth differences are summed, so
 * the dominant relation wins over an atypical corner overlap. Sets whose
 * projections never overlap compare 0. A genuinely cyclic pair (nearer here,
 * farther there) cannot be resolved by any order — that is a geometry
 * defect, and the oracle will report it.
 */
function coverCmp(ca, cb, ctx) {
  let votes = 0;
  for (const fa of ca) {
    for (const fb of cb) {
      // Most cover pairs never touch on screen; the box precheck keeps the
      // exact clip for the pairs that can actually vote.
      if (!boxOverlap(fa.box, fb.box)) continue;
      const inter = polyClip(fa.poly, fb.poly);
      if (inter.length < 6 || Math.abs(polyArea(inter)) < 1e-4) continue;
      const [sx, sy] = polyCentroid(inter);
      const sa = rayDepth(sx, sy, fa, ctx);
      const sb = rayDepth(sx, sy, fb, ctx);
      if (sa !== null && sb !== null) votes += Math.sign(sa - sb) * Math.min(Math.abs(sa - sb), 1);
    }
  }
  return votes;
}

/**
 * Kahn topological order over `n` nodes with `before[i]` = set of nodes
 * that must paint after i. Ties keep the input order, so unconstrained
 * nodes stay in their seed order. A genuine cycle (paradoxical overlap —
 * a geometry defect) leaves its nodes appended in input order; the oracle
 * reports them.
 * @param {number} n @param {Array<Set<number>>} before
 * @returns {number[]}
 */
function topoOrder(n, before) {
  const indeg = before.map((s, i) => {
    let d = 0;
    for (let j = 0; j < n; j += 1) if (j !== i && before[j].has(i)) d += 1;
    return d;
  });
  const remaining = new Set();
  for (let i = 0; i < n; i += 1) remaining.add(i);
  const out = [];
  while (remaining.size) {
    let pick = -1;
    for (const i of remaining) { if (indeg[i] === 0) { pick = i; break; } }
    if (pick < 0) { out.push(...remaining); break; } // cycle: keep seed order
    out.push(pick);
    remaining.delete(pick);
    for (const j of before[pick]) indeg[j] -= 1;
  }
  return out;
}

/**
 * Order `nodes` by pairwise `cmp`: edge i→j when cmp says i paints first.
 * `cmp(i, j)` follows the same sign convention as coverCmp.
 * @param {number} n @param {(i: number, j: number) => number} cmp
 */
function pairwiseOrder(n, cmp) {
  const before = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const c = cmp(i, j);
      if (c < 0) before[i].add(j);
      else if (c > 0) before[j].add(i);
    }
  }
  return topoOrder(n, before);
}

/** Far to near, stable. @param {object[]} items @param {Camera} camera */
export function sortItems(items, camera, ctx = ctxFor(camera)) {
  const byId = new Map(items.map((it) => [it.id, it]));
  const keys = new Map(items.map((it) => [it.id, itemKey(it, camera, byId, ctx)]));
  const own = new Map(items.map((it) => [it.id, ownDepth(it, ctx)]));
  return [...items].sort((a, b) => {
    if (a.on === b.id) return 1; // a rests on b: a paints after
    if (b.on === a.id) return -1;
    const dk = keys.get(a.id) - keys.get(b.id);
    return dk || (own.get(a.id) - own.get(b.id));
  });
}

/** Covers of an item's drawn surfaces, or [] for strokes/hidden items. */
function itemCovers(item, ctx) {
  if (item.kind === 'plane') {
    if (dot(item.normal, ctx.toward) <= 1e-6) return [];
    const poly = rectPoly(item, ctx);
    return [{ poly, box: polyBox(poly), n: item.normal, f0: item.origin, bias: 0 }];
  }
  if (item.kind !== 'solid' || !item.mesh) return [];
  const back = item.side === 'back';
  const covers = [];
  for (const face of item.mesh.faces) {
    const d = dot(face.normal, ctx.toward);
    if (back ? d > -1e-6 : d <= 1e-6) continue;
    covers.push(faceCover(face, ctx));
  }
  return covers;
}

/**
 * Projected bound of an item without touching its faces: the mesh's eight
 * bounds corners suffice — the projection is affine, so every face point
 * lands inside the corners' screen box. null when the item can never
 * overpaint (stroke, hidden, plane facing away).
 */
function itemBox(item, ctx) {
  if (item.kind === 'plane') {
    if (dot(item.normal, ctx.toward) <= 1e-6) return null;
    return polyBox(rectPoly(item, ctx));
  }
  if (item.kind !== 'solid' || !item.mesh) return null;
  const { min, max } = item.mesh;
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) {
        const [sx, sy] = ctx.proj([x, y, z]);
        b[0] = Math.min(b[0], sx); b[1] = Math.min(b[1], sy);
        b[2] = Math.max(b[2], sx); b[3] = Math.max(b[3], sy);
      }
    }
  }
  return b;
}

const boxOverlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Item order for painting: the key sort (depth key + on-chains) is the
 * base, then every pair whose projected surfaces overlap is compared the
 * way the oracle compares it and the item is moved before the earliest
 * entry it must precede. Only real screen overlap can reorder items —
 * non-overlapping pairs keep key order, so on-relations and biases stay in
 * charge wherever geometry does not decide.
 */
function orderedItems(items, camera, ctx = ctxFor(camera)) {
  // Item boxes come from the mesh bounds (8 projections each); the full
  // per-face covers are computed lazily, only for pairs whose boxes overlap.
  // Both are memoized per (item identity, view direction): static items
  // keep their box and covers across frames until the camera turns.
  const key = dirKey(camera);
  const recordOf = (it) => {
    const hit = coverCache.get(it);
    if (hit?.key === key) return hit;
    const rec = { key, box: itemBox(it, ctx), covers: null };
    coverCache.set(it, rec);
    return rec;
  };
  const coversOf = (it) => {
    const rec = recordOf(it);
    if (rec.covers === null) rec.covers = itemCovers(it, ctx);
    return rec.covers;
  };
  const boxes = new Map(items.map((it) => [it, it.visible === false ? null : recordOf(it).box]));
  const out = pairwiseOrder(items.length, (i, j) => {
    const ba = boxes.get(items[i]);
    const bb = boxes.get(items[j]);
    if (!ba || !bb || !boxOverlap(ba, bb)) return 0;
    return coverCmp(
      items[i].visible === false ? [] : coversOf(items[i]),
      items[j].visible === false ? [] : coversOf(items[j]),
      ctx,
    );
  });
  // on-relations are hard constraints: a guest always paints after its host
  // even where their projections do not overlap (the key sort seeds it, a
  // plane coplanar with its host votes ~0 and leaves it alone).
  return enforceOnOrder(out.map((i) => items[i]));
}

/** Move every guest that ended up before its host to just after the host. */
function enforceOnOrder(ordered) {
  const out = [...ordered];
  for (const it of ordered) {
    if (it.on === undefined) continue;
    const host = out.find((h) => h.id === it.on);
    if (!host || out.indexOf(it) > out.indexOf(host)) continue;
    out.splice(out.indexOf(it), 1);
    out.splice(out.indexOf(host) + 1, 0, it);
  }
  return out;
}

/**
 * The one paint order for renderer and oracle: items far to near via
 * sortItems, corrected by real screen overlap (orderedItems); each solid
 * expands to its drawn faces (culled by `side`), compound faces in
 * sortFaces part order. Entries: { item, face, faceIndex } — faceIndex is
 * the face's index in item.mesh.faces (stable for renderer bindings);
 * planes and strokes are single entries with face null / faceIndex -1.
 * @param {object[]} items @param {Camera} camera
 */
export function paintList(items, camera) {
  const ctx = ctxFor(camera);
  const out = [];
  for (const item of orderedItems(sortItems(items, camera, ctx), camera, ctx)) {
    if (item.kind !== 'solid') {
      out.push({ item, face: null, faceIndex: -1 });
      continue;
    }
    const drawnSet = new Set();
    for (const f of item.mesh.faces) {
      const d = dot(f.normal, ctx.toward);
      if (item.side === 'back' ? d < -1e-6 : d > 1e-6) drawnSet.add(f);
    }
    // face -> index map depends on the mesh alone: one per mesh, forever.
    let faceIndex = faceIndexCache.get(item.mesh);
    if (!faceIndex) {
      faceIndex = new Map(item.mesh.faces.map((f, i) => [f, i]));
      faceIndexCache.set(item.mesh, faceIndex);
    }
    for (const face of sortFaces(item.mesh, camera, ctx)) {
      if (!drawnSet.has(face)) continue;
      out.push({ item, face, faceIndex: faceIndex.get(face) });
    }
  }
  return out;
}

/**
 * Per-item paint steps for renderer and silhouette outlines: the drawn
 * face indices in paint order, with each compound part's hull step placed
 * right after that part's LAST drawn face. Nearer parts of the same item
 * then still overpaint an earlier part's outline — a heap's silhouette
 * must never draw through the bin's front wall (grouping all hulls after
 * every face reads as a wireframe).
 * @param {number[]} order face indices, far to near (from paintList)
 * @param {(faceIndex: number) => number} partOf
 * @returns {Array<{ faceIndex: number } | { hullPart: number }>}
 */
export function faceSteps(order, partOf) {
  const lastOf = new Map();
  order.forEach((fi, i) => lastOf.set(partOf(fi), i));
  const steps = [];
  order.forEach((fi, i) => {
    steps.push({ faceIndex: fi });
    const pk = partOf(fi);
    if (lastOf.get(pk) === i) steps.push({ hullPart: pk });
  });
  return steps;
}

/**
 * Which paint-list surfaces cover a given screen point, in paint order.
 * Returns `{ id, s }` hits: the item id plus the true ray depth at the
 * sample, so a caller can tell a nearer occluder from a covered back face.
 * @param {object[]} items @param {Camera} camera @param {Viewport} viewport
 */
export function coveringAt(items, camera, viewport, sx, sy) {
  const ctx = ctxFor(camera, viewport);
  const hits = [];
  paintList(items, camera).forEach((entry) => {
    if (entry.item.visible === false) return;
    const en = coverEntry(entry, ctx);
    if (!en || !pointInPoly(sx, sy, en.poly)) return;
    hits.push({ id: entry.item.id, s: rayDepth(sx, sy, en, ctx) });
  });
  return hits;
}

/** Even-odd point-in-polygon in screen space; poly is flat [x,y,...]. */
function pointInPoly(x, y, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const xi = poly[i]; const yi = poly[i + 1];
    const xj = poly[j]; const yj = poly[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Screen polygon of a plane item's rect under the given projection (flat). */
function rectPoly(item, ctx) {
  const [w, h] = item.size;
  const o = item.origin;
  const corners = [
    o,
    [o[0] + w * item.ex[0], o[1] + w * item.ex[1], o[2] + w * item.ex[2]],
    [
      o[0] + w * item.ex[0] + h * item.ey[0],
      o[1] + w * item.ex[1] + h * item.ey[1],
      o[2] + w * item.ex[2] + h * item.ey[2],
    ],
    [o[0] + h * item.ey[0], o[1] + h * item.ey[1], o[2] + h * item.ey[2]],
  ];
  const poly = new Array(8);
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = ctx.proj(corners[i]);
    poly[i * 2] = x; poly[i * 2 + 1] = y;
  }
  return poly;
}

/**
 * Covering surface of one paintList entry as { poly, f0, n }: projected
 * screen polygon (flat) plus the surface's world anchor point and normal.
 * Solid entries map to their single face, planes to their rect, strokes
 * to none.
 */
function coverEntry(entry, ctx) {
  const item = entry.item;
  if (item.kind === 'plane') {
    if (dot(item.normal, ctx.toward) <= 1e-6) return null;
    return { poly: rectPoly(item, ctx), f0: item.origin, n: item.normal };
  }
  if (item.kind !== 'solid' || !entry.face) return null;
  return { poly: facePoly(entry.face, ctx), f0: entry.face.pts[0], n: entry.face.normal };
}

/** Flat screen polygon of one face. */
function facePoly(face, ctx) {
  const poly = new Array(face.pts.length * 2);
  for (let i = 0; i < face.pts.length; i += 1) {
    const [x, y] = ctx.proj(face.pts[i]);
    poly[i * 2] = x; poly[i * 2 + 1] = y;
  }
  return poly;
}

/** True ray depth at a screen point through a face plane. */
function rayDepth(sx, sy, entry, ctx) {
  const { camera, viewport, right, up, toward } = ctx;
  const rx = (sx - viewport.width / 2) / camera.zoom;
  const ry = (viewport.height / 2 - sy) / camera.zoom;
  const q = [
    camera.target[0] + rx * right[0] + ry * up[0],
    camera.target[1] + rx * right[1] + ry * up[1],
    camera.target[2] + rx * right[2] + ry * up[2],
  ];
  const denom = dot(toward, entry.n);
  if (Math.abs(denom) < 1e-9) return null;
  return dot([entry.f0[0] - q[0], entry.f0[1] - q[1], entry.f0[2] - q[2]], entry.n) / denom;
}

/**
 * Test oracle: sample the viewport on a step-px grid; at each sample collect
 * the visible solid/plane items covering it and compute true ray depth per
 * covering face. If a nearer item (by more than `tolerance` world units) is
 * painted earlier than a farther covering item, report the pair once as
 * { front, behind, at: [sx, sy], gap }. A plane and its `on` host are exempt
 * (coplanar). Strokes are ignored.
 * @param {object[]} items @param {Camera} camera @param {Viewport} viewport
 * @param {{ step?: number, tolerance?: number }} [opts]
 * @returns {Array<{ front: string, behind: string, at: [number, number], gap: number }>}
 */
export function paintOrderErrors(items, camera, viewport, { step = 4, tolerance = 0.05 } = {}) {
  const ctx = { ...ctxFor(camera, viewport), step };
  const cells = new Map();
  paintList(items, camera).forEach((entry, order) => {
    if (entry.item.visible === false) return;
    const en = coverEntry(entry, ctx);
    if (en) stampEntry(cells, { order, it: entry.item, faceIndex: entry.faceIndex }, en, ctx);
  });
  return collectErrors(cells, tolerance);
}

/** Stamp one covering surface into the sample cells it covers. */
function stampEntry(cells, e, en, ctx) {
  const { step, viewport } = ctx;
  const xs = [];
  const ys = [];
  for (let i = 0; i < en.poly.length; i += 2) { xs.push(en.poly[i]); ys.push(en.poly[i + 1]); }
  const x0 = Math.max(Math.floor(Math.min(...xs) / step), 0);
  const x1 = Math.min(Math.floor(Math.max(...xs) / step), Math.ceil(viewport.width / step));
  const y0 = Math.max(Math.floor(Math.min(...ys) / step), 0);
  const y1 = Math.min(Math.floor(Math.max(...ys) / step), Math.ceil(viewport.height / step));
  for (let ix = x0; ix <= x1; ix += 1) {
    for (let iy = y0; iy <= y1; iy += 1) {
      const sx = ix * step + step / 2;
      const sy = iy * step + step / 2;
      if (sx >= viewport.width || sy >= viewport.height) continue;
      if (!pointInPoly(sx, sy, en.poly)) continue;
      const s = rayDepth(sx, sy, en, ctx);
      if (s === null) continue;
      const key = `${ix},${iy}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ order: e.order, it: e.it, faceIndex: e.faceIndex, s, at: [sx, sy] });
    }
  }
}

/** Paint-list entry label: item id plus the face index for solid faces. */
const entryId = (h) => (h.faceIndex >= 0 ? `${h.it.id}#${h.faceIndex}` : h.it.id);

/**
 * If surface a paints earlier than b yet is genuinely nearer at this sample,
 * b wrongly overpaints a: return the error, else null. A plane and its `on`
 * host are exempt (coplanar). Faces within one item are checked too —
 * compounds interleave and a wrong face order is a real defect.
 */
function pairError(a, b, tolerance) {
  if (a.it === b.it && a.faceIndex === b.faceIndex) return null;
  if (b.order <= a.order) return null;
  if (a.it.kind === 'plane' && a.it.on === b.it.id) return null;
  if (b.it.kind === 'plane' && b.it.on === a.it.id) return null;
  if (a.s <= b.s + tolerance) return null;
  return { front: entryId(a), behind: entryId(b), at: a.at, gap: a.s - b.s };
}

function collectErrors(cells, tolerance) {
  const seen = new Set();
  const errors = [];
  for (const hits of cells.values()) {
    for (const a of hits) {
      for (const b of hits) {
        const err = pairError(a, b, tolerance);
        if (!err) continue;
        const id = `${err.front}>${err.behind}`;
        if (seen.has(id)) continue;
        seen.add(id);
        errors.push(err);
      }
    }
  }
  return errors;
}

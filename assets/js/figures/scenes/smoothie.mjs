// Spike scene "Smoothie mischen" for lesson l-linalg-systems.
// Pure model + pose + item builder; the Preact renderer binds in a later layer.
// The model doubles as the future scene-build grader: portions in, hit/diff out.

import { deg, ISO, fitZoom } from '../kit/camera.mjs';
import { box, cylinder, transformMesh, compound, newellNormal } from '../kit/solids.mjs';
import { span, burst } from '../kit/motion.mjs';

export const id = 'smoothie-column-picture';
export const beatIds = ['ingredients', 'oats', 'predict', 'berries', 'board', 'ghost'];
export const hintBeatIds = ['ingredients', 'oats', 'board', 'ghost'];

export function hintParams(familyId, parameters) {
  if (familyId !== 'transform-system-2x2-elimination' || !parameters?.A) return null;
  const { A, b } = parameters;
  const a1 = A.map((row) => row[0]);
  const a2 = A.map((row) => row[1]);
  return { a1, a2, b, ghost: a1.map((v, i) => -v + a2[i]) };
}

const DURATIONS = { ingredients: 1.2, oats: 2.4, predict: 0.8, berries: 3.6, board: 2.2, ghost: 4.0 };

const FOCUS = {
  ingredients: 'ingredients',
  oats: 'oats',
  predict: 'target',
  berries: 'berries',
  board: 'equation',
  ghost: 'ghost',
};

// --- exact rationals ---------------------------------------------------------

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** @param {number} n @param {number} d @returns {{ n: number, d: number }} reduced, d > 0 */
export function frac(n, d) {
  if (d === 0) throw new Error('fraction with denominator 0');
  const nn = d < 0 ? -n : n;
  const dd = Math.abs(d);
  const g = gcd(Math.abs(nn), dd) || 1;
  return { n: nn / g, d: dd / g };
}

/** German display: integers plain, else "a/b", negative with U+2212. @returns {string} */
export function formatFrac(f) {
  const sign = f.n < 0 ? '−' : '';
  const a = Math.abs(f.n);
  return f.d === 1 ? `${sign}${a}` : `${sign}${a}/${f.d}`;
}

const fracNum = (f) => f.n / f.d;

// --- model --------------------------------------------------------------------

const isVec = (v) => Array.isArray(v) && v.length === 2 && v.every((c) => Number.isInteger(c) && Math.abs(c) <= 6);

const cramer = (a1, a2, rhs, det) => [
  frac(rhs[0] * a2[1] - rhs[1] * a2[0], det),
  frac(a1[0] * rhs[1] - a1[1] * rhs[0], det),
];

/**
 * @param {{ a1: number[], a2: number[], b: number[], ghost: number[] }} params
 * integer 2-vectors in [-6, 6]; det != 0; the b-solution is non-negative
 * integers <= 3 (countable scoops); the ghost solution has exactly one
 * negative component.
 */
export function validateParams(params, { mode = 'lesson' } = {}) {
  if (mode === 'hint') return validateHintParams(params);
  for (const name of ['a1', 'a2', 'b', 'ghost']) {
    if (!isVec(params[name])) throw new Error(`params.${name} must be an integer 2-vector in [-6, 6]`);
  }
  const { a1, a2, b, ghost } = params;
  const det = a1[0] * a2[1] - a1[1] * a2[0];
  if (det === 0) throw new Error('params: a1 and a2 are collinear (det = 0)');
  validateLessonPortions(a1, a2, b, ghost, det);
}

function validateLessonPortions(a1, a2, b, ghost, det) {
  const x = cramer(a1, a2, b, det);
  for (const f of x) {
    if (f.d !== 1 || f.n < 0 || f.n > 3) throw new Error('params.b must yield non-negative integer portions <= 3');
  }
  if (x[0].n + x[1].n < 1) throw new Error('params.b must require at least one portion');
  const xg = cramer(a1, a2, ghost, det);
  const negatives = xg.filter((f) => f.n < 0).length;
  if (negatives !== 1) throw new Error('params.ghost must yield exactly one negative component');
}

/**
 * @returns {{ a1: number[], a2: number[], b: number[], ghost: number[], det: number,
 *   x: [Frac, Frac], xGhost: [Frac, Frac] }}
 */
export function model(params, options = {}) {
  validateParams(params, options);
  const { a1, a2, b, ghost } = params;
  const det = a1[0] * a2[1] - a1[1] * a2[0];
  return {
    a1: [...a1], a2: [...a2], b: [...b], ghost: [...ghost], det,
    x: cramer(a1, a2, b, det),
    xGhost: cramer(a1, a2, ghost, det),
  };
}

/**
 * Future scene-build grader: mix = p1*a1 + p2*a2, diff = target - mix.
 * @returns {{ hit: boolean, mix: number[], diff: number[] }}
 */
export function evaluate(m, portions, target = m.b) {
  const mix = [
    portions[0] * m.a1[0] + portions[1] * m.a2[0],
    portions[0] * m.a1[1] + portions[1] * m.a2[1],
  ];
  const diff = [target[0] - mix[0], target[1] - mix[1]];
  return { hit: Math.abs(diff[0]) <= 1e-9 && Math.abs(diff[1]) <= 1e-9, mix, diff };
}

/** @returns {number} the predicted value for the predict beat (x2) */
export function predictValue(m, beatId) {
  if (beatId !== 'predict') throw new Error(`predictValue: no prediction on beat ${beatId}`);
  return fracNum(m.x[1]);
}

/** @returns {number[]} values a hint figure must never display */
export function answerValues(m) {
  return [fracNum(m.x[0]), fracNum(m.x[1])];
}

/**
 * Every integer a caption may mention: vector components, portion counts and
 * solution values, arrow endpoints and intermediate sums, and every tick
 * label inside the displayed axis range. The compiler checks authored
 * captions against this set so a typo in a number fails the build.
 * @returns {number[]}
 */
export function displayNumbers(m) {
  const exact = new Set([0, 1, 2, 3]); // origin, indices a1/a2/x1/x2, portion marks
  const xs = [];
  const ys = [];
  for (const v of [m.a1, m.a2, m.b, m.ghost]) {
    exact.add(v[0]); exact.add(v[1]);
    xs.push(v[0]); ys.push(v[1]);
  }
  for (const f of [m.x[0], m.x[1], m.xGhost[0], m.xGhost[1]]) {
    exact.add(f.n); exact.add(f.d); exact.add(fracNum(f)); exact.add(Math.abs(f.n));
  }
  // arrow endpoints and intermediate sums shown on the board
  const x1 = fracNum(m.x[0]);
  const g1 = fracNum(m.xGhost[0]);
  const ends = [
    [0, 0],
    [x1 * m.a1[0], x1 * m.a1[1]],
    [m.a1[0] + m.a2[0], m.a1[1] + m.a2[1]],
    m.b,
    [g1 * m.a1[0], g1 * m.a1[1]],
    m.ghost,
  ];
  for (const e of ends) {
    xs.push(e[0]); ys.push(e[1]);
    if (Number.isInteger(e[0])) exact.add(e[0]);
    if (Number.isInteger(e[1])) exact.add(e[1]);
  }
  const loX = Math.floor(Math.min(...xs));
  const hiX = Math.ceil(Math.max(...xs));
  const loY = Math.floor(Math.min(...ys));
  const hiY = Math.ceil(Math.max(...ys));
  for (let i = loX; i <= hiX; i += 1) exact.add(i);
  for (let i = loY; i <= hiY; i += 1) exact.add(i);
  return [...exact];
}

/** @param {string} beatId @returns {number} seconds, all beats <= 4 */
export function beatDuration(beatId) {
  const d = DURATIONS[beatId];
  if (d === undefined) throw new Error(`unknown beat ${beatId}`);
  return d;
}

// --- pose -----------------------------------------------------------------------

const REST_SCOOP = { container: null, ghost: false, phase: 0, tip: 0, pour: 0 };

const tipOf = (ph) => span(ph, 0.58, 0.72) - span(ph, 0.8, 0.9);

/** n scoop cycles packed into one beat; amount = continuously poured portions. */
function pourBeat(container, n, t, dur) {
  const total = Math.min(t / dur, 1) * n;
  const idx = Math.floor(total);
  const ph = total - idx;
  if (idx >= n || ph <= 0) return { amount: Math.min(idx, n), scoop: REST_SCOOP };
  const scoop = { container, ghost: false, phase: ph, tip: tipOf(ph), pour: span(ph, 0.62, 0.84) };
  return { amount: idx + scoop.pour, scoop };
}

/**
 * Ghost beat (k = t/dur): 0-0.12 the jar empties and the real arrows fade;
 * 0.12-0.40 a ghost scoop carries the negative portion out of the empty jar
 * back to the oat bin; 0.40-0.92 full scoops plus one fractional scoop of
 * berries land in the jar. Portions run x1->g1 and x2->g2; the liquid shows
 * only real content (never the negative part).
 */
function ghostBeat(m, k) {
  const x1 = fracNum(m.x[0]);
  const x2 = fracNum(m.x[1]);
  const g1 = fracNum(m.xGhost[0]);
  const g2 = fracNum(m.xGhost[1]);
  const empty = span(k, 0, 0.12);
  const gph = span(k, 0.12, 0.4);
  const gPour = span(gph, 0.62, 0.84);
  const b = ghostPours(span(k, 0.4, 0.86), g2);
  const pOats = x1 * (1 - empty) + g1 * gPour;
  const pBerries = x2 * (1 - empty) + b.amount;
  const liquid = Math.max(0, (x1 + x2) * (1 - empty) + b.amount) / (x1 + x2);
  let scoop = REST_SCOOP;
  if (gph > 0 && gph < 1) {
    scoop = { container: 'oats', ghost: true, phase: gph, tip: tipOf(gph), pour: gPour, loadFrac: 1 };
  } else if (b.active) {
    scoop = { container: 'berries', ghost: false, phase: b.ph, tip: tipOf(b.ph), pour: b.pour, loadFrac: b.size };
  } else if (k >= 0.86) {
    // The teaching moment stays visible at rest: the ghost scoop glides to a
    // hold above the oat bin, tips and keeps its impossible load.
    const h = span(k, 0.86, 1);
    scoop = {
      container: 'oats', ghost: true, hold: true, phase: h,
      tip: 0.8 * span(h, 0.72, 1), pour: 0.8, loadFrac: Math.max(span(h, 0.25, 0.6), 0.02),
    };
  }
  return { pOats, pBerries, liquid, scoop };
}

/** Full scoops plus one trailing fractional scoop for a fractional target. */
function ghostPours(k, amount) {
  const nFull = Math.floor(amount + 1e-9);
  const lastFrac = amount - nFull;
  const n = Math.max(nFull + (lastFrac > 1e-9 ? 1 : 0), 1);
  const per = 1 / n;
  const i = Math.min(Math.floor(k / per), n - 1);
  const ph = Math.min(k / per - i, 1);
  const pour = span(ph, 0.62, 0.84);
  const size = i < nFull ? 1 : lastFrac;
  return {
    ph, pour, size,
    amount: Math.min(i, nFull) + size * pour,
    active: k > 0 && k < 1,
  };
}

/** Board arrows for both targets; progress 0..1 per arrow, tip to tail. */
function boardArrows(m, pOats, pBerries, ghostK) {
  const x1 = fracNum(m.x[0]);
  const x2 = fracNum(m.x[1]);
  const [a1x, a1y] = m.a1;
  const [a2x, a2y] = m.a2;
  const arrows = [];
  const keep = 1 - span(ghostK, 0, 0.18);
  for (let j = 0; j < x1; j += 1) {
    arrows.push({
      id: `a1-${j}`, vec: 'a1', count: j + 1, frac: null,
      from: [j * a1x, j * a1y], to: [(j + 1) * a1x, (j + 1) * a1y],
      progress: Math.min(Math.max(pOats - j, 0), 1) * keep, tone: 'a1',
    });
  }
  for (let j = 0; j < x2; j += 1) {
    arrows.push({
      id: `a2-${j}`, vec: 'a2', count: j + 1, frac: null,
      from: [x1 * a1x + j * a2x, x1 * a1y + j * a2y],
      to: [x1 * a1x + (j + 1) * a2x, x1 * a1y + (j + 1) * a2y],
      progress: Math.min(Math.max(pBerries - j, 0), 1) * keep, tone: 'a2',
    });
  }
  const g1 = fracNum(m.xGhost[0]);
  const g2 = fracNum(m.xGhost[1]);
  arrows.push({
    id: 'g1', vec: 'a1', count: null, frac: m.xGhost[0],
    from: [0, 0], to: [g1 * a1x, g1 * a1y],
    progress: span(ghostK, 0.12, 0.36), tone: 'ghost',
  });
  arrows.push({
    id: 'g2', vec: 'a2', count: null, frac: m.xGhost[1],
    from: [g1 * a1x, g1 * a1y], to: [g1 * a1x + g2 * a2x, g1 * a1y + g2 * a2y],
    progress: span(ghostK, 0.42, 0.9), tone: 'ghost',
  });
  return arrows;
}

const cumDur = (beatIndex) => beatIds.slice(0, beatIndex).reduce((s, b) => s + DURATIONS[b], 0);
const T_HIT = cumDur(beatIds.indexOf('berries') + 1);

/**
 * Pure frame state. `state` is continuous in (beatIndex, t): pose(k, 0).state
 * deep-equals pose(k-1, dur).state. beat/focus/camera are discrete selectors.
 */
export function pose(m, beatIndex, t, mode = 'lesson') {
  if (mode === 'hint') return hintPose(beatIndex, t);
  const beat = beatIds[beatIndex];
  const dur = DURATIONS[beat];
  const tt = Math.min(Math.max(t, 0), dur);
  return {
    beat, beatIndex, t: tt, mode,
    camera: beat === 'board' ? 'board' : 'iso',
    focus: FOCUS[beat],
    state: poseState(m, beat, beatIndex, tt, dur),
  };
}

function beatPours(m, beat, tt, dur) {
  return {
    oats: beat === 'oats' ? pourBeat('oats', fracNum(m.x[0]), tt, dur) : null,
    berries: beat === 'berries' ? pourBeat('berries', fracNum(m.x[1]), tt, dur) : null,
    ghost: beat === 'ghost' ? ghostBeat(m, tt / dur) : null,
  };
}

function poseState(m, beat, beatIndex, tt, dur) {
  const x1 = fracNum(m.x[0]);
  const x2 = fracNum(m.x[1]);
  const { oats, berries, ghost } = beatPours(m, beat, tt, dur);
  const pOats = oats ? oats.amount : ghost ? ghost.pOats : beatIndex > 1 ? x1 : 0;
  const pBerries = berries ? berries.amount : ghost ? ghost.pBerries : beatIndex > 3 ? x2 : 0;
  const ghostK = beat === 'ghost' ? tt / dur : 0;
  const liquid = ghost ? ghost.liquid : Math.min((pOats + pBerries) / (x1 + x2), 1);
  return {
    portions: { oats: pOats, berries: pBerries },
    scoop: beatScoop(oats, berries, ghost),
    liquid,
    board: boardState(m, beat, beatIndex, tt, dur, pOats, pBerries, ghostK),
    hitFlash: burst(cumDur(beatIndex) + tt - T_HIT, 0.25, 0.6),
  };
}

function beatScoop(oats, berries, ghost) {
  if (oats) return oats.scoop;
  if (berries) return berries.scoop;
  if (ghost) return ghost.scoop;
  return REST_SCOOP;
}

function boardState(m, beat, beatIndex, tt, dur, pOats, pBerries, ghostK) {
  return {
    arrows: boardArrows(m, pOats, pBerries, ghostK),
    marker: ghostK > 0.05 ? 'ghost' : 'b',
    equation: beat === 'board' ? span(tt / dur, 0.08, 0.85) : beatIndex > 4 ? 1 : 0,
    ghostLines: beat === 'ghost' ? span(tt / dur, 0.55, 0.92) : 0,
  };
}

// --- scene geometry (statics, memoized per model) --------------------------------

const V3 = (x, y, z) => [x, y, z];
const TOP_Z = 15.2; // countertop surface
const PARK = V3(28.5, 0, 16.6);
const JAR_MOUTH = V3(-24.5, -4, 35.4);
const DIP = { oats: V3(7, -1, 27.0), berries: V3(20, -1, 27.7) };

const staticsCache = new WeakMap();

function arrowExtent(m) {
  const x1 = fracNum(m.x[0]);
  const g1 = fracNum(m.xGhost[0]);
  const pts = [
    [0, 0],
    [x1 * m.a1[0], x1 * m.a1[1]],
    m.b,
    [g1 * m.a1[0], g1 * m.a1[1]],
    m.ghost,
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * Board plane layout (u right, v down) on a fixed 40 x 36 plane: square
 * integer cells covering the origin, both targets and the ghost path.
 * The grid sits centered in a u 4..36 / v 2..24 box; tick labels live
 * outside the grid; two equation rows go below it.
 */
function boardLayout(m) {
  const { minX, maxX, minY, maxY } = arrowExtent(m);
  const loX = Math.floor(minX);
  const hiX = Math.ceil(maxX);
  const loY = Math.floor(minY);
  const hiY = Math.ceil(maxY);
  const s = Math.min(32 / (hiX - loX), 22 / (hiY - loY));
  const gridW = (hiX - loX) * s;
  const gridH = (hiY - loY) * s;
  const gridLeft = 4 + (32 - gridW) / 2;
  const gridTop = 2 + (22 - gridH) / 2;
  const ticks = (lo, hi) => {
    const out = [];
    for (let i = lo; i <= hi; i += 1) out.push(i);
    return out;
  };
  return {
    s, w: 40, h: 36,
    u: (x) => gridLeft + (x - loX) * s,
    v: (y) => gridTop + (hiY - y) * s,
    gridLeft, gridTop, gridRight: gridLeft + gridW, gridBottom: gridTop + gridH,
    xRange: [loX, hiX], yRange: [loY, hiY],
    xTicks: ticks(loX, hiX), yTicks: ticks(loY, hiY),
    tickSize: 2.1, labelSize: 2.1, eqSize1: 2.1, eqSize2: 2.1,
  };
}

const BOARD_CX = 8;
const PANEL_W = 42.4; // plane 40 + 1.2 margin each side
const PANEL_X0 = BOARD_CX - PANEL_W / 2; // -13.2: the mixer (x < -19) stays clear

/**
 * Board on two posts rising from the countertop's back edge. panelZ0 is
 * computed: the panel bottom clears the tallest item standing in front of
 * the board's x-range by 1.5, so the board camera never sees an occluder.
 */
function boardMeshes(L, panelZ0) {
  const panelH = L.h + 2.4;
  const top = panelZ0 + panelH;
  const px0 = PANEL_X0;
  return {
    cx: BOARD_CX, panelW: PANEL_W, panelH, panelZ0,
    panel: box([px0, 9.6, panelZ0], [PANEL_W, 1.2, panelH], { radius: 0.5, segments: 2 }),
    // Posts stand strictly behind the panel (their front face clears the
    // panel's back), so no projection angle can put a post surface in front
    // of a panel or tray surface it also overlaps — that would be a cycle
    // no paint order can satisfy.
    postL: box([px0 - 1.9, 10.9, TOP_Z], [1.6, 1.4, top - TOP_Z], { radius: 0.3, segments: 2 }),
    postR: box([px0 + PANEL_W + 0.3, 10.9, TOP_Z], [1.6, 1.4, top - TOP_Z], { radius: 0.3, segments: 2 }),
    rail: box([px0 - 2.6, 9.4, top], [PANEL_W + 5.2, 1.8, 1.6], { radius: 0.4, segments: 2 }),
    // Chalk tray rides in front of the panel's bottom edge, one chalk on it.
    tray: compound([
      { mesh: box([px0, 8.0, panelZ0 - 1.7], [PANEL_W, 1.6, 0.9], { radius: 0.3, segments: 2 }), tone: 'mid' },
      { mesh: box([BOARD_CX - 6, 8.15, panelZ0 - 0.8], [1.8, 0.7, 0.5]), tone: 'hi' },
    ]),
    plane: {
      origin: [BOARD_CX - L.w / 2, 9.55, panelZ0 + 1.2 + L.h],
      ex: [1, 0, 0], ey: [0, 0, -1],
      size: [L.w, L.h],
      normal: [0, -1, 0],
    },
    planeCenter: [BOARD_CX, 9.55, panelZ0 + 1.2 + L.h / 2],
  };
}

/**
 * Static scene geometry. The workbench is a floor-standing cabinet (no
 * legs): plinth strip and three drawers on the front, a countertop slab on
 * top at z 15.2. The mixer occupies the left end, clear of the board's
 * x-range; the board stands behind the counter on two back posts.
 * Interpenetrating assemblies become one compound mesh each: face-level
 * ordering inside the item keeps them honest from every camera angle, and
 * per-face tones keep the part shading.
 */
function sceneMeshes(m) {
  const L = boardLayout(m);
  const part = (mesh, tone = 'mid') => ({ mesh, tone });
  const benchParts = [
    part(box([-30, -12, 0], [60, 24, 13], { radius: 1 }), 'mid'),
    part(box([-29, -12.4, 0], [58, 0.4, 1.2], { radius: 0.15, segments: 2 }), 'lo'),
    part(box([-31, -13, 13], [62, 26, 2.2], { radius: 1.2 }), 'hi'),
  ];
  for (const cx of [-20, 0, 20]) {
    // Drawer and pull sit proud of their hosts' front planes but must not
    // reach behind them — a buried back sliver is nearer at some pixels
    // and farther at others: an unorderable cycle. Small parts get 2
    // rounded-corner facets — nobody sees the corner facets at this size.
    benchParts.push(part(box([cx - 8.5, -12.4, 4.2], [17, 0.4, 6.4], { radius: 0.3, segments: 2 }), 'mid'));
    benchParts.push(part(box([cx - 1.4, -12.75, 6.9], [2.8, 0.35, 1.0], { radius: 0.2, segments: 2 }), 'hi'));
  }
  const bench = compound(benchParts);
  const knobCyl = transformMesh(cylinder([0, 0, 0], 1.2, 0.55, { segments: 10 }), {
    rotate: { axis: 'x', angle: deg(90), pivot: [0, 0, 0] },
    translate: [-25.2, -8.5, 17.9],
  });
  const mixerBase = compound([
    part(box([-30, -8.5, TOP_Z + 0.7], [12, 9, 4.1], { radius: 1, segments: 2 }), 'mid'),
    part(cylinder([-28.5, -7, TOP_Z], 0.7, 0.7, { segments: 8 }), 'lo'),
    part(cylinder([-20.5, -7, TOP_Z], 0.7, 0.7, { segments: 8 }), 'lo'),
    part(cylinder([-28.5, 0, TOP_Z], 0.7, 0.7, { segments: 8 }), 'lo'),
    part(cylinder([-20.5, 0, TOP_Z], 0.7, 0.7, { segments: 8 }), 'lo'),
  ]);
  // The knob pokes through the base front: a separate item ordered by its own
  // depth (in front at az 0, hidden behind at az 180) — no fixed on-relation.
  // Its pointer is a plane prim on the front cap, not a protruding prism.
  const mixerKnob = knobCyl;
  // Oat bin: floor, four walls and a rim lip that overhangs the wall tops.
  const oatsBin = compound([
    part(box([2, -6, TOP_Z], [10, 10, 0.8]), 'mid'),
    part(box([2, -6, 16], [10, 0.7, 9.2]), 'mid'),
    part(box([2, 3.3, 16], [10, 0.7, 9.2]), 'mid'),
    part(box([2, -5.3, 16], [0.7, 8.6, 9.2]), 'mid'),
    part(box([11.3, -5.3, 16], [0.7, 8.6, 9.2]), 'mid'),
    part(box([1.7, -6.35, 25.2], [10.6, 1.35, 0.45]), 'hi'),
    part(box([1.7, 3.0, 25.2], [10.6, 1.35, 0.45]), 'hi'),
    part(box([1.7, -5.0, 25.2], [1.35, 8.0, 0.45]), 'hi'),
    part(box([12.95, -5.0, 25.2], [1.35, 8.0, 0.45]), 'hi'),
  ]);
  const berriesJar = compound([
    part(cylinder([20, -1, TOP_Z], 4.2, 10), 'glass'),
    part(cylinder([20, 0.6, 25.2], 4.4, 0.9), 'mid'),
  ]);
  const scoopRest = box([26.5, -2, TOP_Z], [4.2, 4.2, 0.9], { radius: 0.3, segments: 2 });
  const jarMesh = cylinder([-24.5, -4, 20], 3.6, 14, { segments: 22 });
  const mixerLidMesh = compound([
    part(cylinder([-27, 4.5, TOP_Z], 3.5, 0.8, { segments: 10 }), 'mid'),
    part(cylinder([-27, 4.5, TOP_Z + 0.8], 0.8, 1.0, { segments: 8 }), 'hi'),
  ]);
  // The panel bottom clears the tallest solid standing in front of the
  // board's x-range by 1.5 — computed from the statics, never hand-typed.
  let frontTop = TOP_Z;
  const frontStatics = [mixerBase, mixerKnob, oatsBin, berriesJar, scoopRest, jarMesh, mixerLidMesh];
  for (const mesh of frontStatics) {
    const inX = mesh.max[0] > PANEL_X0 && mesh.min[0] < PANEL_X0 + PANEL_W;
    if (inX && mesh.min[1] < 9.6) frontTop = Math.max(frontTop, mesh.max[2]);
  }
  const board = boardMeshes(L, frontTop + 1.5);
  const meshes = {
    bench,
    mixerBase,
    mixerKnob,
    jar: jarMesh,
    mixerLid: mixerLidMesh,
    oatsBin,
    berriesJar,
    cup: cylinder([0, 0, 0], 1.6, 1.5, { segments: 12 }),
    // The handle ends AT the cup wall (r 1.6): a buried tip is nearer at
    // some pixels and farther at others — an unorderable cycle.
    handle: box([-0.3, -3.8, 0.9], [0.6, 2.25, 0.5]),
    // The load rides ON the cup's top cap (base just above z=1.5): a load
    // buried inside the closed cup interpenetrates its walls — an
    // unorderable cycle the oracle rightly flags.
    load: cylinder([0, 0, 1.52], 1.3, 0.8, { segments: 10 }),
    // Posts, panel, rail, tray and chalk interpenetrate from some angles:
    // one compound so the pairwise part order decides every view.
    board: compound([
      part(board.postL, 'lo'), part(board.postR, 'lo'),
      part(board.panel, 'board'), part(board.rail, 'lo'), { mesh: board.tray },
    ]),
    scoopRest,
  };
  return { meshes, layout: L, board };
}

/** @returns {object} memoized static geometry + layout for a model */
function staticsFor(m) {
  let st = staticsCache.get(m);
  if (st) return st;
  const { meshes, layout, board } = sceneMeshes(m);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of Object.values(meshes)) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], mesh.min[i]);
      max[i] = Math.max(max[i], mesh.max[i]);
    }
  }
  const corners = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push([x, y, z]);
  const boundsCenter = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  // Pose-independent items keep identity across builds: the engine can
  // hand the painter the same objects every frame, so a settled camera
  // skips their repaint entirely.
  const items = {
    bench: { kind: 'solid', id: 'bench', mesh: meshes.bench, tone: 'mid' },
    mixerBase: { kind: 'solid', id: 'mixer-base', mesh: meshes.mixerBase, tone: 'mid', on: 'bench' },
    mixerKnob: { kind: 'solid', id: 'mixer-knob', mesh: meshes.mixerKnob, tone: 'hi', on: 'bench', bias: 2 },
    mixerPointer: {
      kind: 'plane', id: 'mixer-pointer', on: 'mixer-knob', bias: 0.3,
      origin: [-25.5, -9.09, 18.4], ex: [0, 0, 1], ey: [1, 0, 0],
      size: [1.0, 0.6], normal: [0, -1, 0], tone: 'lit',
      prims: [{ t: 'line', key: 'tick', from: [0.15, 0.3], to: [0.7, 0.3], width: 0.22 }],
    },
    seam: seamPlane(),
    jarBack: { kind: 'solid', id: 'mixer-jar-back', mesh: meshes.jar, tone: 'glass', side: 'back', bias: -5.5, on: 'mixer-base' },
    jarFront: { kind: 'solid', id: 'mixer-jar-front', mesh: meshes.jar, tone: 'glass', on: 'mixer-base' },
    jarMarks: jarMarksPlane(m, fracNum(m.x[0]) + fracNum(m.x[1])),
    lid: { kind: 'solid', id: 'mixer-lid', mesh: meshes.mixerLid, tone: 'mid', on: 'bench' },
    scoopRest: { kind: 'solid', id: 'scoop-rest', mesh: meshes.scoopRest, tone: 'lo', on: 'bench' },
    boardPanel: {
      kind: 'solid', id: 'board-panel', mesh: meshes.board, tone: 'board', on: 'bench',
      keyPoint: [board.cx, 10.2, board.panelZ0 + 2],
    },
  };
  st = { meshes, layout, board, boundsCenter, boundsCorners: corners, ground: { center: [0, 0, 0], size: [62, 26] }, items };
  staticsCache.set(m, st);
  return st;
}

/**
 * Footprint the halo grounds: the cabinet + countertop outline at z = 0.
 * @returns {{ center: import('../kit/camera.mjs').Vec3, size: [number, number] }}
 */
export function ground(m) {
  return staticsFor(m).ground;
}

// --- build -----------------------------------------------------------------------

const FOCUS_ITEMS = {
  ingredients: new Set(['oats-label', 'berries-label']),
  oats: new Set(['oats-bin', 'oats-label', 'scoop', 'scoop-load']),
  target: new Set(),
  berries: new Set(['berries-jar', 'berries-label', 'scoop', 'scoop-load']),
  equation: new Set(['board-face']),
  ghost: new Set(['scoop', 'scoop-load', 'pour-stream']),
};

const FOCUS_TONE = { a1: 'oats', a2: 'berries' };

const lerp = (a, b, s) => a + (b - a) * s;
const lerp3 = (a, b, s) => [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)];

/** Scoop position + tip along its arc. Returns { pos, tip }. */
function scoopPos(scoop) {
  if (!scoop.container) return { pos: PARK, tip: 0 };
  const dip = scoop.ghost ? JAR_MOUTH : DIP[scoop.container];
  const pourPt = scoop.ghost ? DIP[scoop.container] : JAR_MOUTH;
  const rim = [dip[0], dip[1], dip[2] + 2.4];
  // The ghost hold glides PARK -> pour point on a raised arc — no jar dip.
  if (scoop.hold) {
    const pos = lerp3(PARK, pourPt, scoop.phase);
    pos[2] += Math.sin(scoop.phase * Math.PI) * 6;
    return { pos, tip: scoop.tip };
  }
  const keys = [
    [0, PARK], [0.18, rim], [0.28, dip], [0.34, rim],
    [0.58, pourPt], [0.85, pourPt], [1, PARK],
  ];
  let i = 0;
  while (i < keys.length - 2 && scoop.phase > keys[i + 1][0]) i += 1;
  const s = span(keys[i][0], keys[i + 1][0], scoop.phase);
  const pos = lerp3(keys[i][1], keys[i + 1][1], s);
  if (i === 3) pos[2] += Math.sin(s * Math.PI) * 5;
  return { pos, tip: scoop.tip };
}

function textPrim(key, x, y, runs, size, opts = {}) {
  return { t: 'text', key, x, y, runs, size, anchor: 'middle', tone: 'board', ...opts };
}

/**
 * Label plate on a container: a paper plate rect carrying name + nutrient
 * vector. Vectors are context, not answers. `accent` lights the plate —
 * the beat accent lives on the label, not on the glass tone.
 */
function labelPlane(idv, m, origin, w, h, name, vec, accent) {
  const label = fmtPair(m, vec[0], vec[1]);
  const tone = accent ? 'lit' : 'mid';
  return {
    kind: 'plane', id: idv, origin, ex: [1, 0, 0], ey: [0, 0, -1],
    size: [w, h], normal: [0, -1, 0], tone,
    prims: [
      // plate:true -> smooth paper fill + (lit: accent outline), never the
      // style's face pattern and never a violet slab behind the text.
      { t: 'rect', key: 'plate', from: [0.1, 0.1], to: [w - 0.1, h - 0.1], plate: true, tone },
      textPrim('label-name', w / 2, h * 0.34, [{ text: name }], 1.6, { weight: 'bold', font: 'label', tone }),
      textPrim('label-vec', w / 2, h * 0.75, [{ text: label }], 1.5, { font: 'label', tone }),
    ],
  };
}

/** Estimated text rect in plane units for overlap checks. */
function labelBox(cx, cy, size, runs, anchor = 'middle') {
  const chars = runs.reduce((n, r) => n + (r.text?.length ?? 0) + (r.sub || r.sup ? 0.6 : 0), 0);
  const w = 0.55 * size * chars;
  const h = size * 1.05;
  const x0 = anchor === 'start' ? cx : anchor === 'end' ? cx - w : cx - w / 2;
  return [x0, cy - h / 2, x0 + w, cy + h / 2];
}

const boxesHit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Arrow label at 45% along the shaft, offset 1.3 to the arrow's left
 * normal; if that box touches a ring or a label already placed, try the
 * right normal, then the same pair further back along the shaft. `bb`
 * records the box for the overlap test.
 */
/** Fallback for arrowLabelPos: ring scan around a center for a free box. */
function ringSpot(mx, my, size, runs, busy) {
  for (const rad of [2.4, 3.6, 5.2, 7]) {
    for (let a = 0; a < 8; a += 1) {
      const lx = mx + rad * Math.cos((a * Math.PI) / 4);
      const ly = my + rad * Math.sin((a * Math.PI) / 4);
      const bb = labelBox(lx, ly, size, runs);
      if (!busy.some((b) => boxesHit(bb, b))) return { lx, ly, bb };
    }
  }
  return null;
}

function arrowLabelPos(p0, p1, size, runs, busy) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy);
  const ux = len > 1e-3 ? dx / len : 0;
  const uy = len > 1e-3 ? dy / len : 0;
  // Prefer 45% along, left normal, near offset; short ghost arrows near the
  // origin need the wider t/offset ring to clear the axes.
  const spots = [];
  for (const t of [0.45, 0.28, 0.1, -0.15, 0.7, 1.2]) {
    for (const side of [1, -1]) for (const off of [1.3, 2.4]) spots.push({ t, side, off });
  }
  for (const { t, side, off } of spots) {
    const lx = p0[0] + dx * t + uy * off * side;
    const ly = p0[1] + dy * t - ux * off * side;
    const bb = labelBox(lx, ly, size, runs);
    if (!busy.some((b) => boxesHit(bb, b))) return { lx, ly, bb };
  }
  // Wide ghost labels cannot dodge a full-height axis with normal offsets:
  // scan a ring around the midpoint for any free spot.
  const ring = ringSpot((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, size, runs, busy);
  if (ring) return ring;
  const lx = p0[0] + dx * 0.45 + uy * 1.3;
  const ly = p0[1] + dy * 0.45 - ux * 1.3;
  return { lx, ly, bb: labelBox(lx, ly, size, runs) };
}

function arrowPrims(arrow, L, focus, mode, busy) {
  const pr = Math.min(Math.max(arrow.progress, 0), 1);
  const to = [lerp(arrow.from[0], arrow.to[0], pr), lerp(arrow.from[1], arrow.to[1], pr)];
  const p0 = [L.u(arrow.from[0]), L.v(arrow.from[1])];
  const p1 = [L.u(to[0]), L.v(to[1])];
  const tone = arrow.tone === 'ghost' ? 'ghost' : FOCUS_TONE[arrow.tone] === focus ? 'lit' : 'hi';
  // Zero-progress arrows collapse to a point; without the flag their label
  // still renders as a floating fraction at the origin (ghost beat leak).
  const shown = pr > 0.02;
  const prims = [{ t: 'arrow', key: `arr-${arrow.id}`, from: p0, to: p1, tone, width: 0.32, visible: shown }];
  const runs = arrowLabelRuns(arrow, mode);
  // Hidden labels do not occupy space (they are not collision obstacles).
  const { lx, ly, bb } = shown
    ? arrowLabelPos(p0, p1, L.labelSize, runs, busy)
    : { lx: (p0[0] + p1[0]) / 2, ly: (p0[1] + p1[1]) / 2, bb: null };
  if (bb) busy.push(bb);
  prims.push(textPrim(`arr-label-${arrow.id}`, lx, ly, runs, L.labelSize, { tone, font: 'math', visible: shown, bb }));
  return prims;
}

/** Per-portion arrows carry only the vector name; ghost arrows get a coefficient. */
function arrowLabelRuns(arrow, mode) {
  const a = { text: 'a', italic: true, sub: arrow.vec === 'a1' ? '1' : '2' };
  if (!arrow.frac) return [a];
  return [{ text: mode === 'hint' ? '?' : formatFrac(arrow.frac) }, { text: ' · ' }, a];
}

function equationRuns(m, mode) {
  const x1t = mode === 'hint' ? '?' : formatFrac(m.x[0]);
  const x2t = mode === 'hint' ? '?' : formatFrac(m.x[1]);
  const g1t = mode === 'hint' ? '?' : formatFrac(m.xGhost[0]);
  const g2t = mode === 'hint' ? '?' : formatFrac(m.xGhost[1]);
  const a1 = { text: 'a', italic: true, sub: '1' };
  const a2 = { text: 'a', italic: true, sub: '2' };
  const x1 = { text: 'x', italic: true, sub: '1' };
  const x2 = { text: 'x', italic: true, sub: '2' };
  const eq1 = [
    { text: `${x1t} · ` }, a1, { text: ' + ' },
    { text: `${x2t} · ` }, a2, { text: ' = ' }, { text: 'b', italic: true },
  ];
  const eq2 = [
    x1, a1, { text: ' + ' }, x2, a2, { text: ' = ' }, { text: 'b', italic: true },
  ];
  const g1 = [x1, { text: ` = ${g1t}` }];
  const g2 = [x2, { text: ` = ${g2t}` }];
  const ghostEq2 = [
    { text: `${g1t} · ` }, a1, { text: ' + ' }, { text: `${g2t} · ` }, a2,
    { text: ' = ' }, { text: 'b', italic: true, sup: '′' },
  ];
  return { eq1, eq2, g1, g2, ghostEq2 };
}

/** All board prims: grid, axes, tick labels, arrows, target rings, equations. */
function boardPrims(m, st, poseState, focus, mode) {
  const L = st.layout;
  const { board } = poseState;
  // Keep-out boxes go first: arrow labels dodge rings, the axis lines and
  // the tick labels (the ghost label used to land on the x axis).
  const ringR = 0.9 * L.s;
  const axisBoxes = [
    [L.gridLeft, L.v(0) - 0.3, L.gridRight, L.v(0) + 0.3],
    [L.u(0) - 0.3, L.gridTop, L.u(0) + 0.3, L.gridBottom],
  ];
  const xTickBoxes = L.xTicks.map((x) =>
    labelBox(L.u(x), L.gridBottom + 1.6, L.tickSize, [{ text: String(x) }]));
  const yTickBoxes = L.yTicks
    .filter((y) => y !== 0 && y !== L.yRange[0])
    .map((y) => labelBox(L.gridLeft - 0.8, L.v(y) + 0.55, L.tickSize, [{ text: String(y) }], 'end'));
  const busy = [
    ...[m.b, m.ghost].map(([x, y]) => [
      L.u(x) - ringR - 0.3, L.v(y) - ringR - 0.3, L.u(x) + ringR + 0.3, L.v(y) + ringR + 0.3,
    ]),
    ...axisBoxes, ...xTickBoxes, ...yTickBoxes,
  ];
  const prims = [
    { t: 'grid', key: 'grid', from: [L.gridLeft, L.gridTop], to: [L.gridRight, L.gridBottom], step: L.s, tone: 'lo', width: 0.12 },
    { t: 'line', key: 'axis-x', from: [L.gridLeft, L.v(0)], to: [L.gridRight, L.v(0)], tone: 'mid', width: 0.26, bb: axisBoxes[0] },
    { t: 'line', key: 'axis-y', from: [L.u(0), L.gridTop], to: [L.u(0), L.gridBottom], tone: 'mid', width: 0.26, bb: axisBoxes[1] },
    textPrim('axis-label-y', L.gridLeft, L.gridTop - 0.6, [{ text: 'Zucker' }], L.labelSize, { anchor: 'start', tone: 'mid', font: 'label' }),
    textPrim('axis-label-x', L.w - 1.2, L.gridBottom + 3.4, [{ text: 'Eiweiß' }], L.labelSize, { anchor: 'end', tone: 'mid', font: 'label' }),
  ];
  for (const [i, x] of L.xTicks.entries()) {
    prims.push(textPrim(`tick-x-${x}`, L.u(x), L.gridBottom + 1.6, [{ text: String(x).replace('-', '−') }], L.tickSize, { tone: 'mid', font: 'math', bb: xTickBoxes[i] }));
  }
  let yi = 0;
  for (const y of L.yTicks) {
    if (y === 0 || y === L.yRange[0]) continue; // the x row prints the corner values
    prims.push(textPrim(`tick-y-${y}`, L.gridLeft - 0.8, L.v(y) + 0.55, [{ text: String(y).replace('-', '−') }], L.tickSize, { anchor: 'end', tone: 'mid', font: 'math', bb: yTickBoxes[yi++] }));
  }
  for (const arrow of board.arrows) prims.push(...arrowPrims(arrow, L, focus, mode, busy));
  prims.push(...targetPrims(m, L, board, focus));
  prims.push(...equationPrims(m, L, board, focus, mode));
  return prims;
}

/** Dashed rings plus center dots and italic labels for both targets. */
function targetPrims(m, L, board, focus) {
  const ringR = 0.9 * L.s;
  // In the ghost beat the real target recedes to 'lo'; b′ takes over.
  const tone = board.marker === 'ghost' ? 'lo' : focus === 'target' ? 'lit' : 'hi';
  const ghost = board.marker === 'ghost';
  const ringBox = (x, y) => [L.u(x) - ringR, L.v(y) - ringR, L.u(x) + ringR, L.v(y) + ringR];
  return [
    { t: 'dot', key: 'target-b', at: [L.u(m.b[0]), L.v(m.b[1])], r: ringR, ring: true, dash: [1.2, 0.8], tone, bb: ringBox(m.b[0], m.b[1]) },
    { t: 'dot', key: 'target-b-dot', at: [L.u(m.b[0]), L.v(m.b[1])], r: 0.3, tone },
    // Upper right of the ring, clamped inside the panel: the default target
    // sits at the top edge, where an unclamped label lands on the top rail.
    textPrim('target-b-label', L.u(m.b[0]) + ringR + 1.0, Math.max(L.v(m.b[1]) - ringR - 0.2, 1.6), [{ text: 'b', italic: true }], 1.9, { anchor: 'start', tone, font: 'math' }),
    { t: 'dot', key: 'target-ghost', at: [L.u(m.ghost[0]), L.v(m.ghost[1])], r: ringR, ring: true, dash: [1.2, 0.8], tone: 'ghost', visible: ghost, bb: ringBox(m.ghost[0], m.ghost[1]) },
    { t: 'dot', key: 'target-ghost-dot', at: [L.u(m.ghost[0]), L.v(m.ghost[1])], r: 0.3, tone: 'ghost', visible: ghost },
    textPrim('target-ghost-label', L.u(m.ghost[0]) + ringR + 1.0, Math.max(L.v(m.ghost[1]) - ringR - 0.2, 1.6), [{ text: 'b', italic: true, sup: '′' }], 1.9, { anchor: 'start', tone: 'ghost', font: 'math', visible: ghost }),
  ];
}

/**
 * Equation rows under the grid, centered on u = 20. They fade in during the
 * board beat and crossfade to the ghost solution in the ghost beat.
 */
function equationPrims(m, L, board, focus, mode) {
  const { eq1, eq2, g1, g2, ghostEq2 } = equationRuns(m, mode);
  const tone = focus === 'equation' ? 'lit' : 'hi';
  const fade = board.equation * (1 - board.ghostLines);
  const gfade = board.ghostLines;
  return [
    textPrim('eq-1', 20, 29.5, eq1, L.eqSize1, { tone, font: 'math', alpha: fade, visible: fade > 0.02 }),
    textPrim('eq-2', 20, 33.2, eq2, L.eqSize2, { tone, font: 'math', alpha: fade, visible: fade > 0.02 }),
    textPrim('eq-g1', 10, 29.5, g1, L.eqSize1, { tone: 'ghost', font: 'math', alpha: gfade, visible: gfade > 0.02 }),
    textPrim('eq-g2', 30, 29.5, g2, L.eqSize1, { tone: 'ghost', font: 'math', alpha: gfade, visible: gfade > 0.02 }),
    textPrim('eq-ghost', 20, 33.2, ghostEq2, L.eqSize2, { tone: 'ghost', font: 'math', alpha: gfade, visible: gfade > 0.02 }),
  ];
}

const lit = (idv, focus, base = 'mid') => (FOCUS_ITEMS[focus]?.has(idv) ? 'lit' : base);

/**
 * Build the item list for a pose. Stable topology: identical ids, kinds and
 * prim keys for every pose of a model+mode; hidden parts use visible:false.
 */
export function build(m, p, mode = 'lesson') {
  if (mode === 'hint') return buildHint(m, p);
  const st = staticsFor(m);
  const M = st.meshes;
  const { state } = p;
  const focus = p.focus;
  const { pos, tip } = scoopPos(state.scoop);
  // The ghost scoop and its load read ×1.4: the impossible portion must be
  // noticeable. The tip pivot scales with the geometry (cup rim at 1.2).
  const gScale = state.scoop.ghost ? 1.4 : 1;
  const tipRot = { rotate: { axis: 'x', angle: -tip * 1.8, pivot: [0, 0, 1.2 * gScale] }, translate: pos };
  const x1 = fracNum(m.x[0]);
  const x2 = fracNum(m.x[1]);
  // Heaps stay below the bin walls (top z 25.2): a heap poking over the wall
  // is nearer than the wall at some pixels and behind its inner face at
  // others — a paint-order cycle no ordering can satisfy. The ghost beat
  // returns a portion to the bin, so the fill factor can exceed 1 — clamp.
  const heapFill = (poured, per) => (per > 0 ? Math.max(0, 1 - poured / per) : 1);
  const oatsHeapH = Math.min(9.0, 1.0 + 8.0 * heapFill(state.portions.oats, x1));
  const berriesHeapH = Math.min(9.4, 1.5 + 4.0 * heapFill(state.portions.berries, x2));
  const S = st.items;
  const items = [
    S.bench, S.mixerBase, S.mixerKnob, S.mixerPointer, S.seam,
    displayPlane(m, state, mode),
    S.jarBack,
    {
      kind: 'solid', id: 'mixer-liquid', tone: 'fluid', on: 'mixer-base',
      mesh: cylinder([-24.5, -4, 20.3], 3.1, Math.max(0.06 + state.liquid * 13, 0.06), { segments: 12 }),
      visible: state.liquid > 0.01,
    },
    S.jarFront, S.jarMarks, S.lid,
    {
      kind: 'solid', id: 'oats-bin', tone: lit('oats-bin', focus), on: 'bench',
      mesh: compound([
        { mesh: M.oatsBin, tone: lit('oats-bin', focus) },
        { mesh: cylinder([7, -1, 16], 3.4, oatsHeapH, { segments: 9 }), tone: lit('oats-bin', focus, 'hi') },
      ]),
    },
    {
      ...labelPlane('oats-label', m, [3, -6.06, 23.9], 8, 4.6, 'Hafer', m.a1, FOCUS_ITEMS[focus]?.has('oats-label')),
      on: 'oats-bin', tone: lit('oats-label', focus, 'lo'), bias: 0.2,
    },
    {
      kind: 'solid', id: 'berries-jar', tone: lit('berries-jar', focus, 'glass'), on: 'bench',
      mesh: compound([
        { mesh: M.berriesJar, tone: 'glass' },
        { mesh: cylinder([20, -1, 15.5], 3.0, berriesHeapH, { segments: 9 }), tone: lit('berries-jar', focus, 'hi') },
      ]),
    },
    {
      // Plate at most 0.7x the jar diameter (5.88) and 0.3 in front of the
      // glass (y -5.2 -> -5.5): a wider plate loses its ends to the jar's
      // curved silhouette.
      ...labelPlane('berries-label', m, [17.1, -5.5, 23.7], 5.8, 4.4, 'Beeren', m.a2, FOCUS_ITEMS[focus]?.has('berries-label')),
      on: 'berries-jar', tone: lit('berries-label', focus, 'lo'), bias: 0.2,
    },
    S.scoopRest,
    {
      kind: 'solid', id: 'scoop', tone: scoopTone(state.scoop, focus, 'hi'),
      mesh: transformMesh(scaleMesh(compound([{ mesh: M.cup, tone: 'hi' }, { mesh: M.handle }]), gScale), tipRot),
    },
    {
      kind: 'solid', id: 'scoop-load',
      mesh: transformMesh(scaleMesh(scaleMeshZ(M.load, state.scoop.loadFrac || 1), gScale), tipRot),
      tone: scoopTone(state.scoop, focus),
      // The impossible portion carries a faint accent tint under its dashed
      // outline — 15% lit fill marks it as the not-real portion.
      tint: state.scoop.ghost,
      bias: -0.5, visible: scoopLoaded(state.scoop),
    },
    pourStream(state.scoop, pos),
    // The board stands on the bench: panel, posts, top rail and the chalk
    // tray order by their own footprints; the plane rides on the panel.
    S.boardPanel,
    {
      kind: 'plane', id: 'board-face', on: 'board-panel', bias: 0.2,
      origin: st.board.plane.origin, ex: st.board.plane.ex, ey: st.board.plane.ey,
      size: st.board.plane.size, normal: st.board.plane.normal, tone: lit('board-face', focus, 'lo'),
      prims: boardPrims(m, st, state, focus, mode),
    },
  ];
  return items;
}

/** Uniform mesh scale about the origin (the ghost scoop reads bigger). */
function scaleMesh(mesh, s) {
  if (s === 1) return mesh;
  return {
    ...mesh,
    faces: mesh.faces.map((f) => ({ ...f, pts: f.pts.map((p) => [p[0] * s, p[1] * s, p[2] * s]) })),
    center: mesh.center.map((v) => v * s),
    min: mesh.min.map((v) => v * s),
    max: mesh.max.map((v) => v * s),
  };
}

/** Scale a mesh in z around the origin (fractional scoop loads). */
function scaleMeshZ(mesh, s) {
  if (s === 1) return mesh;
  return {
    ...mesh,
    faces: mesh.faces.map((f) => {
      const pts = f.pts.map((p) => [p[0], p[1], p[2] * s]);
      return { ...f, pts, normal: newellNormal(pts) };
    }),
    min: [mesh.min[0], mesh.min[1], mesh.min[2] * s],
    max: [mesh.max[0], mesh.max[1], mesh.max[2] * s],
  };
}

/** Portion marks printed on the jar glass: a tick + number per full portion. */
function jarMarksPlane(m, total) {
  const hPer = 13 / total;
  const w = 3.6;
  const zTop = 34.4;
  // Cover only the tick band: a rect reaching the jar's base would overlap
  // the mixer base's front face, which rightly paints in front of the jar.
  const h = 11.6;
  const prims = [];
  for (let k = 1; k <= total; k += 1) {
    const v = zTop - (20.3 + k * hPer); // plane-local v down
    prims.push({ t: 'line', key: `mark-${k}`, from: [0.4, v], to: [1.2, v], tone: 'lo', width: 0.18 });
    prims.push(textPrim(`mark-label-${k}`, 1.5, v + 0.5, [{ text: String(k) }], 1.5, { anchor: 'start', tone: 'lo', font: 'label' }));
  }
  return {
    kind: 'plane', id: 'jar-marks', on: 'mixer-jar-front', bias: 0.2,
    origin: [-24.5 - w / 2, -7.66, zTop], ex: [1, 0, 0], ey: [0, 0, -1],
    size: [w, h], normal: [0, -1, 0], tone: 'glass',
    prims: [
      { t: 'rect', key: 'plate', from: [0.15, 0.1], to: [w - 0.15, h - 0.1], plate: true, tone: 'lo' },
      ...prims,
    ],
  };
}

/** Seam line on the base front, left of the knob — the plate stops at the
 *  knob's left edge: a rect crossing a proud knob is nearer at some pixels
 *  and farther at others — an unorderable pair. */
function seamPlane() {
  return {
    kind: 'plane', id: 'mixer-seam', on: 'mixer-base', bias: 0.2,
    origin: [-29.8, -8.56, 19.9], ex: [1, 0, 0], ey: [0, 0, -1],
    size: [3.2, 2.6], normal: [0, -1, 0], tone: 'lo',
    prims: [{ t: 'line', key: 'seam', from: [0.3, 1.3], to: [2.9, 1.3], tone: 'lo', width: 0.15 }],
  };
}

/**
 * Live mix display on the base front, right of the knob. The plate must not
 * span the knob: a rect crossing a proud knob is nearer at some pixels and
 * farther at others — an unorderable pair.
 */
function displayPlane(m, state, mode) {
  const { mix } = evaluate(m, [state.portions.oats, state.portions.berries]);
  const value = mode === 'hint' ? '(?; ?)' : fmtPair(m, mix[0], mix[1]);
  return {
    kind: 'plane', id: 'mixer-display', on: 'mixer-base', bias: 0.2,
    origin: [-22.4, -8.56, 19.9], ex: [1, 0, 0], ey: [0, 0, -1],
    size: [4.4, 3.0], normal: [0, -1, 0], tone: 'lo',
    prims: [
      { t: 'rect', key: 'plate', from: [0.05, 0.05], to: [4.35, 2.95], plate: true, tone: 'lo' },
      { t: 'line', key: 'seam', from: [0.15, 2.7], to: [4.25, 2.7], tone: 'lo', width: 0.15 },
      textPrim('disp-label', 0.5, 1.1, [{ text: 'Mix' }], 1.1, { anchor: 'start', tone: 'lo', font: 'label' }),
      textPrim('disp-value', 2.2, 2.35, [{ text: value }], 1.4, { tone: 'lit', font: 'math' }),
    ],
  };
}

const scoopLoaded = (s) => s.container !== null && s.phase > 0.22 && s.pour < 1;
const scoopTone = (s, focus, base = 'mid') => (s.ghost ? 'ghost' : lit('scoop', focus, base));

function pourStream(scoop, pos) {
  const pouring = scoop.container !== null && scoop.tip > 0.4;
  const dip = scoop.ghost ? DIP.oats : JAR_MOUTH;
  return {
    kind: 'stroke', id: 'pour-stream', tone: scoop.ghost ? 'ghost' : 'lit',
    width: 0.3, dash: [0.6, 0.5], visible: pouring,
    pts: [[pos[0], pos[1] - 1.2, pos[2] + 0.6], [dip[0], dip[1], dip[2] - 1]],
  };
}

// --- camera, readout, describe ----------------------------------------------------

/**
 * Target camera for a pose. 'iso': ISO angles, scene bounds centered, fitted
 * with pad 12. 'board': frontal, board plane fills 92% of viewport width
 * (height still fits).
 * @returns {import('../kit/camera.mjs').Camera}
 */
export function cameraFor(m, p, viewport) {
  if (p.mode === 'hint') return cameraFor(hintBase(), { ...p, mode: 'lesson' }, viewport);
  const st = staticsFor(m);
  if (p.camera === 'board') {
    const zoom = Math.min((0.98 * viewport.width) / st.layout.w, (0.9 * viewport.height) / st.layout.h);
    return { azimuth: 0, elevation: 0, zoom, target: st.board.planeCenter };
  }
  const cam = { azimuth: ISO.azimuth, elevation: ISO.elevation, zoom: 1, target: st.boundsCenter };
  cam.zoom = fitZoom(viewport, st.boundsCorners, cam, 12);
  return cam;
}

/**
 * Portion display: exact integers plain, the model's own fraction solutions
 * as fractions with U+2212 (the ghost portion is −1/3, not −0,3), in-flight
 * values as one decimal with a comma.
 */
function fmtPortion(m, v) {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  for (const f of [m.x[0], m.x[1], m.xGhost[0], m.xGhost[1]]) {
    if (Math.abs(v - fracNum(f)) < 1e-9) return formatFrac(f);
  }
  return v.toFixed(1).replace('.', ',');
}

/** Pair display: integer pairs "(2, 1)"; a non-integer switches to "(1,5; 2,5)". */
const fmtPair = (m, a, b) => {
  const ints = Math.abs(a - Math.round(a)) < 1e-9 && Math.abs(b - Math.round(b)) < 1e-9;
  return ints ? `(${Math.round(a)}, ${Math.round(b)})` : `(${fmtPortion(m, a)}; ${fmtPortion(m, b)})`;
};

/** Short German live text from the pose; motion shows one decimal with a
 * comma. Pairs and the "·" joins are non-breaking: the readout must never
 * wrap inside "(1, 3)" or around the multiplication dots. */
export function readout(m, p, mode = 'lesson') {
  if (mode === 'hint') return 'Hafer ? · Beeren ? · Ziel b';
  const nb = '\u00A0';
  const { portions } = p.state;
  const { mix } = evaluate(m, [portions.oats, portions.berries]);
  const pair = fmtPair(m, mix[0], mix[1]).replace(/([,;]) /g, `$1${nb}`);
  return `Hafer ${fmtPortion(m, portions.oats)}${nb}·${nb}Beeren ${fmtPortion(m, portions.berries)}${nb}·${nb}Mischung ${pair}`;
}

/** One German sentence per beat for screen readers (changes per beat). */
export function describe(m, beatIndex, mode = 'lesson') {
  if (mode === 'hint') return HINT_TEXT[beatIndex];
  const x1 = formatFrac(m.x[0]);
  const x2 = formatFrac(m.x[1]);
  const lesson = [
    `Hafer ${fmtPair(m, m.a1[0], m.a1[1])} und Beerenmix ${fmtPair(m, m.a2[0], m.a2[1])} stehen bereit, Ziel ist b = ${fmtPair(m, m.b[0], m.b[1])}.`,
    `${x1} Portion${m.x[0].n === 1 ? '' : 'en'} Hafer: der erste Pfeil wächst.`,
    'Wie viele Portionen Beerenmix treffen das Ziel?',
    `${x2} Portion${m.x[1].n === 1 ? '' : 'en'} Beerenmix: der zweite Pfeil schließt die Summe.`,
    'Die Tafel zeigt die Rechnung x₁·a₁ + x₂·a₂ = b.',
    `Das Ziel ${fmtPair(m, m.ghost[0], m.ghost[1])} verlangt ${formatFrac(m.xGhost[0])} Hafer: eine Geisterportion.`,
  ];
  return lesson[beatIndex];
}

const HINT_TEXT = [
  'Jede Zutat steht für eine Spalte. Die Gewichte bleiben unbekannt.',
  'Der gestrichelte Strahl zeigt nur die Richtung, keine Portionen oder gesuchte Länge.',
  'Gewichte die Spalten, addiere komponentenweise und vergleiche mit dem Ziel deiner Aufgabe.',
  'Wo der Vergleich hinkt: Negative Gewichte sind rechnerisch möglich, echte Zutaten lassen sich so nicht mischen.',
];

function validateHintParams(params) {
  for (const key of ['a1', 'a2', 'b', 'ghost']) {
    const v = params?.[key];
    if (!Array.isArray(v) || v.length !== 2 || !v.every((n) => Number.isFinite(n) && Math.abs(n) <= 1e6)) {
      throw new Error(`params.${key}: finite hint vector required`);
    }
  }
  if (params.a1[0] * params.a2[1] === params.a1[1] * params.a2[0]) throw new Error('params: collinear hint vectors');
}

let hintBaseModel;
function hintBase() {
  hintBaseModel ??= model({ a1: [2, 1], a2: [1, 3], b: [5, 5], ghost: [-1, 2] });
  return hintBaseModel;
}

function hintPose(index, t) {
  const beat = hintBeatIds[index];
  if (!beat) throw new Error('unknown hint beat');
  return { ...pose(hintBase(), 0, 0), beat, beatIndex: index, t, mode: 'hint',
    camera: index >= 2 ? 'board' : 'iso', focus: index === 1 ? 'oats' : 'equation' };
}

const hintBuildCache = new WeakMap();
function buildHint(m, p) {
  let beats = hintBuildCache.get(m);
  if (!beats) { beats = new Map(); hintBuildCache.set(m, beats); }
  if (beats.has(p.beatIndex)) return beats.get(p.beatIndex);
  const base = hintBase();
  const items = build(base, pose(base, 0, 0)).map((item) => hintItem(item, m, p));
  beats.set(p.beatIndex, items);
  return items;
}

function hintItem(item, m, p) {
  if (['scoop', 'scoop-load', 'scoop-rest', 'pour-stream', 'jar-marks', 'mixer-liquid'].includes(item.id)) return { ...item, visible: false, prims: [] };
  if (item.id === 'board-face') return { ...item, tone: 'lo', prims: hintBoard(m, p) };
  if (item.id === 'mixer-display') return { ...item, prims: [
    textPrim('unknown-portions', 2.2, 1.7, [{ text: '? Portionen' }], 0.65, { font: 'label' }),
  ] };
  if (item.id === 'oats-label' || item.id === 'berries-label') return { ...item, prims: [
    textPrim('ingredient-name', item.size[0] / 2, item.size[1] / 2, [{ text: item.id === 'oats-label' ? 'Hafer' : 'Beeren' }], 1.1),
  ] };
  return item;
}

function hintBoard(m, p) {
  const direction = (v) => { const n = Math.hypot(...v); return [14 + 6 * v[0] / n, 14 - 6 * v[1] / n]; };
  return [
    textPrim('hint-title', 20, 4, [{ text: 'Gewichte gesucht' }], 2.1, { font: 'label' }),
    { t: 'line', key: 'oats-ray', from: [14, 14], to: direction(m.a1), tone: p.beatIndex === 1 ? 'ghost' : 'mid', dash: [0.8, 0.6], width: 0.18 },
    { t: 'line', key: 'berries-ray', from: [14, 14], to: direction(m.a2), tone: 'mid', dash: [0.8, 0.6], width: 0.18 },
    textPrim('hint-unknown', 28, 16, [{ text: '?' }], 3.6, { tone: 'lit', font: 'math' }),
    textPrim('hint-equation', 20, 26, [{ text: '? · Hafer + ? · Beeren' }], 2.1, { font: 'label' }),
    textPrim('hint-target', 20, 30, [{ text: '= Ziel' }], 2.1, { font: 'label' }),
  ];
}

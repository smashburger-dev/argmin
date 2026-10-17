// Tests for the smoothie spike scene: model arithmetic, pose continuity,
// stable item topology, displayed numbers vs. the model, paint-order sweep
// and the hint-mode leak check.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  id, beatIds, validateParams, model, evaluate, predictValue, answerValues,
  beatDuration, pose, build, cameraFor, readout, describe, formatFrac, frac,
  displayNumbers,
} from '../assets/js/figures/scenes/smoothie.mjs';
import { paintOrderErrors, coveringAt, paintList } from '../assets/js/figures/kit/depth.mjs';
import { arrowPathD } from '../assets/js/figures/kit/arrows.mjs';
import { cylinder } from '../assets/js/figures/kit/solids.mjs';
import { project } from '../assets/js/figures/kit/camera.mjs';
import { scenes } from '../assets/js/figures/scenes/index.mjs';

const DEF = { a1: [2, 1], a2: [1, 2], b: [4, 5], ghost: [1, 3] };
const SETS = [
  DEF,
  { a1: [1, 1], a2: [2, 1], b: [3, 2], ghost: [3, 1] }, // x=(1,1), xg=(-1,2)
  { a1: [4, 1], a2: [1, 1], b: [5, 2], ghost: [2, -1] }, // x=(1,1), xg=(1,-2)
  { a1: [2, -1], a2: [1, 3], b: [6, 4], ghost: [-1, 4] }, // x=(2,2), xg=(-1,1)
];

const num = (f) => f.n / f.d;

// --- model ---------------------------------------------------------------------

test('registry exposes the scene under its id', () => {
  assert.equal(scenes[id].id, id);
});

test('model: Cramer solution for the lesson params', () => {
  const m = model(DEF);
  assert.equal(m.det, 3);
  assert.deepEqual(m.x.map(num), [1, 2]);
  assert.deepEqual(m.xGhost.map(num), [-1 / 3, 5 / 3]);
});

test('model: Cramer solution for three other valid param sets', () => {
  const expected = [[[1, 1], [-1, 2]], [[1, 1], [1, -2]], [[2, 2], [-1, 1]]];
  SETS.slice(1).forEach((p, i) => {
    const m = model(p);
    assert.deepEqual(m.x.map(num), expected[i][0], `set ${i} x`);
    assert.deepEqual(m.xGhost.map(num), expected[i][1], `set ${i} ghost`);
  });
});

test('validateParams rejects invalid inputs', () => {
  const bad = [
    { ...DEF, a1: [2, 1], a2: [4, 2] }, // det = 0
    { ...DEF, b: [1, 1] }, // x1 = 1/3 not an integer portion
    { ...DEF, b: [2, 1] }, // x2 = 0, x1 = 1: still valid? -> see below
    { ...DEF, a1: [7, 1] }, // out of range
    { ...DEF, a1: [2.5, 1] }, // non-integer
    { ...DEF, ghost: [4, 5] }, // ghost solution positive, no negative component
    { ...DEF, b: [0, 0] }, // no portion at all
  ];
  for (const p of bad) {
    if (p.b?.join() === '2,1') continue; // handled separately below
    assert.throws(() => validateParams(p), Error, JSON.stringify(p));
  }
  // b = [2,1] gives x1=1, x2=0: valid (zero is a legal portion count)
  assert.doesNotThrow(() => validateParams({ ...DEF, b: [2, 1] }));
  assert.throws(() => validateParams({ ...DEF, b: [-1, 1] }));
});

test('evaluate: exact portions hit, wrong portions report the diff vector', () => {
  const m = model(DEF);
  const hit = evaluate(m, [1, 2]);
  assert.ok(hit.hit);
  assert.deepEqual(hit.mix, [4, 5]);
  const miss = evaluate(m, [1, 1]);
  assert.ok(!miss.hit);
  assert.deepEqual(miss.diff, [1, 2]);
  const ghost = evaluate(m, [-1 / 3, 5 / 3], m.ghost);
  assert.ok(ghost.hit, `ghost portions should hit ghost target: ${ghost.diff}`);
});

test('predictValue returns x2 for the predict beat and throws elsewhere', () => {
  const m = model(DEF);
  assert.equal(predictValue(m, 'predict'), 2);
  assert.throws(() => predictValue(m, 'oats'));
});

test('answerValues returns [x1, x2]', () => {
  assert.deepEqual(answerValues(model(DEF)), [1, 2]);
});

test('formatFrac: integers plain, fractions with slash, U+2212 minus', () => {
  assert.equal(formatFrac(frac(2, 1)), '2');
  assert.equal(formatFrac(frac(-1, 3)), '−1/3');
  assert.equal(formatFrac(frac(10, 6)), '5/3');
  assert.equal(formatFrac(frac(-4, 2)), '−2');
});

test('beatDuration: every beat <= 4s', () => {
  for (const b of beatIds) assert.ok(beatDuration(b) <= 4 && beatDuration(b) > 0, b);
  assert.throws(() => beatDuration('nope'));
});

// --- pose -----------------------------------------------------------------------

test('pose continuity: state at beat start equals previous beat end state', () => {
  const m = model(DEF);
  for (let k = 1; k < beatIds.length; k += 1) {
    const prev = pose(m, k - 1, beatDuration(beatIds[k - 1])).state;
    const cur = pose(m, k, 0).state;
    assert.deepEqual(cur, prev, `boundary ${beatIds[k - 1]} -> ${beatIds[k]}`);
  }
});

test('pose: portions accumulate, board camera only on board beat', () => {
  const m = model(DEF);
  const midOats = pose(m, 1, 1.8); // pour window is scoop phase 0.62-0.84
  assert.ok(midOats.state.portions.oats > 0 && midOats.state.portions.oats < 1);
  assert.equal(pose(m, 4, 0).camera, 'board');
  assert.equal(pose(m, 3, 0).camera, 'iso');
  const end = pose(m, 3, beatDuration('berries'));
  assert.equal(end.state.portions.berries, 2);
  assert.equal(end.state.liquid, 1);
  assert.ok(end.state.hitFlash === 0); // flash starts at hit time
  const board = pose(m, 4, 1.1);
  assert.ok(board.state.hitFlash > 0, 'flash should be visible during board beat');
});

test('pose: ghost beat empties the jar, then runs the negative and fractional pours', () => {
  const m = model(DEF);
  const mid = pose(m, 5, beatDuration('ghost') * 0.06);
  assert.ok(mid.state.liquid < 0.6, `liquid should be draining, got ${mid.state.liquid}`);
  const out = pose(m, 5, beatDuration('ghost') * 0.3);
  assert.equal(out.state.scoop.ghost, true);
  assert.equal(out.state.scoop.container, 'oats');
  const end = pose(m, 5, beatDuration('ghost'));
  assert.ok(Math.abs(end.state.portions.oats + 1 / 3) < 1e-9, `oats ${end.state.portions.oats}`);
  assert.ok(Math.abs(end.state.portions.berries - 5 / 3) < 1e-9, `berries ${end.state.portions.berries}`);
  assert.ok(Math.abs(end.state.liquid - 5 / 9) < 1e-9, `liquid ${end.state.liquid}`);
  const g1 = end.state.board.arrows.find((a) => a.id === 'g1');
  const g2 = end.state.board.arrows.find((a) => a.id === 'g2');
  assert.equal(g1.progress, 1);
  assert.equal(g2.progress, 1);
  assert.equal(end.state.board.marker, 'ghost');
  assert.ok(end.state.board.ghostLines > 0.9);
  assert.match(readout(m, end), /Hafer −1\/3[  ]·[  ]Beeren 5\/3[  ]·[  ]Mischung \(1,[  ]3\)/);
});

// --- topology ---------------------------------------------------------------------

function signature(items) {
  return items
    .map((it) => `${it.id}:${it.kind}:${(it.prims || []).map((p) => p.key).join(',')}`)
    .sort()
    .join('|');
}

test('build: stable topology across all beats and times', () => {
  const m = model(DEF);
  const sigs = new Set();
  for (let k = 0; k < beatIds.length; k += 1) {
    for (const t of [0, beatDuration(beatIds[k]) / 2, beatDuration(beatIds[k])]) {
      sigs.add(signature(build(m, pose(m, k, t), 'lesson')));
      sigs.add(signature(build(m, pose(m, k, t), 'hint')));
    }
  }
  assert.equal(sigs.size, 1, `topology changed: ${[...sigs][0]?.slice(0, 200)}`);
});

test('build: mechanism-only density, honest solid count', () => {
  const m = model(DEF);
  const items = build(m, pose(m, 0, 0), 'lesson');
  const solids = items.filter((i) => i.kind === 'solid');
  // Crafted-object density counts parts, not items: the bench is one item
  // but slab, legs, apron, drawer and pull are eight real pieces.
  const parts = solids.reduce(
    (n, i) => n + new Set(i.mesh.faces.map((f) => f.part ?? 0)).size,
    0,
  );
  const planes = items.filter((i) => i.kind === 'plane').length;
  assert.ok(solids.length >= 12 && solids.length <= 16, `${solids.length} solid items`);
  assert.ok(parts >= 20 && parts <= 45, `${parts} solid parts`);
  assert.ok(planes >= 4, `${planes} planes`);
});

/** Text-run contract: sub/sup carry the index STRING the painter prints. */
test('text runs use string sub/sup indices, never flags', () => {
  const m = model(DEF);
  for (let k = 0; k < beatIds.length; k += 1) {
    for (const t of [0, beatDuration(beatIds[k]) / 2, beatDuration(beatIds[k])]) {
      for (const item of build(m, pose(m, k, t), 'lesson')) {
        for (const prim of item.prims || []) {
          if (prim.t !== 'text') continue;
          for (const run of prim.runs) {
            if ('sub' in run) assert.equal(typeof run.sub, 'string', `prim ${prim.key} sub`);
            if ('sup' in run) assert.equal(typeof run.sup, 'string', `prim ${prim.key} sup`);
          }
        }
      }
    }
  }
});

// --- every displayed number comes from the model ----------------------------------

const fracRe = /−?\d+(?:[.,]\d+)?(?:\/\d+)?/g;

function collectTexts(m, mode) {
  const texts = [];
  for (let k = 0; k < beatIds.length; k += 1) {
    for (const t of [0, beatDuration(beatIds[k]) / 2, beatDuration(beatIds[k])]) {
      const p = pose(m, k, t);
      for (const item of build(m, p, mode)) {
        for (const prim of item.prims || []) {
          if (prim.t !== 'text') continue;
          for (const run of prim.runs) texts.push(run.text, run.sub ?? '', run.sup ?? '');
        }
      }
      texts.push(readout(m, p, mode));
      texts.push(describe(m, k, mode));
    }
  }
  return texts;
}

/** Numbers a shown string may contain: the scene's displayNumbers + a bound
 * for in-flight decimals (portions and mixes while pouring). */
function allowedNumbers(m) {
  const exact = new Set(displayNumbers(m));
  const bound = Math.max(...[m.a1, m.a2, m.b, m.ghost].flat().map(Math.abs)) * 3 + 1;
  return { exact, bound };
}

function checkNumberToken(tok, allowed) {
  const value = Number.parseFloat(tok.replace('−', '-').replace(',', '.').split('/')[0])
    / (tok.includes('/') ? Number.parseFloat(tok.split('/')[1]) : 1);
  if (tok.includes(',') || tok.includes('.')) {
    assert.ok(Math.abs(value) <= allowed.bound + 1e-9, `decimal ${tok} out of bounds`);
    return;
  }
  const ok = [...allowed.exact].some((a) => Math.abs(value - a) < 1e-9);
  assert.ok(ok, `number ${tok} (=${value}) not derivable from model`);
}

test('every number on board prims, labels, readout and describe comes from the model', () => {
  for (const params of SETS) {
    const m = model(params);
    const allowed = allowedNumbers(m);
    for (const text of collectTexts(m, 'lesson')) {
      for (const tok of text.match(fracRe) || []) checkNumberToken(tok, allowed);
    }
  }
});

// --- board text size -------------------------------------------------------------

test('board text is >= 14px when the board fills a 343px square stage', () => {
  const m = model(DEF);
  const p = pose(m, 4, 2.2);
  const cam = cameraFor(m, p, { width: 343, height: 343 });
  const face = build(m, p, 'lesson').find((i) => i.id === 'board-face');
  for (const prim of face.prims) {
    if (prim.t !== 'text') continue;
    assert.ok(prim.size * cam.zoom >= 14, `prim ${prim.key} renders at ${prim.size * cam.zoom}px`);
  }
});

// --- board camera occlusion ---------------------------------------------------

/**
 * In the board camera every sample point inside the board-face rect must be
 * covered only by board / board-face — ingredients and the mixer stand in
 * front but below the panel, nothing may occlude the equations.
 */
test('board camera: no item other than the board covers the board face', () => {
  const m = model(DEF);
  const p = pose(m, 4, beatDuration('board'));
  const items = build(m, p, 'lesson');
  const face = items.find((i) => i.id === 'board-face');
  for (const vp of [{ width: 1440, height: 1080 }, { width: 343, height: 343 }]) {
    const cam = cameraFor(m, p, vp);
    const xs = [];
    const ys = [];
    for (const [u, v] of [[0, 0], [face.size[0], 0], [face.size[0], face.size[1]], [0, face.size[1]]]) {
      const [px, py] = project(cam, vp, [
        face.origin[0] + u * face.ex[0] + v * face.ey[0],
        face.origin[1] + u * face.ex[1] + v * face.ey[1],
        face.origin[2] + u * face.ex[2] + v * face.ey[2],
      ]);
      xs.push(px); ys.push(py);
    }
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const offenders = new Set();
    const checkPoint = (x, y) => {
      const hits = coveringAt(items, cam, vp, x, y);
      const bf = hits.find((h) => h.id === 'board-face');
      if (!bf) { offenders.add('no-board-face'); return; }
      for (const h of hits) {
        if (h.id === 'board-face' || h.id === 'board-panel') continue;
        if (h.s !== null && h.s > bf.s + 0.05) offenders.add(h.id);
      }
    };
    for (let fx = 0.02; fx < 0.99; fx += 0.03) {
      for (let fy = 0.02; fy < 0.99; fy += 0.03) {
        checkPoint(x0 + fx * (x1 - x0), y0 + fy * (y1 - y0));
      }
    }
    assert.deepEqual([...offenders], [], `${vp.width}x${vp.height}: items covering the board face`);
  }
});

// --- board arrow labels --------------------------------------------------------------

const boxHit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Arrow labels must not touch target rings, axis lines, tick labels or one
 * another. The scene emits `bb` estimates (plane units) on arrow labels and
 * every obstacle; at every beat end no two visible boxes may intersect.
 */
test('arrow labels never overlap board marks or each other at any beat end', () => {
  for (const params of SETS) {
    const m = model(params);
    for (let k = 0; k < beatIds.length; k += 1) {
      const face = build(m, pose(m, k, beatDuration(beatIds[k])), 'lesson')
        .find((i) => i.id === 'board-face');
      const labels = face.prims.filter((pr) => pr.bb && /^arr-label-/.test(pr.key) && pr.visible !== false);
      const obstacles = face.prims.filter((pr) => pr.bb && !/^arr-label-/.test(pr.key) && pr.visible !== false);
      for (const [i, a] of labels.entries()) {
        for (const r of obstacles) {
          assert.ok(!boxHit(a.bb, r.bb), `beat ${k} ${params.a1}: label ${a.key} hits ${r.key}`);
        }
        for (const b of labels.slice(i + 1)) {
          assert.ok(!boxHit(a.bb, b.bb), `beat ${k} ${params.a1}: ${a.key} hits ${b.key}`);
        }
      }
    }
  }
});

// --- arrowhead geometry -------------------------------------------------------

/**
 * Every arrow's head must sit exactly on its tip: first head vertex == `to`,
 * and the head's symmetry axis (tip to base midpoint) parallel to from→to
 * within 1 degree. Guards the painter path (arrowPathD) the board uses for
 * a₁/a₂ and the ghost arrows at every beat end.
 */
test('arrow heads: tip at `to`, axis parallel to the shaft', () => {
  const headRe = /M\s*(-?[\d.]+)\s+(-?[\d.]+)\s+L\s*(-?[\d.]+)\s+(-?[\d.]+)\s+L\s*(-?[\d.]+)\s+(-?[\d.]+)\s+Z/;
  for (const params of SETS) {
    const m = model(params);
    for (let k = 0; k < beatIds.length; k += 1) {
      const face = build(m, pose(m, k, beatDuration(beatIds[k])), 'lesson')
        .find((i) => i.id === 'board-face');
      const arrows = face.prims.filter((pr) => pr.t === 'arrow' && pr.visible !== false);
      for (const prim of arrows) {
        const d = arrowPathD(prim.from, prim.to);
        const match = headRe.exec(d.slice(d.indexOf('Z') === -1 ? 0 : d.indexOf('M', 1)));
        assert.ok(match, `${prim.key}: no head subpath in "${d}"`);
        const [, tipx, tipy, ax, ay, bx, by] = match.map(Number);
        assert.ok(
          // Rounded to 2 decimals in the path string: worst drift is ~0.008.
          Math.hypot(tipx - prim.to[0], tipy - prim.to[1]) < 0.01,
          `${prim.key}: head tip (${tipx},${tipy}) != to (${prim.to})`,
        );
        const mx = (ax + bx) / 2 - tipx;
        const my = (ay + by) / 2 - tipy;
        const dx = prim.to[0] - prim.from[0];
        const dy = prim.to[1] - prim.from[1];
        const shaftLen = Math.hypot(dx, dy);
        if (shaftLen < 0.05) continue; // a collapsed arrow has no direction to test
        const cos = (mx * dx + my * dy) / (Math.hypot(mx, my) * shaftLen);
        const angle = Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI;
        // Base midpoint sits BEHIND the tip along the shaft.
        assert.ok(angle > 179, `${prim.key}: head axis off by ${(180 - angle).toFixed(1)}°`);
      }
    }
  }
});

// --- ghost beat end state -------------------------------------------------------------

test('ghost beat ends with the tipped ghost scoop held over the oat bin', () => {
  const m = model(DEF);
  const end = pose(m, 5, beatDuration('ghost'));
  assert.equal(end.state.scoop.ghost, true);
  assert.equal(end.state.scoop.container, 'oats');
  assert.ok(end.state.scoop.tip > 0.5, `tip ${end.state.scoop.tip}`);
  const items = build(m, end, 'lesson');
  const scoop = items.find((i) => i.id === 'scoop');
  const load = items.find((i) => i.id === 'scoop-load');
  // Held above the bin (pour point x 7, y -1, z 27), not parked at x 28.5.
  assert.ok(Math.abs(scoop.mesh.center[0] - 7) < 4, `scoop x ${scoop.mesh.center[0]}`);
  assert.ok(scoop.mesh.center[2] > 20, `scoop z ${scoop.mesh.center[2]}`);
  assert.notEqual(load.visible, false, 'ghost load must stay visible');
  assert.equal(load.tone, 'ghost');
  // Earlier beats still park the scoop.
  const board = build(m, pose(m, 4, beatDuration('board')), 'lesson')
    .find((i) => i.id === 'scoop');
  assert.ok(board.mesh.center[0] > 20, `parked scoop x ${board.mesh.center[0]}`);
});

// --- oracle: the exact bin geometry ---------------------------------------------------

/**
 * Negative control from the real oat bin: take the built bin compound, swap
 * the heap for one that pierces the front wall — an unorderable pair no
 * paint order can fix. The oracle must flag within-item face errors, which
 * is exactly the hole a "front wall before interior" ordering creates.
 */
test('oracle flags a heap piercing the bin front wall (exact bin geometry)', () => {
  const m = model(DEF);
  const p = pose(m, 0, beatDuration('ingredients'));
  const items = build(m, p, 'lesson');
  const bin = items.find((i) => i.id === 'oats-bin');
  const heapPart = Math.max(...bin.mesh.faces.map((f) => f.part ?? 0));
  const piercer = cylinder([7, -1, 16], 5.8, 8, { segments: 9 }); // y -6.8..4.8: through the front wall
  const faces = [
    ...bin.mesh.faces.filter((f) => (f.part ?? 0) !== heapPart),
    ...piercer.faces.map((f) => ({ ...f, part: heapPart })),
  ];
  const bad = { ...bin, mesh: { ...bin.mesh, faces } };
  const vp = { width: 1080, height: 810 };
  const cam = cameraFor(m, p, vp);
  const good = paintOrderErrors(items, cam, vp, { step: 2 });
  assert.deepEqual(good.filter((e) => e.front.startsWith('oats-bin')), [], 'real bin must be clean');
  const errs = paintOrderErrors(items.map((i) => (i.id === 'oats-bin' ? bad : i)), cam, vp, { step: 2 });
  assert.ok(
    errs.some((e) => e.front.startsWith('oats-bin') && e.behind.startsWith('oats-bin')),
    `piercing heap must flag within-bin errors, got ${errs.length}`,
  );
});

// --- depth sweep --------------------------------------------------------------------

test('paintOrderErrors is 0 at every beat end across azimuths and elevations', () => {
  const m = model(DEF);
  const vp = { width: 640, height: 400 };
  const failures = [];
  const check = (items, cam, tag) => {
    const errors = paintOrderErrors(items, cam, vp, { step: 6, tolerance: 0.05 });
    for (const e of errors) failures.push(`${tag}: ${e.front} painted before nearer-than ${e.behind} at ${e.at} gap ${e.gap.toFixed(2)}`);
  };
  for (let k = 0; k < beatIds.length; k += 1) {
    const p = pose(m, k, beatDuration(beatIds[k]));
    const items = build(m, p, 'lesson');
    for (let az = 0; az < 360; az += 30) {
      for (const el of [15, 30, 50]) {
        const cam = { azimuth: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, zoom: 8, target: [1, 1, 24] };
        check(items, cam, `beat ${beatIds[k]} az${az} el${el}`);
      }
    }
    check(items, cameraFor(m, p, vp), `beat ${beatIds[k]} scene-cam`);
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} paint-order failures`);
});

test('incremental (warm-cache) paint order equals full order over the beat timeline', () => {
  const m = model(DEF);
  // Ten fixed cameras: the scene camera plus nine probe azimuths.
  const vp = { width: 640, height: 400 };
  const base = cameraFor(m, pose(m, 0, 0), vp);
  const cams = [base];
  for (let i = 1; i < 10; i += 1) {
    cams.push({ ...base, azimuth: base.azimuth + (i * Math.PI * 2) / 10 });
  }
  const seq = (items, cam) =>
    paintList(items, cam).map((e) => `${e.item.id}#${e.faceIndex}`);
  for (const cam of cams) {
    // Walk the beat timeline once (cold), then repeat (warm caches): the
    // memoized pairwise relations must reproduce the exact same order —
    // dynamic items are rebuilt per call, so only static pairs hit cache.
    const cold = [];
    const warm = [];
    for (const pass of [cold, warm]) {
      for (let k = 0; k < beatIds.length; k += 1) {
        const dur = beatDuration(beatIds[k]);
        for (const t of [0, dur / 2, dur]) {
          pass.push(seq(build(m, pose(m, k, t), 'lesson'), cam));
        }
      }
    }
    assert.deepEqual(warm, cold, `warm order diverged at azimuth ${cam.azimuth}`);
  }
});

// --- hint-mode leak check -------------------------------------------------------------

/** Notations of v that must never appear in an answer-bearing string. */
function notations(v) {
  const out = new Set();
  for (const sign of ['', '-', '−']) {
    const a = Math.abs(v);
    out.add(`${sign}${a}`);
    for (let d = 0; d <= 3; d += 1) {
      out.add(`${sign}${a.toFixed(d)}`);
      out.add(`${sign}${a.toFixed(d).replace('.', ',')}`);
    }
    const f = frac(Math.round(v * 1000), 1000);
    if (f.d !== 1) out.add(`${sign}${f.n}/${f.d}`);
  }
  return out;
}

/**
 * Answer-bearing places: equation prims, arrow labels, readout, describe.
 * Not answer-bearing: label plates (nutrient vectors are the givens) and grid
 * tick labels (scale; the geometric-leak concern is a review item, not auto).
 */
function answerStrings(m, mode) {
  const out = [];
  for (let k = 0; k < beatIds.length; k += 1) {
    const p = pose(m, k, beatDuration(beatIds[k]));
    for (const item of build(m, p, mode)) {
      for (const prim of item.prims || []) {
        if (!/^eq-|^arr-label-/.test(prim.key)) continue;
        for (const run of prim.runs) out.push(run.text);
      }
    }
    out.push(readout(m, p, mode));
    out.push(describe(m, k, mode));
  }
  return out;
}

test('hint mode never displays x1 or x2 in any common notation', () => {
  for (const params of SETS) {
    const m = model(params);
    const leaks = [];
    const answers = answerValues(m);
    for (const text of answerStrings(m, 'hint')) {
      for (const v of answers) {
        for (const n of notations(v)) {
          if (n && text.includes(n)) leaks.push(`"${text}" contains "${n}"`);
        }
      }
    }
    assert.deepEqual(leaks.slice(0, 10), [], `param set ${JSON.stringify(params)}: ${leaks.length} leaks`);
  }
});

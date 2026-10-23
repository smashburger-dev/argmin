// Unit tests for the pure figure kit: camera projection, meshes, motion,
// depth keys and the paint-order oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deg, ISO, basis, project, projectVector, planeMatrix, facesViewer,
  shadeOf, lerpCamera, fitZoom,
} from '../assets/js/figures/kit/camera.mjs';
import { box, cylinder, transformMesh, newellNormal, compound } from '../assets/js/figures/kit/solids.mjs';
import { itemKey, sortItems, paintOrderErrors, paintList } from '../assets/js/figures/kit/depth.mjs';
import { clampDt, follow, settle, angleDelta, smoothstep, span, burst } from '../assets/js/figures/kit/motion.mjs';

const VP = { width: 640, height: 400 };
const FRONTAL = { azimuth: 0, elevation: 0, zoom: 10, target: [0, 0, 0] };
const isoCam = { azimuth: ISO.azimuth, elevation: ISO.elevation, zoom: 8, target: [0, 0, 0] };

// --- camera ---------------------------------------------------------------------

test('frontal camera maps world x to screen x and world z to -screen y exactly', () => {
  assert.deepEqual(project(FRONTAL, VP, [1, 0, 0]), [VP.width / 2 + 10, VP.height / 2, 0]);
  assert.deepEqual(project(FRONTAL, VP, [0, 0, 1]), [VP.width / 2, VP.height / 2 - 10, 0]);
  assert.deepEqual(project(FRONTAL, VP, [0, 0, 0]), [VP.width / 2, VP.height / 2, 0]);
  // a point behind the target along +y has negative depth (farther from viewer)
  assert.equal(project(FRONTAL, VP, [0, 1, 0])[2], -1);
});

test('basis at azimuth=0, elevation=0 is the document frontal basis', () => {
  const { right, up, toward } = basis(FRONTAL);
  assert.ok(Math.abs(right[0] - 1) < 1e-12 && Math.abs(right[1]) < 1e-12);
  assert.ok(Math.abs(up[2] - 1) < 1e-12);
  assert.ok(Math.abs(toward[1] + 1) < 1e-12);
});

test('planeMatrix agrees with project for plane-local points', () => {
  const rng = (() => { let s = 42; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();
  const ex = [1, 0, 0];
  const ey = [0, 0, -1];
  const origin = [3, -2, 5];
  const m = planeMatrix(isoCam, VP, origin, ex, ey);
  for (let i = 0; i < 25; i += 1) {
    const u = rng() * 10 - 5;
    const v = rng() * 10 - 5;
    const world = [origin[0] + u * ex[0] + v * ey[0], origin[1] + u * ex[1] + v * ey[1], origin[2] + u * ex[2] + v * ey[2]];
    const [px, py] = project(isoCam, VP, world);
    const mx = m[0] * u + m[2] * v + m[4];
    const my = m[1] * u + m[3] * v + m[5];
    assert.ok(Math.abs(mx - px) < 1e-9, `matrix x ${mx} != project ${px}`);
    assert.ok(Math.abs(my - py) < 1e-9, `matrix y ${my} != project ${py}`);
  }
});

test('planeMatrix at frontal camera is a pure scale+translate', () => {
  const m = planeMatrix(FRONTAL, VP, [0, 0, 0], [1, 0, 0], [0, 0, -1]);
  assert.ok(Math.abs(m[0] - 10) < 1e-12 && Math.abs(m[1]) < 1e-12);
  assert.ok(Math.abs(m[2]) < 1e-12 && Math.abs(m[3] - 10) < 1e-12);
});

test('facesViewer: sharp box at ISO shows exactly 3 faces', () => {
  const mesh = box([0, 0, 0], [10, 10, 10]);
  const visible = mesh.faces.filter((f) => facesViewer(isoCam, f.normal));
  assert.equal(visible.length, 3);
  assert.equal(mesh.faces.length - visible.length, 3);
});

test('mesh normals equal the Newell normal of their points', () => {
  for (const mesh of [box([0, 0, 0], [4, 6, 8]), box([0, 0, 0], [4, 6, 8], { radius: 1.5 }), cylinder([0, 0, 0], 3, 5)]) {
    for (const f of mesh.faces) {
      const n = newellNormal(f.pts);
      for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(n[i] - f.normal[i]) < 1e-9);
    }
  }
});

test('rounded box is convex: all vertices lie behind every face plane', () => {
  const mesh = box([0, 0, 0], [10, 8, 6], { radius: 2, segments: 5 });
  for (const f of mesh.faces) {
    for (const g of mesh.faces) {
      for (const p of g.pts) {
        const d = (p[0] - f.pts[0][0]) * f.normal[0] + (p[1] - f.pts[0][1]) * f.normal[1] + (p[2] - f.pts[0][2]) * f.normal[2];
        assert.ok(d <= 1e-9, `vertex ${p} is ${d} outside face`);
      }
    }
  }
});

test('shadeOf at ISO: top face lighter than screen-left, screen-left lighter than screen-right', () => {
  const top = shadeOf(isoCam, [0, 0, 1]);
  const south = shadeOf(isoCam, [0, -1, 0]); // projects to screen-left
  const east = shadeOf(isoCam, [1, 0, 0]); // projects to screen-right
  assert.ok(top > south, `top ${top} <= south ${south}`);
  assert.ok(south > east, `south ${south} <= east ${east}`);
});

test('lerpCamera interpolates azimuth along the shortest arc', () => {
  const a = { ...isoCam, azimuth: deg(350), target: [0, 0, 0] };
  const b = { ...isoCam, azimuth: deg(10), target: [0, 0, 0] };
  const mid = lerpCamera(a, b, 0.5);
  assert.ok(Math.abs(mid.azimuth) < deg(1) || Math.abs(mid.azimuth - Math.PI * 2) < deg(1), `mid azimuth ${mid.azimuth}`);
});

test('projectVector has no viewport offset and includes zoom', () => {
  assert.deepEqual(projectVector(FRONTAL, [2, 0, 0]), [20, 0]);
  assert.deepEqual(projectVector(FRONTAL, [0, 0, 3]), [0, -30]);
});

test('fitZoom fits a point spread into the viewport with margin', () => {
  const cam = { azimuth: 0, elevation: 0, zoom: 0, target: [0, 0, 0] };
  const wide = fitZoom({ width: 120, height: 80 }, [[-5, 0, 0], [5, 0, 0]], cam, 10);
  assert.ok(Math.abs(wide - 10) < 1e-9); // x-span 10 into 120-20 -> 10
  const tall = fitZoom({ width: 120, height: 40 }, [[-5, 0, 0], [5, 0, 0], [0, 0, 20]], cam, 10);
  assert.ok(Math.abs(tall - 1) < 1e-9); // z-span 20 limits: (40-20)/20 = 1
});

// --- meshes ---------------------------------------------------------------------

test('box face normals point outward on all six sides', () => {
  const m = box([0, 0, 0], [4, 6, 8]);
  const dirs = new Set(m.faces.map((f) => f.normal.map((c) => Math.round(c)).join(',')));
  for (const d of ['0,0,1', '0,0,-1', '1,0,0', '-1,0,0', '0,1,0', '0,-1,0']) assert.ok(dirs.has(d), d);
});

test('transformMesh rotates a box around z and translates it, original untouched', () => {
  const m = box([0, 0, 0], [2, 4, 6]);
  const moved = transformMesh(m, { rotate: { axis: 'z', angle: Math.PI / 2, pivot: [0, 0, 0] }, translate: [10, 0, 0] });
  // rotate first: (x, y) -> (-y, x) maps the box onto x in [-4, 0], y in [0, 2]
  assert.ok(Math.abs(moved.max[0] - 10) < 1e-9 && Math.abs(moved.max[1] - 2) < 1e-9, `got ${moved.max}`);
  assert.deepEqual(m.min, [0, 0, 0]);
  const topNormal = moved.faces.find((f) => Math.abs(f.normal[2] - 1) < 1e-9);
  assert.ok(topNormal, 'top face still has +z normal after rotation');
});

test('transformMesh keeps per-face tone and other face fields', () => {
  const m = compound([{ mesh: box([0, 0, 0], [2, 2, 2]), tone: 'hi' }, { mesh: box([0, 0, 2], [2, 2, 1]) }]);
  const moved = transformMesh(m, { translate: [5, 5, 0] });
  assert.ok(moved.faces.some((f) => f.tone === 'hi'), 'tone dropped');
  assert.ok(moved.faces.some((f) => f.tone === undefined), 'untone faces should stay untoned');
});

// --- motion --------------------------------------------------------------------

test('clampDt: first frame is 1/60, later frames clamp at 1/30', () => {
  assert.equal(clampDt(1000, 0), 1 / 60);
  assert.equal(clampDt(1010, 1000), 0.01);
  assert.equal(clampDt(5000, 1000), 1 / 30);
});

test('follow eases toward target and snaps under 1e-4; calm jumps', () => {
  assert.equal(follow(0, 5, 0.016, 0.3, true), 5);
  let x = 0;
  for (let i = 0; i < 600; i += 1) x = follow(x, 5, 1 / 60, 0.2, false);
  assert.equal(x, 5); // snapped
  assert.equal(follow(4.999999, 5, 1 / 60, 0.2, false), 5);
});

test('settle converges without overshoot and reports rest', () => {
  const st = { x: 0, v: 0 };
  let moving = true;
  let peak = -Infinity;
  for (let i = 0; i < 900 && moving; i += 1) {
    moving = settle(st, 1, 1 / 60, 0.4, false);
    peak = Math.max(peak, st.x);
  }
  assert.equal(moving, false);
  assert.ok(peak <= 1 + 1e-9, `overshoot to ${peak}`);
  assert.equal(st.x, 1);
  assert.equal(st.v, 0);
});

test('angleDelta returns the shortest signed arc', () => {
  assert.ok(Math.abs(angleDelta(0, Math.PI / 2) - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(angleDelta(0, (3 * Math.PI) / 2) + Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(angleDelta(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9);
});

test('smoothstep / span / burst basics', () => {
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.ok(Math.abs(smoothstep(0, 1, 0.5) - 0.5) < 1e-12);
  assert.equal(span(0.1, 0.2, 0.8), 0);
  assert.equal(span(0.9, 0.2, 0.8), 1);
  assert.equal(burst(-0.1, 0.2, 0.5), 0);
  assert.ok(Math.abs(burst(0.2, 0.2, 0.5) - 1) < 1e-9);
  assert.ok(burst(0.7, 0.2, 0.5) < 1);
});

// --- depth ---------------------------------------------------------------------

const near = (y) => box([-2, y, 0], [4, 4, 4]);
const solidItem = (id, y, extra = {}) => ({ kind: 'solid', id, mesh: near(y), tone: 'mid', ...extra });

test('itemKey lifts an item behind its on host to at least the host key', () => {
  const host = solidItem('host', 0);
  const guest = { ...solidItem('guest', -6), on: 'host', bias: -100 };
  const byId = new Map([[host.id, host], [guest.id, guest]]);
  const key = itemKey(guest, isoCam, byId);
  assert.ok(key >= itemKey(host, isoCam, byId), 'guest key must reach the host key despite bias');
  // and the sort places the guest strictly after its host
  const sorted = sortItems([guest, host], isoCam);
  assert.ok(sorted.indexOf(guest) > sorted.indexOf(host), 'guest must paint after host');
});

test('sortItems orders far to near and stays stable', () => {
  const items = [solidItem('near', -8), solidItem('mid', 0), solidItem('far', 8)];
  const sorted = sortItems(items, isoCam);
  assert.deepEqual(sorted.map((i) => i.id), ['far', 'mid', 'near']);
});

test('paintOrderErrors: a bad bias self-orders, interpenetration stays flagged', () => {
  // at azimuth 0 the viewer sits at -y: box at y=-6 is nearer than box at y=+6
  const front = solidItem('front', -6);
  const back = solidItem('back', 6);
  const cam = { azimuth: 0, elevation: deg(10), zoom: 10, target: [0, 0, 2] };
  assert.deepEqual(paintOrderErrors([front, back], cam, { width: 200, height: 200 }), []);
  // A bias can no longer misorder: where surfaces truly overlap, pairwise
  // ray depth in paintList decides — bias only seeds unrelated items.
  const biased = [{ ...front, bias: -50 }, back];
  assert.deepEqual(paintOrderErrors(biased, cam, { width: 200, height: 200 }), []);
  // Negative control: two boxes poking through each other have no correct
  // order — each is nearer at some pixels — so the oracle must complain.
  const a = { kind: 'solid', id: 'a', mesh: box([-1, -1, 0], [2, 2, 2]), tone: 'mid' };
  const b = { kind: 'solid', id: 'b', mesh: box([-0.5, -0.5, -0.5], [1, 1, 3]), tone: 'mid' };
  const errors = paintOrderErrors([a, b], cam, { width: 200, height: 200 });
  assert.ok(errors.length > 0, 'interpenetrating pair must produce errors');
});

test('paintOrderErrors flags a misordered compound: near tip painted before the slab it pierces', () => {
  // Slab A at y in [0,2]; a thin rod B from y=-0.5 to y=5 pokes through A's
  // front face. B's centroid is behind A's, so face-sort paints B first —
  // but B's tip pixels are nearer than A's front: a real paint error the
  // oracle must catch inside a single item.
  const slab = box([-2, 0, 0], [4, 2, 2]);
  const rod = box([-0.4, -0.5, 0.5], [0.8, 5.5, 1]);
  const item = { kind: 'solid', id: 'comp', mesh: compound([{ mesh: slab }, { mesh: rod }]), tone: 'mid' };
  const cam = { azimuth: 0, elevation: deg(10), zoom: 30, target: [0, 1, 1] };
  const errors = paintOrderErrors([item], cam, { width: 300, height: 300 });
  assert.ok(errors.length > 0, 'misordered compound must produce errors');
  assert.ok(errors.some((e) => e.front.startsWith('comp#') && e.behind.startsWith('comp#')));
});

test('paintList expands solids to drawn faces and keeps planes/strokes as single entries', () => {
  const items = [
    solidItem('a', -4),
    { kind: 'plane', id: 'p', origin: [0, 0, 0], ex: [1, 0, 0], ey: [0, 0, -1], size: [2, 2], normal: [0, -1, 0], prims: [] },
    { kind: 'stroke', id: 's', pts: [[0, 0, 0], [1, 1, 1]], tone: 'mid', width: 0.2 },
  ];
  const list = paintList(items, isoCam);
  const faces = list.filter((e) => e.item.id === 'a');
  assert.ok(faces.length >= 2 && faces.length <= 3, `box at iso should draw 3 faces, got ${faces.length}`);
  assert.ok(faces.every((e) => e.face && e.faceIndex >= 0));
  assert.equal(list.find((e) => e.item.id === 'p').face, null);
  assert.equal(list.find((e) => e.item.id === 's').face, null);
});

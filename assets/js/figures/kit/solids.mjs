// Convex primitive meshes for the figure kit. Faces list their points
// counter-clockwise seen from outside; normals are outward unit vectors
// (Newell normal of the points, so geometry and normal always agree).

/** @typedef {import('./camera.mjs').Vec3} Vec3 */
/** @typedef {{ pts: Vec3[], normal: Vec3, tone?: string }} Face */
/** @typedef {{ faces: Face[], center: Vec3, min: Vec3, max: Vec3 }} Mesh */

/** Newell normal of a polygon, normalized. @param {Vec3[]} pts @returns {Vec3} */
export function newellNormal(pts) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const len = Math.hypot(nx, ny, nz);
  return len < 1e-12 ? [0, 0, 0] : [nx / len, ny / len, nz / len];
}

/** @param {Face[]} faces @returns {Mesh} */
function meshOfFaces(faces) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let count = 0;
  for (const f of faces) {
    for (const p of f.pts) {
      for (let i = 0; i < 3; i += 1) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
        sum[i] += p[i];
      }
      count += 1;
    }
  }
  return { faces, center: sum.map((s) => s / count), min, max };
}

/** @param {Vec3[][]} polys @returns {Mesh} */
function meshOf(polys) {
  return meshOfFaces(polys.map((pts) => ({ pts, normal: newellNormal(pts) })));
}

/**
 * Union of several meshes into one item's mesh. Faces may carry a per-face
 * `tone` (the renderer falls back to the item tone). Compound parts are the
 * right tool for pieces that interpenetrate their host (legs under a slab,
 * a knob on a base): the faces keep their part index in `face.part`, and
 * depth.mjs orders parts — never individual faces across parts, since faces
 * of one convex part can never overlap anyway.
 * @param {Array<{ mesh: Mesh, tone?: string }>} parts @returns {Mesh}
 */
export function compound(parts) {
  const faces = [];
  let nextPart = 0;
  for (const { mesh, tone } of parts) {
    // Inner part tags survive nesting: offset them so every part id is unique.
    let innerMax = -1;
    for (const f of mesh.faces) innerMax = Math.max(innerMax, f.part ?? 0);
    for (const f of mesh.faces) {
      const tagged = { ...f, part: nextPart + (f.part ?? 0) };
      if (tone) tagged.tone = tone;
      faces.push(tagged);
    }
    nextPart += innerMax + 1;
  }
  return meshOfFaces(faces);
}

/**
 * Plan-view outline of an axis-aligned rectangle with rounded corners.
 * Counter-clockwise seen from +z: one start point per straight side and
 * `segments` points per corner arc.
 * @returns {Array<[number, number]>}
 */
function roundedRectOutline(x0, y0, x1, y1, r, segments) {
  const corners = [
    [x1 - r, y0 + r, -Math.PI / 2], // SE: arc from south point to east point
    [x1 - r, y1 - r, 0], // NE
    [x0 + r, y1 - r, Math.PI / 2], // NW
    [x0 + r, y0 + r, Math.PI], // SW
  ];
  // CCW traversal: start on the south edge, go east, then around.
  const pts = [[x0 + r, y0]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 1; i <= segments; i += 1) {
      const a = a0 + (i / segments) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  // corners visited in order SE(θ -90..0), NE(0..90), NW(90..180), SW(180..270)
  // produce the loop south-edge -> east edge -> ... back to start, CCW.
  return pts;
}

/**
 * Extrude a plan outline into sides plus top and bottom n-gons.
 * `smoothSide(i)` marks side face i as part of a curved surface: the painter
 * draws no per-facet stroke on smooth faces, only the part silhouette.
 * @returns {Face[]}
 */
function prismFaces(outline, z0, z1, smoothSide = () => false) {
  const faces = [];
  const n = outline.length;
  const top = outline.map(([x, y]) => [x, y, z1]);
  const bottom = outline.map(([x, y]) => [x, y, z0]).reverse();
  for (const pts of [top, bottom]) faces.push({ pts, normal: newellNormal(pts) });
  for (let i = 0; i < n; i += 1) {
    const [ax, ay] = outline[i];
    const [bx, by] = outline[(i + 1) % n];
    const pts = [
      [ax, ay, z0],
      [bx, by, z0],
      [bx, by, z1],
      [ax, ay, z1],
    ];
    faces.push({ pts, normal: newellNormal(pts), smooth: smoothSide(i) });
  }
  return faces;
}

/**
 * Axis-aligned cuboid. radius > 0 rounds the four vertical edges: top and
 * bottom become rounded-rect n-gons, the side becomes one quad per straight
 * side plus `segments` quads per corner arc. The result stays convex.
 * @param {Vec3} min @param {Vec3} size
 * @param {{ radius?: number, segments?: number }} [opts]
 * @returns {Mesh}
 */
export function box(min, size, { radius = 0, segments = 4 } = {}) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = [x0 + size[0], y0 + size[1], z0 + size[2]];
  const r = Math.min(radius, size[0] / 2, size[1] / 2);
  if (r <= 0) {
    return meshOf([
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], // top +z
      [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], // bottom -z
      [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], // +x
      [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], // -x
      [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], // +y
      [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], // -y
    ]);
  }
  // Rounded-box sides: every `segments`-th face is a flat side slab; the
  // corner-arc facets between them are smooth (no per-facet stroke).
  return meshOfFaces(prismFaces(roundedRectOutline(x0, y0, x1, y1, r, segments), z0, z1,
    (i) => i % segments !== 0));
}

/**
 * z-axis cylinder. base is the center of the bottom face.
 * @param {Vec3} base @param {number} radius @param {number} height
 * @param {{ segments?: number }} [opts] @returns {Mesh}
 */
export function cylinder(base, radius, height, { segments = 20 } = {}) {
  const outline = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    outline.push([base[0] + radius * Math.cos(a), base[1] + radius * Math.sin(a)]);
  }
  return meshOfFaces(prismFaces(outline, base[2], base[2] + height, () => true));
}

/** @param {Vec3} p @param {'x'|'y'|'z'} axis @param {number} angle radians */
function rotatePoint(p, axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y, z] = p;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

/**
 * New mesh: rotate around pivot (axis parallel to x/y/z through pivot), then
 * translate. Normals rotate with the mesh. The input is not modified, so the
 * renderer can key projected paths by mesh identity.
 * @param {Mesh} mesh
 * @param {{ rotate?: { axis: 'x'|'y'|'z', angle: number, pivot: Vec3 }, translate?: Vec3 }} t
 * @returns {Mesh}
 */
export function transformMesh(mesh, { rotate, translate } = {}) {
  const pivot = rotate ? rotate.pivot : [0, 0, 0];
  const off = translate || [0, 0, 0];
  const mapPoint = (p) => {
    let v = p;
    if (rotate) {
      const local = [v[0] - pivot[0], v[1] - pivot[1], v[2] - pivot[2]];
      const r = rotatePoint(local, rotate.axis, rotate.angle);
      v = [r[0] + pivot[0], r[1] + pivot[1], r[2] + pivot[2]];
    }
    return [v[0] + off[0], v[1] + off[1], v[2] + off[2]];
  };
  // Extra face fields (tone, part) ride along; normals rotate with the points.
  const faces = mesh.faces.map((f) => ({
    ...f,
    pts: f.pts.map(mapPoint),
    normal: rotate ? rotatePoint(f.normal, rotate.axis, rotate.angle) : f.normal,
  }));
  return meshOfFaces(faces);
}

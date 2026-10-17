// Orthographic camera for the figure kit. World: x right/east, y away/north,
// z up. Screen: x right, y down, units are CSS px (viewBox equals stage size).

/**
 * @typedef {[number, number, number]} Vec3
 * @typedef {{ azimuth: number, elevation: number, zoom: number, target: Vec3 }} Camera
 *   azimuth/elevation in radians, zoom in px per world unit, target = world point
 *   at viewport center. azimuth 0, elevation 0 looks along +y from the south.
 * @typedef {{ width: number, height: number }} Viewport
 */

/** @param {number} d degrees @returns {number} radians */
export function deg(d) {
  return (d * Math.PI) / 180;
}

/** Preset angles for the default isometric view (40° keeps label faces readable). */
export const ISO = { azimuth: deg(40), elevation: deg(30) };

/** @param {Vec3} a @param {Vec3} b @returns {number} */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** @param {Vec3} a @param {Vec3} b @returns {Vec3} a cross b */
export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** @param {Vec3} v @returns {Vec3} unit vector */
export function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < 1e-12 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Camera basis: toward = unit vector from target to the viewer,
 * right = screen right in world space, up = screen up in world space.
 * @param {Camera} camera @returns {{ right: Vec3, up: Vec3, toward: Vec3 }}
 */
export function basis(camera) {
  const sinA = Math.sin(camera.azimuth);
  const cosA = Math.cos(camera.azimuth);
  const cosE = Math.cos(camera.elevation);
  const sinE = Math.sin(camera.elevation);
  const toward = [sinA * cosE, -cosA * cosE, sinE];
  const right = [cosA, sinA, 0];
  const up = cross(toward, right);
  return { right, up, toward };
}

/**
 * Hot-path projection: precompute basis, zoom, target and viewport center
 * once, then map points without redoing the trigonometry. The closure also
 * exposes `right`/`up`/`toward` for callers that need the camera basis
 * (depth ordering, shading, plane matrices).
 * @param {Camera} camera @param {Viewport} viewport
 * @returns {(p: Vec3) => [number, number, number]} with basis vectors attached
 */
export function projector(camera, viewport) {
  const { right, up, toward } = basis(camera);
  const { zoom } = camera;
  const [tx, ty, tz] = camera.target;
  const hw = viewport.width / 2;
  const hh = viewport.height / 2;
  const proj = (p) => {
    const dx = p[0] - tx;
    const dy = p[1] - ty;
    const dz = p[2] - tz;
    return [
      hw + zoom * (dx * right[0] + dy * right[1] + dz * right[2]),
      hh - zoom * (dx * up[0] + dy * up[1] + dz * up[2]),
      dx * toward[0] + dy * toward[1] + dz * toward[2],
    ];
  };
  proj.right = right;
  proj.up = up;
  proj.toward = toward;
  proj.camera = camera;
  proj.viewport = viewport;
  return proj;
}

/**
 * Project a world point. Returns screen x, screen y and depth
 * (larger depth = nearer to the viewer).
 * @param {Camera} camera @param {Viewport} viewport @param {Vec3} p
 * @returns {[number, number, number]}
 */
export function project(camera, viewport, p) {
  const { right, up, toward } = basis(camera);
  const d = [p[0] - camera.target[0], p[1] - camera.target[1], p[2] - camera.target[2]];
  return [
    viewport.width / 2 + camera.zoom * dot(d, right),
    viewport.height / 2 - camera.zoom * dot(d, up),
    dot(d, toward),
  ];
}

/**
 * Project a world direction (no viewport offset, includes zoom). The screen y
 * axis points down, so the result is [zoom·dot(v, right), -zoom·dot(v, up)].
 * @param {Camera} camera @param {Vec3} v @returns {[number, number]}
 */
export function projectVector(camera, v) {
  const { right, up } = basis(camera);
  // +0 keeps -0 out of the result
  return [camera.zoom * dot(v, right) + 0, -camera.zoom * dot(v, up) + 0];
}

/**
 * SVG affine matrix (a b c d e f) mapping plane-local (u, v) to screen, where u
 * runs along ex and v along ey (both world unit vectors). Exact for
 * orthographic cameras. Callers pick ey pointing down the plane so text reads
 * naturally.
 * @param {Camera} camera @param {Viewport} viewport @param {Vec3} origin
 * @param {Vec3} ex @param {Vec3} ey @returns {[number, number, number, number, number, number]}
 */
export function planeMatrix(camera, viewport, origin, ex, ey) {
  const [dux, duy] = projectVector(camera, ex);
  const [dvx, dvy] = projectVector(camera, ey);
  const [sx, sy] = project(camera, viewport, origin);
  return [dux, duy, dvx, dvy, sx, sy];
}

/** @param {Camera} camera @param {Vec3} normal @returns {boolean} face visible */
export function facesViewer(camera, normal) {
  const { toward } = basis(camera);
  return dot(normal, toward) > 1e-6;
}

/**
 * Camera-relative key light direction (upper-left-front), computed once per
 * frame so hot loops can shade many normals against the same light.
 * @param {{ right: Vec3, up: Vec3, toward: Vec3 }} b camera basis
 * @returns {Vec3}
 */
export function lightDir(b) {
  return normalize([
    -0.45 * b.right[0] + 0.8 * b.up[0] + 0.4 * b.toward[0],
    -0.45 * b.right[1] + 0.8 * b.up[1] + 0.4 * b.toward[1],
    -0.45 * b.right[2] + 0.8 * b.up[2] + 0.4 * b.toward[2],
  ]);
}

/** @param {Vec3} light @param {Vec3} normal @returns {number} shade in [0, 1] */
export function shadeAt(light, normal) {
  const n = normalize(normal);
  return 0.22 + 0.78 * Math.max(0, dot(n, light));
}

/**
 * Camera-relative key light from upper-left-front.
 * @param {Camera} camera @param {Vec3} normal @returns {number} shade in [0, 1]
 */
export function shadeOf(camera, normal) {
  return shadeAt(lightDir(basis(camera)), normal);
}

/**
 * Interpolate two cameras; azimuth follows the shortest arc.
 * @param {Camera} a @param {Camera} b @param {number} s in [0, 1]
 * @returns {Camera}
 */
export function lerpCamera(a, b, s) {
  const tau = Math.PI * 2;
  const dAz = ((((b.azimuth - a.azimuth) % tau) + tau * 1.5) % tau) - Math.PI;
  const lerp = (x, y) => x + (y - x) * s;
  return {
    azimuth: a.azimuth + dAz * s,
    elevation: lerp(a.elevation, b.elevation),
    zoom: lerp(a.zoom, b.zoom),
    target: [
      lerp(a.target[0], b.target[0]),
      lerp(a.target[1], b.target[1]),
      lerp(a.target[2], b.target[2]),
    ],
  };
}

/** @param {Vec3[]} points @returns {Vec3} component-wise mean */
export function centerOf(points) {
  const c = [0, 0, 0];
  for (const p of points) {
    c[0] += p[0] / points.length;
    c[1] += p[1] / points.length;
    c[2] += p[2] / points.length;
  }
  return c;
}

/**
 * Zoom so the projected bounds of worldPoints fit the viewport with pad px
 * margin. The camera's target decides what lands at the center; the point list
 * should be centered on it (or include the corners of the region of interest).
 * @param {Viewport} viewport @param {Vec3[]} worldPoints @param {Camera} camera
 * @param {number} pad px margin @returns {number} zoom
 */
export function fitZoom(viewport, worldPoints, camera, pad) {
  const probe = { ...camera, zoom: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of worldPoints) {
    const [sx, sy] = project(probe, viewport, p);
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const innerW = Math.max(viewport.width - 2 * pad, 1);
  const innerH = Math.max(viewport.height - 2 * pad, 1);
  return Math.min(innerW / spanX, innerH / spanY);
}

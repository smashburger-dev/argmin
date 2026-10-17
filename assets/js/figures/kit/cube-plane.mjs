import { cross, dot, normalize } from './camera.mjs';

const EPS = 1e-8;
function unique(points) {
  return points.filter((point, i) => points.findIndex((p) => Math.hypot(...p.map((x, j) => x - point[j])) < EPS) === i);
}
export function cubeSection(normal, distance, radius) {
  const points = [];
  for (let axis = 0; axis < 3; axis += 1) {
    for (const a of [-radius, radius]) {
      for (const b of [-radius, radius]) {
        const from = [a, b]; from.splice(axis, 0, -radius);
        const to = [...from]; to[axis] = radius;
        intersectEdge(points, from, to, normal, distance);
      }
    }
  }
  const polygon = unique(points);
  const n = normalize(normal);
  const u = normalize(cross(n, Math.abs(n[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1]));
  const v = cross(n, u);
  const center = polygon.reduce((sum, p) => sum.map((x, i) => x + p[i] / polygon.length), [0, 0, 0]);
  const angle = (p) => {
    const d = p.map((x, i) => x - center[i]);
    return Math.atan2(dot(d, v), dot(d, u));
  };
  return polygon.sort((a, b) => angle(a) - angle(b));
}
function intersectEdge(points, from, to, normal, distance) {
  const a = dot(normal, from) - distance;
  const b = dot(normal, to) - distance;
  if (Math.abs(a) < EPS) points.push(from);
  if (Math.abs(b) < EPS) points.push(to);
  if (a * b >= 0) return;
  const t = a / (a - b);
  points.push(from.map((x, i) => x + t * (to[i] - x)));
}

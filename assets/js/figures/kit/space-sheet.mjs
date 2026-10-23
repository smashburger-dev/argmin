import { newellNormal } from './solids.mjs';

// Individual cells are independent depth parts, so intersecting sheets can
// interleave. Supply cuts at intersections rather than sorting whole sheets.
export function sheetFaces(origin, u, v, cuts = [-1, 0, 1], tone = 'glass') {
  const point = (a, b) => origin.map((x, i) => x + a * u[i] + b * v[i]);
  const faces = [];
  for (let i = 1; i < cuts.length; i += 1) {
    for (let j = 1; j < cuts.length; j += 1) {
      const pts = [point(cuts[i - 1], cuts[j - 1]), point(cuts[i], cuts[j - 1]), point(cuts[i], cuts[j]), point(cuts[i - 1], cuts[j])];
      faces.push({ pts, normal: newellNormal(pts), tone });
      faces.push({ pts: [...pts].reverse(), normal: newellNormal([...pts].reverse()), tone });
    }
  }
  return faces;
}
export function meshFromFaces(input) {
  const faces = input.map((face, part) => ({ ...face, part }));
  const points = faces.flatMap((face) => face.pts);
  const min = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i])));
  const max = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i])));
  return { faces, min, max, center: min.map((x, i) => (x + max[i]) / 2) };
}

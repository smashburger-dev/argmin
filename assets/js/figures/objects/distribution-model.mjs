export const lessonValues = Object.freeze([2, 4, 4, 4, 5, 5, 7, 9]);
export const format = value => Number(value.toFixed(3)).toLocaleString('de-DE');
export const mix = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

export function numericParams(params, ranges) {
  if (!params || Object.keys(params).sort().join() !== Object.keys(ranges).sort().join()) throw new Error('Unexpected parameters');
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isInteger(params[key]) || params[key] < min || params[key] > max) throw new Error('Invalid ' + key);
  }
}

export function quantile(sorted, q) {
  const index = (sorted.length - 1) * q, lo = Math.floor(index);
  return mix(sorted[lo], sorted[Math.ceil(index)], index - lo);
}

export function statistics(values) {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw new Error('Expected finite data');
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { n: values.length, mean, median: quantile(sorted, 0.5), q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75),
    std: Math.sqrt(variance), min: sorted[0], max: sorted.at(-1), range: sorted.at(-1) - sorted[0] };
}

export function histogram(values, edges) {
  if (edges.length < 2 || edges.some((e, i) => !Number.isFinite(e) || (i > 0 && e <= edges[i - 1]))) throw new Error('Expected increasing edges');
  const bins = edges.slice(1).map((end, i) => ({ start: edges[i], end, ids: [] }));
  values.forEach((value, id) => {
    const index = bins.findIndex((bin, i) => value >= bin.start && (value < bin.end || (i === bins.length - 1 && value === bin.end)));
    if (index >= 0) bins[index].ids.push(id);
  });
  return bins;
}

export function distribution(params) {
  numericParams(params, { binWidth: [1, 5], copies: [1, 128] });
  const values = Array.from({ length: params.copies }, () => lessonValues).flat();
  const ranks = new Map();
  const points = values.map((value, id) => {
    const rank = ranks.get(value) ?? 0;
    ranks.set(value, rank + 1);
    return { id, value, rank };
  });
  const edges = Array.from({ length: Math.ceil(10 / params.binWidth) + 1 }, (_, i) => i * params.binWidth);
  return { ...params, axisMax: edges.at(-1), points, values, stats: statistics(values), fine: histogram(values, edges), coarse: histogram(values, [0, 4, 9]) };
}

export function subgroupModel() {
  const rows = [
    ...Array.from({ length: 240 }, (_, i) => ({ group: 'jung', actual: i % 2, predicted: i < 12 ? 1 - i % 2 : i % 2 })),
    ...Array.from({ length: 100 }, (_, i) => ({ group: 'alt', actual: i % 2, predicted: i < 22 ? 1 - i % 2 : i % 2 })),
  ];
  const groups = ['jung', 'alt'].map(name => {
    const data = rows.filter(row => row.group === name), errors = data.filter(row => row.actual !== row.predicted).length;
    return { name, n: data.length, errors, rate: errors / data.length * 100 };
  });
  const errors = groups.reduce((sum, group) => sum + group.errors, 0);
  return { rows, n: rows.length, groups, errors, rate: errors / rows.length * 100, gap: Math.max(...groups.map(g => g.rate)) - Math.min(...groups.map(g => g.rate)) };
}

export function missingSalesModel() {
  const rows = [90, 120, 200, 600, 900].map((value, id) => ({ id, value, observed: id < 3 }));
  const before = statistics(rows.map(row => row.value));
  const after = statistics(rows.filter(row => row.observed).map(row => row.value));
  return { rows, before, after, shift: after.mean - before.mean };
}

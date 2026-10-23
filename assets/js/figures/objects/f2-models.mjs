// Small numerical models for the fixed F2 lesson examples, never graders.
export function matrixShape(a) {
  if (!Array.isArray(a) || !a.length || !Array.isArray(a[0]) || !a[0].length) throw new Error('Leere Matrix');
  const cols = a[0].length;
  if (!a.every((row) => row.length === cols && row.every(Number.isFinite))) throw new Error('Ungültige Matrix');
  return [a.length, cols];
}
export function transpose(a) {
  const [, cols] = matrixShape(a);
  return Array.from({ length: cols }, (_, j) => a.map((row) => row[j]));
}
export function matmul(a, b) {
  const [rows, inner] = matrixShape(a), [other, cols] = matrixShape(b);
  if (inner !== other) throw new Error('Innere Dimensionen passen nicht');
  return Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) =>
    a[i].reduce((sum, value, k) => sum + value * b[k][j], 0)));
}
function shape(s) {
  if (!Array.isArray(s) || !s.every((n) => Number.isInteger(n) && n >= 0)) throw new Error('Ungültige Form');
  return s;
}
export function broadcastShape(left, right) {
  shape(left); shape(right);
  const rank = Math.max(left.length, right.length);
  return Array.from({ length: rank }, (_, i) => {
    const a = left.at(i - rank) ?? 1, b = right.at(i - rank) ?? 1;
    if (a !== b && a !== 1 && b !== 1) throw new Error('Broadcast-Achsen passen nicht');
    return a === 1 ? b : a;
  });
}
export function matmulShape(left, right) {
  shape(left); shape(right);
  if (!left.length || !right.length) throw new Error('@ braucht mindestens eine Achse');
  const a = left.length === 1 ? [1, ...left] : left;
  const b = right.length === 1 ? [...right, 1] : right;
  if (a.at(-1) !== b.at(-2)) throw new Error('Innere Dimensionen passen nicht');
  const result = [...broadcastShape(a.slice(0, -2), b.slice(0, -2)), a.at(-2), b.at(-1)];
  if (right.length === 1) result.pop();
  if (left.length === 1) result.splice(result.length - 1 - Number(right.length !== 1), 1);
  return result;
}
export function layerChain(batch, input, widths) {
  if (![batch, input, ...widths].every((n) => Number.isInteger(n) && n > 0)) throw new Error('Ungültige Schichtgröße');
  let previous = input;
  return widths.map((width) => {
    const layer = { input: [batch, previous], weights: [previous, width], bias: [width], output: [batch, width], parameters: previous * width + width };
    previous = width;
    return layer;
  });
}
function validateSoftmax(scores, temperature, mask, topK) {
  if (!(temperature > 0) || !Number.isFinite(temperature)) throw new Error('Temperatur muss positiv sein');
  if (!scores.length || !scores.every(Number.isFinite) || mask.length !== scores.length || !mask.every((v) => typeof v === 'boolean')) throw new Error('Ungültige Scores oder Maske');
  if (!Number.isInteger(topK) || topK < 1 || topK > scores.length) throw new Error('Ungültiges Top-k');
}
export function softmax(scores, temperature = 1, mask = scores.map(() => true), topK = scores.length) {
  validateSoftmax(scores, temperature, mask, topK);
  const kept = scores.map((value, index) => ({ value, index })).filter(({ index }) => mask[index])
    .sort((a, b) => b.value - a.value || a.index - b.index).slice(0, topK);
  if (!kept.length) throw new Error('Eine Attention-Zeile muss einen Key behalten');
  const maximum = kept[0].value;
  const weights = scores.map(() => 0);
  for (const { value, index } of kept) weights[index] = Math.exp((value - maximum) / temperature);
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}
export function attention(q, k, v, mask = null, temperature = 1) {
  const [, dk] = matrixShape(q);
  if (matrixShape(k)[1] !== dk || matrixShape(k)[0] !== matrixShape(v)[0]) throw new Error('Q/K/V passen nicht');
  const scores = matmul(q, transpose(k)).map((row) => row.map((n) => n / Math.sqrt(dk)));
  if (mask !== null && mask.length !== scores.length) throw new Error('Ungültige Maskenzeilen');
  const weights = scores.map((row, i) => softmax(row, temperature, mask?.[i]));
  return { scores, weights, output: matmul(weights, v) };
}
export function lora(w, a, b, alpha, rank) {
  const [out, input] = matrixShape(w), [ar, ai] = matrixShape(a), [bo, br] = matrixShape(b);
  if (!Number.isInteger(rank) || rank < 1 || !Number.isFinite(alpha)) throw new Error('Ungültiger Rang oder Faktor');
  if (ar !== rank || br !== rank || ai !== input || bo !== out) throw new Error('LoRA-Formen passen nicht');
  const delta = matmul(b, a).map((row) => row.map((value) => alpha / rank * value));
  return { delta, updated: w.map((row, i) => row.map((value, j) => value + delta[i][j])), parameters: rank * (input + out), full: input * out };
}
export function dropout(activations, keep, draws) {
  if (!(keep > 0 && keep <= 1) || !Number.isFinite(keep)) throw new Error('Ungültige Behaltewahrscheinlichkeit');
  if (!activations.every(Number.isFinite) || draws.length !== activations.length || !draws.every((u) => Number.isFinite(u) && u >= 0 && u < 1)) throw new Error('Ungültige Dropout-Daten');
  const mask = draws.map((u) => Number(u < keep));
  return { mask, training: activations.map((a, i) => mask[i] * a / keep), inference: [...activations] };
}

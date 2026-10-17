// Exact row operations shared by receipt scenes. No solver or renderer state.
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
export function rational(n, d = 1) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) throw new Error('Invalid rational');
  const g = gcd(Math.abs(n), Math.abs(d));
  return { n: n / g * Math.sign(d), d: Math.abs(d) / g };
}
export const numberOf = (q) => q.n / q.d;
export const textOf = (q) => `${q.n < 0 ? '−' : ''}${Math.abs(q.n)}${q.d === 1 ? '' : `/${q.d}`}`;
export const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const multiply = (a, b) => rational(a.n * b.n, a.d * b.d);
export const divide = (a, b) => rational(a.n * b.d, a.d * b.n);
function halfInteger(x) {
  if (!Number.isSafeInteger(x * 2)) throw new Error('Expected integer or half-integer input');
  return rational(x * 2, 2);
}
export const exactRows = (rows) => rows.map((row) => row.map(halfInteger));
const copy = (rows) => rows.map((row) => row.map((q) => ({ ...q })));
function rowIndex(rows, i) {
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) throw new Error('Invalid row');
}
export function applyRowOperation(rows, op) {
  const next = copy(rows);
  if (op.op === 'swap') {
    rowIndex(rows, op.a); rowIndex(rows, op.b);
    [next[op.a], next[op.b]] = [next[op.b], next[op.a]];
    return next;
  }
  const factor = rational(op.factor.n, op.factor.d);
  if (op.op === 'scale') {
    rowIndex(rows, op.row);
    if (factor.n === 0) throw new Error('Scaling by zero loses the solution set');
    next[op.row] = rows[op.row].map((q) => multiply(q, factor));
    return next;
  }
  if (op.op !== 'add') throw new Error('Unknown row operation');
  rowIndex(rows, op.target); rowIndex(rows, op.source);
  if (op.target === op.source) throw new Error('Source equals target');
  next[op.target] = rows[op.target].map((q, j) => add(q, multiply(factor, rows[op.source][j])));
  return next;
}
function pivotRow(rows, column, start) {
  return rows.findIndex((row, i) => i >= start && row[column].n !== 0);
}
// A trace is data: every frame can be replayed and checked independently.
export function elimination(input) {
  let rows = exactRows(input);
  const states = [rows], operations = [];
  let pivot = 0;
  const record = (op) => {
    rows = applyRowOperation(rows, op);
    operations.push(op); states.push(rows);
  };
  for (let col = 0; col < input[0].length - 1; col += 1) {
    const found = pivotRow(rows, col, pivot);
    if (found < 0) continue;
    if (found !== pivot) record({ op: 'swap', a: pivot, b: found });
    eliminateBelow(rows, pivot, col, record, () => rows);
    pivot += 1;
  }
  return { states, operations, rows };
}
function eliminateBelow(rows, pivot, col, record, current) {
  for (let target = pivot + 1; target < rows.length; target += 1) {
    const now = current();
    if (now[target][col].n === 0) continue;
    record({ op: 'add', target, source: pivot, factor: divide(multiply(rational(-1), now[target][col]), now[pivot][col]) });
  }
}
export function solutionCase(rows) {
  const coefficients = rows.map((row) => row.slice(0, -1));
  const pivots = coefficients.filter((row) => row.some((q) => q.n !== 0)).length;
  if (rows.some((row, i) => coefficients[i].every((q) => q.n === 0) && row.at(-1).n !== 0)) return 'none';
  return pivots === coefficients[0].length ? 'unique' : 'infinite';
}

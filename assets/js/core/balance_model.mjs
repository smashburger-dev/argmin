// Exact linear equations ax + b = cx + d. Public values are JSON strings;
// BigInt rationals stay inside this pure model and never enter attempts.
const gcd = (a, b) => b === 0n ? a : gcd(b, a % b);
const fraction = (n, d = 1n) => {
  if (d === 0n) throw new Error('Division durch 0');
  if (d < 0n) return fraction(-n, -d);
  const factor = gcd(n < 0n ? -n : n, d) || 1n;
  return { n: n / factor, d: d / factor };
};
function parse(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Bruch als String eingeben');
  if (!['string', 'number'].includes(typeof value)) throw new Error('Zahl fehlt');
  const text = String(value);
  if (!/^-?\d+(\/\d+)?$/.test(text)) throw new Error('Zahl oder Bruch erwartet');
  const [n, d = '1'] = text.split('/');
  return fraction(BigInt(n), BigInt(d));
}
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const negate = (a) => fraction(-a.n, a.d);
const subtract = (a, b) => add(a, negate(b));
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
const equal = (a, b) => a.n * b.d === b.n * a.d;
const text = (a) => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
const side = (value) => ({ x: parse(value.x), constant: parse(value.constant) });
const serializeSide = (value) => ({ x: text(value.x), constant: text(value.constant) });
const serialize = (state) => ({ left: serializeSide(state.left), right: serializeSide(state.right) });

export function balanceModel(parameters) {
  return serialize({ left: side(parameters.left), right: side(parameters.right) });
}

export function solveBalance(parameters) {
  const left = side(parameters.left), right = side(parameters.right);
  const coefficient = subtract(left.x, right.x);
  const constant = subtract(right.constant, left.constant);
  if (coefficient.n === 0n) return { solutionSet: constant.n === 0n ? 'infinite' : 'none' };
  return { solutionSet: 'unique', value: text(divide(constant, coefficient)) };
}

function transform(value, step) {
  const term = side(step.term);
  if (step.operation === 'add') return { x: add(value.x, term.x), constant: add(value.constant, term.constant) };
  if (step.operation === 'subtract') return { x: subtract(value.x, term.x), constant: subtract(value.constant, term.constant) };
  if (term.x.n !== 0n || term.constant.n === 0n) throw new Error('Nur mit einer Zahl ungleich 0 skalieren');
  const operations = { multiply, divide };
  if (!Object.hasOwn(operations, step.operation)) throw new Error('Unbekannte Operation');
  const operation = operations[step.operation];
  return { x: operation(value.x, term.constant), constant: operation(value.constant, term.constant) };
}

export function applyBalanceStep(state, step) {
  if (step.side !== 'both') throw new Error('Dieselbe Operation auf beiden Seiten ausführen');
  const next = serialize({ left: transform(side(state.left), step), right: transform(side(state.right), step) });
  if (JSON.stringify(solveBalance(state)) !== JSON.stringify(solveBalance(next))) {
    throw new Error('Schritt verändert die Lösungsmenge');
  }
  return next;
}

export function sameBalanceState(left, right) {
  return JSON.stringify(balanceModel(left)) === JSON.stringify(balanceModel(right));
}

export function isIsolatedBalance(state) {
  const left = side(state.left), right = side(state.right);
  const isolated = (variable, value) => equal(variable.x, fraction(1n))
    && variable.constant.n === 0n && value.x.n === 0n;
  return isolated(left, right) || isolated(right, left);
}

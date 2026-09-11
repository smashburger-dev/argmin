// Tiny arithmetic expression compiler for visualization specs (no eval/Function).
// Grammar: sum := product (('+'|'-') product)*; product := unary (('*'|'/') unary)*;
// unary := '-' unary | power; power := atom ('^' unary)?; atom := number | name | name '(' args ')' | '(' sum ')'.
const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log, sqrt: Math.sqrt,
  abs: Math.abs, tanh: Math.tanh, floor: Math.floor, round: Math.round, sign: Math.sign,
  max: Math.max, min: Math.min, pow: Math.pow,
  sigmoid: (z) => 1 / (1 + Math.exp(-z)), relu: (z) => Math.max(0, z),
};
const CONSTANTS = { pi: Math.PI, e: Math.E };
const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.))/y;

function tokenize(source) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < source.length) {
    const match = TOKEN.exec(source);
    if (!match) break;
    if (match[1] !== undefined) tokens.push({ type: 'number', value: Number(match[1]) });
    else if (match[2] !== undefined) tokens.push({ type: 'name', value: match[2] });
    else if (match[3].trim()) tokens.push({ type: 'op', value: match[3] });
  }
  return tokens;
}

/**
 * Compiles `source` into `(scope) => number`. Every free identifier must be a
 * known function, constant, or one of `names`; anything else throws at compile time.
 */
export function compileExpression(source, names = []) {
  const tokens = tokenize(String(source));
  const allowed = new Set(names);
  let position = 0;
  const peek = () => tokens[position];
  const take = (value) => {
    const token = tokens[position];
    if (!token || (value !== undefined && token.value !== value)) throw new Error(`Ausdruck "${source}": erwartet ${value ?? 'Token'} an Position ${position}`);
    position += 1;
    return token;
  };
  const sum = () => {
    let left = product();
    while (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = take().value; const right = product();
      const prev = left;
      left = op === '+' ? (s) => prev(s) + right(s) : (s) => prev(s) - right(s);
    }
    return left;
  };
  const product = () => {
    let left = unary();
    while (peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = take().value; const right = unary();
      const prev = left;
      left = op === '*' ? (s) => prev(s) * right(s) : (s) => prev(s) / right(s);
    }
    return left;
  };
  const unary = () => {
    if (peek()?.type === 'op' && peek().value === '-') { take(); const inner = unary(); return (s) => -inner(s); }
    return power();
  };
  const power = () => {
    const base = atom();
    if (peek()?.type === 'op' && peek().value === '^') { take(); const exponent = unary(); return (s) => base(s) ** exponent(s); }
    return base;
  };
  const atom = () => {
    const token = take();
    if (token.type === 'number') return () => token.value;
    if (token.type === 'name') {
      if (peek()?.type === 'op' && peek().value === '(') {
        const fn = FUNCTIONS[token.value];
        if (!fn) throw new Error(`Ausdruck "${source}": unbekannte Funktion ${token.value}`);
        take('(');
        const args = [sum()];
        while (peek()?.value === ',') { take(); args.push(sum()); }
        take(')');
        return (s) => fn(...args.map((arg) => arg(s)));
      }
      if (token.value in CONSTANTS) { const value = CONSTANTS[token.value]; return () => value; }
      if (!allowed.has(token.value)) throw new Error(`Ausdruck "${source}": unbekannter Name ${token.value}`);
      return (s) => s[token.value];
    }
    if (token.value === '(') { const inner = sum(); take(')'); return inner; }
    throw new Error(`Ausdruck "${source}": unerwartetes Zeichen ${token.value}`);
  };
  const compiled = sum();
  if (position !== tokens.length) throw new Error(`Ausdruck "${source}": Rest ab Token ${position}`);
  return compiled;
}

/** Numbers pass through; strings are compiled. */
export function compileValue(value, names) {
  if (typeof value === 'number') return () => value;
  return compileExpression(value, names);
}

/** Replaces `{expr}` placeholders in a text with the evaluated value (2 decimals, comma). */
export function compileTemplate(text, names) {
  const parts = String(text).split(/\{([^}]+)\}/);
  const compiled = parts.map((part, index) => (index % 2 ? compileExpression(part, names) : null));
  return (scope) => parts.map((part, index) => (index % 2 ? formatNumber(compiled[index](scope)) : part)).join('');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '–';
  return (Math.round(value * 100) / 100).toString().replace('.', ',');
}

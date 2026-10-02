// Shared Python-test helpers for procedural case families: the raised-
// exception helper, the renamed reference-solver copy, and the float/list
// literal emitters that seeded test blocks compose from.

export const RAISED_HELPER = `def __raised(fn, *args):
    try:
        return ("ok", fn(*args))
    except Exception as exc:
        return (type(exc).__name__, str(exc))`;

// Renames the module-level names of the reference solver so the test block
// can keep an inline oracle copy next to the seeded literals. All
// occurrences are rewritten so internal calls stay consistent.
export const refCopy = (source, names) => (
  names.reduce((text, name) => text.split(name).join(`__ref_${name}`), source)
);

export const pyNum = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));
export const pyList = (values) => `[${values.map(pyNum).join(', ')}]`;

/** CPython round() (half-even on the exact decimal expansion) for JS
 *  mirrors of seeded snippets; toFixed covers our magnitudes exactly. */
export const pyRound = (x, ndigits = 0) => {
  const neg = x < 0;
  const s = Math.abs(x).toFixed(50);
  const dot = s.indexOf('.');
  const digits = (s.slice(0, dot) + s.slice(dot + 1)).split('').map(Number);
  const cut = dot + ndigits;
  const kept = digits.slice(0, cut);
  if (digits.slice(cut).every((d) => d === 0)) {
    return x;
  }
  const first = digits[cut];
  const tail = digits.slice(cut + 1).some((d) => d !== 0);
  const up = first > 5 || (first === 5 && tail) || (first === 5 && !tail && (kept[kept.length - 1] ?? 0) % 2 === 1);
  if (up) {
    for (let i = kept.length - 1; i >= -1; i--) {
      if (i < 0) { kept.unshift(1); break; }
      if (kept[i] < 9) { kept[i] += 1; break; }
      kept[i] = 0;
    }
  }
  const head = kept.slice(0, kept.length - ndigits).join('') || '0';
  const frac = ndigits > 0 ? kept.slice(kept.length - ndigits).join('').padEnd(ndigits, '0') : '';
  return Number(`${neg ? '-' : ''}${head}${frac ? `.${frac}` : ''}`);
};

// Integer-true emitters for mask/vector test blocks (unlike pyNum these keep
// ints as ints — Python truthiness and index arithmetic depend on it).
export const pyInt = (n) => String(n);
export const pyVec = (values) => `[${values.map(pyInt).join(', ')}]`;
export const pyMat = (rows) => `[${rows.map(pyVec).join(', ')}]`;
export const pyBoolMat = (rows) => `[${rows.map((row) => `[${row.map((v) => (v ? 'True' : 'False')).join(', ')}]`).join(', ')}]`;
export const pyStrList = (values) => `[${values.map((s) => `"${s}"`).join(', ')}]`;

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
export const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

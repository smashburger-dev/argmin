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

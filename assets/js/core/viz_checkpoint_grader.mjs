// Formative visualization checkpoints (Option A from
// docs/content-review/plan-interaktive-elemente.md): deterministic grading
// for the .viz.json `checkpoint` contract. Pure functions shared by the
// Preact block, the content validator and the Node tests — no DOM, no I/O.
//
// FORMATIVE BY CONTRACT: results are ephemeral UI feedback. Callers must
// not persist attempts to IndexedDB and must not count them toward mastery.

export const DEFAULT_VIZ_CHECKPOINT_TOLERANCE = 1e-6;

// Learner numbers: plain decimals ("1.5", "1,5", ".5", "-2") or fractions
// ("3/4", "-1/2", "1,5/2"). The comma is always a decimal mark, never a
// separator (German locale). Scientific notation is rejected on purpose:
// checkpoint prompts ask for plain values and `1e-3` reads as a typo risk.
const DECIMAL = '[+-]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)';
const NUMBER_RE = new RegExp(`^${DECIMAL}$`);
const FRACTION_RE = new RegExp(`^(${DECIMAL})\\/(${DECIMAL})$`);
const toNumber = (text) => Number(text.replace(',', '.'));

function parseScalar(raw) {
  const text = String(raw ?? '').trim().replace(/\u2212/g, '-'); // unicode minus
  if (!text) return null;
  const fraction = FRACTION_RE.exec(text);
  if (fraction) {
    const denominator = toNumber(fraction[2]);
    if (denominator === 0) return null;
    const value = toNumber(fraction[1]) / denominator;
    return Number.isFinite(value) ? value : null;
  }
  if (!NUMBER_RE.test(text)) return null;
  const value = toNumber(text);
  return Number.isFinite(value) ? value : null;
}

/** One checkpoint answer field: { ok: true, value } | { ok: false, error }. */
export function parseCheckpointNumber(raw) {
  const value = parseScalar(raw);
  if (value === null) {
    return { ok: false, error: 'Bitte eine Zahl eingeben — Dezimalzahl (z. B. 1,5) oder Bruch (z. B. 3/4).' };
  }
  return { ok: true, value };
}

// Vector answers arrive either as the two input fields ([rawX, rawY]) or as
// one text "(1,5; 2,5)" / "1,5 2,5" / "1;2". Never split on commas — they
// are decimal marks.
function splitVectorText(raw) {
  const text = String(raw ?? '').trim().replace(/^\((.*)\)$/s, '$1');
  const parts = text.includes(';') ? text.split(';') : text.split(/\s+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** [x, y] checkpoint answer: { ok: true, value: [x, y] } | { ok: false, error }. */
export function parseCheckpointVector(raw) {
  const parts = Array.isArray(raw) ? raw : splitVectorText(raw);
  if (parts.length !== 2) {
    return { ok: false, error: 'Zwei Zahlen eingeben — je Feld eine Dezimalzahl oder ein Bruch.' };
  }
  const values = parts.map(parseScalar);
  if (values.some((value) => value === null)) {
    return { ok: false, error: 'Beide Komponenten müssen Zahlen sein — Dezimalzahl (z. B. 1,5) oder Bruch (z. B. 3/4).' };
  }
  return { ok: true, value: values };
}

// First matching typicalErrors entry wins. Number matches compare the
// scalar answer within tolerance; [x, y] matches compare a vector answer
// componentwise; string matches run a substring check on the raw input
// (vector raws join as "x; y"). Cross-shape numeric rules can never fire —
// assertVizCheckpointContract flags them at validation time.
function matchTypicalError(entries, parsedValue, raw, tolerance, isVector) {
  const rawText = Array.isArray(raw) ? raw.join('; ') : String(raw ?? '');
  for (const entry of entries || []) {
    const match = entry && entry.match;
    if (typeof match === 'string') {
      if (match && rawText.includes(match)) return entry;
    } else if (typeof match === 'number') {
      if (!isVector && Math.abs(parsedValue - match) <= tolerance) return entry;
    } else if (Array.isArray(match)) {
      if (isVector && match.length === parsedValue.length
        && match.every((target, index) => Math.abs(parsedValue[index] - target) <= tolerance)) return entry;
    }
  }
  return null;
}

/** Deterministic checkpoint grading:
 *  raw is a string (input "numeric") or [rawX, rawY] (input "vector").
 *  Returns { ok, correct, verdictText, matchedTypicalError } — ok:false
 *  marks unparseable input, matchedTypicalError carries the fired rule. */
export function gradeVizCheckpoint(checkpoint, raw) {
  const tolerance = checkpoint.tolerance ?? DEFAULT_VIZ_CHECKPOINT_TOLERANCE;
  const isVector = checkpoint.input === 'vector';
  const parsed = isVector ? parseCheckpointVector(raw) : parseCheckpointNumber(raw);
  if (!parsed.ok) {
    return { ok: false, correct: false, verdictText: parsed.error, matchedTypicalError: null };
  }
  const expected = checkpoint.expected;
  const correct = isVector
    ? parsed.value.every((value, index) => Math.abs(value - expected[index]) <= tolerance)
    : Math.abs(parsed.value - expected) <= tolerance;
  if (correct) {
    return { ok: true, correct: true, verdictText: 'Richtig.', matchedTypicalError: null };
  }
  const matched = matchTypicalError(checkpoint.typicalErrors, parsed.value, raw, tolerance, isVector);
  return {
    ok: true,
    correct: false,
    verdictText: matched ? matched.feedback : 'Nicht richtig — vergleiche dein Ergebnis noch einmal mit der Visualisierung.',
    matchedTypicalError: matched || null,
  };
}

/** Content contract check beyond the JSON Schema (which already enforces
 *  required fields, the input enum and the expected/input shape coupling).
 *  Called by tools/validate_content.mjs for every .viz.json checkpoint —
 *  also catches dead typicalErrors rules that can never fire. */
export function assertVizCheckpointContract(checkpoint, label = 'checkpoint') {
  const fail = (message) => { throw new Error(`${label}: ${message}`); };
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) {
    fail('checkpoint muss ein Objekt sein');
  }
  const allowedKeys = ['prompt', 'input', 'expected', 'tolerance', 'hints', 'typicalErrors'];
  for (const key of Object.keys(checkpoint)) {
    if (!allowedKeys.includes(key)) fail(`checkpoint: unbekanntes Feld "${key}"`);
  }
  if (typeof checkpoint.prompt !== 'string' || !checkpoint.prompt.trim()) {
    fail('checkpoint.prompt muss ein nicht-leerer String sein');
  }
  if (checkpoint.input !== 'numeric' && checkpoint.input !== 'vector') {
    fail('checkpoint.input muss "numeric" oder "vector" sein');
  }
  const isVector = checkpoint.input === 'vector';
  if (isVector) {
    if (!Array.isArray(checkpoint.expected) || checkpoint.expected.length !== 2 || !checkpoint.expected.every(finite)) {
      fail('checkpoint.expected muss bei input "vector" ein [x, y]-Zahlenpaar sein');
    }
  } else if (!finite(checkpoint.expected)) {
    fail('checkpoint.expected muss bei input "numeric" eine Zahl sein');
  }
  if (checkpoint.tolerance !== undefined && (!finite(checkpoint.tolerance) || checkpoint.tolerance <= 0)) {
    fail('checkpoint.tolerance muss eine Zahl > 0 sein');
  }
  if (checkpoint.hints !== undefined
    && (!Array.isArray(checkpoint.hints) || checkpoint.hints.some((hint) => typeof hint !== 'string' || !hint.trim()))) {
    fail('checkpoint.hints müssen nicht-leere Strings sein');
  }
  (checkpoint.typicalErrors || []).forEach((entry, index) => {
    const at = `typicalErrors[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${at} muss ein Objekt sein`);
    for (const key of Object.keys(entry)) {
      if (!['match', 'feedback'].includes(key)) fail(`${at}: unbekanntes Feld "${key}"`);
    }
    if (typeof entry.feedback !== 'string' || !entry.feedback.trim()) fail(`${at}.feedback muss ein nicht-leerer String sein`);
    const matchIsNumber = finite(entry.match);
    const matchIsVector = Array.isArray(entry.match) && entry.match.length === 2 && entry.match.every(finite);
    const matchIsString = typeof entry.match === 'string' && entry.match.trim().length > 0;
    if (!matchIsNumber && !matchIsVector && !matchIsString) {
      fail(`${at}.match muss eine Zahl, ein [x, y]-Zahlenpaar oder ein String sein`);
    }
    if (matchIsNumber && isVector) fail(`${at}.match ist eine Zahl, aber input ist "vector" — die Regel kann nie greifen`);
    if (matchIsVector && !isVector) fail(`${at}.match ist ein Zahlenpaar, aber input ist "numeric" — die Regel kann nie greifen`);
  });
  return true;
}

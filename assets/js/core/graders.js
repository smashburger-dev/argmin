// GraderAdapter registry. Callers only know adapter keys;
// implementations live here. Each adapter: grade(exercise, answer, ctx) ->
// { correct, verdictText, errorType, diagnosis? } (async allowed).

import { parseIntegerAnswer, parseIntegerPair, genMatmulEntry, genDot, solveLinear2, matmul, dot, rank } from './w05_generators.mjs';
// The worker host loads lazily: deterministic tasks (the vast majority)
// never pay for the pyodide runner module in their chunk.
const loadPyodideRunner = () => import('../runtime/pyodide_runner.js').then((m) => m.pyodideRunner);

// --- deterministic -----------------------------------------------------------

function expectedNumeric(exercise) {
  // Fixed instances in the exercise JSON are authoritative: an explicit
  // expectedAnswer.value (w01 diagnose tasks) wins over everything else.
  const ea = exercise.expectedAnswer;
  // Instantiated generated exercises carry kind 'seeded-integer' with the
  // expected value resolved by instantiateLegacyExercise (the instance
  // parameters replace the raw seedGenerator reference). Both forms are
  // authoritative exact-integer answers.
  if (ea && (ea.kind === 'integer' || ea.kind === 'seeded-integer') && Number.isInteger(ea.value)) return ea.value;
  // Generator + seed is used when parameters carry no fixed instance; the
  // seeded retrieval generators (w01) follow the CURRENT seed — the runtime
  // passes the re-rolled seed through exercise.deterministicSeed.
  const p = exercise.parameters || {};
  if (Array.isArray(p.A) && typeof p.expectedRank === 'number') {
    return rank(p.A);
  }
  if (Array.isArray(p.A) && Array.isArray(p.B) && Array.isArray(p.entry)) {
    return matmul(p.A, p.B)[p.entry[0] - 1][p.entry[1] - 1];
  }
  if (Array.isArray(p.u) && Array.isArray(p.v)) {
    return dot(p.u, p.v);
  }
  const gen = { 'w05-e1': genMatmulEntry, 'w05-e3': genDot }[exercise.exerciseId];
  return gen ? gen(exercise.deterministicSeed).expected : null;
}

function gradeNumeric(exercise, raw) {
  const p = parseIntegerAnswer(raw);
  if (!p.ok) return { correct: false, verdictText: p.error, errorType: 'invalid-input' };
  const expected = expectedNumeric(exercise);
  if (expected === null) return { correct: false, verdictText: 'Interner Fehler: Unbekannte Aufgabe.', errorType: 'grader-error' };
  const correct = p.value === expected;
  return {
    correct,
    verdictText: correct ? 'Richtig.' : 'Nicht richtig.',
    errorType: correct ? null : 'wrong-value',
    diagnosis: correct ? null : diagnoseNumeric(exercise, p.value),
  };
}

function diagnoseNumeric(exercise, value) {
  for (const rule of exercise.feedbackRules || []) {
    if (rule.if === `value === ${value}`) return rule.then;
  }
  return null;
}

function gradeChoice(exercise, choiceId) {
  const choices = exercise.choices || [];
  const choice = choices.find((c) => c.id === choiceId);
  if (!choice) return { correct: false, verdictText: 'Bitte eine Auswahl treffen.', errorType: 'invalid-input' };
  if (!choices.some((c) => c.correct)) {
    return { correct: false, verdictText: 'Interner Fehler: keine korrekte Option konfiguriert.', errorType: 'grader-error' };
  }
  const correct = Boolean(choice.correct);
  let diagnosis = null;
  for (const rule of exercise.feedbackRules || []) {
    const equals = String(rule.if).match(/^choice === '([^']+)'$/);
    const differs = String(rule.if).match(/^choice !== '([^']+)'$/);
    if (!correct && ((equals && choiceId === equals[1]) || (differs && choiceId !== differs[1]))) diagnosis = rule.then;
  }
  return { correct, verdictText: correct ? 'Richtig begründet.' : 'Nicht richtig.', errorType: correct ? null : 'wrong-choice', diagnosis };
}

function gradePair(exercise, raw) {
  const p = parseIntegerPair(raw);
  if (!p.ok) return { correct: false, verdictText: p.error, errorType: 'invalid-input' };
  const { A, b } = exercise.parameters || {};
  let expected;
  try { expected = solveLinear2(A, b); } catch {
    return { correct: false, verdictText: 'Interner Fehler: Aufgabe fehlerhaft konfiguriert.', errorType: 'grader-error' };
  }
  if (!Array.isArray(expected) || expected.length !== 2 || expected.some((value) => !Number.isFinite(value))) {
    return { correct: false, verdictText: 'Interner Fehler: Aufgabe fehlerhaft konfiguriert.', errorType: 'grader-error' };
  }
  const correct = p.value[0] === expected[0] && p.value[1] === expected[1];
  const swapped = !correct && p.value[0] === expected[1] && p.value[1] === expected[0];
  return {
    correct,
    verdictText: correct ? 'Richtig — das Paar löst das System.' : 'Nicht richtig.',
    errorType: correct ? null : (swapped ? 'swapped' : 'wrong-value'),
    diagnosis: swapped ? 'Die Reihenfolge ist getauscht — gesucht ist (x, y).' : null,
  };
}

// --- pyodide (python code) -----------------------------------------------------

async function gradePython(exercise, code, ctx) {
  const tests = buildPythonTests(exercise);
  const pyodideRunner = await loadPyodideRunner();
  const result = await pyodideRunner.run({
    code,
    tests,
    packages: exercise.parameters.packages || [],
    seed: exercise.deterministicSeed,
    timeoutMs: 60000,
  });
  const correct = result.ok && (result.testResults || []).length > 0 && result.testResults.every((t) => t.passed);
  return {
    correct,
    result,
    verdictText: result.phase === 'timeout' ? 'Zeitlimit überschritten — der Lauf wurde abgebrochen.'
      : result.ok ? (correct ? 'Alle Tests bestanden.' : 'Tests fehlgeschlagen.') : 'Der Code lief nicht fehlerfrei.',
    errorType: result.errorType,
  };
}

export function buildPythonTests(exercise) {
  if (typeof exercise.parameters?.tests === 'string' && exercise.parameters.tests.trim()) return exercise.parameters.tests;
  // S4D7: Familien-Fall zur selben Aufgabe (gleiche Tests wie w05-e8).
  if (exercise.exerciseId === 'w05-e8' || exercise.caseId === 'matvec-code-reference') {
    return `
import json
import numpy as np

# --- 1) Mehrere gueltige Matrix-Vektor-Produkte (auch nicht quadratisch) ---
__r1 = np.array_equal(matvec([[1, 2], [3, 4]], [1, 1]), np.array([3, 7]))
__check('Korrekt: 2x2-Mal-Vektor', __r1, 'erwartet [3, 7]')
__r2 = np.array_equal(matvec([[2, 0], [0, 3]], [5, -2]), np.array([10, -6]))
__check('Korrekt: zweite 2x2-Matrix', __r2, 'erwartet [10, -6]')
__r3 = np.array_equal(matvec([[1, 2, 3], [4, 5, 6]], [1, 0, -1]), np.array([-2, -2]))
__check('Korrekt: nicht quadratische 2x3-Matrix', __r3, 'erwartet [-2, -2]')

# --- 2) Dimensionsvertraege einzeln: AssertionError fuer jeden unguelten Fall ---
def __expect_assert(label, fn):
    try:
        fn()
        __check(label, False, 'kein AssertionError geworfen')
    except AssertionError:
        __check(label, True)
    except Exception as e:
        __check(label, False, 'falscher Fehlertyp: ' + type(e).__name__)

__expect_assert('Vertrag A.ndim == 2: 1-dimensionales A abgelehnt', lambda: matvec([1, 2], [1, 1]))
__expect_assert('Vertrag A.ndim == 2: 3-dimensionales A abgelehnt', lambda: matvec(np.zeros((2, 2, 2)), [1, 1]))
__expect_assert('Vertrag v.ndim == 1: 2-dimensionales v abgelehnt', lambda: matvec([[1, 2], [3, 4]], [[1], [2]]))
__expect_assert('Vertrag A.shape[1] == v.shape[0]: inkompatible Shapes abgelehnt', lambda: matvec([[1, 2, 3], [4, 5, 6]], [1, 2]))

# --- 3) Listenverarbeitung ueber np.asarray ---
__r4 = matvec([[1, 2], [3, 4]], [1, 1])
__check('Listen als Eingabe akzeptiert (Ergebnis ist ndarray)', isinstance(__r4, np.ndarray) and np.array_equal(__r4, np.array([3, 7])), 'np.asarray vor der Rechnung verwenden')

# --- 4) Schutz vor hartcodierter Loesung der obigen Beispiele ---
# Deterministisch erzeugte, ungewoehnliche Instanzen; Vergleich gegen die
# Referenz A @ v innerhalb des Tests.
import random as __rnd
__rnd.seed(20260824)
for __i in range(3):
    __m = __rnd.randint(2, 4)
    __n = __rnd.randint(1, 4)
    __A = [[__rnd.randint(-7, 7) for _ in range(__n)] for _ in range(__m)]
    __v = [__rnd.randint(-7, 7) for _ in range(__n)]
    __exp = np.asarray(__A) @ np.asarray(__v)
    try:
        __got = matvec(__A, __v)
        __ok = np.array_equal(np.asarray(__got), __exp)
        __check(f'Unbekannte Instanz {__i + 1} (Form {__m}x{__n})', __ok, f'erwartet {__exp.tolist()}, erhalten {np.asarray(__got).tolist()}')
    except Exception as e:
        __check(f'Unbekannte Instanz {__i + 1} (Form {__m}x{__n})', False, 'Exception: ' + type(e).__name__)
`;
  }
  return '';
}

// --- pyodide-sympy (exact algebraic equivalence) -------------------------------

// Observed MathLive 0.110.0 ascii-math output (browser-verified 2026-08-24):
// "x^2+x-6", "(x+3)(x-2)", "-6", "x/2", "(x+1)/2", "x^(-1)" and implicit
// multiplication "2x". The parser therefore enables implicit multiplication
// application — everything else (function calls, names beyond x) stays
// rejected by the JS charset gate before Pyodide is even started.
const SYMPY_EQUIV = `
import json
from sympy import expand, simplify, Symbol
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application,
)
__x = Symbol('x')
__tsf = standard_transformations + (implicit_multiplication_application,)
def __canon(s):
    s = str(s).strip().replace('^', '**')
    return parse_expr(s, local_dict={'x': __x}, transformations=__tsf)
__student = __canon(json.loads(r'''${'__PAYLOAD__'}''')[0])
__expected = __canon(json.loads(r'''${'__PAYLOAD__'}''')[1])
__diff = simplify(expand(__student) - expand(__expected))
print(json.dumps({'equivalent': __diff == 0}))
`;
const SYMPY_TESTS = `
import json
__parsed = json.loads(__out.buffer.getvalue().strip().splitlines()[-1])
__check('exakt äquivalent', __parsed['equivalent'] is True)
`;

// Observed MathLive `ascii-math` output artifacts that are mathematically
// meaningful but not in the plain ASCII alphabet the SymPy payload expects.
// Only normalizations verified against real MathLive 0.110.0 output (see
// docs/dependency-matrix.md) — never pass raw LaTeX to SymPy.
function normalizeExpressionInput(raw) {
  return String(raw)
    .replace(/\u2212/g, '-')        // unicode minus
    .replace(/[\u00b7\u22c5\u00d7]/g, '*') // middle-dot / times multiplication
    .replace(/\u00f7/g, '/')        // division sign
    .replace(/\u2061/g, '')         // function application marker
    .replace(/\u2062/g, '')         // invisible times
    .replace(/\u2063/g, '')         // invisible separator
    .replace(/\u2064/g, '')         // invisible plus
    .replace(/\s+/g, '');
}

/** Build the exact SymPy-equivalence worker run for a student/expected
 *  expression pair (ADR-0013 grader contract; also the single source for
 *  the browser contract matrix, which must mirror the grader byte-for-byte). */
export function buildSympyEquivalenceRun(studentExpression, expectedExpression) {
  const payload = JSON.stringify([normalizeExpressionInput(studentExpression), String(expectedExpression)]);
  return {
    code: SYMPY_EQUIV.split('__PAYLOAD__').join(payload),
    tests: SYMPY_TESTS,
    packages: ['sympy'],
  };
}

async function gradeSympyExpression(exercise, answerText) {
  const raw = normalizeExpressionInput(answerText);
  if (!raw) return { correct: false, verdictText: 'Bitte einen Term eingeben.', errorType: 'invalid-input' };
  if (!/^[x0-9+\-*/^ ().]+$/.test(raw)) {
    return { correct: false, verdictText: 'Der Term enthält unerlaubte Zeichen. Nur x, Zahlen und + - * / ^ ( ).', errorType: 'invalid-input' };
  }
  const run = buildSympyEquivalenceRun(raw, exercise.expectedAnswer.expression);
  const pyodideRunner = await loadPyodideRunner();
  const result = await pyodideRunner.run({
    code: run.code, tests: run.tests, packages: run.packages, seed: exercise.deterministicSeed, timeoutMs: 60000,
  });
  const correct = result.ok && (result.testResults || []).some((t) => t.name.includes('äquivalent') && t.passed);
  const unparsed = result.stderr && /SympifyError|SyntaxError|TokenError|ParseException/.test(result.stderr);
  return {
    correct,
    result,
    verdictText: correct ? 'Exakt äquivalent (SymPy-Beweis).' : (unparsed ? 'Der Term konnte nicht gelesen werden.' : 'Nicht äquivalent zum Zielterm.'),
    errorType: correct ? null : (unparsed ? 'unparsed' : 'not-equivalent'),
  };
}

// --- manual rubric ----------------------------------------------------------------

function gradeRubric(exercise, text, checks) {
  if (!Array.isArray(exercise.rubric) || !exercise.rubric.length) {
    return { correct: false, verdictText: 'Interner Fehler: Rubrik fehlt.', errorType: 'grader-error', masteryEligible: false };
  }
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  const minWords = (exercise.parameters && exercise.parameters.minWords) || 20;
  if (words < minWords) {
    return { correct: false, verdictText: `Zu kurz: ${words} Wörter, erwartet mindestens ${minWords}.`, errorType: 'invalid-input' };
  }
  const checked = (exercise.rubric || []).filter((r) => checks && checks.includes(r.id)).length;
  const total = (exercise.rubric || []).length;
  const honest = checks && checks.includes('__none__') ? 0 : checked;
  return {
    correct: honest === total,
    selfAssessed: { checked: honest, total },
    masteryEligible: false,
    verdictText: `Selbsteinschätzung: ${honest} von ${total} Pflichtbestandteilen erfüllt. Die Musterantwort ist jetzt sichtbar; dieser Versuch zählt nicht als Mastery-Nachweis.`,
    errorType: null,
  };
}

// --- new reading-first types (LM-R4: parsons, code-trace, predict-output) -----

/** Diagnosis for a wrong parsons answer: distractor kept, missing lines,
 *  order mismatch, or an authored pure-count rule (e.g. duplicates). */
function parsonsDiagnosis(exercise, order, sol) {
  if (!Array.isArray(order)) return null;
  const droppedDistractor = (exercise.expectedAnswer.distractors || []).some((d) => order.includes(d));
  const missing = sol.filter((id) => !order.includes(id));
  if (droppedDistractor) return 'Mindestens eine Zeile gehört nicht zur Lösung (Distraktor) — prüfe, welche Zeile das Programm beschädigen würde.';
  if (missing.length) return `Es fehlen Zeilen: ${missing.join(', ')}.`;
  // authored rule fires only for a pure count anomaly (no distractor,
  // nothing missing — e.g. duplicated lines)
  for (const rule of exercise.feedbackRules || []) {
    if (rule.if === 'order-length-mismatch' && order.length !== sol.length) return rule.then;
  }
  const firstDiff = sol.findIndex((id, i) => order[i] !== id);
  return `Die Reihenfolge stimmt ab Position ${firstDiff + 1} nicht.`;
}

/** Parsons problem: the answer is the ordered list of fragment ids the
 *  learner kept; distractor fragments must be dropped. Deterministic order
 *  comparison (@ericson<parsonswg><2023> line: grading stays a plain
 *  sequence check, adaptation is content's job). */
function gradeParsons(exercise, order) {
  const sol = exercise.expectedAnswer?.solutionOrder;
  if (!Array.isArray(sol) || !sol.length) {
    return { correct: false, verdictText: 'Interner Fehler: Parsons-Lösung fehlt.', errorType: 'grader-error' };
  }
  const ok = Array.isArray(order) && order.length === sol.length && order.every((id, i) => id === sol[i]);
  const diagnosis = ok ? null : parsonsDiagnosis(exercise, order, sol);
  return { correct: ok, verdictText: ok ? 'Richtig — die Zeilenfolge ist vollständig und korrekt.' : 'Nicht richtig.', errorType: ok ? null : 'wrong-order', diagnosis };
}

/** Canonical Python-literal form for repr-typed trace variables (ADR-0015):
 *  spacing/quote style/trailing commas are not semantic; a SET literal has no
 *  observable element order and dict equality in Python ignores insertion
 *  order, so both compare their entries as a sorted multiset ("key: value"
 *  pairs for dicts). Colons inside quoted elements are masked before the
 *  set/dict decision so a set like {'ki:lw', 'a'} cannot masquerade as a
 *  dict. Lists keep order (observable sequence). */
function splitTopLevel(inner) {
  // Split on commas that sit outside quotes and outside nested brackets so
  // dict values like [1, 2] stay one entry.
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'") quote = ch;
    else if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = inner.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function canonicalRepr(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  s = s.replace(/,\s*([\]\}])/g, '$1') // trailing commas are legal Python
    .replace(/\s+/g, ' ')
    .replace(/[\[\{(]\s+/g, (m) => m.trim())
    .replace(/\s+[\]\})]/g, (m) => m.trim())
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/"/g, "'");
  if (s.startsWith('{') && s.endsWith('}')) {
    const parts = splitTopLevel(s.slice(1, -1).trim()).sort();
    s = `{${parts.join(', ')}}`;
  }
  return s;
}

/** Code-trace: variable values after n steps. Answers arrive as
 *  { name: rawString }. Default variable type is the historical exact
 *  integer; `type: 'repr'` compares canonical Python literals (lists,
 *  dicts, sets) for the collection step-trace contract. */
/** One traced variable: { ok, wrong } — ok false marks unparseable input. */
function gradeVariable(variable, raw) {
  if (variable.type === 'repr') {
    const got = canonicalRepr(raw);
    return { ok: got !== null, wrong: got !== null && got !== canonicalRepr(variable.value) };
  }
  if (typeof variable.value === 'string') {
    const got = String(raw ?? '').trim().replace(/^(['"])(.*)\1$/s, '$2');
    return { ok: got.length > 0, wrong: got.length > 0 && got !== variable.value };
  }
  const parsed = parseIntegerAnswer(raw);
  return { ok: parsed.ok, wrong: parsed.ok && parsed.value !== variable.value };
}

function gradeCodeTrace(exercise, answers) {
  const source = exercise.parameters;
  const vars = (source && source.variables) || [];
  if (!vars.length) {
    return { correct: false, verdictText: 'Interner Fehler: Trace-Variablen fehlen.', errorType: 'grader-error' };
  }
  const hasRepr = vars.some((v) => v.type === 'repr');
  const wrong = [];
  let invalid = null;
  for (const v of vars) {
    const result = gradeVariable(v, answers ? answers[v.name] : null);
    if (!result.ok) { invalid = v.name; break; }
    if (result.wrong) wrong.push(v.name);
  }
  if (invalid) {
    return {
      correct: false,
      verdictText: hasRepr
        ? `'${invalid}' ist leer oder unlesbar — trage den Wert in Python-Schreibweise ein, z. B. [1, 2] oder {'a': 1}.`
        : `'${invalid}' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`,
      errorType: 'invalid-input',
    };
  }
  const correct = wrong.length === 0;
  let diagnosis = null;
  if (!correct) {
    diagnosis = `Falsche Werte für: ${wrong.join(', ')}. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.`;
    for (const rule of exercise.feedbackRules || []) {
      if (rule.if === wrong.map((w) => `value:${w}`).join('+')) diagnosis = rule.then;
    }
  }
  return { correct, verdictText: correct ? 'Richtig — alle Variablenwerte stimmen.' : 'Nicht richtig.', errorType: correct ? null : 'wrong-value', diagnosis };
}

/** Predict-output: predicted stdout, compared normalized — whitespace and
 *  list-repr spacing (after brackets, around commas) are not semantic for
 *  numeric line output. */
function normalizeOutput(s) {
  return String(s ?? '')
    .replace(/\r/g, '')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()
      .replace(/\[\s+/g, '[').replace(/\s+\]/g, ']')
      .replace(/\s*,\s*/g, ', '))
    .filter((l, i, arr) => l !== '' || (i > 0 && i < arr.length - 1))
    .join('\n')
    .trim();
}

function gradePredictOutput(exercise, raw) {
  if (raw == null || !String(raw).trim()) {
    return { correct: false, verdictText: 'Bitte die erwartete Ausgabe eingeben.', errorType: 'invalid-input' };
  }
  const expectedOutput = exercise.expectedAnswer.output;
  const expected = normalizeOutput(expectedOutput);
  const got = normalizeOutput(raw);
  const correct = got === expected;
  let diagnosis = null;
  if (!correct) {
    for (const rule of exercise.feedbackRules || []) {
      if (rule.if === 'element-count-mismatch' && got.split(',').length !== expected.split(',').length) diagnosis = rule.then;
    }
    if (!diagnosis) diagnosis = 'Vergleiche elementweise: Welche Werte kommen in die Ausgabe, und in welcher Reihenfolge?';
  }
  return { correct, verdictText: correct ? 'Richtig — genau diese Ausgabe.' : 'Nicht richtig.', errorType: correct ? null : 'wrong-output', diagnosis };
}

// --- registry ------------------------------------------------------------------------

export const graders = {
  deterministic: {
    grade: async (exercise, answer) => {
      const type = exercise.activityType || exercise.type;
      if (type === 'numeric') return gradeNumeric(exercise, answer);
      if (type === 'single-choice') return gradeChoice(exercise, answer);
      if (type === 'vector') return gradePair(exercise, answer);
      if (type === 'parsons') return gradeParsons(exercise, answer);
      if (type === 'code-trace') return gradeCodeTrace(exercise, answer);
      if (type === 'predict-output') return gradePredictOutput(exercise, answer);
      throw new Error('deterministic: unbekannter Aufgabentyp ' + type);
    },
  },
  pyodide: {
    grade: (exercise, code) => gradePython(exercise, code),
    needsWorker: true,
  },
  'pyodide-sympy': {
    grade: (exercise, text) => gradeSympyExpression(exercise, text),
    needsWorker: true,
  },
  'manual-rubric': {
    grade: (exercise, payload) => gradeRubric(exercise, payload.text, payload.checks),
  },
};

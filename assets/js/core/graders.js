// GraderAdapter registry. Callers only know adapter keys;
// implementations live here. Each adapter: grade(exercise, answer, ctx) ->
// { correct, verdictText, errorType, diagnosis? } (async allowed).

import { parseIntegerAnswer, parseIntegerPair, solveLinear2, matmul, dot, rank } from './linalg_generators.mjs';
import { parseCheckpointNumber, DEFAULT_VIZ_CHECKPOINT_TOLERANCE } from './viz_checkpoint_grader.mjs';
// SymPy-free expression comparison for fading gaps reuses the existing
// visualization expression compiler (same precedent as exercise_runtime.js,
// which already imports from ../domain/). No new sympy path in the browser.
import { compileExpression } from '../domain/expression_eval.mjs';
// The worker host loads lazily: deterministic tasks (the vast majority)
// never pay for the pyodide runner module in their chunk.
const loadPyodideRunner = () => import('../runtime/pyodide_runner.js').then((m) => m.pyodideRunner);

// --- deterministic -----------------------------------------------------------

function expectedNumeric(exercise) {
  // Fixed instances in the exercise JSON are authoritative: an explicit
  // expectedAnswer.value (w01 diagnose tasks) wins over everything else.
  const ea = exercise.expectedAnswer;
  const fixed = ea && ea.kind === 'integer' && Number.isInteger(ea.value)
    ? ea.value
    : null;
  if (fixed !== null) return fixed;
  const p = exercise.parameters || {};
  const parameterValue = numericParameterValue(p);
  if (parameterValue !== null) return parameterValue;
  return null;
}

function numericParameterValue(parameters) {
  if (Array.isArray(parameters.A) && typeof parameters.expectedRank === 'number') return rank(parameters.A);
  if (Array.isArray(parameters.A) && Array.isArray(parameters.B) && Array.isArray(parameters.entry)) {
    return matmul(parameters.A, parameters.B)[parameters.entry[0] - 1][parameters.entry[1] - 1];
  }
  if (Array.isArray(parameters.u) && Array.isArray(parameters.v)) return dot(parameters.u, parameters.v);
  return null;
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
  if (!choices.some((c) => c.correct)) return { correct: false, verdictText: 'Interner Fehler: keine korrekte Option konfiguriert.', errorType: 'grader-error' };
  const correct = Boolean(choice.correct);
  const diagnosis = (exercise.feedbackRules || []).reduce((result, rule) => {
    const equals = String(rule.if).match(/^choice === '([^']+)'$/); const differs = String(rule.if).match(/^choice !== '([^']+)'$/);
    return !correct && ((equals && choiceId === equals[1]) || (differs && choiceId !== differs[1])) ? rule.then : result;
  }, null);
  return {
    correct,
    verdictText: correct ? 'Richtig begründet.' : 'Nicht richtig.',
    errorType: correct ? null : 'wrong-choice',
    diagnosis,
  };
}

function gradePair(exercise, raw) {
  const p = parseIntegerPair(raw);
  if (!p.ok) return { correct: false, verdictText: p.error, errorType: 'invalid-input' };
  const expected = expectedPair(exercise);
  if (!expected) {
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

function expectedPair(exercise) {
  const { A, b } = exercise.parameters || {};
  try {
    const expected = solveLinear2(A, b);
    return Array.isArray(expected) && expected.length === 2 && expected.every(Number.isFinite) ? expected : null;
  } catch {
    return null;
  }
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
    if (ch === ',' && !quote && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    } else {
      ({ quote, depth } = advanceSplitState(ch, quote, depth));
    }
  }
  const last = inner.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function advanceSplitState(ch, quote, depth) {
  if (quote) return { quote: ch === quote ? null : quote, depth };
  if (ch === "'") return { quote: ch, depth };
  if (ch === '[' || ch === '{') return { quote: null, depth: depth + 1 };
  if (ch === ']' || ch === '}') return { quote: null, depth: depth - 1 };
  return { quote: null, depth };
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
  const { invalid, wrong } = inspectTraceVariables(vars, answers);
  return invalid ? { correct: false, verdictText: hasRepr ? `'${invalid}' ist leer oder unlesbar — trage den Wert in Python-Schreibweise ein, z. B. [1, 2] oder {'a': 1}.`
      : `'${invalid}' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`, errorType: 'invalid-input' }
    : traceGradeResult(exercise, wrong);
}

function traceGradeResult(exercise, wrong) {
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

function inspectTraceVariables(vars, answers) {
  const wrong = [];
  for (const variable of vars) {
    const result = gradeVariable(variable, answers ? answers[variable.name] : null);
    if (!result.ok) return { invalid: variable.name, wrong };
    if (result.wrong) wrong.push(variable.name);
  }
  return { invalid: null, wrong };
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

// --- multiple-choice (expected.kind 'choice-indices') ----------------------------

/** All matching feedbackRules join into one diagnosis. Supported `if` forms
 *  (used by authored multiple-choice cases): selected.includes('id') and
 *  !selected.includes('id'). Anything else is ignored, not evaluated. */
function multipleChoiceDiagnosis(exercise, chosen) {
  const parts = [];
  for (const rule of exercise.feedbackRules || []) {
    const match = String(rule.if).match(/^(!?)selected\.includes\('([^']+)'\)$/);
    if (!match) continue;
    if ((match[1] === '!') !== chosen.has(match[2])) parts.push(rule.then);
  }
  return parts.length ? parts.join(' ') : null;
}

/** Multiple correct options: the answer is the array of selected choice ids.
 *  Exact set equality is always required for `correct`. scoring
 *  'all-or-nothing' (default) → score is 1 or 0; 'per-correct' →
 *  score = max(0, (hits - extra) / |correctIds|): every correct pick earns
 *  +1/n, every wrong pick costs 1/n, floored at 0. */
function gradeMultipleChoice(exercise, selected) {
  const expected = exercise.expectedAnswer;
  const correctIds = expected && expected.kind === 'choice-indices' && Array.isArray(expected.correctIds)
    ? expected.correctIds.map(String)
    : null;
  if (!correctIds || !correctIds.length) {
    return { correct: false, verdictText: 'Interner Fehler: correctIds fehlen.', errorType: 'grader-error' };
  }
  const scoring = expected.scoring ?? 'all-or-nothing';
  if (scoring !== 'all-or-nothing' && scoring !== 'per-correct') {
    return { correct: false, verdictText: `Interner Fehler: unbekanntes scoring "${scoring}".`, errorType: 'grader-error' };
  }
  const list = Array.isArray(selected) ? selected : selected == null ? [] : [selected];
  if (!list.length) {
    return { correct: false, verdictText: 'Bitte mindestens eine Option auswählen.', errorType: 'invalid-input' };
  }
  const chosen = new Set(list.map(String));
  const target = new Set(correctIds);
  const hits = [...chosen].filter((id) => target.has(id)).length;
  const extra = chosen.size - hits;
  const missing = target.size - hits;
  const correct = missing === 0 && extra === 0;
  const score = correct ? 1 : scoring === 'per-correct' ? Math.max(0, (hits - extra) / target.size) : 0;
  const errorType = correct ? null : missing > 0 && extra > 0 ? 'wrong-choice' : missing > 0 ? 'missing-choice' : 'extra-choice';
  return {
    correct,
    score,
    verdictText: correct ? 'Richtig — alle zutreffenden Optionen ausgewählt.'
      : score > 0 ? `Teilweise richtig — ${hits} von ${target.size} zutreffenden Optionen${extra ? `, ${extra} davon zu viel` : ''}.`
      : 'Nicht richtig.',
    errorType,
    diagnosis: correct ? null : multipleChoiceDiagnosis(exercise, chosen) ?? (missing > 0 && extra > 0
      ? 'Es fehlen zutreffende Optionen, und mindestens eine Auswahl trifft nicht zu.'
      : missing > 0
        ? 'Es fehlen zutreffende Optionen — prüfe, ob weitere Aussagen stimmen.'
        : 'Mindestens eine gewählte Option trifft nicht zu.'),
  };
}

// --- diagnostic-rationale (expected.kind 'diagnosis') ---------------------------

/** Umlaut-robust substring check for German free text: NFC normalization,
 *  lowercase, umlaut folding (ä→ae …, ß→ss) and whitespace collapse, applied
 *  symmetrically to learner text and mustContain keywords — „für" matches
 *  „fuer", „Nullbasiert" matches „nullbasiert". */
function normalizeDiagnosisText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-boundary keyword match on normalized text: the keyword must start at
 *  a token boundary and may carry letter inflection („alter" matches
 *  „Alters", not „unterhalten"); `_` and digits stay word-internal, so
 *  `train` does not match `train_test_split`. `|` separates alternatives
 *  („except|ausnahmeblock" accepts either). */
function keywordCovered(haystack, keyword) {
  const alternatives = normalizeDiagnosisText(keyword).split('|').map((part) => part.trim()).filter(Boolean);
  return alternatives.some((alternative) => {
    const escaped = alternative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9_])${escaped}[a-z]*(?:[^a-z0-9_]|$)`).test(haystack);
  });
}

/** Diagnostic rationale: deterministic keyword coverage — the text must reach
 *  minWords (word-boundary distinct-word floor guards against keyword salad)
 *  and cover every mustContain keyword (each may list `|`-alternatives);
 *  mustNotContain terms veto misconception phrasings. Feedback names the
 *  missing DIMENSION, never the keywords themselves. diagnosisCode is
 *  taxonomy metadata for explanation-card mapping, not a grading input. */
function gradeDiagnosis(exercise, raw) {
  const expected = exercise.expectedAnswer;
  const configured = expected && expected.kind === 'diagnosis'
    && typeof expected.diagnosisCode === 'string' && expected.diagnosisCode.trim()
    && Array.isArray(expected.mustContain) && expected.mustContain.length > 0
    && expected.mustContain.every((keyword) => typeof keyword === 'string' && keyword.trim())
    && (expected.mustNotContain === undefined || (Array.isArray(expected.mustNotContain)
      && expected.mustNotContain.every((keyword) => typeof keyword === 'string' && keyword.trim())))
    && Number.isInteger(expected.minWords) && expected.minWords >= 1;
  if (!configured) {
    return { correct: false, verdictText: 'Interner Fehler: Diagnose-Erwartung fehlerhaft konfiguriert.', errorType: 'grader-error' };
  }
  const text = String(raw ?? '').trim();
  if (!text) {
    return {
      correct: false,
      verdictText: 'Bitte eine Diagnose eingeben.',
      errorType: 'invalid-input',
      diagnosis: errorTypeFeedback(exercise, 'invalid-input'),
    };
  }
  const tokens = text.split(/\s+/).filter(Boolean).map(normalizeDiagnosisText);
  const words = tokens.length;
  const distinct = new Set(tokens).size;
  const haystack = normalizeDiagnosisText(text);
  const vetoed = (expected.mustNotContain ?? []).some((keyword) => keywordCovered(haystack, keyword));
  const covered = expected.mustContain.filter((keyword) => keywordCovered(haystack, keyword)).length;
  const missing = expected.mustContain.length - covered;
  const tooShort = words < expected.minWords || distinct < Math.min(expected.minWords, 8);
  const correct = !tooShort && missing === 0 && !vetoed;
  const errorType = correct ? null : 'missing-diagnosis';
  const fallbackDiagnosis = tooShort && missing > 0
    ? `Die Diagnose ist zu knapp (${words} von mindestens ${expected.minWords} Wörtern) und benennt die Fehlerursache noch nicht vollständig.`
    : tooShort
      ? `Zu knapp: ${words} von mindestens ${expected.minWords} Wörtern — beschreibe die Fehlerursache ausführlicher.`
      : 'Die Diagnose benennt die eigentliche Fehlerursache noch nicht präzise — prüfe, welche falsche Annahme erklärt werden muss.';
  return {
    correct,
    verdictText: correct ? 'Stichhaltige Diagnose.' : 'Diagnose noch nicht vollständig.',
    errorType,
    diagnosis: correct ? null : errorTypeFeedback(exercise, errorType) ?? fallbackDiagnosis,
    diagnosisCode: expected.diagnosisCode,
  };
}

/** Authored feedbackRules keyed on the grader errorType (e.g.
 *  'missing-diagnosis', 'invalid-input'): first matching rule wins. */
function errorTypeFeedback(exercise, code) {
  for (const rule of exercise.feedbackRules || []) {
    if (rule && rule.if === code && typeof rule.then === 'string' && rule.then.trim()) return rule.then;
  }
  return null;
}

// --- worked-example-fading (expected.kind 'gaps') --------------------------------

// Deterministic expression equivalence without sympy. The probe pool is the
// fixed table plus three values derived from the expression pair itself —
// a learner cannot precompute a polynomial that vanishes on every probe,
// because the derived values depend on the expected answer they do not know.
const EXPRESSION_PROBES = [0.5, 1, -2, 3, -1.5, 7, 0.25, -4, 2, 0.75];

function derivedProbes(...sources) {
  let hash = 0;
  for (const ch of sources.join('|')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return [0, 1, 2].map((i) => {
    hash = (hash * 1103515245 + 12345 + i * 7919) >>> 0;
    return (hash % 14000) / 1000 - 7;
  });
}

function expressionNames(...sources) {
  const names = new Set();
  for (const source of sources) {
    for (const match of String(source).matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) names.add(match[0]);
  }
  return [...names].sort();
}

const expressionScope = (names, round, probes) => {
  const scope = {};
  names.forEach((name, index) => { scope[name] = probes[(index + round) % probes.length]; });
  return scope;
};

const nearValue = (a, b) => a === b
  || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));

/** Contract-time check: the authored target must be finite on every probe
 *  scope — rejects degenerate answers like log(-1), sqrt(x) or 1/0 that would
 *  be unwinnable or trivially matched by any non-finite student input. */
function expressionTargetFinite(source) {
  const names = expressionNames(source);
  const probes = EXPRESSION_PROBES.concat(derivedProbes(source));
  let target;
  try { target = compileExpression(source, names); } catch { return false; }
  for (let round = 0; round < probes.length; round++) {
    if (!Number.isFinite(target(expressionScope(names, round, probes)))) return false;
  }
  return true;
}

/** true | false | 'invalid' | 'grader-error' — numeric gaps reuse the
 *  checkpoint scalar parser (decimal comma + fractions); the authored answer
 *  must parse too, otherwise the case is misconfigured. */
function checkNumericGap(gap, raw) {
  const target = parseCheckpointNumber(gap.answer);
  if (!target.ok) return 'grader-error';
  const got = parseCheckpointNumber(raw);
  if (!got.ok) return 'invalid';
  return Math.abs(got.value - target.value) <= DEFAULT_VIZ_CHECKPOINT_TOLERANCE;
}

/** true | false | 'invalid' | 'grader-error' — both sides compile with the
 *  union of free identifiers; equality is decided on the probe scopes. Every
 *  name sees every pool value across the rounds. */
function checkExpressionGap(gap, raw) {
  const targetSource = normalizeExpressionInput(gap.answer);
  const gotSource = normalizeExpressionInput(raw);
  const names = expressionNames(targetSource, gotSource);
  const probes = EXPRESSION_PROBES.concat(derivedProbes(targetSource, gotSource));
  let target;
  try { target = compileExpression(targetSource, names); } catch { return 'grader-error'; }
  let student;
  try { student = compileExpression(gotSource, names); } catch { return 'invalid'; }
  for (let round = 0; round < probes.length; round++) {
    const scope = expressionScope(names, round, probes);
    if (!nearValue(student(scope), target(scope))) return false;
  }
  return true;
}

/** Worked-example fading: gaps[] pair positionally with the [[gap]] markers
 *  in the prompt. correct = every gap matches; wrong-gap feedback names the
 *  1-based gap indices. */
function gradeFading(exercise, answers) {
  const expected = exercise.expectedAnswer;
  const gaps = expected && expected.kind === 'gaps' && Array.isArray(expected.gaps) ? expected.gaps : null;
  if (!gaps || !gaps.length || gaps.some((gap) => !gap || typeof gap.answer !== 'string' || !gap.answer.trim()
    || (gap.input !== 'numeric' && gap.input !== 'expression'))) {
    return { correct: false, verdictText: 'Interner Fehler: Lücken-Konfiguration fehlerhaft.', errorType: 'grader-error' };
  }
  const markers = String(exercise.prompt ?? '').split('[[gap]]').length - 1;
  if (markers !== gaps.length) {
    return { correct: false, verdictText: 'Interner Fehler: Anzahl der Lücken passt nicht zum Beispieltext.', errorType: 'grader-error' };
  }
  const list = Array.isArray(answers) ? answers : [];
  const wrong = [];
  for (let index = 0; index < gaps.length; index++) {
    const gap = gaps[index];
    const raw = list[index];
    if (raw == null || !String(raw).trim()) {
      return { correct: false, verdictText: `Bitte alle Lücken ausfüllen — Lücke ${index + 1} ist leer.`, errorType: 'invalid-input' };
    }
    const result = gap.input === 'expression' ? checkExpressionGap(gap, raw) : checkNumericGap(gap, raw);
    if (result === 'grader-error') {
      return { correct: false, verdictText: `Interner Fehler: Sollwert der Lücke ${index + 1} nicht lesbar.`, errorType: 'grader-error' };
    }
    if (result === 'invalid') {
      return {
        correct: false,
        verdictText: gap.input === 'expression'
          ? `Lücke ${index + 1}: Der Term ist nicht lesbar — Rechenzeichen explizit schreiben (z. B. 2*x).`
          : `Lücke ${index + 1}: Bitte eine Zahl eingeben — Dezimalzahl (z. B. 1,5) oder Bruch (z. B. 3/4).`,
        errorType: 'invalid-input',
      };
    }
    if (result === false) wrong.push(index + 1);
  }
  if (!wrong.length) return { correct: true, verdictText: 'Richtig — alle Schritte ergänzt.', errorType: null };
  // Authored rules keyed 'gap-<0-based>' or 'gap-<0-based>-<aspect>' fire when
  // that gap is wrong — per-gap hints beat the generic index listing.
  const authored = wrong.flatMap((i) => (exercise.feedbackRules || [])
    .filter((rule) => rule && typeof rule.if === 'string' && new RegExp(`^gap-${i - 1}(?:-|$)`).test(rule.if)
      && typeof rule.then === 'string' && rule.then.trim())
    .map((rule) => rule.then));
  return {
    correct: false,
    verdictText: 'Nicht richtig.',
    errorType: 'wrong-gap',
    diagnosis: authored.length ? authored.join(' ')
      : wrong.length === 1
        ? `Lücke ${wrong[0]} stimmt noch nicht — rechne diesen Schritt nach.`
        : `Lücken ${wrong.slice(0, -1).join(', ')} und ${wrong[wrong.length - 1]} stimmen noch nicht — rechne diese Schritte nach.`,
  };
}

// --- case contracts (validator + tests, same role as assertVizCheckpointContract) --

/** Canonical diagnosticCodes taxonomy, mirrored from docs/authoring-guide.md
 *  §8 (which stays the prose source): deterministic grader errorTypes,
 *  runtime/UI code patterns and named misconception codes. The validator
 *  rejects unknown diagnosisCodes in diagnostic-rationale cases. */
const CANONICAL_DIAGNOSTIC_CODES = new Set([
  'invalid-input', 'wrong-value', 'wrong-choice', 'swapped', 'wrong-order', 'wrong-output',
  'unparsed', 'not-equivalent', 'grader-error',
  'missing-choice', 'extra-choice', 'missing-diagnosis', 'wrong-gap',
  'off-by-one', 'except-pass', 'missing-before-hash',
]);
const CANONICAL_DIAGNOSTIC_PATTERNS = [
  /^trace-row-\d+$/,
  /^[A-Z][A-Za-z]*Error$/,
  /^(Timeout|WorkerRestarted|PackageError)$/,
];
export const isCanonicalDiagnosticCode = (code) => typeof code === 'string'
  && (CANONICAL_DIAGNOSTIC_CODES.has(code) || CANONICAL_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(code)));

function assertMultipleChoiceContract(label, item) {
  const fail = (message) => { throw new Error(`${label}: ${message}`); };
  const expected = item.expected;
  if (expected?.kind !== 'choice-indices' || !Array.isArray(expected.correctIds) || !expected.correctIds.length) {
    fail("multiple-choice braucht expected {kind:'choice-indices', correctIds:[...]}");
  }
  if (expected.scoring !== undefined && expected.scoring !== 'all-or-nothing' && expected.scoring !== 'per-correct') {
    fail(`multiple-choice: unbekanntes scoring "${expected.scoring}"`);
  }
  const ids = (item.choices || []).map((choice) => String(choice?.id));
  if (!ids.length || new Set(ids).size !== ids.length) fail('multiple-choice braucht choices mit eindeutigen ids');
  if (new Set(expected.correctIds.map(String)).size < 2) {
    fail('multiple-choice braucht mindestens zwei verschiedene correctIds — sonst ist es single-choice');
  }
  for (const id of expected.correctIds) {
    if (!ids.includes(String(id))) fail(`correctId "${id}" hat keine passende choice`);
  }
}

function assertDiagnosisContract(label, item) {
  const fail = (message) => { throw new Error(`${label}: ${message}`); };
  const expected = item.expected;
  if (expected?.kind !== 'diagnosis') fail("diagnostic-rationale braucht expected {kind:'diagnosis'}");
  if (!isCanonicalDiagnosticCode(expected.diagnosisCode)) {
    fail(`diagnosisCode "${expected.diagnosisCode}" liegt nicht in der kanonischen Taxonomie (docs/authoring-guide.md §8)`);
  }
  if (!Array.isArray(expected.mustContain) || !expected.mustContain.length
    || expected.mustContain.some((keyword) => typeof keyword !== 'string' || !keyword.trim()
      || !normalizeDiagnosisText(keyword).split('|').some((part) => part.trim()))) {
    fail('diagnostic-rationale braucht mustContain-Keywords mit mindestens einer nicht-leeren Alternative');
  }
  if (expected.mustNotContain !== undefined
    && (!Array.isArray(expected.mustNotContain)
      || expected.mustNotContain.some((keyword) => typeof keyword !== 'string' || !keyword.trim()))) {
    fail('diagnostic-rationale: mustNotContain muss ein Array nicht-leerer Strings sein');
  }
  const vetoSet = new Set((expected.mustNotContain ?? []).map(normalizeDiagnosisText));
  const overlaps = expected.mustContain.some((keyword) => normalizeDiagnosisText(keyword)
    .split('|').map((part) => part.trim()).filter(Boolean).some((part) => vetoSet.has(part)));
  if (overlaps) fail('diagnostic-rationale: mustContain und mustNotContain überschneiden sich — Fall wäre ungewinnbar');
  if (!Number.isInteger(expected.minWords) || expected.minWords < 1 || expected.minWords > 200) {
    fail('diagnostic-rationale braucht minWords als ganze Zahl zwischen 1 und 200');
  }
}

function assertFadingContract(label, item) {
  const fail = (message) => { throw new Error(`${label}: ${message}`); };
  const expected = item.expected;
  if (expected?.kind !== 'gaps' || !Array.isArray(expected.gaps) || !expected.gaps.length) {
    fail("worked-example-fading braucht expected {kind:'gaps', gaps:[...]}");
  }
  const markers = String(item.prompt ?? '').split('[[gap]]').length - 1;
  if (markers !== expected.gaps.length) {
    fail(`prompt hat ${markers} [[gap]]-Marker, expected.gaps hat ${expected.gaps.length} Einträge`);
  }
  expected.gaps.forEach((gap, index) => {
    const at = `gaps[${index}]`;
    if (!gap || typeof gap.answer !== 'string' || !gap.answer.trim()) fail(`${at}.answer muss ein nicht-leerer String sein`);
    if (gap.input === 'numeric') {
      if (!parseCheckpointNumber(gap.answer).ok) fail(`${at}.answer "${gap.answer}" ist keine lesbare Zahl`);
    } else if (gap.input === 'expression') {
      const source = normalizeExpressionInput(gap.answer);
      try { compileExpression(source, expressionNames(source)); } catch { fail(`${at}.answer "${gap.answer}" ist kein lesbarer Term`); }
      if (!expressionTargetFinite(source)) fail(`${at}.answer "${gap.answer}" ist auf den Probe-Scopes nicht endlich — degeneriertes Target`);
    } else {
      fail(`${at}.input muss "numeric" oder "expression" sein`);
    }
  });
}

/** Semantic case contracts the JSON schema cannot express, checked by
 *  tools/validate_content.mjs for every family document. Variants replace
 *  expected/choices/prompt wholesale (same merge as variantOf). R14:
 *  diagnostic-rationale is fail-closed mastery-ineligible at family AND case
 *  level; multiple-choice and worked-example-fading stay case-governed. */
// Case-level activityType/graderId stay schema-free strings, so the contract
// pins them to the known sets — an unknown type would otherwise surface as a
// runtime crash instead of a content error.
const KNOWN_ACTIVITY_TYPES = new Set([
  'numeric', 'single-choice', 'multiple-choice', 'vector', 'parsons', 'code-trace',
  'predict-output', 'python-code', 'algebraic-expression', 'short-rationale',
  'diagnostic-rationale', 'worked-example-fading',
]);
const KNOWN_GRADERS = new Set(['deterministic', 'pyodide', 'pyodide-sympy', 'manual-rubric']);

/** feedbackRules `if` keys each grader actually evaluates — anything else is
 *  dead authored content and fails closed. Types without a reader (python-code,
 *  vector, algebraic-expression, short-rationale) may not carry rules at all. */
const FEEDBACK_KEY_FORMS = {
  'numeric': [/^value === .+$/],
  'single-choice': [/^choice === '[^']+'$/, /^choice !== '[^']+'$/],
  'parsons': [/^order-length-mismatch$/],
  'code-trace': [/^value:[^+\s]+(\+value:[^+\s]+)*$/],
  'predict-output': [/^element-count-mismatch$/],
  'multiple-choice': [/^!?selected\.includes\('[^']+'\)$/],
  'diagnostic-rationale': [/^(missing-diagnosis|invalid-input)$/],
  'worked-example-fading': [/^gap-\d+(-|$)/],
};

function assertFeedbackKeys(label, type, item) {
  // Procedural docs resolve their type in the .mjs spec, not in the JSON —
  // when the type is unknown here, a key only has to match SOME known form.
  const forms = type ? (FEEDBACK_KEY_FORMS[type] ?? []) : Object.values(FEEDBACK_KEY_FORMS).flat();
  for (const rule of item.feedbackRules || []) {
    const key = rule && typeof rule.if === 'string' ? rule.if : String(rule?.if);
    if (!forms.some((form) => form.test(key))) {
      throw new Error(`${label}: feedbackRules.if "${key}" ist für Typ "${type ?? 'unbekannt'}" unerreichbar`);
    }
    if (typeof rule.then !== 'string' || !rule.then.trim()) {
      throw new Error(`${label}: feedbackRules.then muss ein nicht-leerer String sein`);
    }
  }
}

export function assertFamilyActivityContracts(document) {
  const contract = document?.contract || {};
  const familyType = contract.activityType;
  if (familyType === 'diagnostic-rationale' && contract.masteryEligible !== false) {
    throw new Error(`${document?.familyId}: diagnostic-rationale-Familien brauchen masteryEligible: false (R14, fail-closed)`);
  }
  for (const item of document?.cases || []) {
    const type = item.activityType ?? familyType;
    const label = `${document?.familyId}:${item.caseId}`;
    if (item.activityType !== undefined && !KNOWN_ACTIVITY_TYPES.has(item.activityType)) {
      throw new Error(`${label}: unbekannter activityType "${item.activityType}"`);
    }
    if (item.graderId !== undefined && !KNOWN_GRADERS.has(item.graderId)) {
      throw new Error(`${label}: unbekannte graderId "${item.graderId}"`);
    }
    // R14 fail-closed: a diagnostic-rationale family makes every case
    // non-mastery regardless of the case's own activityType — otherwise a
    // mastery-flagged foreign-type case could leak evidence into the family.
    if (type === 'diagnostic-rationale' || familyType === 'diagnostic-rationale') {
      if (item.masteryEligible !== false) {
        throw new Error(`${label}: diagnostic-rationale-Fälle brauchen masteryEligible: false (R14, fail-closed)`);
      }
    }
    const check = type === 'multiple-choice' ? assertMultipleChoiceContract
      : type === 'diagnostic-rationale' ? assertDiagnosisContract
      : type === 'worked-example-fading' ? assertFadingContract
      : null;
    assertFeedbackKeys(label, type, item);
    if (check) check(label, item);
    for (const [index, variant] of (item.variants || []).entries()) {
      const merged = { ...item, ...variant };
      const variantLabel = `${label}:variant-${index + 1}`;
      assertFeedbackKeys(variantLabel, merged.activityType ?? familyType, merged);
      if (check) check(variantLabel, merged);
    }
  }
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
      if (type === 'multiple-choice') return gradeMultipleChoice(exercise, answer);
      if (type === 'diagnostic-rationale') return gradeDiagnosis(exercise, answer);
      if (type === 'worked-example-fading') return gradeFading(exercise, answer);
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

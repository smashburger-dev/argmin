// Grader + contract tests for the three newer activityTypes:
// multiple-choice (choice-indices), diagnostic-rationale (diagnosis) and
// worked-example-fading (gaps). Fixtures stay inline — family JSON is
// authored by parallel content agents against these same contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  graders,
  isCanonicalDiagnosticCode,
  assertFamilyActivityContracts,
} from '../assets/js/core/graders.js';

const det = graders.deterministic;

// --- fixtures ---------------------------------------------------------------

const mcExercise = (expected = {}) => ({
  activityType: 'multiple-choice',
  parameters: {},
  choices: [
    { id: 'a', text: 'Alpha' },
    { id: 'b', text: 'Beta' },
    { id: 'c', text: 'Gamma' },
    { id: 'd', text: 'Delta' },
  ],
  expectedAnswer: { kind: 'choice-indices', correctIds: ['a', 'c'], ...expected },
});

const diagnosisExercise = (expected = {}) => ({
  activityType: 'diagnostic-rationale',
  parameters: {},
  expectedAnswer: {
    kind: 'diagnosis',
    diagnosisCode: 'off-by-one',
    mustContain: ['nullbasiert', 'Index'],
    minWords: 6,
    ...expected,
  },
});

const fadingExercise = (overrides = {}) => ({
  activityType: 'worked-example-fading',
  parameters: {},
  prompt: 'Rechne nach: $2x = [[gap]]$ und $x = [[gap]]$ — plus [[gap]] insgesamt.',
  expectedAnswer: {
    kind: 'gaps',
    gaps: [
      { answer: '6', input: 'numeric' },
      { answer: '3', input: 'numeric' },
      { answer: '2*x', input: 'expression' },
    ],
  },
  ...overrides,
});

const familyDoc = (contract, cases) => ({ familyId: 'test-family', contract, cases });

// --- multiple-choice ---------------------------------------------------------

test('multiple-choice: exact set match is correct; scoring defaults to all-or-nothing', async () => {
  const e = mcExercise();
  const r = await det.grade(e, ['a', 'c']);
  assert.equal(r.correct, true);
  assert.equal(r.score, 1);
  assert.equal(r.errorType, null);
  assert.equal((await det.grade(e, ['c', 'a'])).correct, true); // order-insensitive
});

test('multiple-choice: missing, extra and mixed picks map to their errorTypes', async () => {
  const e = mcExercise();
  assert.equal((await det.grade(e, ['a'])).errorType, 'missing-choice');
  assert.equal((await det.grade(e, ['a', 'c', 'b'])).errorType, 'extra-choice');
  assert.equal((await det.grade(e, ['b', 'd'])).errorType, 'wrong-choice');
  assert.equal((await det.grade(e, ['a'])).correct, false);
});

test('multiple-choice: empty selection and junk input are invalid-input', async () => {
  const e = mcExercise();
  assert.equal((await det.grade(e, [])).errorType, 'invalid-input');
  assert.equal((await det.grade(e, null)).errorType, 'invalid-input');
  assert.equal((await det.grade(e, undefined)).errorType, 'invalid-input');
});

test('multiple-choice: duplicate ids in the answer collapse to a set', async () => {
  const e = mcExercise();
  const r = await det.grade(e, ['a', 'a', 'c', 'c', 'a']);
  assert.equal(r.correct, true);
  const dup = await det.grade(e, ['a', 'a']);
  assert.equal(dup.errorType, 'missing-choice');
});

test('multiple-choice per-correct: score earns hits and charges wrong picks, floored at 0', async () => {
  const e = mcExercise({ scoring: 'per-correct' });
  const half = await det.grade(e, ['a']);
  assert.equal(half.correct, false);
  assert.equal(half.score, 0.5);
  assert.match(half.verdictText, /Teilweise richtig/);
  const extra = await det.grade(e, ['a', 'c', 'b']); // 2 hits − 1 extra
  assert.equal(extra.score, 0.5);
  assert.equal(extra.errorType, 'extra-choice');
  const onlyWrong = await det.grade(e, ['b']);
  assert.equal(onlyWrong.score, 0); // floored, never negative
  const full = await det.grade(e, ['a', 'c']);
  assert.equal(full.correct, true);
  assert.equal(full.score, 1);
});

test('multiple-choice: authored feedbackRules join into the diagnosis', async () => {
  const e = mcExercise();
  e.feedbackRules = [
    { if: "selected.includes('b')", then: 'Regel B greift.' },
    { if: "!selected.includes('c')", then: 'Regel C fehlt.' },
    { if: 'value === 3', then: 'Fremdregel wird ignoriert.' },
  ];
  const r = await det.grade(e, ['a', 'b']);
  assert.match(r.diagnosis, /Regel B greift/);
  assert.match(r.diagnosis, /Regel C fehlt/);
  assert.doesNotMatch(r.diagnosis, /Fremdregel/);
});

test('multiple-choice: unknown choice ids count as wrong picks, not crashes', async () => {
  const e = mcExercise();
  const r = await det.grade(e, ['a', 'c', 'zzz']);
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'extra-choice');
  const perCorrect = await det.grade(mcExercise({ scoring: 'per-correct' }), ['a', 'c', 'zzz']);
  assert.equal(perCorrect.score, 0.5);
});

test('multiple-choice: malformed expected fails closed', async () => {
  assert.equal((await det.grade(mcExercise({ kind: 'bogus' }), ['a'])).errorType, 'grader-error');
  assert.equal((await det.grade(mcExercise({ correctIds: [] }), ['a'])).errorType, 'grader-error');
  assert.equal((await det.grade(mcExercise({ scoring: 'weighted' }), ['a'])).errorType, 'grader-error');
});

// --- diagnostic-rationale -----------------------------------------------------

const GOOD_DIAGNOSIS = 'Der Code nutzt ein nullbasiert Index-Modell und zählt die Kopfzeile mit.';

test('diagnostic-rationale: keyword coverage + minWords yields correct', async () => {
  const r = await det.grade(diagnosisExercise(), GOOD_DIAGNOSIS);
  assert.equal(r.correct, true);
  assert.equal(r.errorType, null);
  assert.equal(r.diagnosisCode, 'off-by-one');
});

test('diagnostic-rationale: umlaut-folded and case-insensitive keyword match', async () => {
  const e = diagnosisExercise({ mustContain: ['für', 'Größe'] });
  const r = await det.grade(e, 'Die Formel gilt fuer beliebige Groesse der Stichprobe.');
  assert.equal(r.correct, true);
});

test('diagnostic-rationale: too short or missing coverage reports the dimension, never the keyword', async () => {
  const e = diagnosisExercise();
  const short = await det.grade(e, 'Nullbasiert Index kurz.');
  assert.equal(short.correct, false);
  assert.equal(short.errorType, 'missing-diagnosis');
  assert.match(short.diagnosis, /Wörtern|knapp/);
  const missing = await det.grade(e, 'Der Code zählt falsch, weil das Modell ganz anders gedacht war als vermutet.');
  assert.equal(missing.errorType, 'missing-diagnosis');
  assert.doesNotMatch(missing.diagnosis, /nullbasiert|Index/i);
});

test('diagnostic-rationale: word-boundary match — int does not match print, train not train_test_split', async () => {
  const e = diagnosisExercise({ mustContain: ['int'], minWords: 3 });
  const r = await det.grade(e, 'Der print Aufruf scheitert an einem anderen Grund hier.');
  assert.equal(r.correct, false); // 'int' inside 'print' must not count
  const e2 = diagnosisExercise({ mustContain: ['train'], minWords: 3 });
  assert.equal((await det.grade(e2, 'Die Funktion train_test_split nutzt ein Zufallsseed hier korrekt.')).correct, false);
  // inflected German forms still count: 'alter' covers 'Alters'
  const e3 = diagnosisExercise({ mustContain: ['alter'], minWords: 3 });
  assert.equal((await det.grade(e3, 'Das Alters der Stichprobe wurde hier falsch gelesen.')).correct, true);
});

test('diagnostic-rationale: mustContain entries may list |-separated alternatives', async () => {
  const e = diagnosisExercise({ mustContain: ['except|ausnahmeblock', 'fehler'], minWords: 4 });
  assert.equal((await det.grade(e, 'Der Ausnahmeblock verschluckt den Fehler komplett.')).correct, true);
  assert.equal((await det.grade(e, 'Der Block verschluckt das Problem hier komplett.')).correct, false);
});

test('diagnostic-rationale: mustNotContain vetoes misconception phrasings', async () => {
  const e = diagnosisExercise({ mustContain: ['index'], minWords: 3, mustNotContain: ['zufall|absicht'] });
  const veto = await det.grade(e, 'Der Index ist korrekt, der Fehler ist Zufall oder Absicht.');
  assert.equal(veto.correct, false);
  assert.equal(veto.errorType, 'missing-diagnosis');
  const clean = await det.grade(e, 'Der Index startet bei eins statt bei null hier.');
  assert.equal(clean.correct, true);
});

test('diagnostic-rationale: keyword salad fails the distinct-word floor', async () => {
  const e = diagnosisExercise({ mustContain: ['index'], minWords: 6 });
  const salad = await det.grade(e, 'Index Index Index Index Index Index Index Index');
  assert.equal(salad.correct, false);
  assert.match(salad.diagnosis, /knapp|Wörtern/);
});

test('diagnostic-rationale: empty input and malformed expected fail safely', async () => {
  const e = diagnosisExercise();
  assert.equal((await det.grade(e, '')).errorType, 'invalid-input');
  assert.equal((await det.grade(e, '   ')).errorType, 'invalid-input');
  assert.equal((await det.grade(diagnosisExercise({ mustContain: [] }), 'langer text')).errorType, 'grader-error');
  assert.equal((await det.grade(diagnosisExercise({ kind: 'bogus' }), 'langer text')).errorType, 'grader-error');
});

// --- worked-example-fading -----------------------------------------------------

test('worked-example-fading: numeric and expression gaps all correct', async () => {
  const e = fadingExercise();
  const r = await det.grade(e, ['6', '3', 'x+x']); // x+x ≡ 2*x on probe scopes
  assert.equal(r.correct, true);
  assert.equal(r.errorType, null);
});

test('worked-example-fading: decimal comma and fraction answers parse', async () => {
  const e = fadingExercise({
    prompt: 'a=[[gap]] b=[[gap]]',
    expectedAnswer: { kind: 'gaps', gaps: [{ answer: '1,5', input: 'numeric' }, { answer: '3/4', input: 'numeric' }] },
  });
  assert.equal((await det.grade(e, ['1.5', '0.75'])).correct, true);
  assert.equal((await det.grade(e, ['1,5', '3/4'])).correct, true);
});

test('worked-example-fading: wrong gaps report 1-based indices', async () => {
  const e = fadingExercise();
  const r = await det.grade(e, ['7', '3', 'x*3']);
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'wrong-gap');
  assert.match(r.diagnosis, /Lücke 1|Lücken 1 und 3/);
  assert.match(r.diagnosis, /3/);
});

test('worked-example-fading: empty, missing and unparseable gaps are invalid-input', async () => {
  const e = fadingExercise();
  assert.match((await det.grade(e, ['6', '', '2*x'])).verdictText, /Lücke 2/);
  assert.equal((await det.grade(e, ['6', '', '2*x'])).errorType, 'invalid-input');
  assert.equal((await det.grade(e, ['6'])).errorType, 'invalid-input'); // fewer answers than gaps
  assert.equal((await det.grade(e, null)).errorType, 'invalid-input');
  assert.equal((await det.grade(e, ['6', '3', 'x+'])).errorType, 'invalid-input'); // unparseable term
  assert.equal((await det.grade(e, ['6', '3', '2 x'])).errorType, 'invalid-input'); // implicit mult unsupported
});

test('worked-example-fading: marker count mismatch and bad expected fail closed', async () => {
  const e = fadingExercise({ prompt: 'keine Lücke hier' });
  assert.equal((await det.grade(e, ['6', '3', '2*x'])).errorType, 'grader-error');
  const bad = fadingExercise({ expectedAnswer: { kind: 'gaps', gaps: [{ answer: 'x', input: 'weird' }] } });
  assert.equal((await det.grade(bad, ['x'])).errorType, 'grader-error');
  const noGaps = fadingExercise({ expectedAnswer: { kind: 'gaps', gaps: [] } });
  assert.equal((await det.grade(noGaps, [])).errorType, 'grader-error');
});

test('worked-example-fading: unparseable authored answers are grader-errors, not learner errors', async () => {
  const e = fadingExercise({
    prompt: 'nur [[gap]]',
    expectedAnswer: { kind: 'gaps', gaps: [{ answer: 'abc', input: 'numeric' }] },
  });
  assert.equal((await det.grade(e, ['5'])).errorType, 'grader-error');
  const badExpr = fadingExercise({
    prompt: 'nur [[gap]]',
    expectedAnswer: { kind: 'gaps', gaps: [{ answer: 'x+', input: 'expression' }] },
  });
  assert.equal((await det.grade(badExpr, ['x+1'])).errorType, 'grader-error');
});

// --- dispatch ------------------------------------------------------------------

test('deterministic grader dispatches all three new activityTypes', async () => {
  assert.equal((await det.grade(mcExercise(), ['a', 'c'])).correct, true);
  assert.equal((await det.grade(diagnosisExercise(), GOOD_DIAGNOSIS)).correct, true);
  assert.equal((await det.grade(fadingExercise(), ['6', '3', 'x+x'])).correct, true);
  await assert.rejects(() => det.grade({ activityType: 'mystery' }, 'x'), /unbekannter Aufgabentyp/);
});

// --- taxonomy + family contracts -------------------------------------------------

test('diagnosticCode taxonomy: canonical codes pass, unknown codes fail', () => {
  for (const code of ['off-by-one', 'missing-diagnosis', 'wrong-gap', 'missing-choice', 'extra-choice', 'invalid-input']) {
    assert.equal(isCanonicalDiagnosticCode(code), true, code);
  }
  assert.equal(isCanonicalDiagnosticCode('trace-row-3'), true);
  assert.equal(isCanonicalDiagnosticCode('ValueError'), true);
  assert.equal(isCanonicalDiagnosticCode('bogus-code'), false);
  assert.equal(isCanonicalDiagnosticCode('OFF-BY-ONE'), false);
  assert.equal(isCanonicalDiagnosticCode(''), false);
});

test('diagnostic-rationale is fail-closed mastery-ineligible at family and case level', () => {
  const diagnosticCase = {
    caseId: 'diag', masteryEligible: false,
    expected: { kind: 'diagnosis', diagnosisCode: 'off-by-one', mustContain: ['x'], minWords: 3 },
  };
  assert.throws(() => assertFamilyActivityContracts(familyDoc(
    { activityType: 'diagnostic-rationale', masteryEligible: true }, [diagnosticCase],
  )), /masteryEligible: false/);
  assert.throws(() => assertFamilyActivityContracts(familyDoc(
    { activityType: 'diagnostic-rationale', masteryEligible: false },
    [{ ...diagnosticCase, masteryEligible: true }],
  )), /masteryEligible: false/);
  // contractless doc with case-level diagnostic-rationale stays fail-closed
  assert.throws(() => assertFamilyActivityContracts(familyDoc(
    null, [{ ...diagnosticCase, activityType: 'diagnostic-rationale', masteryEligible: true }],
  )), /masteryEligible: false/);
  assert.doesNotThrow(() => assertFamilyActivityContracts(familyDoc(
    { activityType: 'diagnostic-rationale', masteryEligible: false }, [diagnosticCase],
  )));
});

test('multiple-choice and worked-example-fading masteryEligible stay case-governed', () => {
  const mcCase = {
    caseId: 'mc', masteryEligible: true,
    choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    expected: { kind: 'choice-indices', correctIds: ['a', 'b'] },
  };
  const fadingCase = {
    caseId: 'fade', masteryEligible: true, prompt: 'x = [[gap]]',
    expected: { kind: 'gaps', gaps: [{ answer: '3', input: 'numeric' }] },
  };
  assert.doesNotThrow(() => assertFamilyActivityContracts(familyDoc(
    { activityType: 'multiple-choice', masteryEligible: true }, [mcCase],
  )));
  assert.doesNotThrow(() => assertFamilyActivityContracts(familyDoc(
    { activityType: 'worked-example-fading', masteryEligible: true }, [fadingCase],
  )));
});

test('expected-kind contracts: unknown diagnosisCode, bad correctIds, marker mismatch throw', () => {
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [{
    caseId: 'd', masteryEligible: false, activityType: 'diagnostic-rationale',
    expected: { kind: 'diagnosis', diagnosisCode: 'bogus-code', mustContain: ['x'], minWords: 3 },
  }])), /Taxonomie/);
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [{
    caseId: 'm', masteryEligible: true, activityType: 'multiple-choice',
    choices: [{ id: 'a', text: 'A' }],
    expected: { kind: 'choice-indices', correctIds: ['x', 'z'] },
  }])), /keine passende choice/);
  // single correctId is single-choice, not multiple-choice; duplicates collapse
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [{
    caseId: 'm', masteryEligible: true, activityType: 'multiple-choice',
    choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    expected: { kind: 'choice-indices', correctIds: ['a'] },
  }])), /mindestens zwei verschiedene correctIds/);
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [{
    caseId: 'm', masteryEligible: true, activityType: 'multiple-choice',
    choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    expected: { kind: 'choice-indices', correctIds: ['a', 'a'] },
  }])), /mindestens zwei verschiedene correctIds/);
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [{
    caseId: 'f', masteryEligible: true, activityType: 'worked-example-fading',
    prompt: 'zwei [[gap]] Marker [[gap]]',
    expected: { kind: 'gaps', gaps: [{ answer: '1', input: 'numeric' }] },
  }])), /\[\[gap\]\]-Marker|Marker/);
});

test('variants inherit the case contract via merge (variant expected + prompt count)', () => {
  const base = {
    caseId: 'f', masteryEligible: true, activityType: 'worked-example-fading',
    prompt: 'eine [[gap]] Lücke',
    expected: { kind: 'gaps', gaps: [{ answer: '1', input: 'numeric' }] },
    variants: [{ prompt: 'zwei [[gap]] und [[gap]]' }],
  };
  assert.throws(() => assertFamilyActivityContracts(familyDoc(null, [base])), /Marker/);
  assert.doesNotThrow(() => assertFamilyActivityContracts(familyDoc(null, [{
    ...base,
    variants: [{ expected: { kind: 'gaps', gaps: [{ answer: '1', input: 'numeric' }] } }],
  }])));
});

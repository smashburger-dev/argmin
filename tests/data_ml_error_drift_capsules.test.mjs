// Familie classify-error-drift: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_error_drift_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genErrorDriftCapsule,
  ERROR_DRIFT_CAPSULES,
  errorDriftCapsuleOk,
  errorDriftCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  ERROR_DRIFT_CONTRACT,
  generateErrorDriftFamily,
  solveErrorDriftFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Szenarien halten und die
// Schlüssel wörtlich treffen. Die drei Base-Fälle sind Anker (Werk-Drift,
// Labeldefinitions-Shift, Sprachgruppen-Subgruppe) und bleiben als Befund
// unangetastet; generiert wird die Varianten-Bank.
// Einzige migrierte Familie mit challenge-Profil und masteryEligible:
// Kapsel-Keys sind core/stretch/challenge, der Contract trägt
// masteryEligible: true (generate reicht kein masteryEligible durch — der
// Registry-Fallback family.masteryEligible greift, Vorbild
// generateMissingnessFamily).
// Anker-Korrektur (Copy-Paste im Bestand): alle drei Base-Fälle trugen
// parameters {accuracyBefore: 0.96, accuracyAfter: 0.81, codeChanged: false}
// aus Fall 1. Fall 1 bleibt unverändert — sein Prompt nennt genau diese
// Werte. Die Anker 2/3 sind auf {shift: 'Geschäftsregel'} bzw.
// {group: 'Sprachgruppe', overallGood: true} angeglichen, weil ihre Prompts
// keine Accuracy-Werte, sondern die geänderte Labeldefinition bzw. die
// dauerhaft schwächere Sprachgruppe nennen — gleicher Befund wie bei
// classify-confounding/classify-task-type.
// Wörtlichkeit: Der Schlüsseltext ist je Fall eine Konstante (in allen neun
// kuratierten Varianten identisch); die szenariobindenden Distraktoren
// stehen wörtlich in der Bank (Vorbild classify-missingness).
const ORACLES = [
  {
    caseId: 'accuracy-drop-without-code-change', key: 'core', entries: [
      { parameters: { accuracyBefore: 0.94, accuracyAfter: 0.79, codeChanged: false, domain: 'Scanner' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.91, accuracyAfter: 0.74, codeChanged: false, domain: 'Sprache' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.97, accuracyAfter: 0.83, codeChanged: false, domain: 'Kredit' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.93, accuracyAfter: 0.77, codeChanged: false, domain: 'Medizinbild' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.88, accuracyAfter: 0.71, codeChanged: false, domain: 'Betrug' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.95, accuracyAfter: 0.8, codeChanged: false, domain: 'Qualität' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.9, accuracyAfter: 0.72, codeChanged: false, domain: 'Support' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.92, accuracyAfter: 0.76, codeChanged: false, domain: 'Verkehr' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
      { parameters: { accuracyBefore: 0.96, accuracyAfter: 0.82, codeChanged: false, domain: 'Werk' }, correctText: 'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.' },
    ],
  },
  {
    caseId: 'error-label-definition-shift', key: 'stretch', entries: [
      { parameters: { accuracyBefore: 0.9, accuracyAfter: 0.7, codeChanged: false, shift: 'Spam-Regel' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.88, accuracyAfter: 0.66, codeChanged: false, shift: 'Betrugsschwelle' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.93, accuracyAfter: 0.75, codeChanged: false, shift: 'Defektkatalog' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.91, accuracyAfter: 0.68, codeChanged: false, shift: 'Churn-Fenster' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.86, accuracyAfter: 0.64, codeChanged: false, shift: 'ICD-Kodierung' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.89, accuracyAfter: 0.71, codeChanged: false, shift: 'Moderationsrichtlinie' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.94, accuracyAfter: 0.78, codeChanged: false, shift: 'Verspätungsgrenze' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.87, accuracyAfter: 0.69, codeChanged: false, shift: 'Kreditausfall-Horizont' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
      { parameters: { accuracyBefore: 0.92, accuracyAfter: 0.73, codeChanged: false, shift: 'Support-Eskalation' }, correctText: 'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.' },
    ],
  },
  {
    caseId: 'error-stable-subgroup', key: 'challenge', entries: [
      { parameters: { group: 'Dialekt', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'Nachtschicht-Bilder', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'kleine Schrift', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'ältere Kundinnen', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'seltene Produktlinie', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'kurze Texte', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'Mobilfunk-Fotos', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'Zweitsprachen-Mails', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
      { parameters: { group: 'linke Fahrspur bei Regen', overallGood: true }, correctText: 'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.' },
    ],
  },
];

const CAPSULE_KEYS = ['core', 'stretch', 'challenge'];
const CASE_FOR = { core: 'accuracy-drop-without-code-change', stretch: 'error-label-definition-shift', challenge: 'error-stable-subgroup' };
const capsuleFor = (caseId) => ERROR_DRIFT_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle kuratierten Szenarien in der Bank, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(errorDriftCapsuleOk({ ...entry.parameters, caseId: oracle.caseId }, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(errorDriftCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-error-drift.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  // Anker 1 unverändert: sein Prompt nennt exakt 96 % → 81 % ohne Codeänderung.
  assert.deepEqual(byId.get('accuracy-drop-without-code-change').parameters, { accuracyBefore: 0.96, accuracyAfter: 0.81, codeChanged: false });
  // Anker-Korrektur: Bestand trug die parameters von Fall 1 (Copy-Paste);
  // die Prompts handeln von der geänderten Labeldefinition bzw. der
  // dauerhaft schwächeren Sprachgruppe und nennen keine Accuracy-Werte.
  assert.deepEqual(byId.get('error-label-definition-shift').parameters, { shift: 'Geschäftsregel' });
  assert.deepEqual(byId.get('error-stable-subgroup').parameters, { group: 'Sprachgruppe', overallGood: true });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
    assert.equal(body.masteryEligible, true, `${oracle.caseId}: masteryEligible`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('accuracy-drop-without-code-change'),
    'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.',
  );
  assert.equal(
    correctOf('error-label-definition-shift'),
    'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.',
  );
  assert.equal(
    correctOf('error-stable-subgroup'),
    'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, Slots', () => {
  assert.equal(ERROR_DRIFT_CAPSULES.core.caseId, 'accuracy-drop-without-code-change');
  assert.equal(ERROR_DRIFT_CAPSULES.stretch.caseId, 'error-label-definition-shift');
  assert.equal(ERROR_DRIFT_CAPSULES.challenge.caseId, 'error-stable-subgroup');
  for (const capsule of Object.values(ERROR_DRIFT_CAPSULES)) {
    assert.equal(capsule.bank.length, 14, `${capsule.caseId}: 14 Szenarien`);
    assert.equal(new Set(capsule.bank.map((item) => item[capsule.slot])).size, 14, `${capsule.caseId}: Slotwerte eindeutig`);
  }
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ERROR_DRIFT_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genErrorDriftCapsule(seed, capsule);
      assert.ok(errorDriftCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, errorDriftCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateErrorDriftFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateErrorDriftFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveErrorDriftFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Szenario-Bank', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ERROR_DRIFT_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateErrorDriftFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!errorDriftCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateErrorDriftFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
      counts[generated.expected.correctChoice] += 1;
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
      byModulo.get(bucket).add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    for (const [id, count] of Object.entries(counts)) {
      assert.ok(count >= 40 && count <= 60, `${key}: Position ${id} nur ${count}x`);
    }
    for (const [bucket, instances] of byModulo) {
      assert.ok(instances.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
    }
  }
});

test('negative Seeds: gültig und deterministisch', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ERROR_DRIFT_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genErrorDriftCapsule(seed, capsule);
      assert.deepEqual(first, genErrorDriftCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(errorDriftCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(ERROR_DRIFT_CONTRACT.familyId, 'classify-error-drift');
  assert.equal(ERROR_DRIFT_CONTRACT.authorityMode, 'seeded');
  assert.equal(ERROR_DRIFT_CONTRACT.activityType, 'single-choice');
  assert.equal(ERROR_DRIFT_CONTRACT.masteryEligible, true);
  assert.deepEqual(ERROR_DRIFT_CONTRACT.difficultyProfiles, ['core', 'stretch', 'challenge']);
  assert.deepEqual(ERROR_DRIFT_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateErrorDriftFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveErrorDriftFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateErrorDriftFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateErrorDriftFamily({ seed: 0, caseId: 'accuracy-drop-without-code-change', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateErrorDriftFamily({ seed: 0, caseId: 'error-label-definition-shift', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateErrorDriftFamily({ seed: 0, caseId: 'accuracy-drop-without-code-change', difficulty: 'intro' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-error-drift', 11, 'core', 'accuracy-drop-without-code-change');
  assert.equal(instance.masteryEligible, true);
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});

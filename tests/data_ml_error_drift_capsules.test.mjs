// Familie classify-error-drift: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_error_drift_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ERROR_DRIFT_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  ERROR_DRIFT_CONTRACT,
  genErrorDriftCapsule,
  errorDriftCapsuleOk,
  errorDriftCorrectText,
  generateErrorDriftFamily,
  solveErrorDriftFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  ERROR_DRIFT_CAPSULES,
  errorDriftCapsuleOk,
  errorDriftCorrectText,
  genErrorDriftCapsule,
  ERROR_DRIFT_CONTRACT,
  generateErrorDriftFamily,
  solveErrorDriftFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-error-drift'),
};

choiceCapsuleSuite('classify-error-drift', mod, [
  { caseId: 'accuracy-drop-without-code-change', difficulty: 'core' },
  { caseId: 'error-label-definition-shift', difficulty: 'stretch' },
  { caseId: 'error-stable-subgroup', difficulty: 'challenge' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['core', 'stretch', 'challenge'] });

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

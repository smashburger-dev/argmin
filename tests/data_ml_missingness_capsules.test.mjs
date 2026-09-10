// Familie classify-missingness: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_missingness_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genMissingnessCapsule,
  MISSINGNESS_CAPSULES,
  missingnessCapsuleOk,
  missingnessCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  MISSINGNESS_CONTRACT,
  generateMissingnessFamily,
  solveMissingnessFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Szenarien halten und die
// Schlüssel wörtlich treffen. Die drei Base-Fälle sind Anker (Umsatz-Löschen,
// Geräte-Zensur, Einkommensumfrage) und bleiben als Befund unangetastet;
// generiert wird die Varianten-Bank.
// Anker-Korrektur (Copy-Paste-Fehler im Bestand): der Base-Fall
// missingness-device-censoring trug das thema „zielabhängige Missingness“
// (Copy-Paste aus Fall 1), obwohl sein Prompt vom gerätebedingten Zensieren
// handelt; der Anker ist auf „wertabhängiges Zensieren“ angleicht.
const ORACLES = [
  {
    caseId: 'target-dependent-missingness', key: 'intro', entries: [
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Gehalt' }, correctText: 'Die verbleibenden Daten unterschätzen das durchschnittliche Gehalt systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Liegezeit' }, correctText: 'Die verbleibenden Daten unterschätzen die mittlere Liegezeit — das Löschen verzerrt, weil lange Aufenthalte gezielt fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Note' }, correctText: 'Die verbleibenden Noten unterschätzen den Mittelwert systematisch, weil gerade die besten Ergebnisse fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Bestellwert' }, correctText: 'Der mittlere Bestellwert der Restzeilen liegt zu niedrig, weil genau die großen Aufträge fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Schadstoff' }, correctText: 'Der Mittelwert der gemeldeten Werte unterschätzt die Belastung, weil Extremtage fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Ausfall' }, correctText: 'Die Ausfallrate der Restzeilen ist zu niedrig, weil genau die kritischen Fälle fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Strom' }, correctText: 'Der mittlere Verbrauch der Restzeilen liegt zu niedrig, weil Spitzenverbraucher fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Spende' }, correctText: 'Der Mittelwert der beobachteten Spenden unterschätzt den wahren Mittelwert, weil große Spenden fehlen.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Miete' }, correctText: 'Die verbleibenden Mieten unterschätzen das Niveau, weil teure Wohnungen gezielt fehlen.' },
    ],
  },
  {
    caseId: 'missingness-device-censoring', key: 'core', entries: [
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Blutdruckmanschette' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann extreme Blutdruckwerte systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Personenwaage' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann sehr hohe Gewichte systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Mikrofon' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann laute Peaks systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'pH-Sonde' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann extreme pH-Werte systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Glukosemessgerät' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann sehr hohe Glukosewerte systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Geschwindigkeitsmessung' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann sehr hohe Geschwindigkeiten systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Altimeter' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann große Höhen systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Leistungsmesser' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann Lastspitzen systematisch entfernen.' },
      { parameters: { thema: 'wertabhängiges Zensieren', sensor: 'Feinstaubsensor' }, correctText: 'Das Fehlen ist wertabhängig; Löschen kann saturierte Extremwerte systematisch entfernen.' },
    ],
  },
  {
    caseId: 'missingness-income-survey', key: 'stretch', entries: [
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Vermögen' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den Mittelwert des Vermögens nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Bonus' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den mittleren Bonus nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Firmenumsatz' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den mittleren Umsatz nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Arbeitszeit' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann die mittlere Arbeitszeit nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Immobilienwert' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den mittleren Immobilienwert nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Spendenbereitschaft' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den mittleren Spendenbetrag nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Kilometerstand' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den mittleren Kilometerstand nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Körpergewicht' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den Mittelwert des Gewichts nach unten verzerren.' },
      { parameters: { thema: 'zielabhängige Missingness', ziel: 'Nettovermögen' }, correctText: 'Die Missingness ist wahrscheinlich wertabhängig und kann den Mittelwert nach unten verzerren.' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'target-dependent-missingness', core: 'missingness-device-censoring', stretch: 'missingness-income-survey' };
const capsuleFor = (caseId) => MISSINGNESS_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle kuratierten Szenarien in der Bank, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(missingnessCapsuleOk({ ...entry.parameters, caseId: oracle.caseId }, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(missingnessCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-missingness.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  assert.deepEqual(byId.get('target-dependent-missingness').parameters, { thema: 'zielabhängige Missingness' });
  // Anker-Korrektur: Bestand trug das thema von Fall 1 (Copy-Paste); Prompt
  // handelt vom gerätebedingten Zensieren.
  assert.deepEqual(byId.get('missingness-device-censoring').parameters, { thema: 'wertabhängiges Zensieren' });
  assert.deepEqual(byId.get('missingness-income-survey').parameters, { thema: 'zielabhängige Missingness' });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('target-dependent-missingness'),
    'Die verbleibenden Daten unterschätzen den durchschnittlichen Umsatz systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
  );
  assert.equal(
    correctOf('missingness-device-censoring'),
    'Das Fehlen ist wertabhängig; Löschen kann Extremwerte systematisch entfernen.',
  );
  assert.equal(
    correctOf('missingness-income-survey'),
    'Die Missingness ist wahrscheinlich wertabhängig und kann den Mittelwert nach unten verzerren.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, thema-Slots', () => {
  assert.equal(MISSINGNESS_CAPSULES.intro.caseId, 'target-dependent-missingness');
  assert.equal(MISSINGNESS_CAPSULES.core.caseId, 'missingness-device-censoring');
  assert.equal(MISSINGNESS_CAPSULES.stretch.caseId, 'missingness-income-survey');
  for (const capsule of Object.values(MISSINGNESS_CAPSULES)) {
    assert.equal(capsule.bank.length, 14, `${capsule.caseId}: 14 Szenarien`);
    assert.equal(new Set(capsule.bank.map((item) => item[capsule.slot])).size, 14, `${capsule.caseId}: Slotwerte eindeutig`);
  }
  assert.equal(MISSINGNESS_CAPSULES.intro.thema, 'zielabhängige Missingness');
  assert.equal(MISSINGNESS_CAPSULES.core.thema, 'wertabhängiges Zensieren');
  assert.equal(MISSINGNESS_CAPSULES.stretch.thema, 'zielabhängige Missingness');
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = MISSINGNESS_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genMissingnessCapsule(seed, capsule);
      assert.ok(missingnessCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, missingnessCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMissingnessFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMissingnessFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveMissingnessFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Szenario-Bank', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = MISSINGNESS_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMissingnessFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!missingnessCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMissingnessFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = MISSINGNESS_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genMissingnessCapsule(seed, capsule);
      assert.deepEqual(first, genMissingnessCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(missingnessCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(MISSINGNESS_CONTRACT.familyId, 'classify-missingness');
  assert.equal(MISSINGNESS_CONTRACT.authorityMode, 'seeded');
  assert.equal(MISSINGNESS_CONTRACT.activityType, 'single-choice');
  assert.equal(MISSINGNESS_CONTRACT.masteryEligible, false);
  assert.deepEqual(MISSINGNESS_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(MISSINGNESS_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateMissingnessFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveMissingnessFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateMissingnessFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateMissingnessFamily({ seed: 0, caseId: 'target-dependent-missingness', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateMissingnessFamily({ seed: 0, caseId: 'missingness-device-censoring', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateMissingnessFamily({ seed: 0, caseId: 'target-dependent-missingness', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-missingness', 11, 'intro', 'target-dependent-missingness');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});

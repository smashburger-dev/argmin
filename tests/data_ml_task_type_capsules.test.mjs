// Familie classify-task-type: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_task_type_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genTaskTypeCapsule,
  TASK_TYPE_CAPSULES,
  taskTypeCapsuleOk,
  taskTypeCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  TASK_TYPE_CONTRACT,
  generateTaskTypeFamily,
  solveTaskTypeFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Szenarien halten und die
// Schlüssel wörtlich treffen. Die drei Base-Fälle sind Anker (Werkzeugausfall,
// Hauspreis, Kundensegmente) und bleiben als Befund unangetastet; generiert
// wird die Varianten-Bank.
// Anker-Korrektur (Copy-Paste im Bestand): alle drei Base-Fälle trugen
// parameters {scenario: 'Ausfall ja/nein mit historischen Labels', target:
// 'Ausfall im nächsten Zyklus'} aus Fall 1, obwohl Fall 2 vom Hauspreis
// (stetige Regression) und Fall 3 von Kaufprofilen ohne Zielvariable
// (Clustering) handelt; die Anker sind auf
// {scenario: 'Hauspreis stetig mit Labels', target: 'Verkaufspreis'} bzw.
// {scenario: 'Kaufprofile ohne Zielvariable', target: null} angeglichen —
// gleicher Befund wie bei classify-confounding.
// Wörtlichkeit: Schlüsseltexte und Distraktoren sind szenariospezifisch und
// stehen wörtlich in der Bank (Vorbild classify-missingness).
const ORACLES = [
  {
    caseId: 'failure-next-cycle-supervised', key: 'intro', entries: [
      { parameters: { scenario: 'Kündigung ja/nein mit historischen Labels', target: 'Churn im nächsten Monat' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (kündigt / kündigt nicht), und es gibt gelabelte historische Beispiele.' },
      { parameters: { scenario: 'Spam ja/nein mit historischen Labels', target: 'Spam-Mail' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Spam / kein Spam), und es gibt gelabelte historische Beispiele.' },
      { parameters: { scenario: 'Kreditausfall ja/nein mit Labels', target: 'Ausfall in 12 Monaten' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (fällt aus / fällt nicht aus) mit historischen Labels.' },
      { parameters: { scenario: 'Befund positiv/negativ mit Labels', target: 'Krankheit vorhanden' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (befundpositiv / -negativ) mit gelabelten Fällen.' },
      { parameters: { scenario: 'Betrug ja/nein mit Labels', target: 'Betrugsfall' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Betrug / kein Betrug) mit historischen Labels.' },
      { parameters: { scenario: 'Bestehen ja/nein mit Labels', target: 'Prüfung bestanden' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (bestanden / nicht bestanden) mit historischen Labels.' },
      { parameters: { scenario: 'Klick ja/nein mit Labels', target: 'Anzeige geklickt' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Klick / kein Klick) mit historischen Labels.' },
      { parameters: { scenario: 'Garantieanspruch ja/nein mit Labels', target: 'Anspruch im ersten Jahr' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Anspruch / kein Anspruch) mit historischen Labels.' },
      { parameters: { scenario: 'Mail geöffnet ja/nein mit Labels', target: 'Öffnung innerhalb 24h' }, correctText: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (geöffnet / nicht geöffnet) mit historischen Labels.' },
    ],
  },
  {
    caseId: 'task-house-price', key: 'core', entries: [
      { parameters: { scenario: 'Temperatur stetig mit Labels', target: 'Tagestemperatur' }, correctText: 'Überwachte Regression, weil eine stetige Temperatur aus gelabelten Messungen gelernt wird.' },
      { parameters: { scenario: 'Nachfrage stetig mit Labels', target: 'Stückzahl' }, correctText: 'Überwachte Regression, weil eine stetige Stückzahl aus gelabelten Verkäufen gelernt wird.' },
      { parameters: { scenario: 'Blutdruck stetig mit Labels', target: 'systolischer Druck' }, correctText: 'Überwachte Regression, weil ein stetiger Druckwert aus gelabelten Messungen gelernt wird.' },
      { parameters: { scenario: 'Verspätung stetig mit Labels', target: 'Verspätung in Minuten' }, correctText: 'Überwachte Regression, weil Minuten als stetiges Ziel aus gelabelten Fahrten gelernt werden.' },
      { parameters: { scenario: 'Ertrag stetig mit Labels', target: 'Ertrag in Tonnen' }, correctText: 'Überwachte Regression, weil ein stetiger Ertrag aus gelabelten Feldern gelernt wird.' },
      { parameters: { scenario: 'Gehalt stetig mit Labels', target: 'Jahresgehalt' }, correctText: 'Überwachte Regression, weil ein stetiges Gehalt aus gelabelten Verträgen gelernt wird.' },
      { parameters: { scenario: 'Energie stetig mit Labels', target: 'kWh pro Tag' }, correctText: 'Überwachte Regression, weil ein stetiger Verbrauch aus gelabelten Tagen gelernt wird.' },
      { parameters: { scenario: 'Wartezeit stetig mit Labels', target: 'Minuten bis Bedienung' }, correctText: 'Überwachte Regression, weil eine stetige Wartezeit aus gelabelten Besuchen gelernt wird.' },
      { parameters: { scenario: 'Mietpreis stetig mit Labels', target: 'Kaltmiete' }, correctText: 'Überwachte Regression, weil ein stetiger Mietpreis aus gelabelten Angeboten gelernt wird.' },
    ],
  },
  {
    caseId: 'task-customer-segments', key: 'stretch', entries: [
      { parameters: { scenario: 'Genprofile ohne Zielvariable', target: null }, correctText: 'Unüberwachtes Clustering, weil Gruppen ohne Labels entdeckt werden.' },
      { parameters: { scenario: 'Dokumente ohne Thema-Labels', target: null }, correctText: 'Unüberwachtes Clustering, weil Themengruppen ohne Labels entdeckt werden.' },
      { parameters: { scenario: 'Sensorprofile ohne Störungslabel', target: null }, correctText: 'Unüberwachtes Clustering, weil Betriebsmuster ohne Labels gruppiert werden.' },
      { parameters: { scenario: 'Nutzungsprofile ohne Segmentlabel', target: null }, correctText: 'Unüberwachtes Clustering, weil Segmente ohne Labels entdeckt werden.' },
      { parameters: { scenario: 'Rezepturen ohne Qualitätsklasse', target: null }, correctText: 'Unüberwachtes Clustering, weil Mischungen ohne Labels gruppiert werden.' },
      { parameters: { scenario: 'Fahrprofile ohne Unfall-Label', target: null }, correctText: 'Unüberwachtes Clustering, weil Fahrstile ohne Labels entdeckt werden.' },
      { parameters: { scenario: 'Einkaufskörbe ohne Kategorienlabel', target: null }, correctText: 'Unüberwachtes Clustering, weil Warenkörbe ohne Labels gruppiert werden.' },
      { parameters: { scenario: 'Bildpatches ohne Klassenlabel', target: null }, correctText: 'Unüberwachtes Clustering, weil ähnliche Patches ohne Labels gruppiert werden.' },
      { parameters: { scenario: 'Support-Tickets ohne Typ-Label', target: null }, correctText: 'Unüberwachtes Clustering, weil Ticketgruppen ohne Labels entdeckt werden.' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'failure-next-cycle-supervised', core: 'task-house-price', stretch: 'task-customer-segments' };
const capsuleFor = (caseId) => TASK_TYPE_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle kuratierten Szenarien in der Bank, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(taskTypeCapsuleOk({ ...entry.parameters, caseId: oracle.caseId }, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(taskTypeCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-task-type.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  assert.deepEqual(byId.get('failure-next-cycle-supervised').parameters, { scenario: 'Ausfall ja/nein mit historischen Labels', target: 'Ausfall im nächsten Zyklus' });
  // Anker-Korrektur: Bestand trug die parameters von Fall 1 (Copy-Paste);
  // Prompt handelt vom stetigen Hauspreis bzw. von Kaufprofilen ohne Zielvariable.
  assert.deepEqual(byId.get('task-house-price').parameters, { scenario: 'Hauspreis stetig mit Labels', target: 'Verkaufspreis' });
  assert.deepEqual(byId.get('task-customer-segments').parameters, { scenario: 'Kaufprofile ohne Zielvariable', target: null });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('failure-next-cycle-supervised'),
    'Binäre Klassifikation: Das Ziel ist eine Kategorie (fällt aus / fällt nicht aus), und es gibt gelabelte historische Beispiele.',
  );
  assert.equal(
    correctOf('task-house-price'),
    'Überwachte Regression, weil ein stetiger Preis aus gelabelten Beispielen gelernt wird.',
  );
  assert.equal(
    correctOf('task-customer-segments'),
    'Unüberwachtes Clustering, weil Gruppen ohne Labels entdeckt werden.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, scenario-Slots', () => {
  assert.equal(TASK_TYPE_CAPSULES.intro.caseId, 'failure-next-cycle-supervised');
  assert.equal(TASK_TYPE_CAPSULES.core.caseId, 'task-house-price');
  assert.equal(TASK_TYPE_CAPSULES.stretch.caseId, 'task-customer-segments');
  for (const capsule of Object.values(TASK_TYPE_CAPSULES)) {
    assert.equal(capsule.bank.length, 14, `${capsule.caseId}: 14 Szenarien`);
    assert.equal(new Set(capsule.bank.map((item) => item.scenario)).size, 14, `${capsule.caseId}: Slotwerte eindeutig`);
  }
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = TASK_TYPE_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTaskTypeCapsule(seed, capsule);
      assert.ok(taskTypeCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, taskTypeCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateTaskTypeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateTaskTypeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveTaskTypeFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Szenario-Bank', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = TASK_TYPE_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateTaskTypeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!taskTypeCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateTaskTypeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = TASK_TYPE_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genTaskTypeCapsule(seed, capsule);
      assert.deepEqual(first, genTaskTypeCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(taskTypeCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(TASK_TYPE_CONTRACT.familyId, 'classify-task-type');
  assert.equal(TASK_TYPE_CONTRACT.authorityMode, 'seeded');
  assert.equal(TASK_TYPE_CONTRACT.activityType, 'single-choice');
  assert.equal(TASK_TYPE_CONTRACT.masteryEligible, false);
  assert.deepEqual(TASK_TYPE_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(TASK_TYPE_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateTaskTypeFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveTaskTypeFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateTaskTypeFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateTaskTypeFamily({ seed: 0, caseId: 'failure-next-cycle-supervised', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateTaskTypeFamily({ seed: 0, caseId: 'task-house-price', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateTaskTypeFamily({ seed: 0, caseId: 'failure-next-cycle-supervised', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-task-type', 11, 'intro', 'failure-next-cycle-supervised');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});

// Familie classify-confounding: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_confounding_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genConfoundingCapsule,
  CONFOUNDING_CAPSULES,
  confoundingCapsuleOk,
  confoundingCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  CONFOUNDING_CONTRACT,
  generateConfoundingFamily,
  solveConfoundingFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Szenarien halten und die
// Schlüssel wörtlich treffen. Die drei Base-Fälle sind Anker (Eis/Badeunfälle,
// Bewegung/Schlaf, Dezemberwerbung) und bleiben als Befund unangetastet;
// generiert wird die Varianten-Bank.
// Anker-Korrektur (Copy-Paste im Bestand): alle drei Base-Fälle trugen
// parameters {r: 0.9, confounder: 'Sommertemperatur'}, obwohl Fall 2 von
// Arbeitsstress und Fall 3 von der Saison handelt; die Anker sind auf
// {r: 0.9, confounder: 'Arbeitsstress'} bzw. {r: 0.9, confounder: 'Saison'}
// angeglichen. r bleibt 0.9 — die core/stretch-Prompts nennen keinen Wert
// (Konvention wie bei den Varianten: parameters führen r ohne Prompt-Nennung).
// Wörtlichkeit: Variante 'ländliche Siedlungsdichte' rendert im Schlüsseltext
// „ländliche Siedlung“, 'Sonnenscheindauer' rendert „Sonnenschein“ — die Bank
// trägt den Text wörtlich, nicht den Parameter-Namen.
const ORACLES = [
  {
    caseId: 'temperature-confounder', key: 'intro', entries: [
      { parameters: { r: 0.85, confounder: 'Regen' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Regen) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.88, confounder: 'Brandgröße' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Brandgröße) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.7, confounder: 'Alter' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Alter) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.75, confounder: 'Hitze' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Hitze) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.62, confounder: 'ländliche Siedlungsdichte' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. ländliche Siedlung) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.82, confounder: 'Sonnenscheindauer' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Sonnenschein) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.8, confounder: 'Außentemperatur' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Außentemperatur) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.78, confounder: 'Fallschwere' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Fallschwere) — Korrelation allein belegt keine Kausalität.' },
      { parameters: { r: 0.71, confounder: 'Wohlstand' }, correctText: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Wohlstand) — Korrelation allein belegt keine Kausalität.' },
    ],
  },
  {
    caseId: 'confounder-exercise-sleep', key: 'core', entries: [
      { parameters: { r: 0.64, confounder: 'Einkommen' }, correctText: 'Einkommen kann als Confounder Ernährung und Stimmung beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.58, confounder: 'sozioökonomischer Status' }, correctText: 'Sozioökonomischer Status kann Bildung und Gesundheit beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.55, confounder: 'elterliche Unterstützung' }, correctText: 'Elterliche Unterstützung kann Bildschirmzeit und Noten beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.6, confounder: 'Krankheitslast' }, correctText: 'Krankheitslast kann Medikamenteneinnahme und Symptome beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.52, confounder: 'Freizeitbudget' }, correctText: 'Freizeitbudget kann Vereinsmitgliedschaft und Wohlbefinden beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.67, confounder: 'Kaffeekonsum am Vortag' }, correctText: 'Ein gemeinsamer Faktor wie Kaffeekonsum kann Konzentration und Herzfrequenz beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.49, confounder: 'Wohnlage' }, correctText: 'Die Wohnlage kann Grünflächennutzung und Stress beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.57, confounder: 'Schichtdienst' }, correctText: 'Schichtdienst kann Kaffeekonsum und Schlafqualität beeinflussen; Korrelation beweist keine Kausalität.' },
      { parameters: { r: 0.61, confounder: 'Arbeitsstress' }, correctText: 'Arbeitsstress kann als Confounder Sport und Schlaf beeinflussen; Korrelation beweist keine Kausalität.' },
    ],
  },
  {
    caseId: 'confounder-ad-spend-season', key: 'stretch', entries: [
      { parameters: { r: 0.91, confounder: 'Sommersaison' }, correctText: 'Saison kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.' },
      { parameters: { r: 0.87, confounder: 'Erkältungssaison' }, correctText: 'Saison kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.' },
      { parameters: { r: 0.84, confounder: 'Schulstart' }, correctText: 'Der Schulstart kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.' },
      { parameters: { r: 0.89, confounder: 'Black Friday' }, correctText: 'Der Aktionstag kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.' },
      { parameters: { r: 0.77, confounder: 'Steuertermin' }, correctText: 'Der Steuertermin kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.' },
      { parameters: { r: 0.83, confounder: 'Grippewelle' }, correctText: 'Die Krankheitswelle kann beide Größen treiben; der Lieferdienst-Effekt muss unter ihrer Kontrolle geschätzt werden.' },
      { parameters: { r: 0.86, confounder: 'Tourismus-Hochsaison' }, correctText: 'Die touristische Hochsaison kann beide Größen treiben; der Werbeeffekt muss unter ihrer Kontrolle geschätzt werden.' },
      { parameters: { r: 0.8, confounder: 'Wahlkampfzeit' }, correctText: 'Die Wahlkampfzeit kann beide Größen treiben; der Anzeigeneffekt muss unter ihrer Kontrolle geschätzt werden.' },
      { parameters: { r: 0.9, confounder: 'Weihnachtsgeschäft' }, correctText: 'Das Weihnachtsgeschäft kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'temperature-confounder', core: 'confounder-exercise-sleep', stretch: 'confounder-ad-spend-season' };
const capsuleFor = (caseId) => CONFOUNDING_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle kuratierten Szenarien in der Bank, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(confoundingCapsuleOk({ ...entry.parameters, caseId: oracle.caseId }, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(confoundingCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-confounding.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  assert.deepEqual(byId.get('temperature-confounder').parameters, { r: 0.9, confounder: 'Sommertemperatur' });
  // Anker-Korrektur: Bestand trug confounder 'Sommertemperatur' (Copy-Paste
  // aus Fall 1); Prompt handelt von Arbeitsstress bzw. Saison.
  assert.deepEqual(byId.get('confounder-exercise-sleep').parameters, { r: 0.9, confounder: 'Arbeitsstress' });
  assert.deepEqual(byId.get('confounder-ad-spend-season').parameters, { r: 0.9, confounder: 'Saison' });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('temperature-confounder'),
    'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Sommertemperatur) — Korrelation allein belegt keine Kausalität.',
  );
  assert.equal(
    correctOf('confounder-exercise-sleep'),
    'Arbeitsstress kann als Confounder beide Größen beeinflussen; Korrelation beweist keine Kausalität.',
  );
  assert.equal(
    correctOf('confounder-ad-spend-season'),
    'Saison kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, confounder-Slots', () => {
  assert.equal(CONFOUNDING_CAPSULES.intro.caseId, 'temperature-confounder');
  assert.equal(CONFOUNDING_CAPSULES.core.caseId, 'confounder-exercise-sleep');
  assert.equal(CONFOUNDING_CAPSULES.stretch.caseId, 'confounder-ad-spend-season');
  for (const capsule of Object.values(CONFOUNDING_CAPSULES)) {
    assert.equal(capsule.bank.length, 14, `${capsule.caseId}: 14 Szenarien`);
    assert.equal(new Set(capsule.bank.map((item) => item[capsule.slot])).size, 14, `${capsule.caseId}: Slotwerte eindeutig`);
  }
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = CONFOUNDING_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genConfoundingCapsule(seed, capsule);
      assert.ok(confoundingCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, confoundingCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateConfoundingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateConfoundingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveConfoundingFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Szenario-Bank', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = CONFOUNDING_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateConfoundingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!confoundingCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateConfoundingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = CONFOUNDING_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genConfoundingCapsule(seed, capsule);
      assert.deepEqual(first, genConfoundingCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(confoundingCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(CONFOUNDING_CONTRACT.familyId, 'classify-confounding');
  assert.equal(CONFOUNDING_CONTRACT.authorityMode, 'seeded');
  assert.equal(CONFOUNDING_CONTRACT.activityType, 'single-choice');
  assert.equal(CONFOUNDING_CONTRACT.masteryEligible, false);
  assert.deepEqual(CONFOUNDING_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(CONFOUNDING_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateConfoundingFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveConfoundingFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateConfoundingFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateConfoundingFamily({ seed: 0, caseId: 'temperature-confounder', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateConfoundingFamily({ seed: 0, caseId: 'confounder-exercise-sleep', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateConfoundingFamily({ seed: 0, caseId: 'temperature-confounder', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-confounding', 11, 'intro', 'temperature-confounder');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});

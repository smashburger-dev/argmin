// Familie classify-confounding: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_confounding_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFOUNDING_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  CONFOUNDING_CONTRACT,
  genConfoundingCapsule,
  confoundingCapsuleOk,
  confoundingCorrectText,
  generateConfoundingFamily,
  solveConfoundingFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  CONFOUNDING_CAPSULES,
  confoundingCapsuleOk,
  confoundingCorrectText,
  genConfoundingCapsule,
  CONFOUNDING_CONTRACT,
  generateConfoundingFamily,
  solveConfoundingFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-confounding'),
};

choiceCapsuleSuite('classify-confounding', mod, [
  { caseId: 'temperature-confounder', difficulty: 'intro' },
  { caseId: 'confounder-exercise-sleep', difficulty: 'core' },
  { caseId: 'confounder-ad-spend-season', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

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
// „ländliche Siedlung", 'Sonnenscheindauer' rendert „Sonnenschein" — die Bank
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

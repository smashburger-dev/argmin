// Familie classify-missingness: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_missingness_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MISSINGNESS_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  MISSINGNESS_CONTRACT,
  genMissingnessCapsule,
  missingnessCapsuleOk,
  missingnessCorrectText,
  generateMissingnessFamily,
  solveMissingnessFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  MISSINGNESS_CAPSULES,
  missingnessCapsuleOk,
  missingnessCorrectText,
  genMissingnessCapsule,
  MISSINGNESS_CONTRACT,
  generateMissingnessFamily,
  solveMissingnessFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-missingness'),
};

choiceCapsuleSuite('classify-missingness', mod, [
  { caseId: 'target-dependent-missingness', difficulty: 'intro' },
  { caseId: 'missingness-device-censoring', difficulty: 'core' },
  { caseId: 'missingness-income-survey', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Szenarien halten und die
// Schlüssel wörtlich treffen. Die drei Base-Fälle sind Anker (Umsatz-Löschen,
// Geräte-Zensur, Einkommensumfrage) und bleiben als Befund unangetastet;
// generiert wird die Varianten-Bank.
// Anker-Korrektur (Copy-Paste-Fehler im Bestand): der Base-Fall
// missingness-device-censoring trug das thema „zielabhängige Missingness"
// (Copy-Paste aus Fall 1), obwohl sein Prompt vom gerätebedingten Zensieren
// handelt; der Anker ist auf „wertabhängiges Zensieren" angleicht.
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

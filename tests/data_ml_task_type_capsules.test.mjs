// Familie classify-task-type: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_task_type_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TASK_TYPE_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  TASK_TYPE_CONTRACT,
  genTaskTypeCapsule,
  taskTypeCapsuleOk,
  taskTypeCorrectText,
  generateTaskTypeFamily,
  solveTaskTypeFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  TASK_TYPE_CAPSULES,
  taskTypeCapsuleOk,
  taskTypeCorrectText,
  genTaskTypeCapsule,
  TASK_TYPE_CONTRACT,
  generateTaskTypeFamily,
  solveTaskTypeFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-task-type'),
};

choiceCapsuleSuite('classify-task-type', mod, [
  { caseId: 'failure-next-cycle-supervised', difficulty: 'intro' },
  { caseId: 'task-house-price', difficulty: 'core' },
  { caseId: 'task-customer-segments', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

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

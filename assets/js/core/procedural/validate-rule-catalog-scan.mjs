// Procedural family validate-rule-catalog-scan: four pyodide cases. The base
// test blocks stay verbatim as anchors; the seed appends a "# seeded extra
// cases" block that probes the student implementation against a renamed
// reference copy on drawn inputs.
//   - card-secret-scan (stretch): card dicts with/without secret patterns,
//     plus consistency card/protocol draws.
//   - cross-card-consistency (challenge): three cards + protocol with a
//     seeded subset of the six inconsistency rules triggered.
//   - freeze-checker (core): file/pin maps with missing and tampered entries
//     (pins computed via the base block's PIN helper).
//   - pin-version-check (stretch): spec dicts mixing exact and ranged pins.

import { refCopy, pyLit as py } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/validate-rule-catalog-scan.json' with { type: 'json' };

// Python literal serializer (pools stay quote- and backslash-free).

// --- card-secret-scan ----------------------------------------------------------

const SECRET_FIELD_POOL = ['zweck', 'notiz', 'kontakt', 'quelle', 'wartung'];
const SECRET_STRINGS = [
  'nutzt api-schluessel: sk-beispiel12345678',
  'token ghp-abcdef1234567890 hinterlegt',
  'bearer abcdefghijklmnopqrst',
  'api-key: live-9876543210ab',
  'xoxb-token: xoxb-abcdefgh1234',
];
const CLEAN_STRINGS = [
  'antworten fuer support',
  'team-support',
  'faq-export 2026',
  'quartalsbericht',
  'manual review pflicht',
];

function drawCardScan(r) {
  const secretCount = randInt(r, 0, 2);
  const fields = shuffle(r, [...SECRET_FIELD_POOL]).slice(0, 3 + secretCount);
  const card = {};
  for (const feld of fields.slice(0, 3)) card[feld] = pick(r, CLEAN_STRINGS);
  for (const feld of fields.slice(3)) card[feld] = pick(r, SECRET_STRINGS);
  const cardConsistent = r() < 0.5;
  const proto = { datensatz: pick(r, ['faq-korpus', 'archiv-2025', 'ticket-log']), metrik: pick(r, ['recall@5', 'f1', 'precision@3']), n_beispiele: randInt(r, 500, 2000) };
  const cardC = cardConsistent
    ? { name: proto.datensatz, metrik: proto.metrik, n_beispiele: proto.n_beispiele }
    : { name: proto.datensatz, metrik: pick(r, ['recall@5', 'f1', 'precision@3'].filter((m) => m !== proto.metrik)), n_beispiele: proto.n_beispiele + randInt(r, 10, 500) };
  return { card, cardC, proto };
}

// --- cross-card-consistency -----------------------------------------------------

function drawCrossCard(r) {
  const ds = pick(r, ['faq-korpus', 'archiv-2025', 'ticket-log']);
  const metrik = pick(r, ['recall@5', 'f1', 'precision@3']);
  const modell = pick(r, ['rag-stub', 'antwort-modell', 'suche-lite']);
  const nB = randInt(r, 500, 2000);
  const schwelle = pick(r, [0.5, 0.6, 0.75, 0.8]);
  const other = (list, v) => pick(r, list.filter((x) => x !== v));
  const flip = (prob) => r() < prob;
  const datacard = {
    name: flip(0.3) ? other(['faq-korpus', 'archiv-2025', 'ticket-log'], ds) : ds,
    zweck: 'support-antworten', herkunft: 'forum-export', lizenz: 'cc-by-vier',
    n_beispiele: nB,
    bekannte_luecken: flip(0.25) ? '' : 'injektions-fixture enthalten',
    metrik: flip(0.3) ? other(['recall@5', 'f1', 'precision@3'], metrik) : metrik,
  };
  const modelcard = {
    name: flip(0.3) ? other(['rag-stub', 'antwort-modell', 'suche-lite'], modell) : modell,
    zweck: 'antwortvorschlag', version: '1.2.0',
    trainingsdaten: ds,
    metrik: flip(0.25) ? other(['recall@5', 'f1', 'precision@3'], metrik) : metrik,
    schwellenwert: schwelle,
    bekannte_grenzen: 'kein echtes sprachmodell',
  };
  const systemcard = {
    modell, metrik, schwelle: flip(0.3) ? other([0.5, 0.6, 0.75, 0.8], schwelle) : schwelle,
    kontrolle: flip(0.2) ? '' : 'zweipersonen-review',
  };
  const protocol = { datensatz: ds, metrik, n_beispiele: flip(0.25) ? nB + randInt(r, 10, 400) : nB };
  return { datacard, modelcard, systemcard, protocol };
}

// --- freeze-checker --------------------------------------------------------------

const FILE_POOL = ['golden_set.json', 'config.json', 'pipeline.py', 'schema.json', 'locks.txt', 'eval.csv'];
const CONTENT_POOL = ['inhalte-stabil', 'config-stabil', 'x = 1', 'schema-v2', 'lock: numpy==1.26', 'metrik, wert'];

function drawFreeze(r) {
  const names = shuffle(r, [...FILE_POOL]).slice(0, randInt(r, 3, 5));
  const contents = names.map(() => pick(r, CONTENT_POOL));
  const dateien = Object.fromEntries(names.map((n, i) => [n, contents[i]]));
  // pins: one correct, one tampered, one missing, one None — indices drawn.
  const idx = shuffle(r, [0, 1, 2, 3].filter((i) => i < names.length));
  const tampered = names[idx[0] % names.length];
  const missing = pick(r, FILE_POOL.filter((n) => !names.includes(n)));
  return { dateien, tampered, missing };
}

// --- pin-version-check -----------------------------------------------------------

const PKG_POOL = ['pytest', 'numpy', 'pandas', 'scipy', 'ruff', 'mypy', 'torch', 'sympy'];
const RANGE_MARKS = ['>=', '<=', '~=', '*'];

function drawPinVersions(r) {
  const count = randInt(r, 3, 5);
  const names = shuffle(r, [...PKG_POOL]).slice(0, count);
  const spezis = {};
  for (const name of names) {
    spezis[name] = r() < 0.45
      ? `${pick(r, RANGE_MARKS)}${randInt(r, 1, 9)}${r() < 0.5 ? `.${randInt(r, 0, 9)}` : ''}`
      : `${randInt(r, 1, 9)}.${randInt(r, 0, 9)}`;
  }
  return { spezis };
}

// --- seeded test emission ----------------------------------------------------------

function seededChecksFor(caseId, entry, index) {
  if (caseId === 'card-secret-scan') {
    return [
      `__cc${index} = ${py(entry.card)}`,
      `__check('seeded scan ${index}', scan_secrets(__cc${index}) == __ref_scan_secrets(__cc${index}))`,
      `__cp${index} = ${py(entry.cardC)}`,
      `__pp${index} = ${py(entry.proto)}`,
      `__check('seeded consistency ${index}', check_consistency(__cp${index}, __pp${index}) == __ref_check_consistency(__cp${index}, __pp${index}))`,
    ].join('\n');
  }
  if (caseId === 'cross-card-consistency') {
    return [
      `__dc${index} = ${py(entry.datacard)}`,
      `__mc${index} = ${py(entry.modelcard)}`,
      `__sc${index} = ${py(entry.systemcard)}`,
      `__pr${index} = ${py(entry.protocol)}`,
      `__check('seeded cross-card ${index}', cross_card_consistency(__dc${index}, __mc${index}, __sc${index}, __pr${index}) == __ref_cross_card_consistency(__dc${index}, __mc${index}, __sc${index}, __pr${index}))`,
    ].join('\n');
  }
  if (caseId === 'freeze-checker') {
    return [
      `__fd${index} = ${py(entry.dateien)}`,
      `__fp${index} = {name: PIN(content) for name, content in __fd${index}.items()}`,
      `__fp${index}[${py(entry.tampered)}] = PIN("manipuliert")`,
      `__fp${index}[${py(entry.missing)}] = PIN("fehlt")`,
      `__check('seeded pins ${index}', pruefe_pins(__fd${index}, __fp${index}) == __ref_pruefe_pins(__fd${index}, __fp${index}))`,
    ].join('\n');
  }
  return [
    `__pv${index} = ${py(entry.spezis)}`,
    `__check('seeded versionen ${index}', pruefe_pins_versionen(__pv${index}) == __ref_pruefe_pins_versionen(__pv${index}))`,
  ].join('\n');
}

function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => seededChecksFor(caseDef.caseId, entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

// --- case definitions -------------------------------------------------------------
// starterCode/baseTests/referenceSolver/prompt/fullSolution injected verbatim
// from content/families/validate-rule-catalog-scan.json below.

export const CATALOG_CASES = {
  'card-secret-scan': {
    caseId: 'card-secret-scan',
    difficulty: 'stretch',
    competencyIds: ['c-research-cards', 'c-genai-security'],
    refNames: ['scan_secrets', 'check_consistency'],
    extraCount: 3,
    draw: drawCardScan,
  },
  'cross-card-consistency': {
    caseId: 'cross-card-consistency',
    difficulty: 'challenge',
    competencyIds: ['c-research-cards', 'c-genai-security'],
    refNames: ['cross_card_consistency'],
    extraCount: 3,
    draw: drawCrossCard,
  },
  'freeze-checker': {
    caseId: 'freeze-checker',
    difficulty: 'core',
    competencyIds: ['c-capstone-pipeline', 'c-python-functions'],
    refNames: ['pruefe_pins'],
    extraCount: 3,
    draw: drawFreeze,
  },
  'pin-version-check': {
    caseId: 'pin-version-check',
    difficulty: 'stretch',
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    refNames: ['pruefe_pins_versionen'],
    extraCount: 3,
    draw: drawPinVersions,
  },
};

export const CATALOG_CONTRACT = {
  familyId: 'validate-rule-catalog-scan',
  familyGroup: 'validate-contract',
  summary: 'Implementiert Regel-Scanner über Karten, Pins und Kataloge mit deterministischen Befund-Listen.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'card-secret-scan', propertyTest: false },
    { caseId: 'cross-card-consistency', propertyTest: false },
    { caseId: 'freeze-checker', propertyTest: false },
    { caseId: 'pin-version-check', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch', 'challenge'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-security', 'c-ml-repro', 'c-python-functions', 'c-research-cards'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: CATALOG_CONTRACT,
  cases: CATALOG_CASES,
  shapeError: 'validate-rule-catalog-scan: Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => seededBlock(caseDef, seedCases),
});


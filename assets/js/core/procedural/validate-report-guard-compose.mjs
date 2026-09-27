// Procedural family validate-report-guard-compose: two pyodide cases at
// challenge. The base test blocks stay verbatim; the seed appends a
// "# seeded extra cases" block probing the student implementation against a
// renamed reference copy on drawn inputs.
//   - report-guard-compose: composed subgroup/sweep/cost/risk dicts plus a
//     drawn ValueError arm (one of the four guard conditions broken).
//   - baseline-report: metric/values/error-list draws plus a verweigert path
//     (a required guard input deliberately missing).

import { refCopy, pyLit as py } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/validate-report-guard-compose.json' with { type: 'json' };

const RISK_POOL = [
  'regel-detektor erkennt nur bekannte muster',
  'kein echtes llm',
  'faelle ohne beleg laufen durch',
  'antwortzeit steigt unter last',
  'gold-set aelter als datenstand',
  'keine human-fallback-route',
];

// --- report-guard-compose --------------------------------------------------------

function drawReportCase(r) {
  const subgroups = {
    fpr_diff: randInt(r, 1, 30) / 100,
    selrate_diff: randInt(r, 1, 20) / 100,
  };
  const sweep = {
    schwelle: randInt(r, 50, 90) / 100,
    f1: randInt(r, 60, 95) / 100,
    paritaet_ok: true,
  };
  const input = randInt(r, 2, 20) / 100;
  const output = randInt(r, 2, 20) / 100;
  const kosten = { input_eur: input, output_eur: output, gesamt_eur: Math.round((input + output) * 100) / 100 };
  const restrisiken = shuffle(r, [...RISK_POOL]).slice(0, randInt(r, 1, 3));
  // which guard arm to break: 0 subgroups, 1 sweep, 2 kosten, 3 restrisiken
  const broken = randInt(r, 0, 3);
  return { subgroups, sweep, kosten, restrisiken, broken };
}

// --- baseline-report --------------------------------------------------------------

const METRIK_POOL = ['recall@5', 'f1', 'precision@3', 'hit@1'];
const ID_POOL = ['faq', 'vertrag', 'ticket', 'agb'];

function drawBaselineCase(r) {
  const werte = {
    recall_at_k: randInt(r, 50, 95) / 100,
    antwort_naiv: randInt(r, 40, 80) / 100,
    antwort_getrennt: randInt(r, 50, 95) / 100,
  };
  const ergebnis = { werte };
  const protocol = { metrik: pick(r, METRIK_POOL), datum_prereg: '2026-05-12' };
  const karten = { datacard: { name: pick(r, ['faq-korpus', 'archiv-2025']) }, modelcard: { name: pick(r, ['rag-stub', 'antwort-modell']) } };
  const nRetrieval = randInt(r, 0, 3);
  const nAntwort = randInt(r, 0, 3);
  const fehlerliste = [
    ...Array.from({ length: nRetrieval }, (_, i) => ({ id: `${pick(r, ID_POOL)}-${randInt(r, 1, 99)}`, art: 'retrieval' })),
    ...Array.from({ length: nAntwort }, (_, i) => ({ id: `${pick(r, ID_POOL)}-${randInt(r, 1, 99)}`, art: 'antwort' })),
  ];
  // guard: at least one error entry so the ok-path is exercised like base
  if (!fehlerliste.length) fehlerliste.push({ id: 'faq-01', art: 'antwort' });
  // which verweigert arm: 0 protocol-metrik, 1 karten, 2 fehlerliste, 3 digest
  const brokenArm = randInt(r, 0, 3);
  return { ergebnis, protocol, karten, fehlerliste, brokenArm };
}

// --- seeded test emission -----------------------------------------------------------

function reportChecks(entry, index) {
  const arglists = [
    `[{}, ${py(entry.sweep)}, ${py(entry.kosten)}, ${py(entry.restrisiken)}]`,
    `[${py(entry.subgroups)}, {"schwelle": 0.6, "f1": 0.7}, ${py(entry.kosten)}, ${py(entry.restrisiken)}]`,
    `[${py(entry.subgroups)}, ${py(entry.sweep)}, {"input_eur": 0.05}, ${py(entry.restrisiken)}]`,
    `[${py(entry.subgroups)}, ${py(entry.sweep)}, ${py(entry.kosten)}, []]`,
  ];
  const labels = ['subgruppen fehlen', 'paritaet nicht geprueft', 'kosten fehlen', 'restrisiko fehlt'];
  return [
    `__sg${index} = ${py(entry.subgroups)}`,
    `__sw${index} = ${py(entry.sweep)}`,
    `__ko${index} = ${py(entry.kosten)}`,
    `__rk${index} = ${py(entry.restrisiken)}`,
    `__check('seeded report ${index}', responsible_report(__sg${index}, __sw${index}, __ko${index}, __rk${index}) == __ref_responsible_report(__sg${index}, __sw${index}, __ko${index}, __rk${index}))`,
    'try:',
    `    responsible_report(*${arglists[entry.broken]})`,
    `    __check('seeded report-guard ${index}', False, 'kein ValueError (${labels[entry.broken]})')`,
    'except ValueError:',
    `    __check('seeded report-guard ${index}', True)`,
    'except Exception as exc:',
    `    __check('seeded report-guard ${index}', False, type(exc).__name__)`,
  ].join('\n');
}

function baselineChecks(entry, index) {
  const protoBroken = { ...entry.protocol };
  delete protoBroken.metrik;
  const kartenBroken = { datacard: entry.karten.datacard };
  const fehlerBroken = [{ id: 'x-1', art: 'sonstiges' }];
  const args = [
    `[__eg${index}, ${py(protoBroken)}, ${py(entry.karten)}, ${py(entry.fehlerliste)}]`,
    `[__eg${index}, ${py(entry.protocol)}, ${py(kartenBroken)}, ${py(entry.fehlerliste)}]`,
    `[__eg${index}, ${py(entry.protocol)}, ${py(entry.karten)}, ${py(fehlerBroken)}]`,
    `[__bdeg${index}, ${py(entry.protocol)}, ${py(entry.karten)}, ${py(entry.fehlerliste)}]`,
  ];
  return [
    `__eg${index} = ${py(entry.ergebnis)}`,
    `__eg${index}["digest"] = hashlib.sha256(json.dumps(__eg${index}["werte"], sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()`,
    `__bdeg${index} = dict(__eg${index})`,
    `__bdeg${index}["digest"] = "0" * 64`,
    `__pt${index} = ${py(entry.protocol)}`,
    `__kt${index} = ${py(entry.karten)}`,
    `__fl${index} = ${py(entry.fehlerliste)}`,
    `__check('seeded baseline ${index}', baseline_report(__eg${index}, __pt${index}, __kt${index}, __fl${index}) == __ref_baseline_report(__eg${index}, __pt${index}, __kt${index}, __fl${index}))`,
    `__bv${index} = baseline_report(*${args[entry.brokenArm]})`,
    `__check('seeded baseline-verweigert ${index}', __bv${index}['status'] == 'verweigert')`,
  ].join('\n');
}

const EMITTERS = {
  'report-guard-compose': reportChecks,
  'baseline-report': baselineChecks,
};

function seededBlock(caseDef, seedCases) {
  const emit = EMITTERS[caseDef.caseId];
  const checks = seedCases.map((entry, i) => emit(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

// --- case definitions --------------------------------------------------------------
// starterCode/baseTests/referenceSolver/prompt/fullSolution injected verbatim
// from content/families/validate-report-guard-compose.json below.

export const GUARD_CASES = {
  'report-guard-compose': {
    caseId: 'report-guard-compose',
    difficulty: 'challenge',
    competencyIds: ['c-research-responsible', 'c-genai-eval'],
    refNames: ['responsible_report'],
    extraCount: 3,
    draw: drawReportCase,
  },
  'baseline-report': {
    caseId: 'baseline-report',
    difficulty: 'challenge',
    competencyIds: ['c-research-capstone', 'c-genai-eval'],
    refNames: ['baseline_report'],
    extraCount: 3,
    draw: drawBaselineCase,
  },
};

export const GUARD_CONTRACT = {
  familyId: 'validate-report-guard-compose',
  familyGroup: 'validate-contract',
  summary: 'Komponiert Berichts-Guards: Eingabeprüfung mit ValueError, verweigerte Berichte bei fehlenden Pflichtteilen.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'report-guard-compose', propertyTest: false },
    { caseId: 'baseline-report', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-eval', 'c-ml-repro', 'c-research-capstone', 'c-research-responsible'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: GUARD_CONTRACT,
  cases: GUARD_CASES,
  shapeError: 'validate-report-guard-compose: Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => seededBlock(caseDef, seedCases),
});


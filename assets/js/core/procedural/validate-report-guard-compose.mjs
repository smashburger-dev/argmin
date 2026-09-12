// Procedural family validate-report-guard-compose: two pyodide cases at
// challenge. The base test blocks stay verbatim; the seed appends a
// "# seeded extra cases" block probing the student implementation against a
// renamed reference copy on drawn inputs.
//   - report-guard-compose: composed subgroup/sweep/cost/risk dicts plus a
//     drawn ValueError arm (one of the four guard conditions broken).
//   - baseline-report: metric/values/error-list draws plus a verweigert path
//     (a required guard input deliberately missing).

import { refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';


const py = (value) => {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (value === null) return 'None';
  if (Array.isArray(value)) return `[${value.map(py).join(', ')}]`;
  return `{${Object.entries(value).map(([key, v]) => `${py(key)}: ${py(v)}`).join(', ')}}`;
};

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
    packages: [],
    starterCode: "def responsible_report(subgroups, sweep, kosten, restrisiken):\n    \"\"'Bericht nur mit Subgruppen, Paritaet, Kosten und Restrisiko; sonst ValueError.'\"\"\"\n    ...\n\n",
    baseTests: "SUB = {\"fpr_diff\": 0.15, \"selrate_diff\": 0.05}\nSWP = {\"schwelle\": 0.6, \"f1\": 0.78, \"paritaet_ok\": True}\nKST = {\"input_eur\": 0.06, \"output_eur\": 0.06, \"gesamt_eur\": 0.12}\nr = responsible_report(SUB, SWP, KST, [\"regel-detektor erkennt nur bekannte muster\", \"kein echtes llm\"])\n__check('bericht mit allen teilen', r == {\"fpr_diff\": 0.15, \"selrate_diff\": 0.05, \"schwelle\": 0.6, \"f1\": 0.78, \"kosten_gesamt_eur\": 0.12, \"restrisiko\": [\"kein echtes llm\", \"regel-detektor erkennt nur bekannte muster\"]})\nfor args, meldung in (\n    (({}, SWP, KST, [\"x\"]), \"subgruppen fehlen\"),\n    ((SUB, {\"schwelle\": 0.6, \"f1\": 0.78}, KST, [\"x\"]), \"paritaet nicht geprueft\"),\n    ((SUB, SWP, {\"input_eur\": 0.06}, [\"x\"]), \"kosten fehlen\"),\n    ((SUB, SWP, KST, []), \"restrisiko fehlt\"),\n):\n    try:\n        responsible_report(*args)\n        __check('verweigert: ' + meldung, False, 'kein ValueError')\n    except ValueError as exc:\n        __check('verweigert: ' + meldung, str(exc) == meldung)\ntry:\n    responsible_report(SUB, {\"schwelle\": 0.6, \"f1\": 0.78, \"paritaet_ok\": False}, KST, [\"x\"])\n    print(\"paritaet-false nicht verworfen\")\nexcept ValueError as exc:\n    __check('paritaet false -> ValueError', str(exc) == \"paritaet nicht geprueft\")\nprint(\"ok w33-e6\")",
    referenceSolver: "def responsible_report(subgroups, sweep, kosten, restrisiken):\n    if not isinstance(subgroups, dict) or \"fpr_diff\" not in subgroups or \"selrate_diff\" not in subgroups:\n        raise ValueError(\"subgruppen fehlen\")\n    if not isinstance(sweep, dict) or sweep.get(\"paritaet_ok\") is not True or \"schwelle\" not in sweep or \"f1\" not in sweep:\n        raise ValueError(\"paritaet nicht geprueft\")\n    if not isinstance(kosten, dict) or \"gesamt_eur\" not in kosten:\n        raise ValueError(\"kosten fehlen\")\n    if not isinstance(restrisiken, list) or len(restrisiken) == 0:\n        raise ValueError(\"restrisiko fehlt\")\n    return {\n        \"fpr_diff\": subgroups[\"fpr_diff\"],\n        \"selrate_diff\": subgroups[\"selrate_diff\"],\n        \"schwelle\": sweep[\"schwelle\"],\n        \"f1\": sweep[\"f1\"],\n        \"kosten_gesamt_eur\": kosten[\"gesamt_eur\"],\n        \"restrisiko\": sorted(restrisiken),\n    }",
    refNames: ['responsible_report'],
    prompt: "Final Boss Responsible-Report: Implementiere <code>responsible_report(subgroups, sweep, kosten, restrisiken)</code>. Der Bericht entsteht nur vollständig: Fehlt eine Vorbedingung, wird <code>ValueError</code> mit fester Meldung geworfen — <code>\"subgruppen fehlen\"</code> (subgroups ist kein Dict oder ohne fpr_diff/selrate_diff), <code>\"paritaet nicht geprueft\"</code> (sweep ist kein Dict oder ohne paritaet_ok True samt schwelle und f1), <code>\"kosten fehlen\"</code> (kosten ist kein Dict oder ohne gesamt_eur), <code>\"restrisiko fehlt\"</code> (restrisiken ist keine nichtleere Liste). Sonst Rückgabe <code>{\"fpr_diff\": .., \"selrate_diff\": .., \"schwelle\": .., \"f1\": .., \"kosten_gesamt_eur\": .., \"restrisiko\": sortierte kopie}</code>. Das Risikoregister selbst (RPN-Priorisierung) bleibt menschliche Arbeitsevidenz und ist bewusst kein Teil dieser Mastery-Aufgabe — nur der Restrisiko-Eintrag fließt hier ein.",
    fullSolution: "def responsible_report(subgroups, sweep, kosten, restrisiken):\n    if not isinstance(subgroups, dict) or \"fpr_diff\" not in subgroups or \"selrate_diff\" not in subgroups:\n        raise ValueError(\"subgruppen fehlen\")\n    if not isinstance(sweep, dict) or sweep.get(\"paritaet_ok\") is not True or \"schwelle\" not in sweep or \"f1\" not in sweep:\n        raise ValueError(\"paritaet nicht geprueft\")\n    if not isinstance(kosten, dict) or \"gesamt_eur\" not in kosten:\n        raise ValueError(\"kosten fehlen\")\n    if not isinstance(restrisiken, list) or len(restrisiken) == 0:\n        raise ValueError(\"restrisiko fehlt\")\n    return {\n        \"fpr_diff\": subgroups[\"fpr_diff\"],\n        \"selrate_diff\": subgroups[\"selrate_diff\"],\n        \"schwelle\": sweep[\"schwelle\"],\n        \"f1\": sweep[\"f1\"],\n        \"kosten_gesamt_eur\": kosten[\"gesamt_eur\"],\n        \"restrisiko\": sorted(restrisiken),\n    }\n\n# vollstaendiger Bericht -> exaktes Dict; jede fehlende Vorbedingung -> ValueError mit fester Meldung (lokal python3-verifiziert)",
    extraCount: 3,
    draw: drawReportCase,
  },
  'baseline-report': {
    caseId: 'baseline-report',
    difficulty: 'challenge',
    competencyIds: ['c-research-capstone', 'c-genai-eval'],
    packages: [],
    starterCode: "import hashlib\nimport json\n\ndef baseline_report(ergebnis, protocol, karten, fehlerliste):\n    \"\"\"Messwerte nur mit Protokoll-Metrik, Karten, getrennter Fehlerliste und passendem sha256-Digest; sonst Verweigerung ohne Werte.\"\"\"\n    ...\n\n",
    baseTests: "ERGEBNIS = {\"werte\": {\"recall_at_k\": 0.8, \"antwort_naiv\": 0.6, \"antwort_getrennt\": 0.75}, \"digest\": \"728a5e258971cd2fb9f7456d88cef6f8559ae1c6fbdd1b0c6ba8ff26fb1ad0a7\"}\nPROTO = {\"metrik\": \"recall@5\", \"datum_prereg\": \"2026-05-12\"}\nKARTEN = {\"datacard\": {\"name\": \"faq-korpus\"}, \"modelcard\": {\"name\": \"rag-stub\"}}\nFEHLER = [\n    {\"id\": \"faq-11\", \"art\": \"antwort\"},\n    {\"id\": \"vertrag-07\", \"art\": \"retrieval\"},\n    {\"id\": \"faq-03\", \"art\": \"antwort\"},\n]\nr = baseline_report(ERGEBNIS, PROTO, KARTEN, FEHLER)\n__check('bericht ok', r == {\"status\": \"ok\", \"metrik\": \"recall@5\", \"messwerte\": {\"recall_at_k\": 0.8, \"antwort_naiv\": 0.6, \"antwort_getrennt\": 0.75}, \"digest\": \"728a5e258971cd2fb9f7456d88cef6f8559ae1c6fbdd1b0c6ba8ff26fb1ad0a7\", \"fehler_nach_art\": {\"retrieval\": 1, \"antwort\": 2}})\n__check('falscher digest verweigert', baseline_report({\"werte\": ERGEBNIS[\"werte\"], \"digest\": \"0\" * 64}, PROTO, KARTEN, FEHLER) == {\"status\": \"verweigert\", \"fehlt\": [\"digest\"]})\n__check('fehlender digest verweigert', baseline_report({\"werte\": ERGEBNIS[\"werte\"]}, PROTO, KARTEN, FEHLER) == {\"status\": \"verweigert\", \"fehlt\": [\"digest\"]})\nv = baseline_report(ERGEBNIS, {\"datum_prereg\": \"2026-05-12\"}, KARTEN, FEHLER)\n__check('bericht ohne protokoll verweigert', v == {\"status\": \"verweigert\", \"fehlt\": [\"protokoll-metrik\"]})\n__check('verweigert hat keine messwerte', \"messwerte\" not in v)\n__check('ohne modelcard', baseline_report(ERGEBNIS, PROTO, {\"datacard\": {\"name\": \"faq-korpus\"}}, FEHLER) == {\"status\": \"verweigert\", \"fehlt\": [\"karten\"]})\n__check('ohne fehlerliste', baseline_report(ERGEBNIS, PROTO, KARTEN, []) == {\"status\": \"verweigert\", \"fehlt\": [\"fehlerliste\"]})\n__check('ungetrennte fehlerliste zaehlt nicht', baseline_report(ERGEBNIS, PROTO, KARTEN, [{\"id\": \"faq-11\", \"art\": \"unbekannt\"}]) == {\"status\": \"verweigert\", \"fehlt\": [\"fehlerliste\"]})\nv2 = baseline_report(ERGEBNIS, {}, {}, [])\n__check('alles fehlt sortiert', v2 == {\"status\": \"verweigert\", \"fehlt\": [\"fehlerliste\", \"karten\", \"protokoll-metrik\"]})\n__check('alles inkl digest sortiert', baseline_report({\"werte\": ERGEBNIS[\"werte\"]}, {}, {}, []) == {\"status\": \"verweigert\", \"fehlt\": [\"digest\", \"fehlerliste\", \"karten\", \"protokoll-metrik\"]})\n__check('leere metrik verweigert', baseline_report(ERGEBNIS, {\"metrik\": \"\"}, KARTEN, FEHLER)[\"status\"] == \"verweigert\")\nprint(\"ok w34-e6\")",
    referenceSolver: "import hashlib\nimport json\n\ndef baseline_report(ergebnis, protocol, karten, fehlerliste):\n    fehlt = []\n    werte = ergebnis.get(\"werte\") if isinstance(ergebnis, dict) else None\n    digest_ok = isinstance(ergebnis, dict) and ergebnis.get(\"digest\") == hashlib.sha256(json.dumps(werte, sort_keys=True, separators=(\",\", \":\")).encode(\"utf-8\")).hexdigest()\n    if not digest_ok:\n        fehlt.append(\"digest\")\n    if not (isinstance(protocol, dict) and protocol.get(\"metrik\")):\n        fehlt.append(\"protokoll-metrik\")\n    if not (isinstance(karten, dict) and karten.get(\"datacard\") and karten.get(\"modelcard\")):\n        fehlt.append(\"karten\")\n    if not (isinstance(fehlerliste, list) and any(isinstance(f, dict) and f.get(\"art\") in (\"retrieval\", \"antwort\") for f in fehlerliste)):\n        fehlt.append(\"fehlerliste\")\n    if fehlt:\n        return {\"status\": \"verweigert\", \"fehlt\": sorted(fehlt)}\n    zaehlung = {art: sum(1 for f in fehlerliste if f.get(\"art\") == art) for art in (\"retrieval\", \"antwort\")}\n    return {\"status\": \"ok\", \"metrik\": protocol[\"metrik\"], \"messwerte\": ergebnis[\"werte\"], \"digest\": ergebnis[\"digest\"], \"fehler_nach_art\": zaehlung}",
    refNames: ['baseline_report'],
    prompt: "Final Boss Baseline-Report: Implementiere <code>baseline_report(ergebnis, protocol, karten, fehlerliste)</code>. Der Bericht liefert Messwerte NUR mit allen vier Kontexten: <code>ergebnis</code> ein Dict, dessen <code>digest</code> dem sha256 der kanonisch serialisierten <code>werte</code> entspricht (<code>json.dumps(werte, sort_keys=True, separators=(\",\", \":\"))</code> als utf-8), <code>protocol</code> ein Dict mit nicht-leerer <code>metrik</code>, <code>karten</code> ein Dict mit nicht-leerer <code>datacard</code> und <code>modelcard</code>, <code>fehlerliste</code> eine nichtleere Liste von Einträgen mit <code>art</code> in (\"retrieval\", \"antwort\"). Fehlt etwas oder stimmt der Digest nicht, Rückgabe <code>{\"status\": \"verweigert\", \"fehlt\": sortierte codes}</code> — mit Codes digest, protokoll-metrik, karten, fehlerliste — und OHNE jeden Messwert. Sonst <code>{\"status\": \"ok\", \"metrik\": .., \"messwerte\": ergebnis[\"werte\"], \"digest\": ergebnis[\"digest\"], \"fehler_nach_art\": {\"retrieval\": .., \"antwort\": ..}}</code>. Der Testcode bringt ein vollständiges Quartett und unvollständige Varianten mit.",
    fullSolution: "import hashlib\nimport json\n\ndef baseline_report(ergebnis, protocol, karten, fehlerliste):\n    fehlt = []\n    werte = ergebnis.get(\"werte\") if isinstance(ergebnis, dict) else None\n    digest_ok = isinstance(ergebnis, dict) and ergebnis.get(\"digest\") == hashlib.sha256(json.dumps(werte, sort_keys=True, separators=(\",\", \":\")).encode(\"utf-8\")).hexdigest()\n    if not digest_ok:\n        fehlt.append(\"digest\")\n    if not (isinstance(protocol, dict) and protocol.get(\"metrik\")):\n        fehlt.append(\"protokoll-metrik\")\n    if not (isinstance(karten, dict) and karten.get(\"datacard\") and karten.get(\"modelcard\")):\n        fehlt.append(\"karten\")\n    if not (isinstance(fehlerliste, list) and any(isinstance(f, dict) and f.get(\"art\") in (\"retrieval\", \"antwort\") for f in fehlerliste)):\n        fehlt.append(\"fehlerliste\")\n    if fehlt:\n        return {\"status\": \"verweigert\", \"fehlt\": sorted(fehlt)}\n    zaehlung = {art: sum(1 for f in fehlerliste if f.get(\"art\") == art) for art in (\"retrieval\", \"antwort\")}\n    return {\"status\": \"ok\", \"metrik\": protocol[\"metrik\"], \"messwerte\": ergebnis[\"werte\"], \"digest\": ergebnis[\"digest\"], \"fehler_nach_art\": zaehlung}\n\n# vollstaendiges Quartett mit passendem digest -> ok mit exakten Zaehlungen; jede fehlende Vorbedingung oder falscher digest -> verweigert ohne messwerte (lokal python3-verifiziert)",
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
const FAMILY = makeCaseFamily({
  contract: GUARD_CONTRACT,
  cases: GUARD_CASES,
  shapeError: 'validate-report-guard-compose: Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => seededBlock(caseDef, seedCases),
});

export const guardCaseOk = FAMILY.caseOk;
export const genGuardCase = FAMILY.genCase;
export const solveGuardFamily = FAMILY.solve;
export const generateGuardFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

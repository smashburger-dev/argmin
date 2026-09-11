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

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

const refCopy = (source, names) => (
  names.reduce((text, name) => text.split(name).join(`__ref_${name}`), source)
);

// Python literal serializer (pools stay quote- and backslash-free).
const py = (value) => {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (value === null) return 'None';
  if (Array.isArray(value)) return `[${value.map(py).join(', ')}]`;
  return `{${Object.entries(value).map(([key, v]) => `${py(key)}: ${py(v)}`).join(', ')}}`;
};

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
    packages: [],
    starterCode: "import re\n\nGEHEIMNIS_MUSTER = [\n    (\"api-schluessel\", r\"(?i)api[-_ ]?(?:schluessel|key|token)\"),\n    (\"token\", r\"(?i)\\b(?:sk|ghp|xoxb)-[a-z0-9]{12,}\"),\n    (\"bearer\", r\"(?i)\\bbearer\\s+[a-z0-9._-]{16,}\"),\n]\n\n\ndef scan_secrets(card):\n    \"\"\"Sortierte 'feld:code'-Liste fuer String-Werte mit Geheimnis-Muster.\"\"\"\n    ...\n\ndef check_consistency(card, protocol):\n    \"\"\"Sortierte Abweichungs-Codes zwischen Karte und Protokoll.\"\"\"\n    ...\n\n",
    baseTests: "__check('saubere karte ohne befunde', scan_secrets({\"zweck\": \"antworten fuer support\", \"kontakt\": \"team-support\"}) == [])\n__check('api-schluessel und token im selben feld', scan_secrets({\"zweck\": \"nutzt api-schluessel: sk-beispiel12345678\", \"notiz\": \"bearer abcdefghijklmnopqrst\"}) == [\"notiz:bearer\", \"zweck:api-schluessel\", \"zweck:token\"])\n__check('zu kurzes token ist kein befund', scan_secrets({\"grenze\": \"kein echter zugriff, nur schema sk-kurz\"}) == [])\n__check('nicht-strings werden uebersprungen', scan_secrets({\"n_beispiele\": 1200, \"split_train\": 0.8}) == [])\nP = {\"datensatz\": \"faq-korpus\", \"metrik\": \"recall@5\", \"n_beispiele\": 1200}\n__check('konsistente karte', check_consistency({\"name\": \"faq-korpus\", \"metrik\": \"recall@5\", \"n_beispiele\": 1200}, P) == [])\n__check('name und metrik weichen ab', check_consistency({\"name\": \"faq-korpus-v2\", \"metrik\": \"token-f1\", \"n_beispiele\": 1200}, P) == [\"datensatz-abweichung\", \"metrik-abweichung\"])\n__check('umfang weicht ab', check_consistency({\"name\": \"faq-korpus\", \"metrik\": \"recall@5\", \"n_beispiele\": 1400}, P) == [\"umfang-abweichung\"])\n__check('fehlende felder sind keine abweichung', check_consistency({\"name\": \"faq-korpus\"}, P) == [\"metrik-abweichung\", \"umfang-abweichung\"])\nprint(\"ok w32-e5\")",
    referenceSolver: "import re\n\nGEHEIMNIS_MUSTER = [\n    (\"api-schluessel\", r\"(?i)api[-_ ]?(?:schluessel|key|token)\"),\n    (\"token\", r\"(?i)\\b(?:sk|ghp|xoxb)-[a-z0-9]{12,}\"),\n    (\"bearer\", r\"(?i)\\bbearer\\s+[a-z0-9._-]{16,}\"),\n]\n\n\ndef scan_secrets(card):\n    befunde = []\n    for feld, wert in card.items():\n        if not isinstance(wert, str):\n            continue\n        for code, muster in GEHEIMNIS_MUSTER:\n            if re.search(muster, wert):\n                befunde.append(feld + \":\" + code)\n    return sorted(befunde)\n\n\ndef check_consistency(card, protocol):\n    probleme = []\n    if card.get(\"name\") != protocol.get(\"datensatz\"):\n        probleme.append(\"datensatz-abweichung\")\n    if card.get(\"metrik\") != protocol.get(\"metrik\"):\n        probleme.append(\"metrik-abweichung\")\n    if card.get(\"n_beispiele\") != protocol.get(\"n_beispiele\"):\n        probleme.append(\"umfang-abweichung\")\n    return sorted(probleme)",
    refNames: ['scan_secrets', 'check_consistency'],
    prompt: "Implementiere Konsistenzprüfung und Geheimnis-Scan. <code>GEHEIMNIS_MUSTER</code> (im Startercode vorgegeben) ordnet drei Codes Regexen zu: api-schluessel, token, bearer. <code>scan_secrets(card)</code> durchsucht jeden String-Wert der Karte mit <code>re.search</code> und liefert die alphabetisch sortierte Liste <code>feld:code</code> für alle Treffer (mehrere Treffer pro Feld erlaubt). <code>check_consistency(card, protocol)</code> liefert sortierte Codes: <code>datensatz-abweichung</code> (card.name != protocol.datensatz), <code>metrik-abweichung</code> (card.metrik != protocol.metrik), <code>umfang-abweichung</code> (card.n_beispiele != protocol.n_beispiele). Der Testcode bringt Karten, Protokolle und Geheimnis-Fixtures mit.",
    fullSolution: "import re\n\nGEHEIMNIS_MUSTER = [\n    (\"api-schluessel\", r\"(?i)api[-_ ]?(?:schluessel|key|token)\"),\n    (\"token\", r\"(?i)\\b(?:sk|ghp|xoxb)-[a-z0-9]{12,}\"),\n    (\"bearer\", r\"(?i)\\bbearer\\s+[a-z0-9._-]{16,}\"),\n]\n\n\ndef scan_secrets(card):\n    befunde = []\n    for feld, wert in card.items():\n        if not isinstance(wert, str):\n            continue\n        for code, muster in GEHEIMNIS_MUSTER:\n            if re.search(muster, wert):\n                befunde.append(feld + \":\" + code)\n    return sorted(befunde)\n\n\ndef check_consistency(card, protocol):\n    probleme = []\n    if card.get(\"name\") != protocol.get(\"datensatz\"):\n        probleme.append(\"datensatz-abweichung\")\n    if card.get(\"metrik\") != protocol.get(\"metrik\"):\n        probleme.append(\"metrik-abweichung\")\n    if card.get(\"n_beispiele\") != protocol.get(\"n_beispiele\"):\n        probleme.append(\"umfang-abweichung\")\n    return sorted(probleme)\n\n# Geheimnis-Fixture 'api-schluessel: sk-beispiel12345678' -> zwei Befunde, bearer -> einer (lokal python3-verifiziert)",
    extraCount: 3,
    draw: drawCardScan,
  },
  'cross-card-consistency': {
    caseId: 'cross-card-consistency',
    difficulty: 'challenge',
    competencyIds: ['c-research-cards', 'c-genai-security'],
    packages: [],
    starterCode: "DATA_PFLICHT = [\"name\", \"zweck\", \"herkunft\", \"lizenz\", \"n_beispiele\", \"bekannte_luecken\"]\nMODELL_PFLICHT = [\"name\", \"zweck\", \"version\", \"trainingsdaten\", \"metrik\", \"schwellenwert\", \"bekannte_grenzen\"]\nSYSTEM_PFLICHT = [\"modell\", \"metrik\", \"schwelle\", \"kontrolle\"]\n\n\ndef cross_card_consistency(datacard, modelcard, systemcard, protocol):\n    \"\"\"Sortierte, eindeutige Widerspruchsliste ueber alle Karten und das Protokoll.\"\"\"\n    ...\n\n",
    baseTests: "DC = {\"name\": \"faq-korpus\", \"zweck\": \"support-antworten\", \"herkunft\": \"forum-export\", \"lizenz\": \"cc-by-vier\", \"n_beispiele\": 1200, \"bekannte_luecken\": \"injektions-fixture enthalten\", \"metrik\": \"recall@5\"}\nMC = {\"name\": \"rag-stub\", \"zweck\": \"antwortvorschlag\", \"version\": \"1.2.0\", \"trainingsdaten\": \"faq-korpus\", \"metrik\": \"recall@5\", \"schwellenwert\": 0.75, \"bekannte_grenzen\": \"kein echtes sprachmodell\"}\nSC = {\"modell\": \"rag-stub\", \"metrik\": \"recall@5\", \"schwelle\": 0.75, \"kontrolle\": \"injektions-detektor\"}\nPR = {\"datensatz\": \"faq-korpus\", \"metrik\": \"recall@5\", \"n_beispiele\": 1200}\n__check('konsistentes quartett', cross_card_consistency(DC, MC, SC, PR) == [])\nMC2 = dict(MC)\nMC2[\"metrik\"] = \"token-f1\"\nMC2.pop(\"version\")\n__check('metrik unstimmig und feld fehlt', cross_card_consistency(DC, MC2, SC, PR) == [\"metrik-unstimmig\", \"modelcard.version-fehlt\"])\nSC2 = dict(SC)\nSC2[\"schwelle\"] = 0.6\nSC2[\"modell\"] = \"rag-stub-v2\"\n__check('modell und schwelle unstimmig', cross_card_consistency(DC, MC, SC2, PR) == [\"modell-unstimmig\", \"schwelle-unstimmig\"])\nDC3 = dict(DC)\nDC3[\"n_beispiele\"] = 1400\nDC3[\"name\"] = \"faq-korpus-v2\"\n__check('datensatz und umfang unstimmig', cross_card_consistency(DC3, MC, SC, PR) == [\"datensatz-unstimmig\", \"umfang-unstimmig\"])\n__check('leeres pflichtfeld zaehlt als fehlt', cross_card_consistency(dict(DC, lizenz=\"\"), MC, SC, PR) == [\"datacard.lizenz-fehlt\"])\nprint(\"ok w32-e6\")",
    referenceSolver: "DATA_PFLICHT = [\"name\", \"zweck\", \"herkunft\", \"lizenz\", \"n_beispiele\", \"bekannte_luecken\"]\nMODELL_PFLICHT = [\"name\", \"zweck\", \"version\", \"trainingsdaten\", \"metrik\", \"schwellenwert\", \"bekannte_grenzen\"]\nSYSTEM_PFLICHT = [\"modell\", \"metrik\", \"schwelle\", \"kontrolle\"]\n\n\ndef cross_card_consistency(datacard, modelcard, systemcard, protocol):\n    befunde = []\n    namen = {datacard.get(\"name\"), modelcard.get(\"trainingsdaten\"), protocol.get(\"datensatz\")}\n    if len(namen) > 1:\n        befunde.append(\"datensatz-unstimmig\")\n    metriken = {datacard.get(\"metrik\"), modelcard.get(\"metrik\"), systemcard.get(\"metrik\"), protocol.get(\"metrik\")}\n    if len(metriken) > 1:\n        befunde.append(\"metrik-unstimmig\")\n    if modelcard.get(\"name\") != systemcard.get(\"modell\"):\n        befunde.append(\"modell-unstimmig\")\n    if modelcard.get(\"schwellenwert\") != systemcard.get(\"schwelle\"):\n        befunde.append(\"schwelle-unstimmig\")\n    if datacard.get(\"n_beispiele\") != protocol.get(\"n_beispiele\"):\n        befunde.append(\"umfang-unstimmig\")\n    for label, karte, pflicht in ((\"datacard\", datacard, DATA_PFLICHT), (\"modelcard\", modelcard, MODELL_PFLICHT), (\"systemcard\", systemcard, SYSTEM_PFLICHT)):\n        for feld in pflicht:\n            wert = karte.get(feld)\n            if wert is None or str(wert).strip() == \"\":\n                befunde.append(label + \".\" + feld + \"-fehlt\")\n    return sorted(set(befunde))",
    refNames: ['cross_card_consistency'],
    prompt: "Final Boss Cross-Card-Audit: Implementiere <code>cross_card_consistency(datacard, modelcard, systemcard, protocol)</code>. Die Pflichtlisten im Startercode geben die Felder je Karte vor. Rückgabe: alphabetisch sortierte, eindeutige Widerspruchsliste mit diesen Codes: <code>datensatz-unstimmig</code> (die Werte datacard.name, modelcard.trainingsdaten, protocol.datensatz sind nicht alle gleich), <code>metrik-unstimmig</code> (datacard.metrik, modelcard.metrik, systemcard.metrik, protocol.metrik nicht alle gleich), <code>modell-unstimmig</code> (modelcard.name != systemcard.modell), <code>schwelle-unstimmig</code> (modelcard.schwellenwert != systemcard.schwelle), <code>umfang-unstimmig</code> (datacard.n_beispiele != protocol.n_beispiele) sowie <code>&lt;karte&gt;.&lt;feld&gt;-fehlt</code> für jedes fehlende oder leere Pflichtfeld (karten: datacard, modelcard, systemcard). Der Testcode bringt ein konsistentes Quartett und drei abweichende Varianten mit.",
    fullSolution: "DATA_PFLICHT = [\"name\", \"zweck\", \"herkunft\", \"lizenz\", \"n_beispiele\", \"bekannte_luecken\"]\nMODELL_PFLICHT = [\"name\", \"zweck\", \"version\", \"trainingsdaten\", \"metrik\", \"schwellenwert\", \"bekannte_grenzen\"]\nSYSTEM_PFLICHT = [\"modell\", \"metrik\", \"schwelle\", \"kontrolle\"]\n\n\ndef cross_card_consistency(datacard, modelcard, systemcard, protocol):\n    befunde = []\n    namen = {datacard.get(\"name\"), modelcard.get(\"trainingsdaten\"), protocol.get(\"datensatz\")}\n    if len(namen) > 1:\n        befunde.append(\"datensatz-unstimmig\")\n    metriken = {datacard.get(\"metrik\"), modelcard.get(\"metrik\"), systemcard.get(\"metrik\"), protocol.get(\"metrik\")}\n    if len(metriken) > 1:\n        befunde.append(\"metrik-unstimmig\")\n    if modelcard.get(\"name\") != systemcard.get(\"modell\"):\n        befunde.append(\"modell-unstimmig\")\n    if modelcard.get(\"schwellenwert\") != systemcard.get(\"schwelle\"):\n        befunde.append(\"schwelle-unstimmig\")\n    if datacard.get(\"n_beispiele\") != protocol.get(\"n_beispiele\"):\n        befunde.append(\"umfang-unstimmig\")\n    for label, karte, pflicht in ((\"datacard\", datacard, DATA_PFLICHT), (\"modelcard\", modelcard, MODELL_PFLICHT), (\"systemcard\", systemcard, SYSTEM_PFLICHT)):\n        for feld in pflicht:\n            wert = karte.get(feld)\n            if wert is None or str(wert).strip() == \"\":\n                befunde.append(label + \".\" + feld + \"-fehlt\")\n    return sorted(set(befunde))\n\n# konsistentes Quartett -> [], abweichende Varianten -> exakte Codemengen (lokal python3-verifiziert)",
    extraCount: 3,
    draw: drawCrossCard,
  },
  'freeze-checker': {
    caseId: 'freeze-checker',
    difficulty: 'core',
    competencyIds: ['c-capstone-pipeline', 'c-python-functions'],
    packages: [],
    starterCode: "import hashlib\n\n\ndef pruefe_pins(dateien, pins):\n    \"\"\"{'verstoesse': [name: grund, ...]} sortiert; None-Pin = nur Anwesenheit.\"\"\"\n    ...\n\n",
    baseTests: "import hashlib\n\nPIN = lambda s: hashlib.sha256(s.encode(\"utf-8\")).hexdigest()\nGS = \"golden_set.json\"\nCF = \"config.json\"\ndateien = {GS: \"inhalte-stabil\", CF: \"config-stabil\", \"pipeline.py\": \"x = 1\"}\npins_ok = {GS: PIN(\"inhalte-stabil\"), CF: PIN(\"config-stabil\"), \"pipeline.py\": None}\n__check('alles eingefroren ok', pruefe_pins(dateien, pins_ok) == {\"verstoesse\": []})\npins_tamper = dict(pins_ok)\npins_tamper[CF] = \"0\" * 64\n__check('hash-abweichung', pruefe_pins(dateien, pins_tamper) == {\"verstoesse\": [CF + \": hash weicht ab\"]})\n__check('null-pin nur anwesenheit', pruefe_pins({}, {\"README.md\": None}) == {\"verstoesse\": [\"README.md: fehlt\"]})\n__check('verstoesse sortiert', pruefe_pins({}, {CF: \"0\" * 64, GS: None}) == {\"verstoesse\": [CF + \": fehlt\", GS + \": fehlt\"]})\n__check('abweichung einzeln', pruefe_pins(dateien, {CF: \"0\" * 64}) == {\"verstoesse\": [CF + \": hash weicht ab\"]})",
    referenceSolver: "import hashlib\n\n\ndef pruefe_pins(dateien, pins):\n    verstoesse = []\n    for name, pin in pins.items():\n        if name not in dateien:\n            verstoesse.append(name + \": fehlt\")\n        elif pin is not None and hashlib.sha256(dateien[name].encode(\"utf-8\")).hexdigest() != pin:\n            verstoesse.append(name + \": hash weicht ab\")\n    return {\"verstoesse\": sorted(verstoesse)}\n\n# pruefe_pins(dateien, pins_ok) -> {'verstoesse': []}\n# Tamper am config-Pin -> ['config.json: hash weicht ab']",
    refNames: ['pruefe_pins'],
    prompt: "Baue den Freeze-Prüfer: <code>pruefe_pins(dateien, pins)</code> erhält Dateien als Dict <code>{name: inhalt_string}</code> und Pins als Dict <code>{name: sha256_oder_None}</code>. Rückgabe <code>{\"verstoesse\": [name + \": fehlt\", …]}</code> (sortiert): fehlt eine gepinnte Datei, kommt <code>name + \": fehlt\"</code>; ist der Pin ein String und weicht der sha256 des Inhalts (utf-8, hex) ab, kommt <code>name + \": hash weicht ab\"</code>; ist der Pin <code>None</code>, wird nur Anwesenheit geprüft. Eine Datei, die weder fehlt noch abweicht, erzeugt keinen Verstoß. Der sha256 wird über die rohen Inhalts-Bytes gebildet.",
    fullSolution: "import hashlib\n\n\ndef pruefe_pins(dateien, pins):\n    verstoesse = []\n    for name, pin in pins.items():\n        if name not in dateien:\n            verstoesse.append(name + \": fehlt\")\n        elif pin is not None and hashlib.sha256(dateien[name].encode(\"utf-8\")).hexdigest() != pin:\n            verstoesse.append(name + \": hash weicht ab\")\n    return {\"verstoesse\": sorted(verstoesse)}\n\n# Reihenfolge je Pin: fehlt -> hash -> frei; None-Pins nur auf Anwesenheit.",
    extraCount: 3,
    draw: drawFreeze,
  },
  'pin-version-check': {
    caseId: 'pin-version-check',
    difficulty: 'stretch',
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    packages: [],
    starterCode: "def pruefe_pins_versionen(spezis):\n    \"\"\"{'verletzungen': ['name: spec', ...]} sortiert; Marker: >=, <=, ~=, *.\"\"\"\n    ...\n\n",
    baseTests: "__check('alles exakt ok', pruefe_pins_versionen({\"python\": \"3.11\", \"pytest\": \"8\"}) == {\"verletzungen\": []})\n__check('drei verstoesse', pruefe_pins_versionen({\"pytest\": \">=8\", \"numpy\": \"~=1.26\", \"pandas\": \"*\"}) == {\"verletzungen\": [\"numpy: ~=1.26\", \"pandas: *\", \"pytest: >=8\"]})\n__check('gemischt', pruefe_pins_versionen({\"b\": \"2.0\", \"a\": \"<=1.0\"}) == {\"verletzungen\": [\"a: <=1.0\"]})\n__check('leer', pruefe_pins_versionen({}) == {\"verletzungen\": []})\n__check('stern in mitte', pruefe_pins_versionen({\"x\": \"1.*\"}) == {\"verletzungen\": [\"x: 1.*\"]})",
    referenceSolver: "def pruefe_pins_versionen(spezis):\n    marker = (\">=\", \"<=\", \"~=\", \"*\")\n    verletzungen = sorted(\n        f\"{name}: {spec}\"\n        for name, spec in spezis.items()\n        if any(m in str(spec) for m in marker)\n    )\n    return {\"verletzungen\": verletzungen}\n\n# {'pytest': '>=8', 'numpy': '~=1.26', 'pandas': '*'} -> ['numpy: ~=1.26', 'pandas: *', 'pytest: >=8']",
    refNames: ['pruefe_pins_versionen'],
    prompt: "Pin-Prüfer: <code>pruefe_pins_versionen(spezis)</code> erhält <code>{name: versionspec}</code> und liefert <code>{\"verletzungen\": [\"name: spec\", …]}</code> — sortiert. Ein Eintrag verletzt, wenn der Spec (als String) mindestens einen der Marker <code>&gt;=</code>, <code>&lt;=</code>, <code>~=</code> oder <code>*</code> enthält. Exakte Angaben wie <code>\"8.3\"</code> sind regelkonform.",
    fullSolution: "def pruefe_pins_versionen(spezis):\n    marker = (\">=\", \"<=\", \"~=\", \"*\")\n    verletzungen = sorted(\n        f\"{name}: {spec}\"\n        for name, spec in spezis.items()\n        if any(m in str(spec) for m in marker)\n    )\n    return {\"verletzungen\": verletzungen}\n\n# Bereichs-Specs machen Reproduktion zur Wette — exakte Pins sind der Vertrag.",
    extraCount: 3,
    draw: drawPinVersions,
  },
};

export function catalogCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genCatalogCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
  };
}

export function solveCatalogFamily(parameters) {
  const caseDef = Object.values(CATALOG_CASES).find((item) => catalogCaseOk(parameters, item));
  if (!caseDef) throw new Error('validate-rule-catalog-scan: Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

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
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateCatalogFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = CATALOG_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genCatalogCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...CATALOG_CONTRACT, generate: generateCatalogFamily, solve: solveCatalogFamily };

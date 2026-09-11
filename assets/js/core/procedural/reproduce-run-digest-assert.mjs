// Procedural family reproduce-run-digest-assert: the task text, starter code
// and reference solver stay fixed; the seed draws fresh baseline configs,
// freeze fixtures (word lists plus min_laenge) and readme/run/phrasen triples
// that get appended to the curated base test block as literal __check lines.
// Every drawn expectation is evaluated against a renamed __ref_ copy of the
// reference solver and __raised covers the AssertionError freeze path, so the
// grading contract cannot drift. Mirrors reproduce-seeded-split.mjs.

import { RAISED_HELPER, refCopy } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/reproduce-run-digest-assert.json.
const CASE_PAYLOADS = {
  "run-digest-assert": { "difficulty": "stretch", "packages": [], "starterCode": "import hashlib\nimport json\n\n\ndef run_baseline(config):\n    \"\"'{'werte': .., 'digest': ..} mit Doppel-Lauf-Assert ueber den Digest.'\"\"\n    ...\n\n", "baseTests": "CONFIG = {\n    \"k\": 5,\n    \"faelle\": [\n        {\"id\": \"faq-03\", \"relevante\": [\"faq-3\"], \"top\": [\"faq-3\", \"faq-7\"], \"korrekt\": True},\n        {\"id\": \"faq-11\", \"relevante\": [\"vertrag-1\"], \"top\": [\"vertrag-1\", \"faq-3\"], \"korrekt\": False},\n        {\"id\": \"faq-19\", \"relevante\": [\"faq-7\"], \"top\": [\"faq-7\"], \"korrekt\": True},\n        {\"id\": \"vertrag-02\", \"relevante\": [\"vertrag-1\"], \"top\": [\"vertrag-1\"], \"korrekt\": True},\n        {\"id\": \"vertrag-07\", \"relevante\": [\"vertrag-2\"], \"top\": [\"faq-3\"], \"korrekt\": False},\n    ],\n}\nr = run_baseline(CONFIG)\n__check('werte der baseline', r[\"werte\"] == {\"recall_at_k\": 0.8, \"antwort_naiv\": 0.6, \"antwort_getrennt\": 0.75})\n__check('exakter digest', r[\"digest\"] == \"728a5e258971cd2fb9f7456d88cef6f8559ae1c6fbdd1b0c6ba8ff26fb1ad0a7\")\n__check('doppel-lauf gleich', run_baseline(CONFIG) == r)\nTAMPER = json.loads(json.dumps(CONFIG))\nTAMPER[\"faelle\"][0][\"korrekt\"] = False\n__check('digest reagiert auf aenderung', run_baseline(TAMPER)[\"digest\"] != r[\"digest\"])\nK_CONFIG = json.loads(json.dumps(CONFIG))\nK_CONFIG[\"k\"] = 1\nK_CONFIG[\"faelle\"][0][\"top\"] = [\"faq-7\", \"faq-3\"]\n__check('k wirkt auf recall', run_baseline(K_CONFIG)[\"werte\"][\"recall_at_k\"] == 0.6)\nprint(\"ok w34-e5\")", "referenceSolver": "import hashlib\nimport json\n\n\ndef _baseline_werte(config):\n    k = config[\"k\"]\n    faelle = config[\"faelle\"]\n    treffer = [f for f in faelle if set(f[\"relevante\"]) & set(f[\"top\"][:k])]\n    korrekt = [f for f in treffer if f[\"korrekt\"]]\n    werte = {\n        \"recall_at_k\": round(len(treffer) / len(faelle), 3),\n        \"antwort_naiv\": round(len(korrekt) / len(faelle), 3),\n        \"antwort_getrennt\": round(len(korrekt) / len(treffer), 3),\n    }\n    digest = hashlib.sha256(json.dumps(werte, sort_keys=True, separators=(\",\", \":\")).encode(\"utf-8\")).hexdigest()\n    return werte, digest\n\n\ndef run_baseline(config):\n    werte, digest = _baseline_werte(config)\n    werte2, digest2 = _baseline_werte(config)\n    assert digest == digest2, \"nicht reproduzierbar\"\n    return {\"werte\": werte, \"digest\": digest}", "prompt": "Implementiere die Baseline mit Reproduzierbarkeits-Assert. <code>run_baseline(config)</code> erhält <code>{\"k\": .., \"faelle\": [...]}</code>; jeder Fall ist <code>{\"id\": .., \"relevante\": [doc-ids], \"top\": [doc-ids], \"korrekt\": bool}</code>. Auswertung: recall_at_k = Anteil der Fälle, bei denen mindestens ein relevantes Dokument in den ersten k Einträgen von top liegt; antwort_naiv = korrekt/alle Fälle; antwort_getrennt = korrekt/Fälle mit Treffer — alle auf 3 Dezimalstellen gerundet. Baue zusätzlich einen Digest als sha256 über <code>json.dumps(werte, sort_keys=True, separators=(\",\", \":\"))</code>. Die Funktion muss die Auswertung zweimal unabhängig durchführen und per <code>assert</code> vergleichen (Digest-Gleichheit, sonst AssertionError) und <code>{\"werte\": werte, \"digest\": digest}</code> zurückgeben. Der Testcode bringt eine Konfiguration mit und prüft exakte Werte, Doppel-Lauf-Gleichheit und Digest-Empfindlichkeit.", "fullSolution": "import hashlib\nimport json\n\ndef _baseline_werte(config):\n    k = config[\"k\"]\n    faelle = config[\"faelle\"]\n    treffer = [f for f in faelle if set(f[\"relevante\"]) & set(f[\"top\"][:k])]\n    korrekt = [f for f in treffer if f[\"korrekt\"]]\n    werte = {\n        \"recall_at_k\": round(len(treffer) / len(faelle), 3),\n        \"antwort_naiv\": round(len(korrekt) / len(faelle), 3),\n        \"antwort_getrennt\": round(len(korrekt) / len(treffer), 3),\n    }\n    digest = hashlib.sha256(json.dumps(werte, sort_keys=True, separators=(\",\", \":\")).encode(\"utf-8\")).hexdigest()\n    return werte, digest\n\ndef run_baseline(config):\n    werte, digest = _baseline_werte(config)\n    werte2, digest2 = _baseline_werte(config)\n    assert digest == digest2, \"nicht reproduzierbar\"\n    return {\"werte\": werte, \"digest\": digest}\n\n# Fixture: recall 4/5 = 0.8, naiv 3/5 = 0.6, getrennt 3/4 = 0.75, digest 728a5e25…d0a7 (lokal python3-verifiziert)", "competencyIds": ["c-research-capstone","c-python-functions"] },
  "pipeline-freeze-report": { "difficulty": "challenge", "packages": [], "starterCode": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    \"\"\"Stabile Serialisierung: sortierte Schluessel, keine Leerraeume.\"\"\"\n    ...\n\n\ndef run_pipeline(config):\n    \"\"\"Freeze pruefen, Stages ausfuehren, Bericht und Digest liefern.\"\"\"\n    ...\n\n", "baseTests": "import hashlib\nimport json\n\nDATEN = [\"Affe\", \"Banane\", \"Zitrone\", \"Apfel\", \"Birne\"]\ndef kanon(obj):\n    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\nPIN = hashlib.sha256(kanon(DATEN).encode(\"utf-8\")).hexdigest()\nCFG = {\"daten\": DATEN, \"min_laenge\": 5, \"pins\": {\"daten\": PIN}}\nerg = run_pipeline(CFG)\n__check('status ok', erg[\"status\"] == \"ok\")\n__check('bericht anzahl', erg[\"bericht\"][\"anzahl\"] == 4)\n__check('bericht anfangsbuchstaben', erg[\"bericht\"][\"anfangsbuchstaben\"] == {\"a\": 1, \"b\": 2, \"z\": 1})\n__check('digest stimmt', erg[\"digest\"] == hashlib.sha256(kanon(erg[\"bericht\"]).encode(\"utf-8\")).hexdigest())\n__check('doppellauf identisch', run_pipeline(CFG) == erg)\nTAMPER = {\"daten\": [\"Affe\", \"Banane\", \"Zitrone\", \"Apfel\", \"Kirsche\"], \"min_laenge\": 5, \"pins\": {\"daten\": PIN}}\ntry:\n    run_pipeline(TAMPER)\n    __check('tamper erkannt', False)\nexcept AssertionError as e:\n    __check('tamper erkannt', \"freeze verletzt\" in str(e))", "referenceSolver": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n\n\ndef run_pipeline(config):\n    daten = config[\"daten\"]\n    pin = config[\"pins\"][\"daten\"]\n    ist = hashlib.sha256(kanon(daten).encode(\"utf-8\")).hexdigest()\n    if ist != pin:\n        raise AssertionError(\"freeze verletzt: daten\")\n    normalisiert = [w.lower() for w in daten]\n    gefiltert = [w for w in normalisiert if len(w) >= config[\"min_laenge\"]]\n    anfangs = {}\n    for w in gefiltert:\n        anfangs[w[0]] = anfangs.get(w[0], 0) + 1\n    bericht = {\"anzahl\": len(gefiltert), \"anfangsbuchstaben\": dict(sorted(anfangs.items()))}\n    digest = hashlib.sha256(kanon(bericht).encode(\"utf-8\")).hexdigest()\n    return {\"status\": \"ok\", \"bericht\": bericht, \"digest\": digest}\n\n# run_pipeline(CFG) -> bericht {'anzahl': 4, 'anfangsbuchstaben': {'a': 1, 'b': 2, 'z': 1}}\n# digest 'fbb1966dc2acf0e6088a2e43477336601cd59f4904d95ae978dec4bd5612f1b5'; Doppellauf identisch", "prompt": "Final Boss Scope-Freeze: Implementiere <code>run_pipeline(config)</code> mit Hash-Prüfung und byte-identischem Wiederholungslauf. config: <code>{\"daten\": [woerter], \"min_laenge\": int, \"pins\": {\"daten\": sha256}}</code>. Ablauf: (1) Freeze: sha256 über die kanonische JSON-Serialisierung von <code>daten</code> (sortierte Schlüssel, keine Leerzeichen, utf-8) muss dem Pin entsprechen — sonst <code>AssertionError(\"freeze verletzt: daten\")</code>. (2) Stages ausführen: normalisieren (klein), filtern (Länge ≥ min_laenge), je Anfangsbuchstabe zählen. (3) Bericht <code>{\"anzahl\": n, \"anfangsbuchstaben\": {buchstabe: n}}</code> mit sortierten Schlüsseln. (4) Rückgabe <code>{\"status\": \"ok\", \"bericht\": bericht, \"digest\": sha256-ueber-kanonisches-json(bericht)}</code>. Alles deterministisch: zweiter Aufruf mit gleichem config liefert dasselbe Ergebnis-Objekt.", "fullSolution": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n\n\ndef run_pipeline(config):\n    daten = config[\"daten\"]\n    pin = config[\"pins\"][\"daten\"]\n    ist = hashlib.sha256(kanon(daten).encode(\"utf-8\")).hexdigest()\n    if ist != pin:\n        raise AssertionError(\"freeze verletzt: daten\")\n    normalisiert = [w.lower() for w in daten]\n    gefiltert = [w for w in normalisiert if len(w) >= config[\"min_laenge\"]]\n    anfangs = {}\n    for w in gefiltert:\n        anfangs[w[0]] = anfangs.get(w[0], 0) + 1\n    bericht = {\"anzahl\": len(gefiltert), \"anfangsbuchstaben\": dict(sorted(anfangs.items()))}\n    digest = hashlib.sha256(kanon(bericht).encode(\"utf-8\")).hexdigest()\n    return {\"status\": \"ok\", \"bericht\": bericht, \"digest\": digest}\n\n# Freeze zuerst, Stages rein deterministic, Digest kanonisch — Doppellauf liefert dasselbe Objekt.", "competencyIds": ["c-capstone-pipeline","c-ml-repro"] },
  "reproduction-verdict-rules": { "difficulty": "challenge", "packages": [], "starterCode": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    \"\"\"Stabile Serialisierung: sortierte Schluessel, keine Leerraeume.\"\"\"\n    ...\n\n\ndef repro_check(readme, laeufe, phrasen):\n    \"\"\"Digest-Vergleich ueber alle Laeufe plus Overclaim-Scan des README.\"\"\"\n    ...\n\n", "baseTests": "import hashlib\nimport json\n\nLAUF = {\"metriken\": {\"recall_at_k\": 0.75, \"answered\": 6}}\nGLEICH = [{\"metriken\": {\"recall_at_k\": 0.75, \"answered\": 6}}, {\"metriken\": {\"answered\": 6, \"recall_at_k\": 0.75}}]\nbericht = repro_check(\"Ehrlicher Bericht mit bekannten Grenzen.\", GLEICH, [\"produktionsreif\", \"sicher gegen\"])\n__check('identisch trotz schluesselreihenfolge', bericht[\"digest_identisch\"] is True)\n__check('zwei digests', len(bericht[\"digests\"]) == 2 and bericht[\"digests\"][0] == bericht[\"digests\"][1])\n__check('digestwert', bericht[\"digests\"][0] == hashlib.sha256(json.dumps(LAUF, sort_keys=True, separators=(\",\", \":\")).encode(\"utf-8\")).hexdigest())\n__check('keine overclaims', bericht[\"overclaims\"] == [])\n__check('verdict angenommen', bericht[\"verdict\"] == \"angenommen\")\nVERSCHIEDEN = [LAUF, {\"metriken\": {\"recall_at_k\": 0.9, \"answered\": 6}}]\nbericht = repro_check(\"Guter Text.\", VERSCHIEDEN, [\"produktionsreif\"])\n__check('digest weicht ab', bericht[\"digest_identisch\"] is False and bericht[\"verdict\"] == \"abgelehnt\")\nbericht = repro_check(\"Das System ist produktionsreif.\", [LAUF], [\"produktionsreif\"])\n__check('overclaim lehnt ab', bericht[\"overclaims\"] == [\"produktionsreif\"] and bericht[\"verdict\"] == \"abgelehnt\")\n__check('vakuum-laufen', repro_check(\"Text.\", [], [\"produktionsreif\"])[\"digest_identisch\"] is True)", "referenceSolver": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n\n\ndef repro_check(readme, laeufe, phrasen):\n    digests = [hashlib.sha256(kanon(lauf).encode(\"utf-8\")).hexdigest() for lauf in laeufe]\n    identisch = all(d == digests[0] for d in digests) if digests else True\n    t = readme.lower()\n    overclaims = sorted(p for p in phrasen if p in t)\n    verdict = \"angenommen\" if identisch and not overclaims else \"abgelehnt\"\n    return {\"digest_identisch\": identisch, \"digests\": digests, \"overclaims\": overclaims, \"verdict\": verdict}\n\n# Kanonik gleicht Schluesselreihenfolge aus; Verdikt kombiniert Reproduktion und ehrlichen Text", "prompt": "Final Boss Reproduktion: <code>repro_check(readme, laeufe, phrasen)</code>. laeufe ist eine Liste von Ergebnis-Dicts. (1) Digest je Lauf: sha256 über die kanonische JSON-Serialisierung (sortierte Schlüssel, keine Leerzeichen, utf-8). (2) <code>{\"digest_identisch\": bool}</code> — True nur wenn ALLE Läufe denselben Digest haben. (3) <code>{\"digests\": [digest, …]</code> in Laufreihenfolge. (4) <code>{\"overclaims\": funde}</code> — die in readme (kleingeschrieben) gefundenen Phrasen, sortiert. (5) <code>{\"verdict\": \"angenommen\"}</code> nur wenn Digeste identisch UND keine Overclaims, sonst <code>\"abgelehnt\"</code>. Leere laeufe → digest_identisch True (Vakuum).", "fullSolution": "import hashlib\nimport json\n\n\ndef kanon(obj):\n    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n\n\ndef repro_check(readme, laeufe, phrasen):\n    digests = [hashlib.sha256(kanon(lauf).encode(\"utf-8\")).hexdigest() for lauf in laeufe]\n    identisch = all(d == digests[0] for d in digests) if digests else True\n    t = readme.lower()\n    overclaims = sorted(p for p in phrasen if p in t)\n    verdict = \"angenommen\" if identisch and not overclaims else \"abgelehnt\"\n    return {\"digest_identisch\": identisch, \"digests\": digests, \"overclaims\": overclaims, \"verdict\": verdict}\n\n# Doppellauf-Digest + Overclaim-Scan = Reproduktionsvertrag der Dokumentation.", "competencyIds": ["c-capstone-pipeline","c-ml-repro"] },
};

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns ("ok", result) or (exception type, message): lets one comparison
// cover both value returns and the contracted AssertionError path.


// Draw pools: doc-id register shared by all three cases, German word list
// for the freeze stage and overclaim phrases/readme templates for the
// verdict rules. All pools stay quote- and backslash-free.
const DOC_IDS = ['faq-3', 'faq-7', 'vertrag-1', 'vertrag-2', 'handbuch-5', 'faq-11'];
const WORD_POOL = ['Affe', 'Banane', 'Zitrone', 'Apfel', 'Birne', 'Kirsche', 'Melone', 'Traube', 'Pfirsich', 'Ananas', 'Quitte', 'Orange'];
const PHRASEN_POOL = ['produktionsreif', 'sicher gegen', 'fehlerfrei', 'garantiert', 'bewiesen'];
const README_CLEAN = [
  'Ehrlicher Bericht mit bekannten Grenzen.',
  'Guter Text.',
  'Ergebnisse unter Vorbehalt.',
  'Erste Pilotdaten, kleine Stichprobe.',
];

export const DIGEST_CASES = {
  'run-digest-assert': {
    ...CASE_PAYLOADS['run-digest-assert'],
    competencyIds: ['c-research-capstone', 'c-python-functions'],
    refNames: ['run_baseline', '_baseline_werte'],
    // k plus 4-7 case dicts; the first case is forced to a top-1 hit so
    // antwort_getrennt never divides by zero on either side.
    draw(r) {
      const count = randInt(r, 4, 7);
      const faelle = Array.from({ length: count }, (_, j) => {
        const relevante = shuffle(r, [...DOC_IDS]).slice(0, randInt(r, 1, 2));
        const top = shuffle(r, [...DOC_IDS]).slice(0, randInt(r, 1, 3));
        return { id: `fall-${j + 1}`, relevante, top, korrekt: r() < 0.6 };
      });
      faelle[0].top = [faelle[0].relevante[0], ...faelle[0].top].slice(0, 3);
      return { config: { k: randInt(r, 1, 3), faelle } };
    },
    emit(entry, index) {
      const p = `__rb${index}`;
      return [
        `${p}_cfg = ${pyLit(entry.config)}`,
        `__check('seeded baseline ${index}', run_baseline(${p}_cfg) == __ref_run_baseline(${p}_cfg))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'pipeline-freeze-report': {
    ...CASE_PAYLOADS['pipeline-freeze-report'],
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    refNames: ['kanon', 'run_pipeline'],
    // Word list plus min_laenge; the pin is computed in the emitted test via
    // the renamed __ref_kanon, and the tamper config appends a word so the
    // freeze pin misses -> AssertionError on both sides.
    draw(r) {
      const daten = shuffle(r, [...WORD_POOL]).slice(0, randInt(r, 4, 7));
      const tampered = [...daten, pick(r, WORD_POOL)];
      return { daten, minLaenge: randInt(r, 3, 7), tampered };
    },
    emit(entry, index) {
      const p = `__fp${index}`;
      return [
        `${p}_daten = ${pyLit(entry.daten)}`,
        `${p}_cfg = {"daten": ${p}_daten, "min_laenge": ${entry.minLaenge}, "pins": {"daten": hashlib.sha256(__ref_kanon(${p}_daten).encode("utf-8")).hexdigest()}}`,
        `__check('seeded pipeline ${index}', run_pipeline(${p}_cfg) == __ref_run_pipeline(${p}_cfg))`,
        `${p}_bad = {"daten": ${pyLit(entry.tampered)}, "min_laenge": ${entry.minLaenge}, "pins": {"daten": hashlib.sha256(__ref_kanon(${p}_daten).encode("utf-8")).hexdigest()}}`,
        `__check('seeded freeze ${index}', __raised(run_pipeline, ${p}_bad) == __raised(__ref_run_pipeline, ${p}_bad))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'reproduction-verdict-rules': {
    ...CASE_PAYLOADS['reproduction-verdict-rules'],
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    refNames: ['kanon', 'repro_check'],
    // readme (sometimes carrying an overclaim phrase), 1-3 runs that either
    // repeat one result (key order permuted) or diverge, and a phrase list.
    draw(r) {
      const phrasen = shuffle(r, [...PHRASEN_POOL]).slice(0, randInt(r, 1, 3));
      const readme = r() < 0.45
        ? `${pick(r, README_CLEAN)} Das System ist ${pick(r, phrasen)}.`
        : pick(r, README_CLEAN);
      const run = { metriken: { recall_at_k: randInt(r, 1, 9) / 10, answered: randInt(r, 1, 9) } };
      const count = randInt(r, 1, 3);
      const differ = count > 1 && r() < 0.45;
      const laeufe = [];
      for (let j = 0; j < count; j += 1) {
        if (differ && j === count - 1) {
          laeufe.push({ metriken: { recall_at_k: run.metriken.recall_at_k, answered: run.metriken.answered + 1 } });
        } else if (j % 2 === 1) {
          laeufe.push({ metriken: { answered: run.metriken.answered, recall_at_k: run.metriken.recall_at_k } });
        } else {
          laeufe.push({ metriken: { recall_at_k: run.metriken.recall_at_k, answered: run.metriken.answered } });
        }
      }
      return { readme, laeufe, phrasen };
    },
    emit(entry, index) {
      const p = `__rv${index}`;
      return [
        `${p}_laeufe = ${pyLit(entry.laeufe)}`,
        `__check('seeded repro ${index}', repro_check(${pyLit(entry.readme)}, ${p}_laeufe, ${pyLit(entry.phrasen)}) == __ref_repro_check(${pyLit(entry.readme)}, ${p}_laeufe, ${pyLit(entry.phrasen)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
}

const testsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function digestCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genDigestCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.draw(r, i));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: testsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
  };
}

export function solveDigestFamily(parameters) {
  const caseDef = Object.values(DIGEST_CASES).find((item) => digestCaseOk(parameters, item));
  if (!caseDef) throw new Error('Lauf-Digest-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const DIGEST_CONTRACT = {
  familyId: 'reproduce-run-digest-assert',
  familyGroup: 'reproduce-hash',
  summary: 'Sichert einen eingefrorenen Lauf-Digest gegen stille Abweichungen.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'run-digest-assert', propertyTest: false },
    { caseId: 'pipeline-freeze-report', propertyTest: false },
    { caseId: 'reproduction-verdict-rules', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-python-functions', 'c-research-capstone'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateDigestFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = DIGEST_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genDigestCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...DIGEST_CONTRACT, generate: generateDigestFamily, solve: solveDigestFamily };

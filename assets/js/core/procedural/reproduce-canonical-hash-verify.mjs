// Procedural family reproduce-canonical-hash-verify: the task text, starter
// code and reference solver stay fixed; the seed draws fresh golden-set
// entries (id/antwort/quellen) that get appended to the curated base test
// block as literal __check lines. The expected digest is recomputed inline
// through the canonical json.dumps + sha256 pipeline (never a precomputed
// literal), and a renamed __ref copy of the solver oracles the whole result
// dict. Mirrors the capsule recipe of formula-descriptive-stats-numpy.mjs.

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

const PACKAGES = [];

// Verbatim case payloads extracted from content/families/reproduce-canonical-hash-verify.json.
const CASE_PAYLOADS = {
  'canonical-hash-verify': {
    starterCode: "import hashlib\nimport json\n\n\ndef build_golden(items):\n    \"\"\"{'n': .., 'ids': .., 'sha256': ..} mit kanonischer Serialisierung und sha256 darueber.\"\"\"\n    ...\n\n",
    baseTests: "GOLDEN = [\n    {\"id\": \"faq-03\", \"antwort\": \"Die Lieferzeit betraegt 3 Werktage.\", \"quellen\": [\"faq-3\"]},\n    {\"id\": \"faq-11\", \"antwort\": \"Die Frist endet nach 30 Tagen.\", \"quellen\": [\"vertrag-1\"]},\n    {\"id\": \"vertrag-02\", \"antwort\": \"Der Vertrag laeuft 12 Monate.\", \"quellen\": [\"vertrag-1\"]},\n]\na = build_golden(GOLDEN)\nb = build_golden(list(reversed(GOLDEN)))\n__check('anzahl und ids', a[\"n\"] == 3 and a[\"ids\"] == [\"faq-03\", \"faq-11\", \"vertrag-02\"])\n__check('reihenfolge-invarianz', a == b)\nveraendert = [dict(GOLDEN[0]), dict(GOLDEN[1]), dict(GOLDEN[2])]\nveraendert[1] = dict(GOLDEN[1])\nveraendert[1][\"antwort\"] = \"Die Frist endet nach 14 Tagen.\"\n__check('aenderungssensitiv', build_golden(veraendert)[\"sha256\"] != a[\"sha256\"])\n__check('exakter hash', a[\"sha256\"] == \"ef6c223d1f4463f5f34a57685240c39a6bf79a9957cd2bf9b05734ad19eaa312\")\n__check('leeres set', build_golden([]) == {\"n\": 0, \"ids\": [], \"sha256\": hashlib.sha256(\"[]\".encode(\"utf-8\")).hexdigest()})\nprint(\"ok w34-e4\")",
    referenceSolver: "import hashlib\nimport json\n\n\ndef build_golden(items):\n    kanonisch = json.dumps(sorted(items, key=lambda e: e[\"id\"]), sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n    return {\"n\": len(items), \"ids\": sorted(e[\"id\"] for e in items), \"sha256\": hashlib.sha256(kanonisch.encode(\"utf-8\")).hexdigest()}",
    prompt: "Implementiere das gehashte Golden Set. <code>build_golden(items)</code> erhält eine Liste von Einträgen mit <code>id</code> und weiteren Feldern (z. B. antwort, quellen). Kanonische Serialisierung: <code>json.dumps(sorted(items, key=lambda e: e[\"id\"]), sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))</code>; der sha256-Hash wird über die UTF-8-Bytes dieser Serialisierung gebildet. Rückgabe: <code>{\"n\": anzahl, \"ids\": sortierte ids, \"sha256\": hexdigest}</code>. Der Testcode bringt ein Golden Set mit und prüft Reihenfolge-Invarianz, Änderungssensitivität und den exakten Hash.",
    fullSolution: "import hashlib\nimport json\n\n\ndef build_golden(items):\n    kanonisch = json.dumps(sorted(items, key=lambda e: e[\"id\"]), sort_keys=True, ensure_ascii=False, separators=(\",\", \":\"))\n    return {\"n\": len(items), \"ids\": sorted(e[\"id\"] for e in items), \"sha256\": hashlib.sha256(kanonisch.encode(\"utf-8\")).hexdigest()}\n\n# exakter Fixture-Hash ef6c223d…eaa312; reversed() aendert ihn nicht, eine andere Gold-Antwort schon (lokal python3-verifiziert)",
  },
};

// Renames the module-level reference functions inside an emitted copy so the
// seeded block cannot collide with the learner's own definitions.
const refCopy = (source, names) => (
  names.reduce((text, name) => text.split(name).join(`__ref_${name}`), source)
);

// Serializes drawn data as Python literals (the pools stay quote-free ASCII,
// so the generated test block has no escaping hazards).
const py = (value) => {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean') return (value ? 'True' : 'False');
  if (typeof value === 'number') return `${value}`;
  if (Array.isArray(value)) return `[${value.map(py).join(', ')}]`;
  return `{${Object.entries(value).map(([key, v]) => `${py(key)}: ${py(v)}`).join(', ')}}`;
};

// Draw pools: ASCII German answers (ae/oe/ue style like the base fixture),
// id prefixes and quellen tags matching the w34-e4 domain.
const ANSWER_POOL = [
  'Die Lieferzeit betraegt 3 Werktage.',
  'Die Frist endet nach 30 Tagen.',
  'Der Vertrag laeuft 12 Monate.',
  'Die Garantie deckt Herstellungsfehler ab.',
  'Die Rueckgabe ist 14 Tage lang moeglich.',
  'Der Support antwortet innerhalb von 24 Stunden.',
  'Die Kuendigungsfrist betraegt 4 Wochen.',
  'Die Aktivierung erfolgt nach der Anmeldung.',
];

const SOURCE_POOL = ['faq-3', 'vertrag-1', 'vertrag-2', 'agb-7', 'handbuch-2'];

export const HASH_CASES = {
  'canonical-hash-verify': {
    difficulty: 'core',
    ...CASE_PAYLOADS['canonical-hash-verify'],
    refNames: ['build_golden'],
    // Golden set: 2-5 entries with unique ids drawn from prefix+number pairs.
    drawEntries(r) {
      const count = randInt(r, 2, 5);
      const prefixes = ['faq', 'vertrag', 'agb', 'handbuch'];
      const idPool = shuffle(
        r,
        prefixes.flatMap((p) => Array.from({ length: 12 }, (_, i) => `${p}-${String(i + 1).padStart(2, '0')}`)),
      );
      return idPool.slice(0, count).map((id) => ({
        id,
        antwort: pick(r, ANSWER_POOL),
        quellen: shuffle(r, SOURCE_POOL).slice(0, randInt(r, 1, 2)),
      }));
    },
    extraCount: 3,
  },
};

// Appends the seeded literal checks: the drawn golden set is concrete in the
// test string, the digest expectation is recomputed through the canonical
// serialization (sorted by id, sort_keys, compact separators, utf-8) and the
// whole result dict is compared against the renamed reference copy.
function seededChecks(seedCase, index) {
  const items = `__sd${index}_items`;
  const got = `__sd${index}_got`;
  const sortedIds = py([...seedCase.entries.map((e) => e.id)].sort());
  return [
    `${items} = ${py(seedCase.entries)}`,
    `${got} = build_golden(${items})`,
    `__check('seeded n ${index}', ${got}["n"] == ${seedCase.entries.length})`,
    `__check('seeded ids ${index}', ${got}["ids"] == ${sortedIds})`,
    `__check('seeded order ${index}', build_golden(list(reversed(${items}))) == ${got})`,
    `__check('seeded hash ${index}', ${got}["sha256"] == hashlib.sha256(json.dumps(sorted(${items}, key=lambda e: e["id"]), sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest())`,
    `__check('seeded ref ${index}', ${got} == __ref_build_golden(${items}))`,
  ].join('\n');
}

// The renamed reference copy is emitted once at the top of the seeded block;
// all per-draw checks call into it.
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function hashCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genHashCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => ({
    entries: caseDef.drawEntries(r),
  }));
  return {
    parameters: {
      packages: PACKAGES,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
  };
}

export function solveHashFamily(parameters) {
  const caseDef = Object.values(HASH_CASES).find((item) => hashCaseOk(parameters, item));
  if (!caseDef) throw new Error('Golden-Hash-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const HASH_CONTRACT = {
  familyId: 'reproduce-canonical-hash-verify',
  familyGroup: 'reproduce-hash',
  summary: 'Prüft einen kanonischen Hash als unveränderlichen Referenzpunkt einer Baseline.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'canonical-hash-verify', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-python-functions', 'c-research-capstone'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateHashFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = HASH_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genHashCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...HASH_CONTRACT, generate: generateHashFamily, solve: solveHashFamily };

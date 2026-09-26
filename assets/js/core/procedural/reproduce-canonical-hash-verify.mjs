// Procedural family reproduce-canonical-hash-verify: the task text, starter
// code and reference solver stay fixed; the seed draws fresh golden-set
// entries (id/antwort/quellen) that get appended to the curated base test
// block as literal __check lines. The expected digest is recomputed inline
// through the canonical json.dumps + sha256 pipeline (never a precomputed
// literal), and a renamed __ref copy of the solver oracles the whole result
// dict. Mirrors the capsule recipe of formula-descriptive-stats-numpy.mjs.

import { refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/reproduce-canonical-hash-verify.json' with { type: 'json' };

const PACKAGES = [];

// Verbatim case payloads extracted from content/families/reproduce-canonical-hash-verify.json.
const CASE_PAYLOADS = {
  'canonical-hash-verify': {
    },
};

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
    draw(r) {
      const count = randInt(r, 2, 5);
      const prefixes = ['faq', 'vertrag', 'agb', 'handbuch'];
      const idPool = shuffle(
        r,
        prefixes.flatMap((p) => Array.from({ length: 12 }, (_, i) => `${p}-${String(i + 1).padStart(2, '0')}`)),
      );
      return {
        entries: idPool.slice(0, count).map((id) => ({
          id,
          antwort: pick(r, ANSWER_POOL),
          quellen: shuffle(r, SOURCE_POOL).slice(0, randInt(r, 1, 2)),
        })),
      };
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
};

// The renamed reference copy is emitted once at the top of the seeded block;
// all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: HASH_CONTRACT,
  cases: HASH_CASES,
  shapeError: 'Golden-Hash-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
  },
  defaultPackages: PACKAGES,
});


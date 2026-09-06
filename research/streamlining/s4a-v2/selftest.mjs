import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Targeted S4A-v2 self-test (Block A stop-gate): proves the taxonomy schema
// compiles in strict Ajv mode, that _example.json covers the atomic and the
// composite entry form, and that the fail-closed assembler rules (entry forms,
// archetype status, composite references, council refs, naming, registry,
// persistence) actually reject the broken counter-cases. Run:
//   node research/streamlining/s4a-v2/selftest.mjs

const analysisDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(analysisDir, '../../..');
const require = createRequire(join(root, 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error.message.split('\n')[0]}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mustThrow(fn, needle) {
  try {
    fn();
  } catch (error) {
    if (needle && !error.message.includes(needle)) throw new Error(`falscher Fehler: ${error.message.split('\n')[0]}`);
    return;
  }
  throw new Error('erwarteter Fehler blieb aus');
}

function compileSchema() {
  const schema = JSON.parse(readFile(join(analysisDir, 'taxonomy.schema.json')));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  return validate;
}

function readFile(file) {
  return readFileSyncText(file);
}

function readFileSyncText(file) {
  return require('node:fs').readFileSync(file, 'utf8');
}

// --- 1. Schema strict compile + example shard (both forms) ---
const validate = compileSchema();

check('Schema kompiliert mit Ajv strict (2020-12)', () => {
  assert(typeof validate === 'function', 'compile fehlgeschlagen');
});

const exampleShard = JSON.parse(readFile(join(analysisDir, 'shards', '_example.json')));

check('_example.json ist schema-valide (atomic + composite + Beispielshard)', () => {
  const valid = validate(exampleShard);
  assert(valid, `Schema-Verletzung: ${JSON.stringify(validate.errors, null, 2)}`);
  const forms = exampleShard.entries.map((entry) => entry.entryForm);
  assert(forms.includes('atomic-case') && forms.includes('composite-placement'), `Beispiel deckt nicht beide Formen: ${forms.join(', ')}`);
});

function mutate(entry, patch) {
  return JSON.parse(JSON.stringify({ ...entry, ...patch }));
}

const atomicExample = exampleShard.entries[0];
const compositeExample = exampleShard.entries[2];

check('Schema lehnt Composite mit zu wenigen Komponenten ab', () => {
  const broken = mutate(compositeExample, {});
  broken.compositePlacement.components = [broken.compositePlacement.components[0]];
  const shard = shardWith(broken);
  assert(!validate(shard), 'minItems=2 nicht erzwungen');
});

check('Schema lehnt atomic-case mit compositePlacement ab', () => {
  const broken = mutate(atomicExample, { compositePlacement: compositeExample.compositePlacement });
  assert(!validate(shardWith(broken)), 'Form-Mischung zugelassen');
});

check('Schema lehnt composite-placement mit eigener CognitiveFamily ab', () => {
  const broken = mutate(compositeExample, { cognitiveFamily: atomicExample.cognitiveFamily });
  assert(!validate(shardWith(broken)), 'Composite mit Familie zugelassen');
});

check('Schema verlangt councilReviewRef bei resolved-by-review-council', () => {
  const broken = mutate(atomicExample, {});
  broken.uncertaintyDispositions[0].disposition = 'resolved-by-review-council';
  broken.uncertaintyDispositions[0].councilReviewRef = undefined;
  delete broken.uncertaintyDispositions[0].councilReviewRef;
  assert(!validate(shardWith(broken)), 'Council-Disposition ohne Referenz zugelassen');
});

check('Schema verlangt note bei retire-blocked und mergeInto bei merge-map-required', () => {
  const noNote = mutate(compositeExample, { persistence: { status: 'retire-blocked' } });
  assert(!validate(shardWith(noNote)), 'retire-blocked ohne note zugelassen');
  const noMergeInto = mutate(atomicExample, { persistence: { status: 'merge-map-required' } });
  assert(!validate(shardWith(noMergeInto)), 'merge-map-required ohne mergeInto zugelassen');
});

function shardWith(...entries) {
  return { shardId: 'foundations', baselineCommit: '1998d57', entries };
}

// --- 2. Assembler rule functions on synthetic records ---
const assembler = await import('./assemble-v2.mjs');

const archetypeById = new Map([
  ['numeric-exact', { id: 'numeric-exact', status: 'active', graderAdapter: 'deterministic', expectedSourceCount: 1 }],
  ['numbas-exam-retired', { id: 'numbas-exam-retired', status: 'historical-retired', graderAdapter: null, expectedSourceCount: 1 }],
]);

function atomicRecord(overrides = {}) {
  return {
    entry: {
      sourceId: 'w01-e1',
      entryForm: 'atomic-case',
      taskArchetype: { archetypeId: 'numeric-exact' },
      caseTemplate: { caseId: 'c1', graderAdapter: 'deterministic', authorityMode: 'seeded' },
      persistence: { status: 'preserve-id' },
      placement: { lessonIds: [], moduleHint: 'x', reviewEligible: true },
      uncertaintyDispositions: [],
      ...overrides,
    },
    domain: 'foundations',
  };
}

function compositeRecord(overrides = {}) {
  return {
    entry: {
      sourceId: 'w05-e7x',
      entryForm: 'composite-placement',
      compositePlacement: {
        summary: 'x'.repeat(12),
        status: 'retired',
        historicalArchetypeId: 'numbas-exam-retired',
        components: [
          { sourceId: 'w01-e1', role: 'erste Komponente' },
          { sourceId: 'w01-e2', role: 'zweite Komponente' },
        ],
        sequenceContract: 'y'.repeat(12),
      },
      persistence: { status: 'retire-blocked', note: 'retired nach S1B-Freigabe' },
      placement: { lessonIds: [], moduleHint: 'x', reviewEligible: false },
      uncertaintyDispositions: [],
      ...overrides,
    },
    domain: 'foundations',
  };
}

check('Form-Regeln: gueltiger atomic-case und gueltiger retired composite bestehen', () => {
  assembler.validateFormRules([atomicRecord(), compositeRecord()], archetypeById);
});

check('Form-Regeln: atomic-case an historical-retired Archetyp wird abgelehnt', () => {
  const record = atomicRecord({ taskArchetype: { archetypeId: 'numbas-exam-retired' } });
  mustThrow(() => assembler.validateFormRules([record], archetypeById), 'nicht-aktiven Archetyp');
});

check('Form-Regeln: Graderadapter-Mismatch zwischen CaseTemplate und Archetyp wird abgelehnt', () => {
  const record = atomicRecord({ caseTemplate: { caseId: 'c1', graderAdapter: 'pyodide', authorityMode: 'seeded' } });
  mustThrow(() => assembler.validateFormRules([record], archetypeById), 'passt nicht zum Archetyp-Adapter');
});

check('Form-Regeln: retire-blocked atomic-case wird abgelehnt (kein aktiver Grader vorgetaeuscht)', () => {
  const record = atomicRecord({ persistence: { status: 'retire-blocked', note: 'S1B-Freigabe' } });
  mustThrow(() => assembler.validateFormRules([record], archetypeById), 'composite-placement');
});

check('Form-Regeln: retired composite mit reviewEligible=true wird abgelehnt', () => {
  const record = compositeRecord({ placement: { lessonIds: [], moduleHint: 'x', reviewEligible: true } });
  mustThrow(() => assembler.validateFormRules([record], archetypeById), 'reviewEligible');
});

check('Form-Regeln: retired composite ohne retire-blocked-Persistenz wird abgelehnt', () => {
  const record = compositeRecord({ persistence: { status: 'preserve-id' } });
  mustThrow(() => assembler.validateFormRules([record], archetypeById), 'retire-blocked');
});

check('Form-Regeln: aktive historicalArchetypeId wird abgelehnt', () => {
  const entry = compositeRecord().entry;
  entry.compositePlacement.historicalArchetypeId = 'numeric-exact';
  mustThrow(() => assembler.validateFormRules([{ entry, domain: 'foundations' }], archetypeById), 'nicht historical-retired');
});

const secondAtomic = atomicRecord({
  sourceId: 'w01-e2',
  taskArchetype: { archetypeId: 'numeric-exact' },
});

check('Composite-Referenzen: gueltige Komposition besteht', () => {
  assembler.resolveCompositeReferences([atomicRecord(), secondAtomic, compositeRecord()]);
});

check('Composite-Referenzen: haengende Komponente wird abgelehnt', () => {
  const entry = compositeRecord().entry;
  entry.compositePlacement.components[1].sourceId = 'w99-e9';
  mustThrow(() => assembler.resolveCompositeReferences([atomicRecord(), { entry, domain: 'foundations' }]), 'existiert nicht');
});

check('Composite-Referenzen: Selbstbezug und Komposit-Komponente werden abgelehnt', () => {
  const selfRef = compositeRecord().entry;
  selfRef.compositePlacement.components[0].sourceId = selfRef.sourceId;
  mustThrow(() => assembler.resolveCompositeReferences([atomicRecord(), secondAtomic, { entry: selfRef, domain: 'foundations' }]), 'sich selbst');
  const nested = compositeRecord().entry;
  const otherComposite = compositeRecord({ sourceId: 'w06-e1x' }).entry;
  otherComposite.persistence = { status: 'preserve-id' };
  nested.compositePlacement.components[0].sourceId = 'w06-e1x';
  mustThrow(() => assembler.resolveCompositeReferences([atomicRecord(), secondAtomic, { entry: otherComposite, domain: 'foundations' }, { entry: nested, domain: 'foundations' }]), 'kein atomic-case');
});

check('Namenspruefung: stille Varianten (gleiches Token-Multiset) werden abgelehnt', () => {
  const families = new Map([['trace-assignment-state', {}], ['assignment-state-trace', {}]]);
  mustThrow(() => assembler.checkFamilyNaming(families), 'Token-Multiset');
  assembler.checkFamilyNaming(new Map([['trace-assignment-state', {}]]));
});

const registry = {
  byFamilyId: new Map([
    ['trace-assignment-state', {
      familyId: 'trace-assignment-state',
      familyGroup: 'trace-state',
      summary: 's'.repeat(20),
      membershipEvidence: { solutionPath: 'p', referenceModel: 'm', errorHypotheses: ['h1'] },
      expectedMemberCount: 1,
    }],
  ]),
};

function derivedFamilies() {
  return new Map([
    ['trace-assignment-state', {
      familyGroup: 'trace-state',
      summary: 's'.repeat(20),
      solutionPath: 'p',
      referenceModel: 'm',
      errorHypotheses: ['h1'],
      members: ['w01-e1'],
      domains: new Set(['foundations']),
    }],
  ]);
}

check('Registry: uebereinstimmende Familie besteht', () => {
  assembler.checkRegistryFamilies(derivedFamilies(), registry);
});

check('Registry: count- und Vertraegsabweichungen werden abgelehnt', () => {
  const families = derivedFamilies();
  families.get('trace-assignment-state').members.push('w01-e2');
  mustThrow(() => assembler.checkRegistryFamilies(families, registry), 'erwartet 1');
  const drifted = derivedFamilies();
  drifted.get('trace-assignment-state').summary = 'anders';
  mustThrow(() => assembler.checkRegistryFamilies(drifted, registry), 'summary');
});

check('Registry: neue Familie nur mit --allow-new-families, ungenutzte Registry-Familie reconcilieren', () => {
  const families = new Map([...derivedFamilies(), ['new-family', { familyGroup: 'g', summary: 's'.repeat(20), solutionPath: 'p', referenceModel: 'm', errorHypotheses: ['h'], members: ['w01-e2'], domains: new Set(['foundations']) }]]);
  mustThrow(() => assembler.checkRegistryFamilies(families, registry), 'neue Familie');
  const audit = assembler.checkRegistryFamilies(families, registry, { allowNewFamilies: true });
  assert(audit.newFamilies.includes('new-family'), 'neue Familie nicht gemeldet');
  const emptyRegistry = { byFamilyId: registry.byFamilyId };
  const noLongerUsed = new Map();
  mustThrow(() => assembler.checkRegistryFamilies(noLongerUsed, emptyRegistry), 'ohne Shard-Mitglieder');
});

check('Archetyp-Sitze: historischer Archetyp darf nicht gebunden sein, aktive muessen exakt sitzen', () => {
  const seats = new Map([['numeric-exact', { id: 'numeric-exact', status: 'active', graderAdapter: 'deterministic', expectedSourceCount: 2 }], ['numbas-exam-retired', archetypeById.get('numbas-exam-retired')]]);
  assembler.validateArchetypeSeats([atomicRecord(), secondAtomic], seats);
  mustThrow(() => assembler.validateArchetypeSeats([atomicRecord()], seats), 'erwartet 2');
  const retiredBound = atomicRecord({ taskArchetype: { archetypeId: 'numbas-exam-retired' } });
  mustThrow(() => assembler.validateArchetypeSeats([atomicRecord(), retiredBound], seats), 'historical-retired');
});

check('Persistenz: retire-blocked note muss die S1B-Freigabe nennen', () => {
  const retireEntry = compositeRecord({ sourceId: 'w05-e7' }).entry;
  const corpus = [
    ...Array.from({ length: 262 }, () => atomicRecord().entry),
    ...['w05-e11', 'w05-e12', 'w05-e13', 'w17-e2', 'w37-e1'].map((id) => atomicRecord({ sourceId: id, persistence: { status: 'merge-map-required', mergeInto: 'target' } }).entry),
    retireEntry,
  ];
  assembler.validatePersistence(corpus);
  const brokenNote = { ...retireEntry, persistence: { status: 'retire-blocked', note: 'einfach so' } };
  const minimal = [...Array.from({ length: 262 }, () => atomicRecord().entry), ...['w05-e11', 'w05-e12', 'w05-e13', 'w17-e2', 'w37-e1'].map((id) => atomicRecord({ sourceId: id, persistence: { status: 'merge-map-required', mergeInto: 'target' } }).entry), brokenNote];
  mustThrow(() => assembler.validatePersistence(minimal), 'S1B');
});

check('Council-Referenzen: Datei muss existieren und die sourceId nennen', () => {
  const dir = mkdtempSync(join(tmpdir(), 's4a-v2-selftest-'));
  try {
    const reviewsDir = join(dir, 'reviews');
    mkdirSync(reviewsDir);
    writeFileSync(join(reviewsDir, 'foundations-review.md'), 'Review behandelt w01-e1 ausdruecklich.\n');
    const good = atomicRecord();
    good.entry.humanReview = { required: true, reasons: ['r'], disposition: 'resolved-by-review-council', councilReviewRef: 'reviews/foundations-review.md' };
    assembler.checkCouncilReviewRefs([good], dir);
    const missing = atomicRecord();
    missing.entry.humanReview = { required: true, reasons: ['r'], disposition: 'resolved-by-review-council', councilReviewRef: 'reviews/missing-review.md' };
    mustThrow(() => assembler.checkCouncilReviewRefs([missing], dir), 'existiert nicht');
    const silent = atomicRecord({ sourceId: 'w77-e7' });
    silent.entry.humanReview = { required: true, reasons: ['r'], disposition: 'resolved-by-review-council', councilReviewRef: 'reviews/foundations-review.md' };
    mustThrow(() => assembler.checkCouncilReviewRefs([silent], dir), 'nicht ausdruecklich');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check('Archetyp-Registry Laadeprobe: 10 Archetypen mit Status, Bestandssumme 268', () => {
  const { byId } = assembler.loadArchetypeRegistry(analysisDir);
  assert(byId.size === 10, `10 erwartet, ${byId.size} erhalten`);
  assert(byId.get('numbas-exam-retired').status === 'historical-retired', 'numbas-exam-retired muss historical-retired sein');
  assert([...byId.values()].every((archetype) => archetype.status === 'active' || archetype.status === 'historical-retired'), 'Status fehlt');
});

check('Familien-Registry Laadeprobe: Ableitungskonsistenz gegen Shards', () => {
  // Seit Block E schreibt assemble-v2.mjs --write memberSourceIds/domains/
  // memberCount aus den Shards in die Registry (family-model Abschnitt 5).
  // Dieser Check prueft Konsistenz der Ableitung statt Abwesenheit der Felder.
  const { document, byFamilyId } = assembler.loadFamilyRegistry(analysisDir);
  assert(byFamilyId.size > 0, 'Registry ist leer');
  const derived = new Map();
  const shardFiles = readdirSync(join(analysisDir, 'shards')).filter((file) => file.endsWith('.json') && !file.startsWith('_'));
  for (const file of shardFiles) {
    const shard = JSON.parse(readFile(join(analysisDir, 'shards', file)));
    for (const entry of shard.entries) {
      if (entry.entryForm !== 'atomic-case') continue;
      const id = entry.cognitiveFamily.familyId;
      if (!derived.has(id)) derived.set(id, { members: [], domains: new Set() });
      derived.get(id).members.push(entry.sourceId);
      derived.get(id).domains.add(shard.shardId);
    }
  }
  const atomicCount = [...derived.values()].reduce((sum, der) => sum + der.members.length, 0);
  const seatSum = document.families.reduce((sum, family) => sum + family.expectedMemberCount, 0);
  assert(seatSum === atomicCount, `Erwartungssumme ${seatSum} != atomic-cases ${atomicCount}`);
  for (const family of document.families) {
    const der = derived.get(family.familyId);
    assert(der, `${family.familyId} ohne Shard-Mitglieder`);
    assert(family.memberCount === der.members.length, `${family.familyId}: memberCount ${family.memberCount} != ${der.members.length}`);
    assert(JSON.stringify([...family.memberSourceIds].sort()) === JSON.stringify([...der.members].sort()), `${family.familyId}: memberSourceIds veraltet`);
    assert(JSON.stringify([...family.domains].sort()) === JSON.stringify([...der.domains].sort()), `${family.familyId}: domains veraltet`);
    assert(family.expectedMemberCount === der.members.length, `${family.familyId}: expectedMemberCount folgt der Ableitung nicht`);
  }
  for (const id of derived.keys()) assert(byFamilyId.has(id), `${id} fehlt in der Registry`);
});

check('Assembler-Hauptlauf ohne echte Shards meldet ausschliesslich die sieben fehlenden Shards', () => {
  const fs = require('node:fs');
  const shardsDir = join(analysisDir, 'shards');
  const domains = ['foundations', 'linear-algebra', 'data-ml', 'deep-learning', 'transformer-llm', 'genai-systems', 'research-capstone'];
  const stash = new Map();
  try {
    for (const domain of domains) stash.set(domain, fs.readFileSync(join(shardsDir, `${domain}.json`), 'utf8'));
    for (const domain of domains) fs.rmSync(join(shardsDir, `${domain}.json`));
    let stderr = '';
    try {
      stderr = execFileSync('node', [join(analysisDir, 'assemble-v2.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      stderr = `${error.stdout || ''}${error.stderr || ''}`;
    }
    assert(stderr.includes('Noch keine S4A-v2-Shards'), `unerwartete Ausgabe: ${stderr.slice(0, 200)}`);
    for (const domain of ['foundations.json', 'linear-algebra.json', 'data-ml.json', 'deep-learning.json', 'transformer-llm.json', 'genai-systems.json', 'research-capstone.json']) {
      assert(stderr.includes(domain), `erwarteter fehlender Shard ${domain} nicht genannt`);
    }
  } finally {
    for (const [domain, content] of stash) fs.writeFileSync(join(shardsDir, `${domain}.json`), content);
  }
});

console.log(`\nSelbsttest: ${passed} bestanden, ${failed} fehlgeschlagen.`);
process.exitCode = failed === 0 ? 0 : 1;

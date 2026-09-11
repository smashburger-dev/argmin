// Procedural family trace-stub-doc-sentence-select: capsule gates.
// Run: node --test tests/procedural_stub_doc_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOC_BANK,
  FAMILY_SPEC,
  MISS_QUERIES,
  STUB_DOC_CASES,
  STUB_DOC_CONTRACT,
  genStubDocCase,
  generateStubDocFamily,
  missCandidates,
  runStub,
  solveStubDocFamily,
  stubDocCaseOk,
} from '../assets/js/core/procedural/trace-stub-doc-sentence-select.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['stub-doc-sentence-select'];

// Independent JS mirror of the stub: terms are whitespace-split lowercase
// words of length >= 4 (punctuation stays attached), the best document is the
// FIRST argmax of the overlap scores, the answer is the first sentence that
// shares a term, and the all-zero case returns the constant miss string.
const refTerme = (text) => new Set(
  String(text).toLowerCase().split(/\s+/).filter((w) => w.length >= 4),
);
const refStub = (query, docs) => {
  const q = refTerme(query);
  const scores = docs.map((doc) => [...refTerme(doc)].filter((w) => q.has(w)).length);
  const best = scores.indexOf(Math.max(...scores));
  if (scores[best] === 0) return 'kein treffer';
  for (const satz of docs[best].split('.')) {
    if ([...refTerme(satz)].some((w) => q.has(w))) return satz.trim();
  }
  return docs[best].split('.')[0].trim();
};

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/trace-stub-doc-sentence-select.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    const def = STUB_DOC_CASES[caseId];
    assert.equal(body.parameters.snippet, def.baseSnippet, `${caseId}: base snippet verbatim`);
    assert.deepEqual(body.expected, { kind: 'output-lines', output: def.baseOutput }, `${caseId}: expected form`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.baseSolution, `${caseId}: solution verbatim`);
    assert.deepEqual(body.competencyIds, def.competencyIds, `${caseId}: competencies verbatim`);
  }
  // base oracle self-consistency: entry 0 of the bank is the curated scenario
  assert.equal(runStub('Wie erfolgt der Versand?', DOC_BANK[0].docs), 'Der Versand erfolgt mit DHL');
  assert.equal(runStub('Gibt es einen Parkplatz?', DOC_BANK[0].docs), 'kein treffer');
  assert.equal(refStub('Wie erfolgt der Versand?', DOC_BANK[0].docs), 'Der Versand erfolgt mit DHL');
});

test('capsule shape: generated parameters satisfy stubDocCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = STUB_DOC_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genStubDocCase(seed, caseId, def);
      assert.ok(stubDocCaseOk(generated.parameters, caseId, def), `${caseId}:${seed}: shape`);
      assert.equal(generated.parameters.caseId, caseId);
      assert.equal(generated.parameters.difficulty, def.difficulty);
      assert.equal(generated.expected.kind, 'output-lines', 'expected form like base case');
      assert.equal(generated.prompt, def.prompt);
      assert.ok(generated.parameters.snippet.includes(`print(antwort("${generated.parameters.queryHit}", DOCS))`), 'snippet carries hit query');
      assert.ok(generated.parameters.snippet.includes(`print(antwort("${generated.parameters.queryMiss}", DOCS))`), 'snippet carries miss query');
      for (const docText of generated.parameters.docs) {
        assert.ok(generated.parameters.snippet.includes(`"${docText}"`), 'snippet carries doc sentence');
      }
    }
  }
});

test('expected output: solver recomputes the prediction deterministically', () => {
  for (const caseId of CASE_IDS) {
    const def = STUB_DOC_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genStubDocCase(seed, caseId, def);
      const { docs, queryHit, queryMiss } = generated.parameters;
      const want = `${refStub(queryHit, docs)}\n${refStub(queryMiss, docs)}`;
      assert.equal(generated.expected.output, want, `${caseId}:${seed}: expected output`);
      assert.deepEqual(solveStubDocFamily(generated.parameters), { output: want }, `${caseId}:${seed}: solve output`);
      assert.equal(runStub(queryHit, docs), refStub(queryHit, docs));
      assert.equal(runStub(queryMiss, docs), refStub(queryMiss, docs));
      // the first print is always a copied sentence, the second the miss string
      const [hitLine, missLine] = generated.expected.output.split('\n');
      assert.notEqual(hitLine, 'kein treffer', 'authored hit query scores');
      assert.ok(docs.some((doc) => doc.includes(hitLine)), 'hit answer is a copied doc sentence');
      assert.equal(missLine, 'kein treffer', 'filtered miss query scores zero');
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = STUB_DOC_CASES['stub-doc-sentence-select'];
  const seenDocs = new Set();
  const seenHits = new Set();
  const seenMisses = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genStubDocCase(seed, 'stub-doc-sentence-select', def);
    const { docs, queryHit, queryMiss } = generated.parameters;
    const entry = DOC_BANK.find((item) => item.docs.length === docs.length
      && item.docs.every((d, i) => d === docs[i]));
    assert.ok(entry, `docs must be a bank entry: ${docs}`);
    assert.ok(entry.hits.includes(queryHit), `hit query authored for the pair: ${queryHit}`);
    assert.ok(MISS_QUERIES.includes(queryMiss), `miss query from the pool: ${queryMiss}`);
    assert.ok(missCandidates(docs).includes(queryMiss), `miss genuinely scores zero: ${queryMiss}`);
    seenDocs.add(docs[0]);
    seenHits.add(queryHit);
    seenMisses.add(queryMiss);
  }
  // the draw reaches beyond the curated base scenario
  assert.ok(seenDocs.size >= 4, `doc pairs covered: ${seenDocs.size}`);
  assert.ok(seenHits.size >= 6, `hit queries covered: ${seenHits.size}`);
  assert.ok(seenMisses.size >= 4, `miss queries covered: ${seenMisses.size}`);
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = STUB_DOC_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateStubDocFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = STUB_DOC_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genStubDocCase(seed, caseId, def), genStubDocCase(seed, caseId, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve reproduces the generated expected output', () => {
  for (const caseId of CASE_IDS) {
    const def = STUB_DOC_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateStubDocFamily({ seed, caseId, difficulty: def.difficulty });
      assert.equal(solveStubDocFamily(generated.parameters).output, generated.expected.output);
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(STUB_DOC_CONTRACT.familyId, 'trace-stub-doc-sentence-select');
  assert.equal(STUB_DOC_CONTRACT.authorityMode, 'seeded');
  assert.equal(STUB_DOC_CONTRACT.taskArchetype, 'output-predict-lines');
  assert.equal(STUB_DOC_CONTRACT.activityType, 'predict-output');
  assert.equal(STUB_DOC_CONTRACT.graderId, 'deterministic');
  assert.equal(STUB_DOC_CONTRACT.masteryEligible, true);
  assert.deepEqual(STUB_DOC_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(STUB_DOC_CONTRACT.competencyIds, ['c-genai-prototype', 'c-python-reading']);
  assert.deepEqual(STUB_DOC_CONTRACT.caseTypes, [
    { caseId: 'stub-doc-sentence-select', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateStubDocFamily);
  assert.equal(FAMILY_SPEC.solve, solveStubDocFamily);
  assert.throws(() => generateStubDocFamily({ seed: 0, caseId: 'stub-doc-sentence-select', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateStubDocFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateStubDocFamily({ seed: 0.5, caseId: 'stub-doc-sentence-select', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveStubDocFamily({}), /Kapselform/);
  const good = genStubDocCase(0, 'stub-doc-sentence-select', STUB_DOC_CASES['stub-doc-sentence-select']).parameters;
  assert.throws(() => solveStubDocFamily({ ...good, snippet: 'x' }), /Kapselform/);
});

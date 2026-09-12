// Shared capsule gates for the procedural single-choice and python-code
// families. Each family keeps a thin per-family *.test.mjs file that passes
// its module surface in; the gates themselves live here so the checks stay
// identical across families (anchor fidelity, capsule shape, distinct floor,
// determinism, leak/rotation, solver independence, contract errors).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadDoc = (familyId) => JSON.parse(readFileSync(join(root, 'content/families', `${familyId}.json`), 'utf8'));

const CHOICE_IDS = ['a', 'b', 'c', 'd'];

// Some modules take the caseId as a middle argument (genCase(seed, caseId, def),
// caseOk(params, caseId, def)); the suite adapts on declared arity.
const callGen = (fn, seed, caseId, def) => (fn.length >= 3 ? fn(seed, caseId, def) : fn(seed, def));
const callOk = (fn, params, caseId, def) => (fn.length >= 3 ? fn(params, caseId, def) : fn(params, def));

// Optional contract assertions absorbed from per-family tests.
function assertContractExtras(contract, { familyGroup, difficultyProfiles } = {}) {
  if (familyGroup !== undefined) assert.equal(contract.familyGroup, familyGroup);
  if (difficultyProfiles !== undefined) assert.deepEqual(contract.difficultyProfiles, difficultyProfiles);
}

// cases: [{ caseId, difficulty, competencyIds? }]
// mod: module namespace; capsules keyed by caseId or by difficulty.
// Parametrisierte Kapseln (makeChoiceCapsuleFamily) tragen Zahlen-/Parameter-
// Raeume statt einer gekeyten Textbank — bankabhaengige Gates laufen nur,
// wenn jeder Eintrag key/correct/wrong traegt. `leakCheck(prompt, text)` ersetzt
// den Default-Includes-Test fuer Familien mit numerischen Schluesseltexten.
const keyedBank = (capsule) => Array.isArray(capsule?.bank)
  && capsule.bank.every((entry) => typeof entry?.key === 'string'
    && typeof entry?.correct === 'string' && Array.isArray(entry?.wrong));

export function choiceCapsuleSuite(familyId, mod, cases, { distinctFloor = 40, familyGroup, difficultyProfiles, leakCheck } = {}) {
  const leak = leakCheck ?? ((prompt, text) => prompt.includes(text));
  const doc = loadDoc(familyId);
  const table = Object.entries(mod).find(([key, value]) => /CAPSULES/.test(key) && value && typeof value === 'object')?.[1];
  const contract = Object.values(mod).find((value) => value?.familyId === familyId && value.authorityMode === 'seeded');
  const capsuleFor = ({ caseId, difficulty }) => table?.[caseId] ?? table?.[difficulty];
  const names = Object.keys(mod);
  const pick = (re) => mod[names.find((name) => re.test(name))];
  const capsuleOk = pick(/CapsuleOk$/);
  const correctText = pick(/CorrectText$/);
  const genCapsule = pick(/^gen[A-Z].*Capsule$/);
  const generate = pick(/^generate[A-Z].*Family$/);
  const solve = pick(/^solve[A-Z].*Family$/);

  test('Orakel: Base-Eintrag reproduziert den JSON-Fall wörtlich', () => {
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      const capsule = capsuleFor(item);
      // Parametrisierte Kapseln haben kein Text-Bank-Orakel — deren Anker
      // deckt der Anker-Test unten plus die file-lokalen Orakel-Tabellen.
      if (!keyedBank(capsule)) continue;
      const base = capsule.bank.find((entry) => entry.key === 'base');
      assert.ok(base, `${item.caseId}: Base-Orakel fehlt`);
      assert.equal(base.prompt, body.prompt, `${item.caseId}: Prompt`);
      assert.equal(base.correct, body.choices.find((choice) => choice.correct).text, `${item.caseId}: Schlüsseltext`);
      assert.deepEqual(base.wrong, body.choices.filter((choice) => !choice.correct).map((choice) => choice.text), `${item.caseId}: Distraktoren`);
      assert.equal(base.solution, body.fullSolution, `${item.caseId}: Lösung`);
    }
  });

  test('Anker: Contract null, Fälle unverändert als Befund erhalten', () => {
    assert.equal(doc.contract, null);
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      assert.ok(body, `${item.caseId}: Anker fehlt`);
      assert.equal(body.choices.filter((choice) => choice.correct).length, 1, `${item.caseId}: genau eine korrekte Wahl`);
      assert.ok(body.prompt.length > 20 && body.fullSolution.length > 20, `${item.caseId}: Texte erhalten`);
    }
  });

  test('Kapseltabelle: Bank mit eindeutigen Keys und vier verschiedenen Optionen', () => {
    for (const item of cases) {
      const capsule = capsuleFor(item);
      if (!keyedBank(capsule)) continue;
      assert.ok(capsule.bank.length >= 10, `${item.caseId}: Bank ${capsule.bank.length}`);
      assert.equal(new Set(capsule.bank.map((entry) => entry.key)).size, capsule.bank.length, `${item.caseId}: Keys eindeutig`);
      for (const entry of capsule.bank) {
        assert.equal(entry.wrong.length, 3, `${item.caseId}:${entry.key}: drei Distraktoren`);
        assert.equal(new Set([entry.correct, ...entry.wrong]).size, 4, `${item.caseId}:${entry.key}: Optionen eindeutig`);
        assert.ok(entry.prompt.length > 20 && entry.solution.length > 20, `${item.caseId}:${entry.key}: Texte`);
      }
    }
  });

  test('Kapselform: 60 Seeds je Kapsel bestehen Shape, Choices und Schlüssel', () => {
    for (const item of cases) {
      const capsule = capsuleFor(item);
      for (let seed = 0; seed < 60; seed += 1) {
        const generated = callGen(genCapsule, seed, item.caseId, capsule);
        assert.ok(callOk(capsuleOk, generated.parameters, item.caseId, capsule), `${item.caseId}:${seed}: Kapselform`);
        if (keyedBank(capsule)) {
          assert.ok(capsule.bank.some((entry) => entry.key === generated.parameters.scenario), `${item.caseId}:${seed}: Szenario in Bank`);
        }
        assert.equal(generated.choices.length, 4, `${item.caseId}:${seed}: vier Wahlen`);
        assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${item.caseId}:${seed}: eindeutige Texte`);
        const correct = generated.choices.filter((choice) => choice.correct);
        assert.equal(correct.length, 1, `${item.caseId}:${seed}: genau eine korrekte Wahl`);
        assert.equal(correct[0].text, correctText(generated.parameters, capsule), `${item.caseId}:${seed}: Schlüsseltext`);
        assert.ok(generated.prompt.length > 20 && generated.fullSolution.length > 20, `${item.caseId}:${seed}: Texte`);
      }
    }
  });

  test(`Statistik über 200 Seeds: Distinct-Boden ${distinctFloor}, Leak/Rotation, Solver`, () => {
    for (const item of cases) {
      const seen = new Set();
      const counts = { a: 0, b: 0, c: 0, d: 0 };
      const byModulo = new Map();
      for (let seed = 0; seed < 200; seed += 1) {
        const generated = generate({ seed, caseId: item.caseId, difficulty: item.difficulty });
        const fingerprint = JSON.stringify([generated.prompt, generated.parameters, generated.choices]);
        seen.add(fingerprint);
        const correct = generated.choices.find((choice) => choice.correct);
        assert.ok(!leak(generated.prompt, correct.text, generated), `${item.caseId}:${seed}: Schlüssel im Prompt`);
        counts[correct.id] += 1;
        const bucket = seed % 8;
        if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
        byModulo.get(bucket).add(fingerprint);
        assert.deepEqual(solve(generated.parameters), { correctText: correct.text }, `${item.caseId}:${seed}: Solver`);
      }
      assert.ok(seen.size >= distinctFloor, `${item.caseId}: nur ${seen.size} distinct`);
      for (const [id, count] of Object.entries(counts)) {
        assert.ok(count >= 40 && count <= 60, `${item.caseId}: Position ${id} nur ${count}x`);
      }
      for (const [bucket, instances] of byModulo) {
        assert.ok(instances.size >= 10, `${item.caseId}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
      }
    }
    for (const item of cases) {
      const capsule = capsuleFor(item);
      if (keyedBank(capsule)) {
        const base = capsule.bank.find((entry) => entry.key === 'base');
        assert.deepEqual(
          solve({ caseId: item.caseId, scenario: 'base' }),
          { correctText: base.correct },
          `${item.caseId}: Solver ohne expected/difficulty`,
        );
      }
    }
    assert.throws(() => solve({ caseId: 'nope' }), /Unbekannter Fall/);
    assert.throws(() => solve({ caseId: cases[0].caseId, scenario: 'nope' }), /Kapselform/);
    assert.throws(() => solve({}), /Unbekannter Fall/);
  });

  test('Determinismus: gleiche Seeds reproduzieren identisch, negative Seeds gültig', () => {
    for (const item of cases) {
      const capsule = capsuleFor(item);
      for (let seed = -10; seed < 10; seed += 1) {
        assert.deepEqual(callGen(genCapsule, seed, item.caseId, capsule), callGen(genCapsule, seed, item.caseId, capsule), `${item.caseId}:${seed}: deterministisch`);
        assert.ok(callOk(capsuleOk, callGen(genCapsule, seed, item.caseId, capsule).parameters, item.caseId, capsule), `${item.caseId}:${seed}: Kapselform`);
      }
      const viaFamily = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.deepEqual(viaFamily, generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty }), `${item.caseId}: Family deterministisch`);
    }
  });

  test('Familien-Block: Contract-Felder, Kompetenzen je Fall, Dispatch, Fehlerpfade', () => {
    assert.equal(contract.familyId, familyId);
    assert.equal(contract.authorityMode, 'seeded');
    assert.equal(mod.FAMILY_SPEC.activityType, 'single-choice');
    assert.equal(mod.FAMILY_SPEC.graderId, 'deterministic');
    assertContractExtras(contract, { familyGroup, difficultyProfiles });
    assert.equal(typeof contract.taskArchetype, 'string');
    const expectedMastery = doc.cases.some((entry) => entry.graderId !== 'manual-rubric' && entry.masteryEligible === true);
    assert.equal(contract.masteryEligible, expectedMastery, `${familyId}: masteryEligible weicht vom Fallkörper ab`);
    assert.deepEqual(contract.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    assert.equal(mod.FAMILY_SPEC.generate, generate);
    assert.equal(mod.FAMILY_SPEC.solve, solve);
    for (const item of cases) {
      const generated = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.equal(generated.parameters.caseId, item.caseId);
      assert.equal(generated.parameters.difficulty, item.difficulty);
      if (item.competencyIds) {
        assert.deepEqual(generated.competencyIds, item.competencyIds, `${item.caseId}: Kompetenz-Override`);
      }
    }
    const wrongProfile = cases[0].difficulty === 'intro' ? 'core' : 'intro';
    assert.throws(() => generate({ seed: 0, caseId: cases[0].caseId, difficulty: wrongProfile }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed muss eine ganze Zahl sein/);
  });
}

// cases: [{ caseId, difficulty, competencyIds? }]; modules carry per-case
// baseSnippet/baseOutput anchors plus draw/buildSnippet/buildOutput builders.
export function predictCapsuleSuite(familyId, mod, cases, { distinctFloor = 40, familyGroup, difficultyProfiles } = {}) {
  const doc = loadDoc(familyId);
  const defs = Object.entries(mod).find(([key, value]) => /_CASES/.test(key) && value && typeof value === 'object')?.[1];
  const contract = Object.values(mod).find((value) => value?.familyId === familyId && value.authorityMode === 'seeded');
  const names = Object.keys(mod);
  const pick = (re) => mod[names.find((name) => re.test(name))];
  const caseOk = pick(/CaseOk$/);
  const genCase = pick(/^gen[A-Z].*Case$/);
  const generate = pick(/^generate[A-Z].*Family$/);
  const solve = pick(/^solve[A-Z].*Family$/);

  test('anchor: contract null, cases fully preserved as oracle', () => {
    assert.equal(doc.contract, null);
    assert.equal(doc.cases.length, cases.length);
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      assert.ok(body, `${item.caseId}: anchor missing`);
      const def = defs[item.caseId];
      assert.equal(body.parameters.snippet, def.baseSnippet, `${item.caseId}: base snippet verbatim`);
      assert.equal(body.expected.output, def.baseOutput, `${item.caseId}: base output verbatim`);
      assert.equal(body.prompt, def.prompt, `${item.caseId}: prompt verbatim`);
      assert.ok(typeof body.fullSolution === 'string' && body.fullSolution.length > 40, `${item.caseId}: solution preserved`);
      if ('competencyIds' in body) {
        assert.deepEqual(body.competencyIds, def.competencyIds, `${item.caseId}: competencies verbatim`);
      }
      // base oracle self-consistency: the builders reproduce the pinned
      // snippet AND output from the pinned base parameter set
      assert.ok(def.baseParams, `${item.caseId}: baseParams missing`);
      assert.equal(def.buildSnippet(def.baseParams), def.baseSnippet, `${item.caseId}: builder reproduces base snippet`);
      assert.equal(def.buildOutput(def.baseParams), def.baseOutput, `${item.caseId}: builder reproduces base output`);
      if (def.buildPrompt) {
        assert.equal(def.buildPrompt(def.baseParams), def.prompt, `${item.caseId}: builder reproduces base prompt`);
      }
      assert.ok(def.checkParams({ ...def.baseParams, snippet: def.baseSnippet }), `${item.caseId}: base params satisfy the capsule shape`);
    }
  });

  test('capsule shape: generated parameters satisfy the case predicate over 80 seeds', () => {
    for (const item of cases) {
      const def = defs[item.caseId];
      for (let seed = 0; seed < 80; seed += 1) {
        const generated = callGen(genCase, seed, item.caseId, def);
        assert.ok(callOk(caseOk, generated.parameters, item.caseId, def), `${item.caseId}:${seed}: shape`);
        assert.equal(generated.parameters.caseId, item.caseId);
        assert.equal(generated.parameters.difficulty, item.difficulty);
        assert.equal(generated.expected.output, def.buildOutput(generated.parameters), `${item.caseId}:${seed}: expected output`);
        assert.equal(generated.prompt, def.buildPrompt ? def.buildPrompt(generated.parameters) : def.prompt);
        assert.ok(generated.fullSolution.length > 40, `${item.caseId}:${seed}: solution text`);
      }
    }
  });

  test(`solver and distinct over 200 seeds: solve recomputes output, floor ${distinctFloor}`, () => {
    for (const item of cases) {
      const seen = new Set();
      for (let seed = 0; seed < 200; seed += 1) {
        const generated = generate({ seed, caseId: item.caseId, difficulty: item.difficulty });
        seen.add(JSON.stringify(generated.parameters));
        assert.deepEqual(solve(generated.parameters), { output: generated.expected.output }, `${item.caseId}:${seed}: solver`);
      }
      assert.ok(seen.size >= distinctFloor, `${item.caseId}: only ${seen.size} distinct`);
    }
  });

  test('determinism: same seed reproduces identical output, negative seeds valid', () => {
    for (const item of cases) {
      const def = defs[item.caseId];
      for (let seed = -10; seed < 10; seed += 1) {
        assert.deepEqual(callGen(genCase, seed, item.caseId, def), callGen(genCase, seed, item.caseId, def), `${item.caseId}:${seed}`);
      }
    }
  });

  test('family block: contract fields, dispatch, errors', () => {
    assert.equal(contract.familyId, familyId);
    assert.equal(contract.authorityMode, 'seeded');
    assert.equal(mod.FAMILY_SPEC.activityType, 'predict-output');
    assert.equal(mod.FAMILY_SPEC.graderId, 'deterministic');
    assertContractExtras(contract, { familyGroup, difficultyProfiles });
    const expectedMastery = doc.cases.some((entry) => entry.graderId !== 'manual-rubric' && entry.masteryEligible === true);
    assert.equal(contract.masteryEligible, expectedMastery, `${familyId}: masteryEligible weicht vom Fallkörper ab`);
    assert.deepEqual(contract.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    assert.equal(mod.FAMILY_SPEC.generate, generate);
    assert.equal(mod.FAMILY_SPEC.solve, solve);
    const wrongProfile = cases[0].difficulty === 'core' ? 'stretch' : 'core';
    assert.throws(() => generate({ seed: 0, caseId: cases[0].caseId, difficulty: wrongProfile }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed/);
    assert.throws(() => solve({}), /Kapselform/);
  });
}

// cases: [{ caseId, difficulty, competencyIds? }]; defs: module CASES table.
export function codeCapsuleSuite(familyId, mod, cases, { distinctFloor = 40, familyGroup, difficultyProfiles } = {}) {
  const doc = loadDoc(familyId);
  const defs = Object.entries(mod).find(([key, value]) => /_CASES/.test(key) && value && typeof value === 'object')?.[1];
  const contract = Object.values(mod).find((value) => value?.familyId === familyId && value.authorityMode === 'seeded');
  const names = Object.keys(mod);
  const pick = (re) => mod[names.find((name) => re.test(name))];
  const caseOk = pick(/CaseOk$/);
  const genCase = pick(/^gen[A-Z].*Case$/);
  const generate = pick(/^generate[A-Z].*Family$/);
  const solve = pick(/^solve[A-Z].*Family$/);

  test('anchor: contract null, cases fully preserved as oracle', () => {
    assert.equal(doc.contract, null);
    assert.equal(doc.cases.length, cases.length);
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      assert.ok(body, `${item.caseId}: anchor missing`);
      assert.ok(body.parameters.tests.includes('__check'), `${item.caseId}: base tests preserved`);
      assert.equal(body.expected.kind, 'reference-solver');
      assert.ok(body.expected.referenceSolver.length > 50, `${item.caseId}: reference solver preserved`);
      const def = defs[item.caseId];
      assert.equal(body.parameters.tests, def.baseTests, `${item.caseId}: base tests verbatim`);
      assert.equal(body.parameters.starterCode, def.starterCode, `${item.caseId}: starter verbatim`);
      // packages may live on the def or on a family-level default — compare
      // the anchor against what the generator actually emits.
      assert.deepEqual(body.parameters.packages, callGen(genCase, 0, item.caseId, def).parameters.packages, `${item.caseId}: packages verbatim`);
      assert.equal(body.prompt, def.prompt, `${item.caseId}: prompt verbatim`);
      assert.equal(body.fullSolution, def.fullSolution, `${item.caseId}: fullSolution verbatim`);
      assert.equal(body.expected.referenceSolver, def.referenceSolver, `${item.caseId}: solver verbatim`);
    }
  });

  test('capsule shape: generated parameters satisfy the case predicate over 80 seeds', () => {
    for (const item of cases) {
      const def = defs[item.caseId];
      for (let seed = 0; seed < 80; seed += 1) {
        const generated = callGen(genCase, seed, item.caseId, def);
        assert.ok(callOk(caseOk, generated.parameters, item.caseId, def), `${item.caseId}:${seed}: shape`);
        assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${item.caseId}:${seed}: base block kept`);
        assert.equal(generated.expected.referenceSolver, def.referenceSolver);
        assert.equal(generated.prompt, def.prompt);
      }
    }
  });

  test(`distinct and solver over 200 seeds: floor ${distinctFloor}, reference solver stable`, () => {
    for (const item of cases) {
      const def = defs[item.caseId];
      const seen = new Set();
      for (let seed = 0; seed < 200; seed += 1) {
        const generated = generate({ seed, caseId: item.caseId, difficulty: item.difficulty });
        seen.add(JSON.stringify(generated.parameters));
        if (seed < 50) {
          assert.deepEqual(solve(generated.parameters), { referenceCode: def.referenceSolver }, `${item.caseId}:${seed}: solver`);
        }
      }
      assert.ok(seen.size >= distinctFloor, `${item.caseId}: only ${seen.size} distinct`);
    }
  });

  test('determinism: same seed reproduces identical output, negative seeds valid', () => {
    for (const item of cases) {
      const def = defs[item.caseId];
      for (let seed = -10; seed < 10; seed += 1) {
        assert.deepEqual(callGen(genCase, seed, item.caseId, def), callGen(genCase, seed, item.caseId, def), `${item.caseId}:${seed}`);
      }
    }
  });

  test('family block: contract fields, dispatch, errors', () => {
    assert.equal(contract.familyId, familyId);
    assert.equal(contract.authorityMode, 'seeded');
    assert.equal(mod.FAMILY_SPEC.activityType, 'python-code');
    assert.equal(mod.FAMILY_SPEC.graderId, 'pyodide');
    assertContractExtras(contract, { familyGroup, difficultyProfiles });
    const expectedMastery = doc.cases.some((entry) => entry.graderId !== 'manual-rubric' && entry.masteryEligible === true);
    assert.equal(contract.masteryEligible, expectedMastery, `${familyId}: masteryEligible weicht vom Fallkörper ab`);
    assert.deepEqual(contract.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    assert.equal(mod.FAMILY_SPEC.generate, generate);
    assert.equal(mod.FAMILY_SPEC.solve, solve);
    for (const item of cases) {
      const generated = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.equal(generated.parameters.caseId ?? item.caseId, item.caseId);
      if (item.competencyIds) {
        assert.deepEqual(generated.competencyIds ?? contract.competencyIds, item.competencyIds, `${item.caseId}: Kompetenz-Override`);
      }
    }
    const wrongProfile = cases[0].difficulty === 'core' ? 'stretch' : 'core';
    assert.throws(() => generate({ seed: 0, caseId: cases[0].caseId, difficulty: wrongProfile }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed/);
    assert.throws(() => solve({}), /Kapselform|Unbekannter Fall/);
  });
}

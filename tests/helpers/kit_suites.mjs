// Shared capsule gates for the kit families (single-choice, predict-output,
// python-code). Each runner iterates JS_FAMILY_SPECS and passes the spec —
// the surface comes from `spec` (contract + generate/solve) and `spec.kit`
// (capsules/cases plus the kit predicates), the case list is derived from
// contract.caseTypes in contract order. Options only carry family knobs the
// golden corpus cannot pin: distinctFloor, leakCheck, complies,
// checkParameters, seeds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_FAMILIES } from '../../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const loadDoc = (familyId) => JSON.parse(readFileSync(join(root, 'content/families', `${familyId}.json`), 'utf8'));

// Parametrisierte Kapseln tragen Zahlen-/Parameterraeume statt einer gekeyten
// Textbank — bankabhaengige Gates laufen nur, wenn jeder Eintrag
// key/correct/wrong traegt.
const keyedBank = (capsule) => Array.isArray(capsule?.bank)
  && capsule.bank.every((entry) => typeof entry?.key === 'string'
    && typeof entry?.correct === 'string' && Array.isArray(entry?.wrong));

// cases in contract order: [{ caseId, difficulty, capsule, competencyIds }]
const choiceCases = (spec) => {
  const { capsules, keyBy, caseMeta } = spec.kit;
  const capsuleFor = (caseId) => (keyBy === 'caseId'
    ? capsules[caseId]
    : Object.values(capsules).find((capsule) => capsule.caseId === caseId));
  return spec.caseTypes.map(({ caseId }) => {
    const capsule = capsuleFor(caseId);
    const difficulty = keyBy === 'caseId'
      ? capsule?.difficulty
      : Object.keys(capsules).find((key) => capsules[key].caseId === caseId);
    return { caseId, difficulty, capsule, competencyIds: capsule?.competencyIds ?? caseMeta?.[caseId]?.competencyIds };
  });
};

// cases in contract order: [{ caseId, difficulty, def, competencyIds }]
const defCases = (spec) => spec.caseTypes.map(({ caseId }) => {
  const def = spec.kit.cases[caseId];
  return { caseId, difficulty: def?.difficulty, def, competencyIds: def?.competencyIds };
});

function assertMasteryConsistent(doc, contract, familyId) {
  const expectedMastery = doc.cases.some((entry) => entry.graderId !== 'manual-rubric' && entry.masteryEligible === true);
  assert.equal(contract.masteryEligible, expectedMastery, `${familyId}: masteryEligible weicht vom Fallkörper ab`);
}

export function choiceKitSuite(spec, {
  distinctFloor = 40,
  leakCheck,
  complies = null,
  checkParameters = null,
  seeds = 200,
} = {}) {
  const familyId = spec.familyId;
  const { capsules, capsuleOk, correctText, genCapsule } = spec.kit;
  const { generate, solve } = spec;
  const doc = loadDoc(familyId);
  const cases = choiceCases(spec);
  const leak = leakCheck ?? ((prompt, text) => prompt.includes(text));
  const fits = complies ?? ((parameters, capsule) => capsuleOk(parameters, capsule));

  test('Orakel: Base-Eintrag reproduziert den JSON-Fall wörtlich', () => {
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      const capsule = item.capsule;
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
      const capsule = item.capsule;
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
      const capsule = item.capsule;
      for (let seed = 0; seed < 60; seed += 1) {
        const generated = genCapsule(seed, capsule);
        assert.ok(capsuleOk(generated.parameters, capsule), `${item.caseId}:${seed}: Kapselform`);
        if (checkParameters) checkParameters(generated, capsule, `${item.caseId}:${seed}`);
        if (keyedBank(capsule)) {
          assert.ok(capsule.bank.some((entry) => entry.key === generated.parameters.scenario), `${item.caseId}:${seed}: Szenario in Bank`);
        }
        assert.equal(generated.choices.length, 4, `${item.caseId}:${seed}: vier Wahlen`);
        assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${item.caseId}:${seed}: eindeutige Texte`);
        const correct = generated.choices.filter((choice) => choice.correct);
        assert.equal(correct.length, 1, `${item.caseId}:${seed}: genau eine korrekte Wahl`);
        assert.equal(correct[0].text, correctText(generated.parameters, capsule), `${item.caseId}:${seed}: Schlüsseltext`);
        assert.ok(generated.prompt.length > 20, `${item.caseId}:${seed}: Prompt`);
        assert.ok(generated.fullSolution.length > 20, `${item.caseId}:${seed}: Lösung`);
      }
    }
  });

  test(`Statistik ${cases.length}x${seeds}: Distinct ${distinctFloor}, Leak/Rotation, Solver`, () => {
    for (const item of cases) {
      const capsule = item.capsule;
      const seen = new Set();
      const ids = genCapsule(0, capsule).choices.map((choice) => choice.id);
      const counts = Object.fromEntries(ids.map((id) => [id, 0]));
      const byModulo = new Map();
      let violations = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = generate({ seed, caseId: item.caseId, difficulty: item.difficulty });
        const fingerprint = JSON.stringify([generated.prompt, generated.parameters, generated.choices]);
        seen.add(fingerprint);
        const correct = generated.choices.find((choice) => choice.correct);
        assert.ok(!leak(generated.prompt, correct.text, generated), `${item.caseId}:${seed}: Schlüssel im Prompt`);
        assert.deepEqual(solve(generated.parameters), { correctText: correct.text }, `${item.caseId}:${seed}: Solver`);
        if (!fits(generated.parameters, capsule)) violations += 1;
        counts[correct.id] += 1;
        const bucket = seed % 8;
        if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
        byModulo.get(bucket).add(fingerprint);
      }
      assert.ok(seen.size >= distinctFloor, `${item.caseId}: nur ${seen.size} distinct`);
      assert.equal(violations, 0, `${item.caseId}: Constraint-Verletzungen`);
      for (const [id, count] of Object.entries(counts)) {
        assert.ok(count >= 40 && count <= 60, `${item.caseId}: Position ${id} nur ${count}x`);
      }
      for (const [bucket, instances] of byModulo) {
        assert.ok(instances.size >= 10, `${item.caseId}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
      }
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
      const capsule = item.capsule;
      for (let seed = -15; seed < 10; seed += 1) {
        assert.deepEqual(genCapsule(seed, capsule), genCapsule(seed, capsule), `${item.caseId}:${seed}: deterministisch`);
        assert.ok(capsuleOk(genCapsule(seed, capsule).parameters, capsule), `${item.caseId}:${seed}: Kapselform`);
      }
      const viaFamily = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.deepEqual(viaFamily, generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty }), `${item.caseId}: Family deterministisch`);
    }
  });

  test('Familien-Block: Contract-Felder, Kompetenzen je Fall, Dispatch, Fehlerpfade', () => {
    assert.equal(spec.familyId, familyId);
    assert.equal(spec.authorityMode, 'seeded');
    assert.equal(spec.activityType, 'single-choice');
    assert.equal(spec.graderId, 'deterministic');
    assert.equal(typeof spec.taskArchetype, 'string');
    assertMasteryConsistent(doc, spec, familyId);
    assert.deepEqual(spec.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    for (const item of cases) {
      const generated = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.equal(generated.parameters.caseId, item.caseId);
      assert.equal(generated.parameters.difficulty, item.difficulty);
      if (item.competencyIds) {
        assert.deepEqual(generated.competencyIds, item.competencyIds, `${item.caseId}: Kompetenz-Override`);
      }
      const wrongProfile = item.difficulty === 'intro' ? 'core' : 'intro';
      assert.throws(() => generate({ seed: 0, caseId: item.caseId, difficulty: wrongProfile }), /Unbekannter Fall/);
    }
    const last = cases[cases.length - 1];
    assert.throws(() => generate({ seed: 0, caseId: last.caseId, difficulty: 'legendary' }), /Unbekannt/);
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed muss eine ganze Zahl sein/);
  });

  test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
    for (const item of cases) {
      const instance = EXERCISE_FAMILIES.instantiate(familyId, 11, item.difficulty, item.caseId);
      const correct = instance.choices.find((choice) => choice.correct);
      const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
      assert.equal(right.correct, true);
      const wrong = instance.choices.find((choice) => !choice.correct);
      const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
      assert.equal(graded.correct, false);
    }
  });
}

export function predictKitSuite(spec, { distinctFloor = 40 } = {}) {
  const familyId = spec.familyId;
  const { caseOk, genCase } = spec.kit;
  const { generate, solve } = spec;
  const doc = loadDoc(familyId);
  const cases = defCases(spec);

  test('anchor: contract null, anchor exists and stays self-consistent', () => {
    assert.equal(doc.contract, null);
    assert.equal(doc.cases.length, cases.length);
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      assert.ok(body, `${item.caseId}: anchor missing`);
      // prompt/snippet/output verbatim-ties are now by construction — the kit
      // fills them from the anchor. What still needs pinning: the anchor's
      // own shape plus the def fields the anchor does not own.
      assert.ok(typeof body.fullSolution === 'string' && body.fullSolution.length > 40, `${item.caseId}: solution preserved`);
      if ('competencyIds' in body) {
        assert.deepEqual(body.competencyIds, item.def.competencyIds, `${item.caseId}: competencies verbatim`);
      }
      // base oracle self-consistency: the builders reproduce the pinned
      // snippet AND output from the pinned base parameter set
      const def = item.def;
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
      const def = item.def;
      for (let seed = 0; seed < 80; seed += 1) {
        const generated = genCase(seed, item.caseId, def);
        assert.ok(caseOk(generated.parameters, item.caseId, def), `${item.caseId}:${seed}: shape`);
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
      const def = item.def;
      for (let seed = -10; seed < 10; seed += 1) {
        assert.deepEqual(genCase(seed, item.caseId, def), genCase(seed, item.caseId, def), `${item.caseId}:${seed}`);
      }
    }
  });

  test('family block: contract fields, dispatch, errors', () => {
    assert.equal(spec.familyId, familyId);
    assert.equal(spec.authorityMode, 'seeded');
    assert.equal(spec.activityType, 'predict-output');
    assert.equal(spec.graderId, 'deterministic');
    assertMasteryConsistent(doc, spec, familyId);
    assert.deepEqual(spec.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    for (const item of cases) {
      const wrongProfile = item.difficulty === 'core' ? 'stretch' : 'core';
      assert.throws(() => generate({ seed: 0, caseId: item.caseId, difficulty: wrongProfile }), /Unbekannter Fall/, `${item.caseId}: falsches Profil`);
    }
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed/);
    assert.throws(() => solve({}), /Kapselform/);
  });
}

// strictSolutionAnchor: almost every code family resolves def.fullSolution
// from the anchor, so the tie is by construction. formula-descriptive-stats-
// numpy is the one exception — its def overrides with module text while the
// anchor pins a curated walkthrough (we then assert the anchor stays full).
export function codeKitSuite(spec, { distinctFloor = 40, strictSolutionAnchor = true } = {}) {
  const familyId = spec.familyId;
  const { caseOk, genCase } = spec.kit;
  const { generate, solve } = spec;
  const doc = loadDoc(familyId);
  const cases = defCases(spec);

  test('anchor: contract null, anchor exists and keeps its shape', () => {
    assert.equal(doc.contract, null);
    assert.equal(doc.cases.length, cases.length);
    for (const item of cases) {
      const body = doc.cases.find((entry) => entry.caseId === item.caseId);
      assert.ok(body, `${item.caseId}: anchor missing`);
      // starterCode/baseTests/referenceSolver/prompt/packages verbatim-ties
      // are now by construction — the kit fills them from the anchor. What
      // still needs pinning: the anchor's own shape.
      assert.ok(body.parameters.tests.includes('__check'), `${item.caseId}: base tests preserved`);
      assert.equal(body.expected.kind, 'reference-solver');
      assert.ok(body.expected.referenceSolver.length > 50, `${item.caseId}: reference solver preserved`);
      if (!strictSolutionAnchor) {
        // explicit override family: the anchor pins a curated walkthrough
        // while the def carries the module's own reference text.
        assert.ok(body.fullSolution.length > 40, `${item.caseId}: curated fullSolution`);
      }
    }
  });

  test('capsule shape: generated parameters satisfy the case predicate over 80 seeds', () => {
    for (const item of cases) {
      const def = item.def;
      for (let seed = 0; seed < 80; seed += 1) {
        const generated = genCase(seed, item.caseId, def);
        assert.ok(caseOk(generated.parameters, item.caseId, def), `${item.caseId}:${seed}: shape`);
        assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${item.caseId}:${seed}: base block kept`);
        assert.equal(generated.expected.referenceSolver, def.referenceSolver);
        assert.equal(generated.prompt, def.prompt);
        assert.equal(generated.fullSolution, def.fullSolution);
      }
    }
  });

  test(`distinct and solver over 200 seeds: floor ${distinctFloor}, reference solver stable`, () => {
    for (const item of cases) {
      const def = item.def;
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
      const def = item.def;
      for (let seed = -10; seed < 10; seed += 1) {
        assert.deepEqual(genCase(seed, item.caseId, def), genCase(seed, item.caseId, def), `${item.caseId}:${seed}`);
      }
    }
  });

  test('family block: contract fields, dispatch, errors', () => {
    assert.equal(spec.familyId, familyId);
    assert.equal(spec.authorityMode, 'seeded');
    assert.equal(spec.activityType, 'python-code');
    assert.equal(spec.graderId, 'pyodide');
    assertMasteryConsistent(doc, spec, familyId);
    assert.deepEqual(spec.caseTypes.map((entry) => entry.caseId), cases.map((item) => item.caseId));
    for (const item of cases) {
      const generated = generate({ seed: 11, caseId: item.caseId, difficulty: item.difficulty });
      assert.equal(generated.parameters.caseId ?? item.caseId, item.caseId);
      const expectedIds = item.def.competencyIds ?? spec.competencyIds;
      assert.deepEqual(generated.competencyIds ?? spec.competencyIds, expectedIds, `${item.caseId}: Kompetenz-Override`);
      const wrongProfile = item.difficulty === 'core' ? 'stretch' : 'core';
      assert.throws(() => generate({ seed: 0, caseId: item.caseId, difficulty: wrongProfile }), /Unbekannter Fall/, `${item.caseId}: falsches Profil`);
    }
    assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: cases[0].difficulty }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0.5, caseId: cases[0].caseId, difficulty: cases[0].difficulty }), /Seed/);
    assert.throws(() => solve({}), /Kapselform|Unbekannter Fall/);
  });
}

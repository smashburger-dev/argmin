// Shared capsule gates for the six linalg parameterized single-choice
// families. Unlike choiceCapsuleSuite (procedural_capsule_suites.mjs) the
// linalg capsules draw mathematical parameters directly instead of picking
// a bank entry — the kit products (capsuleOk/correctText/genCapsule plus
// generate/solve from foundations_linalg_families.mjs) all share the
// (parameters, capsule) signature, so the gates live here once and each
// per-family *.test.mjs keeps only its oracle tables and family extras.
import test from 'node:test';
import assert from 'node:assert/strict';

// surface: { capsules, contract, capsuleOk, correctText, genCapsule,
//            generate, solve, registry }
// caseFor: { difficultyKey: caseId } — one bound case per capsule profile.
// options:
//   difficultyProfiles — contract.difficultyProfiles pin (verbatim)
//   meta        — { [difficultyKey]: { masteryEligible, competencyIds } }
//   complies    — (parameters, capsule) -> boolean constraint gate
//                 (default: capsuleOk; independence keeps its bound check)
//   checkParameters — (generated, capsule, label) extra per-instance asserts
//   distinctFloor / seeds — sampler coverage knobs
export function linalgChoiceCapsuleSuite(familyId, surface, caseFor, {
  difficultyProfiles,
  meta = null,
  complies = null,
  checkParameters = null,
  distinctFloor = 40,
  seeds = 200,
} = {}) {
  const {
    capsules, contract, capsuleOk, correctText, genCapsule, generate, solve, registry,
  } = surface;
  const keys = Object.keys(caseFor);
  const fits = complies ?? ((parameters, capsule) => capsuleOk(parameters, capsule));

  test(`Kapsel-Constraints: Form, Choices, Schlüssel über je ${seeds} Seeds`, () => {
    for (const key of keys) {
      const capsule = capsules[key];
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = genCapsule(seed, capsule);
        assert.ok(capsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
        if (checkParameters) checkParameters(generated, capsule, `${key}:${seed}`);
        assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
        assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
        const correct = generated.choices.filter((choice) => choice.correct);
        assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
        assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
        assert.equal(correct[0].text, correctText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
        assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
        assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
      }
    }
  });

  test(`Distinct-Boden ${keys.length}x${seeds}: je Kapsel mindestens ${distinctFloor} distincte Instanzen`, () => {
    for (const key of keys) {
      const seen = new Set();
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = generate({ seed, caseId: caseFor[key], difficulty: key });
        seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
      }
      assert.ok(seen.size >= distinctFloor, `${key}: nur ${seen.size} distinct`);
    }
  });

  test(`Key-Agreement ${keys.length}x${seeds}: Solve-Schlüssel gegen Generator ohne Abweichung`, () => {
    for (const key of keys) {
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = generate({ seed, caseId: caseFor[key], difficulty: key });
        const solved = solve(generated.parameters);
        const correct = generated.choices.find((choice) => choice.correct);
        assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
        assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
      }
    }
  });

  test(`Constraint-Compliance ${keys.length}x${seeds}: null Samples außerhalb der Kapselform`, () => {
    for (const key of keys) {
      const capsule = capsules[key];
      let violations = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = generate({ seed, caseId: caseFor[key], difficulty: key });
        if (!fits(generated.parameters, capsule)) violations += 1;
      }
      assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
    }
  });

  test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
    for (const key of keys) {
      const ids = genCapsule(0, capsules[key]).choices.map((choice) => choice.id);
      const counts = Object.fromEntries(ids.map((id) => [id, 0]));
      const byModulo = new Map();
      for (let seed = 0; seed < seeds; seed += 1) {
        const generated = generate({ seed, caseId: caseFor[key], difficulty: key });
        const correct = generated.choices.find((choice) => choice.correct);
        assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
        counts[generated.expected.correctChoice] += 1;
        const bucket = seed % 8;
        if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
        byModulo.get(bucket).add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
      }
      for (const [id, count] of Object.entries(counts)) {
        assert.ok(count >= 40 && count <= 60, `${key}: Position ${id} nur ${count}x`);
      }
      for (const [bucket, instances] of byModulo) {
        assert.ok(instances.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
      }
    }
  });

  test('negative Seeds: gültig und deterministisch', () => {
    for (const key of keys) {
      const capsule = capsules[key];
      for (let seed = -50; seed < 0; seed += 1) {
        const first = genCapsule(seed, capsule);
        assert.deepEqual(first, genCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
        assert.ok(capsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
      }
    }
  });

  test('Familien-Block: Dispatch, Contract, Solve', () => {
    assert.equal(contract.familyId, familyId);
    assert.equal(contract.authorityMode, 'seeded');
    assert.equal(registry.get(familyId).activityType, 'single-choice');
    assert.deepEqual(contract.difficultyProfiles, difficultyProfiles);
    assert.deepEqual(contract.caseTypes.map((item) => item.caseId).sort(), Object.values(caseFor).sort());
    for (const key of keys) {
      const generated = generate({ seed: 11, caseId: caseFor[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(generated.expected.correctChoice, correct.id);
      assert.deepEqual(solve(generated.parameters), { correctText: correct.text });
      if (meta) {
        assert.equal(generated.masteryEligible, meta[key].masteryEligible, `${key}: Mastery wie im Bestand`);
        assert.deepEqual(generated.competencyIds, meta[key].competencyIds, `${key}: Kompetenzen wie im Bestand`);
      }
      assert.ok(generated.prompt.length > 20);
      assert.deepEqual(generate({ seed: 11, caseId: caseFor[key], difficulty: key }), generated);
    }
    // Fehlerpfade: Fall am falschen Profil und jenseits der Profilliste.
    assert.throws(() => generate({ seed: 0, caseId: caseFor[keys[0]], difficulty: keys[1] }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0, caseId: caseFor[keys[1]], difficulty: keys[0] }), /Unbekannter Fall/);
    assert.throws(() => generate({ seed: 0, caseId: caseFor[keys[keys.length - 1]], difficulty: 'challenge' }), /Unbekannt/);
  });

  test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
    for (const key of keys) {
      const instance = registry.instantiate(familyId, 11, key, caseFor[key]);
      const correct = instance.choices.find((choice) => choice.correct);
      assert.equal(instance.expectedAnswer.correctChoice, correct.id);
      const right = await registry.grade(instance, correct.id);
      assert.equal(right.correct, true);
      const wrong = instance.choices.find((choice) => !choice.correct);
      const graded = await registry.grade(instance, wrong.id);
      assert.equal(graded.correct, false);
    }
  });
}

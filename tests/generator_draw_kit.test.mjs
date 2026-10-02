import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rng, pick, shuffle, until, clean, standaloneNumberPresent, familySubseed, drawFamilyInstance,
} from '../assets/js/core/generator_draw_kit.mjs';

// Direct gate for the shared draw kit: every family generator draws through
// these helpers, so each one is pinned individually (determinism first,
// then the contract that the later refactors rely on).

test('draw kit pick: same seed draws the same member', () => {
  const values = ['a', 'b', 'c', 'd'];
  assert.equal(pick(rng(42), values), pick(rng(42), values));
  assert.ok(values.includes(pick(rng(42), values)));
  assert.equal(pick(rng(7), ['x']), 'x');
});

test('draw kit shuffle: deterministic permutation without mutating input', () => {
  const input = [1, 2, 3, 4, 5];
  const first = shuffle(rng(42), input);
  assert.deepEqual(first, shuffle(rng(42), input));
  assert.notEqual(first, input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...first].sort((a, b) => a - b), input);
  const orders = new Set(Array.from({ length: 10 }, (_, i) => shuffle(rng(i + 1), input).join(',')));
  assert.ok(orders.size > 1, 'shuffle never reorders');
});

test('draw kit until: retries until the guard holds', () => {
  const value = until(rng(3), (random) => Math.floor(random() * 10), (v) => v > 5);
  assert.ok(value > 5);
});

test('draw kit until: degenerate draw throws with the family scope', () => {
  assert.throws(
    () => until(rng(1), () => 1, (v) => v === 2, { maxTries: 5, scope: 'test-scope' }),
    /test-scope: degenerate draw survived retry guard/,
  );
});

test('draw kit standaloneNumberPresent: standalone only, unicode minus normalized', () => {
  assert.equal(standaloneNumberPresent('Ergebnis 42 Punkte', 42), true);
  assert.equal(standaloneNumberPresent('Wert 142', 42), false);
  assert.equal(standaloneNumberPresent('42% Treffer', 42), false);
  assert.equal(standaloneNumberPresent('Wert 3.14', 14), false);
  assert.equal(standaloneNumberPresent('Ergebnis \u221242', -42), true);
  assert.equal(standaloneNumberPresent('Ergebnis \u221242', -42, { normalizeUnicodeMinus: false }), false);
});

test('draw kit clean: prompt never shows the answer', () => {
  const build = (random) => {
    const value = 1 + Math.floor(random() * 9);
    return random() < 0.5
      ? { prompt: `Antwort ${value}`, expected: value }
      : { prompt: 'Berechne x.', expected: value };
  };
  for (const seed of [1, 2, 3, 42, 577]) {
    const instance = clean(rng(seed), build);
    assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false);
  }
});

test('draw kit familySubseed: deterministic uint32, distinct per input', () => {
  assert.equal(familySubseed(1, 'fall', 'leicht'), familySubseed(1, 'fall', 'leicht'));
  assert.notEqual(familySubseed(1, 'fall-a', 'leicht'), familySubseed(1, 'fall-b', 'leicht'));
  assert.notEqual(familySubseed(1, 'fall', 'leicht', 0), familySubseed(1, 'fall', 'leicht', 1));
  for (const sub of [familySubseed(5, 'c', 'mittel'), familySubseed(9, 'd', 'schwer', 3)]) {
    assert.ok(Number.isInteger(sub) && sub >= 0 && sub <= 0xffffffff);
  }
});

test('draw kit drawFamilyInstance: deterministic, falls back to first shape match', () => {
  const generate = (subseed) => {
    const value = Math.floor(rng(subseed)() * 100);
    return { parameters: { value }, expected: value };
  };
  const options = { seed: 5, caseId: 'fall', difficulty: 'leicht', wantShape: () => true };
  assert.deepEqual(drawFamilyInstance(generate, options), drawFamilyInstance(generate, options));
  const fallback = drawFamilyInstance(generate, { ...options, seed: 7, profileAccepts: () => false, cap: 10 });
  assert.deepEqual(fallback, generate(familySubseed(7, 'fall', 'leicht', 0)));
});

test('draw kit drawFamilyInstance: rejects bad profile, bad seed, shapeless draws', () => {
  const generate = (subseed) => ({ parameters: { v: subseed }, expected: 1 });
  assert.throws(
    () => drawFamilyInstance(generate, { seed: 1, caseId: 'c', difficulty: 'schwer', wantShape: () => true, profiles: ['leicht'] }),
    /Unbekanntes Profil schwer/,
  );
  assert.throws(
    () => drawFamilyInstance(generate, { seed: 1.5, caseId: 'c', difficulty: 'leicht', wantShape: () => true }),
    /Seed muss eine ganze Zahl sein/,
  );
  assert.throws(
    () => drawFamilyInstance(generate, { seed: 1, caseId: 'c', difficulty: 'leicht', wantShape: () => false, cap: 5 }),
    /c: keine formtreue Instanz in 5 Versuchen/,
  );
});

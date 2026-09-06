// Golden corpus characterization test: freezes the exact JSON serialization
// of every registered seed generator over seeds 0..63. The digests were
// captured on 2026-09-01, before the shrink-complexity refactor — any drift
// is a learner-visible behavior change (different instances for the same
// deterministic seed) and needs an explicit re-baseline decision, not a
// silent side effect of restructuring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_GENERATORS } from '../assets/js/core/seed_generator_registry.mjs';

const corpus = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/generator-golden-corpus.json'), 'utf8'));

const digestFor = (generatorId) => {
  const generator = SEED_GENERATORS[generatorId];
  const [firstSeed, lastSeed] = corpus.seedRange;
  const instances = [];
  for (let seed = firstSeed; seed <= lastSeed; seed += 1) instances.push(generator(seed));
  return createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
};

test('generator golden corpus: all 52 families byte-identical over seeds 0-63', () => {
  assert.equal(Object.keys(SEED_GENERATORS).length, corpus.families, 'registry family count drifted');
  assert.equal(Object.keys(corpus.corpus).length, corpus.families, 'fixture family count drifted');

  const fixtureIds = new Set(Object.keys(corpus.corpus));
  for (const generatorId of Object.keys(SEED_GENERATORS)) {
    assert.ok(fixtureIds.has(generatorId), `${generatorId}: registered but missing from the golden corpus fixture`);
  }

  const startedAt = performance.now();
  for (const [generatorId, entry] of Object.entries(corpus.corpus)) {
    assert.equal(entry.seeds, 64, `${generatorId}: fixture seed count`);
    assert.equal(
      digestFor(generatorId),
      entry.digest,
      `${generatorId}: digest drifted from the frozen golden corpus (behavior change — justify and re-baseline)`,
    );
  }
  const elapsedMs = performance.now() - startedAt;
  // Runtime guard: the generators are pure math — 52 families x 64 seeds must
  // stay well below ~2s. A regression here means a generator accidentally
  // became non-local (I/O, imports, heavy allocation).
  assert.ok(elapsedMs < 2000, `golden corpus computation took ${elapsedMs.toFixed(0)}ms (guard: <2000ms)`);
});

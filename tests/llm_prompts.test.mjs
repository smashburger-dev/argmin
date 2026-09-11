// A4/B1-Gate: Prompt-Versionen sind gepinnt. Jede Prompt-Aenderung ohne
// Versionsbump scheitert am Hash-Pin; mit Bump muss der Pin hier
// mitgezogen werden. Trainings-Ranges muessen disjunkt zum Haltebereich
// 90000-90999 und zu 0-199 (Golden Corpus, audit_variants) bleiben.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOLD_SEED_MAX,
  HOLD_SEED_MIN,
  STATIC_CAP,
  TRAIN_SEED_MAX,
  TRAIN_SEED_MIN,
} from '../tools/llm/sample_pairs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PINNED = {
  'teacher-trace.md': { version: 1, sha256: 'f85c4d5a1aa5cf9d2eda63953722bf56e30d349eec78582926eeaa6d6bf96d9f' },
  'eval-rubric.md': { version: 1, sha256: '2fd6a6cda070a430645e7c78ad04140b5c9316f4b44569570c20b118f572604a' },
};

const readPrompt = (name) => readFileSync(join(root, 'tools/llm/prompts', name), 'utf8');
const splitFrontmatter = (raw) => {
  const end = raw.indexOf('---', 3);
  assert.notEqual(end, -1, 'Frontmatter fehlt');
  return { head: raw.slice(0, end), body: raw.slice(end + 3) };
};

for (const [name, pinned] of Object.entries(PINNED)) {
  test(`${name}: Version und Inhalt gepinnt`, () => {
    const { head, body } = splitFrontmatter(readPrompt(name));
    const version = Number(head.match(/version:\s*(\d+)/)?.[1]);
    assert.equal(version, pinned.version, `${name}: Version ${version} statt ${pinned.version} (Bump plus Pin-Update noetig)`);
    const digest = createHash('sha256').update(body).digest('hex');
    assert.equal(digest, pinned.sha256, `${name}: Inhalt geaendert ohne Versionsbump`);
  });
}

test('teacher-trace: Deutsch-Zwang und Loesungsformat', () => {
  const body = splitFrontmatter(readPrompt('teacher-trace.md')).body;
  assert.match(body, /ausschließlich auf Deutsch/, 'Deutsch-Zwang fehlt');
  assert.match(body, /Fehlkonzept/, 'Fehlkonzept-Vorgabe fehlt');
  assert.match(body, /Lösungsformat/, 'Loesungsformat fehlt');
});

test('eval-rubric: Deutsch und Antwortformat', () => {
  const body = splitFrontmatter(readPrompt('eval-rubric.md')).body;
  assert.match(body, /ausschließlich auf Deutsch/, 'Deutsch-Zwang fehlt');
  assert.match(body, /Antwortformat/, 'Antwortformat fehlt');
});

test('sampling-ranges: disjunkt zu Haltebereich und 0-199', () => {
  assert.equal(STATIC_CAP, 10, 'STATIC_CAP muss 10 bleiben (Spec B1)');
  const overlaps = (a, b, c, d) => a <= d && c <= b;
  assert.ok(!overlaps(TRAIN_SEED_MIN, TRAIN_SEED_MAX, HOLD_SEED_MIN, HOLD_SEED_MAX), 'Trainings-Range im Haltebereich');
  assert.ok(!overlaps(TRAIN_SEED_MIN, TRAIN_SEED_MAX, 0, 199), 'Trainings-Range in 0-199 (Golden Corpus)');
  assert.ok(!overlaps(HOLD_SEED_MIN, HOLD_SEED_MAX, 0, 199), 'Haltebereich in 0-199');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts, compileContent, writeSplitArtifacts } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateMarkers = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;
const publicBundle = compileContent({ projectRoot: root, profile: 'public' });
const publicSplit = buildSplitArtifacts(publicBundle);
const localBundle = compileContent({ projectRoot: root, profile: 'local-private' });
const localSplit = buildSplitArtifacts(localBundle);

test('split index plus bodies plus sections rebuild every lesson, activity and family exactly', () => {
  const sectionKeys = ['sources', 'tools', 'reviews'];
  for (const key of Object.keys(publicBundle)) {
    if (key === 'lessons' || key === 'families' || sectionKeys.includes(key)) continue;
    assert.deepEqual(publicSplit.index[key], publicBundle[key], `index field ${key} differs`);
  }
  assert.deepEqual(publicSplit.index.familyActivities, publicBundle.familyActivities);
  assert.deepEqual(publicSplit.index.families, publicBundle.families.map((family) => ({
    familyId: family.familyId,
    contract: family.contract,
    cases: family.cases.map(({ caseId, difficultyProfile, masteryEligible }) => ({ caseId, difficultyProfile, masteryEligible })),
  })));
  for (const key of sectionKeys) {
    assert.equal(publicSplit.index[key], undefined);
    assert.deepEqual(publicSplit.sections[key][key], publicBundle[key]);
  }
  for (const lesson of publicBundle.lessons) {
    const summary = publicSplit.index.lessons.find((item) => item.lessonId === lesson.lessonId);
    const body = publicSplit.lessonBodies.find((item) => item.id === lesson.lessonId);
    assert.ok(summary && body);
    assert.deepEqual({ ...summary, ...body.body }, lesson);
  }
  for (const family of publicBundle.families) {
    const summary = publicSplit.index.families.find((item) => item.familyId === family.familyId);
    const body = publicSplit.familyBodies.find((item) => item.id === family.familyId);
    assert.ok(summary && body);
    assert.deepEqual(body.body, family);
  }
});

test('written split artifacts match chunks.ts registration exactly and stay inside the split directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ki-verify-split-'));
  try {
    writeSplitArtifacts(publicBundle, join(dir, 'split'));
    const splitDir = join(dir, 'split');
    const source = readFileSync(join(splitDir, 'chunks.ts'), 'utf8');
    const imports = [...source.matchAll(/import\((['"])(.+?)\1\)/g)].map((match) => match[2]);
    const lessons = [...source.matchAll(/import\('\.\/lessons\/([^']+)\.json'\)/g)].map((match) => match[1]);
    const families = [...source.matchAll(/import\('\.\/families\/([^']+)\.json'\)/g)].map((match) => match[1]);
    const sections = [...source.matchAll(/import\('\.\/sections\/([^']+)\.json'\)/g)].map((match) => match[1]);
    assert.equal(imports.length, publicBundle.lessons.length + publicBundle.families.length + sections.length);
    assert.deepEqual(sections.sort(), ['reviews', 'sources', 'tools']);
    for (const path of imports) {
      assert.match(path, /^\.\/(?:lessons|families|sections)\/[A-Za-z0-9][A-Za-z0-9._-]{0,96}\.json$/);
      assert.ok(existsSync(join(splitDir, path)));
    }
    assert.deepEqual([...new Set(lessons)].sort(), publicBundle.lessons.map((item) => item.lessonId).sort());
    assert.deepEqual([...new Set(families)].sort(), publicBundle.families.map((item) => item.familyId).sort());
    assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8')), publicSplit.index);
    for (const [name, body] of Object.entries(publicSplit.sections)) {
      assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'sections', `${name}.json`), 'utf8')), body);
    }
    for (const { id, body } of [...publicSplit.lessonBodies, ...publicSplit.familyBodies]) {
      const dirName = publicSplit.lessonBodies.some((item) => item.id === id) ? 'lessons' : 'families';
      assert.deepEqual(JSON.parse(readFileSync(join(splitDir, dirName, `${id}.json`), 'utf8')), body);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('repo split stays current against a fresh compile when present', (t) => {
  const splitDir = join(root, '.content-build/public/split');
  if (!existsSync(join(splitDir, 'chunks.ts'))) return t.skip('split not built');
  assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8')), publicSplit.index);
  assert.equal(readFileSync(join(splitDir, 'chunks.ts'), 'utf8'), publicSplit.chunks);
});

test('public split excludes local-only content while local covers its own families', () => {
  assert.equal(publicSplit.index.profile, 'public');
  assert.equal(localSplit.index.profile, 'local-private');
  const publicFamilies = new Set(publicBundle.families.map((family) => family.familyId));
  const localFamilies = new Set(localBundle.families.map((family) => family.familyId));
  for (const id of publicFamilies) assert.ok(localFamilies.has(id), `public family ${id} missing locally`);
  assert.doesNotMatch(JSON.stringify(publicSplit.index), privateMarkers);
  assert.doesNotMatch(publicSplit.chunks, privateMarkers);
  const registered = new Set([...localSplit.chunks.matchAll(/import\('\.\/families\/([^']+)\.json'\)/g)].map((match) => match[1]));
  assert.deepEqual([...registered].sort(), [...localFamilies].sort());
});

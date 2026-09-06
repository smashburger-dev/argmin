import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts, compileContent, writeSplitArtifacts } from '../tools/compile_content.mjs';

// ADR-0013 content-delivery verification (independent of tests/content_split
// .test.mjs). These checks pin the equivalence and safety properties of the
// split pipeline, not just its shape:
//   1. index + lessonBodies + exerciseBodies merge back to the exact bundle
//      (deep equal per definition/lesson/field, including the promptSnippet
//      prefix rule), so lazy loading can never change what a learner sees.
//   2. written artifacts: every chunk registered in chunks.ts exists on disk,
//      the registry covers exactly the bundle ids, and no path escapes the
//      split directory (offline / same-origin guarantee for dynamic imports).
//   3. public and local-private profiles compile and split independently:
//      public is a strict subset of local, and local-only definitions never
//      enter the public split.
// Node tests can only reach the pipeline through compileContent/
// buildSplitArtifacts/writeSplitArtifacts; the runtime adapter
// (src/adapters/content-repository.ts) consumes exactly these artifacts.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MARKERS = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;
const SNIPPET_MAX = 110; // mirrors the product budget documented in compile_content.mjs
const ELLIPSIS = ' \u2026';

const publicBundle = compileContent({ projectRoot: root, profile: 'public' });
const publicSplit = buildSplitArtifacts(publicBundle);
const localBundle = compileContent({ projectRoot: root, profile: 'local-private' });
const localSplit = buildSplitArtifacts(localBundle);

// --- 1: split round-trip equivalence -----------------------------------------

const SECTION_KEYS = ['legacyProjection', 'sources', 'tools', 'reviews'];

test('split index plus bodies plus sections rebuild every lesson and definition field exactly', () => {
  // Top-level catalog data must survive the split untouched — heavy route
  // sections ride in their own sidecar chunks and reattach field-exact.
  for (const key of Object.keys(publicBundle)) {
    if (key === 'lessons' || key === 'exerciseDefinitions' || SECTION_KEYS.includes(key)) continue;
    assert.deepEqual(publicSplit.index[key], publicBundle[key], `index field ${key} differs from the compiled bundle`);
  }
  for (const key of SECTION_KEYS) {
    assert.equal(publicSplit.index[key], undefined, `heavy section ${key} must not ship in the index`);
    assert.deepEqual(publicSplit.sections[Object.entries({ roadmap: 'legacyProjection', sources: 'sources', tools: 'tools', reviews: 'reviews' }).find(([, field]) => field === key)?.[0]][key],
      publicBundle[key], `section ${key} differs from the compiled bundle`);
  }

  for (const lesson of publicBundle.lessons) {
    const summary = publicSplit.index.lessons.find((item) => item.lessonId === lesson.lessonId);
    const body = publicSplit.lessonBodies.find((item) => item.id === lesson.lessonId);
    assert.ok(summary && body, `lesson ${lesson.lessonId} split incomplete`);
    assert.deepEqual(summary.blocks, [], `lesson ${lesson.lessonId} leaks blocks into the index`);
    assert.deepEqual(Object.keys(body.body).sort(), ['blocks', 'lessonId'], `lesson ${lesson.lessonId} body carries unexpected fields`);
    assert.deepEqual({ ...summary, ...body.body }, lesson, `lesson ${lesson.lessonId} does not round-trip through index + body`);
  }

  for (const exercise of publicBundle.exerciseDefinitions) {
    const summary = publicSplit.index.exerciseDefinitions.find((item) => item.definitionId === exercise.definitionId);
    const body = publicSplit.exerciseBodies.find((item) => item.id === exercise.definitionId);
    assert.ok(summary && body, `exercise ${exercise.definitionId} split incomplete`);
    const merged = { ...summary, ...body.body };
    const { promptSnippet, ...rest } = merged;
    assert.deepEqual(
      Object.keys(rest).sort(),
      Object.keys(exercise).sort(),
      `exercise ${exercise.definitionId}: merged key set differs from the original definition`,
    );
    for (const key of Object.keys(exercise)) {
      assert.deepEqual(rest[key], exercise[key], `exercise ${exercise.definitionId}: field ${key} differs after merge`);
    }
    // The summary must not duplicate any body field (a duplicated field could
    // drift silently between index and body chunk).
    for (const field of Object.keys(body.body)) {
      if (field === 'definitionId') continue;
      assert.equal(summary[field], undefined, `exercise ${exercise.definitionId}: index leaks body field ${field}`);
    }
  }
});

test('index.promptSnippet is the prefix-shortened form of the full prompt', () => {
  for (const exercise of publicBundle.exerciseDefinitions) {
    const summary = publicSplit.index.exerciseDefinitions.find((item) => item.definitionId === exercise.definitionId);
    const normalized = String(exercise.prompt).replace(/\s+/g, ' ').trim();
    const snippet = summary.promptSnippet;
    assert.equal(typeof snippet, 'string', `exercise ${exercise.definitionId}: promptSnippet must be a string`);
    assert.ok(snippet.length > 0, `exercise ${exercise.definitionId}: promptSnippet must not be empty`);
    if (normalized.length <= SNIPPET_MAX) {
      assert.equal(snippet, normalized, `exercise ${exercise.definitionId}: short prompt must be snippet verbatim`);
      continue;
    }
    assert.ok(snippet.endsWith(ELLIPSIS), `exercise ${exercise.definitionId}: long prompt snippet must end with an ellipsis marker`);
    const core = snippet.slice(0, -ELLIPSIS.length);
    assert.ok(core.length > 0 && core.length <= SNIPPET_MAX, `exercise ${exercise.definitionId}: snippet core exceeds ${SNIPPET_MAX} chars`);
    assert.ok(normalized.startsWith(core), `exercise ${exercise.definitionId}: snippet is not a prefix of the normalized prompt`);
  }
});

// --- 2: written artifacts and offline property --------------------------------

test('written split artifacts match chunks.ts registration exactly and stay inside the split directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ki-verify-split-'));
  try {
    writeSplitArtifacts(publicBundle, join(dir, 'split'));
    const splitDir = join(dir, 'split');
    const chunksSource = readFileSync(join(splitDir, 'chunks.ts'), 'utf8');

    // Offline / same-origin: every referenced path is relative, inside
    // ./lessons or ./exercises, without parent traversal, absolute paths,
    // protocol schemes, or doubled slashes. This is what guarantees that the
    // dynamic imports of src/adapters/content-repository.ts can never leave
    // the deployed origin.
    const importPaths = [...chunksSource.matchAll(/import\((['"])(.+?)\1\)/g)].map((match) => match[2]);
    const lessonImports = [...chunksSource.matchAll(/import\('\.\/lessons\/([^']+)\.json'\)/g)].map((match) => match[1]);
    const exerciseImports = [...chunksSource.matchAll(/import\('\.\/exercises\/([^']+)\.json'\)/g)].map((match) => match[1]);
    const sectionImports = [...chunksSource.matchAll(/import\('\.\/sections\/([^']+)\.json'\)/g)].map((match) => match[1]);
    assert.equal(importPaths.length, publicBundle.lessons.length + publicBundle.exerciseDefinitions.length + sectionImports.length,
      'chunks.ts must register exactly one import per lesson, per exercise and per route section');
    assert.deepEqual(sectionImports.sort(), ['reviews', 'roadmap', 'sources', 'tools'], 'the four route sections must be registered');
    const safePath = /^\.\/(?:lessons|exercises|sections)\/[A-Za-z0-9][A-Za-z0-9._-]{0,96}\.json$/;
    for (const path of importPaths) {
      assert.match(path, safePath, `chunk path ${path} is not a safe relative split path`);
      assert.ok(!path.includes('..') && !path.startsWith('/') && !path.includes('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path),
        `chunk path ${path} must be a relative same-origin path`);
      assert.ok(existsSync(join(splitDir, path)), `chunk file ${path} registered in chunks.ts but not written`);
    }

    // Registry equals the bundle ids in both directions.
    const registeredLessons = new Set(lessonImports);
    const registeredExercises = new Set(exerciseImports);
    assert.deepEqual(
      [...registeredLessons].sort(),
      publicBundle.lessons.map((lesson) => lesson.lessonId).sort(),
      'chunks.ts lesson registry differs from the bundle lesson ids',
    );
    assert.deepEqual(
      [...registeredExercises].sort(),
      publicBundle.exerciseDefinitions.map((exercise) => exercise.definitionId).sort(),
      'chunks.ts exercise registry differs from the bundle definition ids',
    );

    // No orphan chunk files: everything written is registered.
    const diskLessons = readdirSync(join(splitDir, 'lessons')).map((file) => file.replace(/\.json$/, ''));
    const diskExercises = readdirSync(join(splitDir, 'exercises')).map((file) => file.replace(/\.json$/, ''));
    assert.deepEqual(diskLessons.filter((id) => !registeredLessons.has(id)), [], 'unregistered lesson chunk files on disk');
    assert.deepEqual(diskExercises.filter((id) => !registeredExercises.has(id)), [], 'unregistered exercise chunk files on disk');
    const diskSections = readdirSync(join(splitDir, 'sections')).map((file) => file.replace(/\.json$/, ''));
    assert.deepEqual(diskSections.filter((id) => !new Set(sectionImports).has(id)), [], 'unregistered section chunk files on disk');

    // Written JSON equals the in-memory split artifacts byte for byte in
    // structure: the write path must not transform content.
    assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8')), publicSplit.index,
      'written index.json differs from buildSplitArtifacts output');
    for (const [name, body] of Object.entries(publicSplit.sections)) {
      assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'sections', `${name}.json`), 'utf8')), body,
        `written section chunk ${name} differs from buildSplitArtifacts output`);
    }
    for (const { id, body } of publicSplit.lessonBodies) {
      assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'lessons', `${id}.json`), 'utf8')), body,
        `written lesson chunk ${id} differs from buildSplitArtifacts output`);
    }
    for (const { id, body } of publicSplit.exerciseBodies) {
      assert.deepEqual(JSON.parse(readFileSync(join(splitDir, 'exercises', `${id}.json`), 'utf8')), body,
        `written exercise chunk ${id} differs from buildSplitArtifacts output`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('repo .content-build/public/split is current against a fresh compile when present', (t) => {
  // .content-build is a gitignored build artifact; only assert freshness when
  // a build exists, so a clean checkout without a build does not fail here.
  const splitDir = join(root, '.content-build/public/split');
  if (!existsSync(join(splitDir, 'chunks.ts'))) {
    t.skip('.content-build/public/split not built yet');
    return;
  }
  const diskIndex = JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8'));
  assert.deepEqual(diskIndex, publicSplit.index, '.content-build/public/split/index.json is stale — rerun tools/compile_content.mjs --profile public');
  const diskChunks = readFileSync(join(splitDir, 'chunks.ts'), 'utf8');
  assert.equal(diskChunks, publicSplit.chunks, '.content-build/public/split/chunks.ts is stale — rerun tools/compile_content.mjs --profile public');
  for (const { id, body } of publicSplit.exerciseBodies) {
    const path = join(splitDir, 'exercises', `${id}.json`);
    assert.ok(existsSync(path), `stale public split: exercise chunk ${id} missing`);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), body, `stale public split: exercise chunk ${id} differs`);
  }
  for (const { id, body } of publicSplit.lessonBodies) {
    const path = join(splitDir, 'lessons', `${id}.json`);
    assert.ok(existsSync(path), `stale public split: lesson chunk ${id} missing`);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), body, `stale public split: lesson chunk ${id} differs`);
  }
});

// --- 3: profile separation ----------------------------------------------------

test('public split excludes local-only definitions; the local profile may ship them (S1B profile contract)', () => {
  assert.equal(publicSplit.index.profile, 'public');
  assert.equal(localSplit.index.profile, 'local-private');

  const publicDefinitionIds = new Set(publicBundle.exerciseDefinitions.map((exercise) => exercise.definitionId));
  const localDefinitionIds = new Set(localBundle.exerciseDefinitions.map((exercise) => exercise.definitionId));
  const publicLessonIds = new Set(publicBundle.lessons.map((lesson) => lesson.lessonId));
  const localLessonIds = new Set(localBundle.lessons.map((lesson) => lesson.lessonId));

  for (const id of publicDefinitionIds) assert.ok(localDefinitionIds.has(id), `public definition ${id} missing from the local profile`);
  for (const id of publicLessonIds) assert.ok(localLessonIds.has(id), `public lesson ${id} missing from the local profile`);

  const localOnly = [...localDefinitionIds].filter((id) => !publicDefinitionIds.has(id));
  // S1B profile contract: local-only definitions may deliberately exist in
  // the local-private profile (>= 0, no upper bound asserted here) — the
  // contract pins the projections, not the authoring-tree count. Every
  // exclusion below must hold for whatever local-only set exists.

  // The split is the delivery path, so exclusion must hold there as well:
  // local-only ids may appear neither in the public index nor in chunks.ts.
  const publicIndexIds = new Set(publicSplit.index.exerciseDefinitions.map((exercise) => exercise.definitionId));
  for (const id of localOnly) {
    assert.equal(publicIndexIds.has(id), false, `local-only definition ${id} leaked into the public split index`);
    assert.equal(publicSplit.chunks.includes(`'${id}'`), false, `local-only definition ${id} leaked into the public chunks registry`);
  }

  // The excluded set must be exactly the definitions that are local-only by
  // the documented public filter (releaseStatus local-only).
  for (const id of localOnly) {
    const definition = localBundle.exerciseDefinitions.find((exercise) => exercise.definitionId === id);
    assert.ok(definition.releaseStatus === 'local-only',
      `definition ${id} is excluded from public without being local-only`);
  }
  for (const exercise of publicBundle.exerciseDefinitions) {
    assert.equal(exercise.releaseStatus === 'local-only', false,
      `public bundle contains a definition that must stay local-only: ${exercise.definitionId}`);
  }

  // Fail-closed: the public split (index and chunk registry) carries no
  // private markers, and the local registry still covers its own bundle.
  assert.doesNotMatch(JSON.stringify(publicSplit.index), PRIVATE_MARKERS, 'public split index leaks a private marker');
  assert.doesNotMatch(publicSplit.chunks, PRIVATE_MARKERS, 'public chunks registry leaks a private marker');
  const localRegistryIds = new Set([...localSplit.chunks.matchAll(/import\('\.\/exercises\/([^']+)\.json'\)/g)].map((match) => match[1]));
  assert.deepEqual([...localRegistryIds].sort(), [...localDefinitionIds].sort(), 'local chunks registry must cover the full local bundle');
});

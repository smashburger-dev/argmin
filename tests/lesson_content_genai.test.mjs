import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyOracle } from './helpers/legacy_oracle.mjs';
import {
  genRecallAtK, genF1orPrecision, genInjectionFlagCount, genAllowedActionCount,
} from '../assets/js/core/w27_w30_generators.mjs';

// Content contract tests for weeks 27-30 (RAG, evaluation, defensive GenAI
// security, prototype). The packs are registered in content/catalog.json;
// these checks still read the authored files directly so a regression in
// the compiler cannot mask an authoring defect.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W27_W30_SEED_GENERATORS = {
  genRecallAtK, genF1orPrecision, genInjectionFlagCount, genAllowedActionCount,
};
const WEEKS = ['w27', 'w28', 'w29', 'w30'];
const COMPETENCY_BY_WEEK = {
  w27: 'c-genai-rag',
  w28: 'c-genai-eval',
  w29: 'c-genai-security',
  w30: 'c-genai-prototype',
};
const GENERATOR_BY_WEEK = {
  w27: 'genRecallAtK',
  w28: 'genF1orPrecision',
  w29: 'genInjectionFlagCount',
  w30: 'genAllowedActionCount',
};
const SEED_RANGE = {
  w27: [2701, 2760],
  w28: [2801, 2860],
  w29: [2901, 2960],
  w30: [3001, 3060],
};
const REQUIRED = ['exerciseId', 'schemaVersion', 'skillIds', 'type', 'prompt', 'locale',
  'grader', 'parameters', 'deterministicSeed', 'tolerancePolicy', 'hints',
  'fullSolution', 'difficulty', 'estimatedMinutes', 'sourceLineage', 'license',
  'validationStatus', 'testedSeedCount'];
const AUTHORITATIVE = new Set(['deterministic', 'pyodide', 'pyodide-sympy']);
const ALLOWED_SOURCES = new Set([
  'arxiv-rag-2020', 'iir-book-ch8', 'craswell-mrr-2009', 'ragas-docs',
  'owasp-genai-llm-top10', 'nist-airmf', 'mitre-atlas', 'openai-cookbook',
  'numpy-docs', 'sklearn-user-guide', 'hf-transformers-docs', 'model-cards-paper',
]);

const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const pack = (weekId) => legacyOracle.weeks[weekId];
const exercisesOf = (weekId) => pack(weekId).exercises;
const tier = (d) => (d <= 1 ? 'basic' : d === 2 ? 'core' : d === 3 ? 'advanced' : 'finalBoss');

const ALL_EXERCISES = WEEKS.flatMap((weekId) => exercisesOf(weekId).map((ex) => ({ weekId, ex })));

// --- week pack structure -----------------------------------------------------------







// --- numeric seed-generator slots ---------------------------------------------------



// --- predict-output slots ------------------------------------------------------------



// --- python-code slots ----------------------------------------------------------------







// --- competency coverage ---------------------------------------------------------------





// --- lessons -----------------------------------------------------------------------------

const LESSONS = [
  { id: 'l-genai-rag', file: 'rag-retrieval', competency: 'c-genai-rag' },
  { id: 'l-genai-eval', file: 'genai-evaluation', competency: 'c-genai-eval' },
  { id: 'l-genai-security', file: 'genai-security', competency: 'c-genai-security' },
  { id: 'l-genai-prototype', file: 'genai-prototype', competency: 'c-genai-prototype' },
];

test('w27-w30 lessons follow the canonical lesson contract with allowed readings only', () => {
  const sources = new Set(readJson('content/sources.json').sources.map((s) => s.sourceId));
  for (const lesson of LESSONS) {
    const doc = readJson(`content/lessons/genai-systems/${lesson.file}.json`);
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.lessonId, lesson.id);
    assert.equal(doc.version, 1);
    assert.equal(doc.locale, 'de');
    assert.deepEqual(doc.competencyIds, [lesson.competency]);
    assert.equal(doc.rightsId, 'ki-lernplattform-original');
    assert.equal(doc.releaseStatus, 'draft');
    assert.ok(doc.title.length > 0);
    assert.ok(doc.objectives.length >= 3, `${lesson.id}: objectives`);
    assert.ok(doc.requires.length >= 1, `${lesson.id}: requires`);
    assert.ok(doc.estimatedMinutes >= 60 && doc.estimatedMinutes <= 90, `${lesson.id}: estimatedMinutes`);
    const types = doc.blocks.map((b) => b.type);
    assert.ok(types.includes('worked-example'), `${lesson.id}: worked-example block missing`);
    assert.ok(types.includes('checkpoint') || types.includes('explanation'), `${lesson.id}: checkpoint missing`);
    for (const block of doc.blocks) {
      assert.ok(block.blockId && block.contentRef.endsWith('.md'), `${lesson.id}: contentRef must point at markdown`);
      assert.ok(existsSync(join(root, 'content', block.contentRef)), `${lesson.id}: ${block.contentRef} fehlt`);
    }
    assert.ok(doc.sourceRefs.length >= 3, `${lesson.id}: needs readings`);
    for (const ref of doc.sourceRefs) {
      assert.ok(ALLOWED_SOURCES.has(ref.sourceId), `${lesson.id}: source ${ref.sourceId} not in the w27-w30 allowlist`);
      assert.ok(sources.has(ref.sourceId), `${lesson.id}: unknown sourceId ${ref.sourceId}`);
      assert.ok(['primary', 'reference', 'practice', 'remedial'].includes(ref.role));
    }
  }
});

test('w27-w30 lesson markdown is German, in budget and links only its own exercises', () => {
  for (const lesson of LESSONS) {
    const md = readFileSync(join(root, `content/lessons/genai-systems/${lesson.file}.md`), 'utf8');
    const words = md.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 500 && words <= 900, `${lesson.file}.md has ${words} words (budget 500-900)`);
    assert.match(md, /## Direkter Check/, `${lesson.file}.md: Direkter Check fehlt`);
    assert.equal(md.includes('```html'), false, `${lesson.file}.md: raw HTML verboten`);
    const weekId = `w${lesson.id.slice(-6) === 'l-genai' ? '' : ''}`; // not used; explicit below
    void weekId;
    const links = [...md.matchAll(/#\/exercise\/(w\d+-e\d)/g)].map((m) => m[1]);
    assert.ok(links.length >= 3, `${lesson.file}.md: too few exercise links`);
    for (const link of links) {
      const week = link.slice(0, 3);
      assert.ok(WEEKS.includes(week), `${lesson.file}.md links foreign exercise ${link}`);
    }
  }
});

test('w27-w30 lesson requires match the competency catalog edges', () => {
  const competencies = new Map(readJson('content/competencies/core.json').competencies.map((c) => [c.competencyId, c]));
  for (const lesson of LESSONS) {
    const doc = readJson(`content/lessons/genai-systems/${lesson.file}.json`);
    const competency = competencies.get(lesson.competency);
    for (const required of doc.requires) {
      assert.ok(competency.requires.includes(required),
        `${lesson.id}: requires ${required} is not a catalog prerequisite of ${lesson.competency}`);
    }
  }
});

// --- runner project -----------------------------------------------------------------------

const PROJECT_DIR = 'content/projects/rag-secure-prototype';

test('w30 ships the rag-secure-prototype runner project after the ml-repro pattern', () => {
  const project = readJson(`${PROJECT_DIR}/project.json`);
  assert.equal(project.schemaVersion, 1);
  assert.equal(project.projectId, 'p-rag-secure-prototype');
  assert.equal(project.version, 1);
  assert.equal(project.locale, 'de');
  assert.equal(project.runnerMode, 'local');
  assert.deepEqual(project.competencyIds, ['c-genai-prototype']);
  assert.deepEqual(project.requires.sort(), ['c-genai-eval', 'c-genai-rag', 'c-genai-security'].sort());
  assert.deepEqual(project.allowedCommands[0].args, ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests']);
  assert.equal(project.allowedCommands[0].program, 'python');
  assert.ok(project.testBundleId.startsWith('rag-secure-prototype-tests-'));
  assert.equal(project.rightsId, 'ki-lernplattform-original');
  assert.equal(project.releaseStatus, 'draft');
  for (const file of project.starterFiles) {
    assert.ok(existsSync(join(root, PROJECT_DIR, file)), `${file} fehlt im Projektordner`);
  }
});

test('rag-secure-prototype manifest pins the test file hash', () => {
  const manifest = readJson(`${PROJECT_DIR}/check-manifest.json`);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.projectId, 'p-rag-secure-prototype');
  assert.equal(manifest.projectVersion, '1');
  assert.deepEqual(manifest.testPaths, ['tests']);
  const paths = manifest.requiredFiles.map((f) => f.path);
  assert.ok(paths.includes('src/prototype.py'));
  assert.ok(paths.includes('tests/test_prototype.py'));
  for (const file of manifest.requiredFiles) {
    const full = join(root, PROJECT_DIR, file.path);
    assert.ok(existsSync(full), `${file.path} fehlt`);
    if (file.sha256 === null) continue; // learner-editable file stays unpinned
    const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
    assert.equal(actual, file.sha256, `${file.path}: sha256 weicht ab`);
  }
});

test('rag-secure-prototype keeps starter TODOs, reference solution and defensive fixtures', () => {
  const starter = readFileSync(join(root, PROJECT_DIR, 'src/prototype.py'), 'utf8');
  assert.ok((starter.match(/TODO/g) || []).length >= 6, 'starter needs TODO markers');
  assert.ok(starter.includes('example.invalid'), 'defensive injection fixture missing');
  assert.ok(!starter.includes('requests'), 'starter must not call the network');
  const solution = readFileSync(join(root, PROJECT_DIR, 'solution/prototype.py'), 'utf8');
  assert.ok(solution.includes('def ablation'), 'solution lacks ablation');
  const readme = readFileSync(join(root, PROJECT_DIR, 'README.md'), 'utf8');
  for (const section of ['Threat Model', 'Grenzen', 'Least Privilege', 'pytest']) {
    assert.ok(readme.includes(section), `README section ${section} fehlt`);
  }
  assert.ok(readme.includes('kein produktives LLM-System'), 'README must state the honest limits');
});

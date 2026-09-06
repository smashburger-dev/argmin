import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent, buildSplitArtifacts } from '../tools/compile_content.mjs';
import { routeForDefinition } from '../assets/js/domain/activity_route.mjs';

// End-to-end acceptance contracts for the W31-W39 research/capstone phase
// (ADR-0014) that go beyond the per-week files verify_w31_w34/verify_w35_w39:
//   (a) week contracts: detailed, 600 minutes, unit competencies exist, unit
//       sources resolve in sources.json, every unit keeps a publicEligible
//       source (open / link-only / generated)
//   (b) no semantic prompt copies inside W31-W39 and against W18-W30
//       (clause-family boilerplate masking + residual 8-gram / 48-char-window
//       overlap — stricter than the 80-char prefix check in verify_w02_w04)
//   (c) manual-rubric exclusion, mastery grader whitelist, non-mastery = diff 1
//   (d) every W31-W39 exercise is routable in the next shell and present in
//       the compiled split index (fresh compile + checked-in artifact)
//   (e) p-rag-capstone phases.json covers w35-w39 bijectively with test files
//   (f) both compile profiles ship p-rag-capstone; public W31-W39 units carry
//       no localPath/locatorPath
//   (g) no cumulativeExerciseRef (and no curriculum entry at all) still
//       carries future:true — all 39 weeks are authored
//   (h) the sibling verify_* tests derive totals from files instead of
//       hardcoding growth counters (see tests/helpers/content_counts.mjs)
//   (i) tools/measure_next_timing.mjs keeps the ADR-0014 measurement
//       contract: 7 runs, median AND min-max spread, external request metering

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NEW_WEEKS = Array.from({ length: 9 }, (_, i) => `w${31 + i}`); // w31..w39
const LEGACY_WEEKS = Array.from({ length: 13 }, (_, i) => `w${18 + i}`); // w18..w30
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const curriculum = readJson(join(ROOT, 'content', 'curriculum.json'));
const competencyIds = new Set(readJson(join(ROOT, 'content', 'competencies', 'core.json')).competencies.map((c) => c.competencyId));
const sourcesById = new Map(readJson(join(ROOT, 'content', 'sources.json')).sources.map((s) => [s.sourceId, s]));
const packages = Object.fromEntries([...NEW_WEEKS, ...LEGACY_WEEKS].map((week) => [
  week,
  readJson(join(ROOT, 'content', 'exercises', `${week}.json`)),
]));
const weeksById = new Map(curriculum.weeks.map((week) => [week.weekId, week]));

// (a) week contracts ----------------------------------------------------------------------

test('(a) w31-w39: detailed weeks, 600 minutes, resolvable units with publicEligible sources', () => {
  const publicEligible = new Set(['open', 'link-only', 'generated']);
  for (const weekId of NEW_WEEKS) {
    const week = weeksById.get(weekId);
    assert.ok(week, `${weekId} missing in curriculum.json`);
    assert.equal(week.detailed, true, `${weekId} must be detailed (ADR-0014)`);
    // 600 minutes is the ADR-0014 minute-sum contract (Lektüre + Praxis +
    // Projekt), a product heuristic — asserted here as the acceptance bar.
    assert.equal(week.minutes, 600, `${weekId}: expected 600 minutes`);
    assert.ok(week.learningUnits.length >= 1, `${weekId}: no learning units`);
    for (const unit of week.learningUnits) {
      assert.ok(competencyIds.has(unit.competencyId),
        `${weekId}/${unit.unitId}: competency ${unit.competencyId} missing in core.json`);
      assert.ok(unit.sources.length >= 1, `${weekId}/${unit.unitId}: no sources`);
      for (const reference of unit.sources) {
        assert.ok(sourcesById.has(reference.sourceId),
          `${weekId}/${unit.unitId}: unknown sourceId ${reference.sourceId}`);
      }
      assert.ok(unit.sources.some((reference) => publicEligible.has(sourcesById.get(reference.sourceId).contentClass)),
        `${weekId}/${unit.unitId}: no source with contentClass open/link-only/generated`);
    }
  }
});

// (b) no semantic prompt copies -------------------------------------------------------------

// House-pattern instruction clauses ("Was gibt dieses Programm aus? …") are
// shared by design across W18-W39 and must not count as content duplication.
// They are identified data-driven: clauses whose family (near-duplicates with
// token-Jaccard >= 0.7) occurs in >= 4 distinct exercises are boilerplate and
// get masked. What remains (the topical residual) is compared pairwise:
//   fail  <=>  shared residual 48-char window (>= 8 average German words)
//              OR >= 3 shared residual 8-word grams
// The window is 48 instead of 40 chars because the longest legitimate shared
// run in the accepted corpus is 41 chars: the platform-wide canonical-JSON
// hashing convention ("sha256 über die kanonische JSON-Serialisierung,
// sortierte Schlüssel, keine Leerzeichen, utf-8") used by w35-e6 and w38-e6 —
// a technical convention inherited from W30, not duplicated task content.

const normalizeClause = (text) => String(text)
  .replace(/<[^>]+>/g, ' ')
  .toLowerCase()
  .replace(/[^a-zäöüß0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const clausesOf = (text) => String(text)
  .replace(/<[^>]+>/g, ' ')
  .split(/[.!?;:«»"]/)
  .map(normalizeClause)
  .filter((clause) => clause.length > 0);

function buildBoilerplate(exercises) {
  const owners = new Map();
  exercises.forEach((exercise, index) => {
    for (const clause of new Set(clausesOf(exercise.prompt))) {
      if (!owners.has(clause)) owners.set(clause, new Set());
      owners.get(clause).add(index);
    }
  });
  const distinct = [...owners.keys()];
  const jaccard = (a, b) => {
    const tokensA = new Set(a.split(' '));
    const tokensB = new Set(b.split(' '));
    let intersection = 0;
    for (const token of tokensA) if (tokensB.has(token)) intersection += 1;
    return intersection / (tokensA.size + tokensB.size - intersection);
  };
  const parent = new Map(distinct.map((clause) => [clause, clause]));
  const find = (clause) => {
    while (parent.get(clause) !== clause) {
      parent.set(clause, parent.get(parent.get(clause)));
      clause = parent.get(clause);
    }
    return clause;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };
  // Near-duplicate clauses must have near-equal length; comparing only within
  // a length window keeps the family build linear-ish instead of quadratic.
  const byLength = [...distinct].sort((a, b) => a.length - b.length);
  for (let i = 0; i < byLength.length; i += 1) {
    for (let j = i + 1; j < byLength.length && byLength[j].length - byLength[i].length <= 12; j += 1) {
      if (jaccard(byLength[i], byLength[j]) >= 0.7) union(byLength[i], byLength[j]);
    }
  }
  const familyExercises = new Map();
  for (const clause of distinct) {
    const root = find(clause);
    if (!familyExercises.has(root)) familyExercises.set(root, new Set());
    for (const index of owners.get(clause)) familyExercises.get(root).add(index);
  }
  const boilerplate = new Set();
  for (const [root, exerciseSet] of familyExercises) {
    if (exerciseSet.size < 4) continue;
    for (const clause of distinct) if (find(clause) === root) boilerplate.add(clause);
  }
  return boilerplate;
}

const residualOf = (prompt, boilerplate) => clausesOf(prompt)
  .filter((clause) => !boilerplate.has(clause))
  .join(' ');
const wordGrams = (text, size) => {
  const words = normalizeClause(text).split(' ').filter(Boolean);
  const grams = new Set();
  for (let i = 0; i + size <= words.length; i += 1) grams.add(words.slice(i, i + size).join(' '));
  return grams;
};
const charWindows = (text, size) => {
  const compact = normalizeClause(text).replace(/ /g, '');
  const windows = new Set();
  for (let i = 0; i + size <= compact.length; i += 1) windows.add(compact.slice(i, i + size));
  return windows;
};

const CORPUS = [...NEW_WEEKS, ...LEGACY_WEEKS].flatMap((week) => (
  packages[week].exercises.map((exercise) => ({
    id: exercise.exerciseId,
    week,
    prompt: exercise.prompt,
  }))
));
const BOILERPLATE = buildBoilerplate(CORPUS);

function findDuplicatePairs(exercises, boilerplate) {
  const residuals = exercises.map((exercise) => residualOf(exercise.prompt, boilerplate));
  const grams = residuals.map((residual) => wordGrams(residual, 8));
  const windows = residuals.map((residual) => charWindows(residual, 48));
  const duplicates = [];
  for (let i = 0; i < exercises.length; i += 1) {
    for (let j = i + 1; j < exercises.length; j += 1) {
      const isNew = (week) => NEW_WEEKS.includes(week);
      // Pairs inside W31-W39 and cross W31-W39 vs W18-W30; W18-W30-internal
      // pairs are out of scope here (legacy, covered by their own tests).
      if (!isNew(exercises[i].week) && !isNew(exercises[j].week)) continue;
      let sharedGrams = 0;
      for (const gram of grams[i]) if (grams[j].has(gram)) sharedGrams += 1;
      let sharedWindows = 0;
      for (const window of windows[i]) if (windows[j].has(window)) sharedWindows += 1;
      if (sharedWindows >= 1 || sharedGrams >= 3) {
        duplicates.push({
          a: exercises[i].id,
          b: exercises[j].id,
          sharedGrams,
          sharedWindows,
          sample: residuals[i].slice(0, 90),
        });
      }
    }
  }
  return duplicates;
}

test('(b) w31-w39 prompts contain no semantic copies (self-calibrating detector)', () => {
  // The detector must not be vacuous: prove it flags injected duplication
  // (boilerplate model fixed to the real corpus so the controls only measure
  // detection power, not masking drift).
  const inject = (targetId, prompt) => CORPUS.map((exercise) => (
    exercise.id === targetId ? { ...exercise, prompt } : exercise
  ));
  const source = CORPUS.find((exercise) => exercise.id === 'w32-e6');
  const copied = findDuplicatePairs(
    inject('w39-e6', source.prompt.replace(/Data-Card/g, 'System-Card')),
    BOILERPLATE,
  ).filter((pair) => (pair.a === 'w39-e6') !== (pair.b === 'w39-e6'));
  assert.ok(copied.length >= 1, 'control 1 failed: a topical prompt copy must be flagged');
  assert.ok(copied[0].sharedWindows > 40, `control 1 too weak: only ${copied[0].sharedWindows} shared windows`);

  const renumbered = findDuplicatePairs(
    inject('w39-e6', source.prompt.replace(/Data-Card/g, 'System-Card').replace(/\b\d+\b/g, '7')),
    BOILERPLATE,
  ).filter((pair) => (pair.a === 'w39-e6') !== (pair.b === 'w39-e6'));
  assert.ok(renumbered.length >= 1, 'control 2 failed: a number-swapped copy must still be flagged');

  const sentenceCopy = findDuplicatePairs(
    inject('w32-e1', CORPUS.find((exercise) => exercise.id === 'w31-e1').prompt),
    BOILERPLATE,
  ).filter((pair) => (pair.a === 'w32-e1') !== (pair.b === 'w32-e1'));
  assert.ok(sentenceCopy.length >= 1, 'control 3 failed: a copied concept prompt must be flagged');

  // The real acceptance check: current content must be clean.
  const duplicates = findDuplicatePairs(CORPUS, BOILERPLATE);
  assert.deepEqual(duplicates, [],
    `semantic prompt copies found (shared 48-char window or >=3 shared 8-grams): ${JSON.stringify(duplicates, null, 1)}`);
});

// (c) grader and mastery policy ------------------------------------------------------------

test('(c) w31-w39: no manual-rubric, mastery graders whitelisted, non-mastery = difficulty 1', () => {
  const masteryGraders = new Set(['deterministic', 'pyodide', 'pyodide-sympy']);
  for (const weekId of NEW_WEEKS) {
    for (const exercise of packages[weekId].exercises) {
      assert.notEqual(exercise.grader, 'manual-rubric',
        `${exercise.exerciseId}: research artifacts are Work Evidence and must not use manual-rubric`);
      if (exercise.masteryEligible !== false) {
        assert.ok(masteryGraders.has(exercise.grader),
          `${exercise.exerciseId}: mastery-eligible tasks need a deterministic grader, got ${exercise.grader}`);
      } else {
        assert.equal(exercise.difficulty, 1,
          `${exercise.exerciseId}: non-mastery tasks are the diff-1 concept slot, got difficulty ${exercise.difficulty}`);
      }
    }
  }
});

// (d) native routes and split index --------------------------------------------------------

test('(d) every w31-w39 exercise is routable and present in the compiled split index', () => {
  const bundle = compileContent({ projectRoot: ROOT, profile: 'public' });
  const splitIndex = buildSplitArtifacts(bundle).index;
  const indexIds = new Set(splitIndex.exerciseDefinitions.map((definition) => definition.definitionId));

  for (const weekId of NEW_WEEKS) {
    for (const exercise of packages[weekId].exercises) {
      const definition = bundle.exerciseDefinitions.find((entry) => entry.definitionId === exercise.exerciseId);
      assert.ok(definition, `${exercise.exerciseId} missing in compiled public bundle`);
      assert.ok(indexIds.has(exercise.exerciseId),
        `${exercise.exerciseId} missing in split index.json (next shell cannot lazy-load it)`);
      const route = routeForDefinition({ definitionId: definition.definitionId, activityType: definition.activityType });
      assert.match(route, /^#\/(exercise|lab)\/w3[1-9]-e\d+$/,
        `${exercise.exerciseId}: unexpected route ${route}`);
    }
  }

  // The checked-in artifact must not lag behind content/: if it exists, it has
  // to serve every current W31-W39 exercise id (stale split = broken routes).
  const checkedIn = join(ROOT, '.content-build', 'public', 'split', 'index.json');
  if (existsSync(checkedIn)) {
    const checkedInIds = new Set(readJson(checkedIn).exerciseDefinitions.map((definition) => definition.definitionId));
    for (const weekId of NEW_WEEKS) {
      for (const exercise of packages[weekId].exercises) {
        assert.ok(checkedInIds.has(exercise.exerciseId),
          `${exercise.exerciseId} missing in .content-build/public/split/index.json — recompile (node tools/compile_content.mjs --profile public)`);
      }
    }
  }
});

// (e) project phase contract ----------------------------------------------------------------

test('(e) p-rag-capstone phases cover w35-w39 with a bijection to the project test files', () => {
  const projectDir = join(ROOT, 'content', 'projects', 'rag-capstone');
  const phases = readJson(join(projectDir, 'phases.json')).phases;
  assert.deepEqual(phases.map((phase) => phase.weekId), ['w35', 'w36', 'w37', 'w38', 'w39'],
    'phases.json must cover exactly w35-w39');
  const referenced = phases.map((phase) => phase.testFile);
  assert.equal(new Set(referenced).size, referenced.length, 'a test file belongs to more than one phase');
  for (const phase of phases) {
    assert.ok(weeksById.has(phase.weekId), `${phase.phaseId}: unknown week ${phase.weekId}`);
    assert.match(phase.testFile, /^tests\/test_.*\.py$/, `${phase.phaseId}: testFile must live in tests/`);
    assert.ok(existsSync(join(projectDir, phase.testFile)), `${phase.phaseId}: ${phase.testFile} missing`);
    assert.ok(typeof phase.deliverable === 'string' && phase.deliverable.length > 20,
      `${phase.phaseId}: deliverable missing`);
  }
  // Reverse direction: no orphan test files outside the phase contract.
  const pyFiles = readdirSync(join(projectDir, 'tests'))
    .filter((name) => name.endsWith('.py'))
    .map((name) => `tests/${name}`);
  assert.deepEqual(
    [...pyFiles].filter((file) => !referenced.includes(file)).sort(),
    [],
    'test files in the project not covered by any phase',
  );
});

// (f) compile profiles -----------------------------------------------------------------------

test('(f) both compile profiles ship p-rag-capstone; public w31-w39 units stay free of local markers', () => {
  const bundles = {
    public: compileContent({ projectRoot: ROOT, profile: 'public' }),
    'local-private': compileContent({ projectRoot: ROOT, profile: 'local-private' }),
  };
  for (const [profile, bundle] of Object.entries(bundles)) {
    assert.ok(bundle.projects.some((project) => project.projectId === 'p-rag-capstone'),
      `p-rag-capstone missing in the ${profile} bundle`);
  }
  for (const weekId of NEW_WEEKS) {
    const week = bundles.public.legacyProjection.weeks.find((entry) => entry.weekId === weekId);
    assert.ok(week, `${weekId} missing in public legacy projection`);
    const unitsJson = JSON.stringify(week.learningUnits);
    assert.doesNotMatch(unitsJson, /"(localPath|locatorPath)"/,
      `${weekId}: public learning units leak local file markers`);
  }
});

// (g) no future flags -------------------------------------------------------------------------

function collectFutureFlags(node, path, hits) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => collectFutureFlags(value, `${path}[${index}]`, hits));
    return hits;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'future' && value === true) hits.push(`${path}.${key}`);
      collectFutureFlags(value, `${path}.${key}`, hits);
    }
  }
  return hits;
}

test('(g) no cumulativeExerciseRef (and no curriculum node) still carries future:true', () => {
  for (const week of curriculum.weeks) {
    const refs = week.gate?.cumulativeExerciseRefs || [];
    for (const ref of refs) {
      assert.notEqual(ref.future, true, `${week.weekId}: cumulativeExerciseRef ${ref.weekId}/${ref.skillId} still future`);
    }
  }
  // All 39 weeks are authored now, so the projection must not defer anything.
  const hits = collectFutureFlags(curriculum, 'curriculum', []);
  assert.deepEqual(hits, [], 'future:true found in curriculum.json');
  assert.equal(curriculum.weeks.length, curriculum.totalWeeks, 'week count must match totalWeeks');
});

// (h) growth-counter hygiene in the sibling verify tests --------------------------------------
//
// verify_w31_w34.test.mjs and verify_w35_w39.test.mjs must derive corpus
// totals from files (house rule, cf. tests/helpers/content_counts.mjs and the
// ADR-0013 growth-counter rule). Flagged: an EQUALITY assertion whose one side
// is a count-typed expression (\.length, \.size, count, total, Anzahl, Seeds)
// and whose other side is a bare numeric literal > 10 — e.g. tasks=54.
// Justified exceptions (kept out of the flag set by design):
//   - inequality quality floors on STRING length (md.length > 2000,
//     fullSolution.length > 80, deliverable.length > 20) — they bound prose
//     quality, not the number of exercises, and growth cannot break them;
//   - config contract literals that are not counts (manifest.timeoutSeconds
//     === 120) — pinned by the project schema, not by corpus size;
//   - seed/minute RANGE literals (>= 3500, <= 3999, 45..90) — interval bounds
//     encoded from the week number, never a total;
//   - literals <= 10 (exercises per week = 6): the ADR-0014 house pattern is a
//     per-week contract; only cross-week TOTALS must be derived.

const COUNT_TYPED = /\.length\b|\.size\b|\bcount\b|\bCount\b|\btotal\b|\bAnzahl\b|\bSeeds\b/;

test('(h) verify_w31_w34/verify_w35_w39 assert no hardcoded growth totals', () => {
  for (const file of ['verify_w31_w34.test.mjs', 'verify_w35_w39.test.mjs']) {
    const lines = readFileSync(join(ROOT, 'tests', file), 'utf8').split('\n');
    lines.forEach((line, index) => {
      const isCountTyped = COUNT_TYPED.test(line);
      // Equality (not !==, not relational bounds) compared against a literal.
      const isEquality = /assert\.(equal|strictEqual|deepEqual)\(/.test(line)
        || /(?<![<>!=])(?:===|==)\s*\d/.test(line);
      if (!isCountTyped || !isEquality) return;
      // Ignore numbers inside assertion message strings.
      const withoutStrings = line.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');
      const literals = [...withoutStrings.matchAll(/(?<![\w.])(\d+)(?![\w.])/g)]
        .map((match) => Number(match[1]))
        .filter((value) => value > 10);
      assert.deepEqual(literals, [],
        `${file}:${index + 1} hardcodes a growth total (${literals}) — derive it from the content files instead`);
    });
  }
});

// (i) performance measurement contract --------------------------------------------------------

test('(i) tools/measure_next_timing.mjs keeps 7 runs, median, min-max spread and external request metering', () => {
  const script = readFileSync(join(ROOT, 'tools', 'measure_next_timing.mjs'), 'utf8');
  // 7 runs by default (ADR-0014 Teil 5: "Messung ..., 7 Läufe, Median/min-max").
  assert.match(script, /process\.argv\[3\]\s*\|\|\s*7\b/, 'default run count must stay 7');
  assert.match(script, /\bruns\b/, 'run count must remain parameterizable');
  // Median across runs.
  assert.match(script, /median\s*\(/, 'median helper missing');
  assert.match(script, /report\.median/, 'report must publish the median');
  // Spread as min/max.
  assert.match(script, /Math\.min/, 'spread must include the minimum');
  assert.match(script, /Math\.max/, 'spread must include the maximum');
  assert.match(script, /report\.spread/, 'report must publish the spread');
  // External (non-same-origin) request metering must stay fail-closed.
  assert.match(script, /externalRequests/, 'external request counter missing');
  assert.match(script, /url\.origin\s*!==/, 'external requests must be detected via origin comparison');
  assert.match(script, /EXTERNAL REQUESTS DETECTED/, 'non-zero external requests must fail the measurement');
});

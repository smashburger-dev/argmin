import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { W31_W39_SEED_GENERATORS } from '../assets/js/core/w31_w39_generators.mjs';

// Contract tests for the W31-W34 research-phase content (ADR-0014 part 2):
//   (a) every target competency has >= 1 lesson with exactly that primary
//       competency and the requires edges from content/competencies/core.json
//   (b) lesson sourceRefs only use the allowlisted sourceIds per week
//   (c) every week package has 6 exercises in the house pattern
//       (e1 single-choice/diff1/non-mastery, e2 numeric with a seeded
//       generator from w31_w39_generators.mjs, >= 2 mastery-eligible
//       python-code tasks, max difficulty >= 4)
//   (d) hints never disclose the full solution (shorter than fullSolution,
//       no numeric answer in hints)
//   (e) every python-code tests string ends with print("ok wNN-eM")
//   (f) no duplicate deterministicSeeds inside a package
//   (g) prompts are German (heuristic: no run of >= 8 English stopword-like
//       tokens in a row)

const WEEKS = ['w31', 'w32', 'w33', 'w34'];

const LESSONS = {
  w31: { file: 'research/research-question.json', competency: 'c-research-question' },
  w32: { file: 'research/research-cards.json', competency: 'c-research-cards' },
  w33: { file: 'research/responsible-ai.json', competency: 'c-research-responsible' },
  w34: { file: 'research/capstone-baseline.json', competency: 'c-research-capstone' },
};

const ALLOWED_SOURCES = {
  w31: ['cos-prereg', 'stanford-encyclopedia-popper', 'neurips-paper-checklist', 'jhangiani-research-methods'],
  w32: ['datasheets-for-datasets', 'hf-model-cards-docs', 'data-cards-playbook', 'gpt4-system-card'],
  w33: ['fairlearn', 'fairmlbook', 'aequitas-toolkit', 'strubell-energy', 'stanford-ai-index-2025'],
  w34: ['helm-leaderboard', 'helm-paper', 'lm-evaluation-harness', 'acm-artifact-badging'],
};

function readJson(relative) {
  return JSON.parse(readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8'));
}

const packages = Object.fromEntries(WEEKS.map((week) => [week, readJson(`content/exercises/${week}.json`)]));
const lessons = Object.fromEntries(WEEKS.map((week) => [week, readJson(`content/lessons/${LESSONS[week].file}`)]));
const competencies = readJson('content/competencies/core.json').competencies;

// (a) competency -> lesson wiring -------------------------------------------------------

for (const week of WEEKS) {
  const { competency } = LESSONS[week];
  const lesson = lessons[week];

  test(`(a) ${week}: lesson targets exactly ${competency} with core.json requires`, () => {
    const core = competencies.find((c) => c.competencyId === competency);
    assert.ok(core, `${competency} missing in core.json`);
    assert.deepEqual(lesson.competencyIds, [competency]);
    assert.deepEqual([...lesson.requires].sort(), [...core.requires].sort());
    assert.equal(lesson.locale, 'de');
    assert.equal(lesson.releaseStatus, 'draft');
    assert.equal(lesson.rightsId, 'ki-lernplattform-original');
    assert.ok(lesson.estimatedMinutes >= 45 && lesson.estimatedMinutes <= 90);
    assert.ok(lesson.objectives.length >= 3 && lesson.objectives.length <= 4);
    assert.ok(lesson.blocks.length >= 2 && lesson.blocks.length <= 3);
    assert.ok(lesson.blocks.some((b) => b.type === 'worked-example'));
    assert.ok(lesson.blocks.filter((b) => b.type === 'checkpoint' || b.type === 'exercise').length >= 1);
    for (const block of lesson.blocks) {
      const markdownRef = LESSONS[week].file.replace('research/', 'lessons/research/').replace(/\.json$/, '.md');
      if (block.type === 'checkpoint') {
        // Session B: checkpoints carry their own retrieval questions in a
        // dedicated file instead of re-rendering the core document.
        assert.match(block.contentRef, /-checkpoint\.md$/, `${block.blockId} checkpoint must point at its own file`);
        assert.notEqual(block.contentRef, markdownRef, `${block.blockId} phantom checkpoint`);
      } else {
        assert.equal(block.contentRef, markdownRef, `${block.blockId} contentRef must point at the lesson markdown`);
      }
    }
  });
}

// (b) source allowlist -------------------------------------------------------------------

for (const week of WEEKS) {
  test(`(b) ${week}: lesson sourceRefs use only allowlisted sourceIds with precise locators`, () => {
    const refs = lessons[week].sourceRefs;
    assert.ok(refs.length >= 2 && refs.length <= 4, `${refs.length} sourceRefs`);
    for (const ref of refs) {
      assert.ok(ALLOWED_SOURCES[week].includes(ref.sourceId), `${ref.sourceId} not allowlisted for ${week}`);
      assert.ok(['primary', 'practice'].includes(ref.role), `${ref.sourceId}: role ${ref.role} outside primary/practice`);
      assert.ok(ref.locator.length >= 10, `${ref.sourceId}: locator too thin`);
    }
    const ids = new Set(refs.map((r) => r.sourceId));
    assert.equal(ids.size, refs.length, 'duplicate sourceIds');
  });
}

// (c) house pattern ----------------------------------------------------------------------

for (const week of WEEKS) {
  const pkg = packages[week];

  test(`(c) ${week}: six exercises in the house pattern`, () => {
    assert.equal(pkg.weekId, week);
    assert.equal(pkg.locale, 'de');
    assert.equal(pkg.exercises.length, 6);
    const [e1, e2, e3, e4, e5, e6] = pkg.exercises;
    assert.equal(e1.type, 'single-choice');
    assert.equal(e1.difficulty, 1);
    assert.equal(e1.masteryEligible, false);
    assert.ok(/zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis\.?$/.test(e1.fullSolution),
      'e1 fullSolution must end with the Bearbeitungsnachweis note');
    assert.equal(e2.type, 'numeric');
    assert.equal(e2.difficulty, 2);
    assert.equal(e2.masteryEligible !== false, true);
    assert.ok(e2.parameters.seedGenerator, 'e2 needs a seedGenerator');
    assert.ok(W31_W39_SEED_GENERATORS[e2.parameters.seedGenerator], `e2 seedGenerator ${e2.parameters.seedGenerator} not in w31_w39_generators`);
    assert.ok(['predict-output', 'code-trace'].includes(e3.type));
    assert.equal(e3.difficulty, 2);
    assert.equal(e3.masteryEligible !== false, true);
    for (const e of [e4, e5, e6]) {
      assert.equal(e.type, 'python-code');
      assert.equal(e.grader, 'pyodide');
      assert.ok(Array.isArray(e.parameters.packages));
      assert.equal(e.masteryEligible !== false, true);
    }
    assert.equal(e4.difficulty, 2);
    assert.equal(e5.difficulty, 3);
    assert.equal(e6.difficulty, 4);
    assert.ok(pkg.exercises.every((e) => e.skillIds.length >= 1 && e.skillIds.length <= 2), 'primary + at most one secondary skill');
    assert.ok(pkg.exercises.every((e) => e.skillIds.includes(LESSONS[week].competency)), 'every exercise targets the week competency');
  });
}

// (d) hints never disclose the solution ---------------------------------------------------

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

for (const week of WEEKS) {
  for (const exercise of packages[week].exercises) {
    test(`(d) ${exercise.exerciseId}: hints stay shorter than the solution and leak no numeric answer`, () => {
      assert.ok(exercise.hints.length >= 2, 'at least two hints');
      for (const hint of exercise.hints) {
        assert.ok(hint.length < exercise.fullSolution.length,
          `${exercise.exerciseId}: hint not shorter than fullSolution`);
        const expectedValues = [];
        if (typeof exercise.expectedAnswer?.defaultExpected === 'number') expectedValues.push(exercise.expectedAnswer.defaultExpected);
        if (typeof exercise.expectedAnswer?.value === 'number') expectedValues.push(exercise.expectedAnswer.value);
        for (const value of expectedValues) {
          assert.equal(standaloneNumberPresent(hint, value), false,
            `${exercise.exerciseId}: hint leaks numeric answer ${value}`);
        }
        // Expected trace/predict values count as solutions, too.
        for (const variable of exercise.parameters?.variables || []) {
          assert.equal(standaloneNumberPresent(hint, variable.value), false,
            `${exercise.exerciseId}: hint leaks trace value ${variable.value}`);
        }
        if (exercise.expectedAnswer?.kind === 'output-lines') {
          for (const line of exercise.expectedAnswer.output.split('\n')) {
            assert.ok(!hint.includes(line.trim()) || line.trim().length < 2,
              `${exercise.exerciseId}: hint contains expected output line`);
          }
        }
      }
    });
  }
}

// (e) python tests end with the ok marker --------------------------------------------------

for (const week of WEEKS) {
  for (const exercise of packages[week].exercises) {
    if (exercise.type !== 'python-code') continue;
    test(`(e) ${exercise.exerciseId}: tests end with print("ok …")`, () => {
      const tests = exercise.parameters.tests;
      assert.match(tests.trim(), new RegExp(`print\\("ok ${exercise.exerciseId}"\\)$`),
        'tests must end with the ok marker');
    });
  }
}

// (f) no duplicate seeds inside a package ---------------------------------------------------

for (const week of WEEKS) {
  test(`(f) ${week}: deterministicSeeds are unique inside the package`, () => {
    const seeds = packages[week].exercises.map((e) => e.deterministicSeed);
    assert.equal(new Set(seeds).size, seeds.length);
    const prefix = Number(week.slice(1));
    for (const seed of seeds) {
      assert.ok(seed >= prefix * 100 && seed < (prefix + 1) * 100, `seed ${seed} outside the ${week}xx range`);
    }
  });
}

// (g) prompts are German (heuristic) ---------------------------------------------------------

// Words that are English but not German; a run of >= 8 in a row indicates an
// English sentence. Shared tokens (in, an, da, so, was, will, ich, hier) are
// deliberately excluded so German prose and code identifiers pass.
const ENGLISH_MARKERS = new Set([
  'the', 'that', 'this', 'these', 'those', 'with', 'from', 'of', 'to', 'and',
  'or', 'but', 'not', 'is', 'are', 'was', 'has', 'have', 'had', 'they', 'them',
  'their', 'its', 'it', 'he', 'she', 'we', 'you', 'your', 'what', 'when', 'how',
  'why', 'which', 'who', 'where', 'because', 'while', 'then', 'than', 'into',
  'over', 'under', 'between', 'should', 'could', 'would', 'can', 'will', 'be',
]);

function longestEnglishRun(text) {
  let longest = 0;
  let current = 0;
  for (const token of String(text).toLowerCase().split(/[^a-zäöüß]+/)) {
    if (ENGLISH_MARKERS.has(token)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

for (const week of WEEKS) {
  for (const exercise of packages[week].exercises) {
    test(`(g) ${exercise.exerciseId}: prompt passes the German heuristic`, () => {
      const stripped = exercise.prompt.replace(/<[^>]+>/g, ' ');
      const run = longestEnglishRun(stripped);
      assert.ok(run < 8, `${exercise.exerciseId}: English run of ${run} markers in prompt`);
    });
  }
}

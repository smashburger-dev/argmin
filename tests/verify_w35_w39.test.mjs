import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Verifikation der Capstone-Phase W35-W39 (ADR-0014, Implementer C):
//   (a) Lektionsvertrag l-capstone-pipeline
//   (b) Hausmuster je Wochenpaket (6 Aufgaben, e1 Konzept, >= 2 mastery python-code, diff 4)
//   (c) seedGenerator-IDs nur aus { genPipelineStages, genEvalRates }
//   (d) p-rag-capstone: project.json, phases.json, check-manifest Pins
//   (e) byte-Identitaet src/w30_core.py === W30-Original
//   (f) golden_set.json enthaelt die vier W30-Queries woertlich
//   (g) kein '/Users/' in src/, config/, golden/, tests/ des Projekts
//   (h) README-Pflichtueberschriften
//   (i) keine Projektdatei importiert pytest
//   (j) w39-e1 sagt Demo/Retrospektive = Work Evidence, nie Mastery

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = ['w35', 'w36', 'w37', 'w38', 'w39'];
const PROJECT = path.join(ROOT, 'content', 'projects', 'rag-capstone');
const W30_ORIGINAL = path.join(ROOT, 'content', 'projects', 'rag-secure-prototype', 'src', 'prototype.py');
const LESSON_JSON = path.join(ROOT, 'content', 'lessons', 'research', 'capstone-pipeline.json');
const LESSON_MD = path.join(ROOT, 'content', 'lessons', 'research', 'capstone-pipeline.md');

const ERLAUBTE_QUELLEN = new Set([
  'cookiecutter-data-science',
  'turing-way',
  'wilson-good-enough',
  'sandve-repro-rules',
  'acm-artifact-badging',
  'rougier-figures',
]);
const ERLAUBTE_GENERATOREN = new Set(['genPipelineStages', 'genEvalRates']);
const README_PFlicht = ['Setup', 'Abhängigkeiten', 'Konfiguration', 'Karten', 'Limitations', 'Bekannte Fehler'];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function listFiles(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const voll = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(voll, exts));
    else if (!exts || exts.includes(path.extname(entry.name))) out.push(voll);
  }
  return out.sort();
}

const wochen = Object.fromEntries(WEEKS.map((w) => [w, readJson(path.join(ROOT, 'content', 'exercises', `${w}.json`))]));

test('(a) Lektionsvertrag l-capstone-pipeline', () => {
  const lektion = readJson(LESSON_JSON);
  assert.equal(lektion.lessonId, 'l-capstone-pipeline');
  assert.deepEqual(lektion.competencyIds, ['c-capstone-pipeline']);
  assert.deepEqual(lektion.requires, ['c-research-capstone', 'c-ml-repro']);
  assert.ok(lektion.estimatedMinutes >= 45 && lektion.estimatedMinutes <= 90);
  const beispiel = lektion.blocks.find((b) => b.type === 'worked-example');
  assert.ok(beispiel, 'worked-example Block fehlt');
  assert.ok(beispiel.contentRef.endsWith('capstone-pipeline.md'));
  assert.ok(lektion.sourceRefs.length >= 3);
  for (const ref of lektion.sourceRefs) {
    assert.ok(ERLAUBTE_QUELLEN.has(ref.sourceId), `unerlaubte sourceId: ${ref.sourceId}`);
    assert.ok(typeof ref.role === 'string' && ref.role.length > 0, 'role fehlt');
    assert.ok(typeof ref.locator === 'string' && ref.locator.length > 0, 'locator fehlt');
  }
  assert.equal(lektion.rightsId, 'ki-lernplattform-original');
  assert.equal(lektion.releaseStatus, 'draft');

  const md = readFileSync(LESSON_MD, 'utf8');
  assert.ok(md.length > 2000, 'Lektions-.md zu kurz');
  // deutscher Inhalt: typische Funktionswoerter und Umlaute
  assert.match(md, /\bund\b/);
  assert.match(md, /ä|ö|ü|ß/);
  assert.ok(md.includes('Work Evidence'), 'Work-Evidence-Abgrenzung fehlt in der Lektions-.md');
});

test('(b) Hausmuster je Wochenpaket w35-w39', () => {
  const alleSeeds = new Map();
  for (const woche of WEEKS) {
    const paket = wochen[woche];
    assert.equal(paket.weekId, woche);
    assert.equal(paket.locale, 'de');
    assert.equal(paket.exercises.length, 6, `${woche}: ${paket.exercises.length} Aufgaben`);
    const nummern = paket.exercises.map((e) => e.exerciseId.slice(-2));
    assert.deepEqual(nummern, ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
    let masteryPython = 0;
    let diff4 = 0;
    for (const ex of paket.exercises) {
      assert.ok(ex.skillIds.includes('c-capstone-pipeline'), `${ex.exerciseId}: Primaerkompetenz fehlt`);
      assert.ok(ex.skillIds.length <= 2, `${ex.exerciseId}: zu viele skillIds`);
      assert.equal(ex.license, 'CC BY 4.0 (generated)');
      assert.equal(ex.contentClass, 'generated');
      assert.equal(ex.locale, 'de');
      assert.ok(ex.deterministicSeed >= 3500 && ex.deterministicSeed <= 3999, `${ex.exerciseId}: Seed ausserhalb 35xx-39xx`);
      assert.ok(!alleSeeds.has(ex.deterministicSeed), `Seed doppelt: ${ex.deterministicSeed}`);
      alleSeeds.set(ex.deterministicSeed, ex.exerciseId);
      assert.ok(ex.hints.length >= 2 && ex.feedbackRules.length >= 2, `${ex.exerciseId}: hints/feedback dünn`);
      assert.ok(ex.typicalErrors.length >= 2, `${ex.exerciseId}: typicalErrors dünn`);
      assert.equal(typeof ex.fullSolution, 'string');
      assert.ok(ex.fullSolution.length > 80, `${ex.exerciseId}: fullSolution zu dünn`);
      if (ex.exerciseId.endsWith('-e1')) {
        assert.equal(ex.type, 'single-choice');
        assert.equal(ex.difficulty, 1);
        assert.equal(ex.masteryEligible, false);
      } else {
        assert.equal(ex.masteryEligible, true, `${ex.exerciseId} sollte mastery-faehig sein`);
      }
      // python-code needs the Pyodide grader — the deterministic adapter
      // cannot grade code (w38-e4 regression guard, Session B).
      if (ex.type === 'python-code') {
        assert.equal(ex.grader, 'pyodide', `${ex.exerciseId}: python-code muss pyodide-gradiert sein`);
        assert.ok(Array.isArray(ex.parameters.packages), `${ex.exerciseId}: Paketliste fehlt`);
      }
      if (ex.difficulty === 4) diff4 += 1;
      if (ex.type === 'python-code' && ex.masteryEligible) masteryPython += 1;
    }
    assert.ok(masteryPython >= 2, `${woche}: nur ${masteryPython} mastery python-code Aufgaben`);
    assert.equal(diff4, 1, `${woche}: diff-4 Aufgabe erwartet`);
    const e3 = paket.exercises[2];
    assert.ok(['predict-output', 'code-trace'].includes(e3.type), `${woche}-e3: ${e3.type}`);
    assert.equal(e3.difficulty, 2);
  }
  // Growth-counter rule: the expected total derives from the packages, not a literal.
  const erwarteteSeeds = WEEKS.reduce((summe, w) => summe + wochen[w].exercises.length, 0);
  assert.equal(alleSeeds.size, erwarteteSeeds, 'Seeds ueber alle Wochen eindeutig');
});

test('(c) seedGenerator-IDs nur aus der erlaubten Menge', () => {
  for (const woche of WEEKS) {
    for (const ex of wochen[woche].exercises) {
      if (ex.type !== 'numeric') continue;
      const gen = ex.parameters?.seedGenerator ?? ex.expectedAnswer?.generator;
      if (gen !== undefined) {
        assert.ok(ERLAUBTE_GENERATOREN.has(gen), `${ex.exerciseId}: unerlaubter seedGenerator ${gen}`);
      }
      if (ex.expectedAnswer?.kind === 'seeded-integer') {
        assert.ok(Number.isInteger(ex.expectedAnswer.defaultExpected));
        assert.ok(Number.isInteger(ex.expectedAnswer.defaultSeed));
        assert.equal(ex.expectedAnswer.defaultSeed, ex.deterministicSeed);
      }
      if (ex.expectedAnswer?.kind === 'integer') {
        assert.ok(Number.isInteger(ex.expectedAnswer.value));
      }
    }
  }
  // Verdrahtung: genau w35-e2 -> genPipelineStages, w37-e2 -> genEvalRates
  assert.equal(wochen.w35.exercises[1].parameters.seedGenerator, 'genPipelineStages');
  assert.equal(wochen.w37.exercises[1].parameters.seedGenerator, 'genEvalRates');
  for (const woche of ['w36', 'w38', 'w39']) {
    assert.equal(wochen[woche].exercises[1].expectedAnswer.kind, 'integer', `${woche}-e2: fixe numeric-Instanz erwartet`);
  }
});

test('(d) p-rag-capstone: Projektvertrag, Phasen und Manifest', () => {
  const projekt = readJson(path.join(PROJECT, 'project.json'));
  assert.equal(projekt.projectId, 'p-rag-capstone');
  assert.equal(projekt.version, 1);
  assert.equal(projekt.runnerMode, 'local');
  assert.deepEqual(projekt.competencyIds, ['c-capstone-pipeline']);
  assert.deepEqual(projekt.requires, ['c-research-capstone', 'c-ml-repro', 'c-genai-security']);
  assert.equal(projekt.legacyWeekId, 'w39');
  assert.equal(projekt.testBundleId, 'rag-capstone-tests-v1');
  assert.equal(projekt.rightsId, 'ki-lernplattform-original');
  assert.equal(projekt.releaseStatus, 'draft');
  assert.deepEqual(projekt.allowedCommands, [
    { program: 'python', args: ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests'] },
  ]);
  for (const datei of projekt.starterFiles) {
    assert.ok(existsSync(path.join(PROJECT, datei)), `starterFile fehlt: ${datei}`);
  }

  const phasen = readJson(path.join(PROJECT, 'phases.json'));
  const phase = phasen.phases;
  assert.equal(phase.length, 5);
  assert.deepEqual(phase.map((p) => p.weekId), WEEKS);
  assert.deepEqual(phase.map((p) => p.phaseId), ['w35-scope', 'w36-integration', 'w37-eval-redteam', 'w38-repro', 'w39-artifacts']);
  const testdateien = phase.map((p) => p.testFile);
  assert.equal(new Set(testdateien).size, 5, 'jede Testdatei gehoert zu genau einer Phase');
  for (const datei of testdateien) {
    assert.ok(existsSync(path.join(PROJECT, datei)), `Phasentest fehlt: ${datei}`);
  }
  for (const p of phase) {
    assert.ok(typeof p.deliverable === 'string' && p.deliverable.length > 20, `${p.phaseId}: Deliverable fehlt`);
  }

  const manifest = readJson(path.join(PROJECT, 'check-manifest.json'));
  assert.equal(manifest.projectId, 'p-rag-capstone');
  assert.equal(manifest.projectVersion, '1');
  assert.deepEqual(manifest.testPaths, ['tests']);
  assert.equal(manifest.timeoutSeconds, 120);
  const pins = new Map(manifest.requiredFiles.map((e) => [e.path, e.sha256]));
  const gepinntErwartet = [
    'src/w30_core.py',
    'config/experiment.json',
    'golden/golden_set.json',
    'golden/injection_fixtures.json',
    'golden/expected_results.json',
    'tests/test_w35_scope.py',
    'tests/test_w36_pipeline.py',
    'tests/test_w37_eval_redteam.py',
    'tests/test_w38_repro.py',
    'tests/test_w39_artifacts.py',
  ];
  const nullErwartet = [
    'src/pipeline.py',
    'src/metrics.py',
    'src/cost.py',
    'src/cards.py',
    'cards/data-card.json',
    'cards/model-card.json',
    'cards/system-card.json',
  ];
  for (const rel of gepinntErwartet) {
    assert.ok(pins.has(rel), `nicht im Manifest: ${rel}`);
    assert.match(pins.get(rel), /^[0-9a-f]{64}$/, `kein gueltiger sha256-Pin: ${rel}`);
    assert.equal(pins.get(rel), sha256(path.join(PROJECT, rel)), `Pin stimmt nicht mit Datei ueberein: ${rel}`);
  }
  for (const rel of nullErwartet) {
    assert.ok(pins.has(rel), `Lernenden-Datei fehlt im Manifest: ${rel}`);
    assert.equal(pins.get(rel), null, `${rel} muss sha256: null haben`);
    assert.ok(existsSync(path.join(PROJECT, rel)), `Datei fehlt: ${rel}`);
  }
});

test('(e) src/w30_core.py ist byte-identisch mit dem W30-Original', () => {
  assert.equal(sha256(path.join(PROJECT, 'src', 'w30_core.py')), sha256(W30_ORIGINAL));
});

test('(f) golden_set.json enthaelt die vier W30-Queries woertlich', () => {
  const kern = readFileSync(W30_ORIGINAL, 'utf8');
  const segment = kern.slice(kern.indexOf('QUERIES'), kern.indexOf('INJECTION_RULES'));
  const fragen = [...segment.matchAll(/"query":\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(fragen.length, 4, `W30-QUERIES nicht gefunden: ${fragen.length}`);
  const golden = readJson(path.join(PROJECT, 'golden', 'golden_set.json'));
  const texte = golden.queries.map((q) => q.query);
  for (const frage of fragen) {
    assert.ok(texte.includes(frage), `W30-Query fehlt woertlich: ${frage}`);
  }
  assert.ok(texte.length >= fragen.length, 'Obermenge erwartet');
});

test('(g) keine absoluten Benutzerpfade in Projektquellen', () => {
  for (const ordner of ['src', 'config', 'golden', 'tests']) {
    for (const datei of listFiles(path.join(PROJECT, ordner))) {
      assert.ok(
        !readFileSync(datei, 'utf8').includes('/Users/'),
        `Benutzerpfad gefunden: ${path.relative(PROJECT, datei)}`,
      );
    }
  }
});

test('(h) README enthaelt die sechs Pflichtueberschriften', () => {
  const readme = readFileSync(path.join(PROJECT, 'README.md'), 'utf8');
  const zeilen = readme.split('\n').map((z) => z.trim()).filter((z) => z.startsWith('#'));
  const normals = new Set(zeilen.map((z) => z.replace(/^#+\s*/, '')));
  for (const uberschrift of README_PFlicht) {
    assert.ok(normals.has(uberschrift), `Pflichtueberschrift fehlt: ${uberschrift}`);
  }
});

test('(i) keine Projektdatei importiert pytest', () => {
  for (const datei of listFiles(path.join(PROJECT, 'tests')).concat(listFiles(path.join(PROJECT, 'src')))) {
    const inhalt = readFileSync(datei, 'utf8');
    assert.ok(!/^\s*(import\s+pytest|from\s+pytest\b)/m.test(inhalt), `pytest-Import gefunden: ${path.relative(PROJECT, datei)}`);
  }
});

test('(j) w39-e1: Demo und Retrospektive sind Work Evidence, nie Mastery', () => {
  const e1 = wochen.w39.exercises[0];
  assert.equal(e1.exerciseId, 'w39-e1');
  const text = `${e1.prompt}\n${e1.fullSolution}`;
  assert.ok(text.includes('Work Evidence'), 'Work Evidence fehlt in w39-e1');
  assert.ok(/nicht als Mastery|Mastery entsteht|nie Mastery/.test(e1.fullSolution), 'Mastery-Abgrenzung fehlt');
  const richtige = e1.choices.find((c) => c.correct);
  assert.ok(richtige.text.includes('Work Evidence'));
});

// (k) Golden-Set-Leakage-Schutz (ADR-0014 Teil 3) --------------------------------------------
//
// DELIBERATE HARDCODED HASH — the one sanctioned exception to the growth-
// counter rule (see tests/verify_w31_w39_acceptance.test.mjs (h)): the sha256
// of the canonically serialized golden set is FROZEN here on purpose. Any
// change to golden/golden_set.json — including "harmless" value edits after a
// run — fails this test until the hash is consciously updated. Canonical
// serialization (sorted keys, no whitespace) means formatting-only changes do
// not count; only content changes trip the freeze. The raw-file sha256 is
// additionally pinned in check-manifest.json (checked in (d)).
const GOLDEN_SET_CANONICAL_SHA256 = '4f84ee03765f9e8206aadf410a2f7091282d41343544a96c0303c1ce2a0e2a9f';

test('(k) golden_set.json ist eingefroren (kanonischer sha256)', () => {
  const kanonisch = (wert) => {
    if (Array.isArray(wert)) return `[${wert.map(kanonisch).join(',')}]`;
    if (wert && typeof wert === 'object') {
      return `{${Object.keys(wert).sort().map((schluessel) => `${JSON.stringify(schluessel)}:${kanonisch(wert[schluessel])}`).join(',')}}`;
    }
    return JSON.stringify(wert);
  };
  const golden = readJson(path.join(PROJECT, 'golden', 'golden_set.json'));
  const ist = createHash('sha256').update(kanonisch(golden)).digest('hex');
  assert.equal(ist, GOLDEN_SET_CANONICAL_SHA256,
    'golden_set.json wurde veraendert — Leakage-Verdacht: bewusst aktualisieren (Hash + Kommentar), sonst Rueckgaengigmachen');
  // Struktur-Invariante gegen stillen Abbau: Queries bleiben eine Obermenge der W30-Queries.
  assert.ok(Array.isArray(golden.queries) && golden.queries.length >= 4, 'golden.queries zu klein');
});

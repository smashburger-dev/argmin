#!/usr/bin/env node
// Content validator: schema sanity, budgets, unique ids, referential
// integrity, license presence, exercise required fields, and (with --dir)
// public-build leak checks. Exits non-zero on any violation.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadContentCompiler = () => import('./compile_content.mjs');
const publicMode = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : null;
const legacyOnly = process.argv.includes('--legacy');
const dir = publicMode || root;

const problems = [];
const warn = [];
const ok = (msg) => console.log('  ok  ' + msg);
const bad = (msg) => { problems.push(msg); console.log('  FEHLER  ' + msg); };

const curriculum = JSON.parse(readFileSync(join(dir, 'content/curriculum.json'), 'utf8'));
const sources = JSON.parse(readFileSync(join(dir, 'content/sources.json'), 'utf8'));

// --- curriculum structure ---
ok(`schemaVersion ${curriculum.schemaVersion}`);
if (curriculum.totalWeeks !== 39 || curriculum.weeks.length !== 39) bad(' Wochenanzahl != 39');
if (curriculum.phases.length !== 9) bad(' Phasenanzahl != 9');
const totalMin = curriculum.weeks.reduce((s, w) => s + w.minutes, 0);
if (totalMin !== 390 * 60) bad(` Stundenbudget ${totalMin / 60} != 390`);
else ok('Budget exakt 390 h');

const weekIds = new Set();
const weekNumbers = new Set();
for (const w of curriculum.weeks) {
  if (weekIds.has(w.weekId)) bad(` doppelte weekId ${w.weekId}`);
  weekIds.add(w.weekId);
  if (weekNumbers.has(w.number)) bad(` doppelte Wochennummer ${w.number}`);
  weekNumbers.add(w.number);
  if (!curriculum.phases.some((p) => p.phaseId === w.phaseId)) bad(` ${w.weekId}: unbekannte phaseId ${w.phaseId}`);
}
for (let n = 1; n <= 39; n++) if (!weekNumbers.has(n)) bad(` Woche ${n} fehlt`);
ok('39 eindeutige Wochen, 1..39, Phasenreferenzen gueltig');

// phase hour sums
for (const p of curriculum.phases) {
  const mins = curriculum.weeks.filter((w) => w.phaseId === p.phaseId).reduce((s, w) => s + w.minutes, 0);
  if (mins !== p.hours * 60) bad(` Phase ${p.phaseId}: ${mins / 60}h != deklarierte ${p.hours}h`);
}
ok('Phasenstunden konsistent');

// --- sources ---
const srcIds = new Set();
// Fail-closed (ADR-0014 Teil 4): a source claimed as contentClass "open" must
// not carry a share-alike / non-commercial / no-derivatives license marker —
// the public contract requires redistribution + commercial use + derivatives.
const OPEN_LICENSE_MARKERS = /by-nc|by-sa|by-nd|nc-sa|non.?commercial|(keine|nicht).?kommerziell|kommerzielle?\s+(nutzung|verwendung)\s+(ausgeschlossen|nicht)|share.?alike|weitergabe\s+unter\s+gleichen|no.?derivatives|keine\s+bearbeitung|all\s+rights\s+reserved|proprietary/i;
for (const s of sources.sources) {
  if (srcIds.has(s.sourceId)) bad(` doppelte sourceId ${s.sourceId}`);
  srcIds.add(s.sourceId);
  if (!s.license) bad(` ${s.sourceId}: Lizenz fehlt`);
  if (!s.contentClass) bad(` ${s.sourceId}: contentClass fehlt`);
  if (s.contentClass === 'open' && OPEN_LICENSE_MARKERS.test(s.license || '')) {
    bad(` ${s.sourceId}: contentClass "open" passt nicht zur Lizenz (NC/ND/SA-Marker gefunden) — link-only oder Ersatz pruefen (ADR-0014)`);
  }
}
ok(`Quellen: ${srcIds.size} Eintraege mit Lizenzangabe`);

// --- exercises (ALL authored weeks: content/exercises/wNN.json) ---------------
const exDir = join(dir, 'content/exercises');
const REQUIRED = ['exerciseId', 'schemaVersion', 'skillIds', 'type', 'prompt', 'locale',
  'grader', 'parameters', 'deterministicSeed', 'tolerancePolicy', 'hints',
  'fullSolution', 'difficulty', 'estimatedMinutes', 'sourceLineage', 'license',
  'validationStatus', 'testedSeedCount'];
// Type whitelist: every exercise type must be a known answer format with a
// grader implementation (authoring-guide §4). Extend here when new types
// are authored (LM-R4 added parsons/code-trace/predict-output).
const KNOWN_TYPES = new Set(['numeric', 'single-choice', 'vector', 'algebraic-expression',
  'python-code', 'short-rationale',
  'parsons', 'code-trace', 'predict-output']);
const exFiles = readdirSync(exDir).filter((f) => /^w\d{2}\.json$/.test(f)).sort();
const exIds = new Set();
let exCount = 0;
for (const fname of exFiles) {
  const exFile = JSON.parse(readFileSync(join(exDir, fname), 'utf8'));
  for (const e of exFile.exercises) {
    exCount += 1;
    if (exIds.has(e.exerciseId)) bad(` doppelte exerciseId ${e.exerciseId}`);
    exIds.add(e.exerciseId);
    for (const f of REQUIRED) if (e[f] === undefined) bad(` ${e.exerciseId}: Pflichtfeld ${f} fehlt`);
    if (!KNOWN_TYPES.has(e.type)) bad(` ${e.exerciseId}: unbekannter Aufgabentyp ${JSON.stringify(e.type)}`);
    if (e.locale !== 'de') bad(` ${e.exerciseId}: locale != de`);
    if (e.license === undefined) bad(` ${e.exerciseId}: Lizenz fehlt`);
    if ((e.hints || []).some((h) => !String(h).trim())) bad(` ${e.exerciseId}: leerer Hinweis`);
    if (e.masteryEligible !== undefined && typeof e.masteryEligible !== 'boolean') {
      bad(` ${e.exerciseId}: masteryEligible muss boolean sein`);
    }
    if (e.type === 'single-choice') {
      // Choices must be top-level: both UI shells and the deterministic
      // grader read exercise.choices (parameters.choices would render a dead
      // task). Exactly one option may be correct.
      const ch = e.choices;
      if (!Array.isArray(ch) || ch.length < 2) bad(` ${e.exerciseId}: single-choice benoetigt mindestens 2 Optionen unter choices (top-level)`);
      else if (ch.filter((c) => c && c.correct === true).length !== 1) bad(` ${e.exerciseId}: single-choice braucht genau eine korrekte Option`);
    }
    if (e.active === false && publicMode) bad(` Public-Build enthält deaktivierte Aufgabe ${e.exerciseId}`);
    if (e.grader === 'pyodide' && !e.parameters.packages) bad(` ${e.exerciseId}: pyodide ohne Paketliste`);
  }
  // license/class coherence per week file
  if (!exFile.exercises.every((e) => e.contentClass === 'generated')) {
    warn.push(`${fname}: nicht alle Aufgaben Klasse generated`);
  }
}
ok(`Aufgaben: ${exCount} eindeutige IDs in ${exFiles.length} Wochen-Dateien, Pflichtfelder geprueft`);

// week references: every listed exercise id must exist in an authored file,
// and every detailed week must have its exercise file.
for (const w of curriculum.weeks) {
  if (!Array.isArray(w.exercises)) continue;
  for (const id of w.exercises) if (!exIds.has(id)) bad(` ${w.weekId} referenziert unbekannte Aufgabe ${id}`);
  if (w.detailed && !existsSync(join(exDir, `${w.weekId}.json`))) {
    bad(` ${w.weekId}: detailed=true, aber content/exercises/${w.weekId}.json fehlt`);
  }
}

// --- unit reading paths + unitExerciseIds --------------------------------------
// locatorPath is the machine-readable access into the local library mirror
// (symlinks library/ + library-private/, private-build only). Root mode: the
// file MUST exist on disk. Public mode: the field MUST be absent (stripped
// by tools/build_public.mjs — the library never ships).
{
  let checked = 0;
  for (const w of curriculum.weeks) {
    for (const u of w.learningUnits || []) {
      for (const id of u.unitExerciseIds || []) {
        if (!exIds.has(id)) bad(` ${u.unitId}: unitExerciseIds verweist auf unbekannte Aufgabe ${id}`);
      }
      for (const s of u.sources || []) {
        if (s.locatorPath === undefined) continue;
        checked += 1;
        if (typeof s.locatorPath !== 'string' || !/^library(-private)?\//.test(s.locatorPath)) {
          bad(` ${u.unitId}: locatorPath ungueltig (muss mit library/ oder library-private/ beginnen): ${JSON.stringify(s.locatorPath)}`);
          continue;
        }
        if (publicMode) {
          bad(` Public-Build enthält locatorPath (${u.unitId}) — Bibliothekspfade sind private-build-only`);
          continue;
        }
        if (!existsSync(join(root, s.locatorPath))) {
          bad(` ${u.unitId}: locatorPath-Ziel existiert nicht: ${s.locatorPath}`);
        }
      }
    }
  }
  for (const s of sources.sources) {
    if (s.localPath === undefined) continue;
    checked += 1;
    if (publicMode) {
      bad(` Public-Build enthält localPath (${s.sourceId}) — Bibliothekspfade sind private-build-only`);
      continue;
    }
    if (!existsSync(join(root, s.localPath))) {
      bad(` Quelle ${s.sourceId}: localPath-Ziel existiert nicht: ${s.localPath}`);
    }
  }
  ok(`Lesezugänge: ${checked} localPath/locatorPath geprueft${publicMode ? ' (Public: keine erlaubt)' : ' (Existenz auf Datentraeger)'}`);
}

// --- source-ID referential integrity (ADR-0014 Teil 4) -----------------------
// Every sourceId referenced from curriculum units or lesson sourceRefs must
// exist in sources.json. Unreferenced registered sources are counted as info
// only (the library keeps browsable entries beyond direct references).
{
  const referenced = new Set();
  for (const w of curriculum.weeks) {
    for (const u of w.learningUnits || []) {
      for (const s of u.sources || []) referenced.add(s.sourceId);
    }
  }
  let lessonRefs = 0;
  const noteLessonRefs = (lesson) => {
    for (const s of lesson.sourceRefs || []) { referenced.add(s.sourceId); lessonRefs += 1; }
  };
  const catalogPath = join(dir, 'content/catalog.json');
  const bundlePath = join(dir, 'content/content-bundle.json');
  if (existsSync(catalogPath)) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const { catalogRoot, discoverJson } = await import('./content_roots.mjs');
    const lessonFiles = catalog.roots
      ? discoverJson(join(dir, 'content'), catalogRoot(catalog, 'lessons'))
      : catalog.lessonFiles || [];
    for (const file of lessonFiles) {
      const lessonPath = join(dir, 'content', file);
      if (!existsSync(lessonPath)) { bad(` Katalog: Lektionsdatei fehlt: ${file}`); continue; }
      noteLessonRefs(JSON.parse(readFileSync(lessonPath, 'utf8')));
    }
  } else if (existsSync(bundlePath)) {
    const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
    for (const lesson of bundle.lessons || []) noteLessonRefs(lesson);
  }
  for (const id of referenced) {
    if (!srcIds.has(id)) bad(` referenzierte Quelle existiert nicht in sources.json: ${id}`);
  }
  const unreferenced = [...srcIds].filter((id) => !referenced.has(id));
  ok(`Quellen-Referenzen: ${referenced.size}_unique/${lessonRefs} Lektions-Refs geprueft, ${unreferenced.length} registriert ohne Direktreferenz`);
}

// --- cumulative gate refs (LM-R2, ab Woche 9) ---------------------------------
// A cumulative reference must either resolve against AUTHORED content
// (exercise file of the referenced week exists and carries the skillId)
// or be explicitly future-marked. Weeks without a gate stay valid.
{
  const WEEK_ID_RE = /^w\d{2}$/;
  let checked = 0, planned = 0;
  for (const w of curriculum.weeks) {
    const gate = w.gate;
    if (!gate) continue;
    const refs = gate.cumulativeExerciseRefs;
    if (refs === undefined) continue;
    if (!Array.isArray(refs)) { bad(` ${w.weekId}: cumulativeExerciseRefs muss ein Array sein`); continue; }
    for (const ref of refs) {
      checked += 1;
      const label = `${w.weekId} -> ${ref && ref.weekId}/${ref && ref.skillId}`;
      if (!ref || typeof ref !== 'object' || !WEEK_ID_RE.test(ref.weekId || '')
        || typeof ref.skillId !== 'string' || !ref.skillId.trim()) {
        bad(` ${label}: weekId (wNN) und skillId sind Pflichtfelder`);
        continue;
      }
      if (ref.future === true) {
        planned += 1;
        continue; // explicitly future: existence check skipped by design
      }
      if (ref.weekId === w.weekId) { bad(` ${label}: Selbstreferenz`); continue; }
      if (!weekIds.has(ref.weekId)) { bad(` ${label}: unbekannte Zielwoche`); continue; }
      if (Number(ref.weekId.slice(1)) >= w.number) {
        bad(` ${label}: kumulative Referenz muss in einer frueheren Woche liegen`);
        continue;
      }
      const exPath = join(exDir, `${ref.weekId}.json`);
      if (!existsSync(exPath)) {
        bad(` ${label}: Zielwoche nicht ausgearbeitet und nicht als zukuenftig markiert (future: true)`);
        continue;
      }
      let targetSkills = null;
      try {
        const target = JSON.parse(readFileSync(exPath, 'utf8'));
        targetSkills = new Set(target.exercises
          .filter((e) => e.active !== false)
          .flatMap((e) => e.skillIds || []));
      } catch {
        targetSkills = null;
      }
      if (!targetSkills || !targetSkills.has(ref.skillId)) {
        bad(` ${label}: skillId ${ref.skillId} in ${ref.weekId}.json nicht gefunden`);
      }
    }
  }
  ok(`Kumulative Gate-Referenzen: ${checked} geprueft (${planned} zukuenftig markiert)`);
}

// --- license/class coherence (per-week summary moved into the exercise loop) ---
ok('Klassen-Kohaerenz je Wochen-Datei geprueft (Hinweise oben bei Abweichungen)');

// --- broken local links ---
for (const s of sources.sources) {
  // localFile is relative to the project root (may point at ../ files).
  if (s.localFile && !existsSync(join(dir, dir === root ? s.localFile : s.localFile.replace(/^\.\.\//, '')))) {
    if (!publicMode) warn.push(`Quelle ${s.sourceId}: lokale Datei fehlt (${s.localFile})`);
  }
}

if (!publicMode && !legacyOnly && existsSync(join(root, 'content/catalog.json'))) {
  try {
    const { compileContent } = await loadContentCompiler();
    const bundle = compileContent({ projectRoot: root, profile: 'public' });
    ok(`Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.exerciseDefinitions.length} Public-Aufgaben, ${bundle.contentVersion.slice(0, 12)}`);
  } catch (error) {
    bad(` Content-Compiler: ${error.message}`);
  }
}

// --- public build leak checks ---
// Shared fail-closed policy owner (union set: at least as strict as every
// previously shipped validator scan, plus the previously missing markers).
import { OUTPUT_PRIVATE_MARKERS as PUBLIC_PRIVATE_MARKERS, BINARY_EXT, CANARY_NAME } from './content_policy.mjs';
if (publicMode) {
  const privateSources = sources.sources.filter((s) => s.contentClass === 'private').map((s) => s.sourceId);
  const scan = (path, acc = []) => {
    for (const f of readdirSync(path, { withFileTypes: true })) {
      const p = join(path, f.name);
      if (f.isDirectory()) scan(p, acc); else acc.push(p);
    }
    return acc;
  };
  const files = scan(publicMode);
  ok(`Public-Build: ${files.length} Dateien`);
  const contentBundlePath = join(publicMode, 'content/content-bundle.json');
  if (!existsSync(contentBundlePath)) {
    bad(' Public-Build fehlt content/content-bundle.json');
  } else {
    try {
      const bundle = JSON.parse(readFileSync(contentBundlePath, 'utf8'));
      const { validateCompiledContent } = await loadContentCompiler();
      validateCompiledContent(bundle);
      if (bundle.profile !== 'public') bad(` Public-Bundle hat falsches Profil ${bundle.profile}`);
      else ok(`Public-Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.exerciseDefinitions.length} Aufgaben, ${bundle.projects.length} Projekt`);
    } catch (error) {
      bad(` Public-Content-Bundle ungueltig: ${error.message}`);
    }
  }
  for (const f of files) {
    const rel = f.slice(publicMode.length + 1);
    if (CANARY_NAME.test(rel) || rel.endsWith('.pdf')) bad(` Public-Build enthält privaten Pfad: ${rel}`);
    if (/\.local\.json$/i.test(rel)) bad(` Public-Build enthält lokale Overlay-Datei: ${rel}`);
    if (BINARY_EXT.test(rel)) continue; // binary artifact: no text scan
    const text = readFileSync(f, 'utf8'); // full scan, no size cap
    for (const marker of PUBLIC_PRIVATE_MARKERS) {
      if (marker.test(text)) bad(` Public-Build enthält privaten Marker ${marker} in ${rel}`);
    }
    // Citation rule: sourceId references with page locators are allowed as
    // citation metadata ONLY in curriculum/sources; actual content files
    // (exercises, notes, transcripts) must not embed private-source content.
    const isCitationFile = rel === 'content/curriculum.json' || rel === 'content/sources.json' || rel === 'content/search-index.json';
    if (!isCitationFile) {
      for (const pid of privateSources) {
        if (text.includes(`"sourceId": "${pid}"`)) bad(` Public-Content referenziert private Quelle ${pid} in ${rel}`);
      }
    }
    if (/Draft \(2024-01-15\) of "Mathematics for Machine Learning"/.test(text)) {
      // MML header line would indicate raw text leakage
      if (rel.endsWith('.md') || rel.endsWith('.txt')) bad(` Public-Build enthält MML-Rohtext: ${rel}`);
    }
  }
  const relFiles = files.map((f) => f.slice(publicMode.length + 1));
  for (const licenseFile of ['LICENSE', 'LICENSE-CONTENT.md']) {
    if (!relFiles.includes(licenseFile)) bad(` Public-Build fehlt ${licenseFile}`);
  }
  const vendorArtifacts = relFiles.filter((rel) => rel.startsWith('vendor/') && !rel.startsWith('vendor/licenses/'));
  if (vendorArtifacts.length) {
    const noticePath = join(publicMode, 'vendor/licenses/THIRD_PARTY_NOTICES.json');
    if (!existsSync(noticePath)) {
      bad(' Public-Build fehlt vendor/licenses/THIRD_PARTY_NOTICES.json');
    } else {
      let notices = null;
      try { notices = JSON.parse(readFileSync(noticePath, 'utf8')); } catch { notices = null; }
      if (!notices || notices.schemaVersion !== 1 || !Array.isArray(notices.components)) {
        bad(' Drittanbieter-Notice ist kein gueltiges Schema-1-Manifest');
      } else {
        const ids = new Set();
        const covered = new Set();
        const declaredLicenses = new Set();
        for (const component of notices.components) {
          if (!component.id || ids.has(component.id)) bad(` Drittanbieter-Notice: ungueltige oder doppelte Komponenten-ID ${component.id || '(leer)'}`);
          ids.add(component.id);
          for (const field of ['name', 'version', 'licenseExpression', 'sourceUrl']) {
            if (!String(component[field] || '').trim()) bad(` Drittanbieter-Notice ${component.id || '(leer)'}: ${field} fehlt`);
          }
          if (!Array.isArray(component.licenseFiles) || !component.licenseFiles.length) {
            bad(` Drittanbieter-Notice ${component.id || '(leer)'}: licenseFiles fehlt`);
          } else {
            for (const rel of component.licenseFiles) {
              if (typeof rel !== 'string' || !rel.startsWith('vendor/') || rel.includes('..')) {
                bad(` Drittanbieter-Notice ${component.id || '(leer)'}: ungueltiger Lizenzpfad ${JSON.stringify(rel)}`);
              } else if (!existsSync(join(publicMode, rel))) {
                bad(` Drittanbieter-Notice: Lizenzdatei fehlt: ${rel}`);
              } else {
                declaredLicenses.add(rel);
                const expectedHash = component.licenseFileSha256?.[rel];
                if (!/^[a-f0-9]{64}$/.test(String(expectedHash || ''))) {
                  bad(` Drittanbieter-Notice ${component.id || '(leer)'}: Lizenzdatei-Hash fehlt: ${rel}`);
                } else {
                  const actualHash = createHash('sha256').update(readFileSync(join(publicMode, rel))).digest('hex');
                  if (actualHash !== expectedHash) bad(` Drittanbieter-Notice: Lizenzdatei-Hash weicht ab: ${rel}`);
                }
              }
            }
          }
          if (!Array.isArray(component.artifacts) || !component.artifacts.length) {
            bad(` Drittanbieter-Notice ${component.id || '(leer)'}: artifacts fehlt`);
          } else {
            for (const artifact of component.artifacts) {
              if (typeof artifact !== 'string' || !artifact.startsWith('vendor/') || artifact.includes('..')) {
                bad(` Drittanbieter-Notice ${component.id || '(leer)'}: ungueltiger Artefaktpfad ${JSON.stringify(artifact)}`);
                continue;
              }
              const matches = artifact.endsWith('/')
                ? vendorArtifacts.filter((rel) => rel.startsWith(artifact))
                : vendorArtifacts.filter((rel) => rel === artifact);
              if (!matches.length) bad(` Drittanbieter-Notice ${component.id || '(leer)'}: Artefakt fehlt: ${artifact}`);
              for (const rel of matches) covered.add(rel);
            }
          }
        }
        for (const rel of vendorArtifacts) {
          if (!covered.has(rel) && !declaredLicenses.has(rel)) bad(` Drittanbieter-Notice deckt Runtime-Artefakt nicht ab: ${rel}`);
        }
        if (!problems.length) ok(`Drittanbieter-Notice: ${notices.components.length} Komponenten, ${vendorArtifacts.length} Artefakte abgedeckt`);
      }
    }
  }
  if (relFiles.includes('index.html') && relFiles.some((rel) => /^assets\/[a-zA-Z0-9_-]+\.js$/.test(rel))) {
    const npmManifestPath = join(publicMode, 'vendor/licenses/NPM_BUNDLE_NOTICES.json');
    const npmMarkdownPath = join(publicMode, 'vendor/licenses/NPM_BUNDLE_NOTICES.md');
    const beforeNpmNotices = problems.length;
    if (!existsSync(npmManifestPath) || !existsSync(npmMarkdownPath)) {
      bad(' Next-Build fehlt npm-Bundle-Lizenznotice');
    } else {
      let npmNotices = null;
      try { npmNotices = JSON.parse(readFileSync(npmManifestPath, 'utf8')); } catch { npmNotices = null; }
      if (!npmNotices || npmNotices.schemaVersion !== 1 || !Array.isArray(npmNotices.components)
        || !/^[a-f0-9]{64}$/.test(String(npmNotices.lockfileSha256 || ''))) {
        bad(' npm-Bundle-Notice ist ungueltig');
      } else {
        const names = new Set();
        const declared = new Set();
        for (const component of npmNotices.components) {
          if (!component.name || names.has(component.name) || !component.version || !component.licenseExpression || !component.sourceUrl) {
            bad(` npm-Bundle-Notice enthält unvollständige oder doppelte Komponente ${component.name || '(leer)'}`);
            continue;
          }
          names.add(component.name);
          const rel = component.licenseFile;
          if (typeof rel !== 'string' || !rel.startsWith('vendor/licenses/npm/') || rel.includes('..') || !existsSync(join(publicMode, rel))) {
            bad(` npm-Bundle-Lizenz fehlt: ${rel || '(leer)'}`);
            continue;
          }
          declared.add(rel);
          const actualHash = createHash('sha256').update(readFileSync(join(publicMode, rel))).digest('hex');
          if (actualHash !== component.licenseFileSha256) bad(` npm-Bundle-Lizenz-Hash weicht ab: ${rel}`);
        }
        for (const required of ['preact', 'codemirror', '@codemirror/lang-python']) {
          if (!names.has(required)) bad(` npm-Bundle-Notice deckt ${required} nicht ab`);
        }
        const npmLicenseFiles = relFiles.filter((rel) => rel.startsWith('vendor/licenses/npm/'));
        for (const rel of npmLicenseFiles) if (!declared.has(rel)) bad(` npm-Bundle-Lizenz ist nicht deklariert: ${rel}`);
        if (problems.length === beforeNpmNotices) ok(`npm-Bundle-Notice: ${npmNotices.components.length} Komponenten`);
      }
    }
  }
  // --- build manifest: exact file set + byte-exact hashes -----------------
  // tools/build_public.mjs embeds {path, sha256} for every produced file in
  // PUBLIC-BUILD.md. The build dir must contain EXACTLY those files plus
  // PUBLIC-BUILD.md itself — anything extra, missing, or modified fails.
  const manifestFile = join(publicMode, 'PUBLIC-BUILD.md');
  let manifestFiles = null;
  if (!existsSync(manifestFile)) {
    bad(' Public-Build fehlt PUBLIC-BUILD.md mit Build-Manifest');
  } else {
    const md = readFileSync(manifestFile, 'utf8');
    const block = md.match(/```json\n([^\n]*\n?)```/);
    let manifest = null;
    try { manifest = block ? JSON.parse(block[1]) : null; } catch { manifest = null; }
    if (!manifest || manifest.algorithm !== 'sha256' || !Array.isArray(manifest.files)) {
      bad(' PUBLIC-BUILD.md enthält kein gueltiges Build-Manifest (sha256/files)');
    } else {
      manifestFiles = manifest.files;
      const disk = files.map((f) => f.slice(publicMode.length + 1));
      const expected = new Set([...manifestFiles.map((e) => e.path), 'PUBLIC-BUILD.md']);
      for (const rel of disk) if (!expected.has(rel)) bad(` Build-Manifest: zusaetzliche Datei im Build: ${rel}`);
      for (const rel of expected) if (!disk.includes(rel)) bad(` Build-Manifest: Datei laut Manifest fehlt: ${rel}`);
      for (const entry of manifestFiles) {
        const p = join(publicMode, entry.path);
        if (!existsSync(p)) continue; // already reported as missing above
        const actual = createHash('sha256').update(readFileSync(p)).digest('hex');
        if (actual !== entry.sha256) bad(` Build-Manifest: SHA-256 weicht ab: ${entry.path}`);
      }
      if (!problems.length) ok(`Build-Manifest exakt: ${manifestFiles.length + 1} Dateien, Menge + SHA-256 geprueft`);
    }
  }
// Freshly copied files can take a moment to appear to existsSync under
// sandboxed filesystems — retry briefly before declaring a file missing.
const fileThere = (p) => {
  for (let i = 0; i < 10; i++) {
    if (existsSync(p)) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  return false;
};

  // Der Public-Build muss jede ausgearbeitete Woche ausliefern (ggf. ohne
  // deaktivierte Aufgaben, aber die Datei muss existieren).
  for (const fname of exFiles) {
    if (!fileThere(join(publicMode, 'content/exercises', fname))) {
      bad(` Public-Build verliert Aufgabendatei ${fname}`);
    }
  }
}

console.log('');
for (const w of warn) console.log('  Hinweis  ' + w);
if (problems.length) {
  console.log(`\nVALIDIERUNG FEHLGESCHLAGEN: ${problems.length} Problem(e)`);
  process.exit(1);
}
console.log('VALIDIERUNG BESTANDEN');

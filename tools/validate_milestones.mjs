#!/usr/bin/env node
// Milestone-Coverage-Validator: prueft, ob jedes in
// content/milestones/*.json deklarierte requiredArtifact durch reale
// Katalog-Artefakte des kompilierten Bundles gedeckt ist. Ohne diesen
// Check waere coverage[].requiredArtifacts rein deklarativ.
//
// Praedikate pro coverage-Zeile (Kompetenz im Kontext ihres Milestones):
//
//   lesson            – die Kompetenz hat >=1 Lektion: direkt ueber
//                       lesson.competencyIds oder ueber lessonIds eines
//                       Moduls, das die Kompetenz abdeckt.
//   evidence-families – >=1 mastery-faehige Familien-Aktivitaet
//                       (kuratiertes Placement, familyActivity mit
//                       masteryEligible: true) taggt die Kompetenz.
//   guided-practice   – >=1 Uebung im Lektionskontext: ein exercise- oder
//                       checkpoint-Block in einer Lektion der Kompetenz,
//                       ein eingebetteter #/family/-Link im Lektions-HTML
//                       oder ein kuratiertes Placement mit lessonId auf
//                       eine Lektion der Kompetenz. (Practice-space-
//                       Placements zaehlen nicht: freies Ueben ist nicht
//                       angeleitet.)
//   diagnostic        – >=1 formativer Check ohne Mastery-Einsatz:
//                       masteryEligible:false-Aktivitaet, checkpoint-
//                       Block oder intro-kuratiertes Placement (die
//                       Einstiegssonde, auf die die Standortbestimmung
//                       unter #/diagnostic routet).
//   delayed-review    – der Review-Scheduler (assets/js/core/
//                       review_scheduler.js) legt fuer jede mastery-
//                       faehige Aktivitaet nach qualifiziertem Treffer
//                       Review-Slots an (isQualifiedHit verlangt
//                       masteryEligible !== false). Verzoegerte Reviews
//                       sind damit genau dann abgedeckt, wenn
//                       evidence-families greift.
//   project-step      – die Kompetenz ist mit einem Projekt verknuepft:
//                       projectIds eines Moduls der Kompetenz,
//                       project.competencyIds oder ein project-step-
//                       Block in einer Lektion der Kompetenz.
//
// Aufruf: node tools/validate_milestones.mjs [--dir <build-dir>]
// Exit 0: alle coverage-Zeilen gedeckt. Exit 1: Verstoesse (Content-Gaps
// oder falsch geforderte Artefakte – nicht stillschweigend aus
// requiredArtifacts entfernen, sondern im Review-Backlog dokumentieren).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from './compile_content.mjs';

const defaultProjectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ARTIFACT_KINDS = ['lesson', 'diagnostic', 'guided-practice', 'evidence-families', 'delayed-review', 'project-step'];

const PRACTICE_BLOCK_TYPES = new Set(['exercise', 'checkpoint']);

/** Index: Kompetenz -> Lektionen, Familien-Aktivitaeten, Projekte. */
function buildArtifactContext(bundle) {
  const modules = bundle.learningModules || [];
  const lessons = bundle.lessons || [];
  const activities = bundle.familyActivities || [];
  const projects = bundle.projects || [];
  const lessonById = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));

  const push = (map, key, value) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };

  const lessonIdsByCompetency = new Map();
  for (const lesson of lessons) {
    for (const competencyId of lesson.competencyIds || []) push(lessonIdsByCompetency, competencyId, lesson.lessonId);
  }
  const projectIdsByCompetency = new Map();
  for (const module of modules) {
    for (const competencyId of module.competencyIds || []) {
      for (const lessonId of module.lessonIds || []) push(lessonIdsByCompetency, competencyId, lessonId);
      for (const projectId of module.projectIds || []) push(projectIdsByCompetency, competencyId, projectId);
    }
  }
  const activitiesByCompetency = new Map();
  for (const activity of activities) {
    for (const competencyId of activity.competencyIds || []) push(activitiesByCompetency, competencyId, activity);
  }
  for (const project of projects) {
    for (const competencyId of project.competencyIds || []) push(projectIdsByCompetency, competencyId, project.projectId);
  }

  return {
    lessonsFor: (competencyId) => [...new Set(lessonIdsByCompetency.get(competencyId) || [])]
      .map((lessonId) => lessonById.get(lessonId)).filter(Boolean),
    activitiesFor: (competencyId) => activitiesByCompetency.get(competencyId) || [],
    projectIdsFor: (competencyId) => new Set(projectIdsByCompetency.get(competencyId) || []),
  };
}

const hasPracticeLink = (lesson) => (lesson.blocks || []).some((block) => typeof block.html === 'string' && block.html.includes('#/family/'));
const hasBlockType = (lesson, types) => (lesson.blocks || []).some((block) => types.has(block.type));

/** Einzelnes requiredArtifact gegen den Kompetenz-Kontext pruefen. */
export function artifactSatisfied(kind, competencyId, context) {
  const lessons = context.lessonsFor(competencyId);
  const activities = context.activitiesFor(competencyId);
  const lessonIds = new Set(lessons.map((lesson) => lesson.lessonId));
  switch (kind) {
    case 'lesson':
      return lessons.length > 0;
    case 'evidence-families':
      return activities.some((activity) => activity.masteryEligible === true);
    case 'guided-practice':
      return lessons.some((lesson) => hasBlockType(lesson, PRACTICE_BLOCK_TYPES) || hasPracticeLink(lesson))
        || activities.some((activity) => activity.lessonId && lessonIds.has(activity.lessonId));
    case 'diagnostic':
      return activities.some((activity) => activity.masteryEligible === false)
        || activities.some((activity) => activity.difficulty === 'intro')
        || lessons.some((lesson) => hasBlockType(lesson, new Set(['checkpoint'])));
    case 'delayed-review':
      // Review-Slots entstehen aus qualifizierten Treffern auf mastery-
      // faehige Aktivitaeten (review_scheduler.js + learning_policy.mjs).
      return activities.some((activity) => activity.masteryEligible === true);
    case 'project-step':
      return context.projectIdsFor(competencyId).size > 0
        || lessons.some((lesson) => hasBlockType(lesson, new Set(['project-step'])));
    default:
      return false;
  }
}

/** Alle coverage-Zeilen aller Milestones pruefen.
 *  Rueckgabe: { rows, violations } – rows traegt die komplette
 *  Milestone x Artefakt-Matrix fuer die Konsolenausgabe. */
export function validateMilestoneArtifacts(bundle) {
  const context = buildArtifactContext(bundle);
  const rows = [];
  const violations = [];
  for (const milestone of bundle.milestones || []) {
    for (const coverage of milestone.coverage || []) {
      const results = {};
      for (const artifact of coverage.requiredArtifacts || []) {
        const ok = artifactSatisfied(artifact, coverage.competencyId, context);
        results[artifact] = ok;
        if (!ok) {
          violations.push({
            milestoneId: milestone.milestoneId,
            competencyId: coverage.competencyId,
            artifact,
            known: ARTIFACT_KINDS.includes(artifact),
          });
        }
      }
      rows.push({ milestoneId: milestone.milestoneId, title: milestone.title, competencyId: coverage.competencyId, results });
    }
  }
  return { rows, violations };
}

function printMatrix(rows) {
  let lastMilestone = null;
  for (const row of rows) {
    if (row.milestoneId !== lastMilestone) {
      console.log(`\n${row.milestoneId} — ${row.title}`);
      lastMilestone = row.milestoneId;
    }
    const cells = Object.entries(row.results).map(([artifact, ok]) => `${artifact}:${ok ? 'ok' : 'FEHLT'}`).join('  ');
    console.log(`  ${row.competencyId.padEnd(26)} ${cells}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const dirIndex = process.argv.indexOf('--dir');
  let bundle;
  if (dirIndex >= 0) {
    const dir = process.argv[dirIndex + 1];
    if (!dir) throw new Error('--dir braucht ein Verzeichnis');
    const bundlePath = join(dir, 'content/content-bundle.json');
    if (!existsSync(bundlePath)) throw new Error(`Content-Bundle fehlt: ${bundlePath}`);
    bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  } else {
    bundle = compileContent({ projectRoot: defaultProjectRoot });
  }
  const { rows, violations } = validateMilestoneArtifacts(bundle);
  printMatrix(rows);
  if (violations.length > 0) {
    console.log(`\n${violations.length} Verstoss/Verstoesse gegen Milestone-Coverage:`);
    for (const violation of violations) {
      const reason = violation.known ? 'kein passendes Katalog-Artefakt' : 'unbekannter Artefakttyp';
      console.log(`  ${violation.milestoneId} / ${violation.competencyId}: ${violation.artifact} — ${reason}`);
    }
    process.exit(1);
  }
  console.log(`\nMilestone-Coverage vollstaendig gedeckt (${rows.length} coverage-Zeilen, ${(bundle.milestones || []).length} Milestones).`);
}

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from './compile_content.mjs';
import { catalogRoot, discoverProjects } from './content_roots.mjs';

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const authoritativeGraders = new Set(['deterministic', 'pyodide', 'pyodide-sympy']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tierFor(difficulty) {
  if (difficulty <= 1) return 'basic';
  if (difficulty === 2) return 'core';
  if (difficulty === 3) return 'advanced';
  return 'finalBoss';
}

function sourceRecord(reference, sourcesById) {
  const source = sourcesById.get(reference.sourceId);
  return {
    sourceId: reference.sourceId,
    role: reference.role,
    locator: String(reference.locator || ''),
    linkedFrom: [reference.linkedFrom || 'unknown'],
    contentClass: source?.contentClass || 'unknown',
    license: source?.license || 'unknown',
    publicEligible: ['open', 'generated', 'link-only'].includes(source?.contentClass),
    status: source?.extractionStatus || source?.status || 'registered',
  };
}

function mergeReadings(references, sourcesById) {
  const readings = new Map();
  for (const reference of references) {
    if (!sourcesById.has(reference.sourceId)) continue;
    const reading = sourceRecord(reference, sourcesById);
    const key = `${reading.sourceId}:${reading.role}:${reading.locator}`;
    const existing = readings.get(key);
    if (existing) existing.linkedFrom = unique([...existing.linkedFrom, ...reading.linkedFrom]);
    else readings.set(key, reading);
  }
  return [...readings.values()];
}

function exerciseRecord(exercise) {
  return {
    definitionId: exercise.definitionId,
    activityType: exercise.activityType,
    graderId: exercise.graderId,
    difficulty: exercise.difficulty,
    tier: tierFor(exercise.difficulty),
    generatorId: exercise.generatorId,
    referenceSolverId: exercise.referenceSolverId,
    deterministicSeed: exercise.deterministicSeed,
    testedSeedCount: exercise.testedSeedCount,
    masteryEligible: exercise.masteryEligible,
    publicEligible: exercise.active && exercise.releaseStatus !== 'local-only',
    releaseStatus: exercise.releaseStatus,
    legacyWeekId: exercise.legacyWeekId,
  };
}

function weekCompetencyIds(week) {
  return unique((week.learningUnits || []).map((unit) => unit.competencyId));
}

function weekReviewCompetencyIds(week) {
  return unique((week.gate?.cumulativeExerciseRefs || []).map((reference) => reference.skillId));
}

function weekSourceRefs(week) {
  return (week.learningUnits || []).flatMap((unit) => (unit.sources || []).map((reference) => ({ ...reference, linkedFrom: 'legacy-roadmap' })));
}

const SUPPLEMENT_FLAGS = {
  'contains-local-only-activity': 'localSupplements',
  'private-source-reference-withheld': 'privateSupplements',
  'draft-content': 'humanReviewRequired',
};

/** Classify raw coverage flags into the ADR-0016 report semantics:
 *  releaseGaps block a public release; supplements (local-only activities,
 *  withheld private readings) stay visible but do not block when an
 *  equivalent public path exists; draft status always needs human review;
 *  everything else is a core coverage requirement. */
function classifyGaps(flags) {
  const classified = { releaseGaps: [], localSupplements: [], privateSupplements: [], humanReviewRequired: [], empiricalUnknowns: [] };
  for (const flag of flags) {
    const bucket = SUPPLEMENT_FLAGS[flag];
    if (bucket) classified[bucket].push(flag);
    else classified.releaseGaps.push(flag);
  }
  return classified;
}

function buildCompetencyCoverage(bundle, curriculum, sourcesById, localOnlyCounts, withheldReadingCounts) {
  const unitRefsByCompetency = new Map();
  const weekIdsByCompetency = new Map();
  for (const week of curriculum.weeks) {
    for (const unit of week.learningUnits || []) {
      if (!unit.competencyId) continue;
      unitRefsByCompetency.set(unit.competencyId, [...(unitRefsByCompetency.get(unit.competencyId) || []), ...(unit.sources || []).map((reference) => ({ ...reference, linkedFrom: 'legacy-roadmap' }))]);
      weekIdsByCompetency.set(unit.competencyId, unique([...(weekIdsByCompetency.get(unit.competencyId) || []), week.weekId]));
    }
    for (const competencyId of weekReviewCompetencyIds(week)) {
      weekIdsByCompetency.set(competencyId, unique([...(weekIdsByCompetency.get(competencyId) || []), week.weekId]));
    }
  }

  return bundle.competencies.map((competency) => {
    const lessons = bundle.lessons.filter((lesson) => lesson.competencyIds.includes(competency.competencyId));
    const exercises = bundle.exerciseDefinitions.filter((exercise) => exercise.competencyIds.includes(competency.competencyId)).map(exerciseRecord);
    const publicExercises = exercises.filter((exercise) => exercise.publicEligible);
    const localOnlyExerciseCount = localOnlyCounts.get(competency.competencyId) || 0;
    const withheldPrivateReadingCount = withheldReadingCounts.get(competency.competencyId) || 0;
    const projects = bundle.projects.filter((project) => project.competencyIds.includes(competency.competencyId));
    const lessonRefs = lessons.flatMap((lesson) => (lesson.sourceRefs || []).map((reference) => ({ ...reference, linkedFrom: `lesson:${lesson.lessonId}` })));
    const readings = mergeReadings([...lessonRefs, ...(unitRefsByCompetency.get(competency.competencyId) || [])], sourcesById);
    const publicReadings = readings.filter((reading) => reading.publicEligible);
    const lessonLinkedPublicReadings = publicReadings.filter((reading) => reading.linkedFrom.some((origin) => origin.startsWith('lesson:')));
    const independent = publicExercises.filter((exercise) => exercise.masteryEligible && authoritativeGraders.has(exercise.graderId));
    const manual = publicExercises.filter((exercise) => exercise.graderId === 'manual-rubric');
    const tiers = { basic: [], core: [], advanced: [], finalBoss: [] };
    for (const exercise of publicExercises) tiers[exercise.tier].push(exercise.definitionId);
    const exerciseTypes = unique(publicExercises.map((exercise) => exercise.activityType)).sort();
    const generatedFamilies = publicExercises.filter((exercise) => exercise.generatorId).map((exercise) => exercise.definitionId);
    const testedSeedCount = publicExercises.reduce((sum, exercise) => sum + (exercise.testedSeedCount || 0), 0);
    const delayedReview = Boolean(competency.evidencePolicy?.delayedHitRequired && independent.length);
    const transfer = projects.length > 0 || tiers.advanced.length > 0 || tiers.finalBoss.length > 0;
    const flags = [];
    if (!lessons.length) flags.push('no-lesson');
    if (!readings.length) flags.push('no-linked-reading');
    if (!publicReadings.length) flags.push('no-public-reading');
    if (!lessonLinkedPublicReadings.length) flags.push('no-lesson-linked-public-reading');
    if (publicExercises.length < 2) flags.push('fewer-than-two-public-definitions');
    if (exerciseTypes.length < 2) flags.push('single-public-exercise-type');
    if (!independent.length) flags.push(manual.length ? 'manual-evidence-only' : 'no-independent-evidence');
    if (!delayedReview) flags.push('no-delayed-review-path');
    if (!generatedFamilies.length) flags.push('no-fresh-instance-variation');
    if (!tiers.advanced.length) flags.push('no-advanced-activity');
    if (!tiers.finalBoss.length && !projects.length) flags.push('no-final-boss-or-project');
    // Supplement visibility without release-gate semantics (ADR-0016):
    // withheld private readings and local-only activities only block a
    // release when NO equivalent public path exists at all.
    if (lessons.some((lesson) => lesson.releaseStatus === 'draft') || publicExercises.some((exercise) => exercise.releaseStatus === 'draft')) flags.push('draft-content');
    if (withheldPrivateReadingCount) flags.push('private-source-reference-withheld');
    if (withheldPrivateReadingCount && !publicReadings.length) flags.push('source-rights-block-publication');
    if (localOnlyExerciseCount) flags.push('contains-local-only-activity');
    const gaps = classifyGaps(flags);

    return {
      competencyId: competency.competencyId,
      title: competency.title,
      level: competency.level,
      prerequisiteIds: competency.requires,
      roadmapWeekIds: weekIdsByCompetency.get(competency.competencyId) || [],
      lessons: lessons.map((lesson) => ({ lessonId: lesson.lessonId, role: 'primary', estimatedMinutes: lesson.estimatedMinutes, releaseStatus: lesson.releaseStatus, blockTypes: unique(lesson.blocks.map((block) => block.type)) })),
      readings,
      publicReadingCount: publicReadings.length,
      lessonLinkedPublicReadingCount: lessonLinkedPublicReadings.length,
      withheldPrivateReadingCount,
      exercises,
      publicExerciseCount: publicExercises.length,
      localOnlyExerciseCount,
      requiredExerciseFamilies: 2,
      exerciseTypeCoverage: exerciseTypes,
      generatedVariation: { supported: generatedFamilies.length > 0, definitionIds: generatedFamilies, testedSeedCount },
      difficultyCoverage: tiers,
      deterministicGradingCount: independent.length,
      manualRubricCount: manual.length,
      projectIds: projects.map((project) => project.projectId),
      reviewCoverage: { delayedHitRequired: Boolean(competency.evidencePolicy?.delayedHitRequired), delayedReviewAvailable: delayedReview, freshnessDays: competency.evidencePolicy?.freshnessDays ?? null },
      evidenceRequirements: competency.evidencePolicy,
      evidenceDimensions: {
        mentioned: Boolean(lessons.length || exercises.length || (weekIdsByCompetency.get(competency.competencyId) || []).length),
        reading: readings.length > 0,
        guidedPractice: exercises.length > 0 || lessons.some((lesson) => lesson.blocks.some((block) => ['worked-example', 'checkpoint', 'exercise'].includes(block.type))),
        independentEvidence: independent.length > 0,
        delayedReview,
        transfer,
      },
      owner: 'core-content',
      reviewerStatus: 'automated-gap-analysis',
      releaseStatus: competency.releaseStatus,
      releaseGaps: gaps.releaseGaps,
      localSupplements: gaps.localSupplements,
      privateSupplements: gaps.privateSupplements,
      humanReviewRequired: gaps.humanReviewRequired,
      empiricalUnknowns: gaps.empiricalUnknowns,
      knownGaps: flags,
    };
  });
}

function buildRoadmapCoverage(bundle, curriculum, sourcesById, localOnlyCounts, withheldReadingCounts, competencyTierCoverage, projectPhaseWeeks) {
  const competencyIds = new Set(bundle.competencies.map((competency) => competency.competencyId));
  return curriculum.weeks.map((week) => {
    const topicCompetencyIds = weekCompetencyIds(week);
    const reviewCompetencyIds = weekReviewCompetencyIds(week);
    const referencedCompetencyIds = unique([...topicCompetencyIds, ...reviewCompetencyIds]);
    const exercises = bundle.exerciseDefinitions.filter((exercise) => exercise.legacyWeekId === week.weekId).map(exerciseRecord);
    const publicExercises = exercises.filter((exercise) => exercise.publicEligible);
    const localOnlyExerciseCount = localOnlyCounts.get(week.weekId) || 0;
    const withheldPrivateReadingCount = withheldReadingCounts.get(week.weekId) || 0;
    const projects = bundle.projects.filter((project) => project.legacyWeekId === week.weekId);
    const sharedProjects = bundle.projects.filter((project) => project.legacyWeekId !== week.weekId
      && (projectPhaseWeeks.get(project.projectId) || []).includes(week.weekId));
    const readings = mergeReadings(weekSourceRefs(week), sourcesById);
    const tiers = { basic: [], core: [], advanced: [], finalBoss: [] };
    // Week tier coverage joins BOTH ways (ADR-0016): exercises anchored at
    // this week via legacyWeekId AND exercises of the week's topic
    // competencies (which may live in another week or unanchored f-*
    // definitions) — competency-level coverage must not vanish from a week
    // just because the definition is anchored elsewhere.
    for (const exercise of publicExercises) tiers[exercise.tier].push(exercise.definitionId);
    for (const competencyId of topicCompetencyIds) {
      const competencyTiers = competencyTierCoverage.get(competencyId);
      if (!competencyTiers) continue;
      for (const [tier, definitionIds] of Object.entries(competencyTiers)) {
        tiers[tier].push(...definitionIds);
      }
    }
    for (const tier of Object.keys(tiers)) tiers[tier] = unique(tiers[tier]);
    const flags = [];
    if (!week.detailed) flags.push('outline-only');
    if (!topicCompetencyIds.length) flags.push('no-topic-competencies');
    if (referencedCompetencyIds.some((competencyId) => !competencyIds.has(competencyId))) flags.push('undefined-competency-reference');
    if (!readings.length) flags.push('no-readings');
    if (withheldPrivateReadingCount) flags.push('private-source-reference-withheld');
    if (withheldPrivateReadingCount && !readings.length) flags.push('source-rights-block-publication');
    if (!publicExercises.length) flags.push('no-public-exercises');
    if (localOnlyExerciseCount) flags.push('contains-local-only-activity');
    if (!tiers.advanced.length) flags.push('no-advanced-activity');
    if (!tiers.finalBoss.length && !projects.length && !sharedProjects.length) flags.push('no-final-boss-or-project');
    const gaps = classifyGaps(flags);
    return {
      topicId: week.weekId,
      weekNumber: week.number,
      phaseId: week.phaseId,
      title: week.title,
      detailed: week.detailed,
      topicCompetencyIds,
      reviewCompetencyIds,
      undefinedCompetencyIds: referencedCompetencyIds.filter((competencyId) => !competencyIds.has(competencyId)),
      goals: week.goals || [],
      readings,
      withheldPrivateReadingCount,
      exercises,
      publicExerciseCount: publicExercises.length,
      localOnlyExerciseCount,
      exerciseTypeCoverage: unique(publicExercises.map((exercise) => exercise.activityType)).sort(),
      generatedVariationCount: publicExercises.filter((exercise) => exercise.generatorId).length,
      difficultyCoverage: tiers,
      projectIds: projects.map((project) => project.projectId),
      // Multi-week projects (capstone): phases mapped to their actual weeks
      // (ADR-0016 rule 6) — these weeks continue a project without owning it.
      sharedProjectIds: sharedProjects.map((project) => project.projectId),
      releaseGaps: gaps.releaseGaps,
      localSupplements: gaps.localSupplements,
      privateSupplements: gaps.privateSupplements,
      humanReviewRequired: gaps.humanReviewRequired,
      empiricalUnknowns: gaps.empiricalUnknowns,
      knownGaps: flags,
    };
  });
}

function buildMarkdown(matrix) {
  const lines = [
    '# Coverage-Bericht',
    '',
    `Katalog: \`${matrix.catalogId}\` ${matrix.catalogVersion}. Die Matrix unterscheidet Erwähnung, Lektüre, geführte Praxis, unabhängige Evidenz, verzögerten Review und Transfer. Releaseblocker, optionale Supplements und Human-Review-Pflichten werden getrennt ausgewiesen (ADR-0016). Schwellen sind Produkt-Heuristiken und keine Forschungskonstanten.`,
    '',
    '## Überblick',
    '',
    `- Kompetenzen: ${matrix.summary.competencyCount}`,
    `- Roadmap-Themen: ${matrix.summary.roadmapTopicCount}`,
    `- Kompetenzen mit echten Releaseblockern: ${matrix.summary.releaseBlockingCompetencies}`,
    `- Roadmap-Themen mit echten Releaseblockern: ${matrix.summary.releaseBlockingTopics}`,
    `- Kompetenzen ohne öffentliche Lektüre: ${matrix.summary.competenciesWithoutPublicReading}`,
    `- Kompetenzen ohne in der Lektion verknüpfte öffentliche Lektüre: ${matrix.summary.competenciesWithoutLessonLinkedPublicReading}`,
    `- Kompetenzen ohne unabhängige Evidenz: ${matrix.summary.competenciesWithoutIndependentEvidence}`,
    `- Kompetenzen ohne frische Varianten: ${matrix.summary.competenciesWithoutFreshVariation}`,
    `- Nur skizzierte Roadmap-Themen: ${matrix.summary.outlineOnlyTopics}`,
    `- Roadmap-Themen mit undefinierten Kompetenzreferenzen: ${matrix.summary.topicsWithUndefinedCompetencies}`,
    `- Optionale lokale Zusatzaktivitäten: ${matrix.summary.competenciesWithLocalSupplements} Kompetenzen (kein Releaseblocker, wenn gleichwertige öffentliche Evidenz existiert)`,
    `- Zurückgehaltene private Zusatzlektüren: ${matrix.summary.competenciesWithPrivateSupplements} Kompetenzen (kein Releaseblocker, wenn vollständige öffentliche Lektüre existiert)`,
    `- Kompetenzen in menschlicher Freigabe (Draft): ${matrix.summary.competenciesAwaitingHumanReview}`,
    '',
    '## Kompetenzen',
    '',
    '| Kompetenz | Lektionen | Lektionsverknüpfte / öffentliche Lektüren | öffentliche Aufgaben / Typen | Varianten | Basic · Core · Advanced · Final Boss | Evidenzdimensionen | Releaseblocker | Supplements | Human-Review |',
    '|---|---:|---:|---|---|---|---|---|---|---|',
  ];
  for (const item of matrix.competencies) {
    const dimensions = Object.entries(item.evidenceDimensions).filter(([, value]) => value).map(([key]) => key).join(', ') || '—';
    const tiers = item.difficultyCoverage;
    const supplements = [
      item.localSupplements.includes('contains-local-only-activity') ? 'lokale Aktivität' : '',
      item.privateSupplements.includes('private-source-reference-withheld') ? 'private Lektüre zurückgehalten' : '',
    ].filter(Boolean).join(', ') || '—';
    lines.push(`| \`${item.competencyId}\` ${item.title.replaceAll('|', '\\|')} | ${item.lessons.length} | ${item.lessonLinkedPublicReadingCount} / ${item.publicReadingCount} | ${item.publicExerciseCount} / ${item.exerciseTypeCoverage.join(', ') || '—'} | ${item.generatedVariation.supported ? `ja (${item.generatedVariation.definitionIds.length})` : 'nein'} | ${tiers.basic.length} · ${tiers.core.length} · ${tiers.advanced.length} · ${tiers.finalBoss.length + item.projectIds.length} | ${dimensions} | ${item.releaseGaps.join(', ') || '—'} | ${supplements} | ${item.humanReviewRequired.join(', ') || '—'} |`);
  }
  lines.push('', '## 39 Roadmap-Themen', '', '| Woche | Thema | Status | Kompetenzen | Lektüren | Aufgaben | Projekte (eigen / fortgeführt) | Releaseblocker | Supplements |', '|---:|---|---|---|---:|---:|---|---|---|');
  for (const topic of matrix.roadmapTopics) {
    const supplements = [
      topic.localSupplements.includes('contains-local-only-activity') ? 'lokale Aktivität' : '',
      topic.privateSupplements.includes('private-source-reference-withheld') ? 'private Lektüre zurückgehalten' : '',
    ].filter(Boolean).join(', ') || '—';
    lines.push(`| ${topic.weekNumber} | ${topic.title.replaceAll('|', '\\|')} | ${topic.detailed ? 'detailliert' : 'Skizze'} | ${topic.topicCompetencyIds.join(', ') || '—'} | ${topic.readings.length} | ${topic.publicExerciseCount}${topic.localOnlyExerciseCount ? ` (+${topic.localOnlyExerciseCount} lokal)` : ''} | ${topic.projectIds.length}${topic.sharedProjectIds.length ? ` (+${topic.sharedProjectIds.length} fortgeführt)` : ''} | ${topic.releaseGaps.join(', ') || '—'} | ${supplements} |`);
  }
  lines.push(
    '',
    '## Empirisch offen',
    '',
    ...matrix.empiricalUnknowns.map((item) => `- **${item.topic}**: ${item.detail} (betroffen: ${item.affected})`),
    '',
    '## Schwellen und Interpretation',
    '',
    '- Mindestens eine eigene Lektion und eine öffentlich nutzbare Lektüre pro freizugebender Kompetenz.',
    '- Mindestens zwei Aufgabendefinitionen und zwei passende Aufgabentypen pro Kompetenz.',
    '- Mindestens ein autoritativ bewertbarer unabhängiger Nachweis; Manual-Rubrics bleiben nicht bindend.',
    '- Ein verzögerter Review-Pfad und eine frische, deterministische Instanzvariante pro Kompetenz.',
    '- Difficulty 1 = Basic, 2 = Core, 3 = Advanced, 4–5 = Final Boss; Projekte zählen als Transfer/Final Boss.',
    '- Wochen-Abdeckung verknüpft Aufgaben BOTH über ihre Verankerungswoche als auch über die Themen-Kompetenzen; Multi-Wochen-Projekte erscheinen in ihren tatsächlichen Phasenwochen als fortgeführt.',
    '- Releaseblocker sind nur echte publikations-/fachliche Gaps. Optionale lokale/private Supplements bleiben sichtbar, blockieren aber nicht, wenn ein gleichwertiger öffentlicher Pfad existiert; `source-rights-block-publication` bleibt immer ein echter Blocker.',
    '- Nicht jede Woche benötigt ein eigenes Projekt; Projektpflicht ergibt sich explizit aus Kompetenz, Milestone oder Curriculum.',
    '- Menschliche Freigabe (Draft-Status) und empirische Unsicherheiten sind getrennt von fachlichen Gaps ausgewiesen.',
    '- Die konkreten Treffer-, Hinweis- und Zeitgrenzen sind konfigurierbare Heuristiken und müssen mit eigener Retentions- und Nutzungsevaluation kalibriert werden.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

export function buildCoverageArtifacts(projectRoot = defaultRoot) {
  const bundle = compileContent({ projectRoot, profile: 'public' });
  const localBundle = compileContent({ projectRoot, profile: 'local-private' });
  const catalog = readJson(join(projectRoot, 'content/catalog.json'));
  const curriculum = readJson(join(projectRoot, 'content', catalog.legacy.curriculumFile));
  // Week-project mapping contract (ADR-0013 inherited-debt D): the project
  // owns the reference. Every legacyWeekId on a project must resolve to an
  // existing roadmap week; otherwise the mapping fails closed instead of
  // silently reporting no-project.
  const weekIds = new Set(curriculum.weeks.map((week) => week.weekId));
  for (const profileBundle of [bundle, localBundle]) {
    for (const project of profileBundle.projects) {
      if (project.legacyWeekId && !weekIds.has(project.legacyWeekId)) {
        throw new Error(`${project.projectId}: legacyWeekId ${project.legacyWeekId} referenziert keine Roadmap-Woche`);
      }
    }
    // Exercises are anchored the same way (ADR-0016 fail-closed stance): an
    // unknown legacyWeekId would silently shrink the week rows and tier
    // coverage while the competency level keeps counting.
    for (const exercise of profileBundle.exerciseDefinitions) {
      if (exercise.legacyWeekId && !weekIds.has(exercise.legacyWeekId)) {
        throw new Error(`${exercise.definitionId}: legacyWeekId ${exercise.legacyWeekId} referenziert keine Roadmap-Woche`);
      }
    }
  }
  const allSources = readJson(join(projectRoot, 'content/sources.json')).sources || [];
  const sourcesById = new Map(allSources.filter((source) => ['open', 'generated', 'link-only'].includes(source.contentClass)).map((source) => [source.sourceId, source]));
  const privateSourceIds = new Set(allSources.filter((source) => source.contentClass === 'private').map((source) => source.sourceId));
  const publicDefinitionIds = new Set(bundle.exerciseDefinitions.map((exercise) => exercise.definitionId));
  const localOnlyDefinitions = localBundle.exerciseDefinitions.filter((exercise) => !publicDefinitionIds.has(exercise.definitionId));
  const localOnlyCountsByCompetency = new Map();
  const localOnlyCountsByWeek = new Map();
  for (const exercise of localOnlyDefinitions) {
    for (const competencyId of exercise.competencyIds) localOnlyCountsByCompetency.set(competencyId, (localOnlyCountsByCompetency.get(competencyId) || 0) + 1);
    if (exercise.legacyWeekId) localOnlyCountsByWeek.set(exercise.legacyWeekId, (localOnlyCountsByWeek.get(exercise.legacyWeekId) || 0) + 1);
  }
  const withheldReadingsByCompetency = new Map();
  const withheldReadingsByWeek = new Map();
  for (const week of curriculum.weeks) {
    for (const unit of week.learningUnits || []) {
      const count = (unit.sources || []).filter((reference) => privateSourceIds.has(reference.sourceId)).length;
      if (!count) continue;
      withheldReadingsByCompetency.set(unit.competencyId, (withheldReadingsByCompetency.get(unit.competencyId) || 0) + count);
      withheldReadingsByWeek.set(week.weekId, (withheldReadingsByWeek.get(week.weekId) || 0) + count);
    }
  }
  for (const lesson of localBundle.lessons) {
    const count = (lesson.sourceRefs || []).filter((reference) => privateSourceIds.has(reference.sourceId)).length;
    for (const competencyId of lesson.competencyIds) if (count) withheldReadingsByCompetency.set(competencyId, (withheldReadingsByCompetency.get(competencyId) || 0) + count);
  }
  const competencies = buildCompetencyCoverage(bundle, curriculum, sourcesById, localOnlyCountsByCompetency, withheldReadingsByCompetency);
  // Multi-week projects (capstone): read the authored phase->week mapping so
  // continuation weeks report the project as shared instead of "no project".
  const projectPhaseWeeks = new Map();
  const curriculumWeekIds = new Set(curriculum.weeks.map((week) => week.weekId));
  const projectFiles = catalog.roots
    ? discoverProjects(join(projectRoot, 'content'), catalogRoot(catalog, 'projects'))
    : catalog.projectFiles || [];
  for (const projectFile of projectFiles) {
    const project = readJson(join(projectRoot, 'content', projectFile));
    const phasesPath = join(projectRoot, 'content', projectFile.replace(/project\.json$/, 'phases.json'));
    if (!existsSync(phasesPath)) continue;
    const phases = readJson(phasesPath).phases || [];
    const phaseWeeks = unique(phases.flatMap((phase) => phase.weekIds || (phase.weekId ? [phase.weekId] : [])));
    for (const weekId of phaseWeeks) {
      if (!curriculumWeekIds.has(weekId)) {
        throw new Error(`${project.projectId}: Phase verweist auf unbekannte Roadmap-Woche ${weekId}`);
      }
    }
    projectPhaseWeeks.set(project.projectId, phaseWeeks);
  }
  const competencyTierCoverage = new Map(competencies.map((item) => [item.competencyId, item.difficultyCoverage]));
  const roadmapTopics = buildRoadmapCoverage(bundle, curriculum, sourcesById, localOnlyCountsByWeek, withheldReadingsByWeek, competencyTierCoverage, projectPhaseWeeks);
  const empiricalUnknowns = [
    { topic: 'review-slots', detail: 'Expanding-Slots Woche+2/+5/+11 sind eine Eigenableitung (ADR-0008), nicht literaturgeprüfte Dosierung; Kalibrierung mit eigenen Retentionsdaten offen.', affected: 'alle geplanten Reviews' },
    { topic: 'competency-freshness', detail: `freshnessDays (${[...new Set(bundle.competencies.map((item) => item.evidencePolicy?.freshnessDays).filter(Boolean))].sort((a, b) => a - b).join(', ')} Tage) sind transparente Produktheuristiken (ADR-0009) ohne empirische Kalibrierung.`, affected: 'alle Kompetenzen' },
    { topic: 'evidence-thresholds', detail: 'minimumIndependentHits 2 / minimumDistinctDefinitions 2 / maxHints 1 sind Produktheuristiken; die Hint-Dosierung hat keine direkte Evidenzgrundlage.', affected: 'alle Kompetenzen' },
    { topic: 'time-estimates', detail: 'Geschätzte Minuten für Lektionen und Aufgaben sind unkalibrierte Autorenangaben.', affected: 'alle Lektionen und Aufgaben' },
    { topic: 'difficulty-tiers', detail: 'Die Difficulty-Stufen 1-5 sind eine Produktklassifikation ohne empirische Schwierigkeitskalibrierung.', affected: 'alle Aufgaben' },
  ];
  const matrix = {
    schemaVersion: 1,
    catalogId: bundle.catalogId,
    catalogVersion: bundle.catalogVersion,
    profile: 'public-gap-analysis',
    tierPolicy: { basic: [1], core: [2], advanced: [3], finalBoss: [4, 5] },
    thresholds: {
      minimumOwnLessons: 1,
      minimumPublicReadings: 1,
      minimumExerciseDefinitions: 2,
      minimumExerciseTypes: 2,
      freshInstanceVariationRequired: true,
      independentEvidenceRequired: true,
      delayedReviewRequired: true,
      advancedAndFinalBossRequired: true,
    },
    summary: {
      competencyCount: competencies.length,
      roadmapTopicCount: roadmapTopics.length,
      competenciesWithoutPublicReading: competencies.filter((item) => !item.publicReadingCount).length,
      competenciesWithoutLessonLinkedPublicReading: competencies.filter((item) => !item.lessonLinkedPublicReadingCount).length,
      competenciesWithoutIndependentEvidence: competencies.filter((item) => !item.evidenceDimensions.independentEvidence).length,
      competenciesWithoutFreshVariation: competencies.filter((item) => !item.generatedVariation.supported).length,
      outlineOnlyTopics: roadmapTopics.filter((item) => !item.detailed).length,
      topicsWithUndefinedCompetencies: roadmapTopics.filter((item) => item.undefinedCompetencyIds.length).length,
      // ADR-0016 semantics: release blockers vs. supplements vs. human gates.
      releaseBlockingCompetencies: competencies.filter((item) => item.releaseGaps.length).length,
      releaseBlockingTopics: roadmapTopics.filter((item) => item.releaseGaps.length).length,
      competenciesWithLocalSupplements: competencies.filter((item) => item.localSupplements.length).length,
      competenciesWithPrivateSupplements: competencies.filter((item) => item.privateSupplements.length).length,
      competenciesAwaitingHumanReview: competencies.filter((item) => item.humanReviewRequired.length).length,
    },
    empiricalUnknowns,
    competencies,
    roadmapTopics,
  };
  return { matrix, markdown: buildMarkdown(matrix) };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
  const projectRoot = rootArgument ? rootArgument.slice('--root='.length) : defaultRoot;
  const matrixPath = join(projectRoot, 'content/coverage-matrix.json');
  const reportPath = join(projectRoot, 'docs/coverage-report.md');
  const { matrix, markdown } = buildCoverageArtifacts(projectRoot);
  const matrixText = serialize(matrix);
  if (check) {
    const currentMatrix = readFileSync(matrixPath, 'utf8');
    const currentReport = readFileSync(reportPath, 'utf8');
    if (currentMatrix !== matrixText || currentReport !== markdown) throw new Error('Coverage-Artefakte sind veraltet; npm run coverage:build ausführen');
    console.log(`Coverage aktuell: ${matrix.summary.competencyCount} Kompetenzen, ${matrix.summary.roadmapTopicCount} Themen`);
  } else {
    writeFileSync(matrixPath, matrixText);
    writeFileSync(reportPath, markdown);
    console.log(`Coverage geschrieben: ${matrix.summary.competencyCount} Kompetenzen, ${matrix.summary.roadmapTopicCount} Themen`);
  }
}

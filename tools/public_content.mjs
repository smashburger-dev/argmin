const clone = (value) => JSON.parse(JSON.stringify(value));
const privateOutputMarkers = /\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard|library-private|private-extracts/i;

export function sanitizePublicValue(value) {
  if (typeof value === 'string') return value.replace(/\s*\((?:vgl\.\s*)?MML\b[^)]*\)/giu, '');
  if (Array.isArray(value)) return value.map(sanitizePublicValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizePublicValue(child)]));
  }
  return value;
}

export function buildSearchIndex(curriculum, sources, exercisePacks) {
  const entries = [];
  for (const phase of curriculum.phases || []) {
    entries.push({
      id: phase.phaseId,
      kind: 'phase',
      title: phase.title,
      route: `#/phase/${phase.index}`,
      text: [phase.title, phase.artifact, ...(phase.tags || [])].join(' '),
    });
  }
  for (const week of curriculum.weeks || []) {
    entries.push({
      id: week.weekId,
      kind: 'week',
      title: `Woche ${week.number}: ${week.title}`,
      route: `#/week/${week.number}`,
      text: [week.number, week.title, ...(week.goals || []), week.task, week.evidence].join(' '),
    });
    for (const unit of week.detailed ? (week.learningUnits || []) : []) {
      entries.push({
        id: unit.unitId,
        kind: 'unit',
        title: unit.title,
        route: `#/unit/${unit.unitId}`,
        text: [unit.title, unit.type, unit.competencyId, ...(unit.sources || []).map((source) => source.sourceId)].join(' '),
      });
    }
  }
  for (const pack of exercisePacks) {
    for (const exercise of pack.exercises || []) {
      if (exercise.active === false) continue;
      entries.push({
        id: exercise.exerciseId,
        kind: 'exercise',
        title: exercise.exerciseId,
        route: `#/exercise/${exercise.exerciseId}`,
        text: [exercise.prompt, exercise.type, ...(exercise.skillIds || [])].join(' ').replace(/\$/g, ''),
      });
    }
  }
  for (const source of sources.sources || []) {
    entries.push({
      id: source.sourceId,
      kind: 'source',
      title: source.title,
      route: '#/sources',
      text: [source.title, source.author, source.license].join(' '),
    });
  }
  return { schemaVersion: 1, entries };
}

export function createPublicLegacyContent(input) {
  const curriculum = clone(input.curriculum);
  const sources = clone(input.sources);
  const exercisePacks = clone(input.exercisePacks);
  sources.sources = (sources.sources || []).filter((source) => source.contentClass !== 'private');
  for (const source of sources.sources) {
    delete source.localFile;
    delete source.localPath;
  }
  const sourceIds = new Set(sources.sources.map((source) => source.sourceId));
  const keptExerciseIds = new Set();
  for (const pack of exercisePacks) {
    pack.exercises = (pack.exercises || [])
      .filter((exercise) => exercise.active !== false)
      .map((exercise) => {
        keptExerciseIds.add(exercise.exerciseId);
        exercise.sourceLineage = {
          concept: 'eigenständig entwickelte Aufgabenfamilie',
          statement: exercise.sourceLineage?.statement || 'eigenständig entwickelt',
          seed: exercise.sourceLineage?.seed ?? exercise.deterministicSeed,
        };
        return sanitizePublicValue(exercise);
      });
  }
  curriculum.derivedFrom = (curriculum.derivedFrom || []).filter((item) => !item.sourceId || sourceIds.has(item.sourceId));
  for (const item of curriculum.derivedFrom) {
    delete item.file;
    delete item.sha256;
  }
  for (const week of curriculum.weeks || []) {
    if (Array.isArray(week.exercises)) week.exercises = week.exercises.filter((id) => keptExerciseIds.has(id));
    if (week.gate && Array.isArray(week.gate.evidenceExerciseIds)) {
      week.gate.evidenceExerciseIds = week.gate.evidenceExerciseIds.filter((id) => keptExerciseIds.has(id));
    }
    for (const unit of week.learningUnits || []) {
      if (Array.isArray(unit.unitExerciseIds)) unit.unitExerciseIds = unit.unitExerciseIds.filter((id) => keptExerciseIds.has(id));
      unit.sources = (unit.sources || [])
        .filter((source) => sourceIds.has(source.sourceId))
        .map((source) => {
          delete source.locatorPath;
          return source;
        });
    }
  }
  const result = {
    curriculum,
    sources,
    exercisePacks,
    searchIndex: buildSearchIndex(curriculum, sources, exercisePacks),
  };
  if (privateOutputMarkers.test(JSON.stringify(result))) throw new Error('Public-Legacy-Inhalt enthält privaten Quellenmarker');
  return result;
}

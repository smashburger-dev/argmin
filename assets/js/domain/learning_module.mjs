const mapBy = (items, key) => new Map((items || []).map((item) => [item[key], item]));

export const DIFFICULTY_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

function requireId(map, id, moduleId, kind) {
  const item = map.get(id);
  if (!item) throw new Error(`${moduleId}: unbekannte ${kind} ${id}`);
  return item;
}

export function placementMinutes(placement, definitionById) {
  if (placement.role === 'practice-space') return Number(placement.estimatedMinutes) || 0;
  if (placement.definitionId) {
    const definition = definitionById.get(placement.definitionId);
    if (!definition) throw new Error(`Placement ${placement.placementId}: unbekannte Aufgabe ${placement.definitionId}`);
    return definition.estimatedMinutes;
  }
  return Number(placement.estimatedMinutes) || 0;
}

export function deriveModuleMinutes(module, lookup) {
  const lessonById = mapBy(lookup.lessons, 'lessonId');
  const definitionById = mapBy(lookup.definitions, 'definitionId');
  const projectById = mapBy(lookup.projects, 'projectId');
  let minutes = 0;
  for (const lessonId of module.lessonIds || []) {
    minutes += requireId(lessonById, lessonId, module.moduleId, 'Lektion').estimatedMinutes;
  }
  for (const placement of module.placements || []) {
    minutes += placementMinutes(placement, definitionById);
  }
  for (const projectId of module.projectIds || []) {
    minutes += requireId(projectById, projectId, module.moduleId, 'Projekt').estimatedMinutes ?? 0;
  }
  return minutes;
}

export function compileLearningModule(module, lookup) {
  const derivedMinutes = deriveModuleMinutes(module, lookup);
  const override = module.durationOverrideMinutes;
  return {
    ...module,
    derivedMinutes,
    estimatedMinutes: override ?? derivedMinutes,
    durationOverridden: override != null,
  };
}

function pushIndex(index, key, moduleId) {
  const list = index.get(key);
  if (list) list.push(moduleId);
  else index.set(key, [moduleId]);
}

export function indexLearningModules(modules) {
  const placementIds = new Set();
  const byTrack = new Map();
  const byCompetency = new Map();
  const byLesson = new Map();
  for (const module of modules) {
    for (const placement of module.placements || []) {
      if (placementIds.has(placement.placementId)) throw new Error(`Placement-ID doppelt: ${placement.placementId}`);
      placementIds.add(placement.placementId);
    }
    for (const trackId of module.trackIds || []) pushIndex(byTrack, trackId, module.moduleId);
    for (const competencyId of module.competencyIds || []) pushIndex(byCompetency, competencyId, module.moduleId);
    for (const lessonId of module.lessonIds || []) pushIndex(byLesson, lessonId, module.moduleId);
  }
  return { byTrack, byCompetency, byLesson };
}

function assertKnown(ids, id, label, kind) {
  if (!ids.has(id)) throw new Error(`${label}: unbekannte ${kind} ${id}`);
}

function assertPlacement(label, placement, ids) {
  if (placement.definitionId) assertKnown(ids.exercises, placement.definitionId, label, 'Aufgabe');
  if (placement.lessonId) assertKnown(ids.lessons, placement.lessonId, label, 'Lektion');
  if (placement.role === 'practice-space' && placement.definitionId) {
    throw new Error(`${label}: Übungsplatz ${placement.placementId} darf keine Einzelaufgabe kopieren`);
  }
  if (placement.role !== 'curated' || placement.definitionId) return;
  if (placement.caseId == null || placement.seed == null) {
    throw new Error(`${label}: kuratiertes Placement ${placement.placementId} braucht Falltyp und Seed`);
  }
  if (typeof placement.masteryEligible !== 'boolean') {
    throw new Error(`${label}: Placement ${placement.placementId} braucht masteryEligible ohne definitionId`);
  }
}

export function assertModuleBindings(module, ids) {
  const label = module.moduleId;
  for (const competencyId of [...(module.competencyIds || []), ...(module.requires || [])]) {
    assertKnown(ids.competencies, competencyId, label, 'Kompetenz');
  }
  for (const trackId of module.trackIds || []) assertKnown(ids.tracks, trackId, label, 'Track');
  assertKnown(ids.rights, module.rightsId, label, 'Rechte');
  for (const lessonId of module.lessonIds || []) assertKnown(ids.lessons, lessonId, label, 'Lektion');
  for (const explanationId of module.explanationIds || []) assertKnown(ids.explanations, explanationId, label, 'Erklärung');
  for (const projectId of module.projectIds || []) assertKnown(ids.projects, projectId, label, 'Projekt');
  for (const placement of module.placements || []) assertPlacement(label, placement, ids);
}

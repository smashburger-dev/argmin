function moduleRank(module, indexByCompetency, originalIndex) {
  const firstCompetency = module.competencyIds?.[0];
  return [
    indexByCompetency.get(firstCompetency) ?? Number.POSITIVE_INFINITY,
    module.title,
    originalIndex,
  ];
}

function compareRanks(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

export function orderModulesForTrack(modules, track) {
  const selected = modules.filter((module) => module.trackIds?.includes(track.trackId));
  const indexByCompetency = new Map(track.competencyIds.map((id, index) => [id, index]));
  const moduleByCompetency = new Map();
  selected.forEach((module) => module.competencyIds?.forEach((id) => moduleByCompetency.set(id, module)));
  const edges = new Map(selected.map((module) => [module.moduleId, new Set()]));
  const indegree = new Map(selected.map((module) => [module.moduleId, 0]));
  selected.forEach((module) => {
    module.requires?.forEach((requiredCompetency) => {
      const prerequisite = moduleByCompetency.get(requiredCompetency);
      if (!prerequisite || prerequisite.moduleId === module.moduleId || edges.get(prerequisite.moduleId).has(module.moduleId)) return;
      edges.get(prerequisite.moduleId).add(module.moduleId);
      indegree.set(module.moduleId, indegree.get(module.moduleId) + 1);
    });
  });
  const byId = new Map(selected.map((module, index) => [module.moduleId, { module, index }]));
  const rank = (moduleId) => {
    const entry = byId.get(moduleId);
    return moduleRank(entry.module, indexByCompetency, entry.index);
  };
  const ready = selected.filter((module) => indegree.get(module.moduleId) === 0).map((module) => module.moduleId);
  const result = [];
  while (ready.length) {
    ready.sort((left, right) => compareRanks(rank(left), rank(right)));
    const moduleId = ready.shift();
    result.push(byId.get(moduleId).module);
    edges.get(moduleId).forEach((dependentId) => {
      const nextDegree = indegree.get(dependentId) - 1;
      indegree.set(dependentId, nextDegree);
      if (nextDegree === 0) ready.push(dependentId);
    });
  }
  if (result.length < selected.length) {
    const included = new Set(result.map((module) => module.moduleId));
    result.push(...selected.filter((module) => !included.has(module.moduleId))
      .sort((left, right) => compareRanks(
        moduleRank(left, indexByCompetency, byId.get(left.moduleId).index),
        moduleRank(right, indexByCompetency, byId.get(right.moduleId).index),
      )));
  }
  return result;
}

// --- Learning-path gates (compile-time, fail closed) -----------------------

const competencyOrderIndex = (competencies) => new Map(
  competencies.map((competency, index) => [competency.competencyId, { competency, index }]),
);

const transitivePrerequisites = (byId, competencyIds) => {
  const own = new Set(competencyIds);
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const required of byId.get(id)?.competency.requires || []) visit(required);
  };
  for (const id of competencyIds) for (const required of byId.get(id)?.competency.requires || []) visit(required);
  seen.forEach((id) => { if (own.has(id)) seen.delete(id); });
  return seen;
};

// A module's `requires` list is exactly the union of its competencies' direct
// prerequisites, minus the competencies the module teaches itself, ordered by
// the competency file order.
export function assertModuleRequires(modules, competencies) {
  const byId = competencyOrderIndex(competencies);
  for (const module of modules) {
    const own = new Set(module.competencyIds || []);
    const needed = new Set();
    for (const id of own) {
      for (const required of byId.get(id)?.competency.requires || []) if (!own.has(required)) needed.add(required);
    }
    const expected = [...needed].sort((a, b) => byId.get(a).index - byId.get(b).index);
    const actual = module.requires || [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${module.moduleId}: requires ${JSON.stringify(actual)} weicht vom Kompetenzgraph ab — erwartet ${JSON.stringify(expected)}`);
    }
  }
}

// Every module tagged with a track must teach only competencies the track lists.
export function assertTrackCoverage(modules, tracks) {
  const coveredByTrack = new Map(tracks.map((track) => [track.trackId, new Set(track.competencyIds)]));
  for (const module of modules) {
    for (const trackId of module.trackIds || []) {
      const covered = coveredByTrack.get(trackId);
      if (!covered) continue;
      for (const id of module.competencyIds || []) {
        if (!covered.has(id)) throw new Error(`${trackId}: Modul ${module.moduleId} lehrt ${id}, das der Track nicht führt`);
      }
    }
  }
}

// First position in the track order that teaches each competency.
const teacherPositions = (order) => {
  const positions = new Map();
  order.forEach((module, index) => {
    for (const id of module.competencyIds || []) if (!positions.has(id)) positions.set(id, index);
  });
  return positions;
};

// For every track, in the real orderModulesForTrack output: each transitive
// prerequisite competency a module needs must be taught strictly earlier.
// Prerequisites with no teacher inside the track are accepted gaps.
export function assertTrackPrerequisiteOrder(modules, tracks, competencies) {
  const byId = competencyOrderIndex(competencies);
  for (const track of tracks) {
    const order = orderModulesForTrack(modules, track);
    const teacherPos = teacherPositions(order);
    order.forEach((module, index) => {
      for (const required of transitivePrerequisites(byId, module.competencyIds || [])) {
        const taughtAt = teacherPos.get(required);
        if (taughtAt !== undefined && taughtAt >= index) {
          throw new Error(`${track.trackId}: ${module.moduleId} (Position ${index + 1}) braucht ${required}, das erst an Position ${taughtAt + 1} gelehrt wird`);
        }
      }
    });
  }
}

// Modules with code-bearing tasks or Python lesson blocks need the language
// competency in their transitive closure; modules whose instances use NumPy
// need c-numpy-basics. Both must also be taught at or before the module's
// position in every track that contains the module.
export function assertCodePrerequisites(modules, tracks, competencies, codeSignals) {
  const byId = competencyOrderIndex(competencies);
  const teacherPosByTrack = new Map(tracks.map((track) => {
    const order = orderModulesForTrack(modules, track);
    return [track.trackId, { order, teacherPos: teacherPositions(order) }];
  }));
  for (const module of modules) {
    const signal = codeSignals(module);
    const needs = [
      ['c-python-basics', signal.needsPython, 'Python-Code'],
      ['c-numpy-basics', signal.needsNumpy, 'NumPy'],
    ].filter(([, needed]) => needed);
    if (!needs.length) continue;
    const closure = new Set([...(module.competencyIds || []), ...transitivePrerequisites(byId, module.competencyIds || [])]);
    for (const [competencyId, , label] of needs) {
      if (!closure.has(competencyId)) {
        throw new Error(`${module.moduleId}: ${label} verlangt ${competencyId}, das nicht im Kompetenzgraph des Moduls liegt`);
      }
      for (const trackId of module.trackIds || []) {
        const entry = teacherPosByTrack.get(trackId);
        if (!entry) continue;
        const position = entry.order.findIndex((item) => item.moduleId === module.moduleId);
        const taughtAt = entry.teacherPos.get(competencyId);
        if (taughtAt === undefined || taughtAt > position) {
          const where = taughtAt === undefined ? 'wird nicht gelehrt' : `wird erst an Position ${taughtAt + 1} gelehrt`;
          throw new Error(`${trackId}: ${module.moduleId} nutzt ${label}, aber ${competencyId} ${where}`);
        }
      }
    }
  }
}

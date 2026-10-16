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

// Track membership and module prerequisites are derived, never authored:
// `track.competencyIds` and the competency `requires` graph are the single
// source of truth. The compiler injects the derived fields before any
// consumer reads a module, so the compiled shape stays unchanged.

// Union of the direct requires of a module's competencies, minus the ones
// the module teaches itself, ordered by competency-file order.
export function moduleRequires(module, competencies) {
  const byId = competencyOrderIndex(competencies);
  const own = new Set(module.competencyIds || []);
  const needed = new Set();
  for (const id of own) {
    for (const required of byId.get(id)?.competency.requires || []) {
      if (!own.has(required)) needed.add(required);
    }
  }
  return [...needed].sort((a, b) => byId.get(a).index - byId.get(b).index);
}

export function deriveLearningGraph(tracks, modules, competencies) {
  const tracksOf = (competencyId) => tracks
    .filter((track) => track.competencyIds.includes(competencyId))
    .map((track) => track.trackId);
  for (const competency of competencies) {
    competency.trackIds = tracksOf(competency.competencyId);
  }
  for (const module of modules) {
    module.requires = moduleRequires(module, competencies);
    module.trackIds = [...new Set((module.competencyIds || []).flatMap(tracksOf))];
  }
}

// A module sitting half inside a track is a closure violation.
function assertWholeModules(track, listed, modules) {
  for (const module of modules) {
    const inside = (module.competencyIds || []).filter((id) => listed.has(id));
    if (!inside.length) continue;
    const outside = (module.competencyIds || []).filter((id) => !listed.has(id));
    if (outside.length) {
      throw new Error(`${track.trackId}: Modul ${module.moduleId} lehrt ${inside.join(', ')}, aber ${outside.join(', ')} fehlt im Track`);
    }
  }
}

// Every track must be closed: the transitive prerequisites of its listed
// competencies are listed too, each listed competency has a teacher, and no
// module teaches partly inside the track.
export function assertTrackClosure(tracks, modules, competencies) {
  const byId = competencyOrderIndex(competencies);
  const taught = new Set(modules.flatMap((module) => module.competencyIds || []));
  for (const track of tracks) {
    const missing = [...transitivePrerequisites(byId, track.competencyIds)];
    if (missing.length) {
      throw new Error(`${track.trackId}: fehlende Voraussetzungen im Track: ${missing.join(', ')}`);
    }
    const listed = new Set(track.competencyIds);
    for (const id of listed) {
      if (!taught.has(id)) throw new Error(`${track.trackId}: ${id} wird von keinem Modul gelehrt`);
    }
    assertWholeModules(track, listed, modules);
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
// assertTrackClosure guarantees the teacher exists; a missing one is still
// reported rather than silently accepted.
export function assertTrackPrerequisiteOrder(modules, tracks, competencies) {
  const byId = competencyOrderIndex(competencies);
  for (const track of tracks) {
    const order = orderModulesForTrack(modules, track);
    const teacherPos = teacherPositions(order);
    order.forEach((module, index) => {
      for (const required of transitivePrerequisites(byId, module.competencyIds || [])) {
        const taughtAt = teacherPos.get(required);
        if (taughtAt === undefined) {
          throw new Error(`${track.trackId}: ${module.moduleId} braucht ${required}, das kein Modul des Tracks lehrt`);
        }
        if (taughtAt >= index) {
          throw new Error(`${track.trackId}: ${module.moduleId} (Position ${index + 1}) braucht ${required}, das erst an Position ${taughtAt + 1} gelehrt wird`);
        }
      }
    });
  }
}

// Modules with code-bearing tasks or Python lesson blocks need the language
// competency in the transitive closure of their competencies; modules using
// NumPy need c-numpy-basics. Track positions are implied by closure + order.
const CODE_COMPETENCY_SIGNALS = [
  ['needsPython', 'c-python-basics', 'Python-Code'],
  ['needsNumpy', 'c-numpy-basics', 'NumPy'],
];

export function assertCodePrerequisites(modules, competencies, codeSignals) {
  const byId = competencyOrderIndex(competencies);
  for (const module of modules) {
    const signal = codeSignals(module);
    const closure = new Set([...(module.competencyIds || []), ...transitivePrerequisites(byId, module.competencyIds || [])]);
    for (const [key, competencyId, label] of CODE_COMPETENCY_SIGNALS) {
      if (signal[key] && !closure.has(competencyId)) {
        throw new Error(`${module.moduleId}: ${label} verlangt ${competencyId}, das nicht im Kompetenzgraph des Moduls liegt`);
      }
    }
  }
}

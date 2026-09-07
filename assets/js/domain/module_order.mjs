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

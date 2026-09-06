const satisfiedStates = new Set(['demonstrated', 'retained', 'review_due']);

export function validateCompetencyGraph(competencies) {
  const byId = new Map();
  for (const competency of competencies) {
    const id = competency?.competencyId;
    if (!id || byId.has(id)) throw new Error(`Kompetenz-ID fehlt oder ist doppelt: ${id || '(leer)'}`);
    byId.set(id, competency);
  }
  for (const competency of competencies) {
    for (const prerequisiteId of competency.requires || []) {
      if (!byId.has(prerequisiteId)) throw new Error(`${competency.competencyId}: unbekannte Voraussetzung ${prerequisiteId}`);
    }
  }
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      const start = stack.indexOf(id);
      throw new Error(`Zyklus im Kompetenzgraph: ${[...stack.slice(start), id].join(' -> ')}`);
    }
    state.set(id, 1);
    stack.push(id);
    for (const prerequisiteId of byId.get(id).requires || []) visit(prerequisiteId);
    stack.pop();
    state.set(id, 2);
  };
  for (const id of byId.keys()) visit(id);
  return true;
}

export class CompetencyGraph {
  constructor(competencies) {
    validateCompetencyGraph(competencies);
    this.competencies = competencies.map((item) => ({ ...item, requires: [...(item.requires || [])] }));
    this.byId = new Map(this.competencies.map((item) => [item.competencyId, item]));
  }

  get(competencyId) {
    return this.byId.get(competencyId) || null;
  }

  topologicalOrder() {
    const visited = new Set();
    const order = [];
    const visit = (id) => {
      if (visited.has(id)) return;
      for (const prerequisiteId of this.byId.get(id).requires) visit(prerequisiteId);
      visited.add(id);
      order.push(id);
    };
    for (const competency of this.competencies) visit(competency.competencyId);
    return order;
  }

  prerequisites(competencyId, transitive = false) {
    const competency = this.byId.get(competencyId);
    if (!competency) throw new Error(`Unbekannte Kompetenz ${competencyId}`);
    if (!transitive) return [...competency.requires];
    return this.pathTo([competencyId]).filter((id) => id !== competencyId);
  }

  pathTo(goalCompetencyIds) {
    const needed = new Set();
    const add = (id) => {
      const competency = this.byId.get(id);
      if (!competency) throw new Error(`Unbekannte Zielkompetenz ${id}`);
      for (const prerequisiteId of competency.requires) add(prerequisiteId);
      needed.add(id);
    };
    for (const id of goalCompetencyIds) add(id);
    return this.topologicalOrder().filter((id) => needed.has(id));
  }

  explainUnlock(competencyId, states = {}) {
    const competency = this.byId.get(competencyId);
    if (!competency) throw new Error(`Unbekannte Kompetenz ${competencyId}`);
    const missingPrerequisiteIds = competency.requires.filter((id) => !satisfiedStates.has(states[id]));
    return { competencyId, unlocked: missingPrerequisiteIds.length === 0, missingPrerequisiteIds };
  }

  unlocked(states = {}) {
    return this.topologicalOrder().filter((id) => this.explainUnlock(id, states).unlocked);
  }

  isSatisfiedState(state) {
    return satisfiedStates.has(state);
  }
}

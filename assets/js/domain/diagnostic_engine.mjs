export class DiagnosticEngine {
  constructor(graph) {
    this.graph = graph;
  }

  diagnose({ goalCompetencyIds, evidenceByCompetency }) {
    const path = this.graph.pathTo(goalCompetencyIds);
    const goalIds = new Set(goalCompetencyIds);
    const states = Object.fromEntries(path.map((id) => [id, evidenceByCompetency[id]?.state || 'unassessed']));
    const recommendations = [];
    for (const competencyId of path) {
      if (states[competencyId] === 'review_due') {
        recommendations.push({
          type: 'review',
          competencyId,
          reasonCodes: ['review-due', goalIds.has(competencyId) ? 'goal-competency' : 'goal-prerequisite'],
        });
      }
    }
    for (const competencyId of path) {
      const state = states[competencyId];
      if (state === 'review_due' || this.graph.isSatisfiedState(state)) continue;
      const unlock = this.graph.explainUnlock(competencyId, states);
      if (!unlock.unlocked) continue;
      recommendations.push({
        type: state === 'learning' ? 'lesson' : 'diagnostic',
        competencyId,
        reasonCodes: [
          state === 'learning' ? 'weak-competency' : 'missing-evidence',
          goalIds.has(competencyId) ? 'goal-competency' : 'goal-prerequisite',
        ],
      });
    }
    return {
      goalCompetencyIds: [...goalCompetencyIds],
      path,
      states,
      recommendations,
      accessibleCompetencyIds: this.graph.topologicalOrder(),
    };
  }
}

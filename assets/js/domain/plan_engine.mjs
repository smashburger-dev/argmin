const typePriority = new Map([
  ['diagnostic', 0],
  ['lesson', 1],
  ['exercise', 2],
  ['project', 3],
  ['reflection', 4],
]);
const compareActivity = (a, b) => (typePriority.get(a.type) ?? 99) - (typePriority.get(b.type) ?? 99)
  || a.activityId.localeCompare(b.activityId);

export class PlanEngine {
  constructor(graph, { reviewBudgetRatio = 0.35 } = {}) {
    this.graph = graph;
    this.reviewBudgetRatio = reviewBudgetRatio;
  }

  build(request) {
    const availableMinutes = Math.max(0, Math.floor(Number(request.availableMinutes) || 0));
    const availableDays = Math.max(1, Math.floor(Number(request.availableDays) || 1));
    const states = Object.fromEntries(this.graph.topologicalOrder().map((id) => [id, request.evidenceByCompetency[id]?.state || 'unassessed']));
    const path = this.graph.pathTo(request.goalCompetencyIds);
    const items = [];
    const scheduledIds = new Set();
    let totalMinutes = 0;
    const add = (activity, reasonCodes) => {
      if (scheduledIds.has(activity.activityId)) return true;
      const minutes = Math.max(1, Math.floor(Number(activity.estimatedMinutes) || 1));
      if (totalMinutes + minutes > availableMinutes) return false;
      items.push({
        activityId: activity.activityId,
        type: activity.type,
        competencyIds: [...activity.competencyIds],
        estimatedMinutes: minutes,
        reasonCodes,
        // Task-review due date travels with the plan item (ADR-0015): the
        // adapter surfaces it as reviewDueAt and derives fresh-instance links.
        ...(activity.type === 'review' && activity.dueAt !== undefined ? { dueAt: activity.dueAt } : {}),
      });
      scheduledIds.add(activity.activityId);
      totalMinutes += minutes;
      return true;
    };

    const reviewLimit = Math.floor(availableMinutes * this.reviewBudgetRatio);
    const reviews = request.activities
      .filter((activity) => activity.type === 'review')
      .sort((a, b) => String(a.dueAt || '').localeCompare(String(b.dueAt || '')) || a.activityId.localeCompare(b.activityId));
    let reviewMinutes = 0;
    for (const review of reviews) {
      const minutes = Math.max(1, Math.floor(Number(review.estimatedMinutes) || 1));
      if (reviewMinutes + minutes > reviewLimit) continue;
      if (add(review, ['review-due'])) reviewMinutes += minutes;
    }

    for (const competencyId of path) {
      if (this.graph.isSatisfiedState(states[competencyId])) continue;
      if (!this.graph.explainUnlock(competencyId, states).unlocked) continue;
      const candidates = request.activities
        .filter((activity) => activity.type !== 'review' && (activity.competencyIds || []).includes(competencyId))
        .sort(compareActivity);
      for (const activity of candidates) {
        if (!add(activity, [states[competencyId] === 'learning' ? 'strengthen-competency' : 'build-competency'])) break;
      }
    }

    const days = Array.from({ length: availableDays }, (_, index) => ({ day: index + 1, minutes: 0, items: [] }));
    for (const item of items) {
      const day = days.reduce((best, candidate) => candidate.minutes < best.minutes ? candidate : best, days[0]);
      day.items.push(item);
      day.minutes += item.estimatedMinutes;
    }
    return {
      goalCompetencyIds: [...request.goalCompetencyIds],
      availableMinutes,
      totalMinutes,
      unallocatedMinutes: availableMinutes - totalMinutes,
      reviewMinutes,
      reviewOverflowCount: Math.max(0, reviews.length - items.filter((item) => item.type === 'review').length),
      items,
      days,
    };
  }
}

import {
  MASTERY_MAX_HINTS, clampMaxHints, eventTimeMs, instanceKey, isQualifiedHit, isSolutionReveal,
} from './learning_policy.mjs';

const DAY_MS = 86_400_000;

export class EvidenceEngine {
  constructor(competencies, { maxHints = MASTERY_MAX_HINTS } = {}) {
    this.byId = new Map(competencies.map((item) => [item.competencyId, item]));
    this.maxHints = clampMaxHints(maxHints);
  }

  evaluateCompetency(competencyId, events, nowMs = Date.now()) {
    const competency = this.byId.get(competencyId);
    if (!competency) throw new Error(`Unbekannte Kompetenz ${competencyId}`);
    const policy = competency.evidencePolicy || {};
    const relevant = events
      .filter((event) => (event.competencyIds || []).includes(competencyId))
      .map((event) => ({ ...event, time: eventTimeMs(event, null), instanceKey: instanceKey(event) }))
      .filter((event) => event.time !== null)
      .sort((a, b) => a.time - b.time || a.instanceKey.localeCompare(b.instanceKey));
    if (!relevant.length) return this.emptyResult(competencyId);

    const disqualified = new Set(
      relevant
        .filter((event) => isSolutionReveal(event))
        .map((event) => event.instanceKey),
    );
    const latestByInstance = new Map();
    for (const event of relevant) {
      const eligible = isQualifiedHit(event, { maxHints: this.maxHints })
        && !disqualified.has(event.instanceKey);
      if (eligible) latestByInstance.set(event.instanceKey, event);
    }
    const qualified = [...latestByInstance.values()].sort((a, b) => a.time - b.time || a.instanceKey.localeCompare(b.instanceKey));
    const definitions = new Set(qualified.map((event) => event.definitionId || event.exerciseId).filter(Boolean));
    const minimumHits = Number(policy.minimumIndependentHits) || 1;
    const minimumDefinitions = Number(policy.minimumDistinctDefinitions) || 1;
    const minimumDelayMs = Math.max(0, Number(policy.minimumDelayDays) || 0) * DAY_MS;
    const freshnessMs = Math.max(1, Number(policy.freshnessDays) || 30) * DAY_MS;
    const delayedHit = qualified.length > 1 && qualified.some((event) => event.time - qualified[0].time >= minimumDelayMs);
    const reasonCodes = [];
    if (qualified.length < minimumHits) reasonCodes.push('insufficient-independent-hits');
    if (definitions.size < minimumDefinitions) reasonCodes.push('insufficient-distinct-definitions');
    if (policy.delayedHitRequired && !delayedHit) reasonCodes.push('delayed-hit-missing');
    const last = qualified.at(-1) || null;
    const dueAtMs = last ? last.time + freshnessMs : null;
    if (!reasonCodes.length && nowMs > dueAtMs) {
      return {
        competencyId,
        state: 'review_due',
        reasonCodes: ['evidence-expired'],
        evidenceCount: qualified.length,
        distinctDefinitionCount: definitions.size,
        firstQualifiedAt: new Date(qualified[0].time).toISOString(),
        lastQualifiedAt: new Date(last.time).toISOString(),
        dueAt: new Date(dueAtMs).toISOString(),
        disqualifiedInstanceIds: [...disqualified].sort(),
      };
    }
    return {
      competencyId,
      state: reasonCodes.length ? 'learning' : policy.delayedHitRequired ? 'retained' : 'demonstrated',
      reasonCodes,
      evidenceCount: qualified.length,
      distinctDefinitionCount: definitions.size,
      firstQualifiedAt: qualified.length ? new Date(qualified[0].time).toISOString() : null,
      lastQualifiedAt: last ? new Date(last.time).toISOString() : null,
      dueAt: dueAtMs === null ? null : new Date(dueAtMs).toISOString(),
      disqualifiedInstanceIds: [...disqualified].sort(),
    };
  }

  evaluateAll(events, nowMs = Date.now()) {
    // Competency membership is the only filter evaluateCompetency applies,
    // so bucketing the events once by competencyIds and evaluating each
    // competency over its own bucket is result-identical to the naive
    // O(competencies x events) full scan — and one pass on large histories.
    const buckets = new Map();
    for (const id of this.byId.keys()) buckets.set(id, []);
    for (const event of events) {
      for (const competencyId of event?.competencyIds || []) {
        const bucket = buckets.get(competencyId);
        if (bucket) bucket.push(event);
      }
    }
    return Object.fromEntries([...this.byId.keys()].map((id) => [id, this.evaluateCompetency(id, buckets.get(id), nowMs)]));
  }

  emptyResult(competencyId) {
    return {
      competencyId,
      state: 'unassessed',
      reasonCodes: ['missing-evidence'],
      evidenceCount: 0,
      distinctDefinitionCount: 0,
      firstQualifiedAt: null,
      lastQualifiedAt: null,
      dueAt: null,
      disqualifiedInstanceIds: [],
    };
  }
}

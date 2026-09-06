const clone = (value) => JSON.parse(JSON.stringify(value));

const stableHash = (value) => {
  let hash = 0x811c9dc5;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export function legacyEventType(attempt) {
  if (attempt.eventType) return attempt.eventType;
  if (attempt.event === 'studied') return 'worked-example-studied';
  if (/^hint-\d+$/.test(attempt.event || '')) return 'hint-used';
  if (attempt.event === 'partial') return 'partial-solution';
  if (attempt.event === 'solution-revealed' || attempt.revealedSolution) return 'solution-revealed';
  return 'attempt';
}

function competencyIdsFor(exerciseId, source) {
  if (source instanceof Map) return [...(source.get(exerciseId) || [])];
  return [...(source?.[exerciseId] || [])];
}

function exclusionFor(attempt, eventType, competencyIds) {
  if (!competencyIds.length) return 'legacy-unmapped';
  if (eventType !== 'attempt') return 'assistance-event';
  if (attempt.revealedSolution) return 'solution-revealed';
  if (attempt.masteryEligible === false) return 'not-mastery-eligible';
  if ((attempt.hintsUsed || 0) > 1) return 'too-much-assistance';
  if (attempt.correct !== true) return 'incorrect';
  return null;
}

export function normalizeAttemptV3(attempt, context) {
  const installationId = context.installationId;
  const nowIso = context.nowIso || new Date().toISOString();
  const occurredAt = attempt.occurredAt || attempt.ts || nowIso;
  const activityId = attempt.activityId || attempt.exerciseId;
  const definitionId = attempt.definitionId || attempt.exerciseId;
  const cycleId = attempt.cycleId || 'legacy';
  const seed = attempt.seed ?? 0;
  const competencyIds = Array.isArray(attempt.competencyIds)
    ? [...attempt.competencyIds]
    : competencyIdsFor(attempt.exerciseId, context.competencyIdsByExercise);
  const eventType = legacyEventType(attempt);
  const computedExclusion = exclusionFor(attempt, eventType, competencyIds);
  const exclusionCode = attempt.exclusionCode
    ?? (attempt.evidenceEligible === false && computedExclusion === null ? 'explicitly-ineligible' : computedExclusion);
  const fallbackId = attempt.id ?? stableHash(JSON.stringify([
    activityId, definitionId, seed, occurredAt, attempt.answer, context.ordinal || 0,
  ]));
  return {
    ...clone(attempt),
    eventId: attempt.eventId || `legacy:${installationId}:${fallbackId}`,
    installationId: attempt.installationId || installationId,
    eventType,
    activityId,
    activityVersion: attempt.activityVersion || 'legacy-unknown',
    definitionId,
    instanceId: attempt.instanceId || `${definitionId}:${cycleId}:${seed}`,
    cycleId,
    competencyIds,
    contentVersion: attempt.contentVersion || context.contentVersion || 'pre-v3',
    occurredAt,
    recordedAt: attempt.recordedAt || nowIso,
    evidenceEligible: exclusionCode === null && attempt.evidenceEligible !== false,
    exclusionCode,
  };
}

export function migratePayloadToV3(payload, context) {
  if (!payload || typeof payload !== 'object' || !payload.data) throw new Error('Importpayload ist ungültig');
  const data = payload.data;
  const migrationContext = payload.schemaVersion === 3 ? context : { ...context, contentVersion: 'pre-v3' };
  return {
    schemaVersion: 3,
    exportedAt: payload.exportedAt || context.nowIso || new Date().toISOString(),
    data: {
      weeks: clone(data.weeks || []),
      attempts: (data.attempts || []).map((attempt, ordinal) => normalizeAttemptV3(attempt, { ...migrationContext, ordinal })),
      journal: clone(data.journal || []),
      settings: clone(data.settings || []),
      meta: clone(data.meta || []),
      reviewQueue: clone(data.reviewQueue || []),
      plans: clone(data.plans || []),
      drafts: clone(data.drafts || []),
    },
  };
}

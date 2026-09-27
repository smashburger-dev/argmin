export function routeForDefinition(definition) {
  if (!definition?.familyId || !definition.caseId) throw new Error('Familienaktivität braucht familyId und caseId');
  return `#/family/${definition.familyId}/${definition.caseId}/${definition.seed ?? 0}/${definition.difficulty ?? 'core'}`;
}

// Review of a seeded case: same case, random seed. Reviews are keyed by
// familyId:caseId, so the route must keep the case — a caseless route would
// draw some other case and never clear the due entry.
export function freshRouteForDefinition(definition) {
  if (!definition?.familyId || !definition.caseId) throw new Error('Familienaktivität braucht familyId und caseId');
  return `#/family/${definition.familyId}/${definition.caseId}/-/${definition.difficulty ?? 'core'}`;
}

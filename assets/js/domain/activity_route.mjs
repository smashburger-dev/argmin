export function routeForDefinition(definition) {
  if (!definition?.familyId || !definition.caseId) throw new Error('Familienaktivität braucht familyId und caseId');
  return `#/family/${definition.familyId}/${definition.caseId}/${definition.seed ?? 0}/${definition.difficulty ?? 'core'}`;
}

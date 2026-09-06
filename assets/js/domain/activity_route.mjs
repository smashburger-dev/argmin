export const supportedNewUiActivityTypes = new Set([
  'numeric',
  'single-choice',
  'vector',
  'algebraic-expression',
  'python-code',
  'short-rationale',
  'parsons',
  'code-trace',
  'predict-output',
]);

export function routeForDefinition(definition) {
  if (definition.activityType === 'python-code') return `#/lab/${definition.definitionId}`;
  if (supportedNewUiActivityTypes.has(definition.activityType)) return `#/exercise/${definition.definitionId}`;
  throw new Error(`Aufgabentyp ist nicht in der neuen UI verfügbar: ${definition.activityType}`);
}

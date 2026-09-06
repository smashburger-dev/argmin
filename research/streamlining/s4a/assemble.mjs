import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const analysisDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(analysisDir, '../../..');
const dependencyRoot = process.env.S4A_DEPENDENCY_ROOT || root;
const require = createRequire(join(dependencyRoot, 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;
const writeOutput = process.argv.includes('--write');
// Baseline reproduction mode: the v1 matrix describes commit 1998d57 (268
// source definitions including the later retired w05-e7). On the integration
// branch the live content tree has only 267 definitions. Point --source-root
// at a clean checkout of 1998d57's ki-lernplattform directory to reproduce
// the baseline validation, e.g. from a worktree:
//   git worktree add --detach ../s4a-baseline-1998d57 1998d57
//   S4A_DEPENDENCY_ROOT="$PWD" node research/streamlining/s4a/assemble.mjs \
//     --source-root ../s4a-baseline-1998d57/ki-lernplattform
const sourceRootArgIndex = process.argv.indexOf('--source-root');
const sourceRoot = sourceRootArgIndex >= 0 && process.argv[sourceRootArgIndex + 1]
  ? resolve(process.argv[sourceRootArgIndex + 1])
  : root;
const schema = readJson(join(analysisDir, 'shard.schema.json'));
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const referenceSolverIds = new Set(['dotProduct', 'matmulEntry', 'rank3', 'solveLinear2']);
const shardSpecs = [
  { shardId: 'foundations', file: 'foundations.json', label: 'Foundations', weekIds: ['w01', 'w02', 'w03', 'w04'], definitionRoots: ['content/exercise-definitions/foundations/'], expectedEntryCount: 49 },
  { shardId: 'linear-algebra', file: 'linear-algebra.json', label: 'Lineare Algebra und NumPy', weekIds: ['w05'], definitionRoots: ['content/exercise-definitions/linear-algebra/'], expectedEntryCount: 26 },
  { shardId: 'data-ml', file: 'data-ml.json', label: 'Data und klassisches ML', weekIds: weekRange(6, 17), definitionRoots: [], expectedEntryCount: 61 },
  { shardId: 'deep-learning', file: 'deep-learning.json', label: 'Deep Learning', weekIds: weekRange(18, 21), definitionRoots: [], expectedEntryCount: 24 },
  { shardId: 'transformer-llm', file: 'transformer-llm.json', label: 'Transformer und LLM-Grundlagen', weekIds: weekRange(22, 26), definitionRoots: [], expectedEntryCount: 30 },
  { shardId: 'genai-systems', file: 'genai-systems.json', label: 'GenAI-Systeme', weekIds: weekRange(27, 30), definitionRoots: [], expectedEntryCount: 24 },
  { shardId: 'research-capstone', file: 'research-capstone.json', label: 'Research und Capstone', weekIds: weekRange(31, 39), definitionRoots: [], expectedEntryCount: 54 },
];

const sourceDefinitions = loadSourceDefinitions();
const sourceById = new Map(sourceDefinitions.map((source) => [source.sourceId, source]));
const sourceIds = sourceDefinitions.map((source) => source.sourceId);
assert(sourceDefinitions.length === 268, `Quellnenner ist ${sourceDefinitions.length}, erwartet 268. Dieser Contentbaum hat seit S1B nur 267 Quellen (w05-e7 retired); Baseline-Reproduktion mit --source-root <ki-lernplattform-Checkout von 1998d57> ausführen`);
assert(new Set(sourceIds).size === 268, 'Natürliche sourceIds sind nicht eindeutig');
const lessonIds = loadCatalogIds('lessonFiles', 'lessonId');
const competencyIds = new Set(readJson(join(sourceRoot, 'content/competencies/core.json')).competencies.map((item) => item.competencyId));
const shards = shardSpecs.map(loadShard);
const matrixEntries = shards.flatMap(({ document }) => document.entries).map((entry) => structuredClone(entry));
const matrixIds = matrixEntries.map((entry) => entry.sourceId);
assert(matrixEntries.length === 268, `Matrix enthält ${matrixEntries.length}, erwartet 268`);
assert(new Set(matrixIds).size === 268, 'Matrix-sourceIds sind nicht eindeutig');
const missingSourceIds = sourceIds.filter((id) => !matrixIds.includes(id));
const unexpectedSourceIds = matrixIds.filter((id) => !sourceById.has(id));
assert(missingSourceIds.length === 0, `Fehlende sourceIds: ${missingSourceIds.join(', ')}`);
assert(unexpectedSourceIds.length === 0, `Unerwartete sourceIds: ${unexpectedSourceIds.join(', ')}`);
const feedbackStatusCorrections = [];
for (const entry of matrixEntries) {
  const source = sourceById.get(entry.sourceId);
  validateEntryAgainstSource(entry, source, lessonIds, competencyIds);
  const status = feedbackStatus(source);
  if (entry.feedbackConsumerStatus !== status) feedbackStatusCorrections.push({ sourceId: entry.sourceId, from: entry.feedbackConsumerStatus, to: status });
  entry.feedbackConsumerStatus = status;
}
const orderById = new Map(sourceIds.map((id, index) => [id, index]));
matrixEntries.sort((a, b) => orderById.get(a.sourceId) - orderById.get(b.sourceId));
const familyContractVariants = validateFamilyInterfaces(matrixEntries);
validateMigrationSemantics(matrixEntries);
const taxonomyNormalization = validateTaxonomyNormalization(matrixEntries);
const feedbackOccurrences = sourceDefinitions.flatMap((source) => source.raw.feedbackRules.map((rule, ruleIndex) => {
  const classification = classifyFeedbackRule(source, rule);
  return {
    sourceKind: source.sourceKind,
    sourceFile: source.sourceFile,
    sourceId: source.sourceId,
    ruleIndex,
    graderId: source.graderId,
    activityType: source.activityType,
    condition: String(rule.if),
    message: String(rule.then),
    consumerStatus: classification.consumed ? 'consumed' : 'not-consumed',
    consumer: classification.consumer,
    reason: classification.reason,
  };
}));
const consumedFeedback = feedbackOccurrences.filter((item) => item.consumerStatus === 'consumed');
const unsupportedDeterministic = feedbackOccurrences.filter((item) => item.graderId === 'deterministic' && item.consumerStatus === 'not-consumed');
const pythonWithoutConsumer = feedbackOccurrences.filter((item) => item.graderId === 'pyodide');
assert(feedbackOccurrences.length === 623, `Feedbacknenner ist ${feedbackOccurrences.length}, erwartet 623`);
assert(consumedFeedback.length === 275, `Konsumierte Regeln: ${consumedFeedback.length}, erwartet 275`);
assert(unsupportedDeterministic.length === 72, `Deterministische Regeln außerhalb der Grammatik: ${unsupportedDeterministic.length}, erwartet 72`);
assert(pythonWithoutConsumer.length === 273 && pythonWithoutConsumer.every((item) => item.consumerStatus === 'not-consumed'), '273 Python-Regeln ohne Consumer nicht bestätigt');
const matrix = {
  analysisSchemaVersion: 's4a-taxonomy-v1',
  sessionId: 'S4A',
  baseCommit: '1998d574e67998e9651fb10d9765a8cf3d11f3db',
  analysisDate: '2026-09-01',
  schemaFile: 'research/streamlining/s4a/shard.schema.json',
  sourceBaseline: {
    legacyWeekDefinitions: sourceDefinitions.filter((item) => item.sourceKind === 'legacy-week-exercise').length,
    canonicalDefinitions: sourceDefinitions.filter((item) => item.sourceKind === 'canonical-definition').length,
    totalDefinitions: sourceDefinitions.length,
    uniqueSourceIds: new Set(sourceIds).size,
    byShard: Object.fromEntries(shardSpecs.map((spec) => [spec.shardId, spec.expectedEntryCount])),
  },
  normalizationContract: {
    familyRule: 'Eine Familie teilt Kernlösungsweg, activityType, Grader, Answer-/Solver-Vertrag, Darstellungstyp und Transferanspruch. Zahlen- oder Promptähnlichkeit allein reicht nicht.',
    allowedFamilyPrefixes: ['foundations', 'linear-algebra', 'data-ml', 'deep-learning', 'transformer-llm', 'genai', 'research', 'responsible-ai', 'capstone'],
    currentContractVariantRule: 'Feste Legacy-Instanzen und geseedete Zieldefinitionen dürfen vor der Migration verschiedene aktuelle Solverformen haben. S4C muss sie auf einen gemeinsamen Familienvertrag bringen, ohne historische IDs zu verlieren.',
    caseTypeRule: 'Ein Falltyp benennt eine fachlich relevante Struktur-, Darstellungs-, Fehler- oder Transferausprägung innerhalb genau einer kohärenten Familie.',
    difficultyProfiles: {
      'basic-recall': 'Grundbegriffe erkennen oder einen direkt eingeübten Einzelschritt ausführen.',
      'core-application': 'Einen vollständigen bekannten Lösungsweg auf eine frische Instanz anwenden.',
      'advanced-transfer': 'Darstellung, Randfall oder Kontext wechseln und den Lösungsweg begründet übertragen.',
      'final-boss-synthesis': 'Mehrere Teilschritte, Verträge oder Kompetenzen zu einer Synthese verbinden.',
    },
    duplicateDecisionDimensions: ['solutionPath', 'errorPatterns', 'representation', 'transferDemand', 'difficultyRationale'],
  },
  entries: matrixEntries,
  aggregates: {
    byWeek: countBy(matrixEntries, (entry) => entry.legacyWeekId || 'none'),
    bySourceWeek: countBy(matrixEntries.filter((entry) => entry.sourceKind === 'legacy-week-exercise'), (entry) => entry.legacyWeekId),
    bySourceKind: countBy(matrixEntries, (entry) => entry.sourceKind),
    byCompetency: countMany(matrixEntries, (entry) => entry.competencyIds),
    byActivityType: countBy(matrixEntries, (entry) => entry.activityType),
    byGraderId: countBy(matrixEntries, (entry) => entry.graderId),
    byProposedFamilyId: countBy(matrixEntries, (entry) => entry.proposedFamilyId),
    bySemanticClassification: countBy(matrixEntries, (entry) => entry.semanticClassification),
    byTargetAction: countBy(matrixEntries, (entry) => entry.targetAction),
    byDifficultyProfile: countBy(matrixEntries, (entry) => entry.proposedDifficultyProfile),
    byFeedbackConsumerStatus: countBy(matrixEntries, (entry) => entry.feedbackConsumerStatus),
    humanReviewRequired: matrixEntries.filter((entry) => entry.humanReviewRequired).length,
    uncertaintyEntries: matrixEntries.filter((entry) => entry.uncertainty.length > 0).length,
  },
  feedbackInventory: {
    totalRuleOccurrences: feedbackOccurrences.length,
    definitionsWithRules: sourceDefinitions.filter((source) => source.raw.feedbackRules.length > 0).length,
    definitionsWithoutRules: sourceDefinitions.filter((source) => source.raw.feedbackRules.length === 0).length,
    consumedRuleOccurrences: consumedFeedback.length,
    notConsumedRuleOccurrences: feedbackOccurrences.length - consumedFeedback.length,
    byGraderId: countBy(feedbackOccurrences, (item) => item.graderId),
    byActivityType: countBy(feedbackOccurrences, (item) => item.activityType),
    byGraderAndActivityType: countBy(feedbackOccurrences, (item) => `${item.graderId}/${item.activityType}`),
    byConsumerStatus: countBy(feedbackOccurrences, (item) => item.consumerStatus),
    consumerGrammar: {
      numeric: { consumer: 'assets/js/core/graders.js#diagnoseNumeric', syntax: 'value === <integer>', semantics: 'Exakter Stringvergleich mit der geparsten falschen Ganzzahl.' },
      'single-choice': { consumer: 'assets/js/core/graders.js#gradeChoice', syntax: "choice === '<id>' | choice !== '<id>'", semantics: 'Nur falsche Choices; ein späterer passender Eintrag überschreibt einen früheren.' },
      parsons: { consumer: 'assets/js/core/graders.js#parsonsDiagnosis', syntax: 'order-length-mismatch', semantics: 'Nur reine Längenabweichung ohne behaltenen Distraktor und ohne fehlende Lösungszeile.' },
      'code-trace': { consumer: 'assets/js/core/graders.js#gradeCodeTrace', syntax: 'value:<var>[+value:<var>...]', semantics: 'Exakte Menge falscher Variablen in der Reihenfolge von parameters.variables.' },
      'predict-output': { consumer: 'assets/js/core/graders.js#gradePredictOutput', syntax: 'element-count-mismatch', semantics: 'Abweichende Anzahl kommagetrennter Segmente nach Normalisierung.' },
    },
    hypotheses: {
      pythonCodeRulesWithoutRuntimeConsumer: { expected: 273, actual: pythonWithoutConsumer.length, result: 'confirmed' },
      deterministicRulesOutsideGrammar: { expectedRange: [62, 64], actual: unsupportedDeterministic.length, denominator: 347, result: 'corrected' },
    },
    unsupportedDeterministicByCondition: groupUnsupportedConditions(unsupportedDeterministic),
    occurrences: feedbackOccurrences,
  },
  validation: {
    shardSchemasValid: true,
    shardEntryCounts: Object.fromEntries(shards.map(({ spec, document }) => [spec.shardId, document.entries.length])),
    sourceDefinitionCount: sourceDefinitions.length,
    matrixEntryCount: matrixEntries.length,
    uniqueSourceIds: new Set(matrixIds).size,
    missingSourceIds,
    unexpectedSourceIds,
    feedbackStatusCorrections,
    familyContractVariants,
    taxonomyNormalization,
    exactCoverage: missingSourceIds.length === 0 && unexpectedSourceIds.length === 0 && new Set(matrixIds).size === 268,
  },
};
const matrixFile = join(analysisDir, 'migration-matrix.json');
if (writeOutput) writeFileSync(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);
else if (existsSync(matrixFile)) assert(JSON.stringify(readJson(matrixFile)) === JSON.stringify(matrix), 'migration-matrix.json ist gegenüber Shards oder Quellen veraltet');
console.log(JSON.stringify({
  wroteMatrix: writeOutput,
  matrixMatchesSources: writeOutput || !existsSync(matrixFile) || JSON.stringify(readJson(matrixFile)) === JSON.stringify(matrix),
  entries: matrix.entries.length,
  uniqueSourceIds: matrix.validation.uniqueSourceIds,
  shardEntryCounts: matrix.validation.shardEntryCounts,
  aggregates: matrix.aggregates,
  feedback: {
    total: feedbackOccurrences.length,
    consumed: consumedFeedback.length,
    notConsumed: feedbackOccurrences.length - consumedFeedback.length,
    unsupportedDeterministic: unsupportedDeterministic.length,
    pythonWithoutConsumer: pythonWithoutConsumer.length,
  },
  feedbackStatusCorrections,
  familyContractVariants,
  taxonomyNormalization,
  largestFamilies: Object.entries(matrix.aggregates.byProposedFamilyId).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15),
}, null, 2));

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function weekRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => `w${String(start + index).padStart(2, '0')}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameArray(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function loadSourceDefinitions() {
  const sources = [];
  for (const weekId of weekRange(1, 39)) {
    const sourceFile = `content/exercises/${weekId}.json`;
    const document = readJson(join(sourceRoot, sourceFile));
    document.exercises.forEach((raw, index) => {
      const legacyGenerator = raw.expectedAnswer?.generator || raw.parameters?.seedGenerator || null;
      sources.push({
        sourceKind: 'legacy-week-exercise',
        sourceFile,
        sourceId: raw.exerciseId,
        currentDefinitionId: raw.exerciseId,
        legacyWeekId: weekId,
        competencyIds: raw.skillIds,
        activityType: raw.type,
        graderId: raw.grader,
        generatorId: legacyGenerator && !referenceSolverIds.has(legacyGenerator) ? legacyGenerator : null,
        referenceSolverId: referenceSolverIds.has(legacyGenerator) ? legacyGenerator : null,
        currentDifficulty: raw.difficulty,
        pointer: `/exercises/${index}`,
        raw: { ...raw, feedbackRules: raw.feedbackRules || [] },
      });
    });
  }
  const catalog = readJson(join(sourceRoot, 'content/catalog.json'));
  for (const catalogFile of catalog.exerciseDefinitionFiles) {
    const sourceFile = `content/${catalogFile}`;
    const raw = readJson(join(sourceRoot, sourceFile));
    sources.push({
      sourceKind: 'canonical-definition',
      sourceFile,
      sourceId: raw.definitionId,
      currentDefinitionId: raw.definitionId,
      legacyWeekId: raw.legacyWeekId ?? null,
      competencyIds: raw.competencyIds,
      activityType: raw.activityType,
      graderId: raw.graderId,
      generatorId: raw.generatorId ?? null,
      referenceSolverId: raw.referenceSolverId ?? null,
      currentDifficulty: raw.difficulty,
      pointer: '/',
      raw: { ...raw, feedbackRules: raw.feedbackRules || [] },
    });
  }
  return sources;
}

function loadCatalogIds(fileProperty, idProperty) {
  const catalog = readJson(join(sourceRoot, 'content/catalog.json'));
  return new Set(catalog[fileProperty].map((file) => readJson(join(sourceRoot, 'content', file))[idProperty]));
}

function loadShard(spec) {
  const file = join(analysisDir, spec.file);
  assert(existsSync(file), `Shard fehlt: ${relative(root, file)}`);
  const document = readJson(file);
  assert(validate(document), `${spec.file} verletzt das Schema:\n${JSON.stringify(validate.errors, null, 2)}`);
  assert(document.shardId === spec.shardId, `${spec.file}: shardId stimmt nicht`);
  assert(document.scope.label === spec.label, `${spec.file}: scope.label stimmt nicht`);
  assert(sameArray(document.scope.weekIds, spec.weekIds), `${spec.file}: weekIds stimmen nicht`);
  assert(sameArray(document.scope.definitionRoots, spec.definitionRoots), `${spec.file}: definitionRoots stimmen nicht`);
  assert(document.scope.expectedEntryCount === spec.expectedEntryCount, `${spec.file}: expectedEntryCount stimmt nicht`);
  assert(document.entries.length === spec.expectedEntryCount, `${spec.file}: ${document.entries.length} statt ${spec.expectedEntryCount} Einträge`);
  const expectedIds = sourceDefinitions.filter((source) => spec.weekIds.includes(source.legacyWeekId) && source.sourceKind === 'legacy-week-exercise' || spec.definitionRoots.some((prefix) => source.sourceFile.startsWith(prefix))).map((source) => source.sourceId).sort();
  const actualIds = document.entries.map((entry) => entry.sourceId).sort();
  assert(JSON.stringify(actualIds) === JSON.stringify(expectedIds), `${spec.file}: Quellmenge stimmt nicht`);
  return { spec, document };
}

function validateEntryAgainstSource(entry, source, validLessonIds, validCompetencyIds) {
  assert(source, `${entry.sourceId}: Quelle fehlt`);
  for (const key of ['sourceKind', 'sourceFile', 'currentDefinitionId', 'legacyWeekId', 'activityType', 'graderId', 'generatorId', 'referenceSolverId', 'currentDifficulty']) {
    assert(entry[key] === source[key], `${entry.sourceId}: ${key}=${JSON.stringify(entry[key])}, Quelle=${JSON.stringify(source[key])}`);
  }
  assert(sameArray(entry.competencyIds, source.competencyIds), `${entry.sourceId}: competencyIds weichen von der Quelle ab`);
  assert(entry.feedbackRuleCount === source.raw.feedbackRules.length, `${entry.sourceId}: feedbackRuleCount stimmt nicht`);
  assert(entry.competencyIds.every((id) => validCompetencyIds.has(id)), `${entry.sourceId}: unbekannte Kompetenz`);
  const mappedLessons = entry.lessonIds || entry.lessonCandidates.map((item) => item.lessonId);
  assert(mappedLessons.every((id) => validLessonIds.has(id)), `${entry.sourceId}: unbekannte Lektion`);
  assert(entry.evidence.some((item) => item.file === source.sourceFile && item.pointer === source.pointer), `${entry.sourceId}: direkte Source-Evidenz fehlt`);
}

function classifyFeedbackRule(source, rule) {
  const condition = String(rule.if);
  if (source.graderId !== 'deterministic') return { consumed: false, consumer: null, reason: 'Der Grader liest feedbackRules nicht.' };
  if (source.activityType === 'numeric') {
    const match = condition.match(/^value === (-?\d+)$/);
    const consumed = Boolean(match && String(Number(match[1])) === match[1]);
    return { consumed, consumer: consumed ? 'assets/js/core/graders.js#diagnoseNumeric' : null, reason: consumed ? 'Exakter Ganzzahlvergleich ist erreichbar.' : 'Kein erreichbarer exakter value-String.' };
  }
  if (source.activityType === 'single-choice') {
    const match = condition.match(/^choice (===|!==) '([^']+)'$/);
    if (!match) return { consumed: false, consumer: null, reason: 'Die Choice-Regel verletzt die unterstützte Präfixgrammatik.' };
    const wrongIds = source.raw.choices.filter((choice) => !choice.correct).map((choice) => choice.id);
    const consumed = match[1] === '===' ? wrongIds.includes(match[2]) : wrongIds.some((id) => id !== match[2]);
    return { consumed, consumer: consumed ? 'assets/js/core/graders.js#gradeChoice' : null, reason: consumed ? 'Die Regel kann bei einer falschen Choice feuern.' : 'Die Choice-Regel ist syntaktisch gültig, aber nicht erreichbar.' };
  }
  if (source.activityType === 'parsons') {
    const consumed = condition === 'order-length-mismatch';
    return { consumed, consumer: consumed ? 'assets/js/core/graders.js#parsonsDiagnosis' : null, reason: consumed ? 'Der einzige Parsons-Token ist unterstützt.' : 'Der Parsons-Grader liest diesen Token nicht.' };
  }
  if (source.activityType === 'code-trace') {
    const names = (source.raw.parameters?.variables || []).map((variable) => variable.name);
    const selected = condition.split('+').map((part) => part.startsWith('value:') ? part.slice(6) : null);
    const consumed = selected.length > 0 && selected.every(Boolean) && selected.every((name, index) => names.includes(name) && (index === 0 || names.indexOf(selected[index - 1]) < names.indexOf(name)));
    return { consumed, consumer: consumed ? 'assets/js/core/graders.js#gradeCodeTrace' : null, reason: consumed ? 'Die exakte Fehlervariablenfolge ist erreichbar.' : 'Kein erreichbarer value:<var>-Fehlermengenschlüssel.' };
  }
  if (source.activityType === 'predict-output') {
    const consumed = condition === 'element-count-mismatch';
    return { consumed, consumer: consumed ? 'assets/js/core/graders.js#gradePredictOutput' : null, reason: consumed ? 'Der einzige Predict-Output-Token ist unterstützt.' : 'Der Predict-Output-Grader liest diesen Token nicht.' };
  }
  return { consumed: false, consumer: null, reason: 'Diese deterministische Aktivität besitzt keinen feedbackRules-Consumer.' };
}

function feedbackStatus(source) {
  if (source.raw.feedbackRules.length === 0) return 'no-rules';
  const statuses = source.raw.feedbackRules.map((rule) => classifyFeedbackRule(source, rule).consumed);
  if (statuses.every(Boolean)) return 'fully-consumed';
  if (statuses.some(Boolean)) return 'partially-consumed';
  return 'not-consumed';
}

function validateFamilyInterfaces(entries) {
  const families = new Map();
  for (const entry of entries) {
    const interfaceSignature = JSON.stringify([entry.activityType, entry.graderId]);
    const contractSignature = JSON.stringify([entry.answerContract.kind, entry.solverContract.kind]);
    if (!families.has(entry.proposedFamilyId)) families.set(entry.proposedFamilyId, { interfaces: new Map(), contracts: new Map() });
    const family = families.get(entry.proposedFamilyId);
    if (!family.interfaces.has(interfaceSignature)) family.interfaces.set(interfaceSignature, []);
    if (!family.contracts.has(contractSignature)) family.contracts.set(contractSignature, []);
    family.interfaces.get(interfaceSignature).push(entry.sourceId);
    family.contracts.get(contractSignature).push(entry.sourceId);
  }
  const interfaceMismatches = [...families.entries()].filter(([, family]) => family.interfaces.size > 1).map(([familyId, family]) => ({ familyId, interfaces: Object.fromEntries(family.interfaces) }));
  assert(interfaceMismatches.length === 0, `Familien mit verschiedenen Activity-/Grader-Interfaces:\n${JSON.stringify(interfaceMismatches, null, 2)}`);
  return [...families.entries()].filter(([, family]) => family.contracts.size > 1).map(([familyId, family]) => ({ familyId, currentContracts: Object.fromEntries(family.contracts) }));
}

function validateMigrationSemantics(entries) {
  for (const entry of entries) {
    if (entry.targetAction === 'merge-after-extraction') assert(entry.persistenceCompatibility.status === 'merge-map-required', `${entry.sourceId}: Merge braucht merge-map-required`);
    if (entry.targetAction === 'retire-after-approval') assert(entry.humanReviewRequired && entry.persistenceCompatibility.status === 'retire-blocked', `${entry.sourceId}: Retire braucht Human Review und retire-blocked`);
    if (entry.uncertainty.some((item) => item.level === 'high')) assert(entry.humanReviewRequired, `${entry.sourceId}: hohe Unsicherheit braucht Human Review`);
  }
}

function validateTaxonomyNormalization(entries) {
  const familyPrefix = /^(foundations|linear-algebra|data-ml|deep-learning|transformer-llm|genai|research|responsible-ai|capstone)-/;
  const expectedProfile = { 1: 'basic-recall', 2: 'core-application', 3: 'advanced-transfer', 4: 'final-boss-synthesis', 5: 'final-boss-synthesis' };
  const unexpectedFamilyIds = [...new Set(entries.map((entry) => entry.proposedFamilyId).filter((familyId) => !familyPrefix.test(familyId)))];
  const difficultyProfileMismatches = entries.filter((entry) => entry.proposedDifficultyProfile !== expectedProfile[entry.currentDifficulty]).map((entry) => entry.sourceId);
  const families = new Map();
  for (const entry of entries) {
    if (!families.has(entry.proposedFamilyId)) families.set(entry.proposedFamilyId, []);
    families.get(entry.proposedFamilyId).push(entry.sourceId);
  }
  const largestFamilySize = Math.max(...[...families.values()].map((sourceIds) => sourceIds.length));
  assert(unexpectedFamilyIds.length === 0, `Nicht normalisierte Familien-IDs: ${unexpectedFamilyIds.join(', ')}`);
  assert(difficultyProfileMismatches.length === 0, `Difficulty-Profile weichen ab: ${difficultyProfileMismatches.join(', ')}`);
  return {
    familyCount: families.size,
    caseTypeCount: new Set(entries.map((entry) => entry.proposedCaseType)).size,
    largestFamilySize,
    familiesOverThreeSources: [...families.entries()].filter(([, sourceIds]) => sourceIds.length > 3).map(([familyId, sourceIds]) => ({ familyId, sourceIds })),
    unexpectedFamilyIds,
    difficultyProfileMismatches,
  };
}

function countBy(items, select) {
  const counts = {};
  for (const item of items) {
    const key = select(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function countMany(items, select) {
  return countBy(items.flatMap((item) => select(item).map((key) => ({ key }))), (item) => item.key);
}

function groupUnsupportedConditions(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.condition)) groups.set(item.condition, []);
    groups.get(item.condition).push({ sourceId: item.sourceId, ruleIndex: item.ruleIndex, activityType: item.activityType });
  }
  return [...groups.entries()].map(([condition, occurrences]) => ({ condition, count: occurrences.length, occurrences })).sort((left, right) => right.count - left.count || left.condition.localeCompare(right.condition));
}

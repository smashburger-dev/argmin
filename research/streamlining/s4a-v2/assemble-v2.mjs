import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// S4A-v2 taxonomy assembler. Mirrors research/streamlining/s4a/assemble.mjs
// conventions (project Ajv, Ajv2020 strict, --write flag, fail-closed asserts)
// but cross-checks the v2 shards against the frozen v1 inputs in inputs/
// instead of re-deriving the baseline from the content tree. The current
// content tree is read only for competency ids (content/competencies/core.json).
//
// Entry forms (Block A2): atomic-case entries own exactly one CognitiveFamily,
// TaskArchetype and CaseTemplate; composite-placement entries own an ordered
// composition of existing atomic entries plus a sequence/partial-score/synthesis
// contract instead of a family (QTI item-vs-section as model analogy only).
// Memberships, domains and counts are derived from the shards; the
// canonical-families.json registry contributes contracts and expected counts.

const analysisDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(analysisDir, '../../..');
const require = createRequire(join(root, 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;
const writeOutput = process.argv.includes('--write');
const allowNewFamilies = process.argv.includes('--allow-new-families');

const DOMAINS = [
  'foundations',
  'linear-algebra',
  'data-ml',
  'deep-learning',
  'transformer-llm',
  'genai-systems',
  'research-capstone',
];
const EXPECTED_TOTAL = 268;
const EXPECTED_OCCURRENCES = 623;
const EXPECTED_CONSUMED = 275;
const EXPECTED_NOT_CONSUMED = 348;
const EXPECTED_MERGE_IDS = ['w05-e11', 'w05-e12', 'w05-e13', 'w17-e2', 'w37-e1'];
const EXPECTED_RETIRE_ID = 'w05-e7';
const RESOLVED_DISPOSITIONS = new Set(['resolved-with-code-evidence', 'resolved-with-source-evidence', 'resolved-by-review-council']);
const OPEN_QUEUED_DISPOSITIONS = new Set(['requires-noa-decision', 'requires-empirical-data']);
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function loadArchetypeRegistry(dir) {
  const registry = readJson(join(dir, 'archetypes.json'));
  assert(registry.archetypes.length === 10, `Archetyp-Registry enthaelt ${registry.archetypes.length} statt 10 Archetypen`);
  const byId = new Map();
  for (const archetype of registry.archetypes) {
    assert(!byId.has(archetype.id), `Archetyp-ID doppelt: ${archetype.id}`);
    assert(archetype.status === 'active' || archetype.status === 'historical-retired', `${archetype.id}: status fehlt oder ungueltig (${archetype.status})`);
    byId.set(archetype.id, archetype);
  }
  const seatSum = registry.archetypes.reduce((sum, archetype) => sum + archetype.expectedSourceCount, 0);
  assert(seatSum === EXPECTED_TOTAL, `Archetyp-Registry Bestandssumme ist ${seatSum}, erwartet ${EXPECTED_TOTAL} (50+60+95+35+11+7+4+3+2+1)`);
  return { registry, byId };
}

export function loadFamilyRegistry(dir) {
  const document = readJson(join(dir, 'canonical-families.json'));
  const byFamilyId = new Map();
  for (const family of document.families) {
    assert(!byFamilyId.has(family.familyId), `Registry: familyId doppelt ${family.familyId}`);
    byFamilyId.set(family.familyId, family);
  }
  return { document, byFamilyId };
}

function mainJob() {
  return process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

if (mainJob()) {
  main().catch((error) => {
    console.error(`S4A-V2-ASSEMBLER FEHLER: ${error.message}`);
    process.exitCode = 1;
  });
}

async function main() {
  const schema = readJson(join(analysisDir, 'taxonomy.schema.json'));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const { registry: archetypeRegistry, byId: archetypeById } = loadArchetypeRegistry(analysisDir);
  const familyRegistry = loadFamilyRegistry(analysisDir);

  const v1 = loadV1Inputs();
  const shards = loadShards(v1, validate);

  const records = [];
  for (const domain of DOMAINS) {
    const shard = shards.get(domain);
    for (const entry of shard.entries) records.push({ entry, domain });
  }
  const orderById = new Map(v1.order.map((sourceId, index) => [sourceId, index]));
  records.sort((left, right) => orderById.get(left.entry.sourceId) - orderById.get(right.entry.sourceId));

  const competencyIds = new Set(readJson(join(root, 'content/competencies/core.json')).competencies.map((item) => item.competencyId));
  assertCompetencyClaims(records, competencyIds);
  const familyIndex = validateCrossShardConsistency(records, archetypeById);
  validateArchetypeSeats(records, archetypeById);
  validateFormRules(records, archetypeById);
  resolveCompositeReferences(records);
  checkCouncilReviewRefs(records, analysisDir);
  checkFamilyNaming(familyIndex.families);
  const registryAudit = checkRegistryFamilies(familyIndex.families, familyRegistry, { allowNewFamilies: allowNewFamilies });
  const persistenceAudit = validatePersistence(records.map((record) => record.entry));
  const occurrenceAudit = validateOccurrenceCoverage(records, v1);

  const matrix = buildMatrix(records, v1, familyIndex, persistenceAudit, occurrenceAudit, registryAudit);
  const feedbackDisposition = buildFeedbackDisposition(records, v1, occurrenceAudit);
  const decisionQueue = buildDecisionQueue(records);

  const outputs = [
    { file: join(analysisDir, 'migration-matrix-v2.json'), payload: matrix },
    { file: join(analysisDir, 'feedback-disposition.json'), payload: feedbackDisposition },
    { file: join(analysisDir, 'decision-queue.json'), payload: decisionQueue },
  ];
  if (writeOutput) {
    for (const output of outputs) writeFileSync(output.file, `${JSON.stringify(output.payload, null, 2)}\n`);
    writeDerivedRegistry(join(analysisDir, 'canonical-families.json'), familyRegistry, familyIndex.families);
  } else {
    for (const output of outputs) {
      if (existsSync(output.file)) {
        assert(JSON.stringify(readJson(output.file)) === JSON.stringify(output.payload), `${relative(root, output.file)} ist gegenueber Shards oder v1-Inputs veraltet; neu generieren mit --write`);
      }
    }
  }

  printSummary(matrix, feedbackDisposition, decisionQueue, occurrenceAudit, outputs, registryAudit);
}

function loadV1Inputs() {
  const order = [];
  const bySource = new Map();
  let consumed = 0;
  let notConsumed = 0;
  const ruleIndexEverywhere = [];
  for (const domain of DOMAINS) {
    const file = join(analysisDir, 'inputs', `${domain}-v1.json`);
    assert(existsSync(file), `v1-Input fehlt: ${relative(root, file)}`);
    const document = readJson(file);
    assert(document.domain === domain, `${relative(root, file)}: domain ist ${document.domain}, erwartet ${domain}`);
    assert(document.baselineCommit === '1998d57', `${relative(root, file)}: baselineCommit ist ${document.baselineCommit}, erwartet 1998d57`);
    for (const entry of document.entries) {
      assert(!bySource.has(entry.sourceId), `v1-Input: doppelte sourceId ${entry.sourceId}`);
      const occurrences = document.feedbackOccurrences[entry.sourceId] || [];
      for (const occurrence of occurrences) ruleIndexEverywhere.push(Number.isInteger(occurrence.ruleIndex));
      for (const occurrence of occurrences) {
        if (occurrence.consumerStatus === 'consumed') consumed += 1;
        else if (occurrence.consumerStatus === 'not-consumed') notConsumed += 1;
        else throw new Error(`${entry.sourceId}: unbekannter v1 consumerStatus ${occurrence.consumerStatus}`);
      }
      bySource.set(entry.sourceId, { entry, occurrences, domain });
      order.push(entry.sourceId);
    }
  }
  assert(bySource.size === EXPECTED_TOTAL, `v1-Quellnenner ist ${bySource.size}, erwartet ${EXPECTED_TOTAL}`);
  const totalOccurrences = consumed + notConsumed;
  assert(totalOccurrences === EXPECTED_OCCURRENCES, `v1-Feedbacknenner ist ${totalOccurrences}, erwartet ${EXPECTED_OCCURRENCES}`);
  assert(consumed === EXPECTED_CONSUMED, `v1 konsumierte Regeln: ${consumed}, erwartet ${EXPECTED_CONSUMED}`);
  assert(notConsumed === EXPECTED_NOT_CONSUMED, `v1 nicht konsumierte Regeln: ${notConsumed}, erwartet ${EXPECTED_NOT_CONSUMED}`);
  return { order, bySource, consumed, notConsumed, occurrenceMatchMode: ruleIndexEverywhere.every(Boolean) ? 'ruleIndex' : 'condition+message-order' };
}

function loadShards(v1, validate) {
  const shardsDir = join(analysisDir, 'shards');
  assert(existsSync(shardsDir), `Shard-Verzeichnis fehlt: ${relative(root, shardsDir)}`);
  const jsonFiles = readdirSync(shardsDir).filter((file) => file.endsWith('.json')).sort();
  const skipped = jsonFiles.filter((file) => file.startsWith('_'));
  const present = new Set(jsonFiles.filter((file) => !file.startsWith('_')));
  const unknown = [...present].filter((file) => !DOMAINS.includes(file.replace(/\.json$/, '')));
  assert(unknown.length === 0, `Unbekannte Shard-Dateien in shards/ (erlaubt sind nur <domain>.json, "_"-Präfix wird übersprungen): ${unknown.join(', ')}`);
  const missing = DOMAINS.map((domain) => `${domain}.json`).filter((file) => !present.has(file));
  if (present.size === 0) {
    const expectedLines = DOMAINS.map((domain) => {
      const count = [...v1.bySource.values()].filter((record) => record.domain === domain).length;
      return `  - ${relative(root, join(analysisDir, 'shards', `${domain}.json`))} (${count} v1-Einträge)`;
    }).join('\n');
    const skippedNote = skipped.length > 0 ? `\nÜbersprungen nach Namenskonvention ("_"-Präfix, z. B. Beispiel-Shard): ${skipped.join(', ')}` : '';
    throw new Error(`Noch keine S4A-v2-Shards gefunden in ${relative(root, shardsDir)}/.\nErwartet werden genau diese 7 Shard-Dateien (alle fehlen):\n${expectedLines}${skippedNote}\nJeder Shard muss taxonomy.schema.json entsprechen und exakt die sourceIds von inputs/<domain>-v1.json abdecken (268 gesamt).`);
  }
  assert(missing.length === 0, `Fehlende Shard-Dateien:\n${missing.map((file) => `  - ${relative(root, join(analysisDir, 'shards', file))}`).join('\n')}`);
  const shards = new Map();
  for (const domain of DOMAINS) {
    const file = join(shardsDir, `${domain}.json`);
    const document = readJson(file);
    assert(validate(document), `${domain}.json verletzt taxonomy.schema.json:\n${JSON.stringify(validate.errors, null, 2)}`);
    assert(document.shardId === domain, `${domain}.json: shardId ist ${document.shardId}, erwartet ${domain}`);
    const v1Ids = new Set([...v1.bySource.values()].filter((record) => record.domain === domain).map((record) => record.entry.sourceId));
    const shardIds = new Set(document.entries.map((entry) => entry.sourceId));
    const missingIds = [...v1Ids].filter((id) => !shardIds.has(id));
    const extraIds = [...shardIds].filter((id) => !v1Ids.has(id));
    assert(missingIds.length === 0 && extraIds.length === 0, `${domain}.json: Quellmenge stimmt nicht (fehlt: ${missingIds.join(', ') || 'keine'}; zu viel: ${extraIds.join(', ') || 'keine'})`);
    shards.set(domain, document);
  }
  const totalEntries = [...shards.values()].reduce((sum, shard) => sum + shard.entries.length, 0);
  assert(totalEntries === EXPECTED_TOTAL, `Shards enthalten ${totalEntries} Einträge, erwartet ${EXPECTED_TOTAL}`);
  return shards;
}

function assertCompetencyClaims(records, competencyIds) {
  const violations = [];
  for (const { entry } of records) {
    if (!competencyIds.has(entry.competencyClaim.primary)) violations.push(`${entry.sourceId}: unbekannte Kompetenz ${entry.competencyClaim.primary}`);
  }
  assert(violations.length === 0, `Competency-Claim-Verletzungen (${violations.length}):\n${formatList(violations)}`);
}

export function validateCrossShardConsistency(records, archetypeById) {
  const families = new Map();
  const caseBindings = new Map();
  const composites = [];
  const violations = [];
  for (const { entry, domain } of records) {
    if (entry.entryForm === 'composite-placement') {
      composites.push({ entry, domain });
      continue;
    }
    if (!archetypeById.has(entry.taskArchetype.archetypeId)) violations.push(`${entry.sourceId}: unbekannte archetypeId ${entry.taskArchetype.archetypeId}`);
    const family = entry.cognitiveFamily;
    const evidence = family.membershipEvidence;
    const known = families.get(family.familyId);
    if (!known) {
      families.set(family.familyId, {
        familyGroup: entry.familyGroup,
        summary: family.summary,
        solutionPath: evidence.solutionPath,
        referenceModel: evidence.referenceModel,
        errorHypotheses: [...evidence.errorHypotheses].sort(),
        members: [entry.sourceId],
        domains: new Set([domain]),
      });
    } else {
      if (known.familyGroup !== entry.familyGroup) violations.push(`${entry.sourceId}: familyId ${family.familyId} hat familyGroup ${entry.familyGroup}, sonst ${known.familyGroup} (${known.members.join(', ')})`);
      if (known.summary !== family.summary) violations.push(`${entry.sourceId}: familyId ${family.familyId} hat abweichende summary (bytegleich gefordert; Mitglieder: ${known.members.concat(entry.sourceId).join(', ')})`);
      if (known.solutionPath !== evidence.solutionPath) violations.push(`${entry.sourceId}: familyId ${family.familyId} hat abweichende membershipEvidence.solutionPath`);
      if (known.referenceModel !== evidence.referenceModel) violations.push(`${entry.sourceId}: familyId ${family.familyId} hat abweichende membershipEvidence.referenceModel`);
      if (JSON.stringify(known.errorHypotheses) !== JSON.stringify([...evidence.errorHypotheses].sort())) violations.push(`${entry.sourceId}: familyId ${family.familyId} hat abweichende errorHypotheses (mengen-identisch gefordert)`);
      known.members.push(entry.sourceId);
      known.domains.add(domain);
    }
    const caseId = entry.caseTemplate.caseId;
    const binding = JSON.stringify([family.familyId, entry.taskArchetype.archetypeId, entry.caseTemplate.graderAdapter, entry.caseTemplate.authorityMode]);
    if (caseBindings.has(caseId) && caseBindings.get(caseId) !== binding) violations.push(`${entry.sourceId}: caseId ${caseId} ist an unterschiedliche Familie/Archetyp/Adapter gebunden`);
    caseBindings.set(caseId, binding);
  }
  assert(violations.length === 0, `Konsistenzverletzungen über Shards (${violations.length}):\n${formatList(violations)}`);
  return { families, caseCount: caseBindings.size, composites };
}

export function validateArchetypeSeats(records, archetypeById) {
  const derived = new Map();
  for (const { entry } of records) {
    if (entry.entryForm !== 'atomic-case') continue;
    const id = entry.taskArchetype.archetypeId;
    derived.set(id, (derived.get(id) || 0) + 1);
  }
  const violations = [];
  for (const [id, archetype] of archetypeById) {
    const count = derived.get(id) || 0;
    if (archetype.status === 'active' && count !== archetype.expectedSourceCount) {
      violations.push(`Archetyp ${id}: ${count} atomic-cases, Registry erwartet ${archetype.expectedSourceCount}`);
    }
    if (archetype.status === 'historical-retired' && count !== 0) {
      violations.push(`Archetyp ${id} ist historical-retired, darf aber von ${count} atomic-cases gebunden sein (0 erwartet)`);
    }
  }
  assert(violations.length === 0, `Archetyp-Sitzverletzungen (${violations.length}):\n${formatList(violations)}`);
  return derived;
}

export function validateFormRules(records, archetypeById) {
  const violations = [];
  for (const { entry } of records) {
    if (entry.entryForm === 'atomic-case') {
      const archetype = archetypeById.get(entry.taskArchetype.archetypeId);
      if (archetype && archetype.status !== 'active') violations.push(`${entry.sourceId}: atomic-case bindet den nicht-aktiven Archetyp ${archetype.id}`);
      if (archetype && !archetype.graderAdapter) violations.push(`${entry.sourceId}: Archetyp ${archetype.id} hat keinen realen GraderAdapter`);
      if (archetype && entry.caseTemplate.graderAdapter !== archetype.graderAdapter) violations.push(`${entry.sourceId}: caseTemplate.graderAdapter ${entry.caseTemplate.graderAdapter} passt nicht zum Archetyp-Adapter ${archetype.graderAdapter}`);
      if (entry.persistence.status === 'retire-blocked') violations.push(`${entry.sourceId}: retire-blocked muss composite-placement sein, kein atomic-case mit Grader`);
    } else {
      const composite = entry.compositePlacement;
      if (composite.historicalArchetypeId) {
        const archetype = archetypeById.get(composite.historicalArchetypeId);
        if (!archetype) violations.push(`${entry.sourceId}: unbekannte historicalArchetypeId ${composite.historicalArchetypeId}`);
        else if (archetype.status !== 'historical-retired') violations.push(`${entry.sourceId}: historicalArchetypeId ${composite.historicalArchetypeId} ist nicht historical-retired`);
      }
      const retiredComposite = composite.status === 'retired';
      if (retiredComposite && entry.persistence.status !== 'retire-blocked') violations.push(`${entry.sourceId}: composite-placement status retired verlangt persistence retire-blocked`);
      if (!retiredComposite && entry.persistence.status === 'retire-blocked') violations.push(`${entry.sourceId}: persistence retire-blocked verlangt composite-placement status retired`);
      if (retiredComposite && entry.placement.reviewEligible) violations.push(`${entry.sourceId}: retired composite darf keinen ausfuehrbaren Review andeuten (reviewEligible muss false sein)`);
    }
  }
  assert(violations.length === 0, `Entry-Form-Verletzungen (${violations.length}):\n${formatList(violations)}`);
  return true;
}

export function resolveCompositeReferences(records) {
  const bySource = new Map(records.map((record) => [record.entry.sourceId, record]));
  const violations = [];
  for (const { entry } of records) {
    if (entry.entryForm !== 'composite-placement') continue;
    const composite = entry.compositePlacement;
    const seen = new Set();
    for (const component of composite.components) {
      const target = bySource.get(component.sourceId);
      if (!target) violations.push(`${entry.sourceId}: Komponente ${component.sourceId} existiert nicht in den 268 Quellen`);
      else if (component.sourceId === entry.sourceId) violations.push(`${entry.sourceId}: Composite referenziert sich selbst`);
      else if (target.entry.entryForm !== 'atomic-case') violations.push(`${entry.sourceId}: Komponente ${component.sourceId} ist kein atomic-case`);
      if (seen.has(component.sourceId)) violations.push(`${entry.sourceId}: Komponente ${component.sourceId} doppelt referenziert`);
      seen.add(component.sourceId);
    }
  }
  assert(violations.length === 0, `Composite-Referenzverletzungen (${violations.length}):\n${formatList(violations)}`);
  return true;
}

export function checkCouncilReviewRefs(records, dir) {
  const violations = [];
  const cache = new Map();
  for (const { entry } of records) {
    const items = [entry.humanReview, ...entry.uncertaintyDispositions].filter((item) => item && item.disposition === 'resolved-by-review-council');
    for (const item of items) {
      const file = join(dir, item.councilReviewRef);
      if (!existsSync(file)) {
        violations.push(`${entry.sourceId}: councilReviewRef ${item.councilReviewRef} existiert nicht`);
        continue;
      }
      if (!cache.has(file)) cache.set(file, readFileSync(file, 'utf8'));
      if (!cache.get(file).includes(entry.sourceId)) violations.push(`${entry.sourceId}: Reviewbericht ${item.councilReviewRef} behandelt die sourceId nicht ausdruecklich`);
    }
  }
  assert(violations.length === 0, `Council-Referenzverletzungen (${violations.length}):\n${formatList(violations)}`);
  return true;
}

export function checkFamilyNaming(families) {
  const violations = [];
  const tokenKeys = new Map();
  for (const familyId of families.keys()) {
    if (!KEBAB_CASE.test(familyId)) violations.push(`familyId verletzt kebab-case: ${familyId}`);
    const key = familyId.split('-').sort().join('-');
    if (tokenKeys.has(key)) violations.push(`stille Familienvariante: ${familyId} und ${tokenKeys.get(key)} haben dasselbe Token-Multiset`);
    tokenKeys.set(key, familyId);
  }
  assert(violations.length === 0, `Namensverletzungen (${violations.length}):\n${formatList(violations)}`);
  return true;
}

export function checkRegistryFamilies(families, familyRegistry, options = {}) {
  const allowNew = options.allowNewFamilies === true;
  const violations = [];
  const newFamilies = [];
  for (const [familyId, derived] of families) {
    const registered = familyRegistry.byFamilyId.get(familyId);
    if (!registered) {
      newFamilies.push(familyId);
      if (!allowNew) violations.push(`neue Familie ${familyId}: Registry-Eintrag nach Ratsbeschluss ergaenzen oder Shards korrigieren`);
      continue;
    }
    if (registered.familyGroup !== derived.familyGroup) violations.push(`Registry: ${familyId} familyGroup ${registered.familyGroup} gegen Shard ${derived.familyGroup}`);
    if (registered.summary !== derived.summary) violations.push(`Registry: ${familyId} summary weicht zeichengetreu ab`);
    if (registered.membershipEvidence.solutionPath !== derived.solutionPath) violations.push(`Registry: ${familyId} solutionPath weicht ab`);
    if (registered.membershipEvidence.referenceModel !== derived.referenceModel) violations.push(`Registry: ${familyId} referenceModel weicht ab`);
    if (JSON.stringify([...registered.membershipEvidence.errorHypotheses].sort()) !== JSON.stringify(derived.errorHypotheses)) violations.push(`Registry: ${familyId} errorHypotheses weichen ab`);
    if (registered.expectedMemberCount !== derived.members.length) violations.push(`Registry: ${familyId} erwartet ${registered.expectedMemberCount} Mitglieder, Shards deklarieren ${derived.members.length} (${derived.members.join(', ')})`);
  }
  const unusedRegistryFamilies = [];
  for (const familyId of familyRegistry.byFamilyId.keys()) {
    if (!families.has(familyId)) unusedRegistryFamilies.push(familyId);
  }
  if (unusedRegistryFamilies.length > 0 && !allowNew) {
    violations.push(`Registry-Familien ohne Shard-Mitglieder (reconcilieren): ${unusedRegistryFamilies.join(', ')}`);
  }
  assert(violations.length === 0, `Registry-Verletzungen (${violations.length}):\n${formatList(violations)}`);
  return { newFamilies, unusedRegistryFamilies };
}

export function validatePersistence(allEntries) {
  const byStatus = { 'preserve-id': [], 'merge-map-required': [], 'retire-blocked': [] };
  for (const entry of allEntries) byStatus[entry.persistence.status].push(entry);
  assert(byStatus['preserve-id'].length === 262, `preserve-id: ${byStatus['preserve-id'].length}, erwartet 262`);
  const mergeIds = byStatus['merge-map-required'].map((entry) => entry.sourceId).sort();
  assert(JSON.stringify(mergeIds) === JSON.stringify([...EXPECTED_MERGE_IDS].sort()), `merge-map-required IDs: ${mergeIds.join(', ') || 'keine'}, erwartet ${EXPECTED_MERGE_IDS.join(', ')}`);
  for (const entry of byStatus['merge-map-required']) {
    assert(typeof entry.persistence.mergeInto === 'string' && entry.persistence.mergeInto.length > 0, `${entry.sourceId}: merge-map-required braucht ein nicht-leeres mergeInto`);
  }
  const retireIds = byStatus['retire-blocked'].map((entry) => entry.sourceId);
  assert(JSON.stringify(retireIds) === JSON.stringify([EXPECTED_RETIRE_ID]), `retire-blocked IDs: ${retireIds.join(', ') || 'keine'}, erwartet nur ${EXPECTED_RETIRE_ID}`);
  const retireEntry = byStatus['retire-blocked'][0];
  assert(/S1B/.test(retireEntry.persistence.note) && /(freigabe|approval)/i.test(retireEntry.persistence.note), `${EXPECTED_RETIRE_ID}: retire-blocked note muss die S1B-Freigabe erwähnen`);
  const covered = byStatus['preserve-id'].length + byStatus['merge-map-required'].length + byStatus['retire-blocked'].length;
  assert(covered === allEntries.length, `Persistenzpartition (${covered}) deckt nicht alle Einträge (${allEntries.length}); kein v3-ID darf still fallen`);
  return { preserveId: 262, mergeMapRequired: EXPECTED_MERGE_IDS.length, retireBlocked: 1 };
}

export function validateOccurrenceCoverage(records, v1) {
  const violations = [];
  for (const { entry } of records) {
    const record = v1.bySource.get(entry.sourceId);
    const v1Uncertainty = record.entry.uncertainty || [];
    const v2Keys = entry.uncertaintyDispositions.map((item) => JSON.stringify([item.field, item.level, item.reason]));
    if (v2Keys.length !== v1Uncertainty.length) violations.push(`${entry.sourceId}: ${v2Keys.length} uncertaintyDispositions gegen ${v1Uncertainty.length} v1-Records`);
    if (new Set(v2Keys).size !== v2Keys.length) violations.push(`${entry.sourceId}: doppelte uncertaintyDispositions (field+level+reason)`);
    const v1Keys = new Set(v1Uncertainty.map((item) => JSON.stringify([item.field, item.level, item.reason])));
    for (const key of new Set(v2Keys)) if (!v1Keys.has(key)) violations.push(`${entry.sourceId}: uncertaintyDisposition ohne v1-Record: ${key.slice(0, 120)}`);
    if (entry.humanReview.required !== record.entry.humanReviewRequired) violations.push(`${entry.sourceId}: humanReview.required ist ${entry.humanReview.required}, v1 humanReviewRequired ist ${record.entry.humanReviewRequired}`);
    if (record.entry.humanReviewRequired && !entry.humanReview.disposition) violations.push(`${entry.sourceId}: humanReview.required=true braucht eine Disposition`);
    for (const item of [entry.humanReview, ...entry.uncertaintyDispositions]) {
      if (item.disposition && !RESOLVED_DISPOSITIONS.has(item.disposition)) {
        for (const field of ['owner', 'decision', 'evidence', 'latestGate']) {
          if (!item[field]) violations.push(`${entry.sourceId}: Disposition ${item.disposition} braucht ${field}`);
        }
      }
    }
    const v1Occurrences = record.occurrences;
    if (v1.occurrenceMatchMode === 'ruleIndex') {
      const v1Indexes = v1Occurrences.map((occurrence) => occurrence.ruleIndex);
      const v2Indexes = entry.feedbackDispositions.map((item) => item.ruleIndex);
      if (new Set(v1Indexes).size !== v1Indexes.length) violations.push(`${entry.sourceId}: v1 ruleIndexes sind nicht eindeutig (Interna des Assemblers)`);
      if (v2Indexes.length !== v1Indexes.length) violations.push(`${entry.sourceId}: ${v2Indexes.length} feedbackDispositions gegen ${v1Indexes.length} v1-Vorkommen`);
      if (new Set(v2Indexes).size !== v2Indexes.length) violations.push(`${entry.sourceId}: doppelte ruleIndex in feedbackDispositions`);
      const v1Set = new Set(v1Indexes);
      for (const index of new Set(v2Indexes)) if (!v1Set.has(index)) violations.push(`${entry.sourceId}: ruleIndex ${index} existiert nicht in v1`);
    } else if (entry.feedbackDispositions.length !== v1Occurrences.length) {
      // Positional fallback (v1 occurrences without ruleIndex): order is the
      // contract; the condition+message pair identifies each occurrence in v1.
      violations.push(`${entry.sourceId}: ${entry.feedbackDispositions.length} feedbackDispositions gegen ${v1Occurrences.length} v1-Vorkommen (Reihenfolge-Abgleich)`);
    }
  }
  assert(violations.length === 0, `v1-Abdeckungsverletzungen (${violations.length}):\n${formatList(violations)}`);
  const notConsumedCovered = [];
  for (const { entry } of records) {
    const record = v1.bySource.get(entry.sourceId);
    if (v1.occurrenceMatchMode === 'ruleIndex') {
      const coveredIndexes = new Set(entry.feedbackDispositions.map((item) => item.ruleIndex));
      for (const occurrence of record.occurrences) {
        if (occurrence.consumerStatus === 'not-consumed' && !coveredIndexes.has(occurrence.ruleIndex)) notConsumedCovered.push(`${entry.sourceId}#rule${occurrence.ruleIndex}`);
      }
    } else if (entry.feedbackDispositions.length < record.occurrences.filter((occurrence) => occurrence.consumerStatus === 'not-consumed').length) {
      notConsumedCovered.push(`${entry.sourceId}: weniger feedbackDispositions als nicht konsumierte Vorkommen`);
    }
  }
  assert(notConsumedCovered.length === 0, `Nicht konsumierte Vorkommen ohne Zielpfad (${notConsumedCovered.length}):\n${formatList(notConsumedCovered)}`);
  return { mode: v1.occurrenceMatchMode };
}

function writeDerivedRegistry(file, familyRegistry, families) {
  const derivedDocument = {
    ...familyRegistry.document,
    derivationNote: 'memberSourceIds, domains und memberCount wurden von assemble-v2.mjs --write aus den bestaendigten Shards abgeleitet; hypothesisMemberSourceIds bleiben als Design-Hypothese zur Auditierung stehen.',
    families: familyRegistry.document.families.map((registered) => {
      const derived = families.get(registered.familyId);
      if (!derived) return registered;
      return {
        ...registered,
        memberSourceIds: [...derived.members].sort(),
        domains: [...derived.domains].sort(),
        memberCount: derived.members.length,
      };
    }),
  };
  writeFileSync(file, `${JSON.stringify(derivedDocument, null, 2)}\n`);
}

function buildMatrix(records, v1, familyIndex, persistenceAudit, occurrenceAudit, registryAudit) {
  const allEntries = records.map((record) => record.entry);
  const atomicEntries = allEntries.filter((entry) => entry.entryForm === 'atomic-case');
  const compositeEntries = allEntries.filter((entry) => entry.entryForm === 'composite-placement');
  const retiredComposites = compositeEntries.filter((entry) => entry.compositePlacement.status === 'retired');
  const familyGroups = countBy(atomicEntries, (entry) => entry.familyGroup);
  const byFamily = new Map();
  for (const entry of atomicEntries) byFamily.set(entry.cognitiveFamily.familyId, (byFamily.get(entry.cognitiveFamily.familyId) || 0) + 1);
  const singletonFamilies = [...byFamily.values()].filter((count) => count === 1).length;
  const byArchetype = countBy(atomicEntries, (entry) => entry.taskArchetype.archetypeId);
  const byCase = countBy(atomicEntries, (entry) => entry.caseTemplate.caseId);
  const distinctModuleHints = new Set(allEntries.map((entry) => entry.placement.moduleHint)).size;
  const distinctLessonSets = new Set(allEntries.map((entry) => JSON.stringify(entry.placement.lessonIds))).size;
  const perDomain = DOMAINS.map((domain) => {
    const domainRecords = records.filter((record) => record.domain === domain);
    const v1Entries = domainRecords.map((record) => v1.bySource.get(record.entry.sourceId).entry);
    const v1Families = new Set(v1Entries.map((entry) => entry.proposedFamilyId)).size;
    const domainAtomic = domainRecords.filter((record) => record.entry.entryForm === 'atomic-case');
    const v2Families = new Set(domainAtomic.map((record) => record.entry.cognitiveFamily.familyId)).size;
    return {
      domain,
      entries: domainRecords.length,
      atomicCases: domainAtomic.length,
      compositePlacements: domainRecords.length - domainAtomic.length,
      v1Families,
      v2Families,
      v2FamilyGroups: new Set(domainAtomic.map((record) => record.entry.familyGroup)).size,
      v2Archetypes: new Set(domainAtomic.map((record) => record.entry.taskArchetype.archetypeId)).size,
      v2CaseTemplates: new Set(domainAtomic.map((record) => record.entry.caseTemplate.caseId)).size,
      familyCompression: Number((v1Families / v2Families).toFixed(2)),
    };
  });
  const byFamilyDetail = Object.fromEntries([...familyIndex.families.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([familyId, family]) => [
    familyId,
    {
      familyGroup: family.familyGroup,
      memberSourceIds: [...family.members].sort(),
      domains: [...family.domains].sort(),
      memberCount: family.members.length,
    },
  ]));
  return {
    taxonomySchemaVersion: 's4a-taxonomy-v2',
    sessionId: 'S4A-V2',
    baselineCommit: '1998d57',
    analysisDate: '2026-09-02',
    schemaFile: 'research/streamlining/s4a-v2/taxonomy.schema.json',
    archetypeRegistryFile: 'research/streamlining/s4a-v2/archetypes.json',
    familyRegistryFile: 'research/streamlining/s4a-v2/canonical-families.json',
    model: 'Hybrid aus design/design-comparison.md Abschnitt 3: orthogonale Achsen (CompetencyClaim, FamilyGroup, CognitiveFamily, TaskArchetype, CaseTemplate, DifficultyProfile, Placement), kognitiv konsolidiert nach Cs Mitgliedschaftstests mit O-Verschärfung; Entry-Formen atomic-case und composite-placement.',
    sourceBaseline: {
      legacyWeekDefinitions: allEntries.filter((entry) => entry.sourceKind === 'legacy-week-exercise').length,
      canonicalDefinitions: allEntries.filter((entry) => entry.sourceKind === 'canonical-definition').length,
      totalDefinitions: allEntries.length,
      byDomain: Object.fromEntries(DOMAINS.map((domain) => [domain, records.filter((record) => record.domain === domain).length])),
    },
    entries: allEntries,
    aggregates: {
      forms: {
        atomicCases: atomicEntries.length,
        compositePlacements: compositeEntries.length,
        retiredComposites: retiredComposites.length,
        activeComposites: compositeEntries.length - retiredComposites.length,
      },
      familyGroups: { count: Object.keys(familyGroups).length, byGroup: familyGroups },
      cognitiveFamilies: {
        count: familyIndex.families.size,
        singletonCount: singletonFamilies,
        singletonShare: Number((singletonFamilies / familyIndex.families.size).toFixed(4)),
        crossDomainFamilies: [...familyIndex.families.values()].filter((family) => family.domains.size > 1).length,
        largestFamilySize: Math.max(...byFamily.values()),
        byFamily: byFamilyDetail,
      },
      taskArchetypes: { count: Object.keys(byArchetype).length, byArchetype },
      caseTemplates: { count: familyIndex.caseCount, multiEntryCases: Object.values(byCase).filter((count) => count > 1).length },
      placements: { total: allEntries.length, atomicPlacements: atomicEntries.length, compositePlacements: compositeEntries.length, distinctModuleHints, distinctLessonSets, reviewEligible: allEntries.filter((entry) => entry.placement.reviewEligible).length },
      difficultyProfiles: countBy(allEntries, (entry) => entry.difficultyProfile),
      perDomain,
      registryAudit,
      v1Comparison: {
        v1FamiliesTotal: new Set([...v1.bySource.values()].map((record) => record.entry.proposedFamilyId)).size,
        v2FamiliesTotal: familyIndex.families.size,
      },
      feedback: {
        totalOccurrences: EXPECTED_OCCURRENCES,
        consumed: v1.consumed,
        notConsumed: v1.notConsumed,
        occurrenceMatchMode: occurrenceAudit.mode,
        allNotConsumedHaveTargetPath: true,
      },
      persistence: persistenceAudit,
    },
    validation: {
      shardSchemasValid: true,
      sourceCoverageExact: true,
      uncertaintyCoverageExact: true,
      humanReviewFlagsMatchV1: true,
      feedbackCoverageExact: true,
      familyConsistencyExact: true,
      competencyIdsValid: true,
      archetypeIdsValid: true,
      persistenceInvariantsHold: true,
      entryFormsValid: true,
      compositeReferencesComplete: true,
      councilReviewRefsValid: true,
      registryContractsExact: true,
      familyNamingExact: true,
    },
  };
}

function buildFeedbackDisposition(records, v1) {
  const occurrences = [];
  for (const { entry, domain } of records) {
    const record = v1.bySource.get(entry.sourceId);
    const byIndex = v1.occurrenceMatchMode === 'ruleIndex'
      ? new Map(entry.feedbackDispositions.map((item) => [item.ruleIndex, item]))
      : new Map(entry.feedbackDispositions.map((item, index) => [index, item]));
    for (let index = 0; index < record.occurrences.length; index += 1) {
      const occurrence = record.occurrences[index];
      const lookupKey = v1.occurrenceMatchMode === 'ruleIndex' ? occurrence.ruleIndex : index;
      const disposition = byIndex.get(lookupKey);
      occurrences.push({
        domain,
        sourceId: occurrence.sourceId,
        ruleIndex: occurrence.ruleIndex,
        condition: occurrence.condition,
        message: occurrence.message,
        v1ConsumerStatus: occurrence.consumerStatus,
        v1Consumer: occurrence.consumer,
        targetPath: disposition ? disposition.targetPath : null,
        rationale: disposition ? disposition.rationale : null,
      });
    }
  }
  const consumedWithTarget = occurrences.filter((item) => item.v1ConsumerStatus === 'consumed' && item.targetPath).length;
  return {
    total: occurrences.length,
    consumed: occurrences.filter((item) => item.v1ConsumerStatus === 'consumed').length,
    notConsumed: occurrences.filter((item) => item.v1ConsumerStatus === 'not-consumed').length,
    occurrenceMatchMode: v1.occurrenceMatchMode,
    byTargetPath: countBy(occurrences, (item) => item.targetPath),
    consumedWithExplicitTargetPath: consumedWithTarget,
    occurrences,
  };
}

function buildDecisionQueue(records) {
  const items = [];
  for (const { entry, domain } of records) {
    const highUncertainty = entry.uncertaintyDispositions.some((item) => item.level === 'high');
    const mediumCount = entry.uncertaintyDispositions.filter((item) => item.level === 'medium').length;
    const openHumanReview = OPEN_QUEUED_DISPOSITIONS.has(entry.humanReview.disposition);
    const openUncertainties = entry.uncertaintyDispositions.filter((item) => OPEN_QUEUED_DISPOSITIONS.has(item.disposition));
    if (!openHumanReview && openUncertainties.length === 0) continue;
    const riskRank = (highUncertainty ? 0 : 1) * 2 + (openHumanReview ? 0 : 1);
    if (openHumanReview) {
      items.push({
        sourceId: entry.sourceId,
        domain,
        origin: 'humanReview',
        question: entry.humanReview.reasons.join(' | '),
        owner: entry.humanReview.owner,
        decisionNeeded: entry.humanReview.decision,
        evidenceNeeded: entry.humanReview.evidence,
        latestGate: entry.humanReview.latestGate,
        risk: { highUncertainty, mediumUncertaintyCount: mediumCount, humanReviewRequired: true, rank: riskRank },
      });
    }
    for (const item of openUncertainties) {
      items.push({
        sourceId: entry.sourceId,
        domain,
        origin: 'uncertainty',
        field: item.field,
        level: item.level,
        question: `[${item.field}] ${item.reason}`,
        owner: item.owner,
        decisionNeeded: item.decision,
        evidenceNeeded: item.evidence,
        latestGate: item.latestGate,
        risk: { highUncertainty, mediumUncertaintyCount: mediumCount, humanReviewRequired: entry.humanReview.required, rank: riskRank },
      });
    }
  }
  items.sort((left, right) => left.risk.rank - right.risk.rank
    || right.risk.mediumUncertaintyCount - left.risk.mediumUncertaintyCount
    || left.sourceId.localeCompare(right.sourceId));
  return {
    dispositionsQueued: [...OPEN_QUEUED_DISPOSITIONS],
    totalOpenItems: items.length,
    byRiskRank: countBy(items, (item) => `rank-${item.risk.rank}`),
    items,
  };
}

function printSummary(matrix, feedbackDisposition, decisionQueue, occurrenceAudit, outputs, registryAudit) {
  const aggregates = matrix.aggregates;
  console.log(`S4A-v2-Assembler: ${DOMAINS.length}/7 Shards geladen, ${matrix.entries.length}/268 Einträge schema-valide und v1-abgedeckt.`);
  console.log(`Formen: ${aggregates.forms.atomicCases} atomic-cases, ${aggregates.forms.compositePlacements} composite-placements (${aggregates.forms.retiredComposites} retired, ${aggregates.forms.activeComposites} active).`);
  console.log(`Familien: ${aggregates.cognitiveFamilies.count} CognitiveFamilies in ${aggregates.familyGroups.count} FamilyGroups (${aggregates.cognitiveFamilies.singletonCount} Singletons, Anteil ${aggregates.cognitiveFamilies.singletonShare}); ${aggregates.taskArchetypes.count} Archetypen, ${aggregates.caseTemplates.count} CaseTemplates, ${aggregates.placements.total} Placements.`);
  console.log(`Registry: ${registryAudit.newFamilies.length} neue Familien (${registryAudit.newFamilies.join(', ') || 'keine'}), ${registryAudit.unusedRegistryFamilies.length} ungenutzte Registry-Familien (${registryAudit.unusedRegistryFamilies.join(', ') || 'keine'}).`);
  console.log(`Persistenz: ${aggregates.persistence.preserveId} preserve-id / ${aggregates.persistence.mergeMapRequired} merge-map-required (${EXPECTED_MERGE_IDS.join(', ')}) / ${aggregates.persistence.retireBlocked} retire-blocked (${EXPECTED_RETIRE_ID}, S1B-Freigabe).`);
  console.log(`Feedback: ${feedbackDisposition.total} Vorkommen = ${feedbackDisposition.consumed} konsumiert + ${feedbackDisposition.notConsumed} nicht konsumiert; Matching-Schlüssel: ${occurrenceAudit.mode}; alle ${feedbackDisposition.notConsumed} nicht konsumierten haben einen Zielpfad.`);
  console.log(`Unsicherheiten und Human-Reviews disponiert; Entscheidungsqueue: ${decisionQueue.totalOpenItems} offene Punkte (requires-noa-decision / requires-empirical-data).`);
  console.log(`Assertions: Abdeckung 268 exact=${matrix.validation.sourceCoverageExact}, Familien-Konsistenz=${matrix.validation.familyConsistencyExact}, Persistenz-Invarianten=${matrix.validation.persistenceInvariantsHold}, Feedback-Abdeckung=${matrix.validation.feedbackCoverageExact}, Entry-Formen=${matrix.validation.entryFormsValid}, Council-Referenzen=${matrix.validation.councilReviewRefsValid}, Registry=${matrix.validation.registryContractsExact}.`);
  if (writeOutput) {
    console.log(`Geschrieben: ${outputs.map((output) => relative(root, output.file)).join(', ')}, canonical-families.json (abgeleitete Mitgliedschaften)`);
  } else {
    console.log('Trockenlauf ohne --write; vorhandene Ausgabedateien wurden auf Aktualität geprüft.');
  }
  console.log(JSON.stringify({
    entries: matrix.entries.length,
    forms: aggregates.forms,
    v1Comparison: aggregates.v1Comparison,
    perDomain: aggregates.perDomain.map((domain) => ({ domain: domain.domain, v1: domain.v1Families, v2: domain.v2Families })),
    byArchetype: aggregates.taskArchetypes.byArchetype,
    feedbackByTargetPath: feedbackDisposition.byTargetPath,
  }, null, 2));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countBy(items, select) {
  const counts = {};
  for (const item of items) {
    const key = select(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function formatList(violations) {
  const shown = violations.slice(0, 20).map((violation) => `  - ${violation}`).join('\n');
  return violations.length > 20 ? `${shown}\n  ... und ${violations.length - 20} weitere` : shown;
}

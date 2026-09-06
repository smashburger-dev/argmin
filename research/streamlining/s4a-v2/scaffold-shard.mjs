import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Orchestrator tooling for the S4A-v2 shard implementers (Block B).
//   node scaffold-shard.mjs <domain>       write shards/<domain>.json with all
//                                         mechanical fields pre-filled from
//                                         inputs/<domain>-v1.json and the
//                                         canonical registry hypothesis;
//                                         judgment fields stay as loud,
//                                         schema-invalid placeholders.
//   node scaffold-shard.mjs --validate <domain>
//                                         validate the shard against the
//                                         taxonomy schema, the v1 source set,
//                                         and report leftover placeholders.
// Implementers own only their shard file; this tool never edits anything else.

const analysisDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(analysisDir, '../../..');
const require = createRequire(join(root, 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;

const DOMAINS = new Set(['foundations', 'linear-algebra', 'data-ml', 'deep-learning', 'transformer-llm', 'genai-systems', 'research-capstone']);
const ARCHETYPE_BY_INTERFACE = {
  'numeric|deterministic': 'numeric-exact',
  'single-choice|deterministic': 'choice-diagnose',
  'python-code|pyodide': 'code-test',
  'predict-output|deterministic': 'output-predict-lines',
  'code-trace|deterministic': 'state-trace-vars',
  'parsons|deterministic': 'program-ordering',
  'vector|deterministic': 'tuple-exact',
  'algebraic-expression|pyodide-sympy': 'expression-equivalence',
  'short-rationale|manual-rubric': 'rationale-note',
};
const GRADER_ADAPTER = {
  deterministic: 'deterministic',
  pyodide: 'pyodide',
  'pyodide-sympy': 'pyodide-sympy',
  'manual-rubric': 'manual-rubric',
};

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function loadRegistry() {
  const document = readJson(join(analysisDir, 'canonical-families.json'));
  const bySource = new Map();
  for (const family of document.families) {
    for (const sourceId of family.hypothesisMemberSourceIds || []) bySource.set(sourceId, family);
  }
  return { document, bySource };
}

function familyBlock(family) {
  return {
    familyId: family.familyId,
    summary: family.summary,
    membershipEvidence: JSON.parse(JSON.stringify(family.membershipEvidence)),
  };
}

function scaffold(domain) {
  const input = readJson(join(analysisDir, 'inputs', `${domain}-v1.json`));
  const registry = loadRegistry();
  const entries = input.entries.map((source) => {
    const archetypeId = ARCHETYPE_BY_INTERFACE[`${source.activityType}|${source.graderId}`] || null;
    const authorityMode = source.solverContract?.kind === 'seed-generator' ? 'seeded' : 'static';
    const hypothesis = registry.bySource.get(source.sourceId);
    const persistence = { status: source.persistenceCompatibility.status };
    if (source.persistenceCompatibility.status === 'merge-map-required') persistence.mergeInto = 'TODO-mergeInto';
    if (source.sourceId === 'w05-e7') persistence.note = 'TODO-retire-note-muss-S1B-Freigabe-nennen';
    const base = {
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      legacyWeekId: source.legacyWeekId,
      currentDefinitionId: source.currentDefinitionId,
      entryForm: 'atomic-case',
      competencyClaim: {
        primary: source.competencyIds[0],
        coEvidence: source.competencyIds.slice(1),
      },
      difficultyProfile: source.proposedDifficultyProfile,
      placement: {
        lessonIds: source.lessonIds || [],
        moduleHint: 'TODO-modulhinweis-deutsch',
        reviewEligible: source.graderId !== 'manual-rubric',
      },
      persistence,
      humanReview: {
        required: source.humanReviewRequired,
        reasons: source.humanReviewReasons || [],
      },
      uncertaintyDispositions: (source.uncertainty || []).map((record) => ({
        field: record.field,
        level: record.level,
        reason: record.reason,
        disposition: 'TODO-disposition',
        rationale: 'TODO-begruendung',
      })),
      feedbackDispositions: (input.feedbackOccurrences[source.sourceId] || []).map((occurrence) => ({
        ruleIndex: occurrence.ruleIndex,
        targetPath: occurrence.consumerStatus === 'consumed' ? 'grader-predicate' : 'TODO-zielpfad',
        rationale: 'TODO-begruendung',
      })),
    };
    if (source.sourceId === 'w05-e7') {
      return {
        ...base,
        entryForm: 'composite-placement',
        compositePlacement: {
          summary: 'TODO-was-fordert-die-sequenz-ueber-die-teile-hinaus',
          status: 'retired',
          historicalArchetypeId: 'numbas-exam-retired',
          components: [
            { sourceId: 'w05-e1', role: 'TODO-produkteintrag' },
            { sourceId: 'w05-e5', role: 'TODO-termvereinfachung' },
            { sourceId: 'w05-e6', role: 'TODO-systemloesung' },
          ],
          sequenceContract: 'TODO-reihenfolge-und-fuehrungsvertrag',
          partialScoreContract: 'TODO-teilscore-0-4-bestehgrenze-50-prozent-historisch',
        },
        placement: { ...base.placement, reviewEligible: false },
      };
    }
    if (hypothesis) {
      base.familyGroup = hypothesis.familyGroup;
      base.cognitiveFamily = familyBlock(hypothesis);
    } else {
      base.familyGroup = 'TODO-family-group';
      base.cognitiveFamily = {
        familyId: 'TODO-family-id',
        summary: 'TODO-familienvertrag-oder-registry-verbatim',
        membershipEvidence: {
          solutionPath: 'TODO-loesungsweg',
          referenceModel: 'TODO-referenzmodell',
          errorHypotheses: ['TODO-fehlerhypothese'],
        },
      };
    }
    base.taskArchetype = { archetypeId: archetypeId || 'TODO-archetype' };
    base.caseTemplate = {
      caseId: 'TODO-case-id',
      graderAdapter: GRADER_ADAPTER[source.graderId] || 'TODO-adapter',
      authorityMode,
    };
    return base;
  });
  const shard = { shardId: domain, baselineCommit: '1998d57', entries };
  const file = join(analysisDir, 'shards', `${domain}.json`);
  writeFileSync(file, `${JSON.stringify(shard, null, 2)}\n`);
  console.log(`Scaffold geschrieben: ${file} (${entries.length} Eintraege).`);
  reportTodos(shard, domain);
}

function reportTodos(shard, domain) {
  let todos = 0;
  const byKind = {};
  for (const entry of shard.entries) {
    const text = JSON.stringify(entry);
    const matches = text.match(/TODO-[a-z-]+/g) || [];
    todos += matches.length;
    for (const match of matches) byKind[match] = (byKind[match] || 0) + 1;
  }
  console.log(`Offene TODO-Platzhalter in ${domain}: ${todos}`);
  for (const [kind, count] of Object.entries(byKind).sort()) console.log(`  ${kind}: ${count}`);
}

function validate(domain) {
  const file = join(analysisDir, 'shards', `${domain}.json`);
  assert(existsSync(file), `Shard fehlt: ${file}`);
  const shard = readJson(file);
  const schema = readJson(join(analysisDir, 'taxonomy.schema.json'));
  const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const input = readJson(join(analysisDir, 'inputs', `${domain}-v1.json`));
  const v1Ids = new Set(input.entries.map((entry) => entry.sourceId));
  const shardIds = new Set(shard.entries.map((entry) => entry.sourceId));
  const missing = [...v1Ids].filter((id) => !shardIds.has(id));
  const extra = [...shardIds].filter((id) => !v1Ids.has(id));
  const idsOk = missing.length === 0 && extra.length === 0 && shard.entries.length === input.entries.length;
  const valid = validateSchema(shard);
  const text = JSON.stringify(shard);
  const todoCount = (text.match(/TODO-/g) || []).length;
  console.log(`Shard ${domain}: Eintraege ${shard.entries.length}/${input.entries.length}, ID-Mengen ${idsOk ? 'exakt' : `FEHLER (fehlt: ${missing.join(', ') || 'keine'}; zu viel: ${extra.join(', ') || 'keine'})`}, Schema ${valid ? 'valide' : 'INVALID'}, TODO-Platzhalter ${todoCount}.`);
  if (!valid) {
    for (const error of validateSchema.errors.slice(0, 30)) console.log(`  Schema-Fehler ${error.instancePath}: ${error.message}`);
    if (validateSchema.errors.length > 30) console.log(`  ... und ${validateSchema.errors.length - 30} weitere`);
  }
  reportTodos(shard, domain);
  process.exitCode = (!valid || !idsOk) ? 1 : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [flag, domainArg] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const domain = domainArg || flag;
if (!domain || !DOMAINS.has(domain)) {
  console.error('Verwendung: node scaffold-shard.mjs <domain> | node scaffold-shard.mjs --validate <domain>');
  console.error(`Domains: ${[...DOMAINS].join(', ')}`);
  process.exitCode = 1;
} else if (process.argv.includes('--validate')) {
  validate(domain);
} else {
  scaffold(domain);
}

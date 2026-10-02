#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent, validateCompiledContent, validateSourceDocument } from './compile_content.mjs';
import { assertVizCheckpointContract } from '../assets/js/core/viz_checkpoint_grader.mjs';
import { assertFamilyActivityContracts } from '../assets/js/core/graders.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Viz-checkpoint contract (.viz.json "checkpoint"): specs that carry a
// checkpoint are re-validated against the current schema — a prebuilt
// bundle could predate the checkpoint rules — plus the semantic contract
// (expected shape vs. input kind, tolerance > 0, reachable typicalErrors).
function validateVizCheckpoints(bundle) {
  const specs = [];
  for (const item of bundle.visualizations || []) {
    if (item && item.spec) specs.push([`${item.lessonId}:${item.visualizationId}`, item.spec]);
  }
  for (const lesson of bundle.lessons || []) {
    for (const block of lesson.blocks || []) {
      if (block && block.viz) specs.push([`${lesson.lessonId}:${block.visualizationId || block.blockId}`, block.viz]);
    }
  }
  for (const [label, spec] of specs) {
    if (!spec.checkpoint) continue;
    validateSourceDocument('visualization', spec);
    assertVizCheckpointContract(spec.checkpoint, label);
  }
}

// Semantic contracts of the newer activityTypes the JSON schema leaves as
// plain objects: choice-indices correctIds ⊆ choices, diagnosis-expected
// (canonical diagnosisCode per docs/authoring-guide.md §8) and gaps/marker
// parity — plus the R14 rule that diagnostic-rationale stays
// mastery-ineligible (fail-closed at family and case level).
function validateActivityContracts(bundle) {
  for (const family of bundle.families || []) {
    assertFamilyActivityContracts(family);
  }
}

const dirIndex = process.argv.indexOf('--dir');
if (dirIndex >= 0) {
  const dir = process.argv[dirIndex + 1];
  if (!dir) throw new Error('--dir braucht ein Verzeichnis');
  const bundlePath = join(dir, 'content/content-bundle.json');
  if (!existsSync(bundlePath)) throw new Error(`Content-Bundle fehlt: ${bundlePath}`);
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  validateCompiledContent(bundle);
  validateVizCheckpoints(bundle);
  validateActivityContracts(bundle);
  if (/library-private|private-extracts|mml-book|murphy-pml|cs50p-psets-harvard/i.test(JSON.stringify(bundle))) {
    throw new Error('Public-Bundle enthält privaten Quellenmarker');
  }
  console.log(`Public-Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten`);
} else {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  validateVizCheckpoints(bundle);
  validateActivityContracts(bundle);
  console.log(`Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten`);
}

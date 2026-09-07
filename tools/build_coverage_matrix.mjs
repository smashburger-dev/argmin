#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from './compile_content.mjs';

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputName = 'content/competency-family-coverage.json';

function buildCoverage(projectRoot = defaultRoot) {
  const bundle = compileContent({ projectRoot, profile: 'public' });
  const familyById = new Map(bundle.families.map((family) => [family.familyId, family]));
  const coverage = bundle.competencies.map((competency) => {
    const familyIds = new Set();
    let placedCaseCount = 0;
    for (const activity of bundle.familyActivities) {
      if (!activity.competencyIds.includes(competency.competencyId)) continue;
      placedCaseCount += 1;
      familyIds.add(activity.familyId);
    }
    const seededFamilyCount = [...familyIds]
      .filter((familyId) => familyById.get(familyId)?.authorityMode === 'seeded')
      .length;
    const hasLesson = bundle.lessons.some((lesson) => lesson.competencyIds.includes(competency.competencyId));
    if (!hasLesson && familyIds.size === 0) {
      throw new Error(`${competency.competencyId}: weder Lektion noch Familie vorhanden`);
    }
    return {
      competencyId: competency.competencyId,
      familyIds: [...familyIds].sort(),
      placedCaseCount,
      seededFamilyCount,
    };
  });
  return {
    schemaVersion: 1,
    catalogId: bundle.catalogId,
    catalogVersion: bundle.catalogVersion,
    coverage,
  };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildCoverageArtifacts(projectRoot = defaultRoot) {
  return buildCoverage(projectRoot);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
  const projectRoot = rootArgument ? rootArgument.slice('--root='.length) : defaultRoot;
  const path = join(projectRoot, outputName);
  const output = serialize(buildCoverage(projectRoot));
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== output) {
      throw new Error('Kompetenz-Familien-Coverage ist veraltet; npm run coverage:build ausführen');
    }
    console.log('Kompetenz-Familien-Coverage aktuell');
  } else {
    writeFileSync(path, output);
    console.log(`Kompetenz-Familien-Coverage geschrieben: ${path}`);
  }
}

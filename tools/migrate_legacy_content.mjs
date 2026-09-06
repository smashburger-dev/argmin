#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function buildLegacyMap(projectRoot = defaultRoot) {
  const contentRoot = join(projectRoot, 'content');
  const curriculumPath = join(contentRoot, 'curriculum.json');
  const curriculum = readJson(curriculumPath);
  const unitIdsByExercise = new Map();
  const unitCompetencies = new Set();
  for (const week of curriculum.weeks || []) {
    for (const unit of week.learningUnits || []) {
      if (unit.competencyId) unitCompetencies.add(unit.competencyId);
      for (const exerciseId of unit.unitExerciseIds || []) {
        if (!unitIdsByExercise.has(exerciseId)) unitIdsByExercise.set(exerciseId, []);
        unitIdsByExercise.get(exerciseId).push(unit.unitId);
      }
    }
  }

  const exercises = [];
  const sourceFiles = ['content/curriculum.json'];
  for (const file of ['exercises/w01.json', 'exercises/w05.json']) {
    const path = join(contentRoot, file);
    sourceFiles.push(`content/${file}`);
    const pack = readJson(path);
    for (const exercise of pack.exercises || []) {
      exercises.push({
        exerciseId: exercise.exerciseId,
        definitionId: exercise.exerciseId,
        legacyWeekId: pack.weekId,
        competencyIds: [...(exercise.skillIds || [])].sort(),
        unitIds: [...(unitIdsByExercise.get(exercise.exerciseId) || [])].sort(),
      });
    }
  }
  exercises.sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  const sourceHash = createHash('sha256');
  for (const file of sourceFiles) sourceHash.update(file).update('\0').update(readFileSync(join(projectRoot, file))).update('\0');
  return {
    schemaVersion: 1,
    sourceFiles,
    sourceHash: sourceHash.digest('hex'),
    unitCompetencyIds: [...unitCompetencies].sort(),
    exercises,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const outputIndex = process.argv.indexOf('--out');
  const output = outputIndex >= 0
    ? join(process.cwd(), process.argv[outputIndex + 1])
    : join(defaultRoot, 'content/legacy/exercise-competency-map.json');
  const result = buildLegacyMap(defaultRoot);
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(`Legacy-Mapping geschrieben: ${relative(defaultRoot, output)} (${result.exercises.length} Aufgaben)`);
}

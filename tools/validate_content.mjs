#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent, validateCompiledContent } from './compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirIndex = process.argv.indexOf('--dir');
if (dirIndex >= 0) {
  const dir = process.argv[dirIndex + 1];
  if (!dir) throw new Error('--dir braucht ein Verzeichnis');
  const bundlePath = join(dir, 'content/content-bundle.json');
  if (!existsSync(bundlePath)) throw new Error(`Content-Bundle fehlt: ${bundlePath}`);
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  validateCompiledContent(bundle);
  if (/library-private|private-extracts|mml-book|murphy-pml|cs50p-psets-harvard/i.test(JSON.stringify(bundle))) {
    throw new Error('Public-Bundle enthält privaten Quellenmarker');
  }
  console.log(`Public-Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten`);
} else {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  console.log(`Content-Bundle: ${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten`);
}

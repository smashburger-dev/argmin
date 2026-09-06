#!/usr/bin/env node
// Static search index builder for the private authoring tree. The public build
// calls the same pure builder after filtering private content.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildSearchIndex } from './public_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const curriculum = readJson(join(root, 'content/curriculum.json'));
const sources = readJson(join(root, 'content/sources.json'));
const exercisePacks = readdirSync(join(root, 'content/exercises'))
  .filter((file) => /^w\d{2}\.json$/.test(file))
  .sort()
  .map((file) => readJson(join(root, 'content/exercises', file)));
const index = buildSearchIndex(curriculum, sources, exercisePacks);
writeFileSync(join(root, 'content/search-index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`search index: ${index.entries.length} Eintraege`);

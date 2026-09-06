#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migratePayloadToV3 } from '../assets/js/core/progress_migration.mjs';
import { validateImportPayload } from '../assets/js/core/progress_store.js';

const [inputArg, outputArg] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const optionValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
if (!inputArg || !outputArg) {
  console.error('Nutzung: node tools/migrate_attempts_v3.mjs <input.json> <output.json> [--installation-id <id>]');
  process.exit(1);
}
const input = resolve(inputArg);
const output = resolve(outputArg);
if (input === output) throw new Error('Eingabe und Ausgabe müssen getrennte Dateien sein');
if (existsSync(output)) throw new Error(`Ausgabedatei existiert bereits: ${output}`);
const payload = JSON.parse(readFileSync(input, 'utf8'));
if (!payload || typeof payload !== 'object' || !payload.data) {
  throw new Error('Importpayload ungültig');
}
const migrated = migratePayloadToV3(payload, {
  installationId: optionValue('--installation-id', 'offline-import'),
  contentVersion: 'pre-v3',
  competencyIdsByExercise: new Map(),
  nowIso: payload.exportedAt || new Date().toISOString(),
});
const validation = validateImportPayload(migrated);
if (!validation.ok) throw new Error(`Migriertes Payload ungültig: ${validation.errors.slice(0, 3).join(' ')}`);
writeFileSync(output, JSON.stringify(migrated, null, 2) + '\n');
console.log(`Schema-3-Export geschrieben: ${output} (${migrated.data.attempts.length} Ereignisse)`);

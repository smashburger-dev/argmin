// Lists case x profile combinations with fewer than 10 distinct instances over seeds 0..199.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = new URL('..', import.meta.url).pathname;
const docs = readdirSync(join(root, 'content/families')).filter((n) => n.endsWith('.json')).sort()
  .map((n) => JSON.parse(readFileSync(join(root, 'content/families', n), 'utf8')));
for (const d of docs) registerStaticCases(d.familyId, d.cases);
const registry = configureExerciseFamilies(docs);
const rows = [];
for (const d of docs) {
  let fam; try { fam = registry.get(d.familyId); } catch { continue; }
  for (const ct of fam.caseTypes) {
    for (const diff of fam.difficultyProfiles) {
      const seen = new Set(); let ok = 0;
      for (let seed = 0; seed < 200; seed++) {
        try {
          const i = registry.instantiate(d.familyId, seed, diff, ct.caseId);
          seen.add(JSON.stringify([i.prompt, i.parameters, i.expectedAnswer]));
          ok++;
        } catch { }
      }
      if (ok === 0) continue;
      rows.push({ familyId: d.familyId, caseId: ct.caseId, diff, distinct: seen.size, ok });
    }
  }
}
rows.sort((a, b) => a.distinct - b.distinct);
for (const r of rows.filter((r) => r.distinct < 10)) console.log(`${r.distinct}\t${r.familyId}\t${r.caseId}\t${r.diff}`);
console.log('total rows', rows.length, 'low(<40)', rows.filter((r) => r.distinct < 40).length, 'static(1)', rows.filter((r) => r.distinct === 1).length);

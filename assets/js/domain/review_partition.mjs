// Review-queue partition for retired exercise definitions. Definitions can
// leave the catalog (content retirement) while their review-queue entries
// and attempt history persist in IndexedDB. This module is deliberately
// presentation-only: entries are never dropped, rewritten, or filtered out
// of exports — they are only split so views can link executable reviews and
// render archived ones without a dead exercise route.

/** Split due-review entries into `executable` (definition id still present
 *  in the current catalog) and `archived` (definition id unknown to the
 *  catalog). `knownDefinitionIds` accepts any iterable of ids (array, Set,
 *  Map#keys). Entries pass through unchanged and keep their relative order
 *  within each group. */
export function partitionReviewQueue(entries, knownDefinitionIds) {
  const known = new Set(knownDefinitionIds ?? []);
  const executable = [];
  const archived = [];
  for (const entry of entries ?? []) {
    if (entry && known.has(entry.exerciseId)) executable.push(entry);
    else archived.push(entry);
  }
  return { executable, archived };
}

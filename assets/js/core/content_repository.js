// ContentRepository: fetches and caches the versioned content JSON files,
// with basic structural checks (schemaVersion, ids, referential integrity
// where cheap). Deep validation lives in tools/validate_content.mjs.

const cache = new Map();

async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Content nicht ladbar: ${path} (${res.status})`);
  const json = await res.json();
  if (!json.schemaVersion) throw new Error(`${path}: schemaVersion fehlt`);
  cache.set(path, json);
  return json;
}

// Exercise-definition files are per-definition documents without a bundle
// schemaVersion; they are validated by tools/validate_content.mjs instead.
async function fetchDefinitionJson(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Content nicht ladbar: ${path} (${res.status})`);
  const json = await res.json();
  if (!json || typeof json.definitionId !== 'string') throw new Error(`${path}: definitionId fehlt`);
  cache.set(path, json);
  return json;
}

export class ContentRepository {
  curriculum() { return fetchJson('content/curriculum.json'); }
  sources() { return fetchJson('content/sources.json'); }
  catalog() { return fetchJson('content/catalog.json'); }
  async competencies() {
    const catalog = await this.catalog();
    const files = await Promise.all((catalog.competencyFiles || []).map((path) => fetchJson(`content/${path}`)));
    return files.flatMap((file) => file.competencies);
  }
  async tracks() {
    const catalog = await this.catalog();
    const files = await Promise.all((catalog.trackFiles || []).map((path) => fetchJson(`content/${path}`)));
    return files.flatMap((file) => file.tracks);
  }
  async milestones() {
    const catalog = await this.catalog();
    const files = await Promise.all((catalog.milestoneFiles || []).map((path) => fetchJson(`content/${path}`)));
    return files.flatMap((file) => file.milestones);
  }
  async lessons() {
    const catalog = await this.catalog();
    return Promise.all((catalog.lessonFiles || []).map((path) => fetchJson(`content/${path}`)));
  }
  async projects() {
    const catalog = await this.catalog();
    return Promise.all((catalog.projectFiles || []).map((path) => fetchJson(`content/${path}`)));
  }
  async exercisesForWeek(weekId) {
    const all = await fetchJson(`content/exercises/${weekId}.json`);
    return all.exercises;
  }
  /** One competency-catalog exercise definition by id (the f-* fresh-instance
   *  families live here, not in the legacy week packs). Cached like every
   *  other content fetch; returns null when the id is unknown. */
  async exerciseDefinition(definitionId) {
    const catalog = await this.catalog();
    const files = await Promise.all((catalog.exerciseDefinitionFiles || []).map((path) => fetchDefinitionJson(`content/${path}`)));
    return files.find((file) => file.definitionId === definitionId) || null;
  }
  async week(number) {
    const c = await this.curriculum();
    return c.weeks.find((w) => w.number === number) || null;
  }
  async phaseOf(week) {
    const c = await this.curriculum();
    return c.phases.find((p) => p.phaseId === week.phaseId) || null;
  }
  async sourceById(id) {
    const s = await this.sources();
    return s.sources.find((x) => x.sourceId === id) || null;
  }
}

export const content = new ContentRepository();

// ProgressStore: IndexedDB persistence for weeks, attempts, journal,
// settings and meta.
//
// schemaVersion 3 is the only in-app import form. Existing attempt records
// are normalized after the IndexedDB version upgrade; `reviewQueue` remains
// a derived cache and is rebuilt from those records. Offline v1/v2 JSON
// files are converted with tools/migrate_attempts_v3.mjs, not imported here.

import { buildReviewQueueEntries, buildReviewQueueEntry, resolveReviewParams } from './review_scheduler.js';
import { migratePayloadToV3, normalizeAttemptV3 } from './progress_migration.mjs';

export const SCHEMA_VERSION = 3;
const DB_NAME = 'ki-lernplattform';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('weeks')) db.createObjectStore('weeks', { keyPath: 'weekId' });
      const attempts = db.objectStoreNames.contains('attempts')
        ? req.transaction.objectStore('attempts')
        : db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
      if (!attempts.indexNames.contains('exerciseId')) attempts.createIndex('exerciseId', 'exerciseId');
      if (!attempts.indexNames.contains('eventId')) attempts.createIndex('eventId', 'eventId', { unique: true });
      if (!attempts.indexNames.contains('activityId')) attempts.createIndex('activityId', 'activityId');
      if (!attempts.indexNames.contains('competencyIds')) attempts.createIndex('competencyIds', 'competencyIds', { multiEntry: true });
      if (!db.objectStoreNames.contains('journal')) db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      if (!db.objectStoreNames.contains('reviewQueue')) {
        const rq = db.createObjectStore('reviewQueue', { keyPath: 'exerciseId' });
        rq.createIndex('nextDueAt', 'nextDueAt');
      }
      if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'planId' });
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'activityId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cursorAll(db, store, mode = 'readonly') {
  return new Promise((resolve, reject) => {
    const out = [];
    const t = db.transaction(store, mode);
    t.objectStore(store).openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (c) { out.push(c.value); c.continue(); } else resolve(out);
    };
    t.onerror = () => reject(t.error);
  });
}

/** Rebuild reviewQueue once for the active schema-3 scheduling policy. */
async function backfillReviewQueue(db) {
  try {
    const flag = await reqAsPromise(db.transaction('meta').objectStore('meta').get('reviewQueuePolicyV3'));
    if (flag) return db;
    const all = await cursorAll(db, 'attempts');
    const entries = buildReviewQueueEntries(all, Date.now());
    await new Promise((resolve, reject) => {
      const t = db.transaction(['reviewQueue', 'meta'], 'readwrite');
      const rq = t.objectStore('reviewQueue');
      rq.clear();
      for (const e of entries) rq.put(e);
      t.objectStore('meta').put({ k: 'reviewQueuePolicyV3', v: { at: new Date().toISOString(), entries: entries.length } });
      t.oncomplete = resolve; t.onerror = () => reject(t.error);
    });
  } catch (e) {
    // Backfill is a cache rebuild; failure must never block app startup.
    console.error('reviewQueue backfill failed', e);
  }
  return db;
}

function createId(prefix) {
  const value = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

async function ensureInstallationId(db) {
  let installation = await reqAsPromise(db.transaction('meta').objectStore('meta').get('installationId'));
  if (!installation?.v) {
    installation = { k: 'installationId', v: createId('installation') };
    await reqAsPromise(db.transaction('meta', 'readwrite').objectStore('meta').put(installation));
  }
  return installation.v;
}

// Fetched only once real attempts need normalizing; memoized per page load
// so a fresh learner's cold start issues no progress-store content requests.
let contentContextMemo = null;
async function loadContentContext() {
  if (!contentContextMemo) {
    contentContextMemo = (async () => {
      const [mappingResponse, catalogResponse] = await Promise.all([
        fetch('content/legacy/exercise-competency-map.json'),
        fetch('content/catalog.json'),
      ]);
      if (!mappingResponse.ok || !catalogResponse.ok) throw new Error('Progress-Migrationskontext nicht ladbar');
      const [mapping, catalog] = await Promise.all([mappingResponse.json(), catalogResponse.json()]);
      return {
        contentVersion: `catalog:${catalog.version}`,
        competencyIdsByExercise: new Map(mapping.exercises.map((item) => [item.exerciseId, item.competencyIds])),
      };
    })();
    // A transient fetch failure must not poison the session: drop the
    // rejected promise so the next write retries instead of failing forever.
    contentContextMemo.catch(() => { contentContextMemo = null; });
  }
  return contentContextMemo;
}

async function buildProgressContext(db) {
  const installationId = await ensureInstallationId(db);
  const { contentVersion, competencyIdsByExercise } = await loadContentContext();
  return { installationId, contentVersion, competencyIdsByExercise };
}

async function migrateAttemptRecords(db) {
  const flag = await reqAsPromise(db.transaction('meta').objectStore('meta').get('attemptEventsV3Migrated'));
  if (flag) return;
  const attempts = await cursorAll(db, 'attempts');
  const nowIso = new Date().toISOString();
  if (!attempts.length) {
    // Fresh database: write the flag without the migration content fetches.
    await reqAsPromise(db.transaction('meta', 'readwrite').objectStore('meta').put({ k: 'attemptEventsV3Migrated', v: { at: nowIso, attempts: 0 } }));
    return;
  }
  try {
    const context = await buildProgressContext(db);
    const normalized = attempts.map((attempt, ordinal) => normalizeAttemptV3(attempt, {
      ...context, contentVersion: 'pre-v3', nowIso, ordinal,
    }));
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['attempts', 'meta'], 'readwrite');
      const store = transaction.objectStore('attempts');
      for (const attempt of normalized) store.put(attempt);
      transaction.objectStore('meta').put({ k: 'attemptEventsV3Migrated', v: { at: nowIso, attempts: normalized.length } });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    // A failed content fetch must never take the whole store down (reads and
    // export would die with dbPromise). Log like backfillReviewQueue; the
    // missing flag makes the next load retry the migration.
    console.error('attempt migration failed', error);
  }
}

async function initializeDB() {
  const db = await openDB();
  await migrateAttemptRecords(db);
  await backfillReviewQueue(db);
  return { db };
}

function tx(dbPromise, store, mode, fn) {
  return dbPromise.then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    // For readonly get() calls resolve with the request result directly
    // (undefined on miss); never leak the request object itself.
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
  }));
}

// --- import validation --------------------------------------------------------
// Minimal structural contract per store: every store must be present as an
// array, every record a plain object, key paths well-formed. A payload that
// fails any rule is rejected as a whole (fail-closed, no partial writes).

const WEEK_ID_RE = /^w\d{2}$/;
const ACTIVITY_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

const STORE_VALIDATORS = {
  weeks: {
    key: 'weekId',
    valid: (r) => WEEK_ID_RE.test(r.weekId),
    keyError: 'weekId muss der Form wNN entsprechen',
  },
  attempts: {
    key: 'exerciseId',
    valid: (r) => ACTIVITY_ID_RE.test(r.exerciseId) && typeof r.correct === 'boolean',
    keyError: 'exerciseId muss eine stabile Aktivitäts-ID sein und correct boolean sein',
  },
  journal: { key: null, valid: () => true, keyError: '' },
  settings: {
    key: 'key',
    valid: (r) => typeof r.key === 'string' && r.key.length > 0,
    keyError: 'key muss ein nichtleerer String sein',
  },
  meta: {
    key: 'k',
    valid: (r) => typeof r.k === 'string' && r.k.length > 0,
    keyError: 'k muss ein nichtleerer String sein',
  },
  reviewQueue: {
    key: 'exerciseId',
    valid: (r) => ACTIVITY_ID_RE.test(r.exerciseId),
    keyError: 'exerciseId muss eine stabile Aktivitäts-ID sein',
  },
  plans: {
    key: 'planId',
    valid: (r) => typeof r.planId === 'string' && r.planId.length > 0,
    keyError: 'planId muss ein nichtleerer String sein',
  },
  drafts: {
    key: 'activityId',
    valid: (r) => typeof r.activityId === 'string' && r.activityId.length > 0,
    keyError: 'activityId muss ein nichtleerer String sein',
  },
};

const SUPPORTED_SCHEMA_VERSIONS = [SCHEMA_VERSION];

/** Full payload check without side effects. Returns { ok, errors }. */
export function validateImportPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['Payload ist kein Objekt.'] };
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(payload.schemaVersion)) {
    errors.push(`Unbekannte schemaVersion ${JSON.stringify(payload.schemaVersion) ?? 'fehlt'} — erwartet ${SUPPORTED_SCHEMA_VERSIONS.join(' oder ')}.`);
  }
  const data = payload.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('data fehlt oder ist kein Objekt.');
    return { ok: false, errors };
  }
  const optionalStores = new Set(['reviewQueue']);
  const eventIds = new Set();
  for (const [store, spec] of Object.entries(STORE_VALIDATORS)) {
    const rows = data[store];
    if (rows === undefined && optionalStores.has(store)) continue;
    if (!Array.isArray(rows)) {
      errors.push(`Store ${store} fehlt oder ist kein Array (gefunden: ${rows === undefined ? 'undefiniert' : typeof rows}).`);
      continue;
    }
    rows.forEach((r, i) => {
      if (typeof r !== 'object' || r === null || Array.isArray(r)) {
        errors.push(`${store}[${i}] ist kein Objekt.`);
        return;
      }
      if (store === 'attempts' && payload.schemaVersion === 3) {
        if (typeof r.eventId !== 'string' || !r.eventId) {
          errors.push(`attempts[${i}]: eventId fehlt.`);
        } else if (eventIds.has(r.eventId)) {
          errors.push(`attempts[${i}]: doppelte eventId ${r.eventId}.`);
        } else {
          eventIds.add(r.eventId);
        }
        if (typeof r.installationId !== 'string' || !r.installationId) errors.push(`attempts[${i}]: installationId fehlt.`);
        if (typeof r.activityId !== 'string' || !r.activityId) errors.push(`attempts[${i}]: activityId fehlt.`);
        if (typeof r.activityVersion !== 'string' || !r.activityVersion) errors.push(`attempts[${i}]: activityVersion fehlt.`);
        if (typeof r.definitionId !== 'string' || !r.definitionId) errors.push(`attempts[${i}]: definitionId fehlt.`);
        if (typeof r.instanceId !== 'string' || !r.instanceId) errors.push(`attempts[${i}]: instanceId fehlt.`);
        if (typeof r.cycleId !== 'string' || !r.cycleId) errors.push(`attempts[${i}]: cycleId fehlt.`);
        if (typeof r.eventType !== 'string' || !r.eventType) errors.push(`attempts[${i}]: eventType fehlt.`);
        if (!Array.isArray(r.competencyIds)) errors.push(`attempts[${i}]: competencyIds muss ein Array sein.`);
        if (typeof r.contentVersion !== 'string' || !r.contentVersion) errors.push(`attempts[${i}]: contentVersion fehlt.`);
        if (!Number.isFinite(Date.parse(r.occurredAt))) errors.push(`attempts[${i}]: occurredAt ist ungültig.`);
        if (!Number.isFinite(Date.parse(r.recordedAt))) errors.push(`attempts[${i}]: recordedAt ist ungültig.`);
        if (r.ts !== undefined && !Number.isFinite(Date.parse(r.ts))) errors.push(`attempts[${i}]: ts ist ungültig.`);
        if (typeof r.evidenceEligible !== 'boolean') errors.push(`attempts[${i}]: evidenceEligible muss boolean sein.`);
        if (r.exclusionCode !== null && typeof r.exclusionCode !== 'string') errors.push(`attempts[${i}]: exclusionCode ist ungültig.`);
      }
      if (spec.key === null) return;
      if (typeof r[spec.key] !== 'string' || r[spec.key].length === 0) {
        errors.push(`${store}[${i}]: Schlüssel ${spec.key} fehlt. ${spec.keyError}.`);
      } else if (!spec.valid(r)) {
        errors.push(`${store}[${i}]: Datensatz ungültig. ${spec.keyError}.`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

export class ProgressStore {
  constructor() {
    const initialized = initializeDB();
    this.dbPromise = initialized.then(({ db }) => db);
    // Context loads lazily on first write; reads never need it.
    this.contextPromise = null;
  }

  getContext() {
    if (!this.contextPromise) {
      this.contextPromise = this.dbPromise.then((db) => buildProgressContext(db));
      this.contextPromise.catch(() => { this.contextPromise = null; });
    }
    return this.contextPromise;
  }

  /** ADR-0008: decay parameters are configurable — defaults from the
   *  scheduler constant, partially overridable via settings key
   *  `reviewParams` (invalid parts fall back to defaults). */
  async activeReviewParams() {
    try {
      return resolveReviewParams(await this.getSetting('reviewParams'));
    } catch { return resolveReviewParams(null); }
  }

  /** Recompute the reviewQueue record for one exercise from its attempts. */
  async refreshReviewEntry(exerciseId) {
    const [attempts, params] = await Promise.all([
      this.attemptsFor(exerciseId), this.activeReviewParams(),
    ]);
    const entry = buildReviewQueueEntry(exerciseId, attempts, Date.now(), params);
    const db = await this.dbPromise;
    await new Promise((resolve, reject) => {
      const t = db.transaction('reviewQueue', 'readwrite');
      const s = t.objectStore('reviewQueue');
      if (entry) s.put(entry); else s.delete(exerciseId);
      t.oncomplete = resolve; t.onerror = () => reject(t.error);
    });
    return entry;
  }

  async rebuildReviewQueue() {
    const [attempts, params] = await Promise.all([this.allOf('attempts'), this.activeReviewParams()]);
    const entries = buildReviewQueueEntries(attempts, Date.now(), params);
    const db = await this.dbPromise;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('reviewQueue', 'readwrite');
      const store = transaction.objectStore('reviewQueue');
      store.clear();
      for (const entry of entries) store.put(entry);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return entries;
  }

  // --- meta / settings ----------------------------------------------------
  getMeta(k) { return tx(this.dbPromise, 'meta', 'readonly', (s) => s.get(k)); }
  setMeta(k, v) { return tx(this.dbPromise, 'meta', 'readwrite', (s) => s.put({ k, v })); }
  getSetting(key) { return tx(this.dbPromise, 'settings', 'readonly', (s) => s.get(key)).then((r) => r && r.value); }
  setSetting(key, value) { return tx(this.dbPromise, 'settings', 'readwrite', (s) => s.put({ key, value })); }

  getDraft(activityId) { return tx(this.dbPromise, 'drafts', 'readonly', (s) => s.get(activityId)); }
  saveDraft(draft) { return tx(this.dbPromise, 'drafts', 'readwrite', (s) => s.put({ ...draft, updatedAt: new Date().toISOString() })); }
  savePlan(plan) { return tx(this.dbPromise, 'plans', 'readwrite', (s) => s.put({ ...plan, updatedAt: new Date().toISOString() })); }
  plans() { return this.allOf('plans'); }
  async getOrCreateCycle(activityId) {
    const draft = await this.getDraft(activityId);
    if (draft?.cycleId) return draft.cycleId;
    const attempts = await this.attemptsFor(activityId);
    const cycleId = attempts.at(-1)?.cycleId || createId('cycle');
    await this.saveDraft({ ...(draft || {}), activityId, cycleId });
    return cycleId;
  }
  async startExerciseCycle(activityId) {
    const draft = await this.getDraft(activityId);
    const cycleId = createId('cycle');
    await this.saveDraft({ ...(draft || {}), activityId, cycleId });
    return cycleId;
  }

  // --- weeks ---------------------------------------------------------------
  async markWeekSelf(weekId, selfMarked) {
    const rec = (await tx(this.dbPromise, 'weeks', 'readonly', (s) => s.get(weekId))) || { weekId };
    rec.selfMarked = selfMarked;
    if (selfMarked) rec.markedAt = new Date().toISOString();
    return tx(this.dbPromise, 'weeks', 'readwrite', (s) => s.put(rec));
  }
  async getWeek(weekId) { return tx(this.dbPromise, 'weeks', 'readonly', (s) => s.get(weekId)); }
  async allWeeks() {
    return new Promise(async (resolve) => {
      const db = await this.dbPromise;
      const out = [];
      db.transaction('weeks').objectStore('weeks').openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); } else resolve(out);
      };
    });
  }

  // --- attempts -------------------------------------------------------------
  async addAttempt(attempt) {
    const context = await this.getContext();
    const nowIso = new Date().toISOString();
    const rec = normalizeAttemptV3({
      ...attempt,
      eventId: attempt.eventId || createId('event'),
      installationId: context.installationId,
      occurredAt: attempt.occurredAt || nowIso,
      recordedAt: nowIso,
      ts: attempt.ts || attempt.occurredAt || nowIso,
    }, { ...context, nowIso });
    const ev = await new Promise(async (resolve, reject) => {
      const db = await this.dbPromise;
      const r = db.transaction('attempts', 'readwrite').objectStore('attempts').add(rec);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try { await this.refreshReviewEntry(rec.exerciseId); } catch (e) { console.error('reviewQueue refresh failed', e); }
    return ev;
  }
  async attemptsFor(exerciseId) {
    return new Promise(async (resolve) => {
      const db = await this.dbPromise;
      const out = [];
      db.transaction('attempts').objectStore('attempts').index('exerciseId').openCursor(exerciseId).onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); } else resolve(out);
      };
    });
  }

  // --- journal ---------------------------------------------------------------
  addJournalEntry(entry) {
    return tx(this.dbPromise, 'journal', 'readwrite', (s) => s.add({ ...entry, ts: new Date().toISOString() }));
  }
  async journal() {
    return new Promise(async (resolve) => {
      const db = await this.dbPromise;
      const out = [];
      db.transaction('journal').objectStore('journal').openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); } else resolve(out);
      };
    });
  }

  // --- reviewQueue (derived schedule cache, ADR-0008) -------------------------
  reviewQueueAll() { return this.allOf('reviewQueue'); }
  /** Entries whose nextDueAt has passed — the review list of the week view. */
  async dueReviews(nowIso = new Date().toISOString()) {
    const all = await this.allOf('reviewQueue');
    return all
      .filter((r) => typeof r.nextDueAt === 'string' && r.nextDueAt <= nowIso)
      .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt));
  }

  // --- export / import / reset ----------------------------------------------
  async exportAll() {
    const [weeks, attempts, journal, settings, meta, reviewQueue, plans, drafts] = await Promise.all([
      this.allWeeks(), this.allOf('attempts'), this.journal(), this.allOf('settings'),
      this.allOf('meta'), this.allOf('reviewQueue'), this.allOf('plans'), this.allOf('drafts'),
    ]);
    return {
      schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
      data: { weeks, attempts, journal, settings, meta, reviewQueue, plans, drafts },
    };
  }
  allOf(store) {
    return new Promise(async (resolve) => {
      const db = await this.dbPromise;
      const out = [];
      db.transaction(store).objectStore(store).openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); } else resolve(out);
      };
    });
  }
  /** Validate before opening one atomic replacement transaction. Only
   *  schema 3 is accepted in-app; reviewQueue is always re-derived. */
  async importAll(payload) {
    const { ok, errors } = validateImportPayload(payload);
    if (!ok) {
      throw new Error('Import abgelehnt: ' + errors.slice(0, 3).join(' ')
        + (errors.length > 3 ? ` (+${errors.length - 3} weitere)` : ''));
    }
    const [db, context] = await Promise.all([this.dbPromise, this.getContext()]);
    const nowIso = new Date().toISOString();
    const migrated = migratePayloadToV3(payload, { ...context, nowIso });
    const { weeks, attempts, journal, settings, plans, drafts } = migrated.data;
    const meta = migrated.data.meta.filter((record) => !['installationId', 'attemptEventsV3Migrated', 'reviewQueuePolicyV3'].includes(record.k));
    meta.push(
      { k: 'installationId', v: context.installationId },
      { k: 'attemptEventsV3Migrated', v: { at: nowIso, attempts: attempts.length } },
      { k: 'reviewQueuePolicyV3', v: { at: nowIso } },
    );
    // Derive the queue with the reviewParams the import itself carries (or
    // defaults) — the same resolution rebuildReviewQueue applies, so a
    // configured [4, 8, 16] ladder survives an import.
    const importedParams = resolveReviewParams((settings.find((s) => s && s.key === 'reviewParams') || {}).value);
    const derivedQueue = buildReviewQueueEntries(attempts, Date.now(), importedParams);
    await new Promise((resolve, reject) => {
      const stores = ['weeks', 'attempts', 'journal', 'settings', 'meta', 'reviewQueue', 'plans', 'drafts'];
      const transaction = db.transaction(stores, 'readwrite');
      for (const [store, rows] of [
        ['weeks', weeks], ['attempts', attempts], ['journal', journal], ['settings', settings],
        ['meta', meta], ['plans', plans], ['drafts', drafts], ['reviewQueue', derivedQueue],
      ]) {
        const target = transaction.objectStore(store);
        target.clear();
        for (const row of rows) target.put(row);
      }
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return true;
  }
  async resetExercise(exerciseId) {
    const db = await this.dbPromise;
    await new Promise((resolve, reject) => {
      const t = db.transaction(['attempts', 'reviewQueue', 'drafts'], 'readwrite');
      const idx = t.objectStore('attempts').index('exerciseId');
      idx.openCursor(exerciseId).onsuccess = (e) => {
        const c = e.target.result;
        if (c) { c.delete(); c.continue(); }
      };
      t.objectStore('reviewQueue').delete(exerciseId);
      t.objectStore('drafts').delete(exerciseId);
      t.oncomplete = resolve; t.onerror = () => reject(t.error);
    });
  }
  async resetWeek(weekId) {
    await tx(this.dbPromise, 'weeks', 'readwrite', (s) => s.delete(weekId));
  }
}

// Null in non-browser environments (Node tests import this module for the
// class definition only).
export const progress = typeof indexedDB !== 'undefined' ? new ProgressStore() : null;

# S3B: LearningLedger

Stand: 2026-09-03. Nach S3A-Commit `6316689` (`share event qualification in one LearningPolicy`).

## Completed

Genau ein Builder, genau ein Schreibpfad.

- `assets/js/domain/learning_event.mjs`: `buildInstanceId`, `buildLearningEvent`, `isJournalWorthy`, `journalFromAttempts`
- `assets/js/core/learning_ledger.mjs`: `append(event)` mit injiziertem Sink, `record()` holt den Cycle, `evaluateLearningState()` komponiert Review- plus Evidence-Projektion
- Adapter (`exercise-session`, `python-workspace`, `project-session`) bauen weder Cycle noch Instance
- Unbenutzte `ExerciseRuntime`-Klasse gelöscht; `masteryFromAttempts` unverändert
- In-App-Import nur noch schema 3. `migrateLegacyLocalStorage` / `LEGACY_LS_KEY` entfernt (kein Produktions-Caller). Offline-Tool `tools/migrate_attempts_v3.mjs` wandelt v1/v2 weiter nach schema 3
- Journal-Store unangetastet. Dual-Write liegt nur noch im Ledger

Gates: Contract 12/12, Node 910 pass / 1 skip, `tsc --noEmit` grün, `build:release` grün (JS 77.1 KiB gzip). Chromium-E2E: IndexedDB-v1→v3, Journal, Attempt, Projekt, Worked Example.

## Decisions

1. `evaluate()` am Snapshot (`loadProgressSnapshot` → `evaluateLearningState`), nicht in `learning_policy.mjs`. Policy bleibt frei von Engine-Imports.
2. Journal bleibt Store. Keine Schema-Migration. Gegenbeweis zur reinen Ableitung: `resetExercise` löscht Attempts, nicht Journal; v3-Import trägt Journal unabhängig; `id` kommt vom Store.
3. Direkter v1/v2-JSON-Import entfällt. IndexedDB-Upgrade v1→v3 bleibt. Offline-Tool bleibt der Weg für alte Dateien.
4. Projekt-Instance-ID ist dasselbe Triple mit Seed 0 (`id:cycle:0`), nicht mehr `id:cycle`.

## Open

- Content-Finding `research-fresh-window` in `content/reviews/core.json` beschreibt noch den alten Zwei-Teil-Evidence-Fallback. Nicht in S3B geändert (Content-Hash). Auflage für S4B.
- `masteryFromAttempts` bleibt in `exercise_runtime.js` (S4).
- Hosted Sink nicht gebaut.
- S3B-Commit und Push brauchen Noas Ja.
- `research/streamlining/s4a-v2/noa-decisions.md` ist lokal dirty (S3A-Freigaben) und gehört nicht in den S3B-Commit.

## Next session start

```bash
cd /Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform
git log -1 --oneline
node --test tests/learning_ledger.test.mjs tests/progress_v3.test.mjs
```

S4B nicht beginnen, bis Noa S3B committet und S4B freigibt.

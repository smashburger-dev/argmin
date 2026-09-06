# S3A: LearningPolicy

Stand: 2026-09-03. Nach S2B-Commit `af9ea13`.

## Completed

Eine gemeinsame Qualifikation, zwei Projektionen.

- `assets/js/domain/learning_policy.mjs`: `instanceKey`, `eventTimeMs`, `isSolutionReveal`, `isQualifiedHit`, `clampMaxHints`, `MASTERY_MAX_HINTS`
- `review_scheduler.js` und `evidence_engine.mjs` importieren das Modul und parsen Identity/Zeit/Hints/Reveal nicht mehr selbst
- Contract plus Differentials: `tests/learning_policy.test.mjs`
- Alte Predicate-Tests in Scheduler/Group D gelöscht, nicht als zweite Schicht belassen
- Allowlist: `tools/build_public.mjs`, `tools/export_open_core.mjs`

Node: 898 pass, 1 skip. Typecheck grün. Kein E2E, kein `build:release`. Keine UI-Änderung.

## Decisions

1. `occurredAt` first, then `ts`. Garbage skipped. Review falls back to `nowMs`. Evidence drops the event.
2. `instanceId` wins. Fallback is definition (or `exerciseId`), cycle (`legacy`), seed (`0`). Same triple as `buildInstanceId`.
3. Hint cap is 1. Settings and the Evidence constructor cannot raise it. `0` stays valid (stricter).
4. Reveal is `revealedSolution` or `eventType === 'solution-revealed'`. Per instance only.
5. No combined `evaluate()` wrapper. It would import both engines and cycle into the policy module. Call sites keep calling the two engines.
6. `content/reviews/core.json` finding `research-fresh-window` still names the old two-part Evidence fallback. Left untouched so the content hash and `build-next` stay current. Update on a later content compile.

## Open

S3B: one event builder and write path. `appendLearningEvent` still talks to IndexedDB. Do not fold that into the policy module.

Live v3 attempts already carry `instanceId`. The fallback change only hits records without it.

## Next session start

```bash
cd /Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform
git log -1 --oneline
node --test tests/learning_policy.test.mjs
```

S3B startprompt is in `docs/streamlining-umbauplan.md`. Inventory every recorder first. One builder. Do not drop v3 attempts. Journal schema stays until a tested migration.

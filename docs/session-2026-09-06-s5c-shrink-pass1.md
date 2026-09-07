# S5C shrink pass 1

Branch: `devin/1788740336-s5c-shrink-pass1`  
Base: `devin/1788739231-s5a-test-contracts` (`cb4fca8`)

## A. Confirmed dead code

| Item | Location | LOC delta | Coverage / evidence |
|---|---|---:|---|
| `DATA_ML_SEED_GENERATORS` | `assets/js/core/data_ml_generators.mjs` | −19 | Export-only; no imports |
| `genChunkCount` | `assets/js/core/w27_w30_generators.mjs` | −30 | Declaration-only |
| `instantiateTraceFamily`, `gradeTraceFamily` | `assets/js/domain/foundations_trace_registry.mjs` | −6 | Declaration-only; registry file remains live |
| `PLACEMENT_ROLES` | `assets/js/domain/learning_module.mjs` | −1 | Declaration-only |
| `checkPython` and unused imports | `src/adapters/python-workspace.ts` | −27 | Declaration-only |
| `loadCodeDraft`, `saveCodeDraft` | `src/adapters/local-progress.ts` | −12 | Declaration-only |
| `OBJECT_ROOT_KEYS`, `COLLECTION_ROOT_KEYS`, `PROJECT_ROOT_KEY` | `tools/content_roots.mjs` | net −4 | Declaration-only |
| `SHA256_HEX` | `tools/content_policy.mjs` | −3 | Declaration-only |
| `WORKSPACE_LIMITS` | `assets/js/runtime/workspace_protocol.mjs` | −6 | No test references |
| `activeExerciseCount` parameter | `assets/js/core/review_scheduler.js` | net −1 | Unused compatibility parameter; callers updated |

Group A commit delta: **10 added / 119 removed = −109 net LOC**. The
`readJson` movement was accidentally included in this commit; see Group B.

## B. Duplicate helpers

| Change | Location | LOC delta | Contract |
|---|---|---:|---|
| Share seeded RNG | `assets/js/core/w05_generators.mjs` imports and re-exports W01 `rng` | −8 net | W05 export remains byte-compatible |
| Share `readJson` | `tools/content_roots.mjs`, imported by `compile_content.mjs` and `project_release_files.mjs` | −3 net | Leaf module imports only `node:fs` and `node:path`; no cycle |

Group B requested changes were split across commits: RNG is in
`caf19a3`; `readJson` was included in Group A commit `0000aa8`.
Walkers and path helpers were not changed.

## C. Complexity refactors

Named predicates and solver functions are selected through lookup tables.
Static fallback behavior, generated values, output strings, object shapes,
and ordering remain unchanged.

| Function | Before | After | File LOC before → after | Existing coverage |
|---|---:|---:|---:|---|
| `profileAccepts` | 100 | 2 | included in `data_ml_families.mjs` 1129 → 1051 | family contract and golden corpus |
| `formula-ratio-percent-metric.solve` | 13 | 0 |  | family contract and golden corpus |
| `aggregate-confusion-metric.solve` branch | 11 | 1 |  | family contract and golden corpus |
| `formula-count-from-construction.solve` | 21 | 0 |  | family contract and golden corpus |
| `formula-stat-from-table.solve` | 15 | 0 |  | family contract and golden corpus |
| `assignmentProfileAccepts` | 15 | 3 | `foundations_trace_families.mjs` 1012 → 993 | trace family tests and golden corpus |
| `solveTraceAssignment` | 21 | 2 |  | trace family tests and golden corpus |
| `generateTraceAssignmentFamily` | 19 | 5 |  | trace family tests and golden corpus |
| `solveTraceException` | 11 | 1 |  | trace family tests and golden corpus |
| `familyHint` | 24 | 8 | `family_registry.mjs` 220 → 234 | `family_hints.test.mjs` |

The additional scan entry at `data_ml_families.mjs:399` was the
`aggregate-confusion-metric.solve` branch and was refactored through the
same case-table approach.

Group C file LOC delta: **−79 + −19 + +14 = −84 net LOC**.

## Runtime LOC

Measured with `find` over JavaScript/TypeScript source files and `wc -l`,
excluding tests, vendor, and build trees:

| Area | Before | After | Delta |
|---|---:|---:|---:|
| `assets/js` | 9,886 | 9,732 | −154 |
| `src` | 2,294 | 2,255 | −39 |
| `tools` | 2,143 | 2,136 | −7 |
| **Total** | **14,323** | **14,123** | **−200** |

The runtime total includes Groups A–C and this review compaction. Group A's
shared `readJson` movement and Group B's RNG change are therefore reflected
in the total.

## Verification

Targeted family and helper contracts:

```text
node --test tests/data_ml_families.test.mjs \
  tests/foundations_trace_families.test.mjs \
  tests/family_hints.test.mjs \
  tests/family_golden_corpus.test.mjs
47 passed
0 failed
```

The family golden corpus reported no changed family digest. The fixture
`tests/fixtures/family-golden-corpus.json` was untouched.

Full gates are run after this final source and digest edit:

```text
node --test tests/
npm run typecheck
npm run build:release
```

## D. Deferred scan findings

These remain intentionally out of scope for this pass, retaining the scan's
original locations and counts:

- UI components: `FamilyExerciseView` 26; `TraceTableView` 19; `AnswerControls`
  18; `App` 18; `FamilyExerciseView.submit` 18; `LessonView` 18;
  `ModuleView` 13; `SafeMarkup.renderNode` 12; `TraceTableView.submit` 12;
  `CompetencyView` 11.
- `compile_content.mjs`: `compileContent` 32;
  `validateTracksAndMilestones` 20; `validateToolsExplanationsProjects` 19;
  `buildFamilyActivities` 19; `validateProjectPackages` callback 17;
  `validateCompiledContent` 14.
- `progress_store.js`: import-payload row callback 36; `validateImportPayload`
  13; `openDB` upgrade callback 12.
- `progress_migration.mjs`: `normalizeAttemptV3` 21; `migratePayloadToV3` 14.
- Validators: `tools/validate_next_build.mjs:validateNextBuild` 30.
- Graders: `expectedNumeric` 13; `gradePair` 13; `gradeCodeTrace` 15;
  `gradeChoice` 12; `splitTopLevel` 11.
- `plan_engine.mjs:PlanEngine.build` 13.
- Pyodide: `pyodide_worker.mjs:run` 13;
  `tools/pyodide_contract_matrix.mjs:buildPyodideContractMatrix` 12.

No CSS, markup, validation, error handling, security, or public fail-closed
checks were changed.

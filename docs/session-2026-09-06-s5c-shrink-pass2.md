# S5C shrink pass 2

Branch: `devin/1788770230-s5c-shrink-pass2`  
Base: `origin/devin/1788706319-s4d8a-static-cases` (`48d67f2`)

## Refactors

Decision points use the Babel counter from the shrink scan: `if`, loops,
`case`, `catch`, conditional expressions, and `&&`/`||`/`??`.

| Function | Before | After | File/group LOC before → after | Coverage |
|---|---:|---:|---:|---|
| `expectedNumeric` | 13 | 8 | `graders.js` 468 → 479 | grader/family tests, golden corpus |
| `gradePair` | 13 | 9 |  | grader/family tests, golden corpus |
| `gradeCodeTrace` | 15 | 5 |  | code-trace tests, golden corpus |
| `gradeChoice` | 12 | 6 |  | choice tests, golden corpus |
| `splitTopLevel` | 11 | 5 |  | grader/family tests |
| `compileContent` | 32 | 4 | `compile_content.mjs` 629 → 629 | content/compiler tests |
| `validateTracksAndMilestones` | 20 | 8 |  | content/compiler tests |
| `validateToolsExplanationsProjects` | 19 | 3 |  | content/compiler tests |
| `buildFamilyActivities` | 19 | 5 |  | family contract tests |
| `validateProjectPackage` | 17 | 9 |  | project/content tests |
| `validateCompiledContent` | 14 | 9 |  | content/compiler tests |
| `validateNextBuild` | 30 | 9 | `validate_next_build.mjs` 107 → 108 | next-build validator tests |
| `PlanEngine.build` | 13 | 3 | `plan_engine.mjs` 83 → 81 | retention tests |
| `buildPyodideContractMatrix` | 12 | 6 | `pyodide_contract_matrix.mjs` 93 → 83 | Pyodide contract tests |
| `pyodide_worker.run` | 13 | 13 | `pyodide_worker.mjs` 236 → 236 | deferred |

The project-package checks, catalog loading, and one-shot validation
wrappers were compacted again without changing their diagnostics or order.
All changed functions remain below the eleven-point limit.

Commits:

```text
40314fc refactor(shrink): simplify grader dispatch
40a5ddf refactor(shrink): split content compiler stages
474a69d refactor(shrink): split next-build validation
2defc20 refactor(shrink): split plan construction stages
5cd12e1 refactor(shrink): split pyodide matrix stages
819f6a1 refactor(shrink): lower trace grader complexity
b48a390 refactor(shrink): split project package checks
```

No UI, CSS, markup, schemas, content JSON, IndexedDB persistence/migration,
grader semantics, validation contracts, error text, security checks, or
public fail-closed checks were removed.

## Runtime LOC

Measured over `assets/js`, `src`, and `tools` with the same command on both
trees:

```bash
find "$root/$area" -type f \
  \( -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' \) \
  -not -path '*/vendor/*' -not -path '*/node_modules/*' \
  -not -path '*/build*/*' -print0 | xargs -0 cat | wc -l
```

| Area | Base | Pass 2 | Delta |
|---|---:|---:|---:|
| `assets/js` | 9,732 | 9,741 | +9 |
| `src` | 2,245 | 2,245 | 0 |
| `tools` | 1,816 | 1,807 | −9 |
| **Total** | **13,793** | **13,793** | **0** |

The shared catalog tables, inlined one-shot wrappers, and compact helper
forms bring the runtime total back to the Base total without shortening
validation or error handling.

## Hash evidence

The content and family behavior hashes remain identical to
`/home/ubuntu/s5c2-baseline.txt`:

```text
.content-build/public/content-bundle.json
ceb71bdc1c7e1482668c52b9d6131a62199f56955c1507a8f8d6a8f346fa57c5

tests/fixtures/family-golden-corpus.json
b42c9a2080d8fb245545ba3f1eb98a8b827c256d254e34a76f135c841a62ebf0
```

The normalized release-tree formula used for the final comparison is:

```bash
cd build-next
find . -type f ! -name '*.js' ! -name '*.css' ! -name PUBLIC-BUILD.md \
  ! -name '*.map' ! -name index.html ! -name '*.mjs' \
  | sort | xargs sha256sum | sha256sum
```

Base and Pass 2 both produce:

```text
37651b6b6b815e3d3db9cd3419fd73af965dbc4e6f50d79b0bc0296803c81ad4
```

The earlier formula without the `.mjs` exclusion differed only because
`assets/js/domain/plan_engine.mjs` was included; the final comparison
excludes it explicitly.

## Validator negative checks

The compiler negative checks remained byte-identical between base and pass 2:

```text
missing-reference:
aggregate-confusion-metric:threshold-under-asymmetric-cost: unbekannte Kompetenz c-missing

duplicate-id:
Werkzeuge: fehlende oder doppelte ID t-browser-python-workspace

invalid-policy:
c-algebra-basics: ungueltige Evidence-Policy
```

## Deferred scope

- `src/ui/**`: UI rework scope; no UI complexity changes.
- `assets/js/core/progress_store.js`: IndexedDB contract requires a dedicated
  migration-tested pass.
- `assets/js/core/progress_migration.mjs`: migration contract requires the
  same dedicated pass.
- `assets/js/runtime/pyodide_worker.mjs:run`: retained unchanged because its
  setup/package/error/finalization flow is not a trivial guard-only extraction.
- No CSS, markup, schema, content, or public-fail-closed validator changes.

## Gates

Final gates:

```text
npm test: 383 passed, 0 failed, 0 skipped
npm run typecheck: passed
npm run build:release: passed (46 competencies, 46 lessons, 253 activities, 614 files)
node tools/validate_content.mjs --dir build-next: passed
npm run test:e2e -- --project=chromium: 30 passed, 14 skipped, 0 failed
git diff --check: passed
```

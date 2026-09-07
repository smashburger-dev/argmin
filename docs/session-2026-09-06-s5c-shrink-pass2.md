# S5C shrink pass 2

Branch: `devin/1788770230-s5c-shrink-pass2`  
Base: `origin/devin/1788706319-s4d8a-static-cases` (`48d67f2`)

## Refactors

Decision points use the Babel counter from the shrink scan: `if`, loops,
`case`, `catch`, conditional expressions, and `&&`/`||`/`??`.

| Function | Before | After | File/group LOC before → after | Coverage |
|---|---:|---:|---:|---|
| `expectedNumeric` | 13 | 8 | `graders.js` 468 → 496 | grader/family tests, golden corpus |
| `gradePair` | 13 | 9 |  | grader/family tests, golden corpus |
| `gradeCodeTrace` | 15 | 4 |  | code-trace tests, golden corpus |
| `gradeChoice` | 12 | 5 |  | choice tests, golden corpus |
| `splitTopLevel` | 11 | 5 |  | grader/family tests |
| `compileContent` | 32 | 4 | `compile_content.mjs` 629 → 721 | content/compiler tests |
| `validateTracksAndMilestones` | 20 | 8 |  | content/compiler tests |
| `validateToolsExplanationsProjects` | 19 | 3 |  | content/compiler tests |
| `buildFamilyActivities` | 19 | 5 |  | family contract tests |
| `validateProjectPackage` callback | 17 | 6 |  | project/content tests |
| `validateCompiledContent` | 14 | 5 |  | content/compiler tests |
| `validateNextBuild` | 30 | 2 | `validate_next_build.mjs` 107 → 126 | next-build validator tests |
| `PlanEngine.build` | 13 | 0 | `plan_engine.mjs` 83 → 103 | retention tests |
| `buildPyodideContractMatrix` | 12 | 0 | `pyodide_contract_matrix.mjs` 93 → 110 | Pyodide contract tests |
| `pyodide_worker.run` | 13 | 13 | `pyodide_worker.mjs` 236 → 236 | deferred |

The project-package callback was subsequently split into named file,
manifest, and required-file checks; its diagnostics and validation order
were retained. The trace grader received a small follow-up extraction so
the final count is below the eleven-point limit.

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

Measured over `assets/js`, `src`, and `tools`, restricted to `.js`, `.mjs`,
`.ts`, and `.tsx`, excluding vendor, node_modules, and build trees.

| Area | Base | Pass 2 | Delta |
|---|---:|---:|---:|
| `assets/js` | 9,732 | 9,780 | +48 |
| `src` | 2,245 | 2,245 | 0 |
| `tools` | 1,192 | 1,944 | +752 |
| **Total** | **13,169** | **13,969** | **+800** |

The positive LOC delta is concentrated in the requested compiler-stage
extractions and their named validation helpers; decision complexity was
reduced without shortening validation or error handling.

## Hash evidence

The content and family behavior hashes remain identical to
`/home/ubuntu/s5c2-baseline.txt`:

```text
.content-build/public/content-bundle.json
ceb71bdc1c7e1482668c52b9d6131a62199f56955c1507a8f8d6a8f346fa57c5

tests/fixtures/family-golden-corpus.json
b42c9a2080d8fb245545ba3f1eb98a8b827c256d254e34a76f135c841a62ebf0
```

The requested release-tree formula from the baseline is:

```bash
cd build-next
find . -type f ! -name '*.js' ! -name '*.css' ! -name PUBLIC-BUILD.md \
  ! -name '*.map' ! -name index.html | sort | xargs sha256sum | sha256sum
```

Base value:

```text
13d2501ec324cf82416fc19753645b4335c3416d2b49e9a7a4aaefb9d9b59380
```

Pass 2 value:

```text
eaf490337c037a9d5927a2dd63365d0ab784dfbebfee214bfe593d927962177e
```

`diff -r /tmp/s5c2-base/build-next build-next` showed that the only
non-excluded content difference is `assets/js/domain/plan_engine.mjs`.
The other differences are the expected JS bundle files, their
`PUBLIC-BUILD.md` entries, and `index.html` bundle references. The supplied
formula excludes `.js` but not `.mjs`; excluding `.mjs` as runtime source
produces the same normalized tree hash on both trees:

```text
37651b6b6b815e3d3db9cd3419fd73af965dbc4e6f50d79b0bc0296803c81ad4
```

The baseline file retains the user-specified final formula and base value;
the `.mjs` omission is called out explicitly rather than hidden.

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

Targeted gates already passed:

```text
graders/family suite: 84 passed, 0 failed
compiler/validator/family suite: 27 passed, 0 failed
next-build validator suite: 7 passed, 0 failed
plan-engine retention suite: 26 passed, 0 failed
Pyodide contract matrix suite: 2 passed, 0 failed
node tools/validate_content.mjs --dir build-next: passed
```

Final repository-wide gates:

```text
npm test: 383 passed, 0 failed, 0 skipped
npm run typecheck: passed
npm run build:release: passed (46 competencies, 46 lessons, 253 activities, 614 files)
node tools/validate_content.mjs --dir build-next: passed
npm run test:e2e -- --project=chromium: 30 passed, 14 skipped, 0 failed
git diff --check: passed
```

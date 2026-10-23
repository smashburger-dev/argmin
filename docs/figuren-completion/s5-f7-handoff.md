# S5b/F7 completion handoff

## Implemented

- S5b keeps separate `pca-shadow` and `kmeans-pizza` scenes in `l-ml-svm-pca`; the existing eigen-direction checkpoint and canonical k-Means trace remain in place.
- F3/F4 hints cover rank, solution-case, and determinant cases. `transform-rank-dependence-rowops` now uses an independent fixed matrix and a row operation that demonstrates a zero row without displaying a rank value.
- F7 uses fixed neighbor maps for the gradient update, symbolic SGD step, and a single three-form training-curve comparison. The curve hint applies identical parameters to every target case and shows Underfitting, Stabil, and Overfitting together. The update scene shows qualitative gradient and descent directions plus `w neu = ?`; the SGD hint keeps the update symbolic and contains no numeric weight output.
- `pick-learning-rate` retains the seeded, versioned grader, its multiple accepted eta values, executed-run feedback, and the independent qualitative loss neighbor.
- Seven trace-prefix mappings now point to CPython-derived records with exact source hashes, event targets, preceding states, and requested binding names. Only `sourceLines` and `priorCaptions` are projected.
- The completion gate preserves porcelain status leading spaces with `trimEnd()` so its protected-document exception matches Git output.

## Checks

- `node --test tests/figuren_s5b_f7.test.mjs`: 5 passed, 0 failed.
- F1 owns `tools/compile_content.mjs` and is rerunning the content compiler against the final hint map. The full release gate and browser acceptance remain with the parent coordinator.
- `docs/session-2026-10-16-figuren-recherche.md` was not edited or staged.

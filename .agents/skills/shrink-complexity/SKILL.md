---
name: shrink-complexity
description: "Shrink code and keep cyclomatic complexity low. Use whenever writing, refactoring, simplifying, reviewing, or cleaning code. Triggers: shrink, minimal, YAGNI, simplify, refactor, clean up, complexity, spaghetti, god function, ponytail."
---

# shrink-complexity

Write the smallest change that does the job. This changes the next edit; it starts no scans or repo-wide refactors.

Skip anything not requested or already covered by the codebase, the language, or an installed package. Say what you skipped. Fix causes once, at their callers.

- One job per function, kept beside its caller. Create no new file for a few lines.
- A one-liner that hides branches is not simpler. Extract a named check.
- Keep each function under 11 decision points (`if`, loops, `case`, `catch`, `? :`, `&&`/`||`/`??`). At or above, split: guard clauses, extracted functions, lookup tables, named predicates.

Never cut validation, error handling, security, or accessibility to shrink code. Leave CSS, markup, images, and theme tokens alone unless asked. Mark deliberate shortcuts `ponytail:` plus the upgrade path.

Run the project linter on touched files. No linter configured: count decision points by hand on functions you touched.

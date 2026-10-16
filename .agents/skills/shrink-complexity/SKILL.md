---
name: shrink-complexity
description: "Shrink code and keep cyclomatic complexity low. Use whenever writing, refactoring, simplifying, reviewing, or cleaning code. Triggers: shrink, minimal, YAGNI, simplify, refactor, clean up, complexity, spaghetti, god function, ponytail."
---

# shrink-complexity

Write the smallest change that does the job. This changes the next edit; it starts no scans or repo-wide refactors.

Skip anything not requested or already covered by the codebase, the language, or an installed package. Say what you skipped. Fix causes once, at their callers. Delete code your change made dead. Add no flags, shims, or options nobody asked for.

- One job per function, kept beside its caller. Create no new file for a few lines.
- Duplicate twice before abstracting. Extract on the third copy.
- A one-liner that hides branches is not simpler. Extract a named check.
- Keep each function at complexity 10 or less: start at 1, add 1 per `if`, loop, `case`, `catch`, `? :`, `&&`, `||`, `??`, `?.`, default value. Above that, use guard clauses and lookup tables first. Extract a function only when its name explains it without reading the body.

Never cut validation, error handling, security, accessibility, or tests to shrink code. Leave CSS, markup, images, and theme tokens alone unless asked. Mark deliberate shortcuts `ponytail:` plus the upgrade path.

Run the project linter on touched files. JS/TS without a linter: `bun lint -f agent --rule 'complexity: [error, 10]' <files>`. Otherwise count by hand.

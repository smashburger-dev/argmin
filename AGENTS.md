# KI-Lernplattform

## Product contract

- Maintain a local, German-language static learning platform whose canonical model is the competency and learning-module catalog.
- Keep runtime dependencies vendored. The application must not require a CDN at runtime.
- Keep learner progress local in IndexedDB and preserve documented migrations and JSON import/export.
- Treat deterministic graders and reference solvers as authoritative. An LLM is never an authoritative grader.
- Keep the public build fail-closed. Private sources, local overlays, non-allowlisted material, and runtimes without hashed license notices must not enter `build-public/`.

## Map

- Preact app shell and hash router: `index.html`, `src/`, `vite.config.ts`
- Persistence, grading, adapters, and repositories: `assets/js/core/`
- Pure competency, evidence, policy, diagnosis, planning, registry, and tutor logic: `assets/js/domain/`
- Pyodide worker and host runtime: `assets/js/runtime/`
- Public-first catalog, competencies, tracks, milestones, tools, reviews, coverage, modules, lessons, and families: `content/`
- JSON Schema 2020-12 content contracts: `schemas/`
- Architecture, licenses, dependencies, and authoring rules: `docs/`
- Build, audit, validation, and browser acceptance tools: `tools/`
- Node tests: `tests/`
- Vendored runtimes: `vendor/`
- Generated content-only public tree: `build-public/`
- Generated combined release candidate: `build-next/`

## Verification

```bash
node --test tests/
npm run coverage:check
npm run typecheck
npm run build:release
npm run test:e2e
npm run test:e2e:build
npm run test:project-runner
node tools/compile_content.mjs --profile public
node tools/validate_content.mjs
node tools/build_public.mjs
node tools/validate_content.mjs --dir build-public
```

- Match checks to the changed area. Content changes require content validation. Public-build changes require the build and leak test.
- Run the app with `npm run dev:next` or serve `build-next/` after `npm run build:release`. TypeScript sources will not run through `python3 -m http.server`.
- Browser behavior, IndexedDB migrations, review scheduling, and pilot flows require Playwright (`npm run test:e2e` / `npm run test:e2e:build`) or a manual browser check.

## Engineering

- Do not edit `build-public/` directly. Regenerate it with `tools/build_public.mjs`.
- Do not patch vendored runtimes casually. Update them through the existing vendoring workflow with pinned versions and hashes.
- Preserve the IndexedDB schema and migration path unless the change includes a tested migration.
- Keep learner-facing content in German. Use English for code identifiers and code comments.

## Skill routing

- Use `diagnosing-bugs` for worker failures, grader defects, IndexedDB migrations, test failures, and performance regressions.
- Use `animate` only for intentional learner-facing motion. Use `find-animation-opportunities` for a read-only motion scan.
- Suggest `/ui-ux-pro-max` for an explicit learning-interface, accessibility, or responsive-design review.
- Suggest `/monid` only for user-requested external source retrieval. Never make it a runtime dependency or an authoritative grader.

## Graphify

The project graph is `graphify-out/graph.json` relative to this directory.

- Use Graphify first for exact symbols, imports, calls, module ownership, architecture paths, and blast radius.
- Use targeted search and file reads first for visible copy, curriculum content, HTML, CSS, and literal data. Use Graphify after an exact identifier is known.
- Validate that seeds and `source_file` paths belong to `ki-lernplattform` before trusting a result.
- The code graph excludes `vendor/` and generated `build-public/` files.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- Treat the graph as stale after uncommitted code changes and update it only before another graph-dependent answer.

## Retrieval and cost workflow

- Clarify first if the request is broad or multi-phase. Noa is a Creative Director; ask, don't lecture.
- Use Graphify for exact symbols and ownership. Prefer rare identifiers.
- Let Fast Context retrieve before doing broad manual reads.
- For large files, logs, datasets, or fetched docs, use Context Mode: process in sandbox, `ctx_index`, then `ctx_search`.
- Before content/test/build loops, read `~/.config/devin/skills/affected-test-runner/SKILL.md` and `~/.config/devin/skills/fast-then-full/SKILL.md`.
- For routine or multi-phase work, read `~/.config/devin/skills/model-router/SKILL.md` and agree on the right model.
- If the request spans more than one phase, read `~/.config/devin/skills/phase-splitter/SKILL.md` and propose a split.
- When a work unit finishes, read `~/.config/devin/skills/scope-summarizer/SKILL.md` and write a digest.

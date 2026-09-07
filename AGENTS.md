# KI-Lernplattform

## Product contract

- Maintain a local, German-language static learning platform whose canonical model is the competency catalog; keep the 39-week roadmap only as a tested legacy projection.
- Keep runtime dependencies vendored. The application must not require a CDN at runtime.
- Keep learner progress local in IndexedDB and preserve documented migrations and JSON import/export.
- Treat deterministic graders and reference solvers as authoritative. An LLM is never an authoritative grader.
- Keep the public build fail-closed. Private sources, local overlays, non-allowlisted material, and runtimes without hashed license notices must not enter `build-public/`.

## Map

- Legacy app shell and hash router: `index.html`
- Parallel TypeScript/Preact shell: `next.html`, `src/`, `vite.config.ts`
- Persistence, grading, legacy adapters, and repositories: `assets/js/core/`
- Pure competency, evidence, diagnosis, planning, registry, and tutor logic: `assets/js/domain/`
- Pyodide worker and host runtime: `assets/js/runtime/`
- Public-first catalog, competencies, tracks, milestones, tools, reviews, coverage matrix, legacy curriculum, and exercises: `content/`
- JSON Schema 2020-12 content contracts: `schemas/`
- Architecture, licenses, dependencies, and authoring rules: `docs/`
- Build, audit, validation, and browser acceptance tools: `tools/`
- Node tests: `tests/`
- Vendored runtimes: `vendor/`
- Generated legacy-compatible output: `build-public/`
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
node tools/migrate_legacy_content.mjs
node tools/compile_content.mjs --profile public
node tools/validate_content.mjs
node tools/validate_content.mjs --legacy
node tools/build_public.mjs
node tools/validate_content.mjs --dir build-public
node tools/acceptance_cdp.mjs
node tools/acceptance_w01_cdp.mjs
```

- Match checks to the changed area. Content changes require content validation. Public-build changes require the build and leak test.
- Serve the project through `python3 -m http.server 8765`; do not validate module workers through `file://`.
- Browser behavior, IndexedDB migrations, review scheduling, and pilot flows require the CDP acceptance test or a manual browser check.

## Engineering

- Do not edit `build-public/` directly. Regenerate it with `tools/build_public.mjs`.
- Do not patch vendored runtimes casually. Update them through the existing vendoring workflow with pinned versions and hashes.
- Preserve the IndexedDB schema and migration path unless the change includes a tested migration.
- Keep learner-facing content in German. Use English for code identifiers and code comments.

## Skill routing

- Use `shrink-complexity` when writing or refactoring code.
- Use `diagnosing-bugs` for worker failures, grader defects, IndexedDB migrations, test failures, and performance regressions.
- Use `animate` only for intentional learner-facing motion. Use `find-animation-opportunities` for a read-only motion scan.
- Suggest `/ui-ux-pro-max` for an explicit learning-interface, accessibility, or responsive-design review.

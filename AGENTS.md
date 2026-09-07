# argmin

## Product contract

- Maintain a local, German-language static learning platform whose canonical model is the competency and learning-module catalog.
- Keep runtime dependencies vendored. The application must not require a CDN at runtime.
- Keep learner progress local in IndexedDB and preserve documented migrations and JSON import/export.
- Treat deterministic graders and reference solvers as authoritative. An LLM is never an authoritative grader.
- Keep the public build fail-closed. Private sources, local overlays, non-allowlisted material, and runtimes without hashed license notices must not enter the release tree.

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
- GitHub Actions workflows: `.github/workflows/`

## Verification

```bash
node --test tests/
npm run coverage:check
npm run typecheck
npm run build:release
npm run test:e2e
npm run test:e2e:build
npm run test:project-runner
node tools/compile_content.mjs
node tools/validate_content.mjs
node tools/build_public.mjs
node tools/validate_content.mjs --dir build-next
```

- Match checks to the changed area. Content changes require content validation. Public-build changes require the build and leak test.
- Run the app with `npm run dev:next` or serve `build-next/` after `npm run build:release`. TypeScript sources will not run through `python3 -m http.server`.
- Browser behavior, IndexedDB migrations, review scheduling, and pilot flows require Playwright (`npm run test:e2e` / `npm run test:e2e:build`) or a manual browser check.

## Engineering

- Do not edit generated release trees directly. Regenerate them with `tools/build_public.mjs`.
- Do not patch vendored runtimes casually. Update them through the existing vendoring workflow with pinned versions and hashes.
- Preserve the IndexedDB schema and migration path unless the change includes a tested migration.
- Keep learner-facing content in German. Use English for code identifiers and code comments.

## Skill routing

- Use `shrink-complexity` for minimal, focused refactors without unnecessary churn.
- Suggest `/ui-ux-pro-max` for explicit learning-interface, accessibility, or responsive-design reviews.

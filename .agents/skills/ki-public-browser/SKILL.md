---
name: ki-public-browser-acceptance
description: Test public source links, module navigation, and family grading on dev and release preview in KI-Lernplattform.
---

# Public browser acceptance

## Devin Secrets Needed
None. The local static app works without login.

## Setup
- Use Node 22 via `source ~/.nvm/nvm.sh`; install repo dependencies as specified by its blueprint.
- Start `npm run dev:next` (prehook compiles public content and checks coverage), normally port 4173.
- Run `npm run build:release`; after it exits successfully, start `npm run preview:next -- --port 4175` to compare the actual `build-next/` release with dev without a port collision.
- Maximize Chromium and record UI interactions. Attach a read-only console/page-error/request monitor before navigation.

## Checks
- Use sidebar Lektüren or `#/sources`. Source articles have `.source-card` and IDs `source-<sourceId>`. Audit all cards, not only the visible viewport; match expected IDs/count against current public content.
- Read external link hrefs without navigating away. Browser find can bring a representative generated card into view; hovering shows the actual URL.
- Lessons such as `#/lesson/l-foundations-algebra` and `#/lesson/l-foundations-control-flow` expose citation anchors in `.lesson-sources`; browser find `Weiterlesen und prüfen` brings the section into view.
- For module duration, compare the visible badge to current compiled `learningModules[].derivedMinutes`, not a stale hardcoded expectation.
- Click a curated Variante öffnen link and confirm the `#/family/<familyId>/<caseId>/<seed>/<profile>` route and grading.
- Grade a known static case and a deterministic seeded case; obtain answers from current content or calculate the displayed problem.
- Repeat sources and module/family checks on the release preview origin, which has separate local learner storage.
- Unknown suffixes on `#/sources/<id>` can resolve to the listing rather than a detail error; verify no removed card or crash.
- Summarize browser errors, failed responses, and requests to `/library/` or `/library-private/`. Do not confuse build chunk-size warnings with browser console errors.

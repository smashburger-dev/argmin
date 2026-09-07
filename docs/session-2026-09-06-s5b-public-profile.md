# S5B — Public-Profil und GitHub-Actions-CI

Stand: 2026-09-07
Branch: `devin/1788768004-s5b-public-profile`
Basis: `origin/devin/1788706319-s4d8a-static-cases` (`4355373`)

## Ergebnis

Das Repository kompiliert nur noch das öffentliche Profil. Lokale Overlays,
lokale Bibliotheksauslieferung und der Open-Core-Export sind entfernt.
`build-next` ist der einzige Release-Ausgabebaum. Die CI prüft Node 22,
Python 3.12 mit SymPy, TypeScript, den Release-Build und Chromium-E2E.

## Commits

| Gruppe | Commit |
|---|---|
| 1 — Public-only-Profil | `096f6bf` |
| 2 — Open-Core entfernen | `d3fe289` |
| 3 — Private Quellen und MML-Artefakte | `fc54d74` |
| 4 — `build-next` als Release-Baum | `a46c401` |
| 5 — GitHub Actions und E2E-Katalogdauer | `2a30459` |
| Nachlauf — Compiler-/Test-/Vite-Kompatibilität | `fad8473`, `a0ffe48` |

Der zusätzliche Nachlauf behob einen verbliebenen `localBundle`-Testzugriff,
aktivierte den Familienkatalog auch bei einem Compiler-Memo-Treffer, machte die
Vite-Konfiguration unter TypeScript 7 typisierbar und präzisierte den
Policy-Kommentar. Die Golden-Corpus-Datei blieb unverändert.

## Gelöschte Pfade

```text
content/mml-chapter-map.json
docs/adr/0006-content-and-build-profiles.md
docs/adr/0011-open-core-release-candidate.md
tests/e2e/local-reading.spec.ts
tests/open_core_export.test.mjs
tools/export_open_core.mjs
tools/pdf_audit.py
```

## Verifikation

```text
node --test tests/
383 Tests, 383 bestanden, 0 fehlgeschlagen, 0 übersprungen

npm run typecheck
bestanden

npm run build:release
bestanden — 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten,
614 Dateien, 95.9 KiB gzip JavaScript, 6.3 KiB gzip CSS

node tools/validate_content.mjs
bestanden — 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten

node tools/validate_content.mjs --dir build-next
bestanden — 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten

npm run test:e2e -- --project=chromium
44 Tests, 30 bestanden, 14 übersprungen, 0 fehlgeschlagen

npm run test:project-runner
20 Tests, 19 bestanden, 1 übersprungen

Negativer Public-Marker-Test:
tests/validate_public_neg.test.mjs — im vollständigen Node-Lauf bestanden;
ein injizierter `mml-book`-Marker wird weiterhin abgelehnt.
```

Der Chromium-Lauf meldet nur bereits bekannte Vite-Warnungen aus dem
vendorten Pyodide (`pyodide.mjs.map` fehlt und dynamische Imports sind für
Vite nicht statisch analysierbar); alle Chromium-Tests bestanden.

## LOC

Die Werte zählen Quelltextzeilen mit:

```bash
find <bereich> -type f \( -name '*.js' -o -name '*.mjs' -o \
  -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.sh' \)
```

Für Tests werden zusätzlich die E2E-TypeScript- und Python-Dateien separat
ausgewiesen. `content/sources.json` wird direkt mit `wc -l` gezählt.

| Bereich | Basis | S5B | Delta |
|---|---:|---:|---:|
| `assets/js` | 9.886 | 9.886 | 0 |
| `src` | 2.294 | 2.284 | −10 |
| `tools` | 2.143 | 2.129 | −14 |
| `tests/*.mjs` | 9.197 | 7.026 | −2.171 |
| `tests/*.ts` | — | 653 | — |
| `tests/*.py` | — | 407 | — |
| `content/sources.json` | 1.493 | 1.272 | −221 |

Die Test-LOC-Basis für `*.mjs` stammt aus dem S5A-Metrikvertrag
(`find tests -type f -name '*.mjs'`). Die E2E-Testanpassung umfasst zusätzlich
vier TypeScript-Zeilen im Arbeitsbaum.

## Bewusst beibehalten

- Public-Fail-Closed-Marker und rekursive Public-Sanitisierung;
- Rechte-Schema, Rechteprüfung und Public-Kompatibilitätsprüfung;
- Source- und Bundle-Validierung;
- Allowlist, Binär-/lokale-Datei-Rejection, exakte Manifest-/Baumprüfung;
- Lizenznotice-Abdeckung und SHA-256-Prüfung für vendorte Laufzeiten;
- `ContentUnavailableError` und lazy Chunk Loading;
- `validate_content --dir` als Release-Baumprüfung;
- Familien-, Lesson-, Split-, Grader-, Review-, Progress- und
  IndexedDB-Verträge;
- historische Archiv-/Inventurdokumente mit Open-Core- oder MML-Erwähnungen;
  sie sind keine aktiven Konsumenten.

`SHA256_HEX` und Policy-Konstanten bleiben Safety-Verträge. Die Public-Marker
`library-private`, `private-extracts`, `localPath`, `MML`, `mml-book`,
`murphy-pml` und `cs50p-psets-harvard` bleiben absichtlich als Leak-Canaries
erhalten.

## Bewusst übersprungen

- Keine CSS-, Markup-, Bild- oder Theme-Token-Änderungen;
- keine Änderungen an IndexedDB-Schema oder Migrationen;
- keine Entfernung von Public-Safety-, Lizenz-, Hash-, Manifest- oder
  Allowlist-Prüfungen;
- keine Firefox-/WebKit-Schritte in der neuen CI;
- kein Löschen des vorbestehenden untracked `build-public/`, `node_modules/`
  oder der erzeugten Python-Cache-Verzeichnisse.

## Stop-Bedingungen

Die zuerst gemeldeten Stop-Bedingungen wurden durch die Nutzerentscheidung
aufgelöst:

- `ki-lernplattform-original.allowedProfiles` ist jetzt `["public"]`;
  das Schema erlaubt nur noch `public`.
- `generated` nutzt
  `https://github.com/smashburger-dev/ki-lernplattform`; die HTTPS-Pflicht
  gilt nur für `open` und `link-only`.
- Neben `content/mml-chapter-map.json` und `tools/pdf_audit.py` wurde kein
  weiterer eigenständiger MML-Konsument gefunden.

## Diff-Übersicht gegen die Basis

```text
34 versionierte Pfade geändert
288 Zeilen hinzugefügt
1770 Zeilen entfernt
Netto: −1482 Zeilen
```

Der abschließende Arbeitsbaum enthält die E2E-Testanpassung und diesen
Digest; generierte bzw. vorbestehende untracked Verzeichnisse wurden nicht
gestaged.

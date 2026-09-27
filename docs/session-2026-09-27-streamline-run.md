# Session 2026-09-27: Streamline-Run ab 0.8.10

Worktree `/Users/no8/Desktop/life/Lifemaxxing/argmin-streamline`, Branch `shrink/streamline-run` (lokal, nicht gepusht), Basis `1181abe` (release/0.8.10). Kleinhirn-Arbeit ist nicht Teil dieses Branches.

## Completed

| Commit | Inhalt |
|---|---|
| `8c90b7a` | P0: Playwright startet eigenen Server (`E2E_PORT`, `--strictPort`, Reuse nur mit `E2E_REUSE_SERVER=1`); Golden-Korpus pinnt alle Instanzfelder, Solver-Ausgabe und Vertrag |
| `f8baf86` | P1: ein Choice-Kit, `spec.kit`, zentrale Kit-Suites (`tests/helpers/kit_suites.mjs`) |
| `e2e5bc1` | P2: 20 Bank-Familien als reine JSON-Daten (`assets/js/core/choice_bank_families.mjs`, `content/banks/`), Benchmark-Pin als Verhaltens-Digest |
| `3f36f78` | P3: Kits lesen authored Texte aus `content/families` (Anker statt Kopie), Wrapper-Registries entfernt, data_ml-Tabelle, Totcode |
| `c976f63` | P4a: Distraktoren als `{text, feedback, misconception}`, `statementPool` für Multiple-Choice (`assets/js/domain/statement_pool.mjs`), Binding-Invariante (`tests/feedback_binding.test.mjs`), Grader reicht `misconception(s)` weiter; Bugfix Varianten-Feedback in 3 Familien |
| `bb7ffe6` | P4b-1: 8 Fälle prozedural (stage-timeout-count, dependency-pin-count, system-w05-e6/e11, shapes-w18-broadcast-axes, contains-injection-rules, seeded-error-pattern-cases, elif-chain-five-outcomes, trace-exception-Fälle); numerische value-Regeln mit misconception-Label; `caseDraws` in `makeNumericFamily` |
| `24a383f` | E: `typicalErrors` als `{id, text}` (865 Einträge, Texte byte-identisch), Instanzen tragen `typicalErrorIds`, `misconception` muss auf eine ID zeigen (`tests/typical_error_ids.test.mjs`) |
| `2c570b8` | F1: Trace/Numeric-Generatoren erzeugen die Grenzfälle aus Kleinhirns `SKIPPED.md` (Zusatzfelder, .5-Rundung, leere Werte, Satzpunkt, y-Alias, Plateau-Reset, dyadische min_delta-Grenze, Ereignisse außerhalb der Treffertage, Fundreihenfolge, Exception-Stufe vorn); Early-Stop-Mismatch JS/CPython behoben |
| `d36f463` | F2: 19 Python-Checks in 14 Fällen für Fehlvorstellungen, die bisher bestanden; Referenzen unverändert, CPython + Pyodide-Vertragslauf grün |
| `d73debb` | P4b-2a (release/0.8.12): statementPool für die 6 Multiple-Choice-Fälle, Varianten der beiden Vorrangfälle in den Pool übernommen; `statement_pool.mjs` vergibt IDs a-f (CHOICE_IDS endet bei d) |
| `685b23e` | P4b-2b: je zwei Varianten mit Distraktor-Feedback für 7 statische Foundations-Choice-Fälle |
| `878475c` | P4b-2c: Git-Generator mit Varianten-Support (Seed 0 byte-gleich), je zwei Varianten für die 7 Git-Fälle |

Code-LOC (`assets/js`, `src`, `tools`, `tests` ohne Fixtures): 60.650 → 55.418. `assets/js`: 32.114 → 27.189. Prozedurale Module: 76 → 56. 51 Dateien gelöscht, 10 neu.

Letzte Verifikation: `node --test tests/` 1545/1545 (P4b-1-Rework), typecheck, compile/validate, `build:release`, `E2E_PORT=4274 npm run test:e2e:build` 62 pass / 15 skip (P4b-1, vor dem Text-Rework). Vertragsmatrix-SHA `85f7ecde…` unverändert. Benchmark-Digest jetzt `b06e02e4…`. Logs: `/tmp/argmin-p4a/`, `/tmp/argmin-p4b/`.

Kleinhirn-Abgleich (Probe-Merge in `/tmp/argmin-klcheck`, Konflikt nur `tests/fixtures/llm-benchmark-pin.json`, Streamline-Seite nehmen): te-Keys identisch (903), `check_mutators`, `check_python_pilot`, `check_python_rest` identisch zu den Baselines, Kleinhirn-Tests grün. Nach P4b-1: `stage-timeout-count` Fehler 1 wird erstmals produzierbar (vorher SKIPPED).

## Decisions

- Seed 0 bleibt bei umgestellten Fällen der authored Anker; andere Seeds ziehen.
- `typicalErrors`-Texte bleiben byte-identisch (Kleinhirn schlüsselt über sha1 des Texts).
- misconception-IDs sind kebab-case, Wiederverwendung erlaubt. Numerische value-Regeln nur, wenn der Wert eindeutig ist (nicht Antwort, nicht zwei Labels).
- Prompt-Satzbau von stage-timeout-count und dependency-pin-count ist durch Kleinhirn-Parser gebunden; Parameterform `{A, b}` bei den Systemen wie `system-seeded-2x2`.
- Golden-Fixture nur für freigegebene Familien neu schreiben.

## Open

- Kleinhirn ist gestoppt (kein Training, kein Rebase), bis Noa "Streamline gelandet" meldet. Danach dort: Rebase, Pin-Konflikt Streamline-Seite, Inventar mit ID-Schlüsseln, Datensatz und Gold neu, erst dann A3.
- Kleinhirn-Anpassungen nach dem Rebase: `list-alias-negative` Mutator 0 braucht die neuen `y_nach_*`-Keys (sonst rejected); Inventar-Keying muss eine ID mit mehreren Texten erlauben (`trace-call-composition/two-functions-one-print`, Zahlen im Text); für die F2-Fehler können Python-Mutatoren neu geschrieben werden.
- Content-Entscheidungen Noa: `hypothesis-report-groups` Fehler 2 widerspricht der Referenz (sie vergleicht ungerundete Mediane); `card-check-variable-trace` Fehler 1 ist ohne Float-Falle nicht beobachtbar; beobachtungsgleiche typicalErrors (Rang 3x3, Softmax ohne Max-Subtraktion, np.float64, len vs size) umformulieren oder streichen.
- Harness-Frage: Exceptions brechen Python-Testläufe ab, bevor ein Check fehlschlägt (etwa 12 SKIPPED-Einträge); try/except pro Check wäre eine eigene Phase mit Pyodide-E2E.
- P4b-2 erledigt (Worktree `argmin-p4b2`, Branch `release/0.8.12`, lokal, nicht gepusht). Von den 9 Foundations-Choice-Fällen waren 2 schon prozedural, 7 bekamen Varianten. Verifikation: `node --test tests/` 1543/1543 (+5 skip), compile/validate, typecheck, `build:release`, `E2E_PORT=4290 npm run test:e2e:build` 63 pass / 14 skip.
- `diagnostic-rationale-python-errors` und `diagnostic-rationale-ml-eval` sind bis nach A4 eingefroren: keine Varianten, keine Text- oder Kriterienänderungen (Kleinhirn-Training A3/A4).
- Die Basisfälle der 7 Foundations- und 6 Git-Fälle haben weiter kein Distraktor-Feedback; nur die neuen Varianten tragen es. Nachziehen hieße Seed 0 ändern (Entscheidung Noa).
- Behoben auf release/0.8.12: Die frische Review-Route zog den Fall ohne Profilfilter (`classify-error-hypothesis` auf intro warf in 10 von 20 Seeds "Unbekanntes Profil"). Sie behält jetzt caseId, und der Zufallszug ohne caseId nimmt nur Fälle, die das Profil bedienen. Danach ist `rank-nullity-combined` propertyTest: true.
- Behoben: `classify-git-operation` auf stretch/challenge nannte im Prompt eine Arbeitsdatei (`notizen.py` u. a.), Optionen und Lösung hielten `datei.py`; Generator und Solver lokalisieren jetzt über `localizeGitFileName` nach dem Rebinden.
- Entscheidung Noa: `transform-linear-equation-isolate/two-step-fixed-instance` ist unerreichbar und doppelt `two-step-seeded` (Retire?).
- P3 hat das JS-gzip um ~40 KB erhöht (Anker-JSON im Runtime-Graph).
- Abschluss-Verifikation fehlt noch: `npm run test:e2e` (Dev), `test:project-runner`, `coverage:check`, E2E-Build nach dem Text-Rework.
- Hinweise an die Kleinhirn-Session: `dependency-pin-count` Mutator Fehler 2 soll `null` liefern, wenn kein `*` gezogen wurde; `kfold-indices-numpy#1a/#1b` bestehen alle Checks (war schon vorher so).

## Next session start

```bash
cd /Users/no8/Desktop/life/Lifemaxxing/argmin-streamline
git log --oneline -10         # HEAD d36f463
node --test tests/
```

Kleinhirn-Kompatibilität erneut prüfen: Arbeitsstand in `/tmp/argmin-klcheck` detached auschecken, `feature/kleinhirn-classifier` mergen (Pin-Konflikt: Streamline-Seite), `private/kleinhirn/inventory.json` per `node tools/kleinhirn/inventory.mjs --out private/kleinhirn/inventory.json` erzeugen, dann `check_mutators.mjs --seeds 200:40`, `check_python_pilot.mjs`, `check_python_rest.mjs` gegen `/tmp/checkmut-merged.txt`, `/tmp/pypilot-merged.txt`, `/tmp/pyrest-merged.txt` vergleichen.

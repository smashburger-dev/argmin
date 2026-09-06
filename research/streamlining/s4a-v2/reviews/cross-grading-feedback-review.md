# Cross-Domain-Review D2: Grader-, Archetyp- und Feedbackaudit (Block D)

Stand: 2026-09-03. Arbeitsverzeichnis `ki-lernplattform`, Read-only-Audit mit
Skriptbelegen (`/tmp/d2_audit1.py`, `/tmp/d2_audit2.py`, Assembler-Trockenlauf).
Grundlagen zuerst gelesen: `block-c-decisions.md`, alle 7 Domänenreviews
(Findings-Teile), `family-model.md`, `archetypes.json`, `assets/js/core/graders.js`.
Shards und Registry nur lesend ausgewertet; keine Datei außer dieser angelegt.

**Urteil: coral.** Ein neues Medium-Finding (D2-F1, unentdeckte
Confusion-Fehlzuordnung nach bereits korrigiertem Muster). Keine Criticals,
kein Scheinkonsum, kein LLM-Grader, keine Grader-Wiederauferstehung. Alle
Zahlen gegenkorpusweit verifiziert: 623 Vorkommen = 275 + 348, Sitze exakt,
Adapter konsistent.

## Skriptbelege (Korpus)

- v1-Occurrences: 623 total, 275 consumed (alle `graderId: deterministic`),
  348 not-consumed (273 pyodide/python-code, 72 deterministisch, 3 pyodide-sympy).
- Shard-Dispositions: 623 total, Deckung lückenlos (0 fehlend, 0 extra),
  Pfade: 275 grader-predicate, 334 answer-note, 8 worked-solution,
  3 generic-hint, 2 input-validation, 1 editorial-diagnosis,
  0 retire-after-intent-extraction (korrekt, siehe D2-7).
- Assembler-Trockenlauf (ohne `--write`): alle Assertions true
  (Abdeckung, Familien-Konsistenz, Persistenz, Feedback, Entry-Formen,
  Council-Referenzen, Registry). 131 Familien, 267 atomic-cases,
  1 retired Composite.

## Prüfergebnisse je Auftragspunkt

1. **275 konsumierte verhaltensstabil: bestanden.** Alle 275 liegen auf
   `grader-predicate`, 0 Abweichungen. Alle 275 Conditions sind
   grammatikfähig (`value === n`, `choice ===/!== id`,
   `order-length-mismatch`, `value:var`-Ketten, `element-count-mismatch`),
   0 off-grammar. Token für Token gegen `graders.js` verifiziert:
   `diagnoseNumeric` (Z. 54), `gradeChoice` (Z. 79),
   `gradeCodeTrace` mit `value:<var>`-Grammatik (Z. 391–419),
   `gradePredictOutput` mit `element-count-mismatch` (Z. 439–454),
   `parsonsDiagnosis` mit `order-length-mismatch` als reiner Zählanomalie
   (Z. 300–313). Kehrseite sauber: `pair-swapped`/`pair-noninteger` sind im
   Grader nicht lesbar (gradePair Z. 96–115) und werden folgerichtig nirgends
   als konsumiert geführt (alle 5 vector-Off-Grammar-Regeln sind answer-note).
2. **348 unkonsumierte mit ehrlichem Zielpfad: bestanden.** 0 auf
   `grader-predicate` (kein Scheinkonsum). 334 answer-note, 8 worked-solution
   (predict-output-Lösungswege), 3 generic-hint, 2 input-validation
   (SymPy-Zeichengate, format_errors-Analogon), 1 editorial-diagnosis
   (w14-e4#2, Tests verlangen solve nicht — ehrlich dokumentiert).
   Rationales-Stichprobe: 4 answer-notes ohne expliziten Kanal-Token
   (w03-e1#0/#1, w04-e3#0/#1) nachgeprüft — künftiger Konsument existiert je
   (`__check`-Namen „Anna ist Palindrom“/„Relief pfeiler mit Leerzeichen“ in
   `content/exercises/w04.json`; output-predict-Archetypvertrag für w03-e1),
   Konvention korpusweit locker formuliert (Peers z. B. w03-e3#1, w04-e1
   nennen ebenfalls nur Diagnose plus beobachtbaren Anker). Kein Finding.
3. **273 Python-Regeln: bestanden.** Alle 273 v1-not-consumed, Pfade 272×
   answer-note über den checkId-Kanal plus 1× editorial-diagnosis (s. oben).
   Keine einzige Python-Regel auf grader-predicate oder ohne Pfad.
4. **72 deterministisch off-grammar + 3 SymPy: bestanden.** 61× answer-note,
   8× worked-solution, 3× generic-hint (alle einzeln plausibel, z. B.
   w14-e2#1 `value < 0`, f-algebra-both-sides-01 wrong-sign als
   v2-sign-flip-Kandidat). SymPy: 2× input-validation (unparsed,
   JS-Zeichengate vor Pyodide verifiziert) + 1× answer-note (w05-e5,
   Äquivalenzentscheidung bleibt beim SymPy-Test).
5. **Archetyp-Sitze: bestanden.** 9 aktiv mit reellem Adapter, Sitze exakt
   auf `expectedSourceCount` (50/60/95/35/11/7/4/3/2, Summe 267 =
   atomic-cases). `numbas-exam-retired`: status historical-retired,
   Adapter null, 0 atomic-Bindungen. Adapter-Mismatches 0/267.
6. **Multi-Archetyp-Familien: 21 von 22 bestätigt, 1 beanstandet (D2-F1).**
   Korpusweit 22 Multi-Archetyp-Familien. Alle außer den zwei bekannten
   Ausnahmen mischen nur autoritative Adapter (deterministic/pyodide);
   kein weiterer rationale-note/numbas/sympy-Mix. Bekannte Fälle einzeln:
   decode-loop (`optimize-decode-greedy-loop`, Lese- + Implementieraufgabe
   zum wortgleichen Vertrag, Transformer-F1 gestützt) bestätigt;
   call-composition (state-trace + 2× output-predict, ein
   Auswertungssemantik-Vertrag) bestätigt; collection-state
   (state-trace + 2× output-predict, Slice-Achse wörtlich) bestätigt;
   ratio (7× numeric + w26-e4 code-test; Zähler/Nenner-Vertrag,
   Transformer-F2-Dokuauflage bleibt) bestätigt; shape (choice + predict,
   Deep-Review gestützt) bestätigt; confusion bis auf D2-F1 bestätigt
   (w29-e4 baut wörtlich `{tp,fp,fn,tn}` plus Precision/Recall mit
   0/0-Guard; w33-e4 erhält tp/fp/fn/tn-Dict; Länder w11/w28/w33-e2
   domainseitig geprüft); scalar-product und reflect als dokumentierte
   Ausnahmen bestätigt (korpusweit exakt 2 rationale-note-Quellen w01-e11
   und w05-e9, beide `reviewEligible: false`, je 0 Feedbackregeln,
   Freitext prinzipiell nicht grammatikfähig; Ausnahme in
   block-c-decisions #11 dokumentiert).
7. **w05-e7-Retire-Seite: bestanden.** composite-placement, retired,
   `historicalArchetypeId: numbas-exam-retired`, kein taskArchetype- oder
   caseTemplate-Schlüssel, `feedbackDispositions: []` bei 0 Regeln.
   Score-Semantik nur in sequence-/partialScoreContract dokumentiert.
   Numbas-Erwähnungen im Shard ausschließlich Historie/Migrationsnotizen.
   Kein Runtime-Zielpfad, keine Wiederauferstehung.

## Findings

| ID | Schweregrad | sourceIds | verletzte Regel | Beleg | kleinste Korrektur |
|---|---|---|---|---|---|
| D2-F1 | **medium** | w37-e3 | Prozedurtest + Referenzmodelltest (§4 Tests 1–2); Diagnosetest (§4 Test 3) in `aggregate-confusion-metric` | Familienvertrag verlangt wörtlich Zählobjekt {tp,fp,fn,tn} plus Metrikselektor (Shard-Eintrag byte-gleich Registry). Quelle `content/exercises/w37.json` w37-e3: `recall(gesamt, getroffen) = getroffen/gesamt` über `(gesamt, getroffen)`-Tupeln, zwei print-Zeilen plus Mittelwert-Prozent; 0 tp/fp/fn/tn-Treffer im Quellobjekt, kein Selektor. Gleicher Defekttyp wie die bereits korrigierten data-ml-F1 (w13-e4, Gruppen-Fehlerraten) und capstone-F3 (w34-e2, Ledger-Raten). Capstone-Review prüfte nur w33-e2/w34-e2, w37-e3 blieb ungeprüft. | Council-Entscheid: empfohlenes Ziel `formula-ratio-percent-metric` (8→9; „Zähler/Nenner bestimmen, Verhältnisformel anwenden“ passt exakt, Fehlerachsen Nenner/Rundung decken beide Regeln, Referenzmodell Verhältnismetrik; output-predict wird 2. Archetyp der Familie unter autoritativen Adaptern, Confusion-Präzedenz deckt den Mix). Alternative: `aggregate-grouped-metrics-report` (Thema passt, aber referenceModel „versteckte Testsuite im Pyodide-Worker“ passt nicht zur statischen Predict-Aufgabe) oder dokumentierte Ausnahme. Dispositionen unverändert (answer-notes nennen bereits v2 lines-diff@k). Nicht selbst ausgeführt. |
| D2-F2 | info | w34-e2 (Protokoll, kein Shard-Fehler) | Aktenwahrheit zu block-c-decisions #7 | Shard führt w34-e2 als `numeric-exact` (v1 activityType numeric bestätigt); „2. code-test-Mitglied“ in #7 ist ein Protokollversehen. Ratio-Familie hat exakt 1 code-test-Mitglied (w26-e4). | Ein Satz Richtigstellung im Council-Protokoll; kein Shard-/Registry-Eingriff. |
| D2-F3 | info | diverse (kein Shard-Fehler) | Registry-Hygiene (§5, nicht-authoritative Hypothesenlisten) | `canonical-families.json` `hypothesisMemberSourceIds` noch alt: `trace-assignment-state` listet w01-e6/w02-e1/w20-e3/w31-e3, `aggregate-confusion-metric` listet u. a. w13-e4/w26-e4/w30-e2. | Bereits D1 zugewiesen (block-c #12/#17); kein neuer Auftrag. |

## Hinweise an D1 (keine Findings)

- Singleton-Quote 74/131 und Merge-/18-19-Materie bleiben D1/Council-Sache.
- Die zwei rationale-note-Ausnahmen (scalar-product, reflect) leben derzeit
  nur in block-c-decisions #11; bei Registry-Adoption je einen
  Dokumentationssatz in die Einträge übernehmen (Schema kennt keine
  Begründungsfelder, block-c #14).
- w38-e3 (capstone-F4, trace-assignment-Dehnung) und w21-e3/w38-e3-Entscheide
  aus block-c #13 bleiben unberührt; D2-F1 ändert daran nichts.

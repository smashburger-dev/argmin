# Adversarialer Review S4A-v2, Block F (v2)

Stand: 2026-09-03. Arbeitsverzeichnis `Lifemaxxing-integration-pre-s2b/ki-lernplattform`.
Read-only gearbeitet. Einzige Schreibstelle ist diese Datei.

Zuerst gelesen: `v1-v2-comparison.md` und `block-c-decisions.md` (Anhang,
D-Nachtraege 19 bis 27), danach `family-model.md` Abschnitt 10b, danach alle
Review-Berichte (7 Domaenen, je Urteil und Findings; 4 Cross-Reviews;
`w37-e1-second-review.md`).

## Urteil: coral

Der Taxonomiestand ist fachlich tragfaehig, aber die Verifikationsbehauptung
ist auf dem aktuellen Stand falsch. `selftest.mjs` meldet 26/27 statt der
behaupteten 27/27 (ADV-F1, medium). Alles andere haelt den Widerlegungsversuchen
stand. Gruen erst nach ADV-F1 und ADV-F2.

## Eigene Skriptlaeufe (Beweismittel)

- `node research/streamlining/s4a-v2/assemble-v2.mjs` (Trockenlauf): gruen.
  Ausgabe wörtlich: 7/7 Shards, 268/268 Eintraege schema-valide und
  v1-abgedeckt; 267 atomic-cases, 1 composite-placement (1 retired, 0 aktiv);
  132 CognitiveFamilies in 11 FamilyGroups (76 Singletons, Anteil 0.5758);
  9 Archetypen, 267 CaseTemplates, 268 Placements; Registry 0 neu,
  0 ungenutzt; Persistenz 262 preserve-id / 5 merge-map-required
  (w05-e11, w05-e12, w05-e13, w17-e2, w37-e1) / 1 retire-blocked (w05-e7,
  S1B-Freigabe); Feedback 623 = 275 + 348; Entscheidungsqueue 36 offene Punkte.
  Alle Assertions true.
- `node research/streamlining/s4a-v2/selftest.mjs`: 26 bestanden,
  1 fehlgeschlagen. Fehler wörtlich: `FAIL Familien-Registry Laadeprobe:
  Erwartungssumme 268, keine abgeleiteten Felder` /
  `aggregate-accumulator-count enthaelt noch abgeleitete Felder`.
- Baseline-Commit `1998d57` existiert (`git cat-file -t`: commit).
- Eigene `node -e`-Auswertungen gegen Shards, `canonical-families.json`,
  `archetypes.json`, `content/exercises/*.json`,
  `content/competencies/core.json`: 132 Familien, Summe 267; 15
  sharduebergreifende Familien (Liste unten); 267 atomare caseIds, 0 Duplikate;
  22 Multi-Archetyp-Familien; 0 Multi-Contract-Familien; 268/268 primary Claims
  in `core.json` (46 Kompetenzen); 623 Feedbackdispositionen
  (275 grader-predicate, 334 answer-note, 8 worked-solution, 3 generic-hint,
  2 input-validation, 1 editorial-diagnosis); 0 grader-predicate auf code-test;
  0 LLM-Referenzen in Dispositionen; 0 `resolved-by-review-council`;
  57/57 required Human-Reviews offen mit vollständigem Quartett;
  1 Composite (`w05-e7`, retired); alle 101 verbliebenen
  `hypothesisMemberSourceIds` sind Teilmengen der abgeleiteten Mitglieder
  (0 stale).

## Prueffragen

### 1. Familien zu breit oder umbenannte Themencontainer?

Drei Verdaechtige geprüft, keiner widerlegt den Stand. Aber die groesste
Familie bleibt fragil.

- `trace-assignment-state` (18 Mitglieder, 6 Domaenen, 3 Archetypen):
  Der Parsons-Fall `w01-e7` passt wider Erwarten (v1 solutionPath: Tausch via
  temp-Hilfsvariable; Familien-Schablone Zuweisungen-in-Ordnung trifft den
  kanonischen reads-old-value-Fall). Die Dehnungen `w21-e3` (Maske) und
  `w38-e3` (Overclaim-Scanner) sind echt gestreckt, haben aber kein besseres
  Zuhause (`trace-collection-state`-Achsen Mutation/Kopie und Slice-Grenzen
  decken Normierung, Fundordnung und leere-Liste-als-None ebenso wenig).
  Council-Entscheide 13 und 10b dokumentieren die Dehnung ohne
  Verhaltenswirkung. Kein Themencontainer, aber jede weitere Aufnahme wuerde
  die Familie zum Container machen.
- `aggregate-confusion-metric` (11, 4 Archetypen): nach D1-H1/D2-F1/Block-C
  bereinigt (w13-e4, w26-e4, w34-e2, w34-e3, w37-e3 entfernt). Restbestand
  verifiziert: `w29-e4` baut wörtlich `{tp,fp,fn,tn}` plus Precision/Recall mit
  0/0-Guard, `w33-e4` erhaelt tp/fp/fn/tn-Dict, `w28-e3` (Token-Multimengen)
  faellt unter die D1-L3-Prosa. 4-Archetyp-Mischung ist dokumentiert, nicht
  archetypgetrieben.
- `formula-ratio-percent-metric` (10, 3 Archetypen): Schablone
  Zaehler/Nenner-bestimmen plus Verhaeltnisformel ist generisch, laeuft aber
  durch alle 10 Mitglieder wörtlich (Ledger-Quoten, Tupel-Recall, Gruppenraten,
  Tabellen-Zaehlung). Die zwei output-predict-Mitglieder und das eine
  code-test-Mitglied teilen Loesungs- und Evidence-Vertrag mit den numerischen
  Geschwistern. Generisch, aber nicht beliebig.

Bestaetigt: keine Familie ist ein reiner Themencontainer. Die 15
sharduebergreifenden Familien sind exakt ableitbar (accumulator 4, confusion 11,
grouped 4, validate-and-count 8, fairness 2, count-from-construction 5, ratio 10,
gradient 4, pipeline-status 6, assignment 18, collection 3, exception 3,
expression-simplify 3, required-field 5, shape 4). Byte-Gleichheit der Vertraege
prueft der Assembler; eigener Check: 0 Multi-Contract-Familien.

### 2. Singletons als CaseTemplates bestehender Familien?

Drei Kandidaten mit Drei-Test geprueft, kein Merge besteht. Unmoeglichkeit
fuer den Rest begruendet.

- `trace-training-loop-count` (w20-e3) gegen `formula-count-from-construction`
  und `trace-assignment-state`: Prozedur scheitert (Ceil-Loop mit
  Float-Ausgabe gegen geschlossene Formel bzw. reine Zuweisungsfolge),
  Referenzmodell scheitert (deterministische Trainingsloop gegen
  Zaehlinvariante bzw. Mini-Interpreter), Diagnose scheitert
  (Aufrund- und .0-Achsen dort absent). v1 votierte eigene Familie. Singleton
  steht.
- `classify-column-combination` (f-linalg-column-choice-01) gegen
  `transform-system-2x2-elimination`: alle drei Tests scheitern (Nachrechnen
  gegen Eliminationswahl plus Rueckeinsetzen; Spaltenbild gegen 2x2-System mit
  Eliminationsstrategie; Koeffizienten-Verwechslung gegen Eliminationswahl
  statt Vorzeichenfehler). Choice gegen Paar zusaetzlich. Singleton steht.
- `classify-freeze-purpose` (w37-e1) gegen `classify-freeze-scope`:
  Prozedur (Begruenden des Zwecks gegen Aufzaehlen von Inhalten), Referenz
  (Evaluationsvertrag ueber Zeit gegen Scope-Zustaende), Diagnose
  (Motiv-Achse gegen Scope-Achse, disjunkte Distraktoren) scheitern alle.
  Zweite Zweitpruefung und Cross-Familien-Review stimmen ueberein. Singleton
  steht; der Noa-Endentscheid bleibt offen.
- Rest: alle uebrigen classify-Singletons tragen je ein eigenes Konzeptsystem
  als Referenzmodell (Merge scheitert per Konstruktion an Test 2), alle
  trace-/construct-/fit-/formula-Singletons je eigene Schleifenmechanik oder
  Autoritaet (Test 1 oder 2). Die einzigen prozedurnahen Paare
  (dict-update gegen collection-state; test-attitude gegen error-hypothesis)
  sind in Cross-Familien Abschnitt 2 mit disjunkten Hypothesenmengen
  widerlegt. Flächenscan bestaetigt.

Bestaetigt: 76 Singletons spiegeln Konzeptvielfalt, keine Bequemlichkeit.

### 3. TaskArchetype und CognitiveFamily orthogonal?

Gegenbeispielsuche negativ. Korpusweit 22 Multi-Archetyp-Familien (eigene
Zaehlung, stimmt mit D2 ueberein), darunter confusion mit 4 Archetypen und
assignment mit 3. Keine Familie wurde nur wegen des Archetyps getrennt oder
vereint:

- Vereint trotz Archetyp: `w01-e7` (program-ordering) in assignment-state;
  `w24-e3` (output-predict) in decode-loop neben `w24-e4` (code-test);
  `w26-e4` (code-test) in ratio neben 7 numerischen Geschwistern.
- Getrennt trotz Archetyp: `transform-linear-equation-isolate` gegen
  `transform-system-2x2-elimination` (beide tuple/numeric-nah, verschiedene
  Prozedur und Referenz); freeze-purpose gegen freeze-scope (beide
  choice-diagnose, verschiedene Konzeptsysteme).
- Einzige Einschraenkung: 2 dokumentierte 10b-Ausnahmen
  (reflect-error-journal-rationale mit w01-e11, formula-scalar-product mit
  w05-e9) mischen autoritative mit nicht-autoritativer Evidence. Das ist eine
  ehrliche Ausnahme mit Begruendung (korpusweit genau 2 rationale-note-Quellen,
  beide reviewEligible false), kein Archetyp-Bruch als Prinzip.

Bestaetigt: Orthogonalitaet gilt inklusive dokumentierter Ausnahmen.

### 4. Generator-/Solver-/Property-Test-Vertrag je Familie?

Fuer 130 von 132 Familien direkt implementierbar (geschlossene Formel,
Mini-Interpreter, Metrikselektor, Seed-Generator wie genBackpropChain,
Hash-Vertrag, Konzeptsystem als Tabelle). Zwei Familien nur partiell:

Siehe ADV-F2 (low). Kein Totalausfall, aber S4C muss die zwei
Freitext-Mitglieder aus jedem Property-Test ausschliessen.

### 5. Composite-Trennung sauber?

Bestaetigt. Genau 1 Composite (`w05-e7`, retired, historicalArchetype
numbas-exam-retired, Komponenten w05-e1/w05-e5/w05-e6 alle als atomic-case
vorhanden, feedbackDispositions leer bei 0 Regeln, S1B-Freigabe in der Note).
Aktive Composites: 0. Spot-Check `f-linalg-final-boss-01`
(construct-linalg-contract-synthesis): Drei-Vertrags-Synthese mit hidden tests
ist ein einzelner Vertrag, keine Sequenz bestehender Cases, also zu Recht
atomic. Kein Convenience-Composite gefunden.

### 6. Feedbackpfade ehrlich?

Bestaetigt. 623/623 disponiert, 0 fehlend, 0 extra. Alle 275 konsumierten auf
grader-predicate, alle grammatikfaehig, 0 code-test auf grader-predicate (kein
Scheinkonsum). Alle 348 unkonsumierten mit echtem Zielpfad (334 answer-note
ueber checkId-Kanal bzw. Archetypvertrag, 8 worked-solution, 3 generic-hint,
2 input-validation als SymPy-Zeichengate, 1 editorial-diagnosis w14-e4#2).
0 retire-after-intent-extraction ist korrekt (nur w05-e7 mit 0 Regeln haette
den Pfad, und dort ist die leere Liste richtig). 0 LLM-Referenzen korpusweit.
Spot-Check w11-e4: 3 answer-notes mit checkId-Kanal-Rationales, caseTemplate
pyodide/static, Quelle enthaelt `__check(`-Pruefungen.

### 7. IDs, Attempts, Evidence stabil?

Bestaetigt. 262 preserve-id (sourceId unveraendert, kein Rename), 5
merge-map-required mit existierenden Zielen (w05-e11/w05-e12/w05-e13/w17-e2/
w37-e1, letzteres nach D3-Reparatur in der adoptierten Familie
classify-freeze-purpose, Registry Count 1, scope 2 gegen 1), 1 retire-blocked.
267 caseIds eindeutig, 0 Duplikate, 0 Kollisionen mit sourceIds (eigene
Zaehlung). w37-e1-Entscheidungstexte fragen jetzt die aktuelle Frage
(Singleton-Ziel gegen Scope-Erweiterung, Ersatzevidenz c-genai-security
enthalten); Queue-Eintrag w37-e1 ebenso. Kompetenz-Claims 268/268 in
`core.json`. Alle 5 Merges unvollzogen (IDs lesbar). Generator-Baseline
unveraendert (51 seeded exakt bei v1 solverContract kind seed-generator,
217 static).

### 8. Agentenentscheidung als menschliche Freigabe?

Bestaetigt negativ. 0 `resolved-by-review-council` korpusweit (Disposition
strukturell unerreichbar wie vorgesehen). Unter den 57 required Human-Reviews
0 `resolved-*`, alle offen mit vollständigem Quartett (0 Luecken, eigene
Zaehlung). Der einzige Freigabe-Wortlaut (w30-e1: v1-Reason Freigabe durch
Menschen gewuenscht) ist ehrlich nach requires-noa-decision an Noa eskaliert
(Owner Noa, Gate S4D-Contentmigration). Kein toter Review-Link.

### 9. v1 und v2 reproduzierbar?

Halb. Assembler ja, Selbsttest nein. Siehe ADV-F1 (medium) und ADV-F3 (low).

## Findings

| ID | Schweregrad | Ort | Beleg | Kleinste Korrektur |
|---|---|---|---|---|
| ADV-F1 | medium | `selftest.mjs` Z. 333 bis 348 gegen `canonical-families.json` (132/132 mit abgeleiteten Feldern) | `node research/streamlining/s4a-v2/selftest.mjs` meldet `26 bestanden, 1 fehlgeschlagen` mit `FAIL Familien-Registry Laadeprobe: Erwartungssumme 268, keine abgeleiteten Felder` / `aggregate-accumulator-count enthaelt noch abgeleitete Felder`. Behauptet sind 27/27 in `block-c-decisions.md` (Verifikation nach Korrektur) und allen Cross-Reviews. Die Pruefung verlangt Abwesenheit von `memberSourceIds`/`domains`, aber `assemble-v2.mjs --write` schreibt genau diese Felder per Vertrag (family-model Abschnitt 5) zurueck. Nach jedem Reconcile muss der Check fehlschlagen. Erwartungssumme ist mit 267 gegen atomic-cases aktuell richtig, nur die Feldabwesenheit ist stale. | Selbsttest an den Council-Stand anpassen: statt Abwesenheit die Konsistenz der abgeleiteten Felder pruefen (memberCount gleich expectedMemberCount, memberSourceIds-Menge gleich Shard-Ableitung, domains gleich Ableitung), oder den Check explizit auf den Pre-Write-Stand scopen und das in Abschnitt 12 dokumentieren. Danach 27/27 erneut laufen lassen und zitieren. Nicht selbst ausgefuehrt (fremder Gate-Code, nur Owned Path beschreibbar). |
| ADV-F2 | low | `reflect-error-journal-rationale` (w01-e11), `formula-scalar-product` (w05-e9) | Beide Familien mischen je ein rationale-note-Mitglied (manual-rubric, reviewEligible false, Freitext prinzipiell nicht grammatikfaehig) mit autoritativen Geschwistern. Fuer w01-e11 und w05-e9 existiert keine ausführbare Autoritaet und damit kein Property-Test-Orakel. 10b-Ausnahme dokumentiert das Bleiben, aber nicht die S4C-Konsequenz. | Einen Satz in 10b nachtragen: beide Freitext-Mitglieder nehmen an keinem Familien-Property-Test teil und zaehlen nur als Bearbeitungsnachweis. Kein Shard-Eingriff. |
| ADV-F3 | low | `research/streamlining/s4a-v2/` uncommittet; v1-v2-Vergleichszahlen | `git status --porcelain` zeigt `?? research/streamlining/s4a-v2/` (gesamter Stand uncommittet). v2 ist im Arbeitsbaum reproduzierbar (Assembler-Trockenlauf gruen, s. oben), aber ohne Commit ist Frische nur lokal belegbar. v1-Seite ist eingefroren (Baseline `1998d57` existiert, 268/268 v1-abgedeckt). | s4a-v2-Stand committen (oder im Bericht festhalten, warum WIP). Keine Inhaltsaenderung. |

## Bestaetigt (nicht widerlegbar)

- Familienarchitektur: 132 Familien, 76 Singletons, 15 sharduebergreifende
  Familien, 0 Multi-Contract, 0 stille Aliase, beide Hypothesen-Entfernungen
  waisenfrei, alle drei neuen Familien tragfaehig, kein weiterer Merge
  moeglich (Drei-Test-Begruendungen Block C/D1/Cross-Familien halten Stich).
- Alle 7 Domaenen-Urteile coral und alle Cross-Urteile (claims gruen, families
  coral, grading coral, persistence nicht-gruen) sind nachvollziehbar; die
  referenzierten Shard-Korrekturen (8 Moves, MRR-Erweiterung, mergeInto- und
  caseId-Reparaturen) sind im Korpus angekommen. D3-F1/F2-Reparatur an w37-e1
  verifiziert (Familie purpose adoptiert, Texte fragen die aktuelle Frage).
- 18/19-Aufloesung auf 15 aus abgeleiteten Mitgliedschaften nachvollzogen.
- 36 Queue-Punkte (3/1/31/1) in `decision-queue.json` vorhanden; Noa-Queues
  (w37-e1, w05-e11/12/13, w17-e2 mit c-ml-repro-Migration, Prozent-Grenzen,
  Kopier-Architekturen) unberuehrt und entscheidbar formuliert.
- Was v2 nicht ist (kein Produktionscode, keine Contentänderung, keine
  Generator-Baseline, kein zweiter Grader, kein LLM-Grader) wird eingehalten.

## Review-Abdeckung

Gelesen: v1-v2-comparison, block-c-decisions (mit Anhang und D-Nachtraegen 19
bis 27), family-model (ganz, Schwerpunkt 10b), alle 7 Domaenenreviews (Urteil
plus Findings), alle 4 Cross-Reviews, w37-e1-second-review. Eigene Skripte
gegen Shards, Registry, Archetypen, v1-Inputs, Content-Quellen, Kompetenzen
und beide Verifikationsbefehle. Fremde Dateien unveraendert.

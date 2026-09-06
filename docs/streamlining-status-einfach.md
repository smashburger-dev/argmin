# Streamlining der KI-Lernplattform: Stand in einfachen Worten

Stand: 2026-09-03, Branch `streamline/integration-pre-s2b`. Für technisch
Interessierte ohne Codekenntnis. Unsicheres oder Zukünftiges steht dabei.

## 1. Was war doppelt oder schwer wartbar?

Die Plattform hatte zwei Oberflächen (alt und neu in Preact), zwei
Content-Welten (39 Wochen-Pakete plus 38 einzelne Definitionen) und zwei
Feldsprachen für dasselbe (zum Beispiel `exerciseId` und `definitionId`).
Dazu 230 einzeln gespeicherte Aufgaben, von denen die meisten mechanische
Varianten waren, zwei Technik-Experimente ohne Nutzer (Numbas, FSRS) und
mehrere fast gleiche Listen für den öffentlichen Build.

## 2. Was hat S0 gesichert?

S0 hat den Stand vor dem Umbau exakt vermessen und als Commit `1998d57`
eingefroren: 46 Kompetenzen, 46 Lektionen, 268 Aufgabendefinitionen (davon 267
öffentlich), 51 Generatoren, 887 Node-Tests. Drei Browser-Flackereien wurden
protokolliert und später in S2A repariert. Der Commit ist der Rückfallpunkt
für alles Weitere.

## 3. Was wurde mit Numbas und FSRS entfernt und warum?

Numbas (eine Prüfungs-Runtime plus MathJax, rund 19 MB) lief nur in der alten
Oberfläche und nur für eine einzige Aufgabe (`w05-e7`). Deren Inhalt existiert
wortgleich in drei normalen Aufgaben. FSRS (eine Wiederholungs-Formel) war
geladen, aber nie aktiv. Beides raus, kein Lernziel verloren. Der
Standard-Wiederholungsplan rechnet byte-identisch weiter.

## 4. Was hat S2A in Preact vereinheitlicht?

Fast alles, was bleibt: Heute-Ansicht, Lernen, Kompetenzen, Lektionen,
Aufgaben, Reviews, Fortschritt, Einstellungen, Quellen, Tools, Projekte, Labor,
Import und Export. Dazu das Fehlerjournal, das falsche Antworten sammelt.
Wochenansicht, Wochen-Gates und Roadmap-Suche entfallen bewusst. Drei
Browser-Fehler aus S0 wurden an der Wurzel repariert, ohne Tests aufzuweichen.

## 5. Was leistet das Journal und welche Browserfehler wurden behoben?

Das Journal schreibt jede falsche, diagnostizierte Antwort mit und zeigt die
Einträge im Fortschritt. Es überlebt Export, Import und Neuladen. Behoben:
Firefox wartete zu kurz auf den Python-Prüfer, WebKit verlor eine
Einstellungsänderung durch zu frühes Rendern, Chromium sah einen
Lazy-Ladevorgang nicht. Alle drei mit Ursachenbeleg und Volllast-Nachweis.

## 6. Was war S4A-v1 und warum waren 256 Familien kein gutes Ziel?

S4A-v1 hat alle 268 Definitionen inventarisiert: Quelle, Kompetenz, Grader,
Solver, Feedbackregeln, Einzigartigkeit. Ergebnis: 256 „Familien", davon 246
mit genau einer Aufgabe. Das ist ein Etiketten-Inventar, kein
Wiederverwendungs-Modell. 348 von 623 Feedbackregeln hatten keinen
Runtime-Konsumenten. v1 sichert gegen Verlust, baut aber nichts.

## 7. Wie strukturiert S4A-v2 Familien, Archetypen, Templates und Placements?

Vier Ebenen mit je einer Frage. Kompetenz-Claim: Welche Fähigkeit wird
nachgewiesen. Kognitive Familie: Welcher Lösungsweg mit welchen typischen
Fehlern. Task-Archetyp: Welche Interaktion und welcher Prüfer (zum Beispiel
Single-Choice oder Python-Test). Case-Template und Placement: Welche konkrete
Variante wo im Lernweg liegt und ob sie review-fähig ist. 132 Familien,
9 aktive Archetypen, 267 Fallvarianten, 268 Platzierungen.

## 8. Wie viele Familien, Archetypen und Templates gibt es und warum?

132 Familien (von 256), 9 Archetypen, 267 Templates, 15 Familien über
Domänengrenzen hinweg. Die Zahl folgt keiner Vorgabe, sondern den drei Tests
je Familie: gleicher Lösungsweg, gleiches Referenzmodell, Fehlerhypothesen
decken die echten Fehler. 76 Familien haben ein Mitglied, jede begründet.
Wo die Tests einen Merge verboten, blieb die Trennung.

## 9. Was ist im Code zentralisiert und was nur entworfen?

Zentralisiert und getestet: ein Expanding-Wiederholungsplan ohne FSRS, ein
Journal-Speicher, archivierte Reviews ohne tote Links. Nur entworfen
(Forschungsdateien, kein Produktionscode): das Familienmodell, die
Registry mit 132 Verträgen, alle Feedback-Zielpfade, die Entscheidungsqueue
mit 36 Punkten. S4B und S4C bauen darauf.

## 10. Welche offenen Entscheide bleiben?

Für Noa: vier Aufgaben-Merges in Woche 5 (`w05-e11/12/13` plus die
Numbas-Sequenz `w05-e7`), `w17-e2`, Prozent-Grenzen bei GenAI-Aufgaben, ob
Boss-Aufgaben Code kopieren oder teilen. `w37-e1` ist seit 2026-09-03
getrennt von `w34-e1` (Protokoll:
`research/streamlining/s4a-v2/noa-decisions.md`); offen bleibt nur, wo Woche
37 die Evidence für `c-genai-security` hernimmt. Für später: S4B-Bindungen
und S4C-Kanäle. Die restliche Queue steht in `decision-queue.json`.

## 11. Was macht S2B?

Preact ist der einzige Einstieg unter `index.html`. Die alte Oberfläche,
`next.html` und die ersetzten CDP-Treiber entfallen nach der bestätigten
Löschliste. Kein Content-Umbau in S2B. OSS-Schnitt und öffentliche Ablage
warten auf eine klarere Programmstruktur.

## 12. Was machen S3A und S3B danach?

S3A hat eine gemeinsame Ereignis-Normalisierung: Instance-Key, Zeitfeld,
Hint-Schwelle und Lösungsdisqualifikation leben in `learning_policy.mjs`.
Aufgaben-Review und Kompetenz-Frische bleiben zwei getrennte Ergebnisse.
S3B hat genau einen Event-Builder und Schreibpfad (`append(event)` ohne
IndexedDB in der Signatur). `evaluate()` sitzt am Snapshot, nicht in der
Policy. Das Journal bleibt ein Store. Der In-App-Import nimmt nur schema 3.
Commit von S3B ist offen.

## 13. Wie führen S4B und S4C zu Modulen, Synthese und Varianten?

S4B ersetzt die Woche durch LearningModule: geordnete Lektionen,
Familien-Platzierungen, Projekte, Dauer aus Inhalten abgeleitet. S4C macht die
Familie zur einzigen Erweiterungsstelle: Generator, Referenz-Solver,
Falltypen, Schwierigkeit, Feedbackvertrag. Danach braucht eine neue
Aufgabenvariante höchstens drei Fachdateien und keine UI- oder Buildänderung.
Eine Synthese-Lektion wird JSON plus Markdown.

## 14. Was wurde noch nicht gebaut?

Timeline mit dynamischer Empfehlung, massenhafte Lektionsgenerierung,
S4C-Runtime mit echten Familien-Generatoren, S4B-Modulbindung,
Löschung der Wochenquellen, Test- und Build-Streamlining (S5A/S5B) und die
Vollabnahme (S6). Auch die 36 Queue-Entscheide sind offen. Was hier steht,
ist Taxonomie, nicht Produkt.

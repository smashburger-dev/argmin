# Research-Basis: Assessment-Design-Frameworks (S4A v2)

Datum: 2026-09-02. Design-Referenz für das Aufgaben-/Assessment-Modell der KI-Lernplattform.

Rahmenbedingungen: statische lokale Auslieferung ohne Server, deutsche Lerninhalte,
deterministische Grader und Reference Solver als Autorität, Python nur im Pyodide-Worker,
Fortschritt in IndexedDB, LLM nie autoritativer Grader. Jedes Framework wird als Muster
übernommen, nie als Software. Alle Kernkonzepte wurden am 2026-09-02 gegen die
offiziellen Primärdokumente geprüft (Nachweis in der Quellenliste); nicht prüfbare
Aussagen sind als "unverifiziert" markiert.

## 1. Evidence-Centered Design (ECD) — Mislevy, Steinberg, Almond

### Kernkonzepte
- Assessment argument (Claims) lenkt das Design: Ein Assessment ist ein Argument, das aus
  Beobachtungen auf Kompetenzen schließt; alle Modelle dienen diesem Argument.
- Conceptual Assessment Framework (CAF): student model (Kompetenz-Variable(n)), evidence
  model, task model, assembly model; ergänzt um eine presentation-model-Spezifikation.
- Evidence model zweigeteilt: evaluation component (gewinnt aus Work Products die
  observable variables, entspricht "task scoring") und measurement component (aktualisiert
  die student-model variables, entspricht "test scoring").
- Task model: Formate für Präsentationsmaterial und Work Products plus Beschreibungsdaten
  (TM variables) für die Auswahl; assembly model: Kriterien, nach denen mehrere Aufgaben
  zu einem Assessment zusammengestellt werden. Delivery erfolgt in einer four-process
  architecture (activity selection, presentation, evidence identification, evidence
  accumulation).

### Direkt übertragbar
- Kette Claim -> Observable -> Task als Autorenregel: Jede Aufgabe deklariert, welche
  Evidenz (observable) sie für welche Kompetenz (claim) liefert; passt direkt auf den
  Kompetenzkatalog und die Evidence-Felder der Content-JSONs.
- Trennung evaluation (task scoring) von aggregation (test scoring): Einzel-Grader bleiben
  dumm und deterministisch, Diagnose/Planung (`assets/js/domain/`) aggregiert separat.
- Assembly model als Muster für deklarative Auswahl-/Reihenfolgeregeln von Übungssequenzen
  (deterministisch im Content-JSON auswertbar, z. B. Milestone-Zusammenstellungen).

### Nicht übertragbar
- Measurement component mit Bayes-Updating und Belief-Netzen: braucht Kalibrierstichproben;
  wird durch deterministische Diagnose- und Planungsregeln ersetzt.
- Four-process delivery architecture als laufendes System: ist eine Server-/Plattformform,
  nicht statisch.

## 2. Automatic Item Generation (AIG) — Linie Gierl/Haladyna

### Kernkonzepte
- Drei Schritte: (1) cognitive model — repräsentiert Wissen/Fähigkeiten, die man zum Lösen
  einer Aufgabenklasse braucht; (2) item model — Template, das festlegt, welche Stellen
  eines Items manipulierbar sind; (3) computerbasierte Erzeugung der Instanzen aus dem
  Template (bei Gierl et al. 2017 inklusive Lösungen und Begründungen für formatives
  Feedback).

### Direkt übertragbar
- Item-Modelle als templatierte Aufgabenschablonen im Content-JSON: Platzhalter für Werte,
  Kontexte und Lösungswege; Instanzen werden deterministisch aus einem Seed generiert.
- Lösung und Begründung (rationale) mitgenerieren und als Referenz-/Feedback-Material
  ablegen, statt nur die Antwort.

### Nicht übertragbar
- Psychometrische Nachkalibrierung generierter Instanzen (Item-Statistiken, DIF-Prüfung)
  und Massen-Erzeugung mit Experten-Review-Pipelines: ohne Stichprobendaten sinnlos.

Anmerkung: Das Grundlagenwerk (Gierl & Haladyna, "Automatic Item Generation: Theory and
Practice", Routledge) wurde nicht direkt eingesehen; die Begriffe wurden über den
Open-Access-Aufsatz der Autorengruppe verifiziert. Detailverweise aufs Buch: unverifiziert.

## 3. PrairieLearn (docs.prairielearn.org)

### Kernkonzepte
- Question als eigenständige Einheit (Frage-Markup + `server.py`), getrennt vom Assessment,
  wiederverwendbar über Kurse hinweg.
- Seeded Variants: `server.py` erzeugt pro Variante Zufallsparameter und gleich die
  korrekten Antworten (`data["params"]`, `data["correct_answers"]`); `singleVariant`-Flag
  für nicht randomisierte Fragen.
- Lifecycle: `generate` -> `prepare` -> `render` -> `parse` -> `grade`; `parse` prüft
  Eingaben und setzt `format_errors`, `grade` setzt `partial_scores`, `score` und
  `feedback`.

### Direkt übertragbar
- Der generate/parse/grade-Zyklus als Vertrag für jeden deterministischen Grader — im
  Browser statt auf dem Server: generate in JS oder Pyodide (Seed), parse als
  Eingabevalidierung (Syntaxfehler getrennt von fachlicher Bewertung), grade rein
  funktionial ohne Seiteneffekte.
- Variante = Frage + Seed; pro Lernendem deterministisch reproduzierbar, ohne Serverstate.
- `format_errors` vs. fachliches Ergebnis als getrennte Kanäle im Datenmodell.

### Nicht übertragbar
- Die Runtime selbst (Server, DB, Container-External-Grading, Elements-Ökosystem, course
  instances, LMS-Anbindung, KI-Grading).

## 4. STACK (docs.stack-assessment.org)

### Kernkonzepte
- Potential Response Trees (PRT): Entscheidungsbaum über Antwort-Tests; ein Durchlauf
  erzeugt Outcomes — Score, Penalties, Feedback und Answer note.
- Answer note: "name for a specific outcome on a potential response tree" — maschinenlesbarer
  Code für den erreichten Diagnosezweig, auch über Fragen hinweg auswertbar.
- Question tests: erwartete Outcomes (score, penalty, answer note) für konkrete
  Testeingaben; Doku selbst nennt das "unit testing" für Aufgaben.

### Direkt übertragbar
- PRT-Muster für diagnostisches Feedback: Baum aus deterministischen Vergleichsregeln pro
  Antwortfeld, jeder Zweig mit Score, deutschem Feedback und Diagnose-Code (analog answer
  note) — ohne CAS lauffähig, reine Datenstruktur plus Auswerter.
- Answer-note-artige Codes als Diagnose-Tags in der Diagnose-/Wiederholungslogik.
- Question tests als Regressionstests: jede Übung bekommt Fälle mit erwartetem Outcome und
  läuft in `node --test tests/` mit.

### Nicht übertragbar
- Maxima-CAS und die answer-test-Bibliothek für algebraische Äquivalenz: nicht statisch im
  Browser betreibbar; ersetzt durch numerische/exakte Vergleiche in Python (Pyodide).
- Moodle-Integration, CASText/Plot-Rendering, deployed-variants-Verwaltung.

## 5. QTI 3 (1EdTech/IMS Global)

### Kernkonzepte
- ASI-Modell (Assessment, Section, Item): AssessmentTest -> testPart -> assessmentSection
  (verschachtelbar) -> `qti-assessment-item-ref` (nur `identifier` + `href`); Items sind
  eigene Dateien mit Stimulus, Interaktionen und korrekten Antworten samt Response
  Processing im Inhalt.
- Standardisierter shared vocabulary/CSS-Layer für einheitliche Darstellung über
  Implementierungen hinweg.

### Direkt übertragbar
- Strukturprinzip Item != Section != Test als Datenmodell-Idee fürs Content-JSON: Items
  leben im Katalog, Sections/Tests referenzieren per ID und fügen nur Regeln bei.
- Item-Referenzen mit ID + Verweis statt Kopie (braucht keine XML-Bindung).
- "Korrektur und Scoring gehören ins Item, nicht in eine externe Datei" — stärkt das
  fail-closed-Prinzip des Public Builds.

### Nicht übertragbar
- XML/XSD-Bindings, Content Packaging, PCI-Interaktionen, LTI/LMS-Interoperabilität.

## Bewusst nicht übernommen

- QTI-XML: Interoperabilitätsserialisierung für Austausch zwischen LMS — kein Austauschziel
  dieser Plattform; JSON-Schema-Content bleibt kanonisch.
- PrairieLearn-Runtime: benötigt Server, Datenbank und Container; übernommen wird nur der
  generate/parse/grade-Vertrag, deterministisch im Browser nachgebaut.
- STACK-CAS: Maxima lässt sich nicht statisch und lizenz-geprüft im Browser ausliefern;
  Pyodide plus deterministische Vergleiche decken die Zielkompetenzen.
- Numbas-Runtime: aus dem Produkt zurückgezogen; dient nur als historische Referenz für
  Variablen, Randomisierung und mehrteiliges Marking und darf nicht zurückkehren.
- Serverabhängigkeit: Produktkontrakt ist lokale statische Auslieferung mit IndexedDB; jede
  serverseitige Komponente bricht die Laufumgebung.
- Neue externe Bibliothek: Framework-Übernahme als Muster, nicht als Code; Runtime-Abhängig-
  keiten bleiben vendored, gepinnt und hash-geprüft.

## Quellen (Primärdokumente, geprüft am 2026-09-02)

- ECD: Mislevy/Steinberg/Almond (2003), On the Structure of Educational Assessments,
  CSE Report 800: https://files.eric.ed.gov/fulltext/ED480557.pdf
  (ERIC-Record: https://eric.ed.gov/?id=ED480557)
- AIG: Gierl/Zhou/Roherbe (2017), Using AIG to Create Solutions and Rationales for
  Computerized Formative Testing: https://pmc.ncbi.nlm.nih.gov/articles/PMC5978592/
- PrairieLearn: https://docs.prairielearn.org/docs/question/ — Docs-Host war aus der
  Forschungsumgebung nicht abrufbar; Inhalt gleichen Tages über die offiziellen
  Doc-Quellen im Repo verifiziert:
  https://raw.githubusercontent.com/PrairieLearn/PrairieLearn/master/docs/question/overview.md
  https://raw.githubusercontent.com/PrairieLearn/PrairieLearn/master/docs/question/server.md
- STACK: https://docs.stack-assessment.org/en/Authoring/Potential_response_trees/ und
  https://docs.stack-assessment.org/en/AbInitio/Authoring_quick_start_5/
- QTI 3: https://www.imsglobal.org/spec/qti/v3p0/guide/ (Beginner's Guide, Struktur-Kapitel)
  und ASI Information Model https://www.imsglobal.org/spec/qti/v3p0/info/
  (Vokabular: https://www.imsglobal.org/spec/qti/v3p0/vocab)

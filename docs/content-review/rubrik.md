# Content-Review-Rubrik (v0.6)

Einheitliche Bewertungsgrundlage für alle Review-Blöcke. Jeder Reviewer wendet
dieselben Regeln an und zitiert Evidenz mit citekey. Ziel: Befunde sind
vergleichbar, Vorschläge sind evidenz- oder konventionsgestützt, nicht
Geschmack.

## Quellenlage und Belastbarkeit

Evidenzkorpus: `/Users/no8/Desktop/life/Lifemaxxing/research/lernmethodik/`
(gap-matrix.md, requirements.md, offene-fragen.md, ist-modell.md, fulltexts/).
Der Korpus wurde gegen das alte 39-Wochen-Modell geschrieben. Plattform-Lücken
(reviewQueue, Gates, Selbstmarkierung) sind inzwischen weitgehend im neuen
Modell adressiert — Reviewer bewerten nur, was **Content** ausdrücken kann:
Lesson-Texte, Aufgabenfälle, Hinweise, Feedback, Placements, Schwierigkeit,
Zeit, Struktur.

Belastbarkeit: Metaanalysen (Rowland, Yang, Cepeda, Rohrer, Brunmair) >
RCTs > Reviews > Einzelstudien. Laborbefunde auf Curricula übertragen ist
Eigenableitung — entsprechende Vorschläge markieren. Fundtiefe je Bereich
steht in gap-matrix.md §4.

## Regelwerk

### Sequenz und Aufgabendesign

- **R1 Worked-Example-first**: Neue Problemtypen brauchen eine Einführung
  Beispiel studieren → Teilschritte (Completion) → volles Problem. Beispiel-
  studium qualifiziert nie als Mastery. Evidenz: @sweller<clt20years><2019>,
  @renkl<fading><2004>, @donoghue<tenlearning><2021> (d ≈ 0,37–0,45).
- **R2 Abruf vor Reveal**: Lösung wird nie ungefragt gezeigt; Reveal
  disqualifiziert nur dieselbe Instanz. Platform-seitig umgesetzt; Content-
  seite prüfen: prompt verleitet nicht zum sofortigen Reveal, fullSolution
  erklärt den Weg (nicht nur die Zahl). Evidenz: @kornell<pretesting><2009>,
  @bertsch<generationeffect><2007> (d = 0,40), @metcalfe<errors><2017>.
- **R3 Gestufte Hinweise**: Hinweis 1 strategisch/als Teilziel-Frage
  ("Was ist hier der nächste Schritt?"), Hinweis 2 konkret einsetzend.
  Subgoal-Labels wo möglich. Evidenz: @margulieux<subgoals><2012/2019>.
- **R4 Diagnosebezogenes Feedback**: feedbackRules benennen den konkreten
  Fehler UND den nächsten prüfbaren Schritt; keine Regel verrät die Lösung;
  typische Fehler sind enumeriert (typicalErrors gepflegt). Evidenz:
  @keuning<feedback><2018> (SLR 101 Tools).
- **R5 Aufgabenmix / Strategiewahl**: Nicht nur Kalkül derselben Woche —
  Konzeptfragen (choice), Tracing/Predict vor Schreibaufgaben bei Code,
  Transfer-Fälle (neuer Kontext, alte Idee). Bei Code: Lesen/Trace/Predict
  vor Schreiben. Evidenz: @rohrer<interleaved><2015> (d = 0,42/0,79),
  @ericsonparsons2017, @listertracing2004, @sentanceprimm2019.
- **R6 Schwierigkeits-Spread**: intro/core/stretch/challenge sinnvoll
  verteilt; difficulty-Label plausibel zum Fall (kein "stretch" für
  Ein-Schritt-Rechnung). Konvention: intro = Einstieg, core = Standard,
  stretch = Transfer, challenge = Kombination/Mehrschritt.
- **R7 Zeitplausibilität**: estimatedMinutes vs. tatsächlicher Umfang
  (md-Länge, Case-Komplexität, Code-Menge). Autorwerte sind unkalibriert
  (OF-7) — grobe Drift (>50 %) markieren.

### Lesson-Text und kognitive Last

- **R8 Element-Interaktivität dosieren**: Ein neues Konzept pro Abschnitt;
  Abschnitte kurz genug für Arbeitsgedächtnis (Richtwert: kein Abschnitt
  über ~15 Zeilen ohne Zwischenschritt/Beispiel). Seductive details
  vermeiden. Evidenz: @sweller<clt20years><2019>, @ginns<contiguity><2006>.
- **R9 Copy-Stil**: du-Form, aktiv, kurze Sätze, konkretes Zahlenbeispiel
  vor Abstraktion; deutsche Begriffe mit englischem Fachwort wo üblich
  (z. B. "Konfidenzintervall (confidence interval)"). KaTeX ($...$) in
  Lesson-Markdown und statischen Prompts; Unicode-Mathematik (log₂, ³, ·)
  in generator-erzeugten Prompts. Freundlich ohne Floskeln.
- **R10 Objectives konkret**: Lesson-`objectives` messbar/tätigkeitsbezogen
  ("… berechnen", "… erkennen"), nicht "verstehen". Lesson-Aufbau:
  Einstieg → Worked Example → (Viz/Checkpoint) → Verweis auf Übung.
- **R11 Kumulation/Spiralrückgriff**: Placements können bewusst ältere
  Familien in späteren Modulen ziehen (Strategiewahl über Themen).
  Fehlt das komplett, ist das ein Befund. Evidenz: @szpunar<cumulative><2007>,
  @cepeda<distributed><2006> (Intervall ~10–20 % der Retentionsdauer).

### Interaktive Elemente

- **R12 Viz mit Aufgabe koppeln**: Jede Visualization braucht erkennbaren
  Grund (Lernziel) und idealerweise eine Transfer-/Vorhersagefrage
  ("Stelle k auf 5 — was passiert mit X?"), nicht nur passive Optik.
  Contiguity: Beschriftung am Objekt, keine Legenden-Fernbedienung.
  Evidenz: @ginns<contiguity><2006> (d = 0,40–0,56).
- **R13 Neue Interaktionen**: Kandidaten wo Selbsttest vor der eigentlichen
  Aufgabe Transfer stützt (Slider-Spiel, Predict-then-Drag, mini-Notebook).
  Als Vorschlag formulieren, mit Bezug zum konkreten Lesson-Inhalt.

### Formalia und Ehrlichkeit

- **R14 Mastery-Ehrlichkeit** (präzisiert 2026-09): Choice-Fälle sind nur
  dann mastery-fähig, wenn sie Diagnose oder Transfer verlangen — mindestens
  zwei plausible Distraktoren auf typische Fehlkonzepte plus
  fullSolution/feedbackRules, die erklären, warum Alternativen falsch sind.
  Reine Wiedererkennungs-/Auffrischungsfragen: Bearbeitungsnachweis
  (masteryEligible: false + fullSolution-Notiz). Mastery-fähige Cases pro
  Kompetenz erreichbar (Milestone-Mindestzahl), davon idealerweise nicht
  ausschließlich Choice-Formate. Rubric/short-rationale nie mastery-fähig.
- **R15 Felder konsistent**: sourceLineage mit konkretem Anker, license,
  releaseStatus wahrheitsgemäß, caseId/familyId-Referenzen existieren,
  prompts der statischen Fälle stimmen mit expected/choices überein.

## Priorisierung

- **P0**: fachlicher Fehler (falsche Mathematik, falsche Lösung, irreführende
  Erklärung), echte Lücke (Kompetenz-Objective ohne jede Übung/Lesson),
  Verletzung der Mastery-/Reveal-Ehrlichkeit.
- **P1**: evidenzbelegte Lernerlebnis-Verbesserung (fehlendes Worked-Example,
  keine Subgoal-Hinweise, monotoner Kalkül-Mix, Viz ohne Transferfrage,
  fehlende Kumulation, unplausible Zeit/Schwierigkeit).
- **P2**: Polish — Ton, Kürze, Stil, Kosmetik.

## Report-Format pro Kompetenz

```
### c-xyz Titel
**Deckung**: … | **Copy**: … | **Evidenz**: … | **Interaktiv**: …
**Befunde**: …
**Vorschläge**:
- [P1] content/lessons/x/y.md → Abschnitt kürzen + Teilziel-Frage (R8/R3, @sweller)
```

Am Blockende: blockübergreifende Befunde (Track-/Modul-Struktur, wiederkehrende
Muster). Jeder konkrete Vorschlag nennt Zieldatei. Unsicheres wird als
"unklar" markiert statt geraten.

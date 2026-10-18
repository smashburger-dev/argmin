# Figuren Welle 3: Startprompts

Basis ist der finale lokale Commit `figuren: Integration Welle 2` auf `feature/figuren`. Vor dem Start Commit und Abschlussbericht `docs/session-2026-10-18-figuren-integration-welle-2.md` prüfen. Der Integrations-Worktree liegt weiterhin unter `/Users/no8/.windsurf/worktrees/argmin/argmin-figuren`; dieser historische Pfad ist ein normaler Git-Worktree. Neue Worktrees liegen unter `/Users/no8/Desktop/life/Lifemaxxing/`.

S6b, S7, S8a und S8b können jetzt parallel starten. S2b kann zusätzlich die gemeinsamen Dateien bearbeiten. Familien bauen mit den bereits verfügbaren Verträgen weiter. Fehlt für eine Bedienung ein gemeinsamer Vertrag, liefern sie reine Modelle, eigene Szenen und konkrete Anfragen; eine Abnahme dieser Bedienung bleibt offen. Für einen Abschluss mit neuen gemeinsamen APIs zuerst S2b integrieren, dann den konkret geprüften Integrationscommit in die betroffenen Familienzweige übernehmen. Keine Abhängigkeit auf einen noch nicht integrierten Nachbarzweig erfinden.

## Gemeinsame Regeln und Dateibesitz

Diese Regeln gehören zu jedem Prompt unten. Jede Session liest diese Datei und ihren Abschnitt im Sessionplan vollständig.

- Maßgeblich sind `AGENTS.md`, `.devin/skills/workbench/SKILL.md`, `docs/figuren-s3/bedienung.md`, `docs/figuren-design-und-assets.md`, `docs/figuren-lesson-and-stage.md` und `docs/figuren-s3/assets.md`. Danach Sessionplan einschließlich beider Anfragewellen, Parallelplan und den eigenen Familienabschnitt lesen. Workbench ist der endgültige Skillname.
- Gemeinsam besessene Engine, Painter, Runtime, CSS, Schemas und Figurenteil des Compilers bleiben bei S2b/Integrator. Attempt-/Import-/Gradervertrag aus S4a erhalten, IndexedDB-Version 3 beibehalten. Neue Aufgaben erst mit zugewiesenem deterministischem Vertrag bauen. Kein eigener Grader neben dem bestehenden Pfad.
- Eigene Modelle, Szenen, Objekte, `.fig.json` und exklusive Lektionen gehören der Familie. Registry-/Allowlist-Zeilen nur additiv und alphabetisch; bestehende gemeinsame Dateien nicht nebenbei umbauen. Neue Kit-Dateien nur bei konkretem Bedarf, vorab mit eindeutigem Besitzer.
- Geteilte Lektionen: S7 schreibt `l-data-cleaning`; S8a liefert dafür nur ein eigenes Fragment und den Einfügevorschlag im Digest. S8b schreibt `l-genai-rag` und `l-capstone-freeze`; S7 liefert dafür nur eigene Fragmente und Einfügevorschläge. Das umfasst jeweils Lektions-JSON und vorhandene Markdown-Dateien. S8b besitzt neue Graph-Primitive K7, S7 fordert deren Schnittstelle an. Kein gemeinsamer Dateischreibzugriff.
- Vor Detailgeometrie den angrenzenden Text lesen und Lernfrage, geeigneten Datensatz, Darstellung, nötige Teile sowie mobile Lesbarkeit im Digest festhalten. Anfang, entscheidende Änderung und Ergebnis bei tatsächlicher Handygröße ansehen. Statischer Vergleich, Parametererkundung und Beats nach dem Mechanismus wählen; keine pauschale Tafel, Kamerafahrt oder Vorhersage. `viewMode` ausdrücklich setzen. Ganze fremde Bühnen nicht importieren.
- Gemeinsame Hülle verwenden: Zurück/Weiter beziehungsweise Von vorn, einmal kleiner Schrittstand; Frage nur im passenden Schritt vor der Navigation, Urteil erhalten. Kein Kameramenü, Abbildungspräfix oder sichtbares „Ablauf als Text“. SVG-/Live-Beschreibung und Drucktext erhalten. Flat ohne Orbit und Bodenschatten; spatial direkt bedienbar. Vertikales Touch-Scrollen und Textauswahl außerhalb der Bühne erhalten.
- Schrift mindestens 14 px bei kleinster tatsächlicher Bühne, Ziele mindestens 44 px, tatsächlicher Text-/Materialkontrast einschließlich Deckkraft mindestens 4,5:1 in beiden Themes. Sichtbare Glyphenabstände und optische Zentrierung messen, Kamera aus allen sichtbaren Geometrien samt Labels bestimmen. Bei Platzmangel vereinfachen, nicht die ganze Figur kleiner skalieren. Aufnahmen erst nach `data-settled=true`, SVG-Deckkraft 1 und freiem Bildausschnitt. Letzten Knopf in begrenzten Karten mit mindestens 12 px Innenrand prüfen.
- Keine neuen figurspezifischen Tests oder Snapshot-Sammlungen automatisch anlegen. Vorhandene Referenzlöser, Compiler, Prüfungen und Messwerkzeuge nutzen; eigene Browser-Sichtung und einmalige Gegenproben durchführen. Alte `.viz.json` und geschützte Checkpoints erhalten. Neue dauerhafte Prüfungen benötigen Noas konkreten Auftrag.
- Nach `npm ci` einmal das Basis-Gate festhalten. Abschluss: Compiler/Inhaltsvalidierung, Node, Typecheck/Coverage, Release samt Public-/Leak-/Lizenzprüfung, bestehende Chromium-Dev- und Release-Prüfungen auf eigenem strikt gebundenem Port, Project-Runner bei Pythonbezug und Shrink Complexity auf geänderten Code. Kein Gesamt-Gate nach jedem Abstandsschritt. Funktionen höchstens Komplexität 10; Bestandsbefunde konkret abgrenzen.
- Jede eigene Figur mit entscheidenden Zwischenzuständen bei 1440/375 px hell/dunkel selbst bedienen und Kontaktbögen sowie notwendige mobile Einzelbilder öffnen. Zweck, Datenbereich, Grenzen und tatsächlichen Prüfstatus eigener Assets dokumentieren. Szene unter 12000 B gzip, Runtime unter 10000 B, Shared-Chunks separat. Frame-Messung mit vierfacher CPU-Drosselung, drei Läufe, Median der Mediane; Beatziel unter 4 ms, mindestens unter 6, Drag/Kamera unter 8 ms. Gemeinsame bekannte Überschreitungen nicht als Familienfehler verdecken.
- Digest `docs/session-<datum>-figuren-<session>.md` mit Lernentscheidungen, Lösernachweisen, angesehenen Bildern, Gate-/Frame-/Chunkwerten und konkreten Anfragen. Kleine deutsche Commits `figuren(<session>):`, kein Push, kein Merge in `feature/figuren`. Am Ende eigenen Server stoppen und Port freigeben. Keine anderen Chats automatisch starten.

## S6b: F2 Matrix- und Tensorbank, Port 4407

```text
Figuren Welle 3, Session S6b. Erstelle einen normalen Git-Worktree /Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s6b auf feature/figuren-s6b ab dem abgeschlossenen lokalen Commit „figuren: Integration Welle 2“ auf feature/figuren. Vorhandenen geeigneten Worktree sicher wiederverwenden; Basis und sauberen Arbeitsbaum prüfen. Port 4407 strikt binden. Kein Push, kein Merge in feature/figuren.

Lies zuerst AGENTS.md, .devin/skills/workbench/SKILL.md und sämtliche gemeinsamen Regeln/Quellen in docs/figuren-welle-3-prompts.md. Lies dann S6/F2 und die Welle-2-Anfragen in docs/figuren-sessionplan.md, Dateibesitz in docs/figuren-parallelplan.md und F2 in docs/figuren-familienplan.md. Der Abschlussbericht von Welle 2 beschreibt die gültige gemeinsame Basis. F1-Aufzeichnungen und deren Compiler-Expansion sind bereits integriert, keine zweite Trace-Engine bauen.

Baue order-times-prices, plug-adapter, tensor-address, library-attention, frozen-matrix-strips und team-mask in ihren sechs tatsächlichen Lektionen. Bestehende F7-Inhalte in dl-regularization erhalten. Zellgitter, Matrixprodukt und Broadcasting vorzugsweise frontal und maßstabstreu; räumliche Zellquader nur für eine tatsächlich räumliche Beziehung. Größere Tensoren als klar bezeichneten Block/Ausschnitt statt unlesbar vieler Zellen zeigen. Dropout-Maske aus einem nachvollziehbaren festen Modell, Inferenzskalierung korrekt.

Vergleiche Matrixprodukt, NumPy-Formregeln, Softmax/Temperatur/Kausalmaske und LoRA-Parameter mit den im F2-Plan genannten vorhandenen Lösern classify-shape-contract, validate-shape-contract, optimize-softmax-attention-mask und formula-lora-delta-apply. Übernommene Checkpoints inhaltlich erhalten und am Modell prüfen. Keine gerundeten Abbildungen als mathematische Wahrheit ausgeben.

Direkte Zellen-/Objektauswahl, freie Parameter und neue layer-chain-/Masken-Aufgaben benötigen die im Sessionplan angefragten gemeinsamen Verträge. Früh Ziel, Tastaturäquivalent, Rückmeldung und Antwortdaten benennen; keine private Runtime oder Erweiterung der S4a-Antworthülle. Modelle und feste Lektionsbeispiele parallel fertigstellen. Hinweise erst nach Compile-Lecksperre und sicherem Fall-/Nachbarvertrag; gesuchte Formen/Gewichte auch geometrisch verbergen.

Gemeinsame Regeln aus der Promptdatei vollständig erfüllen, eigene Bilder selbst ansehen, tatsächliche Mobilgröße und engste Matrixzustände prüfen. Abschluss-Gates auf 4407, Messwerte und offene Abnahme in docs/session-<datum>-figuren-s6b.md. S6b besitzt nur seine exklusiven Lektionen und eigenen Dateien.
```

## S7: F5 Pipeline und F8 Schwellen, Port 4408

```text
Figuren Welle 3, Session S7. Erstelle oder verwende sicher den normalen Git-Worktree /Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s7 auf feature/figuren-s7 ab dem finalen lokalen Welle-2-Integrationscommit auf feature/figuren. Basis und sauberen Arbeitsbaum prüfen. Port 4408 strikt, kein Push und kein Merge in feature/figuren.

Lies AGENTS.md, .devin/skills/workbench/SKILL.md sowie alle gemeinsamen Regeln und Quellen in docs/figuren-welle-3-prompts.md. Danach S7 und beide Anfragewellen im Sessionplan, F5/F8 im Familienplan und den Dateibesitz im Parallelplan. Der aktuelle Workbench-Vertrag ersetzt ältere pauschale Kamerafahrt-, Tafel-, Quiz- und Testpflichten.

Baue die F5-Mechanismen goods-in, cleaning-line, fold-rotation, token-conveyor, mail-sorter, house-ablation und trades-stopwatch sowie F8 für Logistic/Baseline/Eval/Responsible AI im Zusammenhang der echten Lektionen. Stationen nur dort als Mechanismus verwenden, wo ein Ein-/Ausgabevertrag oder Informationsfluss sichtbar wird. Split-Grenzen, Fehlerrutsche, Leakage und Timeout aus denselben Zustandsdaten wie die Anzeige berechnen. Schwellen, Konfusionsmatrix, Precision/Recall/F1 und Teilgruppenraten aus einem gemeinsamen Datensatz; keine choreografierten Zähler. Vergleich gegen count-remaining-rows-cleaning-rule, classify-cv-leakage, validate-leakage-rule-audit, reproduce-pipeline-status-report, aggregate-confusion-metric, aggregate-parity-threshold-selection und classify-sigmoid-regime.

Du bist einziger Schreiber von l-data-cleaning einschließlich Lektions-JSON und vorhandener Markdown-Dateien. S8a liefert den Verteilungsbezug als Fragment/Digest. l-genai-rag und l-capstone-freeze gehören S8b: dort nichts ändern, nur eigene eindeutig benannte Fragmente und Einfügevorschläge im Digest liefern. Neue gemeinsame Graph-Primitive K7 gehören S8b; benötigten Vertrag früh anfragen, keine zweite Graph-Datei anlegen.

Explore/Compare und neue Aufgaben zum topologischen Ordnen, zur Split-Grenze oder Schwellenwahl nur mit übergebenem gemeinsamen Bedien-/Antwortvertrag umsetzen. Ein Vergleich optimaler Eigenschaften nutzt den vorhandenen deterministischen Löser, keinen parallelen Grader. Fehlende APIs konkret an S2b/Integrator melden und parallel eigene Modelle, feste Szenen und exklusive Lektionsintegration fertigstellen. Keine privaten Runtime-/Schema-/Compiler-Forks.

Alle gemeinsamen Abnahme-, Bildsichtungs-, Kontrast-, Bedienungs- und Messregeln aus der Promptdatei anwenden. Alte Checkpoints und .viz.json erhalten. Abschluss-Gates auf 4408 und docs/session-<datum>-figuren-s7.md mit expliziter Übergabe der fremdbesessenen Lektionsfragmente. Nicht integrierte Fragmente und fehlende Bedienverträge als offen ausweisen.
```

## S8a: F6 Verteilung und F9 Bäume, Port 4409

```text
Figuren Welle 3, Session S8a. Arbeite in einem normalen Git-Worktree /Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s8a auf feature/figuren-s8a, neu ab dem finalen lokalen Commit „figuren: Integration Welle 2“ auf feature/figuren. Vorhandenen geeigneten Worktree sicher wiederverwenden, Basis und sauberen Baum prüfen. Port 4409 strikt. Kein Push, kein Merge in feature/figuren.

Lies AGENTS.md, .devin/skills/workbench/SKILL.md, alle gemeinsamen Regeln/Quellen in docs/figuren-welle-3-prompts.md, S8 und beide Anfragewellen im Sessionplan sowie F6/F9 im Familienplan und den Dateibesitz im Parallelplan. Entwirf erst mit angrenzender Lektüre und tatsächlicher Handygröße.

Baue F6 für eda-distributions, ml-repro und ml-error-analysis sowie F9 für ml-ensembles. Histogramm, Median/Quartile und Boxplot beruhen auf derselben sichtbaren Punktmenge; unterschiedliche Fachbreiten dürfen die Daten nicht verändern. Gleicher Seed ergibt dieselbe Folge durch den vorhandenen PRNG. Teilgruppen anhand echter Modellzahlen vergleichen. Beim Baum optimale Splits/Gini, Gleichstände und Abstimmung aus demselben Modell berechnen; jeden gleich guten Split fachlich akzeptieren. Gegen formula-descriptive-stats-numpy, formula-metric-spread-range, formula-stat-from-table, reproduce-seeded-split und optimize-tree-best-split prüfen. normal-density bleibt bestehen.

l-data-cleaning gehört S7. Ändere weder dessen Lektions-JSON noch bestehende Markdown-Dateien; liefere für die Mittelwertverschiebung ein eigenes eindeutig benanntes Fragment und einen konkreten Einfügevorschlag im Digest. Keine gleichzeitigen Eingriffe in S7s Pipeline.

Fachbreitenregler und neue Split-Aufgaben brauchen gemeinsame Explore-/Antwortverträge. Früh Parameterbereich, Rücksetzung, Tastatur und Grader-Eigenschaften als Anfrage an S2b/Integrator beschreiben. Bis zur Übergabe Modelle, eigene feste Beispiele, Geometrie und exklusive Lektionen fertigstellen, keine lokale Runtime oder Ersatzaufgabe. Auch bei großen Punktmengen Renderer-/Framebudget messen, keinen zweiten Canvas-Painter bauen.

Gemeinsame Regeln aus der Promptdatei vollständig erfüllen: keine automatischen neuen Tests/Snapshots, vorhandene Löser und Gates, eigene Browser-Bedienung und geöffnete Reviewbilder, Kontrast samt Deckkraft, lesbare Gruppenabstände, alte Checkpoints/.viz.json erhalten. Abschluss-Gates auf 4409, Frame-/Chunkwerte und offene Verträge in docs/session-<datum>-figuren-s8a.md.
```

## S8b: F10 Graph, F11 Token und statische Figuren, Port 4410

```text
Figuren Welle 3, Session S8b. Erstelle oder verwende sicher den normalen Git-Worktree /Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s8b auf feature/figuren-s8b ab dem finalen lokalen Welle-2-Integrationscommit auf feature/figuren. Basis und sauberen Arbeitsbaum prüfen. Port 4410 strikt; kein Push, kein Merge in feature/figuren.

Lies AGENTS.md, .devin/skills/workbench/SKILL.md sowie alle gemeinsamen Regeln/Quellen in docs/figuren-welle-3-prompts.md. Danach S8 und beide Anfragewellen im Sessionplan, F10/F11/statische Figuren im Familienplan und Dateibesitz im Parallelplan. Statische Darstellung ausdrücklich wählen, wenn kein zeitlicher Vorgang erklärt wird; nicht jede Lernkarte in Beats umwandeln.

Baue Autograd-/Git-/Freeze-Graphen, Tokenisierung/BPE/Chunkfenster und die im Familienplan aufgeführten statischen Figuren samt echtem SHA-256-Siegel. Werte vorwärts und Gradienten rückwärts aus demselben gerichteten Graphen berechnen; an Verzweigungen korrekt addieren. Git-Zustände, topologische Ordnung, BPE-Paarwahl, Überlappung und Chunkanzahl gegen optimize-backprop-path-sum, classify-backprop-path-rule, classify-git-operation, trace-toposort-dependency-order, transform-bpe-merge-apply, optimize-bpe-merge-learn und trace-chunk-window-loop prüfen. Geschützten chunk-overlap-Checkpoint erhalten. Hash tatsächlich mit node:crypto einmalig gegenprüfen; keine neue dauerhafte Testsuite automatisch anlegen. Keine fremde kryptografische Bibliothek oder CDN-Abhängigkeit einführen.

Du besitzt neue Graph-Primitive K7 und lieferst ihren kleinen reinen Vertrag früh für S7. Keine bestehenden Kit-Dateien ändern. Du bist einziger Schreiber von l-genai-rag und l-capstone-freeze einschließlich Lektions-JSON und vorhandener Markdown-Dateien; S7 liefert dort Fragmente/Einfügevorschläge. Eigene Token-/Graphanteile mit diesen Übergaben zusammenführen, ohne einen fremden Branch vorauszusetzen. Offene Integration der S7-Fragmente im Digest benennen.

Aufklappbare statische Teile nur mit tatsächlich verfügbarem zugänglichem Vertrag. Fehlende Auswahl-, Parameter- oder Toposort-Aufgabenverträge früh bei S2b/Integrator anfordern; keine Ersatz-Runtime und kein eigener Grader. Die feste verständliche Darstellung kann parallel fertig werden. Für alle 50 Lektionen einen belegten Figurenbestand oder eine begründete Ausnahme zusammentragen; vorhandene F1/F2/F3/F4/F7/F12-Inhalte nicht fremd bearbeiten und Archivlektionen nicht als zusätzliche öffentliche Abdeckung zählen. Alte .viz.json und JSXGraph bleiben bis zur Freigabe erhalten.

Alle gemeinsamen Regeln aus der Promptdatei anwenden, jede eigene Darstellung und engste Zwischenzustände selbst bedienen und Reviewbilder öffnen. Abschluss-Gates auf 4410, Digest docs/session-<datum>-figuren-s8b.md mit fachlichen Nachweisen, Abdeckungsübersicht, eigenen Bildern, Messwerten und offenen Übergaben. Bei zu großem Umfang konkrete unerledigte Lektionen nennen, keine pauschale Vollständigkeit behaupten.
```

## S2b: gemeinsame Verträge und Engine-Nachlauf, Port 4411

Dieser Prompt kann zusätzlich zu den vier Familien starten. Er ist Voraussetzung für deren neue gemeinsame Bedienung, nicht für ihre reine Modell-/Geometriearbeit. Canvas und neue dauerhafte CPython-Prüfungen werden durch die offenen Anfragen nicht automatisch zu Pflichtimplementierungen.

```text
Figuren Welle 3, gemeinsame Session S2b. Normaler Git-Worktree /Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s2b auf feature/figuren-s2b ab dem abgeschlossenen lokalen Welle-2-Integrationscommit auf feature/figuren. Basis und sauberen Baum prüfen, Port 4411 strikt, kein Push und kein Merge in feature/figuren.

Lies AGENTS.md, .devin/skills/workbench/SKILL.md, alle gemeinsamen Regeln und Quellen in docs/figuren-welle-3-prompts.md sowie den vollständigen Abschnitt „Anfragen aus Welle 2 und nächste Zuständigkeit“ im Sessionplan. Lies S5-/S6a-Digests und docs/figuren-s6a/trace-contract.md. S4bs stepContent/onRestart, kanonische scene-build-Antworten und S6as zentrale Trace-Expansion sind integriert und bleiben erhalten.

Übernimm ausschließlich die gemeinsamen Dateien. Implementiere zunächst Explore-Zahlenfeld und Compare-A/B nach den konkreten S5-Verträgen, nutze F7 als vorhandenen Verbraucher und prüfe den regularisierten Vergleichszustand bei gleicher Kamera/Skala. Definiere den direkten Auswahlvertrag mit Tastaturäquivalent und Rückmeldung für F1/F2 und dokumentiere die Übergabe an S6b. Bestehende Hülle, Hinweise, state restoration, Antworterhalt, Druck, Reduced Motion, Forced Colors, Touch-Scrollen und fail-closed Compiler erhalten. Keine sichtbaren technischen Vertragsoptionen in den Lernfluss schreiben.

Miss Runtime und Frameverhalten vor Änderungen. Welle 2 misst FigureRuntime 10027 B gzip, Shared-Kit 5975 B separat; Smoothie-Framebefunde aus Welle 1 sind weiterhin offen. Für die gemeinsame Readout-Typografie die in S5 gemeldeten 13 px prüfen. Eine Änderung pro Performanceversuch, mindestens 5 Prozent gemessener Gewinn und korrekte Bilder/Tiefe; Größen separat ausweisen. Keine Budgeterfüllung durch Verschieben in ungenannte Chunks. Canvas erst mit begründetem Bedarf und vollständigem Lifecycle-Vertrag statt als vorsorglichen zweiten Renderer bauen.

Für sichere F1-Hinweispräfixe, freie Spuren und dauerhaften CPython-Abgleich zuerst die im Trace-Vertrag geforderten Daten/Validierungsregeln konkret festhalten. Neue permanente Prüfungen nur nach Noas konkretem Auftrag. pick-learning-rate, tag-after-line und weitere Familienaufgaben brauchen ausdrücklich zugewiesene versionierte Antwort-/Graderverträge; offene Punkte als Folgeauftrag dokumentieren, nicht beiläufig alle Aufgabenfamilien registrieren. Keine Änderungen an exklusiven Familienlektionen oder ihren Modellen. Vorhandene Szenen als Verbraucher nutzen; erforderliche Familienanpassungen als genaue Übergabe nennen.

Basis-Gate einmal, danach gezielte Arbeit und am Abschluss das vollständige bestehende Gate auf 4411. Reale Browser-Sichtung der betroffenen F7-, F1-/F2-Auswahl- und Hinweiszustände, geöffnete mobile/helle/dunkle Bilder, fachliche Gegenprobe, Shrink Complexity und drei Leistungsläufe nach gemeinsamen Regeln. Digest docs/session-<datum>-figuren-s2b.md mit genauem API-/Basisübergabepunkt und noch offenen Verträgen. Familien erhalten erst nach Integration einen konkret geprüften Commit, keinen privaten Runtime-Fork.
```

## Übergabe an Integrator 3

Server aller Welle-3-Worktrees einschließlich 4411 stoppen. Bei vorhandenem S2b zuerst dessen gemeinsame Verträge prüfen und integrieren; nötige Verbraucheranpassungen vor dem Familienabschluss auf einen konkret geprüften Integrationscommit bringen. Anschließend S6b, S7, S8a und S8b seriell integrieren, Registry-/Allowlist-Konflikte additiv/alphabetisch lösen, bei anderen Konflikten anhalten. Die zwischen Familien übergebenen Fragmente unter ihrem eindeutigen Besitzer einbinden. Nach jedem Merge Node/Typecheck; abschließend volles Gate auf 4400 und die tatsächlich integrierten Zustände sichten. Neue Anfragen wieder der nächsten zuständigen Session zuweisen. S5b und die F7-/F1-Nachläufe bleiben ausdrücklich sichtbar, bis ihre Abnahme erfüllt ist.

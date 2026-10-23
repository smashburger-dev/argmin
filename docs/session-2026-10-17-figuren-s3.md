# S3 – F3 Vektorraum und F4 Elimination

**Weiterer Auftrag nach dieser Übergabe:** Noa hat die gemeinsame Figurenhülle, Drag-Bedienung und Schattenprojektion ausdrücklich zur Überarbeitung beauftragt. Diese Änderungen erweitern den ursprünglichen S3-Dateibesitz auf Runtime, Engine und Figuren-CSS. Aktueller Stand und Integrationshinweise stehen in `docs/figuren-s3/bedienung.md`. Der Skill heißt jetzt Workbench (`.devin/skills/workbench/SKILL.md`). Die frühere Anfrage nach gesperrter Orbit-Bedienung für flache Diagramme ist damit umgesetzt. Die untenstehenden Performancewerte und Gesamt-Gate-Ergebnisse dokumentieren die ursprüngliche S3-Abnahme vor diesem UI-Nachtrag.

Branch: `feature/figuren-s3`. Kein Push, kein Merge. Grundlage ist der vorhandene Beats-Vertrag von `feature/figuren`; Engine, Painter und vorhandene Kit-Dateien bleiben unverändert. Die beiden Registries und die Public-Allowlist enthalten ausschließlich hinzugefügte Zeilen.

## Ergebnis und Bezug zur Lektüre

| Szene | Sichtbarer Vorgang | Darstellung und Grenzen |
|---|---|---|
| smoothie-row-and-column | Beiträge als Pfeilkette, Korrektur zum Ziel, Wechsel zum selben Lösungsvektor im Zeilenbild, negativer Koeffizient | Jeweils ein großes frontales Diagramm auf der Werkbank. Abstrakte Komponenten b₁/b₂ statt fälschlicher Nährwertachsen; der Lektionsübergang nennt das System. Kein Import der Smoothie-Szene. |
| solution-cases-3d | Ebenen schneiden sich in Gerade/Punkt; Abhängigkeit und anschließender Widerspruch | Glaswürfel auf dem Drehteller. Tatsächliche Ebenen-Würfel-Schnitte ohne künstliche Unterteilungskanten. Die Wände begrenzen nur den Ausschnitt. |
| span-carpet | Fünf Flächeneinheiten des Parallelogramms; bei abhängigen Richtungen fällt die Fläche zu einer Linie zusammen | Komplett neu als unverzerrte frontale Flächenszene. Lektionsbeispiel u=(2,1), v=(1,3), det=5. Alter Checkpoint mit det=3 als ausdrücklich benannte Übertragung. Drei sinnvolle Schritte; kein zusätzlicher Raumtrip. |
| receipt-elimination | Zweiten Einkauf verdoppeln, ersten abziehen, rückwärts einsetzen, gültige Zeile negativ skalieren | Zwei große frontale Zettel. Keine Theke, keine isometrische Kasse und keine überlagerten Kopien. Text bleibt auf dem fachlich relevanten Papier. Preise exakt 5/2 und 2 Euro. Der Lektionsabsatz nennt die korrekte Subtraktionsrichtung. |
| receipt-echelon-3x3 | Ausgangssystem, eindeutige Stufenform, freie Variable, Widerspruch 0=5 | Vier Schritte einer großen frontalen erweiterten Matrix. Café-Analogie hier aufgegeben. Noa bewertete diese Darstellung im Review als passend. |

Die Lektionen systems, gauss und independence enthalten jeweils höchstens zwei Beats-Figuren. Gauss und independence sind für die Platzierung in Intro und Details geteilt. Der theoretische 3D-Hinweis zur Spannfläche bleibt in der Lektüre. PCA und K-Means folgen wie vorgesehen in S5b.

Die vier ersetzten .viz.json-Dateien sind bytegleich erhalten. Ihre Checkpoints wurden einschließlich Prompt, Hilfen, Fehlerantworten, Toleranz und erwartetem Wert wörtlich übernommen; nur die Zuordnung zum Beat kam hinzu. Übertragungen sind kenntlich gemacht. Ein lokales, nicht öffentlich allowlistetes Archivmanifest hält die alten Quellen für den Compiler referenziert. Es wird keine zusätzliche öffentliche Lektion eingeführt.

## Was aus dem Review verbindlich wird

Der Skill, Authoring-Guide, ADR und die Pläne wurden von Smoothie-spezifischen Pflichten gelöst. Keine allgemeine Pflicht zu Tafel, Lesezoom, Sequenz, Vorhersage oder vollständiger Erklärung in der Bühne. Die Lektüre trägt die Erklärung; die Figur zeigt die Beziehung oder Veränderung. Die Analogie und das Beispiel dürfen für die bessere Darstellung angepasst werden.

Konkrete Regeln stehen in `docs/figuren-design-und-assets.md`: einfache Hauptansicht vor Details prüfen; 16/12/8 px als Ausgangswerte für Rand, Gruppen und Labels; vorhandene Text-/Datenbeziehungen statt beliebiger Requisiten; gleiche Maßstäbe für ebene Diagramme; lesbare Schrift und mindestens 4,5:1 Kontrast zur tatsächlichen Trägerfläche in beiden Themes. Die Zahlen sind Review-Arbeitswerte, keine pauschale Layoutformel.

`docs/figuren-s3/assets.md` dokumentiert gezielte wiederverwendbare Teile, deren Einsatzgrenzen und ihren Freigabestatus. Vollständige Szenen sind Kompositionsbeispiele. Ein Remix übernimmt nur benötigte Teile und prüft Datenbereich, Projektion und kleine Zielansicht erneut.

**Aktuellste Prüfentscheidung von Noa:** Keine neuen figurspezifischen Tests und Snapshot-Sammlungen standardmäßig, auch nicht automatisch für neue Assets. Die während S3 angelegte Testsuite und ihre Referenzbilder wurden wieder entfernt. Frühere entsprechende Testpflichten dieses Auftrags und der Pläne sind dadurch aufgehoben. Vorhandene Referenzlöser, Compiler und Messwerkzeuge sowie Shrink Complexity weiterverwenden. Eigene Browser-Sichtung bleibt Aufgabe des implementierenden Agenten.

## Sichtung und einmalige Nachweise

Alle fünf Kontaktbögen unter `docs/figuren-s3/` wurden nach der letzten Darstellungskorrektur selbst geöffnet. Zusätzlich mobile Einzelansichten in Originalgröße angesehen. Sie zeigen alle tatsächlichen Schritte bei 1440 und 375 px, hell/dunkel. Die überladene Kompass-Geometrie und schrägen Drei-Zettel-Bilder sind verworfene Fassungen und keine Vorlagen.

Die falsche Graustufe auf den Eliminationszetteln wurde durch die kontrastreiche `board`-Papierfläche ersetzt. Die gemessenen tatsächlichen Schrift-/Flächenfarben erreichen bei jedem Zustand in beiden Themes mindestens 4,5:1. Das Einzelbild `docs/figuren-s3/receipt-elimination-dark.png` zeigt die korrigierte mobile Ansicht.

Vor Entfernung der S3-Testsuite bestanden 29 fachliche/Geometrieprüfungen und 12 Browser-Prüfungen. Dazu gehörten der Vergleich mit unabhängigen Referenzlösern, negative Kontrollen, Compilerprüfung der Original-Checkpoints, Bedienung, mobile Label-Kollisionen und Kontrastmessung. Diese Resultate sind einmalige Nachweise; es bleiben dafür keine neuen Testdateien im Repository.

## Frame-Zeit und Größe

Bestehendes `tests/e2e/figures-perf.spec.ts` unverändert genutzt: drei Läufe je Szene, A1, Chromium, vierfache CPU-Drosselung, beide Breiten. Werte sind Median der drei Skriptzeit-Mediane in Millisekunden, jeweils Beat / Ziehen / Übergang:

| Szene | 1440 px | 375 px | Szenen-Chunk gzip |
|---|---|---|---|
| smoothie-row-and-column | 1,0 / 1,1 / 2,1 | 0,8 / 1,0 / 1,9 | 2.153 B |
| solution-cases-3d | 0,8 / 1,5 / 0,8 | 0,7 / 1,3 / 0,6 | 1.711 B |
| span-carpet | 0,9 / 0,7 / 1,1 | 0,9 / 0,6 / 1,0 | 1.427 B |
| receipt-elimination | 0,6 / 0,8 / 0,4 | 0,7 / 0,8 / 0,6 | 1.351 B |
| receipt-echelon-3x3 | 0,1 / 0,5 / 0,1 | 0,1 / 0,4 / 0,1 | 1.348 B |

Alle Budgets eingehalten; bestehende FigureRuntime 8.924 B gzip. Die Chunk-Werte sind die jeweiligen Entry-Chunks; gemeinsame Kit-Chunks werden separat geladen. Rohdaten: `docs/figuren-s3/perf-<szene>-<lauf>-<breite>.json`. Überholte Messungen verworfener Fassungen wurden entfernt.

Reproduktion: App auf 4402 starten, `node docs/figuren-s3/perf-adapter.mjs` auf 4498 starten, Szene über `/__scene/<id>` wählen. Dann `FIGURE_PERF=1 FIGURE_PERF_STYLES=a1 E2E_REUSE_SERVER=1 E2E_PORT=4498 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium --workers=1`. Der lokale HTTP-Adapter wählt nur die native Szene im Lab und entfernt ihre Vorhersagesperre für die Messung. Für kurze Szenen wird der alte feste Beat-3-Einstieg des Messwerkzeugs auf den vorletzten Zustand abgebildet. Das Szenenmodell und der Renderer bleiben unverändert. „board“ misst hier den jeweiligen Inhaltsübergang, keinen erzwungenen Tafelzoom.

## Gesamt-Gate und Anfragen

Das vollständige Gate wurde einmal ausgeführt. Inhaltscompiler, Validierung, Coverage, Typecheck, Release-/Public-Build, Project-Runner und Komplexitätsprüfung bestehen. Der eigene Fehler mit Text hinter der verpflichtenden Begriffsliste wurde korrigiert; die bestehende Lektionen-Stilprüfung besteht danach mit 580/580. Compiler, Validierung, Release-Build und Skill-Validator wurden nach der Korrektur erneut erfolgreich ausgeführt. Details: `docs/figuren-s3/gate.json`.

Das Gesamt-Gate ist **nicht vollständig grün**. Offene Befunde in fremdem Besitz:

- Integrator: `tests/content_visualizations.test.mjs` verlangt starr 27 alte Visualisierungen. Nach vier tatsächlichen Ersetzungen sind 23 im öffentlichen Bündel verknüpft. Die starre Mengenannahme fachlich aktualisieren oder entfernen; keine künstlichen alten Blöcke nur für den Test in die Lektionen zurückbauen.
- S2/Integrator: `tests/e2e/figures.spec.ts:96` und `:402` suchen „Weiter“ seitenweit. Systems enthält jetzt erlaubte zwei Figuren. Die vorhandenen Selektoren auf die konkret geprüfte Figur begrenzen. Beide Befunde treten in Dev- und Release-Browserlauf auf.
- Zuständiger UI-Bereich: vorhandener Tour-A11y-Test meldet für „Tour starten“ 4,22:1 (#d9cdf4 auf #6d3fd4). In einem isolierten Wiederholungslauf bestätigt. Dieser Button liegt außerhalb der Figuren und des S3-Dateibesitzes.

Weitere Anfragen an S2:

- `kind: "beats"` erst mit dem vorgesehenen Schema übernehmen: Das hier vorliegende Schema erlaubt das Feld noch nicht. S3 verwendet ausschließlich dessen vorhandenen impliziten Beats-Vertrag, keine neuen Figurenarten.
- Direkte Auswahl von Würfelebenen/Zellen samt Tastaturäquivalent; eigenständige statische oder interaktive Darstellungsarten. Nicht über Events in reinen Szenenmodulen improvisieren.
- Frontale Diagramme sollen ihre Orbit-Bedienung gezielt deaktivieren können. Die heutige Engine bietet dafür keinen szenenspezifischen Vertrag. Die Hinweise der 2D-Figuren regen deshalb kein Drehen an.
- Szenenauswahl im vorhandenen Figurenlabor/Messwerkzeug, damit künftige Sessions keinen HTTP-Auswahladapter benötigen.
- Hinweisfiguren erst nach dem S2-Vertrag: transform-rank-dependence-rowops, classify-rank-solution-case und formula-det2-independence; ausschließlich sichere Nachbarbeispiele.

## Review-Checkliste

- [x] Fünf eigene Szenen, gezielte eigene Objekte, nur neue Kit-Dateien.
- [x] Bestehender Painter, Engine und Kit-Bestand unverändert; Registry/Allowlist rein additiv.
- [x] Geschützte Checkpoints wörtlich erhalten; alte .viz.json-Dateien nicht gelöscht.
- [x] Lektionsbezug, geänderte Analogien und Abweichungen vom Bühnenkatalog erklärt.
- [x] Alle finalen Kontaktbögen und mobile Einzelbilder selbst angesehen.
- [x] Dunkelmodus der Zettel korrigiert und tatsächlichen Kontrast geprüft.
- [x] Frame-Messung dreimal pro Szene sowie Chunk-Größen dokumentiert.
- [x] Keine neuen figurspezifischen Tests oder Snapshot-Dateien verbleiben.
- [x] Bestehendes Gesamt-Gate ausgeführt; verbleibende fremde Befunde konkret benannt.
- [ ] Fremde Gate-Befunde durch die zuständigen Sessions beheben.
- [ ] Noas abschließende gestalterische Freigabe für die übrigen Szenen; Matrix wurde als passend bewertet.

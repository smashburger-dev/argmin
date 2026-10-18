# Session S4b: F12 und scene-build

Begonnen 17.10.2026, nach Limitunterbrechungen am 18.10.2026 fortgesetzt. Worktree: `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s4b`, Zweig `feature/figuren-s4b`, Basis `2836575` (Integration Welle 1). Arbeitsbaum beim Start sauber. Kein Push, kein Merge.

## Lernentscheidungen vor der Geometrie

Workbench und S3s Bedienungsvertrag sind verbindlich. Alle neuen Darstellungen nutzen die gemeinsame Hülle. Vor Detailgeometrie festgelegt:

| Figur | Lernfrage und vorhandene Erklärung | Form und notwendige Teile | Mobile Prüfung vor Ausbau |
|---|---|---|---|
| balance-isolate | Warum bleibt die Lösung beim beidseitigen Abziehen und Teilen gleich? Der Absatz „Balkenwaage“ erklärt Lösungsmenge und erlaubte Operationen; das folgende Beispiel rechnet 5x − 7 = 2x + 8. Eine kleine vorgeschaltete Gleichung 2x + 3 = 7 isoliert den Mechanismus. | flat. Zwei Schalen, geschlossene x-Karten, Zahlgewichte, gemeinsamer Balken und Operationszeichen. Keine Marktstand-Requisiten; negative Werte als beschriftete gestrichelte Karten statt scheinbar positiver Masse. | Anfang, −3 und Halbierung bei 375 px zuerst ansehen; Schalen und Gleichung getrennt halten. |
| bag-unpack | Welcher Inhalt wird vom äußeren Faktor und Minus getroffen? Die Lektüre erklärt 3(x + 2) − 2(x − 1) bereits vollständig. | flat. Tütenumrisse, x-Karten und Zahlenkarten. Auspacken gruppiert gleiche Terme, zurückgegebene Tüten wechseln jedes Vorzeichen. Keine ganze fremde Szene. | Gepackt, ausgepackt, zusammengefasst zuerst bei 375 px. Geschützter Flächencheckpoint bleibt wörtlich als ausdrücklich anderes Beispiel erhalten. |
| power-stack | Zählt der Logarithmus den Endwert oder die Verdopplungen? Der angrenzende Absatz erklärt 1 → 2 → 4 → 8 → 16 → 32. | flat. Fünf gestapelte Operationsstufen mit kumuliertem Wert und Stufenzahl. Gleiche Stufenhöhen zählen Operationen, keine lineare Mengenskala. | Start, fünfte Verdopplung und Umkehrfrage bei 375 px. Keine 32 kleinen Einzelteile. |
| mix-to-target | Treffen die eingegebenen Koeffizienten beide Zielkoordinaten? Die Spaltenbild-Lektüre erklärt Linearkombination und negative Portionen. | flat. Zwei Koordinatenachsen, zwei Summandenpfeile, Zielring und Differenzpfeil aus simulation. Formular ist kanonisch. | Nullmischung, falsche und richtige Mischung bei 375 px; negative und gebrochene Eingaben. |
| balance-solve | Erhält mein selbst gewählter Weg die Lösungsmenge und stellt x frei? Bezug zur Waagenlektüre, kein zweites Gleichungsmodell. | flat. Dieselben gezielten Waagenteile wie in der Lektion. Formularoperationen über applyBalanceStep, Urteil und letzter gültiger Zustand aus dem Grader. | Ausgang, gültiger Zwischenschritt und Fehlerzustand bei 375 px; Operationen und Bruchfelder mit 44-px-Zielen. |

Referenzen vor Bau gefunden: `solveLinearIsolate`, `solvePowerLogExponent`, `solveExpressionCanonical` in foundations_construct_families.mjs; exakte Gleichungen in balance_model.mjs; Mixer in scene_build_grader.mjs und Smoothies originalem evaluate. Wiederverwendung beschränkt sich auf camera.fitZoom und die einzelnen Plane-/Text-Primitive aus linalg-stage, keine dessen Szenenkompositionen.

## Anfragen an den Integrator

Task-Dispatch vor Implementierung geprüft: FamilyExerciseView besaß noch keinen scene-build-Zweig und serialisierte Objektantworten in Strings. S4b ergänzt den Dispatch, die Objektübergabe und eigene Formularmodule. Neue `spec.params` waren bereits renderbar; ein Formularplatz vor den gemeinsamen Knöpfen und ein Restart-Rückruf fehlten.

Noa hat folgende konkrete Erweiterungen ausdrücklich freigegeben:

- `stepContent` und `onRestart()` in FigureBlock/Runtime. Beim Modellwechsel entfernt die Runtime ihre alten SVG-Items; sonst blieben beim Neuaufbau unsichtbar veraltete Painter-Knoten erhalten. Engine und Painter bleiben unverändert.
- Kleine gemeinsame CSS-Korrektur: `minmax(0, 1fr)` in der Lektürespalte verhindert eine 678-px-Gridspur in der mobilen 332-px-Spalte.
- Genau `balance-solve` und `mix-to-target` im vorhandenen Familien-Golden-Korpus und dessen bestehender Abweichungsliste ergänzen. Keine neue Testdatei oder Snapshot-Baseline.

Schema, Compiler-Figurenteil und bestehende Hinweiszuordnungen bleiben unverändert. Es gibt keine private Ersatz-Runtime und keinen zusätzlichen Grader.

## Umsetzung und fachliche Nachweise

Die drei Lektionsfiguren sind an ihren erklärenden Absätzen eingebunden. `bag-unpack` ersetzt die alte Distributivgesetz-Darstellung. Die alte `.viz.json` bleibt erhalten und ist über eine lokale Archivlektion erfasst. Der geschützte Flächencheckpoint ist im neuen letzten Schritt einschließlich Prompt, Eingabe, Erwartung, Toleranz, Hinweisen und typischen Fehlern wörtlich erhalten. Algebraabschnitte wurden für die passende Platzierung geteilt, nicht inhaltlich entfernt.

Die Aufgabenfamilien sind erst mit Renderer, Formular und deterministischem Registry-Pfad öffentlich platziert. Coverage regulär regeneriert: 46 Kompetenzen, 50 Lektionen, 290 Aktivitäten. Registry-Einträge und Public-Allowlist sind gezielt additiv; keine Wildcard-Ausweitung. Keine Laufzeitabhängigkeit ergänzt.

`{ kind: 'scene-build', schemaVersion: 1, form, steps }` bleibt die kanonische Antwort. Der Waagenpfad verwendet ausschließlich das vorhandene exakte Modell und `applyBalanceStep`; der Mixer verwendet den bestehenden Grader mit `fields` und `simulation`. Kamera und Pointer stehen außerhalb der Antwort. Der Learning-Ledger erhält über `familyEventInput` das Antwortobjekt. Datenbank-/Exportversion 3 und die bestehenden Migrationen bleiben erhalten. Eigene Formulardrafts liegen im vorhandenen Draft-Store; Restart setzt das Formular zurück, ohne Hinweise oder Offenlegung zurückzuerstatten.

Einmalige fachliche Gegenprüfungen:

- Waagenlektion gegen `solveLinearIsolate`, Tüten gegen `solveExpressionCanonical` (1x + 8), Verdopplungen gegen `solvePowerLogExponent` (5).
- Exakte Zustandsübergänge und stetige Beat-Übergänge verglichen; alter Checkpoint tief auf Gleichheit geprüft.
- 824 Registry-Läufe: 100 reguläre Seeds und drei Rand-Seeds über sämtliche Fälle und Profile der beiden Familien. Alle Referenzantworten akzeptiert.
- 139 vorhandene Familien-Golden-Digests bleiben unverändert. Der Benchmark-Pin ändert nur seinen Digest und `uncovered` von 180 auf 182. Entfernt man die zwei neuen, ausdrücklich nicht unterstützten Einträge, entsteht wieder exakt der alte Digest; 4.991 vorhandene Items/Mutanten bleiben unverändert. Dieser Benchmark bewertet die beiden neuen Szenenfamilien nicht.

## Eigene Browser-Sichtung

[Assetkatalog](figuren-s4b/assets.md), [Übersicht](figuren-s4b/review/overview.jpg), [Lektionskontaktbogen](figuren-s4b/review/lessons-contact.jpg), [Aufgabenkontaktbogen](figuren-s4b/review/tasks-contact.jpg). Alle Kontaktbögen und mobilen Einzelbilder wurden selbst geöffnet; keine Freigabe durch Noa behauptet.

375/1440 px, Hell/Dunkel: Anfang, entscheidende Änderung und Ergebnis geprüft. Power-Beschriftung und Aufgaben-Schriftgröße nach realer Sichtung korrigiert. Die finale mobile Messung umfasst alle 13 Lektionsschritte und beide Aufgabenansichten je Theme: mindestens 14,10 px Schrift, 5,10:1 Kontrast gegen die tatsächliche Materialfläche und 44 px Touchziele, kein horizontaler Überlauf. Die schmalste tatsächliche Task-Bühne hat 267 px, also weniger als die geforderten 343 px.

Tatsächlich bedient: falsche/richtige Eingaben, verworfene einseitige Waagenschritte, Division durch null und Skalierung mit x, zwei gültige Bruch-Lösungswege (erst teilen bzw. erst sammeln), negative Unicode-/Bruch-Eingaben, alternative abhängige Mischung und unmöglicher Lösungsfall. Tastatur einschließlich Enter und gemeinsame Schrittnavigation geprüft. Vertikaler Touch-Scroll auf einer flachen Bühne bewegt die Seite um 251 px.

Hinweis-/Mastery-Nachweise: Ein Hinweis bleibt nach Reload gezählt. Zwei Hinweise schließen den Kompetenzbeleg aus. Nach Offenlegung, Reload und erneuter korrekter Lösung bleibt dieselbe Variante disqualifiziert. Frischer Seed kann wieder zählen; „Nächste Variante“ liefert einen anderen Seed. JSON-Export und Import der tatsächlich entstandenen neun Versuche erhält alle Antwortobjekte und Assistance-Zustände exakt; Version 3, fünf Scene-Drafts. Einzelheiten in den beiden JSON-Messberichten im Review-Ordner.

Laufzeit mit vorhandenem Engine-Messhook, 4× CPU-Drosselung, jeweils drei Läufe, Median der Mediane:

| Szene | 375 px | 1440 px |
|---|---:|---:|
| balance-isolate | 2,3 ms | 2,2 ms |
| bag-unpack | 1,4 ms | 1,5 ms |
| power-stack | 1,7 ms | 1,5 ms |

## Verifikation

`npm ci`: 132 Pakete installiert; Audit meldet einen bestehenden High-Befund. Keine Abhängigkeiten geändert. Basis-Gate vor Änderungen: Node 2.240 Tests, 2.228 bestanden, zwölf übersprungen, keine Fehler; Typecheck, Content und Coverage bestanden.

Abschlussstand:

| Prüfung | Ergebnis |
|---|---|
| Content-Compiler, Content-Validator, Coverage | bestanden; 46/50/290 |
| Vollständige bestehende Node-Suite | Exit 0, keine Fehler |
| Bestehende S4a-Scene-Build-Prüfungen | 9 bestanden |
| Typecheck | bestanden |
| Projekt-Runner | 20 Prüfungen, eine übersprungen, keine Fehler |
| Chromium Dev, `E2E_PORT=4404` | 97 bestanden, 25 übersprungen |
| Chromium Release, `E2E_PORT=4404`, eigener Preview-Server | 95 bestanden, 27 übersprungen; Build und Public-Validator bestanden |
| Public-/Leak-Grenzen | bestehende Node- und Release-Prüfungen bestanden |
| Shrink Complexity | eigene neue Funktionen ≤ 10; geerbte Ausnahmen unten |

Die Dev-Sichtung lief mit strikt gebundenem Port 4404. Vor dem Release-Lauf wurde dieser Server beendet; der Release-Lauf nutzte keinen Dev-Server wieder. Keine neuen dauerhaften Tests oder Szenen-Snapshot-Sammlungen angelegt; die Browserproben waren einmalige Skripte außerhalb des Repositorys.

## Budgets und bekannte Basisbefunde

Alle eigenen Szenen-Chunks liegen unter 12.000 Byte gzip. Gemessene Chunks: balance-isolate 1.191, bag-unpack 1.333, power-stack 955, balance-solve 688, mix-to-target 1.117 Byte. Gemeinsame gezielte F12-Helfer: 1.109 Byte; zusätzlich vorhandene linalg-stage-/figure-kit-Teile werden wiederverwendet, nicht kopiert. Das eigene lazy Formularmodul hat 2.142 Byte gzip.

Auch einschließlich der zusätzlich geladenen gemeinsamen Diagrammteile und des benötigten Waagenmodells bleiben die Lektionsfiguren darunter: balance-isolate 10.222, bag-unpack 9.431, power-stack 9.053 Byte gzip als Summe der einzeln komprimierten Chunks. Die gemeinsame Runtime ist separat gemessen.

Die gemeinsame Runtime lag bereits an der Welle-1-Basis bei 10.003 Byte gzip und damit drei Byte über dem strikten 10.000-Byte-Budget. Mit den freigegebenen Schnittstellen sind es zunächst 10.060 Byte (+57). Eine konkrete Vereinfachung der unveränderten Checkpoint-Feldkopie wurde als zusätzliche Integrator-Anfrage gestellt; bis zur Entscheidung ist das Runtime-Budget ausdrücklich offen.

Der Komplexitätslauf über alle berührten UI-/Szenenmodule meldet nur geerbte Funktionen in FamilyExerciseView: `parseFamilyRef` 16, `FamilyExerciseView` 62, `submit` 29 und `workspaceOutput` 12. Ihre Basiswerte sind identisch. Der bereits bestehende Loader ist von 12 auf 10 reduziert. Keine eigene neue Funktion überschreitet 10. Das gemeinsame große View-Modul wurde nicht außerhalb der notwendigen Dispatch-Anbindung umgebaut.

Bestehende Build-Hinweise: deprecated `advancedChunks` und große sonstige Bundles. Diese sind keine S4b-Szenenfehler und werden nicht als behoben gemeldet.

## Übergabe

F12-Kompositionen, scene-build-Formulare, Datenpfad, Content und Nachweise sind lokal reviewbar. Runtime-Budgetentscheidung und Noas visuelle Freigabe bleiben ausdrücklich offen. Keine Engine-/Painter-Änderung, kein Push und kein Merge in `feature/figuren`.

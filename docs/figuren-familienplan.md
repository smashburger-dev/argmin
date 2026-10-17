# Figuren: Plan pro Szenenfamilie

Stand 17.10.2026, Branch `feature/figuren-s1`. Baut auf `docs/session-2026-10-16-figuren-recherche.md` auf (dort §7 Familien, §7a Szenen-Aufgaben, §7b Lösungshilfe, §8 Abdeckung, §9 Fahrplan). Dieses Dokument legt pro Familie fest, welche Szenen entstehen, welches Modell die Zahlen liefert, was das Kit dafür zusätzlich können muss, wie der Hinweismodus maskiert und wie die Szenen-Aufgabe bewertet wird. Alles hier gilt unabhängig von der Stilwahl A1 bis A4; wo ein Stil eine Familie teurer oder schwieriger macht, steht es im Abschnitt „Stilrisiko“.

Jede Familie ist eine eigene Session (Recherche §9). Reihenfolge bleibt: F3 und F4, dann F12 mit dem Aufgabentyp-Spike, dann F7, dann F1 und F2, dann F5 und F8, dann der Rest.

## Gemeinsame Regeln für alle Familien

- **Szenenvertrag wie in Session 1.** Reines Modul unter `assets/js/figures/scenes/<szene>.mjs` mit `validateParams`, `model`, `beatIds`, `beatDuration`, `pose`, `build`, `cameraFor`, `readout`, `describe`, `answerValues`, `predictValue` und, wo eine Szenen-Aufgabe folgt, `evaluate`. Die Darstellung kommt vollständig aus dem Kit; eine Szene schreibt keine eigene Render-Komponente, solange das Kit die nötigen Teile hat.
- **Ein Modell, drei Nutzer.** Lektionsfigur, Hinweisfigur und Szenen-Aufgabe rechnen mit demselben `model`. Wo eine Aufgabenfamilie schon einen Löser hat, ruft das Szenenmodell ihn auf oder prüft sich im Node-Test gegen ihn. Zwei Rechnungen für dieselbe Größe sind ein Fehler.
- **Checkpoint-Übernahme.** Ersetzt eine Figur eine `.viz.json`, übernimmt sie Frage, erwarteten Wert, Toleranz, Hinweise und `typicalErrors` wörtlich. `compile_content` prüft, dass `predictValue` den erwarteten Wert liefert.
- **Stabile Topologie.** `build` liefert für jede Pose dieselben Items; sichtbar, Ton, Koordinaten und Text ändern sich, die Liste nicht. Das hält jede Szene im Frame-Budget und macht die Tiefenprüfung vollständig.
- **Tiefenprüfung als Test.** `paintOrderErrors` muss für alle Beat-Endzustände über die Winkelreihe 0 Fehler melden. Neue Körperarten bringen einen Negativtest mit.
- **Kein Text als Erklärpfeil.** Text steht auf der Tafel, auf Etiketten an Körpern oder in Karte und Beschriftung.

## Kit-Ausbau nach Bedarf

Das Kit aus Session 1 hat Kamera, Quader mit runden Kanten, Zylinder, Ebenen-Inhalt (Text in Läufen, Linien, Pfeile, Gitter, Punkte, Rechtecke), Weltlinien, Tiefensortierung mit Auflage-Beziehung, Folgen und Feder, Beats. Jede Familie fügt nur hinzu, was sie braucht, und bringt Tests mit.

| Baustein | Inhalt | gebraucht von | gebaut in |
|---|---|---|---|
| K1 Kachelfläche | Höhenfeld z = f(u, v) als Kacheln mit Schattierung je Normale, Sortierung je Kachel, Höhenlinien (Marching Squares), Projektion auf den Boden, Schnittkurve mit einer senkrechten Ebene | F7, F3 (Ebenen) | S5 |
| K2 Zellgitter | Tabelle als Ebene (Zellen, Werte, Kopfzeile) und als Quader aus Zellen; Zeilen- und Spalten-Sweep, Zelle hervorheben | F2, F4, F8, F1 | S3 (2D), S6 (3D) |
| K3 Code-Tafel | Monospace-Zeilen mit Zeilennummern, Markierung der aktuellen Zeile, Tönen für Schlüsselwörter, Zeilen-Beats statt Umbruch | F1, F5 | S6 |
| K4 Ebenen im Raum | unendliche Ebene ax + by + cz = d, geschnitten an einem Würfel; Schnittgeraden zweier Ebenen; Schnittpunkt | F3 | S3 |
| K5 Punktwolke | Kugeln als schattierte Scheiben mit Tiefensortierung, Schatten auf Boden oder Lineal | F3 (PCA), F6, F8, F9 | S3 |
| K6 Weltpfeil | Pfeil aus Zylinderschaft und Kegelspitze, Länge animierbar | F3, F7 | S3 |
| K7 Graph | Knoten und Kanten auf einer Ebene oder in der Welt, laufende Marken auf Kanten, Werte an Knoten | F10, F5 | S7 |
| K8 Bausteinband | Zeichen und Token als Steine auf einem Band, Verschmelzen zweier Steine, Fenster über dem Band | F11 | S8 |
| K9 Station | Bearbeitungsstation mit Eingang, Ausgang, Fehlerrutsche und Etikett | F5 | S7 |
| K10 Hebel und Waage | Balken auf Schneide, Neigung aus Drehmoment über `settle`, Schalen hängen lotrecht | F12 | S4 |
| K11 Zahlenfeld-Steuerung | Parameter aus der Figur als Zahlenfeld mit Plus und Minus (44 px), an das Modell gebunden; Ziehen nur als zweiter Weg | alle mit „Erkunden“ | S3 |
| K12 Schnüre | Linie von einem Namensschild zu einem Objekt mit Führung um Hindernisse, Endpunkt landet immer auf etwas | F1 | S6 |

Die gemeinsame Objektbibliothek (`assets/js/figures/objects/`) wächst mit: Werkbank, Tafel, Behälter, Schaufel, Mixer (S1); Kassenzettel und Zettelspieß (S3); Waage, Gewichte, Tüte, Ballon (S4); Wanderer-Kugel, Spur (S5); Namensschild, Tablett mit Fächern, Garderobe, Rahmenkarte (S6); Station, Kiste, Förderband (S7). Objekte sind Funktionen `(Parameter, Pose) → Items`, keine SVG-Dateien.

## Erweiterungen des Vertrags, die vor F1 und F2 nötig sind

- **Erzeugte Beats.** Trace-Szenen haben so viele Beats wie Programmschritte. `.fig.json` erlaubt dann `"beats": { "from": "trace" }`; die Szene erzeugt Beat-IDs und deutsche Beschriftungen aus Vorlagen. `compile_content` erzeugt sie beim Kompilieren und schickt sie durch dieselben Textprüfungen wie Lektionen.
- **Erkunden.** `"explore": [{ "param": "eta", "label": "Lernrate η", "range": [0.01, 1.2], "step": 0.01 }]` bindet ein Zahlenfeld an einen Modellparameter (K11). `validateParams` läuft für jeden erreichbaren Wert, also prüft der Compiler Ränder und eine Rasterung.
- **Modus `task`.** Eine Szene, die als Aufgabe dient, bekommt den Zustand aus dem Antwortformular (Recherche §7a) und zeigt das Ergebnis von `evaluate` als Simulation. Die Szene selbst speichert nichts.

## F3 Vektorraum (S3, zusammen mit F4)

Lektionen: `l-linalg-systems`, `l-linalg-independence`, `l-ml-svm-pca`.

| Szene | Lektion | Bild, das arbeitet | Beats | Vorhersage | ersetzt |
|---|---|---|---|---|---|
| `smoothie-column-picture` (S1) | systems | Mixer, Portionen werden Pfeile auf der Tafel | Zutaten, Hafer, Vorhersage, Beeren, Tafel, Geisterportion | Portionen Beeren für (4, 5) | nichts, kommt dazu |
| `smoothie-row-and-column` | systems | dieselbe Werkbank; die Tafel hat zwei Felder: links das Spaltenbild, rechts die Zeilen als zwei Geraden in der (x₁, x₂)-Ebene; die Portionen sind ein Punkt rechts und die Pfeilkette links | Zwei Bedingungen, eine Mischung als Punkt, Schnittpunkt ist die Mischung, Erkunden c₁ und c₂ | Checkpoint von `two-lines` (x = 1,4 bei c₁ = 3, c₂ = −1) | `two-lines` |
| `solution-cases-3d` | systems | zuerst zwei Geraden, dann drei Ebenen im Würfel auf der Werkbank, drehbar: Punkt, Buchrücken (gemeinsame Gerade), Prisma (kein gemeinsamer Punkt); die Tafel zeigt die Stufenform | Ein Punkt, Eine Gerade, Keine Lösung, Lesen an der letzten Zeile | Checkpoint von `solution-cases` (a = 1 bei c = 2) | `solution-cases` |
| `span-carpet` | independence | zwei Wegweiser auf einer Bodenplatte; das Parallelogramm wird mit Einheitsfliesen ausgelegt, die Zahl der Fliesen ist der Betrag der Determinante; bei Abhängigkeit kippt es zur Linie | Zwei Richtungen, Fläche, Abhängig, in 3D: dritter Vektor in der Ebene der ersten beiden ohne Parallele (die „hinkt“-Stelle der Lektion), Spat wird flach | Checkpoint von `span-2d` (det = 3 bei k = −1, s = 1,5) | `span-2d` |
| `pca-shadow` | ml-svm-pca | Punktwolke auf einem Drehteller, eine Lampe wirft den Schatten auf ein Lineal; die Breite des Schattens ist die Varianz entlang der Achse; Drehen bis der Schatten am breitesten ist | Wolke, Achse und Schatten, Drehen, beste Achse, Eigenrichtung (Av liegt auf v) | Checkpoints von `pca-axis` (θ = 0,46) und `eigen-direction` (Faktor 3) | `pca-axis`, `eigen-direction` |
| `kmeans-pizza` | ml-svm-pca | Filialen wandern zum Schwerpunkt ihrer Kunden; Kunden wechseln die Farbe nie allein, sondern mit Form der Marke | Start, Zuordnen, Verschieben, nächste Runde, fest | Zentren nach einer Iteration | nichts |

Modell: lineares System mit exakten Brüchen (Cramer für 2×2, Elimination für 3×3), Spannfläche als Determinante, PCA über die Kovarianzmatrix (2×2 und 3×3 symmetrisch, Eigenwerte geschlossen bzw. Jacobi mit fester Iterationszahl), k-Means mit fester Startbelegung. Tests gegen `formula-det2-independence`, `classify-rank-solution-case`, `fit-pca-kmeans-pipeline` (Löser dort aufrufen, nicht nachbauen; Namen der Löserfunktionen beim Bau prüfen).

Kit: K4, K5, K6, K11, Fliesen als Kacheln (Vorstufe von K1).

Hinweismodus:
- `transform-system-2x2-elimination`, `classify-column-combination`: der Mixer mit den Zahlen der Aufgabe; Pfeilkette ohne Längen an den gesuchten Pfeilen, Tafel zeigt `x₁ = ?`, `x₂ = ?`.
- `classify-rank-solution-case`, `multiple-choice-linalg-independence`: Klassifikationsaufgaben bekommen nie ihre eigene Geometrie, weil die Lage der Ebenen die Antwort ist. Sie bekommen eine Lesehilfe: alle drei Fälle nebeneinander an einem festen Nachbarbeispiel. Regel für alle Familien: Bei Klassifikation zeigt die Hinweisfigur die Klassen, nie die Instanz.
- `formula-det2-independence`: Fliesen zählen verrät die Determinante. Nachbarbeispiel mit anderen Vektoren und derselben Vorzeichenlage.

Szenen-Aufgabe `mix-to-target`: Generator zieht a₁, a₂ (S4: optional a₃) und b über `familySubseed`; Lösungen ganzzahlig oder halbe Portionen. Formular: zwei Zahlenfelder plus die Wahl „kein Treffer möglich“. Grader: `evaluate(model, portionen)` muss treffen; bei abhängigen Zutaten und b außerhalb der Geraden ist nur „kein Treffer möglich“ richtig; bei unendlich vielen Lösungen zählt jede Mischung, die trifft. Rückmeldung: Differenzpfeil auf der Tafel, Mixeranzeige „0,5 Eiweiß zu viel“.

Stilrisiko: Ebenen im Raum brauchen Transparenz. A1 und A4 können getönte Ebenen mit Deckkraft zeichnen; A2 und A3 haben keine echte Transparenz, dort zeigt ein gröberes Raster bzw. eine weitere Schraffurrichtung die hintere Ebene. Das muss im Stil-Spike von S3 an einer Ebene geprüft werden.

## F4 Eliminations-Stepper (S3)

Lektionen: `l-linalg-gauss`, Teil von `l-linalg-systems` (Lösungsfall aus der Stufenform).

| Szene | Lektion | Bild, das arbeitet | Beats | Vorhersage | ersetzt |
|---|---|---|---|---|---|
| `receipt-elimination` | gauss | Kassenzettel auf einem Zettelspieß, je Zeile ein Zettel mit Posten (Kaffee, Croissant, Betrag); „Zeile 2 − 2 · Zeile 1“: der Zettel wird verdoppelt (zweiter Zettel legt sich darauf), dann Posten für Posten abgezogen, das Croissant verschwindet; die Tafel zeigt dieselbe erweiterte Matrix, der Pivot leuchtet; ein kleines Zeilenbild auf der Tafel dreht die zweite Gerade um den festen Schnittpunkt | Zwei Zettel, Vielfaches, Abziehen Eintrag für Eintrag, Stufenform, Rückwärts einsetzen | Faktor des nächsten Schritts; Checkpoint von `row-operation` (y = −1 bei λ = −1) | `row-operation` |
| `receipt-echelon-3x3` | systems | drei Zettel, dieselbe Mechanik; am Ende zeigt die letzte Zeile 0 = 0, 0 = 5 oder einen Pivot | drei Fälle als Beats | Lösungsfall aus der Stufenform | nichts |

Modell: Elimination mit Brüchen, jede Operation als Datensatz `{ op: 'add', target, source, factor }`, `{ op: 'scale', row, factor }`, `{ op: 'swap', a, b }`. Prüfung gegen `transform-system-2x2-elimination` und `transform-rank-dependence-rowops`.

Kit: K2 als Ebene (Zellen mit Brüchen), Zettel als dünne Platte mit Ebenen-Inhalt, Stapeln zweier Zettel.

Hinweismodus: `transform-system-2x2-elimination` zeigt den ersten Schritt mit den Zahlen der Aufgabe und stoppt; der Wert nach dem Rückwärtseinsetzen bleibt `?`. `classify-row-operation-validity` bekommt die Lesehilfe (erlaubt, nicht erlaubt) am Nachbarbeispiel.

Szenen-Aufgabe `eliminate-yourself`: Formular mit Operationsart, Zeilen und Faktor, Liste der Schritte. Grader über Eigenschaften: jede Operation ist elementar (Faktor ≠ 0 beim Skalieren, Quelle ≠ Ziel beim Addieren), die Lösungsmenge bleibt gleich (Vergleich der reduzierten Stufenform der erweiterten Matrix), am Ende steht Zeilenstufenform. Reihenfolge frei. Rückmeldung: eine unerlaubte Operation wird am Zettel rot umrandet und mit Text erklärt; Farbe nie allein.

## F12 Waage (S4, mit dem Aufgabentyp-Spike)

Lektionen: `l-foundations-algebra`, `l-foundations-algebra-transformations`.

| Szene | Lektion | Bild, das arbeitet | Beats | Vorhersage | ersetzt |
|---|---|---|---|---|---|
| `balance-isolate` | algebra | Balkenwaage auf der Werkbank; x ist eine geschlossene Dose mit unbekanntem Inhalt, Zahlen sind Gewichte; beide Seiten −3, beide Seiten halbieren (Gewichte in zwei gleiche Gruppen teilen); eine ungleiche Operation lässt den Balken sichtbar kippen | Gleichung als Waage, minus 3 auf beiden Seiten, halbieren, x allein, Wo der Vergleich hinkt: negative Zahlen als Ballons, die nach oben ziehen | x nach dem nächsten Schritt | nichts (`linear-function` bleibt JSXGraph, Regel §5a) |
| `bag-unpack` | algebra-transformations | Einkaufstüten: 3(x + 2) als drei Tüten mit je einem Apfel x und zwei Bananen; Auspacken verteilt; ein Minus vor der Tüte dreht jeden Inhalt in einen Schuldschein | Tüten, Auspacken, Zusammenfassen, Minus vor der Tüte, hinkt: x als Bruch | Term nach dem Auspacken; Checkpoint von `distributive-law` (20 bei a = 4, b = 2, c = 3) | `distributive-law` |
| `power-stack` | algebra | Potenz als Stapel aus Verdopplungen, Logarithmus als Frage nach der Stapelhöhe | Stapeln, Höhe ablesen, Umkehrfrage | Exponent für eine Zielhöhe | nichts |

Modell: lineare Gleichung ax + b = cx + d mit Brüchen; Operationen auf beiden Seiten; Äquivalenz über die Lösungsmenge (bei linearen Gleichungen: dieselbe Lösung und kein Faktor 0). Neigung des Balkens aus dem Unterschied der Seiten bei einem Probewert, über `settle` (Waage schwingt nicht über, kritisch gedämpft). Parameter aus `transform-linear-equation-isolate` und `worked-example-fading-linear-equations`.

Kit: K10, Dosen, Gewichte, Ballon mit Schnur (Schnur landet auf der Schale).

Hinweismodus: `transform-linear-equation-isolate` zeigt die Waage der Aufgabe und den ersten Schritt; die Dose bleibt zu, die Tafel zeigt `x = ?`. `transform-expression-simplify-canonical` zeigt das Auspacken an einem Nachbarterm.

Szenen-Aufgabe `balance-solve`: Formular mit Operation (plus, minus, mal, geteilt durch; Wert oder Vielfaches von x). Grader: jede Operation erhält die Lösungsmenge (Teilen durch 0 oder durch einen Ausdruck mit x wird abgelehnt), am Ende steht x allein mit dem Wert des Lösers. Jeder Weg zählt. Rückmeldung: die Waage kippt bei einer ungleichen Operation und erklärt, welche Seite fehlt.

Vorarbeit S4 (unabhängig von der Szene, in Recherche §7a gelistet): Format der strukturierten Antwort im Attempt-Datensatz und im JSON-Import, Golden-Korpus, Mastery-Regeln, Review-Routing für frische Seeds, `activityTypeLabels`, Titelregeln, Coverage-Matrix. Das ist die eigentliche Arbeit von S4; die Szene ist danach klein.

## F7 Optimierungslandschaft (S5, Messlatte §6a)

Lektionen: `l-grad-regression`, `l-ml-linear`, `l-ml-regularization`, `l-dl-training`, `l-dl-regularization` (Early Stopping).

| Szene | Lektion | Bild, das arbeitet | Beats | Vorhersage | ersetzt |
|---|---|---|---|---|---|
| `mse-landscape` | grad-regression | vier Datenpunkte auf einem Plotterblatt vorn, dahinter die MSE-Fläche über (w, b) als Kachelfeld mit Höhenlinien und deren Projektion auf den Boden; die Kugel (der Wanderer) liegt am aktuellen Punkt, der Gradientenpfeil liegt in der Fläche, seine Komponenten entlang der Achsen; jeder Schritt hinterlässt eine Spur; Lernrate als Zahlenfeld | Daten und Gerade, die Fläche, Schnitt bei festem b (die Sekante wird zur Tangente), Gradient am Punkt, ein Schritt an der Tafel `w ← w − η · ∂L/∂w`, viele Schritte, zu große Lernrate (die Kugel springt über das Tal und divergiert), hinkt: eine zweite Landschaft mit zwei Tälern | nächstes w; Checkpoints von `mse-bowl` (4,67 bei w = 2,5) und `secant-tangent` (3 bei x₀ = 1,5) | `mse-bowl`, `secant-tangent` |
| `residual-springs` | ml-linear | Punkte auf einem Steckbrett, die Gerade als Lineal; Residuen als Federn, Federenergie ∝ Residuum²; ein Ausreißer zieht das Lineal | Punkte, Federn, Ausreißer, Gleichgewicht = kleinste Quadrate | Wohin kippt die Gerade?; Checkpoint von `residuals` (MSE 1,125 bei m = 1, b = 0) | `residuals` |
| `rubber-band-coefficients` | ml-regularization | jeder Koeffizient ist ein Schlitten auf einer Schiene; Ridge hängt ein Gummiband zur Null daran, Lasso eine Mautschranke, an der kleine Schlitten auf exakt 0 einrasten | ohne Strafe, Ridge, Lasso, λ erhöhen | Welcher Koeffizient fällt zuerst?; Checkpoint von `ridge-shrink` (w* = 1 bei λ = 2) | `ridge-shrink` |
| `training-book` | dl-training | Übungsbuch: Seite = Batch, Kapitel = Epoche, Korrekturstift = Optimizer-Schritt, synchron mit einer 1D-Landschaft; Lernkurven auf der Tafel | Seite, Kapitel, Kurven, Überanpassung | Anzahl Updates; Checkpoint von `lr-step` (0,4 bei x₀ = 2, lr = 0,4) | `lr-step` |
| `early-stopping-flag` | dl-regularization | dieselbe Tafel mit Train- und Validierungskurve, eine Fahne am Minimum der Validierung | Kurven, Abstand wächst, Fahne | Checkpoint von `early-stopping` (0,45 bei t = 10) | `early-stopping` |

Modell: MSE eines linearen Modells auf festen Daten, Gradient in geschlossener Form (Prüfung gegen `optimize-mse-gradient-closed-form` und einen numerischen Gradienten), Gradientenabstieg mit η, Erkennung von Divergenz (Verlust wächst über drei Schritte), Ridge und Lasso in geschlossener Form für den orthogonalen Fall (Prüfung gegen `formula-ridge-lasso-closed-form`). Jeder Punkt der Spur kommt aus der Iteration, keine Choreografie.

Kit: K1 mit höchstens 400 Kacheln (20 × 20); Tiefe je Kachel, Prüfung mit `paintOrderErrors` über Winkel und Elevationen ab 15°; Höhenlinien; K6; Zahlenfeld für η.

Hinweismodus: `optimize-gradient-update-rule` zeigt die Landschaft der Aufgabe und den Gradientenpfeil, das neue w bleibt `?`; `optimize-sgd-step-pure-update` zeigt die Spur ohne Zahlen bis zum gefragten Schritt. `classify-training-curve` bekommt die Lesehilfe (drei Kurvenformen) am Nachbarbeispiel.

Szenen-Aufgabe `pick-learning-rate`: Lernende wählen η so, dass der Abstieg in höchstens n Schritten nahe genug ans Minimum kommt, ohne dass der Verlust zwischendurch steigt. Grader simuliert mit dem Modell; mehrere η sind richtig. Rückmeldung: die Kugel zeigt den gewählten Lauf.

Stilrisiko: Hier entscheidet der Stil am meisten. 400 Kacheln mit Musterfüllung (A2 Raster, A3 Schraffur) kosten Malzeit; die Messung von S1 je Stil ist der erste Anhaltspunkt. A3 kann auf gekrümmten Flächen Moiré zeigen, wenn die Schraffur nicht der Fläche folgt; dort zeichnet die Schraffur besser die Höhenlinien selbst. A4 (ohne Linien) zeigt Flächen am weichsten, verliert aber Kanten zwischen Kacheln, also braucht die Fläche dann Höhenlinien als einzige Linien. Rückfall bei Überschreitung: Kachelfläche in Canvas 2D unter dem SVG, alles andere bleibt SVG.

## F1 Trace-Stepper (S6)

Lektionen: `l-foundations-python-state`, `l-foundations-control-flow`, `l-foundations-functions`, `l-foundations-code-reading`, `l-foundations-collections`, `l-foundations-testing-debugging`.

| Szene | Lektion | Bild, das arbeitet | Beats | Vorhersage |
|---|---|---|---|---|
| `name-tags` | python-state | Code auf der Tafel, Werte als Klötze auf der Werkbank, Namen als Schilder an Schnüren; Neuzuweisung hängt das Schild um, `a, b = b, a` vertauscht in einem Schritt | je Programmschritt ein Beat | Wert von `a` nach drei Zeilen |
| `bouncer` | control-flow | Türsteher prüft Karten; bei `and` bleibt die zweite Karte grau, wenn die erste schon falsch ist (Kurzschluss); Schleife als Nudeltopf mit Fortschrittsanzeige | je Schritt | Wie oft läuft die Schleife? |
| `vending-frame` | functions | Getränkeautomat: Münzen sind Argumente, beim Aufruf öffnet sich ein Rahmen (Karte) mit eigenen Schildern, `return` fällt ins Ausgabefach, `print` nur aufs Display | je Schritt | Was steht danach in `x`? |
| `ledger` | code-reading | Kassenbuch: eine Zeile pro ausgeführtem Schritt, der Zeiger springt bei Schleifen zurück | je Schritt | nächste ausgeführte Zeile |
| `two-tags-one-list` | collections | Tablett mit Fächern als Liste, zwei Schilder an demselben Tablett, `append` ändert, was beide sehen; Garderobe als Dictionary; Gästeliste als Set | je Schritt | Inhalt von `b` nach `a.append` |
| `smoke-detector` | testing-debugging | Arrange, Act, Assert als drei Stationen; Eingrenzen durch Halbieren der Commit-Reihe | je Schritt | Welcher Test schlägt an? |

Modell: kein eigener Python-Interpreter. Die Spur (Zeile, Bindungen, Objekte, Ausgabe je Schritt) steht in `.fig.json` oder kommt aus dem Generator der Familie (`trace-assignment-state`, `trace-collection-state`, `trace-dict-state-update`, `trace-call-composition`, `trace-exception-path`). Ein Werkzeug prüft jede Spur gegen CPython über `sys.settrace` und läuft im Python-Job der CI (`npm run test:project-runner` hat den Python-Pfad schon). Beats werden aus der Spur erzeugt (Vertragserweiterung oben).

Kit: K3, K12, Tablett, Garderobe, Rahmenkarte; Aliasing braucht zwei Schnüre zum selben Objekt ohne Kreuzung durch Körper.

Hinweismodus: `trace-assignment-state` und Verwandte spielen die Spur bis vor die gefragte Zeile; der gefragte Wert bleibt `?`, das Schild hängt an einem leeren Haken.

Szenen-Aufgabe `tag-after-line`: nach jeder Zeile setzen Lernende die Schilder (Formular: je Name eine Auswahl des Objekts; Ziehen der Schilder als zweiter Weg). Grader vergleicht Bindungen je Schritt mit der geprüften Spur; Rückmeldung je Name.

Stilrisiko: Code ist Text. Die Code-Tafel ist in allen Stilen glatt und kontraststark; Raster und Körnung dürfen nie darüber liegen.

## F2 Matrix- und Tensorbank (S6)

Lektionen: `l-linalg-matrices`, `l-numpy-shape-contracts`, `l-dl-tensors`, `l-tf-attention`, `l-tf-finetuning`, `l-dl-regularization` (Dropout-Maske).

| Szene | Lektion | Bild, das arbeitet | Vorhersage | ersetzt |
|---|---|---|---|---|
| `order-times-prices` | matrices | Bestellzettel (Zeilen) mal Preistafel (Spalten); der Sweep läuft Zeile mal Spalte mit laufender Summe; ein Steckvertrag „innen gleich“ als Stecker mit Pins; zweiter Teil: Spaltenbild (Portionen von Spalten) | Form des Produkts; Checkpoint von `column-picture` (b = (4, 7) bei x = (1, 2)) | `column-picture` |
| `plug-adapter` | numpy-shape-contracts | Stecker und Reiseadapter: Broadcasting streckt eine Zeile sichtbar über die Tabelle; `*` gegen `@` als zwei Steckarten; die Matrix als Verformung des Einheitsquadrats (Fläche = det) | Ergebnisform oder Fehler; Checkpoint von `matrix-transform` (det = 4) | `matrix-transform` |
| `tensor-address` | dl-tensors | Quader aus Zellen wie ein Buch (Seite, Zeile, Spalte); eine Zahl wird über ihre Adresse gefunden; Formen fließen durch Schichten und ändern den Quader | Ausgabeform und Parameterzahl | nichts (`activations` bleibt JSXGraph) |
| `library-attention` | tf-attention | Query-Karte vergleicht Buchrücken (Keys), Scores werden zu Lesezeit-Anteilen (Softmax mit Temperatur), Values mischen; Kausalmaske graut die Zukunft aus | Gewicht eines Tokens; Checkpoint von `softmax-temperature` (0,88) | `softmax-temperature` |
| `frozen-matrix-strips` | tf-finetuning | eingefrorene Gewichtsmatrix als Block mit Reif, daneben zwei schmale Streifen B und A; ihr Produkt legt sich als dünne Schicht darüber | zusätzliche Parameter | nichts |
| `team-mask` | dl-regularization | Team mit Fehlzeiten: feste Maske pro Schritt, bei Inferenz volles Team mit Skalierung | überlebende Aktivierungen | nichts |

Modell: Matrixprodukt, Broadcasting-Regel (NumPy-Semantik, gegen `classify-shape-contract` und `validate-shape-contract` prüfen), Softmax mit Temperatur und Top-k (gegen `optimize-softmax-attention-mask`), LoRA-Parameterzahl (gegen `formula-lora-delta-apply`).

Kit: K2 in 3D (Zellquader bis etwa 4 × 4 × 3 sichtbare Zellen; größere Tensoren als Block mit Achsenbeschriftung und Ausschnitt), Stecker mit Pins.

Hinweismodus: `classify-matrix-shape` zeigt die Stecker der Aufgabe, das Ergebnis ist ein Stecker mit `?` an den Pins. `optimize-softmax-attention-mask` zeigt die Scores, die Gewichte bleiben verdeckt.

Szenen-Aufgabe `layer-chain`: Formen der Gewichtsmatrizen wählen, bis die Schichtkette passt, und die Parameterzahl angeben (Generator aus `fit-forward-layer-chain-contract`). Grader: jede Verbindung passt, Summe der Parameter stimmt. Maskierte Attention-Zellen ausfüllen (`construct-attention-mask`).

## F5 Pipeline (S7)

Lektionen: `l-foundations-files-errors`, `l-data-cleaning`, `l-ml-cv`, `l-tf-inference`, `l-genai-rag`, `l-genai-security`, `l-genai-prototype`, `l-capstone-runner`, `l-capstone-freeze`.

Bild: Stationen auf einem Förderband mit Ein- und Ausgabevertrag am Etikett; Datensätze sind Kisten; eine Ausnahme rutscht über die Fehlerrutsche zur `except`-Grenze. Szenen: `goods-in` (files-errors), `cleaning-line` (data-cleaning, mit F6 für die Mittelwertverschiebung), `fold-rotation` (ml-cv: fünf Übungsblätter rotieren, Leakage fließt sichtbar über die Split-Grenze), `token-conveyor` (tf-inference: Token, Logits, argmax, zurück an den Anfang), `mail-sorter` (genai-security: eingeschmuggelte Anweisung bleibt im versiegelten Umschlag Daten, Werkzeuge hinter einer Allowlist-Schranke), `house-ablation` (genai-prototype: ein Bauteil raus, Fehlerquote steigt), `trades-stopwatch` (capstone-runner: Gewerke mit Übergabeprotokoll, Stoppuhr pro Stage, Timeout).

Modell: Zustand je Kiste und Station als reine Funktion; Fold-Größen bei n mod k, Leakage-Regeln aus `classify-cv-leakage` und `validate-leakage-rule-audit`, Zeilenzählung aus `count-remaining-rows-cleaning-rule`, Status nach Timeout aus `reproduce-pipeline-status-report`.

Szenen-Aufgaben: Stationen topologisch ordnen; die Split-Grenze so setzen, dass keine Information vom Test in das Training fließt. Grader über Eigenschaften (gültige Ordnung, kein Leak).

## F6 Verteilung (S8)

Lektionen: `l-eda-distributions`, `l-ml-repro`, `l-ml-error-analysis`, Teil von `l-data-cleaning`.

Bild: Punkte fallen in Fächer und bauen das Histogramm; ein Regler ändert die Fachbreite und damit die Form; Median und Quartile werden zum Boxplot (Morph mit gleicher Punktmenge); ein Würfelband zeigt gleiche Folge bei gleichem Seed und Streuung über Seeds; ein Flussquerschnitt zeigt die Tiefe je Teilgruppe (der flache Fluss der Lektion). `normal-density` bleibt JSXGraph (freier Funktionsgraph).

Modell: Kennzahlen gegen `formula-descriptive-stats-numpy`, `formula-metric-spread-range`, `formula-stat-from-table`; Seeds über denselben PRNG wie `reproduce-seeded-split`.

## F8 Schwellen-Sortierer (S7)

Lektionen: `l-ml-logistic`, `l-ml-baseline`, `l-genai-eval`, `l-responsible-ai`.

Bild: Mails liegen auf einer Wahrscheinlichkeitsschiene, eine Schranke bei t sortiert in Ordner; die Konfusionsmatrix füllt sich als vier Fächer mit Zählern; bei der Baseline landet bei 1 % Betrug alles im Postfach, 99 % Accuracy, Recall 0; bei responsible-ai laufen zwei Ströme mit getrennten Raten und einem Paritätsband. Ersetzt `sigmoid-threshold` (2 Werte rechts der Grenze) und `precision-recall-threshold` (F1 = 0,75 bei t = 0,5).

Modell: gegen `aggregate-confusion-metric`, `aggregate-parity-threshold-selection`, `classify-sigmoid-regime`.

Szenen-Aufgabe: Schwelle so setzen, dass die Präzision mindestens p bei größtem Recall gilt. Grader prüft die Eigenschaft, nicht einen Wert.

## F9 Baum und Abstimmung (S8)

Lektion: `l-ml-ensembles`. Bild: Bestimmungsschlüssel teilt ein Feld mit Punkten durch Zäune rekursiv, Gini als Balken je Seite, danach stimmen mehrere Bäume ab (Stimmzettel in einer Urne). Modell gegen `optimize-tree-best-split`, Vorhersage „Gini nach dem Split“. Szenen-Aufgabe: den besten Split wählen, Grader vergleicht Gini mit dem Löser (bei Gleichstand zählt jeder beste).

## F10 Graph (S7 oder S8)

Lektionen: `l-dl-autograd`, `l-foundations-git`, `l-capstone-freeze`.

Bild: Wechselkurse als Netz: vorwärts laufen Werte, rückwärts werden Kurse multipliziert, an Gabelungen addiert (`optimize-backprop-path-sum`, `classify-backprop-path-rule`); Speicherstände: Arbeitsordner, Staging-Tablett, Commit-Graph, Merge zweier Äste (`classify-git-operation`); Fundament: Stages in topologischer Ordnung mit Freeze-Siegel (`trace-toposort-dependency-order`).

Szenen-Aufgabe: Stages topologisch ordnen; Grader prüft jede Kante.

## F11 Text und Token (S8)

Lektionen: `l-tf-tokenizer`, Teil von `l-genai-rag`.

Bild: Zeichen als Steine auf einem Band, das häufigste Paar verschmilzt zu einem Stein (Lego und Kurzschrift der Lektion); ein Fenster gleitet für Chunks mit Überlappung über das Band; Karteikarten für top-k. Ersetzt `chunk-overlap` (4 Chunks bei s = 4, o = 1, Länge 10). Modell gegen `transform-bpe-merge-apply`, `optimize-bpe-merge-learn`, `trace-chunk-window-loop`.

## Statische Figuren (S8)

Lektionen ohne Vorgang über Zeit (Congruence): `l-foundations-learning` (Journal-Karte mit vier Feldern, Review-Abstände auf einer Zeitachse), `l-tf-papers` (Gerichtsverhandlung: Claim-Karten mit Evidenzfäden, absolut gegen relativ), `l-research-question` (Wettschein mit Zeitstempel vor dem Lauf, Goal-Shift markiert), `l-research-cards` (drei Beipackzettel mit Konsistenzlinien), `l-capstone-acceptance` (Bauabnahme mit Mängelprotokoll), `l-capstone-regression` (Statik und Brandschutz), `l-capstone-repro` (Bauakte). Sie nutzen dasselbe Kit ohne Beats, mit aufklappbaren Teilen (Klick oder Taste klappt eine Karte auf, sonst bewegt sich nichts).

Einzige Bewegung: `l-capstone-baseline`, das Siegel. Ein geändertes Byte ändert den ganzen Hash. Das Modell rechnet echtes SHA-256 in reinem JavaScript; ein Node-Test vergleicht mit `node:crypto`. Die Figur zeigt die 64 Hex-Zeichen als Siegelring, beim Ändern eines Bytes kippen die geänderten Zeichen nacheinander (etwa die Hälfte der Bits, gezählt aus dem Modell).

## Was jede Familien-Session mitbringt

1. Szenenmodule mit Node-Tests (Zahlen gegen Löser, Kontinuität der Posen, stabile Topologie, Tiefe über Winkel, Lecksperre im Hinweismodus).
2. `.fig.json` je Lektion, Checkpoints der ersetzten `.viz.json` wörtlich übernommen, `build_public`-Allowlist ergänzt, alte `.viz.json` entfernt (mit Noas Freigabe, weil Löschung).
3. Playwright: Stills je Beat in hell und dunkel bei 1440 und 375 px, axe, reduzierte Bewegung, Touch, Frame-Zeit bei vierfacher Drosselung.
4. Chunk-Größe je Szene im Bericht (Ziel unter 12 kB gzip).
5. Noas Review an einem Kontaktbogen.

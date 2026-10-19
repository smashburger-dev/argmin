# S8b: eigene Darstellungen

Stand 19.10.2026. Eigene, programmatisch erzeugte SVG-Geometrie im vorhandenen
A1-Painter. Keine fremden Bilder, kryptografischen Pakete oder CDN-Zugriffe.
Prüfstatus: im Browser bedient und visuell geprüft; keine vorweggenommene Freigabe durch Noa.

## Wahl der Darstellung

| Szene / Verwendung | Zweck und Bereich | Grenze |
|---|---|---|
| `backprop-network` / Autograd | Vier Schritte: Eingang 2, Zweige 3x und x², Summe 10, Rückwärtsbeiträge 3 und 4 | Kleiner skalarer DAG; keine allgemeine Tensor-Autograd-Bibliothek |
| `git-snapshots` / Git | Vormerken, späteres Editieren, Commit des Index; anschließend zwei Eltern eines Merge-Commits | Versionsnamen v1/v2/v3 illustrieren Snapshots; Konfliktlösung und Rebase werden nicht simuliert |
| `freeze-order` / Freeze | Bereite Knoten und abgeschlossene Vorgänger in einem verzweigten DAG | Zeigt eine gültige gepinnte Ordnung, bewertet keine selbst gewählte Reihenfolge |
| `bpe-letterpress` / Tokenisierung | Drei gelernte Paarverschmelzungen desselben kleinen Wortkorpus; Wortendmarker bleiben sichtbar | Kleingeschriebene ASCII-Wörter, kein produktiver LLM-Tokenizer |
| `chunk-windows` / RAG | Zehn Unicode-Codepoints, Größe 4, Überlappung 1, Schrittweite 3, vier Starts einschließlich Restfenster | Zeichenfenster, keine Gleichsetzung von Zeichen und Modelltoken |
| `sha256-seal` / Baseline | Tatsächliche SHA-256-Digests von UTF-8 `a` und `b`; 126 von 256 Bits ändern sich | Zeichenübergang ist eine Anzeigeanimation, kein weiterer Hash; keine Kollisionsfreiheitsgarantie |
| `retrieval-handoffs` / RAG | Fester gerichteter Informationsfluss: Index und Anfrage treffen im Ranking zusammen | Keine animierte oder bewertete Pipeline; IO- und Fehlergrenzen stehen zusätzlich im S7-Fragment |
| `evidence-cards:journal` / Lernen | Beobachtung, Reproduktion, Hypothese, nächster Test | Feste Beispielkarte, kein bearbeitbares Fehlerjournal |
| `evidence-cards:review` / Lernen | Feste Zeitachse zwischen Abruf, Fälligkeit und erneutem Abruf | Keine Behauptung universell optimaler Intervalle; kein Scheduler-Ersatz |
| `evidence-cards:papers` / Paper-Lektüre | Derselbe Beleg als absoluter und relativer Unterschied: 2 % auf 1 % | Didaktisches Zahlenbeispiel, keine neue empirische Studie |
| `evidence-cards:protocol` / Forschungsfrage | Vorab-Schwelle 0,75 und nachträgliche Schwelle 0,60 unterscheiden | Veranschaulicht Goal-Shift, erteilt kein Forschungsurteil |
| `evidence-cards:cards` / Karten | Gleicher Projektname in Daten-, Modell- und Systemkarte | Namensgleichheit allein beweist keine vollständige Konsistenz |
| `evidence-cards:acceptance` / Abnahme | Manifest, Messwerte, benannte Mängel und getrennte Mastery-Prüfung | Die feste Karte erteilt keine Abnahme |
| `evidence-cards:regression` / Regression | Fehlender Retrieval-Beleg und falsche Antwort trotz Beleg unterscheiden | Feste Testfälle decken keinen gesamten Sicherheitsraum ab |
| `evidence-cards:repro` / Reproduktion | Zwei gleiche Digests desselben kanonischen Fixture-Beispiels mit Versionen und Seeds | Hash belegt Bytegleichheit dieses Beispiels; keine automatische Mastery |

Nur die sechs tatsächlichen zeitlichen Vorgänge verwenden Beats. Die neun
festen Darstellungen sind `kind: inline` mit einer unveränderlichen Pose.
Sie erhalten kein aufklappbares Ersatz-UI. Vollständige Begriffe und längere
Werte bleiben in der SVG-/Druckbeschreibung und der angrenzenden Lektüre.

## Geometrie und Lesbarkeit

Alle Szenen sind ausdrücklich `flat`, ohne Orbit oder Bodenschatten.
Die Graphen schneiden Kanten an Knotenrechtecken ab; Zweige haben dieselbe
Skala. Token behalten ihre ursprünglichen Slots, wenn sich Paargruppen ändern.
Der SHA-Ring liest sich ab oben links im Uhrzeigersinn; seine vier Leseflächen
drehen die Zeichen mit der Leserichtung statt sie senkrecht zu stapeln.

Die neun Inline-Darstellungen passen zur tatsächlich 160 px hohen Bühne.
Die übrigen Szenen verwenden die vorhandene quadratische Bühne. Geprüfte
Viewportbreiten sind 375 und 1440 px; die Bühne selbst ist jeweils schmaler.
`review/measurements.json` trennt Viewport- und Bühnenbreite. Feste Karten
haben rechtsbündige Werte mit innerem Rand und getrennte Zeilen.

Text bleibt SVG-Text. Seine Farbe stammt aus den vorhandenen A1-Tokens:
normale Beschriftung `hi`, aktueller Bezug `lit`, Trägerfläche `plate` bzw.
der tatsächliche Bühnenhintergrund. Der Messlauf berücksichtigt transformierte
Schriftgröße, tatsächliche Füllfarbe, Trägerfarbe und volle Deckkraft.
Die endgültigen Messwerte und geöffneten Kontaktbögen stehen im Sessiondigest.

## Bedienungsgrenzen

Zurück, Weiter, Von vorn und die vorhandenen Tasten bleiben die gemeinsame
Hülle. Vertikale Touch-Gesten scrollen die Lektion; die flache Kamera bleibt
unverändert. Reduced Motion erreicht den Zustand unmittelbar. Forced Colors
und der vollständige Drucktext verwenden den bestehenden zugänglichen Pfad.
Der alte Chunk-Checkpoint ist feldgleich in `predict` übernommen.

Freie Parameter, direkte Auswahl und eine Toposort-Aufgabe warten auf den
zugewiesenen gemeinsamen Antwort-/Gradervertrag. K7 bleibt ein reiner
Geometrievertrag; siehe [frühe Übergabe](k7-contract.md). Es gibt keinen
Familien-Grader und keine eigene Runtime.

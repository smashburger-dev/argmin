# S3: wiederverwendbare Teile und geprüfte Kompositionen

Stand 17.10.2026. Status „visuell geprüft“ bezeichnet die eigene Sichtung des finalen Kontaktbogens und mobiler Einzelbilder durch den implementierenden Agenten. Eine Freigabe durch Noa wird damit nicht behauptet.

| Teil | Zweck und Schnittstelle | Geeignet / Grenzen | Beleg und Status |
|---|---|---|---|
| `kit/rational-rows.mjs` | Exakte Brüche, Zeilenoperationen, Eliminationsspur, Klassifikation | Kleine Lehrsysteme mit ganz- oder halbzahligem Eingang; keine allgemeine numerische Algebra | Mit Referenzlösern und unabhängigen Rechnungen geprüft |
| `kit/cube-plane.mjs` | `cubeSection(normal, distance, radius)` liefert den tatsächlichen Schnitt eines Würfels mit einer Ebene | Ebenenumriss im Glaswürfel; kein Flächenfüller, kein Sichtbarkeitsrenderer | Schnittpunkte erfüllen Ebenengleichung und Würfelgrenzen; mobile Würfelbilder visuell geprüft |
| `kit/space-sheet.mjs` | Rechteckige Weltfläche aus kleinen Flächen mit Teil-Indizes | Gezielte transparente Außenflächen; Teilungskanten nicht als mathematische Gitter darstellen | Geometrie-/Tiefenprüfung; keine allgemeine Würfelszenen-Vorlage |
| `objects/echelon-board.mjs` | Drei Zeilen einer erweiterten Matrix, feste Spalten x/y/z/b | Genau drei Bedingungen mit kleinen Werten; frontal. Mehr Spalten oder lange Brüche brauchen einen neuen Layout-Entwurf | `receipt-echelon-3x3.png`, visuell geprüft; Noa: „passt“ (17.10.2026) |
| `objects/receipt-stage.mjs` | Zwei frontale Einkaufszettel mit ausgerichteten Posten und Zeilenoperation | Kaffee-/Croissant-Beispiel der Lektion; nicht auf beliebige Matrixgrößen ausdehnen | `receipt-elimination.png`, visuell geprüft; keine Freigabe durch Noa |

Die Szenen `span-carpet`, `smoothie-row-and-column` und `solution-cases-3d` sind Referenzkompositionen, keine universellen Assets. Der Flächenszene helfen ihre konkreten Vektoren, der Zeilen-/Spaltenfigur ein gemeinsamer großer Bildausschnitt und dem Würfel seine räumliche Schnittfrage. Ein Remix prüft diese Voraussetzungen neu.

Kontrastpaar der Zettel: `board` für die Papierfläche, normale Linienfarbe für Text und `lit` für die aktive Operation. Die Browser-Messung prüfte jede tatsächlich gerenderte Schriftfarbe gegen die gerenderten Papierflächen bei allen Schritten, hell und dunkel, mindestens 4,5:1. Ein anderes Papiermaterial oder ein anderer Akzent erfordert diese Prüfung erneut. Die frühere geschattete `hi`-Papierfläche ist für dieses Textobjekt ungeeignet.

Die Kontaktbögen in diesem Ordner zeigen alle tatsächlich angebotenen Schritte bei 1440/375 px und in beiden Farbschemata. Die Aufnahmen wurden während S3 erzeugt und selbst gesichtet. Künftige Aufnahmen direkt mit Browser-Werkzeugen anfertigen; dafür keine figurspezifische Testsuite anlegen. Zahlen, Labels und Ränder bei der neuen Datenauswahl erneut in Originalgröße prüfen. Die alte enge Kompass-Komposition und schrägen Zettel sind ausdrücklich keine Vorlagen.

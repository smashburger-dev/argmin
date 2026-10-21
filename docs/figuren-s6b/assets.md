# F2: frontale Zellen und feste Modelle

Eigentümer S6b. Status am 18.10.2026: in den sechs festen Lektionen fachlich und visuell geprüft, einschließlich aller Schritte in beiden Größen und Themes. Keine Freigabe durch Noa behauptet. Der tatsächliche Abschlussstand und die Messwerte stehen im Session-Digest.

## `objects/f2-grid.mjs`

Gezielte Frontalkomposition für kleine Zellgitter, bezeichnete Größenblöcke und Gewichtsleisten. Verwendet ausschließlich den vorhandenen Painter, `readingPlane` und die gemeinsame orthographische Kamera. Keine neue Runtime und kein neuer Kit-Vertrag.

- Eingaben: Zellwerte und kleine Zeichenketten, Position und quadratische Zellweite in einem 100×100-Koordinatenblatt. Werte und Zeilen-/Spaltenanzahl kommen aus dem Szenenmodell.
- `grid`: maximal vier numerische Spalten oder fünf kurze Rechenspalten in den geprüften Beispielen, bis drei Zeilen. Sichtbare Rahmen bedeuten Datenzellen beziehungsweise ausdrücklich beschriftete Rechenposten. Keine Mesh-Unterteilungen.
- `block`: bezeichnet die vollständige Form eines großen Arrays. Seine Ausmaße sind ein Schema und keine numerische Zellskala. W, B und A der großen LoRA-Figur sind ausdrücklich so beschriftet.
- `fixedScene`: feste, validierte Lektionsbeispiele, frontale Kamera, kontinuierliche 150-ms-Überblendung zwischen den Zustandsblättern. Reduzierte Bewegung nutzt den gemeinsamen direkten Endzustand. Der Modus `hint` wird abgewiesen.
- Keine direkte Auswahl, kein Explore-Feld, kein Aufgabenformular. Anforderungen dafür stehen früh im Session-Digest. Keine fachfremden Requisiten, kein Boden oder Schatten, keine Orbit-Bedienung.
- Freiraum: 16 px Kamerarand und mindestens 8 px zwischen unabhängigen Textgruppen an der kleinsten tatsächlichen Bühne prüfen. Schriftgröße 5,8 Blatteinheiten; bei 375 px Seite ist die Bühne 309 px breit, Schrift etwa 16,07 px. Die Szene wird auf Desktop mit gleichem horizontalen und vertikalen Maßstab gerendert.
- Text-/Trägerpaar: `hi` als volle Tinte beziehungsweise `lit` für den aktiven Wert auf Papier oder ungeschatteter `plate`. Beide Themes werden am gerenderten SVG einschließlich Deckkraft gemessen. Akzent stets zusammen mit Umriss, Adresse oder fachlichem Text.
- Grenzen: kein allgemeiner Tensor-Browser, keine beliebig großen oder langen Zellwerte. Größere Arrays als Block oder ausdrücklich bezeichnete Seite zeigen. Eine andere Datenmenge braucht ein neues mobiles Review.

## `objects/f2-models.mjs`

Matrixprodukt, Transposition, rechts ausgerichtetes NumPy-Broadcasting, NumPy-Matmul-Formregeln einschließlich Vektoren und Batch-Achsen, Layerformen samt Bias-Parametern, stabiles Softmax mit Temperatur/Top-k/Maske, Attention, LoRA und invertiertes Dropout. Reine Funktionen für die Darstellung, keine Grader.

Die einmalige Gegenrechnung in `model-check.json` verwendet die bestehenden Referenzimplementierungen von `optimize-softmax-attention-mask` und `formula-lora-delta-apply`, die Formberechnung aus `classify-shape-contract` und `validate-shape-contract` sowie NumPy. Keine neue permanente Testsuite. Die geschützten Checkpoints sind unverändert und gegen `predictValue` geprüft.

Dropout verwendet die ausdrücklich angegebene Folge `u=(0,2; 0,8; 0,1; 0,7)` und `p=0,5`: `M_i = 1[u_i < p]`. Das Modell behauptet keinen Zufalls-Seed. Training ergibt `(4,0,12,0)`, Inferenz `(2,4,6,8)` ohne weitere Skalierung. Über alle gleichwahrscheinlichen Masken bleibt der Erwartungswert des Eingangs erhalten.

Reviewbilder sind Sichtungsartefakte, keine Snapshot-Assertions. `review/contact-*.png` enthält die Zustände in beiden Größen und Themes; mobile Einzelbilder zeigen die engsten Zustände. Zweck, geprüfte Datenmenge und Grenzen dürfen bei Wiederverwendung nicht stillschweigend erweitert werden.

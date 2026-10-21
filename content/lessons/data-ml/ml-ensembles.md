# Entscheidungsbäume, Gini und Ensembles

Nicht jedes KI-Modell ist ein neuronales Netz: Auf Tabellendaten sind Entscheidungsbäume und ihre Ensembles oft die stärkste Methode. Diese Lektion zeigt dir, wie ein Baum einen Split wählt, was mehrere Bäume zusammen besser können und wo du die Stärken gegen schlichte Baselines abwägst.

## Das Bild dahinter: Bestimmungsschlüssel und Schätzwettbewerb

Ein **Entscheidungsbaum** fragt hintereinander Ja/Nein-Merkmale ab, wie ein Bestimmungsschlüssel für Pflanzen („Blätter gezähnt? ja/nein, dann weiter“). Für das **Ensemble** ein zweites Bild: 1906 beobachtete Francis Galton auf einem Jahrmarkt, dass der Median vieler Schätzungen des Gewichts eines Ochsen sehr nah am wahren Wert lag. Die einzelnen Schätzungen streuten, der Median traf, weil sich unabhängige Fehler ausglichen.

Wo der Vergleich hinkt: Bäume, die auf denselben Daten wachsen, machen ähnliche Fehler. Deshalb stellen Bagging und Random Forests Stichproben und Merkmalsauswahl her, damit die Fehler unabhängiger werden.

## Split: die Trennfrage

Ein **Split** ist eine Ja/Nein-Frage an ein Merkmal, etwa „Durchmesser $> 12\,\text{mm}$“. Links von der Schwelle landen die „ja“-Zeilen, rechts die „nein“-Zeilen. Bei numerischen Merkmalen werden nur Schwellen zwischen benachbarten, sortierten Werten geprüft. Der beste Split maximiert die Reinheit der Kinder, gemessen mit der Gini-Unreinheit.

## Gini-Unreinheit

Für einen Knoten mit Labelverteilung $(c_0, c_1)$ ist die **Gini-Unreinheit** die Wahrscheinlichkeit, dass zwei zufällig gezogene Beispiele (mit Zurücklegen) unterschiedliche Klassen zeigen:

$$
G = 1 - p_0^2 - p_1^2.
$$

Dabei ist $p_0$ der Anteil der Klasse 0, sprich: p null. Bild dazu: ein Bonbonglas mit zwei Sorten; $G$ ist die Wahrscheinlichkeit, bei zwei Griffen mit Zurücklegen zwei verschiedene Sorten zu ziehen. Durchgerechnet:

- Verteilung $[0, 0, 1, 1]$: $p_0 = p_1 = 0{,}5$, also $G = 1 - 0{,}25 - 0{,}25 = 0{,}5$ (maximal unrein).
- Verteilung $[0, 0, 0, 1]$: $p_0 = 0{,}75$, also $G = 1 - 0{,}5625 - 0{,}0625 = 0{,}375$ (reiner).

Für einen Split wird $G$ pro Kind berechnet und nach Zeilenzahl gewichtet; der Split mit der kleinsten gewichteten Summe gewinnt. Beispiel: $x = (1, 2, 3, 4)$, $y = (0, 0, 1, 1)$, Schwelle $2{,}5$ ergibt die Kinder $[0, 0]$ und $[1, 1]$ mit gewichtetem Gini $0$; die Schwelle trennt perfekt.

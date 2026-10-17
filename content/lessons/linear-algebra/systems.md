# Gleichungssysteme als Spaltenbild lesen

Ein lineares Gleichungssystem stellt mehrere Bedingungen, die gleichzeitig gelten sollen. Dahinter steckt eine Frage, die du aus der Lektion [Matrizen und Matrixprodukte mit Dimensionsvertrag](#/lesson/l-linalg-matrices) kennst: Wie viel brauchst du von jeder Spalte, um genau den Zielvektor zu mischen? Diese Lektion liest dasselbe System einmal als Zeilen und einmal als Spalten und zeigt die drei möglichen Lösungsfälle.

## Das Bild dahinter: Smoothie mischen

Du mixst einen Smoothie aus zwei Zutaten und willst Zielwerte für Eiweiß und Zucker treffen. Jede Zutat liefert pro Portion einen festen Nährwertvektor: Hafer liefert (2 Eiweiß, 1 Zucker), der Beerenmix liefert (1, 2). Du suchst die Portionen $x_1$ und $x_2$ für das Ziel (4, 5).

Die Zuordnung:

- eine Zutat: eine **Spalte** der [Matrix](#/glossary/matrix), also ihr Nährwertvektor
- eine Portionszahl $x_i$: ein [Eintrag](#/glossary/eintrag) des Lösungsvektors $x$
- der Nährwert-Zielwert: eine Komponente des **Zielvektors** $b$

Eine Portion Hafer und zwei Portionen Beerenmix ergeben $1 \cdot (2,1) + 2 \cdot (1,2) = (4, 5)$. Treffer.

Das macht auch die Lösungsfälle anschaulich. Liefern die Zutaten dasselbe Verhältnis, etwa (2, 1) und (4, 2), ist die zweite nur eine doppelte Portion der ersten. Dann entscheidet das Ziel: Liegt es nicht auf dieser Linie, etwa (4, 5), gibt es **keine Lösung**. Liegt es darauf, etwa (4, 2), gibt es **unendlich viele** Mischungen: zwei Portionen Hafer, eine Portion der zweiten Zutat oder jede Kombination mit $x_1 + 2x_2 = 2$.

Wo der Vergleich hinkt: Portionszahlen im Mixer sind nie negativ. Mathematisch darf $x_i$ negativ sein, und ein „negativer Löffel Hafer“ hat keine Küchenbedeutung, löst aber trotzdem das System.

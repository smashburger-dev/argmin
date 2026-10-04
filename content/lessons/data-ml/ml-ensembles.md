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

## Tiefe steuern

Die **Tiefe** ist die Zahl der Fragen auf dem Weg von der Wurzel zum Blatt. Tiefe 1 ist ein Baumstumpf mit einem Split; Tiefe 2 erlaubt eine zweite Frage pro Seite. Mit jeder weiteren Ebene steigt die Komplexität: Bäume, die zu tief wachsen, merken sich Ausreißer und verlieren die Verallgemeinerung auf neue Daten. Das ist genau der Bias-Varianz-Tradeoff: Ein flacher Baum hat hohe Verzerrung und kleine Varianz, ein tiefer Baum umgekehrt.

## Ensemble: mehrere Bäume abstimmen

Ein **Ensemble** kombiniert viele schwache Vorhersagen zu einer stärkeren. **Bagging** (englisch *bootstrap aggregating*) trainiert Bäume auf Bootstrap-Stichproben, die mit Zurücklegen in voller Größe gezogen werden, und bildet über ihre Stimmen eine Mehrheit; dadurch sinkt die Varianz. Der **Random Forest** geht einen Schritt weiter: An jedem Split sieht jeder Baum nur eine zufällige Teilmenge der Merkmale, die Bäume werden noch unabhängiger und die Fehler heben sich stärker auf. Mehrheitsentscheidung bei vier Bäumen, die $1, 0, 1, 1$ sagen: 3 Stimmen Klasse 1, also Vorhersage 1. Die Einzelbäume können falsch liegen; die Mehrheit korrigiert unabhängige Fehler.

## Ensemble oder Baseline?

Vergleiche immer unter demselben Split und derselben Metrik: Majority-Baseline, ein einzelner Baum und das Ensemble. Ein Ensemble, das die Baseline nicht schlägt, lernt kein Signal. Baum-Ensembles sind oft stärker als einzelne Bäume, können aber bei sehr kleinen Datensätzen oder stark verschobenen Verhältnissen hinter einfacheren Modellen liegen; entscheidend ist das gemessene Ergebnis, nicht der Name des Modells.

## Typische Fehler

- Gini ungewichtet summieren, statt nach Zeilenzahl zu gewichten. Ein kleines reines Kind darf ein großes nicht überstimmen.
- Schwelle nur auf ganzen Zahlen testen; numerische Merkmale verlangen Mittelpunkte zwischen benachbarten Werten.
- Bäume bis zum Maximum wachsen lassen, ohne die Tiefe zu begrenzen.
- Bagging als „mehr Trainingsdaten“ lesen: Die Stichproben entstehen durch Ziehen mit Zurücklegen aus denselben Daten.
- Ensemble vergleichen, ohne Split und Metrik zu fixieren. Dann misst du den Zufall.

## Wo dir das in der KI begegnet

Auf Tabellendaten schlagen baumbasierte Ensembles wie Gradient Boosting neuronale Netze oft; genau das untersuchen Grinsztajn et al. (2022). Sobald Daten als Zeilen und Spalten vorliegen, ist ein Baumensemble die erste ernsthafte Baseline, die jedes neuronale Modell schlagen muss.

## Direkter Check

Trace einen handgeschriebenen Baum in der [Kernaufgabe: Entscheidungsbaum-Trace](#/family/trace-assignment-state/tree-majority-vote-trace/0/core), rechne das Stimm-Ensemble in einer Einstiegsaufgabe und implementiere Gini plus Split-Suche in der [Kernaufgabe: Gini und Split-Suche](#/family/optimize-tree-best-split/gini-best-binary-split/0/core). Transfer: Die [Vertiefungsaufgabe: Ensemble-Vergleich](#/family/construct-ensemble-predictor-comparison/voting-tree-linear-rmse/0/stretch) vergleicht Baum, Voting und lineare Baseline auf identischen Daten.

## Begriffe auf einen Blick

- **Entscheidungsbaum** (englisch *decision tree*): Modell, das durch Ja/Nein-Fragen an Merkmale die Klasse findet.
- **Split**: Ja/Nein-Frage an ein Merkmal, die die Zeilen in zwei Teilmengen teilt; bei Zahlen als Schwelle.
- **Gini-Unreinheit** (englisch *gini impurity*): Wahrscheinlichkeit, dass zwei Zufallsziehungen verschiedene Klassen zeigen; $G = 1 - p_0^2 - p_1^2$.
- **Tiefe** (englisch *depth*): Zahl der Fragen von der Wurzel zum Blatt; begrenzt die Komplexität des Baums.
- **Ensemble**: Kombination mehrerer Modelle, deren gemeinsame Vorhersage robuster ist.
- **Bagging** (englisch *bootstrap aggregating*): Bäume auf Zufallsstichproben trainieren und per Mehrheit zusammenfassen.
- **Random Forest**: Bagging mit zufälliger Merkmalsteilmenge pro Split; macht die Bäume unabhängiger.
- **Boosting**: Ensemblemethode, die Bäume nacheinander auf die Fehler des Vorgängers trainiert.

Im Feld der Figur sind die Schwellen 2,5 und 6,5 gleich gut. Beide liefern gewichtetes Gini $1/3$; die kleinere Schwelle ist nur die feste Anzeigekonvention. Die Gini-Balken beider Kinder verwenden denselben Maßstab. Die drei kleinen Bootstrap-Bäume stimmen für $x = 7$ mit 0, 0 und 1 ab. Ihre Mehrheit 0 liegt hier sogar falsch, denn die vorhandene Zeile hat Klasse 1. Eine Mehrheit ist keine Richtigkeitsgarantie.

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

# Lineare Unabhängigkeit und Rang verstehen

Zwei Angaben sind redundant, wenn die eine aus der anderen folgt. Lineare Unabhängigkeit prüft genau das für Vektoren: Bringt jeder Vektor eine neue Richtung, oder lässt er sich aus den anderen zusammenmischen? Diese Lektion zeigt, wie du das bei zwei Vektoren siehst, mit der Determinante prüfst und über den Rang auf ganze Matrizen überträgst.

## Das Bild dahinter: Wegbeschreibungen

„Einen Schritt nach Norden“ und „einen Schritt nach Osten“ sind zwei wirklich verschiedene Richtungen: Aus ihnen lässt sich jedes Ziel der Ebene mischen. „Nach Norden“ und „doppelt so weit nach Norden“ ist dagegen nur eine Richtung; die zweite Angabe bringt nichts Neues.

Die Zuordnung:

- eine Weganweisung: ein Vektor
- eine Folge aus mehreren Anweisungen: eine **Linearkombination**, also eine Summe von Vielfachen $c_1v_1 + c_2v_2 + \dots$
- „bringt nichts Neues“: der Vektor ist schon als Linearkombination der anderen schreibbar, die Menge ist abhängig

Ein Datenbeispiel: Eine Tabelle mit den Spalten „Preis in Euro“ und „Preis in Cent“ sieht nach zwei Merkmalen aus, ist aber nur eine Richtung, denn Cent = 100 mal Euro.

Wo der Vergleich hinkt: Ab drei Dimensionen kann ein Vektor aus mehreren anderen zusammengesetzt sein, ohne zu einem einzigen davon parallel zu zeigen. „Vielfaches des anderen“ reicht dann nicht mehr als Prüfbild; die formale Definition unten trägt weiter.

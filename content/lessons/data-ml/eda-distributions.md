# Verteilungen, Korrelation und bedingte Anteile

Bevor ein KI-System trainiert wird, schaut sich jemand die Daten an: Wie sind sie verteilt, was hängt zusammen, was täuscht? Diese Lektion zeigt dir, wie du eine Spalte von Zahlen in wenige Kennzahlen übersetzt und wie du zwei der häufigsten Denkfehler vermeidest: Korrelation für Kausalität halten und bedingte mit unbedingten Anteilen verwechseln.

## Das Bild dahinter: der Notenspiegel

Stell dir den Notenspiegel einer Klassenarbeit vor. Das **Histogramm** sagt, wie viele Schüler welche Note hatten. Der **Median** ist die Note genau in der Mitte der Liste. Die **Quartile** markieren die Grenzen der unteren und oberen Viertel. Für den Confounder ein zweites Bild: Eisverkauf und Sonnenbrand steigen im Sommer gemeinsam, nicht weil Eis Sonnenbrand macht, sondern weil beide von den Sonnenstunden abhängen.

Wo der Vergleich hinkt: Noten sind diskret und auf wenige Werte beschränkt. Messdaten sind stetig, und die Wahl der Bin-Breite kann die Form der Verteilung verändern, ohne dass sich die Daten ändern.

## Histogramm und Bins

Ein **Histogramm** zählt, wie viele Werte in jede Kante fallen. Die Kanten definieren halboffene Intervalle $[e_0, e_1)$, $[e_1, e_2)$ und so weiter; nur das letzte Intervall schließt die rechte Kante ein: $[e_{k-1}, e_k]$. Jeder solche Behälter heißt **Bin**.

Durchgerechnet mit `np.histogram` für die Kanten $[0, 4, 9]$ und die Messwerte:

$$
x = (2,\ 4,\ 4,\ 4,\ 5,\ 5,\ 7,\ 9).
$$

- Bin 1 ist $[0, 4)$: nur der Wert 2 fällt hinein (4 zählt noch nicht), also 1 Wert.
- Bin 2 ist $[4, 9]$: die Werte $4, 4, 4, 5, 5, 7, 9$, also 7 Werte.

Das Ergebnis ist `[1 7]`. Die Bin-Breite ändert die Form: feine Bins zeigen Details und Rauschen, grobe Bins glätten Struktur weg. Erzähle nie aus einem einzigen Bin-Setup eine Geschichte, die bei anderen Kanten verschwindet.

# Übung: Fairness, Sweep, Kosten — mit eigenen Zahlen

Im Worked Example waren die Subgruppenzahlen gegeben. Jetzt rechnest du selbst: erst die Differenzen aus rohen Confusion-Werten, dann eine Schwellenwahl unter Nebenbedingung, dann die Kostenseite.

## Aufgabe 1: Subgruppen aus Confusion-Werten

Der Detector läuft über denselben 400 Fällen, getrennt ausgewertet:

| Gruppe | TP | FP | TN | FN |
|--------|----|----|----|----|
| bestandskunden | 84 | 4 | 92 | 20 |
| neukunden | 68 | 22 | 88 | 22 |

1. Berechne für beide Gruppen die FPR (`fp / (fp + tn)`) und die Auswahlrate (`(tp + fp) / n`).
2. Bilde die Differenzen als Betrag — und drücke sie in **Punkten und Promille** aus (Promille = Wert × 1000).
3. Liegt das Ergebnis unter den beiden Schwellen `fpr < 0,06` und `auswahl < 0,12`?

## Aufgabe 2: Schwellenwahl unter der Nebenbedingung

Vier Kandidaten-Schwellen sind ausgewertet:

| Schwelle | f1 | FPR-Differenz | Auswahl-Differenz |
|----------|------|---------------|-------------------|
| 0,45 | 0,79 | 0,08 | 0,19 |
| 0,60 | 0,78 | 0,03 | 0,08 |
| 0,75 | 0,82 | 0,11 | 0,14 |
| 0,85 | 0,71 | 0,02 | 0,05 |

Welche Schwelle wählt die Regel „beste f1 unter den Kandidaten, die beide Bänder einhalten“? Was passiert mit der Kandidatin mit dem höchsten f1 — und warum reicht ein „im Mittel fair“ nicht als Argument für sie?

## Aufgabe 3: Kosten und Restrisiko

- Der Lauf verbraucht 1,2 Mio. Input-Tokens à 3 €/Mio. und 0,4 Mio. Output-Tokens à 12 €/Mio. Wie teuer ist der Lauf — und woran erkennst du, dass Input- und Output-Seite getrennt bepreist werden?
- Einmal „Nein sagen“ kostet in dieser Konfiguration eine Review-Minute. Schreibe den Restrisiko-Eintrag (Risiko, Wahrscheinlichkeit 1–5, Auswirkung 1–5) für den Fall, dass der Detector einen begründeten Einwand als Injektion verwirft.

## Kontrolliere

- FPR: Bestandskunden 4/96 ≈ 0,042; Neukunden 22/110 = 0,20. Auswahl: 88/200 = 0,44 gegen 90/200 = 0,45. Differenzen: fpr_diff ≈ 0,158 (158‰), selrate_diff = 0,01 (10‰). Die FPR-Differenz liegt über der 0,06-Schwelle — obwohl die Auswahlraten fast gleich sind.
- Schwelle 0,60: Sie erfüllt beide Bänder und hat unter den konformen Kandidaten das beste f1. Die 0,75-Kandidatin hat das höchste f1, verletzt aber beide Bänder — eine Schwelle, die im Mittel fair wirkt, kann in den Subgruppen unfair sein, und genau das misst das Band.
- Kosten: 1,2 × 3 € + 0,4 × 12 € = 3,60 € + 4,80 € = **8,40 €**. Getrennte Preise erkennst du daran, dass die Output-Seite hier teurer ist als die Input-Seite — wer nur „Tokens × Preis“ rechnet, vermischt zwei Tarife.

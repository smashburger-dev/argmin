# Reproduzierbarkeit und Modellkarten

Ein Ergebnis, das niemand nachrechnen kann, ist Behauptung statt Wissen; das gilt für dein Experiment genauso wie für das Fine-Tuning großer Sprachmodelle. Diese Lektion zeigt dir den Vertrag, der aus „läuft bei mir“ ein überprüfbares Ergebnis macht.

## Das Bild dahinter: das Rezept für Fremde

Ein Rezept, das ein Fremder nachkochen kann, braucht genaue Mengen, Ofentemperatur, Zutatenliste und Backzeit. Fehlt eine Angabe, gelingt der Kuchen „irgendwie“, aber nicht derselbe. Die sechs Teile des Reproduzierbarkeitsvertrags unten sind genau solche Angaben: Seed und Split sind die Mengen, die Metrik die Ofentemperatur, das Manifest die Zutatenliste.

Wo der Vergleich hinkt: In der Küche schwankt das Ergebnis trotz gleichem Rezept. Ein sauber gebauter Code-Lauf mit festem Seed ist dagegen bitgleich wiederholbar.

## Seed: Zufall anfassen können

Ein **Seed** ist der Startwert eines Zufallsgenerators. Gleicher Seed liefert gleiche Zufallsfolge und damit gleiche Splits, Initialisierungen und Stichproben. In NumPy erzeugst du pro Lauf einen eigenen Generator, statt den globalen Zustand zu verändern:

```python
rng = np.random.default_rng(7)
rng.integers(0, 10, size=3)   # [9, 6, 6]
rng.integers(0, 10, size=3)   # [8, 5, 7]  (nächste Ziehung)
```

Ein neuer Generator mit Seed 7 startet exakt dieselbe Folge. Wer den globalen `np.random.seed` setzt, macht das Ergebnis von der Aufrufreihenfolge anderer Code abhängig; das ist der häufigste Repro-Fehler.

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

## Der Reproduzierbarkeitsvertrag

Ein Experiment ist reproduzierbar, wenn sechs Punkte feststehen und in einer Datei nachlesbar sind:

1. **Seed**: jeder Zufallsstrom dokumentiert, getrennt für Split und Modell.
2. **Fixer Split**: dieselben Zeilen landen immer in Train und Test, typischerweise über einen geseedeten Split wie in [Folds erzeugen und Leakage finden](#/lesson/l-ml-cv).
3. **Vorab festgelegte Metrik**: die Zahl, an der das Modell gemessen wird, steht vor dem Lauf fest, nicht danach.
4. **Manifest**: eine JSON-Datei mit den Schlüsseln `seed`, `split`, `metric`, `versions`; sie ist die Zutatenliste des Laufs.
5. **README**: ein kurzer Text, der sagt, wie man das Experiment aus dem Manifest neu startet.
6. **Modellkarte**: Einsatzzweck, Kennzahlen und Grenzen des Ergebnisses.

Fehlt ein Punkt, ist das Ergebnis schwer oder gar nicht überprüfbar.

## Manifest und README

Das **Manifest** ist maschinenlesbar und prüfbar:

```json
{"seed": 7, "split": "80/20 stratified", "metric": "balanced_accuracy", "versions": {"numpy": "1.x", "python": "3.x"}}
```

Die **README** erklärt den Lauf für Menschen: Befehl, erwartete Ausgabe, wo das Manifest liegt. Wer das Manifest diffed, sieht sofort, ob zwei Läufe dieselben Bedingungen hatten.

## Wiederholte Läufe und Streuung

Auch mit festem Vertrag bleiben Modelle zufällig beeinflusst. Deshalb berichtest du **wiederholte Läufe**: dieselbe Pipeline mit mehreren Seeds, dann Mittelwert und Streuung der Metrik, nicht nur der beste Wert. Eine Spannweite von wenigen Prozentpunkten ist eine Aussage über Verlässlichkeit; ein einzelner Bestwert ist Auswahl, keine Messung. Die Streuung gehört auf die Modellkarte neben den Mittelwert.

## Typische Fehler

- `np.random.seed` global setzen und damit Läufe vom Kontext abhängig machen.
- Split aus einem nicht dokumentierten Zufallszustand ableiten; spätere Läufe messen andere Daten.
- Die Metrik nach dem Ergebnis wählen. Das ist HARKing: Hypothesizing After Results are Known.
- Das Manifest vergessen oder nur teilweise füllen; ohne `versions` bricht der Lauf später an Bibliotheksupdates.
- Den besten Seed berichten und die Streuung über Läufe unterschlagen.

## Wo dir das in der KI begegnet

Dodge et al. (2020) zeigten, dass schon das Fine-Tuning von BERT allein durch andere Seeds deutlich unterschiedliche Ergebnisse liefert. Seriöse Modellberichte mitteln deshalb über mehrere Seeds und berichten die Streuung. Und die Modellkarte als Format stammt aus derselben Bewegung: Mitchell et al. (FAT* 2019) schlugen sie vor, damit Einsatz und Grenzen nicht im Marketingtext verschwinden.

## Direkter Check

Klär den Vertrag in der [Einstiegsaufgabe: Reproduzierbarkeits-Check](#/family/classify-repro-contract/repro-contract-violation/0/intro) und lies in einer Einstiegsaufgabe eine berichtete Run-to-Run-Streuung: dieselbe Spannweite entsteht, wenn du dasselbe Experiment mit verschiedenen Seeds wiederholst. Sage dann die rng-Ausgabe in der [Kernaufgabe: Zufallsströme vorhersagen](#/family/trace-assignment-state/rng-stream-reseed-trace/0/core) vorher und baue den Vertrag in der [Kernaufgabe: Experiment-Manifest](#/family/reproduce-seeded-experiment-report/seeded-experiment-manifest/0/core) nach. Final: die [Vertiefungsaufgabe: Reproduzierbarkeits-Bericht](#/family/reproduce-seeded-experiment-report/repro-report-table-check/0/stretch) berichtet drei Konfigurationen mit Wiederholungs-Check; das Projekt [Reproduzierbarer Modellvergleich](#/project/p-ml-repro-comparison) setzt alles als lokales pytest-Projekt um.

## Begriffe auf einen Blick

- **Reproduzierbarkeit** (englisch *reproducibility*): ein Ergebnis lässt sich aus dokumentierten Bedingungen exakt wiederholen.
- **Manifest**: maschinenlesbare Datei mit `seed`, `split`, `metric` und `versions` eines Laufs.
- **Vorab festgelegte Metrik**: Messgröße, die vor dem Experiment fixiert wird; verhindert nachträgliches Verschieben des Ziels.
- **Wiederholter Lauf**: dieselbe Pipeline mit mehreren Seeds; Mittelwert und Streuung ersetzen den Einzelwert.
- **Streuung**: Abstand zwischen bestem und schlechtestem Fold-Score; misst die Verlässlichkeit der Schätzung.
- **Modellkarte** (englisch *model card*): Dokument mit Einsatzzweck, Metriken pro Gruppe und Grenzen eines Modells.
- **README**: kurze Anleitung, die sagt, wie das Experiment aus dem Manifest neu gestartet wird.

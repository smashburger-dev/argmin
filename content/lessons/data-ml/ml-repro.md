# Reproduzierbarkeit: Seeds, Splits und Manifeste

Ein Experiment ist erst dann ein Experiment, wenn Dritte es wiederholen können. Der **Reproduzierbarkeitsvertrag** besteht aus sechs Teilen — alle sechs gehören zusammen in das Repository.

## 1. Feste Seeds für alle Zufallsquellen

Jede Zufallsquelle bekommt einen Seed: `random.seed(...)` für die Standardbibliothek und für numpy ein eigener Generator

```python
rng = np.random.default_rng(7)
a = rng.integers(0, 10, size=3)   # [9, 6, 6]
```

Zwei Eigenschaften, die man verwechseln kann:

- Ein **neuer** Generator mit demselben Seed liefert dieselbe Folge: `np.random.default_rng(7)` nochmal erzeugt wieder `[9, 6, 6]`.
- Der **nächste Aufruf im selben Generator** liefert die nächste Zahl: `rng.integers(...)` danach ergibt `[8, 5, 7]` — der Generator wandert weiter.

`default_rng` ist besser als der globale `np.random.seed`, weil der Zustand lokal im Objekt liegt und keine Bibliothek ihn unbemerkt weiterdrehen kann.

## 2. Fixer Split

Der Train/Test-Split wird aus dem Seed abgeleitet (`rng.permutation(n)`) oder die Indizes werden als Datei gespeichert. Nie „einfach nochmal neu ziehen“ — ein anderer Split ist ein anderes Experiment.

## 3. Metrik und Schwellenwert vorab

Vor dem Lauf festhalten: Metrik (z. B. RMSE) und Schwellenwert (z. B. „gilt als besser bei RMSE $\le$ 0{,}15“). Nach dem ersten Lauf umschalten, bis eine Metrik gewinnt, ist Selection-Bias — das Ergebnis sagt dann nichts mehr über das Modell, nur noch über dich.

## 4. Manifest

Das Manifest ist eine kleine, maschinenlesbare Datei mit den Kernfakten des Laufs:

```json
{
  "seed": 11,
  "split": "30/10 Test-Indizes aus default_rng(11).permutation(40)",
  "metric": "rmse <= 0.15",
  "versions": {"python": "3.9.7", "numpy": "1.20.3"}
}
```

Pflichtschlüssel: `seed`, `split`, `metric`, `versions`. Fehlt einer davon, ist der Lauf nicht reproduzierbar — ein Prüfskript soll das mit `ValueError` melden.

## 5. README als Teil des Experiments

Das README beschreibt Datensatz, Kommando und Umgebung so, dass `python -m pytest tests` (oder das Laufkommando) auf einer anderen Maschine dasselbe Ergebnis liefert. Es ist Deliverable, nicht Deko.

## 6. Modellkarte

Nach **Model Cards** (Mitchell et al., FAT\* 2019) dokumentiert eine kurze Karte: beabsichtigte Nutzung (intended use), Metriken mit Werten, Trainingsdaten, bekannte Grenzen. Damit können Leser abschätzen, wofür das Modell taugt — und wofür nicht.

## Berichtete Streuung statt Einzelwert

Ein einzelner Score ist eine Zufallsgröße. Dasselbe Experiment mehrfach wiederholt ergibt eine Streuung (Spannweite zwischen bestem und schlechtestem Lauf), die mitberichtet wird. Eine Spannweite von 32 Prozentpunkten über 10 Wiederholungen sagt mehr als ein Score von 72 % aus einem Lauf. (Das liest du in [w17-e2](#/exercise/w17-e2).)

## Typische Fehler

- Seed nur für `random` gesetzt, numpy vergessen (oder umgekehrt).
- Den Split bei jedem Lauf neu ziehen.
- Metrik oder Schwellenwert nach dem ersten Lauf wechseln.
- Versionen (python/numpy) fehlen im Manifest — anderes numpy, anderes Ergebnis.
- Manifest von Hand tippen statt es zu generieren und per Test zu prüfen.
- Zwei Ziehungen im selben Generator mit zwei Generatoren gleichen Seeds verwechseln.

## Direkter Check

Klär den Vertrag in [w17-e1](#/exercise/w17-e1) und lies in [w17-e2](#/exercise/w17-e2) eine berichtete Run-to-Run-Streuung: dieselbe Spannweite entsteht, wenn du dasselbe Experiment mit verschiedenen Seeds wiederholst. Sage dann die rng-Ausgabe in [w17-e3](#/exercise/w17-e3) vorher und baue den Vertrag in [w17-e4](#/exercise/w17-e4) nach: deterministische Funktion plus Manifest-Prüfung. Final: [w17-e5](#/exercise/w17-e5) berichtet drei Konfigurationen mit Wiederholungs-Check — und das Wochenprojekt [Reproduzierbarer Modellvergleich](#/project/p-ml-repro-comparison) setzt alles als lokales pytest-Projekt um.

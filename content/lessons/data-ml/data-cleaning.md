# Datenbereinigung tabellarischer Daten

Jedes KI-System steht und fällt mit seinen Daten: Bevor ein Modell auch nur eine Zahl lernt, muss jemand geprüft haben, was in der Tabelle wirklich steht. Diese Lektion zeigt dir, wie du eine Tabelle auf Schema, fehlende Werte und Duplikate prüfst, bevor irgendeine Statistik sie anfasst.

## Das Bild dahinter: Zutatenkontrolle vor dem Kochen

Stell dir die Mise en place in einer Profiküche vor: Bevor gekocht wird, liegt jede Zutat bereit und wird kontrolliert. Stimmt das Etikett mit dem Inhalt überein (Schema und Datentyp)? Fehlt etwas (fehlender Wert)? Ist ein leeres Feld als Menge getarnt, etwa −999 (Sentinel-Wert)? Wurde etwas doppelt geliefert (Duplikat, exakt oder nur mit gleicher Kennnummer)?

Wo der Vergleich hinkt: Küchenzutaten fehlen nicht zufällig oder aus einem System heraus; Daten schon. Ob eine Lücke zufällig entstand oder gerade bei den wichtigen Fällen, entscheidet darüber, was das Löschen der Zeile anrichtet.

## Schema und Datentyp: der Vertrag

Tabellarische Daten sind eine Liste von Zeilen mit gemeinsamem **Schema**: Jede Zeile hat dieselben Spalten, und jede Spalte hat einen vereinbarten **Datentyp**. In Python liest `csv.DictReader` eine solche Datei zeilenweise und liefert jede Zeile als [Dictionary](#/glossary/dictionary) `{spalte: wert}`; daraus baust du NumPy-Arrays, sobald die Daten sauber sind. Ein **Datenqualitätsvertrag** legt vor dem ersten Rechnen fest:

- welche Spalten existieren, genau diese und keine weiteren,
- welchen Typ jede Spalte hat (`str`, `int`, `float` oder `None` für fehlend),
- welche Wertebereiche erlaubt sind (z. B. `alter` zwischen 18 und 99),
- welche Spalte die **Schlüsselspalte** ist, also jede Zeile eindeutig identifiziert,
- wo `None` erlaubt ist und wo nicht.

Ein Verstoß gegen den Vertrag ist ein Datenfehler, der dokumentiert wird, kein Randfall, der still repariert wird. Ehrlichkeit zur Laufzeitumgebung: Im Browser dieser Plattform laufen Python-Stdlib und NumPy, aber kein pandas. Die pandas-Idiome (`dropna`, `drop_duplicates`, `isna`) trainierst du deshalb als Lese- und Vorhersage-Kompetenz; implementiert wird mit `csv` und NumPy. Wer `df.dropna()` richtig liest, kann fehlende Werte auch selbst zählen und löschen.

## Fehlende Werte: zufällig oder zielabhängig

- **MCAR** (englisch *missing completely at random*, völlig zufälliges Fehlen): Das Fehlen hat nichts mit den Werten zu tun. Zeilen mit fehlendem Zielwert zu löschen verzerrt dann nichts, es macht nur die Stichprobe kleiner.
- **Zielabhängiges Fehlen**: Fehlt der Zielwert gerade bei den extremen Fällen, etwa fehlen Umsätze genau bei Großkunden, weil diese keine Freigabe geben, verschiebt das Löschen den Mittelwert systematisch. Die verbleibenden Daten unterschätzen dann die Wahrheit.

Frage vor jedem `dropna`: Warum fehlt der [Wert](#/glossary/wert), zufällig oder abhängig vom Ziel?

## Sentinel-Werte

Ein **Sentinel-Wert** ist ein Wert, der „fehlend“ kodiert, aber wie ein Messwert aussieht: `-1` als Alter, `999` als Preis, der leere String als Name. Sentinels müssen vor jeder Statistik als fehlend erkannt werden, sonst verfälschen sie Median, Mittelwert und Korrelation. Der Vertrag legt fest, welche Sentinels in welcher Spalte als fehlend gelten.

## Duplikate: exakt oder Schlüssel

- **Exakte Duplikate** sind in allen Spalten identisch. Sie zu entfernen und die erste Zeile zu behalten ist immer sicher, sie tragen keine neue Information.
- **Schlüsselduplikate** teilen nur die Schlüsselspalte, unterscheiden sich aber in Werten. Das ist ein Konflikt, keine Kopie: Ob du die erste Zeile nimmst, alle mittelst oder die Zeilen als Fehler meldest, ist eine dokumentierte Entscheidung.

## Rechenbeispiel

Eine Kundentabelle mit Vertrag `id: str` (Schlüssel), `alter: int` in $[18, 99]$, `umsatz: float` oder `None`, Sentinel `-1` gilt als fehlend:

| Zeile | id | alter | umsatz | Befund |
|---|---|---|---|---|
| 0 | k1 | 34 | 120 | in Ordnung |
| 1 | k2 | 41 | `None` | Zielwert fehlt |
| 2 | k3 | 29 | 90 | in Ordnung |
| 3 | k3 | 29 | 90 | exaktes Duplikat von Zeile 2 |
| 4 | k4 | 25 | `-1` | Sentinel, Zielwert fehlt |
| 5 | k5 | 37 | 200 | in Ordnung |
| 6 | k6 | 52 | `None` | Zielwert fehlt |
| 7 | k7 | `-5` | 150 | Schema-Verstoß (alter < 18) |

Bereinigung in vier dokumentierten Schritten:

1. Schema-Verstoß: Zeile 7 fliegt raus und wird in die Fehlerliste eingetragen. Es bleiben $8 - 1 = 7$ Zeilen.
2. Exakte Duplikate: Zeile 3 ist identisch mit Zeile 2, also $7 - 1 = 6$ Zeilen.
3. Fehlende Zielwerte: `None` (Zeilen 1 und 6) und Sentinel `-1` (Zeile 4) zählen als fehlend, also $3$ Zeilen raus.
4. Vollständige Zeilen für die Auswertung: $6 - 3 = 3$, nämlich k1, k3 und k5.

Jeder Schritt ändert die Zeilenzahl nachvollziehbar; nichts wird still interpoliert.

## Typische Fehler

- Sentinel-Werte wie `-1` als echte Messwerte in Mittelwert und Median einrechnen.
- MCAR annehmen, obwohl das Fehlen vom Zielwert abhängt. Löschen verzerrt dann systematisch.
- Schlüsselduplikate wie exakte Duplikate löschen und damit Konflikte verschweigen.
- Schema-Verstöße still „reparieren“, etwa `-5` durch den Mittelwert ersetzen, statt sie zu dokumentieren.
- Zeilen mit fehlendem Wert in einer beliebigen Nebenspalte löschen, obwohl nur die Zielspalte den Wert braucht.

## Wo dir das in der KI begegnet

Deduplizierung ist beim Training großer Sprachmodelle ein Standardschritt: Lee et al. (2021, „Deduplicating Training Data Makes Language Models Better“) zeigen, dass Modelle sonst mehr Trainingstext wörtlich wiedergeben. Und der Unterschied zwischen MCAR und zielabhängigem Fehlen entscheidet auch später: Fehlen Werte gerade bei bestimmten Fällen, lernt das Modell ein verzerrtes Bild dieser Fälle.

## Direkter Check

Bearbeite die [Einstiegsaufgabe: Zielwertabhängige Fehlstellen](#/family/classify-missingness/target-dependent-missingness/0/intro) (Konzeptfrage Verzerrung), danach die Abrufinstanzen dieser Lektion. Dann implementiere `profile_table` in der [Kernaufgabe: Tabellenprofil-Implementierung](#/family/validate-data-quality-contract/profile-table-schema-counts/0/core) und den Datenqualitätsvertrag als Final Boss in der [Vertiefungsaufgabe: Datenqualitätsvertrag](#/family/validate-data-quality-contract/validate-rows-contract-errors/0/stretch).

## Begriffe auf einen Blick

- **Schema**: die Vereinbarung, welche Spalten eine Tabelle hat und welchen Typ jede trägt.
- **Datentyp**: Art der Werte einer Spalte, zum Beispiel `str`, `int`, `float` oder `None` für fehlend.
- **Fehlender Wert**: eine Zelle ohne Messwert; kann zufällig oder systematisch fehlen.
- **MCAR** (englisch *missing completely at random*): das Fehlen hängt nicht von den Werten ab; Löschen der Zeilen verzerrt nichts, verkleinert nur die Stichprobe.
- **Sentinel-Wert** (englisch *sentinel value*): Wert, der „fehlend“ kodiert, aber wie ein Messwert aussieht, etwa `-1` als Alter.
- **Duplikat**: doppelt vorhandene Zeile; exakt, wenn alle Spalten gleich sind, Schlüsselduplikat, wenn nur die Kennnummer stimmt.
- **Schlüsselspalte**: Spalte, die jede Zeile eindeutig identifiziert.

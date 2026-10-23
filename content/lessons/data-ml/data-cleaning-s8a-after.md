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

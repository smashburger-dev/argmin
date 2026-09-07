# Datenbereinigung tabellarischer Daten

Tabellarische Daten sind eine Liste von Zeilen mit gemeinsamem **Schema**: Jede Zeile hat dieselben Spalten, und jede Spalte hat einen vereinbarten Datentyp. In Python liest das `csv`-Modul solche Dateien zeilenweise — `csv.DictReader` liefert jede Zeile als Dictionary `{spalte: wert}`. Aus diesen Zeilenlisten baust du mit NumPy Arrays, wenn die Daten sauber sind.

Ehrlichkeits-Paragraph zur Laufzeitumgebung (ADR-0012): Im Browser dieser Plattform läuft Python-Stdlib und NumPy, aber **kein pandas**. Die pandas-Idiomatik (`dropna`, `drop_duplicates`, `isna`) trainierst du deshalb als Lese- und Vorhersage-Kompetenz: Du sagst vorher, was ein gegebener pandas-Schnipsel ausgibt. Ausgeführt und implementiert wird mit `csv`, Standardbibliothek und NumPy. Beides gehört zur selben Kompetenz — wer `df.dropna()` richtig liest, kann fehlende Werte auch selbst zählen und löschen.

## Schema- und Datentyp-Vertrag

Ein **Datenqualitätsvertrag** legt vor dem ersten Rechnen fest:

- welche Spalten existieren (genau diese, keine fehlenden, keine zusätzlichen),
- welchen Typ jede Spalte hat (`str`, `int`, `float` oder `None` für fehlend),
- welche Wertebereiche erlaubt sind (z. B. `alter` zwischen 18 und 99),
- welche Spalte ein eindeutiger **Schlüssel** ist,
- wo `None` erlaubt ist (**nullable**) und wo nicht.

Ein Verstoß gegen den Vertrag ist ein Datenfehler, der dokumentiert wird — kein Randfall, den man still repariert.

## Fehlende Werte: MCAR vs. zielabhängig

- **MCAR** (missing completely at random): Das Fehlen hat nichts mit den Werten zu tun. Zeilen mit fehlendem Zielwert zu löschen verzerrt dann nichts — es macht nur die Stichprobe kleiner.
- **Zielabhängiges Fehlen**: Fehlt der Zielwert gerade bei den extremen Fällen (z. B. fehlen Umsätze genau bei Großkunden, weil diese keine Freigabe geben), verschiebt das Löschen den Mittelwert systematisch. Die verbleibenden Daten unterschätzen dann die Wahrheit.

Frage vor jedem `dropna`: **Warum** fehlt der Wert — zufällig oder abhängig vom Ziel?

## Sentinel-Werte

Ein **Sentinel** ist ein Wert, der „fehlend" kodiert, aber wie ein Messwert aussieht: `-1` als Alter, `999` als Preis, leerer String als Name. Sentinel-Werte müssen vor jeder Statistik als fehlend erkannt werden — sonst verfälschen sie Median, Mittelwert und Korrelation. Der Vertrag legt fest, welche Sentinels in welcher Spalte als fehlend gelten.

## Duplikate: exakt vs. Schlüssel

- **Exakte Duplikate** sind in allen Spalten identisch. Sie zu entfernen (die erste Zeile behalten) ist immer sicher — sie tragen keine neue Information.
- **Schlüsselduplikate** teilen nur den Schlüssel (z. B. dieselbe `id`), unterscheiden sich aber in Werten. Das ist ein Konflikt, keine Kopie: Ob du die erste Zeile nimmst, alle mittelst oder die Zeilen als Fehler meldest, ist eine dokumentierte Entscheidung.

## Durchgerechnetes Beispiel

Eine Kundentabelle mit Vertrag `id: str` (Schlüssel), `alter: int` in $[18,99]$, `umsatz: float oder None` — Sentinel `-1` gilt als fehlend:

| Zeile | id | alter | umsatz | Befund |
|---|---|---|---|---|
| 0 | k1 | 34 | 120 | in Ordnung |
| 1 | k2 | 41 | `None` | Zielwert fehlt |
| 2 | k3 | 29 | 90 | in Ordnung |
| 3 | k3 | 29 | 90 | exaktes Duplikat von Zeile 2 |
| 4 | k4 | 25 | `-1` | Sentinel → Zielwert fehlt |
| 5 | k5 | 37 | 200 | in Ordnung |
| 6 | k6 | 52 | `None` | Zielwert fehlt |
| 7 | k7 | `-5` | 150 | Schema-Verstoß (alter < 18) |

Bereinigung in vier dokumentierten Schritten:

1. Schema-Verstoß: Zeile 7 fliegt raus und wird in die Fehlerliste eingetragen. Es bleiben $8-1=7$ Zeilen.
2. Exakte Duplikate: Zeile 3 ist identisch mit Zeile 2, also $7-1=6$ Zeilen.
3. Fehlende Zielwerte: `None` (Zeilen 1 und 6) und Sentinel `-1` (Zeile 4) zählen als fehlend, also $3$ Zeilen raus.
4. Vollständige Zeilen für die Auswertung: $6-3=3$ — k1, k3, k5.

Jeder Schritt ändert die Zeilenzahl nachvollziehbar; nichts wird still interpoliert.

## Typische Fehler

- Sentinel-Werte wie `-1` als echte Messwerte in Mittelwert und Median einrechnen.
- MCAR annehmen, obwohl das Fehlen vom Zielwert abhängt — Löschen verzerrt dann systematisch.
- Schlüsselduplikate wie exakte Duplikate löschen und damit Konflikte verschweigen.
- Schema-Verstöße still „reparieren" (z. B. `-5` durch den Mittelwert ersetzen), statt sie zu dokumentieren.
- Zeilen mit fehlendem Wert in einer beliebigen Nebenspalte löschen, obwohl nur die Zielspalte den Wert braucht — zu viele Zeilen geopfert.

## Direkter Check

Bearbeite die [Einstiegsaufgabe](#/family/classify-missingness/target-dependent-missingness/0/intro) (Konzeptfrage Verzerrung), danach die Abrufinstanzen dieser Lektion. Dann implementiere `profile_table` in der [Kernaufgabe](#/family/validate-data-quality-contract/profile-table-schema-counts/0/core) und den Datenqualitätsvertrag als Final Boss in der [Vertiefungsaufgabe](#/family/validate-data-quality-contract/validate-rows-contract-errors/0/stretch).

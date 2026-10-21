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

### Wenn große Umsätze fehlen

Die folgende Figur ergänzt das Beispiel zum zielabhängigen Fehlen. Ihre fünf synthetischen Kunden sind eine eigene, vollständig bekannte Ausgangsmenge: 90, 120, 200, 600 und 900 Euro. Der Mittelwert beträgt 382 Euro. Geben gerade die beiden größten Kunden ihren Umsatz nicht frei, bleiben 90, 120 und 200 Euro übrig, im Mittel rund 136,67 Euro. Kein verbleibender Umsatz wurde kleiner. Geändert hat sich, wer in der Rechnung vorkommt.

In echten Daten kennt man die fehlenden Zielwerte meist nicht. Die gestrichelten Ringe zeigen hier die im Lehrbeispiel bekannte Ursache; aus einer realen Tabelle könnte man diese Werte nicht einfach rekonstruieren. Fehlende Ziele zu löschen ist daher keine neutrale Entscheidung.

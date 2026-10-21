# Grenze zur Außenwelt klein halten

Dateicode verbindet unzuverlässige Außenwelt mit interner Programmlogik. Diese Lektion zeigt dir, wie du die Grenze wie einen Wareneingang organisierst: prüfen am Tor, drinnen nur geprüfte Ware, und kein Feueralarm in der Reklamationsablage.

## Das Bild dahinter: der Wareneingang

Stell dir den Eingang eines Lagers vor. Pakete werden am Tor geprüft und ausgepackt: Das ist das **Parsen**, die Umwandlung von Textzeilen in Zahlen und Datensätze. Drinnen liegt nur geprüfte Ware; die Programmlogik sieht nie rohen Text. Erwartete Mängel wie ein fehlendes Feld kommen auf die Reklamationsliste, hier die [Liste](#/glossary/liste) `issues`. Ein Feueralarm dagegen gehört nie in die Reklamationsablage: Ein Tippfehler in deinem Code ist kein Datenmangel, und `except Exception: pass` legt ihn genau dorthin ab, unsichtbar.

Wo der Vergleich hinkt: Echte Pakete kommen als Ganzes an; Dateien liest du zeilenweise, und die Prüfung läuft Zeile für Zeile.

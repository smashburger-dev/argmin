# Datenbereinigung tabellarischer Daten

Jedes KI-System steht und fällt mit seinen Daten: Bevor ein Modell auch nur eine Zahl lernt, muss jemand geprüft haben, was in der Tabelle wirklich steht. Diese Lektion zeigt dir, wie du eine Tabelle auf Schema, fehlende Werte und Duplikate prüfst, bevor irgendeine Statistik sie anfasst.

## Das Bild dahinter: Zutatenkontrolle vor dem Kochen

Stell dir die Mise en place in einer Profiküche vor: Bevor gekocht wird, liegt jede Zutat bereit und wird kontrolliert. Stimmt das Etikett mit dem Inhalt überein (Schema und Datentyp)? Fehlt etwas (fehlender Wert)? Ist ein leeres Feld als Menge getarnt, etwa −999 (Sentinel-Wert)? Wurde etwas doppelt geliefert (Duplikat, exakt oder nur mit gleicher Kennnummer)?

Wo der Vergleich hinkt: Küchenzutaten fehlen nicht zufällig oder aus einem System heraus; Daten schon. Ob eine Lücke zufällig entstand oder gerade bei den wichtigen Fällen, entscheidet darüber, was das Löschen der Zeile anrichtet.

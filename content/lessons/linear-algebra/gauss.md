# Gauß-Elimination als erlaubte Umformung

Ein Gleichungssystem per Einsetzen zu lösen funktioniert, ist aber schnell unübersichtlich. Gauß-Elimination macht daraus ein Verfahren: Du vereinfachst die Gleichungen Schritt für Schritt, bis du die Lösung direkt ablesen kannst. Hier lernst du, welche Schritte erlaubt sind und woran du die drei Lösungsfälle erkennst.

## Das Bild dahinter: Kassenzettel abziehen

Zwei Kassenzettel aus demselben Café: „2 Kaffee + 1 Croissant = 7 €“ und „1 Kaffee + 1 Croissant = 4,50 €“. Ziehst du den zweiten Zettel vom ersten ab, fällt das Croissant weg: 1 Kaffee kostet 2,50 €. Dann kostet das Croissant $4{,}50 - 2{,}50 = 2$ €.

Genau das ist eine Zeilenoperation. Kaufst du dieselbe Tüte zweimal, steht auf dem Zettel überall das Doppelte: „2 Kaffee + 2 Croissants = 9 €“. Ziehst du den ersten Zettel vom verdoppelten zweiten ab, fällt der Kaffee weg: „0 Kaffee + 1 Croissant = 2 €“. Genau diese Richtung zeigt die Figur. Erst danach setzt du den Croissantpreis ein, um den Kaffeepreis zu erhalten. Die Zuordnung:

- ein Kassenzettel: eine Zeile, also eine Gleichung
- ein Posten auf dem Zettel: ein [Koeffizient](#/glossary/koeffizient)
- Zettel verdoppeln: eine Zeile mit einer Zahl multiplizieren
- Zettel voneinander abziehen: ein Vielfaches einer Zeile von einer anderen subtrahieren

Wo der Vergleich hinkt: Auf echten Kassenzetteln stehen positive Preise; in echten Systemen tauchen negative und gebrochene Koeffizienten auf.

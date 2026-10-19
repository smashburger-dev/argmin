## Erst den Stand prüfen, dann Ausgaben übergeben

Für einen konkreten Lauf beginnt die Kette mit `assert_frozen()`. Der Eingang ist das Manifest zusammen mit den tatsächlich vorhandenen Dateien. Der Ausgang ist die bestätigte Version oder ein Abbruch mit Dateibefund. Erst nach dieser Prüfung dürfen Stages mit den eingefrorenen Daten arbeiten.

| Gewerk | Konsumiert | Erzeugt | Bei fehlender Übergabe |
|---|---|---|---|
| Laden | eingefrorene Dateien | `docs` | Fehler melden, keine Dokumentattrappe |
| Retrieval | `docs`, Anfrage, Konfiguration | `rankings` | kein Ersatzranking |
| Bericht | `rankings`, Golden Set | `report` | keine weiterverwendeten alten Zahlen |

Diese Schlüssel begründen die Reihenfolge: `rankings` braucht einen Erzeuger, bevor der Bericht es konsumieren kann. Die Ordnung ist eine Eigenschaft der Abhängigkeiten, keine fest einprogrammierte richtige Antwort auf eine Sortierfrage. Eine spätere interaktive Aufgabe muss deshalb den vorhandenen deterministischen Löser über den gemeinsamen Antwortvertrag verwenden.

Ein neuer Seed ist ein neuer Experimentstand. Er wird zusammen mit Konfiguration und Manifest versioniert. Ein Timeout im anschließenden Lauf hebt den Freeze nicht auf: Er verhindert die Übergabe der betroffenen Ausgabe. Den Unterschied zwischen Versionsgrenze und Laufzeitgrenze zeigt die Runner-Figur der folgenden Lektion.

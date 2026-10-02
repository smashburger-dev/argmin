# Übung: Digest, Ledger und verweigerte Berichte

Im Worked Example hast du den Bericht als Viertett aus Messwerten, Fehlerliste, Metadaten und Artefakt-Digest gelesen. Jetzt gehst du die Integritätskette an einem Mini-Fall selbst durch — von der Frage, was der Digest überhaupt beweist, bis zum verweigerten Bericht.

## Ausgangslage

Ein Mini-Golden-Set hat drei Einträge. Das `erg_id`-Ledger deines Laufs:

- 20 Fälle insgesamt
- 6 mit `art == "retrieval"`
- 11 `korrekt` unter den 14 mit Treffer

Die Evaluation misst `antwort_getrennt`: korrekt getrennt ÷ Fälle mit Treffer. Die naive Zählung teilt Korrekte durch alle Fälle.

## Aufgaben

1. **Bereinigt vs. naiv:** Berechne beide Werte. Warum ist die naive Zahl höher — und welche Fälle fehlen in ihrem Nenner?
2. **Digest-Beweis:** Der Bericht referenziert `sha256` über die gespeicherte `ergebnisse.json`. Der Lauf speichert die drei Golden-Set-Einträge in einer anderen Reihenfolge als die Eingabedatei. Ändert sich der Digest — und was genau beweist er dadurch?
3. **Fehlende Karte:** Der Bericht wird mit Protokoll, Data Card und Fehlerliste gebaut — aber ohne `modelcard` im `karten`-Dict. Was ist der richtige Output: ein Bericht mit Hinweis, oder eine Verweigerung?
4. **Zweitlauf:** Du führst denselben Lauf ein zweites Mal aus und bekommst denselben Digest über `werte`. Was darfst du daraus schließen — und was **nicht** (Stichwort: was wäre nötig, damit der Hash mehr als Konsistenz beweist)?

## Kontrolliere

- Bereinigt: 11/14 ≈ 0,79. Naiv: 11/20 = 0,55. Die naive Zahl ist hier **niedriger** — Retrieval-Fehler drücken sie, obwohl die Antwortqualität darüber nichts aussagt. Wer „Antwortqualität“ berichten will, braucht den bereinigten Nenner; wer die naive Zahl berichtet, mischt zwei Fehlerarten.
- Der Digest ändert sich, wenn die Serialisierung die Reihenfolge ändert — außer der Hash wird über eine kanonische Form (z. B. `sort_keys`) gebildet. Er beweist nur: *dieser* Bericht gehört zu *diesen* Bytes. Er beweist nicht, dass die Zahlen stimmen.
- Verweigerung. Ein Bericht ohne `modelcard` ist per Vertrag `{"status": "verweigert", "fehlt": ["karten"]}` — kein Bericht mit Fußnote. Der Sinn des Guards ist, dass unvollständige Kontexte gar nicht erst zu einer Zahl führen.
- Derselbe Digest beweist nur, dass beide Läufe dieselben `werte` serialisiert haben — Konsistenz, nicht Korrektheit. Damit der Hash mehr beweist, müsste er die Artefakte des Laufs selbst (die gespeicherten `ergebnisse.json`) an den Bericht binden — genau das tut der Artefakt-Digest.

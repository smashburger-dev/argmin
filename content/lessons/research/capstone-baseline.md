# Die forschungsbasierte Capstone-Baseline

Die Forschungsphase läuft auf einen Abschluss zu: eine **Baseline**, die den ganzen Prototypen von der Frage bis zur Messung trägt. Diese Lektion verbindet alles — preregisterierte Frage, Karten, Risikoprüfung — zu einem Zahlensatz, der reproduzierbar ist. Der Kern dreht sich um drei Artefakte: Golden Set, Fehlerliste, Doppel-Lauf.

## Das Golden Set und sein Hash

Ein Golden Set ist die eingefrorene Fragenmenge mit Gold-Antworten und zulässigen Belegen — das Testset deiner Studie, wie in der Lektion „Evaluation generativer Antworten“ eingeführt. Der Zusatz dieser Lektion: Der Zustand des Sets wird **hashfixiert**. Über eine kanonische Serialisierung (Einträge sortiert nach Kennung, Felder sortiert, kompakte Trennzeichen) bildest du einen sha256-Wert, der den exakten Inhalt abbildet.

Zwei Eigenschaften machen den Hash wertvoll:

- **Reihenfolge-Invarianz**: Dieselben Einträge in anderer Reihenfolge ergeben denselben Hash — Umsortieren ist kein inhaltlicher Eingriff.
- **Änderungssensitivität**: Eine veränderte Gold-Antwort, ein gelöschter Fall, ein neues Feld — jeder davon ändert den Hash.

Damit ist der Hash dein Integritätsbeweis: Steht in der Abschlussphase derselbe sha256-Wert wie heute, misst du noch über demselben Set, und die Zahlen sind vergleichbar. Hat er sich geändert, ist jede Vorher-Nachher-Aussage über Antwortquoten wertlos, bis geklärt ist, was sich geändert hat. Das ist dasselbe Prinzip wie das Manifest im GenAI-Prototyp-Projekt, nur auf das Evaluationsset angewandt.

## Die Fehlerliste: Retrieval und Antwort getrennt

Die Fehlerliste führt jeden Fall mit einer Fehlerart nach der Taxonomie aus der Lektion „Evaluation generativer Antworten“ — aber mit der Trennung aus der Lektion „RAG: Retrieval messbar machen“ als erster Weiche: Lag ein relevantes Dokument in den Top k?

- **Retrieval-Fehler**: Das richtige Dokument war nicht dabei. Die Antwortbewertung dieses Falls sagt nichts über den Generator; der Fall zählt nicht in die Antwort-Genauigkeit.
- **Antwortfehler**: Das Retrieval traf, die Antwort ist trotzdem fehlerhaft (falsch-faktisch, unvollständig, quellos, halluziniert, off-topic, Formatfehler).

Daraus entstehen zwei Kennzahlen über denselben Lauf: die **bereinigte Antwort-Genauigkeit** (inhaltlich korrekt / Fälle mit Treffer) und die **naive Genauigkeit** (inhaltlich korrekt / alle Fälle). Ein Rechenbeispiel mit 20 Fixtur-Fällen: 5 Retrieval-Fälle ohne Treffer, also 15 mit Treffer; von diesen 12 korrekt und 3 mit Antwortfehler. Bereinigt: 12/15 = 0,8. Naiv: 12/20 = 0,6. Die Differenz von 0,2 ist kein Messrauschen, sondern der Preis der Vermengung — wer nur die naive Zahl berichtet, macht 5 Fälle, die kein Generator der Welt hätte richtig beantworten können, zum Versagen des Generators. Umgekehrt verbirgt die naive Zahl echte Antwortfehler hinter Retrieval-Fortschritt. Beide Zahlen zu berichten ist die ehrliche Form.

## Der Doppel-Lauf: Reproduzierbarkeit als Assert

Eine Baseline ist nur so glaubwürdig wie ihre Wiederholbarkeit. Der Mechanismus ist ein einfacher Doppel-Lauf: dieselbe Konfiguration zweimal unabhängig auswerten, beide Male einen Digest über die Kennzahlen bilden und mit einem Assert vergleichen. Stimmen die Digests nicht überein, ist die Baseline ungültig — dann steckt Zustand (Uhrzeit, Zufall, Reihenfolge, zwischengespeicherte Dateien) im Lauf, der dort nicht hineingehört. Der GenAI-Prototyp ist hier der Anspruch selbst: kein Netzwerk, kein Zufall, keine Uhrzeit — zwei Läufe liefern identische Tabellen. Das Assert macht diese Eigenschaft zur geprüften, nicht zur behaupteten.

## Der Bericht verweigert sich

Der wichtigste Vertrag dieser Lektion: **Messwerte ohne Protokoll, Karten und Fehlerliste gibt es nicht.** Der Bericht setzt den Zahlensatz nur zusammen, wenn drei Dinge vorliegen: die preregisterierte Metrik im Protokoll, die Karten (Daten- und Modellkarte), und die getrennte Fehlerliste. Fehlt eines davon, liefert die Funktion eine Absage mit einer Liste der fehlenden Teile — und bewusst **keine** Messwerte. Das ist die Anti-Overclaiming-Maschine: Ein Zahlensatz ohne diese drei Kontexte ist immer Overclaiming, egal wie richtig die Zahlen gerechnet sind, weil niemand prüfen kann, wonach gemessen wurde.

## Worked Example am GenAI-Prototyp

Übertragen auf den GenAI-Prototyp (deterministischer Stub, recall@k über eingefrorene Queries, Injektions-Fixture, Ablation 0,6 mit Kontrolle gegen 0,8 ohne):

- **Golden Set**: die eingefrorenen Fixtur-Queries mit Gold-Antworten und zulässigen Belegen; sha256 über die kanonische Serialisierung, protokolliert im Versuchslog.
- **Baseline-Konfiguration**: unverändertes Retrieval (Top 5), Stub-Generator, Kontrolle an — genau der Lauf, den die Ablation als 0,6 ausgewiesen hat.
- **Fehlerliste**: pro Fall zuerst die Retrieval-Frage (relevantes Dokument in den Top 5?), dann das Antwort-Label; die Injektions-Fixture-Fälle zählen als beabsichtigte Verweigerung, nicht als Defekt.
- **Doppel-Lauf**: zweimal laufen, Digest vergleichen, erst danach die Zahl in den Bericht.
- **Bericht**: Metrik recall@5 aus dem Protokoll, Karten konsistent, Fehlerliste getrennt — jetzt erst dürfen 0,6 (naiv über alle Fälle) und die bereinigte Antwort-Genauigkeit genannt werden.

## Typische Fehlvorstellungen

- „Der Hash sichert das Set ab.“ — Nein, er beweist nur seinen Zustand; sichern musst du das Set selbst (Versionierung, Freeze).
- „Ein paar abgeänderte Gold-Antworten sind okay.“ — Jede Änderung nach dem Freeze ist eine neue Studie; der Hash macht das sichtbar, nicht unschädlich.
- „Die naive Genauigkeit reicht, Hauptsache ehrlich.“ — Ehrlich ist nur das Paar: bereinigt und naiv zusammen zeigen, wo der Fehler tatsächlich entsteht.
- „Reproduzierbarkeit sieht man an gleichen Zahlen.“ — Gesehen wird sie erst durch den Vergleichs-Assert im Lauf selbst; Gleichheit von Hand abgetippter Zahlen ist keine Prüfung.
- „Ohne Karten sind die Zahlen trotzdem gültig.“ — Ohne Karten und Fehlerliste weiß niemand, was gemessen wurde; der Bericht verweigert deshalb komplett statt teilweise.

## Direkter Check

In [w34-e2](#/exercise/w34-e2) aggregierst du ein Fehler-Ledger in bereinigte und naive Genauigkeit. [w34-e3](#/exercise/w34-e3) sagst du die Ausgaben einer Ledger-Auswertung vorher; [w34-e4](#/exercise/w34-e4) baust du das gehashte Golden Set; [w34-e5](#/exercise/w34-e5) implementierst du run_baseline mit Doppel-Lauf-Assert; der Boss [w34-e6](#/exercise/w34-e6) verweigert Messwerte ohne Protokoll-Metrik, Karten und Fehlerliste.

# Diffs lesen und Commits bauen

Git speichert Änderungen, aber es bewertet nicht, ob dein Code richtig ist. Diese Lektion zeigt dir das Bild der Speicherstände, mit dem du Status, Diff und Commit sicher liest, und warum ein Merge kein Korrektheitsbeweis ist.

## Das Bild dahinter: Speicherstände

Ein **Repository** ist dein Spiel, ein **Commit** ein benannter Speicherstand. Mit `git add` **merkst** du **vor**, was in den nächsten Speicherstand kommt: das Staging. Ein **Branch** ist ein paralleler Spielstand, in dem du eine Idee ausprobierst, ohne den Hauptstand anzufassen. Ein **Merge** führt zwei Spielstände zusammen.

Wo der Vergleich hinkt: Spielstände lassen sich nicht verschmelzen, Git-Merges schon. Aber Git prüft nur, ob sich die Textänderungen kombinieren lassen, nicht ob das Ergebnis funktioniert. Nach jedem Merge laufen die [Tests](#/glossary/test) erneut.

## Vor dem Commit: Status und Diff

```text
git status
git diff
```

`status` beantwortet, welche Dateien geändert, neu oder vorgemerkt sind. `diff` zeigt den **Diff**, den Text der noch nicht vorgemerkten Änderungen. Willst du genau die vorgemerkten Änderungen sehen, heißt der Befehl `git diff --staged`. Lies beides, bevor du Dateien auswählst.

Konkreter Ablauf nach einem Duplikat-Fix:

```text
$ git status --short
 M src/checker.py
$ git diff --stat
 src/checker.py | 8 ++++++++
 1 file changed, 8 insertions(+)
$ python -m pytest -q tests/test_checker.py
5 passed
```

Der Status zeigt genau eine geänderte Datei. Der Diff-Überblick passt zur beabsichtigten Änderung. Erst der separate Testlauf prüft das Verhalten. Danach kannst du `src/checker.py` vormerken und den Commit erstellen.

## Ein geschlossener Commit

Ein Commit sollte eine zusammenhängende Absicht enthalten, zum Beispiel „Duplikaterkennung ergänzen“. Eine gleichzeitig geänderte Farbanpassung gehört nicht hinein. Kleine geschlossene Diffs lassen sich leichter prüfen und rückgängig machen. Jeder Commit trägt einen **Commit-Hash**, eine lange eindeutige Nummer, die ihn identifiziert.

Arbeitsfolge:

1. Einen fehlschlagenden Test reproduzieren.
2. Den kleinsten Fix schreiben.
3. Einzeltest und Suite ausführen.
4. `git diff` lesen.
5. Nur die zugehörigen Dateien vormerken.
6. Die Commit-Nachricht nach dem Grund formulieren.

## Merge ist kein Beweis

Ein erfolgreicher Merge zeigt nur, dass Git die Textänderungen zusammenführen konnte. Zwei einzeln korrekte Änderungen können gemeinsam einen Fehler erzeugen. Und ein Merge-Konflikt ist keine Katastrophe: Du löst ihn von Hand, indem du die markierten Stellen entscheidest, und lässt danach die Tests laufen, bevor du den Merge abschließt.

Eine Git-Historie kann zudem umgeschrieben oder von einer anderen Person erstellt werden. Die Plattform behandelt sie als nützliches Arbeitsartefakt, nicht als Identitäts- oder Korrektheitsnachweis.

## Wo dir das in der KI begegnet

ML-Experimente brauchen Reproduzierbarkeit: Zu jedem Trainingslauf notierst du den Commit-Hash, damit du später weißt, welcher Code die Kurve erzeugt hat. Und der Hugging Face Hub speichert Modelle in Git-Repositories; große Gewichtsdateien laufen dort über Git LFS.

## Typische Fehler

- `git diff` lesen, wenn du die vorgemerkten Änderungen meinst; die zeigt nur `--staged`.
- Ungeprüfte und vorgemerkte Änderungen in einem Commit mischen.
- Die Commit-Nachricht nach dem Was statt dem Warum schreiben.
- Nach einem Merge ohne Testlauf committen.
- Einen Merge-Konflikt als Fehlschlag lesen statt als Entscheidungsaufgabe.

## Projektstufe

Erstelle für den CLI-Datenprüfer drei geschlossene Änderungen: zuerst Typprüfung, dann leere Werte, danach Duplikate. Notiere zu jeder Änderung im README den einzelnen Test, der vorher rot und danach grün war. Nutze einen Branch, wenn du den gesamten Projektpfad getrennt vom Hauptstand halten willst.

## Begriffe auf einen Blick

- **Repository**: das Projektarchiv mit der ganzen Änderungsgeschichte.
- **Commit**: benannter Speicherstand einer zusammenhängenden Änderung.
- **Vormerken** (englisch *staging*): mit `git add` auswählen, was in den nächsten Commit kommt.
- **Diff**: die Textanzeige der Änderungen; `git diff` unvorgemerkte, `git diff --staged` vorgemerkte.
- **Status**: `git status`, die Übersicht über geänderte, neue und vorgemerkte Dateien.
- **Branch**: parallele Änderungslinie, die den Hauptstand unangetastet lässt.
- **Merge**: Zusammenführen zweier Branches; prüft Text, nicht Korrektheit.
- **Commit-Hash**: eindeutige Nummer, die einen Commit identifiziert.

# Git als überprüfbares Arbeitsprotokoll

Git speichert Änderungen. Es bewertet nicht, ob dein Code richtig ist. Ein guter Commit verbindet deshalb einen verständlichen Diff mit separat ausgeführten Tests.

## Vor dem Commit

```text
git status
git diff
```

`status` beantwortet, welche Dateien geändert, neu oder vorgemerkt sind. `diff` zeigt den Inhalt der noch nicht vorgemerkten Änderungen. Lies beides, bevor du Dateien auswählst.

Konkreter Ablauf nach dem Duplikat-Fix:

```text
$ git status --short
 M src/checker.py
$ git diff --stat
 src/checker.py | 8 ++++++++
 1 file changed, 8 insertions(+)
$ python -m pytest -q tests/test_checker.py
5 passed
```

Der Status zeigt genau eine geänderte Datei. Der Diff-Überblick passt zur beabsichtigten Änderung. Erst der separate Testlauf prüft das Verhalten. Danach kannst du `src/checker.py` vormerken und einen Commit für die Duplikaterkennung erstellen.

## Ein geschlossener Commit

Ein Commit sollte eine zusammenhängende Absicht enthalten, zum Beispiel „Duplikaterkennung ergänzen“. Eine gleichzeitig geänderte Farbanpassung gehört nicht hinein. Kleine geschlossene Diffs lassen sich leichter prüfen und rückgängig machen.

Arbeitsfolge:

1. Einen fehlschlagenden Test reproduzieren.
2. Den kleinsten Fix schreiben.
3. Einzeltest und Suite ausführen.
4. `git diff` lesen.
5. Nur die zugehörigen Dateien vormerken.
6. Commit-Nachricht nach dem Grund formulieren.

## Branch und Merge

Ein Branch trennt Änderungslinien. Ein erfolgreicher Merge zeigt nur, dass Git die Textänderungen zusammenführen konnte. Danach müssen Tests erneut laufen, weil zwei einzeln korrekte Änderungen gemeinsam einen Fehler erzeugen können.

## Kein Leistungsbeweis

Eine Git-Historie kann umgeschrieben oder von einer anderen Person erstellt werden. Die Plattform behandelt sie als nützliches Arbeitsartefakt, nicht als Identitäts- oder Korrektheitsnachweis.

## Projektstufe

Erstelle für den CLI-Datenprüfer drei geschlossene Änderungen: zuerst Typprüfung, dann leere Werte, danach Duplikate. Notiere zu jeder Änderung im README den einzelnen Test, der vorher rot und danach grün war. Nutze einen Branch, wenn du den gesamten Projektpfad getrennt vom Hauptstand halten willst.

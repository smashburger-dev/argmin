# Figuren-Completion: Status für Release 0.10.0

Stand: 23.10.2026. Release 0.10.0 ist in Commit `7939152c63c37389b8cc4daa414de8431f495f68` integriert und gepusht ([PR #113](https://github.com/smashburger-dev/argmin/pull/113)). Die komplette Source-/Release-UI-Matrix ist noch nicht bestanden. Der letzte vollständige CI-Lauf (422c) ist grün; den aktuellen Commit-Status prüft der Koordinator noch. Die lokale finale 11-Gate-Prüfung lief nicht. Noas Sichtprüfung steht aus.

## Implementiert

- **S5b:** `pca-shadow` und `kmeans-pizza` sind eigenständige Szenen in `l-ml-svm-pca`. F3/F4-Hinweise behandeln Rang, Lösungsfall und Determinantenfall. Der Rang-Hinweis verwendet eine feste unabhängige Matrix und zeigt eine Nullzeile ohne Rangzahl.
- **F7:** Die festen Nachbarhinweise für Gradient-Update, symbolischen SGD-Schritt und Trainingskurven verwenden dieselben Projektionsregeln. Die Kurven zeigen Underfitting, Stabil und Overfitting gemeinsam; Update- und SGD-Hinweise verraten kein numerisches Zielgewicht. `pick-learning-rate` hat einen versionierten deterministischen Prüfer, mehrere gültige Lernraten und Rückmeldung aus dem ausgeführten Lauf. Die F7-Aufgabenszene verwendet die nativen Beats `step-0` und `step-1` von `learning-rate-run`.
- **F1:** `trace-tag-after-line` baut Aufgaben aus sieben versionierten CPython-Aufzeichnungen. Quelltext-Präfix und vorherige Beschriftungen bleiben getrennt von Zielereignis und Lösung. Namens- und Objektauswahl verwenden getrennte Ziele; Aliasnamen bewahren unterschiedliche Namen bei gemeinsamer Objektidentität.

Details zu S5b/F7 und F1 stehen in [s5-f7-handoff.md](s5-f7-handoff.md) und [f1-handoff.md](f1-handoff.md).

## Vorhandene fokussierte Evidenz

- F7: `node --test tests/figuren_s5b_f7.test.mjs tests/scene_build.test.mjs` lief mit 17/17 bestanden. Auf der echten Route `#/family/pick-learning-rate/stable-convergent-rate/0/core?module=lm-ml-svm-pca` zeigte Playwright den Verlustplot und einen benannten Figurenbereich ohne Seitenfehler. Lernrate `0.025` führte zu sichtbarer Kriterienrückmeldung; `0.075` führte zu „Richtig.“ Die aufgenommenen Einzelbilder liegen lokal unter `/tmp/figuren-f7-wrong.png` und `/tmp/figuren-f7-correct.png`.
- F1: `node --test tests/figures_trace_task.test.mjs tests/figures_trace_cpython.test.mjs` ist im F1-Handoff mit 9/9 bestanden dokumentiert. Der dort dokumentierte Compile-/Validierungslauf umfasst die sieben Aufzeichnungen. Die dort beschriebene Geometrieprüfung erfasste 135 Posen; das ist fokussierte Evidenz, keine vollständige Browserabnahme.
- Der letzte Runner-Bericht unter [ui-acceptance/evidence.json](ui-acceptance/evidence.json) ist ein Teilnachweis auf Commit `7939152`: 117 Desktop-SVG-Ziele wurden vermessen, darunter fünf Ausgabe- und zwei Rückgabeziele mit erfolgreicher Interaktion. Die Gesamtmatrix ist damit nicht abgedeckt. Die native Auswahl-Tastatursteuerung lässt bei `Home`/`ArrowDown` derzeit ein Feld leer; die vollständige Trace-Aufgabe und ihre Ein-/Ausgabeprüfung bleiben offen.

## Offen

- Die vollständige Source-/Release-Matrix für Viewports, Themes, Bewegungspräferenz und Bedienung sowie der finale Kontaktbogen stehen aus. Noas visuelle Prüfung ist offen.
- Die lokale finale 11-Gate-Prüfung wurde auf dem exakten HEAD nicht ausgeführt. CI-422c-Grün ersetzt diesen fehlenden Nachweis nicht.
- Die drei seriellen Performance-Läufe wurden nicht ausgeführt. Gzip- und Laufzeitbudgets bleiben gemäß Nutzerfreigabe offen und nicht blockierend; siehe [performance-evidence.md](performance-evidence.md). Es wird keine Budgeteinhaltung behauptet.

## Reproduzierbare fokussierte Prüfungen

```sh
node --test tests/figuren_s5b_f7.test.mjs tests/scene_build.test.mjs
node --test tests/figures_trace_task.test.mjs tests/figures_trace_cpython.test.mjs
```

Die Freigabe erfordert weiterhin den finalen Gate-Lauf auf dem festgelegten Commit und die ausstehende visuelle Prüfung. Das geschützte Recherche-Dokument `docs/session-2026-10-16-figuren-recherche.md` bleibt unverändert und ungestaged.

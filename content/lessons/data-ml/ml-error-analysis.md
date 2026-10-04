# Fehleranalyse und Modellkarten

Ein KI-System mit 96 % Trefferquote kann eine Gruppe trotzdem im Stich lassen. Diese Lektion zeigt dir, wie du Fehler pro Teilgruppe misst, die Lücken benennst und in einer Modellkarte ehrlich festhältst, was das Modell darf und was nicht.

## Das Bild dahinter: der flache Fluss

„Der Fluss ist im Durchschnitt einen Meter tief“, und trotzdem kann man darin ertrinken. Der Mittelwert sagt nichts über die tiefste Stelle. Genauso sagt die Gesamtgenauigkeit nichts über die schlechteste Teilgruppe.

Wo der Vergleich hinkt: Beim Fluss siehst du die Tiefe nicht, ohne hineinzugehen. Bei Daten kannst du die Fehlerrate pro Teilgruppe messen, wenn du die Gruppen kennst und sie in den Daten markiert sind.

## Fehlerraten pro Teilgruppe

Die erste Frage der Fehleranalyse lautet: Für wen ist das Modell gut, für wen schlecht? Teile die Testdaten in **Teilgruppen** (Altersbänder, Regionen, Gerätetypen) und rechne die **Fehlerrate** pro Gruppe: die Anzahl der Fehler geteilt durch die Gruppengröße. Der **Lückenwert** ist der Unterschied zwischen bester und schlechtester Gruppe in Prozentpunkten, nicht in Prozent relativ.

Beispiel: Eine Klassifikation trifft auf Gruppe „jung“ 95 % und auf Gruppe „alt“ 78 %. Die Gesamttrefferquote 90 % verdeckt die Lücke von 17 Prozentpunkten. Berichtet wird die Lücke zusammen mit den Einzelwerten; die Gesamtzahl allein ist keine Verteidigung.

## Fehlertypen getrennt zählen

Nicht jeder Fehler kostet gleich viel. Ein **Fehlalarm** (englisch *false positive*) schlägt an, obwohl nichts ist; ein **übersehener Fall** (englisch *false negative*) lässt einen echten Fall durch. Je nach Anwendung ist das eine harmlos und das andere teuer. Rechne die Fehlertypen pro Teilgruppe getrennt; eine Gruppe kann viele Fehlalarme und eine andere viele übersehene Fälle haben, bei gleicher Gesamtzahl.

## Label-Rauschen und systematische Fehler

Zwei Fehlerquellen musst du unterscheiden. **Label-Rauschen** sind falsche Zielwerte in den Daten; das Modell wird für Fehler bestraft, die es nicht macht. **Systematische Teilgruppenfehler** entstehen, wenn eine Gruppe in den Trainingsdaten selten oder verzerrt ist; das Modell lernt ihre Muster schlechter. Beides sichtbar machen: Stichproben der falsch gelabelten Zeilen prüfen, Fehler pro Gruppe zählen, dann entscheiden, ob Daten, Gruppen oder das Modell die Ursache sind.

## Drift

**Drift** (englisch *data drift*) heißt: Die Verteilung der Eingabedaten wandert nach dem Training weg. Sensoren altern, Märkte ändern sich, neue Geräte kommen hinzu. Drift erkennst du am Vergleich von Verteilungen (Histogramme, Kennzahlen) zwischen Trainings- und Live-Daten; bevor du das Modell beschuldigst, prüfe, ob die Daten noch dieselbe Welt beschreiben.

## Die Modellkarte

Eine **Modellkarte** (englisch *model card*) dokumentiert ein Modell ehrlich und knapp:

- **Einsatzzweck**: Wofür das Modell gebaut wurde und wofür nicht.
- **Metriken pro Gruppe**: Kennzahlen aufgeschlüsselt nach Teilgruppen, nicht nur der Gesamtwert.
- **Grenzen**: Bekannte Schwächen, seltene Fälle, Datenlücken.

Das Gegenstück zur Modellkarte ist der **Overclaim**: eine Aussage über das Modell, die die Messung nicht trägt („funktioniert für alle Kunden“). Ehrlich berichten heißt: nur das behaupten, was die Zahlen hergeben, und die Lücken benennen.

## Typische Fehler

- Nur die Gesamtgenauigkeit berichten; die schlechteste Gruppe verschwindet im Mittel.
- Prozentpunkte mit Prozent relativ verwechseln: 78 % statt 95 % ist eine Lücke von 17 Prozentpunkten.
- Fehlalarme und übersehene Fälle zu einer Zahl mischen, obwohl sie unterschiedliche Kosten haben.
- Label-Rauschen als Modellfehler lesen oder umgekehrt.
- In der Modellkarte behaupten, was nicht gemessen wurde.

## Wo dir das in der KI begegnet

Die Studie „Gender Shades“ (Buolamwini und Gebru, 2018) maß kommerzielle Gesichtsanalyse und fand Fehlerraten bis 34,7 % für dunkelhäutige Frauen gegenüber höchstens 0,8 % für hellhäutige Männer. Die Gesamtwerte der Systeme sahen respektabel aus; die Teilgruppenwerte nicht. Genau deshalb gehören Gruppenmetriken in jede Modellkarte.

## Direkter Check

Berechne in einer Einstiegsaufgabe eine Teilgruppen-Lücke in Prozentpunkten. Klassifiziere den Fehlertyp in der [Kernaufgabe: Drift-Klassifikation](#/family/classify-error-drift/accuracy-drop-without-code-change/0/core). In der [Kernaufgabe: Teilgruppen-Fehlerraten](#/family/aggregate-grouped-metrics-report/subgroup-error-rates-numpy/0/core) implementierst du `subgroup_error_rates` und `largest_gap`; die [Vertiefungsaufgabe: Fehlerkategorisierung und Modellkarte](#/family/aggregate-grouped-metrics-report/categorize-errors-report/0/stretch) verlangt die Fehlerkategorisierung plus Modellkarten-Stub.

## Begriffe auf einen Blick

- **Teilgruppe** (englisch *subgroup*): Teilmenge der Testdaten, für die Metriken getrennt gerechnet werden.
- **Fehlerrate** (englisch *error rate*): Anteil der falschen Vorhersagen innerhalb einer Gruppe.
- **Fehlalarm** (englisch *false positive*): Fall, den das Modell fälschlich als positiv meldet.
- **Übersehener Fall** (englisch *false negative*): positiver Fall, den das Modell nicht erkennt.
- **Label-Rauschen** (englisch *label noise*): falsche Zielwerte in den Daten, die das Modell für Fehler bestrafen, die es nicht macht.
- **Drift** (englisch *data drift*): die Eingabeverteilung wandert nach dem Training weg; die Leistung sinkt ohne Modellfehler.
- **Modellkarte** (englisch *model card*): Dokument mit Einsatzzweck, Metriken pro Gruppe und Grenzen eines Modells.
- **Overclaim**: Aussage über ein Modell, die die Messung nicht trägt.

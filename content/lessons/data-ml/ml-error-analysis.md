# Fehleranalyse und Modellkarten

Ein KI-System mit 96 % Trefferquote kann eine Gruppe trotzdem im Stich lassen. Diese Lektion zeigt dir, wie du Fehler pro Teilgruppe misst, die Lücken benennst und in einer Modellkarte ehrlich festhältst, was das Modell darf und was nicht.

## Das Bild dahinter: der flache Fluss

„Der Fluss ist im Durchschnitt einen Meter tief“, und trotzdem kann man darin ertrinken. Der Mittelwert sagt nichts über die tiefste Stelle. Genauso sagt die Gesamtgenauigkeit nichts über die schlechteste Teilgruppe.

Wo der Vergleich hinkt: Beim Fluss siehst du die Tiefe nicht, ohne hineinzugehen. Bei Daten kannst du die Fehlerrate pro Teilgruppe messen, wenn du die Gruppen kennst und sie in den Daten markiert sind.

## Fehlerraten pro Teilgruppe

Die erste Frage der Fehleranalyse lautet: Für wen ist das Modell gut, für wen schlecht? Teile die Testdaten in **Teilgruppen** (Altersbänder, Regionen, Gerätetypen) und rechne die **Fehlerrate** pro Gruppe: die Anzahl der Fehler geteilt durch die Gruppengröße. Der **Lückenwert** ist der Unterschied zwischen bester und schlechtester Gruppe in Prozentpunkten, nicht in Prozent relativ.

Beispiel: Eine Klassifikation trifft auf Gruppe „jung“ 95 % und auf Gruppe „alt“ 78 %. Die Gesamttrefferquote 90 % verdeckt die Lücke von 17 Prozentpunkten. Berichtet wird die Lücke zusammen mit den Einzelwerten; die Gesamtzahl allein ist keine Verteidigung.

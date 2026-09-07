# Responsible AI: Subgruppen, Schwellen, Kosten

Eine durchschnittliche Genauigkeit von 0,9 klingt gut — bis du fragst, für wen. Responsible AI beginnt genau dort: nicht mit Absichtserklärungen, sondern mit **Metriken pro Gruppe**, einer ehrlichen **Schwellenwert-Entscheidung** und einer **Kostenrechnung**, die auch die Missbrauchsseite einschließt.

## Subgruppenmetriken: zwei Raten, getrennt ausgewiesen

Aus der Konfusionsmatrix einer Gruppe lassen sich zwei Raten direkt ablesen:

- **False-Positive-Rate (FPR)** = FP/(FP + TN): Anteil der harmlosen Fälle, die fälschlich verworfen werden.
- **Auswahlrate (Selection Rate)** = (TP + FP)/alle Fälle: Anteil der Fälle, die das System durchlässt bzw. positiv entscheidet.

Beide werden **pro Gruppe** berechnet und dann verglichen. Der Vergleich ist Differenz oder Verhältnis — nie nur eine Zahl für alle. Ein Rechenbeispiel mit exakt darstellbaren Dezimalen: Gruppe eins liefert FP = 10, TN = 30, also FPR = 10/40 = 0,25. Gruppe zwei liefert FP = 4, TN = 36, also FPR = 4/40 = 0,10. Die FPR-Differenz beträgt 0,25 − 0,10 = **0,15** — harmlose Fälle der Gruppe eins werden mehr als doppelt so oft fälschlich blockiert. Bei Auswahlraten von 30/50 = 0,60 und 21/50 = 0,42 beträgt die Differenz 0,18; das Verhältnis 0,42/0,60 = 0,70 liegt deutlich unter 1 — ein Hinweis, dass die Gruppen ungleich behandelt werden. Solche Zahlen sind deterministisch nachrechenbar; kein Sprachmodell richtet sie.

Wichtig ist die Größenordnung in Tausendsteln: In der Praxis berichtet man Differenzen oft als 150 Tausendstel statt 0,15, weil kleine Unterschiede leichter vergleichbar werden. Was zählt, ist die Trennung nach Gruppen — der Gesamt-FPR über alle Fälle kann eine Differenz von 0,15 vollständig verstecken.

## Schwellenwerte: Paritätsband zuerst, dann F1

Ein Detektor hat einen Schwellenwert, und jeder Schwellenwert verschiebt FPR, Auswahlrate und F1 unterschiedlich pro Gruppe. Die Reihenfolge der Entscheidung ist der ethische Kern:

1. **Paritätsband zuerst**: Wähle den kleinsten Schwellenwert, bei dem die Auswahlraten der Gruppen um höchstens das Band voneinander abweichen (z. B. 0,05).
2. **Dann Qualität**: Unter den Kandidaten im Band wähle den mit dem besten F1; bei Gleichstand den kleineren Schwellenwert.

Umgekehrt wäre Overclaiming: Erst das F1-Optimum suchen und dann prüfen, ob es zufällig paritätskonform ist, verwandelt Fairness in ein Nachprasen. Ein Kandidat mit F1 = 0,81 außerhalb des Bands verliert gegen F1 = 0,78 innerhalb des Bands — die Differenz ist der Preis der Gleichbehandlung, und er wird offen ausgewiesen, nicht wegoptimiert. Was kein Kandidat erfüllt, ist ein Befund, kein Grund, das Band still zu erweitern.

## Betriebskosten deterministisch rechnen

Verantwortung schließt ein, was ein System kostet — vor allem, wenn Kontrolle teurer ist als Wegschauen. Die Rechnung ist simpel und fest: Kosten je 1.000 Anfragen = (Input-Token je 1.000 Anfragen / 1.000.000) · Preis je 1M Input + (Output-Token je 1.000 Anfragen / 1.000.000) · Preis je 1M Output. Mit 120.000 Input- und 30.000 Output-Token je 1.000 Anfragen sowie 0,50 EUR je 1M Input und 2,00 EUR je 1M Output: 0,12 · 0,50 = 0,06 EUR Input, 0,03 · 2,00 = 0,06 EUR Output, zusammen **0,12 EUR je 1.000 Anfragen**. Solche Tabellen machen den Trade-off sichtbar: ein zusätzlicher Kontrollschritt pro Anfrage verdoppelt fast jede dieser Zahlen.

## Risikoregister und RPN-Priorisierung

Risiken sammelst du in einem Register und priorisierst mit der RPN = Risiko · Prävalenz · Kontrolle (jeweils eine kleine ganzzahlige Skala). Ein Beispiel mit drei Einträgen: Datenleck mit 4 · 2 · 2 = 16, Prompt-Injektion mit 5 · 3 · 1 = 15, Overclaiming im Bericht mit 3 · 1 · 2 = 6. Das Datenleck und die Injektion liegen nah beieinander — die Reihenfolge sagt dir, wo Schutzmaßnahmen zuerst hin gehören.

Ehrlichkeitsregel dieser Plattform: Das Register ist **Arbeitsevidenz, kein Mastery-Beweis**. RPN-Werte sind Einschätzungen von Menschen, ihre Skalen sind Produkt-Heuristiken. Was deterministisch prüfbar ist, sind die Subgruppenmetriken, die Schwellenentscheidung und die Kostentabelle — der Boss der Lektion verlangt genau diese drei zusammen mit einem Restrisiko-Eintrag, sonst verweigert er den Bericht.

## Worked Example am GenAI-Prototyp

Der RAG-Prototyp läuft mit deterministischem Stub-Generator über eingefrorene Fixtur-Queries und blockiert eine Injektions-Fixture in Anfragen und Dokumentpositionen. Die Ablation kennt zwei Zahlen: recall 0,6 mit Kontrolle, 0,8 ohne. Verantwortungsvoll ausgewiesen heißt das:

- **Subgruppen**: Fixtur-Queries in kurzer und langer Formulierung getrennt auswerten — landet die Blockade der Injektions-Fixture überwiegend bei kurzen Anfragen, steigt dort die FPR, ohne dass der Gesamt-recall es zeigt.
- **Schwellenwert**: der Injektions-Detektor arbeitet mit fester Regelstrenge; das Paritätsband für die Auswahlraten der beiden Query-Gruppen wird vor der Messung festgelegt.
- **Kosten**: der Prototyp selbst kostet kein Geld pro Anfrage (Stub, kein Netzwerk) — aber die Kostenrechnung übst du an der Preisformel oben, weil jedes echte System genau diese Multiplikatoren trägt.
- **Restrisiko**: der Regel-Detektor erkennt nur bekannte Muster; dieser Eintrag bleibt im Register stehen, auch wenn alle Metriken im Band liegen.

## Typische Fehlvorstellungen

- „Der Gesamt-F1 ist gut, also ist das System fair.“ — Gesamtmetriken können Subgruppenungleichheit komplett verstecken; Ausweis pro Gruppe ist Pflicht.
- „Ich wähle den Schwellenwert mit dem besten F1.“ — Ohne Paritätsband zuerst ist das eine Qualitätsentscheidung mit vertauschter Reihenfolge; Fairness ist kein Filter danach.
- „Kosten sind ein Business-Thema.“ — Kosten entscheiden, ob Kontrollen im Betrieb bleiben oder bei Budgetdruck still fallen gelassen werden; deshalb gehören sie in denselben Bericht.
- „Das Risikoregister ist abgehakt.“ — Ein Register ist gelebte Arbeitsevidenz und bleibt vorläufig; es zählt bewusst nicht als Mastery.

## Direkter Check

In einer Einstiegsaufgabe berechnest du Raten-Differenzen zweier Gruppen in Tausendsteln. Die [Kernaufgabe](#/family/trace-assignment-state/rpn-priority-trace/0/core) verfolgt eine RPN-Priorisierung im Code; die [Kernaufgabe](#/family/aggregate-confusion-metric/fairness-metric-compare/0/core) implementiert die Subgruppenmetriken; die [Vertiefungsaufgabe](#/family/aggregate-parity-threshold-selection/parity-threshold-selection/0/stretch) kombiniert Schwellenwahl unter Paritätsband mit der Kostentabelle; die [Herausforderung](#/family/validate-report-guard-compose/report-guard-compose/0/challenge) als Boss verweigert den Responsible-Bericht, wenn Subgruppen, Parität, Kosten oder Restrisiko fehlen.

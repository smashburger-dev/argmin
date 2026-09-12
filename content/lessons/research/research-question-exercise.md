# Übung: Protokoll und Goal-Shifts am zweiten Fall

Im Worked Example hast du die Chunkgrößen-Frage zerlegt. Jetzt ein anderer Eingriff am selben Prototypen: Die Regelliste des Injektions-Detektors soll von zwei auf drei Phrasen erweitert werden. Die offene Frage lautet: „Macht die strengere Regelliste das System besser?“

## Aufgabe 1: Die Frage prüfbar machen

1. Nenne die zwei unbestimmten Größen in „das System besser machen“ — was genau ist „strenger“, was genau ist „besser“?
2. Formuliere die Forschungsfrage so um, dass sie scheitern kann (feste Metrik, fester Vergleich, Baseline).
3. Zerlege sie ins Je-desto-Muster: Welche Wörter vor dem Komma tragen die UV, welche nach „desto“ die DV?

## Aufgabe 2: Das Protokoll vor dem Lauf schreiben

Lege alle Felder fest, bevor irgendein Lauf startet: Metrik und Erfolgsschwelle, primärer und sekundäre Endpunkte, Subgruppen, Baseline, Abbruchregel — und die Datumsreihenfolge, die dem Protokoll seinen Beweischarakter gibt.

## Aufgabe 3: Goal-Shifts zwischen zwei Versionen flaggen

Version v1 (vor dem Hauptlauf eingefroren): metrik „recall@5“, schwelle 0,75, primaer „recall@5“, sekundaer [„ablehnungsquote“], subgruppen [„neukunden“, „mobil“].

Version v2 (nach dem ersten Lauf „nachjustiert“): metrik „recall@5“, schwelle 0,6, primaer „ablehnungsquote“, sekundaer [„recall@5“], subgruppen [„neukunden“, „mobil“, „langform“].

Liste alle Goal-Shift-Flags zwischen v1 und v2 — und begründe bei jedem, warum es kein Editorials ist, sondern ein Wechsel des Forschungsziels.

## Kontrolliere

- Unbestimmt sind „strenger“ (welche Regelliste, wie viele Phrasen?) und „besser“ (welche Metrik, auf welchem Golden Set?). Prüfbar ist z. B.: „Senkt eine Regelliste mit drei Phrasen statt zwei den Anteil beantworteter Fixtur-Fragen, gemessen als recall@5 gegen die Baseline mit zwei Phrasen?“
- Je-desto: „Je mehr Phrasen die Regelliste enthält, desto niedriger der Anteil beantworteter Fixtur-Fragen.“ UV: Regelstrenge (zwei vs. drei Phrasen); DV: Anteil beantworteter Fixtur-Fragen.
- Protokoll: metrik recall@5, schwelle (fester Wert, z. B. beantwortet ≥ 0,6), primaer recall@5, sekundaer ablehnungsquote und bearbeitungszeit, Subgruppen vor dem Freeze, Baseline = Lauf mit der bisherigen Zweier-Liste, Abbruchregel, datum_prereg vor datum_hauptlauf.
- Flags: schwelle_geaendert (0,75 → 0,6), primaer_demoted (recall@5 rutscht in die sekundären Endpunkte), subgruppe_nach_freeze („langform“ kommt nach dem Freeze dazu). metrik_geaendert trifft **nicht** — die Metrik blieb recall@5. Wer trotz dieser drei Flags „die Hypothese hat gehalten“ berichtet, berichtet über eine andere Studie als die preregisterierte.

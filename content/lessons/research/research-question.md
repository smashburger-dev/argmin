# Forschungsfrage und Experimentprotokoll

Die Lektionen zu Retrieval, Evaluation und defensiven Kontrollen haben dir Werkzeuge gebaut: Retrieval, Fixtur-Evaluation, defensive Kontrolle, ein Prototyp. Ab dieser Lektion behandelst du dieses Werkzeug wie ein Forschungsgegenstand. Der erste Schritt ist nicht das Experiment, sondern die **Forschungsfrage** — und zwar eine, die scheitern kann.

## Was eine Frage prüfbar macht

Eine Frage ist nur dann prüfbar, wenn drei Dinge feststehen, bevor irgendein Lauf startet:

1. **Eine feste Metrik** mit festem Namen und Berechnungsvorschrift, z. B. recall@k über eingefrorene Queries — nicht „das System wirkt besser“.
2. **Ein fester Vergleich**: eine unabhängige Variable (UV), die du gezielt veränderst, und eine abhängige Variable (DV), an der du die Wirkung misst.
3. **Eine Baseline**, gegen die der Vergleich läuft — beim GenAI-Prototyp ist das der unveränderte Lauf mit dem deterministischen Stub-Generator.

Eine klassische deutsche Formulierung für Hypothesen ist das Je-desto-Muster: „Je größer die Chunkgröße, desto höher der Anteil korrekt beantworteter Fixtur-Fragen.“ Die Wörter zwischen „Je“ und dem Komma benennen die UV samt Richtung, die Wörter nach „desto“ die DV samt erwarteter Richtung. Alles, was sich nicht so zerlegen lässt, ist noch keine Hypothese, sondern eine Vermutung.

Unprüfbar sind Fragen mit absoluten Behauptungen („immer“, „niemals“, „optimal“), ohne Metrik („insgesamt besser geeignet“) oder mit einkalkuliertem Ergebnis („Warum ist die neue Version besser?“ setzt voraus, was zu zeigen wäre). Falsifizierbarkeit ist hier wörtlich gemeint: Es muss einen konkreten Messwert geben, der die Hypothese widerlegen kann.

## Das Protokoll vor dem Lauf

Ein Forschungsprotokoll hält schriftlich fest, was vor dem Hauptlauf gilt:

- **Frage und Hypothese** in prüfbarer Form,
- **Metrik und Erfolgsschwelle** (z. B. „recall@5 mindestens 0,75“),
- **primärer und sekundäre Endpunkte** — der primäre Endpunkt ist der eine Wert, über den die Studie entscheidet,
- **Subgruppen**, die von Anfang an mitgeplant werden (bei „nach Freeze ergänzt“ gilt: nachträgliche Auswahl),
- **Baseline und Abbruchregel** (wann brichst du den Lauf ab, statt weiter zu optimieren?),
- **datum_prereg vor datum_hauptlauf** — die Reihenfolge ist der Beweischarakter der ganzen Übung.

Diese Reihenfolge ist kein Bürokratie-Ritual, sondern der Unterschied zwischen einer Vorhersage und einer nachträglichen Erklärung. Wer die Schwelle erst nach dem ersten Lauf festlegt, kann nicht mehr scheitern — und was nicht scheitern kann, sagt nichts aus.

## Goal-Shifts erkennen

Trotz Preregistrierung passiert es: Nachdem erste Ergebnisse sichtbar sind, „entwickelt sich“ das Protokoll weiter. Vier Changes sind Goal-Shifts, also Wechsel des Forschungsziels, und nicht nur Kosmetik — die Contracts beim Vergleich zweier Versionen:

1. **metrik_geaendert** — die Metrik wechselt (z. B. recall@5 wird durch token-f1 ersetzt),
2. **schwelle_geaendert** — die Erfolgsschwelle wird angepasst,
3. **primaer_demoted** — der primäre Endpunkt rutscht in die sekundären Endpunkte,
4. **subgruppe_nach_freeze** — eine Subgruppe kommt dazu, nachdem der Plan eingefroren war.

Jede dieser Änderungen einzeln kann gut begründet sein. Aber sie alle gemeinsam zu ändern und dann trotzdem „die Hypothese war richtig“ zu berichten, ist Overclaiming: Du berichtest über ein anderes Ziel als das preregisterierte. Deterministisch erkennbar sind alle vier — ein Vergleich zweier Protokoll-Dicts genügt, ohne jedes Sprachmodell.

## Worked Example am GenAI-Prototyp

Nimm den RAG-Prototyp mit seinem deterministischen Stub-Generator, der über die eingefrorenen Fixtur-Queries läuft und dabei die Injektions-Fixture erkennt und blockiert. Die Ablation aus dem GenAI-Prototyp kennt zwei Zahlen: recall 0,6 mit Kontrolle, 0,8 ohne — die Differenz ist beabsichtigte Verweigerung, kein Defekt. Eine prüfbare Frage daraus:

- **Frage**: Steigt der Anteil korrekt beantworteter Fixtur-Fragen, wenn die Chunkgröße von 200 auf 400 Zeichen verdoppert wird?
- **Hypothese (Je-desto)**: Je größer die Chunkgröße, desto höher der Anteil korrekt beantworteter Fixtur-Fragen.
- **UV**: Chunkgröße (200 vs. 400). **DV**: Anteil korrekt beantworteter Fixtur-Fragen.
- **Metrik und Schwelle**: recall@5 als primärer Endpunkt, Erfolgsschwelle 0,75; bearbeitungszeit und ablehnungsquote als sekundäre Endpunkte.
- **Subgruppen vor Freeze**: neukunden-Fragen und mobil formulierte Fragen.
- **Baseline**: unveränderter Lauf des GenAI-Prototyps mit Chunkgröße 200.
- **Abbruchregel**: nach zwei aufeinanderfolgenden Läufen ohne Änderung der Kennzahl wird abgebrochen — weiterer Tuning-Aufwand ist nicht mehr Teil des Experiments.
- **datum_prereg** liegt vor **datum_hauptlauf**; erst danach startet der Hauptlauf.

Würde nach dem ersten Lauf die Schwelle von 0,75 auf 0,6 gesenkt, weil 0,75 „unrealistisch“ war — schwelle_geaendert. Würde der primäre Endpunkt auf die ablehnungsquote verschoben, weil recall@5 schlechter aussieht als erhofft — primaer_demoted. Beides darfst du tun; du darfst es nur nicht unbemerkt tun.

## Typische Fehlvorstellungen

- „Eine gute Frage ist offen.“ — Für Exploration stimmt das, für ein Experiment brauchst du die feste Metrik und den festen Vergleich; Offenheit gehört in die Recherche vor der Frage, nicht in deren Auswertung.
- „Die Schwelle kann ich anpassen, solange ich es dokumentiere.“ — Dokumentieren ist nötig, aber nicht hinreichend: Ein Goal-Shift macht aus dem neuen Lauf eine neue Studie, und die alte Frage bleibt unbeantwortet.
- „Subgruppen suche ich aus, wenn die Daten da sind.“ — Nachträgliche Subgruppen laden zum selektiven Berichten ein; was verglichen werden soll, steht vor dem Freeze im Protokoll.
- „Eine Baseline brauche ich nur bei echten Modellen.“ — Gerade beim deterministischen Stub ist die Baseline der Lauf unveränderten Codes; nur gegen ihn ist eine Änderung überhaupt messbar.

## Direkter Check

In [w31-e2](#/exercise/w31-e2) zählst du Goal-Shift-Flags zwischen zwei Protokollversionen. [w31-e4](#/exercise/w31-e4) prüft Fragen auf Prüfbarkeit und zerlegt Je-desto-Hypothesen in UV und DV; [w31-e5](#/exercise/w31-e5) validiert ein Protokoll auf Pflichtfelder und Datumreihenfolge; der Boss [w31-e6](#/exercise/w31-e6) implementiert die volle Goal-Shift-Erkennung für zwei Versionen.

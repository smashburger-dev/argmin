# Evaluation generativer Antworten

Ein Generierungssystem zu bewerten beginnt nicht mit einer Metrik, sondern mit einem **festen Fragenkatalog**: Evaluationsfragen mit Gold-Antworten und den Quellen, die als Beleg zählen. Dieser Katalog wird eingefroren, bevor irgendetwas optimiert wird — dieselbe Disziplin wie beim Train/Test-Split, nur dass das "Testset" hier von Menschen formulierte Soll-Antworten sind.

## Gold-Antworten und Quellenbelege

Jede Eval-Frage trägt drei Dinge: die Frage, eine Gold-Antwort (knapp, faktisch, mit den entscheidenden Zahlen) und die Liste zulässiger Belegquellen. Damit sind zwei getrennte Prüfungen möglich: *Stimmt der Inhalt?* und *Ist er belegt?* Eine Antwort, die zufällig richtig ist, aber eine Quelle erfindet, soll in der Auswertung sichtbar werden.

## Fehlertaxonomie: ein geschlossenes Labelset

Freitext-Kritik ist nicht auswertbar. Diese Plattform pinnt sechs Labels, vergeben durch ein Regelwerk in fester Reihenfolge (erste passende Regel gewinnt):

1. **formatfehler** — leere oder unbrauchbare Antwort,
2. **quellos** — keine Quellenangabe,
3. **off-topic** — kein gemeinsamer Sachterm mit der Gold-Antwort,
4. **halluziniert** — Beleg, der nicht in der zulässigen Quellenliste steht,
5. **falsch-faktisch** — Zahl in der Antwort, die nicht zu den Gold-Zahlen passt,
6. **unvollständig** — Gold-Zahl fehlt; und als ehrlicher Default: kein Regelwerk kann Vollständigkeit *beweisen*.

Der Default ist wichtig: Regelwerke weisen Fehler nach, sie bescheinigen keine Korrektheit. Eine Antwort ohne erkannten Fehler bleibt "unvollständig" markiert — konservativ und reproduzierbar.

## Retrieval- und Antwortfehler trennen

Vor jeder Antwortmessung steht die Frage aus der Lektion „RAG: Retrieval messbar machen“: Lag das richtige Dokument überhaupt in den top-$k$? Wenn nicht, ist der Fall ein **Retrieval-Fehler**, und die Antwortbewertung sagt nichts über den Generator. Erst wenn das Retrieval traf, ist das Label ein **Antwortfehler** derselben Kategorie. In der Praxis heißt das: pro Fall zuerst `recall@k` prüfen, dann klassifizieren — sonst verbesserst du einen Generator für Fehler, die das Retrieval verursacht hat.

## Deterministische Metriken

Alle Metriken dieser Lektion sind ohne Sprachmodell berechenbar:

- **Exact Match**: Anteil der Antworten mit $\mathrm{trim}(a) = \mathrm{trim}(g)$. Streng, aber glasklar.
- **Contains**: Ist die Gold-Antwort Teilmenge der Antwort? Toleranter gegenüber Umformulierungen, anfällig für lange Antworten.
- **Zitat-Precision und Zitat-Recall**: für die Beleglisten $C$ (zitiert) und $G$ (erwartet)
  $$P = \frac{|C \cap G|}{|C|}, \qquad R = \frac{|C \cap G|}{|G|}.$$
- **Token-F1**: Token-Überlappung als Multimengen-Schnitt (Wörter nach Kleinbuchstaben-Normalisierung):
  $$\mathrm{common} = \sum_t \min(c_a(t), c_g(t)), \quad P = \frac{\mathrm{common}}{|a|}, \quad R = \frac{\mathrm{common}}{|g|}, \quad F_1 = \frac{2PR}{P+R}.$$
- **Konfusionsmatrix**: pro Fehlerklasse (z. B. Injektion erkannt ja/nein) zählst du TP, FP, FN, TN und leitest ab
  $$\mathrm{Precision} = \frac{TP}{TP+FP}, \quad \mathrm{Recall} = \frac{TP}{TP+FN}, \quad F_1 = \frac{2 \cdot TP}{2\,TP + FP + FN}.$$

Jede dieser Metriken ist bei Festpunktzahlen exakt reproduzierbar — du kannst sie in Python nachrechnen und in Regressionstests festschreiben.

## Kein LLM-Judge als Ground Truth

Werkzeuge wie RAGAS nutzen Sprachmodelle als Bewerter. Das ist nützliche Lektüre, um den Diskurs zu verstehen — aber ein LLM-Judge ist selbst fehlbar, teuer und nicht deterministisch, und zwei LLM-Judges urteilen unterschiedlich. **Ground Truth bleibt in dieser Plattform die menschlich kuratierte Gold-Antwort plus deterministische Metriken.** Ein LLM als Schiedsrichter einzusetzen hieße, den Kandidaten vom Prüfling bewerten zu lassen.

## Typische Fehler

- Fragenkatalog nach dem ersten Messlauf "verbessert" — die Zahlen sind danach wertlos.
- Retrieval- und Antwortfehler in einer Quote vermengt.
- Labels frei formuliert statt aus geschlossenem Set — nicht aggregierbar.
- Token-F1 über Rohtexte mit Groß/Kleinbuchstaben- und Satzzeichenrauschen.
- Precision ohne Recall berichtet (oder umgekehrt).
- LLM-Judge-Ergebnisse als "Ground Truth" exportiert.

## Direkter Check

In einer Einstiegsaufgabe berechnest du Precision/F1 aus ganzzahligen Konfusionsmatrizen. Die [Kernaufgabe](#/family/classify-rule-cascade-priority/error-taxonomy-classify/0/core) implementiert den Klassifikator mit vorgegebenem Regelwerk plus Zitat-Precision; die [Vertiefungsaufgabe](#/family/aggregate-confusion-metric/confusion-from-rows/0/stretch) wandelt Zeilenlisten in Konfusionsmatrizen und Metriken; die [Herausforderung](#/family/aggregate-detector-eval-compare/run-eval-compare-rulesets/0/challenge) als Boss evaluatiert 20 Fixtur-Antworten unter zwei Regelwerken und vergleicht sie.

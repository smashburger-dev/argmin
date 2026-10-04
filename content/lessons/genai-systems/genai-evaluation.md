# Evaluation generativer Antworten

Ob ein GenAI-System gute Antworten gibt, entscheidet sich nicht an der Antwort, sondern am Fragenkatalog, der vorher eingefroren wurde. Diese Lektion zeigt dir, wie du Gold-Antworten, Fehlerlabels und Metriken so festlegst, dass zwei Läufe vergleichbar bleiben.

## Das Bild dahinter: Klausur mit Erwartungshorizont

Stell dir eine Klausur vor: Der Erwartungshorizont steht vor der Korrektur fest; Fragenkatalog, Gold-Antworten und die zulässigen Belege sind fixiert, bevor irgendjemand punktet. Für den LLM-Judge ein zweites Bild: Ein Schüler darf seine eigene Arbeit nicht benoten; genau das tut ein System, das sich selbst bewertet.

Wo der Vergleich hinkt: Ein Erwartungshorizont kann Teilpunkte vergeben. Deterministische Metriken wie Exact Match sind strenger: Alles oder nichts.

## Gold-Antworten und Quellenbelege

Jede Eval-Frage trägt drei Dinge: die Frage, eine **Gold-Antwort** (knapp, faktisch, mit den entscheidenden Zahlen) und die Liste zulässiger **Belegquellen**. Damit sind zwei getrennte Prüfungen möglich: *Stimmt der Inhalt?* und *Ist er belegt?* Eine Antwort, die zufällig richtig ist, aber eine Quelle erfindet, soll in der Auswertung sichtbar werden.

## Fehlertaxonomie: ein geschlossenes Labelset

Freitext-Kritik ist nicht auswertbar. Diese Plattform pinnt eine **Fehlertaxonomie** aus sechs Labels, vergeben durch ein Regelwerk in fester Reihenfolge (erste passende Regel gewinnt):

1. **formatfehler**, leere oder unbrauchbare Antwort,
2. **quellos**, keine Quellenangabe,
3. **off-topic**, kein gemeinsamer Sachterm mit der Gold-Antwort,
4. **halluziniert**, Beleg, der nicht in der zulässigen Quellenliste steht,
5. **falsch-faktisch**, Zahl in der Antwort, die nicht zu den Gold-Zahlen passt,
6. **unvollständig**, Gold-Zahl fehlt; und als ehrlicher Default: kein Regelwerk kann Vollständigkeit *beweisen*.

Der Default ist wichtig: Regelwerke weisen Fehler nach, sie bescheinigen keine Korrektheit. Eine Antwort ohne erkannten Fehler bleibt „unvollständig“ markiert, konservativ und reproduzierbar.

## Retrieval- und Antwortfehler trennen

Vor jeder Antwortmessung steht die Frage aus [Chunks und Index deterministisch bauen](#/lesson/l-genai-rag): Lag das richtige Dokument überhaupt in den top-$k$? Wenn nicht, ist der Fall ein **Retrieval-Fehler**, und die Antwortbewertung sagt nichts über den Generator. Erst wenn das Retrieval traf, ist das Label ein **Antwortfehler** derselben Kategorie. In der Praxis heißt das: pro Fall zuerst `recall@k` prüfen, dann klassifizieren; sonst verbesserst du einen Generator für Fehler, die das Retrieval verursacht hat.

## Deterministische Metriken

Alle Metriken dieser Lektion sind ohne Sprachmodell berechenbar:

- **Exact Match**: Anteil der Antworten mit $\mathrm{trim}(a) = \mathrm{trim}(g)$ (sprich: Antwort und Gold-Antwort nach dem Kürzen der Ränder gleich). Streng, aber glasklar.
- **Contains**: Ist die Gold-Antwort Teilmenge der Antwort? Toleranter gegenüber Umformulierungen, anfällig für lange Antworten.
- **Zitat-Precision und Zitat-Recall**: für die Beleglisten $C$ (zitiert) und $G$ (erwartet)

$$
P = \frac{|C \cap G|}{|C|}, \qquad R = \frac{|C \cap G|}{|G|}.
$$

- **Token-F1**: Token-Überlappung als Multimengen-Schnitt (Wörter nach Kleinbuchstaben-Normalisierung):

$$
\mathrm{common} = \sum_t \min(c_a(t), c_g(t)), \quad P = \frac{\mathrm{common}}{|a|}, \quad R = \frac{\mathrm{common}}{|g|}, \quad F_1 = \frac{2PR}{P+R}.
$$

- **Konfusionsmatrix**: pro Fehlerklasse (z. B. Injektion erkannt ja/nein) zählst du TP, FP, FN, TN und leitest ab

$$
\mathrm{Precision} = \frac{TP}{TP+FP}, \quad \mathrm{Recall} = \frac{TP}{TP+FN}, \quad F_1 = \frac{2 \cdot TP}{2\,TP + FP + FN}.
$$

Jede dieser Metriken ist bei Festpunktzahlen exakt reproduzierbar; du kannst sie in Python nachrechnen und in Regressionstests festschreiben.

## Kein LLM-Judge als Ground Truth

Werkzeuge wie RAGAS nutzen Sprachmodelle als Bewerter. Das ist nützliche Lektüre, um den Diskurs zu verstehen; aber ein **LLM-Judge** ist selbst fehlbar, teuer und nicht deterministisch, und zwei LLM-Judges urteilen unterschiedlich. **Ground Truth bleibt in dieser Plattform die menschlich kuratierte Gold-Antwort plus deterministische Metriken.** Ein LLM als Schiedsrichter einzusetzen hieße, den Kandidaten vom Prüfling bewerten zu lassen.

## Typische Fehler

- Fragenkatalog nach dem ersten Messlauf „verbessert“; die Zahlen sind danach wertlos.
- Retrieval- und Antwortfehler in einer Quote vermengt.
- Labels frei formuliert statt aus geschlossenem Set, nicht aggregierbar.
- Token-F1 über Rohtexte mit Groß-/Kleinbuchstaben- und Satzzeichenrauschen.
- Precision ohne Recall berichtet (oder umgekehrt).
- LLM-Judge-Ergebnisse als „Ground Truth“ exportiert.

## Wo dir das in der KI begegnet

Zheng et al. (2023, MT-Bench und Chatbot Arena) dokumentieren Verzerrungen von LLM-Judges, unter anderem Positionsbias und die Bevorzugung eigener Antworten. Genau deshalb gilt die Regel: deterministisch messen, wo immer es geht, und den Judge höchstens als Hinweis lesen, nie als Urteil.

## Direkter Check

In einer Einstiegsaufgabe berechnest du Precision/F1 aus ganzzahligen Konfusionsmatrizen. Die [Kernaufgabe: Fehlertaxonomie-Klassifikator](#/family/classify-rule-cascade-priority/error-taxonomy-classify/0/core) implementiert den Klassifikator mit vorgegebenem Regelwerk plus Zitat-Precision; die [Vertiefungsaufgabe: Konfusionsmetriken aus Zeilen](#/family/aggregate-confusion-metric/confusion-from-rows/0/stretch) wandelt Zeilenlisten in Konfusionsmatrizen und Metriken; die [Herausforderung](#/family/aggregate-detector-eval-compare/run-eval-compare-rulesets/0/challenge) evaluiert 20 Fixtur-Antworten unter zwei Regelwerken und vergleicht sie.

## Begriffe auf einen Blick

- **Fragenkatalog**: die eingefrorene Menge von Evaluationsfragen; definiert das Testset.
- **Gold-Antwort**: die kuratierte Soll-Antwort einer Eval-Frage, mit den entscheidenden Zahlen.
- **Quellenbeleg**: Liste der Quellen, die als Beleg einer Antwort zählen.
- **Fehlertaxonomie**: geschlossenes Set von Fehlerlabels, vergeben durch ein Regelwerk in fester Reihenfolge.
- **Exact Match**: Anteil der Antworten, die nach Normalisierung exakt der Gold-Antwort entsprechen.
- **LLM-Judge**: Sprachmodell als Bewerter; nützlich als Hinweis, nie als Ground Truth.
- **Retrieval-Fehler**: der Fall, bei dem das relevante Dokument nicht in den top-$k$ lag; sagt nichts über den Generator.
- **Antwortfehler**: Fehler der formulierten Antwort bei getroffenem Retrieval.

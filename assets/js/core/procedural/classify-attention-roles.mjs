// Procedural family classify-attention-roles: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that probe the Q/K/V role separation:
//   - attention-role-values (intro): V carries the content that softmax
//     weights mix; scores and weights come only from Q and K.
//   - attention-role-batch (core): shape bookkeeping for (B,T,d) with
//     d_k != d_v — V decides the output feature width.
//   - attention-role-padding (stretch): a padding mask removes illegal
//     scores; V still supplies the content of the visible keys.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

export const ATTENTION_ROLES_CAPSULES = {
  intro: {
    caseId: 'attention-role-values',
    competencyIds: ['c-dl-attention'],
    bank: [
      {
        key: 'base',
        prompt: 'Im Attention-Schritt einer Transformer-Schicht: Was beschreibt die Rolle der Value-Matrix $V$?',
        correct: '$V$ liefert die Inhalte, die gemischt werden: Die Softmax-Gewichte aus $Q$ und $K$ bestimmen, wie stark jede Zeile von $V$ in die Ausgabe eingeht.',
        wrong: [
          '$V$ skaliert die Scores: Jede Zeile von $V$ dividiert die Skalarprodukte durch ihre Länge.',
          '$V$ legt fest, welche Positionen einander sehen dürfen — das ist die Maske.',
          '$V$ speichert die Anfragen: Jede Zeile von $V$ fragt die anderen Positionen ab.',
        ],
        solution: 'Rollen: $Q$ = Anfragen, $K$ = Angebote zum Vergleich, $V$ = Inhalte. Scores und Softmax-Gewichte kommen nur aus $Q$ und $K$; die Ausgabe ist die gewichtete Summe der $V$-Zeilen. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
      },
      {
        key: 'rolle-query',
        prompt: 'Im selben Attention-Schritt: Welche Rolle übernimmt die Query-Matrix $Q$?',
        correct: '$Q$ trägt die Anfragen: Jede Zeile von $Q$ beschreibt, wonach die Position sucht, und wird mit allen Keys verglichen.',
        wrong: [
          '$Q$ liefert die Inhalte, die am Ende gewichtet gemischt werden.',
          '$Q$ legt fest, welche Positionen einander sehen dürfen.',
          '$Q$ skaliert die Skalarprodukte mit $1/\\sqrt{d_k}$.',
        ],
        solution: 'Die drei Rollen sind fest vergeben: $Q$ fragt, $K$ bietet sich zum Vergleich an, $V$ liefert den Inhalt. Wer $Q$ mit $V$ verwechselt, vertauscht Frage und Antwort im selben Mechanismus.',
      },
      {
        key: 'rolle-key',
        prompt: 'Was ist die Aufgabe der Key-Matrix $K$ in der Self-Attention?',
        correct: '$K$ bietet die Vergleichsanker: Das Skalarprodukt einer Query mit jeder Key-Zeile ergibt den Rohescore pro Position.',
        wrong: [
          '$K$ speichert die Wertinhalte, aus denen die Ausgabe gemischt wird.',
          '$K$ erzeugt die Padding-Maske für die Sichtbarkeit.',
          '$K$ normiert die Scores auf Summe eins.',
        ],
        solution: 'Scores entstehen als $QK^\\top$: Jede Key-Zeile ist ein Angebot, gegen das die Anfrage gemessen wird. Inhalte und Normierung kommen aus anderen Schritten — $V$ beziehungsweise Softmax.',
      },
      {
        key: 'scores-aus-qk',
        prompt: 'Woraus entstehen die rohen Aufmerksamkeitsscores, bevor der Softmax läuft?',
        correct: 'Aus den Skalarprodukten $QK^\\top$, skaliert mit $1/\\sqrt{d_k}$ — $V$ ist daran nicht beteiligt.',
        wrong: [
          'Aus dem Produkt $VV^\\top$ der Inhaltszeilen untereinander.',
          'Aus dem Softmax über die Zeilen von $V$.',
          'Aus der Maske, die die Score-Werte direkt erzeugt.',
        ],
        solution: 'Der Score-Tensor misst nur die Passung zwischen Anfragen und Angeboten — $Q$ mal $K$. Die Inhalte $V$ kommen erst nach dem Softmax ins Spiel, wenn die Gewichte feststehen.',
      },
      {
        key: 'gewichte-nur-qk',
        prompt: 'Welche Matrizen bestimmen die Softmax-Gewichte, mit denen die Ausgabe gemischt wird?',
        correct: 'Nur $Q$ und $K$: Ihre skalierten Skalarprodukte laufen durch den Softmax und liefern die Gewichte.',
        wrong: [
          'Nur $V$: Die Inhalte gewichten sich gegenseitig.',
          'Alle drei gleichberechtigt: $Q$, $K$ und $V$ teilen sich die Gewichte.',
          'Die Gewichte kommen aus der Maske, nicht aus den Matrizen.',
        ],
        solution: 'Die Gewichte sind eine reine $Q$-$K$-Angelegenheit: $QK^\\top/\\sqrt{d_k}$ plus eventueller Maske, dann Softmax. $V$ wird von diesen Gewichten nur gemischt — es erzeugt sie nicht.',
      },
      {
        key: 'ausgabe-gewichtete-summe',
        prompt: 'Wie entsteht eine Zeile der Attention-Ausgabe, nachdem die Softmax-Gewichte vorliegen?',
        correct: 'Als gewichtete Summe aller $V$-Zeilen: Jede Zeile von $V$ geht mit ihrem Softmax-Gewicht in die Mischung ein.',
        wrong: [
          'Als gewichtete Summe der $Q$-Zeilen — die Anfragen werden gemischt.',
          'Als die $V$-Zeile mit dem höchsten Score — das Maximum gewinnt allein.',
          'Als ungewichteter Mittelwert aller $V$-Zeilen.',
        ],
        solution: 'Nach dem Softmax steht eine Wahrscheinlichkeit pro Key-Position. Die Ausgabe ist genau diese Konvexkombination der Value-Zeilen — ein weiches Nachschlagen, kein hartes Maximum und kein Mittel ohne Gewichte.',
      },
      {
        key: 'maske-nicht-v',
        prompt: 'Eine Causal-Maske soll verhindern, dass Position 5 die Position 9 sieht. An welcher Stelle greift sie?',
        correct: 'Sie setzt den Score dieser Paarung vor dem Softmax auf $-\\infty$ — $V$ bleibt unverändert.',
        wrong: [
          'Sie löscht die Zeile 9 aus der Matrix $V$.',
          'Sie setzt die Zeile 5 von $V$ auf den Nullvektor.',
          'Sie skaliert die betroffene $V$-Zeile mit $1/\\sqrt{d_k}$.',
        ],
        solution: 'Sichtbarkeit ist eine Score-Regel: Die Maske wirkt auf $QK^\\top$, bevor der Softmax Gewichte baut. $V$ wird nicht angefasst — ausgeblendete Positionen verschwinden, weil ihr Gewicht null wird, nicht weil ihr Inhalt gelöscht wäre.',
      },
      {
        key: 'skalierung-grund',
        prompt: 'Warum werden die Skalarprodukte mit $1/\\sqrt{d_k}$ skaliert?',
        correct: 'Damit die Scores bei wachsender Key-Dimension nicht explodieren — der Softmax bliebe sonst in Sättigungsbereichen mit winzigen Gradienten.',
        wrong: [
          'Damit die Zeilen von $V$ auf Länge eins normiert werden.',
          'Damit die Sequenzlänge $T$ ausgeglichen wird.',
          'Damit die Softmax-Gewichte exakt gleichverteilt werden.',
        ],
        solution: 'Ein Skalarprodukt wächst im Erwartungswert mit $d_k$; die Division durch $\\sqrt{d_k}$ hält die Varianz stabil. Es ist eine Skalierung der Scores — nicht der Values, nicht der Sequenz und keine Gleichverteilung.',
      },
      {
        key: 'self-attention-quelle',
        prompt: 'Woher stammen $Q$, $K$ und $V$ bei Self-Attention?',
        correct: 'Alle drei entstehen aus derselben Eingabesequenz über drei verschiedene lernbare Projektionen $W_Q$, $W_K$ und $W_V$.',
        wrong: [
          '$Q$ und $K$ kommen aus der Eingabe, $V$ wird zufällig initialisiert.',
          'Alle drei kommen aus drei verschiedenen Eingabesequenzen.',
          '$V$ stammt aus der Eingabe, $Q$ und $K$ aus den Gradienten.',
        ],
        solution: 'Self-Attention heißt: eine Sequenz befragt sich selbst. Dieselben Token-Embeddings laufen durch drei getrennte Gewichtsmatrizen und erzeugen Anfragen, Angebote und Inhalte derselben Positionen.',
      },
      {
        key: 'lernbare-projektionen',
        prompt: 'Welche Größen im Attention-Schritt sind lernbare Parameter?',
        correct: 'Die Projektionsmatrizen $W_Q$, $W_K$ und $W_V$ — Scores, Masken und Softmax-Gewichte werden pro Eingabe berechnet, nicht gelernt.',
        wrong: [
          'Die Scorematrix $QK^\\top$ ist der gelernte Parameter.',
          'Die Maske wird durch Gradientenabstieg gelernt.',
          'Die Softmax-Gewichte sind die trainierbaren Gewichte der Schicht.',
        ],
        solution: 'Gelernt werden die linearen Abbildungen, die $Q$, $K$ und $V$ erzeugen. Alles danach — Scores, Maske, Softmax, gewichtete Summe — ist ein fester Rechenweg pro Eingabe.',
      },
      {
        key: 'softmax-achse',
        prompt: 'Über welche Achse normalisiert der Softmax die skalierten Scores?',
        correct: 'Pro Query-Zeile über die Key-Positionen — jede Zeile der Gewichtematrix summiert sich auf eins.',
        wrong: [
          'Über die Feature-Achse von $V$ — die $d_v$ Kanäle werden normalisiert.',
          'Über die Batch-Achse — die Beispiele teilen sich die Gewichte.',
          'Über die Query-Positionen — jede Spalte summiert sich auf eins.',
        ],
        solution: 'Der Softmax läuft zeilenweise über die Key-Achse: Für jede Anfrage entsteht eine Verteilung über alle Keys. Weder Features noch Batch-Beispiele werden gegeneinander normalisiert.',
      },
      {
        key: 'verwechslung-inhalt',
        prompt: 'Ein Kollege sagt: „Die Inhalte, die gemischt werden, stecken in $K$.“ Was stimmt daran nicht?',
        correct: 'Die Inhalte stecken in $V$ — $K$ liefert nur die Vergleichsanker für die Scores.',
        wrong: [
          'Daran stimmt alles — $K$ und $V$ sind zwei Namen für dieselbe Matrix.',
          'Falsch ist nur die Reihenfolge: Erst $V$, dann $K$ mischt die Inhalte.',
          'Falsch ist das Wort „mischen“ — Inhalte werden konkateniert, nicht gemischt.',
        ],
        solution: 'Key und Value sind getrennte Projektionen: $K$ steht im Score-Teil, $V$ im Misch-Teil. Beide entstehen aus derselben Position, tragen aber verschiedene Rollen — Angebot versus Inhalt.',
      },
      {
        key: 'eine-position-ausgabe',
        prompt: 'Die Ausgabe an Position $i$ der Self-Attention hängt ab von …',
        correct: '… allen $V$-Zeilen, gewichtet nach dem Vergleich der Query $i$ mit allen Keys.',
        wrong: [
          '… nur der $V$-Zeile an Position $i$ — jede Position liest nur sich selbst.',
          '… den $Q$-Zeilen aller anderen Positionen, unabhängig von $V$.',
          '… der besten Key-Position, deren $V$-Zeile eins zu eins kopiert wird.',
        ],
        solution: 'Position $i$ fragt mit ihrer Query alle Keys ab; die resultierenden Gewichte mischen alle Value-Zeilen. Genau das ist der Kontextfluss: Die Ausgabe ist eine Mischung, kein Selbstzugriff und keine Kopie des Siegers.',
      },
      {
        key: 'dimension-ausgabe',
        prompt: 'Welche Matrix bestimmt die Feature-Breite $d_v$ der Attention-Ausgabe?',
        correct: '$V$: Die Ausgabezeilen sind Mischungen der $V$-Zeilen und erben deren Breite.',
        wrong: [
          '$Q$: Die Anfragebreite legt die Ausgabedimension fest.',
          '$K$: Die Key-Dimension wird an die Ausgabe weitergegeben.',
          'Die Scorematrix: Ihre Breite $T$ wird zur Ausgabebreite.',
        ],
        solution: 'Die Ausgabe ist eine Konvexkombination der $V$-Zeilen — ihre letzte Achse ist genau die von $V$. $d_k$ beeinflusst nur die Scores, $T$ nur die Anzahl der Gewichte.',
      },
    ],
  },
  core: {
    caseId: 'attention-role-batch',
    competencyIds: ['c-dl-attention'],
    bank: [
      {
        key: 'base',
        prompt: 'Eine Batch-Attention erhält $X$ mit Shape $(B,T,d)=(2,4,12)$ und projiziert auf $d_k=3$ sowie $d_v=5$. Welche Aussage über die Value-Rolle stimmt?',
        correct: '$V$ liefert pro Position einen 5-dimensionalen Inhalt, den die $4\\times4$-Gewichte mischen.',
        wrong: [
          '$V$ erzeugt die $4\\times4$-Sichtbarkeitsmatrix.',
          '$V$ bestimmt allein die Skalierung durch $1/\\sqrt{3}$.',
          '$V$ enthält die Queries mit Shape $(2,4,3)$.',
        ],
        solution: '$QK^\\top$ liefert pro Batch eine $4\\times4$-Scorematrix; die Softmax-Gewichte mischen anschließend die vier Value-Zeilen. Bei $V$ mit Shape $(2,4,5)$ entsteht eine Ausgabe mit Shape $(2,4,5)$.',
      },
      {
        key: 'shape-k',
        prompt: 'Welche Shape hat die Key-Projektion $K$ bei $(B,T,d)=(2,4,12)$ und $d_k=3$?',
        correct: '$(2,4,3)$ — pro Batch vier Keys mit je drei Kanälen.',
        wrong: [
          '$(2,4,5)$ — die Keys erben die Value-Breite.',
          '$(2,4,12)$ — die Projektion ändert die Feature-Achse nicht.',
          '$(4,4)$ — $K$ ist eine quadratische Positionsmatrix.',
        ],
        solution: '$K=XW_K$ bildet die letzte Achse von $d=12$ auf $d_k=3$ ab; Batch- und Sequenzachse bleiben erhalten. Die Value-Breite $d_v$ spielt für $K$ keine Rolle.',
      },
      {
        key: 'shape-scores',
        prompt: 'Welche Shape hat die Scorematrix $QK^\\top$ im selben Beispiel $(2,4,12)$, $d_k=3$?',
        correct: '$(2,4,4)$ — pro Batch eine quadratische $T\\times T$-Matrix über den Positionen.',
        wrong: [
          '$(2,4,5)$ — die Scores erben die Value-Breite.',
          '$(2,3,3)$ — die Score-Achsen folgen $d_k$.',
          '$(2,4,12)$ — die Scores behalten die Eingabebreite.',
        ],
        solution: 'Die Score-Achsen sind Query- und Key-Position, nicht Feature-Kanäle: $T\\times T=4\\times4$ pro Batch. Weder $d_k=3$ noch $d_v=5$ oder $d=12$ treten als Score-Shape auf.',
      },
      {
        key: 'shape-ausgabe',
        prompt: 'Welche Shape hat die Attention-Ausgabe bei $V$ mit Shape $(2,4,5)$?',
        correct: '$(2,4,5)$ — die vier Ausgabezeilen mischen je fünf Value-Kanäle.',
        wrong: [
          '$(2,4,3)$ — die Ausgabe folgt der Query-Breite $d_k$.',
          '$(2,4,4)$ — die Ausgabe behält die Score-Breite.',
          '$(2,4,12)$ — die Ausgabe springt zurück auf die Eingabebreite.',
        ],
        solution: 'Die Ausgabe ist die gewichtete Summe der Value-Zeilen: Ihre Feature-Achse ist $d_v=5$, nicht $d_k$, nicht $T$ und nicht $d$. Erst eine Projektion danach könnte die Breite wieder ändern.',
      },
      {
        key: 'dk-ungleich-dv',
        prompt: 'Warum ist $d_k=3$ neben $d_v=5$ zulässig, obwohl beide aus demselben $X$ kommen?',
        correct: 'Weil nur $Q$ und $K$ dieselbe Breite brauchen — für ihr Skalarprodukt; die Value-Breite wählt die Ausgabedimension unabhängig davon.',
        wrong: [
          'Es ist ein Konfigurationsfehler — $d_k$ und $d_v$ müssen stets gleich sein.',
          'Weil die Maske die Differenz ausgleicht.',
          'Weil $d_v$ immer größer als $d_k$ sein muss.',
        ],
        solution: 'Das Skalarprodukt $q\\cdot k$ verlangt $d_k$ auf beiden Seiten — sonst nichts. $V$ wird nie mit $Q$ oder $K$ multipliziert, sondern nur gewichtet; seine Breite $d_v$ ist frei wählbar.',
      },
      {
        key: 'score-achsen-bedeutung',
        prompt: 'Was steht auf den Achsen der $(2,4,4)$-Scorematrix?',
        correct: 'Batch, Query-Position, Key-Position: Eintrag $(b,i,j)$ misst, wie stark Position $i$ die Position $j$ anfragt.',
        wrong: [
          'Batch, Position, Feature: Die Scores sind ein Feature-Tensor.',
          'Query, Key, Value: Die drei Matrizen bilden die Achsen.',
          'Batch, Kopf, Position: Die zweite Achse zählt die Köpfe.',
        ],
        solution: 'Die Scorematrix ist ein Paarvergleich: pro Batch-Element fragt jede Query-Position jede Key-Position ab. Features stecken in den Skalarprodukten, nicht auf den Achsen.',
      },
      {
        key: 'anzahl-gewichte',
        prompt: 'Wie viele Softmax-Gewichte mischen die Value-Zeilen für eine Ausgabezeile bei $T=4$?',
        correct: 'Vier — ein Gewicht pro Key-Position der Sequenzlänge $T=4$.',
        wrong: [
          'Drei — eins pro Query-Kanal $d_k=3$.',
          'Fünf — eins pro Value-Kanal $d_v=5$.',
          'Zwei — eins pro Batch-Element.',
        ],
        solution: 'Die Gewichte laufen über die Key-Achse der Länge $T$: Vier Keys bedeuten vier Gewichte pro Query. Kanalzahlen ($d_k$, $d_v$) und die Batchgröße setzen keine Gewichte.',
      },
      {
        key: 'dv-wirkt-wo',
        prompt: 'An welcher Stelle wirkt sich $d_v=5$ im Rechenweg aus?',
        correct: 'Als letzte Achse von $V$ und damit als Feature-Breite der Ausgabe.',
        wrong: [
          'Als Breite der Scorematrix.',
          'Als Divisor in der Skalierung $1/\\sqrt{d_k}$.',
          'Als Zeilenzahl der Maske.',
        ],
        solution: '$d_v$ taucht genau zweimal auf: bei $V=XW_V$ und bei der Ausgabe, die $V$-Zeilen mischt. Die Skalierung nutzt $d_k$, die Maske folgt den Positionsachsen.',
      },
      {
        key: 'q-zeilen-sind-queries',
        prompt: 'Die Query-Matrix hat Shape $(2,4,3)$. Was bedeuten die vier Zeilen pro Batch?',
        correct: 'Vier Anfragen — jede Position der Sequenz formuliert eine eigene Query mit drei Kanälen.',
        wrong: [
          'Vier Value-Inhalte, die gemischt werden.',
          'Vier Attention-Heads, die parallel laufen.',
          'Vier unabhängige Batch-Elemente.',
        ],
        solution: 'Die Zeilenachse von $Q$ ist die Sequenzachse: $T=4$ Positionen stellen je eine Anfrage. Heads wären eine eigene Achse, Inhalte stecken in $V$, und die Batch-Achse steht vorn.',
      },
      {
        key: 'quadratisch-t',
        prompt: 'Warum ist die Scorematrix quadratisch in der Sequenzlänge $T$?',
        correct: 'Weil jede der $T$ Query-Positionen jede der $T$ Key-Positionen vergleicht — $T$ mal $T$ Paarungen.',
        wrong: [
          'Weil die Feature-Dimension $d$ quadratisch eingeht.',
          'Weil der Batch zweimal multipliziert wird.',
          'Weil der Softmax quadratische Matrizen verlangt.',
        ],
        solution: 'Self-Attention vergleicht alle Positionen paarweise innerhalb derselben Sequenz. Die Quadratur kommt aus den zwei Positionsachsen — Query und Key —, nicht aus Features oder Batch.',
      },
      {
        key: 'batch-unabhaengig',
        prompt: 'Mischen sich die Softmax-Gewichte bei Batchgröße 2 über die Batch-Elemente hinweg?',
        correct: 'Nein — die Attention läuft pro Batch-Element unabhängig; die Gewichte von Sequenz 1 sehen nur deren vier Keys.',
        wrong: [
          'Ja — die Batch-Achse wird im Softmax mitnormalisiert.',
          'Ja, aber nur wenn beide Sequenzen gleich lang sind.',
          'Nur die Value-Zeilen werden über den Batch gemischt.',
        ],
        solution: 'Die Scorematrix $(2,4,4)$ enthält pro Batch-Element eine eigene $4\\times4$-Matrix. Die Batch-Achse ist organisatorisch — kein Informationsfluss läuft zwischen den Elementen.',
      },
      {
        key: 'w_v-projektion',
        prompt: 'Welche Projektion erzeugt aus $X$ mit zwölf Kanälen die fünf Kanäle der Values?',
        correct: '$W_V$ — sie bildet die letzte Achse von $d=12$ auf $d_v=5$ ab.',
        wrong: [
          '$W_Q$ — die Query-Projektion legt auch die Value-Breite fest.',
          '$W_K$ — die Key-Projektion erzeugt zusätzlich die Inhalte.',
          'Der Softmax — er komprimiert die Kanäle.',
        ],
        solution: 'Jede Rolle hat ihre eigene Gewichtsmatrix: $W_V$ mappt $d\\to d_v$. Query- und Key-Projektionen erzeugen nur Scores, der Softmax nur Gewichte — keiner von ihnen produziert die fünf Inhaltskanäle.',
      },
      {
        key: 'value-kanaele-nicht-keys',
        prompt: 'Eine Behauptung: „Die fünf Kanäle von $V$ sind die fünf Keys pro Position.“ Was stimmt nicht?',
        correct: 'Es gibt vier Keys (einen pro Position) mit je drei Kanälen — die fünf Kanäle von $V$ sind Inhaltsdimensionen, keine Positionen.',
        wrong: [
          'Es stimmt — $d_v$ zählt die Keys pro Position.',
          'Falsch ist nur die Zahl: Es sind drei Kanäle pro Key.',
          'Falsch ist das Wort „Keys“ — gemeint sind Queries.',
        ],
        solution: 'Zwei Achsen werden oft verwechselt: Die Positionsachse ($T=4$) zählt, wie viele Keys existieren; die Feature-Achse ($d_v=5$) zählt, was ein Value trägt. Kanalzahl ist keine Positionszahl.',
      },
    ],
  },
  stretch: {
    caseId: 'attention-role-padding',
    competencyIds: ['c-dl-attention'],
    bank: [
      {
        key: 'base',
        prompt: 'Für zwei Sequenzen mit Längen $3$ und $5$ wird eine Padding-Maske vor dem Softmax angewendet. Welche Rolle bleibt der Value-Matrix $V$ trotz der ausgeblendeten Padding-Positionen?',
        correct: '$V$ liefert die Inhalte der sichtbaren Keys; die Maske entfernt nur unzulässige Gewichte.',
        wrong: [
          '$V$ wird für die kürzere Sequenz vollständig durch Null ersetzt.',
          '$V$ entscheidet, ob Position 4 überhaupt sichtbar ist.',
          '$V$ legt die Zeilenanzahl der Padding-Maske fest.',
        ],
        solution: 'Die Maske setzt die Scores der Padding-Keys auf unzulässig; danach gewichten die verbleibenden Softmax-Werte die entsprechenden Zeilen von $V$. $V$ definiert also weiterhin die Inhalte, nicht die Sichtbarkeitsregel.',
      },
      {
        key: 'maskierung-score',
        prompt: 'Was genau setzt die Padding-Maske bei der Sequenz der Länge 3 auf unzulässig?',
        correct: 'Die Scores der Key-Positionen 4 und 5 — vor dem Softmax, damit ihr Gewicht null wird.',
        wrong: [
          'Die Value-Zeilen 4 und 5 — sie werden auf den Nullvektor gesetzt.',
          'Die Query-Zeilen 4 und 5 — die Positionen hören auf zu fragen.',
          'Die Ausgabezeilen 4 und 5 — sie werden nach dem Mischen gelöscht.',
        ],
        solution: 'Die Maske greift auf der Key-Achse der Scorematrix: unzulässige Keys bekommen $-\\infty$ und damit Gewicht null. $V$ selbst bleibt unangetastet — es ist die Gewichtung, nicht der Inhalt, die verschwindet.',
      },
      {
        key: 'padding-gewicht',
        prompt: 'Welches Softmax-Gewicht bekommt eine gepaddete Key-Position nach der Maskierung?',
        correct: 'Exakt null — der maskierte Score fällt aus der Normalisierung heraus.',
        wrong: [
          'Einen kleinen Restwert nahe null, aber nicht exakt null.',
          'Den Durchschnitt $1/T$ aller Positionen.',
          'Eins — Padding wird voll gewichtet.',
        ],
        solution: '$-\\infty$ im Score ergibt nach dem Softmax exakt die Wahrscheinlichkeit null. Deshalb fließt der zugehörige Value-Inhalt garantiert nicht in die Ausgabe ein — die Maske ist eine harte Regel.',
      },
      {
        key: 'v-tensor-bleibt',
        prompt: 'Bleiben die Value-Zeilen der Padding-Positionen physisch im Tensor erhalten?',
        correct: 'Ja — $V$ behält seine volle Shape; nur die Gewichte dieser Zeilen werden auf null gesetzt.',
        wrong: [
          'Nein — die Zeilen werden aus $V$ herausgeschnitten.',
          'Nein — sie werden auf den Nullvektor überschrieben.',
          'Ja, aber sie werden zusätzlich mit $1/\\sqrt{d_k}$ skaliert.',
        ],
        solution: 'Die Maske wirkt auf Scores, nicht auf den $V$-Tensor. Die Padding-Zeilen existieren weiter, gehen aber mit Gewicht null in die Mischung ein — Inhalt vorhanden, Einfluss null.',
      },
      {
        key: 'sichtbare-keys-l3',
        prompt: 'Wie viele Key-Positionen darf eine Query der Sequenz mit Länge 3 sehen?',
        correct: 'Drei — genau die echten Positionen; die zwei Padding-Keys sind maskiert.',
        wrong: [
          'Fünf — die Maske erlaubt alle Positionen der Batch-Länge.',
          'Zwei — nur die Padding-Positionen werden gezählt.',
          'Keine — Padding sperrt die ganze Sequenz.',
        ],
        solution: 'Die Maske spiegelt die Datenlänge: Bei Länge 3 sind die Keys 1–3 erlaubt, 4–5 unzulässig. Die Sichtbarkeit folgt den echten Token, nicht der aufgefüllten Länge.',
      },
      {
        key: 'maske-pro-batch',
        prompt: 'Warum unterscheiden sich die Masken der beiden Sequenzen im Batch?',
        correct: 'Weil die erlaubten Key-Mengen den Sequenzlängen folgen — Länge 3 maskiert zwei Positionen, Länge 5 keine.',
        wrong: [
          'Weil jede Sequenz eine zufällige Maske zieht.',
          'Weil die Value-Matrix pro Sequenz eine andere Breite hat.',
          'Weil der Softmax pro Batch neu normiert wird.',
        ],
        solution: 'Die Padding-Maske ist eine Funktion der Daten: Jede Sequenz trägt ihre eigene Länge, also ihre eigene Menge gültiger Keys. Gleiche Positionslogik, verschiedene Masken pro Batch-Element.',
      },
      {
        key: 'ohne-maske-folge',
        prompt: 'Was passiert, wenn die Padding-Maske vergessen wird?',
        correct: 'Die Padding-Keys bekommen Softmax-Masse — die Ausgabe mischt Inhalte ein, die gar nicht zur Sequenz gehören.',
        wrong: [
          'Nichts — Padding-Zeilen von $V$ sind ohnehin Null.',
          'Der Softmax scheitert an einer NaN-Warnung.',
          'Die Ausgabe wird exakt dieselbe wie mit Maske.',
        ],
        solution: 'Ohne Maske sind die Padding-Keys normale Kandidaten im Score-Vergleich. Ihr $V$-Inhalt fließt mit positivem Gewicht ein — die Ausgabe wird von Füllpositionen verunreinigt.',
      },
      {
        key: 'v-null-statt-maske',
        prompt: 'Würde es reichen, die Value-Zeilen der Padding-Positionen auf Null zu setzen, statt die Scores zu maskieren?',
        correct: 'Nein — die Positionen erhielten trotzdem Softmax-Gewicht; die Mischung würde Richtung Nullvektor verwässert statt ausgeschlossen.',
        wrong: [
          'Ja — Nullzeilen ändern nichts an der Ausgabe.',
          'Ja — die Maske ist nur eine Optimierung dieser Idee.',
          'Nein — weil $V$ danach die falsche Shape hätte.',
        ],
        solution: 'Ein Nullvektor mit Gewicht 0,3 drückt die Mischung Richtung null — das ist ein Beitrag, kein Ausschluss. Nur die Maskierung der Scores entzieht der Position jede Gewichtsmasse.',
      },
      {
        key: 'maske-vor-softmax',
        prompt: 'In welcher Reihenfolge greifen Maske, Softmax und Value-Mischung?',
        correct: 'Erst Scores maskieren, dann Softmax, dann die $V$-Zeilen mit den Gewichten mischen.',
        wrong: [
          'Erst $V$ maskieren, dann die Scores bilden, dann mischen.',
          'Erst Softmax, dann maskieren, dann nochmals normalisieren.',
          'Erst $V$ mischen, dann die Maske auf die Ausgabe anwenden.',
        ],
        solution: 'Die Maske braucht den Rohescore: Sie setzt unzulässige Paarungen auf $-\\infty$, bevor der Softmax normiert. Danach erst fließen die Gewichte in die Value-Mischung — die Ordnung ist der Mechanismus.',
      },
      {
        key: 'padding-vs-causal',
        prompt: 'Wie unterscheiden sich Padding- und Causal-Maske?',
        correct: 'Padding folgt den Datenlängen pro Sequenz, Causal folgt der Position im Verlauf — beide wirken auf Scores, nicht auf $V$.',
        wrong: [
          'Beide sind identisch — nur andere Namen für dieselbe Maske.',
          'Padding wirkt auf $V$, Causal wirkt auf die Scores.',
          'Causal folgt den Längen, Padding folgt der Position.',
        ],
        solution: 'Zwei Gründe, ein Mechanismus: Padding schließt unechte Token aus, Causal schließt die Zukunft aus. Beide setzen Score-Einträge auf unzulässig — die Value-Matrix bleibt bei beiden unangetastet.',
      },
      {
        key: 'wer-legt-maske-fest',
        prompt: 'Welche Größe bestimmt die Form der Padding-Maske?',
        correct: 'Die Sequenzlängen der Daten — sie legen fest, welche Key-Positionen pro Batch-Element gültig sind.',
        wrong: [
          'Die Value-Matrix $V$ — ihre Zeilenzahl definiert die Maske.',
          'Die Feature-Dimension $d_v$ der Values.',
          'Die Projektion $W_V$ — sie erzeugt die Maske mit.',
        ],
        solution: 'Die Maske wird aus den Längen abgeleitet, nicht aus den Matrizen: Die maximale Länge gibt die Key-Achse, die echten Längen geben die gültigen Einträge. $V$ trägt Inhalte und hat mit der Sichtbarkeitsregel nichts zu tun.',
      },
      {
        key: 'ausgabe-padding-position',
        prompt: 'Was liefert die Attention an einer gepaddeten Query-Position, etwa Position 4 bei Länge 3?',
        correct: 'Formal eine Mischung der sichtbaren Values — die Position existiert im Tensor, wird aber downstream ignoriert.',
        wrong: [
          'Nichts — die Ausgabezeile wird nicht berechnet.',
          'Das Ergebnis der Padding-Keys — die Maske gilt auch für Queries.',
          'Eine Fehlermeldung des Frameworks.',
        ],
        solution: 'Die Maske wirkt auf der Key-Achse, nicht auf der Query-Achse: Auch die Füllposition fragt ab und mischt die sichtbaren Values. Der Batch-Vertrag ignoriert diese Ausgabe später — berechnet wird sie trotzdem.',
      },
      {
        key: 'v-rolle-unveraendert',
        prompt: 'Nach dem Maskieren: Welche Aussage über $V$ bleibt bei Länge 3 wahr?',
        correct: 'Die echten drei $V$-Zeilen bleiben die einzigen Inhalte, die in die Ausgabe einfließen können.',
        wrong: [
          'Alle fünf $V$-Zeilen fließen zu gleichen Teilen ein.',
          'Die Padding-Zeilen von $V$ übernehmen die Maskenrolle.',
          '$V$ wird auf die Länge 3 zugeschnitten.',
        ],
        solution: 'Die Maskenlogik verändert die Gewichte, nicht die Matrix: Von den fünf Zeilen können nur die drei sichtbaren Gewicht erhalten. $V$ wird weder geschnitten noch umgewidmet — es liefert weiterhin Inhalt.',
      },
    ],
  },
};

export const ATTENTION_ROLES_CONTRACT = {
  familyId: 'classify-attention-roles',
  familyGroup: 'classify-concept',
  summary: 'Ordnet Tensorrollen den Aufmerksamkeitsrollen zu.',
  taskArchetype: 'single-choice',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'attention-role-values', propertyTest: false },
    { caseId: 'attention-role-batch', propertyTest: false },
    { caseId: 'attention-role-padding', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-attention'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: ATTENTION_ROLES_CONTRACT,
  capsules: ATTENTION_ROLES_CAPSULES,
  shapeError: 'Attention-Rollen-Parameter verletzen die Kapselform',
});

export const attentionRolesCapsuleOk = FAMILY_IMPL.capsuleOk;
export const attentionRolesCorrectText = FAMILY_IMPL.correctText;
export const genAttentionRolesCapsule = FAMILY_IMPL.genCapsule;
export const generateAttentionRolesFamily = FAMILY_IMPL.generate;
export const solveAttentionRolesFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

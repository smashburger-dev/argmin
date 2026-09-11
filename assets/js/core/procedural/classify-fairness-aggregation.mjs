// Procedural family classify-fairness-aggregation: the seed draws a scenario
// from the curated bank and rotates the answer position via
// buildRotatedChoices. Each case keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios: overall-accuracy-hides-subgroups drills the
// weighted-average effect with small numeric examples, fairness-aggregation
// probes why per-group FPR reporting is mandatory. parameters carry only the
// scenario key, so nothing answer-relevant leaks into instance.parameters.
// Mirrors genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

export const FAIRNESS_AGG_CAPSULES = {
  'overall-accuracy-hides-subgroups': {
    difficulty: 'intro',
    bank: [
      {
        key: 'base',
        prompt: 'Ein Defekt-Klassifikator erreicht 94 % Accuracy insgesamt. Warum reicht diese einzelne Gesamtmetrik für die Fehleranalyse nicht aus?',
        correct: 'Eine hohe Gesamtmetrik kann große Fehler in kleinen Teilgruppen verbergen — die Metrik muss je Teilgruppe berichtet werden.',
        wrong: [
          'Gesamtmetriken sind Zufallswerte und ohne wiederholte Messung bedeutungslos.',
          'Teilgruppenmetriken sind per Definition immer höher als die Gesamtmetrik — ein Vergleich lohnt sich nicht.',
          'Teilgruppen dürfen aus Datenschutzgründen nie ausgewertet werden.',
        ],
        solution: 'Ein gewichteter Durchschnitt lässt eine kleine Gruppe fast verschwinden: 94 % insgesamt können bedeuten, dass eine kleine Teilgruppe zu 60 % falsch eingestuft wird. Deshalb werden Metriken je Teilgruppe berichtet und die größte Lücke explizit benannt.',
      },
      {
        key: 'fuenf-und-neunzig',
        prompt: 'Von 100 Prüffällen stammen 95 aus Gruppe A (alle richtig) und 5 aus Gruppe B (4 davon falsch). Die Gesamt-Accuracy beträgt 96 %. Was zeigt das Beispiel?',
        correct: 'Dass 96 % insgesamt mit einer 80-%-Fehlerrate in Gruppe B vereinbar sind — der gewichtete Durchschnitt versteckt die kleine Gruppe.',
        wrong: [
          'Dass Gruppe B zu klein ist, um ausgewertet zu werden.',
          'Dass die Gesamtmetrik falsch gerechnet wurde.',
          'Dass Gruppe A die Fehler von Gruppe B verursacht.',
        ],
        solution: '95 richtige A-Fälle plus 1 richtiger B-Fall ergeben 96 % — während Gruppe B eine 80-%-Fehlerrate trägt. Der Gesamtwert ist korrekt gerechnet und trotzdem irreführend: Genau dafür gibt es den Teilgruppenausweis.',
      },
      {
        key: 'berichtsform',
        prompt: 'Wie sieht eine ehrliche Berichtsform für ein Modell mit mehreren Teilgruppen aus?',
        correct: 'Gesamtmetrik plus Metrik je Teilgruppe, mit explizit benannter größter Lücke.',
        wrong: [
          'Nur die Gesamtmetrik, damit der Bericht lesbar bleibt.',
          'Nur die beste Teilgruppe als Referenzwert.',
          'Nur der Mittelwert der Teilgruppen ohne Gesamtwert.',
        ],
        solution: 'Ehrlich berichtet, wer beides zeigt: den Gesamtwert für die Gesamtlage und die Teilgruppenwerte für die Verteilung der Fehler. Die größte Lücke wird benannt, nicht gemittelt — sie ist das eigentliche Analyseergebnis.',
      },
      {
        key: 'marketing-98',
        prompt: 'Ein Anbieter wirbt mit „98 % Accuracy“ für seinen Klassifikator. Welche Rückfrage ist für die Fehleranalyse Pflicht?',
        correct: 'Wie verteilen sich die Fehler auf die Teilgruppen — und wie groß ist die größte Lücke zum Gesamtwert?',
        wrong: [
          'Ob die 98 % auf zwei Nachkommastellen gerundet sind.',
          'Ob die Testdaten urheberrechtlich geschützt sind.',
          'Ob das Modell in Zukunft auch 99 % erreichen könnte.',
        ],
        solution: '98 % sagen nichts darüber, wessen Fälle in den 2 % Fehlern stecken. Die Pflichtfrage zielt auf die Verteilung: Teilgruppenraten und größte Lücke entscheiden, ob die Zahl vertrauenswürdig ist.',
      },
      {
        key: 'audit-luecke',
        prompt: 'Ein Audit findet: Gesamt-Accuracy 0{,}93, aber Gruppe X liegt 30 Punkte darunter. Was ist die Mindestmaßnahme?',
        correct: 'Die Teilgruppenmetriken getrennt berichten und die Lücke benennen — die Gesamtzahl allein kaschiert den Befund.',
        wrong: [
          'Die Gesamtmetrik streichen, weil sie falsch ist.',
          'Gruppe X aus der Auswertung entfernen, damit der Bericht stimmt.',
          'Die Metrik über alle Gruppen mitteln und den Befund nicht melden.',
        ],
        solution: 'Der Befund ist real und gehört in den Bericht: getrennter Ausweis je Gruppe, größte Lücke explizit. Die Gesamtmetrik bleibt ein gültiger Wert — sie darf nur nicht allein stehen.',
      },
      {
        key: 'gewichteter-schnitt',
        prompt: 'Warum lässt ein gewichteter Durchschnitt kleine Gruppen fast verschwinden?',
        correct: 'Weil der Beitrag einer Gruppe mit ihrem Anteil an der Gesamtmenge skaliert — 5 % der Fälle können die Summe kaum bewegen.',
        wrong: [
          'Weil Durchschnitte die kleinste Gruppe automatisch streichen.',
          'Weil kleine Gruppen statistisch nicht existieren.',
          'Weil Gewichte nur für große Gruppen definiert sind.',
        ],
        solution: 'Der Gesamtwert ist die Summe der Gruppenbeiträge, gewichtet mit dem Gruppenanteil: Bei 5 % Anteil kann selbst eine 100-%-Fehlerrate den Gesamtwert nur um 5 Punkte drücken. Der Effekt ist Arithmetik, keine Absicht — und genau deshalb gefährlich.',
      },
      {
        key: 'release-vergleich',
        prompt: 'Zwei Modellversionen erreichen beide 94 % Gesamt-Accuracy; Version 2 halbiert die Fehler in der kleinsten Gruppe. Was zeigt die Gesamtmetrik?',
        correct: 'Praktisch nichts — die Verbesserung in der kleinen Gruppe bewegt den Gesamtwert kaum; nur der Teilgruppenausweis macht sie sichtbar.',
        wrong: [
          'Einen klaren Sprung, weil halbierte Fehler sich immer durchsetzen.',
          'Eine Verschlechterung, weil sich etwas geändert hat.',
          'Dass beide Versionen in allen Gruppen identisch sind.',
        ],
        solution: 'Eine Verbesserung in einer 5-%-Gruppe bewegt den Gesamtwert bestenfalls um wenige Punkte. Wer nur die Gesamtzahl vergleicht, hält die Versionen für gleich — der Teilgruppenausweis zeigt den realen Fortschritt.',
      },
      {
        key: 'zusatzinfo',
        prompt: 'Welche Zusatzangabe macht die Aussage „94 % Accuracy“ für die Fehleranalyse aussagekräftig?',
        correct: 'Die Metriken je Teilgruppe samt größter Lücke zum Gesamtwert.',
        wrong: [
          'Die Anzahl der Codezeilen des Modells.',
          'Der Name des Trainingsframeworks.',
          'Die durchschnittliche Antwortzeit des Modells.',
        ],
        solution: 'Aussagekräftig wird eine Gesamtzahl erst durch ihre Verteilung: Welche Gruppe trägt wie viele Fehler, wie groß ist die größte Lücke? Implementierungsdetails und Latenz sind irrelevant für diese Frage.',
      },
      {
        key: 'befund-nicht-ursache',
        prompt: 'Gruppe B hat eine 40-%-Fehlerrate bei 96 % Gesamt-Accuracy. Was folgt daraus zunächst?',
        correct: 'Ein Befund, keine Ursache: Die Lücke ist messbar — warum sie entsteht, ist eine eigene Untersuchung.',
        wrong: [
          'Dass Gruppe B schlechtere Daten liefert.',
          'Dass das Modell Gruppe B absichtlich benachteiligt.',
          'Dass die Gesamtmetrik neu gerechnet werden muss.',
        ],
        solution: 'Der Teilgruppenausweis liefert einen Messwert, keine Erklärung: Datenqualität, Schwellenwerte oder Gruppendefinition können die Lücke treiben. Den Befund zu benennen ist Pflicht — die Ursachenanalyse folgt danach.',
      },
      {
        key: 'genau-und-schlecht',
        prompt: 'Ein Klassifikator ist insgesamt sehr genau und in einer kleinen Gruppe sehr schlecht. Sind beide Aussagen vereinbar?',
        correct: 'Ja — Gesamtgenauigkeit und Teilgruppenschwäche schließen sich nicht aus; genau deshalb reicht eine einzelne Zahl nicht.',
        wrong: [
          'Nein — hohe Gesamtgenauigkeit beweist gleiche Güte überall.',
          'Nein — die Teilgruppe muss falsch gelabelt sein.',
          'Ja — aber nur, wenn die kleine Gruppe ignoriert wird.',
        ],
        solution: 'Der gewichtete Durchschnitt erlaubt genau diesen Zustand: fast perfekte Mehrheitsgruppe, schwache Minderheit, hohe Gesamtzahl. Die Aussagen sind nicht nur vereinbar — sie sind der Normalfall, den der Teilgruppenausweis sichtbar macht.',
      },
      {
        key: 'ergaenzen-statt-ersetzen',
        prompt: 'Sollte die Gesamt-Accuracy durch Teilgruppenmetriken ersetzt werden?',
        correct: 'Nein — ergänzt: Gesamtwert und Teilgruppenwerte zusammen sind die ehrliche Berichtsform.',
        wrong: [
          'Ja — die Gesamtmetrik ist immer falsch.',
          'Nein — Teilgruppenmetriken sind unzulässig.',
          'Ja — nur die schlechteste Teilgruppe zählt künftig.',
        ],
        solution: 'Der Gesamtwert ist ein legitimier Messwert für die Gesamtlage; das Problem ist seine verdeckende Wirkung, wenn er allein steht. Die ehrliche Form berichtet beide Ebenen und benennt die Lücke.',
      },
      {
        key: 'fuenf-prozent-rechnung',
        prompt: 'Eine Gruppe stellt 5 % der Testfälle und hat 60 % Fehlerrate; der Rest liegt bei 2 %. Wie hoch ist die Gesamt-Fehlerrate ungefähr?',
        correct: 'Etwa 5 % — 0{,}05 · 60 % plus 0{,}95 · 2 % ergibt 4{,}9 %; die kleine Gruppe trägt überproportional zu den Fehlern bei.',
        wrong: [
          'Etwa 31 % — der ungewichtete Mittelwert aus 60 % und 2 %.',
          'Etwa 62 % — die Fehlerraten addieren sich.',
          'Etwa 2 % — kleine Gruppen beeinflussen den Gesamtwert nicht.',
        ],
        solution: 'Gewichtet gerechnet: 0{,}05 · 60 % = 3 % plus 0{,}95 · 2 % = 1{,}9 %, zusammen 4{,}9 %. Die kleine Gruppe liefert 3 der 4{,}9 Prozentpunkte — über 60 % aller Fehler bei 5 % Anteil. Der Gesamtwert sieht harmlos aus, die Verteilung ist es nicht.',
      },
    ],
  },
  'fairness-aggregation': {
    difficulty: 'intro',
    competencyIds: ['c-research-responsible'],
    bank: [
      {
        key: 'base',
        prompt: 'Ein Detektor erreicht über alle Fälle gemessen eine Genauigkeit von 0,9. Warum berichtet Responsible AI zusätzlich die False-Positive-Raten pro Gruppe?',
        correct: 'Weil eine gute Gesamtkennzahl große FPR-Unterschiede zwischen Gruppen verstecken kann — ungleiche Behandlung wird nur getrennt sichtbar.',
        wrong: [
          'Weil die Gesamtgenauigkeit falsch gerechnet ist und durch Subgruppenwerte ersetzt werden muss.',
          'Weil es eine formale Anforderung ist, ohne dass sich an den Messwerten etwas ändert.',
          'Weil nur ein Sprachmodell die Fairness einer Gruppe verlässlich bewerten kann.',
        ],
        solution: 'Gesamtmetriken können Subgruppenungleichheit vollständig verstecken: Zwei Gruppen mit FPR 0,25 und 0,10 können zusammen eine gute Gesamtkennzahl liefern, während harmlose Fälle der einen Gruppe mehr als doppelt so oft fälschlich blockiert werden. Der getrennte Ausweis macht das messbar und deterministisch nachrechenbar. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
      },
      {
        key: 'fpr-definition',
        prompt: 'Was misst die False-Positive-Rate eines Sperr-Detektors pro Gruppe?',
        correct: 'Den Anteil harmloser Fälle der Gruppe, die fälschlich blockiert werden.',
        wrong: [
          'Den Anteil gefährlicher Fälle, die unbemerkt durchkommen.',
          'Den Anteil der Gruppe am gesamten Testkorpus.',
          'Die Gesamtgenauigkeit des Detektors nur in dieser Gruppe.',
        ],
        solution: 'FPR = falsch-positive harmlos-Fälle geteilt durch alle harmlosen Fälle der Gruppe: Wer zu Unrecht blockiert wird, taucht hier auf. Durchkommende Angriffe sind dagegen die falsch-Negative-Rate — ein anderes Fehlerbild.',
      },
      {
        key: 'fpr-luecke-beispiel',
        prompt: 'Ein Detektor hat FPR 0{,}25 für Gruppe A und 0{,}10 für Gruppe B bei 0{,}9 Gesamt-Accuracy. Was zeigt der getrennte Ausweis?',
        correct: 'Harmlose Fälle von Gruppe A werden mehr als doppelt so oft fälschlich blockiert — die Gesamtzahl allein verdeckt das.',
        wrong: [
          'Beide Gruppen werden gleich behandelt — die Werte runden sich.',
          'Gruppe A liefert mehr Angriffe und wird darum öfter blockiert.',
          'Die Gesamt-Accuracy wurde falsch berechnet.',
        ],
        solution: 'FPR misst nur harmlose Fälle — die Angriffsrate der Gruppe spielt dafür keine Rolle. 0{,}25 gegen 0{,}10 heißt: Unschuldige aus Gruppe A verlieren 2,5-mal so oft. Die gute Gesamtzahl versteckt genau diesen Unterschied.',
      },
      {
        key: 'fnr-vs-fpr',
        prompt: 'Ein Sperr-Detektor soll vor allem harmlose Nutzerinnen und Nutzer vor falschen Blöcken schützen. Welche Teilgruppenrate ist dafür entscheidend?',
        correct: 'Die FPR — sie misst, wie oft harmlose Fälle fälschlich blockiert werden.',
        wrong: [
          'Die FNR — sie misst entkommene Angriffe pro Gruppe.',
          'Die Accuracy — sie fasst alle Entscheidungen zusammen.',
          'Die Präzision — sie zählt die korrekten Treffer.',
        ],
        solution: 'Schaden für Harmlose entsteht über falsche Positive: geblockt, obwohl nichts vorlag. Die FNR misst das Gegenstück (durchgelassene Angriffe) — wichtig für Sicherheit, aber die falsche Rate für diese Schutzfrage.',
      },
      {
        key: 'zwei-detektoren',
        prompt: 'Zwei Detektoren erreichen beide 0{,}9 Gesamt-Accuracy. Detektor 1: FPR 0{,}12 und 0{,}11 je Gruppe. Detektor 2: FPR 0{,}30 und 0{,}02. Welcher behandelt die Gruppen fairer?',
        correct: 'Detektor 1 — bei gleicher Gesamtgüte blockiert er beide Gruppen fast gleich oft zu Unrecht.',
        wrong: [
          'Detektor 2 — sein bester Gruppenwert ist deutlich niedriger.',
          'Beide gleich — die Gesamt-Accuracy entscheidet allein.',
          'Keiner — die FPR sagt nichts über Fairness aus.',
        ],
        solution: 'Fairness fragt die Verteilung, nicht den Bestwert: Detektor 2 lässt eine Gruppe 15-mal so oft falsch blockieren wie die andere. Bei identischer Gesamt-Accuracy ist die kleinere Lücke der fairere Detektor.',
      },
      {
        key: 'schwellenwert-effekt',
        prompt: 'Ein strengerer Schwellenwert senkt die Gesamt-FPR von 0{,}15 auf 0{,}10. Was muss zusätzlich geprüft werden?',
        correct: 'Ob die Verbesserung in allen Gruppen ankommt — eine Schwelle kann die FPR einer Gruppe senken und die einer anderen erhöhen.',
        wrong: [
          'Nichts — eine niedrigere Gesamt-FPR ist immer fairer.',
          'Ob die Gesamt-Accuracy weiterhin über 0{,}9 liegt.',
          'Ob die Gruppen nach der Änderung gleich groß sind.',
        ],
        solution: 'Schwellenwerte wirken selten gleichmäßig: Der Gesamtwert kann fallen, während eine Gruppe verliert. Nur der getrennte Ausweis zeigt, ob die Änderung die Lücke verkleinert oder vergrößert hat.',
      },
      {
        key: 'deterministisch-nachrechenbar',
        prompt: 'Warum sind getrennte Gruppenraten der bessere Fairness-Nachweis als eine Bewertung der Gruppenfälle durch ein Sprachmodell?',
        correct: 'Weil sie deterministisch aus den Labels nachrechenbar sind — ein Sprachmodell-Bewerter wäre selbst fehleranfällig und nicht reproduzierbar.',
        wrong: [
          'Weil Sprachmodelle grundsätzlich unfair urteilen.',
          'Weil Gruppenraten ohne gelabelte Daten auskommen.',
          'Weil die Gesamtmetrik dann überflüssig wird.',
        ],
        solution: 'FPR je Gruppe ist eine Zählung über gelabelte Fälle — jeder kann sie aus denselben Daten reproduzieren. Ein Sprachmodell als Richter führte eine zweite Fehlerquelle ein: nicht deterministisch, nicht auditierbar, selbst potenziell verzerrt.',
      },
      {
        key: 'datenschutz-einwand',
        prompt: 'Einwand im Review: „Teilgruppen dürfen wir aus Datenschutzgründen nicht auswerten.“ Was entgegnet Responsible AI?',
        correct: 'Der Schutz begrenzt, welche Merkmale erhoben werden dürfen — der Ausweis je Gruppe ist gerade das Mittel, um Benachteiligung sichtbar zu machen.',
        wrong: [
          'Der Einwand ist korrekt — Fairness-Messung ist generell verboten.',
          'Stattdessen werden die Daten der kleinen Gruppe gelöscht.',
          'Datenschutz greift nur bei Gruppen unter zehn Fällen.',
        ],
        solution: 'Datenschutz regelt die Erhebung und Speicherung sensibler Merkmale — nicht das Schweigen über Ungleichbehandlung. Ohne Gruppenausweis bleibt Benachteiligung unsichtbar; die Messung ist das Instrument des Schutzes, nicht ihr Gegner.',
      },
      {
        key: 'report-mindestens',
        prompt: 'Was muss ein Fairness-Report für einen Sperr-Detektor mindestens zeigen?',
        correct: 'Die Fehlerraten (inklusive FPR) je Teilgruppe plus die größte beobachtete Lücke — neben der Gesamtkennzahl.',
        wrong: [
          'Nur die Gesamt-Accuracy über alle Fälle.',
          'Nur die beste und die schlechteste Einzelentscheidung als Beispiele.',
          'Nur die Anzahl der Gruppen im Testkorpus.',
        ],
        solution: 'Der Report braucht beide Ebenen: die Gesamtzahl für die Lage und die Gruppenraten für die Verteilung, mit explizit benannter Lücke. Beispiele und Gruppenzahlen allein sagen nichts über systematische Ungleichbehandlung aus.',
      },
      {
        key: 'ungleiche-last',
        prompt: 'Ein Filter blockiert insgesamt selten falsch, aber harmlose Anfragen einer kleinen Gruppe dreimal so oft wie die anderer Gruppen. Was ist das für ein Befund?',
        correct: 'Ungleiche Behandlung, die nur im Teilgruppenausweis sichtbar wird — die Gesamtrate bleibt gut.',
        wrong: [
          'Ein Rechenfehler in der Gesamtmetrik.',
          'Ein Beweis, dass diese Gruppe mehr Angriffe sendet.',
          'Ein Zeichen, dass FPR-Messung unnötig ist.',
        ],
        solution: 'Die FPR betrachtet nur harmlose Fälle — die Angriffsrate der Gruppe erklärt die Lücke nicht. Dreifache Falsch-Blockierung bei gutem Gesamtwert ist genau der Befund, für den der getrennte Ausweis existiert.',
      },
      {
        key: 'ergaenzen-nicht-ersetzen',
        prompt: 'Was bedeutet „der Subgruppenausweis ergänzt die Gesamtmetrik“ konkret?',
        correct: 'Gesamtwert und Gruppenwerte werden beide berichtet — erstere für die Gesamtlage, letztere für die Verteilung der Fehler.',
        wrong: [
          'Die Gesamtmetrik wird durch den Gruppenmittelwert ersetzt.',
          'Die Gruppenwerte ersetzen die Gesamtmessung vollständig.',
          'Die Gruppenwerte bleiben intern und werden nicht berichtet.',
        ],
        solution: 'Ergänzen heißt beides zeigen: Der Gesamtwert bleibt der Lageindikator, die Gruppenwerte zeigen, wer die Fehler trägt. Weder ersetzt eines das andere, noch darf der Ausweis intern verschwinden — Berichten heißt veröffentlichen.',
      },
      {
        key: 'aggregate-falle',
        prompt: 'Warum ist „0{,}9 Accuracy“ allein kein Fairness-Befund?',
        correct: 'Weil der Mittelwert die Verteilung der Fehler auf Gruppen nicht zeigt — zwei sehr unterschiedliche Modelle können denselben Wert haben.',
        wrong: [
          'Weil 0{,}9 generell ein schlechter Accuracy-Wert ist.',
          'Weil Accuracy für Detektoren nicht definiert ist.',
          'Weil nur ganze Prozentwerte in Berichten zulässig sind.',
        ],
        solution: 'Dieselbe Gesamtzahl kann aus gleichmäßigen oder extrem ungleichen Gruppenraten entstehen. Ohne Verteilung ist der Wert für die Fairness-Frage leer — die Aggregation ist die Falle, nicht die Zahl.',
      },
    ],
  },
};

export const FAIRNESS_AGG_CONTRACT = {
  familyId: 'classify-fairness-aggregation',
  familyGroup: 'classify-concept',
  summary: 'Erkennt, warum Gesamtmetriken Fehler kleiner Teilgruppen verdecken können.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'overall-accuracy-hides-subgroups', propertyTest: false },
    { caseId: 'fairness-aggregation', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-ml-erroranalysis'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: FAIRNESS_AGG_CONTRACT,
  capsules: FAIRNESS_AGG_CAPSULES,
  shapeError: 'Fairness-Aggregations-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const fairnessAggCapsuleOk = FAMILY_IMPL.capsuleOk;
export const fairnessAggCorrectText = FAMILY_IMPL.correctText;
export const genFairnessAggCapsule = FAMILY_IMPL.genCapsule;
export const generateFairnessAggFamily = FAMILY_IMPL.generate;
export const solveFairnessAggFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

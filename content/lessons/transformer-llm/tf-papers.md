# Paper synthetisieren: Frage, Methode, Evidenz, Grenzen

Jedes neue KI-Modell wird mit einer Benchmark-Tabelle angekündigt, und wer Claims und Zahlen sauber zuordnet, erkennt Marketing von Messung. Diese Lektion übt das Zerlegen eines Papers in Frage, Methode, Datensatz, Ergebnisse und Limitationen. Mastery kommt ausschließlich aus deterministischen Rech- und Struktur-Aufgaben; Papierkarten und Freitext bleiben Bearbeitungsnachweise.

## Das Bild dahinter: die Gerichtsverhandlung

Lies ein Paper wie eine Verhandlung. Der **Claim** ist die Behauptung der Anklage, die **Evidenz** das Beweisstück. Der Richter fragt bei jeder Behauptung: Welches Beweisstück trägt das? Ein Mini-Bild für die Zahlenfalle: „Halbierte Fehlerrate“ kann 2 % → 1 % heißen, absolut ein Prozentpunkt, relativ die Hälfte.

Wo der Vergleich hinkt: Vor Gericht gilt die Unschuldsvermutung. Beim Paper-Lesen gilt eher „unbelegt bis zur Zahl“: Ein Claim ohne Evidenzzeile ist Meinung, nicht Ergebnis.

## Die fünf Slots einer Paper-Karte

Eine **Paper-Karte** fasst ein Paper in fünf Feldern, die jeweils eine Frage beantworten:

| Slot | Frage | Schlechtes Beispiel | Gutes Beispiel |
|---|---|---|---|
| Forschungsfrage | Was wird behauptet, was untersucht? | „Attention“ | „Ersetzt Attention allein Rekurrenz bei Übersetzung?“ |
| Methode | Wie wurde es gebaut und vergleichbar gemacht? | „neues Modell“ | „Encoder-Decoder nur mit Attention, gegen stärkere Baselines“ |
| Datensatz | Welche Daten, welche Aufteilung? | „große Daten“ | „WMT 2014 EN-DE und EN-FR, Testsets fest“ |
| Ergebnisse | Welche Zahl belegt was, absolut und relativ? | „viel besser“ | „28,4 BLEU; über 2 BLEU über bisherigem Besten inkl. Ensembles“ |
| Limitationen | Was wurde nicht gezeigt? | „keine“ | „nur Übersetzung und Parsing; keine Analyse pro Domäne“ |

## Claim-Evidence-Zuordnung

Jeder Claim braucht eine Nummer, aus der er folgt, und die Zuordnung muss fremdprüfbar sein: gleiche Metrik, gleiche Menge, gleiche Richtung. Ein Claim ohne Evidence-Eintrag ist eine Meinung. Ein Claim mit falscher Basis („+7,7 % relativ“ statt „+7,7 Punkte absolut“) ist schlimmer: Er klingt besser, als die Zahl hergibt.

## Absolut versus relativ

- **Absolut (Prozentpunkte)**: $\text{neu} - \text{alt}$; bei Accuracy- oder F1-Angaben in Punkten die Standardleseart „+X Punkte“.
- **Relativ**: $100\cdot(\text{neu} - \text{alt})/\text{alt}$ (sprich: hundert mal neu minus alt durch alt), „+X %“.
- **Fehlerraten**: Sinkt der Fehler von 10 auf 8, ist das −2 Punkte absolut, aber −20 % relativ. Dieselbe Zahl, zwei ehrliche Lesarten, und die relative klingt stärker.

Faustregel: Papers behaupten relativ, wenn es vorteilhaft klingt; du rechnest beides nach.

## Abstract-Fakten: vier Karten zum Gegenüberstellen

Verifizierte Zahlen aus den Abstracts (Primärseiten, abgerufen 2026-08-31):

- **Attention Is All You Need (2017)**: Nur-Attention-Encoder-Decoder ohne Rekurrenz und Konvolution; **28,4 BLEU** auf WMT 2014 EN-DE (über 2 BLEU über dem bisherigen Besten, inklusive Ensembles), **41,8 BLEU** EN-FR als Einzelmodell-SOTA; Trainingslauf **3,5 Tage auf 8 GPUs**; Transfer auf Constituency Parsing.
- **BERT (2018)**: Bidirektionale Vortrainierung; nach Feinabstimmung mit nur einer zusätzlichen Ausgabeschicht SOTA auf **elf NLP-Aufgaben**: GLUE **80,5 %** (+**7,7 Punkte absolut**), MultiNLI **86,7 %** (+4,6), SQuAD v1.1 F1 **93,2** (+1,5), SQuAD v2.0 F1 **83,1** (+5,1).
- **GPT-3 (2020)**: **175 Milliarden Parameter** (10× jedes bisherige nicht-sparse Sprachmodell); Few-shot **ohne Gradienten-Updates oder Feinabstimmung**, nur über Textinteraktion, der Gegensatz zu BERTs Feinabstimmungs-Rezept.
- **LoRA (2021)**: Friert vortrainierte Gewichte ein, injiziert trainierbare Rang-Zerlegungen; gegenüber GPT-3 175B mit Adam-Full-FT **10 000× weniger trainierbare Parameter, 3× weniger GPU-Speicher**; gleichwertig oder besser auf RoBERTa, DeBERTa, GPT-2, GPT-3; keine zusätzliche Inferenz-Latenz.

Gegenüberstellen lohnt: BERTs „+7,7“ ist absolut in Punkten (GLUE), nicht relativ; wer es als „+7,7 %“ weitererzählt, übertreibt massiv. GPT-3 und LoRA widersprechen sich nicht: Sie antworten auf verschiedene Fragen, Skalierung ohne Anpassung versus billige Anpassung.

## Reproduzierbarkeits-Fallen

- **Seedlos**: Ohne festgehaltene [Seeds](#/glossary/seed) ist „+0,4 BLEU“ oft Rauschen (PyTorchs Reproducibility-Notes listen die Quellen: Seed, Nondeterminismus der GPU-Kernel, Worker-Reihenfolge).
- **Baseline-Totholz**: Vergleiche gegen veraltete, schlecht getunte [Baselines](#/glossary/baseline) machen Gewinne groß.
- **Testset-Diät**: Hyperparameter am Testset gewählt verwandelt Test in Validierung.
- **Mengen-Swap**: Relativ gegen absolut ausgetauscht (siehe GLUE oben).
- **Ein Seed, eine Zahl**: Punktschätzungen ohne Streuung sind nicht falsch, aber dünn.

Dazu gehört die **Ablation**: der kontrollierte Vergleich, bei dem genau eine Variable entfernt oder geändert wird, um zu zeigen, welcher Baustein den Gewinn trägt. Ein Paper, das keine Ablation zeigt, belegt den Beitrag des neuen Teils nicht.

## Typische Fehler beim Kartenschreiben

- Claim aus dem Discussion-Teil mit einer Zahl aus dem Abstract „belegt“.
- Limitations leer lassen; jedes Paper hat welche.
- Datensatz-Slot ohne Aufteilung oder Split.
- Ergebnisse ohne Einheit (BLEU? F1? %? Punkte?).

## Wo dir das in der KI begegnet

Modellveröffentlichungen konkurrieren um dieselben Tabellen. Wer Claim und Zahl sauber zuordnet, erkennt, ob „deutlich besser“ zwei Punkte auf einer anderen Metrik oder ein echter Sprung ist, und ob die Vergleichsbasis überhaupt aktuell war.

## Direkter Check

Übe absolut/relativ in einer Einstiegsaufgabe und bearbeite die [Kernaufgabe: Absolut vs. relativ](#/family/trace-assignment-state/absolute-vs-relative-gain-trace/0/core). Baue Metriken aus Zeilenlisten in der [Kernaufgabe: Metriken aus Zeilenlisten](#/family/formula-ratio-percent-metric/compare-systems-metric/0/core), prüfe Paper-Karten strukturell in der [Vertiefungsaufgabe: Paper-Karten-Prüfung](#/family/validate-required-field-raise/paper-card-required-fields/0/stretch); die [Herausforderung](#/family/rank-evidence-table/evidence-table-ranking/0/challenge) erstellt die sortierte Evidenztabelle als Endgegner.

## Begriffe auf einen Blick

- **Claim**: eine Behauptung des Papers; braucht eine prüfbare Evidenzzeile.
- **Evidenz** (englisch *evidence*): die Zahl oder Messung, aus der ein Claim folgt.
- **Paper-Karte**: Zusammenfassung in fünf Slots: Forschungsfrage, Methode, Datensatz, Ergebnisse, Limitationen.
- **Limitation**: das, was ein Paper nicht gezeigt hat; gehört ausdrücklich in die Karte.
- **Absolute Verbesserung**: Differenz neu minus alt in Prozentpunkten; die Standardleseart bei Punkten.
- **Relative Verbesserung**: Differenz geteilt durch den alten Wert in Prozent; klingt oft stärker als absolut.
- **Ablation**: kontrollierter Vergleich, bei dem genau eine Variable geändert wird.

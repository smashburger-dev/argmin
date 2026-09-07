# Paper synthetisieren: Frage, Methode, Evidenz, Grenzen

Ein Paper zu lesen heißt nicht, es zu glauben. Diese Lektion übst du das Zerlegen in **Forschungsfrage, Methode, Datensatz, Ergebnisse, Limitationen** — und das Zuordnen von **Claims** (Behauptungen) zu **Evidence** (Zahlen, aus denen sie stammen). Mastery in dieser Lektion kommt ausschließlich aus deterministischen Rech- und Struktur-Aufgaben; Papierkarten und Freitext bleiben Bearbeitungsnachweise.

## Die fünf Slots einer Paper-Karte

| Slot | Frage | Schlechtes Beispiel | Gutes Beispiel |
|---|---|---|---|
| Forschungsfrage | Was wird behauptet, was untersucht? | „Attention“ | „Ersetzt Attention allein Rekurrenz bei Übersetzung?“ |
| Methode | Wie wurde es gebaut/vergleichbar gemacht? | „neues Modell“ | „Encoder-Decoder nur mit Attention, gegen stärkere Baselines“ |
| Datensatz | Welche Daten, welche Aufteilung? | „große Daten“ | „WMT 2014 EN-DE und EN-FR, Testsets fest“ |
| Ergebnisse | Welche Zahl belegt was — absolut und relativ? | „viel besser“ | „28,4 BLEU; über 2 BLEU über bisherigem Besten inkl. Ensembles“ |
| Limitationen | Was wurde nicht gezeigt? | „keine“ | „nur Übersetzung/Parsing; keine Analyse pro Domäne“ |

## Claim-Evidence-Zuordnung

Jeder Claim braucht eine Nummer, aus der er folgt — und die Zuordnung muss fremdprüfbar sein: Gleiche Metrik, gleiche Menge, gleiche Richtung. Ein Claim ohne Evidence-Eintrag ist eine Meinung. Ein Claim mit falscher Basis („+7,7 % relativ“ statt „+7,7 Punkte absolut“) ist schlimmer: Er klingt besser, als die Zahl hergibt.

## Absolut versus relativ

- **Absolut (Prozentpunkte)**: $\text{neu} - \text{alt}$ — bei Accuracy-/F1-Angaben in Punkten die Standardleseart „+X Punkte“.
- **Relativ**: $100\cdot(\text{neu} - \text{alt})/\text{alt}$ — „+X %“.
- **Fehlerraten**: Sinkt der Fehler von 10 auf 8, ist das −2 Punkte absolut, aber −20 % relativ — dieselbe Zahl, zwei ehrliche Lesarten, und die relative klingt stärker.
Faustregel: Papers behaupten relativ, wenn es vorteilhaft klingt; du rechnest beides nach.

## Abstract-Fakten: vier Karten zum Gegenüberstellen

Verifizierte Zahlen aus den Abstracts (Primärseiten, abgerufen 2026-08-31):

- **Attention Is All You Need (2017)**: Nur-Attention-Encoder-Decoder ohne Rekurrenz/Konvolution; **28,4 BLEU** auf WMT 2014 EN-DE (über 2 BLEU über dem bisherigen Besten, inklusive Ensembles), **41,8 BLEU** EN-FR als Einzelmodell-SOTA; Trainingslauf **3,5 Tage auf 8 GPUs**; Transfer auf Constituency Parsing.
- **BERT (2018)**: Bidirektionale Vortrainierung; nach Feinabstimmung mit nur einer zusätzlichen Ausgabeschicht SOTA auf **elf NLP-Aufgaben**: GLUE **80,5 %** (+**7,7 Punkte absolut**), MultiNLI **86,7 %** (+4,6), SQuAD v1.1 F1 **93,2** (+1,5), SQuAD v2.0 F1 **83,1** (+5,1).
- **GPT-3 (2020)**: **175 Milliarden Parameter** (10× jedes bisherige nicht-sparse Sprachmodell); Few-shot **ohne Gradienten-Updates oder Feinabstimmung**, nur über Textinteraktion — der Gegensatz zu BERTs Feinabstimmungs-Rezept.
- **LoRA (2021)**: Friert vortrainierte Gewichte ein, injiziert trainierbare Rang-Zerlegungen; gegenüber GPT-3 175B mit Adam-Full-FT **10 000× weniger trainierbare Parameter, 3× weniger GPU-Speicher**; gleichwertig oder besser auf RoBERTa, DeBERTa, GPT-2, GPT-3; keine zusätzliche Inferenz-Latenz.

Gegenüberstellen lohnt: BERTs „+7,7“ ist absolut in Punkten (GLUE), nicht relativ — wer es als „+7,7 %“ weitererzählt, übertreibt massiv. GPT-3 und LoRA widersprechen sich nicht, sie antworten auf verschiedene Fragen (Skalierung ohne Anpassung versus billige Anpassung).

## Reproduzierbarkeits-Fallen

- **Seedlos**: Ohne festgehaltene Zufallszustände ist „+0,4 BLEU“ oft Rauschen (PyTorchs Reproducibility-Notes listen die Quellen: Seed, Nondeterminismus der GPU-Kernel, Worker-Reihenfolge).
- **Baseline-Totholz**: Vergleiche gegen veraltete, schlecht getunte Baselines machen Gewinne groß.
- **Testset-Diät**: Hyperparameter am Testset gewählt verwandelt Test in Validierung.
- **Mengen-Swap**: Relativ gegen absolut ausgetauscht (siehe GLUE oben).
- **Ein Seed, eine Zahl**: Punktschätzungen ohne Streuung sind nicht falsch, aber dünn.

## Typische Fehler beim Kartenschreiben

- Claim aus dem Discussion-Teil mit einer Zahl aus dem Abstract „belegt“.
- Limitations leer lassen — jedes Paper hat welche.
- Datensatz-Slot ohne Aufteilung/Split.
- Ergebnisse ohne Einheit (BLEU? F1? %? Punkte?).

## Direkter Check

Übe absolut/relativ in einer Einstiegsaufgabe und [Code-Tracing absolut vs. relativ: Was sind die Werte der Variablen a1, r1, a2, …](#/family/trace-assignment-state/absolute-vs-relative-gain-trace/0/core). Baue Metriken aus Zeilenlisten in [Metrik aus Zeilenlisten: Implementiere compare_systems(rows). Eingabe: Liste …](#/family/formula-ratio-percent-metric/compare-systems-metric/0/core), prüfe Paper-Karten strukturell in [Paper-Karten strukturell prüfen: Implementiere review_paper_card(card). …](#/family/validate-required-field-raise/paper-card-required-fields/0/stretch); [Final Boss Evidenztabelle: Implementiere evidence_table(papers). Eingabe: Liste …](#/family/rank-evidence-table/evidence-table-ranking/0/challenge) erstellt die sortierte Evidenztabelle als Endgegner.

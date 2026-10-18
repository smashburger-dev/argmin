# ML-Probleme formulieren und Baselines setzen

Jede Klassifikation, die ein KI-System trifft, beginnt vor dem ersten Modell: Was genau soll vorhergesagt werden, und woran merkst du, dass das Modell überhaupt etwas kann? Diese Lektion zeigt dir die zwei Entscheidungen, die vor jeder Zahl stehen: Problem einordnen und einen Maßstab setzen, den ein Modell erst schlagen muss.

## Das Bild dahinter: die Wettervorhersage

Stell dir eine Wetter-App vor. Sie taugt erst etwas, wenn sie die dümmste sinnvolle Vorhersage schlägt: „Morgen wird es wie heute.“ Meteorologen nennen das Persistenz-Prognose. Ihr Pendant beim Klassifizieren ist die **Majority-Baseline**: Rate immer die häufigste Antwort. Ihr Pendant bei Zahlen ist die **Mean-Baseline**: Sage immer den Mittelwert vorher.

Wo der Vergleich hinkt: Beim Wetter ist „wie heute“ oft schon gut. Bei seltenen Klassen täuscht die Majority-Baseline dagegen eine hohe Trefferquote vor: Wer bei 1 % Betrugsfällen immer „kein Betrug“ sagt, liegt bei 99 % und hat nichts gelernt.

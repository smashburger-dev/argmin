# Cross-Validation und Leakage-Kontrolle

Ein einziger Train/Test-Split kann Glück oder Pech sein, und ein Sprachmodell, das die Prüfungsfragen schon im Trainingstext gesehen hat, misst Auswendiglernen statt Können. Diese Lektion zeigt dir die zwei Werkzeuge dagegen: Kreuzvalidierung für ehrliche Leistungszahlen und die Pipelinegrenze gegen Informationslecks.

## Das Bild dahinter: fünf Übungsblätter

Stell dir fünf Übungsblätter vor. Fünfmal lernst du mit vier Blättern und testest dich mit dem fünften; am Ende hast du fünf Noten. Ihre Streuung sagt, wie verlässlich dein Können ist, besser als eine einzelne Note. **Leakage** ist in diesem Bild: Du hast die Prüfungsfragen vorher gesehen.

Wo der Vergleich hinkt: Übungsblätter sind unabhängig erstellt. Datenpunkte können zusammenhängen, etwa Messungen derselben Person oder desselben Zeitraums; dann müssen die Folds nach Gruppen oder Zeit getrennt werden, sonst sickert die Lösung ins Training.

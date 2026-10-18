# Ridge und Lasso: Schrumpfen statt Überanpassen

Wer für eine Prüfung die Fragen der Vorjahre auswendig lernt, scheitert an der neuen Frage. Ein lineares Modell, das jedes Detail der Trainingsdaten auswendig lernt, macht dasselbe. Diese Lektion zeigt zwei Bremsen dagegen: Ridge, das jeden Koeffizienten Richtung null zieht, und Lasso, das kleine Beiträge ganz streicht.

## Das Bild dahinter: Gummiband und Gebühr

Bei **Ridge** hängt an jedem [Koeffizienten](#/glossary/koeffizient) ein Gummiband: Es zieht Richtung null, und zwar umso stärker, je weiter der Wert weg ist. Kein Koeffizient erreicht exakt null, aber große Ausreißer werden gebremst.

Bei **Lasso** kostet jede Einheit Abstand von null eine feste Gebühr. Lohnt sich ein kleiner Beitrag nicht, wird er gestrichen; der Koeffizient fällt auf exakt null.

Wo der Vergleich hinkt: Das Gummiband zieht proportional zur Auslenkung, die Lasso-Gebühr ist pro Einheit konstant. Beide wirken nur auf die Koeffizienten, nicht auf die Daten, und beide brauchen einen Stellregler $\lambda$ (sprich: lambda), der die Strafhöhe setzt.

**Regularisierung** heißt genau dieses Einengen der Freiheitsgrade: Ein **Hyperparameter** wie $\lambda$ wird nicht aus den Daten gelernt, sondern von dir vorgegeben. Im Austausch für etwas **Bias** (eine leichte Verzerrung der Vorhersage im Mittel) sinkt die [**Varianz**](#/glossary/varianz), die Wackeligkeit der Vorhersage. Der Trainingsfehler steigt mit $\lambda$ dabei typischerweise an; gesenkt wird der erwartete Testfehler. „Bias“ meint hier die statistische Verzerrung, nicht den Bias-Term einer Schicht.

Die Schienen zeigen den orthogonalen Spezialfall $X^T X = I$ mit unregularisierten Gewichten $(3;\ 1{,}5;\ -1)$. Ridge nutzt hier $\|Xw-y\|^2 + \lambda\|w\|^2$, Lasso die in den Aufgaben verwendete Normierung $\tfrac12\|Xw-y\|^2 + \lambda\|w\|_1$. Die gleiche Zahl für $\lambda$ bedeutet deshalb nicht die gleiche Stärke der Strafe. Die Form der Schrumpfung ist der Vergleich. Der Checkpoint prüft weiterhin den skalaren Ridge-Fall $(w-3)^2+\lambda w^2$.

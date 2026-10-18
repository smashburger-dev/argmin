# Regularisierung, faire Ablation, Save/Load

Regularisierung schränkt ein Modell ein, damit es nicht Trainingsrauschen memoriert. Drei Werkzeuge, alle in NumPy exakt machbar: L2-Strafe, Dropout, Early Stopping. Dazu die Methodik, die sie erst auswertbar macht: die **faire Ablation**, und die Fähigkeit, Modellzustände zu speichern und reproduzierbar zurückzuladen.

## Das Bild dahinter: Team mit zufälligen Fehlzeiten

Dropout ist ein Team, in dem jeden Tag zufällig Leute fehlen: Niemand wird unersetzlich, und das Wissen verteilt sich auf alle. Early Stopping ist ein Kuchen, den du herausnimmst, wenn er goldbraun ist, nicht, wenn der Timer abläuft.

Wo der Vergleich hinkt: Beim Dropout fehlen die Einheiten nur im Training; bei der Vorhersage ist das ganze Team da.

## L2 und Weight Decay

Die L2-[Regularisierung](#/glossary/regularisierung) ergänzt den Verlust um $\frac{\lambda}{2} \|w\|^2$. Der [Gradient](#/glossary/gradient) wächst dadurch um $\lambda w$, das Update wird zu

$$w \leftarrow w - \mathrm{lr} \cdot (g + \lambda w).$$

($\mathrm{lr}$ ist die [Lernrate](#/glossary/lernrate), in anderen Texten oft $\eta$ geschrieben.)

Diese Form, Weight Decay, zieht die Gewichte in jedem Schritt proportional zu ihrem Betrag Richtung null, unabhängig vom Datengradienten. Der Bias wird üblicherweise **nicht** regularisiert: Er verschiebt nur, er skaliert nicht. Wähle $\lambda$ klein (etwa $10^{-4}$ bis $10^{-2}$). Zu große Werte ziehen das Modell so stark Richtung null, dass es fast nur noch den Bias vorhersagt.

## Dropout mit fester Maske

Dropout nullt zufällig Aktivierungen und trainiert so Redundanz. Kontrolliert und reproduzierbar wird es durch eine **feste Maske**, gezogen vor dem Schritt: $M \in \{0, 1\}^{n}$ mit $P(M_i = 1) = p$. Achtung zur Konvention: Hier ist $p$ die **Behaltewahrscheinlichkeit**, so wie in der Code-Aufgabe `dropout_forward`. In PyTorch (`nn.Dropout(p)`) und in manchen Konzeptfragen ist $p$ dagegen die Ausfallwahrscheinlichkeit; eine Vertauschung macht aus „behalte 80 %“ ein „behalte 20 %“.

Invertierte Skalierung heißt: Erhaltene Aktivierungen werden mit $1/p$ multipliziert:

$$\tilde{a}_i = M_i \cdot \frac{a_i}{p}.$$

So bleibt der Erwartungswert über die [Masken](#/glossary/maske) unverändert. Im Inference-Pass braucht es dann **keine** Maske und keine Skalierung mehr. In dieser Plattform ist Dropout ein kontrolliertes Konzept: Maske einmal ziehen (Seed), Weiterrechnen exakt nachvollziehen.

## Faire Ablation

Eine Ablation ändert **genau eine** Variable. Alles andere bleibt fix: Daten, Split, Initialisierung, Lernrate, [Epochenzahl](#/glossary/epoche). Das funktioniert nur mit festen Seeds: Erzeuge Daten und Split aus `np.random.default_rng(seed)` und initialisiere die Gewichte aus einem davon getrennten, ebenfalls geseedeten Generator. Dann gilt: $\lambda = 0$ gegen $\lambda = 0{,}05$ bei gleichem Seed misst die Wirkung der Strafe, nicht des Zufalls. Zwei Läufe mit gleichem Seed müssen bitgleich sein; das ist der Reproduzierbarkeits-[Nachweis](#/glossary/nachweis).

## Early Stopping

Notiere den Validierungsverlust pro Epoche. Early Stopping mit Patience $k$: Merke die beste Epoche (kleinster Validierungsverlust) und brich ab, sobald $k$ Epochen ohne Verbesserung vergangen sind; zurück kommt die beste Epoche, nicht die letzte. Das ist Regularisierung durch Modellwahl, und der billigste [Hyperparameter](#/glossary/hyperparameter), den es gibt.

Im schematischen Beispiel unten gilt $L_\mathrm{train}(t)=e^{-0{,}3t}$ und $L_\mathrm{val}(t)=e^{-0{,}3t}+0{,}004t^2$. Diese Kurven sind keine Messdaten eines trainierten Netzes. Die Fahne markiert das kleinste Validierungsresultat unter ganzzahligen Epochen. Die Frage bei $t=10$ ist eine Übertragung auf die ungebremst fortgesetzte Kurve, auch wenn der Lauf mit Patience früher stoppt.

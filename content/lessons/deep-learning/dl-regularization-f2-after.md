## Faire Ablation

Eine Ablation ändert **genau eine** Variable. Alles andere bleibt fix: Daten, Split, Initialisierung, Lernrate, [Epochenzahl](#/glossary/epoche). Das funktioniert nur mit festen Seeds: Erzeuge Daten und Split aus `np.random.default_rng(seed)` und initialisiere die Gewichte aus einem davon getrennten, ebenfalls geseedeten Generator. Dann gilt: $\lambda = 0$ gegen $\lambda = 0{,}05$ bei gleichem Seed misst die Wirkung der Strafe, nicht des Zufalls. Zwei Läufe mit gleichem Seed müssen bitgleich sein; das ist der Reproduzierbarkeits-[Nachweis](#/glossary/nachweis).

## Early Stopping

Notiere den Validierungsverlust pro Epoche. Early Stopping mit Patience $k$: Merke die beste Epoche (kleinster Validierungsverlust) und brich ab, sobald $k$ Epochen ohne Verbesserung vergangen sind; zurück kommt die beste Epoche, nicht die letzte. Das ist Regularisierung durch Modellwahl, und der billigste [Hyperparameter](#/glossary/hyperparameter), den es gibt.

Im schematischen Beispiel unten gilt $L_\mathrm{train}(t)=e^{-0{,}3t}$ und $L_\mathrm{val}(t)=e^{-0{,}3t}+0{,}004t^2$. Diese Kurven sind keine Messdaten eines trainierten Netzes. Die Fahne markiert das kleinste Validierungsresultat unter ganzzahligen Epochen. Die Frage bei $t=10$ ist eine Übertragung auf die ungebremst fortgesetzte Kurve, auch wenn der Lauf mit Patience früher stoppt.

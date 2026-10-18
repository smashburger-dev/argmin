# Lineare Regression: Fit, Fehlermaße und Residuenanalyse

Wie schätzt du den Preis einer Wohnung, ohne sie zu kennen? Diese Lektion zeigt, wie ein lineares Modell einen Grundpreis plus Preis pro Quadratmeter lernt, wie du den Schätzfehler misst und wie ein Bild der Fehler verrät, was dem Modell fehlt.

## Das Bild dahinter: Wohnungspreis und Dartscheibe

Das lineare Modell rechnet wie ein Makler im Kopf: Grundpreis plus Preis pro Quadratmeter mal Fläche. Der Grundpreis ist der **Achsenabschnitt** (englisch *intercept*) $w_0$, der Preis pro Quadratmeter der **Koeffizient** $w_1$. Für ein Apartment mit 60 m² und $w_0 = 200\,\text{€}$, $w_1 = 10\,\text{€}$ schätzt das Modell $200 + 10 \cdot 60 = 800$ €.

Allgemein heißt die Vorhersage:

$$
\hat{y} = w_0 + w_1 x_1 + \dots + w_d x_d.
$$

Das **Residuum** (englisch *residual*) ist der Schätzfehler einer einzelnen Wohnung: $r_i = y_i - \hat{y}_i$ (wahrer Preis minus Schätzung). Der **Residuenplot**, Residuen gegen die Vorhersage aufgetragen, liest du wie Dartwürfe an einer Scheibe: Zufällige Streuung um die Mitte ist gut; ein systematischer Zug nach links oder rechts heißt, dem Modell fehlt ein Merkmal.

Wo der Vergleich hinkt: Echte Preise wachsen nicht linear, eine Wohnung im Zentrum kostet pro m² mehr als eine am Rand, und einzelne Ausreißer können das Bild verzerren.

Die folgende Figur verwendet vier kleine Zahlenpaare statt Wohnungspreise. Jede Feder misst ein vertikales Residuum. Wandert der letzte Punkt nach oben, verändert sich auch die beste Gerade. Die Federenergie steht für das Quadrat des Residuums; echte Federn bewegen sich nicht wie ein Optimierungsalgorithmus.

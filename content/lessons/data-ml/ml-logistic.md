# Logistische Regression und Klassifikationsmetriken

Ob Spam im Postfach, Betrug an der Kasse oder ein positiver Test: KI-Systeme treffen ständig Ja/Nein-Entscheidungen. Diese Lektion zeigt dir, wie aus einer Wahrscheinlichkeit eine Entscheidung wird und wie du ihre Güte misst. Im Detail geht es darum, wie aus einem Zahlenwert eine Ja/Nein-Entscheidung wird, wie die Zahlen TP, FP, FN und TN zusammenwirken und warum es eine Frage der Kosten ist, wie wählerisch ein Modell sein soll.

## Das Bild dahinter: Spamfilter

Stell dir den Spamfilter in deinem Postfach vor. Das Modell gibt jeder Mail eine Spam-Wahrscheinlichkeit, das ist die Ausgabe der Sigmoid-Funktion. Ein **Schwellenwert** $t$ entscheidet, in welchen Ordner die Mail wandert: über $t$ ins Spam-Fach, darunter ins Postfach. Der **Recall** (Trefferquote) ist der Anteil der echten Spam-Mails, der im Spam-Fach ankommt; die **Präzision** ist der Anteil des Spam-Fachs, der wirklich Spam ist. Die Labels sind Mails, die Nutzerinnen und Nutzer als Spam oder nicht Spam markiert haben.

Wo der Vergleich hinkt: Der Filter sieht nur, was markiert wurde; Spam-Mails, die niemand je als Spam gemeldet hat, fehlen in den Labels. Und eine Wahrscheinlichkeit bleibt keine Gewissheit: Das Modell kann eine harmlose Mail über $t$ schieben und Spam darunter durchlassen.

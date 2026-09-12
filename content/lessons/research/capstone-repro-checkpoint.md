# Checkpoint: Doppellauf, gepinnte Versionen, ehrliche Dokumentation

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Was genau vergleicht `repro_check()` im Doppellauf — und welches Ergebnis zählt als reproduzierbar?
2. Warum ist `pytest>=8` in den gepinnten Versionen ein Wetteinsatz statt eines Fakts?
3. Der Overclaim-Scanner markiert „produktionsreif“ und „sicher gegen“. Was verlangt er stattdessen?

Kontrolliere: (1) zwei frische Läufe erzeugen Artefakte, deren Digests über die kanonische Serialisierung verglichen werden — nur „reproduzierbar: ja“ mit übereinstimmenden Digests zählt; (2) eine Bereichs-Spec verspricht Kompatibilität ohne Nachweis — gepinnt heißt exakt eine Version, kein Intervall; (3) Limitationen und bekannte Fehler statt Werbetext — der Scanner erzwingt ehrliche Formulierungen, ersetzt aber kein Review.

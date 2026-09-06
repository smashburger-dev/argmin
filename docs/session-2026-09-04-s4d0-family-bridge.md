# S4D0: Familienbrücke (Identität + Anschluss)

Stand: 2026-09-04. Branch `streamline/integration-pre-s2b` auf S4C `e2d1536`. Kein Commit.

## Gebaut

- `familyEventInput` in `assets/js/domain/exercise_registry.mjs`: Familieninstanz → S3-Schreibpfad. `definitionId` = Familie:Fall (stabil je Fall), Rest aus dem Vertrag, Zyklus vom Ledger. Keine Policy-/Ledger-/Builder-Änderung. Ein Fall teilt die Review-Gruppe über Profile (Reveal disqualifiziert fallweit, beabsichtigt).
- Route `#/family/:familie/:fall/:seed/:profil` (`-` = Zufall) mit fauler `FamilyExerciseView`: öffnen, prüfen, speichern, Review-Termin, Lösung bei Fehlern. Hinweise/Offenlegung für Varianten kommen je Domäne.
- Modul verlinkt kuratierte und Übungsplatz-Karten ohne `definitionId` auf die Route. „Noch nicht instantiierbar" nur noch ohne Familien-ID.

## Gates

Contract 16/16, Suite 932/0, Typecheck, Build (JS 78.3, weiter über S0-Soll 77.5), Chromium Familien-Roundtrip 2/2 (ein Kaltstart-Flake im ersten Lauf nach frischem Build, danach zweimal grün).

## Offen für S4D1+

Hinweise/Offenlegung je Domäne, GP2-Dubletten auflösen, Einstieg zurück unter Budget (S5/S6).

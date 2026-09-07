# ADR-0015: Repository is the public profile

Status: Angenommen 2026-09-07.

## Entscheidung

Dieses Repository ist das öffentliche Produkt. Es gibt kein lokales Privatprofil,
keinen externen Content-Overlay und keine lokale Bibliotheksauslieferung.
Fremde Ressourcen werden ausschließlich als öffentliche Links referenziert.
Eigene Lerninhalte bleiben als Content im Repository und werden durch die
öffentlichen Rechte- und Build-Verträge geschützt.

## Beibehaltene Schutzverträge

Marker-Scans bleiben als Leak-Canary aktiv. Der Release-Baum bleibt allowlist-
basiert und wird auf private Marker, exakte Dateipfade, Lizenznotices,
versionsgenaue SHA-256-Hashes, Rechte-Schema und Bundle-Validierung geprüft.
Diese Prüfungen schützen ein einzelnes öffentliches Profil und sind keine
Profiltrennung.

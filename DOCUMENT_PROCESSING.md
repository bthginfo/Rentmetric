# Dokumentverarbeitung

Der Standardprovider `local` klassifiziert nichts automatisch und legt einen manuellen Prüfhinweis an. Spätere Provider implementieren `DocumentProcessor`.

Pipeline:

1. Dateigröße, MIME-Signatur und Name prüfen
2. privat/quarantänisiert speichern
3. idempotenten Job anlegen
4. Provider ausführen
5. Werte mit Confidence und Evidence getrennt vom Original speichern
6. Plausibilitätsregeln anwenden
7. menschliche Bestätigung verlangen
8. erst danach fachliche Datensätze aktualisieren

Mieteruploads bleiben bis zur Freigabe in einer isolierten Inbox. Provider erhalten nur die minimal erforderlichen Inhalte. Rohdokumente oder personenbezogene Inhalte gehören nicht in Logs.


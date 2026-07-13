# Architektur

## Schichten

- `src/app`: Routen und Server Components
- `src/auth`: Authentifizierung, gehashte Datenbanksessions und Server Actions
- `src/repositories`: organisationsgebundener Datenzugriff
- `src/domain`: deterministische, frameworkunabhängige Fachlogik
- `src/providers`: austauschbare externe Daten-/Verarbeitungsanbieter
- `src/db`: Drizzle-Schema und Verbindung

`organization` bezeichnet den SaaS-Mandanten, `renter` den Wohnungsmieter und `tenancy` das Mietverhältnis.

## Mandantentrennung

Der Organisationskontext wird aus der Session über Benutzer → Mitgliedschaft → Organisation abgeleitet. Fach-Repositories verlangen ihn als nicht-optionales Argument und filtern zusätzlich nach Objekt-ID. Direkte IDs allein autorisieren keinen Zugriff. RLS ist als zusätzliche Härtung vorgesehen, aber nicht Voraussetzung für die Anwendungsisolation; so bleibt die Trennung auch bei Migrationen und Serverless-Verbindungen testbar.

## Jobs und Erinnerungen

`background_jobs` verwendet eindeutige Idempotency Keys, Versuchszähler und Sperrzeitpunkte. Der tägliche Dispatcher selektiert später fällige Jobs mit einer atomaren Sperre. Reminder-Regeln erzeugen stabile Deduplication Keys. KI kann später Zusammenfassungen priorisieren, aber keine Frist als einzige Quelle bestimmen.

## Geld und Zeit

Geld ist Integer-Cent, Prozentsätze sind Basis-Punkte. Persistierte Zeitpunkte sind UTC mit Zeitzone; Darstellung erfolgt in `Europe/Paris`/`de-DE`. Kalenderfristen verwenden explizite lokale Tagesgrenzen.


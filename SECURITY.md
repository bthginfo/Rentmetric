# Sicherheitskonzept

Rentmetric verarbeitet Verträge, personenbezogene Daten, Zahlungen und Immobiliendokumente. Sicherheitsänderungen müssen deshalb dieselben Tests wie Funktionsänderungen bestehen und bei jedem Lesen und Schreiben die Organisation des angemeldeten Nutzers erzwingen.

## Umgesetzte Schutzmaßnahmen

- Argon2id-Passwort-Hashes und zeitlich angeglichene Prüfung unbekannter Konten
- datenbankgestützte, nur gehasht gespeicherte Zufallssitzungen mit Inaktivitäts- und absolutem Ablauf
- `HttpOnly`, `Secure`, `SameSite=Lax` und geschützte Cookie-Präfixe in Produktion
- getrennte Nutzer- und Plattform-Admin-Sitzungen; initiale Admin-Passwörter müssen geändert werden
- Konto- und IP-bezogene Drosselung für Login, Admin-Login und Registrierung
- Organisationsprüfung bei Actions, Downloads und Uploads
- gehashte, ablaufende und widerrufbare Mieterportal-Links mit expliziten Berechtigungen
- private Blob-Auslieferung ausschließlich über autorisierte Route Handler
- Prüfung von Dateiendung, MIME-Typ und echter Dateisignatur sowie Größen- und Upload-Limits
- Nonce-basierte Produktions-CSP, HSTS, Clickjacking- und MIME-Sniffing-Schutz
- Audit-Logs für sicherheitsrelevante Änderungen

## Anforderungen an den Betrieb

- `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` und Provider-Zugänge ausschließlich als Vercel-Secrets verwalten.
- Für Dokumente nur einen privaten Vercel-Blob-Store verwenden; dessen Schreib-/Lesetoken darf nie an den Browser gelangen.
- Ein langes zufälliges `CRON_SECRET` verwenden und nach vermuteter Offenlegung rotieren.
- Jeden Zugang rotieren, der in Chat, Ticket oder Quelltext eingefügt wurde. `.env*`-Dateien niemals committen.
- MFA für GitHub und Vercel erzwingen und Zugriffe auf das Produktionsprojekt minimieren.
- Vor jedem Produktionsrelease `npm audit`, Audit-Logs und Provider-Sicherheitsmeldungen prüfen.

## Verbleibende Defense-in-Depth

Keine Internetanwendung kann garantiert „unhackbar“ sein. Vor dem Betrieb mit größeren Echtdatenmengen sind ein unabhängiger Penetrationstest, Alarmierung verdächtiger Anmelde-/Portalaktivität, Malware-Scanning für Dokumente und PostgreSQL Row-Level Security als zweite Mandantengrenze sinnvoll. Bevor weitere Personen Plattform-Adminzugriff erhalten, sollten MFA oder Passkeys verpflichtend sein.

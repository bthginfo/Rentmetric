# Sicherheitskonzept

- Argon2id mit individuellem Salt durch die Bibliothek
- 256-Bit-Zufallstokens; in Postgres ausschließlich SHA-256-Hash
- HttpOnly, SameSite=Lax, Secure in Produktion, 14 Tage Ablauf
- generische Loginfehler und datenbankgestütztes Rate-Limit
- Zod-Validierung an Server-Action-/Provider-Grenzen
- organisationsgebundene Repositories gegen IDOR
- private Dokumente, autorisierte Downloads, MIME-/Größenprüfung vor Blob-Upload
- widerrufbare, ablaufende Freigabelinks mit fein granularen Berechtigungen
- CSP, Frame-, MIME-, Referrer- und Permissions-Header
- Cron-Secret mit timing-sicherem Vergleich
- Audit-Log ohne Passwörter, Tokens oder unnötige Dokumentinhalte

Offene Härtung vor einem produktiven Nutzerpilot: verteiltes Rate-Limit/Abuse Monitoring, vollständige Upload-Pipeline, RLS-Policies als Defense in Depth, Lösch-/Exportflow, Sessionverwaltung im UI und externer Penetrationstest.

Der im Einrichtungs-Chat verwendete Vercel-Token muss nach Abschluss rotiert werden.


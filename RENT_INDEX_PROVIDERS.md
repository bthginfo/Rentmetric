# Mietspiegel-Provider

## Automatisierungsstrategie

1. **Open Data oder kommunale API** – bevorzugt, maschinenlesbar und versionierbar.
2. **Strukturierter Import** – CSV/XLSX/JSON mit Mapping, Vorschau, Validierung und Prüfsumme.
3. **Geprüftes Regelwerk** – manuelle Übertragung aus einer offiziellen Veröffentlichung mit Vier-Augen-Freigabe.
4. **PDF-Erkennung** – nur als Importhilfe. Extrahierte Tabellen werden niemals ohne fachliche Prüfung aktiv.

Alle Provider normalisieren auf dasselbe Schema. Gespeichert werden Kommune, Gültigkeitsdatum, Version, Quelle, Prüfsumme, Regeln und Status. Eine neue Version ist `pending_review`, bis ein Benutzer sie freigibt. Assessments speichern die genaue Source-ID sowie Input und Ergebnis; historische Bewertungen ändern sich dadurch nicht rückwirkend.

Eine Mietpreisorientierung trennt Vergleichsmiete, konfigurierbare Kappungsgrenze, zeitliche Prüfpunkte und weitere rechtlich zu prüfende Voraussetzungen. Sie formuliert keine automatische rechtliche Freigabe.


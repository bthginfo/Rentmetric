export const navItems = [
  { href: "/app/dashboard", label: "Übersicht", glyph: "01" },
  { href: "/app/properties", label: "Immobilien", glyph: "02" },
  { href: "/app/tenancies", label: "Mietverhältnisse", glyph: "03" },
  { href: "/app/tasks", label: "Aufgaben & Fristen", glyph: "04" },
  { href: "/app/rent-index", label: "Mietspiegel", glyph: "05" },
] as const;

export const properties = [
  { name: "Kastanienhof", address: "Berrenrather Straße 214, Köln-Sülz", units: 5, occupied: 5, rent: "5.180,00 €", value: "1.420.000 €", status: "Voll vermietet" },
  { name: "Rheinblick", address: "Meckenheimer Allee 118, Bonn", units: 3, occupied: 2, rent: "2.240,00 €", value: "835.000 €", status: "1 Einheit frei" },
] as const;

export const tenancies = [
  { tenant: "Mara Beispiel", unit: "Kastanienhof · EG links", start: "01.03.2021", rent: "1.040,00 €", sqm: "82 m²", review: "Prüfung möglich", tone: "warning" },
  { tenant: "Jonas Muster", unit: "Kastanienhof · EG rechts", start: "15.08.2023", rent: "960,00 €", sqm: "74 m²", review: "Noch 13 Monate", tone: "success" },
  { tenant: "Lea Demofrau", unit: "Kastanienhof · 1. OG links", start: "01.11.2019", rent: "1.120,00 €", sqm: "88 m²", review: "Quellenprüfung", tone: "warning" },
  { tenant: "Emil Beispielmann", unit: "Kastanienhof · 1. OG rechts", start: "01.06.2024", rent: "980,00 €", sqm: "76 m²", review: "Noch 21 Monate", tone: "success" },
  { tenant: "Nora Platzhalter", unit: "Kastanienhof · DG", start: "01.09.2020", rent: "1.080,00 €", sqm: "80 m²", review: "Prüfung möglich", tone: "warning" },
  { tenant: "Paul Mustersohn", unit: "Rheinblick · EG", start: "01.04.2022", rent: "1.060,00 €", sqm: "85 m²", review: "Noch 4 Monate", tone: "success" },
  { tenant: "Rosa Beispielfrau", unit: "Rheinblick · 1. OG", start: "01.02.2018", rent: "1.180,00 €", sqm: "91 m²", review: "Prüfung möglich", tone: "warning" },
] as const;

export const tasks = [
  { title: "Fehlenden Mieteingang prüfen", detail: "Rheinblick · 1. OG · Zahlung für Juli nicht zugeordnet", date: "Heute", tag: "Dringend", tone: "urgent", origin: "Automatisch" },
  { title: "Mietprüfung vorbereiten", detail: "Kastanienhof · EG links · letzte Anpassung vor 38 Monaten", date: "Heute", tag: "Potenzial", tone: "warning", origin: "Automatisch" },
  { title: "Rauchwarnmelder-Wartung terminieren", detail: "Kastanienhof · alle 5 Einheiten · Nachweis hinterlegen", date: "18. Juli", tag: "Frist", tone: "warning", origin: "Manuell" },
  { title: "Indexquelle Köln fachlich prüfen", detail: "Mietspiegel Köln 2025 wurde importiert und wartet auf Freigabe", date: "22. Juli", tag: "Prüfung", tone: "success", origin: "Automatisch" },
  { title: "Versicherungsnachweis ablegen", detail: "Rheinblick · Gebäudeversicherung läuft zum 31. August aus", date: "31. Juli", tag: "Dokument", tone: "success", origin: "Automatisch" },
] as const;

export const sources = [
  { city: "Köln", title: "Mietspiegel Köln 2025", provider: "Stadt Köln / strukturiert erfasst", version: "2025.1", date: "08.07.2026", status: "Prüfung offen", tone: "warning", coverage: "Köln, 5 Einheiten" },
  { city: "Bonn", title: "Mietspiegel Bonn 2024", provider: "Bundesstadt Bonn / manueller Import", version: "2024.2", date: "12.06.2026", status: "Fachlich geprüft", tone: "success", coverage: "Bonn, 3 Einheiten" },
] as const;

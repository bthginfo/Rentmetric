import "server-only";

export type OfficialRentIndexDataset = {
  id: string;
  title: string;
  description: string;
  modifiedAt: string;
  license: string | null;
  source: "official";
  publisher: string;
  year: number;
  resources: Array<{
    id: string;
    name: string;
    description: string;
    format: string;
    declaredMimeType: string | null;
    url: string;
  }>;
};

const catalog: OfficialRentIndexDataset[] = [
  {
    id: "official-berlin-2026",
    title: "Berliner Mietspiegel 2026",
    description:
      "Aktueller qualifizierter Mietspiegel des Landes Berlin, Stand Mai 2026. Offizielle Broschüre, Tabelle und Online-Abfrage.",
    modifiedAt: "2026-05-01T00:00:00.000Z",
    license: null,
    source: "official",
    publisher:
      "Land Berlin · Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen",
    year: 2026,
    resources: [
      {
        id: "berlin-2026-pdf",
        name: "Berliner Mietspiegel 2026",
        description: "Offizielle Broschüre",
        format: "PDF",
        declaredMimeType: "application/pdf",
        url: "https://mietspiegel.berlin.de/wp-content/uploads/2026/05/mietspiegel2026.pdf",
      },
      {
        id: "berlin-2026-table",
        name: "Mietspiegeltabelle 2026",
        description: "Offizielle kompakte Tabelle",
        format: "PDF",
        declaredMimeType: "application/pdf",
        url: "https://mietspiegel.berlin.de/wp-content/uploads/2026/05/mietspiegeltabelle2026.pdf",
      },
      {
        id: "berlin-2026-calculator",
        name: "Offizielle Mietspiegelabfrage",
        description: "Online-Abfrageservice des Landes Berlin",
        format: "HTML",
        declaredMimeType: "text/html",
        url: "https://mietspiegel.berlin.de/",
      },
    ],
  },
  {
    id: "official-hamburg-2025",
    title: "Hamburger Mietenspiegel 2025",
    description:
      "Aktueller qualifizierter Mietenspiegel der Freien und Hansestadt Hamburg mit Broschüre, Tabelle und Online-Angebot.",
    modifiedAt: "2025-12-01T00:00:00.000Z",
    license: null,
    source: "official",
    publisher: "Freie und Hansestadt Hamburg · BSW",
    year: 2025,
    resources: [
      {
        id: "hamburg-2025-pdf",
        name: "Hamburger Mietenspiegel 2025",
        description: "Offizielle Broschüre",
        format: "PDF",
        declaredMimeType: "application/pdf",
        url: "https://dokumente.hamburg.de/resource/blob/1125234/4c27733314ff7c3144a31415cea3924c/d-mietenspiegel-broschuere-2025-data.pdf",
      },
      {
        id: "hamburg-2025-table",
        name: "Mietenspiegel-Tabelle 2025",
        description: "Offizielle kompakte Tabelle",
        format: "PDF",
        declaredMimeType: "application/pdf",
        url: "https://dokumente.hamburg.de/resource/blob/1125230/3093f3df24f683693c3b5eaac67bedd0/d-mietenspiegel-tabelle-2025-data.pdf",
      },
      {
        id: "hamburg-2025-info",
        name: "Offizielle Quellen- und Rechnerseite",
        description: "Aktuelle Seite der Stadt Hamburg",
        format: "HTML",
        declaredMimeType: "text/html",
        url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/behoerde-fuer-stadtentwicklung-und-wohnen/themen/wohnen/mieten/mietenspiegel",
      },
    ],
  },
  {
    id: "official-munich-2025",
    title: "Mietspiegel für München 2025",
    description:
      "Aktueller qualifizierter Mietspiegel, am 26.03.2025 vom Stadtrat anerkannt. Durchschnittliche Nettokaltmiete: 15,38 €/m². Offizielle Broschüre und Rechner der Landeshauptstadt München.",
    modifiedAt: "2025-03-26T00:00:00.000Z",
    license: null,
    source: "official",
    publisher: "Landeshauptstadt München",
    year: 2025,
    resources: [
      {
        id: "munich-2025-pdf",
        name: "Offizielle Mietspiegel-Broschüre 2025",
        description: "PDF-Broschüre der Landeshauptstadt München",
        format: "PDF",
        declaredMimeType: "application/pdf",
        url: "https://2025.mietspiegel-muenchen.de/broschueren/Mietspiegel_2025_Broschuere.pdf",
      },
      {
        id: "munich-2025-calculator",
        name: "Offizieller Online-Rechner 2025",
        description:
          "Externer Rechner; Ergebnisse werden nicht automatisch übernommen",
        format: "HTML",
        declaredMimeType: "text/html",
        url: "https://2025.mietspiegel-muenchen.de/",
      },
      {
        id: "munich-2025-info",
        name: "Quellen- und Gültigkeitsinformationen",
        description: "Offizielle Informationsseite der Landeshauptstadt",
        format: "HTML",
        declaredMimeType: "text/html",
        url: "https://stadt.muenchen.de/infos/mietspiegel.html",
      },
    ],
  },
];

export function searchOfficialRentIndexes(query: string) {
  const needle = query.trim().toLocaleLowerCase("de-DE");
  return catalog.filter(
    (item) =>
      !needle ||
      `${item.title} ${item.publisher} ${item.description}`
        .toLocaleLowerCase("de-DE")
        .includes(needle),
  );
}

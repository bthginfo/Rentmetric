import type {
  BerlinRangeRules,
  CologneRangeRow,
  CologneRentIndexRules,
  MunichRentIndexRules,
  RentIndexExtraction,
} from "./types";

const number = (value: string) => Number(value.replace(",", "."));

function parseMunich(text: string[]): MunichRentIndexRules | undefined {
  const joined = text.join("\n");
  if (!/Mietspiegel für München 2025/i.test(joined)) return;
  const baseRows = [text[9], text[10]].flatMap((pageText, pageIndex) =>
    pageText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => {
        const match = line.match(/^(\d{2,3})-(\d{2,3})\s+(.+)$/);
        if (!match) return null;
        const values = [...match[3].matchAll(/\d{1,2},\d{2}/g)].map((item) =>
          number(item[0]),
        );
        if (values.length !== 11) return null;
        return {
          areaFrom: Number(match[1]),
          areaTo: Number(match[2]),
          values,
          page: 10 + pageIndex,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  );
  if (baseRows.length < 60) return;
  return {
    kind: "munich_regression",
    version: "2025",
    yearBands: [
      { from: null, to: 1918, label: "bis 1918" },
      { from: 1919, to: 1929, label: "1919–1929" },
      { from: 1930, to: 1948, label: "1930–1948" },
      { from: 1949, to: 1966, label: "1949–1966" },
      { from: 1967, to: 1977, label: "1967–1977" },
      { from: 1978, to: 1988, label: "1978–1988" },
      { from: 1989, to: 1998, label: "1989–1998" },
      { from: 1999, to: 2008, label: "1999–2008" },
      { from: 2009, to: 2018, label: "2009–2018" },
      { from: 2019, to: 2021, label: "2019–2021" },
      { from: 2022, to: 2023, label: "2022–2023" },
    ],
    baseRows,
    adjustments: [
      ["location_good", "Gute Lage", 0.43, "Lage", 14],
      ["location_best", "Beste Lage", 2.1, "Lage", 14],
      ["location_central_average", "Zentrale durchschnittliche Lage", 0.8, "Lage", 14],
      ["location_central_good", "Zentrale gute Lage", 2.29, "Lage", 14],
      ["location_central_best", "Zentrale beste Lage", 2.7, "Lage", 14],
      ["high_rise", "Hochhaus oder höheres Gebäude", -0.96, "Gebäude", 14],
      ["housing_block", "Wohnblock", -1.13, "Gebäude", 14],
      ["very_simple_old", "Sehr einfacher Altbau", -2.58, "Haustyp", 15],
      ["simple_old", "Einfacher Altbau", -1.21, "Haustyp", 15],
      ["good_old", "Guter Altbau", 0.36, "Haustyp", 15],
      ["simple_postwar", "Einfacher Nachkriegsbau", -1.14, "Haustyp", 15],
      ["incomplete_heating", "Unvollständige Beheizung", -2.21, "Heizung", 16],
      ["underfloor_heating", "Fußbodenheizung", 1, "Heizung", 16],
      ["bath_special", "Besondere Zusatzausstattung im Bad", 0.62, "Bad", 16],
      ["towel_radiator", "Handtuchheizkörper", 0.62, "Bad", 16],
      ["walk_in_shower", "Separate bodengleiche Dusche", 0.62, "Bad", 16],
      ["large_or_second_bath", "Bad ab 6 m² oder zweites Bad", 0.62, "Bad", 16],
      ["modern_bath", "Modernisiertes Bad", 0.62, "Bad", 16],
      ["open_kitchen", "Offene Küche", 0.55, "Küche", 17],
      ["ceramic_hob", "Ceran- oder Induktionskochfeld", 0.53, "Küche", 17],
      ["fridge", "Kühlschrank", 0.53, "Küche", 17],
      ["dishwasher", "Geschirrspülmaschine", 0.53, "Küche", 17],
      ["no_flooring", "Ohne Fußbodenbelag", -1.54, "Boden", 17],
      ["simple_flooring", "Einfacher Boden", -1.12, "Boden", 17],
      ["good_flooring", "Guter Boden", 1.37, "Boden", 18],
      ["modern_flooring", "Modernisierter Boden", 1.86, "Boden", 18],
      ["outdoor_space", "Terrasse, Balkon oder Loggia ab 1 m²", 0.55, "Außenfläche", 18],
      ["special_equipment", "Elektrischer Rollladen oder Videogegensprechanlage", 0.77, "Weitere", 18],
      ["modern_windows", "Modernisierte Fenster", 2.1, "Weitere", 18],
    ].map(([key, label, amount, group, page]) => ({
      key: String(key), label: String(label), amount: Number(amount), group: String(group), page: Number(page),
    })),
    spreads: { nonCentral: { low: -2.81, high: 2.77 }, central: { low: -3.71, high: 3.8 } },
    applicability: {
      minArea: 20,
      maxArea: 160,
      excluded: ["möbliert", "Einfamilienhaus", "Untergeschoss", "ohne Küche/Bad/Heizung/Warmwasser"],
    },
  };
}

function parseCologneRows(pageText: string, page: number, groupSizes: Array<[number, number]>) {
  const rows: CologneRangeRow[] = [];
  const lines = pageText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let currentArea: { code: string; from: number; to: number } | undefined;
  const parsed: Omit<CologneRangeRow, "constructionGroup">[] = [];
  for (const line of lines) {
    const area = line.match(/^([A-E]) Wohnungen(?: um)? (\d+) m²\s*[–-]\s*(\d+(?:,\d+)?) m²\s*(.*)$/);
    let rest = line;
    if (area) {
      currentArea = { code: area[1], from: Number(area[2]), to: number(area[3]) };
      rest = area[4];
    }
    if (!currentArea) continue;
    const equipment = rest.match(/^([123])\s+(.+)$/);
    const rangeText = equipment ? equipment[2] : rest;
    const pairs = [...rangeText.matchAll(/(\d+,\d+)\s*[–-]\s*(\d+,\d+)/g)].map((match) => ({ low: number(match[1]), high: number(match[2]) }));
    if (pairs.length < 2) continue;
    parsed.push({
      areaCode: currentArea.code,
      areaFrom: currentArea.from,
      areaTo: currentArea.to,
      equipmentClass: equipment ? Number(equipment[1]) : null,
      ranges: pairs.length >= 3 ? { simple: pairs[0], medium: pairs[1], veryGood: pairs[2] } : { medium: pairs[0], veryGood: pairs[1] },
      page,
    });
  }
  let offset = 0;
  for (const [group, size] of groupSizes) {
    rows.push(...parsed.slice(offset, offset + size).map((row) => ({ ...row, constructionGroup: group })));
    offset += size;
  }
  return rows;
}

function parseCologne(text: string[]): CologneRentIndexRules | undefined {
  const joined = text.join("\n");
  if (!/Mietspiegel/i.test(joined) || !/Köln/i.test(joined)) return;
  const rows = [
    ...parseCologneRows(text[1], 2, [[1, 10], [2, 10], [3, 10], [4, 10]]),
    ...parseCologneRows(text[2], 3, [[5, 10], [6, 5]]),
  ];
  if (rows.length < 50) return;
  return {
    kind: "cologne_ranges",
    version: "2025",
    constructionGroups: [
      { group: 1, from: null, to: 1960 }, { group: 2, from: 1961, to: 1975 },
      { group: 3, from: 1976, to: 1989 }, { group: 4, from: 1990, to: 2004 },
      { group: 5, from: 2005, to: 2017 }, { group: 6, from: 2018, to: null },
    ],
    rows,
    equipmentClasses: { "1": "ohne Heizung", "2": "mit Heizung, Bad/WC", "3": "mit besonderer Ausstattung" },
    applicability: { minArea: 30, maxArea: 140, excluded: ["Kleinappartement", "Einfamilienhaus"] },
  };
}

function parseBerlin(text: string[]): BerlinRangeRules | undefined {
  const content = text.join("\n");
  if (!/Berliner Mietspiegeltabelle 2026/i.test(content)) return;
  const rows: BerlinRangeRules["rows"] = [];
  let yearFrom: number | null = null; let yearTo: number | null = null; let region: "east" | "west" | undefined;
  for (const line of content.split(/\r?\n/).map((item) => item.trim())) {
    const rowMatch = line.match(/^(\d{1,3})\s+(.+)$/); if (!rowMatch) continue;
    const rowNumber = Number(rowMatch[1]); const body = rowMatch[2];
    const ranges = [...body.matchAll(/(\d+,\d+)\s*€/g)].map((item) => number(item[1])); if (ranges.length !== 3) continue;
    const beforeArea = body.split(/(?:bis unter|ab |alle Wohnflächen)/i)[0];
    const years = [...beforeArea.matchAll(/\d{4}/g)].map((item) => Number(item[0]));
    if (years.length) { yearFrom = /^(?:Bis|bis)\s+\d{4}/.test(beforeArea) ? null : years[0]; yearTo = years.at(-1)!; region = /Ost/i.test(beforeArea) ? "east" : /West/i.test(beforeArea) ? "west" : undefined; }
    let areaFrom = 0; let areaTo: number | null = null;
    const under = body.match(/bis unter (\d+) m²/i); const between = body.match(/(\d+) m² bis unter (\d+) m²/i); const above = body.match(/ab (\d+) m²/i);
    if (between) { areaFrom = Number(between[1]); areaTo = Number(between[2]); } else if (under) areaTo = Number(under[1]); else if (above) areaFrom = Number(above[1]);
    const location = rowNumber <= 67 ? "simple" : rowNumber <= 129 ? "average" : "good";
    rows.push({ row: rowNumber, yearFrom, yearTo, region, areaFrom, areaTo, location, low: ranges[0], reference: ranges[1], high: ranges[2], page: 1 });
  }
  if (rows.length < 180) return;
  return { kind: "berlin_ranges", version: "2026", rows, applicability: { minArea: 0, maxArea: 1000, excluded: ["Ein- und Zweifamilienhäuser", "nicht voll ausgestattete Wohnungen ohne gesonderten Abschlag"] } };
}

export function addStructuredRentIndexData(extraction: RentIndexExtraction, pages: string[]) {
  const munich = parseMunich(pages);
  if (munich) return { ...extraction, detectedDocument: { municipality: "München" as const, version: "2025", confidence: 0.99, model: "regression" as const }, structuredRules: munich };
  const cologne = parseCologne(pages);
  if (cologne) return { ...extraction, detectedDocument: { municipality: "Köln" as const, version: "2025", confidence: 0.98, model: "range_table" as const }, structuredRules: cologne };
  const berlin = parseBerlin(pages);
  if (berlin) return { ...extraction, detectedDocument: { municipality: "Berlin" as const, version: "2026", confidence: 0.99, model: "range_table" as const }, structuredRules: berlin };
  const joined = pages.join("\n");
  if (/Mietenspiegel 2025[\s\S]+Freien und Hansestadt Hamburg/i.test(joined)) return { ...extraction, detectedDocument: { municipality: "Hamburg" as const, version: "2025", confidence: 0.99, model: "range_table" as const }, warnings: [...extraction.warnings, "Hamburger Matrix erkannt; leere Tabellenfelder erfordern vor Aktivierung eine manuelle Zuordnung."] };
  return extraction;
}

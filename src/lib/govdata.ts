import "server-only";
import { z } from "zod";

const endpoint = "https://www.govdata.de/ckan/api/3/action";

const resourceSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  mimetype: z.string().nullable().optional(),
  url: z.string().url(),
});

const datasetSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable().optional(),
  metadata_modified: z.string().nullable().optional(),
  license_id: z.string().nullable().optional(),
  resources: z.array(resourceSchema).default([]),
});

const searchSchema = z.object({ success: z.literal(true), result: z.object({ count: z.number(), results: z.array(datasetSchema) }) });
const showSchema = z.object({ success: z.literal(true), result: datasetSchema });

export type GovDataDataset = z.infer<typeof datasetSchema>;
export type GovDataResource = z.infer<typeof resourceSchema>;

function shortFormat(format?: string | null, url?: string) {
  const fromFormat = format?.split("/").pop()?.toUpperCase();
  if (fromFormat) return fromFormat.replace("JSON_LD", "JSON-LD");
  return url?.split(/[?#]/)[0].split(".").pop()?.toUpperCase() || "DATEI";
}

export function mapGovDataDataset(dataset: GovDataDataset) {
  return {
    id: dataset.id,
    title: dataset.title,
    description: dataset.notes?.trim() || "Keine Beschreibung hinterlegt.",
    modifiedAt: dataset.metadata_modified || null,
    license: dataset.license_id || null,
    resources: dataset.resources.filter((resource) => resource.url.startsWith("https://")).map((resource) => ({
      id: resource.id,
      name: resource.name || resource.description || shortFormat(resource.format, resource.url),
      description: resource.description || null,
      format: shortFormat(resource.format, resource.url),
      declaredMimeType: resource.mimetype || null,
      url: resource.url,
    })),
  };
}

export async function searchGovDataRentIndexes(query: string, start = 0, rows = 12) {
  const search = query.trim() ? `Mietspiegel ${query.trim()}` : "Mietspiegel";
  const url = new URL(`${endpoint}/package_search`);
  url.searchParams.set("q", search);
  url.searchParams.set("start", String(Math.max(0, start)));
  url.searchParams.set("rows", String(Math.min(25, Math.max(1, rows))));
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Rentmetric/1.0" }, signal: AbortSignal.timeout(8_000), cache: "no-store" });
  if (!response.ok) throw new Error("GovData ist gerade nicht erreichbar.");
  const parsed = searchSchema.parse(await response.json());
  return { count: parsed.result.count, results: parsed.result.results.map(mapGovDataDataset) };
}

export async function getGovDataResource(datasetId: string, resourceId: string) {
  const url = new URL(`${endpoint}/package_show`);
  url.searchParams.set("id", datasetId);
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Rentmetric/1.0" }, signal: AbortSignal.timeout(8_000), cache: "no-store" });
  if (!response.ok) throw new Error("GovData-Quelle konnte nicht geladen werden.");
  const dataset = showSchema.parse(await response.json()).result;
  const resource = dataset.resources.find((item) => item.id === resourceId && item.url.startsWith("https://"));
  if (!resource) throw new Error("GovData-Ressource wurde nicht gefunden.");
  return { dataset, resource };
}

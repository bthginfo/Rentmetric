import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

const [pathname, pattern = "mietspiegeltabelle|grundpreis|zuschlag|abschlag|baujahr|wohnfläche|wohnlage|berechnung"] = process.argv.slice(2);
if (!pathname) throw new Error("PDF path is required");
const buffer = new Uint8Array(await readFile(pathname));
const pdf = await getDocumentProxy(buffer);
const { totalPages, text } = await extractText(pdf);
const matcher = new RegExp(pattern, "iu");
const numericLines = text.flatMap((page, pageIndex) => page.split(/\r?\n/).map((line) => line.trim()).filter((line) => /\d/.test(line)).map((line) => ({ page: pageIndex + 1, line })));
const matches = text.map((page, index) => ({ page: index + 1, text: page.replace(/\s+/g, " ").trim() })).filter((entry) => matcher.test(entry.text)).map((entry) => ({ page: entry.page, excerpt: entry.text.slice(0, 2400) }));
process.stdout.write(JSON.stringify({ pathname, totalPages, characters: text.reduce((sum, page) => sum + page.length, 0), numericLines: numericLines.length, matches }, null, 2));

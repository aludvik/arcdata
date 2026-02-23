#!/usr/bin/env node
/**
 * One-time analysis: for each column in the built items data, compute the
 * maximum character length needed to display any cell without truncation.
 * Text with newlines is treated as multiple lines; the max length is the
 * longest single line (longest string not containing a newline).
 * Reads items from public/data/ (or public/), columns from public/columns.json.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function findDataDir() {
  const withData = path.join(ROOT, "public", "data");
  const withoutData = path.join(ROOT, "public");
  if (fs.existsSync(path.join(withData, "items.json"))) return withData;
  if (fs.existsSync(path.join(withoutData, "items.json"))) return withoutData;
  throw new Error("No items.json found in public/ or public/data/. Run npm run build-data first.");
}

/** Return the display string for a cell value. */
function cellDisplayString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    return Array.isArray(value) ? value.join(", ") : JSON.stringify(value);
  }
  return String(value);
}

/**
 * Max length in characters for one cell when displayed on multiple lines:
 * the length of the longest line (longest substring not containing \\n).
 */
function cellDisplayLength(value) {
  const s = cellDisplayString(value);
  if (!s) return 0;
  const lines = s.split("\n");
  return Math.max(0, ...lines.map((line) => line.length));
}

function main() {
  const dataDir = findDataDir();
  const itemsPath = path.join(dataDir, "items.json");
  const columnsPath = path.join(ROOT, "public", "columns.json");

  const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
  const columns = JSON.parse(fs.readFileSync(columnsPath, "utf8"));

  const maxLen = {};
  for (const col of columns) maxLen[col] = 0;

  for (const row of items) {
    for (const col of columns) {
      const v = row[col];
      const len = cellDisplayLength(v);
      if (len > maxLen[col]) maxLen[col] = len;
    }
  }

  // Build table: column, max length (chars), suggested min width (px at ~7px/char)
  const rows = columns.map((col) => ({
    column: col,
    maxChars: maxLen[col],
    suggestedPx: Math.ceil(maxLen[col] * 7),
  }));

  // Sort by maxChars descending for readability
  rows.sort((a, b) => b.maxChars - a.maxChars);

  const colWidth = 28;
  const numWidth = 10;
  const sep = "|";
  const header =
    sep +
    " Column".padEnd(colWidth) +
    sep +
    " Max length (chars) ".padStart(numWidth) +
    sep +
    " Suggested min width (px) ".padStart(10) +
    sep;
  const line = sep + "-".repeat(colWidth) + sep + "-".repeat(numWidth) + sep + "-".repeat(10) + sep;

  console.log(header);
  console.log(line);
  for (const r of rows) {
    const a = sep + " " + r.column.padEnd(colWidth - 2) + sep;
    const b = String(r.maxChars).padStart(numWidth - 1) + " " + sep;
    const c = String(r.suggestedPx).padStart(9) + " " + sep;
    console.log(a + b + c);
  }
  console.log("");
  console.log("Suggested min width uses ~7px per character (proportional font).");
}

main();

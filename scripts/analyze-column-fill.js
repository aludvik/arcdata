#!/usr/bin/env node
/**
 * For each column in the built items data, count how many rows have data
 * (non-empty value). Output a histogram table sorted by fill count ascending,
 * so mostly-empty columns appear first. Reads items from public/data/ (or public/),
 * columns from public/columns.json.
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

/** True if the cell is considered to have data (same as UI empty check). */
function hasData(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value === "") return false;
  return true;
}

function main() {
  const dataDir = findDataDir();
  const itemsPath = path.join(dataDir, "items.json");
  const columnsPath = path.join(ROOT, "public", "columns.json");

  const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
  const columns = JSON.parse(fs.readFileSync(columnsPath, "utf8"));
  const total = items.length;

  const fillCount = {};
  for (const col of columns) fillCount[col] = 0;

  for (const row of items) {
    for (const col of columns) {
      if (hasData(row[col])) fillCount[col]++;
    }
  }

  const rows = columns.map((col) => ({
    column: col,
    filled: fillCount[col],
    pct: total ? ((fillCount[col] / total) * 100).toFixed(1) : "0",
  }));

  rows.sort((a, b) => a.filled - b.filled);

  const colWidth = 32;
  const numWidth = 8;
  const pctWidth = 8;
  const sep = "|";
  const header =
    sep +
    " Column".padEnd(colWidth) +
    sep +
    " Filled".padStart(numWidth) +
    sep +
    " %".padStart(pctWidth) +
    sep;
  const line =
    sep + "-".repeat(colWidth) + sep + "-".repeat(numWidth) + sep + "-".repeat(pctWidth) + sep;

  console.log(`Total rows: ${total}\n`);
  console.log(header);
  console.log(line);
  for (const r of rows) {
    const a = sep + " " + r.column.padEnd(colWidth - 2) + sep;
    const b = String(r.filled).padStart(numWidth - 1) + " " + sep;
    const c = (r.pct + "%").padStart(pctWidth - 1) + " " + sep;
    console.log(a + b + c);
  }
}

main();

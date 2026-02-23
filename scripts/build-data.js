#!/usr/bin/env node
/**
 * Clones RaidTheory/arcraiders-data via git, reads item JSON files from the
 * clone, and writes one row per item. Only columns listed in public/columns.json
 * are included in the output.
 * Nested structures (e.g. effects, recipe) are formatted as "name: value"
 * lists; locale maps (name, description) use the configured user language.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_URL = "https://github.com/RaidTheory/arcraiders-data.git";
const REPO_DIR = path.join(__dirname, "..", "repos", "arcraiders-data");
const ITEMS_DIR = "items";
const OUT_DIR = path.join(__dirname, "..", "public", "data");

/** User language for localization. Set via ARC_DATA_LANG (default: en). */
const USER_LANG = process.env.ARC_DATA_LANG || "en";

function isLocaleMap(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.includes("en");
}

function pickLocale(obj) {
  return obj[USER_LANG] ?? obj.en ?? obj.value ?? Object.values(obj)[0] ?? "";
}

/** Format effects object as "effect name: value" lines (localized name, then .value). */
function formatEffects(effects) {
  if (effects == null || typeof effects !== "object" || Array.isArray(effects)) {
    return "";
  }
  return Object.entries(effects)
    .map(([key, obj]) => {
      if (obj == null || typeof obj !== "object") return `${key}: ${obj}`;
      const label = isLocaleMap(obj) ? pickLocale(obj) : key;
      const val = Object.prototype.hasOwnProperty.call(obj, "value") ? obj.value : "";
      return `${label}: ${val}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Format a key–value object (e.g. recipe, recyclesInto) as "key: value" lines. */
function formatKeyValueList(obj) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj == null ? "" : JSON.stringify(obj);
  }
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/**
 * Build one row per item: only top-level keys as columns. Primitives and
 * arrays stay as-is; locale maps (name, description) → user language;
 * effects → "effect name: value" list; other objects → "key: value" list.
 */
function toRow(data) {
  const row = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      row[key] = value;
      continue;
    }
    if (typeof value !== "object") {
      row[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      row[key] = value;
      continue;
    }
    if (isLocaleMap(value)) {
      row[key] = pickLocale(value);
      continue;
    }
    if (key === "effects") {
      row[key] = formatEffects(value);
      continue;
    }
    row[key] = formatKeyValueList(value);
  }
  return row;
}

function ensureRepo() {
  const itemsPath = path.join(REPO_DIR, ITEMS_DIR);
  if (fs.existsSync(itemsPath)) {
    console.log("Updating arcraiders-data repo…");
    const r = spawnSync("git", ["pull"], { cwd: REPO_DIR, stdio: "inherit" });
    if (r.status !== 0) throw new Error("git pull failed");
    return;
  }
  console.log("Cloning arcraiders-data repo…");
  fs.mkdirSync(path.dirname(REPO_DIR), { recursive: true });
  const r = spawnSync("git", ["clone", "--depth", "1", REPO_URL, REPO_DIR], {
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error("git clone failed");
}

function listItemFiles() {
  const itemsPath = path.join(REPO_DIR, ITEMS_DIR);
  return fs
    .readdirSync(itemsPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(itemsPath, e.name));
}

function main() {
  const COLUMNS_PATH = path.join(__dirname, "..", "public", "columns.json");
  const EXCLUDE_TYPES_PATH = path.join(__dirname, "..", "public", "exclude_types.json");
  if (!fs.existsSync(COLUMNS_PATH)) {
    throw new Error(`Missing ${COLUMNS_PATH}. Create it with an array of column names to include.`);
  }
  const configColumns = JSON.parse(fs.readFileSync(COLUMNS_PATH, "utf8"));

  if (!fs.existsSync(EXCLUDE_TYPES_PATH)) {
    throw new Error(`Missing ${EXCLUDE_TYPES_PATH}. Create it with an array of item type strings to exclude, or provide an empty array if none.`);
  }
  const excludeTypes = JSON.parse(fs.readFileSync(EXCLUDE_TYPES_PATH, "utf8"));

  ensureRepo();
  const files = listItemFiles();
  console.log(`Found ${files.length} item files.`);

  const rows = [];
  const idToName = {};
  let skippedByType = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      const row = toRow(data);
      const itemType = row.type;
      if (itemType && excludeTypes.includes(itemType)) {
        skippedByType++;
        continue;
      }
      const id = data.id ?? row.id;
      const name = row.name;
      if (id != null && name != null) {
        const idKey = String(id);
        idToName[idKey] = name;
      }
      const filteredRow = {};
      for (const col of configColumns) {
        if (Object.prototype.hasOwnProperty.call(row, col)) {
          filteredRow[col] = row[col];
        }
      }
      rows.push(filteredRow);
    } catch (e) {
      console.warn(`Skip ${path.basename(filePath)}: ${e.message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  Parsed ${i + 1}/${files.length}…`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "items.json"),
    JSON.stringify(rows, null, 0),
    "utf8"
  );
  const meta = { lang: USER_LANG, itemCount: rows.length, columnCount: configColumns.length };
  fs.writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "idToName.json"),
    JSON.stringify(idToName, null, 0),
    "utf8"
  );
  console.log(`Wrote ${rows.length} items and ${configColumns.length} columns to public/data/ (lang: ${USER_LANG})`);
  if (skippedByType > 0) {
    console.log(`Skipped ${skippedByType} items by type filter (from ${EXCLUDE_TYPES_PATH}).`);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

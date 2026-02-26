#!/usr/bin/env node
/**
 * Clones RaidTheory/arcraiders-data via git, reads item JSON files from the
 * clone, and writes a normalized, size-reduced JSON model for the frontend.
 *
 * Responsibilities:
 * - Dataset reduction: filter out unwanted item types and top-level properties.
 * - Light normalization: resolve locale maps to a single language and keep
 *   reference fields as structured objects keyed by IDs.
 * - Index building: precompute simple lookup maps (e.g. ID → name) needed by
 *   the app at runtime so they don't need to be built on startup.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_URL = "https://github.com/RaidTheory/arcraiders-data.git";
const REPO_DIR = path.join(__dirname, "..", "repos", "arcraiders-data");
const ITEMS_DIR = "items";
const HIDEOUT_DIR = "hideout";
const OUT_DIR = path.join(__dirname, "..", "public", "data");
const ITEM_REF_FIELDS = ["recipe", "recyclesInto", "salvagesInto", "upgradeCost", "repairCost"];

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

/** Format a key–value object (e.g. recipe, recyclesInto) as "key: value" lines. */
function formatKeyValueList(obj) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj == null ? "" : JSON.stringify(obj);
  }
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

/**
 * Normalize a raw item into a flat object keyed by top-level property names.
 *
 * Rules:
 * - Primitives and arrays stay as-is.
 * - Locale maps (e.g. name, description) are resolved to a single language.
 * - The `effects` field is formatted as a multi-line "effect name: value" list.
 * - Known reference fields (e.g. recipe, recyclesInto) remain structured
 *   objects keyed by item IDs — no ID → name substitution and no flattening.
 * - Other plain objects fall back to a simple "key: value" representation.
 */
function normalizeItem(data) {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      normalized[key] = value;
      continue;
    }
    if (typeof value !== "object") {
      normalized[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      normalized[key] = value;
      continue;
    }
    if (isLocaleMap(value)) {
      normalized[key] = pickLocale(value);
      continue;
    }
    if (ITEM_REF_FIELDS.includes(key)) {
      // Keep structured reference objects (e.g. recipe) as-is so the app can
      // decide how to render them using indices like itemIdToName.json.
      normalized[key] = value;
      continue;
    }
    normalized[key] = formatKeyValueList(value);
  }
  return normalized;
}

function ensureRepo() {
  const itemsPath = path.join(REPO_DIR, ITEMS_DIR);
  if (fs.existsSync(itemsPath)) {
    console.log("Updating arcraiders-data repo…");
    const r = spawnSync("git", ["pull", "--ff-only"], { cwd: REPO_DIR, stdio: "inherit" });
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

function listHideoutFiles() {
  const hideoutPath = path.join(REPO_DIR, HIDEOUT_DIR);
  return fs
    .readdirSync(hideoutPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(hideoutPath, e.name));
}

function loadConfig() {
  const COLUMNS_PATH = path.join(__dirname, "..", "public", "columns.json");
  const EXCLUDE_TYPES_PATH = path.join(__dirname, "..", "public", "exclude_types.json");

  if (!fs.existsSync(COLUMNS_PATH)) {
    throw new Error(`Missing ${COLUMNS_PATH}. Create it with an array of column names to include.`);
  }
  const configColumns = JSON.parse(fs.readFileSync(COLUMNS_PATH, "utf8"));

  if (!fs.existsSync(EXCLUDE_TYPES_PATH)) {
    throw new Error(
      `Missing ${EXCLUDE_TYPES_PATH}. Create it with an array of item type strings to exclude, or provide an empty array if none.`,
    );
  }
  const excludeTypes = JSON.parse(fs.readFileSync(EXCLUDE_TYPES_PATH, "utf8"));

  return { configColumns, excludeTypes, excludeTypesPath: EXCLUDE_TYPES_PATH };
}

function shouldSkip(normalized, excludeTypes) {
  const itemType = normalized.type;
  const value = normalized.value;
  return (itemType && excludeTypes.includes(itemType)) || (value === null || value === undefined);
}

function buildItemsAndIdIndex(files, configColumns, excludeTypes) {
  const items = [];
  const idToName = {};
  let skippedByType = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);

      const id = data.id;
      let name = data.name;
      if (name && typeof name === "object" && !Array.isArray(name) && isLocaleMap(name)) {
        name = pickLocale(name);
      }
      if (id != null && name != null) {
        const idKey = String(id);
        idToName[idKey] = name;
      }

      const normalized = normalizeItem(data);
      if (shouldSkip(normalized, excludeTypes)) {
        skippedByType++;
        continue;
      }

      const filtered = {};
      for (const col of configColumns) {
        if (Object.prototype.hasOwnProperty.call(normalized, col)) {
          filtered[col] = normalized[col];
        }
      }
      items.push(filtered);
    } catch (e) {
      console.warn(`Skip ${path.basename(filePath)}: ${e.message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  Parsed ${i + 1}/${files.length}…`);
  }

  return { items, idToName, skippedByType };
}

function buildCraftBenchIndex(files) {
  const craftBenchIdToName = {};

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);

      const id = data.id;
      let name = data.name;
      if (name && typeof name === "object" && !Array.isArray(name) && isLocaleMap(name)) {
        name = pickLocale(name);
      }

      if (id != null && name != null) {
        const idKey = String(id);
        craftBenchIdToName[idKey] = name;
      }
    } catch (e) {
      console.warn(`Skip hideout ${path.basename(filePath)}: ${e.message}`);
    }
  }

  return craftBenchIdToName;
}

function main() {
  const { configColumns, excludeTypes, excludeTypesPath } = loadConfig();

  ensureRepo();
  const files = listItemFiles();
  console.log(`Found ${files.length} item files.`);

  const { items, idToName, skippedByType } = buildItemsAndIdIndex(
    files,
    configColumns,
    excludeTypes,
  );

  const hideoutFiles = listHideoutFiles();
  console.log(`Found ${hideoutFiles.length} hideout files.`);
  const craftBenchIdToName = buildCraftBenchIndex(hideoutFiles);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "items.json"),
    JSON.stringify(items, null, 0),
    "utf8"
  );
  const meta = {
    lang: USER_LANG,
    itemCount: items.length,
    columnCount: configColumns.length,
    craftBenchCount: Object.keys(craftBenchIdToName).length,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "itemIdToName.json"),
    JSON.stringify(idToName, null, 0),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "craftBenchIdToName.json"),
    JSON.stringify(craftBenchIdToName, null, 0),
    "utf8"
  );
  console.log(`Wrote ${items.length} items and ${configColumns.length} columns to public/data/ (lang: ${USER_LANG})`);
  if (skippedByType > 0) {
    console.log(`Skipped ${skippedByType} items by type filter (from ${excludeTypesPath}).`);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

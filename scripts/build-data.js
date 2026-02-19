#!/usr/bin/env node
/**
 * Clones RaidTheory/arcraiders-data via git, reads item JSON files from the
 * clone, flattens each into a row (union of all property paths), and writes
 * items.json + columns.json for fast local querying.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_URL = "https://github.com/RaidTheory/arcraiders-data.git";
const REPO_DIR = path.join(__dirname, "..", "repos", "arcraiders-data");
const ITEMS_DIR = "items";
const OUT_DIR = path.join(__dirname, "..", "public");

/** Locale codes used in arcraiders-data (for detecting locale maps). */
const LOCALE_CODES = new Set([
  "da", "de", "en", "es", "fr", "he", "hr", "it", "ja", "kr", "no", "pl",
  "pt", "pt-BR", "ru", "sr", "tr", "uk", "zh-CN", "zh-TW",
]);

/** User language for localization. Set via ARC_DATA_LANG (default: en). */
const USER_LANG = process.env.ARC_DATA_LANG || "en";

function isLocaleMap(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.every((k) => k === "value" || LOCALE_CODES.has(k));
}

function pickLocale(obj) {
  return obj[USER_LANG] ?? obj.en ?? obj.value ?? Object.values(obj)[0] ?? "";
}

/**
 * Flatten an object into a single level with dot-separated keys.
 * Objects that look like locale maps (keys = locale codes or "value") are
 * collapsed to a single key using USER_LANG; if they have a "value" key
 * (the raw stat, e.g. "10s"), that is kept as prefix.value.
 */
function flatten(obj, prefix = "") {
  const out = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    out[prefix] = obj;
    return out;
  }
  if (isLocaleMap(obj)) {
    out[prefix] = pickLocale(obj);
    if (Object.prototype.hasOwnProperty.call(obj, "value")) {
      out[prefix + ".value"] = obj.value;
    }
    return out;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, fullKey));
    } else {
      out[fullKey] = value;
    }
  }
  return out;
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
  ensureRepo();
  const files = listItemFiles();
  console.log(`Found ${files.length} item files.`);

  const rows = [];
  const keySet = new Set();

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      const flat = flatten(data);
      rows.push(flat);
      for (const k of Object.keys(flat)) keySet.add(k);
    } catch (e) {
      console.warn(`Skip ${path.basename(filePath)}: ${e.message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  Parsed ${i + 1}/${files.length}…`);
  }

  const columns = [...keySet].sort((a, b) => {
    const priority = ["id", "name", "type", "rarity", "value", "weightKg", "stackSize"];
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "items.json"),
    JSON.stringify(rows, null, 0),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "columns.json"),
    JSON.stringify(columns, null, 2),
    "utf8"
  );
  const meta = { lang: USER_LANG, itemCount: rows.length, columnCount: columns.length };
  fs.writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );
  console.log(`Wrote ${rows.length} items and ${columns.length} columns to public/ (lang: ${USER_LANG})`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

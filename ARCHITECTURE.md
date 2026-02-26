## Architecture Overview

This document describes the current architecture of the **Arc Raiders Item Browser** project: tech stack, data flow, and how the main components interact.

### High-Level Components

- **Data source (external)**  
  - Git repository: `RaidTheory/arcraiders-data`  
  - Contains structured JSON data for ARC Raiders items in `items/`.

- **Data builder (local, Node.js)**  
  - Script: `scripts/build-data.js`  
  - Responsibilities:
    - Clone or update the `arcraiders-data` repo into `repos/arcraiders-data/`.
    - Read and lightly normalize all item JSON files from `repos/arcraiders-data/items/`, and build indices from hideout definitions in `repos/arcraiders-data/hideout/`.
    - Reduce the dataset by:
      - Filtering output to only columns listed in `public/columns.json` (manually maintained).
      - Excluding items whose `type` is configured in `public/exclude_types.json`.
      - Resolving locale maps (e.g. `name`, `description`) to a single language.
    - Preserve structured reference fields (e.g. `recipe`, `recyclesInto`, `salvagesInto`, `upgradeCost`, `repairCost`) as objects keyed by item IDs.
    - Emit a compact, index-backed model into the `public/data/` directory (`items.json`, `meta.json`, `idToName.json`, `craftBenchIdToName.json`).

- **Static web app (frontend)**  
  - Files: `public/index.html`, `public/app.js`, `public/styles.css`  
  - Responsibilities:
    - Load preprocessed JSON (`data/items.json`, `columns.json`, `meta.json`).
    - Render a spreadsheet-like table of items.
    - Apply client-side keyword search to filter rows.

- **Static server (local)**  
  - Script: `scripts/serve.js`  
  - Responsibilities:
    - Serve the `public/` directory over HTTP on `http://localhost:3777`.

### Tech Stack

- **Runtime**: Node.js (no external npm dependencies required right now).
- **Data ingestion**: Node core modules (`fs`, `path`, `child_process`, `http`, `url`).
- **Frontend**: Vanilla HTML/CSS/JavaScript; no framework.
- **Data format**: JSON for both source data and derived artifacts.

### Data Flow

1. **Clone / update source data**
   - `scripts/build-data.js` ensures a local clone of the upstream data:
     - If `repos/arcraiders-data/items/` exists, it runs `git pull` in that directory.
     - Otherwise, it runs `git clone --depth 1 https://github.com/RaidTheory/arcraiders-data.git repos/arcraiders-data`.

2. **Parse and normalize items**
   - The builder reads every `*.json` file in `repos/arcraiders-data/items/`.
   - For each raw item object, it produces a **normalized item** using `normalizeItem(data)` with these rules:
     - **Top-level keys only as columns**  
       - Each top-level property on the item JSON becomes one column (e.g. `id`, `name`, `description`, `type`, `rarity`, `value`, `weightKg`, `stackSize`, `effects`, `recipe`, `recyclesInto`, `salvagesInto`, `foundIn`, `imageFilename`, `updatedAt`, etc.).
       - No nested paths (e.g. `effects.Duration.value`) are exposed as columns.
     - **Localization (locale maps)**  
       - Objects that look like locale maps (keys are language codes like `en`, `de`, `fr`, …, plus optional `value`) are collapsed to a single string using:
         - `ARC_DATA_LANG` environment variable, e.g. `en`, `de`, `es`.
         - Fallback to English (`en`) and then to any available value if needed.
       - This behavior is used for properties like `name` and `description`.
     - **Effects formatting**  
       - The `effects` top-level property is an object whose keys are effect identifiers (e.g. `"Duration"`, `"Stamina Regeneration"`), and values are locale maps that also include a `value` field (e.g. `"10s"`, `"5/s"`).
       - The builder converts this into a single multi-line string in the `effects` column:
         - Each line is:  
           `"<effect name in selected language>: <value>"`  
           Example (English):  
           `Duration: 10s`  
           `Stamina Regeneration: 5/s`
     - **Structured reference fields**  
       - Reference-like top-level objects (e.g. `recipe`, `recyclesInto`, `salvagesInto`, `upgradeCost`, `repairCost`) are **preserved as structured objects keyed by item IDs**.
       - These fields are not stringified and do not substitute IDs for names; the app uses indices like `idToName.json` to render them.
     - **Other objects, primitives and arrays**  
       - Primitive values (string, number, boolean) are copied directly.
       - Arrays are preserved as arrays.
       - Other non-reference objects fall back to a simple `"key: value"` representation for readability where helpful.

3. **Emit derived artifacts**
   - The builder reads `public/columns.json` (manually maintained) to determine which columns to include.
   - It also reads `public/exclude_types.json` (array of strings) and drops any item whose normalized `type` matches one of those values.
   - After processing all items, the builder writes under `public/data/`:
     - `items.json` – array of normalized item objects, each containing only keys listed in `public/columns.json`. Structured reference fields remain as ID-keyed objects.
     - `meta.json` – small metadata object:
       - `lang`: language used for localization (from `ARC_DATA_LANG`).
       - `itemCount`: number of items exported.
       - `columnCount`: number of columns (from `public/columns.json`).
       - `craftBenchCount`: number of craft benches indexed from hideout data.
     - `idToName.json` – flat object mapping each item’s internal `id` to its localized display `name`, using the same localization rules as `items.json` (driven by `ARC_DATA_LANG`). This is the primary runtime index for resolving ID-based relationships (e.g. `recipe`, `recyclesInto`, `salvagesInto`) to human-readable names in the UI.
     - `craftBenchIdToName.json` – flat object mapping each craft bench’s internal `id` (from `hideout/*.json`) to its localized display `name`, using the same localization rules as items (driven by `ARC_DATA_LANG`). This index is used by the React app to render craft bench IDs (e.g. the `craftBench` column) as friendly names.
   - The builder does **not** emit `columns.json`; that file is maintained manually at `public/columns.json`.

4. **Serve and display**
   - `scripts/serve.js` runs a minimal HTTP server that serves the `public/` directory on port `3777`.
   - The frontend loads:
     - `data/items.json` – all rows.
     - `columns.json` – table header definitions (from `public/columns.json`).
     - `data/meta.json` – to potentially drive UI or debugging.

### Frontend Behavior

- **Initialization (`public/app.js`)**
  - Fetches `data/items.json` and `columns.json` in parallel.
  - Stores them in memory (`items`, `columns`).
  - Renders:
    - `<thead>` with one `<th>` per column.
    - `<tbody>` with one `<tr>` per item and `<td>` per column.
  - Each cell:
    - Displays a primitive string/number as-is.
    - Displays objects/arrays as a JSON string.
    - Uses the full text as the `title` attribute for hover tooltips (helpful for multi-line or truncated values like `effects` lists).

- **Search / filtering**
  - A search input at the top of the page collects a keyword string.
  - The app lowercases and splits the input into space-separated terms.
  - For each item row:
    - Concatenates all column values (stringifying non-primitives as needed).
    - Converts to lowercase.
    - Keeps the row if **every** search term is a substring of this combined text.
  - The table is re-rendered on each input change, and a small counter shows `<visible> / <total> items`.

### Configuration & Conventions

- **Language selection**
  - Controlled solely at build-time via `ARC_DATA_LANG`.
  - If you change `ARC_DATA_LANG`, you must rerun `npm run build-data` for the change to take effect.

- **Source data location**
  - The upstream data repo is always expected at `repos/arcraiders-data/`.
  - That directory is **git-ignored**; it is treated as a build artifact/cache, not part of this project’s own version control.

- **Extensibility guidelines**
  - When introducing new derived fields or transforming existing ones:
    - Prefer keeping **top-level-only columns** to avoid column explosion.
    - For additional structured fields that reference other items, prefer **keeping structured objects keyed by IDs** and using indices (like `idToName.json`) at render time instead of flattening them to strings.
    - If you add new localized fields, follow the existing locale map detection (`ARC_DATA_LANG`).
  - When modifying the build pipeline or frontend behavior in a substantial way, keep this document and `README.md` in sync so both humans and agents have up-to-date context.

### React frontend expectations for structured data

- The React table in `src/react/` consumes:
  - `data/items.json` – normalized items with:
    - Locale-resolved scalar fields (e.g. `name`, `description`).
    - Structured reference fields (`recipe`, `recyclesInto`, `salvagesInto`, `upgradeCost`, `repairCost`) as objects keyed by item IDs with scalar payloads.
  - `data/idToName.json` – item ID → localized name index used to render item reference fields.
  - `data/craftBenchIdToName.json` – craft bench ID → localized name index used to render craft bench IDs as display names.
- Rendering rules for these structured fields (e.g. how to order entries, how to display quantities) are owned by the React components, not the build step.


## Arc Raiders Item Browser

This project is a small local web application for browsing and searching **ARC Raiders** item data.  
It consumes the community-maintained JSON data from the ARC Raiders Tech Test 2 and presents it in a fast, spreadsheet-like interface with keyword search.

### Features

- **Local-first**: Runs entirely on your machine; no backend service required.
- **Spreadsheet-style table**: One row per item, one column per top-level property.
- **Fast keyword search**: Filters items as you type across all visible fields.
- **Configurable language**: Item names and descriptions are localized to a single user-selected language.
 - **Configurable item filtering**: Certain item types can be excluded entirely from the table via `public/exclude_types.json`.

### Prerequisites

- **Node.js** (v18+ recommended)
- **git** (used to clone the source data repository)

### Getting Started

From the project root:

```bash
# 0. Install dependencies (once)
npm install

# 1. Fetch and preprocess game data into a flat JSON model
#    and build the React frontend bundle
npm run build

# 2. Start the local static server
npm run start

# Or do both in one step (rebuild + serve)
npm run dev
```

Then open `http://localhost:3777` in your browser to use the app.

### Data Processing Pipeline (High Level)

- On `npm run build-data`:
  - The script clones or updates `RaidTheory/arcraiders-data` into `repos/arcraiders-data/`.
  - It reads all JSON files from `repos/arcraiders-data/items/`.
  - For each item it:
    - Keeps **only top-level keys** as columns (e.g. `id`, `name`, `description`, `effects`, `recipe`, `recyclesInto`).
    - Resolves localized fields (`name`, `description`, etc.) to a **single language**.
    - Formats some non-relational structured fields like `effects` into human-readable `"name: value"` lists.
    - Preserves reference-like structured fields (`recipe`, `recyclesInto`, `salvagesInto`, `upgradeCost`, `repairCost`) as objects keyed by item IDs, without substituting IDs for names.
    - Filters output to **only columns listed** in `public/columns.json` (edited manually).
    - Skips any item whose `type` is listed in `public/exclude_types.json` (an array of type strings to exclude).
  - The processed result is written to:
    - `public/data/items.json` – array of normalized items shown in the UI.
    - `public/data/meta.json` – metadata (e.g. chosen language, item count).
    - `public/data/idToName.json` – object mapping each item’s internal `id` to its localized display `name`, used by the React app to resolve ID-based relationships (e.g. recipes) at render time.
  - Column definitions live in `public/columns.json` (manually maintained; the build script does not emit this file).

The frontend is a small React app: source in `src/react/` is bundled (via esbuild) into `public/app-react.js`, which is loaded by `public/index.html`. It loads `data/items.json` and `columns.json` from `public/`, renders a table with dynamic columns, and applies client-side filtering as you type into the search box.

### Localization

The build step supports choosing a single display language via the `ARC_DATA_LANG` environment variable:

```bash
# English (default)
npm run build-data

# German
ARC_DATA_LANG=de npm run build-data

# Spanish
ARC_DATA_LANG=es npm run build-data
```

If the requested language is missing for a particular field, the builder falls back to English where possible.

### Data Source & Attribution

Item data comes from the community project:

- [Arc Raiders game data (RaidTheory/arcraiders-data)](https://github.com/RaidTheory/arcraiders-data)

As requested by that repository, if you use this data, please include attribution by linking to:

```text
https://github.com/RaidTheory/arcraiders-data and https://arctracker.io
```

All game content, including but not limited to game mechanics, items, names, and imagery, is copyright © Embark Studios AB. This project is a community resource and is not affiliated with or endorsed by Embark Studios AB.


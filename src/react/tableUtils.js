import { formatCellValue } from "./components/cellValue.js";

const SEARCH_COLUMNS = ["name", "type", "rarity", "craftBench"];

/**
 * Augment each row with cached rendered cell text so display and search can reuse it.
 * Returns a new array; only augments when idToName and benches are objects.
 */
export function augmentRowsWithRendered(items, columns, idToName, benches) {
  if (
    idToName == null ||
    benches == null ||
    typeof idToName !== "object" ||
    typeof benches !== "object"
  ) {
    return items;
  }
  return items.map((row) => {
    const _rendered = {};
    const _renderedExpanded = {};
    for (const col of columns) {
      _rendered[col] = formatCellValue(row, col, idToName, benches);
      _renderedExpanded[col] = formatCellValue(row, col, idToName, benches, { expanded: true });
    }
    return { ...row, _rendered, _renderedExpanded };
  });
}

export function rowSearchText(row, columns) {
  return columns
    .map((col) => {
      const v = row[col];
      if (v == null) return "";
      if (typeof v === "object") {
        return Array.isArray(v) ? v.join(", ") : JSON.stringify(v);
      }
      return String(v);
    })
    .join(" ")
    .toLowerCase();
}

/**
 * Build searchable text from rendered (display) values for the given row.
 * Uses the same formatting as cell display so e.g. craftBench is searched as "Gunsmith" not "weapon_bench".
 * When row has cached _rendered, uses that to avoid recomputing.
 */
export function rowSearchTextRendered(row, columns, idToName, benches) {
  const useCache =
    row._rendered &&
    columns.every((col) => row._rendered[col] != null);
  if (useCache) {
    return columns
      .map((col) => row._rendered[col].text)
      .join(" ")
      .toLowerCase();
  }
  return columns
    .map((col) => formatCellValue(row, col, idToName, benches).text)
    .join(" ")
    .toLowerCase();
}

export function filterItems(items, keyword, idToName, benches) {
  const terms = keyword
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return items;

  const useRendered =
    idToName != null && benches != null && typeof idToName === "object" && typeof benches === "object";

  return items.filter((row) => {
    const text = useRendered
      ? rowSearchTextRendered(row, SEARCH_COLUMNS, idToName, benches)
      : rowSearchText(row, SEARCH_COLUMNS);
    return terms.every((t) => text.includes(t));
  });
}

export function isNumericValue(v) {
  if (v === null || v === undefined || v === "") return true;
  const n = Number(v);
  return !Number.isNaN(n) && Number.isFinite(n);
}

export function detectNumericColumns(items, columns) {
  const numericColumns = new Set();
  for (const col of columns) {
    if (items.every((row) => isNumericValue(row[col]))) {
      numericColumns.add(col);
    }
  }
  return numericColumns;
}

export function compareValues(a, b, col, numericColumns) {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";

  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (numericColumns.has(col)) {
    const na = Number(a);
    const nb = Number(b);
    return na - nb;
  }

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

export const SELECTION_COLUMN_ID = "_select";

export function sortRows(rows, sortColumn, sortDirection, columns, numericColumns, options = {}) {
  const { selectedItemIds = new Set(), nameColumn = "name" } = options;

  if (!sortColumn) {
    sortColumn = SELECTION_COLUMN_ID;
  };

  if (sortColumn === SELECTION_COLUMN_ID) {
    const out = [...rows];
    out.sort((a, b) => {
      const aSel = selectedItemIds.has(a.id);
      const bSel = selectedItemIds.has(b.id);
      if (aSel !== bSel) {
        const cmp = aSel ? -1 : 1;
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const nameCmp = compareValues(
        a[nameColumn],
        b[nameColumn],
        nameColumn,
        numericColumns,
      );
      return sortDirection === "asc" ? nameCmp : -nameCmp;
    });
    return out;
  }

  if (!columns.includes(sortColumn)) return rows;

  const out = [...rows];
  out.sort((a, b) => {
    const cmp = compareValues(a[sortColumn], b[sortColumn], sortColumn, numericColumns);
    return sortDirection === "asc" ? cmp : -cmp;
  });
  return out;
}


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

export function filterItems(items, columns, keyword) {
  const terms = keyword
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return items;

  return items.filter((row) => {
    const text = rowSearchText(row, columns);
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

export function sortRows(rows, sortColumn, sortDirection, columns, numericColumns) {
  if (!sortColumn || !columns.includes(sortColumn)) return rows;

  const out = [...rows];
  out.sort((a, b) => {
    const cmp = compareValues(a[sortColumn], b[sortColumn], sortColumn, numericColumns);
    return sortDirection === "asc" ? cmp : -cmp;
  });
  return out;
}


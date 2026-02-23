/**
 * Arc Raiders item browser: load flat items + columns, render spreadsheet,
 * filter by keyword, and sort by column (numeric or lexicographic).
 */

const thead = document.getElementById("thead");
const tbody = document.getElementById("tbody");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");
const table = document.getElementById("table");

let items = [];
let columns = [];
/** Per-column: true if every non-empty value in the column is a valid number. */
let numericColumns = new Set();
/** Current sort column key (default: first column). */
let sortColumn = null;
/** 'asc' | 'desc'. */
let sortDirection = "asc";

function rowSearchText(row) {
  return columns
    .map((col) => {
      const v = row[col];
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    })
    .join(" ")
    .toLowerCase();
}

function filterItems(keyword) {
  const terms = keyword
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((row) => {
    const text = rowSearchText(row);
    return terms.every((t) => text.includes(t));
  });
}

function isNumericValue(v) {
  if (v === null || v === undefined || v === "") return true;
  const n = Number(v);
  return !Number.isNaN(n) && Number.isFinite(n);
}

function detectNumericColumns() {
  numericColumns = new Set();
  for (const col of columns) {
    if (items.every((row) => isNumericValue(row[col]))) numericColumns.add(col);
  }
}

function compareValues(a, b, col) {
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

function sortRows(rows) {
  if (!sortColumn || !columns.includes(sortColumn)) return rows;
  const out = [...rows];
  out.sort((a, b) => {
    const cmp = compareValues(a[sortColumn], b[sortColumn], sortColumn);
    return sortDirection === "asc" ? cmp : -cmp;
  });
  return out;
}

function setSort(col) {
  if (sortColumn === col) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = col;
    sortDirection = "asc";
  }
}

function renderRow(row) {
  const tr = document.createElement("tr");
  for (const col of columns) {
    const td = document.createElement("td");
    const v = row[col];
    if (v === undefined || v === null || v === "") {
      td.textContent = "";
      td.classList.add("empty");
    } else if (typeof v === "object") {
      td.textContent = Array.isArray(v) ? v.join(", ") : JSON.stringify(v);
    } else {
      td.textContent = String(v);
    }
    td.title = td.textContent;
    tr.appendChild(td);
  }
  return tr;
}

function render(filtered) {
  thead.innerHTML = "";
  tbody.innerHTML = "";

  const sorted = sortRows(filtered);

  const headerRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.setAttribute("data-column", col);
    th.title = col;
    const label = document.createTextNode(col);
    th.appendChild(label);
    const arrow = document.createElement("span");
    arrow.className = "sort-arrow";
    arrow.setAttribute("aria-hidden", "true");
    if (sortColumn === col) {
      arrow.textContent = sortDirection === "asc" ? " \u2191" : " \u2193";
      arrow.classList.add("visible");
    }
    th.appendChild(arrow);
    th.addEventListener("click", () => {
      setSort(col);
      runSearch();
    });
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  for (const row of sorted) {
    tbody.appendChild(renderRow(row));
  }

  countEl.textContent = `${filtered.length} / ${items.length} items`;
}

function runSearch() {
  const keyword = searchEl.value;
  const filtered = filterItems(keyword);
  render(filtered);
}

async function load() {
  try {
    const [itemsRes, columnsRes] = await Promise.all([
      fetch("data/items.json"),
      fetch("columns.json"),
    ]);
    if (!itemsRes.ok || !columnsRes.ok) throw new Error("Failed to load data");
    items = await itemsRes.json();
    columns = await columnsRes.json();
    detectNumericColumns();
    if (!sortColumn && columns.length > 0) sortColumn = columns[0];
    searchEl.addEventListener("input", runSearch);
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchEl.value = "";
        runSearch();
        searchEl.focus();
      }
    });
    runSearch();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="1" class="error">${e.message}. Run \`npm run build-data\` first.</td></tr>`;
    countEl.textContent = "";
  }
}

load();

/**
 * Arc Raiders item browser: load flat items + columns, render spreadsheet
 * and filter by keyword (all terms must match in row values).
 */

const thead = document.getElementById("thead");
const tbody = document.getElementById("tbody");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");
const table = document.getElementById("table");

let items = [];
let columns = [];

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

  const headerRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    th.title = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  for (const row of filtered) {
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
      fetch("items.json"),
      fetch("columns.json"),
    ]);
    if (!itemsRes.ok || !columnsRes.ok) throw new Error("Failed to load data");
    items = await itemsRes.json();
    columns = await columnsRes.json();
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

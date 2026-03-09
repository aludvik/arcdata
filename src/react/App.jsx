import React, { useEffect, useMemo, useState } from "react";
import { SearchBar } from "./components/SearchBar.jsx";
import { Table } from "./components/Table.jsx";
import { detectNumericColumns, filterItems, sortRows, SELECTION_COLUMN_ID } from "./tableUtils.js";
import { buildCraftingDag } from "../utils/craftingGraph.js";

/**
 * Build an index mapping item ID -> value for a given field. Only includes rows
 * where id and the field are present and the field is a plain object (not array).
 */
function buildIdToFieldIndex(items, fieldName) {
  return Object.fromEntries(
    items
      .filter(
        (row) =>
          row.id != null &&
          row[fieldName] != null &&
          typeof row[fieldName] === "object" &&
          !Array.isArray(row[fieldName]),
      )
      .map((row) => [String(row.id), row[fieldName]]),
  );
}

export function App() {
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState(() => new Set());
  const [idToName, setIdToName] = useState(() => ({}));
  const [idToRecipe, setIdToRecipe] = useState(() => ({}));
  const [idToRecyclesInto, setIdToRecyclesInto] = useState(() => ({}));
  const [idToSalvagesInto, setIdToSalvagesInto] = useState(() => ({}));
  const [benches, setbenches] = useState(() => ({}));
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const [craftingDag, setCraftingDag] = useState(() => []);
  const [sortColumnDag, setSortColumnDag] = useState("weight");
  const [sortDirectionDag, setSortDirectionDag] = useState("asc");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [itemsRes, columnsRes, benchesRes] = await Promise.all([
          fetch("data/items.json"),
          fetch("columns.json"),
          fetch("data/benches.json"),
        ]);

        if (!itemsRes.ok || !columnsRes.ok || !benchesRes.ok) {
          throw new Error("Failed to load data");
        }

        const [itemsData, columnsData, benchesData] = await Promise.all([
          itemsRes.json(),
          columnsRes.json(),
          benchesRes.json(),
        ]);

        const indexStart = performance.now();
        const idToNameData = Object.fromEntries(
          itemsData
            .filter((row) => row.id != null && row.name != null)
            .map((row) => [String(row.id), row.name]),
        );
        const idToRecipeData = buildIdToFieldIndex(itemsData, "recipe");
        const idToRecyclesIntoData = buildIdToFieldIndex(itemsData, "recyclesInto");
        const idToSalvagesIntoData = buildIdToFieldIndex(itemsData, "salvagesInto");
        const indexMs = performance.now() - indexStart;
        // eslint-disable-next-line no-console
        console.log(
          `indices built in ${indexMs.toFixed(2)} ms (idToName, idToRecipe, idToRecyclesInto, idToSalvagesInto)`,
        );

        setItems(itemsData);
        setColumns(columnsData);
        setIdToName(idToNameData);
        setIdToRecipe(idToRecipeData);
        setIdToRecyclesInto(idToRecyclesIntoData);
        setIdToSalvagesInto(idToSalvagesIntoData);
        setbenches(benchesData);
        setNumericColumns(detectNumericColumns(itemsData, columnsData));
        // setSortColumn((prev) => (prev ?? (columnsData[0] ?? null)));
        setError(null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError(`${e.message}. Run \`npm run build-data\` first.`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (selectedItemIds.size === 0) {
      setCraftingDag([]);
      // eslint-disable-next-line no-console
      console.log("Crafting DAG updated", []);
      return;
    }
    const dag = buildCraftingDag(idToRecipe, selectedItemIds);
    setCraftingDag(dag);
    // eslint-disable-next-line no-console
    console.log("Crafting DAG updated", dag);
  }, [idToRecipe, selectedItemIds]);

  const handleSortChange = (col) => {
    setSortColumn((prevCol) => {
      if (prevCol === col) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevCol;
      }
      setSortDirection("asc");
      return col;
    });
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleSearchClear = () => {
    setSearchTerm("");
  };

  const handleRowExpandToggle = (rowKey) => {
    setExpandedRowKeys((prev) => {
      if (!Array.isArray(prev)) return [rowKey];
      return prev.includes(rowKey)
        ? prev.filter((key) => key !== rowKey)
        : [...prev, rowKey];
    });
  };

  const handleExpandAllRows = () => {
    setExpandedRowKeys(sortedItems.map((row, i) => row.id ?? i));
  };

  const handleCollapseAllRows = () => {
    setExpandedRowKeys([]);
  };

  const handleSelectionToggle = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const handleSortChangeDag = (col) => {
    setSortColumnDag((prevCol) => {
      if (prevCol === col) {
        setSortDirectionDag((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevCol;
      }
      setSortDirectionDag("asc");
      return col;
    });
  };

  const filteredItems = useMemo(
    () => filterItems(items, columns, searchTerm),
    [items, columns, searchTerm],
  );

  const sortedItems = useMemo(
    () =>
      sortRows(filteredItems, sortColumn, sortDirection, columns, numericColumns, {
        selectedItemIds,
        nameColumn: "name",
      }),
    [filteredItems, sortColumn, sortDirection, columns, numericColumns, selectedItemIds],
  );

  const totalCount = items.length;
  const filteredCount = filteredItems.length;

  const dagRows = useMemo(() => {
    const rows = craftingDag.map((node) => ({
      id: node.itemId,
      names: idToName[node.itemId] ?? node.itemId,
      weight: node.weight,
    }));
    const dir = sortDirectionDag === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortColumnDag === "weight") {
        return dir * (Number(a.weight) - Number(b.weight));
      }
      const key = sortColumnDag === "names" ? "names" : "id";
      return dir * String(a[key]).localeCompare(String(b[key]));
    });
  }, [craftingDag, idToName, sortColumnDag, sortDirectionDag]);

  const showLootGuide = craftingDag.length > 0;

  return (
    <>
      {/* Future extension: additional UI like FiltersPanel or ColumnsPicker can be
          composed here without changing data-loading/search/sort logic above. */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        totalCount={totalCount}
        filteredCount={filteredCount}
        onExpandAllRows={handleExpandAllRows}
        onCollapseAllRows={handleCollapseAllRows}
        onClearSelection={handleClearSelection}
      />
      <main className={showLootGuide ? "main main--split" : "main"}>
        {showLootGuide ? (
          <>
            <div className="main__top">
              <div className="table-wrap">
                {loading ? (
                  <div className="loading">Loading items…</div>
                ) : error ? (
                  <table id="table" className="table">
                    <tbody>
                      <tr>
                        <td colSpan={columns.length + 1} className="error">
                          {error}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <Table
                    columns={columns}
                    rows={sortedItems}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    idToName={idToName}
                    benches={benches}
                    expandedRowKeys={expandedRowKeys}
                    onRowExpandToggle={handleRowExpandToggle}
                    selectedItemIds={selectedItemIds}
                    onSelectionToggle={handleSelectionToggle}
                  />
                )}
              </div>
            </div>
            <div className="loot-guide-panel">
              <h2 className="loot-guide-panel__title">Looting Guide</h2>
              <div className="table-wrap">
                <Table
                  columns={["names", "weight"]}
                  rows={dagRows}
                  sortColumn={sortColumnDag}
                  sortDirection={sortDirectionDag}
                  onSortChange={handleSortChangeDag}
                  idToName={idToName}
                  benches={benches}
                  expandedRowKeys={[]}
                  onRowExpandToggle={() => {}}
                  showSelectionColumn={false}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="table-wrap">
            {loading ? (
              <div className="loading">Loading items…</div>
            ) : error ? (
              <table id="table" className="table">
                <tbody>
                  <tr>
                    <td colSpan={columns.length + 1} className="error">
                      {error}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <Table
                columns={columns}
                rows={sortedItems}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                idToName={idToName}
                benches={benches}
                expandedRowKeys={expandedRowKeys}
                onRowExpandToggle={handleRowExpandToggle}
                selectedItemIds={selectedItemIds}
                onSelectionToggle={handleSelectionToggle}
              />
            )}
          </div>
        )}
      </main>
    </>
  );
}


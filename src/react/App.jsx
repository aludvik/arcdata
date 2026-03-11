import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchBar } from "./components/SearchBar.jsx";
import { Table } from "./components/Table.jsx";
import { detectNumericColumns, filterItems, sortRows, SELECTION_COLUMN_ID, augmentRowsWithRendered } from "./tableUtils.js";
import { buildCraftingDag } from "../utils/craftingGraph.js";
import { getDefaultState, loadState, saveState } from "./persistence.js";

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
  const initialState = useMemo(() => {
    const p = loadState();
    const d = getDefaultState();
    return p ? { ...d, ...p } : d;
  }, []);

  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState(() => new Set());
  const [idToName, setIdToName] = useState(() => ({}));
  const [idToRecipe, setIdToRecipe] = useState(() => ({}));
  const [idToRecyclesInto, setIdToRecyclesInto] = useState(() => ({}));
  const [idToSalvagesInto, setIdToSalvagesInto] = useState(() => ({}));
  const [benches, setbenches] = useState(() => ({}));
  const [sortColumn, setSortColumn] = useState(initialState.sortColumn);
  const [sortDirection, setSortDirection] = useState(initialState.sortDirection);
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [expandedRowKeys, setExpandedRowKeys] = useState(initialState.expandedRowKeys);
  const [selectedItemIds, setSelectedItemIds] = useState(
    () => new Set(initialState.selectedItemIds),
  );
  const [lootGuideMode, setLootGuideMode] = useState(initialState.lootGuideMode);
  const [lootGuideOpen, setLootGuideOpen] = useState(true);
  const [lootGuideWidth, setLootGuideWidth] = useState(
    () => (typeof window !== "undefined" ? Math.round(window.innerWidth / 3) : 320),
  );
  const [craftingDag, setCraftingDag] = useState(() => []);
  const [sortColumnDag, setSortColumnDag] = useState(initialState.sortColumnDag);
  const [sortDirectionDag, setSortDirectionDag] = useState(initialState.sortDirectionDag);
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

        const validIds = new Set(itemsData.map((r) => r.id).filter(Boolean));
        const validRowKeys = new Set(itemsData.map((r, i) => r.id ?? i));
        const validColumns = new Set([...columnsData, SELECTION_COLUMN_ID]);
        const validDagColumns = new Set(["names", "weight", "id"]);

        setSelectedItemIds((prev) => {
          const filtered = [...prev].filter((id) => validIds.has(id));
          return filtered.length === prev.size ? prev : new Set(filtered);
        });
        setExpandedRowKeys((prev) => {
          const filtered = prev.filter((k) => validRowKeys.has(k));
          return filtered.length === prev.length ? prev : filtered;
        });
        setSortColumn((prev) =>
          prev != null && validColumns.has(prev) ? prev : null,
        );
        setSortColumnDag((prev) =>
          validDagColumns.has(prev) ? prev : "kind",
        );

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
    saveState({
      searchTerm,
      sortColumn,
      sortDirection,
      expandedRowKeys,
      selectedItemIds,
      lootGuideMode,
      sortColumnDag,
      sortDirectionDag,
    });
  }, [
    searchTerm,
    sortColumn,
    sortDirection,
    expandedRowKeys,
    selectedItemIds,
    lootGuideMode,
    sortColumnDag,
    sortDirectionDag,
  ]);

  const lootGuideIndex = useMemo(() => {
    switch (lootGuideMode) {
      case "recycling":
        return idToRecyclesInto;
      case "salvaging":
        return idToSalvagesInto;
      default:
        return idToRecipe;
    }
  }, [lootGuideMode, idToRecipe, idToRecyclesInto, idToSalvagesInto]);

  useEffect(() => {
    if (selectedItemIds.size === 0) {
      setCraftingDag([]);
      // eslint-disable-next-line no-console
      console.log("Crafting DAG updated", []);
      return;
    }
    const dag = buildCraftingDag(lootGuideIndex, selectedItemIds);
    setCraftingDag(dag);
    // eslint-disable-next-line no-console
    console.log("Crafting DAG updated", dag);
  }, [lootGuideIndex, selectedItemIds]);

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

  const itemsWithRendered = useMemo(
    () => augmentRowsWithRendered(items, columns, idToName, benches),
    [items, columns, idToName, benches],
  );

  const filteredItems = useMemo(
    () => filterItems(itemsWithRendered, searchTerm, idToName, benches),
    [itemsWithRendered, searchTerm, idToName, benches],
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
    const KIND_ORDER = { basic: 0, intermediary: 1, selected: 2 };
    const SECTION_LABELS = { basic: "Raw Materials", intermediary: "Craftables", selected: "Loadout" };
    const rows = craftingDag.map((node) => ({
      id: node.itemId,
      names: idToName[node.itemId] ?? node.itemId,
      kind: node.kind,
      weight: node.weight,
    }));
    rows.sort((a, b) => {
      const kA = KIND_ORDER[a.kind] ?? 0;
      const kB = KIND_ORDER[b.kind] ?? 0;
      if (kA !== kB) return kA - kB;
      return Number(b.weight) - Number(a.weight);
    });
    const withDividers = [];
    let lastKind = null;
    for (const row of rows) {
      if (row.kind !== lastKind) {
        lastKind = row.kind;
        withDividers.push({ _sectionLabel: SECTION_LABELS[row.kind] });
      }
      withDividers.push(row);
    }
    return withDividers;
  }, [craftingDag, idToName]);

  const showLootGuide = craftingDag.length > 0;
  const panelOpen = showLootGuide && lootGuideOpen;

  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = lootGuideWidth;
    const onMove = (moveEvent) => {
      const delta = resizeStartX.current - moveEvent.clientX;
      const newWidth = Math.min(800, Math.max(200, resizeStartWidth.current + delta));
      setLootGuideWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [lootGuideWidth]);

  const handleDrawerToggle = useCallback(() => {
    setLootGuideOpen((prev) => !prev);
  }, []);

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
      <main
        className={panelOpen ? "main main--split" : "main"}
        style={panelOpen ? { "--loot-guide-width": `${lootGuideWidth}px` } : undefined}
      >
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
            {panelOpen && (
              <>
                <div
                  className="loot-guide-resize-handle"
                  onMouseDown={handleResizeStart}
                  role="separator"
                  aria-orientation="vertical"
                />
                <button
                  type="button"
                  className="loot-guide-drawer loot-guide-drawer--on-panel"
                  onClick={handleDrawerToggle}
                  aria-label="Close Looting Guide"
                  aria-expanded={true}
                >
                  ›
                </button>
                <div className="loot-guide-panel">
                  <h2 className="loot-guide-panel__title">Looting Guide</h2>
              <div className="loot-guide-panel__tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={lootGuideMode === "crafting"}
                  className={`loot-guide-panel__tab ${lootGuideMode === "crafting" ? "loot-guide-panel__tab--active" : ""}`}
                  onClick={() => setLootGuideMode("crafting")}
                >
                  Crafting
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={lootGuideMode === "recycling"}
                  className={`loot-guide-panel__tab ${lootGuideMode === "recycling" ? "loot-guide-panel__tab--active" : ""}`}
                  onClick={() => setLootGuideMode("recycling")}
                >
                  Recycling
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={lootGuideMode === "salvaging"}
                  className={`loot-guide-panel__tab ${lootGuideMode === "salvaging" ? "loot-guide-panel__tab--active" : ""}`}
                  onClick={() => setLootGuideMode("salvaging")}
                >
                  Salvaging
                </button>
              </div>
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
                  sortable={false}
                />
              </div>
            </div>
          </>
            )}
          </>
        ) : null}
        {showLootGuide && !panelOpen ? (
          <button
            type="button"
            className="loot-guide-drawer loot-guide-drawer--tab"
            onClick={handleDrawerToggle}
            aria-label="Open Looting Guide"
            aria-expanded={false}
          >
            ‹
          </button>
        ) : null}
        {!showLootGuide ? (
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
        ) : null}
      </main>
    </>
  );
}


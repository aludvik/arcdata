import React, { useEffect, useMemo, useState } from "react";
import { SearchBar } from "./components/SearchBar.jsx";
import { Table } from "./components/Table.jsx";
import { detectNumericColumns, filterItems, sortRows } from "./tableUtils.js";

export function App() {
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState(() => new Set());
  const [idToName, setIdToName] = useState(() => ({}));
  const [craftBenchIdToName, setCraftBenchIdToName] = useState(() => ({}));
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [itemsRes, columnsRes, idToNameRes, craftBenchIdToNameRes] = await Promise.all([
          fetch("data/items.json"),
          fetch("columns.json"),
          fetch("data/itemIdToName.json"),
          fetch("data/craftBenchIdToName.json"),
        ]);

        if (!itemsRes.ok || !columnsRes.ok || !idToNameRes.ok || !craftBenchIdToNameRes.ok) {
          throw new Error("Failed to load data");
        }

        const [itemsData, columnsData, idToNameData, craftBenchIdToNameData] = await Promise.all([
          itemsRes.json(),
          columnsRes.json(),
          idToNameRes.json(),
          craftBenchIdToNameRes.json(),
        ]);

        setItems(itemsData);
        setColumns(columnsData);
        setIdToName(idToNameData);
        setCraftBenchIdToName(craftBenchIdToNameData);
        setNumericColumns(detectNumericColumns(itemsData, columnsData));
        setSortColumn((prev) => (prev ?? (columnsData[0] ?? null)));
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

  const filteredItems = useMemo(
    () => filterItems(items, columns, searchTerm),
    [items, columns, searchTerm],
  );

  const sortedItems = useMemo(
    () => sortRows(filteredItems, sortColumn, sortDirection, columns, numericColumns),
    [filteredItems, sortColumn, sortDirection, columns, numericColumns],
  );

  const totalCount = items.length;
  const filteredCount = filteredItems.length;

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
      />
      <main className="main">
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Loading items…</div>
          ) : error ? (
            <table id="table" className="table">
              <tbody>
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="error">
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
              craftBenchIdToName={craftBenchIdToName}
              expandedRowKeys={expandedRowKeys}
              onRowExpandToggle={handleRowExpandToggle}
            />
          )}
        </div>
      </main>
    </>
  );
}


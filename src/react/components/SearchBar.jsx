import React from "react";

export function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchClear,
  totalCount,
  filteredCount,
  onExpandAllRows,
  onCollapseAllRows,
}) {
  const handleInputChange = (event) => {
    onSearchChange(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      onSearchClear();
      event.target.focus();
    }
  };

  const countText =
    totalCount > 0 ? `${filteredCount} / ${totalCount} items` : "";

  return (
    <header className="header">
      <div className="title-row">
        <h1>ArcData</h1>
        <p className="subtitle">
          Data from{" "}
          <a
            href="https://github.com/RaidTheory/arcraiders-data"
            target="_blank"
            rel="noopener"
          >
            RaidTheory/arcraiders-data
          </a>
        </p>
      </div>
      <div className="search-wrap">
        <label htmlFor="search">Search</label>
        <input
          type="text"
          id="search"
          placeholder="Filter by keyword…"
          autoComplete="off"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <span className="count">{countText}</span>
        <div className="row-expand-actions">
          <button
            type="button"
            className="header-btn"
            onClick={onExpandAllRows}
            title="Expand all rows"
            aria-label="Expand all rows"
          >
            + Expand
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={onCollapseAllRows}
            title="Collapse all rows"
            aria-label="Collapse all rows"
          >
            - Collapse
          </button>
        </div>
      </div>
    </header>
  );
}


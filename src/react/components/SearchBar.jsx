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
        <a
          className="github-badge"
          href="https://github.com/aludvik/arcdata"
          target="_blank"
          rel="noopener"
          aria-label="View source on GitHub"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            className="github-icon"
          >
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
              -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
              0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.5c.68 0 1.36.09 2 .26
              1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15
              0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2
              0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
        </a>
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


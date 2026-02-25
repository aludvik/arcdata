import React from "react";

export function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchClear,
  totalCount,
  filteredCount,
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
      <h1>Arc Raiders Item Browser</h1>
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
      </div>
    </header>
  );
}


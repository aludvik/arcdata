import React from "react";

export function TableHeader({ columns, sortColumn, sortDirection, onSortChange }) {
  return (
    <tr>
      {columns.map((col) => {
        const isSorted = sortColumn === col;
        const arrow = isSorted ? (sortDirection === "asc" ? "↑" : "↓") : "";

        return (
          <th
            key={col}
            data-column={col}
            title={col}
            onClick={() => onSortChange(col)}
          >
            {col}
            <span
              className={`sort-arrow${isSorted ? " visible" : ""}`}
              aria-hidden="true"
            >
              {arrow}
            </span>
          </th>
        );
      })}
    </tr>
  );
}


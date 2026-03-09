import React from "react";
import { SELECTION_COLUMN_ID } from "../tableUtils.js";

export function TableHeader({
  columns,
  sortColumn,
  sortDirection,
  onSortChange,
  showSelectionColumn = true,
}) {
  return (
    <tr>
      {showSelectionColumn && (
        <th
          key={SELECTION_COLUMN_ID}
          data-column={SELECTION_COLUMN_ID}
          title="Select"
          onClick={() => onSortChange(SELECTION_COLUMN_ID)}
        >
          <span
            className={`sort-arrow${sortColumn === SELECTION_COLUMN_ID ? " visible" : ""}`}
            aria-hidden="true"
          >
            {sortColumn === SELECTION_COLUMN_ID
              ? sortDirection === "asc"
                ? "↑"
                : "↓"
              : ""}
          </span>
        </th>
      )}
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


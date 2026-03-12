import React from "react";
import { SELECTION_COLUMN_ID } from "../tableUtils.js";

export function TableHeader({
  columns,
  sortColumn,
  sortDirection,
  onSortChange,
  showSelectionColumn = true,
  sortable = true,
}) {
  return (
    <tr>
      {showSelectionColumn && (
        <th
          key={SELECTION_COLUMN_ID}
          className="col-selection"
          data-column={SELECTION_COLUMN_ID}
          title="Select"
          onClick={sortable ? () => onSortChange(SELECTION_COLUMN_ID) : undefined}
        >
          {sortable && (
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
          )}
        </th>
      )}
      {columns.map((col) => {
        const isSorted = sortColumn === col;
        const arrow = isSorted ? (sortDirection === "asc" ? "↑" : "↓") : "";
        const label = col;

        return (
          <th
            key={col}
            data-column={col}
            title={label}
            onClick={sortable ? () => onSortChange(col) : undefined}
          >
            {label}
            {sortable && (
              <span
                className={`sort-arrow${isSorted ? " visible" : ""}`}
                aria-hidden="true"
              >
                {arrow}
              </span>
            )}
          </th>
        );
      })}
    </tr>
  );
}


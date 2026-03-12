import React from "react";
import { Row } from "./Row.jsx";

export function TableBody({
  columns,
  rows,
  idToName,
  benches,
  expandedRowKeys = [],
  onRowExpandToggle,
  selectedItemIds = new Set(),
  onSelectionToggle,
  showSelectionColumn = true,
}) {
  const colSpan = columns.length + (showSelectionColumn ? 1 : 0);

  return (
    <>
      {rows.map((row, index) => {
        if (row._sectionLabel != null) {
          return (
            <tr key={`_divider-${row._sectionLabel}-${index}`} className="table-section-divider">
              <td>{row._sectionLabel}</td>
              <td colSpan={colSpan - 1} />
            </tr>
          );
        }

        const rowKey = row.id ?? index;
        const isExpanded =
          expandedRowKeys && typeof expandedRowKeys.includes === "function"
            ? expandedRowKeys.includes(rowKey)
            : false;

        const handleRowClick =
          typeof onRowExpandToggle === "function"
            ? () => onRowExpandToggle(rowKey)
            : undefined;

        const isSelected = row.id != null && selectedItemIds.has(row.id);
        const handleSelectionToggle =
          typeof onSelectionToggle === "function" && row.id != null
            ? () => onSelectionToggle(row.id)
            : undefined;

        return (
          <Row
            key={rowKey}
            columns={columns}
            row={row}
            idToName={idToName}
            benches={benches}
            isExpanded={isExpanded}
            onRowClick={handleRowClick}
            isSelected={isSelected}
            onSelectionToggle={handleSelectionToggle}
          />
        );
      })}
    </>
  );
}


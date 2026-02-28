import React from "react";
import { Row } from "./Row.jsx";

export function TableBody({
  columns,
  rows,
  idToName,
  benches,
  expandedRowKeys = [],
  onRowExpandToggle,
}) {
  return (
    <>
      {rows.map((row, index) => {
        const rowKey = row.id ?? index;
        const isExpanded =
          expandedRowKeys && typeof expandedRowKeys.includes === "function"
            ? expandedRowKeys.includes(rowKey)
            : false;

        const handleRowClick =
          typeof onRowExpandToggle === "function"
            ? () => onRowExpandToggle(rowKey)
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
          />
        );
      })}
    </>
  );
}


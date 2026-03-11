import React from "react";
import { TableHeader } from "./TableHeader.jsx";
import { TableBody } from "./TableBody.jsx";

export function Table({
  columns,
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  idToName,
  benches,
  expandedRowKeys,
  onRowExpandToggle,
  selectedItemIds,
  onSelectionToggle,
  showSelectionColumn = true,
  sortable = true,
}) {
  const tableClassName = ["table", showSelectionColumn ? "table--with-selection" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <table id="table" className={tableClassName}>
      <thead>
        <TableHeader
          columns={columns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          showSelectionColumn={showSelectionColumn}
          sortable={sortable}
        />
      </thead>
      <tbody>
        <TableBody
          columns={columns}
          rows={rows}
          idToName={idToName}
          benches={benches}
          expandedRowKeys={expandedRowKeys}
          onRowExpandToggle={onRowExpandToggle}
          selectedItemIds={selectedItemIds}
          onSelectionToggle={onSelectionToggle}
        />
      </tbody>
    </table>
  );
}


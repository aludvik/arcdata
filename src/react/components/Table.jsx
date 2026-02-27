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
  craftBenchIdToName,
  expandedRowKeys,
  onRowExpandToggle,
}) {
  return (
    <table id="table" className="table">
      <thead>
        <TableHeader
          columns={columns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />
      </thead>
      <tbody>
        <TableBody
          columns={columns}
          rows={rows}
          idToName={idToName}
          craftBenchIdToName={craftBenchIdToName}
          expandedRowKeys={expandedRowKeys}
          onRowExpandToggle={onRowExpandToggle}
        />
      </tbody>
    </table>
  );
}


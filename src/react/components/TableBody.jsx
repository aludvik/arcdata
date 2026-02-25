import React from "react";
import { Row } from "./Row.jsx";

export function TableBody({ columns, rows, idToName }) {
  return (
    <>
      {rows.map((row, index) => (
        <Row
          key={row.id ?? index}
          columns={columns}
          row={row}
          idToName={idToName}
        />
      ))}
    </>
  );
}


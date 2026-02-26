import React from "react";
import { formatCellValue } from "./cellValue.js";

export function Row({ columns, row, idToName, craftBenchIdToName }) {
  return (
    <tr>
      {columns.map((col) => {
        const { text, isEmpty } = formatCellValue(
          row,
          col,
          idToName,
          craftBenchIdToName,
        );

        return (
          <td
            key={col}
            className={isEmpty ? "empty" : undefined}
            title={text}
          >
            {text}
          </td>
        );
      })}
    </tr>
  );
}


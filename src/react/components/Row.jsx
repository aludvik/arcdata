import React from "react";
import { formatCellValue } from "./cellValue.js";

export function Row({
  columns,
  row,
  idToName,
  craftBenchIdToName,
  isExpanded = false,
  onRowClick,
}) {
  return (
    <tr
      className={isExpanded ? "row-expanded" : undefined}
      onClick={onRowClick}
    >
      {columns.map((col) => {
        const { text, isEmpty } = formatCellValue(
          row,
          col,
          idToName,
          craftBenchIdToName,
          { expanded: isExpanded },
        );

        const cellClassNames = [
          isEmpty ? "empty" : null,
          isExpanded ? "cell-expanded" : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined;

        return (
          <td key={col} className={cellClassNames} title={text}>
            {text}
          </td>
        );
      })}
    </tr>
  );
}


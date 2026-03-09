import React from "react";
import { formatCellValue } from "./cellValue.js";

export function Row({
  columns,
  row,
  idToName,
  benches,
  isExpanded = false,
  onRowClick,
  isSelected = false,
  onSelectionToggle,
}) {
  const trClassName = [isExpanded ? "row-expanded" : null, isSelected ? "row-selected" : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <tr className={trClassName} onClick={onRowClick}>
      {onSelectionToggle != null ? (
        <td onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelectionToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={isSelected ? "Deselect item" : "Select item"}
            aria-checked={isSelected}
          />
        </td>
      ) : null}
      {columns.map((col) => {
        const { text, isEmpty } = formatCellValue(
          row,
          col,
          idToName,
          benches,
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


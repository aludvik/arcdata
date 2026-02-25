import React from "react";

export function Row({ columns, row }) {
  return (
    <tr>
      {columns.map((col) => {
        const value = row[col];
        let text = "";
        let isEmpty = false;

        if (value === undefined || value === null || value === "") {
          isEmpty = true;
          text = "";
        } else if (typeof value === "object") {
          text = Array.isArray(value) ? value.join(", ") : JSON.stringify(value);
        } else {
          text = String(value);
        }

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


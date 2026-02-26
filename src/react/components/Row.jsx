import React from "react";

function formatCellValue(row, col, idToName) {
  const substitions = {
    stackSize: 1,
    foundIn: "Unknown"
  }
  const defaultValue = "-";

  const value = row[col];
  if (value === undefined || value === null || value === "") {
    const substitution = substitions[col];
    return substitution
    ? { text: String(substitution), isEmpty: false }
    : { text: defaultValue, isEmpty: true }
  }

  if (Array.isArray(value)) {
    return { text: value.join(", "), isEmpty: false };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return { text: defaultValue, isEmpty: true };
    }

    const pairs = entries.map(([rawKey, rawVal]) => {
      const displayKey =
        (idToName && idToName[String(rawKey)]) != null
          ? idToName[String(rawKey)]
          : String(rawKey);

      let valText;
      if (rawVal === null || typeof rawVal !== "object") {
        valText = String(rawVal);
      } else {
        valText = JSON.stringify(rawVal);
      }

      return `${displayKey}: ${valText}`;
    });

    return { text: pairs.join(", "), isEmpty: false };
  }

  return { text: String(value), isEmpty: false };
}

export function Row({ columns, row, idToName }) {
  return (
    <tr>
      {columns.map((col) => {
        const { text, isEmpty } = formatCellValue(row, col, idToName);

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


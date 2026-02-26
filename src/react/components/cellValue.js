/**
 * Format a single cell value for display. Used by Row.jsx and by unit tests.
 * @param {Record<string, unknown>} row - Row data keyed by column name
 * @param {string} col - Column name
 * @param {Record<string, string>} [idToName] - Item ID → display name
 * @param {Record<string, string>} [craftBenchIdToName] - Craft bench ID → display name
 * @returns {{ text: string, isEmpty: boolean }}
 */
export function formatCellValue(row, col, idToName, craftBenchIdToName) {
  const substitions = {
    stackSize: 1,
    foundIn: "Unknown",
  };
  const defaultValue = "-";
  const value = row[col];
  if (value === undefined || value === null || value === "") {
    const substitution = substitions[col];
    return substitution
      ? { text: String(substitution), isEmpty: false }
      : { text: defaultValue, isEmpty: true };
  }

  if (col === "craftBench") {
    const mapBenchId = (raw) => {
      const key = String(raw).trim();
      if (!key || key === "undefined" || key === "null") return null;
      if (craftBenchIdToName && craftBenchIdToName[key] != null) {
        return craftBenchIdToName[key];
      }
      return key;
    };
    let parts = [];
    if (Array.isArray(value)) {
      parts = value.map(mapBenchId).filter((x) => x != null && x !== "");
    } else if (typeof value === "string" && value.includes(",")) {
      parts = value
        .split(",")
        .map((s) => mapBenchId(s))
        .filter((x) => x != null && x !== "");
    } else {
      const single = mapBenchId(value);
      if (single != null && single !== "") {
        parts = [single];
      }
    }

    if (parts.length === 0) {
      return { text: defaultValue, isEmpty: true };
    }

    const text = parts.join(", ");
    return { text, isEmpty: false };
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

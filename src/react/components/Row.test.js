/**
 * Unit tests for craftBench cell formatting (formatCellValue).
 * Run with: npm test
 */
import assert from "node:assert";
import { formatCellValue } from "./cellValue.js";

const craftBenchIdToName = {
  equipment_bench: "Gear Bench",
  explosives_bench: "Explosives Station",
  workbench: "Workbench",
};

function runTests() {
  // craftBench: string (single ID)
  let row = { craftBench: "workbench" };
  let result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Workbench", "single string ID → name");
  assert.strictEqual(result.isEmpty, false);

  // craftBench: comma-separated string
  row = { craftBench: "equipment_bench,explosives_bench" };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Gear Bench, Explosives Station", "comma string → names");
  assert.strictEqual(result.isEmpty, false);

  row = { craftBench: "equipment_bench, explosives_bench" };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Gear Bench, Explosives Station", "comma string with spaces → names");
  assert.strictEqual(result.isEmpty, false);

  // craftBench: array of strings
  row = { craftBench: ["equipment_bench", "explosives_bench"] };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Gear Bench, Explosives Station", "array of IDs → names");
  assert.strictEqual(result.isEmpty, false);

  row = { craftBench: ["workbench"] };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Workbench", "array with single ID → name");
  assert.strictEqual(result.isEmpty, false);

  // Edge cases
  row = { craftBench: "unknown_bench" };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "unknown_bench", "unknown ID → raw ID");
  assert.strictEqual(result.isEmpty, false);

  row = { craftBench: "workbench,unknown_bench,equipment_bench" };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Workbench, unknown_bench, Gear Bench", "mix known/unknown");
  assert.strictEqual(result.isEmpty, false);

  row = { craftBench: "" };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "-", "empty string → default");
  assert.strictEqual(result.isEmpty, true);

  row = {};
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "-", "missing craftBench → default");
  assert.strictEqual(result.isEmpty, true);

  row = { craftBench: null };
  result = formatCellValue(row, "craftBench", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "-", "null → default");
  assert.strictEqual(result.isEmpty, true);

  row = { craftBench: "workbench" };
  result = formatCellValue(row, "craftBench", {}, undefined);
  assert.strictEqual(result.text, "workbench", "no map → raw ID");
  assert.strictEqual(result.isEmpty, false);

  row = { craftBench: "workbench" };
  result = formatCellValue(row, "craftBench", {}, {});
  assert.strictEqual(result.text, "workbench", "empty map → raw ID");
  assert.strictEqual(result.isEmpty, false);

  // Other columns unchanged
  row = { name: "Foo", craftBench: "workbench" };
  result = formatCellValue(row, "name", {}, craftBenchIdToName);
  assert.strictEqual(result.text, "Foo", "non-craftBench column unchanged");
  assert.strictEqual(result.isEmpty, false);
}

runTests();
console.log("Row.formatCellValue (craftBench): all tests passed");

/**
 * Unit tests for buildCraftingDag.
 * Run with: node src/utils/craftingGraph.test.js
 */
import assert from "node:assert";
import { buildCraftingDag } from "./craftingGraph.js";

function isDag(nodes) {
  const byId = new Map(nodes.map((n) => [n.itemId, n]));
  const reachableFrom = (startId) => {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const u = stack.pop();
      if (seen.has(u)) continue;
      seen.add(u);
      const node = byId.get(u);
      if (node) for (const e of node.edges) stack.push(e.targetItemId);
    }
    return seen;
  };
  for (const node of nodes) {
    for (const e of node.edges) {
      const fromV = reachableFrom(e.targetItemId);
      assert.ok(!fromV.has(node.itemId), `cycle: ${node.itemId} -> ${e.targetItemId} and path back to ${node.itemId}`);
    }
  }
}

function runTests() {
  // Basic: small index, one start
  const index1 = { A: { B: 2, C: 1 }, B: {} };
  let result = buildCraftingDag(index1, ["A"]);
  assert.strictEqual(result.length, 3, "three nodes");
  const nodeA = result.find((n) => n.itemId === "A");
  const nodeB = result.find((n) => n.itemId === "B");
  const nodeC = result.find((n) => n.itemId === "C");
  assert.ok(nodeA, "node A exists");
  assert.ok(nodeB, "node B exists");
  assert.ok(nodeC, "node C exists");
  assert.strictEqual(nodeA.edges.length, 2, "A has two edges");
  assert.deepStrictEqual(
    nodeA.edges.map((e) => ({ t: e.targetItemId, w: e.weight })).sort((a, b) => a.t.localeCompare(b.t)),
    [{ t: "B", w: 2 }, { t: "C", w: 1 }],
    "A -> B (2), A -> C (1)",
  );
  assert.strictEqual(nodeB.edges.length, 0, "B has no edges");
  assert.strictEqual(nodeC.edges.length, 0, "C has no edges");
  assert.strictEqual(nodeA.weight, 0, "A has no incoming edges");
  assert.strictEqual(nodeB.weight, 2, "B has one incoming edge weight 2");
  assert.strictEqual(nodeC.weight, 1, "C has one incoming edge weight 1");
  isDag(result);

  // Cycle breaking: A -> B -> C -> A
  const indexCycle = { A: { B: 1 }, B: { C: 1 }, C: { A: 1 } };
  result = buildCraftingDag(indexCycle, ["A"]);
  assert.strictEqual(result.length, 3, "three nodes");
  const cNode = result.find((n) => n.itemId === "C");
  assert.ok(cNode, "node C exists");
  const backToA = cNode.edges.find((e) => e.targetItemId === "A");
  assert.strictEqual(backToA, undefined, "no edge C -> A (would create cycle)");
  isDag(result);

  // Multiple starts: same cyclic index, start A and C
  result = buildCraftingDag(indexCycle, ["A", "C"]);
  assert.strictEqual(result.length, 3, "all three nodes present");
  isDag(result);

  // Start ID not in index
  result = buildCraftingDag({}, ["X"]);
  assert.strictEqual(result.length, 1, "one node");
  assert.strictEqual(result[0].itemId, "X", "node is X");
  assert.strictEqual(result[0].edges.length, 0, "no edges");
  assert.strictEqual(result[0].weight, 0, "X has no incoming edges");

  result = buildCraftingDag({ A: { B: 1 } }, ["Y"]);
  assert.strictEqual(result.length, 1, "one node when start not in index");
  assert.strictEqual(result[0].itemId, "Y", "node is Y");
  assert.strictEqual(result[0].edges.length, 0, "no edges");
  assert.strictEqual(result[0].weight, 0, "Y has no incoming edges");

  // Set as startItemIds (normalize iterable)
  result = buildCraftingDag(index1, new Set(["A"]));
  assert.strictEqual(result.length, 3, "Set start IDs work");
  assert.ok(result.find((n) => n.itemId === "A"), "node A from Set");

  // Acyclicity assertion on a larger DAG
  const indexDag = { A: { B: 1, C: 1 }, B: { D: 2 }, C: { D: 1 }, D: {} };
  result = buildCraftingDag(indexDag, ["A"]);
  assert.strictEqual(result.length, 4, "four nodes");
  const nodeDagA = result.find((n) => n.itemId === "A");
  const nodeDagB = result.find((n) => n.itemId === "B");
  const nodeDagC = result.find((n) => n.itemId === "C");
  const nodeDagD = result.find((n) => n.itemId === "D");
  assert.strictEqual(nodeDagA.weight, 0, "A has no incoming");
  assert.strictEqual(nodeDagB.weight, 1, "B has one incoming");
  assert.strictEqual(nodeDagC.weight, 1, "C has one incoming");
  assert.strictEqual(nodeDagD.weight, 3, "D has incoming 2+1");
  isDag(result);
}

runTests();
console.log("craftingGraph.buildCraftingDag: all tests passed");

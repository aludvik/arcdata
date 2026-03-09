/**
 * Builds a directed acyclic graph from a crafting index by traversing from start
 * item IDs and skipping any edge that would create a cycle.
 *
 * @param {Record<string, Record<string, number>>} index - Map of item ID to
 *   object mapping target item IDs to numeric weights (e.g. recipe, recyclesInto, salvagesInto).
 * @param {Iterable<string>} startItemIds - Item IDs to use as starting nodes.
 * @returns {{ itemId: string, edges: { targetItemId: string, weight: number }[] }[]}
 */
export function buildCraftingDag(index, startItemIds) {
  const startIds = Array.from(startItemIds, (id) => String(id));
  const nodesSet = new Set();
  const nodeList = [];
  const edgesMap = new Map();
  const processed = new Set();
  const pathSet = new Set();

  function ensureNode(id) {
    if (!nodesSet.has(id)) {
      nodesSet.add(id);
      nodeList.push(id);
      edgesMap.set(id, []);
    }
  }

  function getEdges(id) {
    const key = String(id);
    const entry = index[key];
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    return Object.entries(entry).map(([k, w]) => ({ targetId: String(k), weight: Number(w) }));
  }

  function dfs(u) {
    const uStr = String(u);
    if (processed.has(uStr)) return;
    processed.add(uStr);
    ensureNode(uStr);
    pathSet.add(uStr);

    for (const { targetId: v, weight } of getEdges(uStr)) {
      if (pathSet.has(v)) {
        // eslint-disable-next-line no-console
        console.log("Crafting DAG: skipping edge to avoid cycle", {
          from: uStr,
          to: v,
          weight,
        });
        continue;
      }
      edgesMap.get(uStr).push({ targetItemId: v, weight });
      ensureNode(v);
      dfs(v);
    }

    pathSet.delete(uStr);
  }

  for (const id of startIds) {
    const s = String(id);
    ensureNode(s);
  }
  for (const id of startIds) {
    dfs(String(id));
  }

  return nodeList.map((itemId) => ({
    itemId,
    edges: edgesMap.get(itemId) ?? [],
  }));
}

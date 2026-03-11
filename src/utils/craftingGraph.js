/**
 * Builds a directed acyclic graph from a crafting index by traversing from start
 * item IDs and skipping any edge that would create a cycle.
 *
 * @param {Record<string, Record<string, number>>} index - Map of item ID to
 *   object mapping target item IDs to numeric weights (e.g. recipe, recyclesInto, salvagesInto).
 * @param {Iterable<string>} startItemIds - Item IDs to use as starting nodes.
 * @returns {{ itemId: string, edges: { targetItemId: string, weight: number }[], incomingEdges: { sourceId: string, weight: number }[], weight: number, kind: 'selected'|'intermediary'|'basic' }[]}
 */
export function buildCraftingDag(index, startItemIds) {
  const startIds = Array.from(startItemIds, (id) => String(id));
  const nodesSet = new Set();
  const nodeList = [];
  const outgoingEdgesMap = new Map();
  const incomingEdgesMap = new Map();
  const processed = new Set();
  const pathSet = new Set();

  function ensureNode(id) {
    if (!nodesSet.has(id)) {
      nodesSet.add(id);
      nodeList.push(id);
      outgoingEdgesMap.set(id, []);
      incomingEdgesMap.set(id, []);
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
      ensureNode(v);
      outgoingEdgesMap.get(uStr).push({ targetItemId: v, weight });
      incomingEdgesMap.get(v).push({ sourceId: uStr, weight });
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

  // Topological sort (Kahn's algorithm)
  const inDegreeRemaining = new Map();
  for (const itemId of nodeList) {
    inDegreeRemaining.set(itemId, incomingEdgesMap.get(itemId).length);
  }
  const queue = nodeList.filter((id) => inDegreeRemaining.get(id) === 0);
  const topoOrder = [];
  while (queue.length > 0) {
    const u = queue.shift();
    topoOrder.push(u);
    for (const { targetItemId: v } of outgoingEdgesMap.get(u) ?? []) {
      inDegreeRemaining.set(v, inDegreeRemaining.get(v) - 1);
      if (inDegreeRemaining.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  // Compute weights in topological order
  const nodeWeights = new Map();
  for (const itemId of topoOrder) {
    const incoming = incomingEdgesMap.get(itemId) ?? [];
    if (incoming.length === 0) {
      nodeWeights.set(itemId, 1);
    } else {
      let sum = 0;
      for (const { sourceId, weight } of incoming) {
        sum += (nodeWeights.get(sourceId) ?? 0) * weight;
      }
      nodeWeights.set(itemId, sum);
    }
  }

  return nodeList.map((itemId) => {
    const outgoing = outgoingEdgesMap.get(itemId) ?? [];
    const incoming = incomingEdgesMap.get(itemId) ?? [];
    const hasOutgoing = outgoing.length > 0;
    const hasIncoming = incoming.length > 0;
    let kind;
    if (!hasIncoming) {
      kind = "selected";
    } else if (hasOutgoing) {
      kind = "intermediary";
    } else {
      kind = "basic";
    }
    return {
      itemId,
      edges: outgoing,
      incomingEdges: incoming,
      weight: nodeWeights.get(itemId) ?? 1,
      kind,
    };
  });
}

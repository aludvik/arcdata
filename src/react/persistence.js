const STORAGE_KEY = "arcdata-app-state";
const SCHEMA_VERSION = 1;

/**
 * Returns default values for all persisted app state.
 */
export function getDefaultState() {
  return {
    version: SCHEMA_VERSION,
    searchTerm: "",
    sortColumn: null,
    sortDirection: "asc",
    expandedRowKeys: [],
    selectedItemIds: [],
    lootGuideMode: "crafting",
    sortColumnDag: "kind",
    sortDirectionDag: "asc",
  };
}

/**
 * Loads persisted state from localStorage. Returns null on parse error or missing key.
 * selectedItemIds is returned as an array; caller must convert to Set.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;

    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") return null;

    return {
      version: parsed.version ?? SCHEMA_VERSION,
      searchTerm: typeof parsed.searchTerm === "string" ? parsed.searchTerm : "",
      sortColumn: parsed.sortColumn ?? null,
      sortDirection: parsed.sortDirection === "desc" ? "desc" : "asc",
      expandedRowKeys: Array.isArray(parsed.expandedRowKeys) ? parsed.expandedRowKeys : [],
      selectedItemIds: Array.isArray(parsed.selectedItemIds) ? parsed.selectedItemIds : [],
      lootGuideMode:
        parsed.lootGuideMode === "recycling" || parsed.lootGuideMode === "salvaging"
          ? parsed.lootGuideMode
          : "crafting",
      sortColumnDag: typeof parsed.sortColumnDag === "string" ? parsed.sortColumnDag : "kind",
      sortDirectionDag: parsed.sortDirectionDag === "desc" ? "desc" : "asc",
    };
  } catch {
    return null;
  }
}

/**
 * Saves state to localStorage. Converts selectedItemIds Set to array.
 * Fails silently if localStorage is unavailable (e.g. private browsing).
 */
export function saveState(state) {
  try {
    const toSave = {
      version: SCHEMA_VERSION,
      searchTerm: state.searchTerm ?? "",
      sortColumn: state.sortColumn ?? null,
      sortDirection: state.sortDirection === "desc" ? "desc" : "asc",
      expandedRowKeys: Array.isArray(state.expandedRowKeys) ? state.expandedRowKeys : [],
      selectedItemIds: state.selectedItemIds instanceof Set
        ? Array.from(state.selectedItemIds)
        : Array.isArray(state.selectedItemIds)
          ? state.selectedItemIds
          : [],
      lootGuideMode: state.lootGuideMode ?? "crafting",
      sortColumnDag: state.sortColumnDag ?? "kind",
      sortDirectionDag: state.sortDirectionDag === "desc" ? "desc" : "asc",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage may throw in private/incognito mode
  }
}

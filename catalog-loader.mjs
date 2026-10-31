import { hullVariants } from './hull-variants.mjs?v=subsystems-v1';
// Cache pending requests too, so route changes and item dialogs share one load.
export function createCatalogLoader(index, fetchJSON, decorate = (item) => item, { requireSearchDNA = false } = {}) {
  const groups = new Map(index.categories.flatMap((c) => c.groups.map((g) => [g.id, g])));
  const pending = new Map();
  const itemsByID = new Map();
  function load(url, complete) {
    if (!pending.has(url)) {
      pending.set(
        url,
        fetchJSON(url)
          .then((data) =>
            data.items.map((item) => {
              const result = decorate(item);
              if (complete || !itemsByID.has(item.id)) itemsByID.set(item.id, result);
              return result;
            }),
          )
          .catch((error) => {
            pending.delete(url);
            throw error;
          }),
      );
    }
    return pending.get(url);
  }
  const group = (id) => groups.has(id) ? load(groups.get(id).itemsURL, true) : Promise.resolve([]);
  let completeItems;
  function allGroups() {
    if (!completeItems) {
      completeItems = (async () => {
        const ids = [...groups.keys()], results = [];
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
          while (cursor < ids.length) results.push(...await group(ids[cursor++]));
        }));
        return results;
      })().catch(error => { completeItems = null; throw error; });
    }
    return completeItems;
  }
  // Legacy search chunks omit DNA. Use cached metadata shards so filters,
  // counts, cards and details all resolve the same affiliation, in any order.
  const search = () => requireSearchDNA && index.variantIndexVersion !== 1
    ? allGroups() : load(index.searchURL, false);
  async function variants(dna) {
    return hullVariants(await (index.variantIndexVersion === 1 ? search() : allGroups()), dna);
  }
  async function item(id, preferredGroup) {
    await group(preferredGroup);
    let found = itemsByID.get(id);
    if (!found) found = (await search()).find((i) => i.id === id);
    if (!found) return null;
    await group(found.groupID);
    return itemsByID.get(id);
  }
  return { group, search, item, variants, itemsByID };
}

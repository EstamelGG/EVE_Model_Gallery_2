import { hullKey, createHullVariantIndex } from './hull-variants.mjs?v=e78fb1e434030b41';
// Cache pending requests too, so route changes and item dialogs share one load.
export function createCatalogLoader(index, fetchJSON, decorate = (item) => item) {
  if (index.variantIndexVersion !== 1) throw Error('Unsupported catalog index: regenerate metadata with variantIndexVersion 1');
  const groups = new Map(index.categories.flatMap((c) => c.groups.map((g) => [g.id, g])));
  const pending = new Map();
  const itemsByID = new Map();
  let variantIndex;
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
  const search = () => load(index.searchURL, false);
  async function variants(dna) {
    const hull = hullKey(dna);
    if (!hull) return [];
    const items = await search();
    variantIndex ??= createHullVariantIndex(items);
    return variantIndex.get(hull) || [];
  }
  async function item(id, preferredGroup) {
    if (!itemsByID.has(id)) await group(preferredGroup);
    let found = itemsByID.get(id);
    if (!found) { await search(); found = itemsByID.get(id); }
    if (!found) return null;
    await group(found.groupID);
    return itemsByID.get(id);
  }
  return { group, search, item, variants, peek:id => itemsByID.get(id) };
}

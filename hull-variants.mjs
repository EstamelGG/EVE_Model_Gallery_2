// Full DNA identifies an appearance; only the first component identifies a hull.
export function hullKey(dna) {
  const separator = typeof dna === 'string' ? dna.indexOf(':') : -1;
  if (separator < 0) return '';
  const hull = dna.slice(0, separator);
  const assembled = /^([acgm]sc1_t3)_s1v[1-3];\1_s2v[1-3];\1_s3v[1-3];\1_s4v[1-3]$/.exec(hull);
  return assembled ? assembled[1] : hull;
}

// Build once from the static search index. Each hull is ready for presentation:
// exact-DNA groups and their items are ordered by the lowest Type ID.
export function createHullVariantIndex(items) {
  const hulls = new Map();
  for (const item of items) {
    const hull = hullKey(item.dna);
    if (!hull) continue;
    if (!hulls.has(hull)) hulls.set(hull, []);
    hulls.get(hull).push(item);
  }
  for (const [hull, variants] of hulls) {
    const groups = new Map();
    for (const item of variants.sort((a,b) => a.id-b.id)) {
      if (!groups.has(item.dna)) groups.set(item.dna, {dna:item.dna, items:[]});
      groups.get(item.dna).items.push(item);
    }
    hulls.set(hull, [...groups.values()]);
  }
  return hulls;
}

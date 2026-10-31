// Full DNA identifies an appearance; only the first component identifies a hull.
export function hullKey(dna) {
  if (typeof dna !== 'string' || !dna.includes(':')) return '';
  const hull = dna.split(':')[0];
  const assembled = /^([acgm]sc1_t3)_s1v[1-3];\1_s2v[1-3];\1_s3v[1-3];\1_s4v[1-3]$/.exec(hull);
  return assembled ? assembled[1] : hull;
}

export function hullVariants(items, dna) {
  const hull = hullKey(dna);
  if (!hull) return [];
  return items.filter(item => hullKey(item.dna) === hull).sort((a, b) => Number(a.id) - Number(b.id));
}

export function hullVariantGroups(items, dna) {
  const groups = new Map();
  for (const item of hullVariants(items, dna)) {
    if (!groups.has(item.dna)) groups.set(item.dna, { dna: item.dna, items: [] });
    groups.get(item.dna).items.push(item);
  }
  return [...groups.values()];
}

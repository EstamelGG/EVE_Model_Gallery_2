// Full DNA identifies an appearance; only the first component identifies a hull.
export function hullKey(dna) {
  return typeof dna === 'string' && dna.includes(':') ? dna.split(':')[0] : '';
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

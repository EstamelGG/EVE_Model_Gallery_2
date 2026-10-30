// SDE affiliation is authoritative. SOF faction names below are a conservative
// visual fallback, not a reason to override a type's explicit factionID.
const raceForFaction = new Map(Object.entries({
  500001: 1, 500002: 2, 500003: 4, 500004: 8,
  500005: 16, 500014: 128, 500025: 134, 500026: 135,
}).map(([faction, race]) => [Number(faction), race]));
const factionForDNA = new Map(Object.entries({
  sanshabase: 500019, bloodraider: 500012, serpentis: 500020,
  angelbase: 500011, guristas: 500010, mordubase: 500018,
  soebase: 500016, soctbase: 500017, orebase: 500014,
  ore_consortium: 500014, triglavianbase: 500026,
  concordcivilian: 500006, deathless: 500029, roguebase: 500025,
}));

export function createAffiliationResolver(identities) {
  const factions = new Set(identities.factions.map(f => f.id));
  const races = new Set(identities.races.map(r => r.id));
  const factionResult = (id, source) => ({
    affiliationID: raceForFaction.get(id) || id,
    affiliationSource: source,
  });
  return item => {
    const explicit = identities.typeFactions?.[item.id];
    if (factions.has(explicit)) return factionResult(explicit, 'sde-faction');
    const parts = typeof item.dna === 'string' ? item.dna.split(':') : [];
    const inferred = parts.length >= 3 && parts.slice(0, 3).every(Boolean)
      ? factionForDNA.get(parts[1]) : undefined;
    if (factions.has(inferred)) return factionResult(inferred, 'dna-faction');
    // Do not infer ownership from a hull prefix, display name, SOF race, or
    // nativeTypeID: different affiliations can share all of these resources.
    if (races.has(item.raceID)) return { affiliationID: item.raceID, affiliationSource: 'sde-race' };
    return { affiliationID: null, affiliationSource: 'unknown' };
  };
}

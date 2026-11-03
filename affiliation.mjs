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
  drifter: 500024,
  concordbase: 500006, concordmilitary: 500006,
  'upwell-edencom': 500027,
  air: 500028, air_structure: 500028,
  ammatar: 500007, khanid: 500008, syndicate: 500009,
  sansha_winter: 500019,
}));
// These exact SOF faction tokens have race identities rather than SDE factions.
// The source remains dna-faction: it refers to DNA's second segment, not race.
const raceForDNAFaction = new Map(Object.entries({
  sleeperbase: 64,
  upwell: 168, 'upwell-indy': 168, 'upwell-refinery': 168,
  'upwell-defence': 168, 'upwell-ship': 168,
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
    const token = parts.length >= 3 && parts.slice(0, 3).every(Boolean) ? parts[1] : undefined;
    const inferred = factionForDNA.get(token);
    if (factions.has(inferred)) return factionResult(inferred, 'dna-faction');
    const inferredRace = raceForDNAFaction.get(token);
    if (races.has(inferredRace)) return { affiliationID: inferredRace, affiliationSource: 'dna-faction' };
    // Do not infer ownership from a hull prefix, display name, SOF race, or
    // nativeTypeID: different affiliations can share all of these resources.
    if (races.has(item.raceID)) return { affiliationID: item.raceID, affiliationSource: 'sde-race' };
    return { affiliationID: null, affiliationSource: 'unknown' };
  };
}

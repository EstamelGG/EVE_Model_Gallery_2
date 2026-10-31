// Multipliers preserve the authored material and light rig at 1.
export const renderDefaults = Object.freeze({
  exposure: 0.7, reflection: 0.7, bloom: 0.2, sun: 1, fill: 1, f0: 1, roughness: 1,
});

const raceDefaults = {
  sansha: { f0: 2 },
  triglavian: { f0: 2 },
  concord: { fill: 0.3 },
  soe: { fill: 0.5 },
};

export function renderDefaultsForDNA(dna) {
  const race = typeof dna === 'string' ? dna.split(':')[2] : '';
  return { ...renderDefaults, ...(Object.hasOwn(raceDefaults, race) ? raceDefaults[race] : {}) };
}

export function switchRenderDefaults(values, previousDNA, nextDNA) {
  const settings = normalizeRenderSettings(values);
  const previous = renderDefaultsForDNA(previousDNA), next = renderDefaultsForDNA(nextDNA);
  // Preserve manual tuning within the same preset, and preserve unrelated
  // sliders across ships. Only changed defaults follow the new model's DNA.
  for (const key of Object.keys(renderDefaults)) {
    if (previous[key] !== next[key]) settings[key] = next[key];
  }
  return settings;
}

export function normalizeRenderSettings(values = {}) {
  return Object.fromEntries(Object.entries(renderDefaults).map(([key, fallback]) => {
    const value = Number(values[key] ?? fallback);
    const min = key === 'exposure' || key === 'roughness' ? 0.1 : 0;
    return [key, Number.isFinite(value) ? Math.min(3, Math.max(min, value)) : fallback];
  }));
}


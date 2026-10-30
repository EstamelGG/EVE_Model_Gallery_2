export const textureRoles = Object.freeze([
  'AlbedoMap', 'NormalMap', 'RoughnessMap', 'MaterialMap', 'PaintMaskMap',
  'GlowMap', 'DirtMap', 'DustNoiseMap', 'SailsDetailMap',
  'PatternMask1Map', 'PatternMask2Map',
]);

export function normalizeDisplaySettings(values = {}) {
  return {
    effects: values.effects !== false,
    textures: Object.fromEntries(textureRoles.map(role => [role, values.textures?.[role] !== false])),
  };
}

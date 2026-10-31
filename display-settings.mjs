export const textureRoles = Object.freeze([
  'AlbedoMap', 'NormalMap', 'RoughnessMap', 'MaterialMap', 'PaintMaskMap',
  'GlowMap', 'DirtMap', 'DustNoiseMap', 'SailsDetailMap',
  'PatternMask1Map', 'PatternMask2Map',
]);

export function normalizeDisplaySettings(values = {}) {
  return {
    antialias: values.antialias !== false,
    occlusion: values.occlusion !== false,
    bloom: values.bloom !== false,
    effects: values.effects !== false,
    textures: Object.fromEntries(textureRoles.map(role => [role, values.textures?.[role] !== false])),
  };
}

export const performanceControls = Object.freeze({
  antialias: 'show-antialias', effects: 'show-effects',
  occlusion: 'show-occlusion', bloom: 'show-bloom',
});

export function applyPostprocessingSettings(viewer) {
  const settings = normalizeDisplaySettings(viewer.displaySettings);
  const composer = viewer.querySelector('effect-composer');
  if (!composer) return;
  composer.setAttribute('msaa', String(settings.antialias ? viewer.postprocessingBudget.msaa : 0));
  // SKIP removes effects from the composer's passes, including their update
  // work and the normal pass used by SSAO. Opacity zero would still run them.
  for (const [tag, enabled] of [
    ['smaa-effect', settings.antialias], ['ssao-effect', settings.occlusion],
    ['bloom-effect', settings.bloom && viewer.renderSettings.bloom > 0],
  ]) composer.querySelector(tag)?.setAttribute('blend-mode', enabled ? 'default' : 'skip');
  composer.querySelector('bloom-effect')?.setAttribute('strength', String(viewer.renderSettings.bloom));
  composer.queueRender();
}

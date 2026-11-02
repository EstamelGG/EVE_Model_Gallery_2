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
    depthOfField: values.depthOfField === true,
    effects: values.effects !== false,
    noColor: values.noColor === true,
    textures: Object.fromEntries(textureRoles.map(role => [role, values.textures?.[role] !== false])),
  };
}

export const performanceControls = Object.freeze({
  antialias: 'show-antialias', effects: 'show-effects',
  occlusion: 'show-occlusion', bloom: 'show-bloom',
  depthOfField: 'show-dof', noColor: 'no-color',
});

export function applyPostprocessingSettings(viewer) {
  const settings = normalizeDisplaySettings(viewer.displaySettings);
  const composer = viewer.querySelector('effect-composer');
  if (!composer) return;
  composer.setAttribute('msaa', String(settings.antialias ? viewer.postprocessingBudget.msaa : 0));
  const ao=composer.querySelector('ssao-effect')?.effects?.[0];
  if(ao&&ao.resolution.scale!==viewer.postprocessingBudget.aoScale)ao.resolution.scale=viewer.postprocessingBudget.aoScale;
  // SKIP removes effects from the composer's passes, including their update
  // work and the normal pass used by SSAO. Opacity zero would still run them.
  for (const [tag, enabled] of [
    ['smaa-effect', settings.antialias], ['ssao-effect', settings.occlusion],
    ['bloom-effect', settings.bloom && viewer.renderSettings.bloom > 0],
    ['eve-depth-of-field', settings.depthOfField && viewer.renderSettings.depthOfField > 0],
  ]) composer.querySelector(tag)?.setAttribute('blend-mode', enabled ? 'default' : 'skip');
  composer.querySelector('bloom-effect')?.setAttribute('strength', String(viewer.renderSettings.bloom));
  const dof=composer.querySelector('eve-depth-of-field');
  if(dof?.effects?.[0])dof.effects[0].bokehScale=viewer.renderSettings.depthOfField*2;
  composer.queueRender();
}

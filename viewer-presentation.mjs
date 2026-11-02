import { postprocessingBudget, occlusionRadius } from './viewer-profile.mjs?v=e78fb1e434030b41';

export function createViewerPostprocessing(viewer, { triangles, nativePreview }) {
  // Preserve HDR precision and multisample the geometry before postprocessing.
  const composer = document.createElement('effect-composer');
  const budget = postprocessingBudget(triangles);
  viewer.postprocessingBudget = budget;
  composer.setAttribute('render-mode', 'quality');
  composer.setAttribute('msaa', String(budget.msaa));
  const occlusion = document.createElement('ssao-effect');
  occlusion.setAttribute('strength', '3');
  // The addon's small default radius only darkens hairline contacts.
  // Sample across adjacent hull panels and supports, with enough samples
  // to keep the wider occlusion smooth rather than grainy.
  const ao = occlusion.effects[0];
  // Keep hull shading/textures at full resolution; only the occlusion
  // buffer uses fewer pixels on large meshes.
  ao.resolution.scale = budget.aoScale;
  ao.luminanceInfluence = 0.15;
  occlusion.setAttribute('blend-mode', 'default');
  // Offscreen HDR buffers need an explicit final tone-map pass; renderer
  // exposure alone does not affect the composited image without it.
  const colorGrade = document.createElement('color-grade-effect');
  // The captured preview has no tonemapping or dynamic-exposure effect.
  // Neutral's black-offset would add an unrelated shadow-crushing curve.
  colorGrade.setAttribute('tonemapping', nativePreview ? 'linear' : 'neutral');
  const antialias = document.createElement('smaa-effect');
  // Keep SMAA for thin edges, with a shorter search on large meshes.
  antialias.setAttribute('quality', budget.smaa);
  antialias.effects[0].requireSeparatePass = true;
  const bloom = document.createElement('bloom-effect');
  bloom.setAttribute('strength', String(viewer.renderSettings.bloom));
  bloom.setAttribute('blend-mode', viewer.renderSettings.bloom > 0 ? 'default' : 'skip');
  bloom.setAttribute('threshold', '0.05');
  bloom.setAttribute('smoothing', '0.1');
  bloom.setAttribute('radius', '0.65');
  // Blur only the separate HDR emission source; paint, reflections and the
  // starfield never feed the bloom. Compose before exposure/tone mapping.
  colorGrade.effects[0].requireSeparatePass = true;
  const depthOfField=document.createElement('eve-depth-of-field');
  depthOfField.setAttribute('blend-mode','skip');
  composer.append(occlusion, bloom, depthOfField, colorGrade, antialias);
  viewer.append(composer);

  return { composer, occlusion, ao, bloom };
}

export function watchOcclusionRadius(viewer, { homeDistance, profile, ao, composer, isActive }) {
  const homeFov = (viewer.getFieldOfView() * Math.PI) / 360;
  let radiusUpdate;
  const update = () => {
    if (!isActive()) return;
    const zoom =
      ((homeDistance / viewer.getCameraOrbit().radius) * Math.tan(homeFov)) /
      Math.tan((viewer.getFieldOfView() * Math.PI) / 360);
    const radius = occlusionRadius(profile.radius, zoom);
    clearTimeout(radiusUpdate);
    if (Math.abs(ao.ssaoMaterial.radius - radius) > 0.001) {
      // Radius is a shader define in postprocessing: changing it while
      // scrolling recompiles a program for almost every camera frame.
      radiusUpdate = setTimeout(() => {
        if (!isActive()) return;
        ao.ssaoMaterial.radius = radius;
        composer.queueRender();
      }, 200);
    }
  };
  viewer.addEventListener('camera-change', update);
  return () => {
    clearTimeout(radiusUpdate);
    viewer.removeEventListener('camera-change', update);
  };
}

export function configureHullAnimations(
  viewer,
  { row, select, translate: t, play: playHullAnimation, isActive },
) {
  const sceneAnimations = viewer.shipEffects?.sceneEffects?.hullAnimations;
  const clips = sceneAnimations?.names || viewer.availableAnimations;
  row.hidden = !clips.length;
  select.replaceChildren(
    ...clips.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      const key = name.split('.').pop();
      option.textContent = t(key);
      return option;
    }),
  );
  if (clips.length) {
    const normal =
      (viewer.equipmentPreview && clips.find((name) => name.split('.').pop().toLowerCase() === 'active')) ||
      sceneAnimations?.initial ||
      clips.find((name) =>
        viewer.equipmentPreview
          ? /inactive|deactive|idle/i.test(name)
          : name.endsWith('.NormalLoop'),
      ) ||
      clips[0];
    if (sceneAnimations?.initial) viewer.animationCrossfadeDuration = 0;
    select.value = normal;
    viewer.animationName = normal;
    playHullAnimation(viewer);
  }
  const finish = () => {
    if (!isActive()) return;
    const destination = (viewer.animationName || '').split('.').pop().split('2')[1];
    const settled = destination && clips.find((name) => name.split('.').pop() === destination);
    if (!settled) return;
    // Native state transitions hand off to the destination loop. Holding
    // the transition's final frame would leave its one-shot FX frozen.
    select.value = settled;
    viewer.animationName = settled;
    viewer.currentTime = 0;
    playHullAnimation(viewer);
  };
  if (sceneAnimations) viewer.addEventListener('finished', finish);
  return () => viewer.removeEventListener('finished', finish);
}

export async function initializeViewerCamera(
  viewer,
  { profile, composer, occlusion, ao, isActive },
) {
  viewer.lifecycle.release('releasePreload');
  viewer.jumpCameraToGoal();
  // Native wheel/pinch controls vary FOV when both radius limits agree.
  // Keep enough clearance even when panning the target onto the hull.
  const dimensions = viewer.getDimensions();
  const homeDistance = Math.max(
    viewer.getCameraOrbit().radius,
    Math.hypot(dimensions.x, dimensions.y, dimensions.z) * 1.1,
  );
  viewer.dataset.homeDistance = String(homeDistance);
  viewer.setAttribute('min-camera-orbit', `auto auto ${homeDistance}m`);
  viewer.setAttribute(
    'max-camera-orbit',
    `auto ${viewer.equipmentPreview ? '86deg' : 'auto'} ${homeDistance}m`,
  );
  viewer.cameraOrbit = `35deg 70deg ${homeDistance}m`;
  await viewer.updateComplete;
  if (!isActive()) return false;
  viewer.jumpCameraToGoal();
  occlusion.strength = profile.strength;
  Object.assign(ao.ssaoMaterial, {
    radius: profile.radius,
    samples: profile.samples,
    bias: profile.bias,
    fade: profile.fade,
  });
  // Preserve authored/exported material values; scene scale and AO must
  // never serve as a reason to retune surface roughness or metalness.
  for (const [index, material] of viewer.model.materials.entries()) {
    const pbr = material.pbrMetallicRoughness;
    const original =
      viewer.originalGltfJson.materials[index]?.pbrMetallicRoughness?.roughnessFactor ?? 1;
    pbr.setRoughnessFactor(original * profile.roughnessMultiplier);
  }
  viewer.lifecycle.set(
    'disposeCameraRadius',
    watchOcclusionRadius(viewer, { homeDistance, profile, ao, composer, isActive }),
  );
  viewer.dataset.renderProfile = JSON.stringify(profile);

  return true;
}

export function configureViewerControls(
  viewer,
  { label, exposure, profile, autoRotate, installAutoRotate },
) {
  viewer.setAttribute('alt', label);
  viewer.setAttribute('camera-controls', '');
  viewer.setAttribute('loading', 'eager');
  viewer.setAttribute('interaction-prompt', 'none');
  viewer.setAttribute('camera-orbit', '35deg 70deg auto');
  viewer.setAttribute('field-of-view', '30deg');
  viewer.setAttribute('min-field-of-view', '8deg');
  viewer.setAttribute('max-field-of-view', '60deg');
  viewer.setAttribute('environment-image', 'neutral');
  viewer.setAttribute('tone-mapping', 'neutral');
  viewer.setAttribute('exposure', exposure);
  viewer.setAttribute('shadow-intensity', '0');
  if (profile) viewer.setAttribute('scale', `${profile.scale} ${profile.scale} ${profile.scale}`);
  viewer.setAttribute('rotation-per-second', '6deg');
  viewer.setAttribute('auto-rotate-delay', '5000');
  viewer.lifecycle.set('disposeAutoRotate', installAutoRotate(viewer));
  if (autoRotate) viewer.setAttribute('auto-rotate', '');
}

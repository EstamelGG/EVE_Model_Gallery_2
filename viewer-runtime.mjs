import {createViewerController, viewerUpdateKind} from './viewer-controller.mjs?v=af12e26060b5f9ff';
import {createViewerLifecycle} from './viewer-lifecycle.mjs?v=af12e26060b5f9ff';
import {createViewerPostprocessing, initializeViewerCamera, configureViewerControls} from './viewer-presentation.mjs?v=af12e26060b5f9ff';
import {viewerProfile} from './viewer-profile.mjs?v=af12e26060b5f9ff';
import {resourceURL} from './resource-location.mjs?v=af12e26060b5f9ff';
import {trackResource} from './resource-activity.mjs?v=af12e26060b5f9ff';
import {applyPostprocessingSettings} from './display-settings.mjs?v=af12e26060b5f9ff';
import {recenterView} from './view-reset.mjs?v=af12e26060b5f9ff';

// Wait for the actual model event, and detach listeners on success, failure,
// cancellation or a synchronous setup failure. Shared asset requests continue.
export function waitForModel(viewer, signal, start) {
  return new Promise((resolve, reject) => {
    const finish = (value, error) => {
      viewer.removeEventListener('load', loaded);
      viewer.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancelled);
      if (error) reject(error); else resolve(value);
    };
    const loaded = () => finish(true);
    const failed = () => finish(false, Object.assign(Error('Model asset loading failed'), {viewerError:'errorAssets'}));
    const cancelled = () => finish(false);
    if (signal.aborted) { resolve(false); return; }
    viewer.addEventListener('load', loaded, {once:true});
    viewer.addEventListener('error', failed, {once:true});
    signal.addEventListener('abort', cancelled, {once:true});
    try { start(); } catch (error) { finish(false, error); }
  });
}

// The runtime owns loading and rendering order. The view supplies settings and
// presents progress/results; it never installs materials or replaces geometry.
export function createViewerRuntime({mount, transition, loadRenderer, view}) {
  const controller = createViewerController();
  let api, pendingModule;
  const sourceURL = item => {
    const url = new URL(resourceURL(item.model), location.href);
    url.searchParams.set('v', item.modelRevision);
    return url.href;
  };
  const reportCleanup = errors => {
    for (const error of errors) console.error('Viewer cleanup failed', error);
  };
  function cancel() {
    reportCleanup(controller.cancel());
    if (controller.viewer) controller.viewer.exportReady = false;
  }
  function release() {
    reportCleanup(controller.releaseViewer());
    view.reset();
    mount.replaceChildren();
  }
  async function renderer() {
    pendingModule ||= trackResource('model-viewer-ao.min.js', loadRenderer).catch(error => {
      pendingModule = null;
      throw error;
    });
    return api = await pendingModule;
  }
  function applyRenderSettings(values) {
    const viewer = controller.viewer;
    if (!viewer) return;
    viewer.renderSettings = values;
    viewer.setAttribute('exposure', values.exposure);
    viewer.setRenderSettings?.(values);
    applyPostprocessingSettings(viewer);
  }
  function applyDisplaySettings(values) {
    const viewer = controller.viewer;
    if (!viewer) return;
    viewer.displaySettings = values;
    viewer.dataset.displaySettings = JSON.stringify(values);
    viewer.setDisplaySettings?.(values);
    viewer.shipEffects?.setVisible(values.effects);
    applyPostprocessingSettings(viewer);
  }
  function fail(key, error, operation) {
    if (!operation.isCurrent()) return;
    controller.viewer?.lifecycle.clearTimer();
    cancel();
    view.failed({key, error});
  }
  async function plan(viewer, item, context) {
    const {settings, batch, operation} = context;
    await api.planViewerResources(viewer, item, settings.nativePreview, settings.background, batch);
    if (operation.isCurrent()) view.progress(2);
  }
  async function prepare(viewer, item, context) {
    const {settings, operation} = context, source = sourceURL(item);
    if (item.subsystemParts) {
      const {prepareSubsystemModel} = await import('./subsystem-assembly.mjs?v=af12e26060b5f9ff');
      await trackResource(source, () => prepareSubsystemModel(viewer.assetSession, item, source, location.href), 'resourceModel');
      if (!operation.isCurrent()) return null;
    }
    await plan(viewer, {...item, model:source}, context);
    if (!operation.isCurrent()) return null;
    if (item.renderKind === 'equipment') viewer.equipmentPreview = await api.loadEquipmentPreview(viewer, item.effects);
    else void api.prefetchViewerAssets(viewer, item.effects, !!settings.nativePreview).catch(() => {});
    if (!operation.isCurrent()) return null;
    // Observe early errors while warming settings; the installer awaits this
    // same session-cached promise and failed requests remain retryable.
    if (settings.nativePreview) viewer.assetSession.json(settings.nativePreview).catch(() => {});
    const preload = await api.preloadModel(viewer, source, () => {});
    if (!operation.isCurrent()) { preload.release(); return null; }
    viewer.lifecycle.set('releasePreload', preload.release);
    viewer.sourceDimensions = preload.dimensions;
    view.dimensions(item, preload.dimensions);
    return source;
  }
  async function install(viewer, item, context) {
    const {settings, operation, savedView, request, composer} = context;
    viewer.lifecycle.set('disposeDimensionFrame', api.watchDimensionFrame(viewer, view.dimensionFrame));
    if (settings.nativePreview) viewer.lifecycle.set('pendingNativeSurfaces', api.prepareNativeSurfaces(viewer));
    viewer.lifecycle.set('disposeOcclusion', api.installHullOcclusion(composer));
    viewer.dataset.occlusionSurface = 'depth-writing-geometry';
    if (viewer.equipmentPreview) viewer.lifecycle.set('disposeEquipment', await api.installEquipmentPreview(viewer));
    else void view.environment(viewer, api);
    if (!operation.isCurrent()) return false;
    if (!savedView) {
      composer.queueRender();
      await api.waitForFrame(viewer);
      if (!operation.isCurrent()) return false;
      viewer.geometryReady = transition.revealGeometry(request);
    }
    const native = settings.nativePreview ? await viewer.assetSession.json(settings.nativePreview) : null;
    if (!operation.isCurrent()) return false;
    if (native) {
      const dispose = await api.installNativePreview(viewer, native, item.model, item.nativeTypeID || item.id,
        item.dna, {progressive:!savedView});
      viewer.lifecycle.set('disposeNative', dispose);
      if (!operation.isCurrent()) return false;
      applyDisplaySettings(view.settings().display);
    }
    view.progress(4);
    if (item.effects && !viewer.equipmentPreview) {
      const effects = item.subsystemParts
        ? await api.installSubsystemParts(viewer, item, native)
        : await api.installShipEffects(viewer, item.effects, 'cruise');
      viewer.lifecycle.set('shipEffects', effects);
      if (!operation.isCurrent()) return false;
    }
    view.installed(viewer, item, api, 'model');
    applyDisplaySettings(view.settings().display);
    return true;
  }
  async function present(viewer, item, context, kind) {
    const {operation, savedView, request} = context;
    view.progress(5);
    let target;
    if (savedView) target = await api.restoreView(viewer, savedView, {recenter:kind === 'model'});
    else if (kind === 'model' && transition.view) {
      target = viewer.getCameraTarget();
      const previous = transition.view.target;
      viewer.cameraTarget = `${previous.x}m ${previous.y}m ${previous.z}m`;
      await viewer.updateComplete;
      viewer.jumpCameraToGoal();
    }
    if (kind === 'model') context.composer.queueRender();
    await api.waitForFrame(viewer);
    if (!operation.isCurrent()) return false;
    viewer.lifecycle.clearTimer();
    const previous = transition.view?.target;
    transition.finish(request);
    if (target && previous && ['x','y','z'].some(axis => Math.abs(target[axis]-previous[axis])>1e-6)) recenterView(viewer, target);
    operation.finish();
    viewer.dataset.appearanceTypeId = String(item.id);
    view.ready(viewer, item, kind);
    return true;
  }
  async function appearance(viewer, item, context) {
    const {operation, settings} = context, source = sourceURL(item);
    const applied = await operation.enqueue(viewer, async () => {
      if (source === (viewer.appearanceURL || viewer.src) && item.effects === viewer.readyItem?.effects) return true;
      if (!new URL(source).pathname.endsWith('.gltf')) return false;
      await plan(viewer, {...item, model:source}, context);
      if (!operation.isCurrent()) return false;
      void api.prefetchViewerAssets(viewer, item.effects, !!settings.nativePreview).catch(() => {});
      const document = await viewer.assetSession.json(source);
      if (!operation.isCurrent()) return false;
      if (!api.canReuseHull(viewer.baseDocument || viewer.originalGltfJson, viewer.src, document, source)) return false;
      view.progress(3);
      const native = await viewer.assetSession.json(settings.nativePreview);
      if (!operation.isCurrent()) return false;
      const update = await api.prepareAppearanceUpdate(viewer, {item, document, source, settings:native}, operation);
      if (!operation.commit(update)) return false;
      view.progress(4);
      viewer.dataset.appearanceUpdates = String(Number(viewer.dataset.appearanceUpdates || 0)+1);
      return true;
    });
    if (!applied || !operation.isCurrent()) return false;
    view.installed(viewer, item, api, 'appearance');
    view.dimensions(item, viewer.sourceDimensions);
    applyRenderSettings(view.settings().render);
    applyDisplaySettings(view.settings().display);
    return present(viewer, item, context, 'appearance');
  }
  async function subsystems(viewer, item, context) {
    const {operation} = context;
    return operation.enqueue(viewer, async () => {
      if (!await viewer.subsystemAssembly.replace(item, operation.isCurrent) || !operation.isCurrent()) return false;
      operation.publish();
      viewer.appearanceURL = sourceURL(item);
      viewer.dataset.subsystemSelection = item.subsystemSelection;
      viewer.dataset.subsystemUpdates = String(Number(viewer.dataset.subsystemUpdates || 0)+1);
      view.installed(viewer, item, api, 'subsystems');
      viewer.lifecycle.set('disposeDimensionFrame', api.watchDimensionFrame(viewer, view.dimensionFrame));
      view.dimensions(item, viewer.sourceDimensions);
      applyDisplaySettings(view.settings().display);
      await api.waitForFrame(viewer);
      if (!operation.finish()) return false;
      view.ready(viewer, item, 'subsystems');
      return true;
    });
  }
  async function create(item, context, profile) {
    const {operation, settings} = context;
    release();
    view.progress(2);
    await renderer();
    await customElements.whenDefined('model-viewer');
    if (!operation.isCurrent()) return false;
    customElements.get('model-viewer').modelCacheSize = 1;
    const viewer = document.createElement('model-viewer');
    viewer.lifecycle = createViewerLifecycle(viewer);
    viewer.assetSession = controller.session(() => api.createViewerSession());
    viewer.assetSession.race ||= item.dna?.split(':')[2] || 'gallente';
    viewer.previewRace = viewer.assetSession.race;
    if (!operation.attach(viewer)) return false;
    const source = await prepare(viewer, item, context);
    if (!source || !operation.isCurrent()) return false;
    profile ||= viewerProfile(viewer.sourceDimensions);
    const controls = view.settings();
    viewer.killCount = controls.killCount;
    viewer.renderSettings = controls.render;
    viewer.displaySettings = controls.display;
    configureViewerControls(viewer, {label:view.label(item), exposure:viewer.renderSettings.exposure,
      profile, autoRotate:controls.autoRotate, installAutoRotate:api.installSmoothAutoRotate});
    Object.assign(context, createViewerPostprocessing(viewer, {triangles:item.triangles, nativePreview:settings.nativePreview}));
    const loaded = await waitForModel(viewer, operation.signal, () => {
      viewer.setAttribute('src', source);
      mount.append(viewer);
      viewer.lifecycle.set('disposeBloom', api.installViewerBloom(viewer, context.bloom));
      applyPostprocessingSettings(viewer);
      view.connected(viewer, api);
      viewer.lifecycle.setTimer(() => fail('errorTimeout', Error('Viewer loading timed out'), operation), 90000);
    });
    if (!loaded || !operation.isCurrent()) return false;
    context.errorKey = 'errorInit';
    view.progress(3);
    if (!await initializeViewerCamera(viewer, {...context, profile, isActive:() => controller.viewer === viewer})) return false;
    if (!operation.isCurrent() || !await install(viewer, item, context)) return false;
    return present(viewer, item, context, 'model');
  }
  async function show(item, profile = null) {
    const operation = controller.begin(item), viewer = controller.viewer;
    const kind = viewerUpdateKind(viewer, item, {native:!!view.settings().nativePreview, profile});
    const request = kind === 'subsystems' ? transition.reset() : transition.begin(viewer, api);
    const savedView = viewer?.readyItem?.renderKind === item.renderKind ? transition.view : null;
    view.begin(item, kind);
    const context = {operation, request, savedView, settings:view.settings(), batch:view.batch(), errorKey:'errorViewer'};
    try {
      if (kind !== 'model') {
        try {
          const complete = kind === 'subsystems' ? await subsystems(viewer, item, context) : await appearance(viewer, item, context);
          if (complete || !operation.isCurrent()) return complete;
        } catch (error) {
          if (!operation.isCurrent()) return false;
          reportCleanup(operation.dispose());
          if (kind === 'subsystems' || (viewer.disposeNative && viewer.readyItem !== item)) {
            transition.finish(request);
            viewer.exportReady = true;
            view.failed({error, kind, retained:viewer.readyItem});
            return false;
          }
          console.warn('Viewer update fell back to full loading', error);
        }
      }
      return await create(item, context, profile);
    } catch (error) {
      fail(error.viewerError || context.errorKey, error, operation);
      return false;
    }
  }
  return {
    get viewer() { return controller.viewer; },
    get readyItem() { return controller.viewer?.readyItem; },
    get canExport() { return !!controller.viewer?.exportReady; },
    show, cancel, applyRenderSettings, applyDisplaySettings,
    close() { transition.reset(); reportCleanup(controller.close()); view.reset(); mount.replaceChildren(); },
    exportModel(format) {
      if (!controller.viewer?.exportReady) throw Error('Viewer is not ready for export');
      return api.exportModel(controller.viewer, format);
    },
  };
}

import { cancelViewReset } from './view-reset.mjs?v=db41ce1c6c6ffa82';

// Effects must detach before native materials are restored. The asset session
// belongs to the dialog and deliberately survives individual viewer instances.
const disposalOrder = [
  'disposeResize',
  'hangar',
  'skybox',
  'disposeFPS',
  'disposeAutoRotate',
  'disposeDimensionFrame',
  'disposeCameraRadius',
  'disposeHullAnimations',
  'disposeBloom',
  'releasePreload',
  'disposeOcclusion',
  'shipEffects',
  'fitting',
  'disposeNative',
  'disposeSubsystemLabels',
  'disposeEquipment',
  'pendingNativeSurfaces',
];

export function createViewerLifecycle(viewer) {
  const resources = new Map(),
    listeners = new Set();
  let disposed = false,
    timer, suspended = false, callback, remaining = 0, started = 0;
  const destroy = (value) => {
    if (typeof value === 'function') value.call(viewer);
    else value?.dispose();
  };
  const release = (key) => {
    if (!resources.has(key)) return;
    const value = resources.get(key);
    resources.delete(key);
    if (viewer[key] === value) delete viewer[key];
    destroy(value);
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
    callback = undefined;
  };
  const armTimer = () => {
    if (!callback || suspended || disposed) return;
    started = performance.now();
    timer = setTimeout(() => {
      const run = callback;
      clearTimer();
      run();
    }, remaining);
  };
  return {
    get disposed() {
      return disposed;
    },
    set(key, value) {
      // A completed asynchronous load may arrive after the dialog closed.
      if (disposed) {
        destroy(value);
        return false;
      }
      if (resources.get(key) === value) return true;
      release(key);
      resources.set(key, value);
      viewer[key] = value;
      return true;
    },
    release,
    listen(target, type, handler, options) {
      if (disposed) return;
      target.addEventListener(type, handler, options);
      listeners.add(() => target.removeEventListener(type, handler, options));
    },
    setTimer(run, delay) {
      clearTimer();
      if (!disposed) { callback = run; remaining = delay; armTimer(); }
    },
    setSuspended(value) {
      if (value === suspended) return;
      suspended = value;
      if (suspended && timer !== undefined) {
        remaining = Math.max(0, remaining - (performance.now() - started));
        clearTimeout(timer); timer = undefined;
      } else if (!suspended) armTimer();
    },
    clearTimer,
    dispose() {
      if (disposed) return [];
      disposed = true;
      viewer.exportReady = false;
      clearTimer();
      const errors = [];
      const attempt = (action) => {
        try {
          action();
        } catch (error) {
          errors.push(error);
        }
      };
      for (const remove of listeners) attempt(remove);
      listeners.clear();
      attempt(() => release('skybox'));
      attempt(() => cancelViewReset(viewer));
      for (const key of disposalOrder) attempt(() => release(key));
      for (const key of [...resources.keys()]) attempt(() => release(key));
      attempt(() => viewer.remove());
      return errors;
    },
  };
}

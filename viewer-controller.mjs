// A dialog owns the asset cache; a viewer owns its scene; an operation owns
// uncommitted work. Rendering and DOM presentation stay outside this module.
export function createViewerController() {
  let viewer = null, assets = null, operation = null;
  const queues = new WeakMap();
  function cancel() {
    const previous = operation;
    operation = null;
    previous?.abort();
    return previous?.dispose() || [];
  }
  function releaseViewer() {
    const previous = viewer;
    viewer = null;
    return previous?.lifecycle.dispose() || [];
  }
  return {
    get viewer() { return viewer; },
    session(create) { return assets ||= create(); },
    cancel,
    releaseViewer,
    begin(item) {
      cancel();
      if (viewer) viewer.exportReady = false;
      const pending = new Set();
      const cancellation = new AbortController();
      const request = {
        item,
        signal: cancellation.signal,
        abort: () => cancellation.abort(),
        isCurrent: () => operation === request,
        own(resource) {
          if (request.isCurrent()) pending.add(resource);
          else resource.dispose();
          return resource;
        },
        commit(resource) {
          if (!request.isCurrent()) return false;
          resource.commit();
          pending.delete(resource);
          request.publish();
          return true;
        },
        attach(next) {
          if (!request.isCurrent()) { next.lifecycle.dispose(); return false; }
          releaseViewer();
          viewer = next;
          return true;
        },
        enqueue(target, update) {
          const task = (queues.get(target) || Promise.resolve()).catch(() => {}).then(() => {
            if (request.isCurrent() && viewer === target) return update();
          });
          queues.set(target, task);
          return task;
        },
        publish() {
          if (!request.isCurrent() || !viewer) return false;
          viewer.readyItem = item;
          return true;
        },
        finish() {
          if (!request.publish()) return false;
          viewer.exportReady = true;
          return true;
        },
        dispose() {
          const errors = [];
          for (const resource of pending) {
            try { resource.dispose(); } catch (error) { errors.push(error); }
          }
          pending.clear();
          return errors;
        },
      };
      operation = request;
      return request;
    },
    close() {
      const errors = [...cancel(), ...releaseViewer()];
      const previous = assets;
      assets = null;
      try { previous?.dispose(); } catch (error) { errors.push(error); }
      return errors;
    },
  };
}

export function viewerUpdateKind(viewer, item, { native = false, profile = null } = {}) {
  const current = viewer?.readyItem;
  if (profile || !current) return 'model';
  if (item.subsystemParts && viewer.subsystemAssembly && current.id === item.id) return 'subsystems';
  if (!native || item.subsystemParts || current.subsystemParts ||
      item.renderKind === 'equipment' || current.renderKind === 'equipment') return 'model';
  return 'appearance'; // Geometry compatibility is checked after reading the document.
}

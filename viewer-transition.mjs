// Keep the last complete frame through material updates, geometry replacements,
// and rapid successive selections. Only the latest request may reveal a frame.
export function createViewerTransition(stage, canvas) {
  let revision = 0, view = null;
  function clear() {
    delete stage.dataset.preparing;
    delete stage.dataset.switching;
    delete stage.dataset.progressive;
    canvas.hidden = true;
    canvas.width = canvas.height = 0;
    view = null;
  }
  return {
    begin(viewer, module) {
      delete stage.dataset.progressive;
      if (!stage.dataset.preparing && (viewer?.readyItem || viewer?.geometryReady) && module) {
        view = module.captureView(viewer);
        module.captureFrame(viewer, canvas);
        canvas.hidden = false;
        stage.dataset.switching = 'true';
      }
      stage.dataset.preparing = 'true';
      return ++revision;
    },
    get view() { return view; },
    isCurrent(token) { return revision === token; },
    revealGeometry(token) {
      if (revision !== token || stage.dataset.switching) return false;
      delete stage.dataset.preparing;
      stage.dataset.progressive = 'true';
      return true;
    },
    finish(token) {
      if (revision !== token) return false;
      clear();
      return true;
    },
    reset() { ++revision; clear(); },
  };
}

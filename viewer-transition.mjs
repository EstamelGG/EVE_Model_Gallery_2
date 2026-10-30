// Keep the last complete frame through material updates, geometry replacements,
// and rapid successive selections. Only the latest request may reveal a frame.
export function createViewerTransition(stage, canvas) {
  let revision = 0, view = null;
  function clear() {
    delete stage.dataset.preparing;
    delete stage.dataset.switching;
    canvas.hidden = true;
    canvas.width = canvas.height = 0;
    view = null;
  }
  return {
    begin(viewer, module) {
      if (!stage.dataset.preparing && viewer?.readyItem && module) {
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
    finish(token) {
      if (revision !== token) return false;
      clear();
      return true;
    },
    reset() { ++revision; clear(); },
  };
}

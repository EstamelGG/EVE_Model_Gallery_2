// Keep the last complete frame through material updates, geometry replacements,
// and rapid successive selections. Only the latest request may reveal a frame.
export function createViewerTransition(stage, canvas) {
  let revision = 0, view = null, fade = null;
  function clear() {
    fade?.cancel(); fade = null;
    delete stage.dataset.preparing;
    delete stage.dataset.switching;
    delete stage.dataset.progressive;
    delete stage.dataset.crossfading;
    canvas.hidden = true;
    canvas.width = canvas.height = 0;
    view = null;
  }
  return {
    begin(viewer, module) {
      delete stage.dataset.progressive;
      // A second selection during the dissolve starts from the visible blend.
      const opacity = fade ? 1-(fade.effect.getComputedTiming().progress ?? 0) : 0;
      fade?.cancel(); fade = null; delete stage.dataset.crossfading;
      if (!stage.dataset.preparing && (viewer?.readyItem || viewer?.geometryReady) && module) {
        view = module.captureView(viewer);
        module.captureFrame(viewer, canvas, opacity);
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
      delete stage.dataset.preparing;
      delete stage.dataset.progressive;
      if (!canvas.hidden && canvas.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        stage.dataset.crossfading = 'true';
        const animation = canvas.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-in-out', fill:'forwards'});
        fade = animation;
        animation.finished.then(() => {
          if (revision === token && fade === animation) clear();
        }, () => {});
      } else clear();
      return true;
    },
    reset() { ++revision; clear(); },
  };
}

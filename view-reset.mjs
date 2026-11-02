// The page and separately bundled renderer must share cancellation and limits.
const cameraState = Symbol.for('eve.viewer-camera-transitions');
const {pendingResets,focusLimits} = globalThis[cameraState] ||= {
  pendingResets:new WeakMap(),focusLimits:new WeakMap(),
};
const duration = 650;

export function cancelViewReset(viewer) {
  pendingResets.get(viewer)?.();
}

export function resetView(viewer, {
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  target = 'auto auto auto', preserveOrbit = false, interruptFocus = false,
} = {}) {
  cancelViewReset(viewer);
  const autoRotate = viewer.autoRotate;
  const decay = viewer.interpolationDecay;
  const startYaw = viewer.turntableRotation;
  // Return by the shortest turn even after several complete auto-rotations.
  const yawDelta = -Math.atan2(Math.sin(startYaw), Math.cos(startYaw));
  let frame;
  const finish = () => {
    cancelAnimationFrame(frame);
    pendingResets.delete(viewer);
    viewer.removeEventListener('pointerdown', interrupt);
    viewer.removeEventListener('wheel', interrupt);
    viewer.removeEventListener('camera-change', onCameraChange);
    viewer.interpolationDecay = decay;
    viewer.autoRotate = autoRotate;
  };
  const interrupt = () => {
    if (interruptFocus) {
      const current = viewer.getCameraTarget(), orbit = viewer.getCameraOrbit();
      viewer.cameraTarget = `${current.x}m ${current.y}m ${current.z}m`;
      viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
    }
    finish();
  };
  const onCameraChange = event => {
    if (event.detail?.source === 'user-interaction') finish();
  };

  if (!preserveOrbit) {
    restoreFocusLimits(viewer);
    viewer.cameraOrbit = `35deg 70deg ${viewer.dataset.homeDistance ? viewer.dataset.homeDistance + 'm' : 'auto'}`;
    viewer.fieldOfView = '30deg';
  }
  viewer.cameraTarget = target;
  if (reducedMotion) {
    if (!preserveOrbit) viewer.resetTurntableRotation();
    viewer.jumpCameraToGoal();
    return;
  }

  // Let model-viewer ease orbit, pan and zoom. Turntable yaw needs its own
  // transition: resetTurntableRotation() otherwise changes it immediately.
  viewer.interpolationDecay = 100;
  viewer.autoRotate = false;
  pendingResets.set(viewer, finish);
  viewer.addEventListener('pointerdown', interrupt, {passive: true});
  viewer.addEventListener('wheel', interrupt, {passive: true});
  viewer.addEventListener('camera-change', onCameraChange);
  const start = performance.now();
  const animate = time => {
    if (!viewer.isConnected) { finish(); return; }
    const progress = Math.min(1, (time - start) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    if (!preserveOrbit) viewer.resetTurntableRotation(startYaw + yawDelta * eased);
    if (progress === 1) {
      if (!preserveOrbit) viewer.resetTurntableRotation();
      finish();
    } else frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
}

export function recenteredTarget(view, center) {
  if (!view.center) return view.target;
  return Object.fromEntries(['x','y','z'].map(axis => [axis, view.target[axis]+center[axis]-view.center[axis]]));
}

export function recenterView(viewer, target, options = {}) {
  resetView(viewer, {...options, target:`${target.x}m ${target.y}m ${target.z}m`, preserveOrbit:true});
}

export function restoreFocusLimits(viewer) {
  const restore = focusLimits.get(viewer);
  if (!restore) return;
  restore();
  focusLimits.delete(viewer);
}

// Use the same native easing and interruption lifecycle as view reset.
export function focusView(viewer, {target, orbit}, {setRadiusLimits, ...options} = {}) {
  const home = Number(viewer.dataset.homeDistance) || viewer.getCameraOrbit().radius;
  // The public min/max-camera-orbit setters call jumpCameraToGoal, snapping
  // both orbit and target in the same update. The renderer changes only the
  // controls' numeric bounds, preserving their current position and damping.
  const restore = setRadiusLimits(Math.max(.001, orbit.radius * .1),
    Math.max(home, orbit.radius, viewer.getCameraOrbit().radius) * 2);
  if (!focusLimits.has(viewer)) focusLimits.set(viewer, restore);
  viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
  recenterView(viewer, target, {...options, interruptFocus:true});
}

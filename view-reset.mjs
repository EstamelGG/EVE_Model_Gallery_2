const pendingResets = new WeakMap();
const duration = 650;

export function cancelViewReset(viewer) {
  pendingResets.get(viewer)?.();
}

export function resetView(viewer, {
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  target = 'auto auto auto', preserveOrbit = false,
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
    viewer.removeEventListener('pointerdown', finish);
    viewer.removeEventListener('wheel', finish);
    viewer.removeEventListener('camera-change', onCameraChange);
    viewer.interpolationDecay = decay;
    viewer.autoRotate = autoRotate;
  };
  const onCameraChange = event => {
    if (event.detail?.source === 'user-interaction') finish();
  };

  if (!preserveOrbit) {
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
  viewer.addEventListener('pointerdown', finish, {passive: true});
  viewer.addEventListener('wheel', finish, {passive: true});
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

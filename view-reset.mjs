const pendingResets = new WeakMap();
const duration = 650;

export function cancelViewReset(viewer) {
  pendingResets.get(viewer)?.();
}

export function resetView(viewer, {
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
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

  viewer.cameraOrbit = `35deg 70deg ${viewer.dataset.homeDistance ? viewer.dataset.homeDistance + 'm' : 'auto'}`;
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = '30deg';
  if (reducedMotion) {
    viewer.resetTurntableRotation();
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
    viewer.resetTurntableRotation(startYaw + yawDelta * eased);
    if (progress === 1) {
      viewer.resetTurntableRotation();
      finish();
    } else frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
}

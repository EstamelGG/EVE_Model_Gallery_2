// Render in a canonical scene, independent of asset units or physical size.
export function viewerProfile({x, y, z}) {
  const dimensions = [x, y, z];
  if (dimensions.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Invalid model bounds');
  const diagonal = Math.hypot(x, y, z);
  if (diagonal <= 0) throw new Error('Empty model bounds');
  const sorted = [...dimensions].sort((a,b)=>a-b);
  const slenderness = 1 - sorted[1] / sorted[2];
  return {
    scale: 4 / diagonal,
    radius: 0.12 + 0.06 * slenderness,
    strength: 3,
    bias: 0.015,
    fade: 0.025,
    samples: 32,
    roughnessMultiplier: 1,
  };
}

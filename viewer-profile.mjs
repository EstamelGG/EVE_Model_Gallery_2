// Render in a canonical scene, independent of asset units or physical size.
export function postprocessingBudget(triangles) {
  const large = Number(triangles) > 50000;
  return { msaa: large ? 2 : 4, aoScale: large ? 0.5 : 1, smaa: large ? 'high' : 'ultra' };
}

// SSAO radius is a shader define. Reuse a small set of programs instead of
// compiling a distinct shader after every wheel/pinch adjustment.
export function occlusionRadius(radius, zoom) {
  const scale = 2 ** (Math.round(Math.log2(Math.max(0.125, zoom)) * 2) / 2);
  return Math.min(0.3, Math.max(0.025, radius * scale));
}

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

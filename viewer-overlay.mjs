// Shared display rules for the gallery and the standalone component.
export function formatDimension(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  const rounded = Math.round(meters);
  return rounded >= 1000 ? `${Number((rounded / 1000).toFixed(2))}KM` : `${rounded}M`;
}

export function renderViewerHeading(root, item, title) {
  root.getElementById('stage-title').textContent = title;
  const subtitle = root.getElementById('stage-subtitle');
  subtitle.textContent = item.name?.en || '';
  subtitle.hidden = !item.name?.en || item.name.en === title;
}

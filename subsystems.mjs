export const subsystemSlots = ['core', 'defensive', 'offensive', 'propulsion'];

export function subsystemConfiguration(item, requested) {
  if (item?.groupID !== 963 || item.subsystems?.slots?.length !== 4) return null;
  const spec = item.subsystems;
  const ready = code => /^[1-3]{4}$/.test(code || '') && spec.variants?.[code]?.available && spec.variants[code].model;
  const code = ready(requested) ? requested : ready(spec.default) ? spec.default
    : Object.keys(spec.variants || {}).find(ready);
  return { spec, code: code || '', readyCount: Object.keys(spec.variants || {}).filter(ready).length };
}

export function subsystemItem(item, code) {
  const config = subsystemConfiguration(item, code);
  if (!config?.code) return item;
  return { ...item, ...config.spec.variants[config.code], subsystemSelection: config.code };
}

export function subsystemOptionAvailable(config, slot, variant) {
  if (!config?.code) return false;
  const code = [...config.code];
  code[slot] = String(variant);
  const asset = config.spec.variants[code.join('')];
  return !!(asset?.available && asset.model);
}

export function subsystemOptionName(name) {
  // Both SDE languages prefix the hull and slot before " - ".
  return String(name).split(' - ').slice(1).join(' - ') || name;
}

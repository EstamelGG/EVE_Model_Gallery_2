import { subsystemConnectors } from './subsystem-connectors.mjs?v=assembly-v1';

export const subsystemSlots = ['core', 'defensive', 'offensive', 'propulsion'];
export const subsystemGroups = [958, 954, 956, 957];
const hulls = new Set(['asc1_t3', 'csc1_t3', 'gsc1_t3', 'msc1_t3']);
export function isStrategicCruiser(item) {
  return item?.groupID === 963 && hulls.has(item.dna?.split(':')[0]);
}

// Resolve against published part items, so existing catalogs need no rebuild.
// Ignore legacy whole-ship variants: availability now depends on four parts.
export function withSubsystems(item, parts) {
  if (!isStrategicCruiser(item)) return item;
  const base = item.dna.split(':')[0];
  const slots = subsystemSlots.map((key, index) => ({
    key,
    options: [1, 2, 3].map((variant) => {
      const hull = `${base}_s${index + 1}v${variant}`;
      const declared = item.subsystems?.slots?.[index]?.options?.find((o) => o.variant === variant);
      const part = parts.find(
        (p) =>
          p.groupID === subsystemGroups[index] &&
          p.dna?.split(':')[0] === hull &&
          (!declared || declared.id === p.id),
      );
      return {
        variant,
        hull,
        name: part?.name || { zh: `选项 ${variant}`, en: `Option ${variant}` },
        part,
        available: !!(
          part?.available &&
          part.model &&
          part.effects &&
          Object.hasOwn(subsystemConnectors, hull)
        ),
      };
    }),
  }));
  return { ...item, subsystems: { mode: 'assembly', default: '1111', slots } };
}

export function subsystemConfiguration(item, requested) {
  if (item?.groupID !== 963 || item.subsystems?.mode !== 'assembly') return null;
  const spec = item.subsystems;
  const ready = (code) =>
    /^[1-3]{4}$/.test(code || '') &&
    spec.slots.every((s, i) => s.options.some((o) => o.variant === Number(code[i]) && o.available));
  const first = spec.slots.map((s) => s.options.find((o) => o.available)?.variant || '').join('');
  const code = ready(requested)
    ? requested
    : ready(spec.default)
      ? spec.default
      : ready(first)
        ? first
        : '';
  return {
    spec,
    code,
    readyCount: spec.slots.reduce((n, s) => n * s.options.filter((o) => o.available).length, 1),
    total: spec.slots.reduce((n, s) => n * s.options.length, 1),
    defaultAvailable: ready(spec.default),
  };
}

export function subsystemItem(item, code, baseURL) {
  const config = subsystemConfiguration(item, code);
  if (!config?.code) return item;
  let offset = [0, 0, 0];
  const parts = config.spec.slots.map((s, i) => {
    const option = s.options.find((o) => o.variant === Number(config.code[i]));
    const part = { ...option.part, offset: [...offset], hull: option.hull };
    const next = subsystemConnectors[option.hull];
    if (next) offset = offset.map((v, axis) => v + next[axis]);
    return part;
  });
  const path = `__assembled/${item.id}-${config.code}`;
  return {
    ...item,
    subsystemSelection: config.code,
    subsystemParts: parts,
    dna: parts.map((p) => p.hull).join(';') + ':' + item.dna.split(':').slice(1).join(':'),
    model: new URL(path + '.gltf', baseURL).href,
    effects: new URL(path + '.json', baseURL).href,
    modelRevision:
      'assembly-v1-' + parts.map((p) => p.modelRevision || p.renderKey || p.id).join('-'),
    triangles: parts.reduce((n, p) => n + (p.triangles || 0), 0),
    vertices: parts.reduce((n, p) => n + (p.vertices || 0), 0),
    modelBytes: undefined,
    effectsBytes: undefined,
  };
}

export function subsystemOptionAvailable(config, slot, variant) {
  return !!config?.spec.slots[slot]?.options.find((o) => o.variant === Number(variant))?.available;
}

export function subsystemOptionName(name) {
  // Both SDE languages prefix the hull and slot before " - ".
  return String(name).split(' - ').slice(1).join(' - ') || name;
}

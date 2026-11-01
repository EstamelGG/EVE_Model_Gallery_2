import { subsystemConnectors } from './subsystem-connectors.mjs?v=af12e26060b5f9ff';

export const subsystemSlots = ['core', 'defensive', 'offensive', 'propulsion'];
export const subsystemGroups = [958, 954, 956, 957];
export function isStrategicCruiser(item) {
  return item?.groupID === 963;
}

// Published option IDs and hulls are authoritative; only availability is local.
export function withSubsystems(item, parts) {
  if (!isStrategicCruiser(item)) return item;
  const byID = new Map(parts.map(part => [part.id,part]));
  const slots = item.subsystems.slots.map(({key,options}) => ({
    key, options: options.map(option => {
      const part = byID.get(option.id);
      return {
        ...option, part, name:part?.name || option.name,
        available: !!part?.available && Object.hasOwn(subsystemConnectors, option.hull),
      };
    }),
  }));
  return { ...item, subsystems: { mode: 'assembly', default:item.subsystems.default, slots } };
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
      'assembly-v1-' + parts.map((p) => p.modelRevision).join('-'),
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

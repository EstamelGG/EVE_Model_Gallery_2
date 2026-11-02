// Combine descriptors only. Geometry buffers and texture files stay shared.
import { resourceURL } from './resource-location.mjs?v=f2b54b9a7437fa7e';
const arrays = [
  'buffers',
  'bufferViews',
  'accessors',
  'images',
  'samplers',
  'textures',
  'materials',
  'meshes',
  'nodes',
  'skins',
];
const clone = (value) => structuredClone(value);
const add = (a, b) => a.map((v, i) => v + b[i]);
function validateGeometry(d) {
  if (d.animations?.length || d.nodes.some((n) => n.skin != null))
    throw Error('Animated parts require separate binding support');
  if (d.extensionsRequired?.some((e) => e !== 'EXT_texture_webp'))
    throw Error('Unsupported subsystem geometry extension');
  if (d.materials.some((m) => m.extras?.ccpdecNative?.patterns?.length))
    throw Error('Projected subsystem patterns require assembled coordinates');
}

function remapResources(d, off, absolute) {
  for (const b of d.buffers) if (b.uri) b.uri = absolute(b.uri);
  for (const v of d.bufferViews) v.buffer += off.buffers;
  for (const a of d.accessors) {
    if (a.bufferView != null) a.bufferView += off.bufferViews;
    if (a.sparse) {
      a.sparse.indices.bufferView += off.bufferViews;
      a.sparse.values.bufferView += off.bufferViews;
    }
  }
  for (const image of d.images) {
    if (image.uri) image.uri = absolute(image.uri);
    if (image.bufferView != null) image.bufferView += off.bufferViews;
  }
  for (const t of d.textures) {
    if (t.source != null) t.source += off.images;
    if (t.sampler != null) t.sampler += off.samplers;
    for (const ext of Object.values(t.extensions || {}))
      if (ext.source != null) ext.source += off.images;
  }
}

function remapMaterials(d, off, prefix, absolute) {
  function textureIndices(value, key = '') {
    if (!value || typeof value !== 'object') return;
    if (/Texture$/.test(key) && value.index != null) value.index += off.textures;
    for (const [k, v] of Object.entries(value)) if (k !== 'extras') textureIndices(v, k);
  }
  for (const m of d.materials) {
    m.name = prefix + m.name;
    textureIndices(m);
    const native = m.extras?.ccpdecNative;
    if (native) for (const k in native.textures) native.textures[k] = absolute(native.textures[k]);
  }
}

function remapMeshes(d, off, prefix) {
  for (const m of d.meshes) {
    m.name = prefix + m.name;
    for (const p of m.primitives) {
      if (p.indices != null) p.indices += off.accessors;
      if (p.material != null) p.material += off.materials;
      for (const k in p.attributes) p.attributes[k] += off.accessors;
      for (const t of p.targets || []) for (const k in t) t[k] += off.accessors;
    }
  }
}

function remapNodes(d, off, prefix) {
  for (const n of d.nodes) {
    if (n.name) n.name = prefix + n.name;
    if (n.mesh != null) n.mesh += off.meshes;
    if (n.children) n.children = n.children.map((i) => i + off.nodes);
    if (n.skin != null) n.skin += off.skins;
  }
  for (const s of d.skins || []) {
    s.joints = s.joints.map((i) => i + off.nodes);
    if (s.skeleton != null) s.skeleton += off.nodes;
    if (s.inverseBindMatrices != null) s.inverseBindMatrices += off.accessors;
  }
}

function validateEffects(e) {
  if (e.version !== 3) throw Error('Unsupported subsystem effects version');
  if (
    e.lighting.sets.length ||
    e.lighting.surfaceSets.length ||
    e.planeGlow.sets.length ||
    e.scene.meshes.length ||
    e.supplements.meshes.length ||
    e.scene.particles?.length ||
    e.scene.flares?.length ||
    e.scene.lines?.length ||
    e.supplements.flares?.length ||
    e.gate
  )
    throw Error('Unsupported subsystem effect family');
}

function appendPlacements(out, e, offset) {
  for (const sprite of e.sprites) {
    sprite.position = add(sprite.position, offset);
    sprite.boneIndex = -1;
    out.sprites.push(sprite);
  }
  for (const p of e.booster.placements) {
    p.transform[3] = [...add(p.transform[3].slice(0, 3), offset), p.transform[3][3]];
    out.booster.placements.push(p);
  }
  for (const set of e.attachmentSpotlights) {
    for (const p of set.items)
      p.transform[3] = [...add(p.transform[3].slice(0, 3), offset), p.transform[3][3]];
    out.attachmentSpotlights.push(set);
  }
}

async function appendDecals(out, e, offset, loadJSON, resolveURL) {
  for (const d of e.supplements.decals) {
    if (d.parentBoneIndex >= 0) throw Error('Bound decals need explicit per-part binding');
    d.geometry = clone(d.geometry.url ? await loadJSON(resolveURL(d.geometry.url)) : d.geometry);
    delete d.geometry.sharedGeometryURL;
    delete d.geometry.checksum;
    d.geometry.position = d.geometry.position.map((v, k) => v + offset[k % 3]);
    d.position = add(d.position, offset);
    out.supplements.decals.push(d);
  }
}

export function assembleGeometry(parts) {
  const out = {
    asset: { version: '2.0', generator: 'EVE T3 subsystem assembly' },
    scene: 0,
    scenes: [{ nodes: [] }],
    extras: { ccpdec: { staticHull: true, bonePalette: [] } },
  };
  for (const key of arrays) out[key] = [];
  for (const [index, part] of parts.entries()) {
    const slot = part.slot ?? index;
    const d = clone(part.document),
      off = Object.fromEntries(arrays.map((k) => [k, out[k].length]));
    const prefix = `s${slot + 1}_`,
      absolute = (uri) => new URL(uri, part.url).href;
    validateGeometry(d);
    remapResources(d, off, absolute);
    remapMaterials(d, off, prefix, absolute);
    remapMeshes(d, off, prefix);
    remapNodes(d, off, prefix);
    for (const k of arrays) out[k].push(...(d[k] || []));
    out.scenes[0].nodes.push(out.nodes.length);
    out.nodes.push({
      name: `Subsystem ${slot + 1}`,
      extras: { eveSubsystemSlot: slot },
      translation: part.offset,
      children: d.scenes[d.scene || 0].nodes.map((i) => i + off.nodes),
    });
    for (const k of ['extensionsUsed', 'extensionsRequired'])
      out[k] = [...new Set([...(out[k] || []), ...(d[k] || [])])];
  }
  return out;
}

export async function assembleEffects(parts, loadJSON, resolveURL) {
  const effects = parts.map((p) => clone(p.effects));
  const out = clone(effects[0]);
  out.sprites = [];
  out.attachmentSpotlights = [];
  out.supplements.decals = [];
  out.booster = clone(effects.find((e) => e.booster.placements.length)?.booster || out.booster);
  out.booster.placements = [];
  function rebase(value) {
    if (!value || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) {
      if (k === 'url' && typeof v === 'string') value[k] = resolveURL(v);
      else rebase(v);
    }
  }
  for (const [i, e] of effects.entries()) {
    const offset = parts[i].offset;
    validateEffects(e);
    appendPlacements(out, e, offset);
    await appendDecals(out, e, offset, loadJSON, resolveURL);
  }
  rebase(out);
  return out;
}

export async function prepareSubsystemModel(session, item, source, pageURL) {
  if (!item.subsystemParts) return;
  const resolveURL = (url) => new URL(resourceURL(url), pageURL).href;
  const parts = await Promise.all(
    item.subsystemParts.map(async (part) => {
      const url = new URL(resolveURL(part.model));
      url.searchParams.set('v', part.modelRevision || 'material-options-v1');
      const [document, effects] = await Promise.all([
        session.json(url.href),
        session.json(resolveURL(part.effects)),
      ]);
      return { ...part, url: url.href, document, effects };
    }),
  );
  const document = assembleGeometry(parts);
  const effects = await assembleEffects(parts, (url) => session.json(url), resolveURL);
  document.extras.ccpdec.typeID = item.id;
  document.extras.ccpdec.dna = item.dna;
  effects.typeID = item.id;
  effects.dna = item.dna;
  // The viewer preloader parses these in-memory .gltf documents and retains the
  // original external-buffer cache. Nothing is fetched from these virtual URLs.
  session.remember(source, document);
  session.remember(item.effects, effects);
}

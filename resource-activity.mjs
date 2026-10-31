// Shared by the page and the separately bundled viewer, without wrapping global fetch.
export function createResourceActivity() {
  const pending = new Map(), listeners = new Set();
  const snapshot = () => [...pending.values()];
  const emit = () => { for (const listener of listeners) listener(snapshot()); };
  return {
    snapshot,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    begin(url, kind = resourceKind(url)) {
      const token = Symbol();
      pending.set(token, { url: String(url), kind, name: resourceName(url) });
      emit();
      return () => { if (pending.delete(token)) emit(); };
    },
  };
}

export function resourceName(url) {
  const path = String(url).split(/[?#]/)[0];
  try { return decodeURIComponent(path.split('/').pop()) || path; }
  catch { return path.split('/').pop() || path; }
}

// Count actual requests as they are discovered, including requests already in
// flight. Nested trackers for the same URL represent one resource, not two.
export function createResourceBatch(activity = resourceActivity) {
  const seen = new Set();
  let pending = [];
  const stop = activity.subscribe(items => {
    pending = [...new Map(items.map(item => [item.url, item])).values()];
    for (const item of pending) seen.add(item.url);
  });
  return {
    snapshot: () => ({ pending, completed: seen.size - pending.length }),
    stop,
  };
}

export function resourceKind(url) {
  const path = String(url).split(/[?#]/)[0];
  if (/\.(gltf|glb|bin)$/i.test(path)) return 'resourceModel';
  if (/\.(dds|webp|png|jpg|jpeg|hdr)$/i.test(path)) return 'resourceTexture';
  if (/catalog|categor|group|search/i.test(path)) return 'resourceCatalog';
  return 'resourceData';
}

const key = Symbol.for('eve.resourceActivity');
export const resourceActivity = globalThis[key] ||= createResourceActivity();
export async function trackResource(url, operation, kind) {
  const finish = resourceActivity.begin(url, kind);
  try { return await operation(); }
  finally { finish(); }
}

export function loadJSON(url, options, { optional = false } = {}) {
  return trackResource(url, async () => {
    const response = await fetch(url, options);
    if (optional && response.status === 404) return {};
    if (!response.ok) throw new Error(`Resource unavailable (${response.status}): ${resourceName(url)}`);
    return response.json();
  });
}

// Shared by the page and the separately bundled viewer, without wrapping global fetch.
export function createResourceActivity() {
  const pending = new Map(), listeners = new Set();
  const states = new Map();
  const snapshot = () => [...pending.values()];
  const emit = () => { for (const listener of listeners) listener(snapshot()); };
  return {
    snapshot,
    state(url) { return states.get(resourceKey(url)); },
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    begin(url, kind = resourceKind(url)) {
      const token = Symbol();
      const key = resourceKey(url);
      if (![...pending.values()].some(item => resourceKey(item.url) === key)) states.set(key, 'pending');
      pending.set(token, { url: String(url), kind, name: resourceName(url) });
      emit();
      const finish = (success = true) => {
        if (!pending.delete(token)) return;
        if (!success) states.set(key, 'failed');
        else if (states.get(key) !== 'failed' && ![...pending.values()].some(item => resourceKey(item.url) === key)) states.set(key, 'completed');
        emit();
      };
      finish.progress = (loaded, total) => {
        const item = pending.get(token);
        if (!item) return;
        item.loaded = Math.max(0, Number(loaded) || 0);
        item.total = Number.isFinite(total) && total > 0 ? total : 0;
        emit();
      };
      return finish;
    },
  };
}

export function resourceKey(url) {
  try { return new URL(url, globalThis.location?.href || 'https://local.invalid/').href; }
  catch { return String(url); }
}

export function resourceName(url) {
  const path = String(url).split(/[?#]/)[0];
  try { return decodeURIComponent(path.split('/').pop()) || path; }
  catch { return path.split('/').pop() || path; }
}

// Combine a dependency plan with live requests and cached completions. Nested
// trackers and equivalent URL spellings represent one resource, not two.
export function createResourceBatch(activity = resourceActivity) {
  const seen = new Set(), skipped = new Set();
  let pending = [], result, planned = false;
  const update = items => {
    pending = [...new Map(items.map(item => [resourceKey(item.url), item])).values()];
    for (const item of pending) {
      seen.add(resourceKey(item.url)); skipped.delete(resourceKey(item.url));
    }
    const active = new Set(pending.map(item => resourceKey(item.url)));
    let completed = 0, failed = 0;
    for (const url of seen) {
      if (active.has(url)) continue;
      if (activity.state(url) === 'failed') failed++;
      else if (skipped.has(url) || activity.state(url) === 'completed') completed++;
    }
    result = {pending, completed, failed, total:seen.size, waiting:seen.size-completed-failed-pending.length, planned};
  };
  const stop = activity.subscribe(update);
  return {
    snapshot: () => result,
    plan(urls) { for (const url of urls) seen.add(resourceKey(url)); planned = true; update(activity.snapshot()); },
    // The renderer can omit unused fallback material inputs. They have been
    // processed by the load plan but require no download; never mark failures
    // or still-loading resources successful.
    skipUnrequested(keep = () => false) {
      for (const url of seen) if (!activity.state(url) && !keep(url)) skipped.add(url);
      update(activity.snapshot());
    },
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
  try { const result = await operation(finish.progress); finish(); return result; }
  catch (error) { finish(false); throw error; }
}

// Fetch bodies expose decoded bytes; compressed Content-Length is not a valid
// total for those bytes. Keep such requests indeterminate.
export async function readResourceBody(response, progress) {
  if (!response.body?.getReader) return response.arrayBuffer();
  const length = Number(response.headers.get('content-length'));
  const encoding = response.headers.get('content-encoding');
  const total = (!encoding || encoding === 'identity') && Number.isFinite(length) && length > 0 ? length : 0;
  const reader = response.body.getReader(), chunks = [];
  let loaded = 0;
  progress(0, total);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      progress(loaded, total >= loaded ? total : 0);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

export function loadArrayBuffer(url, options, kind) {
  return trackResource(url, async progress => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Resource unavailable (${response.status}): ${resourceName(url)}`);
    return readResourceBody(response, progress);
  }, kind);
}

export function loadJSON(url, options, { optional = false } = {}) {
  return trackResource(url, async progress => {
    const response = await fetch(url, options);
    if (optional && response.status === 404) return {};
    if (!response.ok) throw new Error(`Resource unavailable (${response.status}): ${resourceName(url)}`);
    if (!response.body?.getReader) return response.json();
    return JSON.parse(new TextDecoder().decode(await readResourceBody(response, progress)));
  });
}

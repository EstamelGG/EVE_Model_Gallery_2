import {resourceActivity, createResourceBatch} from './resource-activity.mjs?v=6066d50d2fa0dfb8';

const steps = ['loadingCatalog', 'loadingAssets', 'loadingMaterials', 'loadingEnvironment', 'preparing'];

// One owner for the model stages, resource batch, and late background downloads.
export function createLoadingPanel({root, translate:t, backgroundPending}) {
  const find = id => root.getElementById(id);
  const panel = find('viewer-loading'), title = panel.querySelector('strong');
  const detail = find('loading-detail'), progress = find('model-progress'), count = find('loading-count');
  const updateStatus = find('viewer-update-status'), rows = createLoadingRows(find('loading-resources'));
  const statuses = [...root.querySelectorAll('[data-resource-status]')].map(element => ({
    element, ring:element.querySelector('.loading-ring'), text:element.querySelector('.resource-status-text'),
  }));
  let batch, stage = 1, complete = false, timer, generation=0, taskTitle=null, automatic=false;
  function render() {
    if (!batch) return;
    const {pending, completed, total, planned, failed} = batch.snapshot();
    panel.hidden = false;
    title.dataset.i18n = taskTitle || (complete ? 'loadingResources' : 'loadingModel');
    title.textContent = t(title.dataset.i18n);
    const step = t('loadingStep', {step:stage, total:steps.length, name:t(steps[stage-1])});
    detail.hidden = complete;
    detail.textContent = step;
    // Until a dependency plan exists this measures stages, never guessed bytes.
    progress.max = planned ? Math.max(1,total) : steps.length;
    progress.value = planned ? completed : stage-1;
    progress.setAttribute('aria-label', step);
    count.textContent = planned
      ? t('loadingResourceTotal', {completed, total, pending:pending.length}) + (failed ? t('loadingResourceFailed', {count:failed}) : '')
      : t('loadingResourceCount', {completed:stage-1, total:steps.length, resources:completed, pending:pending.length});
    progress.setAttribute('aria-valuetext', count.textContent);
    rows.update(pending, t);
  }
  function finish(force = false) {
    complete = true;
    batch?.skipUnrequested(url => /\/backgrounds\//.test(url) && backgroundPending());
    render();
    if (!force && backgroundPending()) return;
    rows.reset();
    batch?.stop();
    batch = null;
    panel.hidden = true;
  }
  function refresh() {
    const pending = resourceActivity.snapshot(), current = pending.at(-1);
    // Any tracked data request can use the same corner panel, even outside a
    // model task. Explicit tasks keep it visible through parsing/setup gaps.
    if (!batch && current) {
      automatic=true;complete=true;taskTitle='loadingResources';
      batch=createResourceBatch();batch.plan([]);
    } else if (automatic && !current) {
      finish();automatic=false;taskTitle=null;
    }
    const percent = current?.total > 0 ? Math.min(100, Math.floor(current.loaded / current.total * 100)) : null;
    const label = current ? `${t(current.kind)} · ${current.name}${percent !== null ? ` · ${percent}%` : ''}${pending.length > 1 ? ` (+${pending.length-1})` : ''}` : '';
    const tooltip = pending.map(item => `${t(item.kind)} · ${item.name}`).join('\n');
    for (const {element, ring, text} of statuses) {
      element.hidden = !current;
      ring.classList.toggle('determinate', percent !== null);
      ring.style.setProperty('--download-progress', `${percent ?? 0}%`);
      text.textContent = label;
      element.title = tooltip;
    }
    render();
  }
  resourceActivity.subscribe(() => {
    // Throttling allows a busy stream to keep updating the display.
    if (!timer) timer = setTimeout(() => {timer = null; refresh();}, 80);
  });
  return {
    get batch() { return batch; },
    begin() {
      generation++;taskTitle=null;automatic=false;
      updateStatus.hidden = true;
      complete = false; stage = 1;
      rows.reset();
      batch?.stop();
      batch = createResourceBatch();
      render();
    },
    beginTask(titleKey) {
      this.begin();taskTitle=titleKey;const token=generation;render();
      return {
        plan(urls){if(token===generation){batch?.plan(urls);render();}},
        progress(value){if(token===generation){stage=value;render();}},
        finish(){if(token===generation){finish();taskTitle=null;}},
      };
    },
    progress(value) { stage = value; render(); },
    finish,
    background(urls) {
      if (backgroundPending()) {
        if (!batch) {batch = createResourceBatch(); complete = true;}
        if (urls.length) batch.plan(urls);
      }
      render();
    },
    backgroundSettled() { if (complete) finish(); else render(); },
    refresh,
  };
}

// Three permanent slots keep the progress/count anchors still as requests end.
function createLoadingRows(root) {
  const slots = Array.from({ length: 3 }, () => {
    const row = document.createElement('li');
    const kind = document.createElement('span'), name = document.createElement('code');
    const ring = document.createElement('span'), progress = document.createElement('span');
    ring.className = 'loading-ring resource-download-ring';
    ring.setAttribute('aria-hidden', 'true');
    progress.className = 'resource-download-percent';
    row.append(ring, kind, name, progress);
    row.style.opacity = '0';
    root.append(row);
    return { row, kind, name, ring, progress, key: '', desired: null, timer: null };
  });
  function paint(slot) {
    slot.timer = null;
    const item = slot.desired;
    slot.key = item?.url || '';
    slot.kind.textContent = item?.label || '';
    slot.name.textContent = item?.name || '';
    const percent = item?.total > 0 && Number.isFinite(item.loaded)
      ? Math.min(100, Math.floor(item.loaded / item.total * 100)) : null;
    slot.ring.classList.toggle('determinate', percent !== null);
    slot.ring.style.setProperty('--download-progress', `${percent ?? 0}%`);
    slot.progress.textContent = percent !== null ? `${percent}%` : '';
    slot.row.title = item?.url || '';
    slot.row.style.opacity = item ? '1' : '0';
    slot.row.style.transform = 'translateY(0)';
  }
  return {
    update(items, translate) {
      const chosen = items.slice(-3);
      // Keep still-loading files in their existing slots.
      const assigned = new Set();
      for (const slot of slots) {
        slot.desired = chosen.find(item => item.url === (slot.desired?.url || slot.key));
        if (slot.desired) assigned.add(slot.desired.url);
      }
      const incoming = chosen.filter(item => !assigned.has(item.url));
      for (const slot of slots) {
        slot.desired ||= incoming.shift();
        if (slot.desired) slot.desired = { ...slot.desired, label: translate(slot.desired.kind) };
        if (slot.timer) continue; // Swap to the newest desired content after fading.
        if ((slot.desired?.url || '') === slot.key) { paint(slot); continue; }
        slot.row.style.opacity = '0';
        slot.row.style.transform = 'translateY(-4px)';
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) paint(slot);
        else slot.timer = setTimeout(() => paint(slot), 160);
      }
    },
    reset() {
      for (const slot of slots) {
        clearTimeout(slot.timer);
        slot.desired = null;
        paint(slot);
      }
    },
  };
}

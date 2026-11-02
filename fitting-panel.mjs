import { loadJSON } from './resource-activity.mjs?v=be2e9d4ce746abf3';
import { resourceURL } from './resource-location.mjs?v=be2e9d4ce746abf3';

export function createFittingPanel({
  root,
  currentViewer,
  currentItem,
  translate: t,
  name,
  groupName,
  nativeSettings,
  loading,
  readRecent = () => null,
  saveRecent = () => {},
  loadResource = (url) => loadJSON(resourceURL(url)),
}) {
  const $ = (id) => root.querySelector('#' + id),
    saved = new Map(),
    rows = new Map(),
    focusButtons = new Map();
  let active = false,
    showMounts = false,
    context = null,
    generation = 0,
    pending = null,
    dataPromise = null,
    data = null,
    limit = 40,
    selectedCategory = null,
    operation = null;
  let statusKey = 'fittingHint',
    statusValues;
  let lastEquipment = readRecent();
  const valid = (c) => context === c && currentViewer() === c.viewer && currentItem() === c.item;
  function state(id) {
    if (!saved.has(id))
      saved.set(id, { choices: new Map(), slot: null, deployed: true, undo: null });
    return saved.get(id);
  }
  const busy = () => operation?.context === context;
  function status(key, values) {
    if (key !== undefined) {
      statusKey = key;
      statusValues = values;
    }
    $('fitting-status').textContent = t(statusKey, statusValues);
  }
  function loadingTask(title) {
    const task = loading?.beginTask(title);
    task?.plan([]);
    task?.progress(2);
    return task;
  }
  function loadData() {
    return (dataPromise ||= loadResource('data/fitting.json')
      .then((value) => ({
        ...value,
        equipment: value.equipment?.filter((e) => e.supported !== false),
      }))
      .catch((error) => {
        dataPromise = null;
        throw error;
      }));
  }
  function totals() {
    const fitting = context?.viewer.fitting;
    if (busy()) status('fittingLoading');
    else if (fitting)
      status('fittingReady', { groups: fitting.slots.length, count: fitting.count });
  }
  function closePicker(restore = false) {
    const picker = $('fitting-picker');
    picker.hidden = true;
    $('fitting-picker-home').append(picker);
    for (const button of rows.values()) button.setAttribute('aria-expanded', 'false');
    if (restore && context) rows.get(state(context.item.id).slot)?.focus({ preventScroll: true });
  }
  function refreshRows() {
    if (!context?.viewer.fitting) return;
    const fitting = context.viewer.fitting,
      s = state(context.item.id);
    for (const [slot, button] of rows) {
      const item = data.equipment.find((e) => e.id === s.choices.get(slot)),
        definition = fitting.slots.find((s) => s.slot === slot);
      const count = fitting.activeMounts(slot).length,
        number = String(slot).padStart(2, '0');
      const description =
        t('fittingSlot', { slot: number, count }) +
        ' · ' +
        (item ? name(item.name) : t('fittingEmpty'));
      button.dataset.count = String(count);
      button.dataset.equipment = String(item?.id ?? '');
      button.setAttribute('aria-label', description);
      button.title = description;
      button.setAttribute('aria-current', String(s.slot === slot));
      button.disabled = busy() || definition.available === false;
      const focus = focusButtons.get(slot);
      focus.hidden = !item;
      focus.disabled = busy() || !item;
      focus.title = t(count > 1 ? 'fittingFocusCycle' : 'fittingFocus', {
        name: item ? name(item.name) : '',
      });
      focus.setAttribute('aria-label', focus.title);
      const id = document.createElement('span');
      id.className = 'fitting-row-number';
      id.textContent = number;
      const text = document.createElement('span');
      text.className = 'fitting-row-text';
      const label = document.createElement('span');
      label.className = 'fitting-row-name';
      label.textContent = item
        ? name(item.name)
        : t(definition.available === false ? 'fittingNoCompatible' : 'fittingChooseEquipment');
      text.append(label);
      const arrow = document.createElement('span');
      arrow.className = 'fitting-row-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '⌄';
      button.replaceChildren(id, equipmentIcon(item), text, arrow);
    }
    $('fitting-undo').disabled = busy() || !s.undo;
    $('fitting-clear-all').disabled =
      busy() || !fitting.slots.some(({ slot }) => fitting.get(slot));
  }
  function selectSlot(slot, { open = false } = {}) {
    const fitting = context?.viewer.fitting;
    if (busy() || !fitting?.slots.some((s) => s.slot === slot && s.available !== false))
      return false;
    const s = state(context.item.id),
      alreadyOpen = s.slot === slot && !$('fitting-picker').hidden;
    s.slot = slot;
    if (!alreadyOpen) closePicker();
    refreshRows();
    if (open && !alreadyOpen) openPicker();
    return true;
  }
  async function change(c, slot, id) {
    if (!valid(c)) return false;
    const fitting = c.viewer.fitting,
      s = state(c.item.id);
    s.choices.set(slot, id);
    try {
      const changed = await fitting.set(slot, id);
      if (changed === false && valid(c) && s.choices.get(slot) === id)
        s.choices.set(slot, fitting.get(slot)?.id ?? null);
      return changed;
    } catch (error) {
      if (valid(c) && s.choices.get(slot) === id)
        s.choices.set(slot, fitting.get(slot)?.id ?? null);
      throw error;
    }
  }
  async function applyEquipment(slot, id, undo = false) {
    const c = context;
    if (!c || busy() || slot == null) return;
    const s = state(c.item.id),
      previous = c.viewer.fitting.get(slot)?.id ?? null;
    c.viewer.fitting.previewSlot?.(null);
    s.slot = slot;
    const current = { context: c };
    operation = current;
    closePicker(true);
    refreshRows();
    status('fittingLoading');
    const task = id == null ? null : loadingTask('fittingLoading');
    let changed, error;
    try {
      changed = await change(c, slot, id);
    } catch (reason) {
      error = reason;
    } finally {
      task?.finish();
      if (operation === current) operation = null;
    }
    if (!valid(c)) return;
    if (changed !== false && !error) {
      if (undo) s.undo = null;
      else if (previous !== id) s.undo = { slot, id: previous };
      if (!undo && id != null) {
        lastEquipment = id;
        saveRecent(id);
      }
    }
    refreshRows();
    if (error) {
      status('fittingFailed');
      console.warn(error);
    } else totals();
  }
  async function replaceEquipment(choices, undo = false) {
    const c = context;
    if (!c?.viewer.fitting || busy()) return;
    const fitting = c.viewer.fitting,
      s = state(c.item.id);
    const previous = new Map(
      fitting.slots.flatMap(({ slot }) =>
        fitting.get(slot) ? [[slot, fitting.get(slot).id]] : [],
      ),
    );
    if (!undo && !previous.size) return;
    fitting.previewSlot?.(null);
    closePicker();
    const current = { context: c };
    operation = current;
    refreshRows();
    status('fittingLoading');
    const task = choices.size ? loadingTask('fittingLoading') : null;
    let changed, error;
    try {
      changed = await fitting.replace(choices);
    } catch (reason) {
      error = reason;
    } finally {
      task?.finish();
      if (operation === current) operation = null;
    }
    if (!valid(c)) return;
    if (changed !== false && !error) {
      s.choices = new Map(choices);
      s.undo = undo ? null : { choices: previous };
    }
    refreshRows();
    if (error) {
      status('fittingFailed');
      console.warn(error);
    } else totals();
  }
  function equipmentIcon(item) {
    const frame = document.createElement('span');
    frame.className = 'fitting-equipment-icon';
    frame.setAttribute('aria-hidden', 'true');
    if (item) {
      const image = document.createElement('img');
      image.src = `https://images.evetech.net/types/${item.id}/icon?size=64`;
      image.alt = '';
      image.width = 32;
      image.height = 32;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onerror = () => {
        image.hidden = true;
      };
      frame.append(image);
    } else frame.textContent = '−';
    return frame;
  }
  function results() {
    if (!context) return;
    const query = $('fitting-search').value.trim().toLowerCase();
    const slot = state(context.item.id).slot,
      choices = state(context.item.id).choices;
    const fitting = context.viewer.fitting;
    const available = data.equipment.filter(
      (e) => slot != null && (fitting.supports ? fitting.supports(e) : fitting.canFit(slot, e)),
    );
    const recent = data.equipment.find((e) => e.id === lastEquipment),
      recentRow = $('fitting-recent');
    recentRow.replaceChildren();
    recentRow.hidden = !recent;
    if (recent) {
      const compatible = available.some((e) => e.id === recent.id) && fitting.canFit(slot, recent),
        button = document.createElement('button'),
        text = document.createElement('span');
      const caption = document.createElement('small'),
        label = document.createElement('span');
      caption.textContent = t('fittingLastChoice');
      label.textContent = name(recent.name);
      text.className = 'fitting-recent-text';
      text.append(caption, label);
      button.type = 'button';
      button.dataset.item = String(recent.id);
      button.disabled = !compatible;
      button.title =
        t('fittingLastChoice') +
        ' · ' +
        name(recent.name) +
        (compatible ? '' : ' · ' + t('fittingNoCompatible'));
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', String(choices.get(slot) === recent.id));
      button.append(equipmentIcon(recent), text);
      button.onclick = () => {
        if (compatible) void applyEquipment(slot, recent.id);
      };
      recentRow.append(button);
    }
    const groups = new Map();
    for (const item of available) {
      if (!groups.has(item.groupID)) groups.set(item.groupID, []);
      groups.get(item.groupID).push(item);
    }
    if (!groups.has(selectedCategory)) selectedCategory = null;
    const browsing = selectedCategory === null && !query;
    const categories = [...groups.keys()].sort((a, b) =>
      String(groupName(a)).localeCompare(String(groupName(b))),
    );
    $('fitting-category').replaceChildren();
    if (browsing) {
      for (const id of categories) {
        const items = groups.get(id),
          button = document.createElement('button'),
          label = document.createElement('span'),
          count = document.createElement('small');
        button.type = 'button';
        button.dataset.group = String(id);
        label.textContent = groupName(id);
        count.textContent = String(items.length);
        button.append(equipmentIcon(items[0]), label, count);
        button.onclick = () => {
          selectedCategory = id;
          limit = 40;
          results();
          $('fitting-category').querySelector('button')?.focus();
        };
        $('fitting-category').append(button);
      }
    } else {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'fitting-group-back';
      back.textContent = '‹ ' + t('fittingAllCategories');
      back.onclick = () => {
        selectedCategory = null;
        $('fitting-search').value = '';
        limit = 40;
        results();
        $('fitting-category').querySelector('button')?.focus();
      };
      $('fitting-category').append(back);
      if (selectedCategory !== null) {
        const heading = document.createElement('strong');
        heading.className = 'fitting-group-title';
        heading.textContent = groupName(selectedCategory);
        $('fitting-category').append(heading);
      }
    }
    const matches = available.filter(
      (e) =>
        (selectedCategory === null || e.groupID === selectedCategory) &&
        (!query ||
          `${e.id} ${e.name?.zh} ${e.name?.en} ${name(e.name)}`.toLowerCase().includes(query)),
    );
    $('fitting-results').replaceChildren(
      ...[null, ...(browsing ? [] : matches.slice(0, limit))].map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        const label = document.createElement('span'),
          id = document.createElement('small');
        label.textContent = item ? name(item.name) : t('fittingEmpty');
        id.textContent = item ? String(item.id) : '—';
        button.append(equipmentIcon(item), label, id);
        if (item) button.dataset.item = String(item.id);
        const compatible = !item || fitting.canFit(slot, item);
        button.disabled = !compatible;
        if (!compatible) button.title = t('fittingNoFreeMount');
        button.setAttribute(
          'aria-pressed',
          String((choices.get(slot) ?? null) === (item?.id ?? null)),
        );
        button.onclick = () => {
          if (compatible) void applyEquipment(slot, item?.id ?? null);
        };
        return button;
      }),
    );
    $('fitting-results-empty').hidden = matches.length > 0;
    $('fitting-more').hidden = browsing || matches.length <= limit;
  }
  function openPicker() {
    if (busy() || !context) return;
    const slot = state(context.item.id).slot,
      button = rows.get(slot);
    if (!button || button.disabled) return;
    limit = 40;
    selectedCategory = null;
    button.parentElement.after($('fitting-picker'));
    $('fitting-picker').hidden = false;
    button.setAttribute('aria-expanded', 'true');
    $('fitting-picker-title').textContent = t('fittingChoose', {
      slot: String(slot).padStart(2, '0'),
    });
    $('fitting-search').value = '';
    results();
    $('fitting-search').focus({ preventScroll: true });
  }
  function render() {
    context?.viewer.fitting?.previewSlot?.(null);
    closePicker();
    rows.clear();
    focusButtons.clear();
    const fitting = context?.viewer.fitting;
    $('fitting-slots').replaceChildren();
    $('fitting-controls').hidden = !fitting;
    if (!fitting) {
      status();
      return;
    }
    const s = state(context.item.id);
    $('fitting-deployed').checked = s.deployed;
    $('fitting-show-mounts').checked = showMounts;
    if (!fitting.slots.some((def) => def.slot === s.slot && def.available !== false))
      s.slot = fitting.slots.find((def) => def.available !== false)?.slot ?? null;
    for (const slot of fitting.slots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fitting-row';
      button.dataset.slot = String(slot.slot);
      const row = document.createElement('div');
      row.className = 'fitting-row-container';
      row.addEventListener('pointerenter', () => {
        if (active) fitting.previewSlot?.(slot.slot);
      });
      row.addEventListener('pointerleave', () => fitting.previewSlot?.(null));
      const focus = document.createElement('button');
      focus.type = 'button';
      focus.className = 'fitting-row-focus';
      focus.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/></svg>';
      focus.onclick = () => {
        if (active && !busy() && fitting.get(slot.slot)) fitting.focusSlot(slot.slot);
      };
      button.setAttribute('aria-controls', 'fitting-picker');
      button.setAttribute('aria-expanded', 'false');
      button.onclick = () => {
        if (busy()) return;
        if (state(context.item.id).slot === slot.slot && !$('fitting-picker').hidden)
          closePicker(true);
        else selectSlot(slot.slot, { open: true });
      };
      rows.set(slot.slot, button);
      focusButtons.set(slot.slot, focus);
      row.append(button, focus);
      $('fitting-slots').append(row);
    }
    refreshRows();
    totals();
  }
  async function ensure() {
    const c = context;
    if (!c) {
      if (active) status('fittingWaitingModel');
      return;
    }
    if (!valid(c)) return;
    if (c.viewer.fitting) {
      c.viewer.fitting.setEditing(active && showMounts);
      return;
    }
    if (pending) return pending;
    if (c.item.categoryID !== 6 || c.item.subsystemParts || c.item.groupID === 963) {
      status('fittingUnavailable');
      return;
    }
    status('fittingLoadingHardpoints');
    const token = generation,
      task = loadingTask('fittingLoadingHardpoints');
    const job = (async () => {
      try {
        data = await loadData();
        if (!valid(c) || token !== generation) return;
        const locators = data.ships?.[c.item.id];
        if (data.version !== 2 || !locators?.length) {
          status('fittingUnavailable');
          return;
        }
        const settings = await nativeSettings(c.viewer);
        if (!valid(c) || token !== generation) return;
        const fitting = c.module.installFitting(c.viewer, {
          locators,
          equipment: data.equipment,
          settings,
          hullCategory: c.item.categoryID,
        });
        c.viewer.lifecycle.set('fitting', fitting);
        fitting.setEditing(active && showMounts);
        const s = state(c.item.id);
        fitting.setDeployed(s.deployed);
        const restore = [...s.choices].filter(
            ([slot, id]) => id != null && fitting.slots.some((s) => s.slot === slot),
          ),
          restoring = { context: c };
        if (restore.length) operation = restoring;
        render();
        let restored;
        try {
          restored = await Promise.allSettled(restore.map(([slot, id]) => change(c, slot, id)));
        } finally {
          if (operation === restoring) operation = null;
        }
        if (!valid(c)) return;
        refreshRows();
        const failed = restored.find((result) => result.status === 'rejected');
        if (failed) throw failed.reason;
        totals();
      } catch (error) {
        if (valid(c) && token === generation) {
          status('fittingFailed');
          console.warn('Fitting metadata failed', error);
        }
      } finally {
        task?.finish();
      }
    })();
    pending = job;
    try {
      await job;
    } finally {
      if (pending === job) pending = null;
    }
  }
  $('fitting-search').addEventListener('input', () => {
    limit = 40;
    results();
  });
  $('fitting-more').addEventListener('click', () => {
    limit += 40;
    results();
  });
  $('fitting-picker-close').addEventListener('click', () => closePicker(true));
  $('fitting-picker').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
    }
    if (event.key === 'ArrowDown' && event.target === $('fitting-search')) {
      event.preventDefault();
      (selectedCategory === null && !$('fitting-search').value.trim()
        ? $('fitting-category')
        : $('fitting-results')
      )
        .querySelector('button')
        ?.focus();
    }
  });
  $('fitting-deployed').addEventListener('change', () => {
    if (context?.viewer.fitting) {
      state(context.item.id).deployed = $('fitting-deployed').checked;
      context.viewer.fitting.setDeployed($('fitting-deployed').checked);
    }
  });
  $('fitting-show-mounts').addEventListener('change', () => {
    showMounts = $('fitting-show-mounts').checked;
    context?.viewer.fitting?.setEditing(active && showMounts);
  });
  $('fitting-clear-all').addEventListener('click', () => void replaceEquipment(new Map()));
  $('fitting-undo').addEventListener('click', () => {
    const undo = context && state(context.item.id).undo;
    if (undo) {
      if (undo.choices) void replaceEquipment(undo.choices, true);
      else void applyEquipment(undo.slot, undo.id, true);
    }
  });
  return {
    setRecent(id) {
      if (Number.isSafeInteger(id) && id > 0) lastEquipment = id;
    },
    ensure,
    resetResources() {
      dataPromise = null;
      data = null;
      saved.clear();
      lastEquipment = null;
    },
    async refreshFromViewer() {
      const c = context;
      if (!c?.viewer.fitting) return;
      data = await loadData();
      if (!valid(c)) return;
      const fitting = c.viewer.fitting;
      state(c.item.id).choices = new Map(
        fitting.slots.flatMap(({ slot }) =>
          fitting.get(slot) ? [[slot, fitting.get(slot).id]] : [],
        ),
      );
      render();
    },
    // A failed background request must not block startup; opening Fitting retries.
    preload() {
      return loadData().then(
        () => true,
        () => false,
      );
    },
    connect(viewer, item, module) {
      generation++;
      pending = null;
      closePicker();
      rows.clear();
      focusButtons.clear();
      viewer.lifecycle.release('fitting');
      context = { viewer, item, module };
      $('fitting-controls').hidden = true;
      $('fitting-slots').replaceChildren();
      status('fittingHint');
      if (active || saved.get(item.id)?.choices.size) void ensure();
    },
    reset() {
      context?.viewer.fitting?.previewSlot?.(null);
      generation++;
      pending = null;
      closePicker();
      rows.clear();
      focusButtons.clear();
      context?.viewer.fitting?.setEditing(false);
      context = null;
      $('fitting-controls').hidden = true;
      $('fitting-slots').replaceChildren();
      status(active ? 'fittingWaitingModel' : 'fittingHint');
    },
    setActive(value) {
      active = value;
      if (!active) {
        context?.viewer.fitting?.previewSlot?.(null);
        closePicker();
      }
      context?.viewer.fitting?.setEditing(active && showMounts);
      if (active) void ensure();
    },
    render,
  };
}

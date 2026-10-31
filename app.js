import {
  locale,
  t,
  localizedName,
  setLocale,
  applyTranslations,
} from './i18n.mjs?v=lighting-quality-v1';
import { viewerProfile, postprocessingBudget, occlusionRadius } from './viewer-profile.mjs?v=large-model-v1';
import { renderDefaults, normalizeRenderSettings, renderDefaultsForDNA, switchRenderDefaults } from './render-settings.mjs?v=lighting-quality-v1';
import { createCatalogLoader } from './catalog-loader.mjs?v=affiliation-groups-v5';
import { hullKey, hullVariantGroups } from './hull-variants.mjs?v=affiliation-groups-v5';
import { createAffiliationResolver } from './affiliation.mjs';
import { createViewerTransition } from './viewer-transition.mjs?v=progressive-v1';
import { configureResourceBase, resourceURL } from './resource-location.mjs';
import { resourceActivity, createResourceBatch, loadJSON, trackResource } from './resource-activity.mjs?v=download-progress-v1';
import { prepareRenderImages } from './render-images.mjs?v=stable-card-window-v1';
import { createLoadingRows } from './loading-rows.mjs?v=loading-panel-progress-v1';
import { normalizeDisplaySettings, textureRoles } from './display-settings.mjs?v=3';
const $ = (id) => document.getElementById(id);
const icon = (name, cls = '') =>
  `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmt = (value) => Number(value).toLocaleString(locale);
let frontendPublishedAt;
function renderPublicationDate() {
  const element = $('frontend-published');
  const date = frontendPublishedAt ? new Date(frontendPublishedAt) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    element.removeAttribute('datetime');
    element.textContent = t('localPreview');
    return;
  }
  element.dateTime = date.toISOString();
  element.textContent = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date) + ' (UTC+0)';
}
const sponsorCharacterID = 2113974546;
let sponsorName = '', sponsorRequest = null, sponsorStatus = '';
function renderSponsor() {
  const name = $('sponsor-name');
  name.removeAttribute('data-i18n');
  name.textContent = sponsorName || (sponsorStatus === 'characterLoadFailed' ? `ID ${sponsorCharacterID}` : t('loading'));
  $('copy-sponsor-name').disabled = !sponsorName;
  $('sponsor-status').textContent = sponsorStatus ? t(sponsorStatus) : '';
}
async function loadSponsor() {
  if (sponsorName || sponsorRequest) return;
  sponsorStatus = '';
  renderSponsor();
  const portrait = $('sponsor-portrait');
  portrait.onload = () => { portrait.hidden = false; };
  portrait.onerror = () => { portrait.hidden = true; };
  portrait.src = `https://images.evetech.net/characters/${sponsorCharacterID}/portrait?size=128`;
  sponsorRequest = (async () => {
    try {
      const response = await fetch(`https://esi.evetech.net/latest/characters/${sponsorCharacterID}/?datasource=tranquility`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Character request failed: ${response.status}`);
      const character = await response.json();
      if (typeof character.name !== 'string' || !character.name.trim()) throw new Error('Missing character name');
      sponsorName = character.name;
    } catch {
      sponsorStatus = 'characterLoadFailed';
    } finally {
      sponsorRequest = null;
      renderSponsor();
    }
  })();
  await sponsorRequest;
}
$('copy-sponsor-name').addEventListener('click', async () => {
  if (!sponsorName) return;
  try {
    await navigator.clipboard.writeText(sponsorName);
    sponsorStatus = 'nameCopied';
  } catch {
    sponsorStatus = 'copyNameFailed';
  }
  renderSponsor();
});
// About stays usable even when the remote catalog cannot be loaded.
$('open-about').addEventListener('click', () => {
  renderPublicationDate();
  $('about-dialog').showModal();
  loadSponsor();
});
$('close-about').addEventListener('click', () => $('about-dialog').close());
$('about-dialog').addEventListener('click', event => {
  if (event.target !== $('about-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
    $('about-dialog').close();
});
let activityTimer;
let modelLoadBatch, modelLoadStage = 1;
const loadingRows = createLoadingRows($('loading-resources'));
const modelLoadSteps = ['loadingCatalog', 'loadingAssets', 'loadingMaterials', 'loadingEnvironment', 'preparing'];
function beginModelLoading() {
  loadingRows.reset();
  modelLoadBatch?.stop();
  modelLoadBatch = createResourceBatch();
  $('viewer-loading').hidden = false;
  setModelLoadStage(1);
}
function finishModelLoading() {
  loadingRows.reset();
  modelLoadBatch?.stop();
  modelLoadBatch = null;
  $('viewer-loading').hidden = true;
}
function setModelLoadStage(stage) {
  modelLoadStage = stage;
  renderModelLoading();
}
function renderModelLoading() {
  if (!modelLoadBatch) return;
  const { pending, completed } = modelLoadBatch.snapshot();
  const step = t('loadingStep', { step: modelLoadStage, total: modelLoadSteps.length, name: t(modelLoadSteps[modelLoadStage - 1]) });
  $('loading-detail').textContent = step;
  // This bar measures completed steps, not a guessed download percentage.
  $('model-progress').max = modelLoadSteps.length;
  $('model-progress').value = modelLoadStage - 1;
  $('model-progress').setAttribute('aria-label', step);
  $('model-progress').setAttribute('aria-valuetext', step);
  $('loading-count').textContent = t('loadingResourceCount', { completed: modelLoadStage - 1, total: modelLoadSteps.length, resources: completed, pending: pending.length });
  loadingRows.update(pending, t);
}
function renderActivity() {
  const pending = resourceActivity.snapshot(), current = pending.at(-1);
  const percent = current?.total > 0 ? Math.min(100, Math.floor(current.loaded / current.total * 100)) : null;
  const label = current ? `${t(current.kind)} · ${current.name}${percent !== null ? ` · ${percent}%` : ''}${pending.length > 1 ? ` (+${pending.length - 1})` : ''}` : '';
  for (const status of document.querySelectorAll('[data-resource-status]')) {
    status.hidden = !current;
    const ring = status.querySelector('.loading-ring');
    ring.classList.toggle('determinate', percent !== null);
    ring.style.setProperty('--download-progress', `${percent ?? 0}%`);
    status.querySelector('.resource-status-text').textContent = label;
    status.title = pending.map(item => `${t(item.kind)} · ${item.name}`).join('\n');
  }
  renderModelLoading();
}
resourceActivity.subscribe(() => {
  // Throttle instead of debouncing: a busy stream must not starve the display.
  if (!activityTimer) activityTimer = setTimeout(() => { activityTimer = null; renderActivity(); }, 80);
});
function renderPreview(item, badge = '') {
  return `<div class="render-preview" data-image-state="loading" aria-busy="true">${badge}
    <img data-render src="${renderURL(item)}" data-icon="https://images.evetech.net/types/${item.id}/icon?size=64" alt="${esc(t('poster', { name: localizedName(item.name) }))}" loading="lazy" decoding="async" width="512" height="512">
    <span class="loading-ring render-spinner" aria-hidden="true"></span>
    <span class="render-image-error" role="img" aria-label="${esc(t('renderUnavailable'))}">${icon('ship', 'placeholder-cube')}</span>
  </div>`;
}
// Group 0 exists in the native catalogue; -1 is the virtual all-models entry.
const state = { group: -1, race: 0, scope: 'ready', query: '', sort: 'id', item: 0 };
const defaultSort = (group) => group === -1 ? 'id' : 'race';
let revealedGroup = null;
// Proven visual aliases share one official render URL and the browser cache.
const renderURL = (item) =>
  `https://images.evetech.net/types/${item.nativeTypeID || item.id}/render?size=256`;
// Keep the displayed exposure literal; the old 2x offset clipped pale hulls.
const exposureForLevel = (level) => Number(level);
const renderSettings = () => normalizeRenderSettings(Object.fromEntries(
  Object.keys(renderDefaults).map(key => [key, $(key).value]),
));
let renderSettingsDNA;
function selectRenderDefaults(dna) {
  const values = switchRenderDefaults(renderSettings(), renderSettingsDNA, dna);
  renderSettingsDNA = dna;
  for (const [key, value] of Object.entries(values)) $(key).value = value;
  applyRenderSettings();
}
function applyRenderSettings() {
  const values = renderSettings();
  for (const [key, value] of Object.entries(values)) $(key + '-value').value = value.toFixed(1);
  if (!activeViewer) return;
  activeViewer.renderSettings = values;
  activeViewer.setAttribute('exposure', exposureForLevel(values.exposure));
  activeViewer.setRenderSettings?.(values);
  const bloom = activeViewer.querySelector('bloom-effect');
  bloom?.setAttribute('strength', String(values.bloom));
  bloom?.setAttribute('blend-mode', values.bloom > 0 ? 'default' : 'skip');
}
const displaySettings = () => normalizeDisplaySettings({
  effects: $('show-effects').checked,
  textures: Object.fromEntries(textureRoles.map(role => [role, $('texture-'+role).checked])),
});
function syncTextureControls() {
  const roles = activeViewer?.availableTextureRoles;
  for (const role of textureRoles) $('texture-'+role).disabled = !!roles && !roles.has(role);
  const controls = textureRoles.map(role => $('texture-'+role)).filter(input => !input.disabled);
  $('show-textures').checked = controls.every(input => input.checked);
  $('show-textures').indeterminate = controls.some(input => input.checked) && !controls.every(input => input.checked);
}
function applyDisplaySettings() {
  const values = displaySettings();
  syncTextureControls();
  if (!activeViewer) return;
  activeViewer.displaySettings = values;
  activeViewer.dataset.displaySettings = JSON.stringify(values);
  activeViewer.setDisplaySettings?.(values);
  activeViewer.shipEffects?.setVisible(values.effects);
}
let data,
  catalogLoader,
  groupsByID,
  racesByID,
  filtered = [],
  currentItem = null,
  activeViewer = null;
let viewerModule,
  viewerAPI,
  viewerSession,
  modelTimer,
  lastFocus,
  renderTimer,
  suppressedClose = false,
  nativeSettings;
let renderRevision = 0, detailRevision = 0;
let variantState = { hull: '', open: false, items: null, status: '' };
const viewerTransition = createViewerTransition($('viewer-stage'), $('viewer-snapshot'));

function renderVariants() {
  const hull = hullKey(currentItem?.dna);
  if (variantState.hull !== hull) variantState = { hull, open: false, items: null, status: '' };
  const { open, items, status } = variantState;
  $('hull-variants').hidden = !hull;
  $('hull-variants-panel').hidden = !open;
  $('hull-variants-toggle').setAttribute('aria-expanded', String(open));
  $('hull-variants-toggle').setAttribute('aria-label', t('hullVariants'));
  $('hull-variants-toggle').title = t('hullVariants');
  $('hull-variants-status').textContent = status ? t(status) : '';
  $('hull-variants-status').hidden = !status;
  $('hull-variants-panel').setAttribute('aria-busy', String(status === 'hullVariantsLoading'));
  const list = $('hull-variants-list'), scroll = list.scrollLeft;
  const focusedID = list.contains(document.activeElement) ? document.activeElement.dataset.variant : null;
  list.innerHTML = hullVariantGroups(items || [], currentItem?.dna).map(group => {
    const cards = group.items.map(item => {
    const selected = item.id === currentItem?.id;
    return `<button type="button" class="hull-variant-card" data-variant="${item.id}"${!item.available ? ' disabled' : ''} aria-pressed="${selected}" title="${esc(localizedName(item.name))}">
      ${renderPreview(item)}
      <span class="hull-variant-name">${esc(localizedName(item.name))}</span>
      <span class="hull-variant-id">ID ${item.id}</span>
      <span class="hull-variant-state">${!item.available ? t('unavailable') : selected ? t('hullVariantCurrent') : ''}</span>
    </button>`;
    }).join('');
    return `<div class="hull-variant-group${group.items.length > 1 ? ' shared' : ''}" role="group" aria-label="${esc(t('hullVariantShared'))}">${cards}</div>`;
  }).join('');
  prepareRenderImages(list);
  list.scrollLeft = scroll;
  if (focusedID) list.querySelector(`[data-variant="${focusedID}"]`)?.focus({ preventScroll: true });
}

async function toggleVariants() {
  variantState.open = !variantState.open;
  const snapshot = variantState;
  if (!snapshot.open || snapshot.items) { renderVariants(); return; }
  snapshot.status = 'hullVariantsLoading';
  renderVariants();
  try {
    const items = await catalogLoader.variants(currentItem.dna);
    if (variantState !== snapshot) return;
    snapshot.items = items;
    snapshot.status = items.length ? '' : 'hullVariantsEmpty';
  } catch (error) {
    if (variantState !== snapshot) return;
    snapshot.status = 'hullVariantsError';
    console.error(error);
  }
  renderVariants();
}

function raceName(id) {
  return localizedName(racesByID.get(id)) || t('other');
}
function playHullAnimation(viewer) {
  const transition = /2|^Start|^End/.test((viewer.animationName || '').split('.').pop());
  viewer.play({ repetitions: transition ? 1 : Infinity });
}
function raceMark(id) {
  const url = racesByID.get(id)?.icon;
  return url ? `<img class="race-icon" src="${esc(url)}" width="20" height="20" alt="" aria-hidden="true">` : '';
}

function cardHTML(item, style = '') {
  const tech = Number(item.techLevel);
  const tier = [4, 52].includes(Number(item.metaGroupID)) ? 'faction' : tech === 2 ? '2' : tech === 3 ? '3' : null;
  const badge = tier ? `<span class="tech-corner" data-tier="${tier}" title="${tier === 'faction' ? 'Faction' : 'T' + tier}" aria-label="${tier === 'faction' ? 'Faction' : 'T' + tier}"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="tech-fold" d="M0 0H48L0 48Z"/>${tier === 'faction' ? '<path class="tech-symbol" d="M15 8L22 15L15 22L8 15Z" fill="none" stroke="white" stroke-width="2"/>' : tier === '2' ? '<path class="tech-symbol" d="M11 8H14V22H11ZM17 8H20V22H17Z"/>' : '<path class="tech-symbol" d="M8 9H11V23H8ZM14 9H17V23H14ZM20 9H23V23H20Z"/>'}</svg></span>` : '';
  const tag = item.available ? 'button' : 'article';
  return `<${tag} class="ship-card ${item.available ? '' : 'unavailable'}"${style ? ` style="${style}"` : ''}${item.available ? ` data-item="${item.id}" aria-label="${esc(t('viewModel', { name: localizedName(item.name) }))}"` : ''}>
      <div class="card-visual">${renderPreview(item, badge)}</div>
      <div class="card-info"><div class="card-title-row"><span class="card-title">${esc(localizedName(item.name))}</span>${item.available ? '<span class="card-arrow" aria-hidden="true">↗</span>' : `<span class="unavailable-label">${t('unavailable')}</span>`}</div><div class="card-bottom"><span class="card-race">${raceMark(item.affiliationID)}${esc(raceName(item.affiliationID))}</span><span class="card-id">ID ${item.id}</span></div></div>
    </${tag}>`;
}

function readRoute() {
  const params = new URLSearchParams(location.hash.slice(1));
  state.group =
    params.has('group') && groupsByID.has(Number(params.get('group')))
      ? Number(params.get('group'))
      : -1;
  state.race = racesByID.has(Number(params.get('race'))) ? Number(params.get('race')) : 0;
  state.scope = params.get('scope') === 'all' ? 'all' : 'ready';
  state.query = (params.get('q') || '').slice(0, 120);
  state.sort = ['race', 'name', 'id'].includes(params.get('sort')) ? params.get('sort') : defaultSort(state.group);
  state.item = Number(params.get('item')) || 0;
  $('search').value = state.query;
  $('sort').value = state.sort;
  if (params.has('page')) saveRoute(true);
}

function saveRoute(replace = false) {
  const p = new URLSearchParams({ group: String(state.group) });
  if (state.race) p.set('race', state.race);
  if (state.scope !== 'ready') p.set('scope', state.scope);
  if (state.query) p.set('q', state.query);
  if (state.sort !== defaultSort(state.group)) p.set('sort', state.sort);
  if (state.item) p.set('item', state.item);
  history[replace ? 'replaceState' : 'pushState'](null, '', `#${p}`);
}

function selectGroup(id) {
  state.group = id;
  state.sort = defaultSort(id);
  $('sort').value = state.sort;
  state.query = '';
  state.race = 0;
  $('search').value = '';
  saveRoute();
  render();
  closeMenu();
  $('card-scroll').scrollTop = 0;
}

function buildTree() {
  const openCategories = new Set(
    [...document.querySelectorAll('.tree-category[open]')].map((el) => Number(el.dataset.category)),
  );
  const treeScroll = $('catalog-tree').scrollTop;
  const visibleCategories = data.categories
    .map(cat => ({ ...cat, groups: cat.groups.filter(group => group.readyCount > 0) }))
    .filter(cat => cat.groups.length > 0);
  $('catalog-count').textContent = t('categories', { count: fmt(visibleCategories.length) });
  const readyByGroup = new Map(data.categories.flatMap(c =>
    c.groups.filter(g => g.readyCount).map(g => [g.id, g.readyCount])));
  const total = data.categories.reduce((sum, cat) => sum + cat.count, 0);
  const ready = [...readyByGroup.values()].reduce((sum, count) => sum + count, 0);
  $('catalog-tree').innerHTML = `<button class="group-link all-models-link" data-group="-1"><span>${esc(t('allModels'))}</span><span class="tree-count">${fmt(ready)}/${fmt(total)}</span></button>` + visibleCategories
    .map(
      (
        cat,
      ) => `<details class="tree-category" data-category="${cat.id}" ${openCategories.has(cat.id) ? 'open' : ''}>
    <summary>${icon('chevron')}<span>${esc(localizedName(cat.name))}</span><span class="tree-count">${fmt(cat.groups.reduce((sum, g) => sum + (readyByGroup.get(g.id) || 0), 0))}/${fmt(cat.count)}</span></summary>
    <div class="tree-groups">${[...cat.groups]
      .sort((a, b) => (readyByGroup.get(b.id) || 0) - (readyByGroup.get(a.id) || 0))
      .map(
        (g) =>
          `<button class="group-link" data-group="${g.id}" title="${esc(localizedName(g.name))} · ${esc(t('items', { count: fmt(g.count) }))}"><span>${esc(localizedName(g.name))}</span>${readyByGroup.has(g.id) ? `<span class="group-ready" title="${t('ready')}"></span>` : ''}<span class="tree-count">${fmt(readyByGroup.get(g.id) || 0)}/${fmt(g.count)}</span></button>`,
      )
      .join('')}</div>
  </details>`,
    )
    .join('');
  $('catalog-tree').scrollTop = treeScroll;
}

function baseItems() {
  let items = state.query || state.group === -1 ? data.items : data.items.filter((i) => i.groupID === state.group);
  if (state.scope === 'ready') items = items.filter((i) => i.available);
  if (state.query) {
    const q = state.query.trim().toLowerCase();
    items = items.filter((i) => `${i.name.zh} ${i.name.en} ${i.id}`.toLowerCase().includes(q));
  }
  return items;
}

// Virtualized card grid: the catalogue holds 16k+ items and a full render
// creates ~100k DOM nodes, turning every filter click into a multi-second
// pause. Keep only the cards near the viewport in the DOM and position them
// absolutely inside a fixed-height container, so the native scrollbar and
// scroll position behave exactly as before.
const cardProbe = document.createElement('div');
cardProbe.style.cssText =
  'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
document.body.appendChild(cardProbe);

let cardLayout = null;
let cardRange = { start: -1, end: -1 };
let cardScrollRAF = 0;
let cardScrollIdle = 0;
let cardsScrolling = false;
const cardNodes = new Map();
const cardTemplate = document.createElement('template');

function getCardLayout() {
  const cards = $('cards');
  const width = cards.clientWidth;
  if (cardLayout && cardLayout.width === width) return cardLayout;
  const style = getComputedStyle(cards);
  const gap = parseFloat(style.getPropertyValue('--card-gap')) || 10;
  const min = parseFloat(style.getPropertyValue('--card-min')) || 170;
  const fixed = (style.getPropertyValue('--card-cols') || '').trim();
  const columns =
    fixed === '2' ? 2 : Math.max(1, Math.floor((width + gap) / (min + gap)));
  const columnWidth = Math.max(
    min,
    Math.floor((width - (columns - 1) * gap) / columns),
  );
  let rowHeight = Math.round(columnWidth + 112);
  if (width > 0 && filtered.length) {
    cardProbe.style.width = `${columnWidth}px`;
    cardProbe.innerHTML = cardHTML(filtered[0], 'width:100%');
    const card = cardProbe.firstElementChild;
    if (card && card.offsetHeight) rowHeight = Math.ceil(card.getBoundingClientRect().height);
  }
  cardLayout = { width, gap, columns, columnWidth, rowHeight };
  return cardLayout;
}

function renderCardWindow() {
  if ($('cards').getAttribute('aria-busy') === 'true') return;
  const count = filtered.length;
  if (!count) {
    cardNodes.clear();
    cardRange = { start: -1, end: -1 };
    $('cards').innerHTML = '';
    $('cards').style.height = '0px';
    return;
  }
  const layout = getCardLayout();
  const rowStep = layout.rowHeight + layout.gap;
  const totalRows = Math.ceil(count / layout.columns);
  $('cards').style.height = `${totalRows * layout.rowHeight + Math.max(0, totalRows - 1) * layout.gap}px`;
  const scroller = $('card-scroll');
  const scrollTop = scroller.scrollTop;
  const viewport = scroller.clientHeight;
  const overscan = Math.max(viewport, rowStep) * 2;
  const firstRow = Math.max(0, Math.floor((scrollTop - overscan) / rowStep));
  const lastRow = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + viewport + overscan) / rowStep),
  );
  const start = firstRow * layout.columns;
  const end = Math.min(count, (lastRow + 1) * layout.columns);
  if (start === cardRange.start && end === cardRange.end) return;
  cardRange = { start, end };
  const cards = $('cards');
  if (!cardNodes.size) cards.replaceChildren();
  // Keep intersecting cards (and their decoded images) mounted while scrolling.
  // Full innerHTML replacement restarts every preview on each row boundary.
  for (const [index, node] of cardNodes) {
    if (!cardsScrolling && (index < start || index >= end)) {
      node.remove();
      cardNodes.delete(index);
    }
  }
  // Absolute positioning needs no DOM reordering; retain touched nodes during momentum.
  for (let i = start; i < end; i++) {
    const row = Math.floor(i / layout.columns);
    const col = i % layout.columns;
    const style = `position:absolute;left:${(col * (layout.columnWidth + layout.gap)).toFixed(1)}px;top:${(row * rowStep).toFixed(1)}px;width:${layout.columnWidth}px;height:${layout.rowHeight}px`;
    let node = cardNodes.get(i);
    if (!node) {
      cardTemplate.innerHTML = cardHTML(filtered[i], style);
      node = cardTemplate.content.firstElementChild;
      cardNodes.set(i, node);
    } else if (node.getAttribute('style') !== style) {
      node.setAttribute('style', style);
    }
    if (node.parentNode !== cards) cards.appendChild(node);
  }
  prepareRenderImages(cards);
}

function scheduleCardWindow() {
  if (cardScrollRAF) return;
  cardScrollRAF = requestAnimationFrame(() => {
    cardScrollRAF = 0;
    renderCardWindow();
  });
}

async function render() {
  const revision = ++renderRevision;
  cardNodes.clear();
  cardRange = { start: -1, end: -1 };
  const group = state.group === -1 ? null : groupsByID.get(state.group),
    cat = group?.category;
  for (const button of document.querySelectorAll('.group-link')) {
    const active = Number(button.dataset.group) === state.group;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (revealedGroup !== state.group) {
    const details = cat && document.querySelector(`[data-category="${cat.id}"]`);
    if (details) details.open = true;
    revealedGroup = state.group;
  }
  $('main').classList.toggle('all-models', state.group === -1);
  $('card-scroll').scrollTop = 0;
  $('cards').setAttribute('aria-busy', 'true');
  $('cards').style.height = '';
  $('cards').innerHTML = `<div class="catalog-loading"><span class="loading-ring" aria-hidden="true"></span><span data-i18n="loadingCatalog">${esc(t('loadingCatalog'))}</span></div>`;
  $('empty-state').hidden = true;
  if (!groupsByID.size) {
    data.items = []; filtered = [];
    $('cards').removeAttribute('aria-busy');
    $('cards').textContent = t('emptyCatalog');
    $('page-title').textContent = t('app');
    $('breadcrumb').textContent = '';
    $('race-filters').textContent = '';
    $('ready-badge').textContent = '0';
    $('results-count').textContent = t('items', { count: '0' });
    document.title = t('app');
    return;
  }
  try {
    const items = await (state.query || state.group === -1 ? catalogLoader.search() : catalogLoader.group(state.group));
    if (revision !== renderRevision) return;
    data.items = items;
    if (state.race === 32 && !items.some(i => i.affiliationID === 32)) state.race = 0;
  } catch (error) {
    if (revision === renderRevision) {
      renderCatalogError();
      $('cards').removeAttribute('aria-busy');
    }
    console.error(error);
    return;
  }
  $('cards').removeAttribute('aria-busy');
  const title = state.query ? t('search') : state.group === -1 ? t('allModels') : localizedName(group.name);
  $('page-title').textContent = title;
  $('breadcrumb').innerHTML =
    `<span>${esc(cat ? localizedName(cat.name) : t('catalog'))}</span>${icon('chevron')}<strong>${esc(title)}</strong>`;
  document.title = `${title} · ${t('app')}`;
  $('ready-badge').textContent = fmt(
    data.items.filter((i) => i.available && (state.query || state.group === -1 || i.groupID === state.group)).length,
  );
  $('scope-ready').classList.toggle('active', state.scope === 'ready');
  $('scope-all').classList.toggle('active', state.scope === 'all');
  $('scope-ready').setAttribute('aria-pressed', state.scope === 'ready');
  $('scope-all').setAttribute('aria-pressed', state.scope === 'all');
  const base = baseItems();
  const raceCounts = new Map([[0, base.length]]);
  for (const item of base) {
    raceCounts.set(item.affiliationID, (raceCounts.get(item.affiliationID) || 0) + 1);
  }
  $('race-filters').innerHTML = [
    { id: 0 },
    ...data.races.filter((r) => r.id === state.race || raceCounts.has(r.id)),
  ]
    .map(
      (r) =>
        `<button data-race="${r.id}" class="${state.race === r.id ? 'active' : ''}" aria-pressed="${state.race === r.id}">${r.id ? raceMark(r.id) : ''}${esc(r.id ? localizedName(r) : t('allRaces'))}<span class="filter-count">${fmt(raceCounts.get(r.id) || 0)}</span></button>`,
    )
    .join('');
  filtered = base.filter((i) => !state.race || i.affiliationID === state.race);
  const query = state.query.trim().toLowerCase();
  const exactMatches = new Set(query ? filtered.filter(item =>
    [item.name.zh, item.name.en, String(item.id)]
      .some(value => value?.trim().toLowerCase() === query),
  ).map(item => item.id) : []);
  const raceOrder = new Map(data.races.map((r, index) => [r.id, index]));
  filtered.sort((a, b) =>
    Number(exactMatches.has(b.id)) - Number(exactMatches.has(a.id)) ||
    (state.sort === 'id'
      ? a.id - b.id
      : state.sort === 'name'
        ? localizedName(a.name).localeCompare(localizedName(b.name), locale) || a.id - b.id
        : (raceOrder.get(a.affiliationID) ?? 5) - (raceOrder.get(b.affiliationID) ?? 5) ||
          localizedName(a.name).localeCompare(localizedName(b.name), locale) ||
          a.id - b.id),
  );
  $('results-count').textContent = t('items', { count: fmt(filtered.length) });
  cardRange = { start: -1, end: -1 };
  renderCardWindow();
  $('empty-state').hidden = filtered.length !== 0;
  if (!filtered.length) {
    const uncollected =
      state.scope === 'ready' &&
      !state.query && state.group !== -1 &&
      !data.items.some((i) => i.groupID === state.group && i.available);
    $('empty-title').textContent = t(uncollected ? 'empty' : 'noMatches');
    $('empty-description').textContent = uncollected
      ? t('items', { count: fmt(group.count) })
      : t('searchHelp');
    $('empty-action').textContent = t(uncollected ? 'browse' : 'clear');
    $('empty-action').dataset.mode = uncollected ? 'all' : 'clear';
  }
}

async function installSkybox(viewer, item, module) {
  if (activeViewer !== viewer) return;
  const select = $('skybox-select'), status = $('skybox-status');
  select.disabled = true; select.onchange = null; status.hidden = true;
  select.replaceChildren(new Option(t('skyboxNone'), 'none'));
  try {
    const catalog = await viewer.assetSession.json('data/backgrounds.json');
    if (activeViewer !== viewer) return;
    if (!catalog.scenes.length) throw new Error('Empty skybox catalog');
    select.append(new Option(t('skyboxAuto'), 'auto'));
    for (const entry of catalog.scenes) select.append(new Option(entry.label, entry.id));
    let saved = 'auto';
    try { saved = localStorage.getItem('viewer.skybox') || 'auto'; } catch {}
    select.value = [...select.options].some(o => o.value === saved) ? saved : 'auto';
    viewer.skybox = module.createSkybox(viewer, catalog, viewer.previewRace);
    select.disabled = false;
    let change = 0;
    const apply = async () => {
      const token = ++change;
      status.hidden = false; status.textContent = t('skyboxLoading');
      try {
        await viewer.skybox.select(select.value);
        if (activeViewer !== viewer || token !== change) return;
        try { localStorage.setItem('viewer.skybox', select.value); } catch {}
        status.hidden = true;
      } catch {
        if (activeViewer === viewer && token === change) status.textContent = t('skyboxError');
      }
    };
    select.onchange = apply;
    await apply();
  } catch {
    if (activeViewer === viewer) { status.hidden = false; status.textContent = t('skyboxMissing'); }
  }
}

let exportBusy = false;
function syncExportButtons() {
  for (const id of ['export-glb', 'export-obj']) $(id).disabled = exportBusy || !activeViewer?.exportReady;
}
async function exportCurrentModel(format) {
  const viewer = activeViewer, item = currentItem;
  if (exportBusy || !viewer?.exportReady || !item) return;
  exportBusy = true;
  syncExportButtons();
  const status = $('export-status');
  status.hidden = false;
  status.textContent = t('exporting', {format:format.toUpperCase()});
  try {
    // Let the busy state paint before collecting the geometry.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (viewer !== activeViewer) return;
    const result = await (await viewerModule).exportModel(viewer, format);
    const name = `${item.id}-${localizedName(item.name) || 'model'}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    const url = URL.createObjectURL(result.blob), link = document.createElement('a');
    link.href = url; link.download = `${name}.${format}`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (viewer === activeViewer) status.textContent = t(format === 'glb' ? 'exportGlbDone' : 'exportObjDone', {count:result.skipped});
  } catch (error) {
    console.error('Model export failed', error);
    if (viewer === activeViewer) status.textContent = t('exportFailed');
  } finally {
    exportBusy = false;
    syncExportButtons();
  }
}

function disposeViewer() {
  if (activeViewer) activeViewer.exportReady = false;
  syncExportButtons();
  $('export-status').hidden = true;
  $('export-status').textContent = '';
  $('gate-state-row').hidden = true;
  $('gate-events').hidden = true;
  $('skybox-select').onchange = null;
  $('skybox-select').disabled = true;
  activeViewer?.skybox?.dispose();
  clearTimeout(modelTimer);
  if (activeViewer) {
    activeViewer.disposeFPS?.();
    activeViewer.disposeBloom?.();
    activeViewer.releasePreload?.();
    activeViewer.disposeOcclusion?.();
    activeViewer.shipEffects?.dispose();
    activeViewer.disposeNative?.();
    activeViewer.remove();
    activeViewer = null;
  }
  $('viewer-fps').textContent = '— FPS';
  $('viewer-mount').replaceChildren();
}

function modelError(key) {
  if (activeViewer) activeViewer.exportReady = false;
  syncExportButtons();
  clearTimeout(modelTimer);
  finishModelLoading();
  $('viewer-error').hidden = false;
  $('viewer-error-text').dataset.i18n = key;
  $('viewer-error-text').textContent = t(key);
}

function modelURL(item) {
  const url = new URL(resourceURL(item.model), location.href);
  url.searchParams.set('v', item.modelRevision || 'material-options-v1');
  return url.href;
}

async function switchAppearance(viewer, item, module, isCurrent) {
  if (activeViewer !== viewer || !isCurrent()) return true;
  const source = modelURL(item);
  if (source === (viewer.appearanceURL || viewer.src) && item.effects === viewer.readyItem?.effects) {
    viewer.readyItem = item;
    viewer.dataset.appearanceTypeId = String(item.id);
    viewer.setAttribute('alt', t('modelAlt', { name: localizedName(item.name) }));
    return true;
  }
  if (!new URL(source).pathname.endsWith('.gltf')) return false;
  void module.prefetchViewerAssets(viewer, item.effects, !!data.nativePreview).catch(() => {});
  const document = await viewer.assetSession.json(source);
  if (activeViewer !== viewer || !isCurrent()) return true;
  if (!module.canReuseHull(viewer.baseDocument || viewer.originalGltfJson, viewer.src, document, source)) return false;
  setModelLoadStage(3);
  viewer.exportReady = false;
  syncExportButtons();
  // Keep the scene, camera, animation, skybox and lighting controls mounted.
  viewer.shipEffects?.dispose();
  viewer.disposeNative?.();
  viewer.appearanceDocument = document;
  viewer.appearanceURL = source;
  viewer.disposeNative = await module.installNativePreview(viewer, await nativeSettings,
    source, item.nativeTypeID || item.id, item.dna);
  if (activeViewer !== viewer) { viewer.disposeNative?.(); return true; }
  if (isCurrent()) setModelLoadStage(4);
  viewer.shipEffects = item.effects ? await module.installShipEffects(viewer, item.effects, $('flight-mode').value) : null;
  if (activeViewer !== viewer) { viewer.shipEffects?.dispose(); return true; }
  viewer.readyItem = item;
  viewer.dataset.appearanceTypeId = String(item.id);
  viewer.dataset.appearanceUpdates = String(Number(viewer.dataset.appearanceUpdates || 0) + 1);
  if (isCurrent()) {
    $('gate-state-row').hidden = !viewer.shipEffects?.gate;
    $('gate-events').hidden = !viewer.shipEffects?.gate;
    viewer.shipEffects?.gate?.setState($('gate-state').value);
    viewer.setAttribute('alt', t('modelAlt', { name: localizedName(item.name) }));
    applyDisplaySettings();
    syncExportButtons();
  }
  return true;
}

async function loadModel(item, profile = null) {
  if (!modelLoadBatch) beginModelLoading();
  setModelLoadStage(2);
  const request = viewerTransition.begin(activeViewer, viewerAPI);
  // Capture the old frame before changing light/material defaults. Use the
  // selected model's DNA, not the session's fixed background/reflection race.
  selectRenderDefaults(item.dna);
  const savedView = viewerTransition.view;
  const isCurrent = () => viewerTransition.isCurrent(request) && currentItem === item && $('model-dialog').open;
  $('viewer-error').hidden = true;
  $('viewer-loading').hidden = false;
  if (activeViewer) activeViewer.exportReady = false;
  syncExportButtons();
  if (activeViewer?.readyItem && viewerAPI && !profile) {
    const viewer = activeViewer, module = viewerAPI;
    if (data.nativePreview) {
      const operation = (viewer.appearanceSwitch || Promise.resolve()).catch(() => {}).then(() => switchAppearance(viewer, item, module, isCurrent));
      viewer.appearanceSwitch = operation;
      try {
        if (await operation) {
          if (activeViewer !== viewer || !isCurrent()) return;
          applyRenderSettings();
          setModelLoadStage(5);
          if (savedView) await module.restoreView(viewer, savedView);
          await module.waitForFrame(viewer);
          if (activeViewer === viewer && isCurrent() && viewerTransition.finish(request)) {
            finishModelLoading();
            viewer.exportReady = true;
            syncExportButtons();
          }
          return;
        }
      }
      catch (error) { console.warn('Appearance update fell back to model loading', error); }
      if (!isCurrent()) return;
    }
  }
  disposeViewer();
  syncTextureControls();
  setModelLoadStage(2);
  $('viewer-error').hidden = true;
  $('viewer-loading').hidden = false;
  try {
    if (!viewerModule)
      viewerModule = trackResource('model-viewer-ao.min.js', () => import('./vendor/model-viewer-ao.min.js?v=emission-bloom-v1')).catch((error) => {
        viewerModule = null;
        throw error;
      });
    viewerAPI = await viewerModule;
    await customElements.whenDefined('model-viewer');
    if (!isCurrent()) return;
    customElements.get('model-viewer').modelCacheSize = 1;
    const viewer = document.createElement('model-viewer');
    viewerSession ||= (await viewerModule).createViewerSession();
    viewerSession.race ||= item.dna?.split(':')[2] || 'gallente';
    viewer.assetSession = viewerSession;
    viewer.previewRace = viewerSession.race;
    activeViewer = viewer;
    void viewerAPI.prefetchViewerAssets(viewer, item.effects, !!data.nativePreview).catch(() => {});
    if (data.nativePreview && !nativeSettings) {
      nativeSettings = loadJSON(resourceURL(data.nativePreview), { cache: 'no-cache' })
        .catch(error => { nativeSettings = null; throw error; });
      nativeSettings.catch(() => {});
    }
    // The loader's cache keys are literal strings. Preload and viewer.src
    // must use the same absolute URL or the model and its buffers load twice.
    const source = modelURL(item);
    const preload = await (await viewerModule).preloadModel(viewer, source, () => {});
    if (activeViewer !== viewer) { preload.release(); return; }
    viewer.releasePreload = preload.release;
    profile ||= viewerProfile(preload.dimensions);
    viewer.renderSettings = renderSettings();
    viewer.displaySettings = displaySettings();
    viewer.setAttribute('alt', t('modelAlt', { name: localizedName(item.name) }));
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('loading', 'eager');
    viewer.setAttribute('interaction-prompt', 'none');
    viewer.setAttribute('camera-orbit', '35deg 70deg auto');
    viewer.setAttribute('field-of-view', '30deg');
    viewer.setAttribute('min-field-of-view', '8deg');
    viewer.setAttribute('max-field-of-view', '60deg');
    viewer.setAttribute('environment-image', 'neutral');
    viewer.setAttribute('tone-mapping', 'neutral');
    viewer.setAttribute('exposure', exposureForLevel($('exposure').value));
    viewer.setAttribute('shadow-intensity', '0');
    if (profile) viewer.setAttribute('scale', `${profile.scale} ${profile.scale} ${profile.scale}`);
    viewer.setAttribute('rotation-per-second', '6deg');
    viewer.setAttribute('auto-rotate-delay', '20000');
    if ($('auto-rotate').checked) viewer.setAttribute('auto-rotate', '');
    viewer.addEventListener('load', async () => {
      if (activeViewer !== viewer) return;
      if (isCurrent()) setModelLoadStage(3);
      try {
        viewer.releasePreload?.();
        viewer.jumpCameraToGoal();
        // Native wheel/pinch controls vary FOV when both radius limits agree.
        // Keep enough clearance even when panning the target onto the hull.
        const dimensions = viewer.getDimensions();
        const homeDistance = Math.max(
          viewer.getCameraOrbit().radius,
          Math.hypot(dimensions.x, dimensions.y, dimensions.z) * 1.1,
        );
        viewer.dataset.homeDistance = String(homeDistance);
        viewer.setAttribute('min-camera-orbit', `auto auto ${homeDistance}m`);
        viewer.setAttribute('max-camera-orbit', `auto auto ${homeDistance}m`);
        viewer.cameraOrbit = `35deg 70deg ${homeDistance}m`;
        await viewer.updateComplete;
        if (activeViewer !== viewer) return;
        viewer.jumpCameraToGoal();
        occlusion.strength = profile.strength;
        Object.assign(ao.ssaoMaterial, {
          radius: profile.radius,
          samples: profile.samples,
          bias: profile.bias,
          fade: profile.fade,
        });
        // Preserve authored/exported material values; scene scale and AO must
        // never serve as a reason to retune surface roughness or metalness.
        for (const [index, material] of viewer.model.materials.entries()) {
          const pbr = material.pbrMetallicRoughness;
          const original =
            viewer.originalGltfJson.materials[index]?.pbrMetallicRoughness?.roughnessFactor ?? 1;
          pbr.setRoughnessFactor(original * profile.roughnessMultiplier);
        }
        const homeFov = (viewer.getFieldOfView() * Math.PI) / 360;
        let radiusUpdate;
        viewer.addEventListener('camera-change', () => {
          if (activeViewer !== viewer) return;
          const zoom =
            ((homeDistance / viewer.getCameraOrbit().radius) * Math.tan(homeFov)) /
            Math.tan((viewer.getFieldOfView() * Math.PI) / 360);
          const radius = occlusionRadius(profile.radius, zoom);
          clearTimeout(radiusUpdate);
          if (Math.abs(ao.ssaoMaterial.radius - radius) > 0.001) {
            // Radius is a shader define in postprocessing: changing it while
            // scrolling recompiles a program for almost every camera frame.
            radiusUpdate = setTimeout(() => {
              if (activeViewer !== viewer) return;
              ao.ssaoMaterial.radius = radius;
              composer.queueRender();
            }, 200);
          }
        });
        viewer.dataset.renderProfile = JSON.stringify(profile);
        const module = await viewerModule;
        if (!isCurrent()) return;
        // Backgrounds are optional: they can arrive after the hull is usable.
        void installSkybox(viewer, item, module);
        if (!savedView) {
          composer.queueRender();
          await module.waitForFrame(viewer);
          if (activeViewer !== viewer || !isCurrent()) return;
          viewer.geometryReady = viewerTransition.revealGeometry(request);
        }
        if (data.nativePreview) {
          if (!nativeSettings)
            nativeSettings = loadJSON(resourceURL(data.nativePreview), { cache: 'no-cache' })
              .catch((error) => {
                nativeSettings = null;
                throw error;
              });
          const module = await viewerModule;
          const dispose = await module.installNativePreview(
            viewer,
            await nativeSettings,
            item.model,
            item.nativeTypeID || item.id,
            item.dna,
            { progressive: !savedView },
          );
          if (activeViewer !== viewer) {
            dispose();
            return;
          }
          viewer.disposeNative = dispose;
          applyDisplaySettings();
        }
        if (isCurrent()) setModelLoadStage(4);
        if (item.effects) {
          const effects = await (
            await viewerModule
          ).installShipEffects(viewer, item.effects, $('flight-mode').value);
          if (activeViewer !== viewer) {
            effects.dispose();
            return;
          }
          viewer.shipEffects = effects;
          $('gate-state-row').hidden = !effects.gate;
          $('gate-events').hidden = !effects.gate;
          $('gate-state').value = 'Active_Linked';
          applyDisplaySettings();
        }
        viewer.disposeOcclusion = (await viewerModule).installHullOcclusion(composer);
        viewer.dataset.occlusionSurface = 'depth-writing-geometry';
        const clips = viewer.availableAnimations;
        $('hull-animation-row').hidden = !clips.length;
        $('hull-animation').replaceChildren(
          ...clips.map((name) => {
            const option = document.createElement('option');
            option.value = name;
            const key = name.split('.').pop();
            option.textContent = t(key);
            return option;
          }),
        );
        if (clips.length) {
          const normal = clips.find((name) => name.endsWith('.NormalLoop')) || clips[0];
          $('hull-animation').value = normal;
          viewer.animationName = normal;
          if ($('flight-mode').value !== 'paused') playHullAnimation(viewer);
        }
        if (isCurrent()) setModelLoadStage(5);
        if (savedView) await (await viewerModule).restoreView(viewer, savedView);
        composer.queueRender();
        await (await viewerModule).waitForFrame(viewer);
        if (activeViewer !== viewer || !isCurrent()) return;
      } catch (error) {
        if (activeViewer === viewer) modelError('errorInit');
        console.error(error);
        return;
      }
      clearTimeout(modelTimer);
      viewerTransition.finish(request);
      finishModelLoading();
      $('viewer-error').hidden = true;
      if (activeViewer === viewer) {
        viewer.readyItem = item;
        viewer.dataset.appearanceTypeId = String(item.id);
        viewer.exportReady = true;
        syncExportButtons();
      }
    });
    viewer.addEventListener('error', () => {
      if (activeViewer !== viewer) return;
      modelError('errorAssets');
    });
    viewer.setAttribute('src', source);
    // Preserve HDR precision and multisample the geometry before postprocessing.
    const composer = document.createElement('effect-composer');
    const budget = postprocessingBudget(item.triangles);
    composer.setAttribute('render-mode', 'quality');
    composer.setAttribute('msaa', String(budget.msaa));
    const occlusion = document.createElement('ssao-effect');
    occlusion.setAttribute('strength', '3');
    // The addon's small default radius only darkens hairline contacts.
    // Sample across adjacent hull panels and supports, with enough samples
    // to keep the wider occlusion smooth rather than grainy.
    const ao = occlusion.effects[0];
    // Keep hull shading/textures at full resolution; only the occlusion
    // buffer uses fewer pixels on large meshes.
    ao.resolution.scale = budget.aoScale;
    ao.luminanceInfluence = 0.15;
    occlusion.setAttribute('blend-mode', $('ambient-occlusion').checked ? 'default' : 'skip');
    // Offscreen HDR buffers need an explicit final tone-map pass; renderer
    // exposure alone does not affect the composited image without it.
    const colorGrade = document.createElement('color-grade-effect');
    // The captured preview has no tonemapping or dynamic-exposure effect.
    // Neutral's black-offset would add an unrelated shadow-crushing curve.
    colorGrade.setAttribute('tonemapping', data.nativePreview ? 'linear' : 'neutral');
    const antialias = document.createElement('smaa-effect');
    // Keep SMAA for thin edges, with a shorter search on large meshes.
    antialias.setAttribute('quality', budget.smaa);
    antialias.effects[0].requireSeparatePass = true;
    const bloom = document.createElement('bloom-effect');
    bloom.setAttribute('strength', String(viewer.renderSettings.bloom));
    bloom.setAttribute('blend-mode', viewer.renderSettings.bloom > 0 ? 'default' : 'skip');
    bloom.setAttribute('threshold', '0.05');
    bloom.setAttribute('smoothing', '0.1');
    bloom.setAttribute('radius', '0.65');
    // Blur only the separate HDR emission source; paint, reflections and the
    // starfield never feed the bloom. Compose before exposure/tone mapping.
    colorGrade.effects[0].requireSeparatePass = true;
    composer.append(occlusion, bloom, colorGrade, antialias);
    viewer.append(composer);
    $('viewer-mount').append(viewer);
    viewer.disposeBloom = viewerAPI.installViewerBloom(viewer, bloom);
    viewer.disposeFPS = viewerAPI.watchViewerFPS(viewer, fps => {
      if (activeViewer === viewer) $('viewer-fps').textContent = `${fps ?? '—'} FPS`;
    });
    // Intercept inside the shadow root, including non-composed wheel events.
    // Let model-viewer retain its FOV limits, damping and fixed camera radius.
    let forwardingWheel = false;
    viewer.shadowRoot.addEventListener('wheel', (event) => {
      if (forwardingWheel) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      forwardingWheel = true;
      try { viewer.zoom(event.deltaY * (event.deltaMode === 1 ? 18 : 1) / 30); }
      finally { forwardingWheel = false; }
    }, { capture: true, passive: false });
    modelTimer = setTimeout(() => {
      if (activeViewer === viewer) modelError('errorTimeout');
    }, 90000);
  } catch (error) {
    if (isCurrent()) modelError('errorViewer');
    console.error(error);
  }
}

function detailList() {
  const ready = filtered.filter((i) => i.available);
  return ready.some((i) => i.id === currentItem?.id)
    ? ready
    : data.items.filter((i) => i.available);
}

async function openItem(id, route = true) {
  const revision = ++detailRevision;
  beginModelLoading();
  // Give feedback in the click's own task, before waiting for the metadata shard.
  const preview = catalogLoader.itemsByID.get(id) || data.items.find(item => item.id === id);
  if (!$('model-dialog').open) lastFocus = document.activeElement;
  currentItem = { ...preview, id, detailPending: true };
  state.item = id;
  if (route) saveRoute();
  renderDetail();
  $('viewer-error').hidden = true;
  $('viewer-loading').hidden = false;
  if (activeViewer) activeViewer.exportReady = false;
  syncExportButtons();
  if (!$('model-dialog').open) {
    $('model-dialog').showModal();
    document.body.style.overflow = 'hidden';
  }
  let item;
  try { item = await catalogLoader.item(id, state.group); }
  catch (error) {
    if (revision === detailRevision && $('model-dialog').open) modelError('errorItemData');
    console.error(error);
    return;
  }
  if (revision !== detailRevision || !$('model-dialog').open) return;
  if (!item?.available) { closeDetail(false); return; }
  if (!state.query && state.group !== -1 && state.group !== item.groupID) {
    state.group = item.groupID;
    state.race = 0;
    await render();
    if (revision !== detailRevision) return;
  }
  currentItem = item;
  state.item = id;
  if (route) saveRoute();
  renderDetail();
  loadModel(item);
}

function renderDetail() {
  if (!currentItem) return;
  renderVariants();
  const item = currentItem;
  $('detail-title').textContent = localizedName(item.name) || `ID ${item.id}`;
  $('detail-dna').textContent = item.dna ? `DNA: ${item.dna}` : '';
  $('detail-dna').title = item.dna || '';
  $('detail-dna').hidden = !item.dna;
  $('detail-group').textContent = localizedName(groupsByID.get(item.groupID)?.name);
  const factionVariant = [4, 52].includes(Number(item.metaGroupID));
  $('detail-tech').hidden = !factionVariant && !item.techLevel;
  $('detail-tech').textContent = factionVariant ? (locale.startsWith('zh') ? '势力' : 'Faction') : `T${item.techLevel}`;
  $('detail-race').innerHTML = `${raceMark(item.affiliationID)}${esc(raceName(item.affiliationID))}`;
  $('detail-id').textContent = item.id;
  $('detail-graphic').textContent = item.graphicID ?? '—';
  $('detail-triangles').textContent = item.triangles == null ? '—' : fmt(item.triangles);
  const omissions = [];
  if (item.warnings?.some(w => w.startsWith('未显示残骸烟雾/碎屑粒子'))) omissions.push(t('missingParticles'));
  if (item.warnings?.some(w => w.startsWith('缺少发光贴图'))) omissions.push(t('missingGlow'));
  if (item.warnings?.includes('部分星门特效尚未适配')) omissions.push(t('missingGateEffects'));
  $('detail-warnings').textContent = omissions.join(' ');
  $('detail-warnings').hidden = !omissions.length;
  $('detail-size').textContent =
    item.modelBytes == null ? '—' : `${((item.modelBytes + (item.effectsBytes || 0)) / 1024 / 1024).toFixed(1)} MB`;
  const list = detailList(),
    index = list.findIndex((i) => i.id === item.id);
  $('detail-position').textContent = `${index + 1} / ${list.length}`;
  $('previous-ship').disabled = index <= 0;
  $('next-ship').disabled = index >= list.length - 1;
  activeViewer?.setAttribute('alt', t('modelAlt', { name: localizedName(item.name) }));
  for (const option of $('hull-animation').options)
    option.textContent = t(option.value.split('.').pop());
}

function setViewerExpanded(expanded) {
  $('model-dialog').classList.toggle('viewer-expanded', expanded);
  $('fullscreen').setAttribute('aria-pressed', String(expanded));
  const label = t(expanded ? 'exitFullscreen' : 'fullscreen');
  $('fullscreen').setAttribute('aria-label', label);
  $('fullscreen').title = label;
}
async function toggleViewerExpanded() {
  const dialog = $('model-dialog');
  if (dialog.classList.contains('viewer-expanded')) {
    setViewerExpanded(false);
    if (document.fullscreenElement === dialog) {
      try { await document.exitFullscreen(); } catch {}
    }
    return;
  }
  // CSS expansion works inside the modal's top layer even without Fullscreen API.
  setViewerExpanded(true);
  if (document.fullscreenEnabled && typeof dialog.requestFullscreen === 'function') {
    try { await dialog.requestFullscreen(); } catch {
      // Keep the usable in-page fullscreen fallback.
    }
  }
}

function closeDetail(route = true) {
  setViewerExpanded(false);
  if (document.fullscreenElement === $('model-dialog')) document.exitFullscreen().catch(() => {});
  ++detailRevision;
  finishModelLoading();
  if (!$('model-dialog').open) return;
  suppressedClose = true;
  $('model-dialog').close();
  viewerTransition.reset();
  disposeViewer();
  viewerSession?.dispose();
  viewerSession = null;
  currentItem = null;
  variantState = { hull: '', open: false, items: null, status: '' };
  state.item = 0;
  document.body.style.overflow = '';
  if (route) saveRoute(true);
  lastFocus?.focus({ preventScroll: true });
}

function moveShip(direction) {
  const list = detailList(),
    index = list.findIndex((i) => i.id === currentItem?.id);
  if (list[index + direction]) openItem(list[index + direction].id, true);
}

function closeMenu() {
  $('sidebar').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
}

function setupEvents() {
  for (const role of textureRoles) $('texture-'+role).addEventListener('change', applyDisplaySettings);
  $('show-effects').addEventListener('change', applyDisplaySettings);
  $('show-textures').addEventListener('change', () => {
    for (const role of textureRoles) $('texture-'+role).checked = $('show-textures').checked;
    applyDisplaySettings();
  });
  $('catalog-tree').addEventListener('click', (event) => {
    const button = event.target.closest('[data-group]');
    if (button) selectGroup(Number(button.dataset.group));
  });
  $('cards').addEventListener('click', (event) => {
    const card = event.target.closest('[data-item]');
    if (card) openItem(Number(card.dataset.item));
  });
  $('card-scroll').addEventListener('scroll', () => {
    cardsScrolling = true;
    clearTimeout(cardScrollIdle);
    cardScrollIdle = setTimeout(() => {
      cardsScrolling = false;
      cardRange = { start: -1, end: -1 };
      scheduleCardWindow();
    }, 180);
    scheduleCardWindow();
  }, { passive: true });
  new ResizeObserver(() => {
    if (cardLayout && cardLayout.width !== $('cards').clientWidth) {
      cardLayout = null;
      cardRange = { start: -1, end: -1 };
      renderCardWindow();
    }
  }).observe($('cards'));
  // Fonts and responsive styles can change the measured card after first paint.
  new ResizeObserver(() => {
    if (cardLayout && cardProbe.firstElementChild &&
        Math.ceil(cardProbe.firstElementChild.getBoundingClientRect().height) !== cardLayout.rowHeight) {
      cardLayout = null;
      cardRange = { start: -1, end: -1 };
      renderCardWindow();
    }
  }).observe(cardProbe);
  $('race-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-race]');
    if (button) {
      state.race = Number(button.dataset.race);
      saveRoute();
      render();
    }
  });
  for (const scope of ['ready', 'all'])
    $(`scope-${scope}`).addEventListener('click', () => {
      state.scope = scope;
      saveRoute();
      render();
    });
  $('search').addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      state.query = $('search').value.trim();
      saveRoute(true);
      render();
    }, 150);
  });
  $('sort').addEventListener('change', () => {
    state.sort = $('sort').value;
    saveRoute();
    render();
  });
  $('empty-action').addEventListener('click', () => {
    if ($('empty-action').dataset.mode === 'all') state.scope = 'all';
    else {
      state.race = 0;
      state.query = '';
      $('search').value = '';
    }
    saveRoute();
    render();
  });
  $('close-dialog').addEventListener('click', () => closeDetail());
  $('model-dialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    if ($('model-dialog').classList.contains('viewer-expanded')) toggleViewerExpanded();
    else closeDetail();
  });
  $('model-dialog').addEventListener('close', () => {
    if (suppressedClose) {
      suppressedClose = false;
      return;
    }
    ++detailRevision;
    finishModelLoading();
    viewerTransition.reset();
    disposeViewer();
    viewerSession?.dispose();
    viewerSession = null;
    currentItem = null;
    state.item = 0;
    document.body.style.overflow = '';
    saveRoute(true);
  });
  $('model-dialog').addEventListener('click', (event) => {
    if (event.target === $('model-dialog')) {
      const box = $('model-dialog').getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        closeDetail();
    }
  });
  $('previous-ship').addEventListener('click', () => moveShip(-1));
  $('hull-variants-toggle').addEventListener('click', toggleVariants);
  $('hull-variants-list').addEventListener('click', event => {
    const card = event.target.closest('[data-variant]');
    if (card && !card.disabled && Number(card.dataset.variant) !== currentItem?.id) openItem(Number(card.dataset.variant));
  });
  $('next-ship').addEventListener('click', () => moveShip(1));
  $('retry-model').addEventListener('click', () => {
    if (currentItem?.detailPending) openItem(currentItem.id, false);
    else if (currentItem) loadModel(currentItem);
  });
  $('auto-rotate').checked = false;
  $('auto-rotate').addEventListener('change', () => {
    if (activeViewer) activeViewer.toggleAttribute('auto-rotate', $('auto-rotate').checked);
  });
  $('ambient-occlusion').addEventListener('change', () => {
    activeViewer
      ?.querySelector('ssao-effect')
      ?.setAttribute('blend-mode', $('ambient-occlusion').checked ? 'default' : 'skip');
  });
  $('flight-mode').addEventListener('change', () => {
    activeViewer?.shipEffects?.setMode($('flight-mode').value);
    if (activeViewer?.availableAnimations.length) {
      if ($('flight-mode').value === 'paused') activeViewer.pause();
      else playHullAnimation(activeViewer);
    }
  });
  $('gate-state').addEventListener('change', () => activeViewer?.shipEffects?.gate?.setState($('gate-state').value));
  $('gate-arrival').addEventListener('click', () => activeViewer?.shipEffects?.gate?.trigger('arrival'));
  $('gate-departure').addEventListener('click', () => activeViewer?.shipEffects?.gate?.trigger('departure'));
  $('hull-animation').addEventListener('change', () => {
    if (activeViewer) {
      activeViewer.animationName = $('hull-animation').value;
      activeViewer.currentTime = 0;
      if ($('flight-mode').value !== 'paused') playHullAnimation(activeViewer);
    }
  });
  for (const key of Object.keys(renderDefaults)) $(key).addEventListener('input', applyRenderSettings);
  $('reset-render').addEventListener('click', () => {
    for (const [key, value] of Object.entries(renderDefaultsForDNA(currentItem?.dna))) $(key).value = value;
    $('ambient-occlusion').checked = true;
    $('ambient-occlusion').dispatchEvent(new Event('change'));
    applyRenderSettings();
    for (const role of textureRoles) $('texture-'+role).checked = true;
    $('show-effects').checked = true;
    applyDisplaySettings();
  });
  const resetView = () => {
    if (activeViewer) {
      activeViewer.cameraOrbit = `35deg 70deg ${activeViewer.dataset.homeDistance ? activeViewer.dataset.homeDistance + 'm' : 'auto'}`;
      activeViewer.cameraTarget = 'auto auto auto';
      activeViewer.fieldOfView = '30deg';
      activeViewer.resetTurntableRotation();
      activeViewer.jumpCameraToGoal();
    }
  };
  $('reset-view').addEventListener('click', resetView);
  $('export-glb').addEventListener('click', () => exportCurrentModel('glb'));
  $('export-obj').addEventListener('click', () => exportCurrentModel('obj'));
  $('stage-reset-view').addEventListener('click', resetView);
  $('fullscreen').addEventListener('click', toggleViewerExpanded);
  document.addEventListener('fullscreenchange', () => {
    setViewerExpanded(document.fullscreenElement === $('model-dialog'));
  });
  $('menu-toggle').addEventListener('click', () => {
    const open = $('sidebar').classList.toggle('open');
    $('menu-toggle').setAttribute('aria-expanded', open);
  });
  $('main').addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (
      event.key === '/' &&
      !$('model-dialog').open &&
      !$('about-dialog').open &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
    ) {
      event.preventDefault();
      $('search').focus();
    }
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('hashchange', async () => {
    clearTimeout(renderTimer);
    readRoute();
    const route = location.hash;
    await render();
    if (location.hash !== route) return;
    if (state.item) openItem(state.item, false);
    else closeDetail(false);
  });
}

applyTranslations();
for (const select of document.querySelectorAll('[data-language]')) {
  select.addEventListener('change', () => {
    setLocale(select.value);
    renderPublicationDate();
    renderSponsor();
    renderActivity();
    if (data) {
      buildTree();
      render();
      renderDetail();
    } else renderCatalogError();
  });
}

function renderCatalogError() {
  $('cards').removeAttribute('aria-busy');
  $('cards').style.height = '';
  $('cards').innerHTML = `<div class="fatal-error">${esc(t('errorCatalog'))}</div>`;
  $('results-count').textContent = '';
}

async function init() {
  try {
    const config = await loadJSON('./site-config.json', { cache: 'no-cache' }, { optional: true });
    frontendPublishedAt = config.frontendPublishedAt;
    renderPublicationDate();
    configureResourceBase(config.resourceBaseURL);
    data = await loadJSON(resourceURL('./data/catalog-index.json'), { cache: 'no-cache' });
    const identities = await loadJSON('./icons/identities.json?v=meta-groups-v1');
    const resolveAffiliation = createAffiliationResolver(identities);
    const identityByID = new Map([...identities.races, ...identities.factions].map(r => [r.id, r]));
    const ordered = [...data.races.map(r => r.id), ...identities.factions.map(r => r.id)];
    data.races = [...new Set(ordered)].map(id => {
      const r = identityByID.get(id);
      return {id, ...r.name, icon:r.icon};
    });
    catalogLoader = createCatalogLoader(data, url => loadJSON(resourceURL(url)), item => {
      for (const key of ['model', 'effects', 'thumbnail', 'render', 'image']) {
        if (typeof item[key] === 'string') item[key] = resourceURL(item[key]);
      }
      item.metaGroupID ??= identities.typeMetaGroups?.[item.id];
      Object.assign(item, resolveAffiliation(item));
      return item;
    }, { requireSearchDNA: true });
    data.items = [];
    racesByID = new Map(data.races.map((r) => [r.id, r]));
    groupsByID = new Map(
      data.categories.flatMap((c) => c.groups.map((g) => [g.id, { ...g, category: c }])),
    );
    readRoute();
    buildTree();
    setupEvents();
    await render();
    if (state.item) openItem(state.item, false);
  } catch (error) {
    renderCatalogError();
    console.error(error);
  }
}
init();





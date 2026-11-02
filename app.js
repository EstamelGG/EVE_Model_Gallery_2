import {configureHullAnimations} from './viewer-presentation.mjs?v=a697e41514d32632';
import {createViewerRuntime} from './viewer-runtime.mjs?v=a697e41514d32632';
import {
  locale,
  t,
  localizedName,
  setLocale,
  applyTranslations,
} from './i18n.mjs?v=a697e41514d32632';
import {createViewerSettings} from './viewer-settings.mjs?v=a697e41514d32632';
import {createFittingPanel} from './fitting-panel.mjs?v=a697e41514d32632';
import {createHangarPanel,supportsHangar} from './hangar-panel.mjs?v=a697e41514d32632';
import {createCardGrid} from './card-grid.mjs?v=a697e41514d32632';
import {createCatalogState} from './catalog-state.mjs?v=a697e41514d32632';
import { createCatalogLoader } from './catalog-loader.mjs?v=a697e41514d32632';
import { hullKey } from './hull-variants.mjs?v=a697e41514d32632';
import { createAffiliationResolver } from './affiliation.mjs?v=a697e41514d32632';
import { createViewerTransition } from './viewer-transition.mjs?v=a697e41514d32632';
import { configureResourceBase, resourceURL } from './resource-location.mjs?v=a697e41514d32632';
import { loadJSON } from './resource-activity.mjs?v=a697e41514d32632';
import { prepareRenderImages } from './render-images.mjs?v=a697e41514d32632';
import {createLoadingPanel} from './loading-panel.mjs?v=a697e41514d32632';
import { subsystemConfiguration, subsystemItem, subsystemOptionAvailable, subsystemOptionName, subsystemGroups, subsystemSlots, isStrategicCruiser, withSubsystems } from './subsystems.mjs?v=a697e41514d32632';
import { resetView } from './view-reset.mjs?v=a697e41514d32632';
const $ = (id) => document.getElementById(id);
const icon = (name, cls = '') =>
  `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmt = (value) => Number(value).toLocaleString(locale);
const itemDimensions = new WeakMap();
function formatDimension(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  const rounded = Math.round(meters);
  return rounded >= 1000 ? `${Number((rounded / 1000).toFixed(2))}KM` : `${rounded}M`;
}
function renderDimensions(dimensions) {
  for (const axis of ['x', 'y', 'z']) {
    $('dimension-' + axis).textContent = formatDimension(dimensions?.[axis]);
  }
}
function updateDimensions(item, dimensions) {
  if (!dimensions) return;
  itemDimensions.set(item, dimensions);
  if (currentItem === item) renderDimensions(itemDimensions.get(item));
}
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
let sponsorCopyTimer;
function renderSponsor() {
  const name = $('sponsor-name');
  name.removeAttribute('data-i18n');
  name.textContent = sponsorName || (sponsorStatus === 'characterLoadFailed' ? `ID ${sponsorCharacterID}` : t('loading'));
  const button = $('copy-sponsor-name');
  button.disabled = !sponsorName;
  button.dataset.i18n = sponsorStatus === 'nameCopied' ? 'nameCopied' : 'copyName';
  button.textContent = t(button.dataset.i18n);
  const status = $('sponsor-status');
  status.hidden = !sponsorStatus || sponsorStatus === 'nameCopied';
  status.textContent = status.hidden ? '' : t(sponsorStatus);
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
  clearTimeout(sponsorCopyTimer);
  if (sponsorStatus === 'nameCopied') {
    sponsorCopyTimer = setTimeout(() => {
      sponsorStatus = '';
      renderSponsor();
    }, 2000);
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
function renderPreview(item, badge = '') {
  const useIcon = item.renderKind === 'equipment' || item.categoryID === 7;
  const imageURL = `https://images.evetech.net/types/${item.id}/icon?size=64`;
  return `<div class="render-preview" data-image-state="loading" aria-busy="true">${badge}
    <img data-render src="${useIcon ? imageURL : renderURL(item)}" ${useIcon ? 'class="official-icon"' : `${renderFallbacks[item.id] ? `data-fallback="${esc(resourceURL(renderFallbacks[item.id]))}"` : ''} data-icon="${imageURL}"`} alt="${esc(t('poster', { name: localizedName(item.name) }))}" loading="lazy" decoding="async" width="512" height="512">
    <span class="loading-ring render-spinner" aria-hidden="true"></span>
    <span class="render-image-error" role="img" aria-label="${esc(t('renderUnavailable'))}">${icon('ship', 'placeholder-cube')}</span>
  </div>`;
}
// Group 0 exists in the native catalogue; -1 is the virtual all-models entry.
const catalog = createCatalogState({
  groups:() => groupsByID, races:() => data.races, language:() => locale, name:localizedName,
});
let revealedGroup = null;
let renderFallbacks = {};
// Official availability belongs to the actual item, including visual aliases.
const renderURL = (item) =>
  `https://images.evetech.net/types/${item.id}/render?size=256`;
let data,
  catalogLoader,
  groupsByID,
  racesByID,
  filtered = [],
  currentItem = null;
let lastFocus,
  renderTimer,
  suppressedClose = false;
let renderRevision = 0, detailRevision = 0;
let variantState = { hull: '', open: false, groups: null, status: '' };
let subsystemBaseItem = null;
const subsystemSelections = new Map();
let settingsTab = 'visual';

function selectSettingsTab(tab) {
  if ($('tab-'+tab)?.hidden) tab='visual';
  settingsTab = tab;
  for (const button of document.querySelectorAll('[data-settings-tab]')) {
    const active = button.dataset.settingsTab === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    $('panel-' + button.dataset.settingsTab).hidden = !active;
  }
  fittingPanel.setActive(tab === 'fitting');
  if (tab === 'hangar') void hangarPanel.open();
  viewing.viewer?.disposeSubsystemLabels?.setEnabled?.(tab === 'subsystems');
  if (tab === 'subsystems') viewing.viewer?.disposeSubsystemLabels?.show?.();
}

function renderSubsystems() {
  const config = subsystemBaseItem?.id === currentItem?.id
    ? subsystemConfiguration(subsystemBaseItem, currentItem?.subsystemSelection) : null;
  const panel = $('subsystem-settings');
  panel.hidden = currentItem?.groupID !== 963;
  $('subsystem-not-applicable').hidden = !panel.hidden;
  if (panel.hidden) return;
  const focused = document.activeElement?.dataset.subsystemSlot;
  $('subsystem-options').innerHTML = (config?.spec.slots || []).map((slot, index) =>
    `<label class="subsystem-field"><span>${t('subsystem' + slot.key)}</span><select data-subsystem-slot="${index}" aria-label="${t('subsystem' + slot.key)}" aria-describedby="subsystem-status"${!config.code ? ' disabled' : ''}>
    ${!config.code ? `<option>${t('subsystemDefault')}</option>` : ''}
    ${slot.options.map(option => `<option value="${option.variant}"${String(option.variant) === config.code[index] ? ' selected' : ''}${!subsystemOptionAvailable(config, index, option.variant) ? ' disabled' : ''}>${esc(subsystemOptionName(localizedName(option.name)))}</option>`).join('')}</select></label>`
  ).join('');
  $('subsystem-status').textContent = config?.code
    ? t('subsystemReady', { ready: config.readyCount, total: config.total })
    : t('subsystemUnavailable');
  $('reset-subsystems').disabled = !config?.defaultAvailable || config.code === config.spec.default;
  $('show-subsystem-labels').disabled = !config?.code || viewing.viewer?.readyItem !== currentItem;
  viewing.viewer?.disposeSubsystemLabels?.refresh?.();
  if (focused != null) panel.querySelector(`[data-subsystem-slot="${focused}"]`)?.focus({ preventScroll: true });
}

function changeSubsystems(code) {
  const config = subsystemConfiguration(subsystemBaseItem, code);
  if (!config || config.code !== code || code === currentItem?.subsystemSelection) return;
  subsystemSelections.set(subsystemBaseItem.id, code);
  currentItem = subsystemItem(subsystemBaseItem, code, location.href);
  ++detailRevision;
  renderDetail();
  viewing.show(currentItem);
}
const viewerTransition = createViewerTransition($('viewer-stage'), $('viewer-snapshot'));
const viewing = createViewerRuntime({
  mount: $('viewer-mount'), transition: viewerTransition,
  loadRenderer: () => import('./vendor/model-viewer-ao.min.js?v=a697e41514d32632'),
  view: {
    dimensionFrame: $('dimension-frame'),
    label: item => t('modelAlt', {name:localizedName(item.name)}),
    settings() {
      let background = 'auto';
      try { background = localStorage.getItem('viewer.skybox') || 'auto'; } catch {}
      return {nativePreview:data?.nativePreview, background, ...viewerSettings.read()};
    },
    batch: () => loading.batch,
    dimensions: updateDimensions,
    environment: installSkybox,
    progress: stage => loading.progress(stage),
    begin(item, kind) {
      fittingPanel.reset();
      hangarPanel.reset();
      if (!loading.batch) loading.begin();
      if (kind !== 'subsystems') viewerSettings.selectDefaults(item.dna);
      $('viewer-error').hidden = true;
      $('viewer-loading').hidden = false;
      syncExportButtons();
    },
    reset() {
      fittingPanel.reset();
      hangarPanel.reset();
      $('export-status').hidden = true;
      $('export-status').textContent = '';
      $('gate-state-row').hidden = true;
      $('gate-events').hidden = true;
      $('skybox-select').onchange = null;
      $('skybox-select').disabled = true;
      $('viewer-fps').textContent = '— FPS';
      $('viewer-gpu').textContent = '';
      viewerSettings.sync();syncExportButtons();
    },
    connected(viewer, module) {
      const gpu=module.viewerGPU(viewer);
      $('viewer-gpu').textContent='GPU · '+gpu;
      $('viewer-gpu').title=gpu;
      viewer.lifecycle.set('disposeFPS', module.watchViewerFPS(viewer, fps => {
        if (viewing.viewer === viewer) $('viewer-fps').textContent = `${fps ?? '—'} FPS`;
      }));
      viewerSettings.connect(viewer);
    },
    installed(viewer, item, module, kind) {
      if (kind === 'model') {
        viewer.lifecycle.set('disposeHullAnimations', configureHullAnimations(viewer, {
          row:$('hull-animation-row'), select:$('hull-animation'), translate:t,
          play:playHullAnimation, isActive:() => viewing.viewer === viewer,
        }));
        $('gate-state').value = 'Active_Linked';
      }
      $('gate-state-row').hidden = !viewer.shipEffects?.gate;
      $('gate-events').hidden = !viewer.shipEffects?.gate;
      if (kind === 'appearance') viewer.shipEffects?.gate?.setState($('gate-state').value);
      if (item.subsystemParts) {
        viewer.dataset.subsystemSelection = item.subsystemSelection;
        viewer.lifecycle.set('disposeSubsystemLabels', module.installSubsystemLabels(viewer, () =>
          item.subsystemParts.map((part,i) => ({title:t('subsystem'+subsystemSlots[i]), name:subsystemOptionName(localizedName(part.name))}))));
        viewer.disposeSubsystemLabels?.setEnabled?.(settingsTab === 'subsystems');
      }
      fittingPanel.connect(viewer, item, module);
      hangarPanel.connect(viewer, item, module);
    },
    ready(viewer, item, kind) {
      loading.finish();
      $('viewer-error').hidden = true;
      viewerSettings.sync();
      viewer.setAttribute('alt', t('modelAlt', {name:localizedName(item.name)}));
      if (item.subsystemParts) {
        if (kind === 'model' && settingsTab === 'subsystems') viewer.disposeSubsystemLabels.show?.();
        renderSubsystems();
      }
      syncExportButtons();
    },
    failed({key, error, kind, retained}) {
      if (!retained) { console.error(error); modelError(key); return; }
      console.warn('Viewer update failed; previous scene retained', error);
      currentItem = retained;catalog.update({item:retained.id});
      if (kind === 'subsystems') subsystemSelections.set(retained.id, retained.subsystemSelection);
      else viewerSettings.selectDefaults(retained.dna);
      saveRoute(true);renderDetail();loading.finish(true);syncExportButtons();
      if (kind === 'subsystems') $('subsystem-status').textContent = t('subsystemUpdateFailed');
      else {
        $('viewer-update-status').hidden = false;
        $('viewer-update-status').textContent = t('appearanceUpdateFailed');
      }
    },
  },
});

const loading = createLoadingPanel({root:document, translate:t, backgroundPending:() => viewing.viewer?.backgroundLoading});
const viewerSettings = createViewerSettings({root:$('model-dialog'), runtime:viewing, currentDNA:() => currentItem?.dna});
const fittingPanel = createFittingPanel({root:$('model-dialog'), currentViewer:() => viewing.viewer,
  currentItem:() => currentItem, translate:t, name:localizedName,
  groupName:id=>localizedName(groupsByID.get(id)?.name)||String(id),
  nativeSettings:viewer => data?.nativePreview ? viewer.assetSession.json(data.nativePreview) : null});
const hangarPanel = createHangarPanel({root:$('model-dialog'),currentViewer:()=>viewing.viewer,currentItem:()=>currentItem,
  translate:t,name:localizedName,catalog:()=>catalogLoader,loading,
  nativeSettings:viewer=>viewer.assetSession.json(data.nativePreview),
  async background(viewer,active){
    $('skybox-select').disabled=active;
    await viewer.skybox?.select(active?'none':$('skybox-select').value);
  }});
for (const button of document.querySelectorAll('[data-settings-tab]')) {
  button.addEventListener('click', () => selectSettingsTab(button.dataset.settingsTab));
  button.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-settings-tab]')].filter(b=>!b.hidden), index = tabs.indexOf(button);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next == null) return;
    event.preventDefault();selectSettingsTab(tabs[next].dataset.settingsTab);tabs[next].focus();
  });
}

function renderVariants() {
  const hull = hullKey(currentItem?.dna);
  if (variantState.hull !== hull) variantState = { hull, open: false, groups: null, status: '' };
  const { open, groups, status } = variantState;
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
  list.innerHTML = (groups || []).map(group => {
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
  if (!snapshot.open || snapshot.groups) { renderVariants(); return; }
  snapshot.status = 'hullVariantsLoading';
  renderVariants();
  try {
    const groups = await catalogLoader.variants(currentItem.dna);
    if (variantState !== snapshot) return;
    snapshot.groups = groups;
    snapshot.status = groups.length ? '' : 'hullVariantsEmpty';
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
  if (viewer.equipmentPreview) {
    const name = viewer.animationName;
    viewer.pause();
    void viewer.updateComplete.then(() => {
      if (viewer.isConnected && viewer.animationName === name) viewer.currentTime = Math.max(0, viewer.duration - .001);
    });
    return;
  }
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
      <div class="card-info"><div class="card-title-row"><span class="card-title">${esc(localizedName(item.name))}</span>${item.available ? '<span class="card-arrow" aria-hidden="true">↗</span>' : `<span class="unavailable-label">${t('unavailable')}</span>`}</div><div class="card-bottom"><span class="card-race">${raceMark(item.affiliationID)}<span class="card-race-name" title="${esc(raceName(item.affiliationID))}">${esc(raceName(item.affiliationID))}</span></span><span class="card-id">ID ${item.id}</span></div></div>
    </${tag}>`;
}

function readRoute() {
  catalog.readRoute(location.hash);
  $('search').value = catalog.state.query;
  $('sort').value = catalog.state.sort;
}

function saveRoute(replace = false) {
  history[replace ? 'replaceState' : 'pushState'](null, '', catalog.route());
}

function changeCatalog(values, replace = false) {
  catalog.update(values);
  saveRoute(replace);
  render();
}

function selectGroup(id) {
  catalog.selectGroup(id);
  $('sort').value = catalog.state.sort;
  $('search').value = '';
  saveRoute();
  render();
  closeMenu();
  $('card-scroll').scrollTop = 0;
}

const treeAnimations = new WeakMap();
function setTreeExpanded(details, expanded) {
  const previous = treeAnimations.get(details);
  if ((previous?.expanded ?? details.open) === expanded) return;
  const groups = details.querySelector('.tree-groups');
  const height = details.open ? groups.getBoundingClientRect().height : 0;
  const opacity = details.open ? getComputedStyle(groups).opacity : 0;
  const margin = details.open ? getComputedStyle(groups).marginBottom : '0px';
  previous?.animation.cancel();
  treeAnimations.delete(details);
  if (!expanded && groups.contains(document.activeElement)) details.querySelector('summary').focus();
  groups.inert = !expanded;
  details.querySelector('summary').setAttribute('aria-expanded', String(expanded));
  const finish = () => {
    details.open = expanded;
    delete details.dataset.treeExpanded;
    treeAnimations.delete(details);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !groups.animate) {
    finish();
    return;
  }
  // Keep native details open until the closing animation finishes. Measure
  // the current frame before cancelling so a second click reverses smoothly.
  details.open = true;
  const targetHeight = groups.getBoundingClientRect().height;
  const targetMargin = getComputedStyle(groups).marginBottom;
  details.dataset.treeExpanded = String(expanded);
  const animation = groups.animate([
    { height: `${height}px`, opacity, marginBottom: margin },
    { height: expanded ? `${targetHeight}px` : '0px', opacity: expanded ? 1 : 0, marginBottom: expanded ? targetMargin : '0px' },
  ], { duration: 240, easing: 'cubic-bezier(.2, .7, .2, 1)' });
  treeAnimations.set(details, { animation, expanded });
  animation.onfinish = finish;
}
function treeIcon(id) {
  return `<span class="tree-icon" aria-hidden="true">${icon('ship')}${id == null ? '' : `<img data-tree-icon="${id}" alt="" width="24" height="24" loading="lazy" decoding="async">`}</span>`;
}
function updateTreeIcons() {
  for (const image of $('catalog-tree').querySelectorAll('[data-tree-icon]')) {
    const id = image.dataset.treeIcon;
    const url = `https://images.evetech.net/types/${id}/icon?size=64`;
    if (image.getAttribute('src') === url) continue;
    image.onload = () => { image.dataset.loaded = 'true'; };
    image.onerror = () => { delete image.dataset.loaded; };
    image.src = url;
  }
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
  $('catalog-tree').innerHTML = `<button class="group-link all-models-link" data-group="-1">${treeIcon(data.iconTypeID)}<span class="tree-label">${esc(t('allModels'))}</span><span class="tree-count">${fmt(ready)}/${fmt(total)}</span></button>` + visibleCategories
    .map(
      (
        cat,
      ) => `<details class="tree-category" data-category="${cat.id}" ${openCategories.has(cat.id) ? 'open' : ''}>
    <summary>${icon('chevron')}${treeIcon(cat.iconTypeID)}<span class="tree-label">${esc(localizedName(cat.name))}</span><span class="tree-count">${fmt(cat.groups.reduce((sum, g) => sum + (readyByGroup.get(g.id) || 0), 0))}/${fmt(cat.count)}</span></summary>
    <div class="tree-groups">${[...cat.groups]
      .sort((a, b) => (readyByGroup.get(b.id) || 0) - (readyByGroup.get(a.id) || 0))
      .map(
        (g) =>
          `<button class="group-link" data-group="${g.id}" title="${esc(localizedName(g.name))} · ${esc(t('items', { count: fmt(g.count) }))}">${treeIcon(g.iconTypeID)}<span class="tree-label">${esc(localizedName(g.name))}</span>${readyByGroup.has(g.id) ? `<span class="group-ready" title="${t('ready')}"></span>` : ''}<span class="tree-count">${fmt(readyByGroup.get(g.id) || 0)}/${fmt(g.count)}</span></button>`,
      )
      .join('')}</div>
  </details>`,
    )
    .join('');
  $('catalog-tree').scrollTop = treeScroll;
  updateTreeIcons();
}

const cardGrid = createCardGrid({
  container:$('cards'), scroller:$('card-scroll'),
  renderItem:cardHTML, prepareImages:prepareRenderImages,
});

async function render() {
  const revision = ++renderRevision;
  cardGrid.clear();
  const group = catalog.state.group === -1 ? null : groupsByID.get(catalog.state.group),
    cat = group?.category;
  for (const button of document.querySelectorAll('.group-link')) {
    const active = Number(button.dataset.group) === catalog.state.group;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (revealedGroup !== catalog.state.group) {
    const details = cat && document.querySelector(`[data-category="${cat.id}"]`);
    if (details) setTreeExpanded(details, true);
    revealedGroup = catalog.state.group;
  }
  $('main').classList.toggle('all-models', catalog.state.group === -1);
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
    const items = await (catalog.state.query || catalog.state.group === -1 ? catalogLoader.search() : catalogLoader.group(catalog.state.group));
    if (revision !== renderRevision) return;
    data.items = items;
  } catch (error) {
    if (revision === renderRevision) {
      renderCatalogError();
      $('cards').removeAttribute('aria-busy');
    }
    console.error(error);
    return;
  }
  $('cards').removeAttribute('aria-busy');
  const result = catalog.project(data.items);
  const title = catalog.state.query ? t('search') : catalog.state.group === -1 ? t('allModels') : localizedName(group.name);
  $('page-title').textContent = title;
  $('breadcrumb').innerHTML =
    `<span>${esc(cat ? localizedName(cat.name) : t('catalog'))}</span>${icon('chevron')}<strong>${esc(title)}</strong>`;
  document.title = `${title} · ${t('app')}`;
  $('ready-badge').textContent = fmt(result.readyCount);
  $('scope-ready').classList.toggle('active', catalog.state.scope === 'ready');
  $('scope-all').classList.toggle('active', catalog.state.scope === 'all');
  $('scope-ready').setAttribute('aria-pressed', catalog.state.scope === 'ready');
  $('scope-all').setAttribute('aria-pressed', catalog.state.scope === 'all');
  const {raceCounts} = result;
  $('race-filters').innerHTML = [
    { id: 0 },
    ...data.races.filter((r) => r.id === catalog.state.race || raceCounts.has(r.id)),
  ]
    .map(
      (r) =>
        `<button data-race="${r.id}" class="${catalog.state.race === r.id ? 'active' : ''}" aria-pressed="${catalog.state.race === r.id}">${r.id ? raceMark(r.id) : ''}<span class="filter-label">${esc(r.id ? localizedName(r) : t('allRaces'))}</span><span class="filter-count">${fmt(raceCounts.get(r.id) || 0)}</span></button>`,
    )
    .join('');
  filtered = result.items;
  $('results-count').textContent = t('items', { count: fmt(filtered.length) });
  cardGrid.setItems(filtered);
  $('empty-state').hidden = filtered.length !== 0;
  if (!filtered.length) {
    const {uncollected} = result;
    $('empty-title').textContent = t(uncollected ? 'empty' : 'noMatches');
    $('empty-description').textContent = uncollected
      ? t('items', { count: fmt(group.count) })
      : t('searchHelp');
    $('empty-action').textContent = t(uncollected ? 'browse' : 'clear');
    $('empty-action').dataset.mode = uncollected ? 'all' : 'clear';
  }
}

async function installSkybox(viewer, module) {
  if (viewing.viewer !== viewer) return;
  const select = $('skybox-select'), status = $('skybox-status');
  select.disabled = true; select.onchange = null; status.hidden = true;
  select.replaceChildren(new Option(t('skyboxNone'), 'none'));
  viewer.backgroundLoading = true;
  try {
    const catalog = await viewer.assetSession.json('data/backgrounds.json');
    if (viewing.viewer !== viewer) return;
    if (!catalog.scenes.length) throw new Error('Empty skybox catalog');
    select.append(new Option(t('skyboxAuto'), 'auto'));
    for (const entry of catalog.scenes) select.append(new Option(entry.label, entry.id));
    let saved = 'auto';
    try { saved = localStorage.getItem('viewer.skybox') || 'auto'; } catch {}
    select.value = [...select.options].some(o => o.value === saved) ? saved : 'auto';
    viewer.lifecycle.set('skybox', module.createSkybox(viewer, catalog, viewer.previewRace));
    select.disabled = false;
    let change = 0;
    const apply = async () => {
      const token = ++change;
      status.hidden = true;
      viewer.backgroundLoading = !viewer.skybox.isReady(select.value);
      const entry = module.selectedBackground(catalog, viewer.previewRace, select.value);
      loading.background(entry ? [entry.url,entry.stars].filter(Boolean).map(resourceURL) : []);
      try {
        await viewer.skybox.select(viewer.hangarActive?'none':select.value);
        if (viewing.viewer !== viewer || token !== change) return;
        try { localStorage.setItem('viewer.skybox', select.value); } catch {}
        status.hidden = true;
      } catch {
        if (viewing.viewer === viewer && token === change) { status.hidden = false; status.textContent = t('skyboxError'); }
      } finally {
        if (viewing.viewer === viewer && token === change) {
          viewer.backgroundLoading = false;
          loading.backgroundSettled();
        }
      }
    };
    select.onchange = apply;
    await apply();
  } catch {
    if (viewing.viewer === viewer) {
      viewer.backgroundLoading = false;
      status.hidden = false; status.textContent = t('skyboxMissing');
      loading.backgroundSettled();
    }
  }
}

let exportBusy = false;
function syncExportButtons() {
  for (const id of ['export-glb', 'export-obj']) $(id).disabled = exportBusy || !viewing.canExport;
}
async function exportCurrentModel(format) {
  const viewer = viewing.viewer, item = viewing.readyItem;
  if (exportBusy || !viewing.canExport || !item) return;
  exportBusy = true;
  syncExportButtons();
  const status = $('export-status');
  status.hidden = false;
  status.textContent = t('exporting', {format:format.toUpperCase()});
  try {
    // Let the busy state paint before collecting the geometry.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (viewer !== viewing.viewer || item !== viewing.readyItem || !viewing.canExport) return;
    const result = await viewing.exportModel(format);
    const name = `${item.id}-${localizedName(item.name) || 'model'}${item.subsystemSelection ? '-' + item.subsystemSelection : ''}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    const url = URL.createObjectURL(result.blob), link = document.createElement('a');
    link.href = url; link.download = `${name}.${format}`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (viewer === viewing.viewer) status.textContent = t(format === 'glb' ? 'exportGlbDone' : 'exportObjDone', {count:result.skipped});
  } catch (error) {
    console.error('Model export failed', error);
    if (viewer === viewing.viewer) status.textContent = t('exportFailed');
  } finally {
    exportBusy = false;
    syncExportButtons();
  }
}

function modelError(key) {
  syncExportButtons();
  loading.finish(true);
  $('viewer-error').hidden = false;
  $('viewer-error-text').dataset.i18n = key;
  $('viewer-error-text').textContent = t(key);
}

function detailList() {
  const ready = filtered.filter((i) => i.available);
  return ready.some((i) => i.id === currentItem?.id)
    ? ready
    : data.items.filter((i) => i.available);
}

async function openItem(id, route = true) {
  const revision = ++detailRevision;
  viewing.cancel();
  loading.begin();
  // Give feedback in the click's own task, before waiting for the metadata shard.
  const preview = catalogLoader.peek(id);
  if (!$('model-dialog').open) lastFocus = document.activeElement;
  currentItem = { ...preview, id, detailPending: true };
  catalog.update({item:id});
  if (route) saveRoute();
  renderDetail();
  $('viewer-error').hidden = true;
  $('viewer-loading').hidden = false;
  syncExportButtons();
  if (!$('model-dialog').open) {
    $('model-dialog').showModal();
    document.body.style.overflow = 'hidden';
  }
  let item;
  try {
    item = await catalogLoader.item(id, catalog.state.group);
    if (isStrategicCruiser(item)) {
      let parts = [];
      try { parts = (await Promise.all(subsystemGroups.map(group => catalogLoader.group(group)))).flat(); }
      catch (error) { console.warn('Subsystem metadata unavailable; using the default hull', error); }
      item = withSubsystems(item, parts);
    }
  }
  catch (error) {
    if (revision === detailRevision && $('model-dialog').open) modelError('errorItemData');
    console.error(error);
    return;
  }
  if (revision !== detailRevision || !$('model-dialog').open) return;
  if (!item?.available) { closeDetail(false); return; }
  if (!catalog.state.query && catalog.state.group !== -1 && catalog.state.group !== item.groupID) {
    catalog.update({group:item.groupID, race:0});
    await render();
    if (revision !== detailRevision) return;
  }
  subsystemBaseItem = item;
  currentItem = subsystemItem(item, subsystemSelections.get(item.id), location.href);
  catalog.update({item:id});
  if (route) saveRoute();
  renderDetail();
  viewing.show(currentItem);
}

function renderDetail() {
  if (!currentItem) return;
  $('tab-subsystems').hidden=currentItem.groupID!==963;
  $('tab-hangar').hidden=!supportsHangar(currentItem);
  if ($('tab-'+settingsTab).hidden) selectSettingsTab('visual');
  renderVariants();
  renderSubsystems();
  const item = currentItem;
  $('detail-title').textContent = localizedName(item.name) || `ID ${item.id}`;
  $('skybox-select').closest('label').hidden = item.renderKind === 'equipment';
  if (item.renderKind === 'equipment') $('skybox-status').hidden = true;
  $('stage-title').textContent = $('detail-title').textContent;
  $('stage-subtitle').textContent = item.name?.en || '';
  $('stage-subtitle').hidden = !item.name?.en || item.name.en === $('stage-title').textContent;
  $('detail-dna').textContent = item.dna ? `DNA: ${item.dna}` : '';
  $('detail-dna').title = item.dna || '';
  $('detail-dna').hidden = !item.dna;
  $('detail-group').textContent = localizedName(groupsByID.get(item.groupID)?.name);
  const factionVariant = [4, 52].includes(Number(item.metaGroupID));
  $('detail-tech').hidden = !factionVariant && !item.techLevel;
  $('detail-tech').textContent = factionVariant ? (locale.startsWith('zh') ? '势力' : 'Faction') : `T${item.techLevel}`;
  $('detail-race').innerHTML = `${raceMark(item.affiliationID)}${esc(raceName(item.affiliationID))}`;
  $('detail-id').textContent = item.id;
  renderDimensions(itemDimensions.get(item));
  $('detail-triangles').textContent = item.triangles == null ? '—' : fmt(item.triangles);
  const omissions = [];
  if (item.warnings?.some(w => w.startsWith('未显示残骸烟雾/碎屑粒子'))) omissions.push(t('missingParticles'));
  if (item.warnings?.some(w => w.startsWith('缺少发光贴图'))) omissions.push(t('missingGlow'));
  if (item.warnings?.includes('部分星门特效尚未适配')) omissions.push(t('missingGateEffects'));
  $('detail-warnings').textContent = omissions.join(' ');
  $('detail-warnings').hidden = !omissions.length;
  $('detail-size').textContent =
    item.subsystemParts ? t('subsystemResources', {count:item.subsystemParts.length})
      : item.modelBytes == null ? '—' : `${((item.modelBytes + (item.effectsBytes || 0)) / 1024 / 1024).toFixed(1)} MB`;
  const list = detailList(),
    index = list.findIndex((i) => i.id === item.id);
  $('detail-position').textContent = `${index + 1} / ${list.length}`;
  $('previous-ship').disabled = index <= 0;
  $('next-ship').disabled = index >= list.length - 1;
  viewing.viewer?.setAttribute('alt', t('modelAlt', { name: localizedName(item.name) }));
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
  loading.finish(true);
  if ($('model-dialog').open) {
    suppressedClose = true;
    $('model-dialog').close();
  }
  viewing.close();
  currentItem = null;
  subsystemBaseItem = null;
  variantState = { hull: '', open: false, groups: null, status: '' };
  catalog.update({item:0});
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
  viewerSettings.bind();
  $('catalog-tree').addEventListener('click', (event) => {
    const summary = event.target.closest('.tree-category > summary');
    if (summary) {
      event.preventDefault();
      const details = summary.parentElement;
      setTreeExpanded(details, !(treeAnimations.get(details)?.expanded ?? details.open));
      return;
    }
    const button = event.target.closest('[data-group]');
    if (button) selectGroup(Number(button.dataset.group));
  });
  $('cards').addEventListener('click', (event) => {
    const card = event.target.closest('[data-item]');
    if (card) openItem(Number(card.dataset.item));
  });
  $('race-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-race]');
    if (button) {
      changeCatalog({race:Number(button.dataset.race)});
    }
  });
  for (const scope of ['ready', 'all'])
    $(`scope-${scope}`).addEventListener('click', () => {
      changeCatalog({scope});
    });
  $('search').addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      changeCatalog({query:$('search').value.trim()}, true);
    }, 150);
  });
  $('sort').addEventListener('change', () => {
    changeCatalog({sort:$('sort').value});
  });
  $('empty-action').addEventListener('click', () => {
    const values = $('empty-action').dataset.mode === 'all' ? {scope:'all'} : {race:0, query:''};
    if ('query' in values) $('search').value = '';
    changeCatalog(values);
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
    closeDetail();
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
  $('subsystem-options').addEventListener('change', event => {
    const slot = event.target.dataset.subsystemSlot;
    if (slot == null || !currentItem?.subsystemSelection) return;
    const code = [...currentItem.subsystemSelection];
    code[Number(slot)] = event.target.value;
    changeSubsystems(code.join(''));
  });
  $('reset-subsystems').addEventListener('click', () => changeSubsystems(subsystemBaseItem?.subsystems?.default));
  $('show-subsystem-labels').addEventListener('click', () => viewing.viewer?.disposeSubsystemLabels?.show?.());
  $('hull-variants-list').addEventListener('click', event => {
    const card = event.target.closest('[data-variant]');
    if (card && !card.disabled && Number(card.dataset.variant) !== currentItem?.id) openItem(Number(card.dataset.variant));
  });
  $('next-ship').addEventListener('click', () => moveShip(1));
  $('retry-model').addEventListener('click', () => {
    if (currentItem?.detailPending) openItem(currentItem.id, false);
    else if (currentItem) viewing.show(currentItem);
  });
  $('gate-state').addEventListener('change', () => viewing.viewer?.shipEffects?.gate?.setState($('gate-state').value));
  $('gate-arrival').addEventListener('click', () => viewing.viewer?.shipEffects?.gate?.trigger('arrival'));
  $('gate-departure').addEventListener('click', () => viewing.viewer?.shipEffects?.gate?.trigger('departure'));
  $('hull-animation').addEventListener('change', () => {
    if (viewing.viewer) {
      viewing.viewer.animationName = $('hull-animation').value;
      viewing.viewer.currentTime = 0;
      playHullAnimation(viewing.viewer);
    }
  });
  const resetCurrentView = () => { if (viewing.viewer?.hangar?.active) viewing.viewer.hangar.reset(); else if (viewing.viewer) resetView(viewing.viewer); };
  $('reset-view').addEventListener('click', resetCurrentView);
  $('export-glb').addEventListener('click', () => exportCurrentModel('glb'));
  $('export-obj').addEventListener('click', () => exportCurrentModel('obj'));
  $('stage-reset-view').addEventListener('click', resetCurrentView);
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
    if (catalog.state.item) openItem(catalog.state.item, false);
    else closeDetail(false);
  });
}

applyTranslations();
for (const select of document.querySelectorAll('[data-language]')) {
  select.addEventListener('change', () => {
    setLocale(select.value);
    renderPublicationDate();
    renderSponsor();
    loading.refresh();
    if (data) {
      buildTree();
      render();
      renderDetail();
      fittingPanel.render();
      hangarPanel.render();
    } else renderCatalogError();
  });
}

function renderCatalogError() {
  cardGrid.clear();
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
    configureResourceBase(config.resourceBaseURL, config.backgroundBaseURL, config.backgroundFiles);
    const [index, identities, fallbackIndex] = await Promise.all([
      loadJSON(resourceURL('./data/catalog-index.json'), {cache:'no-cache'}),
      loadJSON('./icons/identities.json?v=a697e41514d32632'),
      loadJSON(resourceURL('./assets/renders/index.json'), {cache:'no-cache'}, {optional:true}).catch(() => ({})),
    ]);
    data = index;
    renderFallbacks = fallbackIndex.items || {};
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
    });
    data.items = [];
    racesByID = new Map(data.races.map((r) => [r.id, r]));
    groupsByID = new Map(
      data.categories.flatMap((c) => c.groups.map((g) => [g.id, { ...g, category: c }])),
    );
    readRoute();
    buildTree();
    setupEvents();
    await render();
    if (catalog.state.item) openItem(catalog.state.item, false);
  } catch (error) {
    renderCatalogError();
    console.error(error);
  }
}
init();





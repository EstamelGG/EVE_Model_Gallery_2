import { guideText } from './viewer-guide-copy.mjs?v=1e7c07f20b13802d';
import {
  siteLocale,
  browserLocale,
  languagePreference,
  saveLanguagePreference,
  languageStorageKey,
} from './locale.mjs?v=1e7c07f20b13802d';

const $ = (id) => document.getElementById(id);
let preference = languagePreference(),
  locale = siteLocale(),
  currentCase = 'minimal',
  previewState = { kind: 'initial' },
  viewer,
  resourceBase,
  caseRevision = 0,
  toastTimer;
const t = (key, values) => guideText(locale, key, values);
const caseTitle = (example) => t(`case.${example.id}.title`);
const caseDescription = (example) => t(`case.${example.id}.description`);
const codeSources = new Map();
const localizedCode = (value) => value.replaceAll('lang="en"', `lang="${locale}"`);
function updateStatus() {
  const { kind, phase, total, result, error } = previewState;
  $('preview-status').textContent =
    kind === 'progress'
      ? t('statusProgress', { phase, total })
      : kind === 'loaded'
        ? t('statusLoaded', { itemId: result.itemId, count: result.placements.length })
        : kind === 'error'
          ? t('statusError', { error })
          : kind === 'applying'
            ? t('statusApplying')
            : t('statusInitial', { itemId: baseline.itemId });
}
function status(kind, data = {}) {
  previewState = { kind, ...data };
  updateStatus();
}
function applyLanguage() {
  document.documentElement.lang = locale;
  for (const node of document.querySelectorAll('[data-guide-i18n]'))
    node.innerHTML = t(node.dataset.guideI18n);
  for (const attribute of ['aria-label', 'content'])
    for (const node of document.querySelectorAll(`[data-guide-i18n-${attribute}]`))
      node.setAttribute(attribute, t(node.getAttribute(`data-guide-i18n-${attribute}`)));
  $('guide-language').value = preference;
  for (const example of cases) {
    const card = $('example-' + example.id);
    if (!card) continue;
    card.querySelector('h3').textContent = caseTitle(example);
    card.querySelector('p').textContent = caseDescription(example);
    card.querySelector('[data-run]').textContent = t('runExample');
    card.querySelector('[data-copy]').textContent = t('copy');
  }
  for (const code of document.querySelectorAll('pre>code')) {
    if (!codeSources.has(code.id)) codeSources.set(code.id, code.textContent);
    code.textContent = localizedCode(codeSources.get(code.id));
  }
  $('case-name').textContent = caseTitle(cases.find((example) => example.id === currentCase));
  viewer?.setAttribute('lang', locale);
  updateStatus();
}

const baseline = {
  itemId: 587,
  background: 'none',
  controlPanel: false,
  whiteModel: false,
  effects: true,
  autoRotate: false,
  showHardpoints: false,
  hangar: { room: '' },
  killCount: 0,
  render: {
    exposure: 0.7,
    reflection: 0.7,
    bloom: 0.2,
    sun: 1,
    fill: 1,
    f0: 1,
    roughness: 1,
    dirt: 1,
    depthOfField: 1,
  },
  display: {
    antialiasMode: 'auto',
    occlusion: true,
    bloom: true,
    depthOfField: false,
    textures: {},
  },
  equipment: [],
};
const cases = [
  {
    id: 'hangar',
    options: { hangar: { room: 'amarr' }, controlPanel: true },
    code: `<eve-model-viewer
  item-id="587"
  hangar="amarr"
  control-panel
  style="height:600px">
</eve-model-viewer>`,
  },
  {
    id: 'minimal',
    options: {},
    code: `<eve-model-viewer
  item-id="587"
  background="none"
  style="height:500px">
</eve-model-viewer>`,
  },
  {
    id: 'controls',
    options: { controlPanel: true },
    code: `<eve-model-viewer
  item-id="587"
  background="none"
  control-panel
  style="height:600px">
</eve-model-viewer>`,
  },
  {
    id: 'background',
    options: { background: 'auto', autoRotate: true },
    code: `<eve-model-viewer
  item-id="587"
  background="auto"
  auto-rotate
  style="height:500px">
</eve-model-viewer>`,
  },
  {
    id: 'white',
    options: { whiteModel: true, controlPanel: true },
    code: `<eve-model-viewer
  item-id="587"
  background="none"
  white-model
  control-panel
  style="height:600px">
</eve-model-viewer>`,
  },
  {
    id: 'quality',
    options: { render: { reflection: 0.3 }, display: { antialiasMode: 'smaa' } },
    code: `<eve-model-viewer
  item-id="587"
  background="none"
  reflection="0.3"
  antialias="smaa"
  style="height:500px">
</eve-model-viewer>`,
  },
  {
    id: 'turrets',
    options: { equipment: [484, 484] },
    code: `<eve-model-viewer
  item-id="587"
  equipment="[484,484]"
  background="none"
  style="height:500px">
</eve-model-viewer>`,
  },
  {
    id: 'launchers',
    options: { itemId: 12032, equipment: [503, 503] },
    code: `<eve-model-viewer
  item-id="12032"
  equipment="[503,503]"
  background="none"
  style="height:500px">
</eve-model-viewer>`,
  },
];
for (const [index, example] of cases.entries()) {
  const card = document.createElement('article');
  card.className = 'example-card';
  card.id = 'example-' + example.id;
  const heading = document.createElement('div');
  heading.className = 'example-heading';
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  const run = document.createElement('button');
  run.type = 'button';
  run.dataset.run = example.id;
  run.textContent = t('runExample');
  run.onclick = () => runCase(example.id, true);
  heading.append(number, run);
  const title = document.createElement('h3');
  title.textContent = caseTitle(example);
  const description = document.createElement('p');
  description.textContent = caseDescription(example);
  const block = document.createElement('div');
  block.className = 'code-block';
  const bar = document.createElement('div');
  bar.className = 'code-heading';
  const language = document.createElement('span');
  language.textContent = 'HTML';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'text-button';
  copy.dataset.copy = 'code-' + example.id;
  copy.textContent = t('copy');
  bar.append(language, copy);
  const pre = document.createElement('pre'),
    code = document.createElement('code');
  code.id = 'code-' + example.id;
  code.textContent = example.code;
  pre.append(code);
  block.append(bar, pre);
  card.append(heading, title, description, block);
  $('example-list').append(card);
}

function message(text) {
  $('copy-status').textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('copy-status').textContent = ''), 2800);
}
async function initialize() {
  await import('./eve-model-viewer.js?v=1e7c07f20b13802d');
  // The documentation uses the site's resource configuration for local previews.
  // Copied examples and the component itself keep the production CDN default.
  try {
    const response = await fetch('./site-config.json');
    if (response.ok) resourceBase = (await response.json()).resourceBaseURL;
  } catch {}
  viewer = document.createElement('eve-model-viewer');
  viewer.setAttribute('item-id', '587');
  viewer.setAttribute('background', 'none');
  viewer.setAttribute('lang', locale);
  if (resourceBase) viewer.setAttribute('resource-base', resourceBase);
  viewer.addEventListener('progress', ({ detail }) => status('progress', detail));
  viewer.addEventListener('error', ({ detail }) => {
    status('error', { error: detail.message });
    $('preview-status').dataset.error = 'true';
  });
  $('preview-mount').replaceChildren(viewer);
  document
    .querySelector('#preview-reset svg')
    .replaceWith(viewer.shadowRoot.querySelector('#reset svg').cloneNode(true));
  await Promise.resolve();
  await runCase('minimal');
}
async function runCase(id, scroll = false) {
  const example = cases.find((value) => value.id === id);
  if (!example || !viewer) return;
  const token = ++caseRevision;
  const options = {
    ...structuredClone(baseline),
    ...structuredClone(example.options),
    resourceBase,
    render: { ...baseline.render, ...example.options.render },
    display: { ...baseline.display, ...example.options.display },
  };
  currentCase = id;
  $('case-name').textContent = caseTitle(example);
  status('applying');
  delete $('preview-status').dataset.error;
  $('placement-details').hidden = true;
  $('placement-details').open = false;
  $('preview-mounts').hidden = true;
  $('preview-mounts').setAttribute('aria-pressed', 'false');
  for (const card of document.querySelectorAll('.example-card'))
    card.classList.toggle('active', card.id === 'example-' + id);
  for (const button of document.querySelectorAll('[data-run]'))
    button.setAttribute('aria-pressed', String(button.dataset.run === id));
  if (scroll)
    document.querySelector('.playground').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  try {
    const result = await viewer.configure(options);
    if (token !== caseRevision) return;
    status('loaded', { result });
    $('preview-mounts').hidden = !result.placements.length;
    $('placement-details').hidden = !result.placements.length;
    $('placement-output').textContent = JSON.stringify(result.placements, null, 2);
  } catch (error) {
    if (token === caseRevision && error.name !== 'AbortError') {
      status('error', { error: error.message });
      $('preview-status').dataset.error = 'true';
    }
  }
}
$('preview-reset').onclick = () => viewer?.resetView();
$('preview-mounts').onclick = async () => {
  const button = $('preview-mounts'),
    showHardpoints = button.getAttribute('aria-pressed') !== 'true';
  button.disabled = true;
  try {
    await viewer.configure({ showHardpoints });
    button.setAttribute('aria-pressed', String(showHardpoints));
  } catch (error) {
    if (error.name !== 'AbortError') message(error.message);
  } finally {
    button.disabled = false;
  }
};
document.addEventListener('click', async (event) => {
  const copy = event.target.closest('[data-copy]'),
    download = event.target.closest('[data-download]');
  if (copy) {
    try {
      await navigator.clipboard.writeText($(copy.dataset.copy).textContent);
      message(t('codeCopied'));
    } catch {
      message(t('clipboardUnavailable'));
    }
  }
  if (download) {
    const blob = new Blob([$(download.dataset.download).textContent], {
        type: 'text/html;charset=utf-8',
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'eve-model-demo.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    for (const link of document.querySelectorAll('.docs-nav>a')) {
      if (link.hash === '#' + visible.target.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  },
  { rootMargin: '-15% 0px -65% 0px', threshold: 0 },
);
for (const section of document.querySelectorAll('main>section[id]')) observer.observe(section);
$('guide-language').onchange = () => {
  preference = $('guide-language').value;
  saveLanguagePreference(preference);
  locale = preference === 'auto' ? browserLocale() : preference;
  applyLanguage();
};
window.addEventListener('storage', (event) => {
  if (event.key === languageStorageKey || event.key === null) {
    preference = languagePreference();
    locale = siteLocale();
    applyLanguage();
  }
});
window.addEventListener('languagechange', () => {
  if (preference === 'auto') {
    preference = languagePreference();
    locale = siteLocale();
    applyLanguage();
  }
});
applyLanguage();
initialize().catch((error) => status('error', { error: error.message }));

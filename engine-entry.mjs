import {selectedEngine, engineHash} from './engine-route.mjs?v=457dcd84994eec7c06c6';

export async function prepareCatalogEngine() {
  const engine = selectedEngine(location.hash);
  document.documentElement.dataset.engine = engine;
  if (engine === 'web') {
    await import('./eve-model-viewer.js?v=6cfcc1c6346752ef');
    return engine;
  }
  const response = await fetch(new URL('./unity-release.json', import.meta.url), {cache:'no-cache'});
  if (!response.ok) throw new Error(`Unity release: ${response.status}`);
  const release = await response.json();
  for (const key of ['module', 'engineBase']) {
    const url = new URL(release[key]);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid Unity release URL');
  }
  await import(release.module);
  await customElements.whenDefined('eve-model-viewer-unity');
  const original = document.getElementById('catalog-viewer');
  const viewer = document.createElement('eve-model-viewer-unity');
  for (const attribute of original.attributes) viewer.setAttribute(attribute.name, attribute.value);
  viewer.setAttribute('engine-base', release.engineBase);
  // Preserve the host's details/navigation slots and their IDs before app.js
  // installs any listeners. UI and catalog interactions remain in the host.
  viewer.append(...original.childNodes);
  original.replaceWith(viewer);
  for (const link of document.querySelectorAll('a[href^="#group="]')) link.setAttribute('href', engineHash(link.getAttribute('href'), engine));
  document.title += ' · Unity';
  return engine;
}

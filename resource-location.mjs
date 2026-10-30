// Shared by the app and the separately bundled viewer. Only resource URLs use
// this base; application modules, icons and styles remain on the website.
export function configureResourceBase(value = '') {
  const text = String(value).trim();
  if (!text) { globalThis.__eveResourceBase = ''; return; }
  const url = new URL(text);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('Invalid resource base URL');
  url.pathname = url.pathname.replace(/\/?$/, '/');
  globalThis.__eveResourceBase = url.href;
}

export function resourceURL(value) {
  if (!value || !globalThis.__eveResourceBase || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return value;
  return new URL(value.replace(/^\.?\//, ''), globalThis.__eveResourceBase).href;
}

const preparedImages = new WeakSet();

export function prepareRenderImages(root) {
  for (const image of root.querySelectorAll('img[data-render]')) {
    if (preparedImages.has(image)) continue;
    preparedImages.add(image);
    const preview = image.closest('.render-preview');
    const settle = (state) => {
      preview.dataset.imageState = state;
      preview.setAttribute('aria-busy', 'false');
    };
    const failed = () => {
      if (image.dataset.icon) {
        const fallback = image.dataset.icon;
        delete image.dataset.icon;
        image.classList.add('official-icon');
        image.src = fallback;
      } else {
        settle('error');
        image.hidden = true;
      }
    };
    image.addEventListener('load', () => settle('ready'));
    image.addEventListener('error', failed);
    // Cached images can finish before the listeners were attached.
    if (image.complete) image.naturalWidth ? settle('ready') : failed();
  }
}

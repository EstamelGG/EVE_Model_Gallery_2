// Own the visible DOM window, measurement and scheduling for the catalog grid.
export function createCardGrid({container, scroller, renderItem, prepareImages}) {
  const probe = document.createElement('div'), template = document.createElement('template');
  probe.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const nodes = new Map();
  let items = [], layout = null, range = null, frame = 0, disposed = false;

  function measure() {
    const width = container.clientWidth;
    if (layout?.width === width) return layout;
    const style = getComputedStyle(container);
    range = null;
    const gap = parseFloat(style.getPropertyValue('--card-gap'));
    const min = parseFloat(style.getPropertyValue('--card-min'));
    const columns = Number(style.getPropertyValue('--card-cols')) || Math.max(1, Math.floor((width + gap) / (min + gap)));
    const columnWidth = Math.max(min, Math.floor((width - (columns - 1) * gap) / columns));
    probe.style.width = `${columnWidth}px`;
    probe.innerHTML = renderItem(items[0], 'width:100%');
    const rowHeight = Math.ceil(probe.firstElementChild.getBoundingClientRect().height);
    layout = {width, gap, columns, columnWidth, rowHeight};
    return layout;
  }

  function render() {
    if (disposed || !items.length || !container.clientWidth) return;
    const {gap, columns, columnWidth, rowHeight} = measure();
    const rowStep = rowHeight + gap, rows = Math.ceil(items.length / columns);
    container.style.height = `${rows * rowStep - gap}px`;
    const viewport = scroller.clientHeight, overscan = Math.max(viewport, rowStep) * 2;
    const start = Math.max(0, Math.floor((scroller.scrollTop - overscan) / rowStep)) * columns;
    const end = Math.min(items.length, (Math.ceil((scroller.scrollTop + viewport + overscan) / rowStep) + 1) * columns);
    if (range?.start === start && range.end === end) return;
    range = {start, end};
    // Retain overlapping cards and decoded images; evict offscreen cards even during momentum.
    for (const [index, node] of nodes) if (index < start || index >= end) {
      node.remove();
      nodes.delete(index);
    }
    let anchor = container.firstElementChild;
    for (let i = start; i < end; i++) {
      const style = `position:absolute;left:${((i % columns) * (columnWidth + gap)).toFixed(1)}px;top:${(Math.floor(i / columns) * rowStep).toFixed(1)}px;width:${columnWidth}px;height:${rowHeight}px`;
      let node = nodes.get(i);
      if (!node) {
        template.innerHTML = renderItem(items[i], style);
        node = template.content.firstElementChild;
        nodes.set(i, node);
        container.insertBefore(node, anchor);
        prepareImages(node);
      } else {
        if (node.getAttribute('style') !== style) node.setAttribute('style', style);
        anchor = node.nextElementSibling;
      }
    }
  }

  function schedule() {
    if (disposed || frame || !items.length) return;
    frame = requestAnimationFrame(() => {frame = 0; render();});
  }
  const observer = new ResizeObserver(() => {
    if (layout && (container.clientWidth !== layout.width ||
      Math.ceil(probe.firstElementChild.getBoundingClientRect().height) !== layout.rowHeight)) {
      layout = null;
      range = null;
    }
    schedule();
  });
  for (const element of [container, scroller, probe]) observer.observe(element);
  scroller.addEventListener('scroll', schedule, {passive:true});

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0; items = []; range = null;
    nodes.clear();
    container.replaceChildren();
    container.style.height = '';
  }
  return {
    clear,
    setItems(value) {
      if (disposed) return;
      clear();
      items = value;
      container.style.height = '0px';
      render();
    },
    dispose() {
      disposed = true;
      clear();
      layout = null;
      observer.disconnect();
      scroller.removeEventListener('scroll', schedule);
      probe.remove();
    },
  };
}

// Three permanent slots keep the progress/count anchors still as requests end.
export function createLoadingRows(root) {
  const slots = Array.from({ length: 3 }, () => {
    const row = document.createElement('li');
    const kind = document.createElement('span'), name = document.createElement('code');
    row.append(kind, name);
    row.style.opacity = '0';
    root.append(row);
    return { row, kind, name, key: '', desired: null, timer: null };
  });
  function paint(slot) {
    slot.timer = null;
    const item = slot.desired;
    slot.key = item?.url || '';
    slot.kind.textContent = item?.label || '';
    slot.name.textContent = item?.name || '';
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

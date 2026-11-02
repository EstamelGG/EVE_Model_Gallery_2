import {renderDefaults, normalizeRenderSettings, renderDefaultsForDNA, switchRenderDefaults} from './render-settings.mjs?v=6066d50d2fa0dfb8';
import {normalizeDisplaySettings, textureRoles, performanceControls} from './display-settings.mjs?v=6066d50d2fa0dfb8';
import {normalizeKillCount} from './kill-count.mjs?v=6066d50d2fa0dfb8';
import {cancelViewReset} from './view-reset.mjs?v=6066d50d2fa0dfb8';

// DOM controls own user choices; the runtime owns applying them to the scene.
// Cache the fixed controls once, and synchronize capabilities after each install.
export function createViewerSettings({root, runtime, currentDNA}) {
  const find = id => root.querySelector('#' + id);
  const ranges = Object.keys(renderDefaults).map(key => ({key, input:find(key), output:find(key+'-value')}));
  const textures = textureRoles.map(key => [key, find('texture-'+key)]);
  const performance = Object.entries(performanceControls).map(([key, id]) => [key, find(id)]);
  const allTextures = find('show-textures'), rotate = find('auto-rotate'), invert = find('invert-wheel');
  const killRange = find('kill-count'), killInput = find('kill-count-input'), killUnavailable = find('kill-count-unavailable');
  let previousDNA;
  const checked = entries => Object.fromEntries(entries.map(([key, input]) => [key, input.checked]));
  const render = () => normalizeRenderSettings(Object.fromEntries(ranges.map(({key,input}) => [key,input.value])));
  const display = () => normalizeDisplaySettings({...checked(performance), textures:checked(textures)});
  const save = (key, value) => { try { localStorage.setItem('viewer.'+key, value); } catch {} };

  function applyRender() {
    const values = render();
    for (const {key, output} of ranges) output.value = values[key].toFixed(1);
    runtime.applyRenderSettings(values);
  }
  function setRender(values) {
    for (const {key, input} of ranges) input.value = values[key];
    applyRender();
  }
  function sync() {
    const roles = runtime.viewer?.availableTextureRoles;
    for (const [role, input] of textures) input.disabled = !!roles && !roles.has(role);
    find('dirt').disabled=!!roles&&!roles.has('DirtMap');
    find('depthOfField').disabled=!find('show-dof').checked;
    const enabled = textures.map(([,input]) => input).filter(input => !input.disabled);
    allTextures.checked = enabled.every(input => input.checked);
    allTextures.indeterminate = enabled.some(input => input.checked) && !allTextures.checked;
    const hasKills = (runtime.viewer?.killMarkCount || 0) > 0;
    killRange.disabled = killInput.disabled = !hasKills;
    killUnavailable.hidden = hasKills;
  }
  function applyDisplay() {
    save('performance', JSON.stringify(checked(performance)));
    sync();
    runtime.applyDisplaySettings(display());
  }
  function setKills(value) {
    const count = normalizeKillCount(value);
    killRange.value = killInput.value = count;
    if (runtime.viewer) {
      runtime.viewer.killCount = count;
      runtime.viewer.setKillCount?.(count);
    }
    save('killCount', String(count));
  }
  return {
    read: () => ({render:render(), display:display(), killCount:normalizeKillCount(killRange.value), autoRotate:rotate.checked}),
    selectDefaults(dna) {
      const values = switchRenderDefaults(render(), previousDNA, dna);
      previousDNA = dna;
      setRender(values);
    },
    sync,
    connect(viewer) {
      // Retain native zoom limits while honoring the page's inversion option.
      let forwarding = false;
      viewer.lifecycle.listen(viewer.shadowRoot, 'wheel', event => {
        if (forwarding) return;
        event.preventDefault();event.stopImmediatePropagation();forwarding = true;
        try { viewer.zoom(((invert.checked ? -1 : 1)*event.deltaY*(event.deltaMode === 1 ? 18 : 1))/30); }
        finally { forwarding = false; }
      }, {capture:true, passive:false});
    },
    bind() {
      try {
        const saved = normalizeDisplaySettings(JSON.parse(localStorage.getItem('viewer.performance') || '{}') || {});
        for (const [key, input] of performance) input.checked = saved[key];
      } catch {}
      for (const [,input] of [...textures, ...performance]) input.addEventListener('change', applyDisplay);
      allTextures.addEventListener('change', () => {
        for (const [,input] of textures) input.checked = allTextures.checked;
        applyDisplay();
      });
      for (const {input} of ranges) input.addEventListener('input', applyRender);
      find('reset-render').addEventListener('click', () => {
        setRender(renderDefaultsForDNA(currentDNA()));
        for (const [,input] of textures) input.checked = true;
        const defaults=normalizeDisplaySettings();
        for(const [key,input] of performance)input.checked=defaults[key];
        applyDisplay();
      });
      rotate.checked = false;
      rotate.addEventListener('change', () => {
        if (runtime.viewer) { cancelViewReset(runtime.viewer); runtime.viewer.autoRotate = rotate.checked; }
      });
      try { invert.checked = localStorage.getItem('viewer.invertWheel') === 'true'; } catch {}
      invert.addEventListener('change', () => save('invertWheel', String(invert.checked)));
      try { setKills(localStorage.getItem('viewer.killCount') || 0); } catch { setKills(0); }
      killRange.addEventListener('input', event => setKills(event.target.value));
      killInput.addEventListener('input', event => {
        if (event.target.value !== '' && !event.target.validity.badInput) setKills(event.target.value);
      });
      killInput.addEventListener('change', event => setKills(event.target.value || killRange.value));
    },
  };
}

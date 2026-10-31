const messages = {
  app: ['EVE Model Viewer 2.0', 'EVE Model Viewer 2.0'],
  home: ['EVE Model Viewer 2.0 首页', 'EVE Model Viewer 2.0 home'],
  language: ['语言', 'Language'],
  developer: ['开发者', 'Developed by'],
  about: ['关于', 'About'],
  aboutLinks: ['关于与链接', 'About and links'],
  closeAbout: ['关闭关于', 'Close about'],
  webRepository: ['GitHub 网页仓库（新窗口）', 'GitHub website repository (new tab)'],
  viewWebRepository: ['在 GitHub 查看网页仓库 ↗', 'View website repository on GitHub ↗'],
  frontendPublished: ['前端发布时间', 'Frontend published'],
  localPreview: ['本地预览 · 尚未发布', 'Local preview · Not published'],
  copyrightTitle: ['版权与素材', 'Copyright and assets'],
  copyrightBody: ['EVE Online 及相关游戏模型、纹理、渲染图、物品与势力图标的版权归 CCP Games 所有。本网站由玩家开发，与 CCP Games 无隶属关系，也未经其背书。', 'EVE Online and its game models, textures, renders, item icons and faction icons belong to CCP Games. This is a fan-made website, not affiliated with or endorsed by CCP Games.'],
  iconCredits: ['物品渲染图与图标来自 EVE 官方图像服务，势力图标来自游戏资源；界面操作图标采用内嵌 SVG。', 'Item renders and icons come from the official EVE image service; faction icons come from game assets. Interface controls use inline SVG icons.'],
  sponsorTitle: ['支持这个项目', 'Support this project'],
  sponsorBody: ['如果这个网站对你有帮助，欢迎通过游戏内转账赞助开发。', 'If you find this website useful, you can support development with an in-game transfer.'],
  gameID: ['游戏 ID', 'Character name'],
  copyName: ['复制名称', 'Copy name'],
  nameCopied: ['名称已复制。', 'Name copied.'],
  copyNameFailed: ['复制失败，请选中名称手动复制。', 'Could not copy. Select the name and copy it manually.'],
  characterLoadFailed: ['人物信息加载失败，重新打开关于页面可重试。', 'Could not load character info. Reopen About to retry.'],
  sponsorThanks: ['感谢每一份支持。', 'Thank you for your support.'],
  catalog: ['目录', 'Catalog'],
  allModels: ['全部模型', 'All models'],
  openCatalog: ['打开目录', 'Open catalog'],
  categories: ['{count} 个目录', '{count} categories'],
  loading: ['加载中…', 'Loading…'],
  resourceCatalog: ['正在加载目录', 'Loading catalog'],
  resourceModel: ['正在加载模型', 'Loading model'],
  resourceTexture: ['正在加载贴图', 'Loading texture'],
  resourceData: ['正在加载资源', 'Loading resource'],
  renderUnavailable: ['渲染图暂不可用', 'Render unavailable'],
  errorItemData: ['物品数据加载失败，请重试。', 'Item data failed to load. Please retry.'],
  search: ['搜索结果', 'Search results'],
  filters: ['筛选与搜索', 'Filters and search'],
  scope: ['资源范围', 'Availability'],
  ready: ['已采集', 'Available'],
  all: ['全部目录', 'All items'],
  searchHint: ['搜索名称或编号', 'Search name or ID'],
  sort: ['排序', 'Sort'],
  raceSort: ['势力 · 名称', 'Affiliation · Name'],
  nameSort: ['名称', 'Name'],
  id: ['物品编号', 'Type ID'],
  allRaces: ['全部势力', 'All affiliations'],
  other: ['其他', 'Other'],
  items: ['{count} 个物品', '{count} items'],
  unavailable: ['未采集', 'Unavailable'],
  hullVariants: ['同船体型号', 'Hull variants'],
  hullVariantShared: ['相同外观的物品', 'Items with the same appearance'],
  hullVariantCount: ['同船体型号 · {count}', 'Hull variants · {count}'],
  hullVariantsLoading: ['正在查找同船体型号…', 'Finding hull variants…'],
  hullVariantsError: ['列表加载失败，收起后展开可重试。', 'Could not load variants. Close and reopen to retry.'],
  hullVariantsEmpty: ['没有其他同船体型号', 'No other hull variants'],
  hullVariantCurrent: ['当前选择', 'Current'],
  missingParticles: ['主体已显示；烟雾和碎屑粒子暂未显示。', 'Hull shown; smoke and debris particles are not displayed yet.'],
  missingGlow: ['客户端缺少部分发光贴图，对应区域暂不发光。', 'Some glow textures are missing from the client; those regions do not emit light.'],
  missingGateEffects: ['部分星门特效尚未适配。', 'Some stargate effects are not supported yet.'],
  empty: ['此组尚未采集模型', 'No models available in this group'],
  emptyCatalog: ['暂无模型数据，请先扫描并构建模型。', 'No model data. Scan and build models first.'],
  skybox: ['背景', 'Skybox'],
  gateState: ['星门状态', 'Gate state'],
  gateInactive: ['未激活', 'Inactive'],
  gateUnlinked: ['已激活', 'Active'],
  gateLinked: ['已连接', 'Linked'],
  gateTransit: ['跃迁预览', 'Transit preview'],
  gateArrival: ['到达', 'Arrival'],
  gateDeparture: ['离开', 'Departure'],
  skyboxNone: ['无背景', 'None'],
  skyboxAuto: ['自动（飞船势力）', 'Auto (ship faction)'],
  skyboxLoading: ['正在加载背景…', 'Loading background…'],
  skyboxError: ['背景加载失败，请重新选择。', 'Background failed to load. Select again to retry.'],
  skyboxMissing: ['构建后可选择场景背景。', 'Build models to make scene backgrounds available.'],
  noMatches: ['没有找到匹配的物品', 'No matching items'],
  searchHelp: ['试试其他名称或调整筛选。', 'Try another name or adjust the filters.'],
  browse: ['查看目录物品', 'Browse items'],
  clear: ['清除筛选', 'Clear filters'],
  previousPage: ['上一页', 'Previous page'],
  nextPage: ['下一页', 'Next page'],
  credit: ['素材 © CCP Games · 非官方项目', 'Assets © CCP Games · Unofficial project'],
  model: ['三维模型', '3D model'],
  viewModel: ['查看{name}的三维模型', 'View {name} in 3D'],
  modelAlt: [
    '{name}三维模型。拖动旋转，滚轮缩放。',
    '{name} 3D model. Drag to orbit, scroll to zoom.',
  ],
  poster: ['{name}渲染图', '{name} render'],
  close: ['关闭查看器', 'Close viewer'],
  loadingModel: ['正在加载模型', 'Loading model'],
  loadingCatalog: ['读取目录…', 'Loading catalog…'],
  loadingMaterials: ['加载材质与贴图…', 'Loading materials and textures…'],
  loadingEnvironment: ['准备模型特效…', 'Preparing model effects…'],
  loadingStep: ['步骤 {step}/{total} · {name}', 'Step {step}/{total} · {name}'],
  loadingResourceCount: ['已完成阶段 {completed} / {total} · 已处理资源 {resources} · 请求中 {pending}', 'Stages complete {completed} / {total} · Resources processed {resources} · Requests active {pending}'],
  showHDR: ['反射环境（HDR）', 'HDR environment'],
  showEffects: ['特效', 'Effects'],
  hullTextures: ['船体贴图', 'Hull textures'],
  allTextures: ['全部贴图', 'All textures'],
  textureAlbedo: ['颜色纹理', 'Color texture'],
  textureNormal: ['法线细节', 'Normal detail'],
  textureRoughness: ['粗糙度', 'Roughness'],
  textureMaterial: ['材质分区', 'Material regions'],
  texturePaint: ['涂装／透明遮罩', 'Paint / transparency mask'],
  textureGlow: ['发光', 'Emission'],
  textureDirt: ['污垢', 'Dirt'],
  textureDust: ['尘埃噪声', 'Dust noise'],
  texturePattern1: ['投影涂装 1', 'Projected pattern 1'],
  texturePattern2: ['投影涂装 2', 'Projected pattern 2'],
  textureSails: ['帆面细节', 'Sail detail'],
  loadingAssets: ['读取模型与材质…', 'Loading geometry and materials…'],
  preparing: ['准备三维视图…', 'Preparing 3D view…'],
  progress: ['正在加载 · {count}%', 'Loading · {count}%'],
  modelFailed: ['模型暂时无法显示', 'Unable to display model'],
  retry: ['重新加载', 'Retry'],
  gestures: [
    '拖动旋转 · 滚轮缩放 · 右键平移',
    'Drag to orbit · Scroll to zoom · Right-drag to pan',
  ],
  fullscreen: ['全屏', 'Fullscreen'],
  exitFullscreen: ['退出全屏', 'Exit fullscreen'],
  fullscreenFailed: ['当前浏览器不支持全屏', 'Fullscreen is unavailable'],
  frigate: ['护卫舰', 'Frigate'],
  skin: ['默认涂装', 'Default skin'],
  graphic: ['图形编号', 'Graphic ID'],
  longAxis: ['长轴', 'Long axis'],
  triangles: ['三角面', 'Triangles'],
  size: ['模型资源', 'Asset size'],
  flight: ['飞行状态', 'Flight mode'],
  cruise: ['巡航', 'Cruise'],
  idle: ['待机', 'Idle'],
  paused: ['暂停动画', 'Paused'],
  animation: ['船体动作', 'Hull animation'],
  rotate: ['自动旋转', 'Auto-rotate'],
  invertWheel: ['滚轮反转', 'Invert mouse wheel'],
  killCount: ['击杀标记数量', 'Kill mark count'],
  killCountUnavailable: ['此模型暂无可用的击杀标记', 'Kill marks are not available for this model'],
  brightness: ['灯光亮度', 'Brightness'],
  reflection: ['反射强度', 'Reflection strength'],
  bloom: ['灯光辉光', 'Light bloom'],
  materialSettings: ['光照与材质', 'Lighting & materials'],
  sun: ['主光', 'Key light'],
  fill: ['补光', 'Fill lights'],
  ambient: ['环境漫反射', 'Ambient diffuse'],
  environment: ['环境反射', 'Environment reflection'],
  f0: ['金属反射（F0）', 'Material reflectance (F0)'],
  roughness: ['粗糙度', 'Roughness'],
  resetRender: ['恢复默认', 'Restore defaults'],
  exportGlb: ['导出 GLB', 'Export GLB'],
  exportObj: ['导出 OBJ', 'Export OBJ'],
  exporting: ['正在导出 {format}…', 'Exporting {format}…'],
  exportGlbDone: ['GLB 已导出，已排除 {count} 个不支持的特效对象。原生着色与后期光效不包含在内，外观可能有差异。', 'GLB exported; {count} unsupported effect objects excluded. Native shading and postprocessing are not included, so appearance may differ.'],
  exportObjDone: ['OBJ 已导出，不含材质、贴图、灯光或特效。', 'OBJ exported without materials, textures, lights or effects.'],
  exportFailed: ['导出失败，请重试。', 'Export failed. Please try again.'],
  reset: ['重置视角', 'Reset view'],
  previous: ['← 上一艘', '← Previous'],
  next: ['下一艘 →', 'Next →'],
  errorInit: ['模型初始化失败，请重试。', 'Model initialization failed. Please retry.'],
  errorAssets: [
    '模型加载失败，请检查本地资源和浏览器的图形支持。',
    'Model loading failed. Check local assets and browser graphics support.',
  ],
  errorTimeout: [
    '加载超时，请重试或检查硬件加速设置。',
    'Loading timed out. Retry or check hardware acceleration.',
  ],
  errorViewer: [
    '查看器加载失败，请检查本地服务与资源文件。',
    'Viewer loading failed. Check the local server and assets.',
  ],
  errorCatalog: [
    '目录加载失败，请检查本地服务与目录文件。',
    'Catalog loading failed. Check the local server and catalog file.',
  ],
  NormalLoop: ['常态循环', 'Normal loop'],
  Normal2Warp: ['进入跃迁', 'Enter warp'],
  Warp: ['跃迁姿态', 'Warp stance'],
  WarpLoop: ['跃迁循环', 'Warp loop'],
  Warp2Normal: ['退出跃迁', 'Exit warp'],
  Layer1Loop: ['部件循环', 'Component loop'],
  StartSiege: ['进入展开', 'Deploy'],
  EndSiege: ['收起', 'Retract'],
  SiegeLoop: ['展开循环', 'Deployed loop'],
};

const storageKey = 'ccpdec-language';
const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
const preferredLanguage = browserLanguages.find(language => /^(zh|en)(-|$)/i.test(language)) || 'en';
export let locale = /^zh(-|$)/i.test(preferredLanguage) ? 'zh-CN' : 'en';
try {
  const saved = localStorage.getItem(storageKey);
  if (['zh-CN', 'en'].includes(saved)) locale = saved;
} catch {
  /* Language switching also works when storage is unavailable. */
}

export function t(key, values = {}) {
  const text = messages[key]?.[locale === 'en' ? 1 : 0] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

export function localizedName(names) {
  return names?.[locale === 'en' ? 'en' : 'zh'] || names?.en || names?.zh || '';
}

export function setLocale(value) {
  if (!['zh-CN', 'en'].includes(value)) return;
  locale = value;
  try {
    localStorage.setItem(storageKey, locale);
  } catch {
    /* Optional persistence. */
  }
  // Language is a browser preference. Old links must not override it on reload.
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    history.replaceState(null, '', url);
  }
  applyTranslations();
}

export function applyTranslations() {
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
  for (const select of document.querySelectorAll('[data-language]')) select.value = locale;
}


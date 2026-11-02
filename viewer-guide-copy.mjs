// Trusted, repository-owned translation content.
export const guideCopy={
  "developer": [
    "组件文档",
    "Component docs"
  ],
  "back": [
    "返回图鉴 ↗",
    "Back to catalog ↗"
  ],
  "contents": [
    "使用指南",
    "Guide"
  ],
  "overview": [
    "预览",
    "Preview"
  ],
  "quick": [
    "引入组件",
    "Import"
  ],
  "examples": [
    "案例",
    "Examples"
  ],
  "equipment": [
    "装备挂载",
    "Equipment mounting"
  ],
  "attributes": [
    "属性",
    "Attributes"
  ],
  "api": [
    "JavaScript API",
    "JavaScript API"
  ],
  "heading": [
    "EVE 模型组件",
    "EVE model component"
  ],
  "intro": [
    "引入一个 JS，用物品 ID 展示模型。支持原版视觉设置和装备自动挂载。",
    "Import one JS file and display a model by item ID. Includes the original visual settings and automatic equipment mounting."
  ],
  "start": [
    "查看用法 ↓",
    "Usage ↓"
  ],
  "browse": [
    "运行案例 →",
    "Try examples →"
  ],
  "preview": [
    "预览",
    "Preview"
  ],
  "markers": [
    "挂点标记",
    "Hardpoint markers"
  ],
  "reset": [
    "重置视角 ↶",
    "Reset view ↶"
  ],
  "loading": [
    "加载中…",
    "Loading…"
  ],
  "choose": [
    "切换案例 ↓",
    "Choose example ↓"
  ],
  "assignments": [
    "挂载结果",
    "Mount assignments"
  ],
  "quickIntro": [
    "复制下面的 HTML 即可使用。",
    "Copy this HTML to get started."
  ],
  "download": [
    "下载 HTML ↓",
    "Download HTML ↓"
  ],
  "copy": [
    "复制代码",
    "Copy code"
  ],
  "quickNote": [
    "模型和贴图由我们的资源服务加载，无需另外安装依赖。记得给标签设置高度。",
    "Models and textures load from our asset service. No extra dependencies are needed. Set a height on the element."
  ],
  "examplesIntro": [
    "点击运行，查看上方效果。每页只需 import 一次。",
    "Run an example to update the preview. Import the component once per page."
  ],
  "equipmentIntro": [
    "<code>slot</code> 是逻辑装备槽，不是原生挂点编号。传入装备 ID 后，组件会按装备类型选择兼容挂点，并检查位置是否已被占用。",
    "<code>slot</code> is a logical equipment slot, not a native hardpoint number. The component uses the equipment type to select compatible, unoccupied mounts."
  ],
  "configuration": [
    "配置",
    "Configuration"
  ],
  "slot": [
    "slot 1 → 装备 503",
    "slot 1 → item 503"
  ],
  "family": [
    "装备挂点类型",
    "Equipment mount type"
  ],
  "hull": [
    "飞船 12032",
    "Ship 12032"
  ],
  "available": [
    "空闲的发射器挂点",
    "Free launcher mounts"
  ],
  "equipmentNote": [
    "587 + 484 演示炮塔，12032 + 503 演示发射器。运行后可查看挂点标记和实际分配结果。这里只做模型展示，不校验 CPU、能量栅格等游戏内配装限制。",
    "587 + 484 demonstrates turrets; 12032 + 503 demonstrates launchers. Run either to inspect markers and assignments. This is a visual preview; CPU, power grid and other in-game fitting limits are not checked."
  ],
  "attribute": [
    "属性",
    "Attribute"
  ],
  "default": [
    "默认值",
    "Default"
  ],
  "purpose": [
    "说明",
    "Description"
  ],
  "required": [
    "必填",
    "Required"
  ],
  "itemHelp": [
    "物品 ID，例如 587。",
    "Item ID, for example 587."
  ],
  "inherit": [
    "跟随页面",
    "Page language"
  ],
  "langHelp": [
    "<code>en</code> 或 <code>zh-CN</code>，设置组件语言。",
    "Set the component language to <code>en</code> or <code>zh-CN</code>."
  ],
  "backgroundHelp": [
    "<code>auto</code> 自动选择背景，<code>none</code> 不显示背景，也可传入场景 ID。",
    "<code>auto</code> selects a background; <code>none</code> hides it. A scene ID is also accepted."
  ],
  "off": [
    "关",
    "Off"
  ],
  "on": [
    "开",
    "On"
  ],
  "controlsHelp": [
    "显示原版视觉设置。",
    "Show the original visual settings."
  ],
  "whiteHelp": [
    "查看白模，可随时切回。",
    "View the white model; switch back at any time."
  ],
  "effectsHelp": [
    "<code>effects=\"false\"</code> 关闭特效。",
    "Use <code>effects=\"false\"</code> to disable effects."
  ],
  "rotateHelp": [
    "自动旋转。",
    "Rotate automatically."
  ],
  "exposureHelp": [
    "亮度，范围 0.1–3。",
    "Exposure, from 0.1 to 3."
  ],
  "reflectionHelp": [
    "反射强度，范围 0–3。",
    "Reflection strength, from 0 to 3."
  ],
  "killsHelp": [
    "击杀标记数量，0–999；需模型支持。",
    "Kill marks, 0–999; requires model support."
  ],
  "markersHelp": [
    "显示装备挂点标记。",
    "Show equipment hardpoint markers."
  ],
  "booleanNote": [
    "布尔属性以是否存在表示开关。关闭时移除属性，别写 <code>white-model=\"false\"</code>。<code>effects</code> 除外，按上表传值。",
    "Boolean attributes are enabled by their presence. Remove them to turn them off; do not use <code>white-model=\"false\"</code>. <code>effects</code> is the exception: use the value shown above."
  ],
  "apiIntro": [
    "复杂参数通过 configure() 传入。等待 Promise 完成后再读取结果。",
    "Pass complex options to configure(). Wait for its Promise before reading results."
  ],
  "apiNote": [
    "<code>configure()</code> 会合并已有参数。传入 <code>fitting</code> 时给出完整装备列表；<code>equipment: []</code> 清空装备。",
    "<code>configure()</code> merges existing options. Provide the full equipment list in <code>fitting</code>; <code>equipment: []</code> clears it."
  ],
  "method": [
    "方法 / 事件",
    "Method / event"
  ],
  "placementsHelp": [
    "查询实际挂载结果。",
    "Read actual mount assignments."
  ],
  "equipmentHelp": [
    "装配初始化后，查询逻辑槽可用的装备。",
    "Query equipment for a logical slot after fitting initialization."
  ],
  "exportHelp": [
    "返回含 Blob 的模型导出结果。",
    "Return a model export containing a Blob."
  ],
  "skyboxHelp": [
    "背景加载后，返回 HDR 文件的 Blob 和名称。",
    "Return the HDR Blob and filename after a background has loaded."
  ],
  "eventsHelp": [
    "加载进度、完成、错误事件，数据在 <code>event.detail</code> 中。",
    "Loading progress, completion and errors. Read data from <code>event.detail</code>."
  ],
  "settingsHelp": [
    "用户修改控制区时触发。",
    "Fires when a user changes visual settings."
  ],
  "errorNote": [
    "显式调用 <code>configure()</code> 时用 <code>try / catch</code> 处理错误。不要在同一页再加载其他版本的 model-viewer。",
    "Handle <code>configure()</code> errors with <code>try / catch</code>. Do not load another model-viewer version on the same page."
  ],
  "copyright": [
    "EVE Online 模型与游戏资源归 CCP Games 所有。",
    "EVE Online models and game assets belong to CCP Games."
  ]
};
export const caseCopy={
  "minimal": [
    "Minimal embed",
    "Ship 587, with no background."
  ],
  "controls": [
    "Original visual controls",
    "Show the original controls for quality, white model mode and lighting."
  ],
  "background": [
    "Background and auto-rotation",
    "Select a background automatically and rotate the model slowly."
  ],
  "white": [
    "View white model",
    "View the white model. Use the controls to switch back to full materials."
  ],
  "quality": [
    "Reflections and anti-aliasing",
    "Use SMAA and set reflection strength to 0.3."
  ],
  "turrets": [
    "Automatic turrets · 587 + 484",
    "Fit two groups of 125mm Gatling AutoCannon I to a Rifter."
  ],
  "launchers": [
    "Special mounting · 12032 + 503",
    "Fit two groups of Torpedo Launcher I to a Manticore, using launcher mounts automatically."
  ]
};

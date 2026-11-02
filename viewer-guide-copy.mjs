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
    "重置视角",
    "Reset view"
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
    "<code>equipment</code> 传入装备 ID 数组。组件按顺序检查类型、空闲位置和容量，自动选择挂点。",
    "Pass an array of item IDs in <code>equipment</code>. The component checks each item in order and assigns compatible free mounts."
  ],
  "configuration": [
    "配置",
    "Configuration"
  ],
  "slot": [
    "[503,503]",
    "[503,503]"
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
    "587 + 484 演示炮塔，12032 + 503 演示发射器。空数组 <code>[]</code> 清空装备。某一项无法安装时会返回其位置和 ID，并保留原装配。",
    "587 + 484 demonstrates turrets; 12032 + 503 demonstrates launchers. An empty array <code>[]</code> clears equipment. If an item cannot fit, its position and ID are reported and the previous fitting is retained."
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
  "copyright": [
    "EVE Online 模型与游戏资源归 CCP Games 所有。",
    "EVE Online models and game assets belong to CCP Games."
  ],
  "equipmentAttribute": [
    "装备 ID 数组，例如 <code>[484,484]</code>，按顺序自动挂载。",
    "Item ID array, for example <code>[484,484]</code>, mounted automatically in order."
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

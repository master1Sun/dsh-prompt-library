window.__ModuleLoader__.load({
	id: "@sunjuntao/dsh-prompt-library",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(utils_exports);

// src/client/components/common/Tooltip.tsx
var tipEl = null;
var tipText = "";
var tipW = 0;
var attached = false;
function ensureTipEl() {
  if (tipEl && document.body.contains(tipEl)) return tipEl;
  tipEl = document.createElement("div");
  tipEl.setAttribute("role", "tooltip");
  tipEl.style.cssText = [
    "position: fixed",
    // 与 # 浮层等 max z-index（2147483647）同级，靠「显示时移到 body 末尾」的 DOM 顺序保证绘制在最上层
    "z-index: 2147483647",
    "box-sizing: border-box",
    "max-width: 320px",
    "padding: 3px 8px",
    "border-radius: 6px",
    "font-size: 11px",
    "line-height: 1.5",
    "white-space: nowrap",
    "overflow: hidden",
    "text-overflow: ellipsis",
    "pointer-events: none",
    "color: var(--dsw-alias-label-primary, #f2f6fc)",
    "background: var(--dsw-alias-bg-layer-1, #171f2b)",
    "border: 1px solid var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
    "box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18)",
    "font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif)",
    "visibility: hidden"
  ].join(";");
  document.body.appendChild(tipEl);
  return tipEl;
}
function hideTip() {
  if (tipEl) tipEl.style.visibility = "hidden";
}
function onDocMove(e) {
  const at = document.elementFromPoint(e.clientX, e.clientY);
  const tip = at?.closest?.("[data-tip]");
  if (!tip) {
    hideTip();
    return;
  }
  const text = tip.getAttribute("data-tip") ?? "";
  if (!text) {
    hideTip();
    return;
  }
  const el = ensureTipEl();
  document.body.appendChild(el);
  if (tipText !== text) {
    tipText = text;
    el.textContent = text;
    el.style.visibility = "hidden";
    el.style.left = "0px";
    el.style.top = "0px";
    tipW = el.offsetWidth;
  }
  el.style.visibility = "visible";
  el.style.left = `${Math.max(8, Math.min(e.clientX + 12, window.innerWidth - tipW - 8))}px`;
  el.style.top = `${Math.min(e.clientY + 18, window.innerHeight - 24)}px`;
}
function init() {
  if (attached) return;
  attached = true;
  document.addEventListener("mousemove", onDocMove, true);
  document.addEventListener("scroll", hideTip, true);
  document.addEventListener("keydown", hideTip, true);
}
init();

// src/client/components/data/PromptLibraryButton.tsx
var import_react6 = require("react");

// src/types.ts
var TITLE_MAX_LEN = 25;
function clampTitle(title) {
  return title.slice(0, TITLE_MAX_LEN);
}
var UNMATCHED_SCOPE_PATH = "__pl_unmatched__";
var DEFAULT_SETTINGS = {
  panelWidth: 360,
  // 右侧面板宽度（px）
  panelHeight: 500,
  // 右侧面板高度（px）
  maxPromptCount: 100,
  // 提示词最大存储数量（超出时按使用次数/更新时间淘汰）
  aiProvider: "",
  // AI 调用使用的 provider（留空自动发现）
  aiModel: "",
  // AI 调用使用的模型 id（留空自动发现）
  settingsAboveMenuEnabled: true,
  // 是否显示左侧设置按钮上方的词库按钮（默认开启）
  showComposerButton: true,
  // 是否在聊天框工具栏显示词库按钮
  composerButtonIconOnly: true,
  // 词库按钮用纯图标显示（隐藏文字，仅保留图标）
  showAIPolishButton: true,
  // 是否在聊天框工具栏显示 AI 润色按钮
  aiPolishButtonIconOnly: true,
  // AI 润色按钮用纯图标显示（隐藏文字，仅保留图标）
  tildaTriggerEnabled: true,
  // 是否启用输入 ~ 触发词库选择
  selectionAddEnabled: true,
  // 是否启用选中文本后浮动「添加提示词」入口
  contextRecommendEnabled: true,
  // 是否启用基于聊天上下文的提示词推荐
  dataManagementEnabled: true
  // 数据管理：卡片菜单/词库菜单展示「数据管理」入口
};

// src/client/utils/api.ts
var BASE = "/api/prompt-library/prompts";
var PERSONAS_BASE = "/api/prompt-library/personas";
var SESSION_PROMPTS_BASE = "/api/prompt-library/session-prompts";
async function send(method, path, body, signal) {
  const init2 = { method, headers: {} };
  if (body !== void 0) {
    init2.headers = { "content-type": "application/json" };
    init2.body = JSON.stringify(body);
  }
  if (signal) init2.signal = signal;
  const res = await fetch(path, init2);
  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`prompt-library: bad response (${res.status})`);
  }
  if (!payload.ok || payload.data === void 0) {
    throw new Error(payload.error || `prompt-library: ${res.status}`);
  }
  return payload.data;
}
function listPrompts() {
  return send("GET", BASE);
}
function createPrompt(input) {
  return send("POST", BASE, input);
}
function updatePrompt(id, patch) {
  return send("PUT", `${BASE}/${encodeURIComponent(id)}`, patch);
}
function deletePrompt(id) {
  return send("DELETE", `${BASE}/${encodeURIComponent(id)}`);
}
function usePrompt(id) {
  return send("POST", `${BASE}/${encodeURIComponent(id)}`);
}
function saveExportFile(ids, format, dir) {
  return send("POST", "/api/prompt-library/export/save", {
    ids,
    format,
    ...dir ? { dir } : {}
  });
}
function importPrompts(data) {
  return send("POST", "/api/prompt-library/import", data);
}
function listTags() {
  return send("GET", "/api/prompt-library/tags");
}
function renameTag(from, to) {
  return send(
    "PUT",
    `/api/prompt-library/tags/${encodeURIComponent(from)}`,
    { to }
  );
}
function deleteTag(name) {
  return send(
    "DELETE",
    `/api/prompt-library/tags/${encodeURIComponent(name)}`
  );
}
function createTag(name) {
  return send("POST", "/api/prompt-library/tags", { name });
}
function listFsDirectory(path) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return send("GET", `/api/prompt-library/fs/list${qs}`);
}
function createFsDirectory(path, name) {
  return send("POST", "/api/prompt-library/fs/mkdir", { path, name });
}
function listAvailableSkills() {
  return send("GET", "/api/prompt-library/skills/available");
}
function scanSkillDir(dir) {
  return send("POST", "/api/prompt-library/skills/scan-dir", { dir });
}
function parseSkillRaw(raw) {
  return send(
    "POST",
    "/api/prompt-library/skills/parse",
    { raw }
  );
}
function importSkillEntries(entries) {
  return send("POST", "/api/prompt-library/skills/import/entries", { entries });
}
function exportSkillEntries(entries, scope = "global", rootPath) {
  return send("POST", "/api/prompt-library/skills/export/entries", {
    entries,
    scope,
    rootPath
  });
}
function getExportProjectCwd() {
  return send("GET", "/api/prompt-library/skills/export/project-cwd");
}
function describeSkill(payload, signal) {
  return send("POST", "/api/prompt-library/skills/ai-describe", payload, signal);
}
function listTrash() {
  return send("GET", "/api/prompt-library/trash");
}
function restoreTrash(ids) {
  return send("POST", "/api/prompt-library/trash/restore", { ids });
}
function deleteTrash(ids) {
  return send("POST", "/api/prompt-library/trash/delete", { ids });
}
function polishPrompt(body, opts) {
  return send("POST", "/api/prompt-library/ai/polish", {
    body,
    keepVariables: opts?.keepVariables ?? true,
    withSummary: opts?.withSummary ?? false
  });
}
function generateDraft(kind, title, input, lang) {
  return send("POST", "/api/prompt-library/ai/draft", {
    kind,
    title,
    input,
    lang
  });
}
function getAiSelectables() {
  return send("GET", "/api/prompt-library/ai/providers");
}
function getVersion() {
  return send("GET", "/api/prompt-library/version");
}
var SETTINGS_BASE = "/api/prompt-library/settings";
function getSettings() {
  return send("GET", SETTINGS_BASE);
}
function updateSettings(patch) {
  return send("PUT", SETTINGS_BASE, patch);
}
function listPersonas() {
  return send("GET", PERSONAS_BASE);
}
function createPersona(name) {
  return send("POST", PERSONAS_BASE, { name });
}
function updatePersona(id, patch) {
  return send("PUT", `${PERSONAS_BASE}/${encodeURIComponent(id)}`, patch);
}
function deletePersona(id) {
  return send("DELETE", `${PERSONAS_BASE}/${encodeURIComponent(id)}`);
}
function listSessionScopeTree() {
  return send("GET", `${PERSONAS_BASE}/scopes/sessions`);
}
function setPersonaBinding(path, personaId) {
  return send("PUT", `${PERSONAS_BASE}/scopes/binding`, { path, personaId });
}
function listSessionPrompts() {
  return send("GET", SESSION_PROMPTS_BASE);
}
function createSessionPrompt(input) {
  return send("POST", SESSION_PROMPTS_BASE, input);
}
function updateSessionPrompt(id, patch) {
  return send("PUT", `${SESSION_PROMPTS_BASE}/${encodeURIComponent(id)}`, patch);
}
function deleteSessionPrompt(id) {
  return send("DELETE", `${SESSION_PROMPTS_BASE}/${encodeURIComponent(id)}`);
}
function listSessionPromptBindings() {
  return send("GET", `${SESSION_PROMPTS_BASE}/bindings`);
}
function setSessionPromptBinding(path, promptIds) {
  return send("PUT", `${SESSION_PROMPTS_BASE}/bindings`, { path, promptIds });
}
function clearSessionPromptBinding(path) {
  return send(
    "DELETE",
    `${SESSION_PROMPTS_BASE}/bindings?path=${encodeURIComponent(path)}`
  );
}
function clearAllBindings() {
  return send("DELETE", `${SESSION_PROMPTS_BASE}/bindings/all`);
}
function clearAllPersonaBindings() {
  return send("DELETE", `${PERSONAS_BASE}/scopes/bindings/all`);
}
function diagSession(sessid) {
  const q = sessid ? `?sessid=${encodeURIComponent(sessid)}` : "";
  return send("GET", `${SESSION_PROMPTS_BASE}/diag${q}`);
}
function listHarnessSkillToggles() {
  return send("GET", "/api/prompt-library/skills/harness/list");
}
function setHarnessSkillToggle(id, enabled) {
  return send("POST", "/api/prompt-library/skills/harness/toggle", { id, enabled });
}
function deleteHarnessSkill(id) {
  return send("POST", "/api/prompt-library/skills/harness/delete", { id });
}
function getMetaValue(key) {
  return send("GET", `/api/prompt-library/meta/${encodeURIComponent(key)}`).then(
    (d) => d.value
  );
}
function setMetaValue(key, value) {
  return send(
    "PUT",
    `/api/prompt-library/meta/${encodeURIComponent(key)}`,
    { value }
  ).then((d) => d.value);
}

// src/client/components/data/PromptLibraryButton.tsx
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/utils/button-style.ts
var PL_BUTTON_CSS = `
.pl-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:none;border-radius:18px;cursor:pointer;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary,#f2f6fc);background:transparent;padding:0 14px;font-family:inherit;white-space:nowrap}
.pl-btn:disabled{cursor:not-allowed;opacity:.4}
.pl-btn--md{height:36px}
.pl-btn--sm{height:28px;font-size:12px;line-height:18px;padding:0 10px;border-radius:14px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:0 0}
.pl-btn--primary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--primary:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.pl-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--ghost:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.pl-btn.pl-btn--no-border{border:none}
`;
var plBtn = (variant, size = "sm") => `pl-btn pl-btn--${variant} pl-btn--${size}`;

// src/client/components/data/SelectionAddPrompt.tsx
var import_react4 = require("react");

// src/client/utils/recent-created.ts
var recentIds = /* @__PURE__ */ new Set();
var MAX_RECENT = 50;
function markRecent(id) {
  recentIds.add(id);
  if (recentIds.size > MAX_RECENT) {
    const first = recentIds.values().next().value;
    if (first !== void 0) recentIds.delete(first);
  }
}
function isRecent(id) {
  return recentIds.has(id);
}

// src/client/utils/data-sync.ts
var import_react = require("react");

// src/client/utils/ws.ts
var SOCKET_PATH = "/api/prompt-library/events";
var RECONNECT_BASE_MS = 1e3;
var RECONNECT_MAX_MS = 1e4;
function toWebSocketUrl(path) {
  if (typeof window === "undefined") return path;
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}${path}`;
}
var state = null;
function scheduleReconnect(current) {
  if (current.timer !== void 0) return;
  current.attempt += 1;
  const delay = Math.min(RECONNECT_BASE_MS * current.attempt, RECONNECT_MAX_MS);
  current.timer = setTimeout(() => {
    current.timer = void 0;
    connect(current);
  }, delay);
}
function connect(current) {
  let socket;
  try {
    socket = new WebSocket(toWebSocketUrl(SOCKET_PATH));
  } catch {
    scheduleReconnect(current);
    return;
  }
  current.socket = socket;
  socket.onopen = () => {
    current.attempt = 0;
  };
  socket.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message === null || typeof message !== "object") return;
    for (const listener of [...current.listeners]) listener(message);
  };
  socket.onerror = () => {
    try {
      socket.close();
    } catch {
    }
  };
  socket.onclose = () => {
    current.socket = null;
    scheduleReconnect(current);
  };
}
function ensureSocket() {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
  if (state === null) {
    state = { socket: null, listeners: /* @__PURE__ */ new Set(), attempt: 0 };
    connect(state);
  }
  return state;
}
function subscribePush(listener) {
  const current = ensureSocket();
  if (current === null) return () => {
  };
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
  };
}

// src/client/utils/data-sync.ts
var DATA_CHANGED_EVENT = "pl:data-changed";
var FILL_DRAFT_EVENT = "pl:fill-draft";
var EXPORT_DOWNLOADED_EVENT = "pl:export-downloaded";
function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}
var subscribed = false;
var unsubscribe = null;
function handleMessage(message) {
  switch (message.type) {
    case "data-changed": {
      notifyDataChanged();
      return;
    }
    case "fill-draft": {
      const body = typeof message.body === "string" ? message.body : "";
      if (!body) return;
      window.dispatchEvent(new CustomEvent(FILL_DRAFT_EVENT, { detail: { body } }));
      return;
    }
    case "export-download": {
      let count = 0;
      const json = typeof message.json === "string" ? message.json : "";
      const name = typeof message.name === "string" ? message.name : "";
      if (json) {
        try {
          const parsed = JSON.parse(json);
          count = Array.isArray(parsed.prompts) ? parsed.prompts.length : 0;
        } catch {
          count = 0;
        }
        try {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name || `prompt-library-backup-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch {
        }
      }
      if (count > 0) {
        window.dispatchEvent(new CustomEvent(EXPORT_DOWNLOADED_EVENT, { detail: { count } }));
      }
      return;
    }
    default:
      return;
  }
}
function startDataChangedSubscription() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  try {
    unsubscribe = subscribePush(handleMessage);
  } catch {
    subscribed = false;
    unsubscribe = null;
  }
}
function useDataChanged(reload) {
  const reloadRef = (0, import_react.useRef)(reload);
  reloadRef.current = reload;
  (0, import_react.useEffect)(() => {
    startDataChangedSubscription();
    const onChanged = () => reloadRef.current();
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
  }, []);
}
function useFillDraft(fill) {
  const fillRef = (0, import_react.useRef)(fill);
  fillRef.current = fill;
  (0, import_react.useEffect)(() => {
    startDataChangedSubscription();
    const onFill = (ev) => {
      const body = ev.detail?.body ?? "";
      if (body) fillRef.current(body);
    };
    window.addEventListener(FILL_DRAFT_EVENT, onFill);
    return () => window.removeEventListener(FILL_DRAFT_EVENT, onFill);
  }, []);
}
function useExportDownloaded(onDownloaded) {
  const onRef = (0, import_react.useRef)(onDownloaded);
  onRef.current = onDownloaded;
  (0, import_react.useEffect)(() => {
    startDataChangedSubscription();
    const handler = (ev) => {
      const count = ev.detail?.count ?? 0;
      if (count > 0) onRef.current(count);
    };
    window.addEventListener(EXPORT_DOWNLOADED_EVENT, handler);
    return () => window.removeEventListener(EXPORT_DOWNLOADED_EVENT, handler);
  }, []);
}

// src/client/components/data/SelectionAddPrompt.tsx
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/utils/dialog-style.ts
var PL_DIALOG = "pl-dialog";
var PL_DIALOG_OVERLAY = "pl-dialog-overlay";
var PL_DIALOG_OVERLAY_MAX = "pl-dialog-overlay--max";
var PL_DIALOG_MAX = "pl-dialog--max";
var PL_DIALOG_EMBED_OVERLAY = {
  position: "absolute",
  inset: 0,
  zIndex: 10,
  boxSizing: "border-box",
  overflow: "hidden",
  background: "transparent",
  display: "flex"
};
var PL_DIALOG_CSS = `
.pl-dialog{box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:var(--dsw-specific-sidebar-fill,#f5f6f7);padding:18px 7px 18px 10px;color:var(--dsw-alias-label-primary,#f2f6fc);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif)}
.pl-dialog-overlay{position:fixed;inset:0;z-index:2147483647;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;background:rgba(0,0,0,.35);backdrop-filter:var(--dsw-mask-blur,blur(12px));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(12px))}
.pl-dialog-overlay--max{padding:0}
.pl-dialog--max{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important}
/* \u684C\u9762\u7AEF\uFF1A\u5BBF\u4E3B\u5728\u9876\u90E8\u4FDD\u7559 36px \u6807\u9898\u6761\uFF08#root \u81EA top:36px \u8D77\uFF09\uFF0C\u6700\u5927\u5316\u53EA\u94FA\u6EE1\u5176\u4E0B\u5185\u5BB9\u533A */
body[data-dsh-desktop-mode="compatibility"] .pl-dialog-overlay--max,
body[data-dsh-desktop-mode="extended"] .pl-dialog-overlay--max{top:36px;bottom:0}
body[data-dsh-desktop-mode="compatibility"] .pl-dialog--max,
body[data-dsh-desktop-mode="extended"] .pl-dialog--max{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border-radius:0!important}
/* \u89E3\u9501\u5854\u7F57\u724C\uFF1A\u5361\u7247\u8868\u9762\u6D41\u52A8\u9AD8\u5149\u626B\u5149 */
.pl-card-sheen{position:absolute;inset:0;border-radius:11px;pointer-events:none;overflow:hidden;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.5) 50%,transparent 60%);background-size:250% 250%;animation:plCardSheen 4.2s ease-in-out infinite;z-index:3}
@keyframes plCardSheen{0%{background-position:130% 0}62%{background-position:-130% 0}100%{background-position:-130% 0}}
/* \u53F2\u8BD7\u53CA\u4EE5\u4E0A\uFF1A\u70AB\u5F69\u6D41\u52A8\u91D1\u8FB9\uFF08\u906E\u7F69\u62BD\u6210\u7EC6\u73AF\uFF09 */
.pl-card-gold{position:absolute;inset:-2px;border-radius:14px;padding:2px;pointer-events:none;background:linear-gradient(120deg,#ffd700 0%,#ff9d00 16%,#ff2ed1 34%,#7a5cff 52%,#00d9ff 70%,#ffd700 100%);background-size:280% 100%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:plGoldShimmer 4.5s linear infinite;z-index:2}
@keyframes plGoldShimmer{0%{background-position:0% 50%}100%{background-position:280% 50%}}
/* \u7B49\u7EA7\u8BE6\u60C5\uFF08QQ \u5F0F\u7B49\u7EA7\u4ECB\u7ECD\uFF09\uFF1A\u6BCF\u884C\u4E00\u6761\u6A2A\u5411\u626B\u5149\uFF0C\u4ECE\u4F4E\u7EA7\u5230\u9AD8\u7EA7\u9010\u884C\u9519\u5CF0\u70B9\u4EAE */
.pl-lv-row{position:relative;border-radius:8px;overflow:hidden}
.pl-lv-row::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.16) 50%,transparent 58%);background-size:250% 250%;animation:plLvRowSweep 2.6s ease-in-out infinite;pointer-events:none}
@keyframes plLvRowSweep{0%{background-position:130% 0}60%{background-position:-130% 0}100%{background-position:-130% 0}}
/* \u7B49\u7EA7\u8BE6\u60C5\uFF1A\u5F53\u524D\u7B49\u7EA7\u5FBD\u7AE0\u8109\u51B2\u5149\u73AF\uFF08\u6A21\u4EFF QQ \u70B9\u4EAE\u547C\u5438\uFF09 */
.pl-lv-cur{animation:plLvPulse 2.1s ease-out infinite}
@keyframes plLvPulse{0%{box-shadow:0 0 0 0 var(--pl-lv-glow,#ffb428a0)}75%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* \u7B49\u7EA7\u8BE6\u60C5\uFF1A\u7B49\u7EA7\u8FDB\u5EA6\u6761\u7531\u5DE6\u5411\u53F3\u751F\u957F\u586B\u5145 */
.pl-lv-fill{transform-origin:left;animation:plLvFillGrow .65s cubic-bezier(.2,.7,.3,1) both}
@keyframes plLvFillGrow{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
/* \u5F39\u7A97\u5185\u6EDA\u52A8\u6761\u7A33\u5B9A\u5360\u4F4D\uFF1A\u6EDA\u52A8\u6761\u51FA\u73B0/\u9690\u85CF\u4E0D\u6539\u53D8\u5185\u5BB9\u5BBD\u5EA6\uFF0C\u6D88\u9664\u91CD\u6392\u95EA\u70C1 */
.pl-dialog,.pl-dialog *{scrollbar-gutter:stable}
/* \u5F39\u7A97\u5185\u6EDA\u52A8\u6761\u7EDF\u4E00\u7EC6\u7A84\u5706\u89D2\u534A\u900F\u660E\uFF0C\u51CF\u5C11\u7A81\u5140\u3001\u4E0E\u5360\u4F4D\u5BBD\u5EA6\u4E00\u81F4 */
.pl-dialog ::-webkit-scrollbar{width:8px;height:8px}
.pl-dialog ::-webkit-scrollbar-thumb{background:rgba(128,134,148,.30);border-radius:4px;border:2px solid transparent;background-clip:padding-box}
.pl-dialog ::-webkit-scrollbar-thumb:hover{background-color:rgba(128,134,148,.5)}
.pl-dialog ::-webkit-scrollbar-track{background:transparent}
`;

// src/client/utils/i18n.ts
var import_react2 = require("react");
var NS = "prompt-library";
var zh = {
  // 通用按钮 / 提示
  "pl.title": "\u8BCD\u5E93",
  "pl.search": "\u641C\u7D22\u2026",
  "pl.searchEmpty": "\u672A\u627E\u5230\u5339\u914D\u7684\u63D0\u793A\u8BCD",
  "pl.clearSearch": "\u6E05\u9664\u641C\u7D22",
  "pl.tagFilterAll": "\u5168\u90E8",
  "pl.empty": "\u6682\u65E0\u63D0\u793A\u8BCD",
  "pl.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "pl.new": "+ \u65B0\u5EFA",
  "pl.addToLibrary": "\u6DFB\u52A0\u63D0\u793A\u8BCD",
  "pl.refresh": "\u5237\u65B0",
  "pl.refreshing": "\u5237\u65B0\u4E2D\u2026",
  "pl.refreshTitle": "\u5237\u65B0\u8BCD\u5E93\u5217\u8868",
  "pl.insert": "\u63D2\u5165",
  "pl.insertSend": "\u63D2\u5165\u5E76\u53D1\u9001",
  "pl.insertSendDisabled": "\u5DF2\u6709\u672A\u53D1\u9001\u5185\u5BB9\uFF0C\u8BF7\u5148\u6E05\u7A7A\u6216\u7528\u300C\u63D2\u5165\u300D",
  "pl.overwrite": "\u8986\u76D6",
  "pl.edit": "\u7F16\u8F91",
  "pl.view": "\u67E5\u770B",
  "pl.delete": "\u5220\u9664",
  "pl.copy": "\u590D\u5236",
  "pl.copied": "\u5DF2\u590D\u5236",
  "pl.save": "\u4FDD\u5B58",
  "pl.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "pl.cancel": "\u53D6\u6D88",
  "pl.close": "\u5173\u95ED",
  "pl.windowMaximize": "\u6700\u5927\u5316",
  "pl.windowRestore": "\u8FD8\u539F",
  "pl.titleField": "\u6807\u9898",
  "pl.bodyField": "\u6B63\u6587",
  "pl.insertVariableTitle": "\u5728\u5149\u6807\u5904\u63D2\u5165\u53D8\u91CF\u6807\u7B7E {{}}\uFF08\u9009\u4E2D\u6587\u672C\u53EF\u4F5C\u4E3A\u53D8\u91CF\u540D\uFF09",
  "pl.insertVariableDefault": "\u53D8\u91CF\u540D",
  "pl.tagsField": "\u6807\u7B7E\uFF08\u5355\u9009\uFF09",
  "pl.tagsHint": "\u4ECE\u5DF2\u6709\u6807\u7B7E\u4E2D\u9009\u62E9\u4E00\u4E2A\u6807\u7B7E",
  "pl.tagsNoneSelect": "\uFF08\u65E0\u6807\u7B7E\uFF09",
  "pl.requireTitleBody": "\u6807\u9898\u548C\u6B63\u6587\u4E3A\u5FC5\u586B\u9879",
  "pl.deleted": "\u5DF2\u5220\u9664",
  "pl.confirmDelete": '\u5220\u9664 "{title}"\uFF1F\u5220\u9664\u540E\u5C06\u79FB\u5165\u56DE\u6536\u7AD9\uFF0C\u53EF\u5728\u300C\u6570\u636E\u7BA1\u7406 - \u56DE\u6536\u7AD9\u300D\u4E2D\u6062\u590D\u3002',
  "pl.recentNew": "\u65B0\u589E",
  "pl.learnedToast": "\u5DF2\u81EA\u52A8\u5B66\u4E60",
  "pl.refinedDone": "\u5DF2\u5B8C\u6210 AI \u5B8C\u5584",
  "pl.refinePending": "\u5C1A\u672A\u5B8C\u6210 AI \u5B8C\u5584",
  "pl.original": "\u539F\u7A3F",
  "pl.polished": "\u6DA6\u8272\u7A3F",
  // # 触发浮层
  "pl.overlayNoMatch": "\u65E0\u5339\u914D\u201C{query}\u201D",
  "pl.overlayHintFilter": "\u7B5B\u9009\u201C{query}\u201D \xB7 \u2191\u2193\u9009\u62E9 \xB7 Enter\u786E\u8BA4 \xB7 \u7A7A\u683C \u7ED3\u675F \xB7 Esc \u5173\u95ED",
  "pl.overlayHintDefault": "\u2191\u2193 \u9009\u62E9 \xB7 Enter \u786E\u8BA4 \xB7 \u7EE7\u7EED\u8F93\u5165\u7B5B\u9009 \xB7 \u7A7A\u683C \u7ED3\u675F \xB7 Esc \u5173\u95ED",
  // AI 润色（聊天框确认卡片 / 按钮）
  "pl.polish": "AI \u4F18\u5316",
  "pl.polishing": "\u4F18\u5316\u4E2D\u2026",
  "pl.polishBtnTitle": "\u4F18\u5316\u5185\u5BB9",
  "pl.polishLoadingTitle": "AI \u4F18\u5316\u4E2D\u2026",
  "pl.polishEmpty": "\u8BF7\u5148\u8F93\u5165\u5185\u5BB9",
  "pl.polishFail": "AI \u4F18\u5316\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1",
  "pl.polishHoverContent": "\u4F18\u5316\u8F93\u5165\u5185\u5BB9",
  "pl.polishResult": "AI \u4F18\u5316\u7ED3\u679C",
  "pl.polishResultAria": "\u4F18\u5316\u7ED3\u679C",
  "pl.summaryLabel": "AI \u6458\u8981",
  "pl.replaceContent": "\u66FF\u6362\u5185\u5BB9",
  // 侧边栏
  "pl.sidebar.uncategorized": "\u672A\u5206\u7C7B",
  "pl.sidebar.groupCount": "({count})",
  "pl.saveToLibrary": "\u4FDD\u5B58\u5230\u8BCD\u5E93",
  "pl.ctx.dataManagement": "\u6570\u636E\u7BA1\u7406",
  "pl.ctx.personas": "\u4EBA\u683C\u7BA1\u7406",
  "pl.ctx.tags": "\u6807\u7B7E",
  "pl.ctx.trash": "\u56DE\u6536\u7AD9",
  "pl.ctx.workspaceInstructions": "\u6280\u80FD\u7BA1\u7406",
  // 数据管理弹窗（左侧词库菜单「数据管理」入口）
  "pl.lexicon.title": "\u6570\u636E\u7BA1\u7406",
  "pl.lexicon.desc": "\u96C6\u4E2D\u7BA1\u7406\u8BCD\u5E93\u63D0\u793A\u8BCD\uFF1A\u5DE6\u4FA7\u5217\u8868\u5FEB\u901F\u6D4F\u89C8\uFF0C\u53F3\u4FA7\u9884\u89C8\u6216\u7F16\u8F91\u8BE6\u60C5\uFF0C\u5217\u8868\u9876\u90E8\u53EF\u65B0\u5EFA\u63D0\u793A\u8BCD\u3002",
  "pl.lexicon.listTitle": "\u63D0\u793A\u8BCD\u5217\u8868",
  "pl.lexicon.viewTags": "\u6807\u7B7E",
  "pl.lexicon.viewTrash": "\u56DE\u6536\u7AD9",
  "pl.lexicon.listView": "\u5217\u8868",
  "pl.lexicon.groupView": "\u5206\u7C7B",
  "pl.lexicon.new": "\u65B0\u5EFA",
  "pl.lexicon.newDone": "\u5DF2\u65B0\u5EFA\u63D0\u793A\u8BCD",
  "pl.lexicon.saved": "\u5DF2\u4FDD\u5B58\u4FEE\u6539",
  "pl.lexicon.edit": "\u7F16\u8F91",
  "pl.lexicon.previewEmpty": "\u8BF7\u5728\u5DE6\u4FA7\u5217\u8868\u9009\u62E9\u4E00\u6761\u63D0\u793A\u8BCD\u67E5\u770B\u8BE6\u60C5",
  "pl.lexicon.creatingTitle": "\u65B0\u5EFA\u63D0\u793A\u8BCD",
  "pl.lexicon.editingTitle": "\u7F16\u8F91\u63D0\u793A\u8BCD",
  "pl.lexicon.deleteDone": "\u5DF2\u5220\u9664",
  "pl.lexicon.noSearchResult": "\u6CA1\u6709\u5339\u914D\u7684\u63D0\u793A\u8BCD",
  "pl.lexicon.expandGroup": "\u5C55\u5F00\u8BE5\u5206\u7EC4",
  "pl.lexicon.collapseGroup": "\u6298\u53E0\u8BE5\u5206\u7EC4",
  "pl.lexicon.selectAll": "\u5168\u9009",
  "pl.lexicon.deselectAll": "\u53D6\u6D88\u5168\u9009",
  "pl.lexicon.selectedTotal": "\u5DF2\u9009 {selected} / \u5171 {total}",
  "pl.lexicon.batchDelete": "\u6279\u91CF\u5220\u9664",
  "pl.lexicon.batchDeleteDone": "\u5DF2\u5220\u9664 {count} \u6761\u63D0\u793A\u8BCD",
  "pl.lexicon.confirmBatchDelete": "\u5220\u9664\u9009\u4E2D\u7684 {count} \u6761\u63D0\u793A\u8BCD\uFF1F\u5220\u9664\u540E\u5C06\u79FB\u5165\u56DE\u6536\u7AD9\uFF0C\u53EF\u5728\u300C\u6570\u636E\u7BA1\u7406 - \u56DE\u6536\u7AD9\u300D\u4E2D\u6062\u590D\u3002",
  "pl.lexicon.createdAt": "\u521B\u5EFA\u65F6\u95F4",
  "pl.lexicon.updatedAt": "\u66F4\u65B0\u65F6\u95F4",
  "pl.lexicon.usage": "\u4F7F\u7528\u6B21\u6570",
  "pl.lexicon.usageUnit": "\u6B21",
  "pl.lexicon.lastUsed": "\u4E0A\u6B21\u4F7F\u7528",
  "pl.lexicon.neverUsed": "\u4ECE\u672A\u4F7F\u7528",
  "pl.lexicon.summary": "AI \u6458\u8981",
  "pl.lexicon.noSummary": "\u6682\u65E0\u6458\u8981",
  "pl.personas.title": "\u4EBA\u683C\u7BA1\u7406",
  "pl.personas.listTitle": "\u7075\u9B42\u7BA1\u7406",
  "pl.personas.listHint": "\u521B\u5EFA\u3001\u7F16\u8F91\u591A\u4EFD\u4EBA\u683C\uFF08SOUL\uFF09\uFF0C\u5E76\u7ED1\u5B9A\u5230\u5DE5\u4F5C\u533A / \u9879\u76EE",
  "pl.personas.createTitle": "\u65B0\u5EFA\u7075\u9B42",
  "pl.personas.createHint": "\u7ED9\u65B0\u4EBA\u683C\u8D77\u4E2A\u540D\u5B57\uFF0C\u521B\u5EFA\u540E\u4F1A\u7ACB\u5373\u8FDB\u5165\u6B63\u6587\u7F16\u8F91",
  "pl.personas.previewEmpty": "\u6682\u65E0\u5185\u5BB9\uFF0C\u70B9\u300C\u7F16\u8F91\u300D\u5F00\u59CB\u7F16\u5199",
  "pl.personas.namePlaceholder": "\u7ED9\u5B83\u8D77\u4E2A\u540D\u5B57",
  "pl.personas.defaultBadge": "\u9ED8\u8BA4",
  "pl.personas.enabled": "\u542F\u7528",
  "pl.personas.edit": "\u7F16\u8F91",
  "pl.personas.cancel": "\u53D6\u6D88",
  "pl.personas.save": "\u4FDD\u5B58",
  "pl.personas.delete": "\u5220\u9664",
  "pl.personas.contentLabel": "\u4EBA\u683C\u5185\u5BB9\uFF08SOUL\uFF09",
  "pl.personas.contentHint": "\u6B64\u5185\u5BB9\u968F\u5BF9\u8BDD\u6CE8\u5165\uFF0C\u7EA6\u675F AI \u7684\u8EAB\u4EFD / \u8BED\u6C14 / \u5DE5\u4F5C\u89C4\u8303",
  "pl.personas.viewDetail": "\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5",
  "pl.personas.detailTitle": "\u4EBA\u683C\u8BE6\u60C5",
  "pl.personas.detailEmpty": "\u8BE5\u4EBA\u683C\u6682\u65E0\u5185\u5BB9",
  "pl.personas.empty": "\u6682\u65E0\u81EA\u5B9A\u4E49\u4EBA\u683C\uFF0C\u70B9\u53F3\u4E0A\u89D2\u300C\u65B0\u5EFA\u4EBA\u683C\u300D\u5F00\u59CB\u521B\u5EFA",
  "pl.personas.note": "\u4EBA\u683C\u6309\u300C\u5DE5\u4F5C\u533A / \u9879\u76EE\u300D\u7ED1\u5B9A\uFF1A\u5728\u8BE5\u8DEF\u5F84\u4E0B\u6253\u5F00\u7684\u4F1A\u8BDD\u81EA\u52A8\u91C7\u7528\u5BF9\u5E94\u7684 SOUL\uFF1B\u672A\u7ED1\u5B9A\u7684\u8DEF\u5F84\u56DE\u843D\u5230\u9ED8\u8BA4\u4EBA\u683C\u6216\u4E0A\u5C42\u7ED1\u5B9A",
  "pl.personas.deleteConfirm": "\u786E\u5B9A\u5220\u9664\u4EBA\u683C\u300C{name}\u300D\uFF1F\u5176\u4F1A\u8BDD\u7ED1\u5B9A\u4E0E SOUL \u6587\u4EF6\u5C06\u4E00\u5E76\u5220\u9664",
  "pl.personas.nameError": "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
  "pl.personas.opFailed": "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
  "pl.personas.clearAllTitle": "\u4E00\u952E\u6E05\u7A7A\u4EBA\u683C\u7ED1\u5B9A\uFF08\u6240\u6709\u8DEF\u5F84\u4E0E\u4F1A\u8BDD\u7684\u4EBA\u683C\u7ED1\u5B9A\uFF0C\u4E0D\u5F71\u54CD\u6280\u80FD\u7ED1\u5B9A\uFF09",
  "pl.personas.clearAllConfirm": "\u786E\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u4EBA\u683C\u7ED1\u5B9A\u5417\uFF1F\u5C06\u6E05\u9664\u5168\u90E8\u5DE5\u4F5C\u533A/\u9879\u76EE\u548C\u4F1A\u8BDD\u7ED1\u5B9A\u7684\u4EBA\u683C\uFF0C\u6280\u80FD\u7ED1\u5B9A\u4E0D\u53D7\u5F71\u54CD\u3002",
  "pl.personas.exportDone": "\u5DF2\u5BFC\u51FA {count} \u4E2A\u4EBA\u683C",
  "pl.personas.importDone": "\u5DF2\u5BFC\u5165 {count} \u4E2A\u4EBA\u683C",
  "pl.personas.modifyDone": "\u5DF2\u4FEE\u6539\u4EBA\u683C\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.personas.enableOn": "\u5DF2\u542F\u7528\u4EBA\u683C\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.personas.enableOff": "\u5DF2\u7981\u7528\u4EBA\u683C\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.personas.bindDone": "\u4EBA\u683C\u7ED1\u5B9A\u5DF2\u66F4\u65B0\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.personas.importEmpty": "\u6240\u9009\u6587\u4EF6\u5185\u5BB9\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u5BFC\u5165",
  "pl.personas.importFailed": "\u5BFC\u5165\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u5185\u5BB9",
  "pl.personas.importConfirmTitle": "\u786E\u8BA4\u5BFC\u5165\u4EBA\u683C",
  "pl.personas.importConfirmHeadline": "\u5C06\u65B0\u5EFA\u4EBA\u683C\u300C{name}\u300D\uFF0C\u6B63\u6587\u9884\u89C8\u5982\u4E0B\u3002\u786E\u8BA4\u65E0\u8BEF\u540E\u5F00\u59CB\u5BFC\u5165\u3002",
  "pl.personas.disabledEditHint": "\u8BE5\u4EBA\u683C\u672A\u542F\u7528\uFF0C\u542F\u7528\u540E\u624D\u80FD\u7F16\u8F91",
  "pl.personas.disabledDeleteHint": "\u8BE5\u4EBA\u683C\u672A\u542F\u7528\uFF0C\u542F\u7528\u540E\u624D\u80FD\u5220\u9664",
  "pl.personas.scopes.title": "\u5DE5\u4F5C\u533A / \u9879\u76EE\u7ED1\u5B9A",
  "pl.personas.scopes.hint": "\u4E3A\u67D0\u4E2A\u5DE5\u4F5C\u533A\u6216\u9879\u76EE\u6307\u5B9A\u4EBA\u683C\uFF0C\u53EF\u5C40\u90E8\u8986\u76D6\u4E0A\u5C42\uFF1A\u9879\u76EE\u672A\u5355\u72EC\u8BBE\u5B9A\u65F6\uFF0C\u4F1A\u6CBF\u7528\u5176\u4E0A\u5C42\u5DE5\u4F5C\u533A\u7684\u7ED1\u5B9A",
  "pl.personas.scopes.defaultOption": "\u9ED8\u8BA4\uFF08\u8DDF\u968F\u4E0A\u5C42\uFF09",
  "pl.personas.scopes.empty": "\u6682\u65E0\u53EF\u7528\u5DE5\u4F5C\u533A",
  "pl.personas.scopes.workspace": "\u5DE5\u4F5C\u533A",
  "pl.personas.scopes.project": "\u9879\u76EE",
  "pl.personas.scopes.others": "\u5176\u4ED6\u4F1A\u8BDD",
  "pl.ai.generate": "AI \u751F\u6210",
  "pl.ai.generating": "AI \u751F\u6210\u4E2D\u2026",
  "pl.ai.genNeedTitle": "\u8BF7\u5148\u586B\u5199\u6807\u9898",
  "pl.ai.genFailed": "AI \u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1",
  "pl.ai.genDone": "\u5DF2\u751F\u6210\u8349\u7A3F\uFF0C\u53EF\u68C0\u67E5\u540E\u4FDD\u5B58",
  "pl.inject.title": "\u6280\u80FD\u7BA1\u7406",
  "pl.inject.projectNote": "\u4E3A\u67D0\u4E2A\u5DE5\u4F5C\u533A\u6216\u9879\u76EE\u7ED1\u5B9A\u4F1A\u8BDD\u7EA7\u6280\u80FD\uFF1A\u5728\u8BE5\u8DEF\u5F84\u4E0B\u6253\u5F00\u7684\u4F1A\u8BDD\u4F1A\u81EA\u52A8\u6CE8\u5165\uFF1B\u9879\u76EE\u672A\u5355\u72EC\u914D\u7F6E\u65F6\u6CBF\u7528\u4E0A\u5C42\u5DE5\u4F5C\u533A\u7684\u7ED1\u5B9A",
  "pl.diag.title": "\u5F53\u524D\u4F1A\u8BDD\u89E3\u6790",
  "pl.diag.session": "\u5355\u4F1A\u8BDD",
  "pl.diag.workspace": "\u5DE5\u4F5C\u533A/\u8DEF\u5F84",
  "pl.diag.default": "\u9ED8\u8BA4",
  "pl.diag.noSkill": "\u672A\u547D\u4E2D",
  "pl.diag.current": "\u4E34\u65F6",
  "pl.diag.cwd": "\u5DE5\u4F5C\u76EE\u5F55",
  "pl.diag.selected": "\u67E5\u770B \xB7 {name}",
  "pl.diag.back": "\u8FD4\u56DE\u5F53\u524D\u4F1A\u8BDD",
  "pl.diag.path": "\u7ED1\u5B9A\u8DEF\u5F84",
  "pl.inject.empty": "\u6682\u65E0\u4F1A\u8BDD\u7EA7\u6280\u80FD\uFF0C\u53EF\u70B9\u4E0A\u65B9\u300C\u65B0\u5EFA\u6280\u80FD\u300D\u521B\u5EFA",
  "pl.inject.boundCount": "{count} \u6761",
  "pl.inject.config": "\u914D\u7F6E",
  "pl.inject.cancelConfig": "\u6536\u8D77",
  "pl.inject.clearBinding": "\u6E05\u9664\u7ED1\u5B9A",
  "pl.inject.opFailed": "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
  "pl.inject.clearAll": "\u6E05\u9664\u7ED1\u5B9A",
  "pl.inject.clearAllTitle": "\u4E00\u952E\u6E05\u7A7A\u6280\u80FD\u7ED1\u5B9A\uFF08\u6240\u6709\u8DEF\u5F84\u4E0E\u4F1A\u8BDD\u7684\u6280\u80FD\u7ED1\u5B9A\uFF0C\u4E0D\u5F71\u54CD\u4EBA\u683C\u7ED1\u5B9A\uFF09",
  "pl.inject.clearAllConfirm": "\u786E\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u6280\u80FD\u7ED1\u5B9A\u5417\uFF1F\u5C06\u6E05\u9664\u5168\u90E8\u5DE5\u4F5C\u533A/\u9879\u76EE\u548C\u4F1A\u8BDD\u7ED1\u5B9A\u7684\u6280\u80FD\uFF0C\u4EBA\u683C\u7ED1\u5B9A\u4E0D\u53D7\u5F71\u54CD\u3002",
  "pl.inject.note": "\u4F1A\u8BDD\u7EA7\u6280\u80FD\uFF1A\u6807\u9898\u3001\u6B63\u6587\u3001\u6807\u7B7E\u3001\u542F\u7528\u72B6\u6001\u7B49\u5168\u90E8\u5B58\u4E8E\u6570\u636E\u5E93\uFF08prompts.db \u7684 session_prompts \u8868\uFF09\uFF1B\u5DE6\u4FA7\u7BA1\u7406\u6280\u80FD\uFF0C\u53F3\u4FA7\u7ED1\u5B9A\u5230\u5DE5\u4F5C\u533A / \u9879\u76EE\u540E\u81EA\u52A8\u6CE8\u5165",
  "pl.inject.listTitle": "\u6280\u80FD\u7BA1\u7406",
  "pl.inject.listHint": "\u521B\u5EFA\u3001\u7F16\u8F91\u4F1A\u8BDD\u7EA7\u6280\u80FD\uFF1B\u5230\u53F3\u4FA7\u628A\u6280\u80FD\u7ED1\u5B9A\u5230\u5DE5\u4F5C\u533A / \u9879\u76EE\u540E\u5373\u53EF\u81EA\u52A8\u6CE8\u5165",
  "pl.inject.createHint": "\u7ED9\u65B0\u6280\u80FD\u8D77\u4E2A\u6807\u9898\uFF0C\u521B\u5EFA\u540E\u4F1A\u7ACB\u5373\u8FDB\u5165\u6B63\u6587\u7F16\u8F91",
  "pl.inject.namePlaceholder": "\u7ED9\u5B83\u8D77\u4E2A\u6807\u9898",
  "pl.inject.enabled": "\u542F\u7528",
  "pl.inject.bindSearchPlaceholder": "\u641C\u7D22\u53EF\u7ED1\u5B9A\u6280\u80FD\u2026",
  "pl.inject.bindNoMatch": "\u6CA1\u6709\u5339\u914D\u7684\u6280\u80FD",
  "pl.inject.selectedCount": "\u5DF2\u9009 {count} \u6761",
  "pl.inject.previewEmpty": "\u6682\u65E0\u5185\u5BB9\uFF0C\u70B9\u300C\u7F16\u8F91\u300D\u5F00\u59CB\u7F16\u5199",
  "pl.inject.contentLabel": "\u6280\u80FD\u6B63\u6587",
  "pl.inject.tagLabel": "\u6807\u7B7E",
  "pl.inject.tagPlaceholder": "\u81EA\u5B9A\u4E49\u6807\u7B7E\uFF088 \u5B57\u4EE5\u5185\uFF09",
  "pl.inject.contentHint": "\u6B64\u5185\u5BB9\u968F\u6D88\u606F\u6CE8\u5165\u7ED9 AI\uFF0C\u7EA6\u675F\u5BF9\u8BDD\u884C\u4E3A",
  "pl.inject.viewDetail": "\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5",
  "pl.inject.detailTitle": "\u6280\u80FD\u8BE6\u60C5",
  "pl.inject.detailEmpty": "\u8BE5\u6280\u80FD\u6682\u65E0\u6B63\u6587",
  "pl.inject.exportDone": "\u5DF2\u5BFC\u51FA {count} \u6761\u6280\u80FD",
  "pl.inject.importDone": "\u5DF2\u5BFC\u5165 {count} \u6761\u6280\u80FD",
  "pl.inject.modifyDone": "\u5DF2\u4FEE\u6539\u6280\u80FD\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.inject.enableOn": "\u5DF2\u542F\u7528\u6280\u80FD\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.inject.enableOff": "\u5DF2\u7981\u7528\u6280\u80FD\u300C{name}\u300D\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.inject.bindDone": "\u6280\u80FD\u7ED1\u5B9A\u5DF2\u66F4\u65B0\uFF0C\u7EE7\u7EED\u5BF9\u8BDD\u540E\u5BF9\u65B0\u6D88\u606F\u751F\u6548",
  "pl.inject.importEmpty": "\u6240\u9009\u6587\u4EF6\u5185\u5BB9\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u5BFC\u5165",
  "pl.inject.importFailed": "\u5BFC\u5165\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u5185\u5BB9",
  "pl.inject.importConfirmTitle": "\u786E\u8BA4\u5BFC\u5165\u6280\u80FD",
  "pl.inject.importConfirmHeadline": "\u5C06\u5BFC\u5165\u6280\u80FD\u300C{name}\u300D\uFF0C\u6B63\u6587\u9884\u89C8\u5982\u4E0B\u3002\u786E\u8BA4\u65E0\u8BEF\u540E\u5F00\u59CB\u5BFC\u5165\u3002",
  "pl.inject.disabledEditHint": "\u8BE5\u6280\u80FD\u672A\u542F\u7528\uFF0C\u542F\u7528\u540E\u624D\u80FD\u7F16\u8F91",
  "pl.inject.disabledDeleteHint": "\u8BE5\u6280\u80FD\u672A\u542F\u7528\uFF0C\u542F\u7528\u540E\u624D\u80FD\u5220\u9664",
  "pl.inject.disabledBindHint": "\u8BE5\u6280\u80FD\u672A\u542F\u7528\uFF0C\u4E0D\u80FD\u65B0\u7ED1\u5B9A\uFF08\u5DF2\u6709\u7ED1\u5B9A\u4ECD\u4FDD\u7559\uFF09",
  "pl.harnessSkill.title": "Harness \u6280\u80FD\u5F00\u5173",
  "pl.harnessSkill.btn": "\u6280\u80FD\u5F00\u5173",
  "pl.harnessSkill.btnTitle": "\u6253\u5F00 harness \u6280\u80FD\u8F6F\u63A7\u5236\u5F00\u5173\uFF1A\u5217\u51FA\u7CFB\u7EDF\u901A\u7528\u4E0E\u9879\u76EE\u6280\u80FD\uFF0C\u5173\u95ED\u540E\u5176\u540D\u79F0\u4F1A\u6CE8\u5165\u7CFB\u7EDF\u63D0\u793A\uFF0C\u6A21\u578B\u9ED8\u8BA4\u4E0D\u518D\u81EA\u52A8\u4F7F\u7528",
  "pl.harnessSkill.note": "\u8FD9\u4E9B\u6280\u80FD\u7531 harness \u5728\u6BCF\u6B21\u4F1A\u8BDD\u5F00\u5934\u81EA\u52A8\u6CE8\u5165\uFF0C\u6B64\u5904\u53EA\u80FD\u300C\u8F6F\u63A7\u5236\u300D\uFF1A\u5173\u95ED\u67D0\u6280\u80FD\u540E\uFF0C\u5176\u540D\u79F0\u4F1A\u5199\u8FDB\u7CFB\u7EDF\u63D0\u793A\u7684\u300C\u5DF2\u7981\u7528\u6E05\u5355\u300D\uFF0C\u6A21\u578B\u9ED8\u8BA4\u4E0D\u518D\u81EA\u52A8\u8C03\u7528\u5B83\uFF1B",
  "pl.harnessSkill.noteProject": "\u8FD9\u4E9B\u6280\u80FD\u7531 harness \u5728\u6BCF\u6B21\u4F1A\u8BDD\u5F00\u5934\u81EA\u52A8\u6CE8\u5165\uFF0C\u6B64\u5904\u53EA\u80FD\u300C\u8F6F\u63A7\u5236\u300D\uFF1A\u5173\u95ED\u67D0\u6280\u80FD\u540E\uFF0C\u5176\u540D\u79F0\u4F1A\u5199\u8FDB\u7CFB\u7EDF\u63D0\u793A\u7684\u300C\u5DF2\u7981\u7528\u6E05\u5355\u300D\uFF0C\u6A21\u578B\u9ED8\u8BA4\u4E0D\u518D\u81EA\u52A8\u8C03\u7528\u5B83\u3002\u5F53\u524D\u9879\u76EE\uFF1A{project}",
  "pl.harnessSkill.systemTitle": "\u7CFB\u7EDF\u901A\u7528\u6280\u80FD",
  "pl.harnessSkill.systemHint": "\u4F4D\u4E8E ~/.dsh/skills\uFF0C\u5BF9\u6240\u6709\u4F1A\u8BDD\u751F\u6548",
  "pl.harnessSkill.projectTitle": "\u9879\u76EE\u6280\u80FD",
  "pl.harnessSkill.projectHint": "\u4F4D\u4E8E\u5F53\u524D\u9879\u76EE .dsh/skills\uFF0C\u4EC5\u5BF9\u8BE5\u9879\u76EE\u4E0B\u7684\u4F1A\u8BDD\u751F\u6548",
  "pl.harnessSkill.empty": "\u6682\u65E0\u6280\u80FD",
  "pl.harnessSkill.enabled": "\u5DF2\u542F\u7528\u8BE5\u6280\u80FD",
  "pl.harnessSkill.disabled": "\u5DF2\u7981\u7528\u8BE5\u6280\u80FD",
  "pl.harnessSkill.deleted": "\u6280\u80FD\u5DF2\u5220\u9664",
  "pl.harnessSkill.deleteConfirm": "\u786E\u5B9A\u5220\u9664\u6280\u80FD\u300C{name}\u300D\uFF1F\u5C06\u4ECE\u6280\u80FD\u76EE\u5F55\uFF08~/.dsh/skills\uFF09\u4E2D\u6C38\u4E45\u5220\u9664",
  "pl.sessionPrompts.new": "\u65B0\u5EFA\u6280\u80FD",
  "pl.sessionPrompts.titlePlaceholder": "\u6280\u80FD\u6807\u9898\uFF0825 \u5B57\u4EE5\u5185\uFF09",
  "pl.sessionPrompts.bodyPlaceholder": "\u6280\u80FD\u6B63\u6587\uFF08\u6CE8\u5165\u5230\u7CFB\u7EDF\u63D0\u793A\u4E2D\u7684\u5185\u5BB9\uFF09",
  "pl.sessionPrompts.nameError": "\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A",
  "pl.sessionPrompts.deleteConfirm": "\u786E\u5B9A\u5220\u9664\u6280\u80FD\u300C{name}\u300D\uFF1F\u5176\u7ED1\u5B9A\u4E0E\u4E34\u65F6\u6CE8\u5165\u5F15\u7528\u5C06\u4E00\u5E76\u6E05\u7406",
  "pl.achievements.loading": "\u52A0\u8F7D\u4E2D\u2026",
  // 导入导出 / 备份恢复
  "pl.moduleImportExport": "\u5BFC\u5165\u5BFC\u51FA",
  "pl.moduleImportExportDesc": "\u652F\u6301\u5E02\u9762\u5E38\u7528\u683C\u5F0F\uFF08JSON / CSV / Markdown / \u6587\u672C\uFF09\u5BFC\u5165\u5BFC\u51FA\u63D0\u793A\u8BCD\u3002",
  "pl.exportSection": "\u5BFC\u51FA",
  "pl.importSection": "\u5BFC\u5165",
  "pl.importSectionDesc": "\u4ECE\u6570\u636E\u6587\u4EF6\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u3001\u6821\u9A8C\u540E\u5408\u5E76\u5165\u5E93\u3002",
  "pl.previewEmpty": "\u70B9\u51FB\u5DE6\u4FA7\u5217\u8868\u9879\uFF0C\u5728\u6B64\u67E5\u770B\u8BE6\u60C5",
  "pl.previewUsage": "{count}\u6B21",
  "pl.moduleTags": "\u6807\u7B7E\u7BA1\u7406",
  "pl.moduleTagsDesc": "\u96C6\u4E2D\u7BA1\u7406\u63D0\u793A\u8BCD\u6807\u7B7E\uFF0C\u652F\u6301\u65B0\u5EFA / \u91CD\u547D\u540D / \u5220\u9664\u3002",
  "pl.moduleTrash": "\u56DE\u6536\u7AD9",
  "pl.moduleTrashDesc": "\u96C6\u4E2D\u7BA1\u7406\u5DF2\u5220\u9664\u7684\u63D0\u793A\u8BCD\uFF0C\u652F\u6301\u6062\u590D / \u6C38\u4E45\u5220\u9664\u3002",
  "pl.export": "\u5BFC\u51FA",
  "pl.import": "\u5BFC\u5165",
  "pl.importData": "\u5BFC\u5165\u6570\u636E",
  "pl.selectExport": "\u52FE\u9009\u4EE5\u5BFC\u51FA",
  "pl.exportSelectEmpty": "\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u6761\u76EE",
  "pl.exportHint": "\u52FE\u9009\u5361\u7247\u540E\u70B9\u51FB\u300C\u5BFC\u51FA\u300D\uFF0C\u6BCF\u5F20\u5BFC\u51FA\u4E3A\u4E00\u4E2A Markdown \u6587\u4EF6",
  "pl.exportPickDirTitle": "\u9009\u62E9\u672C\u5730\u76EE\u5F55\u540E\u5BFC\u51FA\u52FE\u9009\u7684\u63D0\u793A\u8BCD",
  "pl.importTitle": "\u4ECE\u5907\u4EFD\u6587\u4EF6\u5BFC\u5165\uFF08\u5408\u5E76\u5230\u5F53\u524D\u8BCD\u5E93\uFF09",
  "pl.exported": "\u5DF2\u5BFC\u51FA {count} \u6761\u63D0\u793A\u8BCD",
  "pl.exportedPath": "\u5DF2\u5BFC\u51FA {count} \u6761\u63D0\u793A\u8BCD\n\u5DF2\u4FDD\u5B58\u5230\uFF1A\n{path}",
  "pl.exportSelectAll": "\u5168\u9009",
  "pl.exportSelected": "\u5BFC\u51FA\u9009\u4E2D",
  "pl.export.selectedCount": "\u5DF2\u9009 {selected} / {total} \u6761",
  "pl.viewList": "\u5217\u8868",
  "pl.viewGroup": "\u5206\u7C7B",
  "pl.exportNeedSelect": "\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u63D0\u793A\u8BCD",
  "pl.skillImport": "\u4ECE Skills \u5BFC\u5165",
  "pl.skillImportBtnTitle": "\u6253\u5F00\u6280\u80FD\u5BFC\u5165\u5F39\u7A97\uFF1A\u9009\u62E9\u672C\u5730 md \u6587\u4EF6\u6216\u4ECE Skills \u76EE\u5F55\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u5185\u5BB9\u3001\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u4FDD\u5B58\u5165\u5E93",
  "pl.skillModal.scanSkillsEmpty": "\u6280\u80FD\u76EE\u5F55\u4E3A\u7A7A\uFF0C\u6CA1\u6709\u53EF\u5BFC\u5165\u7684 SKILL.md",
  "pl.skillModal.scanDirEmpty": "\u6240\u9009\u6587\u4EF6\u5939\u4E2D\u672A\u627E\u5230\u53EF\u5BFC\u5165\u7684 md \u6587\u4EF6",
  "pl.skillModal.scanFolder": "\u626B\u63CF\u6587\u4EF6\u5939",
  "pl.skillModal.title": "\u5BFC\u5165\u6280\u80FD",
  "pl.skillModal.subtitle": "\u9009\u62E9\u672C\u5730 md \u6587\u4EF6\u6216\u626B\u63CF Skills \u76EE\u5F55\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u5E76\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF1B\u6821\u9A8C\u901A\u8FC7\u540E\u624D\u80FD\u4FDD\u5B58\u3002",
  "pl.skillModal.chooseFile": "\u9009\u62E9 md \u6587\u4EF6",
  "pl.skillModal.scanSkills": "\u626B\u63CF Skills \u76EE\u5F55",
  "pl.skillModal.titleLabel": "\u6807\u9898",
  "pl.skillModal.tagLabel": "\u6807\u7B7E",
  "pl.skillModal.notice": "\u64CD\u4F5C\u53CD\u9988",
  "pl.skillModal.summaryLabel": "\u6458\u8981",
  "pl.skillModal.bodyLabel": "\u6B63\u6587",
  "pl.skillModal.insertVar": "\u63D2\u5165\u53D8\u91CF",
  "pl.skillModal.validate": "\u6821\u9A8C",
  "pl.skillModal.validatePass": "\u6821\u9A8C\u901A\u8FC7\uFF0C\u53EF\u4EE5\u4FDD\u5B58",
  "pl.skillModal.save": "\u4FDD\u5B58\u5230\u8BCD\u5E93",
  "pl.skillModal.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "pl.skillModal.saved": "\u4FDD\u5B58\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}",
  "pl.skillModal.savedErrors": "\uFF08\u5931\u8D25 {n} \u4E2A\uFF09",
  "pl.skillModal.noEntry": "\u5C1A\u672A\u6DFB\u52A0\u4EFB\u4F55\u6761\u76EE\uFF0C\u8BF7\u5148\u9009\u62E9 md \u6587\u4EF6\u6216\u626B\u63CF Skills \u76EE\u5F55",
  "pl.skillModal.noEntryExport": "\u5F53\u524D\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u6761\u76EE\uFF0C\u8BF7\u5148\u5728\u8BCD\u5E93\u4E2D\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u63D0\u793A\u8BCD",
  "pl.skillModal.fileError": "\u6587\u4EF6\u89E3\u6790\u5931\u8D25\uFF1A{err}",
  "pl.skillModal.remove": "\u79FB\u9664",
  "pl.skillModal.fromFile": "\u6587\u4EF6",
  "pl.skillModal.fromDisk": "\u78C1\u76D8",
  "pl.skillModal.exists": "\u5DF2\u5165\u5E93",
  "pl.skillModal.selectHint": "\u52FE\u9009\u8981\u4FDD\u5B58\u7684\u6761\u76EE",
  "pl.skillModal.emptyChecked": "\u8BF7\u5148\u52FE\u9009\u81F3\u5C11\u4E00\u4E2A\u6761\u76EE",
  "pl.skillModal.varUnclosed": "\u5B58\u5728 {n} \u4E2A\u672A\u95ED\u5408\u7684 {{{{",
  "pl.skillModal.varUnmatched": "\u5B58\u5728\u672A\u5339\u914D\u7684 }}",
  "pl.skillModal.varEmpty": "\u5B58\u5728\u7A7A\u7684 {{}} \u53D8\u91CF",
  "pl.skillModal.varInvalid": "\u53D8\u91CF\u540D\u975E\u6CD5\uFF1A{name}",
  "pl.skillModal.titleRequired": "\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A",
  "pl.skillModal.bodyRequired": "\u6B63\u6587\u4E0D\u80FD\u4E3A\u7A7A",
  "pl.skillModal.unnamed": "\u672A\u547D\u540D\u6280\u80FD",
  "pl.skillModal.issueCount": "\u5B58\u5728 {count} \u4E2A\u95EE\u9898",
  "pl.skillModal.fixAll": "\u4E00\u952E\u4FEE\u590D",
  "pl.skillModal.fixHint": "\u5176\u4E2D {fixable} \u5904\u53EF\u81EA\u52A8\u4FEE\u590D",
  "pl.skillModal.fixDone": "\u5DF2\u4FEE\u590D {count} \u5904\u95EE\u9898\uFF1A",
  "pl.skillModal.fixTitle": "\u5DF2\u8865\u5168\u6807\u9898\u300C{title}\u300D",
  "pl.skillModal.fixBodyVars": "\u5DF2\u81EA\u52A8\u4FEE\u590D\u6B63\u6587\u6A21\u677F\u53D8\u91CF\u683C\u5F0F",
  "pl.skillModal.varFixDefault": "\u53D8\u91CF",
  "pl.skillModal.fillDone": "\u5DF2\u7ED9\u6B63\u6587\u4E2D\u7684\u53D8\u91CF\u8D4B\u503C\uFF08{count} \u5904\uFF09\uFF1A",
  "pl.skillModal.fromLibrary": "\u8BCD\u5E93",
  "pl.skillModal.saveExport": "\u5199\u5165\u5230 Skills",
  "pl.skillModal.savedExport": "\u5BFC\u51FA\u5B8C\u6210\uFF1A\u5DF2\u5199\u76D8 {exported} \u4E2A\u6280\u80FD",
  "pl.skillModal.savedExportErrors": "\uFF08\u5931\u8D25 {n} \u4E2A\uFF09",
  "pl.skillModal.exportRoot": "\u5BFC\u51FA\u4F4D\u7F6E\uFF1A{root}",
  "pl.skillModal.exportTitle": "\u5BFC\u51FA\u6280\u80FD",
  "pl.skillModal.exportSubtitle": "\u9009\u62E9\u5BFC\u51FA\u8303\u56F4\uFF08\u901A\u7528 / \u9879\u76EE / \u79C1\u6709\uFF09\uFF0C\u628A\u52FE\u9009\u7684\u63D0\u793A\u8BCD\u7F16\u8F91\u4E3A\u6280\u80FD\uFF1A\u901A\u7528\u6280\u80FD\u5199\u76D8\u5230\u5168\u5C40\u6280\u80FD\u5E93\u3001\u9879\u76EE\u6280\u80FD\u5199\u5165\u5F53\u524D\u9879\u76EE\u3001\u79C1\u6709\u6280\u80FD\u7ED1\u5B9A\u5F53\u524D\u4F1A\u8BDD\u3002\u53EF\u4FEE\u6539\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\uFF1B\u300C\u6821\u9A8C\u5E76 AI \u751F\u6210\u300D\u4F1A\u5148\u6821\u9A8C\uFF0C\u901A\u8FC7\u540E\u81EA\u52A8\u7528 AI \u751F\u6210\u82F1\u6587\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\uFF0C\u518D\u5BFC\u51FA\u3002",
  "pl.skillModal.exportScope": "\u5BFC\u51FA\u8303\u56F4",
  "pl.skillModal.scopeGlobal": "\u901A\u7528\u6280\u80FD",
  "pl.skillModal.scopeGlobalDesc": "\u5199\u5165\u5168\u5C40\u6280\u80FD\u5E93\uFF0C\u6240\u6709\u4F1A\u8BDD\u751F\u6548",
  "pl.skillModal.scopeProject": "\u9879\u76EE\u6280\u80FD",
  "pl.skillModal.scopeProjectDesc": "\u5199\u5165\u5F53\u524D\u9879\u76EE\uFF0C\u4EC5\u8BE5\u9879\u76EE\u4F1A\u8BDD\u751F\u6548",
  "pl.skillModal.scopePrivate": "\u79C1\u6709\u6280\u80FD",
  "pl.skillModal.scopePrivateDesc": "\u521B\u5EFA\u4E3A\u4F1A\u8BDD\u7EA7\u6280\u80FD\u5E76\u7ED1\u5B9A\u5F53\u524D\u4F1A\u8BDD\uFF0C\u4EC5\u672C\u4F1A\u8BDD\u6CE8\u5165",
  "pl.skillModal.scopePrivatePath": "\u6570\u636E\u5E93\uFF08session_prompts \u8868\uFF09",
  "pl.skillModal.scopeGlobalHint": "\u5BFC\u51FA\u4FDD\u5B58\u81F3\u5168\u5C40\u6280\u80FD\u5E93 ~/.dsh/skills/\uFF0C\u5373\u5B58\u5373\u7528\uFF1A\u6280\u80FD\u968F\u4F1A\u8BDD\u542F\u52A8\u81EA\u52A8\u6CE8\u5165\uFF0C\u5168\u9879\u76EE\u901A\u7528\uFF0C\u65E0\u9700\u9010\u6761\u7ED1\u5B9A\u6216\u91CD\u590D\u5BFC\u5165\u3002",
  "pl.skillModal.scopePrivateHint": "\u4F5C\u4E3A\u4F1A\u8BDD\u7EA7\u6280\u80FD\u5B58\u5165\u6570\u636E\u5E93\uFF0C\u9700\u524D\u5F80\u6280\u80FD\u7BA1\u7406\u754C\u9762\u7684\u300C\u4F1A\u8BDD\u6280\u80FD\u300D\u4E2D\u67E5\u770B\u4E0E\u5BFC\u5165\u3002",
  "pl.skillModal.projectNoPath": "\u672A\u68C0\u6D4B\u5230\u5F53\u524D\u9879\u76EE\u8DEF\u5F84",
  "pl.skillModal.projectPathHint": "\u672A\u68C0\u6D4B\u5230\u5F53\u524D\u9879\u76EE\u8DEF\u5F84\uFF0C\u8BF7\u624B\u52A8\u8F93\u5165\u6216\u70B9\u51FB\u300C\u6D4F\u89C8\u300D\u9009\u62E9\u5BFC\u51FA\u8DEF\u5F84",
  "pl.skillModal.projectPathHintResolved": "\u5DF2\u81EA\u52A8\u89E3\u6790\u5F53\u524D\u9879\u76EE\u8DEF\u5F84\uFF0C\u53EF\u624B\u52A8\u4FEE\u6539\u6216\u70B9\u51FB\u300C\u6D4F\u89C8\u300D\u91CD\u65B0\u9009\u62E9",
  "pl.skillModal.projectPathResolving": "\u6B63\u5728\u89E3\u6790\u5F53\u524D\u9879\u76EE\u8DEF\u5F84\u2026",
  "pl.skillModal.projectPathPlaceholder": "\u8F93\u5165\u9879\u76EE\u8DEF\u5F84\uFF0C\u5982 D:/my-project",
  "pl.skillModal.projectPathEmpty": "\u8BF7\u5148\u586B\u5199\u5BFC\u51FA\u8DEF\u5F84",
  "pl.skillModal.browse": "\u6D4F\u89C8",
  "pl.skillModal.directoryPickerUnavailable": "\u76EE\u5F55\u9009\u62E9\u529F\u80FD\u4E0D\u53EF\u7528",
  "pl.dirPicker.title": "\u9009\u62E9\u76EE\u5F55",
  "pl.dirPicker.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "pl.dirPicker.selectCurrent": "\u9009\u62E9\u6B64\u76EE\u5F55",
  "pl.dirPicker.up": "\u4E0A\u7EA7",
  "pl.dirPicker.newFolder": "\u65B0\u5EFA\u6587\u4EF6\u5939",
  "pl.dirPicker.empty": "\u6B64\u76EE\u5F55\u4E0B\u6CA1\u6709\u5B50\u76EE\u5F55",
  "pl.dirPicker.folderPlaceholder": "\u6587\u4EF6\u5939\u540D\u79F0",
  "pl.dirPicker.browseFailed": "\u76EE\u5F55\u8BFB\u53D6\u5931\u8D25",
  "pl.dirPicker.enterHint": "\u70B9\u51FB\u5B50\u76EE\u5F55\u8FDB\u5165\uFF0C\u53F3\u4E0A\u300C\u9009\u62E9\u6B64\u76EE\u5F55\u300D\u786E\u8BA4\u5BFC\u51FA\u4F4D\u7F6E",
  "pl.skillModal.nameLabel": "\u6280\u80FD\u540D\uFF08kebab-case\uFF09",
  "pl.skillModal.nameRequired": "\u8BF7\u586B\u5199\u6280\u80FD\u540D",
  "pl.skillModal.summaryRequired": "\u8BF7\u586B\u5199\u6458\u8981",
  "pl.skillModal.aiEnhance": "AI \u8865\u5145",
  "pl.skillModal.aiEnhanceHint": "\u7528 AI \u81EA\u52A8\u8865\u5168\u6280\u80FD\u540D\u4E0E\u6458\u8981\uFF0C\u8865\u5145\u5B8C\u6210\u540E\u8BF7\u6821\u9A8C",
  "pl.skillModal.aiEnhancing": "AI \u8865\u5145\u4E2D {done}/{total}\uFF0C\u6B63\u5728\u751F\u6210\u6280\u80FD\u540D\u4E0E\u6458\u8981\u2026",
  "pl.skillModal.aiDone": "AI \u8865\u5145\u5B8C\u6210\uFF1A\u5DF2\u751F\u6210 {done} \u6761\u6280\u80FD\u540D\u4E0E\u6458\u8981",
  "pl.skillModal.aiDoneErrors": "AI \u8865\u5145\u5B8C\u6210\uFF1A\u6210\u529F {done} \u6761\uFF0C\u5931\u8D25 {n} \u6761",
  "pl.skillModal.aiUnavailable": "AI \u670D\u52A1\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u751F\u6210\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\u3002\u8BF7\u5148\u8FDE\u63A5 LLM \u670D\u52A1\u3002",
  "pl.skillModal.aiEmpty": "AI \u8FD4\u56DE\u7A7A\u7ED3\u679C\uFF0C\u81EA\u52A8\u91CD\u8BD5\u540E\u4ECD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",
  "pl.skillModal.aiParse": "AI \u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\u4E3A\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\uFF0C\u8BF7\u91CD\u8BD5",
  "pl.skillModal.aiNoRoute": "\u672A\u627E\u5230\u53EF\u7528\u6A21\u578B\uFF0C\u8BF7\u68C0\u67E5\u6A21\u578B\u914D\u7F6E",
  "pl.skillModal.aiFailed": "AI \u751F\u6210\u5931\u8D25",
  "pl.skillModal.uploadJson": "\u4E0A\u4F20 JSON",
  "pl.skillModal.uploadJsonTitle": "\u4ECE JSON \u6587\u4EF6\u6DFB\u52A0\u81EA\u5B9A\u4E49\u6280\u80FD\u6761\u76EE\uFF1A\u652F\u6301\u6570\u7EC4\u6216 skills/entries/prompts \u5217\u8868\uFF0C\u6BCF\u6761\u9700\u5305\u542B title \u4E0E body\uFF0C\u53EF\u9009 name/summary/promptId",
  "pl.skillModal.fromJson": "JSON",
  "pl.skillModal.jsonError": "JSON \u89E3\u6790\u5931\u8D25\uFF1A{err}",
  "pl.skillModal.jsonEmpty": "JSON \u4E2D\u672A\u627E\u5230\u6709\u6548\u7684\u6280\u80FD\u6761\u76EE\uFF08\u6BCF\u6761\u9700\u5305\u542B\u6807\u9898\u4E0E\u6B63\u6587\uFF09",
  "pl.skillExport": "\u5BFC\u51FA Skill",
  "pl.skillExportBtnTitle": "\u628A\u52FE\u9009\u7684\u63D0\u793A\u8BCD\u5BFC\u51FA\u4E3A DSH \u6280\u80FD\uFF08\u5F39\u51FA\u7F16\u8F91\u6821\u9A8C\u7A97\u53E3\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u5199\u5165 ~/.dsh/skills/<name>/SKILL.md\uFF09",
  "pl.skillExportNeedSelect": "\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u51FA\u6280\u80FD\u7684\u63D0\u793A\u8BCD",
  "pl.confirm": "\u786E\u5B9A",
  // 导入编辑弹窗（词库管理导入）
  "pl.importEdit.title": "\u5BFC\u5165\u63D0\u793A\u8BCD",
  "pl.importEdit.subtitle": "\u9009\u62E9\u5BFC\u5165\u6570\u636E\u540E\u5728\u6B64\u9884\u89C8\u4E0E\u7F16\u8F91\uFF0C\u53EF\u4FEE\u6539\u6807\u9898\u3001\u6807\u7B7E\u4E0E\u6B63\u6587\u5E76\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF1B\u52FE\u9009\u53C2\u4E0E\u5BFC\u5165\u7684\u6761\u76EE\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u624D\u80FD\u5BFC\u5165\u3002",
  "pl.importEdit.tagsLabel": "\u65E0\u6807\u7B7E",
  "pl.importEdit.fromTxt": "\u6587\u672C",
  "pl.importEdit.noEntry": "\u672A\u89E3\u6790\u51FA\u4EFB\u4F55\u6709\u6548\u6761\u76EE\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6570\u636E\u6587\u4EF6",
  "pl.importEdit.validatePass": "\u6821\u9A8C\u901A\u8FC7\uFF0C\u53EF\u4EE5\u5BFC\u5165",
  "pl.importEdit.untitledPrompt": "\u672A\u547D\u540D\u63D0\u793A\u8BCD",
  "pl.importEdit.import": "\u5BFC\u5165",
  "pl.importEdit.importing": "\u5BFC\u5165\u4E2D\u2026",
  "pl.importEdit.deselectAll": "\u53D6\u6D88\u5168\u9009",
  "pl.importEdit.parseEmpty": "\u672A\u4ECE\u6587\u4EF6\u4E2D\u89E3\u6790\u51FA\u6709\u6548\u6570\u636E",
  "pl.importEdit.parseFail": "\u89E3\u6790\u6587\u4EF6\u5931\u8D25\uFF1A{err}",
  "pl.aiStateDone": "\u5DF2\u5B8C\u5584",
  "pl.aiStatePending": "\u672A\u5B8C\u5584",
  // 导入导出格式
  "pl.exportFormat": "\u5BFC\u51FA\u683C\u5F0F",
  "pl.format.txt": "\u6587\u672C",
  "pl.imported": "\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}\u3001\u8DF3\u8FC7 {skipped}",
  // 导入/导出逐条结果
  // 词库助手活动阶段气泡
  // 标签集中管理
  "pl.tagsNone": "\u6682\u65E0\u6807\u7B7E",
  "pl.tagsEmpty": "\u65E0\u6807\u7B7E",
  "pl.renameTag": "\u91CD\u547D\u540D",
  "pl.renameTagPlaceholder": "\u65B0\u6807\u7B7E\u540D",
  "pl.renameTagEmpty": "\u8BF7\u8F93\u5165\u65B0\u6807\u7B7E\u540D",
  "pl.renameTagNoChange": "\u6807\u7B7E\u540D\u6CA1\u6709\u53D8\u5316",
  "pl.deleteTag": "\u5220\u9664",
  "pl.deleteTagConfirm": "\u786E\u8BA4\u79FB\u9664\u6807\u7B7E\u300C{name}\u300D\uFF1F",
  "pl.deleteTagInUse": '\u6807\u7B7E "{name}" \u6B63\u5728\u88AB {count} \u6761\u63D0\u793A\u8BCD\u4F7F\u7528\uFF0C\u9700\u5148\u5728\u63D0\u793A\u8BCD\u4E2D\u79FB\u9664\u8BE5\u6807\u7B7E\u540E\u624D\u80FD\u5220\u9664\u3002',
  "pl.deleteTagInUseTitle": "\u8BE5\u6807\u7B7E\u6B63\u5728\u88AB {count} \u6761\u63D0\u793A\u8BCD\u4F7F\u7528\uFF0C\u6682\u4E0D\u53EF\u5220\u9664\uFF1B\u8BF7\u5148\u5728\u63D0\u793A\u8BCD\u4E2D\u79FB\u9664\u540E\u91CD\u8BD5",
  "pl.renameTagDone": "\u5DF2\u91CD\u547D\u540D\u6807\u7B7E\u300C{name}\u300D",
  "pl.deleteTagDone": "\u5DF2\u5220\u9664\u6807\u7B7E\u300C{name}\u300D",
  "pl.createTag": "\u65B0\u5EFA\u6807\u7B7E",
  "pl.createTagEmpty": "\u8BF7\u8F93\u5165\u6807\u7B7E\u540D",
  "pl.createTagPlaceholder": "\u8F93\u5165\u65B0\u6807\u7B7E\u540D",
  "pl.createTagDone": "\u5DF2\u65B0\u5EFA\u6807\u7B7E\u300C{name}\u300D",
  // 回收站管理
  "pl.trashEmpty": "\u56DE\u6536\u7AD9\u4E3A\u7A7A",
  "pl.trashDeletedAt": "\u5220\u9664\u4E8E {time}",
  "pl.trashSelectAll": "\u5168\u9009",
  "pl.trashDeselectAll": "\u53D6\u6D88\u5168\u9009",
  "pl.trashRestoreSelected": "\u6279\u91CF\u6062\u590D",
  "pl.trashRestoreSelectedConfirm": "\u6062\u590D\u9009\u4E2D\u7684 {count} \u6761\u63D0\u793A\u8BCD\uFF1F",
  "pl.trashDeleteSelected": "\u6279\u91CF\u5220\u9664",
  "pl.trashDeleteConfirm": "\u6C38\u4E45\u5220\u9664\u9009\u4E2D\u7684 {count} \u6761\u63D0\u793A\u8BCD\uFF1F\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002",
  "pl.trashRestoreDone": "\u5DF2\u6062\u590D {count} \u6761\u63D0\u793A\u8BCD",
  "pl.trashDeleteDone": "\u5DF2\u6C38\u4E45\u5220\u9664 {count} \u6761\u63D0\u793A\u8BCD",
  "pl.trashRestoreOne": "\u6062\u590D",
  "pl.trashDeleteOne": "\u5220\u9664",
  "pl.trashRestoreOneConfirm": '\u6062\u590D "{title}"\uFF1F',
  "pl.trashDeleteOneConfirm": '\u6C38\u4E45\u5220\u9664 "{title}"\uFF1F\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002',
  "pl.trashCleanupNote": "\u5220\u9664\u8D85\u8FC7 30 \u5929\u7684\u5185\u5BB9\u5C06\u81EA\u52A8\u6C38\u4E45\u6E05\u9664\u3002",
  "pl.trashDaysLeft": "\u5269\u4F59 {n} \u5929",
  // 模板变量占位符
  "pl.template.title": "\u586B\u5145\u6A21\u677F\u53D8\u91CF",
  "pl.template.desc": "\u8BE5\u63D0\u793A\u8BCD\u5305\u542B\u53D8\u91CF\u5360\u4F4D\u7B26\uFF0C\u63D2\u5165\u524D\u8BF7\u586B\u5199\u5B9E\u9645\u5185\u5BB9\uFF1B\u7559\u7A7A\u7684\u53D8\u91CF\u5C06\u4FDD\u7559\u4E3A {{\u53D8\u91CF\u540D}}\u3002",
  "pl.template.preview": "\u5B9E\u65F6\u9884\u89C8\uFF08\u9AD8\u4EAE\u4E3A\u586B\u5165\u5185\u5BB9\uFF09",
  "pl.template.unfilled": "\u8BF7\u5148\u586B\u5199\u5168\u90E8\u53D8\u91CF\uFF08\u8FD8\u6709 {count} \u4E2A\u672A\u586B\uFF09",
  // 选中添加提示词
  "pl.copySelected": "\u590D\u5236\u9009\u4E2D\u6587\u5B57",
  "pl.copiedSelected": "\u5DF2\u590D\u5236",
  "pl.applyTemplate": "\u5957\u6A21\u677F",
  "pl.applyTemplateDesc": "\u5DF2\u9009\u4E2D {length} \u4E2A\u5B57\u7B26\uFF0C\u8BF7\u9009\u62E9\u8981\u5957\u7528\u7684\u6A21\u677F\uFF08\u542B {{\u53D8\u91CF}} \u7684\u63D0\u793A\u8BCD\uFF09",
  "pl.applyTemplateEmpty": "\u8BCD\u5E93\u4E2D\u8FD8\u6CA1\u6709\u542B\u53D8\u91CF\u7684\u6A21\u677F\uFF0C\u53EF\u5148\u5728\u8BCD\u5E93\u4E2D\u521B\u5EFA",
  "pl.selectionMore": "\u66F4\u591A\u64CD\u4F5C",
  "pl.selectionSetDefault": "\u8BBE\u4E3A\u9ED8\u8BA4",
  "pl.selectionIsDefault": "\u9ED8\u8BA4",
  // 上下文提示词推荐
  "pl.recommend": "\u63A8\u8350",
  "pl.set.contextRecommend": "\u4E0A\u4E0B\u6587\u63D0\u793A\u8BCD\u63A8\u8350",
  "pl.set.contextRecommendDesc": "\u8F93\u5165\u6846\u4E3A\u7A7A\u65F6\uFF0C\u4F9D\u636E\u6700\u8FD1\u804A\u5929\u4E0A\u4E0B\u6587\u5728\u8F93\u5165\u6846\u4E0A\u65B9\u63A8\u8350\u5339\u914D\u7684\u63D0\u793A\u8BCD\uFF0C\u70B9\u51FB\u5373\u63D2\u5165\u8349\u7A3F",
  // 设置
  "pl.set.panelWidth": "\u804A\u5929\u6846\u63D0\u793A\u8BCD\u9762\u677F\u5BBD\u5EA6\uFF08px\uFF09",
  "pl.set.panelHeight": "\u804A\u5929\u6846\u63D0\u793A\u8BCD\u9762\u677F\u9AD8\u5EA6\uFF08px\uFF09",
  "pl.set.maxCount": "\u63D0\u793A\u8BCD\u6700\u5927\u5B58\u50A8\u6570\u91CF(\u6761)",
  "pl.set.settingsAboveMenu": "\u5DE6\u4FA7\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.settingsAboveMenuDesc": "\u5728\u4FA7\u8FB9\u680F\u8BBE\u7F6E\u6309\u94AE\u4E0A\u65B9\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.showComposerBtn": "\u804A\u5929\u6846\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.showComposerBtnDesc": "\u5728\u8F93\u5165\u6846\u5DE5\u5177\u680F\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.composerBtnIconOnly": "\u8BCD\u5E93\u6309\u94AE\u7EAF\u56FE\u6807",
  "pl.set.composerBtnIconOnlyDesc": "\u53EA\u663E\u793A\u56FE\u6807\uFF0C\u9690\u85CF\u6309\u94AE\u6587\u5B57",
  "pl.set.showPolishBtn": "\u804A\u5929\u6846\u663E\u793A AI \u4F18\u5316\u6309\u94AE",
  "pl.set.showPolishBtnDesc": "\u5728\u8F93\u5165\u6846\u5DE5\u5177\u680F\u663E\u793A AI \u4F18\u5316\u6309\u94AE",
  "pl.set.polishBtnIconOnly": "AI \u4F18\u5316\u6309\u94AE\u7EAF\u56FE\u6807",
  "pl.set.polishBtnIconOnlyDesc": "\u53EA\u663E\u793A\u56FE\u6807\uFF0C\u9690\u85CF\u6309\u94AE\u6587\u5B57",
  "pl.set.tildaTrigger": "\u8F93\u5165 # \u89E6\u53D1\u8BCD\u5E93\u9009\u62E9",
  "pl.set.tildaTriggerDesc": "\u8F93\u5165 # \u540E\u5F39\u51FA\u8BCD\u5E93\uFF1B\u7EE7\u7EED\u8F93\u5165\u53EF\u5B9E\u65F6\u7B5B\u9009\uFF0C\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165\uFF0C\u8F93\u5165\u7A7A\u683C\u6216 Esc \u7ED3\u675F\u7B5B\u9009",
  "pl.set.selectionAdd": "\u9009\u4E2D\u6587\u5B57\u6DFB\u52A0\u63D0\u793A\u8BCD",
  "pl.set.selectionAddDesc": "\u5728\u804A\u5929\u5185\u5BB9\u9AD8\u4EAE\u9009\u4E2D\u6587\u5B57\u540E\uFF0C\u6D6E\u51FA\u300C\u6DFB\u52A0\u63D0\u793A\u8BCD\u300D\u6309\u94AE\u5E76\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3",
  "pl.set.currentVersion": "\u5F53\u524D\u7248\u672C",
  "pl.footer.disclaimer": "\u672C\u63D2\u4EF6\u6309\u300C\u73B0\u72B6\u300D\u63D0\u4F9B\uFF0C\u4E0D\u63D0\u4F9B\u4EFB\u4F55\u5F62\u5F0F\u7684\u660E\u793A\u6216\u9ED8\u793A\u62C5\u4FDD\uFF1B\u4F7F\u7528\u8005\u81EA\u62C5\u98CE\u9669\u3002",
  "pl.setSectionTitle": "\u8BCD\u5E93\u8BBE\u7F6E",
  "pl.set.setSectionDesc": "\u8BBE\u7F6E\u63D0\u793A\u8BCD\u5B58\u50A8\u3001AI \u6A21\u578B\u4E0E\u754C\u9762\u663E\u793A\u4EA4\u4E92\u3002",
  "pl.setModuleAiModel": "AI \u6A21\u578B",
  "pl.setModuleAiModelDesc": "\u9009\u62E9\u8BCD\u5E93 AI \u6DA6\u8272 / \u5B8C\u5584\u9ED8\u8BA4\u4F7F\u7528\u7684\u6A21\u578B\uFF0C\u672A\u914D\u7F6E\u65F6\u81EA\u52A8\u9009\u62E9\u53EF\u7528\u6A21\u578B\u3002",
  "pl.set.aiModelProvider": "AI \u8C03\u7528\u65B9",
  "pl.set.aiDefaultModel": "\u9ED8\u8BA4\u6A21\u578B",
  "pl.set.aiModelAuto": "\u81EA\u52A8\u9009\u62E9\uFF08\u63A8\u8350\uFF09",
  "pl.setModulePanel": "\u9762\u677F\u663E\u793A",
  "pl.setModulePanelDesc": "\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD\u9762\u677F\u5C3A\u5BF8\u4E0E\u6700\u5927\u5B58\u50A8\u6570\u91CF\u3002",
  "pl.setModuleDisplay": "\u663E\u793A\u4E0E\u4EA4\u4E92",
  "pl.setModuleDisplayDesc": "\u63A7\u5236\u5404\u5165\u53E3\u7684\u663E\u793A\u65B9\u5F0F\u4E0E\u89E6\u53D1\u65B9\u5F0F\u3002",
  "pl.setModuleAbout": "\u5173\u4E8E",
  "pl.setModuleAboutDesc": "\u67E5\u770B\u63D2\u4EF6\u7248\u672C\u4E0E\u7248\u6743\u4FE1\u606F\u3002",
  "pl.about.author": "\u4F5C\u8005",
  "pl.about.license": "\u8BB8\u53EF\u8BC1",
  "pl.about.repo": "\u5F00\u6E90\u5730\u5740",
  "pl.about.copyright": "\u7248\u6743\u6240\u6709 \xA9 {year} {author} \u4FDD\u7559\u4E00\u5207\u6743\u5229\u3002"
  // 统计可视化
  // 全文搜索
  // 大文件分片加载
  // 定位当前文件
  // 移动/复制到目录
};
var en = {
  // Common buttons / hints
  "pl.title": "Library",
  "pl.search": "Search\u2026",
  "pl.searchEmpty": "No matching prompts",
  "pl.clearSearch": "Clear search",
  "pl.empty": "No prompts",
  "pl.loading": "Loading\u2026",
  "pl.new": "+ New",
  "pl.addToLibrary": "Add to library",
  "pl.refresh": "Refresh",
  "pl.refreshing": "Refreshing\u2026",
  "pl.refreshTitle": "Refresh prompt list",
  "pl.insert": "Insert",
  "pl.insertSend": "Insert & send",
  "pl.insertSendDisabled": "Draft is not empty; use Insert first or clear the box",
  "pl.overwrite": "Overwrite",
  "pl.edit": "Edit",
  "pl.view": "View",
  "pl.delete": "Delete",
  "pl.copy": "Copy",
  "pl.copied": "Copied",
  "pl.save": "Save",
  "pl.saving": "Saving\u2026",
  "pl.cancel": "Cancel",
  "pl.close": "Close",
  "pl.windowMaximize": "Maximize",
  "pl.windowRestore": "Restore",
  "pl.titleField": "Title",
  "pl.bodyField": "Body",
  "pl.insertVariableTitle": "Insert a variable tag {{}} at the cursor (selected text can be the variable name)",
  "pl.insertVariableDefault": "variable",
  "pl.tagsField": "Tag (single select)",
  "pl.tagsHint": "Select one tag from the existing tags",
  "pl.tagsNoneSelect": "(No tag)",
  "pl.requireTitleBody": "Title and body are required",
  "pl.deleted": "Deleted",
  "pl.confirmDelete": 'Delete "{title}"? It will be moved to the recycle bin and can be restored in Data Management.',
  "pl.recentNew": "New",
  "pl.learnedToast": "Auto-learned",
  "pl.refinedDone": "AI-refined",
  "pl.refinePending": "AI enrichment pending",
  "pl.original": "Original",
  "pl.polished": "Polished",
  // # trigger overlay
  "pl.overlayNoMatch": "No match for \u201C{query}\u201D",
  "pl.overlayHintFilter": "Filtering \u201C{query}\u201D \xB7 \u2191\u2193 select \xB7 Enter confirm \xB7 Space to end \xB7 Esc to close",
  "pl.overlayHintDefault": "\u2191\u2193 select \xB7 Enter confirm \xB7 keep typing to filter \xB7 Space to end \xB7 Esc to close",
  // AI polish (confirm card / button)
  "pl.polish": "AI Polish",
  "pl.polishing": "Polishing\u2026",
  "pl.polishBtnTitle": "Polish the text with AI",
  "pl.polishLoadingTitle": "AI polishing\u2026",
  "pl.polishEmpty": "Please type something in the input first",
  "pl.polishFail": "AI polish failed, please check your LLM connection",
  "pl.polishHoverContent": "Optimize input content",
  "pl.polishResult": "AI Polish Result",
  "pl.polishResultAria": "Polish result",
  "pl.summaryLabel": "AI Summary",
  "pl.replaceContent": "Replace content",
  // Sidebar
  "pl.sidebar.uncategorized": "Uncategorized",
  "pl.sidebar.groupCount": "({count})",
  "pl.saveToLibrary": "Save to library",
  "pl.ctx.dataManagement": "Data Management",
  "pl.ctx.personas": "Personas",
  "pl.ctx.tags": "Tags",
  "pl.ctx.trash": "Recycle bin",
  "pl.ctx.workspaceInstructions": "Skill Manager",
  // Data management modal (opened from the left library menu's "Data Management" entry)
  "pl.lexicon.title": "Data Management",
  "pl.lexicon.desc": "Manage your prompt library: browse the list on the left, preview or edit details on the right, and create new prompts from the top of the list.",
  "pl.lexicon.listTitle": "Prompt List",
  "pl.lexicon.viewTags": "Tags",
  "pl.lexicon.viewTrash": "Recycle bin",
  "pl.lexicon.listView": "List",
  "pl.lexicon.groupView": "Group",
  "pl.lexicon.new": "New",
  "pl.lexicon.newDone": "Prompt created",
  "pl.lexicon.saved": "Changes saved",
  "pl.lexicon.edit": "Edit",
  "pl.lexicon.previewEmpty": "Select an item from the list on the left to view its details",
  "pl.lexicon.creatingTitle": "New Prompt",
  "pl.lexicon.editingTitle": "Edit Prompt",
  "pl.lexicon.deleteDone": "Deleted",
  "pl.lexicon.noSearchResult": "No matching prompts",
  "pl.lexicon.expandGroup": "Expand this group",
  "pl.lexicon.collapseGroup": "Collapse this group",
  "pl.lexicon.selectAll": "Select all",
  "pl.lexicon.deselectAll": "Deselect all",
  "pl.lexicon.selectedTotal": "{selected} / {total} selected",
  "pl.lexicon.batchDelete": "Delete selected",
  "pl.lexicon.batchDeleteDone": "Deleted {count} prompts",
  "pl.lexicon.confirmBatchDelete": "Delete {count} selected prompts? They will be moved to the recycle bin and can be restored from Data Management \u2192 Recycle Bin.",
  "pl.lexicon.createdAt": "Created",
  "pl.lexicon.updatedAt": "Updated",
  "pl.lexicon.usage": "Usage",
  "pl.lexicon.usageUnit": "times",
  "pl.lexicon.lastUsed": "Last used",
  "pl.lexicon.neverUsed": "Never used",
  "pl.lexicon.summary": "AI Summary",
  "pl.lexicon.noSummary": "No summary",
  "pl.personas.title": "Persona Manager",
  "pl.personas.listTitle": "Souls",
  "pl.personas.listHint": "Create and edit multiple personas (SOUL), then bind them to workspaces / projects",
  "pl.personas.createTitle": "New Soul",
  "pl.personas.createHint": "Give the new persona a name; editing starts right after creation",
  "pl.personas.previewEmpty": 'No content yet \u2014 click "Edit" to start',
  "pl.personas.namePlaceholder": "Give it a name",
  "pl.personas.defaultBadge": "Default",
  "pl.personas.enabled": "Enabled",
  "pl.personas.edit": "Edit",
  "pl.personas.cancel": "Cancel",
  "pl.personas.save": "Save",
  "pl.personas.delete": "Delete",
  "pl.personas.contentLabel": "Persona content (SOUL)",
  "pl.personas.contentHint": "Injected into every conversation to shape the AI's identity, tone and working rules",
  "pl.personas.viewDetail": "Click to view details",
  "pl.personas.detailTitle": "Persona Details",
  "pl.personas.detailEmpty": "This persona has no content yet",
  "pl.personas.empty": 'No custom personas yet \u2014 click "New Persona" to create one',
  "pl.personas.note": "Personas are bound by workspace / project: conversations opened under that path automatically use the corresponding SOUL; unbound paths fall back to the default persona or the parent binding",
  "pl.personas.deleteConfirm": 'Delete persona "{name}"? Its conversation bindings and SOUL file will also be removed',
  "pl.personas.nameError": "Name cannot be empty",
  "pl.personas.opFailed": "Operation failed, please try again",
  "pl.personas.clearAllTitle": "Clear all persona bindings at once (all path & session persona bindings; skill bindings are untouched)",
  "pl.personas.clearAllConfirm": "Clear all persona bindings? This removes every workspace/project and session persona binding. Skill bindings are not affected.",
  "pl.personas.exportDone": "Exported {count} persona(s)",
  "pl.personas.importDone": "Imported {count} persona(s)",
  "pl.personas.modifyDone": "Persona '{name}' updated. It takes effect for new messages after you continue the conversation.",
  "pl.personas.enableOn": "Persona '{name}' enabled. It takes effect for new messages after you continue the conversation.",
  "pl.personas.enableOff": "Persona '{name}' disabled. It takes effect for new messages after you continue the conversation.",
  "pl.personas.bindDone": "Persona binding updated. It takes effect for new messages after you continue the conversation.",
  "pl.personas.importEmpty": "The selected file is empty and cannot be imported",
  "pl.personas.importFailed": "Import failed, please check the file content",
  "pl.personas.importConfirmTitle": "Confirm Persona Import",
  "pl.personas.importConfirmHeadline": 'A new persona "{name}" will be created, with the content preview shown below. Confirm to proceed.',
  "pl.personas.disabledEditHint": "This persona is disabled; enable it to edit",
  "pl.personas.disabledDeleteHint": "This persona is disabled; enable it to delete",
  "pl.personas.scopes.title": "Workspace / Project Binding",
  "pl.personas.scopes.hint": "Assign a persona to a workspace or project to override the parent: projects without their own setting use their parent workspace's binding",
  "pl.personas.scopes.defaultOption": "Default (follow parent)",
  "pl.personas.scopes.empty": "No workspaces available",
  "pl.personas.scopes.workspace": "Workspace",
  "pl.personas.scopes.project": "Project",
  "pl.personas.scopes.others": "Other sessions",
  "pl.ai.generate": "AI Generate",
  "pl.ai.generating": "Generating\u2026",
  "pl.ai.genNeedTitle": "Please enter a title first",
  "pl.ai.genFailed": "AI generation failed. Please make sure the LLM service is connected",
  "pl.ai.genDone": "Draft generated \u2014 review it before saving",
  "pl.inject.title": "Prompt Management",
  "pl.inject.projectNote": "Bind session-level prompts to a workspace / project: conversations opened under that path get them injected automatically; projects without their own config inherit the parent workspace binding",
  "pl.diag.title": "Current-session resolution",
  "pl.diag.session": "session",
  "pl.diag.workspace": "workspace/path",
  "pl.diag.default": "default",
  "pl.diag.noSkill": "no match",
  "pl.diag.current": "temp",
  "pl.diag.cwd": "cwd",
  "pl.diag.selected": "Viewing \xB7 {name}",
  "pl.diag.back": "Back to current session",
  "pl.diag.path": "Binding path",
  "pl.inject.empty": 'No session-level prompts yet \u2014 click "New Prompt" above to create one',
  "pl.inject.boundCount": "{count}",
  "pl.inject.config": "Configure",
  "pl.inject.cancelConfig": "Collapse",
  "pl.inject.clearBinding": "Clear",
  "pl.inject.opFailed": "Operation failed, please try again",
  "pl.inject.clearAll": "Clear bindings",
  "pl.inject.clearAllTitle": "Clear all skill bindings at once (all path & session skill bindings; persona bindings are untouched)",
  "pl.inject.clearAllConfirm": "Clear all skill bindings? This removes every workspace/project and session skill binding. Persona bindings are not affected.",
  "pl.inject.note": "Session-level prompts: title, body, tags and enabled state are all stored in the database (session_prompts table of prompts.db). Manage prompts on the left, bind them to workspaces / projects on the right to inject automatically",
  "pl.inject.listTitle": "Prompt Library",
  "pl.inject.listHint": "Create and edit session-level prompts; bind them to workspaces / projects on the right to inject automatically",
  "pl.inject.createHint": "Give the new prompt a title; editing starts right after creation",
  "pl.inject.namePlaceholder": "Give it a title",
  "pl.inject.enabled": "Enabled",
  "pl.inject.bindSearchPlaceholder": "Search bindable prompts\u2026",
  "pl.inject.bindNoMatch": "No matching prompts",
  "pl.inject.selectedCount": "{count} selected",
  "pl.inject.previewEmpty": 'No content yet \u2014 click "Edit" to start',
  "pl.inject.contentLabel": "Prompt content",
  "pl.inject.tagLabel": "Tag",
  "pl.inject.tagPlaceholder": "Custom tag (8 chars max)",
  "pl.inject.contentHint": "Injected with every message to shape the AI's conversation behavior",
  "pl.inject.viewDetail": "Click to view details",
  "pl.inject.detailTitle": "Prompt Details",
  "pl.inject.detailEmpty": "This prompt has no content yet",
  "pl.inject.exportDone": "Exported {count} prompt(s)",
  "pl.inject.importDone": "Imported {count} prompt(s)",
  "pl.inject.modifyDone": "Prompt '{name}' updated. It takes effect for new messages after you continue the conversation.",
  "pl.inject.enableOn": "Prompt '{name}' enabled. It takes effect for new messages after you continue the conversation.",
  "pl.inject.enableOff": "Prompt '{name}' disabled. It takes effect for new messages after you continue the conversation.",
  "pl.inject.bindDone": "Prompt binding updated. It takes effect for new messages after you continue the conversation.",
  "pl.inject.importEmpty": "The selected file is empty and cannot be imported",
  "pl.inject.importFailed": "Import failed, please check the file content",
  "pl.inject.importConfirmTitle": "Confirm Skill Import",
  "pl.inject.importConfirmHeadline": 'A new skill "{name}" will be imported, with the content preview shown below. Confirm to proceed.',
  "pl.inject.disabledEditHint": "This prompt is disabled; enable it to edit",
  "pl.inject.disabledDeleteHint": "This prompt is disabled; enable it to delete",
  "pl.inject.disabledBindHint": "This prompt is disabled and cannot be newly bound (existing bindings are kept)",
  "pl.harnessSkill.title": "Harness Skill Toggles",
  "pl.harnessSkill.btn": "Skill Toggles",
  "pl.harnessSkill.btnTitle": "Open harness skill soft-control toggles: list global and project skills; turning one off writes its name into the system prompt so the model won't auto-use it",
  "pl.harnessSkill.note": "These skills are auto-injected by the harness at the start of every session; here we can only apply 'soft control': turning one off writes its name into the 'disabled list' in the system prompt so the model won't auto-invoke it. To fully disable, unsubscribe/disable it in TraeCode settings",
  "pl.harnessSkill.noteProject": "These skills are auto-injected by the harness at the start of every session; here we can only apply 'soft control': turning one off writes its name into the 'disabled list' in the system prompt so the model won't auto-invoke it. Current project: {project}",
  "pl.harnessSkill.systemTitle": "Global Skills",
  "pl.harnessSkill.systemHint": "Located in ~/.dsh/skills, effective in every session",
  "pl.harnessSkill.projectTitle": "Project Skills",
  "pl.harnessSkill.projectHint": "Located in the current project's .dsh/skills, effective only in sessions under this project",
  "pl.harnessSkill.empty": "No skills",
  "pl.harnessSkill.enabled": "Skill enabled",
  "pl.harnessSkill.disabled": "Skill disabled",
  "pl.harnessSkill.deleted": "Skill deleted",
  "pl.harnessSkill.deleteConfirm": 'Delete skill "{name}"? It will be permanently removed from the skills directory',
  "pl.sessionPrompts.new": "New Prompt",
  "pl.sessionPrompts.titlePlaceholder": "Prompt title (25 chars max)",
  "pl.sessionPrompts.bodyPlaceholder": "Prompt body (injected into the system prompt)",
  "pl.sessionPrompts.nameError": "Title cannot be empty",
  "pl.sessionPrompts.deleteConfirm": 'Delete prompt "{name}"? Its bindings and temporary injection references will be removed too',
  "pl.achievements.loading": "Loading\u2026",
  // Import / Export / Backup
  "pl.moduleImportExport": "Import / Export",
  "pl.moduleImportExportDesc": "Import / export prompts in common formats (JSON / CSV / Markdown / text).",
  "pl.exportSection": "Export",
  "pl.importSection": "Import",
  "pl.importSectionDesc": "Import from a data file; edit and validate before merging into the library.",
  "pl.previewEmpty": "Click an item on the left to view its details",
  "pl.previewUsage": "{count} times",
  "pl.moduleTags": "Manage tags",
  "pl.moduleTagsDesc": "Centrally manage prompt tags: create / rename / delete.",
  "pl.moduleTrash": "Recycle bin",
  "pl.moduleTrashDesc": "Centrally manage deleted prompts: restore or permanently delete.",
  "pl.export": "Export",
  "pl.import": "Import",
  "pl.importData": "Import data",
  "pl.selectExport": "Select to export",
  "pl.exportSelectEmpty": "Please select the items to export first",
  "pl.exportHint": "Check the cards then hit Export; each card is exported as one Markdown file",
  "pl.exportPickDirTitle": "Pick a local folder, then export the checked prompts",
  "pl.importTitle": "Import from a backup file (merge into the library)",
  "pl.exported": "Exported {count} prompts",
  "pl.exportedPath": "Exported {count} prompts\nSaved to:\n{path}",
  "pl.exportSelectAll": "Select all",
  "pl.exportSelected": "Export selected",
  "pl.export.selectedCount": "{selected} / {total} selected",
  "pl.viewList": "List",
  "pl.viewGroup": "Categories",
  "pl.exportNeedSelect": "Select prompts to export first",
  "pl.skillImport": "Import from Skills",
  "pl.skillImportBtnTitle": "Open the skill import dialog: pick a local md file or import from the Skills directory, edit content, write {{variable}} placeholders, and save after validation",
  "pl.skillModal.scanSkillsEmpty": "Skills directory is empty; no SKILL.md to import",
  "pl.skillModal.scanDirEmpty": "No importable md files found in the selected folder",
  "pl.skillModal.scanFolder": "Scan folder",
  "pl.skillModal.title": "Import skills",
  "pl.skillModal.subtitle": "Pick a local md file or scan the Skills directory, edit the title/summary/body and write {{variable}} placeholders; you can only save after validation passes.",
  "pl.skillModal.chooseFile": "Choose md file",
  "pl.skillModal.scanSkills": "Scan Skills directory",
  "pl.skillModal.titleLabel": "Title",
  "pl.skillModal.tagLabel": "Tag",
  "pl.skillModal.notice": "Feedback",
  "pl.skillModal.summaryLabel": "Summary",
  "pl.skillModal.bodyLabel": "Body",
  "pl.skillModal.insertVar": "Insert variable",
  "pl.skillModal.validate": "Validate",
  "pl.skillModal.validatePass": "Validation passed, you can save",
  "pl.skillModal.save": "Save to library",
  "pl.skillModal.saving": "Saving\u2026",
  "pl.skillModal.saved": "Saved: {imported} added, {updated} updated",
  "pl.skillModal.savedErrors": " ({n} failed)",
  "pl.skillModal.noEntry": "No entries yet. Choose an md file or scan the Skills directory first.",
  "pl.skillModal.noEntryExport": "No entries to export. Select prompts in the library first.",
  "pl.skillModal.fileError": "Failed to parse file: {err}",
  "pl.skillModal.remove": "Remove",
  "pl.skillModal.fromFile": "File",
  "pl.skillModal.fromDisk": "Disk",
  "pl.skillModal.exists": "In library",
  "pl.skillModal.selectHint": "Check the entries to save",
  "pl.skillModal.emptyChecked": "Check at least one entry first",
  "pl.skillModal.varUnclosed": "{n} unclosed '{{' found",
  "pl.skillModal.varUnmatched": "Unmatched '}}' found",
  "pl.skillModal.varEmpty": "Empty {{}} variable found",
  "pl.skillModal.varInvalid": "Invalid variable name: {name}",
  "pl.skillModal.titleRequired": "Title is required",
  "pl.skillModal.bodyRequired": "Body is required",
  "pl.skillModal.unnamed": "Untitled skill",
  "pl.skillModal.issueCount": "{count} issue(s) found",
  "pl.skillModal.fixAll": "Fix all",
  "pl.skillModal.fixHint": "{fixable} of them can be fixed automatically",
  "pl.skillModal.fixDone": "Fixed {count} issue(s):",
  "pl.skillModal.fixTitle": "Title filled in: {title}",
  "pl.skillModal.fixBodyVars": "Fixed template variable formatting in body",
  "pl.skillModal.varFixDefault": "variable",
  "pl.skillModal.fillDone": "Assigned values to body variables ({count}):",
  "pl.skillModal.fromLibrary": "Library",
  "pl.skillModal.saveExport": "Save to Skills",
  "pl.skillModal.savedExport": "Exported: {exported} skill(s) written to disk",
  "pl.skillModal.savedExportErrors": " ({n} failed)",
  "pl.skillModal.exportRoot": "Export path: {root}",
  "pl.skillModal.exportTitle": "Export skills",
  "pl.skillModal.exportSubtitle": 'Choose an export scope (global / project / private) and turn the checked prompts into skills: global skills go to the global skill library, project skills are written to the current project, and private skills are bound to the current session. Edit the title, summary, and body; "Validate & AI generate" validates first, then AI automatically produces the English skill name and description, then export.',
  "pl.skillModal.exportScope": "Export scope",
  "pl.skillModal.scopeGlobal": "Global skill",
  "pl.skillModal.scopeGlobalDesc": "Saved to the global skill library, applies to all sessions",
  "pl.skillModal.scopeProject": "Project skill",
  "pl.skillModal.scopeProjectDesc": "Saved to the current project, applies to this project only",
  "pl.skillModal.scopePrivate": "Private skill",
  "pl.skillModal.scopePrivateDesc": "Created as a session-level skill bound to the current session, injected here only",
  "pl.skillModal.scopePrivatePath": "Database (session_prompts table)",
  "pl.skillModal.scopeGlobalHint": "Saved to the global skill library ~/.dsh/skills/, ready to use right away: auto-injected on every session start, shared across all projects \u2014 no need to rebind or re-import.",
  "pl.skillModal.scopePrivateHint": 'Stored in the database as a session-level skill; manage or import it under "Session Skills" in the skill settings.',
  "pl.skillModal.projectNoPath": "No current project detected",
  "pl.skillModal.projectPathHint": 'No current project detected. Enter a path manually or click "Browse" to pick the export directory',
  "pl.skillModal.projectPathHintResolved": 'Current project path detected. Edit it or click "Browse" to choose a different one',
  "pl.skillModal.projectPathResolving": "Resolving current project path\u2026",
  "pl.skillModal.projectPathPlaceholder": "Enter project path, e.g. D:/my-project",
  "pl.skillModal.projectPathEmpty": "Please enter an export path first",
  "pl.skillModal.browse": "Browse",
  "pl.skillModal.directoryPickerUnavailable": "Directory picker unavailable",
  "pl.dirPicker.title": "Select directory",
  "pl.dirPicker.loading": "Loading\u2026",
  "pl.dirPicker.selectCurrent": "Select this directory",
  "pl.dirPicker.up": "Up",
  "pl.dirPicker.newFolder": "New folder",
  "pl.dirPicker.empty": "No subdirectories here",
  "pl.dirPicker.folderPlaceholder": "Folder name",
  "pl.dirPicker.browseFailed": "Failed to read directory",
  "pl.dirPicker.enterHint": 'Click a subdirectory to enter it; confirm the export location with "Select this directory"',
  "pl.skillModal.nameLabel": "Skill name (kebab-case)",
  "pl.skillModal.nameRequired": "Please enter the skill name",
  "pl.skillModal.summaryRequired": "Please enter the summary",
  "pl.skillModal.aiEnhance": "AI Enhance",
  "pl.skillModal.aiEnhanceHint": "Auto-fills the skill name and summary with AI; validate after supplementing",
  "pl.skillModal.aiEnhancing": "AI enhancing {done}/{total}, generating names and summaries\u2026",
  "pl.skillModal.aiDone": "AI enhance done: {done} skill name(s) and summary(ies) generated",
  "pl.skillModal.aiDoneErrors": "AI enhance done: {done} succeeded, {n} failed",
  "pl.skillModal.aiUnavailable": "AI service is unavailable, cannot generate the skill name and description. Connect an LLM service first.",
  "pl.skillModal.aiEmpty": "AI returned an empty result after automatic retries; please try again later",
  "pl.skillModal.aiParse": "AI output could not be parsed into a skill name and description; please retry",
  "pl.skillModal.aiNoRoute": "No available model found; please check your model configuration",
  "pl.skillModal.aiFailed": "AI generation failed",
  "pl.skillModal.uploadJson": "Upload JSON",
  "pl.skillModal.uploadJsonTitle": "Add custom skill entries from a JSON file: an array or a skills/entries/prompts list; each item needs title and body, optional name/summary/promptId",
  "pl.skillModal.fromJson": "JSON",
  "pl.skillModal.jsonError": "JSON parse failed: {err}",
  "pl.skillModal.jsonEmpty": "No valid skill entries found in JSON (each item needs a title and body)",
  "pl.skillExport": "Export skills",
  "pl.skillExportBtnTitle": "Export the checked prompts as DSH skills (opens an edit & validation window; written to ~/.dsh/skills/<name>/SKILL.md after validation passes)",
  "pl.skillExportNeedSelect": "Check the prompts to export as skills first",
  "pl.confirm": "OK",
  // Import edit modal (library import)
  "pl.importEdit.title": "Import prompts",
  "pl.importEdit.subtitle": "Preview and edit the imported data here. You can change the title, tags and body, and insert {{variable}} placeholders; only checked entries are imported and validation must pass first.",
  "pl.importEdit.tagsLabel": "No tag",
  "pl.importEdit.fromTxt": "Text",
  "pl.importEdit.noEntry": "No valid entries parsed. Pick a data file again.",
  "pl.importEdit.validatePass": "Validation passed, ready to import",
  "pl.importEdit.untitledPrompt": "Untitled prompt",
  "pl.importEdit.import": "Import",
  "pl.importEdit.importing": "Importing\u2026",
  "pl.importEdit.deselectAll": "Deselect all",
  "pl.importEdit.parseEmpty": "No valid data parsed from the file",
  "pl.importEdit.parseFail": "Failed to parse file: {err}",
  "pl.aiStateDone": "Refined",
  "pl.aiStatePending": "Pending",
  // Import / export formats
  "pl.exportFormat": "Format",
  "pl.format.txt": "Text",
  "pl.imported": "Import done: {imported} added, {updated} updated, {skipped} skipped",
  // Import / export per-item results
  // Library assistant activity phase bubble
  // Tag management
  "pl.tagsNone": "No tags",
  "pl.tagsEmpty": "No tag",
  "pl.renameTag": "Rename",
  "pl.renameTagPlaceholder": "New tag name",
  "pl.renameTagEmpty": "Please enter a new tag name",
  "pl.renameTagNoChange": "The tag name is unchanged",
  "pl.deleteTag": "Delete",
  "pl.deleteTagConfirm": 'Remove tag "{name}"?',
  "pl.deleteTagInUse": 'Tag "{name}" is in use by {count} prompts. Remove the tag from those prompts before deleting.',
  "pl.deleteTagInUseTitle": "This tag is in use by {count} prompts and cannot be deleted yet. Remove it from prompts first",
  "pl.renameTagDone": "Renamed tag \u201C{name}\u201D",
  "pl.deleteTagDone": "Deleted tag \u201C{name}\u201D",
  "pl.createTag": "New",
  "pl.createTagEmpty": "Please enter a tag name",
  "pl.createTagPlaceholder": "Enter a new tag name",
  "pl.createTagDone": "Created tag \u201C{name}\u201D",
  // Recycle bin
  "pl.trashEmpty": "The recycle bin is empty",
  "pl.trashDeletedAt": "Deleted at {time}",
  "pl.trashSelectAll": "Select all",
  "pl.trashDeselectAll": "Deselect all",
  "pl.trashRestoreSelected": "Batch restore",
  "pl.trashRestoreSelectedConfirm": "Restore {count} selected prompts?",
  "pl.trashDeleteSelected": "Batch delete",
  "pl.trashDeleteConfirm": "Permanently delete {count} selected prompts? This cannot be undone.",
  "pl.trashRestoreDone": "Restored {count} prompts",
  "pl.trashDeleteDone": "Permanently deleted {count} prompts",
  "pl.trashRestoreOne": "Restore",
  "pl.trashDeleteOne": "Delete",
  "pl.trashRestoreOneConfirm": 'Restore "{title}"?',
  "pl.trashDeleteOneConfirm": 'Permanently delete "{title}"? This cannot be undone.',
  "pl.trashCleanupNote": "Items deleted more than 30 days ago are permanently cleared automatically.",
  "pl.trashDaysLeft": "{n} days left",
  // Template variables
  "pl.template.title": "Fill template variables",
  "pl.template.desc": "This prompt contains variable placeholders. Fill in the actual values before inserting; empty ones stay as {{variable}}.",
  "pl.template.preview": "Live preview (highlighted = filled in)",
  "pl.template.unfilled": "Please fill all variables ({count} left)",
  // Add from selection
  "pl.copySelected": "Copy selected text",
  "pl.copiedSelected": "Copied",
  "pl.applyTemplate": "Apply template",
  "pl.applyTemplateDesc": "Selected {length} characters. Pick a template (prompt with {{variables}})",
  "pl.applyTemplateEmpty": "No variable templates in the library yet. Create one first.",
  "pl.selectionMore": "More actions",
  "pl.selectionSetDefault": "Set as default",
  "pl.selectionIsDefault": "Default",
  // Context-based prompt recommendations
  "pl.recommend": "Recommended",
  "pl.set.contextRecommend": "Context prompt recommendations",
  "pl.set.contextRecommendDesc": "When the input is empty, recommend matching prompts above the input based on recent chat context; click to insert into the draft",
  // Settings
  "pl.set.panelWidth": "Chat prompt panel width (px)",
  "pl.set.panelHeight": "Chat prompt panel height (px)",
  "pl.set.maxCount": "Maximum stored prompts",
  "pl.set.settingsAboveMenu": "Show library button on the left",
  "pl.set.settingsAboveMenuDesc": "Show the library button above the settings button in the sidebar",
  "pl.set.showComposerBtn": "Prompt button in composer",
  "pl.set.showComposerBtnDesc": "Show the prompt library button in the input toolbar",
  "pl.set.composerBtnIconOnly": "Prompt button icon only",
  "pl.set.composerBtnIconOnlyDesc": "Show only the icon, hide button text",
  "pl.set.showPolishBtn": "Show AI polish button in chat",
  "pl.set.showPolishBtnDesc": "Show the AI polish button in the input toolbar",
  "pl.set.polishBtnIconOnly": "AI polish button icon only",
  "pl.set.polishBtnIconOnlyDesc": "Show only the icon, hide button text",
  "pl.set.tildaTrigger": "Type # to trigger library selection",
  "pl.set.tildaTriggerDesc": "Type # to open the library; keep typing to filter live, \u2191\u2193 to select, Enter to insert, Space or Esc to finish",
  "pl.set.selectionAdd": "Add prompt from selected text",
  "pl.set.selectionAddDesc": "After highlighting text in chat, show an \u201CAdd to library\u201D button and open a standalone window",
  "pl.set.currentVersion": "Current version",
  "pl.footer.disclaimer": 'This plugin is provided "as is", without warranty of any kind, express or implied. Use at your own risk.',
  "pl.setSectionTitle": "Library settings",
  "pl.set.setSectionDesc": "Configure prompt storage, AI model and UI display options.",
  "pl.setModuleAiModel": "AI Model",
  "pl.setModuleAiModelDesc": "Pick the default model used for AI polish / enrichment; when unset it picks an available model automatically.",
  "pl.set.aiModelProvider": "AI Provider",
  "pl.set.aiDefaultModel": "Default model",
  "pl.set.aiModelAuto": "Auto (recommended)",
  "pl.setModulePanel": "Panel display",
  "pl.setModulePanelDesc": "Customize prompt panel size and the max number of stored prompts.",
  "pl.setModuleDisplay": "Display & interaction",
  "pl.setModuleDisplayDesc": "Control how each entry point is shown and triggered.",
  "pl.setModuleAbout": "About",
  "pl.setModuleAboutDesc": "View plugin version and copyright info.",
  "pl.about.author": "Author",
  "pl.about.license": "License",
  "pl.about.repo": "Repository",
  "pl.about.copyright": "Copyright \xA9 {year} {author}. All rights reserved.",
  "pl.tagFilterAll": "All"
  // Statistics visualization
  // Full-text search
  // Large file sharded loading
  // Locate current file
  // Move / copy to directory
};
function fallbackT(key, params) {
  let text = zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}
var boundT = null;
function setBoundT(fn) {
  boundT = fn;
}
var LOCALE_CHANGED_EVENT = "pl:locale-changed";
function useLocaleVersion() {
  const [version, setVersion] = (0, import_react2.useState)(0);
  (0, import_react2.useEffect)(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(LOCALE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LOCALE_CHANGED_EVENT, onChange);
  }, []);
  return version;
}
function usePLT(t) {
  useLocaleVersion();
  const base = t ?? boundT ?? fallbackT;
  return (key, params) => {
    let text = base(key, params);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{${k}}`).join(String(v));
      }
    }
    return text;
  };
}

// src/client/components/common/TagInput.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function TagInput({ value, onChange, suggestions, inputStyle: inputStyle8, t }) {
  const T = usePLT(t);
  const current = value.split("#").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "select",
      {
        value: current,
        onChange: (e) => onChange(e.target.value),
        style: {
          width: "100%",
          boxSizing: "border-box",
          ...inputStyle8
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: T("pl.tagsNoneSelect") }),
          suggestions.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: tag, children: tag }, tag))
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: {
          fontSize: 11,
          lineHeight: 1.5,
          color: "var(--dsw-alias-label-tertiary, #9ca3af)",
          padding: "0 2px",
          userSelect: "none"
        },
        children: T("pl.tagsHint")
      }
    )
  ] });
}

// src/client/components/data/TemplateVariables.tsx
var import_react3 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
var MONO = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)"
};
function extractVariables(body) {
  const names = [];
  const seen = /* @__PURE__ */ new Set();
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}
function applyVariables(body, values) {
  return body.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (full, name) => {
    const key = name.trim();
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : full;
  });
}
function hasVariables(body) {
  return /\{\{\s*[^{}]+\s*\}\}/.test(body);
}
var VAR_PALETTE = [
  "#f2a73b",
  // 橙
  "#6bb7f0",
  // 蓝
  "#b58eff",
  // 紫
  "#5ee0a8",
  // 绿
  "#ff7a8a",
  // 玫红
  "#f5d76e",
  // 黄
  "#8fd0ff",
  // 浅蓝
  "#ff9e6f",
  // 浅橙
  "#a8e063",
  // 黄绿
  "#ff6fb5",
  // 粉
  "#4fd8f0",
  // 青
  "#ffd34d",
  // 亮黄
  "#7af5a0",
  // 薄荷
  "#ff8fa7",
  // 浅玫
  "#58c9ff",
  // 天蓝
  "#e8b0ff",
  // 淡紫
  "#6bf0d0",
  // 青绿
  "#ffcb6b"
  // 香槟
];
function varColor(index) {
  if (index < VAR_PALETTE.length) return VAR_PALETTE[index];
  const hue = index * 137.508 % 360;
  return `hsl(${hue.toFixed(0)}, 72%, 66%)`;
}
function hlStrong(color, active) {
  return {
    background: `color-mix(in srgb, ${color} ${active ? 32 : 22}%, transparent)`,
    color: "var(--dsw-alias-label-primary, #f2f6fc)",
    borderRadius: 4,
    padding: "0 2px",
    fontWeight: 550,
    boxShadow: active ? `0 0 0 1px ${color}, 0 0 0 3px color-mix(in srgb, ${color} 30%, transparent)` : "none"
  };
}
function hlPlaceholder(color, active) {
  return {
    background: `color-mix(in srgb, ${color} ${active ? 20 : 12}%, transparent)`,
    color,
    border: `1px solid color-mix(in srgb, ${color} ${active ? 78 : 45}%, transparent)`,
    borderRadius: 4,
    padding: "0 2px",
    boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${color} 26%, transparent)` : "none"
  };
}
function renderPreview(body, values, colorOf, focusName) {
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const nodes = [];
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) nodes.push(body.slice(last, m.index));
    const name = m[1].trim();
    const color = colorOf(name);
    const active = name === focusName;
    const val = Object.prototype.hasOwnProperty.call(values, name) ? values[name] ?? "" : "";
    if (val && val.trim()) {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-var": name, style: hlStrong(color, active), "data-tip": `{{${name}}}`, children: val }, `f${key++}`)
      );
    } else {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-var": name, style: hlPlaceholder(color, active), children: `{{${name}}}` }, `p${key++}`)
      );
    }
    last = m.index + m[0].length;
  }
  if (last < body.length) nodes.push(body.slice(last));
  return nodes;
}
var VAR_MEMORY_KEY = "pl:template-var-memory";
function loadVarMemory() {
  try {
    const raw = localStorage.getItem(VAR_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
async function loadVarMemoryAsync() {
  const local = loadVarMemory();
  try {
    const raw = await getMetaValue(VAR_MEMORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const meta = typeof parsed === "object" && parsed !== null ? parsed : {};
      return { ...local, ...meta };
    }
    if (Object.keys(local).length > 0) {
      void setMetaValue(VAR_MEMORY_KEY, JSON.stringify(local));
    }
    return local;
  } catch {
    return local;
  }
}
function rememberVarValues(values) {
  try {
    const prior = loadVarMemory();
    for (const [k, v] of Object.entries(values)) {
      if (v && v.trim()) prior[k] = v;
    }
    for (const k of Object.keys(prior)) {
      if (prior[k].length > 2e3) delete prior[k];
    }
    localStorage.setItem(VAR_MEMORY_KEY, JSON.stringify(prior));
    void setMetaValue(VAR_MEMORY_KEY, JSON.stringify(prior));
  } catch {
  }
}
function insertVariableAt(el, value, setValue, defaultName) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const selected = value.slice(start, end).trim();
  const inject2 = selected ? `{{${selected}}}` : `{{${defaultName ?? ""}}}`;
  setValue(value.slice(0, start) + inject2 + value.slice(end));
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = selected ? end + inject2.length : start + 2 + (defaultName?.length ?? 0);
    el.setSelectionRange(pos, pos);
  });
}
function TemplateFillModal({
  open,
  variables,
  body,
  onCancel,
  onConfirm,
  onInsertAndSend,
  draftEmpty,
  confirmLabel,
  showInsertAndSend = true,
  initialValues,
  t
}) {
  const [values, setValues] = (0, import_react3.useState)({});
  const [focusName, setFocusName] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    let cancelled = false;
    if (open) {
      setWarnMsg(null);
      void loadVarMemoryAsync().then((mem) => {
        if (cancelled) return;
        const init2 = {};
        for (const name of variables) {
          if (Object.prototype.hasOwnProperty.call(mem, name)) init2[name] = mem[name];
        }
        setValues({ ...init2, ...initialValues ?? {} });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [open, variables, initialValues]);
  const colorOf = (0, import_react3.useCallback)(
    (name) => varColor(Math.max(0, variables.indexOf(name))),
    [variables]
  );
  const previewRef = (0, import_react3.useRef)(null);
  (0, import_react3.useEffect)(() => {
    if (!focusName) return;
    const el = previewRef.current;
    if (!el) return;
    const target = el.querySelector(`[data-var="${CSS.escape(focusName)}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusName]);
  const [warnMsg, setWarnMsg] = (0, import_react3.useState)(null);
  const inputListRef = (0, import_react3.useRef)(null);
  const guardFill = () => {
    const left = variables.filter((name) => !(values[name] ?? "").trim());
    if (left.length === 0) return true;
    setWarnMsg(t("pl.template.unfilled", { count: left.length }));
    const first = inputListRef.current?.querySelector(
      `[data-var-input="${CSS.escape(left[0])}"]`
    );
    first?.focus();
    return false;
  };
  if (!open) return null;
  const submit = () => {
    if (!guardFill()) return;
    rememberVarValues(values);
    onConfirm(values);
  };
  const canSend = Boolean(onInsertAndSend) && showInsertAndSend && draftEmpty === true;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("pl.template.title"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            className: PL_DIALOG,
            style: {
              width: 460,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "min(520px, calc(100vh - 40px))",
              gap: 10
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 4, flexShrink: 0 }, children: t("pl.template.title") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, color: TONE.muted, lineHeight: 1.6, flexShrink: 0 }, children: t("pl.template.desc") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "div",
                {
                  ref: inputListRef,
                  style: {
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    paddingRight: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  },
                  children: variables.map((name) => {
                    const color = colorOf(name);
                    const focused = focusName === name;
                    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "label",
                      {
                        style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            "span",
                            {
                              style: {
                                fontSize: 11,
                                color,
                                background: `color-mix(in srgb, ${color} 14%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                                borderRadius: 5,
                                padding: "0 6px",
                                lineHeight: "18px"
                              },
                              children: `{{${name}}}`
                            }
                          ) }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            "input",
                            {
                              autoFocus: true,
                              "data-var-input": name,
                              value: values[name] ?? "",
                              onChange: (e) => {
                                setWarnMsg(null);
                                setValues((prev) => ({ ...prev, [name]: e.target.value }));
                              },
                              onFocus: () => setFocusName(name),
                              onBlur: () => setFocusName((cur) => cur === name ? null : cur),
                              onKeyDown: (e) => {
                                if (e.key === "Enter") submit();
                                if (e.key === "Escape") onCancel();
                              },
                              placeholder: name,
                              style: {
                                ...inputStyle,
                                // 左侧用变量色做点缀条，聚焦时整框以该变量色描边 + 淡色投光，强化当前操作对象
                                borderLeft: `3px solid ${color}`,
                                borderColor: focused ? color : TONE.border,
                                boxShadow: focused ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : "none",
                                background: focused ? `color-mix(in srgb, ${color} 6%, ${TONE.row})` : TONE.row,
                                transition: "border-color .18s, box-shadow .18s, background .18s"
                              }
                            }
                          )
                        ]
                      },
                      name
                    );
                  })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: 11, color: TONE.muted }, children: t("pl.template.preview") }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "div",
                      {
                        ref: previewRef,
                        style: {
                          maxHeight: 160,
                          overflowY: "auto",
                          boxSizing: "border-box",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          padding: "8px 10px",
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: TONE.text,
                          background: TONE.row,
                          border: `1px solid ${TONE.border}`,
                          borderRadius: 7,
                          fontFamily: MONO
                        },
                        children: renderPreview(body, values, colorOf, focusName)
                      }
                    )
                  ]
                }
              ),
              warnMsg && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  role: "alert",
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--dsw-alias-state-danger-primary, #ff6b6b)",
                    lineHeight: 1.5
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 16 16", style: { flexShrink: 0 }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "path",
                      {
                        d: "M8 4v5M8 11.5v.5",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "1.8",
                        strokeLinecap: "round"
                      }
                    ) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: warnMsg })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: onCancel, children: t("pl.cancel") }),
                showInsertAndSend && onInsertAndSend && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  import_dsh_client_ui_primitives.Button,
                  {
                    type: "button",
                    size: "sm",
                    className: plBtn(canSend ? "primary" : "ghost", "sm"),
                    onClick: () => {
                      if (!guardFill()) return;
                      rememberVarValues(values);
                      onInsertAndSend(values);
                    },
                    disabled: !canSend,
                    "data-tip": canSend ? t("pl.insertSend") : t("pl.insertSendDisabled"),
                    children: t("pl.insertSend")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: submit, children: confirmLabel ?? t("pl.insert") })
              ] })
            ]
          }
        )
      ]
    }
  );
}
var inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE.text,
  background: TONE.row,
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none"
};

// src/client/components/data/SelectionAddPrompt.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var MONO2 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function execCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => Promise.resolve(execCopy(text)));
  }
  return Promise.resolve(execCopy(text));
}
var TONE2 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  panel: "var(--dsw-alias-bg-layer-1, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
var inputStyle2 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE2.text,
  background: "var(--dsw-alias-bg-layer-2, #ffffff)",
  border: `1px solid ${TONE2.border}`,
  borderRadius: 7,
  fontFamily: MONO2,
  fontSize: 13,
  outline: "none"
};
function tplTagChipStyle(active) {
  return {
    padding: "3px 9px",
    borderRadius: 11,
    border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE2.border}`,
    background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #4f9df5) 16%, transparent)" : "var(--dsw-alias-bg-layer-2, #ffffff)",
    color: active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE2.muted,
    fontSize: 11,
    lineHeight: 1,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s, color 0.15s, border-color 0.15s"
  };
}
var floatingBtnStyle = {
  height: 30,
  padding: "0 12px",
  border: 0,
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(17, 24, 39, 0.14)",
  color: TONE2.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.15s"
};
var SELECTION_ACTIONS = ["copy", "add", "tpl"];
var DEFAULT_ACTION_KEY = "pl-selection-default-action";
var ACTION_ICON = {
  copy: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2", stroke: "currentColor", strokeWidth: "1.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M5 15V6a2 2 0 0 1 2-2h9", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
  ] }),
  add: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M12 5v14M5 12h14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }),
  tpl: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4 6h9v4H4V6Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4 14h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
  ] })
};
function loadDefaultAction() {
  try {
    const v = localStorage.getItem(DEFAULT_ACTION_KEY);
    if (v === "add" || v === "tpl") return v;
  } catch {
  }
  return "copy";
}
function prefillWithSelection(variables, text) {
  if (variables.length === 0) return {};
  const contentRe = /内容|正文|原文|材料|素材|content|text|body|article|material|input/i;
  const hit = variables.find((v) => contentRe.test(v));
  return { [hit ?? variables[0]]: text };
}
function SelectionAddPrompt(props) {
  const T = usePLT(props?.t);
  const enabled = props.enabled;
  const inputActions = props.inputActions;
  const draft = props.draft ?? "";
  const [selection, setSelection] = (0, import_react4.useState)(null);
  const [open, setOpen] = (0, import_react4.useState)(false);
  const [copied, setCopied] = (0, import_react4.useState)(false);
  const copyingRef = (0, import_react4.useRef)(false);
  const selectingRef = (0, import_react4.useRef)(false);
  const floatingRef = (0, import_react4.useRef)(null);
  const [moreOpen, setMoreOpen] = (0, import_react4.useState)(false);
  const [defaultAction, setDefaultAction] = (0, import_react4.useState)(loadDefaultAction);
  const [title, setTitle] = (0, import_react4.useState)("");
  const [body, setBody] = (0, import_react4.useState)("");
  const [tags, setTags] = (0, import_react4.useState)("");
  const bodyRef = (0, import_react4.useRef)(null);
  const [error, setError] = (0, import_react4.useState)(null);
  const [saving, setSaving] = (0, import_react4.useState)(false);
  const [allTags, setAllTags] = (0, import_react4.useState)([]);
  const [prompts, setPrompts] = (0, import_react4.useState)([]);
  const [tplPickerOpen, setTplPickerOpen] = (0, import_react4.useState)(false);
  const [tplText, setTplText] = (0, import_react4.useState)("");
  const [tplPrefill, setTplPrefill] = (0, import_react4.useState)({});
  const [tplPick, setTplPick] = (0, import_react4.useState)(null);
  const [tplQuery, setTplQuery] = (0, import_react4.useState)("");
  const [tplTag, setTplTag] = (0, import_react4.useState)("");
  const loadTags = (0, import_react4.useCallback)(() => {
    if (!enabled) return;
    listTags().then((list) => setAllTags(list.map((t) => t.name).sort())).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadTags);
  (0, import_react4.useEffect)(() => {
    loadTags();
  }, [loadTags]);
  const loadPrompts = (0, import_react4.useCallback)(() => {
    if (!enabled) return;
    listPrompts().then(setPrompts).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadPrompts);
  (0, import_react4.useEffect)(() => {
    loadPrompts();
  }, [loadPrompts]);
  const openTplPicker = (text) => {
    setSelection(null);
    setTplText(text);
    setTplQuery("");
    setTplTag("");
    setTplPickerOpen(true);
  };
  const pickTemplate = (p) => {
    setTplPickerOpen(false);
    setTplPrefill(prefillWithSelection(extractVariables(p.body), tplText));
    setTplPick(p);
  };
  const chooseDefaultAction = (0, import_react4.useCallback)((id) => {
    setDefaultAction(id);
    try {
      localStorage.setItem(DEFAULT_ACTION_KEY, id);
    } catch {
    }
  }, []);
  const actionLabel = (0, import_react4.useCallback)(
    (id) => id === "copy" ? copied ? T("pl.copiedSelected") : T("pl.copySelected") : id === "add" ? T("pl.addToLibrary") : T("pl.applyTemplate"),
    [copied, T]
  );
  const applyTpl = (0, import_react4.useCallback)(
    (values) => {
      if (!tplPick) return;
      const filled = applyVariables(tplPick.body, values);
      usePrompt(tplPick.id).catch(() => {
      });
      inputActions?.setDraft(draft && draft.trim() ? `${draft}

${filled}` : filled);
      setTplPick(null);
      setTplPrefill({});
    },
    [tplPick, draft, inputActions]
  );
  const templateTags = (0, import_react4.useMemo)(
    () => Array.from(
      new Set(
        prompts.filter((p) => hasVariables(p.body)).flatMap((p) => p.tags ?? [])
      )
    ).sort((a, b) => a.localeCompare(b, "zh")),
    [prompts]
  );
  const templates = prompts.filter(
    (p) => hasVariables(p.body) && (!tplTag || p.tags?.includes(tplTag)) && (!tplQuery.trim() || `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(tplQuery.trim().toLowerCase()))
  );
  (0, import_react4.useEffect)(() => {
    if (!enabled) return;
    const update = () => {
      if (open) {
        setSelection(null);
        return;
      }
      if (copyingRef.current) return;
      if (selectingRef.current) {
        setSelection(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const text = sel.toString();
      if (!text.trim() || text.length > 2e3) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const rootEl = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
      if (!rootEl || !rootEl.closest("[data-conversation-scroll]") || rootEl.closest("[data-composer-seat]") || rootEl.closest("[data-prompt-library-root]")) {
        setSelection(null);
        return;
      }
      setSelection({ text, rect: range.getBoundingClientRect() });
    };
    const onMouseDown = (e) => {
      if (floatingRef.current?.contains(e.target)) return;
      setMoreOpen(false);
      selectingRef.current = true;
    };
    const onMouseUp = (e) => {
      if (floatingRef.current?.contains(e.target)) return;
      selectingRef.current = false;
      update();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        return;
      }
      if (e.key === "Shift" || e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown") {
        selectingRef.current = true;
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown") {
        selectingRef.current = false;
        update();
      }
    };
    const onSelChange = () => {
      if (copyingRef.current) return;
      if (selectingRef.current) {
        setSelection(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) {
        setSelection(null);
      }
    };
    document.addEventListener("selectionchange", onSelChange);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("scroll", update, true);
    const timer = window.setInterval(() => {
      if (copyingRef.current) return;
      if (selectingRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) setSelection(null);
    }, 300);
    return () => {
      document.removeEventListener("selectionchange", onSelChange);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(timer);
    };
  }, [enabled, open]);
  (0, import_react4.useEffect)(() => {
    if (!selection) setMoreOpen(false);
  }, [selection]);
  const openModal = (text) => {
    setSelection(null);
    setCopied(false);
    setTitle("");
    setBody(text);
    setTags("");
    setError(null);
    setOpen(true);
  };
  const copySelected = (text) => {
    copyingRef.current = true;
    copyText(text).then((ok) => {
      if (!ok) {
        copyingRef.current = false;
        return;
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        copyingRef.current = false;
      }, 1500);
    });
  };
  const closeModal = () => {
    setOpen(false);
    setTitle("");
    setBody("");
    setTags("");
    setError(null);
  };
  const save = () => {
    const tTitle = title.trim();
    const tBody = body;
    if (!tTitle || !tBody) {
      setError(T("pl.requireTitleBody"));
      return;
    }
    const tTags = tags.split("#").map((x) => x.trim()).filter(Boolean);
    setSaving(true);
    createPrompt({ title: tTitle, body: tBody, tags: tTags }).then(
      (p) => {
        markRecent(p.id);
        notifyDataChanged();
        setSaving(false);
        closeModal();
      },
      (e) => {
        setSaving(false);
        setError(e instanceof Error ? e.message : String(e));
      }
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: `
.pl-selection-btn{background:var(--dsw-alias-bg-layer-2, #ffffff)}
.pl-selection-btn:hover{background:var(--dsw-alias-bg-layer-3, #eef1f5)}
.pl-selection-btn:active{background:var(--dsw-alias-bg-layer-3, #e0e4ea)}
.pl-selection-btn:disabled{opacity:.6;cursor:default}
.pl-selection-row:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))}
.pl-selection-setdefault:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06));color:var(--dsw-alias-brand-primary, #4f9df5)}
` }),
    enabled && selection && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        ref: floatingRef,
        style: {
          position: "fixed",
          // 水平固定在选区左侧边缘，紧贴视口左边界（最小 8px），不带水平居中偏移
          left: Math.max(selection.rect.left, 8),
          // 顶部余量不足以容纳浮层时翻转到选区下方，避免被裁出屏幕
          top: selection.rect.top - 8 < 46 ? selection.rect.bottom + 8 : selection.rect.top - 8,
          transform: selection.rect.top - 8 < 46 ? "translate(0, 0)" : "translate(0, -100%)",
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          gap: 4
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              "aria-label": actionLabel(defaultAction),
              onClick: () => {
                if (defaultAction === "copy") copySelected(selection.text);
                else if (defaultAction === "add") openModal(selection.text);
                else openTplPicker(selection.text);
              },
              "data-tip": actionLabel(defaultAction),
              style: { ...floatingBtnStyle, width: 30, padding: 0, justifyContent: "center" },
              children: defaultAction === "copy" && copied ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M20 6 9 17l-5-5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) : ACTION_ICON[defaultAction]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              "aria-expanded": moreOpen,
              "aria-haspopup": "menu",
              onClick: () => setMoreOpen((v) => !v),
              "data-tip": T("pl.selectionMore"),
              style: { ...floatingBtnStyle, width: 26, padding: 0, justifyContent: "center" },
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "svg",
                {
                  width: "12",
                  height: "12",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  "aria-hidden": "true",
                  style: { transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" },
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m6 9 6 6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })
                }
              )
            }
          ),
          moreOpen && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              role: "menu",
              "aria-label": T("pl.selectionMore"),
              style: {
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: 188,
                boxSizing: "border-box",
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: TONE2.panel,
                border: `1px solid ${TONE2.border}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(17, 24, 39, 0.16)"
              },
              children: SELECTION_ACTIONS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { role: "menuitem", style: { display: "flex", alignItems: "center", gap: 4 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "pl-selection-row",
                    onClick: () => {
                      if (id === "copy") copySelected(selection.text);
                      else {
                        setMoreOpen(false);
                        if (id === "add") openModal(selection.text);
                        else openTplPicker(selection.text);
                      }
                    },
                    style: {
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 9px",
                      border: 0,
                      borderRadius: 7,
                      background: "transparent",
                      color: TONE2.text,
                      fontSize: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      transition: "background 0.15s"
                    },
                    children: [
                      id === "copy" && copied ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M20 6 9 17l-5-5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) : ACTION_ICON[id],
                      actionLabel(id)
                    ]
                  }
                ),
                id === defaultAction ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "span",
                  {
                    style: {
                      flexShrink: 0,
                      fontSize: 10,
                      lineHeight: 1,
                      padding: "4px 6px",
                      borderRadius: 6,
                      color: "var(--dsw-alias-brand-primary, #4f9df5)",
                      background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #4f9df5) 12%, transparent)"
                    },
                    children: T("pl.selectionIsDefault")
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "pl-selection-setdefault",
                    onClick: () => chooseDefaultAction(id),
                    "data-tip": T("pl.selectionSetDefault"),
                    "aria-label": T("pl.selectionSetDefault"),
                    style: {
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      padding: 0,
                      border: 0,
                      borderRadius: 6,
                      background: "transparent",
                      color: TONE2.muted,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s"
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "path",
                      {
                        d: "M9 4h6M10 4v5.2a2 2 0 0 1-.4 1.2L8 12.5V14h8v-1.5l-1.6-2.1a2 2 0 0 1-.4-1.2V4M12 14v6",
                        stroke: "currentColor",
                        strokeWidth: "1.8",
                        strokeLinecap: "round",
                        strokeLinejoin: "round"
                      }
                    ) })
                  }
                )
              ] }, id))
            }
          )
        ]
      }
    ),
    enabled && open && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.addToLibrary"),
        className: PL_DIALOG_OVERLAY,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              onClick: (e) => e.stopPropagation(),
              className: PL_DIALOG,
              style: {
                width: 520,
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "min(600px, calc(100vh - 40px))",
                gap: 9
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 6, flexShrink: 0 }, children: T("pl.addToLibrary") }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 9 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE2.muted, flexShrink: 0 }, children: [
                    T("pl.titleField"),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), style: inputStyle2 })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE2.muted, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                      T("pl.bodyField"),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        import_dsh_client_ui_primitives2.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          style: { flex: "0 0 auto" },
                          onMouseDown: (e) => e.preventDefault(),
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            insertVariableAt(bodyRef.current, body, setBody, T("pl.insertVariableDefault"));
                          },
                          "data-tip": T("pl.insertVariableTitle"),
                          children: `{{${T("pl.insertVariableDefault")}}}`
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("textarea", { ref: bodyRef, value: body, onChange: (e) => setBody(e.target.value), rows: 8, style: { ...inputStyle2, resize: "vertical" } })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE2.muted, flexShrink: 0 }, children: [
                    T("pl.tagsField"),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TagInput, { value: tags, onChange: setTags, suggestions: allTags, inputStyle: inputStyle2, t: props?.t })
                  ] }),
                  error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { color: TONE2.red, fontSize: 12, flexShrink: 0 }, children: error })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives2.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeModal, disabled: saving, children: T("pl.cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives2.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: save, disabled: saving, children: saving ? T("pl.saving") : T("pl.save") })
                ] })
              ]
            }
          )
        ]
      }
    ),
    enabled && tplPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.applyTemplate"),
        className: PL_DIALOG_OVERLAY,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              onClick: (e) => e.stopPropagation(),
              className: PL_DIALOG,
              style: {
                width: 480,
                maxWidth: "calc(100vw - 40px)",
                // 固定宽高（480 × 560）：仅当页面窗口小于固定尺寸时才自适应收缩，
                // 内容多时列表在内部滚动，不随内容撑高
                height: "min(560px, calc(100vh - 40px))",
                gap: 10
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 2, flexShrink: 0 }, children: T("pl.applyTemplate") }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, color: TONE2.muted, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.applyTemplateDesc", { length: tplText.length }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "div",
                  {
                    style: {
                      boxSizing: "border-box",
                      maxHeight: 84,
                      overflow: "auto",
                      padding: "8px 10px",
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: TONE2.muted,
                      background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                      border: `1px solid ${TONE2.border}`,
                      borderRadius: 7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      flexShrink: 0
                    },
                    children: tplText || " "
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "input",
                  {
                    autoFocus: true,
                    value: tplQuery,
                    onChange: (e) => setTplQuery(e.target.value),
                    placeholder: T("pl.search"),
                    style: inputStyle2
                  }
                ),
                templateTags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => setTplTag(""), style: tplTagChipStyle(tplTag === ""), children: T("pl.tagFilterAll") }),
                  templateTags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => setTplTag(tplTag === tag ? "" : tag),
                      style: tplTagChipStyle(tplTag === tag),
                      children: tag
                    },
                    tag
                  ))
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 6 }, children: [
                  templates.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { padding: "18px 12px", color: TONE2.muted, fontSize: 13, textAlign: "center" }, children: T("pl.applyTemplateEmpty") }),
                  templates.map((p) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      onClick: () => pickTemplate(p),
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        alignItems: "flex-start",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${TONE2.border}`,
                        background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                        color: TONE2.text,
                        cursor: "pointer",
                        transition: "background 0.15s"
                      },
                      onMouseEnter: (e) => {
                        e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2, #ffffff)";
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }, children: clampTitle(p.title) }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: extractVariables(p.body).slice(0, 4).map((v) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "span",
                          {
                            style: {
                              fontSize: 10,
                              lineHeight: 1,
                              padding: "3px 6px",
                              borderRadius: 6,
                              color: TONE2.muted,
                              border: `1px solid ${TONE2.border}`,
                              whiteSpace: "nowrap"
                            },
                            children: `{{${v}}}`
                          },
                          v
                        )) })
                      ]
                    },
                    p.id
                  ))
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives2.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setTplPickerOpen(false), children: T("pl.cancel") }) })
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      TemplateFillModal,
      {
        open: tplPick !== null,
        variables: tplPick ? extractVariables(tplPick.body) : [],
        body: tplPick ? tplPick.body : "",
        initialValues: tplPrefill,
        onCancel: () => {
          setTplPick(null);
          setTplPrefill({});
          setTplPickerOpen(true);
        },
        onConfirm: applyTpl,
        confirmLabel: T("pl.insert"),
        draftEmpty: !draft.trim(),
        t: T
      }
    )
  ] });
}

// src/client/components/common/Pagination.tsx
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime4 = require("react/jsx-runtime");
var TONE3 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))"
};
function Pagination({
  page,
  totalPages,
  onChange,
  prevLabel,
  nextLabel,
  textColor
}) {
  if (totalPages <= 1) return null;
  const text = textColor ?? TONE3.text;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      style: {
        padding: "8px 12px",
        borderTop: `1px solid ${TONE3.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 12, color: text }, children: [
          page,
          " / ",
          totalPages
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            import_dsh_client_ui_primitives3.Button,
            {
              type: "button",
              size: "sm",
              disabled: page <= 1,
              onClick: () => onChange(page - 1),
              style: { color: text },
              children: prevLabel ?? "\u2039 \u4E0A\u4E00\u9875"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            import_dsh_client_ui_primitives3.Button,
            {
              type: "button",
              size: "sm",
              disabled: page >= totalPages,
              onClick: () => onChange(page + 1),
              style: { color: text },
              children: nextLabel ?? `\u4E0B\u4E00\u9875 \u203A`
            }
          )
        ] })
      ]
    }
  );
}

// src/client/utils/theme.ts
var import_react5 = require("react");
function isDarkMode() {
  const body = typeof document !== "undefined" ? document.body : null;
  if (body && body.hasAttribute("data-ds-dark-theme")) return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
function getTone() {
  const d = isDarkMode();
  return {
    text: d ? "var(--dsw-alias-label-primary, #f2f6fc)" : "var(--dsw-alias-label-primary, #1f2937)",
    muted: d ? "var(--dsw-alias-label-secondary, #9daabd)" : "var(--dsw-alias-label-secondary, #64748b)",
    quiet: d ? "var(--dsw-alias-label-tertiary, #718096)" : "var(--dsw-alias-label-tertiary, #94a3b8)",
    panel: d ? "var(--dsw-alias-bg-layer-1, #171f2b)" : "var(--dsw-alias-bg-layer-1, #ffffff)",
    row: d ? "var(--dsw-alias-bg-layer-3, #1d2735)" : "var(--dsw-alias-bg-layer-3, #f2f4f7)",
    border: d ? "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))" : "var(--dsw-alias-border-l2, rgba(15, 23, 42, 0.12))",
    borderStrong: d ? "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))" : "var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.2))",
    accent: d ? "var(--dsw-alias-brand-primary, #8ec5ff)" : "var(--dsw-alias-brand-primary, #2563eb)",
    accentSoft: d ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)" : "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 12%, transparent)",
    mint: d ? "var(--dsw-alias-state-success-primary, #78dda0)" : "var(--dsw-alias-state-success-primary, #16a34a)",
    red: d ? "var(--dsw-alias-state-error-primary, #ff8592)" : "var(--dsw-alias-state-error-primary, #dc2626)"
  };
}
var themeListeners = /* @__PURE__ */ new Set();
var themeWatching = false;
function refreshTheme() {
  for (const l of themeListeners) l();
}
function ensureThemeWatch() {
  if (themeWatching || typeof window === "undefined") return;
  themeWatching = true;
  const mo = new MutationObserver(refreshTheme);
  const watch = () => {
    if (document.body)
      mo.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
  };
  if (document.body) watch();
  else document.addEventListener("DOMContentLoaded", watch);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", refreshTheme);
}
function useThemeSync() {
  const [dark, setDark] = (0, import_react5.useState)(isDarkMode());
  (0, import_react5.useEffect)(() => {
    ensureThemeWatch();
    const listener = () => setDark(isDarkMode());
    themeListeners.add(listener);
    listener();
    return () => {
      themeListeners.delete(listener);
    };
  }, []);
  return dark;
}
function rowBackground() {
  return isDarkMode() ? "#353638" : "var(--dsw-alias-bg-layer-3, #ffffff)";
}

// src/client/components/common/ConfirmDialog.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var RED = "var(--dsw-alias-state-error-primary, #f87171)";
function ConfirmDialog({
  open,
  message,
  danger = false,
  confirmLabel = "\u786E\u5B9A",
  cancelLabel = "\u53D6\u6D88",
  onCancel,
  onConfirm
}) {
  useThemeSync();
  if (!open) return null;
  const TONE12 = getTone();
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--dsw-alias-border-l2)",
    outline: "none",
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 14,
    cursor: "pointer",
    background: "transparent",
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("style", { children: PL_DIALOG_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: PL_DIALOG_OVERLAY, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        className: PL_DIALOG,
        style: { width: 360, maxWidth: "100%", gap: 14 },
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: message }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "button",
              {
                type: "button",
                style: { ...btn, color: TONE12.text },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                onClick: onCancel,
                children: cancelLabel
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "button",
              {
                type: "button",
                style: {
                  ...btn,
                  color: danger ? RED : "var(--dsw-alias-brand-primary, #2563eb)",
                  fontWeight: 600
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                onClick: onConfirm,
                children: confirmLabel
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}

// src/client/components/common/SearchBox.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var MONO3 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE4 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)"
};
var chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 24,
  padding: "0 10px",
  boxSizing: "border-box",
  // 固定最大宽度：内容过长时配合内层 span 显示省略号，避免撑破/换行
  maxWidth: 150,
  overflow: "hidden",
  border: `1px solid ${TONE4.border}`,
  borderRadius: 999,
  fontWeight: 500,
  fontSize: 11,
  lineHeight: 1,
  fontFamily: "inherit",
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
  appearance: "none",
  cursor: "pointer",
  userSelect: "none",
  transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease"
};
var chipTextStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
var barStyle = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: 8,
  rowGap: 8,
  marginTop: 10,
  paddingBottom: 2
};
function PinIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "svg",
    {
      width: "11",
      height: "11",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { marginRight: 4, flexShrink: 0 },
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M12 17v5" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" })
      ]
    }
  );
}
function TagFilterBar(props) {
  const { tags, active, onChange, allLabel } = props;
  const chip = (selected) => ({
    ...chipStyle,
    background: selected ? TONE4.accentSoft : TONE4.row,
    color: selected ? TONE4.accent : TONE4.text,
    borderColor: selected ? TONE4.accent : TONE4.border,
    // pin 效果：选中标签轻微上浮、带投影，像被图钉钉在过滤条上
    transform: selected ? "translateY(-1px)" : "none",
    boxShadow: selected ? "0 2px 6px rgba(15, 23, 42, 0.18)" : "none",
    padding: selected ? "0 7px 0 6px" : "0 8px"
  });
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: barStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { type: "button", onClick: () => onChange(""), style: chip(active === ""), children: [
      active === "" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PinIcon, {}),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: chipTextStyle, children: allLabel ?? "\u5168\u90E8" })
    ] }),
    tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onChange(active === tag ? "" : tag),
        "data-tip": tag,
        style: chip(active === tag),
        children: [
          active === tag && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PinIcon, {}),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: chipTextStyle, children: tag })
        ]
      },
      tag
    ))
  ] });
}
function SearchBox({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder,
  inputRef
}) {
  const hasText = value.length > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { position: "relative", width: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "button",
      {
        type: "button",
        "data-tip": "\u641C\u7D22",
        onClick: onSearch,
        "aria-label": "\u641C\u7D22",
        style: {
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          color: hasText ? TONE4.accent : TONE4.quiet,
          background: "transparent",
          border: "none",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "svg",
          {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M21 21l-4.35-4.35" })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "input",
      {
        ref: inputRef,
        className: "pl-search-input",
        value,
        onChange: (e) => onChange(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") onSearch();
        },
        placeholder: placeholder ?? "\u641C\u7D22",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 30px 8px 28px",
          color: TONE4.text,
          background: TONE4.row,
          border: `1px solid ${TONE4.border}`,
          borderRadius: 9,
          fontFamily: MONO3,
          fontSize: 13,
          outline: "none"
        }
      }
    ),
    hasText && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "button",
      {
        type: "button",
        "data-tip": "\u6E05\u9664",
        "aria-label": "\u6E05\u9664",
        onClick: onClear,
        style: {
          position: "absolute",
          right: 7,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          padding: 0,
          color: TONE4.quiet,
          background: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "svg",
          {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M15 9l-6 6M9 9l6 6" })
            ]
          }
        )
      }
    )
  ] });
}

// src/client/components/data/PromptLibraryButton.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var MONO4 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE5 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)"
};
var lastPromptsForSelect = [];
function getEditableText(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  if (el.isContentEditable) {
    return el.textContent ?? "";
  }
  return null;
}
function getCaretPosition(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const text = getEditableText(el);
    return el.selectionStart ?? text?.length ?? 0;
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }
  return 0;
}
function getCaretRect(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return measureFieldCaretRect(el);
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (range) {
      const r = range.cloneRange();
      const rects = r.getClientRects();
      if (rects.length > 0) return rects.item(0);
      const br = r.getBoundingClientRect();
      if (br.width > 0 || br.height > 0) return br;
    }
  }
  return el.getBoundingClientRect();
}
function measureFieldCaretRect(el) {
  const value = getEditableText(el) ?? "";
  const pos = Math.min(el.selectionStart ?? value.length, value.length);
  const style = window.getComputedStyle(el);
  const elRect = el.getBoundingClientRect();
  const mirror = document.createElement("div");
  mirror.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "visibility: hidden",
    "pointer-events: none",
    "white-space: pre-wrap",
    "word-break: break-word",
    "overflow-wrap: break-word",
    // 盒模型关键项
    `box-sizing: ${style.boxSizing}`,
    `width: ${elRect.width}px`,
    `padding-top: ${style.paddingTop}`,
    `padding-right: ${style.paddingRight}`,
    `padding-bottom: ${style.paddingBottom}`,
    `padding-left: ${style.paddingLeft}`,
    `border-top-width: ${style.borderTopWidth}`,
    `border-bottom-width: ${style.borderBottomWidth}`,
    `border-right-width: ${style.borderRightWidth}`,
    `border-left-width: ${style.borderLeftWidth}`,
    // 文本样式
    `font: ${style.font}`,
    `letter-spacing: ${style.letterSpacing}`,
    `line-height: ${style.lineHeight}`,
    `text-align: ${style.textAlign}`,
    `text-indent: ${style.textIndent}`
  ].join(";");
  const before = document.createElement("span");
  before.textContent = value.slice(0, pos);
  const caret = document.createElement("span");
  caret.textContent = " ";
  mirror.appendChild(before);
  mirror.appendChild(caret);
  document.body.appendChild(mirror);
  const caretRect = caret.getBoundingClientRect();
  document.body.removeChild(mirror);
  const scrollTop = el.scrollTop ?? 0;
  const scrollLeft = el.scrollLeft ?? 0;
  return new DOMRect(
    caretRect.left + elRect.left - scrollLeft,
    caretRect.top + elRect.top - scrollTop,
    caretRect.width,
    caretRect.height
  );
}
function useTildaTrigger(settings, prompts, inputActions, draft, t, onSelect) {
  const activeRef = (0, import_react6.useRef)(false);
  const triggerIdxRef = (0, import_react6.useRef)(-1);
  const draftRef = (0, import_react6.useRef)(draft);
  const inputActionsRef = (0, import_react6.useRef)(inputActions);
  const onSelectRef = (0, import_react6.useRef)(onSelect);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
  onSelectRef.current = onSelect;
  lastPromptsForSelect = prompts;
  (0, import_react6.useEffect)(() => {
    if (!settings.tildaTriggerEnabled) return;
    const tryShowOverlay = (target) => {
      if (activeRef.current) return;
      const el = target;
      if (!el || !(el instanceof HTMLElement)) return;
      if (!el.closest?.("[data-composer-seat]")) return;
      if (el.closest?.("[data-pl-no-hash-trigger]")) return;
      const value = getEditableText(el);
      if (value === null) return;
      const selStart = getCaretPosition(el);
      if (selStart <= 0) return;
      if (value[selStart - 1] !== "#") return;
      const prevChar = selStart > 1 ? value[selStart - 2] : " ";
      if (prevChar !== " " && prevChar !== "\n") return;
      activeRef.current = true;
      triggerIdxRef.current = selStart - 1;
      showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, "", t, onSelectRef.current);
    };
    const onKeyDown = (e) => {
      if (activeRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          activeRef.current = false;
          triggerIdxRef.current = -1;
          removeOverlay();
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          highlightNext(e.key === "ArrowDown" ? 1 : -1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const selected = getSelectedPrompt();
          if (selected) {
            if (onSelectRef.current) onSelectRef.current(selected);
            else applyPrompt(selected, inputActionsRef.current, draftRef.current);
          }
          activeRef.current = false;
          triggerIdxRef.current = -1;
          removeOverlay();
          return;
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "#" || e.key === "3" || e.key === "Dead" || e.key === "Process") {
        tryShowOverlay(e.target);
      }
    };
    const onInput = (e) => {
      if (activeRef.current) {
        const el = e.target;
        if (el instanceof HTMLElement) {
          const value = getEditableText(el);
          const selStart = getCaretPosition(el);
          const tri = triggerIdxRef.current;
          if (value === null || tri < 0 || tri >= value.length || value[tri] !== "#" || selStart < tri) {
            activeRef.current = false;
            triggerIdxRef.current = -1;
            removeOverlay();
            return;
          }
          const query = value.slice(tri + 1, selStart);
          if (query.includes(" ")) {
            activeRef.current = false;
            triggerIdxRef.current = -1;
            removeOverlay();
            return;
          }
          showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, query, t, onSelectRef.current);
        }
        return;
      }
      tryShowOverlay(e.target);
    };
    const onCompositionEnd = (e) => tryShowOverlay(e.target);
    const onDocClick = (e) => {
      if (!activeRef.current) return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const overlay = document.querySelector("[data-prompt-library-overlay]");
      if (overlay && overlay.contains(target)) return;
      if (target.closest("textarea, input, [contenteditable='true']")) return;
      activeRef.current = false;
      removeOverlay();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("input", onInput);
    document.addEventListener("compositionend", onCompositionEnd);
    document.addEventListener("click", onDocClick, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("input", onInput);
      document.removeEventListener("compositionend", onCompositionEnd);
      document.removeEventListener("click", onDocClick, true);
      removeOverlay();
    };
  }, [settings.tildaTriggerEnabled, t]);
}
var INPUT_SELECT_PAGE_SIZE = 20;
var highlightIndex = 0;
function removeOverlay() {
  const overlay = document.querySelector("[data-prompt-library-overlay]");
  if (overlay) overlay.remove();
  highlightIndex = 0;
}
function showOverlay(target, prompts, inputActions, draft, query = "", t, onSelect) {
  removeOverlay();
  if (prompts.length === 0) return;
  const q = query.trim().toLowerCase();
  const source = q ? prompts.filter(
    (p) => `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q)
  ) : [...prompts].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)).slice(0, INPUT_SELECT_PAGE_SIZE);
  const filtered = source.map((p) => ({ p }));
  const rect = getCaretRect(target);
  const overlay = document.createElement("div");
  overlay.dataset.promptLibraryOverlay = "";
  overlay.style.cssText = [
    "position: fixed",
    `top: ${rect.bottom + 4}px`,
    `left: ${rect.left}px`,
    "z-index: 2147483647",
    "min-width: 280px",
    "max-width: 400px",
    "max-height: 300px",
    "display: flex",
    "flex-direction: column",
    `background: ${TONE5.panel}`,
    `border: 1px solid ${TONE5.borderStrong}`,
    "border-radius: 8px",
    `font-family: ${MONO4}`,
    "font-size: 12px",
    "padding: 4px"
  ].join(";");
  const listBox = document.createElement("div");
  listBox.style.cssText = ["overflow-y: auto", "flex: 1 1 auto", "min-height: 0"].join(";");
  overlay.appendChild(listBox);
  const clearHighlight = () => {
    for (const child of listBox.children) {
      child.style.background = "transparent";
    }
  };
  const highlightItem = (index) => {
    clearHighlight();
    highlightIndex = index;
    const item = listBox.children[index];
    if (item) {
      item.style.background = TONE5.accentSoft;
      item.scrollIntoView({ block: "nearest" });
    }
  };
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = q ? t("pl.overlayNoMatch", { query: q }) : t("pl.empty");
    empty.style.cssText = [
      "padding: 10px",
      "font-size: 12px",
      `color: ${TONE5.quiet}`
    ].join(";");
    listBox.appendChild(empty);
  }
  filtered.forEach(({ p }, i) => {
    const item = document.createElement("div");
    item.dataset.promptLibraryItem = "";
    item._prompt = p;
    item.style.cssText = [
      "padding: 6px 10px",
      "cursor: pointer",
      "border-radius: 4px",
      "display: flex",
      "flex-direction: column",
      "gap: 2px",
      i === 0 ? `background: ${TONE5.accentSoft}` : ""
    ].join(";");
    const title = document.createElement("div");
    title.textContent = clampTitle(p.title);
    title.dataset.tip = p.title;
    title.style.cssText = [
      "font-size: 12px",
      "font-weight: 600",
      `color: ${TONE5.text}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis"
    ].join(";");
    const body = document.createElement("div");
    const preview = p.body.replace(/\s+/g, " ").trim();
    body.textContent = preview.length > 80 ? `${preview.slice(0, 80)}\u2026` : preview;
    body.style.cssText = [
      "font-size: 11px",
      `color: ${TONE5.muted}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis"
    ].join(";");
    item.appendChild(title);
    item.appendChild(body);
    item.onclick = () => {
      if (onSelect) onSelect(p);
      else applyPrompt(p, inputActions, draft);
      removeOverlay();
    };
    item.onmouseenter = () => highlightItem(i);
    item.onmouseleave = () => {
      if (highlightIndex === i) item.style.background = "transparent";
    };
    listBox.appendChild(item);
  });
  const hint = document.createElement("div");
  hint.textContent = q ? t("pl.overlayHintFilter", { query: q }) : t("pl.overlayHintDefault");
  hint.style.cssText = [
    "padding: 6px 10px 3px",
    "font-size: 10px",
    `color: ${TONE5.quiet}`,
    "border-top: 1px solid " + TONE5.border,
    "margin-top: 2px",
    "user-select: none",
    "flex-shrink: 0"
  ].join(";");
  overlay.appendChild(hint);
  highlightIndex = 0;
  document.body.appendChild(overlay);
  const spaceBelow = window.innerHeight - (rect.bottom + 4);
  const overlayHeight = overlay.offsetHeight;
  if (spaceBelow < overlayHeight) {
    const spaceAbove = rect.top - 4;
    const usable = Math.min(overlayHeight, spaceAbove);
    overlay.style.maxHeight = `${Math.max(80, usable)}px`;
    overlay.style.top = `${Math.max(4, rect.top - Math.max(80, usable) - 4)}px`;
  }
}
function getOverlayItems() {
  const overlay = document.querySelector("[data-prompt-library-overlay]");
  if (!overlay) return [];
  return Array.from(overlay.querySelectorAll("[data-prompt-library-item]"));
}
function highlightNext(dir) {
  const items = getOverlayItems();
  if (items.length === 0) return;
  const current = items[highlightIndex];
  if (current) current.style.background = "transparent";
  highlightIndex = (highlightIndex + dir + items.length) % items.length;
  const next = items[highlightIndex];
  if (next) {
    next.style.background = TONE5.accentSoft;
    next.scrollIntoView({ block: "nearest" });
  }
}
function getSelectedPrompt() {
  const items = getOverlayItems();
  if (items.length === 0) return null;
  const idx = Math.min(highlightIndex, items.length - 1);
  return items[idx]._prompt ?? null;
}
function applyPrompt(prompt, inputActions, draft) {
  const idx = draft.lastIndexOf("#");
  if (idx >= 0) {
    inputActions.setDraft(`${draft.slice(0, idx)}${prompt.body}`);
  } else {
    inputActions.setDraft(draft && draft.trim() ? `${draft}

${prompt.body}` : prompt.body);
  }
}
function useSettings() {
  const [settings, setSettings] = (0, import_react6.useState)(DEFAULT_SETTINGS);
  const [ready, setReady] = (0, import_react6.useState)(false);
  const load = (0, import_react6.useCallback)(() => {
    getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);
  (0, import_react6.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react6.useEffect)(() => {
    const onChanged = (e) => {
      const detail = e.detail;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);
  return [settings, ready];
}
function PromptLibraryButton(props) {
  const { inputActions, useInput, t } = props;
  const T = usePLT(t);
  const draft = useInput((s) => s.draft);
  const [open, setOpen] = (0, import_react6.useState)(false);
  const [prompts, setPrompts] = (0, import_react6.useState)([]);
  const [deleteConfirm, setDeleteConfirm] = (0, import_react6.useState)(null);
  const [tagNames, setTagNames] = (0, import_react6.useState)([]);
  const [phase, setPhase] = (0, import_react6.useState)("idle");
  const [error, setError] = (0, import_react6.useState)(null);
  const [query, setQuery] = (0, import_react6.useState)("");
  const clearSearch = (0, import_react6.useCallback)(() => setQuery(""), []);
  const [tagFilter, setTagFilter] = (0, import_react6.useState)("");
  const [editor, setEditor] = (0, import_react6.useState)({
    mode: "none",
    title: "",
    body: "",
    tags: ""
  });
  const bodyRef = (0, import_react6.useRef)(null);
  const [toast, setToast] = (0, import_react6.useState)({ visible: false });
  const [template, setTemplate] = (0, import_react6.useState)(null);
  const [viewing, setViewing] = (0, import_react6.useState)(null);
  const [viewPolish, setViewPolish] = (0, import_react6.useState)({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = (0, import_react6.useState)("");
  const [viewPolishSummary, setViewPolishSummary] = (0, import_react6.useState)("");
  const [viewShowOriginal, setViewShowOriginal] = (0, import_react6.useState)(false);
  const [viewPolishError, setViewPolishError] = (0, import_react6.useState)(null);
  const closeView = (0, import_react6.useCallback)(() => {
    setViewing(null);
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewPolishSummary("");
    setViewShowOriginal(false);
    setViewPolishError(null);
  }, []);
  (0, import_react6.useEffect)(() => {
    if (!open) closeView();
  }, [open, closeView]);
  const [settings] = useSettings();
  const panelId = (0, import_react6.useId)();
  const refreshController = (0, import_react6.useRef)(null);
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });
  const showToast = (0, import_react6.useCallback)((text) => {
    setToast({ visible: true, text });
    setTimeout(() => setToast({ visible: false }), 2500);
  }, []);
  const refresh = (0, import_react6.useCallback)(() => {
    refreshController.current?.abort();
    const ctrl = new AbortController();
    refreshController.current = ctrl;
    setPhase("loading");
    setError(null);
    listPrompts().then((list) => {
      if (ctrl.signal.aborted) return;
      setPrompts(list);
      setViewing((cur) => {
        if (!cur) return cur;
        const updated = list.find((x) => x.id === cur.id);
        return updated ?? cur;
      });
      setPhase("ready");
    }).catch((err) => {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    });
    listTags().then((tags) => {
      if (ctrl.signal.aborted) return;
      setTagNames(tags.map((x) => x.name));
    }).catch(() => {
    });
  }, []);
  useDataChanged(refresh);
  useExportDownloaded((0, import_react6.useCallback)((count) => {
    showToast(T("pl.exported", { count }));
  }, [showToast, T]));
  (0, import_react6.useEffect)(() => {
    if (phase === "idle") refresh();
  }, [phase, refresh]);
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (editor.mode !== "none") {
          setEditor({ mode: "none", title: "", body: "", tags: "" });
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, editor.mode]);
  const filtered = (0, import_react6.useMemo)(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
      if (q) {
        const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prompts, query, tagFilter]);
  const PAGE_SIZE = 10;
  const [page, setPage] = (0, import_react6.useState)(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  (0, import_react6.useEffect)(() => {
    setPage(1);
  }, [query, tagFilter, prompts]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allTags = (0, import_react6.useMemo)(() => {
    const s = new Set(tagNames);
    for (const p of prompts) for (const t2 of p.tags ?? []) s.add(t2);
    return Array.from(s).sort();
  }, [prompts, tagNames]);
  const insert = (0, import_react6.useCallback)(
    (prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "insert" });
        return;
      }
      usePrompt(prompt.id).catch(() => {
      });
      const body = prompt.body;
      inputActions.setDraft(draft && draft.trim() ? `${draft}

${body}` : body);
      setOpen(false);
    },
    [draft, inputActions]
  );
  const selectFromOverlay = (0, import_react6.useCallback)(
    (p) => {
      if (hasVariables(p.body)) {
        setTemplate({ prompt: p, mode: "insert", fromOverlay: true });
        return;
      }
      usePrompt(p.id).catch(() => {
      });
      applyPrompt(p, inputActions, draft);
    },
    [draft, inputActions]
  );
  useTildaTrigger(settings, prompts, inputActions, draft, T, selectFromOverlay);
  const overwrite = (0, import_react6.useCallback)(
    (prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "overwrite" });
        return;
      }
      usePrompt(prompt.id).catch(() => {
      });
      inputActions.setDraft(prompt.body);
      setOpen(false);
    },
    [inputActions]
  );
  const applyTemplate = (0, import_react6.useCallback)(
    (values) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      usePrompt(template.prompt.id).catch(() => {
      });
      if (template.fromOverlay) {
        const idx = draft.lastIndexOf("#");
        if (idx >= 0) inputActions.setDraft(`${draft.slice(0, idx)}${filled}`);
        else inputActions.setDraft(filled);
      } else if (template.mode === "insert") {
        inputActions.setDraft(draft && draft.trim() ? `${draft}

${filled}` : filled);
      } else {
        inputActions.setDraft(filled);
      }
      setTemplate(null);
      setOpen(false);
    },
    [template, draft, inputActions]
  );
  const insertAndSend = (0, import_react6.useCallback)(
    (values) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      usePrompt(template.prompt.id).catch(() => {
      });
      let send2 = filled;
      if (template.fromOverlay) {
        const idx = draft.lastIndexOf("#");
        const before = idx >= 0 ? draft.slice(0, idx) : "";
        send2 = before && before.trim() ? `${before}

${filled}` : filled;
      }
      inputActions.setDraft(send2);
      inputActions.submit?.();
      setTemplate(null);
      setOpen(false);
    },
    [template, draft, inputActions]
  );
  const editing = editor.mode !== "none";
  const NO_EDITOR = { mode: "none", title: "", body: "", tags: "" };
  const startCreate = () => setEditor({ mode: "create", title: "", body: "", tags: "" });
  const startEdit = (p) => setEditor({
    mode: "edit",
    id: p.id,
    title: p.title,
    body: p.body,
    tags: (p.tags ?? []).join("#")
  });
  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError(T("pl.requireTitleBody"));
      return;
    }
    const tags = editor.tags.split("#").map((t2) => t2.trim()).filter(Boolean);
    const done = () => {
      setEditor(NO_EDITOR);
      notifyDataChanged();
    };
    if (editor.mode === "create") {
      createPrompt({ title, body, tags }).then(
        (p) => {
          markRecent(p.id);
          done();
        },
        (e) => setError(e instanceof Error ? e.message : String(e))
      );
    } else if (editor.mode === "edit" && editor.id) {
      updatePrompt(editor.id, { title, body, tags }).then(
        done,
        (e) => setError(e instanceof Error ? e.message : String(e))
      );
    }
  };
  const remove = (p) => {
    setDeleteConfirm(p);
  };
  const confirmRemove = () => {
    if (!deleteConfirm) return;
    deletePrompt(deleteConfirm.id).then(
      notifyDataChanged,
      (e) => setError(e instanceof Error ? e.message : String(e))
    );
  };
  const handleButtonClick = () => {
    setOpen((v) => !v);
  };
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      const t2 = e.target;
      if (!(t2 instanceof HTMLElement)) return;
      const panel = document.getElementById(panelId);
      if (panel && panel.contains(t2)) return;
      if (t2.closest("[data-prompt-library]")) return;
      if (editing || viewing) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [open, editing, viewing, panelId]);
  const startViewPolish = (0, import_react6.useCallback)(async () => {
    if (!viewing || viewPolish.status === "loading") return;
    setViewPolish({ status: "loading", id: viewing.id });
    setViewShowOriginal(false);
    setViewPolishError(null);
    try {
      const res = await polishPrompt(viewing.body, { withSummary: true });
      setViewPolishText(res.polished);
      setViewPolishSummary(res.summary ?? "");
      setViewPolish({ status: "done", id: viewing.id });
    } catch (e) {
      setViewPolish({ status: "idle", id: "" });
      setViewPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [viewing, viewPolish.status]);
  const saveViewPolish = (0, import_react6.useCallback)(async () => {
    if (viewPolish.status !== "done" || !viewing) return;
    const body = viewPolishText.trim();
    if (!body) return;
    try {
      const updated = await updatePrompt(viewing.id, {
        body,
        summary: viewPolishSummary.trim() || void 0,
        sourceBody: viewing.body !== body ? viewing.body : void 0,
        aiRefined: true
      });
      setViewing(updated);
      setPrompts((list) => list.map((p) => p.id === updated.id ? updated : p));
      setViewPolish({ status: "idle", id: "" });
      setViewPolishText("");
      setViewPolishSummary("");
      setViewShowOriginal(false);
      notifyDataChanged();
    } catch {
    }
  }, [viewPolish.status, viewPolishText, viewPolishSummary, viewing]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO4
  };
  const panelStyle = {
    position: "absolute",
    // 相对触发按钮水平居中
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(100% + 4px)",
    zIndex: 1e3,
    width: Math.max(300, Math.min(700, settings.panelWidth)),
    maxWidth: "calc(100vw - 24px)",
    // 固定高度：不随内容自动变化，列表在内部滚动（此前用 maxHeight 会随条目增多撑高）
    height: `${settings.panelHeight}px`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    color: TONE5.text,
    background: TONE5.panel,
    border: `1px solid ${TONE5.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO4
  };
  const showComposerButton = settings.showComposerButton;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { "data-prompt-library": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: `@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: `@keyframes pl-progress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: PL_BUTTON_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: `.pl-btn.pl-cbn-btn{border:none;background:var(--dsw-alias-bg-layer-2,#ffffff);box-shadow:none}.pl-btn.pl-cbn-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.pl-btn.pl-cbn-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}` }),
    showComposerButton && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        import_dsh_client_ui_primitives4.Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          className: `${plBtn("ghost", "sm")} pl-cbn-btn`,
          onClick: handleButtonClick,
          "data-tip": T("pl.title"),
          "aria-label": T("pl.title"),
          "aria-expanded": open,
          "aria-controls": panelId,
          icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "path",
              {
                d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z",
                stroke: "currentColor",
                strokeWidth: "1.6",
                strokeLinejoin: "round"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
          ] }),
          children: [
            !settings.composerButtonIconOnly && T("pl.title"),
            !settings.composerButtonIconOnly && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: {
              marginLeft: 2,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
          ]
        }
      ),
      toast.visible && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "span",
        {
          role: "status",
          "aria-live": "polite",
          style: {
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px 4px 10px",
            color: TONE5.panel,
            background: TONE5.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO4,
            whiteSpace: "nowrap",
            // 纯提示：穿透不挡点击
            pointerEvents: "none",
            opacity: 0.94,
            zIndex: 1001
          },
          children: [
            "\u2713 ",
            toast.text || T("pl.learnedToast")
          ]
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { id: panelId, role: "dialog", "aria-label": T("pl.title"), style: panelStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
          "header",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${TONE5.border}`,
              flexShrink: 0
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { style: { fontSize: 14, fontWeight: 470, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: T("pl.title") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: refresh,
                    disabled: phase === "loading",
                    "data-tip": phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
                      "svg",
                      {
                        width: "13",
                        height: "13",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        style: { animation: phase === "loading" ? "pl-refresh-spin 0.9s linear infinite" : "none" },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M23 4v6h-6M1 20v-6h6" }),
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
                        ]
                      }
                    ),
                    children: phase === "loading" ? T("pl.refreshing") : T("pl.refresh")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: startCreate,
                    disabled: editing,
                    style: { color: "var(--dsw-alias-brand-primary, #8ec5ff)" },
                    children: T("pl.new")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: `${plBtn("ghost", "sm")} pl-btn--no-border`,
                    onClick: () => setOpen(false),
                    "data-tip": T("pl.close"),
                    "aria-label": T("pl.close"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      "svg",
                      {
                        width: "13",
                        height: "13",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M18 6L6 18M6 6l12 12" })
                      }
                    )
                  }
                )
              ] })
            ]
          }
        ),
        !editing && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { padding: "10px 16px 4px", flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            SearchBox,
            {
              value: query,
              onChange: setQuery,
              onSearch: () => setQuery(query),
              onClear: clearSearch,
              placeholder: T("pl.search")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            TagFilterBar,
            {
              tags: allTags,
              active: tagFilter,
              onChange: setTagFilter,
              allLabel: T("pl.tagFilterAll")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { flex: 1, overflow: "auto", minHeight: 0 }, children: [
          phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { padding: "20px 16px", color: TONE5.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
          phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { padding: "12px 16px", color: TONE5.red, fontSize: 13 }, children: error }),
          editing ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE5.muted }, children: [
              T("pl.titleField"),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "input",
                {
                  value: editor.title,
                  onChange: (e) => setEditor({ ...editor, title: e.target.value }),
                  style: inputStyle3
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE5.muted }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                T("pl.bodyField"),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    style: { flex: "0 0 auto" },
                    onMouseDown: (e) => e.preventDefault(),
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      insertVariableAt(bodyRef.current, editor.body, (v) => setEditor({ ...editor, body: v }), T("pl.insertVariableDefault"));
                    },
                    "data-tip": T("pl.insertVariableTitle"),
                    children: `{{${T("pl.insertVariableDefault")}}}`
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "textarea",
                {
                  ref: bodyRef,
                  value: editor.body,
                  onChange: (e) => setEditor({ ...editor, body: e.target.value }),
                  rows: 6,
                  style: { ...inputStyle3, resize: "vertical", minHeight: 90 }
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE5.muted }, children: [
              T("pl.tagsField"),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TagInput, { value: editor.tags, onChange: (v) => setEditor({ ...editor, tags: v }), suggestions: allTags, inputStyle: inputStyle3, t })
            ] }),
            error && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { color: TONE5.red, fontSize: 12 }, children: error })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("ul", { style: { listStyle: "none", margin: 0, padding: "4px 8px 8px" }, children: [
            phase === "ready" && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("li", { style: { padding: "18px 12px", color: TONE5.muted, fontSize: 13, textAlign: "center" }, children: T("pl.empty") }),
            pageItems.map((p) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "li",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "7px 10px",
                  marginBottom: 4,
                  borderRadius: 8,
                  background: TONE5.row,
                  border: `1px solid ${TONE5.border}`,
                  transition: "background-color .18s ease, border-color .18s ease"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                  e.currentTarget.style.borderColor = TONE5.borderStrong;
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = TONE5.row;
                  e.currentTarget.style.borderColor = TONE5.border;
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      "strong",
                      {
                        style: {
                          fontSize: 12.5,
                          fontWeight: 500,
                          flex: "1 1 auto",
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        },
                        "data-tip": p.title,
                        children: clampTitle(p.title)
                      }
                    ),
                    isRecent(p.id) && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      "span",
                      {
                        "data-tip": T("pl.recentNew"),
                        style: { width: 7, height: 7, borderRadius: "50%", background: TONE5.mint, display: "inline-block", flexShrink: 0 }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                    "div",
                    {
                      style: {
                        color: TONE5.muted,
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: p.body.replace(/\s+/g, " ").trim()
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { display: "flex", gap: 4, alignItems: "center", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }, children: (p.tags ?? []).slice(0, 3).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      "span",
                      {
                        "data-tip": tag,
                        style: {
                          flexShrink: 0,
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "2px 6px",
                          borderRadius: 8,
                          color: TONE5.quiet,
                          border: `1px solid ${TONE5.border}`,
                          whiteSpace: "nowrap",
                          maxWidth: 96,
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        },
                        children: tag
                      },
                      tag
                    )) }),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { display: "flex", gap: 4, flexShrink: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: () => insert(p), children: T("pl.insert") }),
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => overwrite(p), children: T("pl.overwrite") }),
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setViewing(p), children: T("pl.view") }),
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => startEdit(p), children: T("pl.edit") }),
                      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => remove(p), children: T("pl.delete") })
                    ] })
                  ] })
                ]
              },
              p.id
            ))
          ] })
        ] }),
        editing && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
          "div",
          {
            style: {
              flexShrink: 0,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              padding: "12px 16px",
              borderTop: `1px solid ${TONE5.border}`
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                setEditor(NO_EDITOR);
                setError(null);
              }, children: T("pl.cancel") }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveEditor, children: T("pl.save") })
            ]
          }
        ),
        !editing && phase === "ready" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Pagination, { page, totalPages, onChange: setPage }),
        viewing && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { role: "dialog", "aria-label": T("pl.view"), style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: TONE5.panel
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: `1px solid ${TONE5.border}`
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { style: {
              flex: "1 1 auto",
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }, "data-tip": viewing.title, children: clampTitle(viewing.title) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              import_dsh_client_ui_primitives4.Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: plBtn("ghost", "sm"),
                onClick: closeView,
                "data-tip": T("pl.close"),
                style: { flexShrink: 0 },
                children: "\u2715"
              }
            )
          ] }),
          viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }, children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
            padding: "2px 8px",
            borderRadius: 8,
            fontSize: 11,
            color: TONE5.accent,
            background: TONE5.accentSoft,
            whiteSpace: "nowrap"
          }, children: tag }, tag)) }),
          viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 14px 0",
            boxSizing: "border-box"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }, children: [
              { value: false, label: T("pl.polished") },
              { value: true, label: T("pl.original") }
            ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setViewShowOriginal(opt.value),
                style: {
                  cursor: "pointer",
                  padding: "2px 10px",
                  fontSize: 11,
                  fontFamily: MONO4,
                  color: viewShowOriginal === opt.value ? TONE5.accent : TONE5.muted,
                  background: viewShowOriginal === opt.value ? TONE5.accentSoft : "transparent",
                  border: `1px solid ${viewShowOriginal === opt.value ? TONE5.accent : TONE5.border}`,
                  borderRadius: 999
                },
                children: opt.label
              },
              String(opt.value)
            )) }),
            viewPolishSummary.trim() && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              background: TONE5.accentSoft,
              border: `1px solid ${TONE5.border}`,
              borderRadius: 6,
              padding: "5px 8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: TONE5.accent,
                lineHeight: 1.6
              }, children: T("pl.summaryLabel") }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
                fontSize: 12,
                lineHeight: 1.6,
                color: TONE5.text,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }, children: viewPolishSummary })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "textarea",
              {
                value: viewShowOriginal ? viewing.body : viewPolishText,
                readOnly: viewShowOriginal,
                onChange: (e) => setViewPolishText(e.target.value),
                style: {
                  flex: 1,
                  minHeight: 0,
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE5.text,
                  background: viewShowOriginal ? TONE5.panel : rowBackground(),
                  border: `1px solid ${TONE5.border}`,
                  borderRadius: 6,
                  fontFamily: MONO4,
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  opacity: viewShowOriginal ? 0.75 : 1
                }
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: {
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "10px 14px 14px",
            color: TONE5.text,
            fontSize: 12.5,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }, children: viewing.body }),
          viewPolishError && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: {
            flexShrink: 0,
            padding: "4px 14px 0",
            color: TONE5.red,
            fontSize: 11,
            lineHeight: 1.5,
            wordBreak: "break-word"
          }, children: T("pl.polishFail") }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 14px 12px",
            borderTop: `1px solid ${TONE5.border}`
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { fontSize: 11, color: viewing.aiRefined ? TONE5.mint : TONE5.quiet, flexShrink: 0 }, children: viewPolish.status === "loading" ? T("pl.polishing") : viewPolish.status === "done" ? T("pl.polishResult") : viewing.aiRefined ? `${"\u2713"} ${T("pl.refinedDone")}` : `${"\u2026"} ${T("pl.refinePending")}` }),
            viewPolish.status === "loading" ? (
              // 优化中：不确定进度条动画
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { flex: 1, marginLeft: 8, height: 3, borderRadius: 2, overflow: "hidden", background: TONE5.border }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: {
                height: "100%",
                width: "40%",
                borderRadius: 2,
                background: TONE5.accent,
                animation: "pl-progress 1.2s ease-in-out infinite"
              } }) })
            ) : viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                navigator.clipboard.writeText(viewPolishText).catch(() => {
                });
              }, children: T("pl.copy") }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                if (!viewPolishText) return;
                inputActions.setDraft(draft && draft.trim() ? `${draft}

${viewPolishText}` : viewPolishText);
                closeView();
              }, children: T("pl.insert") }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveViewPolish, children: T("pl.saveToLibrary") })
            ] }) : !viewing.aiRefined && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              import_dsh_client_ui_primitives4.Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: plBtn("ghost", "sm"),
                onClick: startViewPolish,
                "data-tip": T("pl.polishBtnTitle"),
                style: { flexShrink: 0 },
                children: T("pl.polish")
              }
            )
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SelectionAddPrompt, { t, enabled: settings.selectionAddEnabled, inputActions, draft }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      TemplateFillModal,
      {
        open: template !== null,
        variables: template ? extractVariables(template.prompt.body) : [],
        body: template ? template.prompt.body : "",
        onCancel: () => setTemplate(null),
        onConfirm: applyTemplate,
        onInsertAndSend: insertAndSend,
        showInsertAndSend: template?.mode !== "overwrite",
        confirmLabel: template?.mode === "overwrite" ? T("pl.overwrite") : T("pl.insert"),
        draftEmpty: template?.fromOverlay ? true : !draft?.trim(),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      ConfirmDialog,
      {
        open: deleteConfirm !== null,
        message: T("pl.confirmDelete", { title: deleteConfirm?.title ?? "" }),
        danger: true,
        confirmLabel: T("pl.confirm"),
        cancelLabel: T("pl.cancel"),
        onCancel: () => setDeleteConfirm(null),
        onConfirm: () => {
          setDeleteConfirm(null);
          confirmRemove();
        }
      }
    )
  ] });
}
var inputStyle3 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO4,
  fontSize: 13,
  outline: "none"
};

// src/client/components/data/AIPolishButton.tsx
var import_react7 = require("react");
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime8 = require("react/jsx-runtime");
var MONO5 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE6 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "var(--dsw-alias-brand-primary-weak, rgba(142, 197, 255, 0.14))",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)"
};
var TOAST_MS = 2200;
function SparkleIcon({ spinning }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
      style: { animation: spinning ? "pl-polish-spin 0.9s linear infinite" : "none" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "path",
          {
            d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z",
            stroke: "currentColor",
            strokeWidth: "1.6",
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "path",
          {
            d: "M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z",
            stroke: "currentColor",
            strokeWidth: "1.4",
            strokeLinejoin: "round"
          }
        )
      ]
    }
  );
}
function useSettings2() {
  const [settings, setSettings] = (0, import_react7.useState)(DEFAULT_SETTINGS);
  const load = (0, import_react7.useCallback)(() => {
    getSettings().then(setSettings).catch(() => {
    });
  }, []);
  (0, import_react7.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react7.useEffect)(() => {
    const onChanged = (e) => {
      const detail = e.detail;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);
  return settings;
}
function AIPolishButton(props) {
  const { inputActions, useInput, t } = props;
  const T = usePLT(t);
  const draft = useInput((s) => s.draft);
  const settings = useSettings2();
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });
  const [status, setStatus] = (0, import_react7.useState)("idle");
  const [result, setResult] = (0, import_react7.useState)("");
  const [original, setOriginal] = (0, import_react7.useState)("");
  const [showOriginal, setShowOriginal] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)("");
  const [toast, setToast] = (0, import_react7.useState)("");
  (0, import_react7.useEffect)(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  const showToast = (0, import_react7.useCallback)((msg) => setToast(msg), []);
  const closeResult = (0, import_react7.useCallback)(() => {
    setStatus("idle");
    setResult("");
    setOriginal("");
    setShowOriginal(false);
    setError("");
  }, []);
  const handlePolish = (0, import_react7.useCallback)(() => {
    const text = draft.trim();
    if (!text) {
      showToast(T("pl.polishEmpty"));
      return;
    }
    setStatus("polishing");
    setError("");
    setOriginal(draft);
    setShowOriginal(false);
    polishPrompt(draft, { keepVariables: false }).then(({ polished }) => {
      setResult(polished);
      setStatus("done");
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      showToast(T("pl.polishFail"));
    });
  }, [draft, showToast, T]);
  const applyResult = (0, import_react7.useCallback)(() => {
    if (!result) return;
    inputActions.setDraft(result);
    closeResult();
  }, [result, inputActions, closeResult]);
  const copyResult = (0, import_react7.useCallback)(() => {
    navigator.clipboard.writeText(result).catch(() => {
    });
    showToast(T("pl.copied"));
  }, [result, showToast, T]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO5
  };
  const panelStyle = {
    position: "absolute",
    right: 0,
    bottom: "calc(100% + 4px)",
    zIndex: 1e3,
    width: 380,
    maxWidth: "calc(100vw - 24px)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 16px",
    color: TONE6.text,
    background: TONE6.panel,
    border: `1px solid ${TONE6.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO5
  };
  if (!settings.showAIPolishButton) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { "data-prompt-library-ai-polish": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("style", { children: PL_BUTTON_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("style", { children: `.pl-btn.pl-cbn-btn{border:none;box-shadow:none}` }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("style", { children: `@keyframes pl-polish-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      import_dsh_client_ui_primitives5.Button,
      {
        type: "button",
        variant: "ghost",
        size: "sm",
        className: `${plBtn("ghost", "sm")} pl-cbn-btn`,
        onClick: handlePolish,
        disabled: status === "polishing" || !draft.trim(),
        "data-tip": status === "polishing" ? T("pl.polishLoadingTitle") : draft.trim() ? T("pl.polishHoverContent") : T("pl.polishEmpty"),
        "aria-label": T("pl.polish"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SparkleIcon, { spinning: status === "polishing" }),
        children: !settings.aiPolishButtonIconOnly && (status === "polishing" ? T("pl.polishing") : T("pl.polish"))
      }
    ),
    toast && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        style: {
          position: "absolute",
          bottom: "calc(100% + 4px)",
          right: 0,
          padding: "4px 10px",
          color: TONE6.panel,
          background: status === "error" ? TONE6.red : TONE6.mint,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: MONO5,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: 0.92,
          zIndex: 1001
        },
        children: [
          status === "error" ? "\u26A0 " : "\u2713 ",
          toast
        ]
      }
    ),
    status === "done" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_jsx_runtime8.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { role: "dialog", "aria-label": T("pl.polishResult"), style: panelStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { style: { fontSize: 13, fontWeight: 470 }, children: T("pl.polishResult") }),
        error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { color: TONE6.red, fontSize: 11 }, children: error })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [
        { value: false, label: T("pl.polished") },
        { value: true, label: T("pl.original") }
      ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setShowOriginal(opt.value),
          style: {
            cursor: "pointer",
            padding: "2px 10px",
            fontSize: 11,
            fontFamily: MONO5,
            color: showOriginal === opt.value ? TONE6.accent : TONE6.muted,
            background: showOriginal === opt.value ? TONE6.accentSoft : "transparent",
            border: `1px solid ${showOriginal === opt.value ? TONE6.accent : TONE6.border}`,
            borderRadius: 999
          },
          children: opt.label
        },
        String(opt.value)
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "textarea",
        {
          value: showOriginal ? original : result,
          readOnly: showOriginal,
          onChange: (e) => setResult(e.target.value),
          rows: 7,
          "aria-label": T("pl.polishResultAria"),
          style: {
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            padding: "7px 9px",
            color: TONE6.text,
            background: showOriginal ? TONE6.panel : rowBackground(),
            border: `1px solid ${TONE6.border}`,
            borderRadius: 7,
            fontFamily: MONO5,
            fontSize: 12,
            outline: "none",
            opacity: showOriginal ? 0.75 : 1
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: copyResult, children: T("pl.copy") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeResult, children: T("pl.close") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: applyResult, children: T("pl.replaceContent") })
      ] })
    ] }) })
  ] });
}

// src/client/components/data/ContextRecommendations.tsx
var import_react9 = require("react");

// src/client/utils/conversation-targets.ts
var import_react8 = require("react");
var uiConversationRef = null;
function setUiConversation(svc) {
  uiConversationRef = svc;
}
function useConversationTargetSnapshot(sessionId, target) {
  const svc = uiConversationRef;
  const getSnapshot = (0, import_react8.useCallback)(() => {
    if (!svc || !sessionId) return void 0;
    try {
      const face = svc.binding(sessionId).target(target);
      return face.getSnapshot() ?? void 0;
    } catch {
      return void 0;
    }
  }, [svc, sessionId, target]);
  const subscribe = (0, import_react8.useCallback)(
    (onStoreChange) => {
      if (!svc || !sessionId) return () => {
      };
      try {
        const face = svc.binding(sessionId).target(target);
        return face.subscribe(onStoreChange);
      } catch {
        return () => {
        };
      }
    },
    [svc, sessionId, target]
  );
  return (0, import_react8.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
}

// src/client/components/data/ContextRecommendations.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var MONO6 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE7 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)"
};
var LIMIT = 5;
var CONTEXT_USER_COUNT = 3;
var FRESH_MS = 30 * 24 * 60 * 60 * 1e3;
var STOP_BIGRAMS = /* @__PURE__ */ new Set([
  "\u6211\u4EEC",
  "\u4F60\u4EEC",
  "\u4ED6\u4EEC",
  "\u5979\u4EEC",
  "\u5B83\u4EEC",
  "\u53EF\u4EE5",
  "\u4EC0\u4E48",
  "\u600E\u4E48",
  "\u4E3A\u4EC0\u4E48",
  "\u8FD9\u4E2A",
  "\u90A3\u4E2A",
  "\u4E00\u4E2A",
  "\u4E0D\u662F",
  "\u6CA1\u6709",
  "\u5C31\u662F",
  "\u4F46\u662F",
  "\u56E0\u4E3A",
  "\u6240\u4EE5",
  "\u5982\u679C",
  "\u7136\u540E",
  "\u8FD9\u6837",
  "\u90A3\u6837",
  "\u5DF2\u7ECF",
  "\u8FD8\u662F",
  "\u81EA\u5DF1",
  "\u73B0\u5728",
  "\u65F6\u5019",
  "\u95EE\u9898",
  "\u77E5\u9053",
  "\u611F\u89C9",
  "\u89C9\u5F97",
  "\u4E1C\u897F",
  "\u4E8B\u60C5",
  "\u4E00\u4E0B",
  "\u771F\u7684",
  "\u53EF\u80FD",
  "\u5E94\u8BE5",
  "\u9700\u8981",
  "\u5E0C\u671B",
  "\u8BF7\u95EE",
  "\u8C22\u8C22",
  "\u5173\u4E8E",
  "\u5BF9\u4E8E",
  "\u5BF9\u4E8E",
  "\u5E2E\u6211",
  "\u6211\u60F3",
  "\u6211\u8981",
  "\u9EBB\u70E6",
  "\u4F60\u597D",
  "\u60A8\u597D",
  "\u5982\u4F55",
  "\u600E\u6837",
  "\u7ED9\u6211"
]);
function textOf(content) {
  let out = "";
  for (const b of content) {
    if (b.type === "text" && typeof b.text === "string") out += `${b.text}
`;
  }
  return out.trim();
}
function extractKeywords(text) {
  const freq = /* @__PURE__ */ new Map();
  const add = (raw) => {
    const k = raw.toLowerCase();
    if (!k || k.length < 2 || STOP_BIGRAMS.has(k)) return;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  };
  for (const m of text.matchAll(/[a-zA-Z][a-zA-Z0-9_-]{1,}/g)) add(m[0]);
  const cjk = text.match(/[\u4e00-\u9fa5]{2,}/g) ?? [];
  for (const seg of cjk) {
    for (let i = 0; i < seg.length - 1; i++) add(seg.slice(i, i + 2));
  }
  return freq;
}
function termWeight(k) {
  if (/[\u4e00-\u9fa5]/.test(k)) return 1;
  return 1 + Math.min(2, Math.log2(k.length) / 2);
}
function scorePrompt(p, kw, now) {
  const head = `${p.title} ${p.tags?.join(" ") ?? ""}`.toLowerCase();
  const body = p.body.toLowerCase();
  let relevance = 0;
  for (const [k, f] of kw) {
    const w = termWeight(k);
    if (head.includes(k)) relevance += f * 2 * w;
    else if (body.includes(k)) relevance += f * w;
  }
  if (relevance <= 0) return 0;
  const freq = p.usageCount > 0 ? Math.log(1 + p.usageCount) / Math.log(11) : 0;
  const fresh = p.lastUsedAt > 0 && now - p.lastUsedAt < FRESH_MS ? 1 : 0;
  const usage = Math.min(1, freq * 0.6 + fresh * 0.4);
  return relevance * (1 + usage);
}
function useRecommendEnabled() {
  const [enabled, setEnabled] = (0, import_react9.useState)(false);
  (0, import_react9.useEffect)(() => {
    getSettings().then((s) => setEnabled(!!s.contextRecommendEnabled)).catch(() => {
    });
  }, []);
  (0, import_react9.useEffect)(() => {
    const onChanged = (e) => {
      const detail = e.detail;
      if (detail) setEnabled(!!detail.contextRecommendEnabled);
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, []);
  return enabled;
}
function ContextRecommendations(props) {
  const T = usePLT(props?.t);
  const enabled = useRecommendEnabled();
  const useSession = props.useSession;
  const useInput = props.useInput;
  const inputActions = props.inputActions;
  const sessionId = useSession?.((s) => s.sessionId);
  const chatTarget = useConversationTargetSnapshot(
    sessionId,
    "chat"
  );
  const legacyNodes = useSession?.(
    (s) => s?.chat?.legacy?.nodes
  );
  const nodes = (chatTarget?.legacy?.nodes?.length ?? 0) > 0 ? chatTarget.legacy.nodes : legacyNodes;
  const draft = useInput?.((s) => s.draft) ?? "";
  const userText = (0, import_react9.useMemo)(() => {
    if (!nodes) return "";
    const users = nodes.filter((n) => n.kind === "user");
    return users.slice(-CONTEXT_USER_COUNT).map((n) => textOf(n.content)).join("\n").trim();
  }, [nodes]);
  const [prompts, setPrompts] = (0, import_react9.useState)([]);
  const refresh = (0, import_react9.useCallback)(() => {
    listPrompts().then(setPrompts).catch(() => {
    });
  }, []);
  (0, import_react9.useEffect)(() => {
    refresh();
  }, [refresh]);
  useDataChanged(refresh);
  const keywordText = (0, import_react9.useMemo)(() => {
    const parts = [];
    if (draft.trim()) parts.push(draft);
    if (userText) parts.push(userText);
    return parts.join("\n").trim();
  }, [draft, userText]);
  const hits = (0, import_react9.useMemo)(() => {
    if (!enabled) return [];
    if (!draft.trim()) return [];
    const now = Date.now();
    const kw = extractKeywords(keywordText);
    if (kw.size === 0) return [];
    return prompts.map((p) => ({ p, score: scorePrompt(p, kw, now) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, LIMIT).map((x) => x.p);
  }, [enabled, draft, keywordText, prompts]);
  const [template, setTemplate] = (0, import_react9.useState)(null);
  if (!enabled || !useSession || !useInput || !inputActions || hits.length === 0) {
    return null;
  }
  const insert = (p) => {
    if (hasVariables(p.body)) {
      setTemplate({ p });
      return;
    }
    usePrompt(p.id).catch(() => {
    });
    inputActions.setDraft(draft && draft.trim() ? `${draft}

${p.body}` : p.body);
  };
  const applyTpl = (values) => {
    if (!template) return;
    const filled = applyVariables(template.p.body, values);
    usePrompt(template.p.id).catch(() => {
    });
    inputActions.setDraft(draft && draft.trim() ? `${draft}

${filled}` : filled);
    setTemplate(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "div",
      {
        style: {
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 var(--dsh-composer-side-clearance, 16px)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
          "div",
          {
            style: {
              boxSizing: "border-box",
              width: "100%",
              maxWidth: "var(--dsh-composer-card-max-width, 780px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 6,
              padding: "0 2px",
              fontFamily: MONO6,
              fontSize: 12,
              color: TONE7.muted,
              overflow: "hidden"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: TONE7.quiet }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color: TONE7.accent }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    "path",
                    {
                      d: "M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4",
                      stroke: "currentColor",
                      strokeWidth: "1.8",
                      strokeLinecap: "round"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("circle", { cx: "12", cy: "12", r: "3.2", stroke: "currentColor", strokeWidth: "1.8" })
                ] }),
                T("pl.recommend")
              ] }),
              hits.map((p) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => insert(p),
                  "data-tip": p.body,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    maxWidth: 220,
                    height: 26,
                    padding: "0 10px",
                    border: `1px solid ${TONE7.border}`,
                    borderRadius: 13,
                    background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                    color: TONE7.text,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    transition: "background 0.15s, border-color 0.15s"
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(128,160,200,0.1))";
                    e.currentTarget.style.borderColor = "var(--dsw-alias-border-l3, rgba(196,211,232,0.31))";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2, #ffffff)";
                    e.currentTarget.style.borderColor = TONE7.border;
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { flexShrink: 0, color: TONE7.accent, display: "inline-flex" }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M4 6h9v4H4V6Zm0 8h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: clampTitle(p.title) })
                  ]
                },
                p.id
              ))
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      TemplateFillModal,
      {
        open: template !== null,
        variables: template ? extractVariables(template.p.body) : [],
        body: template ? template.p.body : "",
        onCancel: () => setTemplate(null),
        onConfirm: applyTpl,
        confirmLabel: T("pl.insert"),
        showInsertAndSend: false,
        draftEmpty: !draft.trim(),
        t: T
      }
    )
  ] });
}

// src/client/components/data/PromptAssistant.tsx
var import_react20 = require("react");
var import_react_dom6 = require("react-dom");

// src/client/components/persona-skill/PromptInjectPanel.tsx
var import_react11 = require("react");
var import_react_dom2 = require("react-dom");
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/common/DialogCloseButton.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
function DialogCloseButton({ onClick, label = "\u5173\u95ED", noTip }) {
  const TONE12 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
    "button",
    {
      type: "button",
      onClick,
      "aria-label": label,
      "data-tip": noTip ? void 0 : label,
      style: {
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        border: "none",
        outline: "none",
        borderRadius: 6,
        background: "transparent",
        color: TONE12.muted,
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
        e.currentTarget.style.color = TONE12.text;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = TONE12.muted;
      },
      children: "\u2715"
    }
  );
}

// src/client/components/common/WindowToggleButton.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
function WindowToggleButton({ maximized, onToggle, maximizeLabel, restoreLabel }) {
  const TONE12 = getTone();
  const label = maximized ? restoreLabel : maximizeLabel;
  const glyph = maximized ? "\u{1F5D7}\uFE0E" : "\u{1F5D6}\uFE0E";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    "button",
    {
      type: "button",
      onClick: onToggle,
      "aria-label": label,
      "data-tip": label,
      style: {
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        border: "none",
        outline: "none",
        borderRadius: 6,
        background: "transparent",
        color: TONE12.muted,
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
        e.currentTarget.style.color = TONE12.text;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = TONE12.muted;
      },
      children: glyph
    }
  );
}

// src/client/components/import-export/ImportConfirmModal.tsx
var import_jsx_runtime12 = require("react/jsx-runtime");
var BLOCK = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function ImportConfirmModal({
  open,
  title,
  headline,
  rows,
  contentTitle,
  content,
  confirmLabel = "\u786E\u8BA4\u5BFC\u5165",
  cancelLabel = "\u53D6\u6D88",
  onCancel,
  onConfirm
}) {
  useThemeSync();
  if (!open) return null;
  const TONE12 = getTone();
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--dsw-alias-border-l2)",
    outline: "none",
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 14,
    cursor: "pointer",
    background: "transparent",
    fontFamily: BLOCK,
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("style", { children: PL_DIALOG_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: PL_DIALOG_OVERLAY, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": title,
        className: PL_DIALOG,
        style: { width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(560px, calc(100vh - 40px))", gap: 12 },
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { style: { fontSize: 14, fontWeight: 600, color: TONE12.text, flexShrink: 0 }, children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "div",
            {
              style: {
                fontSize: 12,
                lineHeight: 1.6,
                color: TONE12.quiet,
                background: TONE12.accentSoft,
                border: `1px solid ${TONE12.border}`,
                borderRadius: 7,
                padding: "7px 10px",
                flexShrink: 0
              },
              children: headline
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "div",
            {
              style: {
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                border: `1px solid ${TONE12.border}`,
                borderRadius: 8,
                background: TONE12.row,
                padding: 4
              },
              children: rows ? rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: i % 2 === 1 ? TONE12.panel : "transparent"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontSize: 12.5, fontWeight: 600, color: TONE12.text, wordBreak: "break-word" }, children: r.title || "\u2014" }),
                    r.detail ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontSize: 11, lineHeight: 1.5, color: TONE12.muted, wordBreak: "break-word", whiteSpace: "pre-wrap" }, children: r.detail }) : null
                  ]
                },
                `${r.title}-${i}`
              )) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { padding: "7px 10px" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { fontSize: 12.5, fontWeight: 600, color: TONE12.text, marginBottom: 6, wordBreak: "break-word" }, children: contentTitle ?? "" }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  "div",
                  {
                    style: {
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: TONE12.muted,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: BLOCK
                    },
                    children: content && content.trim() ? content : "\u2014"
                  }
                )
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              "button",
              {
                type: "button",
                style: { ...btn, color: TONE12.text },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                onClick: onCancel,
                children: cancelLabel
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              "button",
              {
                type: "button",
                style: {
                  ...btn,
                  color: "var(--dsw-alias-brand-primary, #2563eb)",
                  fontWeight: 600
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                onClick: onConfirm,
                children: confirmLabel
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}

// src/client/components/persona-skill/HarnessSkillPanel.tsx
var import_react10 = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/common/BookIcon.tsx
var import_jsx_runtime13 = require("react/jsx-runtime");
function BookIcon({ color, size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "path",
      {
        d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "path",
      {
        d: "M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    )
  ] });
}

// src/client/components/persona-skill/HarnessSkillPanel.tsx
var import_jsx_runtime14 = require("react/jsx-runtime");
function HarnessSkillPanel({ open, onClose, t, container }) {
  useThemeSync();
  const TONE12 = getTone();
  const [items, setItems] = (0, import_react10.useState)([]);
  const [projectRoot, setProjectRoot] = (0, import_react10.useState)(null);
  const [loaded, setLoaded] = (0, import_react10.useState)(false);
  const [busy, setBusy] = (0, import_react10.useState)(false);
  const [feedback, setFeedback] = (0, import_react10.useState)(null);
  const timerRef = (0, import_react10.useRef)(null);
  const [deleteId, setDeleteId] = (0, import_react10.useState)(null);
  const tRef = (0, import_react10.useRef)(t);
  tRef.current = t;
  const notify = (0, import_react10.useCallback)((text, kind) => {
    setFeedback({ text, kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFeedback(null), 2600);
  }, []);
  const load = (0, import_react10.useCallback)(async () => {
    setLoaded(false);
    setFeedback(null);
    try {
      const { items: list, projectRoot: pr } = await listHarnessSkillToggles();
      setItems(list);
      setProjectRoot(pr);
    } catch {
      notify(tRef.current("pl.inject.opFailed"), "error");
    } finally {
      setLoaded(true);
    }
  }, [notify]);
  (0, import_react10.useEffect)(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  (0, import_react10.useEffect)(() => {
    if (!open) return;
    setDeleteId(null);
    void load();
  }, [open]);
  const toggle = async (item) => {
    const next = !item.enabled;
    const prevItem = item;
    setBusy(true);
    setFeedback(null);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, enabled: next } : i));
    try {
      await setHarnessSkillToggle(item.id, next);
      notify(next ? t("pl.harnessSkill.enabled") : t("pl.harnessSkill.disabled"), "success");
    } catch {
      setItems((prev) => prev.map((i) => i.id === prevItem.id ? { ...i, enabled: prevItem.enabled } : i));
      notify(t("pl.inject.opFailed"), "error");
    } finally {
      setBusy(false);
    }
  };
  const removeSkill = async (id) => {
    setDeleteId(null);
    setBusy(true);
    setFeedback(null);
    try {
      await deleteHarnessSkill(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      notify(t("pl.harnessSkill.deleted"), "success");
    } catch {
      notify(t("pl.inject.opFailed"), "error");
    } finally {
      setBusy(false);
    }
  };
  if (!open) return null;
  const systemItems = items.filter((i) => i.scope === "system");
  const projectItems = items.filter((i) => i.scope === "project");
  const renderSwitch = (item) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": item.enabled,
      title: t("pl.inject.enabled"),
      disabled: busy,
      onClick: () => void toggle(item),
      style: {
        flexShrink: 0,
        width: 34,
        height: 18,
        borderRadius: 9,
        border: `1px solid ${TONE12.border}`,
        background: item.enabled ? TONE12.accent : "transparent",
        position: "relative",
        cursor: busy ? "not-allowed" : "pointer",
        padding: 0
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        "span",
        {
          style: {
            position: "absolute",
            top: 2,
            left: item.enabled ? 17 : 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: item.enabled ? TONE12.panel : TONE12.quiet,
            transition: "left .24s cubic-bezier(.22,1,.36,1)"
          }
        }
      )
    }
  );
  const renderItem = (item) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: TONE12.panel,
        border: `1px solid ${TONE12.border}`,
        borderRadius: 8,
        padding: "8px 10px"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(BookIcon, { color: item.enabled ? TONE12.accent : TONE12.quiet }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "strong",
              {
                style: {
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: item.enabled ? TONE12.text : TONE12.quiet,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                },
                title: item.name,
                children: item.title
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "span",
              {
                style: {
                  flexShrink: 0,
                  fontSize: 10,
                  color: TONE12.accent,
                  background: TONE12.accentSoft,
                  border: `1px solid ${TONE12.border}`,
                  borderRadius: 999,
                  padding: "0 6px",
                  lineHeight: "15px"
                },
                children: item.name
              }
            )
          ] }),
          item.summary && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "div",
            {
              style: {
                fontSize: 11,
                color: TONE12.quiet,
                lineHeight: 1.4,
                marginTop: 3,
                minHeight: 14,
                maxHeight: 34,
                overflow: "hidden",
                wordBreak: "break-word"
              },
              children: item.summary
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }, children: [
          renderSwitch(item),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "button",
            {
              type: "button",
              title: t("pl.delete"),
              "aria-label": t("pl.delete"),
              disabled: busy,
              onClick: () => setDeleteId(item.id),
              style: {
                width: 20,
                height: 20,
                border: "none",
                outline: "none",
                borderRadius: 5,
                background: "transparent",
                cursor: busy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TONE12.quiet,
                padding: 0,
                transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06))";
                e.currentTarget.style.color = TONE12.red;
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = TONE12.quiet;
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("polyline", { points: "3 6 5 6 21 6" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
              ] })
            }
          )
        ] })
      ]
    },
    item.id
  );
  const renderSection = (title, hint, list) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE12.accent, flexShrink: 0 } }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { style: { fontSize: 12.5, fontWeight: 600, color: TONE12.text }, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { style: { fontSize: 11, color: TONE12.quiet }, children: [
        "\uFF08",
        list.length,
        "\uFF09"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5 }, children: hint }),
    list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: 11.5, color: TONE12.quiet, textAlign: "center", padding: "12px 0" }, children: t("pl.harnessSkill.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: list.map(renderItem) })
  ] });
  const feedbackColor = feedback?.kind === "error" ? TONE12.red : feedback?.kind === "success" ? TONE12.mint : TONE12.accent;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("pl.harnessSkill.title"),
        className: container ? void 0 : PL_DIALOG_OVERLAY,
        style: container ? PL_DIALOG_EMBED_OVERLAY : void 0,
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
            "div",
            {
              className: PL_DIALOG,
              style: container ? { width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", padding: "16px 18px", background: TONE12.panel } : { width: 800, height: 800, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)", padding: "16px 18px" },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(BookIcon, { color: TONE12.accent }),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    "strong",
                    {
                      style: {
                        flex: 1,
                        fontSize: 15,
                        fontWeight: 600,
                        color: TONE12.text,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      },
                      children: t("pl.harnessSkill.title")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    import_dsh_client_ui_primitives6.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      disabled: busy,
                      onClick: () => void load(),
                      children: t("pl.refresh")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "div",
                  {
                    style: {
                      flexShrink: 0,
                      marginTop: 10,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: TONE12.quiet,
                      background: TONE12.accentSoft,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 7,
                      padding: "7px 10px"
                    },
                    children: projectRoot ? t("pl.harnessSkill.noteProject", { project: projectRoot }) : t("pl.harnessSkill.note")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "div",
                  {
                    role: feedback ? "alert" : void 0,
                    style: {
                      flexShrink: 0,
                      marginTop: 8,
                      height: 18,
                      lineHeight: "18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12
                    },
                    children: feedback && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "span",
                        {
                          style: {
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: feedbackColor,
                            flexShrink: 0
                          }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "span",
                        {
                          style: {
                            color: feedbackColor,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          },
                          children: feedback.text
                        }
                      )
                    ] })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      marginTop: 10,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      paddingBottom: 8
                    },
                    children: !loaded ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "22px 0" }, children: t("pl.achievements.loading") }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
                      renderSection(t("pl.harnessSkill.systemTitle"), t("pl.harnessSkill.systemHint"), systemItems),
                      renderSection(t("pl.harnessSkill.projectTitle"), t("pl.harnessSkill.projectHint"), projectItems)
                    ] })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  ConfirmDialog,
                  {
                    danger: true,
                    open: deleteId != null,
                    message: t("pl.harnessSkill.deleteConfirm", {
                      name: items.find((i) => i.id === deleteId)?.title ?? ""
                    }),
                    confirmLabel: t("pl.delete"),
                    cancelLabel: t("pl.cancel"),
                    onCancel: () => setDeleteId(null),
                    onConfirm: () => deleteId ? void removeSkill(deleteId) : void 0
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    container || document.body
  );
}

// src/client/components/persona-skill/PromptInjectPanel.tsx
var import_jsx_runtime15 = require("react/jsx-runtime");
var MONO7 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "untitled";
}
function downloadMarkdown(fileName, content) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
var TAG_MAX_UNITS = 16;
function clampTag(s) {
  let n = 0;
  let out = "";
  for (const ch of s) {
    const w = /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1;
    if (n + w > TAG_MAX_UNITS) break;
    n += w;
    out += ch;
  }
  return out;
}
function BookIcon2({ color, size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "path",
      {
        d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "path",
      {
        d: "M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    )
  ] });
}
function PromptInjectPanel({ open, onClose, t, container }) {
  useThemeSync();
  const TONE12 = getTone();
  const [maximized, setMaximized] = (0, import_react11.useState)(false);
  const [prompts, setPrompts] = (0, import_react11.useState)([]);
  const [loaded, setLoaded] = (0, import_react11.useState)(false);
  const [scopes, setScopes] = (0, import_react11.useState)([]);
  const [bindings, setBindings] = (0, import_react11.useState)(/* @__PURE__ */ new Map());
  const [scopesLoaded, setScopesLoaded] = (0, import_react11.useState)(false);
  const [expanded, setExpanded] = (0, import_react11.useState)(/* @__PURE__ */ new Set());
  const [editingPath, setEditingPath] = (0, import_react11.useState)(null);
  const [draftIds, setDraftIds] = (0, import_react11.useState)(/* @__PURE__ */ new Set());
  const [bindSearch, setBindSearch] = (0, import_react11.useState)("");
  const [createName, setCreateName] = (0, import_react11.useState)("");
  const [editingId, setEditingId] = (0, import_react11.useState)(null);
  const [editTitle, setEditTitle] = (0, import_react11.useState)("");
  const [editTag, setEditTag] = (0, import_react11.useState)("");
  const [editBody, setEditBody] = (0, import_react11.useState)("");
  const [deleteId, setDeleteId] = (0, import_react11.useState)(null);
  const [clearAllOpen, setClearAllOpen] = (0, import_react11.useState)(false);
  const [detailId, setDetailId] = (0, import_react11.useState)(null);
  const [error, setError] = (0, import_react11.useState)(null);
  const [busy, setBusy] = (0, import_react11.useState)(false);
  const [msg, setMsg] = (0, import_react11.useState)(null);
  const [pendingImport, setPendingImport] = (0, import_react11.useState)(null);
  const msgTimerRef = (0, import_react11.useRef)(null);
  (0, import_react11.useEffect)(() => {
    if (!msg) return;
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [msg]);
  const [selected, setSelected] = (0, import_react11.useState)(/* @__PURE__ */ new Set());
  const importFileRef = (0, import_react11.useRef)(null);
  const [harnessOpen, setHarnessOpen] = (0, import_react11.useState)(false);
  const [diag, setDiag] = (0, import_react11.useState)(null);
  const [diagLoading, setDiagLoading] = (0, import_react11.useState)(true);
  const loadDiag = (silent = false) => {
    if (!silent) setDiagLoading(true);
    void diagSession().then(setDiag).catch(() => setDiag(null)).finally(() => {
      if (!silent) setDiagLoading(false);
    });
  };
  (0, import_react11.useEffect)(() => {
    if (open) loadDiag();
  }, [open]);
  const [personaNameMap, setPersonaNameMap] = (0, import_react11.useState)(/* @__PURE__ */ new Map());
  (0, import_react11.useEffect)(() => {
    if (!open) return;
    void listPersonas().then((list) => setPersonaNameMap(new Map(list.map((p) => [p.id, p.name])))).catch(() => {
    });
  }, [open]);
  const [selectedNode, setSelectedNode] = (0, import_react11.useState)(null);
  const findScopeNode = (nodes, path) => {
    for (const n of nodes) {
      if (n.path === path) return n;
      const hit = findScopeNode(n.children, path);
      if (hit) return hit;
    }
    return void 0;
  };
  const SCOPE_EXPAND_KEY = "pl:skill-tree-expanded";
  const scopesExpandedFromStorage = () => {
    try {
      const raw = localStorage.getItem(SCOPE_EXPAND_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr) : null;
    } catch {
      return null;
    }
  };
  const persistScopesExpanded = (s) => {
    try {
      localStorage.setItem(SCOPE_EXPAND_KEY, JSON.stringify([...s]));
    } catch {
    }
  };
  const buildScopesExpanded = (tree) => {
    const stored = scopesExpandedFromStorage();
    if (stored !== null) return stored;
    const all = /* @__PURE__ */ new Set();
    const collect = (nodes) => {
      for (const node of nodes) {
        all.add(node.path);
        collect(node.children);
      }
    };
    collect(tree);
    return all;
  };
  const refreshScopes = () => Promise.all([listSessionScopeTree(), listSessionPromptBindings()]).then(([tree, binds]) => {
    setScopes(tree);
    setExpanded(buildScopesExpanded(tree));
    setScopesLoaded(true);
    setBindings(new Map(binds.map((b) => [b.path, b.promptIds])));
  });
  const tRef = (0, import_react11.useRef)(t);
  tRef.current = t;
  (0, import_react11.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setLoaded(false);
    setError(null);
    setMsg(null);
    setSelected(/* @__PURE__ */ new Set());
    setEditingId(null);
    setDeleteId(null);
    setDetailId(null);
    setCreateName("");
    setEditingPath(null);
    setDraftIds(/* @__PURE__ */ new Set());
    setBindSearch("");
    setEditTitle("");
    setEditTag("");
    setEditBody("");
    listSessionPrompts().then((list) => {
      if (!alive) return;
      setPrompts(list);
      setLoaded(true);
    }).catch(() => {
      if (!alive) return;
      setLoaded(true);
      setError(tRef.current("pl.inject.opFailed"));
    });
    return () => {
      alive = false;
    };
  }, [open]);
  (0, import_react11.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setScopesLoaded(false);
    Promise.all([listSessionScopeTree(), listSessionPromptBindings()]).then(([tree, binds]) => {
      if (!alive) return;
      setScopes(tree);
      const map = /* @__PURE__ */ new Map();
      for (const b of binds) map.set(b.path, b.promptIds);
      setBindings(map);
      setExpanded(buildScopesExpanded(tree));
      setScopesLoaded(true);
    }).catch(() => {
      if (!alive) return;
      setScopesLoaded(true);
      setError(tRef.current("pl.inject.opFailed"));
    });
    return () => {
      alive = false;
    };
  }, [open]);
  if (!open) return null;
  if (harnessOpen) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(HarnessSkillPanel, { open: true, t, container, onClose: () => setHarnessOpen(false) });
  }
  const refresh = () => listSessionPrompts().then((list) => {
    setPrompts(list);
    const ids = new Set(list.map((p) => p.id));
    setBindings((prev) => {
      const next = /* @__PURE__ */ new Map();
      for (const [path, promptIds] of prev) next.set(path, promptIds.filter((id) => ids.has(id)));
      return next;
    });
  }).catch(() => setError(t("pl.inject.opFailed")));
  const handleCreate = async () => {
    const title = createName.trim();
    if (!title) {
      setError(t("pl.sessionPrompts.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createSessionPrompt({ title, body: "", tags: void 0 });
      await refresh();
      notifyDataChanged();
      setEditTitle(created.title);
      setEditTag((created.tags ?? [])[0] ?? "");
      setEditBody(created.body);
      setEditingId(created.id);
      setCreateName("");
    } catch {
      setError(t("pl.inject.opFailed"));
    } finally {
      setBusy(false);
    }
  };
  const openEditor = (p) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditTag((p.tags ?? [])[0] ?? "");
    setEditBody(p.body);
    setError(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditTag("");
    setEditBody("");
  };
  const handleSave = async (p) => {
    const title = editTitle.trim();
    if (!title) {
      setError(t("pl.sessionPrompts.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tags = editTag.trim() ? [editTag.trim()] : void 0;
      await updateSessionPrompt(p.id, { title, body: editBody, tags });
      await refresh();
      notifyDataChanged();
      setMsg({ text: t("pl.inject.modifyDone", { name: title }), kind: "success" });
      setEditingId(null);
    } catch {
      setError(t("pl.inject.opFailed"));
    } finally {
      setBusy(false);
    }
  };
  const handleAiGenerate = async () => {
    const title = editTitle.trim();
    if (!title) {
      setError(t("pl.ai.genNeedTitle"));
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const { content } = await generateDraft("skill", title, editBody);
      setEditBody(content);
      setMsg({ text: t("pl.ai.genDone") });
    } catch {
      setError(t("pl.ai.genFailed"));
    } finally {
      setBusy(false);
    }
  };
  const toggleEnabled = (p) => {
    setBusy(true);
    setError(null);
    updateSessionPrompt(p.id, { enabled: !p.enabled }).then(() => {
      refresh();
      notifyDataChanged();
      setMsg({
        text: t(p.enabled ? "pl.inject.enableOff" : "pl.inject.enableOn", { name: p.title }),
        kind: "info"
      });
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => setBusy(false));
  };
  const confirmDelete = () => {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    deleteSessionPrompt(deleteId).then(() => {
      refresh();
      void refreshScopes();
      notifyDataChanged();
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => {
      setBusy(false);
      setDeleteId(null);
      if (editingId === deleteId) setEditingId(null);
    });
  };
  const confirmClearAll = () => {
    setBusy(true);
    setError(null);
    clearAllBindings().then(() => {
      void refreshScopes();
      loadDiag(true);
      notifyDataChanged();
      setMsg({ text: t("pl.inject.bindDone"), kind: "info" });
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => {
      setBusy(false);
      setClearAllOpen(false);
    });
  };
  const handleExport = () => {
    const exportList = prompts.filter((p) => selected.has(p.id));
    if (exportList.length === 0) {
      setMsg({ text: t("pl.exportSelectEmpty"), kind: "error" });
      return;
    }
    for (const p of exportList) {
      downloadMarkdown(`${sanitizeFileName(p.title)}.md`, p.body && p.body.trim() ? p.body.trim() : "");
    }
    setMsg({ text: t("pl.inject.exportDone", { count: exportList.length }) });
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = (await file.text()).trim();
    if (!text) {
      setMsg({ text: t("pl.inject.importEmpty"), kind: "error" });
      return;
    }
    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "untitled";
    setPendingImport({ title, text });
  };
  const confirmImport = async () => {
    if (!pendingImport) return;
    const { title, text } = pendingImport;
    setPendingImport(null);
    setBusy(true);
    setError(null);
    try {
      await createSessionPrompt({ title, body: text, tags: void 0 });
      await refresh();
      setMsg({ text: t("pl.inject.importDone", { count: 1 }) });
    } catch {
      setMsg({ text: t("pl.inject.importFailed"), kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const inputStyle8 = {
    boxSizing: "border-box",
    width: "100%",
    background: TONE12.row,
    border: `1px solid ${TONE12.border}`,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 12.5,
    color: TONE12.text,
    fontFamily: MONO7,
    outline: "none"
  };
  const textareaStyle = {
    ...inputStyle8,
    minHeight: 120,
    resize: "vertical",
    lineHeight: 1.6
  };
  const renderPromptCard = (p) => {
    const isEditing = editingId === p.id;
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
      "div",
      {
        style: {
          background: TONE12.panel,
          border: `1px solid ${TONE12.border}`,
          borderRadius: 10,
          overflow: "hidden",
          opacity: p.enabled ? 1 : 0.6
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: TONE12.row,
                borderBottom: `1px solid ${TONE12.border}`
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    title: t("pl.selectExport"),
                    checked: selected.has(p.id),
                    disabled: busy,
                    onChange: () => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    }),
                    style: { flexShrink: 0, accentColor: TONE12.accent, cursor: busy ? "not-allowed" : "pointer", margin: 0 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(BookIcon2, { color: p.enabled ? TONE12.accent : TONE12.quiet }),
                isEditing ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "input",
                  {
                    value: editTitle,
                    onChange: (e) => setEditTitle(e.target.value),
                    disabled: busy,
                    style: { ...inputStyle8, flex: 1, minWidth: 60, background: TONE12.panel },
                    maxLength: 25,
                    title: t("pl.sessionPrompts.titlePlaceholder")
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "strong",
                  {
                    style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                    title: p.title,
                    children: clampTitle(p.title)
                  }
                ),
                p.tags && p.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "span",
                  {
                    style: {
                      flexShrink: 0,
                      fontSize: 10.5,
                      color: TONE12.accent,
                      background: TONE12.accentSoft,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 999,
                      padding: "1px 8px"
                    },
                    children: p.tags[0]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "button",
                  {
                    type: "button",
                    role: "switch",
                    "aria-checked": p.enabled,
                    title: t("pl.inject.enabled"),
                    disabled: busy,
                    onClick: () => toggleEnabled(p),
                    style: {
                      flexShrink: 0,
                      width: 34,
                      height: 18,
                      borderRadius: 9,
                      border: `1px solid ${TONE12.border}`,
                      background: p.enabled ? TONE12.accent : "transparent",
                      position: "relative",
                      cursor: busy ? "not-allowed" : "pointer",
                      padding: 0
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      "span",
                      {
                        style: {
                          position: "absolute",
                          top: 2,
                          left: p.enabled ? 17 : 2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: p.enabled ? TONE12.panel : TONE12.quiet,
                          transition: "left .24s cubic-bezier(.22,1,.36,1)"
                        }
                      }
                    )
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  import_dsh_client_ui_primitives7.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => {
                      if (!p.enabled && !isEditing) {
                        setMsg({ text: t("pl.inject.disabledEditHint"), kind: "error" });
                        return;
                      }
                      if (isEditing) cancelEdit();
                      else openEditor(p);
                    },
                    children: isEditing ? t("pl.personas.cancel") : t("pl.personas.edit")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  import_dsh_client_ui_primitives7.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => {
                      if (!p.enabled) {
                        setMsg({ text: t("pl.inject.disabledDeleteHint"), kind: "error" });
                        return;
                      }
                      setDeleteId(p.id);
                    },
                    children: t("pl.personas.delete")
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { padding: 10 }, children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11.5, color: TONE12.muted }, children: t("pl.inject.tagLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "input",
              {
                value: editTag,
                onChange: (e) => setEditTag(clampTag(e.target.value)),
                disabled: busy,
                placeholder: t("pl.inject.tagPlaceholder"),
                style: inputStyle8
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11.5, color: TONE12.muted }, children: t("pl.inject.contentLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "textarea",
              {
                value: editBody,
                onChange: (e) => setEditBody(e.target.value),
                disabled: busy,
                placeholder: t("pl.sessionPrompts.bodyPlaceholder"),
                style: textareaStyle
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5 }, children: t("pl.inject.contentHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: () => void handleAiGenerate(), children: busy ? t("pl.ai.generating") : t("pl.ai.generate") }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy, onClick: () => void handleSave(p), children: t("pl.personas.save") })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
            "div",
            {
              style: {
                background: TONE12.row,
                borderRadius: 7,
                padding: "7px 9px",
                minHeight: 40,
                maxHeight: 96,
                overflow: "hidden",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: TONE12.quiet,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                cursor: "pointer"
              },
              onClick: () => setDetailId(p.id),
              title: t("pl.inject.viewDetail"),
              children: [
                p.body && p.body.trim() ? p.body.trim().slice(0, 300) : t("pl.inject.previewEmpty"),
                p.body && p.body.trim().length > 300 ? "\u2026" : ""
              ]
            }
          ) })
        ]
      },
      p.id
    );
  };
  const toggleExpand = (wsPath) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(wsPath)) next.delete(wsPath);
    else next.add(wsPath);
    persistScopesExpanded(next);
    return next;
  });
  const openConfig = (nodePath) => {
    setEditingPath((prev) => prev === nodePath ? null : nodePath);
    setDraftIds(new Set(bindings.get(nodePath) ?? []));
    setBindSearch("");
    setError(null);
  };
  const saveBinding = (nodePath) => {
    setBusy(true);
    setError(null);
    setSessionPromptBinding(nodePath, [...draftIds]).then(() => {
      setBindings((prev) => new Map(prev).set(nodePath, [...draftIds]));
      setEditingPath(null);
      notifyDataChanged();
      setMsg({ text: t("pl.inject.bindDone"), kind: "info" });
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => setBusy(false));
  };
  const clearBinding = (nodePath) => {
    setBusy(true);
    setError(null);
    clearSessionPromptBinding(nodePath).then(() => {
      setBindings((prev) => {
        const m = new Map(prev);
        m.delete(nodePath);
        return m;
      });
      setEditingPath(null);
      notifyDataChanged();
      setMsg({ text: t("pl.inject.bindDone"), kind: "info" });
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => setBusy(false));
  };
  const renderConfigPanel = (target) => {
    const kw = bindSearch.trim().toLowerCase();
    const filtered = kw ? prompts.filter(
      (p) => p.title.toLowerCase().includes(kw) || (p.tags ?? [])[0]?.toLowerCase().includes(kw) || p.body.toLowerCase().includes(kw)
    ) : prompts;
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
      "div",
      {
        style: {
          margin: "4px 0 8px 18px",
          background: TONE12.accentSoft,
          border: `1px solid ${TONE12.accent}`,
          borderRadius: 9,
          padding: 9,
          display: "flex",
          flexDirection: "column",
          gap: 8
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            "input",
            {
              value: bindSearch,
              onChange: (e) => setBindSearch(e.target.value),
              onClick: (e) => e.stopPropagation(),
              placeholder: t("pl.inject.bindSearchPlaceholder"),
              style: { ...inputStyle8, background: TONE12.panel }
            }
          ),
          prompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11.5, color: TONE12.quiet, textAlign: "center", padding: "8px 0" }, children: t("pl.inject.empty") }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11.5, color: TONE12.quiet, textAlign: "center", padding: "8px 0" }, children: t("pl.inject.bindNoMatch") }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 6,
                maxHeight: 190,
                overflow: "auto"
              },
              children: filtered.map((p) => {
                const checked = draftIds.has(p.id);
                const disabled = !p.enabled;
                return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                  "label",
                  {
                    onClick: (e) => e.stopPropagation(),
                    title: disabled ? t("pl.inject.disabledBindHint") : void 0,
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      minWidth: 0,
                      background: TONE12.panel,
                      border: `1px solid ${checked ? TONE12.accent : TONE12.border}`,
                      borderRadius: 8,
                      padding: "7px 8px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.55 : 1
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked,
                            disabled: busy || disabled,
                            onChange: () => setDraftIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            }),
                            style: { flexShrink: 0, accentColor: TONE12.accent, cursor: busy || disabled ? "not-allowed" : "pointer" }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                          "strong",
                          {
                            style: {
                              flex: 1,
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: TONE12.text,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            },
                            title: p.title,
                            children: clampTitle(p.title)
                          }
                        )
                      ] }),
                      p.tags && p.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10,
                            color: TONE12.accent,
                            background: TONE12.accentSoft,
                            border: `1px solid ${TONE12.accent}`,
                            borderRadius: 999,
                            padding: "0 6px",
                            lineHeight: "15px"
                          },
                          children: p.tags[0]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                        "div",
                        {
                          style: {
                            fontSize: 10.5,
                            color: TONE12.quiet,
                            lineHeight: 1.4,
                            minHeight: 14,
                            maxHeight: 32,
                            overflow: "hidden",
                            wordBreak: "break-word"
                          },
                          children: [
                            p.body && p.body.trim() ? p.body.trim().slice(0, 60) : "",
                            p.body && p.body.trim().length > 60 ? "\u2026" : ""
                          ]
                        }
                      )
                    ]
                  },
                  p.id
                );
              })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flex: 1, fontSize: 10.5, color: TONE12.quiet }, children: t("pl.inject.selectedCount", { count: draftIds.size }) }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: () => setEditingPath(null), children: t("pl.personas.cancel") }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy || prompts.length === 0, onClick: () => clearBinding(target), children: t("pl.inject.clearBinding") }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy, onClick: () => saveBinding(target), children: t("pl.personas.save") })
          ] })
        ]
      }
    );
  };
  const renderScopeNode = (node, depth) => {
    const boundCount = (bindings.get(node.path) ?? []).length;
    const isEditing = editingPath === node.path;
    const hasChildren = node.children.length > 0;
    const isExpandable = hasChildren;
    const displayTitle = node.path === UNMATCHED_SCOPE_PATH ? t("pl.personas.scopes.others") : node.title;
    const isSelected = selectedNode?.kind === "scope" && selectedNode.key === node.path;
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { marginLeft: depth * 18 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
        "div",
        {
          onClick: () => setSelectedNode(isSelected ? null : { kind: "scope", key: node.path, label: displayTitle }),
          title: t("pl.diag.title"),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 6px",
            minHeight: 28,
            borderRadius: 7,
            background: isSelected ? TONE12.accentSoft : "transparent",
            cursor: "pointer"
          },
          children: [
            isExpandable ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "button",
              {
                type: "button",
                onClick: (e) => {
                  e.stopPropagation();
                  toggleExpand(node.path);
                },
                title: displayTitle,
                style: {
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  border: "none",
                  background: "transparent",
                  color: TONE12.quiet,
                  cursor: "pointer",
                  fontSize: 11,
                  lineHeight: 1,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: expanded.has(node.path) ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .24s cubic-bezier(.22,1,.36,1)"
                },
                children: "\u25B6"
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flexShrink: 0, width: 18 } }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "span",
              {
                style: {
                  flexShrink: 0,
                  fontSize: 10.5,
                  color: node.kind === "workspace" ? TONE12.accent : TONE12.quiet,
                  background: TONE12.accentSoft,
                  border: `1px solid ${TONE12.border}`,
                  borderRadius: 999,
                  padding: "0 6px",
                  lineHeight: "15px"
                },
                children: node.kind === "workspace" ? t("pl.personas.scopes.workspace") : t("pl.personas.scopes.project")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "span",
              {
                style: {
                  flex: 1,
                  fontSize: 12.5,
                  color: TONE12.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                },
                title: node.path,
                children: displayTitle
              }
            ),
            boundCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "span",
              {
                style: {
                  flexShrink: 0,
                  fontSize: 10,
                  color: TONE12.accent,
                  background: TONE12.accentSoft,
                  borderRadius: 999,
                  padding: "0 7px",
                  lineHeight: "16px"
                },
                children: t("pl.inject.boundCount", { count: boundCount })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: (e) => {
              e.stopPropagation();
              openConfig(node.path);
            }, children: isEditing ? t("pl.inject.cancelConfig") : t("pl.inject.config") })
          ]
        }
      ),
      isEditing && renderConfigPanel(node.path),
      expanded.has(node.path) && hasChildren && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: node.children.map((child) => renderScopeNode(child, depth + 1)) })
    ] }, node.path);
  };
  const selectedInfo = selectedNode ? (() => {
    const node = findScopeNode(scopes, selectedNode.key);
    const promptIds = bindings.get(selectedNode.key) ?? [];
    return {
      personaId: node?.bound ?? "",
      promptIds,
      path: selectedNode.key
    };
  })() : null;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
    (0, import_react_dom2.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("pl.inject.title"),
          className: container ? void 0 : maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY,
          children: [
            !container && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: PL_DIALOG_CSS }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
              "div",
              {
                className: maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG,
                style: {
                  ...container ? {} : { width: 800, height: 800 },
                  maxWidth: "calc(100vw - 40px)",
                  maxHeight: "calc(100vh - 40px)"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(BookIcon2, { color: TONE12.accent }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("strong", { style: { flex: 1, fontSize: 15, fontWeight: 600, color: TONE12.text }, children: t("pl.inject.title") }),
                    !container && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                        WindowToggleButton,
                        {
                          maximized,
                          onToggle: () => setMaximized((v) => !v),
                          maximizeLabel: t("pl.windowMaximize"),
                          restoreLabel: t("pl.windowRestore")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    "div",
                    {
                      style: {
                        marginTop: 10,
                        fontSize: 11.5,
                        lineHeight: 1.6,
                        color: TONE12.quiet,
                        background: TONE12.accentSoft,
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 7,
                        padding: "7px 10px",
                        flexShrink: 0
                      },
                      children: t("pl.inject.note")
                    }
                  ),
                  error && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { marginTop: 8, fontSize: 12, color: TONE12.red, lineHeight: 1.5, flexShrink: 0 }, children: error }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                    "div",
                    {
                      style: {
                        flexShrink: 0,
                        height: 18,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
                        overflow: "hidden",
                        whiteSpace: "nowrap"
                      },
                      children: [
                        msg && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                          "span",
                          {
                            style: {
                              flexShrink: 0,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
                            }
                          }
                        ),
                        msg?.text ?? ""
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        gap: 2,
                        paddingTop: 14,
                        paddingBottom: 4,
                        marginTop: -8
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1 1 0",
                              minWidth: 0,
                              minHeight: 0,
                              height: "100%",
                              boxSizing: "border-box",
                              background: TONE12.row,
                              border: `1px solid ${TONE12.border}`,
                              borderRadius: 10,
                              overflowY: "auto"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                                "div",
                                {
                                  style: {
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 3,
                                    padding: "10px 10px 8px",
                                    background: TONE12.row,
                                    boxSizing: "border-box",
                                    borderBottom: `1px solid ${TONE12.border}`
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE12.accent, flexShrink: 0 } }),
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text }, children: t("pl.inject.listTitle") })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5, marginTop: 3 }, children: t("pl.inject.listHint") }),
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5 }, children: t("pl.exportHint") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 }, children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), title: t("pl.harnessSkill.btnTitle"), onClick: () => setHarnessOpen((v) => !v), children: t("pl.harnessSkill.btn") }),
                                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: handleExport, children: t("pl.export") }),
                                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: () => importFileRef.current?.click(), children: t("pl.import") })
                                      ] })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 8,
                                          marginTop: 10,
                                          background: TONE12.accentSoft,
                                          border: `1px dashed ${TONE12.accent}`,
                                          borderRadius: 10,
                                          padding: 10
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { fontSize: 12.5, fontWeight: 600, color: TONE12.accent }, children: [
                                            "+ ",
                                            t("pl.sessionPrompts.new")
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5, marginTop: -4 }, children: t("pl.inject.createHint") }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                              "input",
                                              {
                                                value: createName,
                                                onChange: (e) => setCreateName(e.target.value),
                                                onKeyDown: (e) => {
                                                  if (e.key === "Enter") void handleCreate();
                                                },
                                                placeholder: t("pl.inject.namePlaceholder"),
                                                style: { ...inputStyle8, flex: 1 }
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy || !createName.trim(), onClick: () => void handleCreate(), children: t("pl.personas.save") })
                                          ] })
                                        ]
                                      }
                                    )
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: "10px 10px 10px" }, children: !loaded ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "22px 0" }, children: t("pl.achievements.loading") }) : prompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "18px 0" }, children: t("pl.inject.empty") }) : prompts.map((p) => renderPromptCard(p)) })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1 1 0",
                              minWidth: 0,
                              height: "100%",
                              boxSizing: "border-box",
                              minHeight: 0,
                              background: TONE12.row,
                              border: `1px solid ${TONE12.border}`,
                              borderRadius: 10,
                              overflowY: "auto"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                                "div",
                                {
                                  style: {
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 3,
                                    padding: "10px 10px 8px",
                                    background: TONE12.row,
                                    boxSizing: "border-box",
                                    borderBottom: `1px solid ${TONE12.border}`
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE12.accent, flexShrink: 0 } }),
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text }, children: t("pl.personas.scopes.title") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), style: { color: "var(--dsw-alias-error,#F5585C)" }, title: t("pl.inject.clearAllTitle"), disabled: busy, onClick: () => setClearAllOpen(true), children: t("pl.inject.clearAll") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), title: t("pl.refresh"), onClick: () => void refreshScopes().catch(() => setError(t("pl.inject.opFailed"))), children: t("pl.refresh") })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.6, marginTop: 4 }, children: t("pl.inject.projectNote") }),
                                    diagLoading && !selectedNode ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { fontSize: 11, color: TONE12.quiet, padding: "8px 0" }, children: [
                                      t("pl.achievements.loading"),
                                      "\u2026"
                                    ] }) : selectedNode && selectedInfo ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          margin: "8px 0 0",
                                          background: TONE12.accentSoft,
                                          border: `1px dashed ${TONE12.accent}`,
                                          borderRadius: 9,
                                          padding: "8px 10px",
                                          fontSize: 11,
                                          lineHeight: 1.6,
                                          color: TONE12.text
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 600, height: 20, marginBottom: 4 }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: t("pl.diag.selected", { name: selectedNode.label }) }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                              "button",
                                              {
                                                type: "button",
                                                onClick: () => setSelectedNode(null),
                                                style: {
                                                  flexShrink: 0,
                                                  border: `1px solid ${TONE12.border}`,
                                                  background: TONE12.panel,
                                                  color: TONE12.text,
                                                  borderRadius: 999,
                                                  padding: "1px 8px",
                                                  fontSize: 10.5,
                                                  lineHeight: "16px",
                                                  cursor: "pointer"
                                                },
                                                children: t("pl.diag.back")
                                              }
                                            )
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.quiet }, children: "\u4EBA\u683C \xB7 " }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.text }, children: selectedInfo.personaId ? personaNameMap.get(selectedInfo.personaId) ?? selectedInfo.personaId : `\u2014\uFF08${t("pl.personas.scopes.defaultOption")}\uFF09` })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.quiet }, children: "\u6280\u80FD \xB7 " }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.text }, children: selectedInfo.promptIds.length > 0 ? selectedInfo.promptIds.map((id) => prompts.find((p) => p.id === id)?.title).filter(Boolean).join("\u3001") || `\u2014` : `\u2014\uFF08${t("pl.diag.noSkill")}\uFF09` })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: TONE12.quiet }, children: [
                                            t("pl.diag.path"),
                                            "\uFF1A",
                                            selectedInfo.path || "\u2014"
                                          ] })
                                        ]
                                      }
                                    ) : diag ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          margin: "8px 0 0",
                                          background: TONE12.accentSoft,
                                          border: `1px dashed ${TONE12.accent}`,
                                          borderRadius: 9,
                                          padding: "8px 10px",
                                          fontSize: 11,
                                          lineHeight: 1.6,
                                          color: TONE12.text
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { height: 20, lineHeight: "20px", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginBottom: 4 }, children: t("pl.diag.title") }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.quiet }, children: "\u4EBA\u683C \xB7 " }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontWeight: 600, color: TONE12.accent }, children: diag.personaName || "\u2014" }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.quiet }, children: diag.personaSource === "session" ? `\uFF08${t("pl.diag.session")}\uFF09` : diag.personaSource === "path" ? `\uFF08${t("pl.diag.workspace")}\uFF09` : `\uFF08${t("pl.diag.default")}\uFF09` })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE12.quiet }, children: "\u6280\u80FD \xB7 " }),
                                            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { color: TONE12.text }, children: [
                                              diag.promptTitles.length > 0 ? diag.promptTitles.join("\u3001") : `\u2014\uFF08${t("pl.diag.noSkill")}\uFF09`,
                                              diag.activeCount > 0 ? `\uFF08+${diag.activeCount} ${t("pl.diag.current")}\uFF09` : ""
                                            ] })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: TONE12.quiet }, children: [
                                            t("pl.diag.cwd"),
                                            "\uFF1A",
                                            diag.cwd || "\u2014"
                                          ] })
                                        ]
                                      }
                                    ) : null
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column", padding: "10px 10px 10px" }, children: !scopesLoaded ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.achievements.loading") }) : scopes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.personas.scopes.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: scopes.map((ws) => renderScopeNode(ws, 0)) }) })
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    ConfirmDialog,
                    {
                      open: deleteId !== null,
                      danger: true,
                      message: deleteId ? t("pl.sessionPrompts.deleteConfirm").replace("{name}", `\u300C${clampTitle(prompts.find((x) => x.id === deleteId)?.title ?? "")}\u300D`) : "",
                      confirmLabel: t("pl.personas.delete"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setDeleteId(null),
                      onConfirm: confirmDelete
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    ConfirmDialog,
                    {
                      open: clearAllOpen,
                      danger: true,
                      message: t("pl.inject.clearAllConfirm"),
                      confirmLabel: t("pl.inject.clearAll"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setClearAllOpen(false),
                      onConfirm: confirmClearAll
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    ImportConfirmModal,
                    {
                      open: pendingImport != null,
                      title: t("pl.inject.importConfirmTitle"),
                      headline: t("pl.inject.importConfirmHeadline", { name: pendingImport?.title ?? "" }),
                      contentTitle: pendingImport?.title,
                      content: pendingImport?.text,
                      confirmLabel: t("pl.import"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setPendingImport(null),
                      onConfirm: () => void confirmImport()
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    "input",
                    {
                      ref: importFileRef,
                      type: "file",
                      accept: ".md,.markdown,.txt,text/markdown,text/plain",
                      style: { display: "none" },
                      onChange: (e) => void handleImport(e)
                    }
                  )
                ]
              }
            )
          ]
        }
      ),
      container || document.body
    ),
    detailId ? (() => {
      const p = prompts.find((x) => x.id === detailId);
      if (!p) return null;
      const content = p.body && p.body.trim() ? p.body.trim() : t("pl.inject.detailEmpty");
      return (0, import_react_dom2.createPortal)(
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "div",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": t("pl.inject.detailTitle"),
            className: container ? void 0 : PL_DIALOG_OVERLAY,
            style: container ? PL_DIALOG_EMBED_OVERLAY : void 0,
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: PL_DIALOG_CSS }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: PL_DIALOG, style: container ? { width: "100%", height: "100%", gap: 10, borderRadius: 12, background: TONE12.panel } : { width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(520px, calc(100vh - 40px))", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(BookIcon2, { color: TONE12.accent }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("strong", { style: { flex: 1, fontSize: 14, fontWeight: 600, color: TONE12.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: clampTitle(p.title) }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DialogCloseButton, { noTip: true, onClick: () => setDetailId(null), label: t("pl.inject.detailTitle") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      padding: "10px 11px",
                      paddingRight: 10,
                      background: TONE12.row,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 8
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      "pre",
                      {
                        style: {
                          margin: 0,
                          fontFamily: MONO7,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: TONE12.text,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        },
                        children: content
                      }
                    )
                  }
                )
              ] })
            ]
          }
        ),
        container || document.body
      );
    })() : null
  ] });
}

// src/client/components/persona-skill/PersonaManagerModal.tsx
var import_react12 = require("react");
var import_react_dom3 = require("react-dom");
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime16 = require("react/jsx-runtime");
var MONO8 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function sanitizeFileName2(name) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "untitled";
}
function downloadMarkdown2(fileName, content) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function BookIcon3({ color, size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      "path",
      {
        d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      "path",
      {
        d: "M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    )
  ] });
}
function PersonaManagerModal({ open, onClose, t, container }) {
  useThemeSync();
  const TONE12 = getTone();
  const [maximized, setMaximized] = (0, import_react12.useState)(false);
  const [personas, setPersonas] = (0, import_react12.useState)([]);
  const [loaded, setLoaded] = (0, import_react12.useState)(false);
  const [scopes, setScopes] = (0, import_react12.useState)([]);
  const [scopesLoaded, setScopesLoaded] = (0, import_react12.useState)(false);
  const [expanded, setExpanded] = (0, import_react12.useState)(/* @__PURE__ */ new Set());
  const SCOPE_EXPAND_KEY = "pl:persona-tree-expanded";
  const scopesExpandedFromStorage = () => {
    try {
      const raw = localStorage.getItem(SCOPE_EXPAND_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr) : null;
    } catch {
      return null;
    }
  };
  const persistScopesExpanded = (s) => {
    try {
      localStorage.setItem(SCOPE_EXPAND_KEY, JSON.stringify([...s]));
    } catch {
    }
  };
  const buildScopesExpanded = (tree) => {
    const stored = scopesExpandedFromStorage();
    if (stored !== null) return stored;
    const all = /* @__PURE__ */ new Set();
    const collect = (nodes) => {
      for (const node of nodes) {
        all.add(node.path);
        collect(node.children);
      }
    };
    collect(tree);
    return all;
  };
  const refreshScopes = () => listSessionScopeTree().then((tree) => {
    setScopes(tree);
    setExpanded(buildScopesExpanded(tree));
    setScopesLoaded(true);
  });
  const findScopeNode = (nodes, path) => {
    for (const n of nodes) {
      if (n.path === path) return n;
      const hit = findScopeNode(n.children, path);
      if (hit) return hit;
    }
    return void 0;
  };
  const loadDiag = (silent = false) => {
    if (!silent) {
      setDiagLoading(true);
      setDiag(null);
    }
    void diagSession().then((d) => setDiag(d)).catch(() => {
      if (!silent) setDiag(null);
    }).finally(() => {
      if (!silent) setDiagLoading(false);
    });
  };
  const tRef = (0, import_react12.useRef)(t);
  tRef.current = t;
  const [createName, setCreateName] = (0, import_react12.useState)("");
  const [names, setNames] = (0, import_react12.useState)({});
  const [editingId, setEditingId] = (0, import_react12.useState)(null);
  const [editContent, setEditContent] = (0, import_react12.useState)("");
  const [deleteId, setDeleteId] = (0, import_react12.useState)(null);
  const [clearAllOpen, setClearAllOpen] = (0, import_react12.useState)(false);
  const [detailId, setDetailId] = (0, import_react12.useState)(null);
  const [selectedNode, setSelectedNode] = (0, import_react12.useState)(null);
  const [diag, setDiag] = (0, import_react12.useState)(null);
  const [diagLoading, setDiagLoading] = (0, import_react12.useState)(true);
  const [error, setError] = (0, import_react12.useState)(null);
  const [busy, setBusy] = (0, import_react12.useState)(false);
  const [msg, setMsg] = (0, import_react12.useState)(null);
  const msgTimerRef = (0, import_react12.useRef)(null);
  (0, import_react12.useEffect)(() => {
    if (!msg) return;
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [msg]);
  const [selected, setSelected] = (0, import_react12.useState)(/* @__PURE__ */ new Set());
  const importFileRef = (0, import_react12.useRef)(null);
  const [pendingImport, setPendingImport] = (0, import_react12.useState)(null);
  (0, import_react12.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setLoaded(false);
    setError(null);
    setMsg(null);
    setSelected(/* @__PURE__ */ new Set());
    setEditingId(null);
    setDeleteId(null);
    setDetailId(null);
    setCreateName("");
    setPendingImport(null);
    listPersonas().then((list) => {
      if (!alive) return;
      setPersonas(list);
      const draft = {};
      for (const p of list) if (!p.isDefault) draft[p.id] = p.name;
      setNames(draft);
      setLoaded(true);
    }).catch(() => {
      if (!alive) return;
      setLoaded(true);
      setError(tRef.current("pl.personas.opFailed"));
    });
    return () => {
      alive = false;
    };
  }, [open]);
  (0, import_react12.useEffect)(() => {
    if (!open) return;
    refreshScopes().catch(() => {
    });
    loadDiag();
  }, [open]);
  if (!open) return null;
  const refresh = () => {
    return listPersonas().then((list) => {
      setPersonas(list);
      setNames((prev) => {
        const next = {};
        const custom = list.filter((p) => !p.isDefault);
        for (const p of custom) {
          next[p.id] = (prev[p.id] ?? "").trim() ? prev[p.id] : p.name;
        }
        return next;
      });
    });
  };
  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setError(t("pl.personas.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createPersona(name);
      await refresh();
      notifyDataChanged();
      setNames((prev) => ({ ...prev, [created.id]: created.name }));
      setEditContent(created.content);
      setEditingId(created.id);
      setCreateName("");
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };
  const openEditor = (p) => {
    setEditingId(p.id);
    setEditContent(p.content);
    setError(null);
  };
  const cancelEdit = (p) => {
    setEditingId(null);
    setEditContent("");
    setNames((prev) => ({ ...prev, [p.id]: p.name }));
  };
  const handleSave = async (p) => {
    const name = (names[p.id] ?? p.name).trim();
    if (!name) {
      setError(t("pl.personas.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updatePersona(p.id, { name, content: editContent });
      setNames((prev) => ({ ...prev, [updated.id]: updated.name }));
      await refresh();
      notifyDataChanged();
      setMsg({ text: t("pl.personas.modifyDone", { name: updated.name }), kind: "success" });
      setEditingId(null);
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };
  const handleAiGenerate = async (p) => {
    const name = (names[p.id] ?? p.name).trim();
    if (!name) {
      setError(t("pl.ai.genNeedTitle"));
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const { content } = await generateDraft("soul", name, editContent);
      setEditContent(content);
      setMsg({ text: t("pl.ai.genDone") });
    } catch {
      setError(t("pl.ai.genFailed"));
    } finally {
      setBusy(false);
    }
  };
  const toggleEnabled = async (p) => {
    setBusy(true);
    setError(null);
    try {
      await updatePersona(p.id, { enabled: !p.enabled });
      await refresh();
      notifyDataChanged();
      setMsg({
        text: t(p.enabled ? "pl.personas.enableOff" : "pl.personas.enableOn", { name: p.name }),
        kind: "info"
      });
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = () => {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    deletePersona(deleteId).then(() => {
      refresh();
      notifyDataChanged();
    }).catch(() => setError(t("pl.personas.opFailed"))).finally(() => {
      setBusy(false);
      setDeleteId(null);
      if (editingId === deleteId) setEditingId(null);
    });
  };
  const confirmClearAll = () => {
    setBusy(true);
    setError(null);
    clearAllPersonaBindings().then(() => {
      void refreshScopes().catch(() => setError(t("pl.personas.opFailed")));
      notifyDataChanged();
      setMsg({ text: t("pl.personas.bindDone"), kind: "info" });
    }).catch(() => setError(t("pl.inject.opFailed"))).finally(() => {
      setBusy(false);
      setClearAllOpen(false);
    });
  };
  const handleExport = () => {
    const exportList = personas.filter((p) => selected.has(p.id));
    if (exportList.length === 0) {
      setMsg({ text: t("pl.exportSelectEmpty"), kind: "error" });
      return;
    }
    for (const p of exportList) {
      const title = p.isDefault ? p.name : names[p.id] ?? p.name;
      downloadMarkdown2(`${sanitizeFileName2(title)}.md`, p.content && p.content.trim() ? p.content.trim() : "");
    }
    setMsg({ text: t("pl.personas.exportDone", { count: exportList.length }) });
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = (await file.text()).trim();
    if (!text) {
      setMsg({ text: t("pl.personas.importEmpty"), kind: "error" });
      return;
    }
    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "untitled";
    setPendingImport({ title, text });
  };
  const confirmImport = async () => {
    if (!pendingImport) return;
    setPendingImport(null);
    setBusy(true);
    setError(null);
    try {
      const created = await createPersona(pendingImport.title);
      await updatePersona(created.id, { content: pendingImport.text, enabled: true });
      await refresh();
      setMsg({ text: t("pl.personas.importDone", { count: 1 }) });
    } catch {
      setMsg({ text: t("pl.personas.importFailed"), kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const defaultPersona = personas.find((p) => p.isDefault);
  const customPersonas = personas.filter((p) => !p.isDefault);
  const bindablePersonas = customPersonas.filter((p) => p.enabled);
  const handleScopeBind = (nodePath, personaId) => {
    const value = personaId === "default" ? "" : personaId;
    setBusy(true);
    setError(null);
    setPersonaBinding(nodePath, value || "default").then(({ personaId: bound }) => {
      setScopes((prev) => prev.map((node) => rewriteScopePersona(node, nodePath, bound)));
      loadDiag(true);
      notifyDataChanged();
      setMsg({ text: t("pl.personas.bindDone"), kind: "info" });
    }).catch(() => setError(t("pl.personas.opFailed"))).finally(() => setBusy(false));
  };
  const rewriteScopePersona = (node, targetPath, personaId) => node.path === targetPath ? { ...node, bound: personaId } : { ...node, children: node.children.map((child) => rewriteScopePersona(child, targetPath, personaId)) };
  const toggleExpand = (path) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    persistScopesExpanded(next);
    return next;
  });
  const renderPersonaSelect = (value, onChange) => {
    const selectValue = bindablePersonas.some((p) => p.id === value) ? value : "default";
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
      "select",
      {
        value: selectValue,
        disabled: busy,
        onChange: (e) => onChange(e.target.value),
        style: {
          flexShrink: 0,
          boxSizing: "border-box",
          width: "auto",
          minWidth: 120,
          maxWidth: 180,
          fontSize: 12,
          color: TONE12.text,
          background: TONE12.row,
          border: `1px solid ${TONE12.border}`,
          borderRadius: 7,
          padding: "3px 6px",
          outline: "none",
          cursor: busy ? "not-allowed" : "pointer",
          fontFamily: MONO8
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("option", { value: "default", children: t("pl.personas.scopes.defaultOption") }),
          bindablePersonas.map((p) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("option", { value: p.id, children: names[p.id] ?? p.name }, p.id))
        ]
      }
    );
  };
  const renderKindBadge = (kind) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
    "span",
    {
      style: {
        flexShrink: 0,
        fontSize: 10.5,
        color: kind === "workspace" ? TONE12.accent : TONE12.quiet,
        background: TONE12.accentSoft,
        border: `1px solid ${TONE12.border}`,
        borderRadius: 999,
        padding: "0 6px",
        lineHeight: "15px"
      },
      children: kind === "workspace" ? t("pl.personas.scopes.workspace") : t("pl.personas.scopes.project")
    }
  );
  const renderScopeNode = (node, depth) => {
    const hasChildren = node.children.length > 0;
    const isExpandable = hasChildren;
    const displayTitle = node.path === UNMATCHED_SCOPE_PATH ? t("pl.personas.scopes.others") : node.title;
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { marginLeft: depth * 18 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 0",
            minHeight: 28
          },
          children: [
            isExpandable ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
              "button",
              {
                type: "button",
                onClick: () => toggleExpand(node.path),
                title: displayTitle,
                style: {
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  border: "none",
                  background: "transparent",
                  color: TONE12.quiet,
                  cursor: "pointer",
                  fontSize: 11,
                  lineHeight: 1,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: expanded.has(node.path) ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .24s cubic-bezier(.22,1,.36,1)"
                },
                children: "\u25B6"
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { flexShrink: 0, width: 18 } }),
            renderKindBadge(node.kind),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
              "span",
              {
                onClick: () => setSelectedNode(
                  (prev) => prev?.kind === "scope" && prev.key === node.path ? null : { kind: "scope", key: node.path, label: displayTitle }
                ),
                style: {
                  flex: 1,
                  fontSize: 12.5,
                  color: TONE12.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                  textDecoration: selectedNode?.kind === "scope" && selectedNode.key === node.path ? "underline" : void 0,
                  textUnderlineOffset: 3
                },
                title: node.path,
                children: displayTitle
              }
            ),
            renderPersonaSelect(node.bound, (v) => handleScopeBind(node.path, v))
          ]
        }
      ),
      expanded.has(node.path) && hasChildren && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: node.children.map((child) => renderScopeNode(child, depth + 1)) })
    ] }, node.path);
  };
  const inputStyle8 = {
    boxSizing: "border-box",
    width: "100%",
    background: TONE12.row,
    border: `1px solid ${TONE12.border}`,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 12.5,
    color: TONE12.text,
    fontFamily: MONO8,
    outline: "none"
  };
  const textareaStyle = {
    ...inputStyle8,
    minHeight: 150,
    resize: "vertical",
    lineHeight: 1.6
  };
  const renderPersonaCard = (p) => {
    const isEditing = editingId === p.id;
    const isDefault = p.isDefault;
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
      "div",
      {
        style: {
          background: TONE12.panel,
          border: `1px solid ${TONE12.border}`,
          borderRadius: 10,
          overflow: "hidden",
          opacity: p.enabled ? 1 : 0.6
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: TONE12.row,
                borderBottom: `1px solid ${TONE12.border}`
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    title: t("pl.selectExport"),
                    checked: selected.has(p.id),
                    disabled: busy,
                    onChange: () => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    }),
                    style: { flexShrink: 0, accentColor: TONE12.accent, cursor: busy ? "not-allowed" : "pointer", margin: 0 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(BookIcon3, { color: isDefault ? TONE12.accent : p.enabled ? TONE12.accent : TONE12.quiet }),
                isDefault ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("strong", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: p.name }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "span",
                    {
                      style: {
                        fontSize: 10.5,
                        color: TONE12.accent,
                        background: TONE12.accentSoft,
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 999,
                        padding: "1px 8px"
                      },
                      children: t("pl.personas.defaultBadge")
                    }
                  )
                ] }) : isEditing ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "input",
                  {
                    value: names[p.id] ?? p.name,
                    onChange: (e) => setNames((prev) => ({ ...prev, [p.id]: e.target.value })),
                    disabled: busy,
                    style: { ...inputStyle8, flex: 1, minWidth: 60, background: TONE12.panel },
                    maxLength: 25,
                    title: t("pl.personas.namePlaceholder")
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "strong",
                  {
                    style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                    title: names[p.id] ?? p.name,
                    children: names[p.id] ?? p.name
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "button",
                  {
                    type: "button",
                    role: "switch",
                    "aria-checked": p.enabled,
                    title: t("pl.personas.enabled"),
                    disabled: busy || isDefault,
                    onClick: () => void toggleEnabled(p),
                    style: {
                      flexShrink: 0,
                      width: 34,
                      height: 18,
                      borderRadius: 9,
                      border: `1px solid ${TONE12.border}`,
                      background: p.enabled ? TONE12.accent : "transparent",
                      position: "relative",
                      cursor: busy || isDefault ? "not-allowed" : "pointer",
                      padding: 0,
                      opacity: isDefault ? 0.7 : 1
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "span",
                      {
                        style: {
                          position: "absolute",
                          top: 2,
                          left: p.enabled ? 17 : 2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: p.enabled ? TONE12.panel : TONE12.quiet,
                          transition: "left .24s cubic-bezier(.22,1,.36,1)"
                        }
                      }
                    )
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  import_dsh_client_ui_primitives8.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => {
                      if (!p.enabled && !isEditing) {
                        setMsg({ text: t("pl.personas.disabledEditHint"), kind: "error" });
                        return;
                      }
                      if (isEditing) cancelEdit(p);
                      else openEditor(p);
                    },
                    children: isEditing ? t("pl.personas.cancel") : t("pl.personas.edit")
                  }
                ),
                !isDefault && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  import_dsh_client_ui_primitives8.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => {
                      if (!p.enabled) {
                        setMsg({ text: t("pl.personas.disabledDeleteHint"), kind: "error" });
                        return;
                      }
                      setDeleteId(p.id);
                    },
                    children: t("pl.personas.delete")
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { padding: 10 }, children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 11.5, color: TONE12.muted }, children: t("pl.personas.contentLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
              "textarea",
              {
                value: editContent,
                onChange: (e) => setEditContent(e.target.value),
                disabled: busy || isDefault,
                placeholder: "# SOUL",
                style: { ...textareaStyle, minHeight: isDefault ? 130 : 120 }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5 }, children: t("pl.personas.contentHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy || isDefault, onClick: () => void handleAiGenerate(p), children: busy ? t("pl.ai.generating") : t("pl.ai.generate") }),
              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy || isDefault, onClick: () => void handleSave(p), children: t("pl.personas.save") })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
            "div",
            {
              style: {
                background: TONE12.row,
                borderRadius: 7,
                padding: "7px 9px",
                minHeight: 40,
                maxHeight: 96,
                overflow: "hidden",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: TONE12.quiet,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                cursor: "pointer"
              },
              onClick: () => {
                if (!isEditing) setDetailId(p.id);
              },
              title: t("pl.personas.viewDetail"),
              children: [
                p.content && p.content.trim() ? p.content.trim().slice(0, 300) : t("pl.personas.previewEmpty"),
                !isDefault && p.content && p.content.trim().length > 300 ? "\u2026" : ""
              ]
            }
          ) })
        ]
      },
      p.id
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
    (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("pl.personas.title"),
          className: container ? void 0 : maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY,
          children: [
            !container && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("style", { children: PL_DIALOG_CSS }),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
              "div",
              {
                className: maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG,
                style: {
                  ...container ? {} : { width: 800, height: 800 },
                  maxWidth: "calc(100vw - 40px)",
                  maxHeight: "calc(100vh - 40px)"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(BookIcon3, { color: TONE12.accent }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("strong", { style: { flex: 1, fontSize: 15, fontWeight: 600, color: TONE12.text }, children: t("pl.personas.title") }),
                    !container && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        WindowToggleButton,
                        {
                          maximized,
                          onToggle: () => setMaximized((v) => !v),
                          maximizeLabel: t("pl.windowMaximize"),
                          restoreLabel: t("pl.windowRestore")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "div",
                    {
                      style: {
                        marginTop: 10,
                        fontSize: 11.5,
                        lineHeight: 1.6,
                        color: TONE12.quiet,
                        background: TONE12.accentSoft,
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 7,
                        padding: "7px 10px",
                        flexShrink: 0
                      },
                      children: t("pl.personas.note")
                    }
                  ),
                  error && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { marginTop: 8, fontSize: 12, color: TONE12.red, lineHeight: 1.5, flexShrink: 0 }, children: error }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      style: {
                        flexShrink: 0,
                        height: 18,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
                        overflow: "hidden",
                        whiteSpace: "nowrap"
                      },
                      children: [
                        msg && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                          "span",
                          {
                            style: {
                              flexShrink: 0,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
                            }
                          }
                        ),
                        msg?.text ?? ""
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        gap: 2,
                        paddingTop: 14,
                        paddingBottom: 4,
                        marginTop: -8
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1 1 0",
                              minWidth: 0,
                              minHeight: 0,
                              height: "100%",
                              boxSizing: "border-box",
                              background: TONE12.row,
                              border: `1px solid ${TONE12.border}`,
                              borderRadius: 10,
                              overflowY: "auto"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                "div",
                                {
                                  style: {
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 3,
                                    padding: "10px 10px 8px",
                                    background: TONE12.row,
                                    borderBottom: `1px solid ${TONE12.border}`
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE12.accent, flexShrink: 0 } }),
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text }, children: t("pl.personas.listTitle") })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5, marginTop: 3 }, children: t("pl.personas.listHint") }),
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5 }, children: t("pl.exportHint") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 }, children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: handleExport, children: t("pl.export") }),
                                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), disabled: busy, onClick: () => importFileRef.current?.click(), children: t("pl.import") })
                                      ] })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 8,
                                          marginTop: 10,
                                          background: TONE12.accentSoft,
                                          border: `1px dashed ${TONE12.accent}`,
                                          borderRadius: 10,
                                          padding: 10
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: 12.5, fontWeight: 600, color: TONE12.accent }, children: [
                                            "+ ",
                                            t("pl.personas.createTitle")
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.5, marginTop: -4 }, children: t("pl.personas.createHint") }),
                                          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                                              "input",
                                              {
                                                value: createName,
                                                onChange: (e) => setCreateName(e.target.value),
                                                onKeyDown: (e) => {
                                                  if (e.key === "Enter") void handleCreate();
                                                },
                                                placeholder: t("pl.personas.namePlaceholder"),
                                                style: { ...inputStyle8, flex: 1 }
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy || !createName.trim(), onClick: () => void handleCreate(), children: t("pl.personas.save") })
                                          ] })
                                        ]
                                      }
                                    )
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: "10px 10px 10px" }, children: !loaded ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "22px 0" }, children: t("pl.achievements.loading") }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                                defaultPersona && renderPersonaCard(defaultPersona),
                                customPersonas.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "18px 0" }, children: t("pl.personas.empty") }) : customPersonas.map((p) => renderPersonaCard(p))
                              ] }) })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1 1 0",
                              minWidth: 0,
                              height: "100%",
                              boxSizing: "border-box",
                              minHeight: 0,
                              background: TONE12.row,
                              border: `1px solid ${TONE12.border}`,
                              borderRadius: 10,
                              overflowY: "auto"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                "div",
                                {
                                  style: {
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 3,
                                    padding: "10px 10px 8px",
                                    background: TONE12.row,
                                    boxSizing: "border-box",
                                    borderBottom: `1px solid ${TONE12.border}`
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE12.accent, flexShrink: 0 } }),
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE12.text }, children: t("pl.personas.scopes.title") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), style: { color: "var(--dsw-alias-error,#F5585C)" }, title: t("pl.personas.clearAllTitle"), disabled: busy, onClick: () => setClearAllOpen(true), children: t("pl.inject.clearAll") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), title: t("pl.refresh"), onClick: () => void refreshScopes().catch(() => setError(t("pl.personas.opFailed"))), children: t("pl.refresh") })
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 11, color: TONE12.quiet, lineHeight: 1.6, marginTop: 4 }, children: t("pl.personas.scopes.hint") }),
                                    (() => {
                                      let selPersonaId = "";
                                      let selPersonaName = "";
                                      let selSource = null;
                                      let selPath = "";
                                      if (selectedNode?.kind === "scope") {
                                        const node = findScopeNode(scopes, selectedNode.key);
                                        selPersonaId = node?.bound ?? "";
                                        selPath = selectedNode.key;
                                        if (selPersonaId) selSource = t("pl.diag.workspace");
                                      }
                                      const boundPersona = personas.find((p) => p.id === selPersonaId);
                                      selPersonaName = selPersonaId ? boundPersona ? boundPersona.isDefault ? boundPersona.name : names[boundPersona.id] ?? boundPersona.name : selPersonaId : "";
                                      if (selectedNode && selectedNode.kind !== null) {
                                        return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              margin: "8px 0 0",
                                              background: TONE12.accentSoft,
                                              border: `1px dashed ${TONE12.accent}`,
                                              borderRadius: 9,
                                              padding: "8px 10px",
                                              fontSize: 11,
                                              lineHeight: 1.6,
                                              color: TONE12.text
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 600, height: 20, marginBottom: 4 }, children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: t("pl.diag.selected", { name: selectedNode.label }) }),
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    onClick: () => setSelectedNode(null),
                                                    style: {
                                                      flexShrink: 0,
                                                      border: `1px solid ${TONE12.border}`,
                                                      background: TONE12.panel,
                                                      color: TONE12.text,
                                                      borderRadius: 999,
                                                      padding: "1px 8px",
                                                      fontSize: 10.5,
                                                      lineHeight: "16px",
                                                      cursor: "pointer"
                                                    },
                                                    children: t("pl.diag.back")
                                                  }
                                                )
                                              ] }),
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: TONE12.quiet }, children: "\u4EBA\u683C \xB7 " }),
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: TONE12.text }, children: selPersonaId ? `${selPersonaName}${selSource ? `\uFF08${selSource}\uFF09` : ""}` : `\u2014\uFF08${t("pl.personas.scopes.defaultOption")}\uFF09` })
                                              ] }),
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: TONE12.quiet }, children: [
                                                t("pl.diag.path"),
                                                "\uFF1A",
                                                selPath || "\u2014"
                                              ] })
                                            ]
                                          }
                                        );
                                      }
                                      if (diagLoading) {
                                        return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              fontSize: 11,
                                              color: TONE12.quiet,
                                              minHeight: 72,
                                              boxSizing: "border-box",
                                              display: "flex",
                                              alignItems: "center",
                                              padding: "0 10px"
                                            },
                                            children: [
                                              t("pl.achievements.loading"),
                                              "\u2026"
                                            ]
                                          }
                                        );
                                      }
                                      if (diag) {
                                        return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              margin: "8px 0 0",
                                              background: TONE12.accentSoft,
                                              border: `1px dashed ${TONE12.accent}`,
                                              borderRadius: 9,
                                              padding: "8px 10px",
                                              fontSize: 11,
                                              lineHeight: 1.6,
                                              color: TONE12.text,
                                              minHeight: 72,
                                              boxSizing: "border-box"
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { height: 20, lineHeight: "20px", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginBottom: 4 }, children: t("pl.diag.title") }),
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }, children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: TONE12.quiet }, children: "\u4EBA\u683C \xB7 " }),
                                                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { color: TONE12.text }, children: [
                                                  diag.personaName || "\u2014",
                                                  diag.personaSource === "session" ? `\uFF08${t("pl.diag.session")}\uFF09` : diag.personaSource === "path" ? `\uFF08${t("pl.diag.workspace")}\uFF09` : `\uFF08${t("pl.diag.default")}\uFF09`
                                                ] })
                                              ] }),
                                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: TONE12.quiet }, children: [
                                                t("pl.diag.cwd"),
                                                "\uFF1A",
                                                diag.cwd || "\u2014"
                                              ] })
                                            ]
                                          }
                                        );
                                      }
                                      return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { minHeight: 72 } });
                                    })()
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", flexDirection: "column", padding: "10px 10px 10px" }, children: !scopesLoaded ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.achievements.loading") }) : scopes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 12.5, color: TONE12.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.personas.scopes.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: scopes.map((ws) => renderScopeNode(ws, 0)) }) })
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    ConfirmDialog,
                    {
                      open: deleteId !== null,
                      danger: true,
                      message: deleteId ? t("pl.personas.deleteConfirm").replace("{name}", `\u300C${names[deleteId] ?? ""}\u300D`) : "",
                      confirmLabel: t("pl.personas.delete"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setDeleteId(null),
                      onConfirm: confirmDelete
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    ConfirmDialog,
                    {
                      open: clearAllOpen,
                      danger: true,
                      message: t("pl.personas.clearAllConfirm"),
                      confirmLabel: t("pl.inject.clearAll"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setClearAllOpen(false),
                      onConfirm: confirmClearAll
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    ImportConfirmModal,
                    {
                      open: pendingImport != null,
                      title: t("pl.personas.importConfirmTitle"),
                      headline: t("pl.personas.importConfirmHeadline", { name: pendingImport?.title ?? "" }),
                      contentTitle: pendingImport?.title,
                      content: pendingImport?.text,
                      confirmLabel: t("pl.import"),
                      cancelLabel: t("pl.personas.cancel"),
                      onCancel: () => setPendingImport(null),
                      onConfirm: () => void confirmImport()
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "input",
                    {
                      ref: importFileRef,
                      type: "file",
                      accept: ".md,.markdown,.txt,text/markdown,text/plain",
                      style: { display: "none" },
                      onChange: (e) => void handleImport(e)
                    }
                  )
                ]
              }
            )
          ]
        }
      ),
      container || document.body
    ),
    detailId ? (() => {
      const p = personas.find((x) => x.id === detailId);
      if (!p) return null;
      const detailName = p.isDefault ? p.name : names[p.id] ?? p.name;
      const content = p.content && p.content.trim() ? p.content.trim() : t("pl.personas.detailEmpty");
      return (0, import_react_dom3.createPortal)(
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
          "div",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": t("pl.personas.detailTitle"),
            className: container ? void 0 : PL_DIALOG_OVERLAY,
            style: container ? PL_DIALOG_EMBED_OVERLAY : void 0,
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("style", { children: PL_DIALOG_CSS }),
              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: PL_DIALOG, style: container ? { width: "100%", height: "100%", gap: 10, borderRadius: 12, background: TONE12.panel } : { width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(520px, calc(100vh - 40px))", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(BookIcon3, { color: TONE12.accent }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("strong", { style: { flex: 1, fontSize: 14, fontWeight: 600, color: TONE12.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: detailName }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogCloseButton, { noTip: true, onClick: () => setDetailId(null), label: t("pl.personas.detailTitle") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      padding: "10px 11px",
                      paddingRight: 10,
                      background: TONE12.row,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 8
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "pre",
                      {
                        style: {
                          margin: 0,
                          fontFamily: MONO8,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: TONE12.text,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        },
                        children: content
                      }
                    )
                  }
                )
              ] })
            ]
          }
        ),
        container || document.body
      );
    })() : null
  ] });
}

// src/client/components/import-export/ImportExportModal.tsx
var import_react_dom4 = require("react-dom");
var import_react16 = require("react");
var import_dsh_client_ui_primitives12 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/common/DirectoryPickerModal.tsx
var import_react13 = require("react");
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/utils/workspace-picker.ts
var workspaces = null;
function registerWorkspaces(ws) {
  workspaces = ws;
}
function isDirectoryPickerAvailable() {
  return !!workspaces && typeof workspaces.pickDirectory === "function";
}
function isDirectoryBrowserAvailable() {
  return true;
}
async function pickExportDirectory() {
  if (!workspaces || typeof workspaces.pickDirectory !== "function") {
    throw new Error("native picker unavailable");
  }
  return workspaces.pickDirectory();
}
async function listExportDirectory(path, signal) {
  if (workspaces && typeof workspaces.listDirectory === "function") {
    try {
      return await workspaces.listDirectory(path, signal);
    } catch {
    }
  }
  return listFsDirectory(path);
}
async function createExportDirectory(path, name) {
  if (workspaces && typeof workspaces.createDirectory === "function") {
    try {
      return await workspaces.createDirectory(path, name);
    } catch {
    }
  }
  const created = await createFsDirectory(path, name);
  return created.path;
}

// src/client/components/common/DirectoryPickerModal.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
var MONO9 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE8 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var inputStyle4 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE8.text,
  background: TONE8.row,
  border: `1px solid ${TONE8.border}`,
  borderRadius: 7,
  fontFamily: MONO9,
  fontSize: 13,
  outline: "none"
};
function FolderIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      "path",
      {
        d: "M1.5 3.5A1.5 1.5 0 0 1 3 2h3l1.5 1.8h5.5A1.5 1.5 0 0 1 14.5 5.3v7.2a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-9z",
        fill: "var(--dsw-alias-brand-primary, #8ec5ff)",
        fillOpacity: "0.45"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M1.5 6h13v.8h-13z", fill: "var(--dsw-alias-brand-primary, #8ec5ff)", fillOpacity: "0.45" })
  ] });
}
function DirectoryPickerModal(props) {
  const { open, initialPath, onPick, onClose, t } = props;
  const [listing, setListing] = (0, import_react13.useState)(null);
  const [loading, setLoading] = (0, import_react13.useState)(false);
  const [error, setError] = (0, import_react13.useState)(null);
  const [newFolderOpen, setNewFolderOpen] = (0, import_react13.useState)(false);
  const [newFolderName, setNewFolderName] = (0, import_react13.useState)("");
  const [creating, setCreating] = (0, import_react13.useState)(false);
  const [createErr, setCreateErr] = (0, import_react13.useState)(null);
  const load = (0, import_react13.useCallback)(async (target) => {
    setLoading(true);
    setError(null);
    try {
      const l = await listExportDirectory(target);
      setListing(l);
    } catch (e) {
      setListing(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  (0, import_react13.useEffect)(() => {
    if (!open) return;
    setListing(null);
    setError(null);
    setNewFolderOpen(false);
    setNewFolderName("");
    setCreateErr(null);
    void load(initialPath || void 0);
  }, [open, initialPath, load]);
  if (!open) return null;
  const goUp = () => {
    const crumbs2 = listing?.crumbs;
    if (!crumbs2 || crumbs2.length < 2) return;
    const parent = crumbs2[crumbs2.length - 2];
    if (parent) void load(parent.path);
  };
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !listing) return;
    setCreating(true);
    setCreateErr(null);
    try {
      await createExportDirectory(listing.path, name);
      setNewFolderOpen(false);
      setNewFolderName("");
      void load(listing.path);
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };
  const crumbs = listing?.crumbs ?? [];
  const lastCrumbIndex = crumbs.length - 1;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("pl.dirPicker.title"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 580,
              maxWidth: "92%",
              height: "min(540px, calc(100vh - 80px))",
              gap: 10
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("strong", { style: { fontSize: 14, fontWeight: 560, flex: 1, minWidth: 0 }, children: t("pl.dirPicker.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": t("pl.close"),
                    "data-tip": t("pl.close"),
                    style: {
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      border: "none",
                      outline: "none",
                      borderRadius: 6,
                      background: "transparent",
                      color: TONE8.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE8.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE8.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minWidth: 0,
                      padding: "6px 9px",
                      background: TONE8.row,
                      border: `1px solid ${TONE8.border}`,
                      borderRadius: 7,
                      fontSize: 12,
                      color: TONE8.muted,
                      fontFamily: MONO9,
                      overflowWrap: "anywhere"
                    },
                    title: listing?.path,
                    children: listing ? listing.path : t("pl.dirPicker.loading")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: goUp,
                    disabled: loading || !listing || crumbs.length < 2,
                    style: { flexShrink: 0 },
                    children: t("pl.dirPicker.up")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => {
                      setNewFolderOpen((v) => !v);
                      setCreateErr(null);
                    },
                    disabled: loading || !listing,
                    style: { flexShrink: 0 },
                    children: t("pl.dirPicker.newFolder")
                  }
                )
              ] }),
              newFolderOpen && listing && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "input",
                  {
                    type: "text",
                    value: newFolderName,
                    onChange: (e) => setNewFolderName(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") void handleCreateFolder();
                      if (e.key === "Escape") setNewFolderOpen(false);
                    },
                    placeholder: t("pl.dirPicker.folderPlaceholder"),
                    spellCheck: false,
                    autoFocus: true,
                    style: { ...inputStyle4, flex: 1 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: () => void handleCreateFolder(),
                    disabled: creating || !newFolderName.trim(),
                    style: { flexShrink: 0 },
                    children: t("pl.confirm")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => setNewFolderOpen(false),
                    style: { flexShrink: 0 },
                    children: t("pl.cancel")
                  }
                ),
                createErr ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 11, color: TONE8.red, minWidth: 0 }, children: createErr }) : null
              ] }),
              crumbs.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", flexShrink: 0 }, children: crumbs.map((c, i) => {
                const isLast = i === lastCrumbIndex;
                return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_react13.Fragment, { children: [
                  i > 0 && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: TONE8.quiet, fontSize: 11 }, children: "/" }),
                  /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => void load(c.path),
                      disabled: isLast,
                      style: {
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        cursor: isLast ? "default" : "pointer",
                        padding: "2px 4px",
                        borderRadius: 5,
                        fontSize: 12,
                        color: isLast ? TONE8.text : TONE8.accent,
                        fontFamily: MONO9,
                        transition: "background-color .24s cubic-bezier(.22,1,.36,1)"
                      },
                      onMouseEnter: (e) => {
                        if (!isLast) e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      },
                      children: c.name
                    }
                  )
                ] }, `${c.path}-${i}`);
              }) }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    padding: 4,
                    background: TONE8.row,
                    border: `1px solid ${TONE8.border}`,
                    borderRadius: 8
                  },
                  children: loading ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { padding: 18, textAlign: "center", fontSize: 12, color: TONE8.quiet }, children: t("pl.dirPicker.loading") }) : error ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { padding: 18, textAlign: "center", fontSize: 12, color: TONE8.red, lineHeight: 1.6 }, children: [
                    t("pl.dirPicker.browseFailed"),
                    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { fontSize: 11, color: TONE8.quiet, overflowWrap: "anywhere" }, children: error })
                  ] }) : listing && listing.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { padding: 18, textAlign: "center", fontSize: 12, color: TONE8.quiet }, children: t("pl.dirPicker.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: listing?.entries.map((e) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                    "button",
                    {
                      type: "button",
                      onClick: () => void load(e.path),
                      title: e.path,
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "5px 8px",
                        border: "none",
                        outline: "none",
                        borderRadius: 6,
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 12,
                        color: TONE8.text,
                        opacity: e.hidden ? 0.5 : 1,
                        fontFamily: MONO9,
                        transition: "background-color .24s cubic-bezier(.22,1,.36,1)"
                      },
                      onMouseEnter: (ev) => {
                        ev.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      },
                      onMouseLeave: (ev) => {
                        ev.currentTarget.style.backgroundColor = "transparent";
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FolderIcon, {}),
                        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { minWidth: 0, overflowWrap: "anywhere" }, children: e.name })
                      ]
                    },
                    e.path
                  )) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { flex: 1, minWidth: 0, fontSize: 11, color: TONE8.quiet, lineHeight: 1.5 }, children: t("pl.dirPicker.enterHint") }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: onClose,
                    children: t("pl.cancel")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  import_dsh_client_ui_primitives9.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: () => {
                      if (listing) onPick(listing.path);
                    },
                    disabled: !listing || loading,
                    children: t("pl.dirPicker.selectCurrent")
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/client/components/import-export/SkillImportModal.tsx
var import_react14 = require("react");
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime18 = require("react/jsx-runtime");
var MONO10 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE9 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var inputStyle5 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE9.text,
  background: TONE9.row,
  border: `1px solid ${TONE9.border}`,
  borderRadius: 7,
  fontFamily: MONO10,
  fontSize: 13,
  outline: "none"
};
function kebabFromName(raw, fallback) {
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || `skill-file-${fallback}`;
}
var PROJECT_PATH_KEY = "pl:skill:export:projectPath";
function loadSavedProjectPath() {
  try {
    return localStorage.getItem(PROJECT_PATH_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveProjectPath(path) {
  try {
    if (path.trim()) localStorage.setItem(PROJECT_PATH_KEY, path.trim());
  } catch {
  }
}
function readableFromName(name) {
  const words = name.trim().replace(/[-_]+/g, " ").split(" ").filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function skillFailReason(fail, T) {
  switch (fail) {
    case "no-llm":
      return T("pl.skillModal.aiUnavailable");
    case "route":
      return T("pl.skillModal.aiNoRoute");
    case "empty":
      return T("pl.skillModal.aiEmpty");
    case "parse":
      return T("pl.skillModal.aiParse");
    default:
      return T("pl.skillModal.aiUnavailable");
  }
}
function parseJsonSkillEntries(raw) {
  const obj = raw && typeof raw === "object" ? raw : void 0;
  const list = Array.isArray(raw) ? raw : obj ? obj.skills ?? obj.entries ?? obj.prompts : void 0;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item;
    if (typeof it.title !== "string" || !it.title.trim()) continue;
    if (typeof it.body !== "string" || !it.body.trim()) continue;
    out.push({
      title: it.title.trim(),
      body: it.body,
      ...typeof it.name === "string" && it.name.trim() ? { name: it.name.trim() } : {},
      ...typeof it.summary === "string" && it.summary.trim() ? { summary: it.summary.trim() } : {},
      ...typeof it.promptId === "string" && it.promptId.trim() ? { promptId: it.promptId.trim() } : {}
    });
  }
  return out;
}
function fixTemplateVars(body, defaultVar) {
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    if (body.startsWith("{{", i)) {
      const close = body.indexOf("}}", i + 2);
      if (close === -1) {
        out += `{{${defaultVar}}}`;
        i += 2;
        continue;
      }
      let inner = body.slice(i + 2, close).trim();
      if (!inner) inner = defaultVar;
      else {
        inner = inner.replace(/[{}\n]/g, "").trim();
        if (!inner) inner = defaultVar;
      }
      out += `{{${inner}}}`;
      i = close + 2;
      continue;
    }
    if (body.startsWith("}}", i)) {
      i += 2;
      continue;
    }
    out += body[i];
    i += 1;
  }
  return out;
}
function autoFixEntry(entry, T) {
  const fixes = [];
  let title = entry.title.trim();
  if (!title) {
    title = readableFromName(entry.name) || T("pl.skillModal.unnamed");
    fixes.push(T("pl.skillModal.fixTitle", { title }));
  }
  let body = entry.body;
  if (body.trim()) {
    const fixed = fixTemplateVars(body, T("pl.skillModal.varFixDefault"));
    if (fixed !== body) {
      body = fixed;
      fixes.push(T("pl.skillModal.fixBodyVars"));
    }
  }
  return { entry: { ...entry, title, body }, fixes };
}
function SkillImportModal(props) {
  const {
    open,
    onClose,
    t,
    mode = "import",
    initialEntries,
    onImported,
    onSaved
  } = props;
  const T = usePLT(t);
  const [entries, setEntries] = (0, import_react14.useState)([]);
  const [validation, setValidation] = (0, import_react14.useState)(null);
  const [fixLog, setFixLog] = (0, import_react14.useState)([]);
  const [fillLog, setFillLog] = (0, import_react14.useState)([]);
  const [saving, setSaving] = (0, import_react14.useState)(false);
  const [aiState, setAiState] = (0, import_react14.useState)("idle");
  const [aiResult, setAiResult] = (0, import_react14.useState)(null);
  const [msg, setMsg] = (0, import_react14.useState)(
    null
  );
  const [aiDone, setAiDone] = (0, import_react14.useState)(0);
  const [aiTotal, setAiTotal] = (0, import_react14.useState)(0);
  const aiCancelRef = (0, import_react14.useRef)(false);
  const aiAbortRef = (0, import_react14.useRef)(null);
  const fileRef = (0, import_react14.useRef)(null);
  const jsonRef = (0, import_react14.useRef)(null);
  const bodyRefs = (0, import_react14.useRef)({});
  const autoGrowTextarea2 = (0, import_react14.useCallback)(
    (el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    []
  );
  const seqRef = (0, import_react14.useRef)(0);
  const [selectedKey, setSelectedKey] = (0, import_react14.useState)(null);
  const [toastOpen, setToastOpen] = (0, import_react14.useState)(false);
  const toastTimer = (0, import_react14.useRef)(null);
  const [exportScope, setExportScope] = (0, import_react14.useState)("global");
  const [projectCwd, setProjectCwd] = (0, import_react14.useState)(null);
  const [projectCwdLoading, setProjectCwdLoading] = (0, import_react14.useState)(false);
  const [projectPathInput, setProjectPathInput] = (0, import_react14.useState)("");
  const [dirPickerOpen, setDirPickerOpen] = (0, import_react14.useState)(false);
  const [scanDirPickerOpen, setScanDirPickerOpen] = (0, import_react14.useState)(false);
  (0, import_react14.useEffect)(() => {
    if (!open) return;
    setEntries([]);
    setValidation(null);
    setFixLog([]);
    setFillLog([]);
    setMsg(null);
    setSelectedKey(null);
    setAiState("idle");
    setAiResult(null);
    setExportScope("global");
    setProjectCwd(null);
    setProjectCwdLoading(false);
    setProjectPathInput("");
    setDirPickerOpen(false);
    setScanDirPickerOpen(false);
    if (mode === "export") {
      addEntries(
        (initialEntries ?? []).map((e) => ({
          name: e.name ?? "",
          promptId: e.promptId,
          title: e.title,
          body: e.body,
          summary: e.summary ?? "",
          exists: false,
          source: "export"
        }))
      );
      return;
    }
  }, [open]);
  (0, import_react14.useEffect)(() => {
    if (!open || mode !== "export" || exportScope !== "project") return;
    let alive = true;
    setProjectCwdLoading(true);
    getExportProjectCwd().then(({ cwd }) => {
      if (!alive) return;
      setProjectCwd(cwd);
      if (!cwd) setProjectPathInput(loadSavedProjectPath());
      setProjectCwdLoading(false);
    }).catch(() => {
      if (!alive) return;
      setProjectCwd(null);
      setProjectPathInput(loadSavedProjectPath());
      setProjectCwdLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, mode, exportScope]);
  const handlePickDirectory = (0, import_react14.useCallback)(async () => {
    if (isDirectoryPickerAvailable()) {
      try {
        const dir = await pickExportDirectory();
        if (dir) {
          setProjectPathInput(dir);
          setMsg(null);
          return;
        }
        return;
      } catch {
      }
    }
    if (!isDirectoryBrowserAvailable()) {
      setMsg({
        text: T("pl.skillModal.directoryPickerUnavailable"),
        error: true
      });
      return;
    }
    setDirPickerOpen(true);
  }, [T]);
  const addEntries = (0, import_react14.useCallback)(
    (incoming) => {
      setEntries((prev) => {
        const next = [...prev];
        for (const it of incoming) {
          const ident = it.promptId ?? it.name;
          if (ident && next.some(
            (e) => e.source === it.source && (e.promptId ?? e.name) === ident
          )) {
            continue;
          }
          let key = `${it.source}:${it.promptId ?? it.name}`;
          while (next.some((e) => e.key === key)) {
            key = `${key}-${++seqRef.current}`;
          }
          next.push({
            ...it,
            title: it.title.trim() || T("pl.skillModal.unnamed"),
            key,
            checked: true
          });
        }
        return next;
      });
      setValidation(null);
      setFixLog([]);
    },
    [T]
  );
  const onPickFile = (0, import_react14.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) return;
        parseSkillRaw(text).then(
          (parsed) => {
            const base = file.name.replace(/\.md$/i, "");
            addEntries([
              {
                name: kebabFromName(base, ++seqRef.current),
                title: parsed.title || base,
                body: parsed.body,
                summary: parsed.summary,
                exists: false,
                source: "file"
              }
            ]);
          },
          (err) => {
            setMsg({
              text: T("pl.skillModal.fileError", {
                err: err instanceof Error ? err.message : String(err)
              }),
              error: true
            });
          }
        );
      };
      reader.readAsText(file);
    },
    [addEntries, T]
  );
  const onPickJson = (0, import_react14.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) return;
        let raw;
        try {
          raw = JSON.parse(text);
        } catch (err) {
          setMsg({
            text: T("pl.skillModal.jsonError", {
              err: err instanceof Error ? err.message : String(err)
            }),
            error: true
          });
          return;
        }
        const parsed = parseJsonSkillEntries(raw);
        if (parsed.length === 0) {
          setMsg({ text: T("pl.skillModal.jsonEmpty"), error: true });
          return;
        }
        addEntries(
          parsed.map((p) => ({
            name: p.name ?? "",
            promptId: p.promptId,
            title: p.title,
            body: p.body,
            summary: p.summary ?? "",
            exists: false,
            source: "json"
          }))
        );
      };
      reader.readAsText(file);
    },
    [addEntries, T]
  );
  const scanSkills = (0, import_react14.useCallback)(() => {
    listAvailableSkills().then(
      (list) => {
        if (list.length === 0) {
          setMsg({ text: T("pl.skillModal.scanSkillsEmpty"), error: false });
          return;
        }
        addEntries(
          list.map((s) => ({
            name: s.name,
            title: s.title,
            body: s.body,
            summary: s.summary,
            exists: s.exists,
            source: "disk"
          }))
        );
      },
      (err) => {
        setMsg({
          text: err instanceof Error ? err.message : String(err),
          error: true
        });
      }
    );
  }, [addEntries, T]);
  const runScanDir = (0, import_react14.useCallback)(
    (dir) => {
      scanSkillDir(dir).then(
        (list) => {
          if (list.length === 0) {
            setMsg({ text: T("pl.skillModal.scanDirEmpty"), error: false });
            return;
          }
          addEntries(
            list.map((s) => ({
              name: s.name,
              title: s.title,
              body: s.body,
              summary: s.summary,
              exists: s.exists,
              source: "disk"
            }))
          );
        },
        (err) => {
          setMsg({
            text: err instanceof Error ? err.message : String(err),
            error: true
          });
        }
      );
    },
    [addEntries, T]
  );
  const scanFolder = (0, import_react14.useCallback)(async () => {
    if (isDirectoryPickerAvailable()) {
      try {
        const dir = await pickExportDirectory();
        if (dir) {
          runScanDir(dir);
          return;
        }
        return;
      } catch {
      }
    }
    if (!isDirectoryBrowserAvailable()) {
      setMsg({
        text: T("pl.skillModal.directoryPickerUnavailable"),
        error: true
      });
      return;
    }
    setScanDirPickerOpen(true);
  }, [runScanDir, T]);
  const updateEntry = (0, import_react14.useCallback)(
    (key, patch) => {
      setEntries(
        (prev) => prev.map((e) => e.key === key ? { ...e, ...patch } : e)
      );
      setValidation(null);
      setFixLog([]);
      setFillLog([]);
      setAiState("idle");
      setAiResult(null);
    },
    []
  );
  const toggleChecked = (0, import_react14.useCallback)((key) => {
    setEntries(
      (prev) => prev.map((e) => e.key === key ? { ...e, checked: !e.checked } : e)
    );
  }, []);
  const toggleSelectAll = (0, import_react14.useCallback)(() => {
    setEntries((prev) => {
      const allChecked2 = prev.length > 0 && prev.every((e) => e.checked);
      return prev.map((e) => ({ ...e, checked: !allChecked2 }));
    });
  }, []);
  const removeEntry = (0, import_react14.useCallback)((key) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setSelectedKey((cur) => cur === key ? null : cur);
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);
  const changeScope = (0, import_react14.useCallback)((scope) => {
    setExportScope(scope);
    setValidation(null);
    setFixLog([]);
    setFillLog([]);
    setAiState("idle");
    setAiResult(null);
    setMsg(null);
  }, []);
  const insertVar = (0, import_react14.useCallback)(
    (key) => {
      const entry = entries.find((e) => e.key === key);
      if (!entry) return;
      const textarea = bodyRefs.current[key] ?? null;
      const scrollTop = textarea?.scrollTop ?? 0;
      insertVariableAt(
        textarea,
        entry.body,
        (next) => {
          updateEntry(key, { body: next });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (textarea) textarea.scrollTop = scrollTop;
            });
          });
        },
        T("pl.insertVariableDefault")
      );
    },
    [entries, updateEntry, T]
  );
  const validateTemplateVars2 = (0, import_react14.useCallback)(
    (body) => {
      const errs = [];
      const opens = [];
      const re = /\{\{|\}\}/g;
      let m;
      while ((m = re.exec(body)) !== null) {
        if (m[0] === "{{") {
          opens.push(m.index);
        } else {
          if (opens.length === 0) {
            errs.push(T("pl.skillModal.varUnmatched"));
            continue;
          }
          const start = opens.pop();
          const inner = body.slice(start + 2, m.index).trim();
          if (!inner) errs.push(T("pl.skillModal.varEmpty"));
          else if (/[{}\n]/.test(inner))
            errs.push(T("pl.skillModal.varInvalid", { name: inner }));
        }
      }
      if (opens.length > 0)
        errs.push(T("pl.skillModal.varUnclosed", { n: opens.length }));
      return errs;
    },
    [T]
  );
  const wrapTemplateVars = (0, import_react14.useCallback)(
    (body) => {
      const changes = [];
      const defaultVar = T("pl.skillModal.varFixDefault");
      let out = "";
      let i = 0;
      const len = body.length;
      while (i < len) {
        if (body.startsWith("{{", i)) {
          const close = body.indexOf("}}", i + 2);
          if (close === -1) {
            const rest = body.slice(i + 2).replace(/[{}]/g, " ").replace(/\s+/g, " ").trim();
            const name2 = rest || defaultVar;
            out += `[${name2}]`;
            changes.push(`{{${name2}}} \u2192 [${name2}]`);
            i = len;
            continue;
          }
          const inner = body.slice(i + 2, close);
          const name = inner.replace(/[{}]/g, " ").replace(/\s+/g, " ").trim() || defaultVar;
          out += `[${name}]`;
          changes.push(`{{${inner.trim() || name}}} \u2192 [${name}]`);
          i = close + 2;
          continue;
        }
        if (body.startsWith("}}", i)) {
          i += 2;
          continue;
        }
        out += body[i];
        i += 1;
      }
      return { body: out, changes };
    },
    [T]
  );
  const validateEntries = (0, import_react14.useCallback)(
    (list, requireNameAndSummary) => {
      const checked = list.filter((e) => e.checked);
      const issues = [];
      for (const e of checked) {
        const entryTitle = e.title.trim() || T("pl.skillModal.unnamed");
        if (!e.title.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.titleRequired"),
            fixable: true
          });
        }
        if (requireNameAndSummary && !e.name.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.nameRequired"),
            fixable: false
          });
        }
        if (requireNameAndSummary && !e.summary.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.summaryRequired"),
            fixable: false
          });
        }
        if (!e.body.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.bodyRequired"),
            fixable: false
          });
        }
        for (const m of validateTemplateVars2(e.body)) {
          issues.push({ key: e.key, entryTitle, message: m, fixable: true });
        }
      }
      return {
        ok: issues.length === 0,
        issues,
        fixable: issues.some((i) => i.fixable)
      };
    },
    [T, validateTemplateVars2]
  );
  const handleValidate = (0, import_react14.useCallback)(() => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setMsg(null);
    setFixLog([]);
    setFillLog([]);
    let list = entries;
    if (mode === "export") {
      const log = [];
      let next = entries;
      for (let k = 0; k < next.length; k++) {
        const e = next[k];
        if (!e.checked) continue;
        const w = wrapTemplateVars(e.body);
        if (w.body === e.body) continue;
        for (const c of w.changes) {
          log.push(`\u300C${e.title.trim() || T("pl.skillModal.unnamed")}\u300D${c}`);
        }
        next = next.map((x) => x.key === e.key ? { ...x, body: w.body } : x);
      }
      if (log.length > 0) {
        setFillLog(log);
        setEntries(next);
        list = next;
      }
    }
    const result = validateEntries(list, mode === "export");
    setValidation(result);
  }, [entries, mode, T, validateEntries, wrapTemplateVars]);
  const handleAiEnhance = (0, import_react14.useCallback)(async () => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setMsg(null);
    setAiState("running");
    setAiResult(null);
    setAiDone(0);
    const checked = entries.filter((e) => e.checked);
    aiCancelRef.current = false;
    aiAbortRef.current?.abort();
    aiAbortRef.current = new AbortController();
    setAiTotal(checked.length);
    const updates = /* @__PURE__ */ new Map();
    const errors = [];
    for (const entry of checked) {
      if (aiCancelRef.current) break;
      try {
        const desc = await describeSkill(
          {
            title: entry.title,
            body: entry.body,
            summary: entry.summary.trim() || void 0
          },
          aiAbortRef.current.signal
        );
        if (desc && desc.desc && desc.desc.name && desc.desc.description) {
          updates.set(entry.key, {
            name: entry.name.trim() ? entry.name : desc.desc.name,
            summary: entry.summary.trim() ? entry.summary : desc.desc.description
          });
        } else {
          errors.push({
            key: entry.key,
            title: entry.title,
            reason: skillFailReason(desc?.fail, T)
          });
        }
      } catch (err) {
        if (aiCancelRef.current) break;
        errors.push({
          key: entry.key,
          title: entry.title,
          reason: err instanceof Error ? err.message : String(err)
        });
      } finally {
        setAiDone((n) => n + 1);
      }
    }
    const next = entries.map((e) => {
      const update = updates.get(e.key);
      if (update)
        return { ...e, ...update, aiFailed: false, aiFailReason: void 0 };
      const error = errors.find((err) => err.key === e.key);
      if (error && e.checked)
        return { ...e, aiFailed: true, aiFailReason: error.reason };
      return e;
    });
    setEntries(next);
    setAiState("done");
    setAiResult({
      done: updates.size,
      errors: errors.map(({ title, reason }) => ({ title, reason }))
    });
    setFixLog([]);
    setValidation(validateEntries(next, mode === "export"));
  }, [entries, mode, T, validateEntries]);
  const handleFix = (0, import_react14.useCallback)(() => {
    if (!validation || validation.ok) return;
    const fixesLog = [];
    const next = entries.map((e) => {
      if (!validation.issues.some((i) => i.key === e.key && i.fixable))
        return e;
      const res = autoFixEntry(e, T);
      for (const f of res.fixes) fixesLog.push(`\u300C${res.entry.title}\u300D${f}`);
      return res.entry;
    });
    setEntries(next);
    setFixLog(fixLog);
    setValidation(validateEntries(next, mode === "export"));
  }, [entries, validation, T, validateEntries, mode]);
  const runImport = (0, import_react14.useCallback)(() => {
    setSaving(true);
    const checked = entries.filter((e) => e.checked);
    const payload = checked.map((e) => ({
      name: e.name,
      title: e.title,
      body: e.body,
      summary: e.summary
    }));
    importSkillEntries(payload).then(
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        const errNote = res.errors.length ? T("pl.skillModal.savedErrors", { n: res.errors.length }) : "";
        onSaved?.(
          `${T("pl.skillModal.saved", { imported: res.imported, updated: res.updated })}${errNote}`
        );
      },
      (err) => {
        setSaving(false);
        setMsg({
          text: err instanceof Error ? err.message : String(err),
          error: true
        });
      }
    );
  }, [entries, onImported, onSaved, T]);
  const handleSave = (0, import_react14.useCallback)(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    if (mode === "export") {
      setSaving(true);
      let rootPath;
      if (exportScope === "project") {
        const targetPath = projectPathInput.trim() || projectCwd || "";
        if (!targetPath) {
          setSaving(false);
          setMsg({ text: T("pl.skillModal.projectPathEmpty"), error: true });
          return;
        }
        rootPath = targetPath;
        saveProjectPath(targetPath);
      }
      const payload = checked.map((e) => ({
        promptId: e.promptId,
        name: e.name,
        title: e.title,
        body: e.body,
        summary: e.summary
      }));
      exportSkillEntries(payload, exportScope, rootPath).then(
        (res) => {
          setSaving(false);
          const errNote = res.errors.length ? T("pl.skillModal.savedExportErrors", { n: res.errors.length }) : "";
          const rootNote = res.root ? T("pl.skillModal.exportRoot", { root: res.root }) : "";
          onSaved?.(
            `${T("pl.skillModal.savedExport", { exported: res.exported })} \xB7 ${rootNote}${errNote}`
          );
        },
        (err) => {
          setSaving(false);
          setMsg({
            text: err instanceof Error ? err.message : String(err),
            error: true
          });
        }
      );
      return;
    }
    runImport();
  }, [
    validation,
    saving,
    entries,
    mode,
    exportScope,
    projectCwd,
    projectPathInput,
    T,
    onSaved,
    runImport
  ]);
  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;
  const selected = entries.find((e) => e.key === selectedKey) ?? null;
  const hasFeedback = msg != null || validation != null || fixLog.length > 0 || mode === "export" && aiState !== "idle";
  (0, import_react14.useEffect)(() => {
    setToastOpen(hasFeedback);
  }, [hasFeedback, msg, validation, fixLog, fillLog, aiState, aiResult]);
  (0, import_react14.useEffect)(() => {
    if (!toastOpen) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 3e4);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [toastOpen]);
  if (!open) return null;
  const pauseToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  };
  const resumeToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 3e4);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T(
        mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title"
      ),
      onClick: (e) => e.stopPropagation(),
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background: TONE9.panel,
        borderRadius: 24,
        padding: "18px 7px 18px 10px",
        boxSizing: "border-box",
        // 覆盖 .pl-dialog * 的 scrollbar-gutter:stable：根节点无滚动条，避免右侧预留滚动条位置出现缺口
        scrollbarGutter: "auto"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          "div",
          {
            style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(BookIcon, { color: TONE9.accent }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                "strong",
                {
                  style: {
                    fontSize: 15,
                    fontWeight: 600,
                    flex: 1,
                    minWidth: 0,
                    color: TONE9.text
                  },
                  children: T(
                    mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title"
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(DialogCloseButton, { onClick: onClose, label: T("pl.close") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "div",
          {
            style: {
              marginTop: 10,
              fontSize: 11.5,
              lineHeight: 1.6,
              color: TONE9.quiet,
              background: TONE9.accentSoft,
              border: `1px solid ${TONE9.border}`,
              borderRadius: 7,
              padding: "7px 10px",
              flexShrink: 0
            },
            children: T(
              mode === "export" ? "pl.skillModal.exportSubtitle" : "pl.skillModal.subtitle"
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              marginTop: 10,
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              position: "relative"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                "div",
                {
                  style: {
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    boxSizing: "border-box",
                    background: TONE9.row,
                    border: `1px solid ${TONE9.border}`,
                    borderRadius: 10,
                    padding: 10
                  },
                  children: [
                    mode === "import" && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          flexShrink: 0,
                          marginBottom: 8
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            import_dsh_client_ui_primitives10.Button,
                            {
                              type: "button",
                              variant: "primary",
                              size: "sm",
                              className: plBtn("primary", "sm"),
                              onClick: () => fileRef.current?.click(),
                              children: T("pl.skillModal.chooseFile")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            import_dsh_client_ui_primitives10.Button,
                            {
                              type: "button",
                              variant: "ghost",
                              size: "sm",
                              className: plBtn("ghost", "sm"),
                              onClick: scanSkills,
                              children: T("pl.skillModal.scanSkills")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            import_dsh_client_ui_primitives10.Button,
                            {
                              type: "button",
                              variant: "ghost",
                              size: "sm",
                              className: plBtn("ghost", "sm"),
                              onClick: scanFolder,
                              children: T("pl.skillModal.scanFolder")
                            }
                          )
                        ]
                      }
                    ),
                    mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          flexShrink: 0,
                          marginBottom: 8
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { fontSize: 12, fontWeight: 560, color: TONE9.muted }, children: T("pl.skillModal.exportScope") }),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", gap: 8, flexDirection: "row" }, children: [
                            {
                              value: "global",
                              label: T("pl.skillModal.scopeGlobal"),
                              desc: T("pl.skillModal.scopeGlobalDesc"),
                              path: "~/.dsh/skills/"
                            },
                            {
                              value: "project",
                              label: T("pl.skillModal.scopeProject"),
                              desc: T("pl.skillModal.scopeProjectDesc"),
                              path: projectCwd ? `${projectCwd}` : T("pl.skillModal.projectNoPath")
                            },
                            {
                              value: "private",
                              label: T("pl.skillModal.scopePrivate"),
                              desc: T("pl.skillModal.scopePrivateDesc"),
                              path: T("pl.skillModal.scopePrivatePath")
                            }
                          ].map((opt) => {
                            const active = exportScope === opt.value;
                            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                              "button",
                              {
                                type: "button",
                                onClick: () => changeScope(opt.value),
                                "aria-pressed": active,
                                style: {
                                  flex: 1,
                                  minWidth: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "6px 10px",
                                  textAlign: "left",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontFamily: MONO10,
                                  background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent)" : "transparent",
                                  border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #8ec5ff)" : TONE9.border}`,
                                  transition: "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)"
                                },
                                onMouseEnter: (e) => {
                                  if (!active)
                                    e.currentTarget.style.borderColor = TONE9.borderStrong;
                                },
                                onMouseLeave: (e) => {
                                  if (!active)
                                    e.currentTarget.style.borderColor = TONE9.border;
                                },
                                children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                                  "span",
                                  {
                                    style: {
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-start",
                                      gap: 2,
                                      flex: 1,
                                      minWidth: 0
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                        "span",
                                        {
                                          style: {
                                            fontSize: 12,
                                            fontWeight: 560,
                                            color: active ? TONE9.accent : TONE9.text,
                                            lineHeight: 1.4,
                                            maxWidth: "100%",
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textOverflow: "ellipsis"
                                          },
                                          children: opt.label
                                        }
                                      ),
                                      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                        "span",
                                        {
                                          style: {
                                            fontSize: 10.5,
                                            color: TONE9.quiet,
                                            lineHeight: 1.4,
                                            width: "100%",
                                            minWidth: 0,
                                            wordBreak: "break-all",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden"
                                          },
                                          children: opt.desc
                                        }
                                      )
                                    ]
                                  }
                                )
                              },
                              opt.value
                            );
                          }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "div",
                            {
                              style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                flexShrink: 0,
                                height: 56,
                                overflow: "hidden"
                              },
                              children: exportScope === "project" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                  "div",
                                  {
                                    style: {
                                      fontSize: 11,
                                      color: projectCwdLoading ? TONE9.quiet : projectCwd ? TONE9.quiet : TONE9.red,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis"
                                    },
                                    children: projectCwdLoading ? T("pl.skillModal.projectPathResolving") : projectCwd ? T("pl.skillModal.projectPathHintResolved") : T("pl.skillModal.projectPathHint")
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                    "input",
                                    {
                                      type: "text",
                                      value: projectPathInput || projectCwd || "",
                                      onChange: (e) => setProjectPathInput(e.target.value),
                                      placeholder: T("pl.skillModal.projectPathPlaceholder"),
                                      spellCheck: false,
                                      disabled: projectCwdLoading,
                                      style: inputStyle5
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                    import_dsh_client_ui_primitives10.Button,
                                    {
                                      type: "button",
                                      variant: "ghost",
                                      size: "sm",
                                      className: plBtn("ghost", "sm"),
                                      onClick: handlePickDirectory,
                                      disabled: projectCwdLoading,
                                      style: { flexShrink: 0, minWidth: 64 },
                                      children: T("pl.skillModal.browse")
                                    }
                                  )
                                ] })
                              ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "div",
                                {
                                  style: {
                                    fontSize: 11,
                                    lineHeight: 1.6,
                                    color: TONE9.quiet,
                                    width: "100%",
                                    minWidth: 0,
                                    wordBreak: "break-all",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                  },
                                  children: exportScope === "global" ? T("pl.skillModal.scopeGlobalHint") : T("pl.skillModal.scopePrivateHint")
                                }
                              )
                            }
                          )
                        ]
                      }
                    ),
                    mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          flexShrink: 0,
                          marginBottom: 8
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                          import_dsh_client_ui_primitives10.Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: plBtn("ghost", "sm"),
                            onClick: () => jsonRef.current?.click(),
                            "data-tip": T("pl.skillModal.uploadJsonTitle"),
                            children: T("pl.skillModal.uploadJson")
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                      "div",
                      {
                        style: {
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          paddingBottom: 8,
                          borderBottom: `1px solid ${TONE9.border}`,
                          background: TONE9.row,
                          position: "sticky",
                          top: -10,
                          zIndex: 1
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                            "label",
                            {
                              style: {
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 12,
                                color: TONE9.muted,
                                cursor: "pointer",
                                userSelect: "none"
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                  "input",
                                  {
                                    type: "checkbox",
                                    checked: allChecked,
                                    onChange: toggleSelectAll,
                                    disabled: entries.length === 0
                                  }
                                ),
                                allChecked ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                            "span",
                            {
                              style: { marginLeft: "auto", fontSize: 11, color: TONE9.quiet },
                              children: [
                                T("pl.skillModal.selectHint"),
                                " \xB7 ",
                                checkedCount,
                                "/",
                                entries.length
                              ]
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                      "div",
                      {
                        style: {
                          flex: 1,
                          minHeight: 0,
                          overflow: "auto",
                          paddingTop: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 5
                        },
                        children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                          "div",
                          {
                            style: {
                              padding: "22px 0",
                              textAlign: "center",
                              fontSize: 12,
                              color: TONE9.quiet,
                              border: `1px dashed ${TONE9.border}`,
                              borderRadius: 8,
                              marginTop: 6
                            },
                            children: T(
                              mode === "export" ? "pl.skillModal.noEntryExport" : "pl.skillModal.noEntry"
                            )
                          }
                        ) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                          "div",
                          {
                            onClick: () => setSelectedKey(
                              (cur) => cur === entry.key ? null : entry.key
                            ),
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                              gap: 7,
                              padding: "8px 10px",
                              background: selectedKey === entry.key ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent)" : TONE9.row,
                              border: `1px solid ${selectedKey === entry.key ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)" : TONE9.border}`,
                              borderRadius: 8,
                              cursor: "pointer",
                              opacity: entry.checked ? 1 : 0.55,
                              transition: "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1), opacity .18s"
                            },
                            onMouseEnter: (e) => {
                              if (selectedKey !== entry.key) {
                                e.currentTarget.style.borderColor = TONE9.borderStrong;
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                              }
                            },
                            onMouseLeave: (e) => {
                              if (selectedKey !== entry.key) {
                                e.currentTarget.style.borderColor = TONE9.border;
                                e.currentTarget.style.backgroundColor = TONE9.row;
                              }
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "input",
                                {
                                  type: "checkbox",
                                  checked: entry.checked,
                                  onChange: (e) => {
                                    e.stopPropagation();
                                    toggleChecked(entry.key);
                                  },
                                  "data-tip": T("pl.skillModal.selectHint"),
                                  style: {
                                    flexShrink: 0,
                                    accentColor: TONE9.accent,
                                    margin: 0
                                  }
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "span",
                                {
                                  style: {
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 12.5,
                                    color: TONE9.text,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis"
                                  },
                                  children: entry.title.trim() || T("pl.skillModal.nameLabel")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "span",
                                {
                                  style: {
                                    flexShrink: 0,
                                    fontSize: 10,
                                    lineHeight: 1,
                                    borderRadius: 4,
                                    padding: "2px 5px",
                                    color: entry.summary.trim() ? TONE9.success : TONE9.quiet,
                                    background: entry.summary.trim() ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 14%, transparent)" : "transparent",
                                    border: `1px solid ${entry.summary.trim() ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 45%, transparent)" : TONE9.border}`
                                  },
                                  children: entry.summary.trim() ? T("pl.aiStateDone") : T("pl.aiStatePending")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "span",
                                {
                                  style: {
                                    flexShrink: 0,
                                    fontSize: 10,
                                    lineHeight: 1,
                                    color: entry.source === "disk" ? TONE9.muted : TONE9.accent,
                                    border: `1px solid ${entry.source === "disk" ? TONE9.border : "var(--dsw-alias-brand-primary, #8ec5ff)"}`,
                                    borderRadius: 4,
                                    padding: "2px 5px"
                                  },
                                  children: entry.source === "file" ? T("pl.skillModal.fromFile") : entry.source === "disk" ? T("pl.skillModal.fromDisk") : entry.source === "json" ? T("pl.skillModal.fromJson") : T("pl.skillModal.fromLibrary")
                                }
                              ),
                              entry.exists && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "span",
                                {
                                  style: {
                                    flexShrink: 0,
                                    fontSize: 10,
                                    lineHeight: 1,
                                    color: TONE9.success,
                                    border: `1px solid color-mix(in srgb, ${TONE9.success} 45%, transparent)`,
                                    borderRadius: 4,
                                    padding: "2px 5px"
                                  },
                                  children: T("pl.skillModal.exists")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    removeEntry(entry.key);
                                  },
                                  "data-tip": T("pl.skillModal.remove"),
                                  style: {
                                    flexShrink: 0,
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    color: TONE9.quiet,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    lineHeight: 1,
                                    fontFamily: MONO10,
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    transition: "color .18s, background-color .18s"
                                  },
                                  onMouseEnter: (e) => {
                                    e.currentTarget.style.color = TONE9.red;
                                    e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                                  },
                                  onMouseLeave: (e) => {
                                    e.currentTarget.style.color = TONE9.quiet;
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  },
                                  children: "\xD7"
                                }
                              ),
                              entry.body.trim() && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "div",
                                {
                                  style: {
                                    width: "100%",
                                    flexShrink: 0,
                                    marginTop: 2,
                                    fontSize: 11,
                                    lineHeight: 1.5,
                                    color: TONE9.quiet,
                                    minWidth: 0,
                                    wordBreak: "break-word",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                  },
                                  children: entry.body
                                }
                              )
                            ]
                          },
                          entry.key
                        ))
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                "div",
                {
                  style: {
                    flex: "1.1 1 0",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    boxSizing: "border-box",
                    background: TONE9.row,
                    border: `1px solid ${TONE9.border}`,
                    borderRadius: 10,
                    padding: 10
                  },
                  children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: TONE9.quiet
                      },
                      children: T("pl.previewEmpty")
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        minHeight: 0,
                        flex: 1,
                        overflow: "hidden"
                      },
                      children: [
                        mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "span",
                            {
                              style: { fontSize: 12, color: TONE9.muted, marginTop: 2 },
                              children: T("pl.skillModal.nameLabel")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "input",
                            {
                              type: "text",
                              value: selected.name,
                              onChange: (e) => updateEntry(selected.key, { name: e.target.value }),
                              placeholder: T("pl.skillModal.nameLabel"),
                              disabled: !selected.checked,
                              style: inputStyle5
                            }
                          )
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 12, color: TONE9.muted, marginTop: 2 }, children: T("pl.skillModal.titleLabel") }),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                          "input",
                          {
                            type: "text",
                            value: selected.title,
                            onChange: (e) => updateEntry(selected.key, { title: e.target.value }),
                            placeholder: T("pl.skillModal.titleLabel"),
                            disabled: !selected.checked,
                            style: inputStyle5
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 12, color: TONE9.muted, marginTop: 2 }, children: T("pl.skillModal.summaryLabel") }),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                          "input",
                          {
                            type: "text",
                            value: selected.summary,
                            onChange: (e) => updateEntry(selected.key, { summary: e.target.value }),
                            placeholder: T("pl.skillModal.summaryLabel"),
                            disabled: !selected.checked,
                            style: inputStyle5
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 12, color: TONE9.muted, marginTop: 2 }, children: T("pl.skillModal.bodyLabel") }),
                        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                          "div",
                          {
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              flex: 1,
                              minHeight: 350
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                "textarea",
                                {
                                  ref: (el) => {
                                    bodyRefs.current[selected.key] = el;
                                    autoGrowTextarea2(el);
                                  },
                                  value: selected.body,
                                  onChange: (e) => {
                                    updateEntry(selected.key, { body: e.target.value });
                                    autoGrowTextarea2(e.target);
                                  },
                                  placeholder: T("pl.skillModal.bodyLabel"),
                                  disabled: !selected.checked,
                                  spellCheck: false,
                                  style: {
                                    ...inputStyle5,
                                    // 与导入导出预览的正文 textarea 高度设置保持一致
                                    flex: "0 0 auto",
                                    minHeight: 120,
                                    maxHeight: mode === "export" ? 312 : 412,
                                    height: "auto",
                                    overflowY: "auto",
                                    resize: "none",
                                    lineHeight: 1.6,
                                    whiteSpace: "pre-wrap",
                                    alignSelf: "stretch"
                                  }
                                }
                              ),
                              mode !== "export" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                import_dsh_client_ui_primitives10.Button,
                                {
                                  type: "button",
                                  variant: "ghost",
                                  size: "sm",
                                  className: plBtn("ghost", "sm"),
                                  onClick: () => insertVar(selected.key),
                                  disabled: !selected.checked,
                                  "data-tip": T("pl.insertVariableTitle"),
                                  style: { flexShrink: 0 },
                                  children: T("pl.skillModal.insertVar")
                                }
                              )
                            ]
                          }
                        ),
                        selected.aiFailed && selected.aiFailReason && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                          "div",
                          {
                            role: "alert",
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 6,
                              padding: "6px 9px",
                              borderRadius: 6,
                              fontSize: 12,
                              lineHeight: 1.5,
                              color: TONE9.red,
                              background: "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { flexShrink: 0 }, children: T("pl.skillModal.aiFailed") }),
                              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { minWidth: 0 }, children: selected.aiFailReason })
                            ]
                          }
                        )
                      ]
                    }
                  )
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
              flexShrink: 0,
              marginTop: 10,
              position: "relative"
            },
            children: [
              toastOpen && hasFeedback && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                "div",
                {
                  role: validation ? "alert" : void 0,
                  onMouseEnter: pauseToast,
                  onMouseLeave: resumeToast,
                  style: {
                    position: "absolute",
                    bottom: 2,
                    left: 0,
                    maxWidth: 360,
                    maxHeight: 230,
                    overflow: "hidden",
                    zIndex: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxSizing: "border-box",
                    padding: "9px 11px",
                    borderRadius: 12,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: TONE9.text,
                    background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 78%, transparent)",
                    WebkitBackdropFilter: "blur(12px)",
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${TONE9.borderStrong}`,
                    boxShadow: "0 8px 24px rgba(0, 0, 0, .22)"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "span",
                            {
                              style: { fontWeight: 560, fontSize: 12, flex: 1, minWidth: 0 },
                              children: T("pl.skillModal.notice")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setToastOpen(false),
                              "data-tip": T("pl.close"),
                              style: {
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                color: TONE9.quiet,
                                cursor: "pointer",
                                fontSize: 14,
                                lineHeight: 1,
                                fontFamily: MONO10,
                                padding: "0 2px"
                              },
                              children: "\xD7"
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                      "div",
                      {
                        style: {
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          overflowY: "auto"
                        },
                        children: [
                          msg && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { color: msg.error ? TONE9.red : TONE9.text }, children: msg.text }),
                          validation && (validation.ok ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { color: TONE9.success }, children: T("pl.skillModal.validatePass") }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { color: TONE9.red }, children: T("pl.skillModal.issueCount", {
                              count: validation.issues.length
                            }) }),
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                              "ul",
                              {
                                style: {
                                  margin: 0,
                                  paddingLeft: 18,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3,
                                  color: TONE9.red
                                },
                                children: validation.issues.map((issue, idx) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("li", { children: [
                                  "\u300C",
                                  issue.entryTitle,
                                  "\u300D",
                                  issue.message
                                ] }, idx))
                              }
                            ),
                            validation.fixable && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                    import_dsh_client_ui_primitives10.Button,
                                    {
                                      type: "button",
                                      variant: "primary",
                                      size: "sm",
                                      className: plBtn("primary", "sm"),
                                      onClick: handleFix,
                                      "data-tip": T("pl.skillModal.fixAll"),
                                      children: T("pl.skillModal.fixAll")
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: TONE9.muted }, children: T("pl.skillModal.fixHint", {
                                    fixable: validation.issues.filter((i) => i.fixable).length
                                  }) })
                                ]
                              }
                            )
                          ] })),
                          fixLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { color: TONE9.success }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { children: T("pl.skillModal.fixDone", { count: fixLog.length }) }),
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                              "ul",
                              {
                                style: {
                                  margin: "2px 0 0",
                                  paddingLeft: 18,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3
                                },
                                children: fixLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("li", { children: f }, idx))
                              }
                            )
                          ] }),
                          fillLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { color: TONE9.accent }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { children: T("pl.skillModal.fillDone", { count: fillLog.length }) }),
                            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                              "ul",
                              {
                                style: {
                                  margin: "2px 0 0 8px",
                                  padding: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3
                                },
                                children: fillLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("li", { style: { listStyle: "none" }, children: f }, idx))
                              }
                            )
                          ] }),
                          mode === "export" && aiState !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                            "div",
                            {
                              style: {
                                color: aiState === "running" ? TONE9.accent : aiResult && aiResult.errors.length > 0 ? TONE9.red : TONE9.success
                              },
                              children: aiState === "running" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                                "div",
                                {
                                  style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    alignItems: "stretch"
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { flex: 1, minWidth: 0 }, children: T("pl.skillModal.aiEnhancing", {
                                            done: aiDone,
                                            total: aiTotal
                                          }) }),
                                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                            import_dsh_client_ui_primitives10.Button,
                                            {
                                              type: "button",
                                              variant: "ghost",
                                              size: "sm",
                                              className: plBtn("ghost", "sm"),
                                              onClick: () => {
                                                aiCancelRef.current = true;
                                                aiAbortRef.current?.abort();
                                              },
                                              children: T("pl.cancel")
                                            }
                                          )
                                        ]
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                      "div",
                                      {
                                        style: {
                                          height: 6,
                                          borderRadius: 3,
                                          background: TONE9.row,
                                          border: `1px solid ${TONE9.border}`,
                                          overflow: "hidden",
                                          flexShrink: 0
                                        },
                                        children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                          "div",
                                          {
                                            style: {
                                              height: "100%",
                                              width: `${aiTotal > 0 ? Math.min(
                                                100,
                                                Math.round(aiDone / aiTotal * 100)
                                              ) : 0}%`,
                                              borderRadius: 3,
                                              background: TONE9.accent,
                                              transition: "width .3s ease"
                                            }
                                          }
                                        )
                                      }
                                    )
                                  ]
                                }
                              ) : aiResult && aiResult.errors.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { children: T("pl.skillModal.aiDoneErrors", {
                                  done: aiResult.done,
                                  n: aiResult.errors.length
                                }) }),
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                                  "ul",
                                  {
                                    style: {
                                      margin: "2px 0 0",
                                      paddingLeft: 18,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 3
                                    },
                                    children: aiResult.errors.map((err, idx) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("li", { children: [
                                      "\u300C",
                                      err.title,
                                      "\u300D",
                                      err.reason
                                    ] }, idx))
                                  }
                                )
                              ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { children: T("pl.skillModal.aiDone", { done: aiResult?.done ?? 0 }) })
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                import_dsh_client_ui_primitives10.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: handleAiEnhance,
                  disabled: aiState === "running",
                  "data-tip": T("pl.skillModal.aiEnhanceHint"),
                  children: T("pl.skillModal.aiEnhance")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                import_dsh_client_ui_primitives10.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: handleValidate,
                  children: T("pl.skillModal.validate")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                import_dsh_client_ui_primitives10.Button,
                {
                  type: "button",
                  variant: "primary",
                  size: "sm",
                  className: plBtn("primary", "sm"),
                  onClick: handleSave,
                  disabled: !validation?.ok || saving || checkedCount === 0 || mode === "export" && aiState === "running",
                  children: saving ? T("pl.skillModal.saving") : mode === "export" ? T("pl.skillModal.saveExport") : T("pl.skillModal.save")
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "input",
          {
            ref: fileRef,
            type: "file",
            accept: ".md,text/markdown,text/plain",
            style: { display: "none" },
            onChange: onPickFile
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "input",
          {
            ref: jsonRef,
            type: "file",
            accept: "application/json,.json",
            style: { display: "none" },
            onChange: onPickJson
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          DirectoryPickerModal,
          {
            open: dirPickerOpen,
            initialPath: projectPathInput || projectCwd || "",
            onPick: (dir) => {
              setProjectPathInput(dir);
              setMsg(null);
              setDirPickerOpen(false);
            },
            onClose: () => setDirPickerOpen(false),
            t: T
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          DirectoryPickerModal,
          {
            open: scanDirPickerOpen,
            initialPath: "",
            onPick: (dir) => {
              setScanDirPickerOpen(false);
              runScanDir(dir);
            },
            onClose: () => setScanDirPickerOpen(false),
            t: T
          }
        )
      ]
    }
  );
}

// src/client/components/import-export/ImportEditModal.tsx
var import_react15 = require("react");
var import_dsh_client_ui_primitives11 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime19 = require("react/jsx-runtime");
var MONO11 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE10 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
var inputStyle6 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE10.text,
  background: TONE10.row,
  border: `1px solid ${TONE10.border}`,
  borderRadius: 7,
  fontFamily: MONO11,
  fontSize: 13,
  outline: "none"
};
function validateTemplateVars(body, T) {
  const errs = [];
  const opens = [];
  const re = /\{\{|\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[0] === "{{") {
      opens.push(m.index);
    } else {
      if (opens.length === 0) {
        errs.push(T("pl.skillModal.varUnmatched"));
        continue;
      }
      const start = opens.pop();
      const inner = body.slice(start + 2, m.index).trim();
      if (!inner) errs.push(T("pl.skillModal.varEmpty"));
      else if (/[{}\n]/.test(inner)) errs.push(T("pl.skillModal.varInvalid", { name: inner }));
    }
  }
  if (opens.length > 0) errs.push(T("pl.skillModal.varUnclosed", { n: opens.length }));
  return errs;
}
function fixTemplateVars2(body, defaultVar) {
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    if (body.startsWith("{{", i)) {
      const close = body.indexOf("}}", i + 2);
      if (close === -1) {
        out += `{{${defaultVar}}}`;
        i += 2;
        continue;
      }
      let inner = body.slice(i + 2, close).trim();
      if (!inner) inner = defaultVar;
      else {
        inner = inner.replace(/[{}\n]/g, "").trim();
        if (!inner) inner = defaultVar;
      }
      out += `{{${inner}}}`;
      i = close + 2;
      continue;
    }
    if (body.startsWith("}}", i)) {
      i += 2;
      continue;
    }
    out += body[i];
    i += 1;
  }
  return out;
}
function autoFixEntry2(entry, T) {
  const fixes = [];
  let title = entry.title.trim();
  if (!title) {
    title = T("pl.importEdit.untitledPrompt");
    fixes.push(T("pl.skillModal.fixTitle", { title }));
  }
  let body = entry.body;
  if (body.trim()) {
    const fixed = fixTemplateVars2(body, T("pl.skillModal.varFixDefault"));
    if (fixed !== body) {
      body = fixed;
      fixes.push(T("pl.skillModal.fixBodyVars"));
    }
  }
  return { entry: { ...entry, title, body }, fixes };
}
function ImportEditModal(props) {
  const { open, onClose, t, initialEntries, onImported, onSaved } = props;
  const T = usePLT(t);
  const [entries, setEntries] = (0, import_react15.useState)([]);
  const [validation, setValidation] = (0, import_react15.useState)(null);
  const [fixLog, setFixLog] = (0, import_react15.useState)([]);
  const [saving, setSaving] = (0, import_react15.useState)(false);
  const [msg, setMsg] = (0, import_react15.useState)(null);
  const bodyRefs = (0, import_react15.useRef)({});
  const seqRef = (0, import_react15.useRef)(0);
  const [selectedKey, setSelectedKey] = (0, import_react15.useState)(null);
  const [toastOpen, setToastOpen] = (0, import_react15.useState)(false);
  const toastTimer = (0, import_react15.useRef)(null);
  const [tagOptions, setTagOptions] = (0, import_react15.useState)([]);
  (0, import_react15.useEffect)(() => {
    if (!open) return;
    let alive = true;
    const parsedTags = Array.from(
      new Set((initialEntries ?? []).flatMap((e) => e.tags ?? []))
    );
    listTags().then((tags) => {
      if (alive) {
        setTagOptions(Array.from(/* @__PURE__ */ new Set([...tags.map((x) => x.name), ...parsedTags])));
      }
    }).catch(() => {
      if (alive) setTagOptions(parsedTags);
    });
    return () => {
      alive = false;
    };
  }, [open, initialEntries]);
  (0, import_react15.useEffect)(() => {
    if (!open) return;
    const seed = (initialEntries ?? []).map((e) => ({
      // 序号保证每条 key 唯一，同名标题也可独立编辑
      key: `imp:${++seqRef.current}`,
      title: e.title,
      body: e.body,
      tags: (e.tags ?? [])[0] ?? "",
      ...e.summary?.trim() ? { summary: e.summary.trim() } : {},
      source: e.source ?? "txt",
      checked: true
    }));
    setEntries(seed);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setSelectedKey(null);
    setSaving(false);
  }, [open]);
  const updateEntry = (0, import_react15.useCallback)((key, patch) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, ...patch } : e));
    setValidation(null);
    setFixLog([]);
  }, []);
  const toggleChecked = (0, import_react15.useCallback)((key) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, checked: !e.checked } : e));
  }, []);
  const removeEntry = (0, import_react15.useCallback)((key) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setSelectedKey((cur) => cur === key ? null : cur);
    setValidation(null);
    setFixLog([]);
  }, []);
  const toggleAll = (0, import_react15.useCallback)(() => {
    setEntries((prev) => {
      const all = prev.every((e) => e.checked);
      return prev.map((e) => ({ ...e, checked: !all }));
    });
    setValidation(null);
    setFixLog([]);
  }, []);
  const insertVar = (0, import_react15.useCallback)(
    (key) => {
      const entry = entries.find((e) => e.key === key);
      if (!entry) return;
      const textarea = bodyRefs.current[key] ?? null;
      const scrollTop = textarea?.scrollTop ?? 0;
      insertVariableAt(
        textarea,
        entry.body,
        (next) => {
          updateEntry(key, { body: next });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (textarea) textarea.scrollTop = scrollTop;
            });
          });
        },
        T("pl.insertVariableDefault")
      );
    },
    [entries, updateEntry, T]
  );
  const validateEntries = (0, import_react15.useCallback)(
    (list) => {
      const checked = list.filter((e) => e.checked);
      const issues = [];
      for (const e of checked) {
        const entryTitle = e.title.trim() || T("pl.importEdit.untitledPrompt");
        if (!e.title.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.titleRequired"),
            fixable: true
          });
        }
        if (!e.body.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.bodyRequired"),
            fixable: false
          });
        }
        for (const m of validateTemplateVars(e.body, T)) {
          issues.push({ key: e.key, entryTitle, message: m, fixable: true });
        }
      }
      return { ok: issues.length === 0, issues, fixable: issues.some((i) => i.fixable) };
    },
    [T]
  );
  const handleValidate = (0, import_react15.useCallback)(() => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), kind: "error" });
      return;
    }
    setValidation(validateEntries(entries));
    setFixLog([]);
    setMsg(null);
  }, [entries, T, validateEntries]);
  const handleFix = (0, import_react15.useCallback)(() => {
    if (!validation || validation.ok) return;
    const fixesLog = [];
    const next = entries.map((e) => {
      if (!validation.issues.some((i) => i.key === e.key && i.fixable)) return e;
      const res = autoFixEntry2(e, T);
      for (const f of res.fixes) fixesLog.push(`\u300C${res.entry.title}\u300D${f}`);
      return res.entry;
    });
    setEntries(next);
    setFixLog(fixLog);
    setValidation(validateEntries(next));
  }, [entries, validation, T, validateEntries]);
  const handleSave = (0, import_react15.useCallback)(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), kind: "error" });
      return;
    }
    setSaving(true);
    const payload = checked.map((e) => ({
      title: e.title.trim(),
      body: e.body,
      // 有摘要即视为已 AI 完善：入库时标记 aiRefined，使词库内的 AI 状态与导入页一致
      ...e.summary?.trim() ? { summary: e.summary.trim(), aiRefined: true } : {},
      // 导入的数据若未指定标签，默认打上「import」标签（标识来源为导入）；
      // 入库时 ensureTags 会自动创建该标签（标签库中不存在时）。
      tags: e.tags.trim() ? e.tags.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean) : ["import"]
    }));
    importPrompts(payload).then(
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        onSaved?.(
          T("pl.imported", {
            imported: res.imported,
            updated: res.updated,
            skipped: res.skipped
          })
        );
      },
      (err) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), kind: "error" });
      }
    );
  }, [validation, saving, entries, onImported, onSaved, T]);
  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;
  const selected = entries.find((e) => e.key === selectedKey) ?? null;
  const hasFeedback = msg != null || validation != null || fixLog.length > 0;
  (0, import_react15.useEffect)(() => {
    setToastOpen(hasFeedback);
  }, [hasFeedback, msg, validation, fixLog]);
  (0, import_react15.useEffect)(() => {
    if (!toastOpen) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 3e4);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [toastOpen]);
  if (!open) return null;
  const pauseToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  };
  const resumeToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 3e4);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T("pl.importEdit.title"),
      onClick: (e) => e.stopPropagation(),
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background: TONE10.panel,
        borderRadius: 24,
        padding: "18px 7px 18px 10px",
        boxSizing: "border-box",
        // 覆盖 .pl-dialog * 的 scrollbar-gutter:stable：根节点无滚动条，避免右侧预留滚动条位置出现缺口
        scrollbarGutter: "auto"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(BookIcon, { color: TONE10.accent }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { style: { fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, color: TONE10.text }, children: T("pl.importEdit.title") }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(DialogCloseButton, { onClick: onClose, label: T("pl.close") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "div",
          {
            style: {
              marginTop: 10,
              fontSize: 11.5,
              lineHeight: 1.6,
              color: TONE10.quiet,
              background: TONE10.accentSoft,
              border: `1px solid ${TONE10.border}`,
              borderRadius: 7,
              padding: "7px 10px",
              flexShrink: 0
            },
            children: T("pl.importEdit.subtitle")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              marginTop: 10,
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              position: "relative"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                "div",
                {
                  style: {
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    boxSizing: "border-box",
                    background: TONE10.row,
                    border: `1px solid ${TONE10.border}`,
                    borderRadius: 10,
                    padding: 10
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                      "div",
                      {
                        style: {
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          paddingBottom: 8,
                          borderBottom: `1px solid ${TONE10.border}`,
                          background: TONE10.row,
                          position: "sticky",
                          top: -10,
                          zIndex: 1
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                            "label",
                            {
                              style: {
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 12,
                                color: TONE10.muted,
                                cursor: "pointer",
                                userSelect: "none"
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("input", { type: "checkbox", checked: allChecked, onChange: toggleAll, disabled: entries.length === 0 }),
                                allChecked ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { style: { marginLeft: "auto", fontSize: 11, color: TONE10.quiet }, children: [
                            T("pl.skillModal.selectHint"),
                            " \xB7 ",
                            checkedCount,
                            "/",
                            entries.length
                          ] })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                      "div",
                      {
                        style: {
                          flex: 1,
                          minHeight: 0,
                          overflow: "auto",
                          paddingTop: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 5
                        },
                        children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                          "div",
                          {
                            style: {
                              padding: "22px 0",
                              textAlign: "center",
                              fontSize: 12,
                              color: TONE10.quiet,
                              border: `1px dashed ${TONE10.border}`,
                              borderRadius: 8
                            },
                            children: T("pl.importEdit.noEntry")
                          }
                        ) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                          "div",
                          {
                            onClick: () => setSelectedKey((cur) => cur === entry.key ? null : entry.key),
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                              gap: 8,
                              padding: "8px 10px",
                              background: selectedKey === entry.key ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent)" : TONE10.row,
                              border: `1px solid ${selectedKey === entry.key ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)" : TONE10.border}`,
                              borderRadius: 8,
                              cursor: "pointer",
                              opacity: entry.checked ? 1 : 0.55,
                              transition: "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1), opacity .18s"
                            },
                            onMouseEnter: (e) => {
                              if (selectedKey !== entry.key) {
                                e.currentTarget.style.borderColor = TONE10.borderStrong;
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                              }
                            },
                            onMouseLeave: (e) => {
                              if (selectedKey !== entry.key) {
                                e.currentTarget.style.borderColor = TONE10.border;
                                e.currentTarget.style.backgroundColor = TONE10.row;
                              }
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "input",
                                {
                                  type: "checkbox",
                                  checked: entry.checked,
                                  onChange: (e) => {
                                    e.stopPropagation();
                                    toggleChecked(entry.key);
                                  },
                                  "data-tip": T("pl.skillModal.selectHint"),
                                  style: { flexShrink: 0, accentColor: TONE10.accent, margin: 0 }
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "span",
                                {
                                  style: {
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 12.5,
                                    color: TONE10.text,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis"
                                  },
                                  children: entry.title.trim() || T("pl.importEdit.untitledPrompt")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "span",
                                {
                                  style: {
                                    flexShrink: 0,
                                    fontSize: 10,
                                    lineHeight: 1,
                                    borderRadius: 4,
                                    padding: "2px 5px",
                                    color: entry.summary?.trim() ? TONE10.success : TONE10.quiet,
                                    background: entry.summary?.trim() ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 14%, transparent)" : "transparent",
                                    border: `1px solid ${entry.summary?.trim() ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 45%, transparent)" : TONE10.border}`
                                  },
                                  children: entry.summary?.trim() ? T("pl.aiStateDone") : T("pl.aiStatePending")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "span",
                                {
                                  style: {
                                    flexShrink: 0,
                                    fontSize: 10,
                                    lineHeight: 1,
                                    color: TONE10.accent,
                                    border: "1px solid var(--dsw-alias-brand-primary, #8ec5ff)",
                                    borderRadius: 4,
                                    padding: "2px 5px"
                                  },
                                  children: entry.source === "json" ? "JSON" : entry.source === "csv" ? "CSV" : entry.source === "md" ? "Markdown" : T("pl.importEdit.fromTxt")
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    removeEntry(entry.key);
                                  },
                                  "data-tip": T("pl.skillModal.remove"),
                                  style: {
                                    flexShrink: 0,
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    color: TONE10.quiet,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    lineHeight: 1,
                                    fontFamily: MONO11,
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    transition: "color .18s, background-color .18s"
                                  },
                                  onMouseEnter: (e) => {
                                    e.currentTarget.style.color = TONE10.red;
                                    e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                                  },
                                  onMouseLeave: (e) => {
                                    e.currentTarget.style.color = TONE10.quiet;
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  },
                                  children: "\xD7"
                                }
                              ),
                              entry.body.trim() && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "div",
                                {
                                  style: {
                                    width: "100%",
                                    flexShrink: 0,
                                    marginTop: 2,
                                    fontSize: 11,
                                    lineHeight: 1.5,
                                    color: TONE10.quiet,
                                    minWidth: 0,
                                    wordBreak: "break-word",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                  },
                                  children: entry.body
                                }
                              )
                            ]
                          },
                          entry.key
                        ))
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                "div",
                {
                  style: {
                    flex: "1.1 1 0",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    boxSizing: "border-box",
                    background: TONE10.row,
                    border: `1px solid ${TONE10.border}`,
                    borderRadius: 10,
                    padding: 10
                  },
                  children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: TONE10.quiet
                      },
                      children: T("pl.previewEmpty")
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 7, minHeight: 0, flex: 1, overflow: "hidden" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 12, color: TONE10.muted }, children: T("pl.skillModal.titleLabel") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                      "input",
                      {
                        type: "text",
                        value: selected.title,
                        onChange: (e) => updateEntry(selected.key, { title: e.target.value }),
                        placeholder: T("pl.skillModal.titleLabel"),
                        disabled: !selected.checked,
                        style: { ...inputStyle6 }
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 12, color: TONE10.muted, marginTop: 3 }, children: T("pl.skillModal.tagLabel") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                      "select",
                      {
                        value: selected.tags,
                        onChange: (e) => updateEntry(selected.key, { tags: e.target.value }),
                        disabled: !selected.checked,
                        style: { ...inputStyle6, cursor: "pointer" },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("option", { value: "", children: T("pl.importEdit.tagsLabel") }),
                          tagOptions.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("option", { value: tag, children: tag }, tag))
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 12, color: TONE10.muted, marginTop: 3 }, children: T("pl.skillModal.summaryLabel") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                      "div",
                      {
                        style: {
                          ...inputStyle6,
                          minHeight: 34,
                          maxHeight: 60,
                          overflow: "auto",
                          color: selected.summary?.trim() ? TONE10.muted : TONE10.quiet,
                          background: "transparent",
                          cursor: "default",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6
                        },
                        children: selected.summary?.trim() || T("pl.lexicon.noSummary")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 12, color: TONE10.muted, marginTop: 3 }, children: T("pl.skillModal.bodyLabel") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minHeight: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        "textarea",
                        {
                          ref: (el) => {
                            bodyRefs.current[selected.key] = el;
                            autoGrowTextarea(el);
                          },
                          value: selected.body,
                          onChange: (e) => {
                            updateEntry(selected.key, { body: e.target.value });
                            autoGrowTextarea(e.target);
                          },
                          placeholder: T("pl.skillModal.bodyLabel"),
                          disabled: !selected.checked,
                          spellCheck: false,
                          style: {
                            ...inputStyle6,
                            flex: "0 0 auto",
                            // 正文自适应高度：随内容自动增高，超高后内部滚动（下限保留合理高度）
                            minHeight: 120,
                            maxHeight: 288,
                            height: "auto",
                            overflowY: "auto",
                            resize: "none",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            alignSelf: "stretch"
                          }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        import_dsh_client_ui_primitives11.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: () => insertVar(selected.key),
                          disabled: !selected.checked,
                          "data-tip": T("pl.insertVariableTitle"),
                          style: { flexShrink: 0 },
                          children: T("pl.skillModal.insertVar")
                        }
                      )
                    ] })
                  ] })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "div",
          {
            style: {
              flexShrink: 0,
              height: 18,
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              lineHeight: 1.5,
              color: msg ? msg.kind === "error" ? TONE10.red : msg.kind === "info" ? TONE10.accent : TONE10.success : "transparent",
              overflow: "hidden",
              whiteSpace: "nowrap"
            },
            children: [
              msg && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                "span",
                {
                  style: {
                    flexShrink: 0,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: msg.kind === "error" ? TONE10.red : msg.kind === "info" ? TONE10.accent : TONE10.success
                  }
                }
              ),
              msg?.text ?? ""
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
              flexShrink: 0,
              position: "relative"
            },
            children: [
              toastOpen && hasFeedback && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                "div",
                {
                  role: validation ? "alert" : void 0,
                  onMouseEnter: pauseToast,
                  onMouseLeave: resumeToast,
                  style: {
                    position: "absolute",
                    bottom: 2,
                    left: 0,
                    maxWidth: 360,
                    maxHeight: 230,
                    overflow: "auto",
                    zIndex: 20,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "9px 11px",
                    borderRadius: 12,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: TONE10.text,
                    background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 78%, transparent)",
                    WebkitBackdropFilter: "blur(12px)",
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${TONE10.borderStrong}`,
                    boxShadow: "0 8px 24px rgba(0, 0, 0, .22)"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontWeight: 560, fontSize: 12, flex: 1, minWidth: 0 }, children: T("pl.skillModal.notice") }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => setToastOpen(false),
                          "data-tip": T("pl.close"),
                          style: {
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            color: TONE10.quiet,
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            fontFamily: MONO11,
                            padding: "0 2px"
                          },
                          children: "\xD7"
                        }
                      )
                    ] }),
                    msg && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { color: msg.kind === "error" ? TONE10.red : msg.kind === "info" ? TONE10.accent : TONE10.text }, children: msg.text }),
                    validation && (validation.ok ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { color: TONE10.success }, children: T("pl.importEdit.validatePass") }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { color: TONE10.red }, children: T("pl.skillModal.issueCount", { count: validation.issues.length }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        "ul",
                        {
                          style: {
                            margin: 0,
                            paddingLeft: 18,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            color: TONE10.red
                          },
                          children: validation.issues.map((issue, idx) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("li", { children: [
                            "\u300C",
                            issue.entryTitle,
                            "\u300D",
                            issue.message
                          ] }, idx))
                        }
                      ),
                      validation.fixable && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                          import_dsh_client_ui_primitives11.Button,
                          {
                            type: "button",
                            variant: "primary",
                            size: "sm",
                            className: plBtn("primary", "sm"),
                            onClick: handleFix,
                            "data-tip": T("pl.skillModal.fixAll"),
                            children: T("pl.skillModal.fixAll")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: TONE10.muted }, children: T("pl.skillModal.fixHint", {
                          fixable: validation.issues.filter((i) => i.fixable).length
                        }) })
                      ] })
                    ] })),
                    fixLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { color: TONE10.success }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { children: T("pl.skillModal.fixDone", { count: fixLog.length }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        "ul",
                        {
                          style: {
                            margin: "2px 0 0",
                            paddingLeft: 18,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3
                          },
                          children: fixLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("li", { children: f }, idx))
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                import_dsh_client_ui_primitives11.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: handleValidate,
                  children: T("pl.skillModal.validate")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                import_dsh_client_ui_primitives11.Button,
                {
                  type: "button",
                  variant: "primary",
                  size: "sm",
                  className: plBtn("primary", "sm"),
                  onClick: handleSave,
                  disabled: !validation?.ok || saving || checkedCount === 0,
                  children: saving ? T("pl.importEdit.importing") : T("pl.importEdit.import")
                }
              )
            ]
          }
        )
      ]
    }
  );
}

// src/md-text.ts
function mdToPlainText(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split("\n");
  const out = [];
  let inCode = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) continue;
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue;
    const stripped = line.replace(/^#{1,6}\s+/, "").replace(/^\s*>\s?/, "").replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, "");
    out.push(stripInlineMd(stripped));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function stripInlineMd(line) {
  let s = line;
  if (s.trimStart().startsWith("|") || s.trimEnd().endsWith("|")) {
    s = s.trim().replace(/^\|/, "").replace(/\|\s*$/, "").replace(/\|/g, " ");
  }
  return s.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt) => alt).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1").replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ").trim();
}

// src/client/utils/data-formats.ts
function baseName(fileName) {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  return base.replace(/\.[^.]+$/, "");
}
function parseJson(text) {
  const raw = JSON.parse(text);
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : void 0;
  const list = Array.isArray(raw) ? raw : obj ? obj.prompts ?? obj.skills ?? obj.entries ?? obj.data : void 0;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item;
    if (typeof it.body !== "string" || !it.body.trim()) continue;
    out.push({
      title: typeof it.title === "string" ? it.title.trim() : "",
      body: it.body,
      source: "json",
      ...typeof it.summary === "string" && it.summary.trim() ? { summary: it.summary.trim() } : {},
      ...Array.isArray(it.tags) ? {
        tags: it.tags.filter(
          (t) => typeof t === "string" && t.trim() !== ""
        )
      } : {}
    });
  }
  return out;
}
function parseCsvRows(text) {
  if (text.charCodeAt(0) === 65279) text = text.slice(1);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  let ti = header.findIndex((h) => h === "title" || h === "\u6807\u9898");
  let bi = header.findIndex(
    (h) => h === "body" || h === "\u6B63\u6587" || h === "\u5185\u5BB9" || h === "content" || h === "prompt"
  );
  const gi = header.findIndex((h) => h === "tags" || h === "\u6807\u7B7E" || h === "tag");
  const si = header.findIndex((h) => h === "summary" || h === "\u6458\u8981");
  if (ti === -1 && bi === -1 && header.length >= 2) {
    ti = 0;
    bi = 1;
  }
  if (bi === -1) return [];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const body = (cells[bi] ?? "").trim();
    if (!body) continue;
    const title = ti >= 0 && ti < cells.length ? cells[ti].trim() : "";
    const tagsRaw = gi >= 0 && gi < cells.length ? cells[gi] : "";
    const tags = tagsRaw.split(/[|,，;；]/).map((s) => s.trim()).filter(Boolean);
    const summary = si >= 0 && si < cells.length ? cells[si].trim() : "";
    out.push({
      title,
      body,
      tags: tags.length ? tags : void 0,
      ...summary ? { summary } : {},
      source: "csv"
    });
  }
  return out;
}
function extractTagLine(body) {
  const m = body.match(/^标签\s*[:：]\s*(.+)$/m);
  if (m) {
    return {
      tags: m[1].split(/[、,，;；|]/).map((s) => s.trim()).filter(Boolean),
      body: body.replace(m[0], "").trim()
    };
  }
  return { tags: [], body };
}
function extractSummaryLine(body) {
  const m = body.match(/^摘要\s*[:：]\s*(.+)$/m);
  if (m) {
    return {
      summary: m[1].trim(),
      body: body.replace(m[0], "").trim()
    };
  }
  return { summary: "", body };
}
function parseMarkdown(fileName, text) {
  text = text.trim();
  if (!text) return [];
  let title = baseName(fileName);
  let tags;
  let content = text;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(3, end);
      content = text.slice(end + 4).trim();
      const titleMatch = fm.match(/^title\s*:\s*(.+)$/m);
      const tagsMatch = fm.match(/^tags\s*:\s*\[?([^\]]+)\]?$/m);
      if (titleMatch) title = titleMatch[1].trim();
      if (tagsMatch) {
        tags = tagsMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
    }
  }
  if (!content) return [];
  const blocks = content.split(/^---+$/m).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const heading = block.match(/^#{1,6}\s+(.+)/);
    let blockBody = heading ? block.slice(heading[0].length).trim() : block;
    const tagLine = extractTagLine(blockBody);
    blockBody = tagLine.body;
    const summaryLine = extractSummaryLine(blockBody);
    blockBody = summaryLine.body;
    const merged = [...tags ?? [], ...tagLine.tags];
    out.push({
      title: (heading ? heading[1].trim() : "") || title,
      body: blockBody,
      tags: merged.length ? [...new Set(merged)] : void 0,
      ...summaryLine.summary ? { summary: summaryLine.summary } : {},
      source: "md"
    });
  }
  return out;
}
function parseTxt(fileName, text) {
  text = text.trim();
  if (!text) return [];
  const blocks = text.split(/^[-—=·]{10,}\s*$/m).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const m = block.match(/^【([^】]+)】/);
    let blockBody = m ? block.slice(m[0].length).trim() : block;
    const tagLine = extractTagLine(blockBody);
    blockBody = tagLine.body;
    const summaryLine = extractSummaryLine(blockBody);
    blockBody = summaryLine.body;
    out.push({
      title: (m ? m[1].trim() : "") || baseName(fileName),
      body: blockBody,
      tags: tagLine.tags.length ? [...new Set(tagLine.tags)] : void 0,
      ...summaryLine.summary ? { summary: summaryLine.summary } : {},
      source: "txt"
    });
  }
  return out;
}
function hasHtmlTags(s) {
  return /<\/?[a-z][a-z0-9-]*[^>]*>/i.test(s);
}
function hasMarkdown(s) {
  return /^\s*(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/m.test(s) || /^\s*```/m.test(s) || /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s) || /\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|`[^`]+`/.test(s);
}
function decodeHtmlEntities(s) {
  return s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}
function normalizeBody(body) {
  const trimmed = body.trim();
  if (!trimmed || !hasHtmlTags(trimmed) && !hasMarkdown(trimmed)) return body;
  return decodeHtmlEntities(mdToPlainText(trimmed));
}
function parseImportFile(fileName, text) {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  let entries;
  if (ext === "json") entries = parseJson(text);
  else if (ext === "csv") entries = parseCsv(text);
  else if (ext === "md" || ext === "markdown") entries = parseMarkdown(fileName, text);
  else entries = parseTxt(fileName, text);
  for (const e of entries) e.body = normalizeBody(e.body);
  return entries;
}

// src/client/components/import-export/ImportExportModal.tsx
var import_jsx_runtime20 = require("react/jsx-runtime");
var MONO12 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var EXPORT_DIR_KEY = "dsh-prompt-library:last-export-dir";
function PromptCheckRow(props) {
  const { t, title, body, tags, usageCount, checked, active, onToggle, onPreview } = props;
  const TONE12 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
    "div",
    {
      className: active ? "pl-lex-row pl-lex-row--active" : "pl-lex-row",
      onClick: onPreview,
      title,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked,
                  onChange: onToggle,
                  onClick: (e) => e.stopPropagation(),
                  "aria-label": t("pl.exportSelectAll"),
                  style: {
                    flexShrink: 0,
                    width: 13,
                    height: 13,
                    margin: 0,
                    cursor: "pointer",
                    accentColor: TONE12.accent
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "span",
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                    fontWeight: 560,
                    lineHeight: 1.4,
                    color: TONE12.text
                  },
                  children: title
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "span",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 11,
                    color: TONE12.quiet
                  },
                  children: t("pl.previewUsage", { count: usageCount })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          "div",
          {
            style: {
              fontSize: 11.5,
              lineHeight: 1.5,
              color: TONE12.muted,
              minWidth: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word"
            },
            children: body.replace(/\s+/g, " ").trim() || "\xA0"
          }
        ),
        tags && tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: tags.slice(0, 2).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          "span",
          {
            style: {
              fontSize: 10.5,
              lineHeight: 1.4,
              color: TONE12.accent,
              background: TONE12.accentSoft,
              borderRadius: 4,
              padding: "1px 6px"
            },
            children: tag
          },
          tag
        )) })
      ]
    }
  );
}
function ImportExportModal(props) {
  const { open, onClose, t, container } = props;
  const T = usePLT(t);
  useThemeSync();
  const TONE12 = getTone();
  const [maximized, setMaximized] = (0, import_react16.useState)(false);
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleString() : "-";
  const importRef = (0, import_react16.useRef)(null);
  const [promptList, setPromptList] = (0, import_react16.useState)([]);
  const [promptLoading, setPromptLoading] = (0, import_react16.useState)(false);
  const [exportSelected, setExportSelected] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [skillImportOpen, setSkillImportOpen] = (0, import_react16.useState)(false);
  const [importEditOpen, setImportEditOpen] = (0, import_react16.useState)(false);
  const [importEntries, setImportEntries] = (0, import_react16.useState)([]);
  const [exportFormat, setExportFormat] = (0, import_react16.useState)("json");
  const [skillExportOpen, setSkillExportOpen] = (0, import_react16.useState)(false);
  const [skillExportInitial, setSkillExportInitial] = (0, import_react16.useState)([]);
  const [exportView, setExportView] = (0, import_react16.useState)("list");
  const [exportCollapsed, setExportCollapsed] = (0, import_react16.useState)(
    /* @__PURE__ */ new Set()
  );
  const [exportQuery, setExportQuery] = (0, import_react16.useState)("");
  const [viewing, setViewing] = (0, import_react16.useState)(null);
  const [activeId, setActiveId] = (0, import_react16.useState)(null);
  const [deleteTarget, setDeleteTarget] = (0, import_react16.useState)(null);
  const [msg, setMsg] = (0, import_react16.useState)(null);
  const msgTimerRef = (0, import_react16.useRef)(null);
  const [exportDoneMsg, setExportDoneMsg] = (0, import_react16.useState)(null);
  const [resultToast, setResultToast] = (0, import_react16.useState)(null);
  const resultToastTimerRef = (0, import_react16.useRef)(null);
  const showMsg = (0, import_react16.useCallback)(
    (text, kind = "success") => {
      setMsg({ text, kind });
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    },
    []
  );
  const showResultToast = (0, import_react16.useCallback)((text) => {
    setResultToast(text);
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    resultToastTimerRef.current = setTimeout(() => setResultToast(null), 4e3);
  }, []);
  const pauseResultToast = (0, import_react16.useCallback)(() => {
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
  }, []);
  const resumeResultToast = (0, import_react16.useCallback)(() => {
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    resultToastTimerRef.current = setTimeout(() => setResultToast(null), 4e3);
  }, []);
  (0, import_react16.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    },
    []
  );
  (0, import_react16.useEffect)(() => {
    if (!open) return;
    setMsg(null);
    setExportSelected(/* @__PURE__ */ new Set());
    setExportQuery("");
    setPromptLoading(true);
    listPrompts().then(
      (list) => {
        setPromptList(list);
        setPromptLoading(false);
      },
      (e) => {
        showMsg(e instanceof Error ? e.message : String(e), "error");
        setPromptLoading(false);
      }
    );
  }, [open, showMsg]);
  (0, import_react16.useEffect)(() => {
    if (!activeId) return;
    if (!promptList.some((p) => p.id === activeId)) {
      setActiveId(null);
      setViewing(null);
    }
  }, [activeId, promptList]);
  const toggleExport = (0, import_react16.useCallback)((id) => {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const filteredPrompts = (0, import_react16.useMemo)(() => {
    const q = exportQuery.trim().toLowerCase();
    if (!q) return promptList;
    return promptList.filter(
      (p) => (p.title || "").toLowerCase().includes(q) || (p.body || "").toLowerCase().includes(q)
    );
  }, [promptList, exportQuery]);
  const toggleExportAll = (0, import_react16.useCallback)(() => {
    setExportSelected(
      (prev) => prev.size === filteredPrompts.length ? /* @__PURE__ */ new Set() : new Set(filteredPrompts.map((p) => p.id))
    );
  }, [filteredPrompts]);
  const groupedPrompts = (0, import_react16.useMemo)(() => {
    const groups = /* @__PURE__ */ new Map();
    for (const p of filteredPrompts) {
      const key = p.tags?.[0]?.trim() || T("pl.sidebar.uncategorized");
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    );
  }, [filteredPrompts, T]);
  const [exportDirPickerOpen, setExportDirPickerOpen] = (0, import_react16.useState)(false);
  const [lastExportDir, setLastExportDir] = (0, import_react16.useState)(() => {
    try {
      return localStorage.getItem(EXPORT_DIR_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const requestExport = (0, import_react16.useCallback)(() => {
    if (exportSelected.size === 0) {
      showMsg(T("pl.exportNeedSelect"), "error");
      return;
    }
    setExportDirPickerOpen(true);
  }, [exportSelected, showMsg, T]);
  const exportSelectedPrompts = (0, import_react16.useCallback)(
    (dir) => {
      const ids = Array.from(exportSelected);
      if (ids.length === 0) {
        showMsg(T("pl.exportNeedSelect"), "error");
        return;
      }
      setLastExportDir(dir);
      try {
        localStorage.setItem(EXPORT_DIR_KEY, dir);
      } catch {
      }
      saveExportFile(ids, exportFormat, dir).then(
        (r) => {
          setExportDoneMsg(
            T("pl.exportedPath", { count: r.count, path: r.filePath })
          );
        },
        (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
      );
    },
    [exportSelected, exportFormat, showMsg, T]
  );
  const openSkillExport = (0, import_react16.useCallback)(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.skillExportNeedSelect"), "error");
      return;
    }
    const selected = promptList.filter((p) => ids.includes(p.id));
    setSkillExportInitial(
      selected.map((p) => ({
        promptId: p.id,
        title: p.title,
        body: p.body,
        summary: p.summary ?? ""
      }))
    );
    setSkillExportOpen(true);
  }, [exportSelected, promptList, showMsg, T]);
  const onImportFile = (0, import_react16.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) {
          showMsg(T("pl.importEdit.parseEmpty"), "error");
          return;
        }
        try {
          const parsed = parseImportFile(file.name, text);
          if (parsed.length === 0) {
            showMsg(T("pl.importEdit.parseEmpty"), "error");
            return;
          }
          setImportEntries(parsed);
          setImportEditOpen(true);
        } catch (err) {
          showMsg(
            T("pl.importEdit.parseFail", {
              err: err instanceof Error ? err.message : String(err)
            }),
            "error"
          );
        }
      };
      reader.readAsText(file);
    },
    [showMsg, T]
  );
  const openView = (0, import_react16.useCallback)((p) => {
    setActiveId(p.id);
    setViewing(p);
  }, []);
  const handleRowPreview = (0, import_react16.useCallback)(
    (p) => {
      if (activeId === p.id) {
        setActiveId(null);
        setViewing(null);
      } else {
        openView(p);
      }
    },
    [activeId, openView]
  );
  const confirmDelete = (0, import_react16.useCallback)(() => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    deletePrompt(id).then(
      () => {
        setDeleteTarget(null);
        setActiveId(null);
        setViewing(null);
        setExportSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showMsg(T("pl.deleted"), "success");
        notifyDataChanged();
        listPrompts().then((list) => setPromptList(list));
      },
      (e) => {
        setDeleteTarget(null);
        showMsg(e instanceof Error ? e.message : String(e), "error");
      }
    );
  }, [deleteTarget, showMsg, T]);
  if (!open) return null;
  return (0, import_react_dom4.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.moduleImportExport"),
        className: container ? void 0 : maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY,
        children: [
          !container && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("style", { children: `
.pl-data-action{background:var(--dsw-alias-bg-layer-3, #1d2735)}
.pl-data-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-data-action:active{background:var(--dsw-alias-interactive-bg-active)}
.pl-lex-row{display:flex;flex-direction:column;gap:4;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(196,211,232,.16));background:var(--dsw-alias-bg-layer-3,#1d2735);cursor:pointer;user-select:none;transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-lex-row:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3,rgba(196,211,232,.31))}
.pl-lex-row--active{background:rgba(142,197,255,.10);border-color:rgba(142,197,255,.5)}
` }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
            "div",
            {
              className: maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG,
              style: {
                position: "relative",
                ...container ? {} : { width: 800, height: 800 },
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "calc(100vh - 40px)"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(BookIcon, { color: TONE12.accent }),
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                        "strong",
                        {
                          style: {
                            flex: 1,
                            fontSize: 15,
                            fontWeight: 600,
                            color: TONE12.text,
                            minWidth: 0
                          },
                          children: T("pl.moduleImportExport")
                        }
                      ),
                      !container && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                          WindowToggleButton,
                          {
                            maximized,
                            onToggle: () => setMaximized((v) => !v),
                            maximizeLabel: T("pl.windowMaximize"),
                            restoreLabel: T("pl.windowRestore")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DialogCloseButton, { onClick: onClose, label: T("pl.close") })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  "div",
                  {
                    style: {
                      marginTop: 10,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: TONE12.quiet,
                      background: TONE12.accentSoft,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 7,
                      padding: "7px 10px",
                      flexShrink: 0
                    },
                    children: T("pl.moduleImportExportDesc")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                  "div",
                  {
                    style: {
                      flexShrink: 0,
                      height: 18,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
                      overflow: "hidden",
                      whiteSpace: "nowrap"
                    },
                    children: [
                      msg && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
                          }
                        }
                      ),
                      msg?.text ?? ""
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      gap: 2,
                      paddingTop: 14,
                      paddingBottom: 4,
                      marginTop: -8
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                        "div",
                        {
                          style: {
                            flex: "1 1 0",
                            minWidth: 0,
                            minHeight: 0,
                            height: "100%",
                            boxSizing: "border-box",
                            background: TONE12.row,
                            border: `1px solid ${TONE12.border}`,
                            borderRadius: 10,
                            overflowY: "auto"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                              "div",
                              {
                                style: {
                                  position: "sticky",
                                  top: 0,
                                  zIndex: 3,
                                  padding: "10px 10px 9px",
                                  background: TONE12.row,
                                  borderBottom: `1px solid ${TONE12.border}`
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "span",
                                      {
                                        style: {
                                          width: 3,
                                          height: 13,
                                          borderRadius: 2,
                                          background: TONE12.accent,
                                          flexShrink: 0
                                        }
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "strong",
                                      {
                                        style: {
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: TONE12.text,
                                          flexShrink: 0
                                        },
                                        children: T("pl.importSection")
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "span",
                                      {
                                        style: {
                                          marginLeft: "auto",
                                          fontSize: 11,
                                          color: TONE12.quiet,
                                          lineHeight: 1.5,
                                          textAlign: "right"
                                        },
                                        children: T("pl.importSectionDesc")
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        marginTop: 6,
                                        justifyContent: "flex-end"
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          import_dsh_client_ui_primitives12.Button,
                                          {
                                            type: "button",
                                            variant: "primary",
                                            size: "sm",
                                            className: plBtn("primary", "sm"),
                                            onClick: () => importRef.current?.click(),
                                            "data-tip": T("pl.importTitle"),
                                            children: T("pl.importData")
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          import_dsh_client_ui_primitives12.Button,
                                          {
                                            type: "button",
                                            variant: "ghost",
                                            size: "sm",
                                            className: plBtn("ghost", "sm"),
                                            onClick: () => setSkillImportOpen(true),
                                            "data-tip": T("pl.skillImportBtnTitle"),
                                            children: T("pl.skillImport")
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                    "div",
                                    {
                                      style: {
                                        height: 1,
                                        background: TONE12.border,
                                        margin: "12px 0 10px"
                                      }
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "span",
                                      {
                                        style: {
                                          width: 3,
                                          height: 13,
                                          borderRadius: 2,
                                          background: TONE12.accent,
                                          flexShrink: 0
                                        }
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "strong",
                                      {
                                        style: { fontSize: 12, fontWeight: 600, color: TONE12.text },
                                        children: T("pl.exportSection")
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "div",
                                      {
                                        style: {
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                          marginLeft: "auto",
                                          flexShrink: 0,
                                          background: TONE12.panel,
                                          border: `1px solid ${TONE12.border}`,
                                          borderRadius: 7,
                                          padding: 2
                                        },
                                        children: ["list", "group"].map((view) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          "button",
                                          {
                                            type: "button",
                                            onClick: () => setExportView(view),
                                            style: {
                                              border: "none",
                                              outline: "none",
                                              cursor: "pointer",
                                              fontFamily: MONO12,
                                              fontSize: 11.5,
                                              lineHeight: 1.4,
                                              padding: "2px 8px",
                                              borderRadius: 5,
                                              color: exportView === view ? TONE12.accent : TONE12.quiet,
                                              background: exportView === view ? TONE12.accentSoft : "transparent",
                                              transition: "color .18s, background-color .18s"
                                            },
                                            children: view === "list" ? T("pl.viewList") : T("pl.viewGroup")
                                          },
                                          view
                                        ))
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        flexWrap: "wrap",
                                        marginTop: 7
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                          "label",
                                          {
                                            style: {
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: 5,
                                              fontSize: 12,
                                              color: TONE12.muted
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { children: T("pl.exportFormat") }),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                                "select",
                                                {
                                                  value: exportFormat,
                                                  onChange: (e) => setExportFormat(e.target.value),
                                                  style: {
                                                    padding: "3px 16px",
                                                    fontSize: 12,
                                                    fontFamily: MONO12,
                                                    color: TONE12.text,
                                                    background: TONE12.row,
                                                    border: `1px solid ${TONE12.border}`,
                                                    borderRadius: 7,
                                                    outline: "none",
                                                    cursor: "pointer"
                                                  },
                                                  children: [
                                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "json", children: "JSON" }),
                                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "csv", children: "CSV" }),
                                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "md", children: "Markdown" }),
                                                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "txt", children: T("pl.format.txt") })
                                                  ]
                                                }
                                              )
                                            ]
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              display: "flex",
                                              gap: 8,
                                              alignItems: "center",
                                              marginLeft: "auto",
                                              flexShrink: 0
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                import_dsh_client_ui_primitives12.Button,
                                                {
                                                  type: "button",
                                                  variant: "primary",
                                                  size: "sm",
                                                  className: plBtn("primary", "sm"),
                                                  onClick: requestExport,
                                                  "data-tip": T("pl.exportPickDirTitle"),
                                                  children: T("pl.exportSelected")
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                import_dsh_client_ui_primitives12.Button,
                                                {
                                                  type: "button",
                                                  variant: "ghost",
                                                  size: "sm",
                                                  className: plBtn("ghost", "sm"),
                                                  onClick: openSkillExport,
                                                  "data-tip": T("pl.skillExportBtnTitle"),
                                                  children: T("pl.skillExport")
                                                }
                                              )
                                            ]
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        position: "relative",
                                        flexShrink: 0,
                                        marginTop: 9
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                          "svg",
                                          {
                                            width: "13",
                                            height: "13",
                                            viewBox: "0 0 24 24",
                                            fill: "none",
                                            stroke: "currentColor",
                                            strokeWidth: "2",
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            style: {
                                              position: "absolute",
                                              left: 9,
                                              top: "50%",
                                              transform: "translateY(-50%)",
                                              color: TONE12.quiet,
                                              pointerEvents: "none"
                                            },
                                            "aria-hidden": "true",
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "m20 20-3.2-3.2" })
                                            ]
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          "input",
                                          {
                                            value: exportQuery,
                                            onChange: (e) => setExportQuery(e.target.value),
                                            placeholder: T("pl.search"),
                                            spellCheck: false,
                                            style: {
                                              width: "100%",
                                              boxSizing: "border-box",
                                              padding: "5px 26px 5px 28px",
                                              color: TONE12.text,
                                              background: TONE12.panel,
                                              border: `1px solid ${TONE12.border}`,
                                              borderRadius: 7,
                                              outline: "none",
                                              fontFamily: MONO12,
                                              fontSize: 12
                                            }
                                          }
                                        ),
                                        exportQuery && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          "button",
                                          {
                                            type: "button",
                                            title: T("pl.clearSearch"),
                                            onClick: () => setExportQuery(""),
                                            style: {
                                              position: "absolute",
                                              right: 6,
                                              top: "50%",
                                              transform: "translateY(-50%)",
                                              border: "none",
                                              outline: "none",
                                              background: "transparent",
                                              color: TONE12.quiet,
                                              cursor: "pointer",
                                              fontSize: 14,
                                              lineHeight: 1,
                                              padding: 0
                                            },
                                            children: "\xD7"
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        flexShrink: 0,
                                        marginTop: 9
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                          "label",
                                          {
                                            style: {
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: 5,
                                              fontSize: 12,
                                              color: TONE12.muted,
                                              cursor: "pointer",
                                              userSelect: "none",
                                              flexShrink: 0
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                "input",
                                                {
                                                  type: "checkbox",
                                                  checked: filteredPrompts.length > 0 && exportSelected.size === filteredPrompts.length,
                                                  onChange: toggleExportAll,
                                                  disabled: filteredPrompts.length === 0
                                                }
                                              ),
                                              filteredPrompts.length > 0 && exportSelected.size === filteredPrompts.length ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")
                                            ]
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          "span",
                                          {
                                            style: {
                                              fontSize: 11,
                                              color: TONE12.quiet,
                                              flexShrink: 0
                                            },
                                            children: T("pl.export.selectedCount", {
                                              selected: exportSelected.size,
                                              total: filteredPrompts.length
                                            })
                                          }
                                        )
                                      ]
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                  padding: 10
                                },
                                children: promptLoading ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  "div",
                                  {
                                    style: {
                                      padding: "14px 0",
                                      fontSize: 12,
                                      color: TONE12.muted,
                                      textAlign: "center"
                                    },
                                    children: T("pl.loading")
                                  }
                                ) : filteredPrompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  "div",
                                  {
                                    style: {
                                      padding: "14px 0",
                                      fontSize: 12,
                                      color: TONE12.muted,
                                      textAlign: "center"
                                    },
                                    children: exportQuery.trim() ? T("pl.searchEmpty") : T("pl.empty")
                                  }
                                ) : exportView === "group" ? groupedPrompts.map(([group, prompts]) => {
                                  const groupChecked = prompts.length > 0 && prompts.every((p) => exportSelected.has(p.id));
                                  const collapsed = exportCollapsed.has(group);
                                  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 5
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                          "div",
                                          {
                                            role: "button",
                                            tabIndex: 0,
                                            onClick: () => setExportCollapsed((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(group)) next.delete(group);
                                              else next.add(group);
                                              return next;
                                            }),
                                            onKeyDown: (e) => {
                                              if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setExportCollapsed((prev) => {
                                                  const next = new Set(prev);
                                                  if (next.has(group)) next.delete(group);
                                                  else next.add(group);
                                                  return next;
                                                });
                                              }
                                            },
                                            title: collapsed ? T("pl.lexicon.expandGroup") : T("pl.lexicon.collapseGroup"),
                                            style: {
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 5,
                                              padding: "2px 4px",
                                              borderRadius: 6,
                                              cursor: "pointer",
                                              userSelect: "none",
                                              transition: "background-color .18s"
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                "input",
                                                {
                                                  type: "checkbox",
                                                  checked: groupChecked,
                                                  onChange: () => {
                                                    setExportSelected((prev) => {
                                                      const next = new Set(prev);
                                                      for (const p of prompts) {
                                                        if (next.has(p.id)) next.delete(p.id);
                                                        else next.add(p.id);
                                                      }
                                                      return next;
                                                    });
                                                  },
                                                  onClick: (e) => e.stopPropagation(),
                                                  "aria-label": T("pl.exportSelectAll"),
                                                  style: {
                                                    flexShrink: 0,
                                                    width: 13,
                                                    height: 13,
                                                    margin: 0,
                                                    cursor: "pointer",
                                                    accentColor: TONE12.accent
                                                  }
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                "svg",
                                                {
                                                  width: "12",
                                                  height: "12",
                                                  viewBox: "0 0 16 16",
                                                  style: {
                                                    color: TONE12.muted,
                                                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                                    transition: "transform .24s cubic-bezier(.22,1,.36,1)",
                                                    flexShrink: 0
                                                  },
                                                  "aria-hidden": "true",
                                                  children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                    "path",
                                                    {
                                                      d: "M4 6l4 4 4-4",
                                                      fill: "none",
                                                      stroke: "currentColor",
                                                      strokeWidth: "1.6",
                                                      strokeLinecap: "round",
                                                      strokeLinejoin: "round"
                                                    }
                                                  )
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                "span",
                                                {
                                                  style: {
                                                    minWidth: 0,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    fontSize: 12,
                                                    fontFamily: MONO12,
                                                    fontWeight: 560,
                                                    color: TONE12.text
                                                  },
                                                  children: group
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                                "span",
                                                {
                                                  style: {
                                                    flexShrink: 0,
                                                    fontSize: 11,
                                                    color: TONE12.quiet
                                                  },
                                                  children: T("pl.sidebar.groupCount", {
                                                    count: prompts.length
                                                  })
                                                }
                                              )
                                            ]
                                          }
                                        ),
                                        !collapsed && prompts.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                          PromptCheckRow,
                                          {
                                            t: T,
                                            title: prompt.title || T("pl.sidebar.uncategorized"),
                                            body: prompt.body,
                                            tags: prompt.tags,
                                            usageCount: prompt.usageCount,
                                            checked: exportSelected.has(prompt.id),
                                            active: activeId === prompt.id,
                                            onToggle: () => toggleExport(prompt.id),
                                            onPreview: () => handleRowPreview(prompt)
                                          },
                                          prompt.id
                                        ))
                                      ]
                                    },
                                    group
                                  );
                                }) : filteredPrompts.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  PromptCheckRow,
                                  {
                                    t: T,
                                    title: prompt.title || T("pl.sidebar.uncategorized"),
                                    body: prompt.body,
                                    tags: prompt.tags,
                                    usageCount: prompt.usageCount,
                                    checked: exportSelected.has(prompt.id),
                                    active: activeId === prompt.id,
                                    onToggle: () => toggleExport(prompt.id),
                                    onPreview: () => handleRowPreview(prompt)
                                  },
                                  prompt.id
                                ))
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                        "div",
                        {
                          style: {
                            flex: "1 1 0",
                            minWidth: 0,
                            minHeight: 0,
                            height: "100%",
                            boxSizing: "border-box",
                            background: TONE12.row,
                            border: `1px solid ${TONE12.border}`,
                            borderRadius: 10,
                            overflow: "hidden"
                          },
                          children: viewing ? /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                            "div",
                            {
                              style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                padding: 12,
                                height: "100%",
                                boxSizing: "border-box"
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      flexShrink: 0
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                        "span",
                                        {
                                          style: {
                                            width: 3,
                                            height: 15,
                                            borderRadius: 2,
                                            background: TONE12.accent,
                                            flexShrink: 0
                                          }
                                        }
                                      ),
                                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                        "span",
                                        {
                                          style: {
                                            flex: 1,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: TONE12.text,
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                          },
                                          children: viewing.title
                                        }
                                      ),
                                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                        import_dsh_client_ui_primitives12.Button,
                                        {
                                          type: "button",
                                          variant: "ghost",
                                          size: "sm",
                                          className: plBtn("ghost", "sm"),
                                          onClick: () => setDeleteTarget(viewing),
                                          style: { color: TONE12.red },
                                          "data-tip": T("pl.delete"),
                                          children: T("pl.delete")
                                        }
                                      )
                                    ]
                                  }
                                ),
                                viewing.tags && viewing.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 5,
                                      flexShrink: 0
                                    },
                                    children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "span",
                                      {
                                        style: {
                                          fontSize: 11,
                                          lineHeight: 1.5,
                                          color: TONE12.accent,
                                          background: TONE12.accentSoft,
                                          borderRadius: 5,
                                          padding: "1px 8px"
                                        },
                                        children: tag
                                      },
                                      tag
                                    ))
                                  }
                                ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 5,
                                      flexShrink: 0
                                    },
                                    children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                      "span",
                                      {
                                        style: {
                                          fontSize: 11,
                                          lineHeight: 1.5,
                                          color: TONE12.quiet,
                                          background: TONE12.panel,
                                          borderRadius: 5,
                                          padding: "1px 8px"
                                        },
                                        children: T("pl.tagsEmpty")
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 8,
                                      flexShrink: 0
                                    },
                                    children: [
                                      {
                                        label: T("pl.lexicon.usage"),
                                        value: `${viewing.usageCount} ${T("pl.lexicon.usageUnit")}`
                                      },
                                      {
                                        label: T("pl.lexicon.createdAt"),
                                        value: fmtTime(viewing.createdAt)
                                      },
                                      {
                                        label: T("pl.lexicon.updatedAt"),
                                        value: fmtTime(viewing.updatedAt)
                                      },
                                      {
                                        label: T("pl.lexicon.lastUsed"),
                                        value: viewing.lastUsedAt ? fmtTime(viewing.lastUsedAt) : T("pl.lexicon.neverUsed")
                                      }
                                    ].map((item) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                      "div",
                                      {
                                        style: {
                                          flex: "1 1 calc(50% - 4px)",
                                          minWidth: 0,
                                          boxSizing: "border-box",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 2,
                                          padding: "7px 10px",
                                          borderRadius: 7,
                                          background: TONE12.panel,
                                          border: `1px solid ${TONE12.border}`
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                            "span",
                                            {
                                              style: {
                                                fontSize: 10.5,
                                                fontWeight: 600,
                                                lineHeight: 1.4,
                                                color: TONE12.quiet
                                              },
                                              children: item.label
                                            }
                                          ),
                                          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                            "span",
                                            {
                                              style: {
                                                fontSize: 12,
                                                lineHeight: 1.4,
                                                color: TONE12.text,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                              },
                                              children: item.value
                                            }
                                          )
                                        ]
                                      },
                                      item.label
                                    ))
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { flexShrink: 0 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                    "div",
                                    {
                                      style: {
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: TONE12.text,
                                        marginBottom: 4
                                      },
                                      children: T("pl.lexicon.summary")
                                    }
                                  ),
                                  viewing.summary ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                    "div",
                                    {
                                      style: {
                                        fontSize: 12,
                                        lineHeight: 1.6,
                                        color: TONE12.muted,
                                        background: TONE12.panel,
                                        border: `1px solid ${TONE12.border}`,
                                        borderRadius: 7,
                                        padding: "7px 10px",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        // 摘要最多三行高度，内容超出时可滚动查看
                                        maxHeight: 57.6,
                                        overflowY: "auto"
                                      },
                                      children: viewing.summary
                                    }
                                  ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { fontSize: 11.5, color: TONE12.quiet }, children: T("pl.lexicon.noSummary") })
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 6,
                                      flex: 1,
                                      minHeight: 0
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                        "div",
                                        {
                                          style: {
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: TONE12.text,
                                            flexShrink: 0
                                          },
                                          children: T("pl.bodyField")
                                        }
                                      ),
                                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                                        "div",
                                        {
                                          style: {
                                            flex: 1,
                                            minHeight: 0,
                                            overflow: "auto",
                                            fontSize: 12.5,
                                            lineHeight: 1.7,
                                            color: TONE12.text,
                                            background: TONE12.panel,
                                            border: `1px solid ${TONE12.border}`,
                                            borderRadius: 7,
                                            padding: "8px 10px",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            fontFamily: MONO12
                                          },
                                          children: viewing.body || " "
                                        }
                                      )
                                    ]
                                  }
                                )
                              ]
                            }
                          ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                            "div",
                            {
                              style: {
                                height: "100%",
                                boxSizing: "border-box",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                padding: 24,
                                fontSize: 12.5,
                                color: TONE12.quiet,
                                textAlign: "center"
                              },
                              children: T("pl.previewEmpty")
                            }
                          )
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  "input",
                  {
                    ref: importRef,
                    type: "file",
                    accept: ".json,.csv,.md,.markdown,.txt,text/plain,text/markdown,text/csv,application/json",
                    style: { display: "none" },
                    onChange: onImportFile
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  SkillImportModal,
                  {
                    open: skillImportOpen,
                    onClose: () => setSkillImportOpen(false),
                    t,
                    onImported: () => {
                      notifyDataChanged();
                      listPrompts().then((list) => setPromptList(list));
                    },
                    onSaved: (summary) => {
                      setSkillImportOpen(false);
                      showResultToast(summary);
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  ImportEditModal,
                  {
                    open: importEditOpen,
                    onClose: () => setImportEditOpen(false),
                    t,
                    initialEntries: importEntries,
                    onImported: () => {
                      notifyDataChanged();
                      listPrompts().then((list) => setPromptList(list));
                    },
                    onSaved: (summary) => {
                      setImportEditOpen(false);
                      showResultToast(summary);
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  SkillImportModal,
                  {
                    open: skillExportOpen,
                    onClose: () => setSkillExportOpen(false),
                    t,
                    mode: "export",
                    initialEntries: skillExportInitial,
                    onSaved: (summary) => {
                      setSkillExportOpen(false);
                      showResultToast(summary);
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  ConfirmDialog,
                  {
                    open: !!deleteTarget,
                    danger: true,
                    message: deleteTarget ? T("pl.confirmDelete", { title: deleteTarget.title }) : "",
                    confirmLabel: T("pl.delete"),
                    cancelLabel: T("pl.cancel"),
                    onCancel: () => setDeleteTarget(null),
                    onConfirm: confirmDelete
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  DirectoryPickerModal,
                  {
                    open: exportDirPickerOpen,
                    initialPath: lastExportDir || "",
                    onPick: (dir) => {
                      setExportDirPickerOpen(false);
                      exportSelectedPrompts(dir);
                    },
                    onClose: () => setExportDirPickerOpen(false),
                    t: T
                  }
                ),
                exportDoneMsg && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      inset: 0,
                      zIndex: 100,
                      borderRadius: 12,
                      background: "rgba(0, 0, 0, 0.32)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                      "div",
                      {
                        className: PL_DIALOG,
                        style: {
                          width: 320,
                          maxWidth: "100%",
                          gap: 14,
                          position: "static"
                        },
                        onClick: (e) => e.stopPropagation(),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                            "div",
                            {
                              style: {
                                fontSize: 13,
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                              },
                              children: exportDoneMsg
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                            import_dsh_client_ui_primitives12.Button,
                            {
                              type: "button",
                              variant: "primary",
                              size: "sm",
                              className: plBtn("primary", "sm"),
                              onClick: () => setExportDoneMsg(null),
                              children: T("pl.confirm")
                            }
                          ) })
                        ]
                      }
                    )
                  }
                ),
                resultToast && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
                  "div",
                  {
                    role: "status",
                    onMouseEnter: pauseResultToast,
                    onMouseLeave: resumeResultToast,
                    style: {
                      position: "absolute",
                      bottom: 14,
                      left: 16,
                      zIndex: 300,
                      maxWidth: 360,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: TONE12.text,
                      background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 82%, transparent)",
                      WebkitBackdropFilter: "blur(12px)",
                      backdropFilter: "blur(12px)",
                      border: `1px solid ${TONE12.borderStrong}`,
                      boxShadow: "0 8px 24px rgba(0, 0, 0, .22)"
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { style: { flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: TONE12.mint } }),
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { style: { flex: 1, minWidth: 0 }, children: resultToast }),
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => setResultToast(null),
                          "data-tip": T("pl.close"),
                          style: {
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            color: TONE12.quiet,
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            fontFamily: MONO12,
                            padding: "0 2px"
                          },
                          children: "\xD7"
                        }
                      )
                    ]
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    container || document.body
  );
}

// src/client/components/data/LexiconManagerModal.tsx
var import_react_dom5 = require("react-dom");
var import_react19 = require("react");
var import_dsh_client_ui_primitives15 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/data/TagManagePanel.tsx
var import_react17 = require("react");
var import_dsh_client_ui_primitives13 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime21 = require("react/jsx-runtime");
var MONO13 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TAG_MAX_UNITS2 = 16;
function clampTag2(s) {
  let n = 0;
  let out = "";
  for (const ch of s) {
    const w = /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1;
    if (n + w > TAG_MAX_UNITS2) break;
    n += w;
    out += ch;
  }
  return out;
}
function TagManagePanel(props) {
  const { t } = props;
  const T = usePLT(t);
  useThemeSync();
  const TONE12 = getTone();
  const inputStyle8 = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    color: TONE12.text,
    background: TONE12.row,
    border: `1px solid ${TONE12.border}`,
    borderRadius: 10,
    fontFamily: MONO13,
    fontSize: 13,
    outline: "none"
  };
  const [tagList, setTagList] = (0, import_react17.useState)([]);
  const [renamingTag, setRenamingTag] = (0, import_react17.useState)(null);
  const [newTag, setNewTag] = (0, import_react17.useState)("");
  const [msg, setMsg] = (0, import_react17.useState)(null);
  const msgTimerRef = (0, import_react17.useRef)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react17.useState)(null);
  const showMsg = (0, import_react17.useCallback)((text, kind = "success") => {
    setMsg({ text, kind });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react17.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  const refreshTags = (0, import_react17.useCallback)(() => {
    listTags().then(
      (list) => setTagList(list),
      (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
    );
  }, [showMsg]);
  (0, import_react17.useEffect)(() => {
    refreshTags();
  }, [refreshTags]);
  const addTag = (0, import_react17.useCallback)(() => {
    const name = newTag.trim();
    if (!name) {
      showMsg(T("pl.createTagEmpty"), "error");
      return;
    }
    createTag(name).then(
      (res) => {
        showMsg(T("pl.createTagDone", { name: res.name }));
        setNewTag("");
        setTagList((prev) => [
          { name: res.name, count: 0 },
          ...prev.filter((x) => x.name !== res.name)
        ]);
        notifyDataChanged();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
    );
  }, [newTag, showMsg, T]);
  const confirmRenameTag = (0, import_react17.useCallback)(() => {
    if (!renamingTag) return;
    const from = renamingTag.from;
    const to = renamingTag.value.trim();
    if (!to) {
      showMsg(T("pl.renameTagEmpty"), "error");
      return;
    }
    if (to === from) {
      showMsg(T("pl.renameTagNoChange"), "info");
      return;
    }
    renameTag(from, to).then(
      () => {
        showMsg(T("pl.renameTagDone", { name: to }));
        setRenamingTag(null);
        setTagList((prev) => prev.map((x) => x.name === from ? { name: to, count: x.count } : x));
        notifyDataChanged();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
    );
  }, [renamingTag, showMsg, T]);
  const removeTag = (0, import_react17.useCallback)(
    (name) => {
      const used = tagList.find((x) => x.name === name)?.count ?? 0;
      if (used > 0) {
        showMsg(T("pl.deleteTagInUse", { name, count: used }), "error");
        return;
      }
      setPendingConfirm({
        message: T("pl.deleteTagConfirm", { name }),
        danger: true,
        action: () => {
          deleteTag(name).then(
            () => {
              showMsg(T("pl.deleteTagDone", { name }));
              setTagList((prev) => prev.filter((x) => x.name !== name));
              notifyDataChanged();
            },
            (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
          );
        }
      });
    },
    [showMsg, T, tagList]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("style", { children: PL_DIALOG_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("style", { children: `
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
      "div",
      {
        style: {
          flexShrink: 0,
          height: 18,
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          lineHeight: 1.5,
          color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
          overflow: "hidden",
          whiteSpace: "nowrap"
        },
        children: [
          msg && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "span",
            {
              style: {
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
              }
            }
          ),
          msg?.text ?? ""
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
      "div",
      {
        style: {
          flex: 1,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "div",
            {
              style: {
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 12px 10px 12px",
                background: TONE12.row,
                borderBottom: `1px solid ${TONE12.border}`,
                borderRadius: 12,
                flexShrink: 0
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                  "input",
                  {
                    value: newTag,
                    onChange: (e) => setNewTag(clampTag2(e.target.value)),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") addTag();
                    },
                    placeholder: T("pl.createTagPlaceholder"),
                    style: { ...inputStyle8, flex: 1 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: addTag, children: T("pl.createTag") })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: "3px", overflowY: "auto", minHeight: 0, flex: 1 }, children: tagList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { style: { padding: "10px 0", fontSize: 12, color: TONE12.muted }, children: T("pl.tagsNone") }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: tagList.map((tag) => {
            const editing = renamingTag?.from === tag.name;
            return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
              "div",
              {
                className: "pl-data-card",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: TONE12.row,
                  border: `1px solid ${TONE12.border}`,
                  borderRadius: 9
                },
                children: editing ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    "input",
                    {
                      autoFocus: true,
                      value: renamingTag.value,
                      onChange: (e) => setRenamingTag({ from: tag.name, value: clampTag2(e.target.value) }),
                      onKeyDown: (e) => {
                        if (e.key === "Enter") confirmRenameTag();
                        if (e.key === "Escape") setRenamingTag(null);
                      },
                      placeholder: T("pl.renameTagPlaceholder"),
                      style: { ...inputStyle8, flex: 1 }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setRenamingTag(null), children: T("pl.cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: confirmRenameTag, children: T("pl.save") })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    "span",
                    {
                      style: {
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: TONE12.accent,
                        flexShrink: 0
                      },
                      "aria-hidden": "true"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    "span",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: 520,
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      },
                      children: tag.name
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    "span",
                    {
                      style: {
                        flexShrink: 0,
                        fontSize: 11,
                        color: TONE12.muted,
                        lineHeight: 1.4,
                        background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 999,
                        padding: "1px 8px"
                      },
                      children: tag.count
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    import_dsh_client_ui_primitives13.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setRenamingTag({ from: tag.name, value: tag.name }),
                      children: T("pl.renameTag")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                    import_dsh_client_ui_primitives13.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      disabled: tag.count > 0,
                      "data-tip": tag.count > 0 ? T("pl.deleteTagInUseTitle", { name: tag.name, count: tag.count }) : T("pl.deleteTag"),
                      onClick: () => removeTag(tag.name),
                      style: tag.count > 0 ? { opacity: 0.45, cursor: "not-allowed" } : void 0,
                      children: T("pl.deleteTag")
                    }
                  )
                ] })
              },
              tag.name
            );
          }) }) })
        ]
      }
    ),
    pendingConfirm && /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: PL_DIALOG_OVERLAY, children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("style", { children: PL_DIALOG_CSS }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          className: "pl-dialog",
          style: { width: 360, maxWidth: "100%", gap: 14 },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: pendingConfirm.message }),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                import_dsh_client_ui_primitives13.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: () => setPendingConfirm(null),
                  children: T("pl.cancel")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                import_dsh_client_ui_primitives13.Button,
                {
                  type: "button",
                  variant: "primary",
                  size: "sm",
                  className: plBtn("primary", "sm"),
                  style: pendingConfirm.danger ? { color: TONE12.red } : void 0,
                  onClick: () => {
                    const action = pendingConfirm.action;
                    setPendingConfirm(null);
                    action();
                  },
                  children: T("pl.confirm")
                }
              )
            ] })
          ]
        }
      )
    ] })
  ] });
}

// src/client/components/data/RecycleManagePanel.tsx
var import_react18 = require("react");
var import_dsh_client_ui_primitives14 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime22 = require("react/jsx-runtime");
var MONO14 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function formatTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function daysLeft(deletedAt) {
  const remain = deletedAt + 30 * 24 * 60 * 60 * 1e3 - Date.now();
  return remain <= 0 ? 0 : Math.ceil(remain / (24 * 60 * 60 * 1e3));
}
function RecycleManagePanel(props) {
  const { t } = props;
  const T = usePLT(t);
  useThemeSync();
  const TONE12 = getTone();
  const inputStyle8 = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    color: TONE12.text,
    background: TONE12.row,
    border: `1px solid ${TONE12.border}`,
    borderRadius: 10,
    fontFamily: MONO14,
    fontSize: 13,
    outline: "none"
  };
  const [trashList, setTrashList] = (0, import_react18.useState)([]);
  const [trashSelected, setTrashSelected] = (0, import_react18.useState)(/* @__PURE__ */ new Set());
  const [trashLoading, setTrashLoading] = (0, import_react18.useState)(false);
  const [trashQuery, setTrashQuery] = (0, import_react18.useState)("");
  const [msg, setMsg] = (0, import_react18.useState)(null);
  const msgTimerRef = (0, import_react18.useRef)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react18.useState)(null);
  const showMsg = (0, import_react18.useCallback)((text, kind = "success") => {
    setMsg({ text, kind });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react18.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  const refreshTrash = (0, import_react18.useCallback)(() => {
    setTrashLoading(true);
    listTrash().then(
      (list) => {
        setTrashList(list);
        setTrashSelected(/* @__PURE__ */ new Set());
        setTrashLoading(false);
      },
      (e) => {
        showMsg(e instanceof Error ? e.message : String(e), "error");
        setTrashLoading(false);
      }
    );
  }, [showMsg]);
  (0, import_react18.useEffect)(() => {
    setTrashQuery("");
    refreshTrash();
  }, [refreshTrash]);
  useDataChanged(() => {
    refreshTrash();
  });
  const filteredTrash = (0, import_react18.useMemo)(() => {
    const q = trashQuery.trim().toLowerCase();
    if (!q) return trashList;
    return trashList.filter(
      (x) => (x.title || "").toLowerCase().includes(q) || (x.body || "").toLowerCase().includes(q)
    );
  }, [trashList, trashQuery]);
  const toggleTrash = (0, import_react18.useCallback)((id) => {
    setTrashSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleTrashAll = (0, import_react18.useCallback)(() => {
    setTrashSelected(
      (prev) => prev.size === filteredTrash.length ? /* @__PURE__ */ new Set() : new Set(filteredTrash.map((x) => x.id))
    );
  }, [filteredTrash]);
  const restoreSelected = (0, import_react18.useCallback)(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    setPendingConfirm({
      message: T("pl.trashRestoreSelectedConfirm", { count: ids.length }),
      danger: false,
      action: () => {
        restoreTrash(ids).then(
          (res) => {
            showMsg(T("pl.trashRestoreDone", { count: res.restored }));
            notifyDataChanged();
            refreshTrash();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
        );
      }
    });
  }, [trashSelected, showMsg, T, refreshTrash]);
  const deleteSelected = (0, import_react18.useCallback)(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    setPendingConfirm({
      message: T("pl.trashDeleteConfirm", { count: ids.length }),
      danger: true,
      action: () => {
        deleteTrash(ids).then(
          (res) => {
            showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
            refreshTrash();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
        );
      }
    });
  }, [trashSelected, showMsg, T, refreshTrash]);
  const restoreOne = (0, import_react18.useCallback)(
    (item) => {
      setPendingConfirm({
        message: T("pl.trashRestoreOneConfirm", { title: item.title }),
        danger: false,
        action: () => {
          restoreTrash([item.id]).then(
            (res) => {
              showMsg(T("pl.trashRestoreDone", { count: res.restored }));
              notifyDataChanged();
              refreshTrash();
            },
            (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
          );
        }
      });
    },
    [showMsg, T, refreshTrash]
  );
  const deleteOne = (0, import_react18.useCallback)(
    (item) => {
      setPendingConfirm({
        message: T("pl.trashDeleteOneConfirm", { title: item.title }),
        danger: true,
        action: () => {
          deleteTrash([item.id]).then(
            (res) => {
              showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
              refreshTrash();
            },
            (e) => showMsg(e instanceof Error ? e.message : String(e), "error")
          );
        }
      });
    },
    [showMsg, T, refreshTrash]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(import_jsx_runtime22.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: PL_DIALOG_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: `
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
      "div",
      {
        style: {
          flexShrink: 0,
          height: 18,
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          lineHeight: 1.5,
          color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
          overflow: "hidden",
          whiteSpace: "nowrap"
        },
        children: [
          msg && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            "span",
            {
              style: {
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
              }
            }
          ),
          msg?.text ?? ""
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
      "div",
      {
        style: {
          flex: 1,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
            "div",
            {
              style: {
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 12px 10px 12px",
                background: TONE12.row,
                borderBottom: `1px solid ${TONE12.border}`,
                borderRadius: 12,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { position: "relative", flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                    "svg",
                    {
                      width: "13",
                      height: "13",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: TONE12.quiet, pointerEvents: "none" },
                      "aria-hidden": "true",
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "m20 20-3.2-3.2" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      value: trashQuery,
                      onChange: (e) => setTrashQuery(e.target.value),
                      placeholder: T("pl.search"),
                      style: { ...inputStyle8, paddingLeft: 26, paddingRight: 26 }
                    }
                  ),
                  trashQuery && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "button",
                    {
                      type: "button",
                      "aria-label": T("pl.clearSearch"),
                      tabIndex: -1,
                      onClick: () => setTrashQuery(""),
                      style: {
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 18,
                        height: 18,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        borderRadius: "50%",
                        background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.14))",
                        color: TONE12.muted,
                        cursor: "pointer",
                        padding: 0
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "svg",
                        {
                          width: "10",
                          height: "10",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "2.4",
                          strokeLinecap: "round",
                          "aria-hidden": "true",
                          children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M6 6l12 12M18 6L6 18" })
                        }
                      )
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0, marginTop: 8 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                    "label",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        color: TONE12.muted,
                        cursor: "pointer",
                        userSelect: "none"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked: filteredTrash.length > 0 && trashSelected.size === filteredTrash.length,
                            onChange: toggleTrashAll,
                            disabled: filteredTrash.length === 0
                          }
                        ),
                        filteredTrash.length > 0 && trashSelected.size === filteredTrash.length ? T("pl.trashDeselectAll") : T("pl.trashSelectAll")
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    import_dsh_client_ui_primitives14.Button,
                    {
                      type: "button",
                      variant: "primary",
                      size: "sm",
                      className: plBtn("primary", "sm"),
                      onClick: restoreSelected,
                      disabled: trashSelected.size === 0,
                      children: T("pl.trashRestoreSelected")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    import_dsh_client_ui_primitives14.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: deleteSelected,
                      disabled: trashSelected.size === 0,
                      style: { color: TONE12.red },
                      children: T("pl.trashDeleteSelected")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: { fontSize: 11, color: TONE12.quiet }, children: `${trashSelected.size}/${trashList.length}` })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: "3px", overflowY: "auto", minHeight: 0, flex: 1 }, children: trashLoading ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE12.muted }, children: T("pl.loading") }) : filteredTrash.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE12.muted }, children: trashQuery.trim() ? T("pl.searchEmpty") : T("pl.trashEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: filteredTrash.map((item) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
            "div",
            {
              className: "pl-data-card",
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                background: TONE12.row,
                border: `1px solid ${TONE12.border}`,
                borderRadius: 9
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: trashSelected.has(item.id),
                    onChange: () => toggleTrash(item.id),
                    style: { marginTop: 3 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                      "strong",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 560,
                          minWidth: 0
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                            "svg",
                            {
                              width: "13",
                              height: "13",
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: "2",
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                              style: { flexShrink: 0, color: TONE12.muted },
                              "aria-hidden": "true",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M14 2v6h6" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                            "span",
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              },
                              "data-tip": item.title,
                              children: item.title || T("pl.sidebar.uncategorized")
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: { fontSize: 10, color: TONE12.quiet, flexShrink: 0, whiteSpace: "nowrap" }, children: T("pl.trashDeletedAt", { time: formatTime(item.deletedAt) }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      style: {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        fontSize: 11,
                        color: TONE12.quiet,
                        lineHeight: 1.5,
                        overflow: "hidden",
                        wordBreak: "break-word"
                      },
                      children: item.body.replace(/\s+/g, " ").trim() || " "
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "span",
                      {
                        style: {
                          flexShrink: 0,
                          fontSize: 10,
                          color: daysLeft(item.deletedAt) <= 1 ? TONE12.red : TONE12.muted,
                          lineHeight: 1.4,
                          background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                          border: `1px solid ${TONE12.border}`,
                          borderRadius: 999,
                          padding: "2px 8px"
                        },
                        "data-tip": T("pl.trashCleanupNote"),
                        children: T("pl.trashDaysLeft", { n: daysLeft(item.deletedAt) })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: { flex: 1 } }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives14.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => restoreOne(item), children: T("pl.trashRestoreOne") }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives14.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => deleteOne(item), style: { color: TONE12.red }, children: T("pl.trashDeleteOne") })
                  ] })
                ] })
              ]
            },
            item.id
          )) }) })
        ]
      }
    ),
    pendingConfirm && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: PL_DIALOG_OVERLAY, children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: PL_DIALOG_CSS }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          className: "pl-dialog",
          style: { width: 360, maxWidth: "100%", gap: 14 },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: pendingConfirm.message }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                import_dsh_client_ui_primitives14.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: () => setPendingConfirm(null),
                  children: T("pl.cancel")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                import_dsh_client_ui_primitives14.Button,
                {
                  type: "button",
                  variant: "primary",
                  size: "sm",
                  className: plBtn("primary", "sm"),
                  style: pendingConfirm.danger ? { color: TONE12.red } : void 0,
                  onClick: () => {
                    const action = pendingConfirm.action;
                    setPendingConfirm(null);
                    action();
                  },
                  children: T("pl.confirm")
                }
              )
            ] })
          ]
        }
      )
    ] })
  ] });
}

// src/client/components/data/LexiconManagerModal.tsx
var import_jsx_runtime23 = require("react/jsx-runtime");
var MONO15 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var inputStyle7 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO15,
  fontSize: 13,
  outline: "none"
};
function LexiconManagerModal(props) {
  const { open, onClose, t, container } = props;
  const T = usePLT(t);
  useThemeSync();
  const TONE12 = getTone();
  const [maximized, setMaximized] = (0, import_react19.useState)(false);
  const [list, setList] = (0, import_react19.useState)([]);
  const [loaded, setLoaded] = (0, import_react19.useState)(false);
  const [selectedId, setSelectedId] = (0, import_react19.useState)(null);
  const [tagList, setTagList] = (0, import_react19.useState)([]);
  const [viewMode, setViewMode] = (0, import_react19.useState)("list");
  const [search, setSearch] = (0, import_react19.useState)("");
  const [collapsed, setCollapsed] = (0, import_react19.useState)(/* @__PURE__ */ new Set());
  const [editing, setEditing] = (0, import_react19.useState)(null);
  const [draft, setDraft] = (0, import_react19.useState)({ title: "", body: "", tag: "" });
  const [busy, setBusy] = (0, import_react19.useState)(false);
  const [msg, setMsg] = (0, import_react19.useState)(null);
  (0, import_react19.useEffect)(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(timer);
  }, [msg]);
  const [deleteTarget, setDeleteTarget] = (0, import_react19.useState)(null);
  const [selectedIds, setSelectedIds] = (0, import_react19.useState)(/* @__PURE__ */ new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = (0, import_react19.useState)(false);
  const [dataSub, setDataSub] = (0, import_react19.useState)(null);
  const bodyRef = (0, import_react19.useRef)(null);
  const selectAllRef = (0, import_react19.useRef)(null);
  const [viewPolish, setViewPolish] = (0, import_react19.useState)({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = (0, import_react19.useState)("");
  const [viewPolishSummary, setViewPolishSummary] = (0, import_react19.useState)("");
  const [viewShowOriginal, setViewShowOriginal] = (0, import_react19.useState)(false);
  const [viewPolishError, setViewPolishError] = (0, import_react19.useState)(null);
  const polishTargetRef = (0, import_react19.useRef)("");
  const load = (0, import_react19.useCallback)(() => {
    return Promise.all([listPrompts(), listTags()]).then(
      ([prompts, tags]) => {
        setList(prompts);
        setTagList(tags.map((x) => x.name));
        setLoaded(true);
      },
      (e) => {
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    );
  }, []);
  (0, import_react19.useEffect)(() => {
    if (open) void load();
  }, [open, load]);
  useDataChanged(load);
  const selected = (0, import_react19.useMemo)(
    () => list.find((p) => p.id === selectedId) ?? null,
    [list, selectedId]
  );
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleString() : "-";
  const selectItem = (id) => {
    setSelectedId((prev) => prev === id ? null : id);
    setEditing(null);
    setDataSub(null);
  };
  const filtered = (0, import_react19.useMemo)(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (p) => p.title.toLowerCase().includes(kw) || p.body.toLowerCase().includes(kw) || (p.tags ?? []).some((t2) => t2.toLowerCase().includes(kw))
    );
  }, [list, search]);
  const grouped = (0, import_react19.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const p of filtered) {
      const key = (p.tags ?? [])[0] ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map.entries()];
  }, [filtered]);
  const toggleGroup = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(
      (prev) => filtered.length > 0 && prev.size === filtered.length ? /* @__PURE__ */ new Set() : new Set(filtered.map((p) => p.id))
    );
  };
  (0, import_react19.useEffect)(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length;
    }
  }, [selectedIds, filtered]);
  const confirmBatchDelete = () => {
    if (busy || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).filter((id) => list.some((p) => p.id === id));
    if (ids.length === 0) {
      setSelectedIds(/* @__PURE__ */ new Set());
      setBatchDeleteOpen(false);
      return;
    }
    setBusy(true);
    Promise.all(ids.map((id) => deletePrompt(id))).then(
      () => {
        setBusy(false);
        setBatchDeleteOpen(false);
        setSelectedIds(/* @__PURE__ */ new Set());
        if (selectedId && ids.includes(selectedId)) {
          setSelectedId(null);
          setEditing(null);
        }
        setMsg({ kind: "ok", text: T("pl.lexicon.batchDeleteDone", { count: ids.length }) });
        notifyDataChanged();
        void load();
      },
      (e) => {
        setBusy(false);
        setBatchDeleteOpen(false);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        notifyDataChanged();
        void load();
      }
    );
  };
  const startCreate = () => {
    setEditing({ id: null });
    setDraft({ title: "", body: "", tag: "" });
    setDataSub(null);
  };
  const startEdit = (p) => {
    setEditing({ id: p.id });
    setDraft({ title: p.title, body: p.body, tag: (p.tags ?? [])[0] ?? "" });
  };
  const cancelEdit = () => {
    const wasNew = editing?.id == null;
    setEditing(null);
    if (wasNew) setSelectedId(null);
  };
  const insertVar = () => {
    const textarea = bodyRef.current;
    const scrollTop = textarea?.scrollTop ?? 0;
    insertVariableAt(
      textarea,
      draft.body,
      (v) => {
        setDraft((d) => ({ ...d, body: v }));
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textarea) textarea.scrollTop = scrollTop;
          });
        });
      },
      T("pl.insertVariableDefault")
    );
  };
  const save = () => {
    if (busy) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) {
      setMsg({ kind: "error", text: T("pl.requireTitleBody") });
      return;
    }
    setBusy(true);
    const tag = draft.tag ? [draft.tag] : void 0;
    const finish = () => {
      setBusy(false);
      setEditing(null);
      notifyDataChanged();
      void load();
    };
    if (editing?.id) {
      updatePrompt(editing.id, { title, body, tags: tag }).then(
        () => {
          setMsg({ kind: "ok", text: T("pl.lexicon.saved") });
          finish();
        },
        (e) => {
          setBusy(false);
          setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        }
      );
    } else {
      createPrompt({ title, body, tags: tag }).then(
        (created) => {
          setMsg({ kind: "ok", text: T("pl.lexicon.newDone") });
          setSelectedId(created.id);
          finish();
        },
        (e) => {
          setBusy(false);
          setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        }
      );
    }
  };
  const confirmDelete = () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    const id = deleteTarget.id;
    deletePrompt(id).then(
      () => {
        setBusy(false);
        setDeleteTarget(null);
        if (selectedId === id) {
          setSelectedId(null);
          setEditing(null);
        }
        setMsg({ kind: "ok", text: T("pl.lexicon.deleteDone") });
        notifyDataChanged();
        void load();
      },
      (e) => {
        setBusy(false);
        setDeleteTarget(null);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    );
  };
  const resetPolish = (0, import_react19.useCallback)(() => {
    polishTargetRef.current = "";
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewPolishSummary("");
    setViewShowOriginal(false);
    setViewPolishError(null);
  }, []);
  (0, import_react19.useEffect)(() => {
    resetPolish();
  }, [selectedId, open, resetPolish]);
  const startPolish = (0, import_react19.useCallback)(async () => {
    if (!selected || viewPolish.status === "loading") return;
    const id = selected.id;
    polishTargetRef.current = id;
    setViewPolish({ status: "loading", id });
    setViewShowOriginal(false);
    setViewPolishError(null);
    try {
      const res = await polishPrompt(selected.body, { withSummary: true });
      if (polishTargetRef.current !== id) return;
      setViewPolishText(res.polished);
      setViewPolishSummary(res.summary ?? "");
      setViewPolish({ status: "done", id });
    } catch (e) {
      if (polishTargetRef.current !== id) return;
      setViewPolish({ status: "idle", id: "" });
      setViewPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [selected, viewPolish.status]);
  const copyPolish = (0, import_react19.useCallback)(() => {
    if (!viewPolishText) return;
    navigator.clipboard.writeText(viewPolishText).catch(() => {
    });
    setMsg({ kind: "ok", text: T("pl.copied") });
  }, [viewPolishText, T]);
  const cancelPolish = (0, import_react19.useCallback)(() => {
    resetPolish();
  }, [resetPolish]);
  const savePolish = (0, import_react19.useCallback)(() => {
    if (viewPolish.status !== "done" || !selected || busy) return;
    const body = viewPolishText.trim();
    if (!body) return;
    setBusy(true);
    updatePrompt(selected.id, {
      body,
      summary: viewPolishSummary.trim() || void 0,
      sourceBody: selected.body !== body ? selected.body : void 0,
      aiRefined: true
    }).then(
      (updated) => {
        setBusy(false);
        setList((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        resetPolish();
        setMsg({ kind: "ok", text: T("pl.lexicon.saved") });
        notifyDataChanged();
        void load();
      },
      (e) => {
        setBusy(false);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    );
  }, [viewPolish.status, viewPolishText, viewPolishSummary, selected, busy, resetPolish, T]);
  if (!open) return null;
  const renderRow = (p) => {
    const active = p.id === selectedId;
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      "div",
      {
        className: active ? "pl-lex-row pl-lex-row--active" : "pl-lex-row",
        onClick: () => selectItem(p.id),
        title: p.title,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: selectedIds.has(p.id),
                    onChange: () => toggleSelect(p.id),
                    onClick: (e) => e.stopPropagation(),
                    "aria-label": T("pl.lexicon.selectAll"),
                    style: {
                      flexShrink: 0,
                      width: 13,
                      height: 13,
                      margin: 0,
                      cursor: "pointer",
                      accentColor: TONE12.accent
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12.5,
                      fontWeight: 560,
                      lineHeight: 1.4,
                      color: TONE12.text
                    },
                    children: p.title
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      flexShrink: 0,
                      fontSize: 11,
                      color: TONE12.quiet
                    },
                    children: T("pl.previewUsage", { count: p.usageCount })
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            "div",
            {
              style: {
                fontSize: 11.5,
                lineHeight: 1.5,
                color: TONE12.muted,
                minWidth: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word"
              },
              children: p.body || "\xA0"
            }
          ),
          p.tags && p.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: p.tags.slice(0, 2).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            "span",
            {
              style: {
                fontSize: 10.5,
                lineHeight: 1.4,
                color: TONE12.accent,
                background: TONE12.accentSoft,
                borderRadius: 4,
                padding: "1px 6px"
              },
              children: tag
            },
            tag
          )) })
        ]
      },
      p.id
    );
  };
  const renderPreview2 = (p) => {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 12,
          height: "100%",
          boxSizing: "border-box"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      width: 3,
                      height: 15,
                      borderRadius: 2,
                      background: TONE12.accent,
                      flexShrink: 0
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 600,
                      color: TONE12.text,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    },
                    children: p.title
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  import_dsh_client_ui_primitives15.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => startEdit(p),
                    children: T("pl.lexicon.edit")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  import_dsh_client_ui_primitives15.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => setDeleteTarget(p),
                    style: { color: TONE12.red },
                    "data-tip": T("pl.delete"),
                    children: T("pl.delete")
                  }
                )
              ]
            }
          ),
          p.tags && p.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                flexShrink: 0
              },
              children: p.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                "span",
                {
                  style: {
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: TONE12.accent,
                    background: TONE12.accentSoft,
                    borderRadius: 5,
                    padding: "1px 8px"
                  },
                  children: tag
                },
                tag
              ))
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                flexShrink: 0
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                "span",
                {
                  style: {
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: TONE12.quiet,
                    background: TONE12.panel,
                    borderRadius: 5,
                    padding: "1px 8px"
                  },
                  children: T("pl.tagsEmpty")
                }
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: 0,
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: TONE12.panel,
                      border: `1px solid ${TONE12.border}`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 10.5,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: TONE12.quiet
                          },
                          children: T("pl.lexicon.usage")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            lineHeight: 1.4,
                            color: TONE12.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          },
                          children: [
                            p.usageCount,
                            " ",
                            T("pl.lexicon.usageUnit")
                          ]
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: 0,
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: TONE12.panel,
                      border: `1px solid ${TONE12.border}`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 10.5,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: TONE12.quiet
                          },
                          children: T("pl.lexicon.createdAt")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            lineHeight: 1.4,
                            color: TONE12.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          },
                          children: fmtTime(p.createdAt)
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: 0,
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: TONE12.panel,
                      border: `1px solid ${TONE12.border}`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 10.5,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: TONE12.quiet
                          },
                          children: T("pl.lexicon.updatedAt")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            lineHeight: 1.4,
                            color: TONE12.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          },
                          children: fmtTime(p.updatedAt)
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: 0,
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: TONE12.panel,
                      border: `1px solid ${TONE12.border}`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 10.5,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: TONE12.quiet
                          },
                          children: T("pl.lexicon.lastUsed")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            lineHeight: 1.4,
                            color: TONE12.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          },
                          children: p.lastUsedAt ? fmtTime(p.lastUsedAt) : T("pl.lexicon.neverUsed")
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { style: { flexShrink: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
              "div",
              {
                style: {
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: TONE12.text,
                  marginBottom: 4
                },
                children: T("pl.lexicon.summary")
              }
            ),
            p.summary ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
              "div",
              {
                style: {
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: TONE12.muted,
                  background: TONE12.panel,
                  border: `1px solid ${TONE12.border}`,
                  borderRadius: 7,
                  padding: "7px 10px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  // 摘要最多三行高度，内容超出时可滚动查看
                  maxHeight: 57.6,
                  overflowY: "auto"
                },
                children: p.summary
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { style: { fontSize: 11.5, color: TONE12.quiet }, children: T("pl.lexicon.noSummary") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: 1,
                minHeight: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: TONE12.text,
                            flexShrink: 0
                          },
                          children: T("pl.bodyField")
                        }
                      ),
                      viewPolish.status === "idle" ? p.aiRefined ? (
                        /* 已 AI 完善：不再显示优化按钮，改为提示已完成 */
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          "span",
                          {
                            style: {
                              marginLeft: "auto",
                              flexShrink: 0,
                              fontSize: 11,
                              color: TONE12.mint
                            },
                            children: T("pl.refinedDone")
                          }
                        )
                      ) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        import_dsh_client_ui_primitives15.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: () => void startPolish(),
                          disabled: busy,
                          "data-tip": T("pl.polishBtnTitle"),
                          style: { marginLeft: "auto", flexShrink: 0, color: TONE12.accent },
                          children: T("pl.polish")
                        }
                      ) : viewPolish.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            marginLeft: "auto",
                            flexShrink: 0,
                            fontSize: 11,
                            color: TONE12.accent
                          },
                          children: T("pl.polishing")
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            marginLeft: "auto",
                            flexShrink: 0,
                            fontSize: 11,
                            color: TONE12.mint
                          },
                          children: `\u2713 ${T("pl.refinedDone")}`
                        }
                      )
                    ]
                  }
                ),
                viewPolish.status === "loading" ? (
                  /* 优化中：不确定进度条动画 */
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: TONE12.panel,
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 7
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "div",
                        {
                          style: {
                            width: "70%",
                            height: 4,
                            borderRadius: 2,
                            overflow: "hidden",
                            background: TONE12.border
                          },
                          children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                            "div",
                            {
                              style: {
                                height: "100%",
                                width: "40%",
                                borderRadius: 2,
                                background: TONE12.accent,
                                animation: "pl-progress 1.2s ease-in-out infinite"
                              }
                            }
                          )
                        }
                      )
                    }
                  )
                ) : viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        gap: 4,
                        alignItems: "center",
                        flexShrink: 0
                      },
                      children: [
                        { value: false, label: T("pl.polished") },
                        { value: true, label: T("pl.original") }
                      ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => setViewShowOriginal(opt.value),
                          style: {
                            cursor: "pointer",
                            padding: "2px 10px",
                            fontSize: 11,
                            fontFamily: MONO15,
                            color: viewShowOriginal === opt.value ? TONE12.accent : TONE12.muted,
                            background: viewShowOriginal === opt.value ? TONE12.accentSoft : "transparent",
                            border: `1px solid ${viewShowOriginal === opt.value ? TONE12.accent : TONE12.border}`,
                            borderRadius: 999
                          },
                          children: opt.label
                        },
                        String(opt.value)
                      ))
                    }
                  ),
                  viewPolishSummary.trim() && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                    "div",
                    {
                      style: {
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        background: TONE12.accentSoft,
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 7,
                        padding: "6px 10px"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          "span",
                          {
                            style: {
                              flexShrink: 0,
                              fontSize: 11,
                              fontWeight: 600,
                              color: TONE12.accent,
                              lineHeight: 1.6
                            },
                            children: T("pl.lexicon.summary")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              lineHeight: 1.6,
                              color: TONE12.text,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word"
                            },
                            children: viewPolishSummary
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                    "textarea",
                    {
                      value: viewShowOriginal ? p.body : viewPolishText,
                      readOnly: viewShowOriginal,
                      onChange: (e) => setViewPolishText(e.target.value),
                      style: {
                        flex: 1,
                        minHeight: 0,
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        fontSize: 12.5,
                        lineHeight: 1.7,
                        color: TONE12.text,
                        background: viewShowOriginal ? TONE12.panel : rowBackground(),
                        border: `1px solid ${TONE12.border}`,
                        borderRadius: 7,
                        fontFamily: MONO15,
                        outline: "none",
                        resize: "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        opacity: viewShowOriginal ? 0.75 : 1
                      }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        flexShrink: 0
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          import_dsh_client_ui_primitives15.Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: plBtn("ghost", "sm"),
                            onClick: copyPolish,
                            children: T("pl.copy")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          import_dsh_client_ui_primitives15.Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: plBtn("ghost", "sm"),
                            onClick: cancelPolish,
                            disabled: busy,
                            children: T("pl.cancel")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          import_dsh_client_ui_primitives15.Button,
                          {
                            type: "button",
                            variant: "primary",
                            size: "sm",
                            className: plBtn("primary", "sm"),
                            onClick: savePolish,
                            disabled: busy,
                            children: T("pl.saveToLibrary")
                          }
                        )
                      ]
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflow: "auto",
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: TONE12.text,
                      background: TONE12.panel,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 7,
                      padding: "8px 10px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: MONO15
                    },
                    children: p.body
                  }
                ),
                viewPolishError && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "div",
                  {
                    style: {
                      flexShrink: 0,
                      color: TONE12.red,
                      fontSize: 11,
                      lineHeight: 1.5,
                      wordBreak: "break-word"
                    },
                    children: T("pl.polishFail")
                  }
                )
              ]
            }
          )
        ]
      }
    );
  };
  const renderEditor = () => {
    const isNew = editing?.id == null;
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 12,
          height: "100%",
          boxSizing: "border-box"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      width: 3,
                      height: 15,
                      borderRadius: 2,
                      background: TONE12.accent,
                      flexShrink: 0
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 600,
                      color: TONE12.text
                    },
                    children: isNew ? T("pl.lexicon.creatingTitle") : T("pl.lexicon.editingTitle")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  import_dsh_client_ui_primitives15.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: cancelEdit,
                    disabled: busy,
                    children: T("pl.cancel")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  import_dsh_client_ui_primitives15.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: save,
                    disabled: busy,
                    children: T("pl.save")
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: TONE12.text
                    },
                    children: T("pl.titleField")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "input",
                  {
                    value: draft.title,
                    onChange: (e) => setDraft((d) => ({ ...d, title: e.target.value })),
                    placeholder: T("pl.titleField"),
                    style: inputStyle7
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "span",
                  {
                    style: {
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: TONE12.text
                    },
                    children: T("pl.tagsField")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  TagInput,
                  {
                    value: draft.tag,
                    onChange: (v) => setDraft((d) => ({ ...d, tag: v })),
                    suggestions: tagList,
                    inputStyle: inputStyle7,
                    t
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flex: 1,
                minHeight: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            flex: 1,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: TONE12.text
                          },
                          children: T("pl.bodyField")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        import_dsh_client_ui_primitives15.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: insertVar,
                          "data-tip": T("pl.insertVariableTitle"),
                          style: { flexShrink: 0 },
                          children: T("pl.skillModal.insertVar")
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "textarea",
                  {
                    ref: bodyRef,
                    value: draft.body,
                    onChange: (e) => setDraft((d) => ({ ...d, body: e.target.value })),
                    placeholder: T("pl.bodyField"),
                    style: { ...inputStyle7, flex: 1, minHeight: 0, resize: "none", lineHeight: 1.6 }
                  }
                )
              ]
            }
          )
        ]
      }
    );
  };
  return (0, import_react_dom5.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.lexicon.title"),
        className: container ? void 0 : maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY,
        children: [
          !container && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: `@keyframes pl-progress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }` }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: `
.pl-lex-row{display:flex;flex-direction:column;gap:4;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(196,211,232,.16));background:var(--dsw-alias-bg-layer-3,#1d2735);cursor:pointer;user-select:none;transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-lex-row:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3,rgba(196,211,232,.31))}
.pl-lex-row--active{background:rgba(142,197,255,.10);border-color:rgba(142,197,255,.5)}
` }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
            "div",
            {
              className: maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG,
              style: {
                position: "relative",
                ...container ? {} : { width: 800, height: 800 },
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "calc(100vh - 40px)"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(BookIcon, { color: TONE12.accent }),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "strong",
                        {
                          style: {
                            flex: 1,
                            fontSize: 15,
                            fontWeight: 600,
                            color: TONE12.text,
                            minWidth: 0
                          },
                          children: T("pl.lexicon.title")
                        }
                      ),
                      !container && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                          WindowToggleButton,
                          {
                            maximized,
                            onToggle: () => setMaximized((v) => !v),
                            maximizeLabel: T("pl.windowMaximize"),
                            restoreLabel: T("pl.windowRestore")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(DialogCloseButton, { onClick: onClose, label: T("pl.close") })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  "div",
                  {
                    style: {
                      marginTop: 10,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: TONE12.quiet,
                      background: TONE12.accentSoft,
                      border: `1px solid ${TONE12.border}`,
                      borderRadius: 7,
                      padding: "7px 10px",
                      flexShrink: 0
                    },
                    children: T("pl.lexicon.desc")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flexShrink: 0,
                      height: 18,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: msg ? msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint : "transparent",
                      overflow: "hidden",
                      whiteSpace: "nowrap"
                    },
                    children: [
                      msg && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: msg.kind === "error" ? TONE12.red : msg.kind === "info" ? TONE12.accent : TONE12.mint
                          }
                        }
                      ),
                      msg?.text ?? ""
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      gap: 2,
                      paddingTop: 14,
                      paddingBottom: 4,
                      marginTop: -8
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                        "div",
                        {
                          style: {
                            flex: "1 1 0",
                            minWidth: 0,
                            minHeight: 0,
                            height: "100%",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            background: TONE12.row,
                            border: `1px solid ${TONE12.border}`,
                            borderRadius: 10,
                            overflow: "hidden"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                              "div",
                              {
                                style: {
                                  flexShrink: 0,
                                  padding: "10px 10px 9px",
                                  background: TONE12.row
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "span",
                                      {
                                        style: {
                                          width: 3,
                                          height: 13,
                                          borderRadius: 2,
                                          background: TONE12.accent,
                                          flexShrink: 0
                                        }
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "span",
                                      {
                                        style: {
                                          flex: 1,
                                          minWidth: 0,
                                          fontSize: 13,
                                          fontWeight: 600,
                                          color: TONE12.text,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap"
                                        },
                                        children: T("pl.lexicon.listTitle")
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      import_dsh_client_ui_primitives15.Button,
                                      {
                                        type: "button",
                                        variant: "primary",
                                        size: "sm",
                                        className: plBtn("primary", "sm"),
                                        onClick: startCreate,
                                        disabled: busy || !!editing,
                                        children: T("pl.lexicon.new")
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 9
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 2,
                                              flexShrink: 0,
                                              background: TONE12.panel,
                                              border: `1px solid ${TONE12.border}`,
                                              borderRadius: 7,
                                              padding: 2
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                "button",
                                                {
                                                  type: "button",
                                                  onClick: () => setViewMode("list"),
                                                  style: {
                                                    border: "none",
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    fontFamily: MONO15,
                                                    fontSize: 11.5,
                                                    lineHeight: 1.4,
                                                    padding: "2px 8px",
                                                    borderRadius: 5,
                                                    color: viewMode === "list" ? TONE12.accent : TONE12.quiet,
                                                    background: viewMode === "list" ? TONE12.accentSoft : "transparent",
                                                    transition: "color .18s, background-color .18s"
                                                  },
                                                  children: T("pl.lexicon.listView")
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                "button",
                                                {
                                                  type: "button",
                                                  onClick: () => setViewMode("group"),
                                                  style: {
                                                    border: "none",
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    fontFamily: MONO15,
                                                    fontSize: 11.5,
                                                    lineHeight: 1.4,
                                                    padding: "2px 8px",
                                                    borderRadius: 5,
                                                    color: viewMode === "group" ? TONE12.accent : TONE12.quiet,
                                                    background: viewMode === "group" ? TONE12.accentSoft : "transparent",
                                                    transition: "color .18s, background-color .18s"
                                                  },
                                                  children: T("pl.lexicon.groupView")
                                                }
                                              )
                                            ]
                                          }
                                        ),
                                        !container && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              flex: 1,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "flex-end",
                                              gap: 6,
                                              minWidth: 0
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                import_dsh_client_ui_primitives15.Button,
                                                {
                                                  type: "button",
                                                  variant: "ghost",
                                                  size: "sm",
                                                  className: plBtn("ghost", "sm"),
                                                  onClick: () => setDataSub("tags"),
                                                  children: T("pl.lexicon.viewTags")
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                import_dsh_client_ui_primitives15.Button,
                                                {
                                                  type: "button",
                                                  variant: "ghost",
                                                  size: "sm",
                                                  className: plBtn("ghost", "sm"),
                                                  onClick: () => setDataSub("trash"),
                                                  children: T("pl.lexicon.viewTrash")
                                                }
                                              )
                                            ]
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { style: { position: "relative", marginTop: 9 }, children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                      "svg",
                                      {
                                        viewBox: "0 0 24 24",
                                        width: "13",
                                        height: "13",
                                        "aria-hidden": "true",
                                        style: {
                                          position: "absolute",
                                          left: 9,
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          fill: "none",
                                          stroke: TONE12.quiet,
                                          strokeWidth: 2,
                                          strokeLinecap: "round",
                                          strokeLinejoin: "round",
                                          pointerEvents: "none"
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
                                          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("line", { x1: "21", y1: "21", x2: "16.5", y2: "16.5" })
                                        ]
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "input",
                                      {
                                        value: search,
                                        onChange: (e) => setSearch(e.target.value),
                                        placeholder: T("pl.search"),
                                        spellCheck: false,
                                        style: {
                                          width: "100%",
                                          boxSizing: "border-box",
                                          padding: "5px 26px 5px 28px",
                                          color: TONE12.text,
                                          background: TONE12.panel,
                                          border: `1px solid ${TONE12.border}`,
                                          borderRadius: 7,
                                          outline: "none",
                                          fontFamily: MONO15,
                                          fontSize: 12
                                        }
                                      }
                                    ),
                                    search && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "button",
                                      {
                                        type: "button",
                                        title: T("pl.clearSearch"),
                                        onClick: () => setSearch(""),
                                        style: {
                                          position: "absolute",
                                          right: 6,
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          border: "none",
                                          outline: "none",
                                          background: "transparent",
                                          color: TONE12.quiet,
                                          cursor: "pointer",
                                          fontSize: 14,
                                          lineHeight: 1,
                                          padding: 0
                                        },
                                        children: "\xD7"
                                      }
                                    )
                                  ] })
                                ]
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  flexShrink: 0,
                                  padding: "9px 10px 10px",
                                  borderBottom: `1px solid ${TONE12.border}`
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        flexShrink: 0
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                          "label",
                                          {
                                            style: {
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: 5,
                                              fontSize: 12,
                                              color: TONE12.muted,
                                              cursor: "pointer",
                                              userSelect: "none",
                                              flexShrink: 0
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                "input",
                                                {
                                                  type: "checkbox",
                                                  ref: selectAllRef,
                                                  checked: filtered.length > 0 && selectedIds.size === filtered.length,
                                                  onChange: toggleSelectAll,
                                                  disabled: filtered.length === 0,
                                                  "aria-label": T("pl.lexicon.selectAll"),
                                                  style: {
                                                    flexShrink: 0,
                                                    margin: 0,
                                                    cursor: "pointer",
                                                    accentColor: TONE12.accent
                                                  }
                                                }
                                              ),
                                              filtered.length > 0 && selectedIds.size === filtered.length ? T("pl.lexicon.deselectAll") : T("pl.lexicon.selectAll")
                                            ]
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                          import_dsh_client_ui_primitives15.Button,
                                          {
                                            type: "button",
                                            variant: "ghost",
                                            size: "sm",
                                            className: plBtn("ghost", "sm"),
                                            onClick: () => setBatchDeleteOpen(true),
                                            disabled: selectedIds.size === 0,
                                            style: { color: TONE12.red },
                                            "data-tip": T("pl.lexicon.batchDelete"),
                                            children: T("pl.lexicon.batchDelete")
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                    "span",
                                    {
                                      style: {
                                        flexShrink: 0,
                                        fontSize: 11,
                                        color: TONE12.quiet
                                      },
                                      children: T("pl.lexicon.selectedTotal", {
                                        selected: selectedIds.size,
                                        total: filtered.length
                                      })
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                              "div",
                              {
                                style: {
                                  flex: 1,
                                  minHeight: 0,
                                  overflowY: "auto"
                                },
                                children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                      padding: 10
                                    },
                                    children: !loaded ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "div",
                                      {
                                        style: {
                                          fontSize: 12.5,
                                          color: TONE12.quiet,
                                          textAlign: "center",
                                          padding: "22px 0"
                                        },
                                        children: T("pl.loading")
                                      }
                                    ) : list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "div",
                                      {
                                        style: {
                                          fontSize: 12.5,
                                          color: TONE12.quiet,
                                          textAlign: "center",
                                          padding: "22px 0"
                                        },
                                        children: T("pl.empty")
                                      }
                                    ) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                      "div",
                                      {
                                        style: {
                                          fontSize: 12.5,
                                          color: TONE12.quiet,
                                          textAlign: "center",
                                          padding: "22px 0"
                                        },
                                        children: T("pl.lexicon.noSearchResult")
                                      }
                                    ) : viewMode === "group" ? grouped.map(([tag, items]) => {
                                      const isCollapsed = collapsed.has(tag);
                                      return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                        "div",
                                        {
                                          style: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6
                                          },
                                          children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                              "div",
                                              {
                                                role: "button",
                                                tabIndex: 0,
                                                onClick: () => toggleGroup(tag),
                                                onKeyDown: (e) => {
                                                  if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    toggleGroup(tag);
                                                  }
                                                },
                                                title: isCollapsed ? T("pl.lexicon.expandGroup") : T("pl.lexicon.collapseGroup"),
                                                style: {
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 5,
                                                  padding: "2px 4px",
                                                  borderRadius: 6,
                                                  cursor: "pointer",
                                                  userSelect: "none",
                                                  transition: "background-color .18s"
                                                },
                                                children: [
                                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                    "input",
                                                    {
                                                      type: "checkbox",
                                                      checked: items.length > 0 && items.every((p) => selectedIds.has(p.id)),
                                                      onChange: () => {
                                                        const allChecked = items.length > 0 && items.every((p) => selectedIds.has(p.id));
                                                        setSelectedIds((prev) => {
                                                          const next = new Set(prev);
                                                          for (const p of items) {
                                                            if (allChecked) next.delete(p.id);
                                                            else next.add(p.id);
                                                          }
                                                          return next;
                                                        });
                                                      },
                                                      onClick: (e) => e.stopPropagation(),
                                                      "aria-label": T("pl.lexicon.selectAll"),
                                                      style: {
                                                        flexShrink: 0,
                                                        width: 13,
                                                        height: 13,
                                                        margin: 0,
                                                        cursor: "pointer",
                                                        accentColor: TONE12.accent
                                                      }
                                                    }
                                                  ),
                                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                    "svg",
                                                    {
                                                      width: "12",
                                                      height: "12",
                                                      viewBox: "0 0 16 16",
                                                      style: {
                                                        color: TONE12.muted,
                                                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                                        transition: "transform .24s cubic-bezier(.22,1,.36,1)",
                                                        flexShrink: 0
                                                      },
                                                      "aria-hidden": "true",
                                                      children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                        "path",
                                                        {
                                                          d: "M4 6l4 4 4-4",
                                                          fill: "none",
                                                          stroke: "currentColor",
                                                          strokeWidth: "1.6",
                                                          strokeLinecap: "round",
                                                          strokeLinejoin: "round"
                                                        }
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                    "span",
                                                    {
                                                      style: {
                                                        minWidth: 0,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        fontSize: 12,
                                                        fontFamily: MONO15,
                                                        fontWeight: 560,
                                                        color: TONE12.text
                                                      },
                                                      children: tag || T("pl.tagsNone")
                                                    }
                                                  ),
                                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                                    "span",
                                                    {
                                                      style: {
                                                        flexShrink: 0,
                                                        fontSize: 11,
                                                        color: TONE12.quiet
                                                      },
                                                      children: T("pl.sidebar.groupCount", {
                                                        count: items.length
                                                      })
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            !isCollapsed && items.map((p) => renderRow(p))
                                          ]
                                        },
                                        tag || "__none__"
                                      );
                                    }) : filtered.map((p) => renderRow(p))
                                  }
                                )
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                        "div",
                        {
                          style: {
                            position: "relative",
                            flex: "1 1 0",
                            minWidth: 0,
                            height: "100%",
                            boxSizing: "border-box",
                            minHeight: 0,
                            background: TONE12.row,
                            border: `1px solid ${TONE12.border}`,
                            borderRadius: 10,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                              "div",
                              {
                                style: {
                                  flex: 1,
                                  minHeight: 0,
                                  boxSizing: "border-box",
                                  overflowY: "auto"
                                },
                                children: editing ? renderEditor() : selected ? renderPreview2(selected) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: "100%",
                                      boxSizing: "border-box",
                                      fontSize: 12.5,
                                      color: TONE12.quiet,
                                      padding: 20,
                                      textAlign: "center"
                                    },
                                    children: T("pl.lexicon.previewEmpty")
                                  }
                                )
                              }
                            ),
                            dataSub && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                              "div",
                              {
                                style: {
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                  display: "flex",
                                  flexDirection: "column",
                                  background: TONE12.row,
                                  borderRadius: 10,
                                  padding: "0 0 10px",
                                  boxSizing: "border-box"
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        flexShrink: 0,
                                        padding: "8px 0 9px 8px",
                                        borderBottom: `1px solid ${TONE12.border}`
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                          "span",
                                          {
                                            style: {
                                              width: 3,
                                              height: 13,
                                              borderRadius: 2,
                                              background: TONE12.accent,
                                              flexShrink: 0
                                            }
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                          "span",
                                          {
                                            style: {
                                              flex: 1,
                                              minWidth: 0,
                                              fontSize: 13,
                                              fontWeight: 600,
                                              color: TONE12.text,
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap"
                                            },
                                            children: dataSub === "tags" ? T("pl.moduleTags") : T("pl.moduleTrash")
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                          DialogCloseButton,
                                          {
                                            onClick: () => setDataSub(null),
                                            label: T("pl.close")
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                                    "div",
                                    {
                                      style: {
                                        flex: 1,
                                        minHeight: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        overflow: "hidden"
                                      },
                                      children: dataSub === "tags" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TagManagePanel, { t }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(RecycleManagePanel, { t })
                                    }
                                  )
                                ]
                              }
                            )
                          ]
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  ConfirmDialog,
                  {
                    open: !!deleteTarget,
                    danger: true,
                    message: deleteTarget ? T("pl.confirmDelete", { title: deleteTarget.title }) : "",
                    confirmLabel: T("pl.delete"),
                    cancelLabel: T("pl.cancel"),
                    onCancel: () => setDeleteTarget(null),
                    onConfirm: confirmDelete
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                  ConfirmDialog,
                  {
                    open: batchDeleteOpen,
                    danger: true,
                    message: T("pl.lexicon.confirmBatchDelete", { count: selectedIds.size }),
                    confirmLabel: T("pl.lexicon.batchDelete"),
                    cancelLabel: T("pl.cancel"),
                    onCancel: () => setBatchDeleteOpen(false),
                    onConfirm: confirmBatchDelete
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    container || document.body
  );
}

// src/client/components/common/PanelHeader.tsx
var import_jsx_runtime24 = require("react/jsx-runtime");
function PanelHeader({ title, desc }) {
  useThemeSync();
  const TONE12 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(import_jsx_runtime24.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }, children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
      "span",
      {
        style: {
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          fontWeight: 600,
          color: TONE12.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        },
        children: title
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
      "div",
      {
        style: {
          marginTop: 8,
          fontSize: 11.5,
          lineHeight: 1.6,
          color: TONE12.quiet,
          background: TONE12.accentSoft,
          border: `1px solid ${TONE12.border}`,
          borderRadius: 7,
          padding: "7px 10px",
          flexShrink: 0
        },
        children: desc
      }
    )
  ] });
}

// src/client/components/data/PromptAssistant.tsx
var import_jsx_runtime25 = require("react/jsx-runtime");
function PromptAssistant({ t }) {
  const T = usePLT(t);
  const panelContainerRef = (0, import_react20.useRef)(null);
  const [panelNavKey, setPanelNavKey] = (0, import_react20.useState)(null);
  const closePanelContent = (0, import_react20.useCallback)(() => {
    setPanelNavKey(null);
    panelContainerRef.current = null;
  }, []);
  (0, import_react20.useEffect)(() => {
    const onPanelContent = (e) => {
      const custom = e;
      panelContainerRef.current = custom.detail.container;
      setPanelNavKey(custom.detail.key);
    };
    window.addEventListener("pl:show-panel-content", onPanelContent);
    const onHidePanelContent = () => {
      closePanelContent();
      panelContainerRef.current = null;
    };
    window.addEventListener("pl:hide-panel-content", onHidePanelContent);
    return () => {
      window.removeEventListener("pl:show-panel-content", onPanelContent);
      window.removeEventListener("pl:hide-panel-content", onHidePanelContent);
    };
  }, [closePanelContent]);
  const panelContentPortal = panelNavKey && panelContainerRef.current ? (0, import_react_dom6.createPortal)(
    (() => {
      switch (panelNavKey) {
        case "lexicon":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            LexiconManagerModal,
            {
              open: true,
              onClose: closePanelContent,
              t: T,
              container: panelContainerRef.current
            }
          );
        case "importExport":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            ImportExportModal,
            {
              open: true,
              onClose: closePanelContent,
              t: T,
              container: panelContainerRef.current
            }
          );
        case "persona":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            PersonaManagerModal,
            {
              open: true,
              onClose: closePanelContent,
              t: T,
              container: panelContainerRef.current
            }
          );
        case "workspaceInstructions":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            PromptInjectPanel,
            {
              open: true,
              onClose: closePanelContent,
              t: T,
              container: panelContainerRef.current
            }
          );
        case "tags":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              PanelHeader,
              {
                title: T("pl.moduleTags"),
                desc: T("pl.moduleTagsDesc")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(TagManagePanel, { t: T })
          ] });
        case "trash":
          return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              PanelHeader,
              {
                title: T("pl.moduleTrash"),
                desc: T("pl.moduleTrashDesc")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(RecycleManagePanel, { t: T })
          ] });
        default:
          return null;
      }
    })(),
    panelContainerRef.current
  ) : null;
  return panelContentPortal;
}

// src/client/components/settings/SettingsSection.tsx
var import_react21 = require("react");
var import_jsx_runtime26 = require("react/jsx-runtime");
var MONO16 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE11 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var moduleStyle = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE11.panel,
  border: `1px solid ${TONE11.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12
};
var moduleTitleStyle = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE11.text
};
var moduleDescStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE11.quiet
};
function ModuleCard(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("section", { style: moduleStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
      "div",
      {
        role: "button",
        tabIndex: 0,
        "aria-expanded": open,
        onClick: onToggle,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: moduleTitleStyle, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: moduleDescStyle, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 16 16",
              style: {
                flexShrink: 0,
                color: TONE11.muted,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)"
              },
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "path",
                {
                  d: "M4 6l4 4 4-4",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "1.6",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                }
              )
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children })
  ] });
}
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled
}) {
  const dim = disabled ? 0.45 : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
    "label",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 0"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          "span",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 2,
              flex: 1,
              opacity: dim
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 13 }, children: label }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 11, color: TONE11.quiet }, children: desc })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          "input",
          {
            type: "checkbox",
            checked,
            disabled,
            onChange: (e) => onChange(e.target.checked),
            style: {
              width: 16,
              height: 16,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: dim,
              accentColor: TONE11.accent
            }
          }
        )
      ]
    }
  );
}
function NumberRow({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  disabled
}) {
  const clamp = (v) => {
    if (Number.isNaN(v)) return defaultValue ?? min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };
  const dim = disabled ? 0.45 : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
    "label",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        cursor: disabled ? "not-allowed" : "default",
        opacity: dim
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("span", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("span", { style: { fontSize: 11, color: TONE11.quiet }, children: [
            min,
            "-",
            max
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          "input",
          {
            type: "number",
            value,
            min,
            max,
            step,
            disabled,
            onChange: (e) => {
              if (disabled) return;
              const raw = e.target.value;
              if (raw === "") {
                onChange(defaultValue ?? min);
                return;
              }
              const num = Number(raw);
              if (Number.isNaN(num)) return;
              onChange(num > max ? max : num);
            },
            onBlur: () => {
              if (!disabled) onChange(clamp(value));
            },
            style: {
              width: 80,
              padding: "4px 6px",
              color: TONE11.text,
              background: TONE11.row,
              border: `1px solid ${TONE11.border}`,
              borderRadius: 5,
              fontFamily: MONO16,
              fontSize: 12,
              textAlign: "center",
              outline: "none",
              cursor: disabled ? "not-allowed" : "text"
            }
          }
        )
      ]
    }
  );
}
function SelectRow({
  label,
  value,
  options,
  onChange,
  desc,
  disabled
}) {
  const dim = disabled ? 0.45 : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { padding: "8px 0", opacity: dim }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
      "label",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          cursor: disabled ? "not-allowed" : "default"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            "select",
            {
              value,
              disabled,
              onChange: (e) => {
                if (!disabled) onChange(e.target.value);
              },
              style: {
                width: 180,
                padding: "4px 6px",
                color: TONE11.text,
                background: TONE11.row,
                border: `1px solid ${TONE11.border}`,
                borderRadius: 5,
                fontFamily: MONO16,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "pointer"
              },
              children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("option", { value: opt.value, children: opt.label }, opt.value))
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
      "div",
      {
        style: {
          fontSize: 11,
          color: TONE11.quiet,
          marginTop: 4,
          lineHeight: 1.5
        },
        children: desc
      }
    )
  ] });
}
function SettingsSection(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [loading, setLoading] = (0, import_react21.useState)(true);
  const [draft, setDraft] = (0, import_react21.useState)(DEFAULT_SETTINGS);
  const [openAiModel, setOpenAiModel] = (0, import_react21.useState)(false);
  const [openPanel, setOpenPanel] = (0, import_react21.useState)(false);
  const [openDisplay, setOpenDisplay] = (0, import_react21.useState)(false);
  const [openAbout, setOpenAbout] = (0, import_react21.useState)(false);
  const [aiSelectables, setAiSelectables] = (0, import_react21.useState)([]);
  const [installedVer, setInstalledVer] = (0, import_react21.useState)("");
  const saveTimerRef = (0, import_react21.useRef)(null);
  (0, import_react21.useEffect)(() => {
    getSettings().then((s) => setDraft(s)).catch(() => {
    }).finally(() => setLoading(false));
  }, []);
  (0, import_react21.useEffect)(() => {
    getAiSelectables().then((list) => setAiSelectables(list)).catch(() => {
    });
  }, []);
  (0, import_react21.useEffect)(() => {
    getVersion().then((v) => setInstalledVer(v.installed || "")).catch(() => {
    });
  }, []);
  const saveSettings = (0, import_react21.useCallback)((next) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateSettings(next).then(() => {
        window.dispatchEvent(
          new CustomEvent("pl:settings-changed", { detail: next })
        );
      }).catch(() => {
      });
    }, 300);
  }, []);
  const updateAndSave = (0, import_react21.useCallback)(
    (patch) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings]
  );
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
      "div",
      {
        style: {
          padding: 16,
          color: TONE11.quiet,
          fontFamily: MONO16,
          fontSize: 13
        },
        children: T("pl.loading")
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
    "div",
    {
      style: {
        color: TONE11.text,
        fontFamily: MONO16,
        maxWidth: 520
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          "div",
          {
            style: {
              padding: "2px 0 4px",
              display: "flex",
              flexDirection: "column",
              gap: 4
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "div",
                {
                  style: {
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: TONE11.text,
                    lineHeight: 1.2
                  },
                  children: T("pl.setSectionTitle")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12, color: TONE11.quiet, lineHeight: 1.5 }, children: T("pl.set.setSectionDesc") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          ModuleCard,
          {
            title: T("pl.setModuleAiModel"),
            desc: T("pl.setModuleAiModelDesc"),
            open: openAiModel,
            onToggle: () => setOpenAiModel((v) => !v),
            children: (() => {
              const curSel = aiSelectables.find(
                (s) => s.provider === draft.aiProvider
              );
              const providerOptions = [
                { value: "", label: T("pl.set.aiModelAuto") },
                ...aiSelectables.map((s) => ({
                  value: s.provider,
                  label: s.name || s.provider
                }))
              ];
              if (draft.aiProvider && !aiSelectables.some((s) => s.provider === draft.aiProvider)) {
                providerOptions.push({
                  value: draft.aiProvider,
                  label: draft.aiProvider
                });
              }
              const modelOptions = [
                { value: "", label: T("pl.set.aiModelAuto") },
                ...curSel?.models.map((m) => ({
                  value: m.id,
                  label: m.name || m.id
                })) ?? []
              ];
              return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(import_jsx_runtime26.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                  SelectRow,
                  {
                    label: T("pl.set.aiModelProvider"),
                    value: draft.aiProvider,
                    onChange: (v) => updateAndSave({
                      aiProvider: v,
                      aiModel: ""
                      // 切换调用方后不沿用旧模型的模型 id
                    }),
                    options: providerOptions,
                    disabled: aiSelectables.length === 0
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                  SelectRow,
                  {
                    label: T("pl.set.aiDefaultModel"),
                    value: draft.aiModel,
                    onChange: (v) => updateAndSave({ aiModel: v }),
                    options: modelOptions,
                    disabled: !draft.aiProvider
                  }
                )
              ] });
            })()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModulePanel"),
            desc: T("pl.setModulePanelDesc"),
            open: openPanel,
            onToggle: () => setOpenPanel((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow,
                {
                  label: T("pl.set.panelWidth"),
                  value: draft.panelWidth,
                  min: 300,
                  max: 700,
                  step: 10,
                  onChange: (v) => updateAndSave({ panelWidth: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow,
                {
                  label: T("pl.set.panelHeight"),
                  value: draft.panelHeight,
                  min: 300,
                  max: 800,
                  step: 10,
                  onChange: (v) => updateAndSave({ panelHeight: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow,
                {
                  label: T("pl.set.maxCount"),
                  value: draft.maxPromptCount,
                  min: 10,
                  max: 1e4,
                  step: 10,
                  defaultValue: DEFAULT_SETTINGS.maxPromptCount,
                  onChange: (v) => updateAndSave({ maxPromptCount: v })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModuleDisplay"),
            desc: T("pl.setModuleDisplayDesc"),
            open: openDisplay,
            onToggle: () => setOpenDisplay((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.settingsAboveMenu"),
                  desc: T("pl.set.settingsAboveMenuDesc"),
                  checked: draft.settingsAboveMenuEnabled,
                  onChange: (v) => updateAndSave({ settingsAboveMenuEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.showComposerBtn"),
                  desc: T("pl.set.showComposerBtnDesc"),
                  checked: draft.showComposerButton,
                  onChange: (v) => updateAndSave({ showComposerButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "div",
                {
                  style: {
                    paddingLeft: 14,
                    borderLeft: `1px solid ${TONE11.border}`,
                    marginLeft: 6
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                    ToggleRow,
                    {
                      label: T("pl.set.composerBtnIconOnly"),
                      desc: T("pl.set.composerBtnIconOnlyDesc"),
                      checked: draft.composerButtonIconOnly,
                      disabled: !draft.showComposerButton,
                      onChange: (v) => updateAndSave({ composerButtonIconOnly: v })
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.showPolishBtn"),
                  desc: T("pl.set.showPolishBtnDesc"),
                  checked: draft.showAIPolishButton,
                  onChange: (v) => updateAndSave({ showAIPolishButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "div",
                {
                  style: {
                    paddingLeft: 14,
                    borderLeft: `1px solid ${TONE11.border}`,
                    marginLeft: 6
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                    ToggleRow,
                    {
                      label: T("pl.set.polishBtnIconOnly"),
                      desc: T("pl.set.polishBtnIconOnlyDesc"),
                      checked: draft.aiPolishButtonIconOnly,
                      disabled: !draft.showAIPolishButton,
                      onChange: (v) => updateAndSave({ aiPolishButtonIconOnly: v })
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.tildaTrigger"),
                  desc: T("pl.set.tildaTriggerDesc"),
                  checked: draft.tildaTriggerEnabled,
                  onChange: (v) => updateAndSave({ tildaTriggerEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.selectionAdd"),
                  desc: T("pl.set.selectionAddDesc"),
                  checked: draft.selectionAddEnabled,
                  onChange: (v) => updateAndSave({ selectionAddEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.contextRecommend"),
                  desc: T("pl.set.contextRecommendDesc"),
                  checked: draft.contextRecommendEnabled,
                  onChange: (v) => updateAndSave({ contextRecommendEnabled: v })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          ModuleCard,
          {
            title: T("pl.setModuleAbout"),
            desc: T("pl.setModuleAboutDesc"),
            open: openAbout,
            onToggle: () => setOpenAbout((v) => !v),
            children: /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  paddingTop: 2
                },
                children: [
                  [
                    [
                      T("pl.set.currentVersion"),
                      installedVer ? `v${installedVer}` : "-"
                    ],
                    [T("pl.about.author"), "master1Sun"],
                    [T("pl.about.license"), "MIT"]
                  ].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "6px 2px",
                        borderBottom: `1px solid ${TONE11.border}`
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE11.quiet }, children: label }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE11.text }, children: value })
                      ]
                    },
                    label
                  )),
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "6px 2px"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE11.quiet }, children: T("pl.about.repo") }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                          "a",
                          {
                            href: "https://github.com/master1Sun/dsh-prompt-library",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              color: TONE11.accent,
                              textDecoration: "none",
                              fontSize: 12.5,
                              opacity: 0.9,
                              transition: "opacity 0.15s ease"
                            },
                            onMouseEnter: (e) => e.currentTarget.style.opacity = "1",
                            onMouseLeave: (e) => e.currentTarget.style.opacity = "0.9",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                "svg",
                                {
                                  width: "13",
                                  height: "13",
                                  viewBox: "0 0 24 24",
                                  fill: "currentColor",
                                  "aria-hidden": "true",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("path", { d: "M12 0C5.37 0 0 5.4 0 12.06c0 5.33 3.44 9.84 8.21 11.43.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .32.22.7.83.58A12.4 12.4 0 0 0 24 12.06C24 5.4 18.63 0 12 0z" })
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: "github.com/master1Sun/dsh-prompt-library" })
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                    "div",
                    {
                      "aria-label": "\u7248\u6743\u6CE8\u91CA",
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: `1px dashed ${TONE11.border}`,
                        color: TONE11.quiet,
                        fontSize: 11,
                        lineHeight: 1.55,
                        textAlign: "center"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: T("pl.about.copyright", {
                          year: (/* @__PURE__ */ new Date()).getFullYear(),
                          author: "master1Sun"
                        }) }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: T("pl.footer.disclaimer") })
                      ]
                    }
                  )
                ]
              }
            )
          }
        )
      ]
    }
  );
}

// src/client/components/settings/SettingsAboveMenuButton.tsx
var SETTINGS_ABOVE_CSS = `
.pl-sa-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.35);backdrop-filter:var(--dsw-mask-blur,blur(12px));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(12px));animation:pl-sa-fade-in .15s ease}
@keyframes pl-sa-fade-in{from{opacity:0}to{opacity:1}}
.pl-sa-panel{position:fixed;z-index:2147483647;background:var(--dsw-specific-sidebar-fill,#f5f6f7);box-shadow:0 10px 32px rgba(2,6,23,.2),0 2px 8px rgba(2,6,23,.1);opacity:0;transition:opacity .15s ease}
.pl-sa-panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;flex-shrink:0}
.pl-sa-close-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#1f2937);cursor:pointer;transition:background .12s ease}
.pl-sa-close-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-sidebar{width:115px;flex-shrink:0;overflow-y:auto;padding:8px 6px}
.pl-sa-nav-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary,#1f2937);transition:background .12s ease}
.pl-sa-nav-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-nav-item.active{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))}
.pl-sa-nav-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;flex-shrink:0}
/* \u4FA7\u8FB9\u680F\u6298\u53E0\u6001\uFF1A\u4E0E\u5BBF\u4E3B\u539F\u751F\u300C\u8BBE\u7F6E\u300D\u6309\u94AE\u4E00\u81F4\uFF0C\u53EA\u663E\u793A\u56FE\u6807\u3001\u9690\u85CF\u6587\u5B57 */
[data-pl-sa-wrap].pl-sa-collapsed button{justify-content:center!important;padding:0 4px!important;width:100%!important;margin:4px 0!important}
[data-pl-sa-wrap].pl-sa-collapsed .pl-sa-btn-label{display:none!important}
.pl-sa-content-area{flex:1;overflow:hidden;padding:5px;min-width:0;position:relative;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"]{flex:1;min-height:0;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"] > .pl-dialog{flex:1;min-height:0;height:auto}
${PL_DIALOG_CSS}
`;
var SVG_NS = "http://www.w3.org/2000/svg";
var NAV_ITEMS = [
  {
    id: "lexicon",
    labelKey: "pl.ctx.dataManagement",
    iconBg: "rgba(37, 99, 235, .12)",
    iconColor: "var(--dsw-alias-brand-primary,#2563eb)",
    iconBody: '<rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.1"/><rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1.1"/><rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1.1"/><rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1.1"/>'
  },
  {
    id: "importExport",
    labelKey: "pl.moduleImportExport",
    iconBg: "rgba(37, 99, 235, .12)",
    iconColor: "var(--dsw-alias-brand-primary,#2563eb)",
    iconBody: '<path d="M8 12V4M8 4L5 7M8 4l3 3M8 12l-3-3M8 12l3-3"/>'
  },
  {
    id: "tags",
    labelKey: "pl.ctx.tags",
    iconBg: "rgba(234, 88, 12, .12)",
    iconColor: "#ea580c",
    iconBody: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h4.6c.4 0 .8.15 1.1.44l7 6.1a1.6 1.6 0 0 1 0 2.34l-5.7 5.7a1.6 1.6 0 0 1-2.34 0l-6.1-7A2.5 2.5 0 0 1 3 9.1V5.5Z"/><circle cx="7.4" cy="7.4" r="1.2"/>'
  },
  {
    id: "trash",
    labelKey: "pl.ctx.trash",
    iconBg: "rgba(220, 38, 38, .1)",
    iconColor: "var(--dsw-alias-state-error-primary,#dc2626)",
    iconBody: '<path d="M5 6.5h14M9 6.5V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8v1.7M6.5 6.5l.7 12a1 1 0 0 0 1 .9h7.6a1 1 0 0 0 1-.9l.7-12M9.5 10v5M14.5 10v5"/>'
  },
  {
    id: "persona",
    labelKey: "pl.ctx.personas",
    iconBg: "rgba(139, 92, 246, .12)",
    iconColor: "#8b5cf6",
    iconBody: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z"/><path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z"/>'
  },
  {
    id: "workspaceInstructions",
    labelKey: "pl.ctx.workspaceInstructions",
    iconBg: "rgba(139, 92, 246, .12)",
    iconColor: "#8b5cf6",
    iconBody: '<path d="M4 5.5h9M4 8.5h5.5M4 11.5h9"/>'
  }
];
var PANEL_TYPE_MAP = {
  lexicon: "lexicon",
  importExport: "importExport",
  persona: "persona",
  workspaceInstructions: "workspaceInstructions",
  tags: "tags",
  trash: "trash"
};
var pendingPanelType = null;
function schedulePanelContent(container, type) {
  pendingPanelType = type;
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent("pl:show-panel-content", {
        detail: { container, key: pendingPanelType }
      })
    );
    pendingPanelType = null;
  });
}
function registerSettingsAboveMenu(getTranslation, _getSettingsEnabled, getEnabled = async () => true) {
  let disposed = false;
  let panelOpen = false;
  let activeNavId = "lexicon";
  let enabled = true;
  const refreshEnabled = () => {
    Promise.resolve().then(getEnabled).then((v) => {
      if (disposed) return;
      enabled = v;
      const wrap = document.querySelector("[data-pl-sa-wrap]");
      if (!enabled) {
        closePanel();
        if (wrap) wrap.remove();
      } else if (!wrap) {
        doInject();
      }
    }).catch(() => {
    });
  };
  const buildPanel = () => {
    const backdrop = document.createElement("div");
    backdrop.className = "pl-sa-backdrop";
    document.body.appendChild(backdrop);
    const panel = document.createElement("div");
    panel.className = "pl-sa-panel";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.bottom = "auto";
    panel.style.right = "auto";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.width = "min(850px, calc(100vw - 40px))";
    panel.style.height = "min(800px, calc(100vh - 40px))";
    panel.style.borderRadius = "24px";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.overflow = "hidden";
    panel.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(panel);
    const header = document.createElement("div");
    header.className = "pl-sa-panel-header";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = getTranslation("pl.title");
    titleSpan.style.cssText = "font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2937);";
    let maximized = false;
    const maxBtn = document.createElement("button");
    maxBtn.type = "button";
    maxBtn.className = "pl-sa-close-btn";
    const setMaxIcon = (on) => {
      maxBtn.innerHTML = on ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="10" height="10" rx="2"/><path d="M9 9V5h10v10h-4"/></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
      maxBtn.setAttribute("aria-label", getTranslation(on ? "pl.windowRestore" : "pl.windowMaximize"));
      maxBtn.title = getTranslation(on ? "pl.windowRestore" : "pl.windowMaximize");
    };
    setMaxIcon(false);
    const fillDesktopRect = () => {
      const root = document.getElementById("root");
      const r = root?.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) {
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }
      return { left: 0, top: 36, width: window.innerWidth, height: Math.max(0, window.innerHeight - 36) };
    };
    const isDesktopMode = () => {
      const m = (document.body.getAttribute("data-dsh-desktop-mode") || "").toLowerCase();
      return m === "compatibility" || m === "extended";
    };
    const applyGeometry = () => {
      if (maximized) {
        if (isDesktopMode()) {
          const r = fillDesktopRect();
          panel.style.left = `${r.left}px`;
          panel.style.top = `${r.top}px`;
          panel.style.right = "auto";
          panel.style.bottom = "auto";
          panel.style.width = `${r.width}px`;
          panel.style.height = `${r.height}px`;
        } else {
          panel.style.left = "0";
          panel.style.top = "0";
          panel.style.right = "0";
          panel.style.bottom = "0";
          panel.style.width = "auto";
          panel.style.height = "auto";
        }
        panel.style.transform = "none";
        panel.style.maxWidth = "none";
        panel.style.maxHeight = "none";
        panel.style.borderRadius = "0";
      } else {
        panel.style.left = "50%";
        panel.style.top = "50%";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.width = "min(850px, calc(100vw - 40px))";
        panel.style.height = "min(800px, calc(100vh - 40px))";
        panel.style.transform = "translate(-50%, -50%)";
        panel.style.maxWidth = "";
        panel.style.maxHeight = "";
        panel.style.borderRadius = "24px";
      }
    };
    maxBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      maximized = !maximized;
      setMaxIcon(maximized);
      applyGeometry();
    });
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "pl-sa-close-btn";
    closeBtn.setAttribute("aria-label", getTranslation("pl.close"));
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", closePanel);
    const headerActions = document.createElement("div");
    headerActions.style.cssText = "display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:12px;";
    headerActions.appendChild(maxBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(titleSpan);
    header.appendChild(headerActions);
    panel.appendChild(header);
    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex:1;min-height:0;overflow:hidden;";
    panel.appendChild(body);
    const sidebar = document.createElement("div");
    sidebar.className = "pl-sa-sidebar";
    NAV_ITEMS.forEach((item) => {
      const el = document.createElement("div");
      el.className = "pl-sa-nav-item";
      if (item.id === activeNavId) el.classList.add("active");
      el.dataset.navId = item.id;
      const iconWrap = document.createElement("span");
      iconWrap.className = "pl-sa-nav-icon";
      iconWrap.style.background = item.iconBg;
      iconWrap.style.color = item.iconColor;
      iconWrap.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${item.iconBody}</svg>`;
      const label = document.createElement("span");
      label.textContent = getTranslation(item.labelKey);
      label.style.cssText = "font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      el.appendChild(iconWrap);
      el.appendChild(label);
      el.addEventListener("click", () => selectNav(item.id));
      sidebar.appendChild(el);
    });
    body.appendChild(sidebar);
    const contentArea = document.createElement("div");
    contentArea.className = "pl-sa-content-area";
    body.appendChild(contentArea);
    const type = PANEL_TYPE_MAP[activeNavId];
    if (type) schedulePanelContent(contentArea, type);
    return panel;
  };
  const selectNav = (id) => {
    activeNavId = id;
    const navItems = document.querySelectorAll(".pl-sa-nav-item");
    navItems.forEach((el) => {
      el.classList.toggle("active", el.dataset.navId === id);
    });
    const contentArea = document.querySelector(".pl-sa-content-area");
    if (contentArea) {
      const type = PANEL_TYPE_MAP[id];
      if (type) schedulePanelContent(contentArea, type);
    }
  };
  const closePanel = () => {
    panelOpen = false;
    window.dispatchEvent(new CustomEvent("pl:hide-panel-content"));
    const panel = document.querySelector(".pl-sa-panel");
    const backdrop = document.querySelector(".pl-sa-backdrop");
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();
  };
  const doInject = () => {
    if (document.querySelector("[data-pl-sa-wrap]")) return;
    if (!enabled) return;
    let settingsBtn = Array.from(document.querySelectorAll(
      'button, [role="button"], a, span, div'
    )).find((el) => {
      const text = (el.textContent || "").trim();
      return text === "\u8BBE\u7F6E" || text === "Settings";
    });
    if (!settingsBtn) {
      console.debug("[pl-sa] \u672A\u627E\u5230\u8BBE\u7F6E\u6309\u94AE\uFF0C\u7B49\u5F85 DOM \u52A0\u8F7D...");
      return;
    }
    const existing = document.querySelector("[data-pl-sa-wrap]");
    if (existing) {
      existing.__plCollapseRo?.disconnect();
      existing.remove();
    }
    const wrapper = document.createElement("div");
    wrapper.dataset.plSaWrap = "";
    wrapper.style.cssText = "position:relative;display:flex;flex-direction:column;gap:4px;width:100%;align-items:stretch;overflow:visible;";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.title = getTranslation("pl.title");
    menuBtn.style.cssText = [
      "box-sizing:border-box;cursor:pointer;width:calc(100% + 4px);height:42px;",
      "color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;",
      "flex:none;align-items:center;gap:8px;margin:4px -2px;padding:0 10px 0 8px;",
      "font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden;",
      "user-select:none;transition:background .15s ease;outline:none;"
    ].join("");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<path d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"/><path d="M8 9h3M8 12h3"/>';
    menuBtn.appendChild(svg);
    const label = document.createElement("span");
    label.className = "pl-sa-btn-label";
    label.textContent = getTranslation("pl.title");
    label.style.cssText = "font-size:14px;";
    menuBtn.appendChild(label);
    menuBtn.addEventListener("mouseenter", () => {
      if (!panelOpen) menuBtn.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.08))";
    });
    menuBtn.addEventListener("mouseleave", () => {
      if (!panelOpen) menuBtn.style.background = "transparent";
    });
    menuBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      menuBtn.style.background = "var(--dsw-alias-interactive-bg-active, rgba(127,127,127,0.14))";
    });
    menuBtn.addEventListener("mouseup", () => {
      if (!panelOpen) menuBtn.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.08))";
    });
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPanel(menuBtn);
      menuBtn.style.background = "transparent";
    });
    wrapper.appendChild(menuBtn);
    const syncCollapsed = () => {
      const collapsed = wrapper.getBoundingClientRect().width < 60;
      wrapper.classList.toggle("pl-sa-collapsed", collapsed);
    };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(syncCollapsed);
      wrapper.__plCollapseRo = ro;
      ro.observe(wrapper);
    }
    requestAnimationFrame(syncCollapsed);
    const parent = settingsBtn.parentNode;
    if (parent) parent.insertBefore(wrapper, settingsBtn);
    console.debug("[pl-sa] \u8BCD\u5E93\u6309\u94AE\u5DF2\u6CE8\u5165\u5230\u8BBE\u7F6E\u6309\u94AE\u4E0A\u65B9");
  };
  const openPanel = (_btn) => {
    if (panelOpen) {
      closePanel();
      return;
    }
    panelOpen = true;
    const panel = buildPanel();
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
    });
  };
  doInject();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(doInject, 100));
  } else {
    setTimeout(doInject, 500);
  }
  let observerRunning = false;
  const observer = new MutationObserver((mutations) => {
    if (disposed || observerRunning) return;
    observerRunning = true;
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLElement) {
            const candidates = [node, ...node.querySelectorAll('button, [role="button"], a, span, div')];
            for (const el of candidates) {
              const text = (el.textContent || "").trim();
              if (text === "\u8BBE\u7F6E" || text === "Settings") {
                doInject();
                break;
              }
            }
          }
        }
      }
    }
    observerRunning = false;
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const onSettingsChanged = (_e) => {
    if (disposed) return;
    refreshEnabled();
    if (panelOpen) {
      const panel = document.querySelector(".pl-sa-panel");
      if (panel) {
        panel.remove();
        panelOpen = false;
        const btn = document.querySelector("[data-pl-sa-wrap] button");
        if (btn) openPanel(btn);
      }
    }
  };
  window.addEventListener("pl:settings-changed", onSettingsChanged);
  const langObserver = new MutationObserver(() => {
    if (disposed) return;
    document.querySelectorAll(".pl-sa-btn-label").forEach((el) => {
      el.textContent = getTranslation("pl.title");
      const btn = el.closest("button");
      if (btn) btn.title = getTranslation("pl.title");
    });
  });
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang", "class"]
  });
  refreshEnabled();
  doInject();
  return () => {
    disposed = true;
    observer.disconnect();
    langObserver.disconnect();
    window.removeEventListener("pl:settings-changed", onSettingsChanged);
    closePanel();
    const wrapper = document.querySelector("[data-pl-sa-wrap]");
    if (wrapper) wrapper.remove();
  };
}

// src/client/utils/settings-nav-icon.ts
var SETTINGS_NAV_MARKER_PROMPT = "data-pl-settings-nav-prompt";
var SETTINGS_NAV_MARKER_DATA = "data-pl-settings-nav-data";
var NAV_ICON_MASK_PROMPT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z'/%3E%3Cpath d='M8 9h3M8 12h3' stroke-linecap='round'/%3E%3C/svg%3E";
var NAV_ICON_MASK_DATA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='9' ry='3'/%3E%3Cpath d='M3 5v14a9 3 0 0 0 18 0V5'/%3E%3Cpath d='M3 12a9 3 0 0 0 18 0'/%3E%3C/svg%3E";
var SETTINGS_NAV_CSS = `
[${SETTINGS_NAV_MARKER_PROMPT}] > svg:first-child,
[${SETTINGS_NAV_MARKER_DATA}] > svg:first-child {
  display: none;
}
[${SETTINGS_NAV_MARKER_PROMPT}]::before,
[${SETTINGS_NAV_MARKER_DATA}]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: center / contain no-repeat;
  mask: center / contain no-repeat;
}
[${SETTINGS_NAV_MARKER_PROMPT}]::before {
  -webkit-mask-image: url("${NAV_ICON_MASK_PROMPT}");
  mask-image: url("${NAV_ICON_MASK_PROMPT}");
}
[${SETTINGS_NAV_MARKER_DATA}]::before {
  -webkit-mask-image: url("${NAV_ICON_MASK_DATA}");
  mask-image: url("${NAV_ICON_MASK_DATA}");
}
`;
function registerSettingsNavIcon(label, marker) {
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const currentLabel = label().trim();
    const buttons = document.querySelectorAll(
      '[role="dialog"] nav button'
    );
    for (const button of buttons) {
      const matches = currentLabel.length > 0 && button.textContent?.trim() === currentLabel;
      if (matches) button.setAttribute(marker, "");
      else button.removeAttribute(marker);
    }
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  return () => {
    disposed = true;
    observer.disconnect();
    document.querySelectorAll(`[${marker}]`).forEach((element) => {
      element.removeAttribute(marker);
    });
  };
}

// src/client/utils/index.ts
var inject = [
  "slots",
  "locale",
  "workspaces",
  "uiConversation"
];
function apply(ctx) {
  registerWorkspaces(ctx.workspaces ?? null);
  setUiConversation(ctx.uiConversation ?? null);
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "prompt-library: dictionaries"
  );
  ctx.effect(
    () => {
      startDataChangedSubscription();
      return () => {
      };
    },
    "prompt-library: ws subscription"
  );
  const t = ctx.locale.bind(NS);
  setBoundT(t);
  ctx.effect(
    () => {
      try {
        return ctx.locale.subscribe?.(() => {
          window.dispatchEvent(new CustomEvent(LOCALE_CHANGED_EVENT));
        });
      } catch {
        return () => {
        };
      }
    },
    "prompt-library: locale change broadcast"
  );
  ctx.slots.inject(
    "conversation.input.left",
    () => ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library",
        order: 10,
        locale: NS
      },
      PromptLibraryButton
    )
  );
  ctx.slots.inject(
    "conversation.input.left",
    () => ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library-ai-polish",
        order: 11,
        locale: NS
      },
      AIPolishButton
    )
  );
  ctx.slots.inject(
    "conversation.input.dock",
    () => ctx.slots.register(
      {
        name: "conversation.input.dock",
        id: "prompt-library-recommend",
        order: 10,
        locale: NS
      },
      ContextRecommendations
    )
  );
  ctx.slots.inject(
    "conversation.input.dock",
    () => ctx.slots.register(
      {
        name: "conversation.input.dock",
        id: "prompt-library-modal-host",
        order: 11,
        locale: NS
      },
      PromptAssistant
    )
  );
  ctx.effect(
    () => {
      let style = document.getElementById("pl-settings-nav-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "pl-settings-nav-style";
        style.textContent = SETTINGS_NAV_CSS;
        document.head.appendChild(style);
      }
      const disposePromptMarker = registerSettingsNavIcon(
        () => t("pl.setSectionTitle"),
        SETTINGS_NAV_MARKER_PROMPT
      );
      return () => {
        disposePromptMarker();
        style?.remove();
      };
    },
    "prompt-library: settings navigation icon"
  );
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library",
        order: 30,
        locale: NS,
        label: () => t("pl.setSectionTitle")
      },
      SettingsSection
    )
  );
  ctx.effect(
    () => {
      let style = document.getElementById("pl-settings-above-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "pl-settings-above-style";
        style.textContent = SETTINGS_ABOVE_CSS;
        document.head.appendChild(style);
      }
      const dispose = registerSettingsAboveMenu(
        (key) => t(key),
        async () => {
          try {
            const settings = await getSettings();
            return { dataManagement: settings.dataManagementEnabled ?? true };
          } catch {
            return { dataManagement: true };
          }
        },
        async () => {
          try {
            const settings = await getSettings();
            return settings.settingsAboveMenuEnabled ?? true;
          } catch {
            return true;
          }
        }
      );
      return () => {
        dispose();
        style?.remove();
      };
    },
    "prompt-library: settings-above menu button"
  );
}
		module.exports = { apply, inject };
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map

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

// src/client/index.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);

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

// src/client/components/chat/PromptLibraryButton.tsx
var import_react19 = require("react");

// src/types.ts
var TITLE_MAX_LEN = 25;
function clampTitle(title) {
  return title.slice(0, TITLE_MAX_LEN);
}
var DEFAULT_SETTINGS = {
  autoLearnTag: "auto-learned",
  // 自动学习提示词使用的默认标签
  autoLearnMinLength: 60,
  // 自动学习的最小字符长度（少于该长度不学习）
  panelWidth: 360,
  // 右侧面板宽度（px）
  panelHeight: 500,
  // 右侧面板高度（px）
  maxPromptCount: 100,
  // 提示词最大存储数量（超出时按使用次数/更新时间淘汰）
  personTipInterval: 10,
  // 助手未悬停时自动冒气泡的间隔（秒）
  personTipDuration: 20,
  // 自动冒气泡的持续显示时长（秒）
  aiProvider: "",
  // AI 智能完善使用的 provider（留空自动发现）
  aiModel: "",
  // AI 智能完善使用的模型 id（留空自动发现）
  backupRetention: 15,
  // 自动备份保留的备份文件份数（超出自动清理最旧的）
  backupSchedule: "weekly",
  // 自动备份周期：daily / weekly / monthly
  backupFormat: "db",
  // 自动备份文件格式：db（数据库副本）/ json（JSON 导出）
  assistantCharacter: "classic",
  // 词库助手助手形象：经典米兔（默认）
  autoLearnEnabled: true,
  // 是否开启自动学习
  autoLearnManualConfirm: true,
  // 自动学习是否需手动确认（捕获到提示词后弹保存/取消）
  assistantEnabled: true,
  // 词库助手显隐（主开关，关闭后右侧面板也无法启用）
  rightPanelEnabled: true,
  // 是否启用右侧侧边栏展开/折叠（需先开启词库助手）
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
  hoverDetailEnabled: true,
  // 是否启用鼠标移入列表显示详情
  selectionAddEnabled: true,
  // 是否启用选中文本后浮动「添加提示词」入口
  contextRecommendEnabled: true,
  // 是否启用基于聊天上下文的提示词推荐
  aiEnrichEnabled: true,
  // 是否启用 AI 智能完善（生成标题/标签/摘要并改写正文）
  autoUpdateEnabled: true,
  // 自动更新：发现新版本后台自动安装
  announcementEnabled: true,
  // 公告入口：词库助手右键菜单展示「公告」
  levelEnabled: true,
  // 等级助手：助手等级徽章与右键菜单「成就」入口
  levelAnnouncementEnabled: true,
  // 我的等级公告：新成就解锁时的气泡播报
  personaEnabled: true,
  // 人格管理：词库助手右键菜单展示「人格管理」入口
  dashboardEnabled: true,
  // 看板：词库助手右键菜单展示「看板」入口（统计可视化）
  dataManagementEnabled: true,
  // 数据管理：词库助手右键菜单展示「数据管理」入口
  backupEnabled: true
  // 是否启用自动备份（启动时及按周期备份数据库）
};

// src/client/services/api.ts
var BASE = "/api/prompt-library/prompts";
var PERSONAS_BASE = "/api/prompt-library/personas";
async function send(method, path, body) {
  const init2 = { method, headers: {} };
  if (body !== void 0) {
    init2.headers = { "content-type": "application/json" };
    init2.body = JSON.stringify(body);
  }
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
function learnPrompt(body, tag, skipEnrich) {
  return send("POST", "/api/prompt-library/learn", { body, tag, skipEnrich });
}
function usePrompt(id) {
  return send("POST", `${BASE}/${encodeURIComponent(id)}`);
}
function exportPrompts(ids) {
  if (ids && ids.length > 0) {
    return send("POST", "/api/prompt-library/export", { ids });
  }
  return send("GET", "/api/prompt-library/export");
}
function importPrompts(data) {
  return send(
    "POST",
    "/api/prompt-library/import",
    data
  );
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
function listAvailableSkills() {
  return send("GET", "/api/prompt-library/skills/available");
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
function exportSkillEntries(entries) {
  return send("POST", "/api/prompt-library/skills/export/entries", { entries });
}
function describeSkill(payload) {
  return send("POST", "/api/prompt-library/skills/ai-describe", payload);
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
    keepVariables: opts?.keepVariables ?? true
  });
}
function getAiSelectables() {
  return send("GET", "/api/prompt-library/ai/providers");
}
function genIntro(lang) {
  return send("POST", "/api/prompt-library/ai/intro", { lang });
}
function getUpdate() {
  return send("GET", "/api/prompt-library/update");
}
function applyUpdate() {
  return send("POST", "/api/prompt-library/update/apply");
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
function listScopeTree() {
  return send("GET", `${PERSONAS_BASE}/scopes`);
}
function setPersonaBinding(path, personaId) {
  return send("PUT", `${PERSONAS_BASE}/scopes/binding`, { path, personaId });
}
function getActivity(lang) {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return send("GET", `/api/prompt-library/activity${q}`);
}
function getAssistantStatus(lang) {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return send("GET", `/api/prompt-library/assistant/status${q}`);
}
function getAnnouncement(lang) {
  const url = lang ? `/api/prompt-library/announcement?lang=${encodeURIComponent(lang)}` : "/api/prompt-library/announcement";
  return send("GET", url);
}
function getAnnouncementDaily(lang, date) {
  const params = [];
  if (lang) params.push(`lang=${encodeURIComponent(lang)}`);
  if (date) params.push(`date=${encodeURIComponent(date)}`);
  const qs = params.length > 0 ? `?${params.join("&")}` : "";
  return send("GET", `/api/prompt-library/announcement/daily${qs}`);
}
function getStats() {
  return send("GET", "/api/prompt-library/stats");
}
function listBackups() {
  return send("GET", "/api/prompt-library/backups");
}
function runBackup(format = "db") {
  return send("POST", "/api/prompt-library/backups/run", { format });
}
function restoreBackup(name) {
  return send(
    "POST",
    "/api/prompt-library/backups/restore",
    { name }
  );
}
function deleteBackup(name) {
  return send("POST", "/api/prompt-library/backups/delete", { name });
}

// src/client/components/chat/PromptLibraryButton.tsx
var import_dsh_client_ui_primitives12 = require("@deepseek-ai/dsh-client-ui-primitives");

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

// src/client/components/sidebar/SidebarPromptLibrary.tsx
var import_react16 = require("react");
var import_react_dom6 = require("react-dom");

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

// src/client/components/common/HoverDetail.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var MONO = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)"
};
var CARD_W = 300;
var BODY_H = 200;
var MARGIN = 10;
var HIDE_DELAY_MS = 320;
function useHoverDetail() {
  const [detail, setDetail] = (0, import_react.useState)(null);
  const lastPos = (0, import_react.useRef)(null);
  const hideTimer = (0, import_react.useRef)(null);
  const cancelHide = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      lastPos.current = null;
      setDetail(null);
    }, HIDE_DELAY_MS);
  };
  const show = (prompt, clientX, clientY) => {
    cancelHide();
    const last = lastPos.current;
    if (last && Math.abs(last.x - clientX) < 6 && Math.abs(last.y - clientY) < 6) {
      return;
    }
    lastPos.current = { x: clientX, y: clientY };
    const cardTotal = BODY_H + 78;
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + CARD_W > window.innerWidth - MARGIN) x = clientX - CARD_W - 14;
    if (y + cardTotal > window.innerHeight - MARGIN)
      y = Math.max(MARGIN, window.innerHeight - cardTotal - MARGIN);
    x = Math.max(MARGIN, x);
    setDetail({ prompt, x, y });
  };
  const leave = scheduleHide;
  const hide = () => {
    cancelHide();
    lastPos.current = null;
    setDetail(null);
  };
  const overlay = detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes pl-hover-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.pl-hover-card::-webkit-scrollbar{width:6px}.pl-hover-card::-webkit-scrollbar-thumb{background:rgba(196,211,232,0.25);border-radius:3px}.pl-hover-card::-webkit-scrollbar-thumb:hover{background:rgba(196,211,232,0.4)}` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        role: "tooltip",
        className: "pl-hover-card",
        onMouseEnter: cancelHide,
        onMouseLeave: scheduleHide,
        style: {
          position: "fixed",
          left: detail.x,
          top: detail.y,
          zIndex: 2147483646,
          width: CARD_W,
          boxSizing: "border-box",
          padding: "10px 12px",
          color: TONE.text,
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 10,
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
          pointerEvents: "auto",
          animation: "pl-hover-pop 0.24s cubic-bezier(.22,1,.36,1)"
        },
        children: [
          detail.prompt.title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              style: {
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.4,
                color: TONE.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginBottom: 6
              },
              children: clampTitle(detail.prompt.title)
            }
          ) : null,
          detail.prompt.tags && detail.prompt.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginBottom: 8
              },
              children: [
                detail.prompt.tags.slice(0, 4).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "1px 7px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      lineHeight: 1.7,
                      background: TONE.accentSoft,
                      color: TONE.accent,
                      whiteSpace: "nowrap"
                    },
                    children: tag
                  },
                  tag
                )),
                detail.prompt.tags.length > 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10.5, color: TONE.quiet, padding: "1px 0" }, children: [
                  "+",
                  detail.prompt.tags.length - 4
                ] }) : null
              ]
            }
          ) : null,
          detail.prompt.title || detail.prompt.tags && detail.prompt.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: TONE.border, margin: "0 0 8px" } }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              style: {
                maxHeight: BODY_H,
                overflowY: "auto",
                color: TONE.muted,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              },
              children: detail.prompt.body
            }
          )
        ]
      }
    )
  ] }) : null;
  return { show, leave, hide, overlay };
}

// src/client/components/sidebar/SidebarPromptLibrary.tsx
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/services/data-sync.ts
var import_react2 = require("react");
var DATA_CHANGED_EVENT = "pl:data-changed";
var FILL_DRAFT_EVENT = "pl:fill-draft";
var EXPORT_DOWNLOADED_EVENT = "pl:export-downloaded";
function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}
var SSE_URL = "/api/prompt-library/events";
var subscribed = false;
var esRef = null;
function startDataChangedSubscription() {
  if (subscribed || typeof window === "undefined" || typeof EventSource === "undefined") return;
  subscribed = true;
  try {
    const es = new EventSource(SSE_URL);
    esRef = es;
    es.addEventListener("data-changed", () => notifyDataChanged());
    es.addEventListener("fill-draft", (ev) => {
      let body = "";
      try {
        body = ev.data ? JSON.parse(ev.data) : "";
      } catch {
        body = "";
      }
      if (!body) return;
      window.dispatchEvent(new CustomEvent(FILL_DRAFT_EVENT, { detail: { body } }));
    });
    es.addEventListener("export-download", (ev) => {
      let count = 0;
      try {
        const { name, json } = JSON.parse(ev.data);
        if (!json) return;
        try {
          const parsed = JSON.parse(json);
          count = Array.isArray(parsed.prompts) ? parsed.prompts.length : 0;
        } catch {
          count = 0;
        }
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
      if (count > 0) {
        window.dispatchEvent(new CustomEvent(EXPORT_DOWNLOADED_EVENT, { detail: { count } }));
      }
    });
    const onUnload = () => {
      es.close();
      esRef = null;
      subscribed = false;
    };
    window.addEventListener("beforeunload", onUnload, { once: true });
  } catch {
    subscribed = false;
    esRef = null;
  }
}
function useDataChanged(reload) {
  const reloadRef = (0, import_react2.useRef)(reload);
  reloadRef.current = reload;
  (0, import_react2.useEffect)(() => {
    startDataChangedSubscription();
    const onChanged = () => reloadRef.current();
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
  }, []);
}
function useFillDraft(fill) {
  const fillRef = (0, import_react2.useRef)(fill);
  fillRef.current = fill;
  (0, import_react2.useEffect)(() => {
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
  const onRef = (0, import_react2.useRef)(onDownloaded);
  onRef.current = onDownloaded;
  (0, import_react2.useEffect)(() => {
    startDataChangedSubscription();
    const handler = (ev) => {
      const count = ev.detail?.count ?? 0;
      if (count > 0) onRef.current(count);
    };
    window.addEventListener(EXPORT_DOWNLOADED_EVENT, handler);
    return () => window.removeEventListener(EXPORT_DOWNLOADED_EVENT, handler);
  }, []);
}

// src/client/utils/theme.ts
var import_react3 = require("react");
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
  const [dark, setDark] = (0, import_react3.useState)(isDarkMode());
  (0, import_react3.useEffect)(() => {
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

// src/client/components/assistant/PromptAssistant.tsx
var import_react15 = require("react");
var import_react_dom5 = require("react-dom");

// src/client/i18n/i18n.ts
var NS = "prompt-library";
var zh = {
  // 通用按钮 / 提示
  "pl.title": "\u8BCD\u5E93",
  "pl.search": "\u641C\u7D22\u2026",
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
  "pl.titleField": "\u6807\u9898",
  "pl.bodyField": "\u6B63\u6587",
  "pl.insertVariable": "\u63D2\u5165\u53D8\u91CF",
  "pl.insertVariableTitle": "\u5728\u5149\u6807\u5904\u63D2\u5165\u53D8\u91CF\u6807\u7B7E {{}}\uFF08\u9009\u4E2D\u6587\u672C\u53EF\u4F5C\u4E3A\u53D8\u91CF\u540D\uFF09",
  "pl.insertVariableDefault": "\u53D8\u91CF\u540D",
  "pl.tagsField": "\u6807\u7B7E\uFF08\u5355\u9009\uFF09",
  "pl.tagsHint": "\u4ECE\u5DF2\u6709\u6807\u7B7E\u4E2D\u9009\u62E9\u4E00\u4E2A\u6807\u7B7E",
  "pl.tagsNoneSelect": "\uFF08\u65E0\u6807\u7B7E\uFF09",
  "pl.requireTitleBody": "\u6807\u9898\u548C\u6B63\u6587\u4E3A\u5FC5\u586B\u9879",
  "pl.confirmDelete": '\u5220\u9664 "{title}"\uFF1F\u5220\u9664\u540E\u5C06\u79FB\u5165\u56DE\u6536\u7AD9\uFF0C\u53EF\u5728\u300C\u8BCD\u5E93\u7BA1\u7406 - \u56DE\u6536\u7AD9\u300D\u4E2D\u6062\u590D\u3002',
  "pl.confirmSave": "\u786E\u8BA4\u4FDD\u5B58\u63D0\u793A\u8BCD",
  "pl.recentNew": "\u65B0\u589E",
  "pl.learnedToast": "\u5DF2\u81EA\u52A8\u5B66\u4E60",
  "pl.learnFound": "\u68C0\u6D4B\u5230\u53EF\u5B66\u4E60\u63D0\u793A\u8BCD",
  "pl.undo": "\u64A4\u9500",
  "pl.refinedDone": "\u5DF2\u5B8C\u6210 AI \u5B8C\u5584",
  "pl.refinePending": "\u5C1A\u672A\u5B8C\u6210 AI \u5B8C\u5584",
  "pl.original": "\u539F\u7A3F",
  "pl.polished": "\u6DA6\u8272\u7A3F",
  "pl.polishReconfirmMsg": "\u300C{title}\u300D\u5DF2\u8FDB\u884C\u8FC7 AI \u4F18\u5316\uFF0C\u662F\u5426\u7EE7\u7EED\u4F18\u5316\uFF1F",
  "pl.polishReconfirmOk": "\u7EE7\u7EED\u4F18\u5316",
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
  "pl.polishDoneLearn": "\u4F18\u5316\u5B8C\u6210\uFF0C\u8BF7\u590D\u5236\u6216\u63D2\u5165\u4F7F\u7528",
  "pl.polishFail": "AI \u4F18\u5316\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1",
  "pl.polishReplaced": "\u5DF2\u66FF\u6362\u5230\u8F93\u5165\u6846",
  "pl.polishHoverContent": "\u4F18\u5316\u8F93\u5165\u5185\u5BB9",
  "pl.polishResult": "AI \u4F18\u5316\u7ED3\u679C",
  "pl.polishResultAria": "\u4F18\u5316\u7ED3\u679C",
  "pl.replaceContent": "\u66FF\u6362\u5185\u5BB9",
  // 侧边栏
  "pl.sidebar.expand": "\u5C55\u5F00\u8BCD\u5E93",
  "pl.sidebar.collapse": "\u6700\u5C0F\u5316\u5230\u8BCD\u5E93\u52A9\u624B",
  "pl.sidebar.uncategorized": "\u672A\u5206\u7C7B",
  "pl.sidebar.groupCount": "({count})",
  "pl.sidebar.usageCount": "{count}\u6B21",
  "pl.sidebar.total": "\u5171 {count} \u6761\u63D0\u793A\u8BCD",
  "pl.sidebar.tagTotal": "{count} \u4E2A\u6807\u7B7E",
  "pl.sidebar.recent": "\u6700\u8FD1\u4F7F\u7528",
  "pl.saveToLibrary": "\u4FDD\u5B58\u5230\u8BCD\u5E93",
  "pl.floating.title": "\u8BCD\u5E93\u52A9\u624B",
  "pl.floating.hint": "\u70B9\u51FB\u5C55\u5F00\u8BCD\u5E93",
  "pl.floating.resize": "\u8C03\u6574\u5927\u5C0F",
  "pl.gamification.unlockTitle": "\u6210\u5C31\u89E3\u9501\uFF01",
  "pl.gamification.progress": "\u518D\u7D2F\u8BA1 {n} \u70B9\u6D3B\u8DC3\u79EF\u5206\u5347\u7EA7",
  "pl.gamification.maxed": "\u5DF2\u6EE1\u7EA7",
  "pl.tap.0": "\u563F\u563F\uFF0C\u522B\u6233\u5566\uFF5E",
  "pl.tap.1": "\u518D\u6233\u6211\u8981\u75D2\u4E86\uFF01",
  "pl.tap.2": "\u6211\u53EF\u4E0D\u662F\u89E3\u538B\u795E\u5668\u2026",
  "pl.tap.3": "\u597D\u5566\u597D\u5566\uFF0C\u542C\u4F60\u7684",
  "pl.tap.dizzy": "\u8F6C\u6655\u4E86\u2026\u8BA9\u6211\u6B47\u4F1A\u513F",
  "pl.lucky.0": "\u5F00\u5956\u65F6\u523B\uFF5E\u4ECA\u65E5\u597D\u8FD0 +1\u2728",
  "pl.lucky.1": "\u6361\u5230\u4E00\u679A\u5E78\u8FD0\u786C\u5E01\uFF0C\u5FEB\u7528\u8D77\u6765\uFF01",
  "pl.lucky.2": "\u9E3F\u8FD0\u5F53\u5934\uFF0C\u4ECA\u5929\u8BCD\u5E93\u4F1A\u65FA\u4F60\u2728",
  "pl.lucky.3": "\u606D\u559C\u62BD\u4E2D\u300C\u7075\u611F\u52A0\u6210\u300DBUFF\uFF01",
  "pl.lucky.4": "\u96C6\u9F50\u4E03\u9897\u661F\u661F\uFF0C\u53EC\u5524\u4E00\u4E2A\u597D\u70B9\u5B50\uFF5E",
  "pl.lucky.5": "\u6B64\u7B7E\u5927\u5409\uFF1A\u591A\u5199\u4E00\u53E5\uFF0C\u591A\u4E00\u4EFD\u6536\u83B7",
  "pl.ctx.openPanel": "\u5DE5\u5177\u9762\u677F",
  "pl.ctx.announce": "\u516C\u544A",
  "pl.ctx.achievements": "\u6210\u5C31",
  "pl.ctx.personas": "\u4EBA\u683C\u7BA1\u7406",
  "pl.ctx.dashboard": "\u770B\u677F",
  "pl.ctx.dataManagement": "\u6570\u636E\u7BA1\u7406",
  "pl.personas.title": "\u4EBA\u683C\u7BA1\u7406",
  "pl.personas.listTitle": "\u7075\u9B42\u7BA1\u7406",
  "pl.personas.listHint": "\u521B\u5EFA\u3001\u7F16\u8F91\u591A\u4EFD\u4EBA\u683C\uFF08SOUL\uFF09\uFF0C\u5E76\u7ED1\u5B9A\u5230\u5DE5\u4F5C\u533A / \u9879\u76EE",
  "pl.personas.createTitle": "\u65B0\u5EFA\u7075\u9B42",
  "pl.personas.createHint": "\u7ED9\u65B0\u4EBA\u683C\u8D77\u4E2A\u540D\u5B57\uFF0C\u521B\u5EFA\u540E\u4F1A\u7ACB\u5373\u8FDB\u5165\u6B63\u6587\u7F16\u8F91",
  "pl.personas.previewEmpty": "\u6682\u65E0\u5185\u5BB9\uFF0C\u70B9\u300C\u7F16\u8F91\u300D\u5F00\u59CB\u7F16\u5199",
  "pl.personas.new": "\u65B0\u5EFA\u4EBA\u683C",
  "pl.personas.namePlaceholder": "\u7ED9\u5B83\u8D77\u4E2A\u540D\u5B57",
  "pl.personas.defaultBadge": "\u9ED8\u8BA4",
  "pl.personas.enabled": "\u542F\u7528",
  "pl.personas.edit": "\u7F16\u8F91",
  "pl.personas.cancel": "\u53D6\u6D88",
  "pl.personas.save": "\u4FDD\u5B58",
  "pl.personas.delete": "\u5220\u9664",
  "pl.personas.done": "\u5B8C\u6210",
  "pl.personas.contentLabel": "\u4EBA\u683C\u5185\u5BB9\uFF08SOUL\uFF09",
  "pl.personas.contentHint": "\u6B64\u5185\u5BB9\u968F\u5BF9\u8BDD\u6CE8\u5165\uFF0C\u7EA6\u675F AI \u7684\u8EAB\u4EFD / \u8BED\u6C14 / \u5DE5\u4F5C\u89C4\u8303",
  "pl.personas.viewDetail": "\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5",
  "pl.personas.detailTitle": "\u4EBA\u683C\u8BE6\u60C5",
  "pl.personas.detailEmpty": "\u8BE5\u4EBA\u683C\u6682\u65E0\u5185\u5BB9",
  "pl.personas.empty": "\u6682\u65E0\u81EA\u5B9A\u4E49\u4EBA\u683C\uFF0C\u70B9\u53F3\u4E0A\u89D2\u300C\u65B0\u5EFA\u4EBA\u683C\u300D\u5F00\u59CB\u521B\u5EFA",
  "pl.personas.note": "\u4EBA\u683C\u6309\u300C\u5DE5\u4F5C\u533A / \u9879\u76EE\u300D\u7ED1\u5B9A\uFF1A\u5728\u8BE5\u8DEF\u5F84\u4E0B\u6253\u5F00\u7684\u4F1A\u8BDD\u81EA\u52A8\u91C7\u7528\u5BF9\u5E94\u7684 SOUL\uFF1B\u672A\u7ED1\u5B9A\u7684\u8DEF\u5F84\u56DE\u843D\u5230\u9ED8\u8BA4\u4EBA\u683C\u6216\u4E0A\u5C42\u7ED1\u5B9A",
  "pl.personas.defaultReadonly": "\u5185\u7F6E\u9ED8\u8BA4\u4EBA\u683C\u4E0D\u53EF\u6539\u540D\u6216\u5220\u9664\uFF0C\u53EF\u76F4\u63A5\u7F16\u8F91\u5176\u5185\u5BB9",
  "pl.personas.deleteConfirm": "\u786E\u5B9A\u5220\u9664\u4EBA\u683C\u300C{name}\u300D\uFF1F\u5176\u4F1A\u8BDD\u7ED1\u5B9A\u4E0E SOUL \u6587\u4EF6\u5C06\u4E00\u5E76\u5220\u9664",
  "pl.personas.nameError": "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
  "pl.personas.opFailed": "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
  "pl.personas.scopes.title": "\u5DE5\u4F5C\u533A / \u9879\u76EE\u7ED1\u5B9A",
  "pl.personas.scopes.hint": "\u4E3A\u67D0\u4E2A\u5DE5\u4F5C\u533A\u6216\u9879\u76EE\u6307\u5B9A\u4EBA\u683C\uFF0C\u53EF\u5C40\u90E8\u8986\u76D6\u4E0A\u5C42\uFF1A\u9879\u76EE\u672A\u5355\u72EC\u8BBE\u5B9A\u65F6\uFF0C\u4F1A\u6CBF\u7528\u5176\u4E0A\u5C42\u5DE5\u4F5C\u533A\u7684\u7ED1\u5B9A",
  "pl.personas.scopes.defaultOption": "\u9ED8\u8BA4\uFF08\u8DDF\u968F\u4E0A\u5C42\uFF09",
  "pl.personas.scopes.empty": "\u6682\u65E0\u53EF\u7528\u5DE5\u4F5C\u533A",
  "pl.personas.scopes.workspace": "\u5DE5\u4F5C\u533A",
  "pl.personas.scopes.project": "\u9879\u76EE",
  "pl.achievements.title": "\u6211\u7684\u6210\u5C31",
  "pl.achievements.count": "\u5DF2\u89E3\u9501 {n} / {total} \u9879\u6210\u5C31",
  "pl.achievements.empty": "\u6682\u65E0\u6210\u5C31\uFF0C\u5FEB\u53BB\u7528\u8BCD\u5E93\u5427",
  "pl.achievements.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "pl.achievements.levelLabel": "\u5F53\u524D\u7B49\u7EA7",
  "pl.achievements.lockedHint": "\u7EE7\u7EED\u4F7F\u7528\u8BCD\u5E93\u5373\u53EF\u89E3\u9501",
  "pl.achievements.decayed": "\u8DDD\u4E0A\u6B21\u4F7F\u7528 {days} \u5929\uFF0C\u7B49\u7EA7\u5DF2\u56DE\u843D",
  "pl.achievements.dropGap": "\u8DDD\u56DE\u843D\u81F3\u4E0A\u4E00\u6863\u300C{prev}\u300D\u8FD8\u5DEE {n} \u5206",
  "pl.achievements.all": "\u5168\u90E8",
  "pl.achievements.unlockAssistant": "\u9690\u7EA6\u6709\u80A1\u529B\u91CF\u5728\u4F4E\u8BED\uFF1A\u5F53\u8BCD\u5E93\u4E4B\u5DC5\u8FCE\u4F60\u767B\u9876\u65F6\uFF0C\u67D0\u6BB5\u5C18\u5C01\u7684\u60CA\u559C\u4FBF\u4F1A\u82CF\u9192\u2026",
  "pl.achievements.unlockAssistantDone": "\u529B\u91CF\u7684\u5C01\u5370\u5DF2\u7136\u89E3\u9664\uFF01\u53BB\u300C\u8BBE\u7F6E\u300D\u91CC\u63A2\u4E00\u63A2\uFF0C\u4E5F\u8BB8\u85CF\u7740\u5F85\u4F60\u4EB2\u624B\u63ED\u5F00\u7684\u5F69\u86CB\u3002",
  "pl.rarity.common": "\u666E\u901A",
  "pl.rarity.rare": "\u7A00\u6709",
  "pl.rarity.epic": "\u53F2\u8BD7",
  "pl.rarity.legendary": "\u4F20\u8BF4",
  "pl.rarity.myth": "\u795E\u8BDD",
  "pl.achievements.rankLabel": "\u6210\u957F\u79F0\u53F7",
  "pl.achievements.points": "\u6210\u5C31\u70B9",
  "pl.achievements.collected": "\u5DF2\u8FBE\u6210 {n} \u9879",
  "pl.achievements.rarity": "\u54C1\u8D28\uFF1A{name} \xB7 \u89E3\u9501\u53EF\u5F97 {points} \u70B9",
  "pl.achievements.progress": "{progress} / {target}",
  "pl.achievements.upNext": "\u5373\u5C06\u89E3\u9501",
  "pl.achievements.upNextEmpty": "\u79BB\u89E3\u9501\u90FD\u8FD8\u6709\u8DDD\u79BB\uFF0C\u5FEB\u53BB\u7528\u8D77\u6765\u5427",
  "pl.achievements.levelDetail": "\u7B49\u7EA7\u8BE6\u60C5",
  "pl.achievements.levelDetailHide": "\u6536\u8D77\u8BE6\u60C5",
  "pl.achievements.levelThresholds": "\u5404\u7B49\u7EA7\u6240\u9700\u79EF\u5206",
  "pl.achievements.levelNeed": "\u9700 {n} \u79EF\u5206",
  "pl.achievements.pointSources": "\u79EF\u5206\u83B7\u53D6\u6765\u8DEF",
  "pl.achievements.decayRule": "\u8870\u51CF\u89C4\u5219",
  "pl.mood.happy": "\u4ECA\u5929\u5FC3\u60C5\u5F88\u68D2\uFF0C\u5143\u6C14\u6EE1\u6EE1",
  "pl.mood.sad": "\u4ECA\u5929\u9047\u5230\u70B9\u5C0F\u574E\u5777\uFF0C\u6709\u4E9B\u4F4E\u843D",
  "pl.intro.0": "\u6167\u5FC3\u8BB0\u4E4B\uFF0C\u968F\u53D6\u968F\u7528\uFF1B\u7075\u611F\u81F3\u6B64\uFF0C\u7686\u6709\u6240\u5F52\u3002",
  "pl.intro.1": "AI \u6DA6\u9970\uFF0C\u5982\u7422\u5982\u78E8\uFF1B\u70BC\u5B57\u6210\u53E5\uFF0C\u8D8A\u53D1\u7CBE\u5999\u3002",
  "pl.intro.2": "\u5206\u95E8\u522B\u7C7B\uFF0C\u6309\u56FE\u7D22\u9AA5\uFF1B\u5E38\u5B66\u5E38\u65B0\uFF0C\u6E29\u6545\u77E5\u65B0\u3002",
  "pl.intro.3": "\u4E00\u952E\u70B9\u53D6\uFF0C\u5373\u6210\u6587\u7AE0\uFF1B\u53D8\u91CF\u8F7B\u586B\uFF0C\u5F97\u5FC3\u5E94\u624B\u3002",
  "pl.intro.4": "\u5C0F\u5C0F\u8BCD\u5E93\uFF0C\u56DB\u65F6\u53EF\u601D\uFF1B\u5999\u53E5\u5E38\u65B0\uFF0C\u5982\u6570\u5BB6\u73CD\u3002",
  // 公告 / 使用手册
  "pl.announce.title": "\u8BCD\u5E93\u52A9\u624B",
  "pl.announce.dismiss": "\u77E5\u9053\u4E86",
  "pl.announce.manualTitle": "\u4F7F\u7528\u624B\u518C",
  "pl.announce.noticeTitle": "\u7248\u672C\u8BF4\u660E",
  "pl.announce.noNotice": "\u6682\u65E0\u7248\u672C\u8BF4\u660E",
  "pl.announce.masthead": "\u8BCD\u5E93\u65E5\u62A5",
  "pl.announce.mastheadSub": "\u4ECA\u65E5\u8BCD\u5E93 \xB7 \u79D1\u6280\u89C6\u91CE",
  "pl.announce.dailyTitle": "\u6BCF\u65E5\u65E5\u62A5",
  "pl.announce.techTitle": "\u6210\u5C31\u901F\u62A5",
  "pl.announce.noDaily": "\u4ECA\u65E5\u6682\u65E0\u63A8\u8350",
  "pl.announce.openLink": "\u9605\u8BFB\u539F\u6587",
  "pl.announce.tabAnnounce": "\u516C\u544A",
  "pl.announce.tabBoard": "\u770B\u677F",
  "pl.announce.prevEdition": "\u4E0A\u4E00\u671F",
  "pl.announce.nextEdition": "\u4E0B\u4E00\u671F",
  "pl.announce.today": "\u4ECA\u65E5",
  "pl.announce.history": "\u5386\u53F2",
  "pl.announce.editionNo": "\u7B2C {n} \u671F",
  "pl.announce.aiSuggestTitle": "AI \u5EFA\u8BAE",
  "pl.announce.aiSuggestEmpty": "AI \u6682\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u751F\u6210\u5EFA\u8BAE",
  "pl.announce.aiSuggestLoading": "AI \u6B63\u5728\u751F\u6210\u5EFA\u8BAE\u2026",
  "pl.announce.manual.0": "\u8F7B\u6572 # \u952E\uFF0C\u8BCD\u5E93\u5373\u73B0\uFF1B\u5B9E\u65F6\u7B5B\u9009\uFF0C\u2191\u2193 \u62E9\u53D6\uFF0C\u56DE\u8F66\u6210\u6587\u3002",
  "pl.announce.manual.1": "\u6167\u773C\u8BC6\u73E0\uFF0C\u81EA\u52A8\u6536\u85CF\u804A\u5929\u4E2D\u5B9D\u8D35\u63D0\u793A\u8BCD\uFF1B\u968F\u65F6\u7F16\u8F91\u5220\u9664\uFF0C\u5E38\u5B66\u5E38\u65B0\u3002",
  "pl.announce.manual.2": "AI \u6DA6\u8272\uFF0C\u5982\u7422\u5982\u78E8\uFF1B\u667A\u80FD\u5B8C\u5584\uFF0C\u53E5\u53E5\u7CBE\u5999\u3002",
  "pl.announce.manual.3": "{{\u53D8\u91CF}} \u751F\u82B1\uFF0C\u63D2\u524D\u5F39\u7A97\u9010\u9879\u586B\u5199\uFF1B\u5957\u7528\u6A21\u677F\uFF0C\u4ECE\u5BB9\u843D\u7B14\u3002",
  "pl.announce.manual.4": "\u9009\u4E2D\u6587\u672C\uFF0C\u4E00\u952E\u526A\u85CF\u5165\u5E93\uFF1B\u6807\u7B7E\u5F52\u7C7B\uFF0C\u6309\u56FE\u7D22\u9AA5\u3002",
  "pl.announce.manual.5": "\u4FA7\u680F\u4E0E\u804A\u5929\u53CC\u5165\u53E3\u7BA1\u7406\uFF1B\u7EDF\u8BA1\u6D1E\u5BDF\u3001\u5BFC\u5165\u5BFC\u51FA\u5907\u4EFD\uFF0C\u8BCD\u6D77\u62FE\u8D1D\uFF0C\u5C3D\u5728\u638C\u63E1\u3002",
  // 导入导出 / 备份恢复
  "pl.moduleImportExport": "\u5BFC\u5165\u5BFC\u51FA",
  "pl.moduleImportExportDesc": "\u652F\u6301\u5E02\u9762\u5E38\u7528\u683C\u5F0F\uFF08JSON / CSV / Markdown / \u6587\u672C\uFF09\u5BFC\u5165\u5BFC\u51FA\u63D0\u793A\u8BCD\u3002",
  "pl.exportSection": "\u5BFC\u51FA",
  "pl.exportSectionDesc": "\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u63D0\u793A\u8BCD\uFF0C\u9009\u62E9\u683C\u5F0F\u540E\u70B9\u51FB\u300C\u5BFC\u51FA\u9009\u4E2D\u300D\u3002",
  "pl.importSection": "\u5BFC\u5165",
  "pl.importSectionDesc": "\u4ECE\u6570\u636E\u6587\u4EF6\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u3001\u6821\u9A8C\u540E\u5408\u5E76\u5165\u5E93\u3002",
  "pl.moduleTags": "\u6807\u7B7E\u7BA1\u7406",
  "pl.moduleTagsDesc": "\u96C6\u4E2D\u7BA1\u7406\u63D0\u793A\u8BCD\u6807\u7B7E\uFF0C\u652F\u6301\u65B0\u5EFA / \u91CD\u547D\u540D / \u5220\u9664\u3002",
  "pl.moduleTrash": "\u56DE\u6536\u7AD9",
  "pl.moduleTrashDesc": "\u96C6\u4E2D\u7BA1\u7406\u5DF2\u5220\u9664\u7684\u63D0\u793A\u8BCD\uFF0C\u652F\u6301\u6062\u590D / \u6C38\u4E45\u5220\u9664\u3002",
  "pl.export": "\u5BFC\u51FA",
  "pl.import": "\u5BFC\u5165",
  "pl.exportTitle": "\u5BFC\u51FA\u52FE\u9009\u7684\u63D0\u793A\u8BCD\u4E3A\u5907\u4EFD\u6587\u4EF6",
  "pl.importTitle": "\u4ECE\u5907\u4EFD\u6587\u4EF6\u5BFC\u5165\uFF08\u5408\u5E76\u5230\u5F53\u524D\u8BCD\u5E93\uFF09",
  "pl.exported": "\u5DF2\u5BFC\u51FA {count} \u6761\u63D0\u793A\u8BCD",
  "pl.exportSelectAll": "\u5168\u9009",
  "pl.exportSelected": "\u5BFC\u51FA\u9009\u4E2D",
  "pl.viewList": "\u5217\u8868",
  "pl.viewGroup": "\u5206\u7EC4",
  "pl.exportNeedSelect": "\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u63D0\u793A\u8BCD",
  "pl.skillImport": "\u4ECE Skills \u5BFC\u5165",
  "pl.skillImporting": "\u5BFC\u5165\u4E2D\u2026",
  "pl.skillImportBtnTitle": "\u6253\u5F00\u6280\u80FD\u5BFC\u5165\u5F39\u7A97\uFF1A\u9009\u62E9\u672C\u5730 md \u6587\u4EF6\u6216\u4ECE Skills \u76EE\u5F55\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u5185\u5BB9\u3001\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u4FDD\u5B58\u5165\u5E93",
  "pl.skillImportConfirm": "\u786E\u8BA4\u4ECE ~/.dsh/skills \u9006\u5411\u5BFC\u5165\uFF1F\u5C06\u628A\u6BCF\u4E2A SKILL.md \u751F\u6210\u4E3A\u4E00\u6761\u63D0\u793A\u8BCD\uFF08\u540C\u540D\u6280\u80FD\u91CD\u590D\u5BFC\u5165\u4F1A\u8986\u76D6\u66F4\u65B0\uFF09\u3002",
  "pl.skillImportDone": "\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}",
  "pl.skillImportErrors": "\uFF08\u5931\u8D25 {n} \u4E2A\uFF09",
  "pl.skillImportNone": "\u6280\u80FD\u76EE\u5F55\u4E3A\u7A7A\uFF0C\u6CA1\u6709\u53EF\u5BFC\u5165\u7684 SKILL.md",
  "pl.skillModal.title": "\u5BFC\u5165\u6280\u80FD",
  "pl.skillModal.subtitle": "\u9009\u62E9\u672C\u5730 md \u6587\u4EF6\u6216\u626B\u63CF Skills \u76EE\u5F55\u5BFC\u5165\uFF0C\u53EF\u7F16\u8F91\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u5E76\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF1B\u6821\u9A8C\u901A\u8FC7\u540E\u624D\u80FD\u4FDD\u5B58\u3002",
  "pl.skillModal.chooseFile": "\u9009\u62E9 md \u6587\u4EF6",
  "pl.skillModal.scanSkills": "\u626B\u63CF Skills \u76EE\u5F55",
  "pl.skillModal.titleLabel": "\u6807\u9898",
  "pl.skillModal.summaryLabel": "\u6458\u8981",
  "pl.skillModal.bodyLabel": "\u6B63\u6587",
  "pl.skillModal.insertVar": "\u63D2\u5165\u53D8\u91CF",
  "pl.skillModal.validate": "\u6821\u9A8C",
  "pl.skillModal.validatePass": "\u6821\u9A8C\u901A\u8FC7\uFF0C\u53EF\u4EE5\u4FDD\u5B58",
  "pl.skillModal.validateFail": "\u6821\u9A8C\u672A\u901A\u8FC7\uFF1A{errors}",
  "pl.skillModal.save": "\u4FDD\u5B58\u5230\u8BCD\u5E93",
  "pl.skillModal.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "pl.skillModal.saved": "\u4FDD\u5B58\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}",
  "pl.skillModal.savedErrors": "\uFF08\u5931\u8D25 {n} \u4E2A\uFF09",
  "pl.skillModal.noEntry": "\u5C1A\u672A\u6DFB\u52A0\u4EFB\u4F55\u6761\u76EE\uFF0C\u8BF7\u5148\u9009\u62E9 md \u6587\u4EF6\u6216\u626B\u63CF Skills \u76EE\u5F55",
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
  "pl.skillModal.collapse": "\u6298\u53E0",
  "pl.skillModal.expand": "\u5C55\u5F00",
  "pl.skillModal.issueCount": "\u5B58\u5728 {count} \u4E2A\u95EE\u9898",
  "pl.skillModal.fixAll": "\u4E00\u952E\u4FEE\u590D",
  "pl.skillModal.fixHint": "\u5176\u4E2D {fixable} \u5904\u53EF\u81EA\u52A8\u4FEE\u590D",
  "pl.skillModal.fixDone": "\u5DF2\u4FEE\u590D {count} \u5904\u95EE\u9898\uFF1A",
  "pl.skillModal.fixTitle": "\u5DF2\u8865\u5168\u6807\u9898\u300C{title}\u300D",
  "pl.skillModal.fixBodyVars": "\u5DF2\u81EA\u52A8\u4FEE\u590D\u6B63\u6587\u6A21\u677F\u53D8\u91CF\u683C\u5F0F",
  "pl.skillModal.varFixDefault": "\u53D8\u91CF",
  "pl.skillModal.fromLibrary": "\u8BCD\u5E93",
  "pl.skillModal.saveExport": "\u5199\u5165\u5230 Skills",
  "pl.skillModal.savedExport": "\u5BFC\u51FA\u5B8C\u6210\uFF1A\u5DF2\u5199\u76D8 {exported} \u4E2A\u6280\u80FD",
  "pl.skillModal.savedExportErrors": "\uFF08\u5931\u8D25 {n} \u4E2A\uFF09",
  "pl.skillModal.exportTitle": "\u5BFC\u51FA\u6280\u80FD",
  "pl.skillModal.exportSubtitle": "\u628A\u52FE\u9009\u7684\u63D0\u793A\u8BCD\u7F16\u8F91\u4E3A\u6280\u80FD\u5E76\u5199\u76D8\u5230 ~/.dsh/skills/<name>/SKILL.md\uFF1B\u53EF\u4FEE\u6539\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u5E76\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF1B\u300C\u6821\u9A8C\u5E76 AI \u751F\u6210\u300D\u4F1A\u5148\u6821\u9A8C\uFF0C\u901A\u8FC7\u540E\u81EA\u52A8\u7528 AI \u751F\u6210\u82F1\u6587\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\uFF08\u6B63\u6587 {{\u53D8\u91CF\u540D}} \u539F\u6837\u4FDD\u7559\u5E76\u5728\u63CF\u8FF0\u4E2D\u8865\u5168\uFF09\uFF0C\u518D\u5199\u5165 Skills\u3002",
  "pl.skillModal.nameLabel": "\u6280\u80FD\u540D\uFF08kebab-case\uFF09",
  "pl.skillModal.validateAi": "\u6821\u9A8C\u5E76 AI \u751F\u6210",
  "pl.skillModal.aiValidating": "AI \u6821\u9A8C\u4E2D\uFF0C\u6B63\u5728\u9010\u6761\u751F\u6210\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\u2026",
  "pl.skillModal.aiDone": "AI \u6821\u9A8C\u5B8C\u6210\uFF1A\u5DF2\u751F\u6210 {done} \u6761\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0",
  "pl.skillModal.aiDoneErrors": "AI \u6821\u9A8C\u5B8C\u6210\uFF1A\u6210\u529F {done} \u6761\uFF0C\u5931\u8D25 {n} \u6761",
  "pl.skillModal.aiUnavailable": "AI \u670D\u52A1\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u751F\u6210\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\u3002\u8BF7\u5148\u8FDE\u63A5 LLM \u670D\u52A1\u3002",
  "pl.skillModal.aiEmpty": "AI \u8FD4\u56DE\u7A7A\u7ED3\u679C\uFF0C\u81EA\u52A8\u91CD\u8BD5\u540E\u4ECD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",
  "pl.skillModal.aiParse": "AI \u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\u4E3A\u6280\u80FD\u540D\u4E0E\u63CF\u8FF0\uFF0C\u8BF7\u91CD\u8BD5",
  "pl.skillModal.aiNoRoute": "\u672A\u627E\u5230\u53EF\u7528\u6A21\u578B\uFF0C\u8BF7\u68C0\u67E5\u6A21\u578B\u914D\u7F6E",
  "pl.skillModal.aiFailed": "AI \u751F\u6210\u5931\u8D25",
  "pl.skillModal.aiFill": "\u5DF2\u8865\u5168\u6280\u80FD\u540D\u4E0E\u6458\u8981",
  "pl.skillModal.uploadJson": "\u4E0A\u4F20 JSON",
  "pl.skillModal.uploadJsonTitle": "\u4ECE JSON \u6587\u4EF6\u6DFB\u52A0\u81EA\u5B9A\u4E49\u6280\u80FD\u6761\u76EE\uFF1A\u652F\u6301\u6570\u7EC4\u6216 skills/entries/prompts \u5217\u8868\uFF0C\u6BCF\u6761\u9700\u5305\u542B title \u4E0E body\uFF0C\u53EF\u9009 name/summary/promptId",
  "pl.skillModal.fromJson": "JSON",
  "pl.skillModal.jsonError": "JSON \u89E3\u6790\u5931\u8D25\uFF1A{err}",
  "pl.skillModal.jsonEmpty": "JSON \u4E2D\u672A\u627E\u5230\u6709\u6548\u7684\u6280\u80FD\u6761\u76EE\uFF08\u6BCF\u6761\u9700\u5305\u542B\u6807\u9898\u4E0E\u6B63\u6587\uFF09",
  "pl.skillExport": "\u5BFC\u51FA Skill",
  "pl.skillExportBtnTitle": "\u628A\u52FE\u9009\u7684\u63D0\u793A\u8BCD\u5BFC\u51FA\u4E3A DSH \u6280\u80FD\uFF08\u5F39\u51FA\u7F16\u8F91\u6821\u9A8C\u7A97\u53E3\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u5199\u5165 ~/.dsh/skills/<name>/SKILL.md\uFF09",
  "pl.skillExportNeedSelect": "\u8BF7\u5148\u52FE\u9009\u8981\u5BFC\u51FA\u6280\u80FD\u7684\u63D0\u793A\u8BCD",
  "pl.importConfirm": "\u5BFC\u5165\u4F1A\u628A\u5907\u4EFD\u5185\u5BB9\u5408\u5E76\u5230\u5F53\u524D\u8BCD\u5E93\uFF08\u540C ID \u8986\u76D6\uFF09\uFF0C\u786E\u5B9A\u7EE7\u7EED\uFF1F",
  "pl.confirm": "\u786E\u5B9A",
  // 导入编辑弹窗（词库管理导入）
  "pl.importEdit.title": "\u5BFC\u5165\u63D0\u793A\u8BCD",
  "pl.importEdit.subtitle": "\u9009\u62E9\u5BFC\u5165\u6570\u636E\u540E\u5728\u6B64\u9884\u89C8\u4E0E\u7F16\u8F91\uFF0C\u53EF\u4FEE\u6539\u6807\u9898\u3001\u6807\u7B7E\u4E0E\u6B63\u6587\u5E76\u5199\u5165 {{\u53D8\u91CF\u540D}}\uFF1B\u52FE\u9009\u53C2\u4E0E\u5BFC\u5165\u7684\u6761\u76EE\uFF0C\u6821\u9A8C\u901A\u8FC7\u540E\u624D\u80FD\u5BFC\u5165\u3002",
  "pl.importEdit.tagsLabel": "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09",
  "pl.importEdit.fromTxt": "\u6587\u672C",
  "pl.importEdit.noEntry": "\u672A\u89E3\u6790\u51FA\u4EFB\u4F55\u6709\u6548\u6761\u76EE\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6570\u636E\u6587\u4EF6",
  "pl.importEdit.validatePass": "\u6821\u9A8C\u901A\u8FC7\uFF0C\u53EF\u4EE5\u5BFC\u5165",
  "pl.importEdit.untitledPrompt": "\u672A\u547D\u540D\u63D0\u793A\u8BCD",
  "pl.importEdit.import": "\u5BFC\u5165",
  "pl.importEdit.importing": "\u5BFC\u5165\u4E2D\u2026",
  "pl.importEdit.deselectAll": "\u53D6\u6D88\u5168\u9009",
  "pl.importEdit.parseEmpty": "\u672A\u4ECE\u6587\u4EF6\u4E2D\u89E3\u6790\u51FA\u6709\u6548\u6570\u636E",
  "pl.importEdit.parseFail": "\u89E3\u6790\u6587\u4EF6\u5931\u8D25\uFF1A{err}",
  // 导入导出格式
  "pl.exportFormat": "\u5BFC\u51FA\u683C\u5F0F",
  "pl.format.txt": "\u6587\u672C",
  "pl.format.unsupported": "\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F\uFF0C\u8BF7\u9009\u62E9 JSON / CSV / Markdown / \u6587\u672C \u6587\u4EF6",
  "pl.imported": "\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}\u3001\u8DF3\u8FC7 {skipped}",
  // 词库助手活动阶段气泡
  "pl.phase.idle": "\u5F85\u547D\u4E2D\uFF0C\u968F\u53EB\u968F\u5230",
  "pl.phase.waiting": "\u8BF7\u5F00\u59CB\u4F60\u7684\u8868\u6F14",
  "pl.phase.thinking": "CPU \u5DF2\u62C9\u6EE1\u2026",
  "pl.phase.tool": "\u6B63\u5728\u638F\u5DE5\u5177\u7BB1\u2026",
  "pl.phase.review": "\u6B63\u5728\u6536\u62FE\u644A\u5B50\u2026",
  "pl.phase.done": "\u641E\u5B9A\uFF0C\u6536\u5DE5\uFF01",
  "pl.phase.failed": "\u7FFB\u8F66\u4E86\uFF0C\u518D\u6765\u4E00\u6B21\uFF1F",
  "pl.importFail": "\u5BFC\u5165\u7FFB\u8F66\u4E86\uFF1A{err}",
  // 标签集中管理
  "pl.manageTags": "\u6807\u7B7E\u7BA1\u7406",
  "pl.manageTagsTitle": "\u6807\u7B7E\u7BA1\u7406",
  "pl.tagsNone": "\u6682\u65E0\u6807\u7B7E",
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
  "pl.trash": "\u56DE\u6536\u7AD9",
  "pl.trashTitle": "\u56DE\u6536\u7AD9\u7BA1\u7406",
  "pl.trashEmpty": "\u56DE\u6536\u7AD9\u4E3A\u7A7A",
  "pl.trashDeletedAt": "\u5220\u9664\u4E8E {time}",
  "pl.trashSelectAll": "\u5168\u9009",
  "pl.trashRestoreSelected": "\u6062\u590D\u9009\u4E2D",
  "pl.trashDeleteSelected": "\u6C38\u4E45\u5220\u9664",
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
  "pl.applyTemplateTitle": "\u9009\u4E2D\u6587\u672C\u76F4\u63A5\u5957\u6A21\u677F\uFF1A\u9009\u62E9\u542B\u53D8\u91CF\u7684\u6A21\u677F\uFF0C\u6587\u672C\u81EA\u52A8\u586B\u5165\u53D8\u91CF",
  "pl.applyTemplateDesc": "\u5DF2\u9009\u4E2D {length} \u4E2A\u5B57\u7B26\uFF0C\u8BF7\u9009\u62E9\u8981\u5957\u7528\u7684\u6A21\u677F\uFF08\u542B {{\u53D8\u91CF}} \u7684\u63D0\u793A\u8BCD\uFF09",
  "pl.applyTemplateEmpty": "\u8BCD\u5E93\u4E2D\u8FD8\u6CA1\u6709\u542B\u53D8\u91CF\u7684\u6A21\u677F\uFF0C\u53EF\u5148\u5728\u8BCD\u5E93\u4E2D\u521B\u5EFA",
  // 上下文提示词推荐
  "pl.recommend": "\u63A8\u8350",
  "pl.set.contextRecommend": "\u4E0A\u4E0B\u6587\u63D0\u793A\u8BCD\u63A8\u8350",
  "pl.set.contextRecommendDesc": "\u8F93\u5165\u6846\u4E3A\u7A7A\u65F6\uFF0C\u4F9D\u636E\u6700\u8FD1\u804A\u5929\u4E0A\u4E0B\u6587\u5728\u8F93\u5165\u6846\u4E0A\u65B9\u63A8\u8350\u5339\u914D\u7684\u63D0\u793A\u8BCD\uFF0C\u70B9\u51FB\u5373\u63D2\u5165\u8349\u7A3F",
  // 设置
  "pl.set.autoLearn": "\u81EA\u52A8\u5B66\u4E60\u63D0\u793A\u8BCD",
  "pl.set.autoLearnDesc": "\u8F93\u5165\u590D\u6742 prompt \u65F6\u81EA\u52A8\u4FDD\u5B58\u5230\u8BCD\u5E93",
  "pl.set.manualConfirm": "\u624B\u52A8\u786E\u8BA4",
  "pl.set.manualConfirmDesc": "\u5B66\u4E60\u5230\u63D0\u793A\u8BCD\u65F6\u5728\u804A\u5929\u6846\u5F39\u51FA\u4FDD\u5B58/\u53D6\u6D88\uFF0C\u786E\u8BA4\u540E\u624D\u5165\u5E93\uFF08\u52FE\u9009 AI \u667A\u80FD\u5B8C\u5584\u65F6\u81EA\u52A8\u5165\u5E93\uFF0C\u5FFD\u7565\u8BE5\u9009\u9879\uFF09",
  "pl.set.autoLearnTag": "\u81EA\u52A8\u5B66\u4E60\u6807\u7B7E",
  "pl.set.learnStats": "\u5DF2\u5B66\u4E60 {count} \u6761 \xB7 \u8FD1 7 \u5929 AI \u5B8C\u5584 {n} \u6B21",
  "pl.set.minLength": "\u6700\u5C0F\u5B66\u4E60\u957F\u5EA6",
  "pl.set.aiEnrich": "AI \u667A\u80FD\u5B8C\u5584",
  "pl.set.aiEnrichDesc": "\u81EA\u52A8\u5B66\u4E60\u65F6\u8C03\u7528 harness AI \u751F\u6210\u6807\u9898/\u6807\u7B7E/\u6458\u8981\u5E76\u6539\u5199\u6B63\u6587",
  "pl.set.aiProvider": "AI Provider",
  "pl.set.aiProviderDesc": "\u6A21\u578B\u670D\u52A1\u4F9B\u5E94\u5546\uFF0C\u4ECE\u7CFB\u7EDF\u5DF2\u8FDE\u63A5\u7684 LLM \u670D\u52A1\u4E2D\u8BFB\u53D6\uFF1B\u9009\u62E9\u201C\u7559\u7A7A\u81EA\u52A8\u53D1\u73B0\u201D\u65F6\u81EA\u52A8\u67E5\u627E\u9996\u4E2A\u53EF\u7528\u7684 provider\u3002",
  "pl.set.aiModel": "AI \u6A21\u578B",
  "pl.set.aiModelDesc": "\u8BE5 provider \u4E0B\u7684\u6A21\u578B id\uFF0C\u4ECE\u7CFB\u7EDF\u8BFB\u53D6\uFF1B\u9009\u62E9\u201C\u7559\u7A7A\u81EA\u52A8\u53D1\u73B0\u201D\u65F6\u81EA\u52A8\u9009\u62E9 id \u542B deepseek \u7684\u6A21\u578B\u3002",
  "pl.set.autoDiscover": "\u7559\u7A7A\u81EA\u52A8\u53D1\u73B0",
  "pl.set.notFound": "{value}\uFF08\u672A\u53D1\u73B0\uFF09",
  "pl.set.panelWidth": "\u804A\u5929\u6846\u63D0\u793A\u8BCD\u9762\u677F\u5BBD\u5EA6\uFF08px\uFF09",
  "pl.set.panelHeight": "\u804A\u5929\u6846\u63D0\u793A\u8BCD\u9762\u677F\u9AD8\u5EA6\uFF08px\uFF09",
  "pl.set.maxCount": "\u63D0\u793A\u8BCD\u6700\u5927\u5B58\u50A8\u6570\u91CF(\u6761)",
  "pl.set.personTipInterval": "\u8BCD\u5E93\u52A9\u624B\u63D0\u793A\u9891\u7387(\u79D2)",
  "pl.set.personTipDuration": "\u8BCD\u5E93\u52A9\u624B\u663E\u793A\u65F6\u957F(\u79D2)",
  "pl.set.assistant": "\u663E\u793A\u8BCD\u5E93\u52A9\u624B",
  "pl.set.assistantDesc": "\u63A7\u5236\u8BCD\u5E93\u52A9\u624B\uFF08\u5C0F\u52A9\u624B\u5F62\u8C61\uFF09\u7684\u663E\u9690\uFF1B\u5173\u95ED\u540E\u65E0\u6CD5\u542F\u7528\u8BCD\u5E93\u5DE5\u5177\u9762\u677F",
  "pl.set.assistantUnlock": "\u5347\u5230\u6700\u9AD8\u7B49\u7EA7\u540E\u89E3\u9501\u6B64\u9879\u5F00\u5173\uFF0C\u5373\u53EF\u81EA\u7531\u5173\u95ED",
  "pl.set.assistantUnlocked": "\u5DF2\u89E3\u9501\uFF01\u53EF\u81EA\u7531\u5F00\u542F\u6216\u5173\u95ED\u8BCD\u5E93\u52A9\u624B",
  "pl.set.character": "\u52A9\u624B\u5F62\u8C61",
  "pl.set.characterDesc": "\u9009\u62E9\u8BCD\u5E93\u52A9\u624B\u7684\u5F62\u8C61\u6B3E\u5F0F\uFF1A\u7ECF\u5178\u6B3E\u6216\u9CB8\u9C7C\u6B3E\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.characterClassic": "\u7ECF\u5178\u6B3E",
  "pl.set.characterWhale": "\u9CB8\u9C7C\u6B3E\xB7\u9759\u6001",
  "pl.set.characterDshpet": "\u9CB8\u9C7C\u6B3E\xB7\u52A8\u6548",
  "pl.set.announcement": "\u663E\u793A\u516C\u544A",
  "pl.set.announcementDesc": "\u5728\u8BCD\u5E93\u52A9\u624B\u53F3\u952E\u83DC\u5355\u663E\u793A\u300C\u516C\u544A\u300D\u5165\u53E3\uFF0C\u6253\u5F00\u4F7F\u7528\u624B\u518C\u4E0E\u7248\u672C\u901A\u544A\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.rightPanel": "\u663E\u793A\u8BCD\u5E93\u5DE5\u5177\u9762\u677F",
  "pl.set.rightPanelDesc": "\u63A7\u5236\u8BCD\u5E93\u5DE5\u5177\u9762\u677F\u663E\u793A\uFF0C\u9700\u5148\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u624D\u80FD\u542F\u7528\uFF0C\u5F00\u542F\u540E\u53EF\u5728\u8BCD\u5E93\u52A9\u624B\u53F3\u952E\u83DC\u5355\u300C\u6253\u5F00\u5DE5\u5177\u9762\u677F\u300D\u5C55\u5F00",
  "pl.set.levelAssistant": "\u663E\u793A\u7B49\u7EA7\u52A9\u624B",
  "pl.set.levelAssistantDesc": "\u5728\u5C0F\u52A9\u624B\u8EAB\u4E0A\u663E\u793A\u7B49\u7EA7\u5FBD\u7AE0\uFF0C\u53F3\u952E\u83DC\u5355\u663E\u793A\u300C\u6210\u5C31\u300D\u5165\u53E3\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.levelAnnouncement": "\u663E\u793A\u6211\u7684\u7B49\u7EA7\u516C\u544A",
  "pl.set.levelAnnouncementDesc": "\u65B0\u6210\u5C31\u89E3\u9501\u65F6\u7531\u5C0F\u52A9\u624B\u6C14\u6CE1\u64AD\u62A5\u300C\u6210\u5C31\u89E3\u9501\u300D\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.persona": "\u4EBA\u683C\u7BA1\u7406",
  "pl.set.personaDesc": "\u8BCD\u5E93\u52A9\u624B\u53F3\u952E\u83DC\u5355\u5C55\u793A\u300C\u4EBA\u683C\u7BA1\u7406\u300D\u5165\u53E3\uFF0C\u7BA1\u7406\u591A\u4EFD AI \u4EBA\u683C\u5E76\u81EA\u52A8\u6309\u4F1A\u8BDD\u5207\u6362\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.dashboard": "\u770B\u677F",
  "pl.set.dashboardDesc": "\u8BCD\u5E93\u52A9\u624B\u53F3\u952E\u83DC\u5355\u5C55\u793A\u300C\u770B\u677F\u300D\u5165\u53E3\uFF0C\u67E5\u770B\u8BCD\u5E93\u4F7F\u7528\u7EDF\u8BA1\u6982\u89C8\u4E0E\u8D8B\u52BF\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.dataManagement": "\u6570\u636E\u7BA1\u7406",
  "pl.set.dataManagementDesc": "\u8BCD\u5E93\u52A9\u624B\u53F3\u952E\u83DC\u5355\u5C55\u793A\u300C\u6570\u636E\u7BA1\u7406\u300D\u5165\u53E3\uFF0C\u5BFC\u5165\u5BFC\u51FA\u63D0\u793A\u8BCD\u3001\u7BA1\u7406\u6807\u7B7E\u4E0E\u56DE\u6536\u7AD9\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
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
  "pl.set.hoverDetail": "\u60AC\u505C\u663E\u793A\u8BE6\u60C5",
  "pl.set.hoverDetailDesc": "\u5728\u53F3\u4FA7\u9762\u677F\u60AC\u505C\u63D0\u793A\u8BCD\u65F6\u663E\u793A\u5B8C\u6574\u8BE6\u60C5",
  "pl.set.selectionAdd": "\u9009\u4E2D\u6587\u5B57\u6DFB\u52A0\u63D0\u793A\u8BCD",
  "pl.set.selectionAddDesc": "\u5728\u804A\u5929\u5185\u5BB9\u9AD8\u4EAE\u9009\u4E2D\u6587\u5B57\u540E\uFF0C\u6D6E\u51FA\u300C\u6DFB\u52A0\u63D0\u793A\u8BCD\u300D\u6309\u94AE\u5E76\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3",
  "pl.set.lab": "\u5B9E\u9A8C\u5BA4\u529F\u80FD",
  "pl.set.labWarning": "\u4EE5\u4E0B\u4E3A\u5B9E\u9A8C\u6027\u80FD\u529B\uFF0C\u53EF\u80FD\u5F71\u54CD\u6574\u4E2A AI \u5BF9\u8BDD\u7684\u8868\u73B0\u3002\u8BF7\u8C28\u614E\u52FE\u9009\u3002",
  "pl.set.autoUpdate": "\u81EA\u52A8\u66F4\u65B0",
  "pl.set.autoUpdateDesc": "\u5F00\u542F\u540E\u53D1\u73B0\u6709\u65B0\u7248\u672C\u5373\u540E\u53F0\u81EA\u52A8\u5B89\u88C5\uFF0C\u65E0\u9700\u624B\u52A8\u5E72\u9884",
  "pl.set.backupEnabled": "\u542F\u7528\u81EA\u52A8\u5907\u4EFD",
  "pl.set.backupEnabledDesc": "\u5F00\u542F\u540E\u6309\u6240\u9009\u5468\u671F\u81EA\u52A8\u628A\u6570\u636E\u5E93\u5907\u4EFD\u5230 backup \u76EE\u5F55\uFF0C\u8D85\u51FA\u4FDD\u7559\u4EFD\u6570\u81EA\u52A8\u6E05\u7406\u6700\u65E7\u7684",
  "pl.set.backupSchedule": "\u5907\u4EFD\u5468\u671F",
  "pl.set.backupScheduleDesc": "\u6BCF\u9694\u591A\u4E45\u81EA\u52A8\u6267\u884C\u4E00\u6B21\u5907\u4EFD\uFF1A\u6BCF\u5929 / \u6BCF\u5468 / \u6BCF\u6708",
  "pl.set.backupScheduleDaily": "\u6BCF\u5929",
  "pl.set.backupScheduleWeekly": "\u6BCF\u5468",
  "pl.set.backupScheduleMonthly": "\u6BCF\u6708",
  "pl.set.backupRetention": "\u4FDD\u7559\u4EFD\u6570",
  "pl.set.backupRetentionDesc": "\u5907\u4EFD\u6587\u4EF6\u6700\u591A\u4FDD\u7559\u7684\u4EFD\u6570\uFF0C\u8D85\u51FA\u65F6\u81EA\u52A8\u5220\u9664\u6700\u65E7\u7684",
  "pl.set.backupNow": "\u7ACB\u5373\u5907\u4EFD",
  "pl.set.backupBacking": "\u5907\u4EFD\u4E2D\u2026",
  "pl.set.backupDone": "\u5907\u4EFD\u5B8C\u6210\uFF1A{name}",
  "pl.set.backupFail": "\u5907\u4EFD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",
  "pl.set.backupListTitle": "\u5DF2\u5907\u4EFD\u6587\u4EF6",
  "pl.set.backupEmpty": "\u6682\u65E0\u5907\u4EFD\u6587\u4EF6",
  "pl.set.backupFormat": "\u5907\u4EFD\u683C\u5F0F",
  "pl.set.backupFormatDb": "\u6570\u636E\u5E93\u6587\u4EF6 (.db)",
  "pl.set.backupFormatJson": "JSON \u5BFC\u51FA (.json)",
  "pl.set.backupFormatDesc": "\u624B\u52A8\u4E0E\u81EA\u52A8\u5907\u4EFD\u4F7F\u7528\u7684\u6587\u4EF6\u683C\u5F0F\uFF1Adb \u4E3A\u6570\u636E\u5E93\u5B8C\u6574\u526F\u672C\uFF0Cjson \u4E3A\u53EF\u8BFB\u7684 JSON \u5BFC\u51FA\uFF08\u53EF\u5355\u72EC\u5BFC\u5165\u6062\u590D\uFF09",
  "pl.set.restore": "\u6062\u590D",
  "pl.set.restoreTitle": "\u4ECE {name} \u6062\u590D\u8BCD\u5E93",
  "pl.set.restoreConfirm": "\u786E\u8BA4\u4ECE {name} \u6062\u590D\uFF1F\u6062\u590D\u4F1A\u7528\u5907\u4EFD\u5185\u5BB9\u8986\u76D6\u5F53\u524D\u8BCD\u5E93\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  "pl.set.restoreDone": "\u5DF2\u4ECE {format} \u5907\u4EFD\u6062\u590D\uFF0C\u5171 {count} \u6761\u63D0\u793A\u8BCD",
  "pl.set.restoreFail": "\u6062\u590D\u5931\u8D25\uFF1A{err}",
  "pl.set.backupDelete": "\u5220\u9664",
  "pl.set.backupDeleteTitle": "\u5220\u9664\u5907\u4EFD\u6587\u4EF6",
  "pl.set.backupDeleteConfirm": "\u786E\u8BA4\u5220\u9664\u5907\u4EFD\u6587\u4EF6 {name}\uFF1F\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002",
  "pl.set.backupDeleteDone": "\u5DF2\u5220\u9664\u5907\u4EFD {name}",
  "pl.set.backupDeleteFail": "\u5220\u9664\u5907\u4EFD\u5931\u8D25\uFF1A{err}",
  "pl.set.updateReminder": "\u66F4\u65B0\u63D0\u9192",
  "pl.set.checkUpdate": "\u68C0\u67E5\u66F4\u65B0",
  "pl.set.updateChecking": "\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\u2026",
  "pl.set.updateCurrent": "\u5F53\u524D\u7248\u672C: v{version}",
  "pl.set.updateAvailable": "\u53D1\u73B0\u65B0\u7248\u672C v{version}",
  "pl.set.updateLatest": "\u5DF2\u662F\u6700\u65B0\u7248\u672C",
  "pl.set.updateNow": "\u7ACB\u5373\u66F4\u65B0",
  "pl.set.updating": "\u66F4\u65B0\u4E2D\u2026",
  "pl.set.updateSuccess": "\u66F4\u65B0\u6210\u529F\uFF0C\u65B0\u7248\u672C\u5DF2\u5B89\u88C5\u5B8C\u6BD5",
  "pl.set.updateFail": "\u66F4\u65B0\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",
  "pl.set.updateRequireRestartHint": "\u66F4\u65B0\u5B89\u88C5\u540E\u5FC5\u987B\u91CD\u542F dsh web \u624D\u4F1A\u52A0\u8F7D\u65B0\u7248\u672C\u4EE3\u7801\uFF0C\u672A\u91CD\u542F\u4ECD\u8FD0\u884C\u65E7\u7248\u672C\u3002",
  "pl.set.updateSuccessRestartTitle": "\u8BF7\u52A1\u5FC5\u91CD\u542F dsh web",
  "pl.set.updateSuccessRestartHint": "\u65B0\u7248\u672C\u4EE3\u7801\u5DF2\u5B89\u88C5\uFF1B\u5FC5\u987B\u5B8C\u6574\u91CD\u542F dsh web\uFF08\u5EFA\u8BAE\u901A\u8FC7\u8BA1\u5212\u4EFB\u52A1 DSHConsoleAutostart\uFF09\u540E\uFF0C\u6539\u52A8\u3001\u65B0\u7248\u80FD\u529B\u624D\u4F1A\u751F\u6548\u3002",
  "pl.set.dataSection": "\u8BCD\u5E93\u7BA1\u7406",
  "pl.set.dataSectionDesc": "\u5BFC\u5165\u5BFC\u51FA\u63D0\u793A\u8BCD\u5907\u4EFD\u3001\u96C6\u4E2D\u7BA1\u7406\u63D0\u793A\u8BCD\u6807\u7B7E\u4E0E\u56DE\u6536\u7AD9\u3002",
  "pl.footer.disclaimer": "\u672C\u63D2\u4EF6\u6309\u300C\u73B0\u72B6\u300D\u63D0\u4F9B\uFF0C\u4E0D\u63D0\u4F9B\u4EFB\u4F55\u5F62\u5F0F\u7684\u660E\u793A\u6216\u9ED8\u793A\u62C5\u4FDD\uFF1B\u4F7F\u7528\u8005\u81EA\u62C5\u98CE\u9669\u3002",
  "pl.setSectionTitle": "\u8BCD\u5E93\u8BBE\u7F6E",
  "pl.set.setSectionDesc": "\u8BBE\u7F6E\u63D0\u793A\u8BCD\u7684\u4FDD\u5B58\u65B9\u5F0F\u3001\u9762\u677F\u663E\u793A\u3001\u4EA4\u4E92\u5165\u53E3\u4E0E AI \u80FD\u529B\u3002",
  "pl.setModuleLearn": "\u81EA\u52A8\u5B66\u4E60",
  "pl.setModuleLearnDesc": "\u81EA\u52A8\u4FDD\u5B58\u590D\u6742 prompt \u5230\u8BCD\u5E93\uFF0C\u53EF\u6309\u9700\u5F00\u542F AI \u667A\u80FD\u5B8C\u5584\u3002",
  "pl.setModulePanel": "\u9762\u677F\u663E\u793A",
  "pl.setModulePanelDesc": "\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD\u9762\u677F\u5C3A\u5BF8\u4E0E\u6700\u5927\u5B58\u50A8\u6570\u91CF\u3002",
  "pl.setModuleDisplay": "\u663E\u793A\u4E0E\u4EA4\u4E92",
  "pl.setModuleDisplayDesc": "\u63A7\u5236\u5404\u5165\u53E3\u7684\u663E\u793A\u65B9\u5F0F\u4E0E\u89E6\u53D1\u65B9\u5F0F\u3002",
  "pl.setModuleBackup": "\u5907\u4EFD\u7BA1\u7406",
  "pl.setModuleBackupDesc": "\u96C6\u4E2D\u7BA1\u7406\u81EA\u52A8\u5907\u4EFD\u8BBE\u7F6E\u3001\u624B\u52A8\u7ACB\u5373\u5907\u4EFD\u4E0E\u5907\u4EFD\u6587\u4EF6\u6062\u590D\u3002",
  "pl.setModuleAboutUpdate": "\u5173\u4E8E\u4E0E\u66F4\u65B0",
  "pl.setModuleAboutUpdateDesc": "\u67E5\u770B\u63D2\u4EF6\u7248\u672C\u4E0E\u7248\u6743\u4FE1\u606F\uFF0C\u5E76\u7BA1\u7406\u63D2\u4EF6\u66F4\u65B0\u3002",
  "pl.about.version": "\u7248\u672C",
  "pl.about.author": "\u4F5C\u8005",
  "pl.about.license": "\u8BB8\u53EF\u8BC1",
  "pl.about.repo": "\u5F00\u6E90\u5730\u5740",
  "pl.about.copyright": "\u7248\u6743\u6240\u6709 \xA9 {year} {author} \u4FDD\u7559\u4E00\u5207\u6743\u5229\u3002",
  // 统计可视化
  "pl.stats.title": "\u7EDF\u8BA1",
  "pl.stats.view": "\u67E5\u770B\u7EDF\u8BA1",
  "pl.stats.back": "\u8FD4\u56DE\u5217\u8868",
  "pl.stats.loadFail": "\u7EDF\u8BA1\u52A0\u8F7D\u5931\u8D25",
  "pl.stats.neverUsed": "\u4ECE\u672A\u4F7F\u7528",
  "pl.stats.justNow": "\u521A\u521A",
  "pl.stats.minAgo": "{n} \u5206\u949F\u524D",
  "pl.stats.hourAgo": "{n} \u5C0F\u65F6\u524D",
  "pl.stats.dayAgo": "{n} \u5929\u524D",
  "pl.stats.emptyList": "\u6682\u65E0\u6570\u636E",
  "pl.stats.trend": "\u6BCF\u5468\u8D8B\u52BF",
  "pl.stats.trendEmpty": "\u6682\u65E0\u8D8B\u52BF\u6570\u636E\uFF0C\u4F7F\u7528\u4E00\u6BB5\u65F6\u95F4\u540E\u81EA\u52A8\u751F\u6210",
  "pl.stats.trendAdded": "\u65B0\u589E",
  "pl.stats.trendUsage": "\u4F7F\u7528",
  "pl.stats.total": "\u63D0\u793A\u8BCD\u603B\u6570",
  "pl.stats.totalUsage": "\u603B\u4F7F\u7528\u6B21\u6570",
  "pl.stats.usedRate": "\u4F7F\u7528\u7387",
  "pl.stats.usedCount": "\u5DF2\u4F7F\u7528 {count} \u6761",
  "pl.stats.aiRefined": "AI \u4F18\u5316\u6B21\u6570",
  "pl.stats.aiRefinedCount": "\u5171 {count} \u6B21",
  "pl.stats.used7": "\u8FD1 7 \u5929\u4F7F\u7528",
  "pl.stats.used30": "\u8FD1 30 \u5929\u4F7F\u7528",
  "pl.stats.added7": "\u8FD1 7 \u5929\u65B0\u589E",
  "pl.stats.added30": "\u8FD1 30 \u5929\u65B0\u589E",
  "pl.stats.topUsed7": "\u8FD1 7 \u5929\u6700\u5E38\u4F7F\u7528",
  "pl.stats.aiRefined7": "\u8FD1 7 \u5929 AI \u5B8C\u5584",
  "pl.stats.analysis": "\u8FD1 7 \u5929\u5206\u6790",
  "pl.stats.analysisEmpty": "\u6682\u65E0\u5206\u6790\uFF0C7 \u5929\u540E\u81EA\u52A8\u751F\u6210",
  "pl.stats.analysisPeriod": "\u7EDF\u8BA1\u5468\u671F {start} ~ {end}",
  "pl.stats.analysisAdded": "\u65B0\u589E",
  "pl.stats.analysisUsage": "\u4F7F\u7528",
  "pl.stats.analysisActive": "\u6D3B\u8DC3 {n} \u6761",
  "pl.stats.analysisAi": "AI \u5B8C\u5584",
  "pl.stats.analysisNewTitles": "\u65B0\u589E\u63D0\u793A\u8BCD",
  "pl.stats.aiComment": "AI \u70B9\u8BC4",
  "pl.stats.avgBody": "\u5E73\u5747\u5B57\u6570",
  "pl.stats.trash": "\u56DE\u6536\u7AD9",
  "pl.stats.tags": "\u6807\u7B7E\u5206\u5E03",
  "pl.stats.topUsed": "\u6700\u5E38\u4F7F\u7528",
  "pl.stats.recentUsed": "\u6700\u8FD1\u4F7F\u7528",
  "pl.stats.sleeper": "\u6C89\u7761\u63D0\u793A\u8BCD",
  "pl.stats.sleeperEmpty": "\u6682\u65E0\u6C89\u7761\u63D0\u793A\u8BCD",
  "pl.stats.days": "{days} \u5929\u672A\u4F7F\u7528",
  "pl.stats.tabOverview": "\u603B\u89C8",
  "pl.stats.tabHeatmap": "\u70ED\u529B\u56FE",
  "pl.stats.tabLifecycle": "\u751F\u547D\u5468\u671F",
  "pl.stats.tabDetails": "\u660E\u7EC6",
  "pl.stats.heatmapEmpty": "\u6682\u65E0\u4F7F\u7528\u8BB0\u5F55\uFF0C\u4F7F\u7528\u8FC7\u63D0\u793A\u8BCD\u540E\u4F1A\u6309\u661F\u671F \xD7 \u5C0F\u65F6\u5448\u73B0\u5728\u8FD9\u91CC",
  "pl.stats.week0": "\u5468\u65E5",
  "pl.stats.week1": "\u5468\u4E00",
  "pl.stats.week2": "\u5468\u4E8C",
  "pl.stats.week3": "\u5468\u4E09",
  "pl.stats.week4": "\u5468\u56DB",
  "pl.stats.week5": "\u5468\u4E94",
  "pl.stats.week6": "\u5468\u516D",
  "pl.stats.lcAdded": "\u65B0\u589E\uFF08\u8FD1 7 \u5929\uFF09",
  "pl.stats.lcActive": "\u8FD1 7 \u5929\u590D\u7528",
  "pl.stats.lcDormant": "\u6C89\u7761\uFF08\u4ECE\u672A\u4F7F\u7528\uFF09",
  "pl.stats.lcActive30": "\u8FD1 30 \u5929 {n} \u6761",
  "pl.stats.lcTrash": "\u56DE\u6536\u7AD9",
  "pl.stats.tabInsight": "\u6D1E\u5BDF",
  "pl.stats.times": "\u6B21",
  "pl.stats.healthTitle": "\u8BCD\u5E93\u5065\u5EB7\u8BC4\u5206",
  "pl.stats.healthGreat": "\u975E\u5E38\u5065\u5EB7",
  "pl.stats.healthGood": "\u72B6\u6001\u826F\u597D",
  "pl.stats.healthOk": "\u6709\u5F85\u63D0\u5347",
  "pl.stats.healthPoor": "\u9700\u8981\u7EF4\u62A4",
  "pl.stats.healthDimUtil": "\u5229\u7528\u7387",
  "pl.stats.healthDimActive": "\u8FD1 30 \u5929\u6D3B\u8DC3",
  "pl.stats.healthDimAi": "AI \u5B8C\u5584\u7387",
  "pl.stats.growthTitle": "\u6210\u957F\u66F2\u7EBF",
  "pl.stats.cumAdded": "\u7D2F\u8BA1\u65B0\u589E",
  "pl.stats.cumUsed": "\u7D2F\u8BA1\u4F7F\u7528",
  "pl.stats.peakTitle": "\u4F7F\u7528\u9AD8\u5CF0\u6D1E\u5BDF",
  "pl.stats.peakPrimary": "\u6700\u6D3B\u8DC3\u65F6\u6BB5\uFF1A{day} {hour}\uFF0C\u5171 {n} \u6761",
  "pl.stats.peakSecondary": "\u6B21\u9AD8\u5CF0\uFF1A{day} {hour}",
  "pl.stats.hotRankTags": "\u70ED\u95E8\u6807\u7B7E",
  "pl.stats.hotRankWeek": "\u672C\u5468\u70ED\u8BCD"
};
var en = {
  // Common buttons / hints
  "pl.title": "Library",
  "pl.search": "Search\u2026",
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
  "pl.titleField": "Title",
  "pl.bodyField": "Body",
  "pl.insertVariable": "Insert variable",
  "pl.insertVariableTitle": "Insert a variable tag {{}} at the cursor (selected text can be the variable name)",
  "pl.insertVariableDefault": "variable",
  "pl.tagsField": "Tag (single select)",
  "pl.tagsHint": "Select one tag from the existing tags",
  "pl.tagsNoneSelect": "(No tag)",
  "pl.requireTitleBody": "Title and body are required",
  "pl.confirmDelete": 'Delete "{title}"? It will be moved to the recycle bin and can be restored in Data Management.',
  "pl.confirmSave": "Confirm saving prompt",
  "pl.recentNew": "New",
  "pl.learnedToast": "Auto-learned",
  "pl.learnFound": "Learnable prompt detected",
  "pl.undo": "Undo",
  "pl.refinedDone": "AI-refined",
  "pl.refinePending": "AI enrichment pending",
  "pl.original": "Original",
  "pl.polished": "Polished",
  "pl.polishReconfirmMsg": "\u201C{title}\u201D has already been AI-optimized. Continue anyway?",
  "pl.polishReconfirmOk": "Continue",
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
  "pl.polishDoneLearn": "Polish complete, copy or insert as you like",
  "pl.polishFail": "AI polish failed, please check your LLM connection",
  "pl.polishReplaced": "Replaced in the input",
  "pl.polishHoverContent": "Optimize input content",
  "pl.polishResult": "AI Polish Result",
  "pl.polishResultAria": "Polish result",
  "pl.replaceContent": "Replace content",
  // Sidebar
  "pl.sidebar.expand": "Expand prompt library",
  "pl.sidebar.collapse": "Minimize to Assistant",
  "pl.sidebar.uncategorized": "Uncategorized",
  "pl.sidebar.groupCount": "({count})",
  "pl.sidebar.usageCount": "{count}\xD7",
  "pl.sidebar.total": "{count} prompts total",
  "pl.sidebar.tagTotal": "{count} tags",
  "pl.sidebar.recent": "Recently used",
  "pl.saveToLibrary": "Save to library",
  "pl.floating.title": "Library Assistant",
  "pl.floating.hint": "Click to open the prompt library",
  "pl.floating.resize": "Resize",
  "pl.gamification.unlockTitle": "Achievement Unlocked!",
  "pl.gamification.progress": "Earn {n} more points to level up",
  "pl.gamification.maxed": "Max level",
  "pl.tap.0": "Hehe, stop poking me~",
  "pl.tap.1": "That tickles!",
  "pl.tap.2": "I'm not a stress ball\u2026",
  "pl.tap.3": "Alright, alright, you win",
  "pl.tap.dizzy": "Spinning\u2026 give me a sec",
  "pl.lucky.0": "Jackpot day~ luck +1 \u2728",
  "pl.lucky.1": "Found a lucky coin, go use it!",
  "pl.lucky.2": "Good fortune ahead, today's your day \u2728",
  "pl.lucky.3": "You drew the 'Inspiration Boost' buff!",
  "pl.lucky.4": "Seven stars align \u2014 summon a bright idea~",
  "pl.lucky.5": "Auspicious draw: one more try, one more win",
  "pl.ctx.openPanel": "Tool Panel",
  "pl.ctx.announce": "Announcements",
  "pl.ctx.achievements": "Achievements",
  "pl.ctx.personas": "Personas",
  "pl.ctx.dashboard": "Dashboard",
  "pl.ctx.dataManagement": "Data Management",
  "pl.personas.title": "Persona Manager",
  "pl.personas.listTitle": "Souls",
  "pl.personas.listHint": "Create and edit multiple personas (SOUL), then bind them to workspaces / projects",
  "pl.personas.createTitle": "New Soul",
  "pl.personas.createHint": "Give the new persona a name; editing starts right after creation",
  "pl.personas.previewEmpty": 'No content yet \u2014 click "Edit" to start',
  "pl.personas.new": "New Persona",
  "pl.personas.namePlaceholder": "Give it a name",
  "pl.personas.defaultBadge": "Default",
  "pl.personas.enabled": "Enabled",
  "pl.personas.edit": "Edit",
  "pl.personas.cancel": "Cancel",
  "pl.personas.save": "Save",
  "pl.personas.delete": "Delete",
  "pl.personas.done": "Done",
  "pl.personas.contentLabel": "Persona content (SOUL)",
  "pl.personas.contentHint": "Injected into every conversation to shape the AI's identity, tone and working rules",
  "pl.personas.viewDetail": "Click to view details",
  "pl.personas.detailTitle": "Persona Details",
  "pl.personas.detailEmpty": "This persona has no content yet",
  "pl.personas.empty": 'No custom personas yet \u2014 click "New Persona" to create one',
  "pl.personas.note": "Personas are bound by workspace / project: conversations opened under that path automatically use the corresponding SOUL; unbound paths fall back to the default persona or the parent binding",
  "pl.personas.defaultReadonly": "The built-in Default persona cannot be renamed or deleted, but you can edit its content",
  "pl.personas.deleteConfirm": 'Delete persona "{name}"? Its conversation bindings and SOUL file will also be removed',
  "pl.personas.nameError": "Name cannot be empty",
  "pl.personas.opFailed": "Operation failed, please try again",
  "pl.personas.scopes.title": "Workspace / Project Binding",
  "pl.personas.scopes.hint": "Assign a persona to a workspace or project to override the parent: projects without their own setting use their parent workspace's binding",
  "pl.personas.scopes.defaultOption": "Default (follow parent)",
  "pl.personas.scopes.empty": "No workspaces available",
  "pl.personas.scopes.workspace": "Workspace",
  "pl.personas.scopes.project": "Project",
  "pl.achievements.title": "My Achievements",
  "pl.achievements.count": "{n} / {total} achievements unlocked",
  "pl.achievements.empty": "No achievements yet \u2014 start using the library",
  "pl.achievements.loading": "Loading\u2026",
  "pl.achievements.levelLabel": "Current Level",
  "pl.achievements.lockedHint": "Keep using the library to unlock it",
  "pl.achievements.decayed": "Inactive for {days} days \u2014 level dropped",
  "pl.achievements.dropGap": "Only {n} pts left before dropping back to {prev}",
  "pl.achievements.all": "All",
  "pl.achievements.unlockAssistant": "A faint power whispers: climb to the pinnacle of the library, and a long-sealed surprise shall stir\u2026",
  "pl.achievements.unlockAssistantDone": "The seal is lifted! Peek into Settings \u2014 a hidden treat may await your hand.",
  "pl.rarity.common": "Common",
  "pl.rarity.rare": "Rare",
  "pl.rarity.epic": "Epic",
  "pl.rarity.legendary": "Legendary",
  "pl.rarity.myth": "Mythic",
  "pl.achievements.rankLabel": "Growth Rank",
  "pl.achievements.points": "Achievement Points",
  "pl.achievements.collected": "{n} unlocked",
  "pl.achievements.rarity": "Rarity: {name} \xB7 {points} pts on unlock",
  "pl.achievements.progress": "{progress} / {target}",
  "pl.achievements.upNext": "Almost There",
  "pl.achievements.upNextEmpty": "Still a ways to go \u2014 keep it up",
  "pl.achievements.levelDetail": "Level Details",
  "pl.achievements.levelDetailHide": "Collapse",
  "pl.achievements.levelThresholds": "Points needed per level",
  "pl.achievements.levelNeed": "Needs {n} pts",
  "pl.achievements.pointSources": "How to earn points",
  "pl.achievements.decayRule": "Decay rule",
  "pl.mood.happy": "In high spirits today, full of energy",
  "pl.mood.sad": "Hit a snag today, feeling a bit low",
  "pl.intro.0": "Jot it down, fetch it anytime; every spark finds a home.",
  "pl.intro.1": "AI polishes, stone into jade; words refined, ever sharper.",
  "pl.intro.2": "Filed by kind, found at a glance; learn what is new, revisit the old.",
  "pl.intro.3": "One tap summons, an essay at hand; a variable lightly filled.",
  "pl.intro.4": "A pocket library, thinkable any hour; fine lines renewed, a joy to count.",
  // Announcement / manual
  "pl.announce.title": "Prompt Library Assistant",
  "pl.announce.dismiss": "Got it",
  "pl.announce.manualTitle": "User Guide",
  "pl.announce.noticeTitle": "Release Notes",
  "pl.announce.noNotice": "No release notes yet",
  "pl.announce.masthead": "The Prompt Daily",
  "pl.announce.mastheadSub": "Today's library \xB7 Tech front",
  "pl.announce.dailyTitle": "Daily Report",
  "pl.announce.techTitle": "Achievement Briefs",
  "pl.announce.noDaily": "No recommendations today",
  "pl.announce.openLink": "Read article",
  "pl.announce.tabAnnounce": "Announcement",
  "pl.announce.tabBoard": "Board",
  "pl.announce.prevEdition": "Previous issue",
  "pl.announce.nextEdition": "Next issue",
  "pl.announce.today": "Today",
  "pl.announce.history": "History",
  "pl.announce.editionNo": "Issue #{n}",
  "pl.announce.aiSuggestTitle": "AI Suggestions",
  "pl.announce.aiSuggestEmpty": "AI is unavailable; no suggestions can be generated",
  "pl.announce.aiSuggestLoading": "AI is generating suggestions\u2026",
  "pl.announce.manual.0": "Press # to summon the library: live filter, \u2191\u2193 to select, Enter to write.",
  "pl.announce.manual.1": "A keen eye gathers gems from chat; edit or delete anytime, ever renewed.",
  "pl.announce.manual.2": "AI polishes, stone into jade; smart enrichment, every line refined.",
  "pl.announce.manual.3": "{{variable}} blooms, filled one by one before insert; templates make it effortless.",
  "pl.announce.manual.4": "Select any text, clip it into the library in one click; tag & filter, find at a glance.",
  "pl.announce.manual.5": "Manage from sidebar or chat panel \u2014 stats, export & backup: a sea of words at your fingertips.",
  // Import / Export / Backup
  "pl.moduleImportExport": "Import / Export",
  "pl.moduleImportExportDesc": "Import / export prompts in common formats (JSON / CSV / Markdown / text).",
  "pl.exportSection": "Export",
  "pl.exportSectionDesc": 'Check the prompts to export, pick a format and click "Export selected".',
  "pl.importSection": "Import",
  "pl.importSectionDesc": "Import from a data file; edit and validate before merging into the library.",
  "pl.moduleTags": "Manage tags",
  "pl.moduleTagsDesc": "Centrally manage prompt tags: create / rename / delete.",
  "pl.moduleTrash": "Recycle bin",
  "pl.moduleTrashDesc": "Centrally manage deleted prompts: restore or permanently delete.",
  "pl.export": "Export",
  "pl.import": "Import",
  "pl.exportTitle": "Export the checked prompts as a backup file",
  "pl.importTitle": "Import from a backup file (merge into the library)",
  "pl.exported": "Exported {count} prompts",
  "pl.exportSelectAll": "Select all",
  "pl.exportSelected": "Export selected",
  "pl.viewList": "List",
  "pl.viewGroup": "Groups",
  "pl.exportNeedSelect": "Select prompts to export first",
  "pl.skillImport": "Import from Skills",
  "pl.skillImporting": "Importing\u2026",
  "pl.skillImportBtnTitle": "Open the skill import dialog: pick a local md file or import from the Skills directory, edit content, write {{variable}} placeholders, and save after validation",
  "pl.skillImportConfirm": "Reverse-import from ~/.dsh/skills? Each SKILL.md becomes a prompt (re-importing the same skill overwrites/updates).",
  "pl.skillImportDone": "Import done: {imported} added, {updated} updated",
  "pl.skillImportErrors": " ({n} failed)",
  "pl.skillImportNone": "Skills directory is empty; no SKILL.md to import",
  "pl.skillModal.title": "Import skills",
  "pl.skillModal.subtitle": "Pick a local md file or scan the Skills directory, edit the title/summary/body and write {{variable}} placeholders; you can only save after validation passes.",
  "pl.skillModal.chooseFile": "Choose md file",
  "pl.skillModal.scanSkills": "Scan Skills directory",
  "pl.skillModal.titleLabel": "Title",
  "pl.skillModal.summaryLabel": "Summary",
  "pl.skillModal.bodyLabel": "Body",
  "pl.skillModal.insertVar": "Insert variable",
  "pl.skillModal.validate": "Validate",
  "pl.skillModal.validatePass": "Validation passed, you can save",
  "pl.skillModal.validateFail": "Validation failed: {errors}",
  "pl.skillModal.save": "Save to library",
  "pl.skillModal.saving": "Saving\u2026",
  "pl.skillModal.saved": "Saved: {imported} added, {updated} updated",
  "pl.skillModal.savedErrors": " ({n} failed)",
  "pl.skillModal.noEntry": "No entries yet. Choose an md file or scan the Skills directory first.",
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
  "pl.skillModal.collapse": "Collapse",
  "pl.skillModal.expand": "Expand",
  "pl.skillModal.issueCount": "{count} issue(s) found",
  "pl.skillModal.fixAll": "Fix all",
  "pl.skillModal.fixHint": "{fixable} of them can be fixed automatically",
  "pl.skillModal.fixDone": "Fixed {count} issue(s):",
  "pl.skillModal.fixTitle": "Title filled in: {title}",
  "pl.skillModal.fixBodyVars": "Fixed template variable formatting in body",
  "pl.skillModal.varFixDefault": "variable",
  "pl.skillModal.fromLibrary": "Library",
  "pl.skillModal.saveExport": "Save to Skills",
  "pl.skillModal.savedExport": "Exported: {exported} skill(s) written to disk",
  "pl.skillModal.savedExportErrors": " ({n} failed)",
  "pl.skillModal.exportTitle": "Export skills",
  "pl.skillModal.exportSubtitle": 'Turn the checked prompts into skills and write them to ~/.dsh/skills/<name>/SKILL.md; edit the title/summary/body and write {{variable}} placeholders; "Validate & AI generate" validates first, then AI automatically produces the English skill name and description ({{variable}} placeholders are preserved and reflected), then write to Skills.',
  "pl.skillModal.nameLabel": "Skill name (kebab-case)",
  "pl.skillModal.validateAi": "Validate & AI generate",
  "pl.skillModal.aiValidating": "AI validating, generating skill names and descriptions\u2026",
  "pl.skillModal.aiDone": "AI validation done: {done} skill name(s) and description(s) generated",
  "pl.skillModal.aiDoneErrors": "AI validation done: {done} succeeded, {n} failed",
  "pl.skillModal.aiUnavailable": "AI service is unavailable, cannot generate the skill name and description. Connect an LLM service first.",
  "pl.skillModal.aiEmpty": "AI returned an empty result after automatic retries; please try again later",
  "pl.skillModal.aiParse": "AI output could not be parsed into a skill name and description; please retry",
  "pl.skillModal.aiNoRoute": "No available model found; please check your model configuration",
  "pl.skillModal.aiFailed": "AI generation failed",
  "pl.skillModal.aiFill": "Skill name and summary filled in",
  "pl.skillModal.uploadJson": "Upload JSON",
  "pl.skillModal.uploadJsonTitle": "Add custom skill entries from a JSON file: an array or a skills/entries/prompts list; each item needs title and body, optional name/summary/promptId",
  "pl.skillModal.fromJson": "JSON",
  "pl.skillModal.jsonError": "JSON parse failed: {err}",
  "pl.skillModal.jsonEmpty": "No valid skill entries found in JSON (each item needs a title and body)",
  "pl.skillExport": "Export skills",
  "pl.skillExportBtnTitle": "Export the checked prompts as DSH skills (opens an edit & validation window; written to ~/.dsh/skills/<name>/SKILL.md after validation passes)",
  "pl.skillExportNeedSelect": "Check the prompts to export as skills first",
  "pl.importConfirm": "Importing merges the backup into the current library (same ID is overwritten). Continue?",
  "pl.confirm": "OK",
  // Import edit modal (library import)
  "pl.importEdit.title": "Import prompts",
  "pl.importEdit.subtitle": "Preview and edit the imported data here. You can change the title, tags and body, and insert {{variable}} placeholders; only checked entries are imported and validation must pass first.",
  "pl.importEdit.tagsLabel": "Tags (comma separated)",
  "pl.importEdit.fromTxt": "Text",
  "pl.importEdit.noEntry": "No valid entries parsed. Pick a data file again.",
  "pl.importEdit.validatePass": "Validation passed, ready to import",
  "pl.importEdit.untitledPrompt": "Untitled prompt",
  "pl.importEdit.import": "Import",
  "pl.importEdit.importing": "Importing\u2026",
  "pl.importEdit.deselectAll": "Deselect all",
  "pl.importEdit.parseEmpty": "No valid data parsed from the file",
  "pl.importEdit.parseFail": "Failed to parse file: {err}",
  // Import / export formats
  "pl.exportFormat": "Format",
  "pl.format.txt": "Text",
  "pl.format.unsupported": "Unsupported file format. Pick a JSON / CSV / Markdown / text file",
  "pl.imported": "Import done: {imported} added, {updated} updated, {skipped} skipped",
  // Library assistant activity phase bubble
  "pl.phase.idle": "On standby, at your service",
  "pl.phase.waiting": "Your move!",
  "pl.phase.thinking": "Brains in overdrive\u2026",
  "pl.phase.tool": "Grabbing my toolbox\u2026",
  "pl.phase.review": "Tidying up\u2026",
  "pl.phase.done": "Nailed it, done!",
  "pl.phase.failed": "Oops, crashed. Retry?",
  "pl.importFail": "Import crashed: {err}",
  // Tag management
  "pl.manageTags": "Manage tags",
  "pl.manageTagsTitle": "Manage tags",
  "pl.tagsNone": "No tags",
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
  "pl.trash": "Recycle bin",
  "pl.trashTitle": "Recycle bin",
  "pl.trashEmpty": "The recycle bin is empty",
  "pl.trashDeletedAt": "Deleted at {time}",
  "pl.trashSelectAll": "Select all",
  "pl.trashRestoreSelected": "Restore selected",
  "pl.trashDeleteSelected": "Delete permanently",
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
  "pl.applyTemplateTitle": "Apply selected text to a template: pick a prompt with variables",
  "pl.applyTemplateDesc": "Selected {length} characters. Pick a template (prompt with {{variables}})",
  "pl.applyTemplateEmpty": "No variable templates in the library yet. Create one first.",
  // Context-based prompt recommendations
  "pl.recommend": "Recommended",
  "pl.set.contextRecommend": "Context prompt recommendations",
  "pl.set.contextRecommendDesc": "When the input is empty, recommend matching prompts above the input based on recent chat context; click to insert into the draft",
  // Settings
  "pl.set.autoLearn": "Auto-learn prompts",
  "pl.set.autoLearnDesc": "Auto-save complex prompts to the library",
  "pl.set.manualConfirm": "Manual confirm",
  "pl.set.manualConfirmDesc": "Show save/cancel card in chat when learning; only saved after confirm (ignored when AI enrichment is on)",
  "pl.set.autoLearnTag": "Auto-learn tag",
  "pl.set.learnStats": "Auto-learned {count} \xB7 AI refined {n} in 7 days",
  "pl.set.minLength": "Min learn length",
  "pl.set.aiEnrich": "AI enrichment",
  "pl.set.aiEnrichDesc": "When auto-learning, call harness AI to generate title/tags/summary and polish body",
  "pl.set.aiProvider": "AI Provider",
  "pl.set.aiProviderDesc": "LLM provider read from connected services; \u201CAuto-discover\u201D picks the first available provider.",
  "pl.set.aiModel": "AI Model",
  "pl.set.aiModelDesc": "Model id under this provider, read from the system; \u201CAuto-discover\u201D picks a model whose id contains deepseek.",
  "pl.set.autoDiscover": "Auto-discover",
  "pl.set.notFound": "{value} (not found)",
  "pl.set.panelWidth": "Chat prompt panel width (px)",
  "pl.set.panelHeight": "Chat prompt panel height (px)",
  "pl.set.maxCount": "Max stored prompts (items)",
  "pl.set.personTipInterval": "Library assistant hint interval (s)",
  "pl.set.personTipDuration": "Library assistant hint duration (s)",
  "pl.set.assistant": "Show library assistant",
  "pl.set.assistantDesc": "Control whether the library assistant is shown; when off, the library panel cannot be enabled",
  "pl.set.assistantUnlock": "Reach the max level to unlock this toggle and turn it off freely",
  "pl.set.assistantUnlocked": "Unlocked! You can now show or hide the library assistant freely",
  "pl.set.character": "Assistant character",
  "pl.set.characterDesc": "Pick the assistant look: classic or whale. Only configurable when the assistant is enabled",
  "pl.set.characterClassic": "Classic",
  "pl.set.characterWhale": "Whale (static)",
  "pl.set.characterDshpet": "Whale (animated)",
  "pl.set.announcement": "Show announcement dialog",
  "pl.set.announcementDesc": "Shows the Announcements entry in the assistant's context menu, opening the user guide and release notes. Only configurable when the assistant is enabled",
  "pl.set.rightPanel": "Show prompt library panel",
  "pl.set.rightPanelDesc": "Controls the prompt library panel. Requires enabling the assistant first, then use the assistant's context menu \u2192 Open Tool Panel to expand the panel",
  "pl.set.levelAssistant": "Show level assistant",
  "pl.set.levelAssistantDesc": "Show the level badge on the assistant and the Achievements entry in its context menu. Only configurable when the assistant is enabled",
  "pl.set.levelAnnouncement": "Show my level announcements",
  "pl.set.levelAnnouncementDesc": "Announce newly unlocked achievements via the assistant bubble. Only configurable when the assistant is enabled",
  "pl.set.persona": "Persona Manager",
  "pl.set.personaDesc": 'Show the "Persona Manager" entry in the assistant context menu to manage multiple AI personas and auto-switch per conversation. Only configurable when the assistant is enabled',
  "pl.set.dashboard": "Dashboard",
  "pl.set.dashboardDesc": 'Show the "Dashboard" entry in the assistant context menu to view prompt library usage stats overview and trends. Only configurable when the assistant is enabled',
  "pl.set.dataManagement": "Data Management",
  "pl.set.dataManagementDesc": 'Show the "Data Management" entry in the assistant context menu to import/export prompts, manage tags and the recycle bin. Only configurable when the assistant is enabled',
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
  "pl.set.hoverDetail": "Show details on hover",
  "pl.set.hoverDetailDesc": "Show full details when hovering a prompt in the side panel",
  "pl.set.selectionAdd": "Add prompt from selected text",
  "pl.set.selectionAddDesc": "After highlighting text in chat, show an \u201CAdd to library\u201D button and open a standalone window",
  "pl.set.lab": "Lab features",
  "pl.set.labWarning": "Experimental features below may affect all AI conversations. Enable with caution.",
  "pl.set.autoUpdate": "Auto-update",
  "pl.set.autoUpdateDesc": "Automatically install new versions in the background when available",
  "pl.set.backupEnabled": "Enable auto backup",
  "pl.set.backupEnabledDesc": "Automatically back up the database to the backup directory on the selected schedule; old backups beyond the retention count are auto-deleted",
  "pl.set.backupSchedule": "Schedule",
  "pl.set.backupScheduleDesc": "How often to run a backup: daily / weekly / monthly",
  "pl.set.backupScheduleDaily": "Daily",
  "pl.set.backupScheduleWeekly": "Weekly",
  "pl.set.backupScheduleMonthly": "Monthly",
  "pl.set.backupRetention": "Retention count",
  "pl.set.backupRetentionDesc": "Max backup files to keep; the oldest are deleted when exceeded",
  "pl.set.backupNow": "Back up now",
  "pl.set.backupBacking": "Backing up\u2026",
  "pl.set.backupDone": "Backup done: {name}",
  "pl.set.backupFail": "Backup failed. Please try again later.",
  "pl.set.backupListTitle": "Backup files",
  "pl.set.backupEmpty": "No backups yet",
  "pl.set.backupFormat": "Backup format",
  "pl.set.backupFormatDb": "Database file (.db)",
  "pl.set.backupFormatJson": "JSON export (.json)",
  "pl.set.backupFormatDesc": "File format used for manual and scheduled backups: db is a full database copy, json is a readable JSON export (restorable on its own)",
  "pl.set.restore": "Restore",
  "pl.set.restoreTitle": "Restore library from {name}",
  "pl.set.restoreConfirm": "Restore from {name}? Restoring overwrites the current library with the backup content. This cannot be undone.",
  "pl.set.restoreDone": "Restored from {format} backup, {count} prompts",
  "pl.set.restoreFail": "Restore failed: {err}",
  "pl.set.backupDelete": "Delete",
  "pl.set.backupDeleteTitle": "Delete backup file",
  "pl.set.backupDeleteConfirm": "Delete backup file {name}? This cannot be undone.",
  "pl.set.backupDeleteDone": "Deleted backup {name}",
  "pl.set.backupDeleteFail": "Failed to delete backup: {err}",
  "pl.set.updateReminder": "Update reminder",
  "pl.set.checkUpdate": "Check for updates",
  "pl.set.updateChecking": "Checking for updates\u2026",
  "pl.set.updateCurrent": "Current version: v{version}",
  "pl.set.updateAvailable": "New version available v{version}",
  "pl.set.updateLatest": "You're up to date",
  "pl.set.updateNow": "Update",
  "pl.set.updating": "Updating\u2026",
  "pl.set.updateSuccess": "Update completed successfully. New version installed.",
  "pl.set.updateFail": "Update failed. Please try again later.",
  "pl.set.updateRequireRestartHint": "You must restart dsh web after the update; otherwise the old code keeps running.",
  "pl.set.updateSuccessRestartTitle": "Be sure to restart dsh web",
  "pl.set.updateSuccessRestartHint": "New code is installed but not active yet. A full restart of dsh web (via scheduled task DSHConsoleAutostart recommended) is required before any new features take effect.",
  "pl.set.dataSection": "Library management",
  "pl.set.dataSectionDesc": "Export all prompts as a backup file, import from a backup file, and manage prompt tags centrally (rename / delete).",
  "pl.footer.disclaimer": 'This plugin is provided "as is", without warranty of any kind, express or implied. Use at your own risk.',
  "pl.setSectionTitle": "Library settings",
  "pl.set.setSectionDesc": "Configure how prompts are saved, panel display, interaction entries, and AI capabilities.",
  "pl.setModuleLearn": "Auto-learn",
  "pl.setModuleLearnDesc": "Auto-save complex prompts to the library, with optional AI enrichment.",
  "pl.setModulePanel": "Panel display",
  "pl.setModulePanelDesc": "Customize prompt panel size and the max number of stored prompts.",
  "pl.setModuleDisplay": "Display & interaction",
  "pl.setModuleDisplayDesc": "Control how each entry point is shown and triggered.",
  "pl.setModuleBackup": "Backup Management",
  "pl.setModuleBackupDesc": "Manage auto-backup settings, manual backup and backup restore.",
  "pl.setModuleAboutUpdate": "About & Updates",
  "pl.setModuleAboutUpdateDesc": "View plugin version and copyright info, and manage plugin updates.",
  "pl.about.version": "Version",
  "pl.about.author": "Author",
  "pl.about.license": "License",
  "pl.about.repo": "Repository",
  "pl.about.copyright": "Copyright \xA9 {year} {author}. All rights reserved.",
  "pl.tagFilterAll": "All",
  // Statistics visualization
  "pl.stats.title": "Statistics",
  "pl.stats.view": "View statistics",
  "pl.stats.back": "Back to list",
  "pl.stats.loadFail": "Failed to load statistics",
  "pl.stats.neverUsed": "Never used",
  "pl.stats.justNow": "Just now",
  "pl.stats.minAgo": "{n} min ago",
  "pl.stats.hourAgo": "{n} h ago",
  "pl.stats.dayAgo": "{n} days ago",
  "pl.stats.emptyList": "No data yet",
  "pl.stats.trend": "Weekly trend",
  "pl.stats.trendEmpty": "No trend data yet; it is generated automatically over time",
  "pl.stats.trendAdded": "Added",
  "pl.stats.trendUsage": "Used",
  "pl.stats.total": "Total prompts",
  "pl.stats.totalUsage": "Total uses",
  "pl.stats.usedRate": "Usage rate",
  "pl.stats.usedCount": "{count} used",
  "pl.stats.aiRefined": "AI refinements",
  "pl.stats.aiRefinedCount": "{count} in total",
  "pl.stats.used7": "Used in 7 days",
  "pl.stats.used30": "Used in 30 days",
  "pl.stats.added7": "Added in 7 days",
  "pl.stats.added30": "Added in 30 days",
  "pl.stats.topUsed7": "Top used (7d)",
  "pl.stats.aiRefined7": "AI refined (7d)",
  "pl.stats.analysis": "7-day Analysis",
  "pl.stats.analysisEmpty": "No analysis yet; generated after 7 days",
  "pl.stats.analysisPeriod": "Period {start} ~ {end}",
  "pl.stats.analysisAdded": "Added",
  "pl.stats.analysisUsage": "Used",
  "pl.stats.analysisActive": "{n} active",
  "pl.stats.analysisAi": "AI refined",
  "pl.stats.analysisNewTitles": "New prompts",
  "pl.stats.aiComment": "AI Review",
  "pl.stats.avgBody": "Avg. body length",
  "pl.stats.trash": "Recycle bin",
  "pl.stats.tags": "Tags",
  "pl.stats.topUsed": "Most used",
  "pl.stats.recentUsed": "Recently used",
  "pl.stats.sleeper": "Dormant prompts",
  "pl.stats.sleeperEmpty": "No dormant prompts",
  "pl.stats.days": "{days} days idle",
  "pl.stats.tabOverview": "Overview",
  "pl.stats.tabHeatmap": "Heatmap",
  "pl.stats.tabLifecycle": "Lifecycle",
  "pl.stats.tabDetails": "Details",
  "pl.stats.heatmapEmpty": "No usage records yet; once you use prompts, they will show here by weekday \xD7 hour",
  "pl.stats.week0": "Sun",
  "pl.stats.week1": "Mon",
  "pl.stats.week2": "Tue",
  "pl.stats.week3": "Wed",
  "pl.stats.week4": "Thu",
  "pl.stats.week5": "Fri",
  "pl.stats.week6": "Sat",
  "pl.stats.lcAdded": "Added (7d)",
  "pl.stats.lcActive": "Reused (7d)",
  "pl.stats.lcDormant": "Dormant (unused)",
  "pl.stats.lcActive30": "{n} in 30d",
  "pl.stats.lcTrash": "Recycle bin",
  "pl.stats.tabInsight": "Insight",
  "pl.stats.times": "times",
  "pl.stats.healthTitle": "Health score",
  "pl.stats.healthGreat": "Very healthy",
  "pl.stats.healthGood": "Healthy",
  "pl.stats.healthOk": "Needs work",
  "pl.stats.healthPoor": "Needs care",
  "pl.stats.healthDimUtil": "Usage rate",
  "pl.stats.healthDimActive": "Active (30d)",
  "pl.stats.healthDimAi": "AI refined",
  "pl.stats.growthTitle": "Growth trend",
  "pl.stats.cumAdded": "Total added",
  "pl.stats.cumUsed": "Total used",
  "pl.stats.peakTitle": "Peak usage",
  "pl.stats.peakPrimary": "Peak: {day} {hour}, {n} items",
  "pl.stats.peakSecondary": "2nd: {day} {hour}",
  "pl.stats.hotRankTags": "Top tags",
  "pl.stats.hotRankWeek": "This week's top"
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
function usePLT(t) {
  const base = t ?? fallbackT;
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

// src/client/components/assistant/AnnouncementModal.tsx
var import_react4 = require("react");
var import_react_dom = require("react-dom");

// src/client/components/common/DialogCloseButton.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function DialogCloseButton({ onClick, label = "\u5173\u95ED" }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "button",
    {
      type: "button",
      onClick,
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
        color: TONE18.muted,
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
        e.currentTarget.style.color = TONE18.text;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = TONE18.muted;
      },
      children: "\u2715"
    }
  );
}

// src/client/utils/dialog-style.ts
var PL_DIALOG = "pl-dialog";
var PL_DIALOG_OVERLAY = "pl-dialog-overlay";
var PL_DIALOG_CSS = `
.pl-dialog{box-sizing:border-box;display:flex;flex-direction:column;border-radius:24px;background:var(--dsw-specific-sidebar-fill,#f5f6f7);border:1px solid var(--dsw-alias-border-l2,rgba(17,24,39,.14));box-shadow:0 10px 32px rgba(2,6,23,.2),0 2px 8px rgba(2,6,23,.1),inset 0 1px 0 rgba(255,255,255,.55);padding:18px 7px 18px 10px;color:var(--dsw-alias-label-primary,#f2f6fc);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif)}
.pl-dialog-overlay{position:fixed;inset:0;z-index:2147483647;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.35)}
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
`;

// src/client/components/assistant/AnnouncementModal.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var SERIF = 'Georgia, "Times New Roman", "Songti SC", "SimSun", "PMingLiU", serif';
var MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
  "pl.announce.manual.5"
];
function sanitizeText(s) {
  if (!s) return "";
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function parseDate(s) {
  try {
    return s ? /* @__PURE__ */ new Date(`${s}T00:00:00`) : /* @__PURE__ */ new Date();
  } catch {
    return /* @__PURE__ */ new Date();
  }
}
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function ColumnTitle({ children }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { marginBottom: 9 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        style: {
          fontFamily: SERIF,
          fontSize: 15,
          fontWeight: 700,
          color: TONE18.text,
          letterSpacing: 0.4,
          lineHeight: 1.3
        },
        children
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        style: {
          marginTop: 4,
          height: 2,
          width: 34,
          background: TONE18.accent,
          borderRadius: 1
        }
      }
    )
  ] });
}
function NavIcon({
  onClick,
  disabled,
  label,
  children
}) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "button",
    {
      type: "button",
      title: label,
      disabled,
      onClick,
      style: {
        border: `1px solid ${TONE18.border}`,
        background: TONE18.panel,
        color: disabled ? TONE18.quiet : TONE18.text,
        borderRadius: 7,
        minWidth: 24,
        height: 22,
        padding: "0 6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        fontSize: 12,
        lineHeight: 1,
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.24s, color 0.24s"
      },
      onMouseEnter: (e) => {
        if (disabled) return;
        e.currentTarget.style.background = TONE18.row;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = TONE18.panel;
      },
      children
    }
  );
}
function AnnouncementModal({ open, onClose, t }) {
  useThemeSync();
  const TONE18 = getTone();
  const lang = t("pl.announce.dailyTitle") === "Daily Report" ? "en" : "zh";
  const [data, setData] = (0, import_react4.useState)(null);
  const [daily, setDaily] = (0, import_react4.useState)(null);
  const [currentDate, setCurrentDate] = (0, import_react4.useState)(() => toDateKey(/* @__PURE__ */ new Date()));
  const [historyOpen, setHistoryOpen] = (0, import_react4.useState)(false);
  (0, import_react4.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    setDaily(null);
    setCurrentDate(toDateKey(/* @__PURE__ */ new Date()));
    getAnnouncement(lang).then((res) => {
      if (alive) setData(res);
    }).catch(() => {
    });
    getAnnouncementDaily(lang).then((res) => {
      if (alive) setDaily(res);
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, [open, lang]);
  const goTo = (date) => {
    setCurrentDate(date);
    setHistoryOpen(false);
    getAnnouncementDaily(lang, date).then(setDaily).catch(() => setDaily(null));
  };
  const pages = daily?.availableDates ?? [];
  const pageIdx = daily ? pages.indexOf(daily.date) : -1;
  const hasPrev = pageIdx > 0;
  const hasNext = pageIdx >= 0 && pageIdx < pages.length - 1;
  const latest = (0, import_react4.useMemo)(() => {
    if (!data?.versions || data.versions.length === 0) return null;
    const byCurrent = data.current ? data.versions.find((v) => v.version === data.current) : void 0;
    return byCurrent ?? data.versions[0];
  }, [data]);
  if (!open) return null;
  const manualItems = data?.manual && data.manual.length > 0 ? data.manual.map((m) => m.text).filter(Boolean) : MANUAL_KEYS.map((key) => t(key));
  const dateLabel = (() => {
    try {
      const d = parseDate(daily?.date);
      return d.toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
      });
    } catch {
      return daily?.date ?? "";
    }
  })();
  const editionNo = pages.length > 0 && pageIdx >= 0 ? pages.length - pageIdx : 1;
  const loadingHint = daily === null;
  const historyLabels = pages.map((d) => ({
    date: d,
    label: (() => {
      try {
        return parseDate(d).toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch {
        return d;
      }
    })()
  }));
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("pl.announce.title"),
        className: PL_DIALOG_OVERLAY,
        onClick: onClose,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: `@keyframes plPageFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pl-page-turn{animation:plPageFade .32s ease-out}` }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              onClick: (e) => e.stopPropagation(),
              className: PL_DIALOG,
              style: {
                width: 780,
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "min(700px, calc(100vh - 40px))"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      paddingRight: 10,
                      paddingTop: 2,
                      paddingBottom: 8
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "div",
                        {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                            userSelect: "none"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(NavIcon, { onClick: () => hasNext && pages[pageIdx + 1] && goTo(pages[pageIdx + 1]), disabled: !hasNext, label: t("pl.announce.prevEdition"), children: [
                              "\u2039 ",
                              t("pl.announce.prevEdition")
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, textAlign: "center", fontSize: 12.5, color: TONE18.muted, fontFamily: SERIF }, children: [
                              daily?.date ?? currentDate,
                              " \xB7 ",
                              t("pl.announce.editionNo", { n: editionNo })
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(NavIcon, { onClick: () => hasPrev && pages[pageIdx - 1] && goTo(pages[pageIdx - 1]), disabled: !hasPrev, label: t("pl.announce.nextEdition"), children: [
                              t("pl.announce.nextEdition"),
                              " \u203A"
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NavIcon, { onClick: () => goTo(toDateKey(/* @__PURE__ */ new Date())), disabled: daily?.isToday === true, label: t("pl.announce.today"), children: t("pl.announce.today") }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { position: "relative" }, children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(NavIcon, { onClick: () => setHistoryOpen((v) => !v), disabled: pages.length <= 0, label: t("pl.announce.history"), children: [
                                t("pl.announce.history"),
                                " \u25BE"
                              ] }),
                              historyOpen && pages.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                "div",
                                {
                                  style: {
                                    position: "absolute",
                                    right: 0,
                                    top: 26,
                                    zIndex: 40,
                                    minWidth: 150,
                                    maxHeight: 220,
                                    overflow: "auto",
                                    background: TONE18.panel,
                                    border: `1px solid ${TONE18.borderStrong}`,
                                    borderRadius: 8,
                                    padding: 4
                                  },
                                  children: historyLabels.map((h) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => goTo(h.date),
                                      style: {
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        border: "none",
                                        background: h.date === daily?.date ? TONE18.row : "transparent",
                                        color: TONE18.text,
                                        fontSize: 12,
                                        padding: "6px 8px",
                                        borderRadius: 6,
                                        cursor: "pointer"
                                      },
                                      children: h.label
                                    },
                                    h.date
                                  ))
                                }
                              )
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "header",
                        {
                          style: {
                            textAlign: "center",
                            paddingBottom: 10,
                            borderBottom: `3px double ${TONE18.text}`,
                            marginBottom: 14,
                            userSelect: "none"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { fontFamily: SERIF, fontSize: 13, color: TONE18.quiet, letterSpacing: 2 }, children: [
                              "\u2014\u2014\u2014 ",
                              t("pl.announce.title"),
                              " \u2014\u2014\u2014"
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                              "div",
                              {
                                style: {
                                  fontFamily: SERIF,
                                  fontSize: 32,
                                  fontWeight: 800,
                                  color: TONE18.text,
                                  lineHeight: 1.15,
                                  letterSpacing: 6,
                                  marginTop: 2
                                },
                                children: t("pl.announce.masthead")
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                              "div",
                              {
                                style: {
                                  marginTop: 2,
                                  fontSize: 12,
                                  color: TONE18.muted,
                                  letterSpacing: 1
                                },
                                children: t("pl.announce.mastheadSub")
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                              "div",
                              {
                                style: {
                                  marginTop: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: 11.5,
                                  color: TONE18.quiet
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: dateLabel }),
                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { letterSpacing: 1 }, children: lang === "en" ? "Vol. TODAY \xB7 EDITION 1" : "\u4ECA\u65E5 \xB7 \u7B2C\u4E00\u671F" })
                                ]
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "div",
                        {
                          className: "pl-page-turn",
                          style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                            "div",
                            {
                              style: {
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gridTemplateRows: "1fr 1fr",
                                gap: 20,
                                flex: 1,
                                minHeight: 0
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                  "section",
                                  {
                                    style: {
                                      minWidth: 0,
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      overflow: "hidden"
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ColumnTitle, { children: t("pl.announce.dailyTitle") }),
                                      loadingHint || !daily?.report || daily.report.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, color: TONE18.quiet, fontStyle: "italic", lineHeight: 1.7 }, children: t("pl.announce.noDaily") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                        "ul",
                                        {
                                          style: {
                                            margin: 0,
                                            padding: "0 6px 0 0",
                                            listStyle: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 9,
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: "auto"
                                          },
                                          children: daily.report.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { style: { display: "flex", gap: 8 }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "span",
                                              {
                                                style: {
                                                  flexShrink: 0,
                                                  fontSize: 11,
                                                  lineHeight: "20px",
                                                  fontFamily: SERIF,
                                                  fontWeight: 700,
                                                  color: TONE18.accent
                                                },
                                                children: String(i + 1).padStart(2, "0")
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { minWidth: 0 }, children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                "div",
                                                {
                                                  style: {
                                                    fontFamily: SERIF,
                                                    fontSize: 13.5,
                                                    fontWeight: 700,
                                                    color: TONE18.text,
                                                    lineHeight: 1.4,
                                                    marginBottom: 2
                                                  },
                                                  children: item.headline
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, color: TONE18.muted, lineHeight: 1.6 }, children: item.body })
                                            ] })
                                          ] }, i))
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                  "section",
                                  {
                                    style: {
                                      minWidth: 0,
                                      borderLeft: `1px solid ${TONE18.border}`,
                                      paddingLeft: 18,
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      overflow: "hidden"
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ColumnTitle, { children: t("pl.announce.techTitle") }) }),
                                      loadingHint || !daily?.news || daily.news.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, color: TONE18.quiet, fontStyle: "italic", lineHeight: 1.7 }, children: t("pl.announce.noDaily") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                        "ul",
                                        {
                                          style: {
                                            margin: 0,
                                            padding: "0 6px 0 0",
                                            listStyle: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: "auto"
                                          },
                                          children: daily.news.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { style: { borderBottom: `1px dotted ${TONE18.border}`, paddingBottom: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "flex-start" }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "span",
                                              {
                                                style: {
                                                  flexShrink: 0,
                                                  fontSize: 10.5,
                                                  lineHeight: "18px",
                                                  fontFamily: SERIF,
                                                  fontWeight: 700,
                                                  color: TONE18.quiet
                                                },
                                                children: String(i + 1).padStart(2, "0")
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { minWidth: 0 }, children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                "div",
                                                {
                                                  style: {
                                                    fontFamily: SERIF,
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: TONE18.text,
                                                    lineHeight: 1.4
                                                  },
                                                  children: sanitizeText(item.title)
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, color: TONE18.muted, lineHeight: 1.55, marginTop: 1 }, children: sanitizeText(item.summary) }),
                                              item.url && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                                "a",
                                                {
                                                  href: item.url,
                                                  target: "_blank",
                                                  rel: "noreferrer noopener",
                                                  style: {
                                                    fontSize: 11.5,
                                                    color: TONE18.accent,
                                                    textDecoration: "none",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 3,
                                                    marginTop: 3
                                                  },
                                                  children: [
                                                    t("pl.announce.openLink"),
                                                    " \u2192"
                                                  ]
                                                }
                                              )
                                            ] })
                                          ] }) }, i))
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                  "section",
                                  {
                                    style: {
                                      minWidth: 0,
                                      borderTop: `1px solid ${TONE18.border}`,
                                      paddingTop: 16,
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      overflow: "hidden"
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ColumnTitle, { children: t("pl.announce.manualTitle") }),
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                        "ul",
                                        {
                                          style: {
                                            margin: 0,
                                            padding: 0,
                                            listStyle: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: "auto"
                                          },
                                          children: manualItems.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                            "li",
                                            {
                                              style: {
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 8,
                                                fontSize: 13,
                                                lineHeight: 1.65,
                                                color: TONE18.muted
                                              },
                                              children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                  "span",
                                                  {
                                                    style: {
                                                      flexShrink: 0,
                                                      width: 5,
                                                      height: 5,
                                                      borderRadius: "50%",
                                                      background: TONE18.accent,
                                                      marginTop: 8
                                                    }
                                                  }
                                                ),
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: item })
                                              ]
                                            },
                                            idx
                                          ))
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                  "section",
                                  {
                                    style: {
                                      minWidth: 0,
                                      borderTop: `1px solid ${TONE18.border}`,
                                      borderLeft: `1px solid ${TONE18.border}`,
                                      paddingLeft: 18,
                                      paddingTop: 16,
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      overflow: "hidden"
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ColumnTitle, { children: t("pl.announce.noticeTitle") }),
                                      latest ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                          "div",
                                          {
                                            style: {
                                              display: "flex",
                                              alignItems: "baseline",
                                              gap: 8,
                                              flexWrap: "wrap",
                                              minWidth: 0,
                                              flexShrink: 0
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                                "span",
                                                {
                                                  style: {
                                                    fontFamily: SERIF,
                                                    fontSize: 12.5,
                                                    fontWeight: 700,
                                                    color: TONE18.accent,
                                                    letterSpacing: 0.3
                                                  },
                                                  children: [
                                                    "v",
                                                    latest.version
                                                  ]
                                                }
                                              ),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: 12, fontWeight: 700, color: TONE18.text }, children: latest.title }),
                                              latest.date && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: 10.5, color: TONE18.quiet, fontWeight: 500 }, children: latest.date })
                                            ]
                                          }
                                        ),
                                        latest.items.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                          "ul",
                                          {
                                            style: {
                                              margin: 0,
                                              padding: "8px 6px 0 0",
                                              listStyle: "none",
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 6,
                                              flex: 1,
                                              minHeight: 0,
                                              overflowY: "auto"
                                            },
                                            children: latest.items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                              "li",
                                              {
                                                style: {
                                                  display: "flex",
                                                  gap: 6,
                                                  fontSize: 11.5,
                                                  lineHeight: 1.65,
                                                  color: TONE18.muted
                                                },
                                                children: [
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { flexShrink: 0, color: TONE18.accent, fontWeight: 700 }, children: "\xB7" }),
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: item })
                                                ]
                                              },
                                              i
                                            ))
                                          }
                                        )
                                      ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: 12, color: TONE18.quiet, fontStyle: "italic" }, children: t("pl.announce.noNotice") })
                                    ]
                                  }
                                )
                              ]
                            }
                          )
                        },
                        daily?.date ?? currentDate
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
    document.body
  );
}

// src/client/components/assistant/AchievementModal.tsx
var import_react5 = require("react");
var import_react_dom2 = require("react-dom");

// src/client/utils/sprite.ts
var LEVEL_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb923c"];
function clampLevel(level) {
  const n = Math.floor(level ?? 1);
  return Math.min(Math.max(n, 1), LEVEL_COLORS.length);
}
var SPRITE_CELL = 72;
var SPRITE_COLUMNS = 8;
var TRACK_ROW = {
  idle: 0,
  hover: 1,
  waiting: 2,
  thinking: 3,
  tool: 4,
  review: 5,
  done: 6,
  failed: 7,
  wave: 8
};
var SPRITE_ROWS = Object.keys(TRACK_ROW).length;
var TRACKS = {
  idle: { frames: [0, 1, 2, 3], durations: [450, 110, 450, 470] },
  hover: { frames: [0, 1, 2, 3], durations: [150, 150, 150, 150] },
  waiting: { frames: [0, 1, 2, 3], durations: [520, 520, 520, 520] },
  thinking: { frames: [0, 1, 2, 1], durations: [340, 340, 340, 340] },
  tool: { frames: [0, 1, 2, 3], durations: [400, 400, 400, 400] },
  review: { frames: [0, 1, 0, 2], durations: [460, 460, 460, 460] },
  done: { frames: [0, 1, 2, 3, 4], durations: [170, 170, 170, 170, 240] },
  failed: { frames: [0, 1, 2, 3], durations: [90, 90, 90, 90] },
  wave: { frames: [0, 1, 2, 3], durations: [150, 150, 150, 150] }
};
var SEQUENCES = {
  idle: ["idle"],
  waiting: ["waiting"],
  thinking: ["thinking"],
  tool: ["tool"],
  review: ["review"],
  done: ["done", "wave"],
  failed: ["failed"]
};
var HOVER_SEQUENCE = ["wave", "idle"];
var WHALE_COLUMNS = 8;
var WHALE_ROWS = 9;
var WHALE_ASSET_URL = "/api/prompt-library/assets/whale";
var WHALE_TRACK_ROW = {
  idle: 0,
  // 待机
  hover: 3,
  // 打招呼 → 挥舞
  waiting: 6,
  // 等待
  thinking: 7,
  // 思考 → 小跑
  tool: 1,
  // 忙碌 → 向右移动
  review: 8,
  // 整理
  done: 4,
  // 完成 → 跳跃
  failed: 5,
  // 失败
  wave: 3
  // 挥舞（打招呼）
};
var WHALE_TRACKS = {
  idle: { frames: [0, 1, 2, 3, 4, 5], durations: [500, 500, 600, 500, 500, 600] },
  hover: { frames: [0, 1, 2, 3], durations: [450, 450, 450, 450] },
  waiting: { frames: [0, 1, 2, 3, 4, 5], durations: [550, 550, 600, 550, 550, 600] },
  thinking: { frames: [0, 1, 2, 3, 4, 5], durations: [330, 330, 330, 330, 330, 400] },
  tool: { frames: [0, 1, 2, 3, 4, 5, 6, 7], durations: [300, 300, 300, 300, 300, 300, 300, 400] },
  review: { frames: [0, 1, 2, 3, 4, 5], durations: [650, 650, 650, 650, 650, 650] },
  done: { frames: [0, 1, 2, 3, 4], durations: [400, 400, 400, 450, 450] },
  failed: { frames: [0, 1, 2, 3, 4, 5, 6, 7], durations: [550, 550, 550, 600, 650, 700, 550, 550] },
  wave: { frames: [0, 1, 2, 3], durations: [450, 450, 450, 450] }
};
function sequenceFrame(sequence, elapsedMs, tracks = TRACKS) {
  const itemDurations = sequence.map((tk) => tracks[tk].durations.reduce((a, b) => a + b, 0));
  const total = itemDurations.reduce((a, b) => a + b, 0);
  let off = Math.max(0, elapsedMs) % total;
  let item = 0;
  while (item < sequence.length - 1 && off >= itemDurations[item]) {
    off -= itemDurations[item];
    item += 1;
  }
  const track = sequence[item];
  const dur = tracks[track].durations;
  const frames = tracks[track].frames;
  let col = 0;
  while (col < frames.length - 1 && off >= dur[col]) {
    off -= dur[col];
    col += 1;
  }
  return { track, col: frames[col] };
}
var BASE2 = { dip: 0, tilt: 0, shx: 0, arm: 0, blink: 0, squashY: 1, mouth: "smile", cheek: 0.55 };
var P = (p) => ({ ...BASE2, ...p });
var POSE = {
  // 待机：嘴在「微笑」与「o 形」间交替，呈现轻柔的开合呼吸/说话感
  idle: [P({ mouth: "smile" }), P({ dip: 1, mouth: "open" }), P({ mouth: "smile" }), P({ dip: -1, mouth: "open" })],
  hover: [P({ mouth: "open" }), P({ dip: -3, mouth: "open", arm: 0.2 }), P({ mouth: "open" }), P({ dip: -2, mouth: "open" })],
  waiting: [P({}), P({ tilt: -4 }), P({}), P({ tilt: 4 })],
  thinking: [P({ tilt: 6, dip: -1 }), P({ tilt: 6, dip: -2 }), P({ tilt: 5 }), P({ tilt: 6, dip: -1 })],
  tool: [P({ tilt: -5 }), P({ tilt: -7, dip: 1 }), P({ tilt: -5 }), P({ tilt: -3 })],
  review: [P({ tilt: -3 }), P({}), P({ tilt: 3 }), P({})],
  done: [
    P({ mouth: "open" }),
    P({ dip: -8, mouth: "open" }),
    P({ squashY: 0.92, mouth: "open" }),
    P({ dip: -5, mouth: "open" }),
    P({ mouth: "open" })
  ],
  failed: [P({ mouth: "frown" }), P({ shx: -4, mouth: "frown" }), P({ mouth: "frown" }), P({ shx: 4, mouth: "frown" })],
  wave: [P({ arm: -0.55, mouth: "open" }), P({ arm: 0, mouth: "open" }), P({ arm: -0.9, mouth: "smile" }), P({ arm: 0, mouth: "open" })]
};
function resolvePalette() {
  const body = "#f9f5ec";
  const feature = "#1f2937";
  let outline = "#c9c2b4";
  try {
    const v = window.getComputedStyle(document.documentElement).getPropertyValue("--dsw-alias-border-l2").trim();
    if (v) outline = v;
  } catch {
  }
  return { body, feature, outline };
}
function drawEyes(ctx, blink, pal) {
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.arc(31, 33, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(41, 33, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (blink >= 0.4) {
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(29.6, 33.4);
    ctx.lineTo(32.4, 33.4);
    ctx.moveTo(39.6, 33.4);
    ctx.lineTo(42.4, 33.4);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(32, 33.6, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 33.6, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}
var MOUTH_RED = "#ff6b5e";
function drawMouth(ctx, mouth) {
  ctx.strokeStyle = MOUTH_RED;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.fillStyle = MOUTH_RED;
  if (mouth === "open") {
    ctx.beginPath();
    ctx.ellipse(36, 42, 3.9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0553f";
    ctx.beginPath();
    ctx.ellipse(36, 42.7, 2.4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mouth === "frown") {
    ctx.beginPath();
    ctx.moveTo(30, 42);
    ctx.quadraticCurveTo(36, 38.5, 42, 42);
    ctx.stroke();
  } else if (mouth === "flat") {
    ctx.beginPath();
    ctx.moveTo(32, 41);
    ctx.lineTo(40, 41);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(30, 39.5);
    ctx.quadraticCurveTo(36, 43.5, 42, 39.5);
    ctx.stroke();
  }
}
function applyMood(pose, mood) {
  if (mood === "sad") {
    return {
      ...pose,
      mouth: "frown",
      dip: pose.dip - 1.2
      // 略低头，垂头丧气
    };
  }
  if (mood === "happy") {
    const mouth = pose.mouth === "smile" || pose.mouth === "flat" ? "open" : pose.mouth;
    return { ...pose, mouth, cheek: Math.min(1, pose.cheek + 0.25) };
  }
  return pose;
}
function drawHardHat(ctx) {
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.ellipse(36, 23, 13, 8.5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(21, 23, 30, 3.6);
  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.ellipse(36, 15.5, 6, 2.6, 0, Math.PI, 0);
  ctx.fill();
}
function drawBeret(ctx) {
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath();
  ctx.ellipse(36, 17, 14.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(36, 12.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.beginPath();
  ctx.ellipse(36, 20, 14.5, 3.4, 0, Math.PI, 0);
  ctx.fill();
}
function drawTie(ctx) {
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(30, 47.5);
  ctx.lineTo(42, 47.5);
  ctx.lineTo(38, 51);
  ctx.lineTo(34, 51);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(33.5, 50);
  ctx.lineTo(38.5, 50);
  ctx.lineTo(39.5, 60.5);
  ctx.lineTo(36, 63);
  ctx.lineTo(32.5, 60.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(34.5, 50.5);
  ctx.lineTo(37.5, 50.5);
  ctx.lineTo(37, 61.5);
  ctx.lineTo(35, 61.5);
  ctx.closePath();
  ctx.fill();
}
function drawGlasses(ctx, pal) {
  ctx.strokeStyle = pal.feature;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(31, 33, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(41, 33, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(35.2, 33);
  ctx.lineTo(36.8, 33);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(26.8, 33);
  ctx.lineTo(24.5, 33.5);
  ctx.moveTo(45.2, 33);
  ctx.lineTo(47.5, 33.5);
  ctx.stroke();
}
function drawCostume(ctx, topic, pal) {
  switch (topic) {
    case "code":
      drawHardHat(ctx);
      break;
    case "writing":
      drawBeret(ctx);
      break;
    case "translate":
      drawTie(ctx);
      break;
    case "qa":
      drawGlasses(ctx, pal);
      break;
    default:
      break;
  }
}
function drawLevelBadge(ctx, level) {
  const color = LEVEL_COLORS[clampLevel(level) - 1];
  ctx.fillStyle = color;
  ctx.beginPath();
  const cx = 36;
  const cy = 60;
  const R = 5.4;
  const r = 2.3;
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
function drawEars(ctx, pal) {
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(27.5, 14.5, 4.6, 9, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = pal.body;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(44.5, 14.5, 4.6, 9, -0.12, 0, Math.PI * 2);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f6a9c4";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(27.5, 14.5, 2, 6, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(44.5, 14.5, 2, 6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawCell(ctx, gx, gy, pose, pal, opts) {
  const p = applyMood(pose, opts.mood);
  ctx.save();
  ctx.translate(gx, gy);
  ctx.translate(p.shx, p.dip);
  ctx.translate(36, 47);
  ctx.rotate(p.tilt * Math.PI / 180);
  ctx.scale(1, p.squashY);
  ctx.translate(-36, -47);
  drawBunnyBody(ctx, p, pal, opts);
  ctx.restore();
}
function drawBunnyBody(ctx, p, pal, opts) {
  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(36, 42, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(36, 47);
  ctx.rotate(p.arm);
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.ellipse(-11, 4, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(33, 49, 3.4, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(39, 49, 3.4, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(29, 52, 4.2, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(43, 52, 4.2, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawEars(ctx, pal);
  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(36, 34, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.5 * p.cheek;
  ctx.fillStyle = "#f6a9c4";
  ctx.beginPath();
  ctx.arc(29, 37, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(43, 37, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawEyes(ctx, p.blink, pal);
  drawMouth(ctx, p.mouth);
  drawCostume(ctx, opts.topic, pal);
  drawLevelBadge(ctx, opts.level);
}
async function buildSheet(opts) {
  const pal = resolvePalette();
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_CELL * SPRITE_COLUMNS;
  canvas.height = SPRITE_CELL * SPRITE_ROWS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  const order = Object.keys(TRACK_ROW);
  for (const track of order) {
    const row = TRACK_ROW[track];
    const frames = TRACKS[track].frames;
    const poses = POSE[track];
    for (let i = 0; i < frames.length; i += 1) {
      const col = frames[i];
      const pose = poses[Math.min(i, poses.length - 1)];
      drawCell(ctx, col * SPRITE_CELL, row * SPRITE_CELL, pose, pal, opts);
    }
  }
  const url = canvas.toDataURL("image/png");
  return { url, cellW: SPRITE_CELL, cellH: SPRITE_CELL, columns: SPRITE_COLUMNS, rows: SPRITE_ROWS, trackRow: TRACK_ROW, tracks: TRACKS };
}
var sheetCache = /* @__PURE__ */ new Map();
function getSpriteSheet(opts = {}) {
  const key = `${opts.character ?? "classic"}-${opts.level ?? 1}-${opts.topic ?? "general"}-${opts.mood ?? "neutral"}`;
  let p = sheetCache.get(key);
  if (!p) {
    p = buildSheet(opts).catch(() => null);
    sheetCache.set(key, p);
  }
  return p;
}
var whaleSheetPromise = null;
function getWhaleSpriteSheet() {
  if (!whaleSheetPromise) {
    whaleSheetPromise = Promise.resolve({
      url: WHALE_ASSET_URL,
      cellW: 192,
      cellH: 208,
      columns: WHALE_COLUMNS,
      rows: WHALE_ROWS,
      trackRow: WHALE_TRACK_ROW,
      tracks: WHALE_TRACKS
    });
  }
  return whaleSheetPromise;
}

// src/client/components/assistant/AchievementModal.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function levelColor(level) {
  return LEVEL_COLORS[Math.min(Math.max(level, 1), LEVEL_COLORS.length) - 1];
}
function LevelRing({ level, TONE: TONE18 }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, level.pct));
  const dash = pct / 100 * C;
  const color = levelColor(level.level);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { position: "relative", width: 108, height: 108, flexShrink: 0 }, "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("svg", { width: "108", height: "108", viewBox: "0 0 108 108", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "54", cy: "54", r: R, fill: TONE18.panel, stroke: TONE18.border, strokeWidth: "8" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "circle",
        {
          cx: "54",
          cy: "54",
          r: R,
          fill: "none",
          stroke: color,
          strokeWidth: "8",
          strokeLinecap: "round",
          strokeDasharray: `${dash} ${C - dash}`,
          transform: "rotate(-90 54 54)",
          style: { transition: "stroke-dasharray .4s ease" }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          textAlign: "center"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 21, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: 0.3 }, children: [
            "Lv.",
            level.level
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "span",
            {
              style: {
                fontSize: 10.5,
                fontWeight: 600,
                color: TONE18.muted,
                whiteSpace: "nowrap",
                maxWidth: 92,
                overflow: "hidden",
                textOverflow: "ellipsis"
              },
              children: level.title
            }
          )
        ]
      }
    )
  ] });
}
var RARITY_COLORS = {
  common: { base: "#94a3b8", high: "#cbd5e1", deep: "#64748b", border: "rgba(148,163,184,.55)", shadow: "rgba(148,163,184,.28)", text: "#94a3b8" },
  rare: { base: "#3b82f6", high: "#93c5fd", deep: "#1d4ed8", border: "rgba(59,130,246,.55)", shadow: "rgba(59,130,246,.35)", text: "#3b82f6" },
  epic: { base: "#8b5cf6", high: "#c4b5fd", deep: "#6d28d9", border: "rgba(139,92,246,.55)", shadow: "rgba(139,92,246,.35)", text: "#8b5cf6" },
  legendary: { base: "#f59e0b", high: "#fde68a", deep: "#b45309", border: "rgba(245,158,11,.6)", shadow: "rgba(245,158,11,.38)", text: "#d97706" },
  myth: { base: "#e879f9", high: "#f5d0fe", deep: "#a21caf", border: "rgba(232,121,249,.6)", shadow: "rgba(192,38,211,.4)", text: "#c026d3" }
};
var LEVEL_GRAD = {
  1: { from: "#9aa4b2", to: "#5b6472", glow: "rgba(120,130,150,.5)" },
  2: { from: "#60a5fa", to: "#2563eb", glow: "rgba(37,99,235,.55)" },
  3: { from: "#a78bfa", to: "#6d28d9", glow: "rgba(109,40,217,.55)" },
  4: { from: "#fbbf24", to: "#d97706", glow: "rgba(217,119,6,.6)" },
  5: { from: "#e879f9", to: "#a21caf", glow: "rgba(162,28,175,.6)" },
  6: { from: "#38bdf8", to: "#7c3aed", glow: "rgba(124,58,237,.6)" }
};
function rarityLabel(rarity, t) {
  const key = rarity === "myth" ? "pl.rarity.myth" : rarity === "legendary" ? "pl.rarity.legendary" : rarity === "epic" ? "pl.rarity.epic" : rarity === "rare" ? "pl.rarity.rare" : "pl.rarity.common";
  return t(key);
}
var TAROT_ARCANA = [
  { name: { zh: "\u611A\u4EBA", en: "The Fool" }, line: { zh: "\u524D\u8DEF\u672C\u65E0\u5CB8\uFF0C\u6DF1\u6E0A\u4EA6\u662F\u542F\u7A0B\u3002", en: "Before me is no shore; the abyss itself is a departure." } },
  { name: { zh: "\u9B54\u672F\u5E08", en: "The Magician" }, line: { zh: "\u4E0A\u627F\u5929\u610F\uFF0C\u4E0B\u542F\u51E1\u5C18\uFF0C\u624B\u4E2D\u4E07\u7269\u7686\u53EF\u9020\u3002", en: "Heaven above, earth below\u2014all lies within my hands to create." } },
  { name: { zh: "\u5973\u796D\u53F8", en: "The High Priestess" }, line: { zh: "\u771F\u76F8\u85CF\u4E8E\u9759\u9ED8\uFF0C\u4E0D\u5FC5\u6025\u4E8E\u8A00\u8BF4\u3002", en: "Truth lies in stillness; no need to rush to speak." } },
  { name: { zh: "\u7687\u540E", en: "The Empress" }, line: { zh: "\u5927\u5730\u5B55\u80B2\u4E00\u5207\uFF0C\u6E29\u67D4\u81EA\u6709\u529B\u91CF\u3002", en: "The earth nurtures all; gentleness is its own power." } },
  { name: { zh: "\u7687\u5E1D", en: "The Emperor" }, line: { zh: "\u89C4\u5219\u7531\u6211\u7ACB\u5B9A\uFF0C\u79E9\u5E8F\u65B9\u80FD\u957F\u5B58\u3002", en: "I set the rules; only order endures." } },
  { name: { zh: "\u6559\u7687", en: "The Hierophant" }, line: { zh: "\u5FAA\u53E4\u9053\u800C\u5BFB\u5FC3\u5B89\uFF0C\u4EE5\u6559\u8BF2\u6E21\u4F17\u751F\u3002", en: "Walk the old path to find peace; guide all with teaching." } },
  { name: { zh: "\u604B\u4EBA", en: "The Lovers" }, line: { zh: "\u5FC3\u4E4B\u6240\u5411\uFF0C\u4FBF\u662F\u6289\u62E9\u3002", en: "Where the heart points, that is the choice." } },
  { name: { zh: "\u6218\u8F66", en: "The Chariot" }, line: { zh: "\u7EB5\u6709\u4E24\u80A1\u5BF9\u7ACB\uFF0C\u6211\u4EA6\u53EF\u9A7E\u9A6D\u5411\u524D\u3002", en: "Though two forces pull, I ride forward." } },
  { name: { zh: "\u529B\u91CF", en: "Strength" }, line: { zh: "\u771F\u6B63\u7684\u5F81\u670D\uFF0C\u4ECE\u6765\u4E0D\u662F\u5BF9\u6297\uFF0C\u800C\u662F\u6E29\u67D4\u9A6F\u670D\u3002", en: "True conquest is not opposition but gentle taming." } },
  { name: { zh: "\u9690\u58EB", en: "The Hermit" }, line: { zh: "\u4E16\u4EBA\u55A7\u56A3\uFF0C\u6211\u643A\u5B64\u706F\u81EA\u5BFB\u771F\u7406\u3002", en: "While the world shouts, I carry a lone lamp in search of truth." } },
  { name: { zh: "\u547D\u8FD0\u4E4B\u8F6E", en: "Wheel of Fortune" }, line: { zh: "\u76DB\u8870\u8F6E\u8F6C\uFF0C\u4E07\u822C\u4E0D\u7531\u4EBA\uFF0C\u4EA6\u4E07\u822C\u7686\u53EF\u7B49\u3002", en: "Fortune spins, nothing keeps its course\u2014and all can be awaited." } },
  { name: { zh: "\u6B63\u4E49", en: "Justice" }, line: { zh: "\u5229\u5251\u65AD\u662F\u975E\uFF0C\u5929\u5E73\u91CF\u56E0\u679C\u3002", en: "The blade rules right and wrong; the scales measure cause and effect." } },
  { name: { zh: "\u5012\u540A\u4EBA", en: "The Hanged Man" }, line: { zh: "\u6362\u4E00\u79CD\u89C6\u89D2\uFF0C\u727A\u7272\u4EA6\u662F\u89C9\u9192\u3002", en: "Change your view; sacrifice is awakening." } },
  { name: { zh: "\u6B7B\u795E", en: "Death" }, line: { zh: "\u65E7\u7684\u843D\u5E55\uFF0C\u624D\u5BB9\u65B0\u751F\u964D\u4E34\u3002", en: "Only when the old closes can the new arrive." } },
  { name: { zh: "\u8282\u5236", en: "Temperance" }, line: { zh: "\u4E24\u76F8\u8C03\u548C\uFF0C\u65B9\u5F97\u957F\u4E45\u5E73\u8861\u3002", en: "Harmonize two sides to hold lasting balance." } },
  { name: { zh: "\u6076\u9B54", en: "The Devil" }, line: { zh: "\u67B7\u9501\u4ECE\u6765\u4E0D\u5728\u8EAB\u5916\uFF0C\u800C\u5728\u6267\u5FF5\u4E4B\u4E2D\u3002", en: "Shackles never lie outside\u2014they live in attachment." } },
  { name: { zh: "\u9AD8\u5854", en: "The Tower" }, line: { zh: "\u865A\u5984\u7EC8\u5C06\u5D29\u584C\uFF0C\u6BC1\u706D\u65B9\u89C1\u771F\u5B9E\u3002", en: "Illusion must collapse; only ruin reveals truth." } },
  { name: { zh: "\u661F\u661F", en: "The Star" }, line: { zh: "\u957F\u591C\u518D\u6697\uFF0C\u6211\u4ECD\u5411\u4EBA\u95F4\u503E\u6CE8\u5E0C\u671B\u3002", en: "Dark as the night, I still pour hope upon the world." } },
  { name: { zh: "\u6708\u4EAE", en: "The Moon" }, line: { zh: "\u5E7B\u8C61\u4E1B\u751F\uFF0C\u9700\u8FA8\u672C\u5FC3\u771F\u4F2A\u3002", en: "Illusions abound; discern the true from the false heart." } },
  { name: { zh: "\u592A\u9633", en: "The Sun" }, line: { zh: "\u5149\u660E\u5766\u8361\uFF0C\u7EAF\u7CB9\u81EA\u4F1A\u9A71\u6563\u9634\u973E\u3002", en: "Bright and open, purity itself dispels the haze." } },
  { name: { zh: "\u5BA1\u5224", en: "Judgement" }, line: { zh: "\u53F7\u89D2\u54CD\u8D77\uFF0C\u76F4\u9762\u8FC7\u5F80\uFF0C\u91CD\u65B0\u6289\u62E9\u3002", en: "The horn sounds\u2014face the past and choose anew." } },
  { name: { zh: "\u4E16\u754C", en: "The World" }, line: { zh: "\u884C\u5B8C\u8F6E\u56DE\u4E4B\u8DEF\uFF0C\u4E07\u4E8B\u7EC8\u5F97\u5706\u6EE1\u3002", en: "The cycle complete, all things find their fulfillment." } },
  // 小阿卡纳 · 权杖系列（下标 22 起）
  { name: { zh: "\u6743\u6756 ACE", en: "Ace of Wands" }, line: { zh: "\u5FC3\u706B\u521D\u751F\uFF0C\u4E07\u4E8B\u7686\u53EF\u542F\u7A0B\u3002", en: "The heart-fire ignites; all may be set in motion." } },
  { name: { zh: "\u6743\u6756\u4E8C", en: "Two of Wands" }, line: { zh: "\u7ACB\u8DB3\u5F53\u4E0B\uFF0C\u8FDC\u773A\u6211\u5C06\u8981\u5954\u8D74\u7684\u8FDC\u65B9\u3002", en: "Stand firm now, and gaze at the far shore I will set out for." } },
  { name: { zh: "\u6743\u6756\u4E09", en: "Three of Wands" }, line: { zh: "\u9759\u5F85\u822A\u8239\u5F52\u5CB8\uFF0C\u524D\u8DEF\u5DF2\u6709\u65B9\u5411\u3002", en: "Wait for the ship's return; the path ahead already has its bearing." } },
  { name: { zh: "\u6743\u6756\u56DB", en: "Four of Wands" }, line: { zh: "\u55A7\u56A3\u6563\u53BB\uFF0C\u5B89\u7A33\u4E0E\u6B22\u805A\u5373\u662F\u5F52\u5BBF\u3002", en: "When the clamor fades, peace and gathering are the true home." } },
  { name: { zh: "\u6743\u6756\u4E94", en: "Five of Wands" }, line: { zh: "\u7EB7\u4E89\u56DB\u8D77\uFF0C\u6211\u8981\u5728\u8F83\u91CF\u4E2D\u4E89\u5F97\u4E00\u5E2D\u4E4B\u5730\u3002", en: "Strife rises on every side; I will carve out my own place in the contest." } },
  { name: { zh: "\u6743\u6756\u516D", en: "Six of Wands" }, line: { zh: "\u594B\u529B\u524D\u884C\uFF0C\u8363\u5149\u81EA\u4F1A\u4E3A\u6211\u800C\u6765\u3002", en: "Press forward with all your might; glory will come to you on its own." } },
  { name: { zh: "\u6743\u6756\u4E03", en: "Seven of Wands" }, line: { zh: "\u7EB5\u4F17\u654C\u88AD\u6765\uFF0C\u6211\u4EA6\u575A\u5B88\u9635\u5730\u4E0D\u9000\u3002", en: "Though many foes advance, I hold my ground and do not yield." } },
  { name: { zh: "\u6743\u6756\u516B", en: "Eight of Wands" }, line: { zh: "\u5FC3\u5FF5\u4E00\u52A8\uFF0C\u4E07\u4E8B\u75BE\u901F\u5954\u8D74\u3002", en: "At the stirring of intent, all things hasten to arrive." } },
  { name: { zh: "\u6743\u6756\u4E5D", en: "Nine of Wands" }, line: { zh: "\u6EE1\u8EAB\u75B2\u60EB\uFF0C\u4ECD\u8981\u5B88\u4F4F\u6700\u540E\u7684\u9632\u7EBF\u3002", en: "Weary to the bone, I still guard the final line." } },
  { name: { zh: "\u6743\u6756\u5341", en: "Ten of Wands" }, line: { zh: "\u8EAB\u8D1F\u91CD\u62C5\uFF0C\u54AC\u7259\u8D70\u5B8C\u8FD9\u6BB5\u957F\u8DEF\u3002", en: "Shouldering the heavy load, I grit my teeth and finish the long road." } },
  { name: { zh: "\u6743\u6756\u4F8D\u4ECE", en: "Page of Wands" }, line: { zh: "\u6EE1\u6000\u70ED\u5FF1\uFF0C\u4E07\u4E8B\u7686\u613F\u4E00\u8BD5\u3002", en: "Full of fervor, I am willing to try every endeavor." } },
  { name: { zh: "\u6743\u6756\u9A91\u58EB", en: "Knight of Wands" }, line: { zh: "\u5FC3\u706B\u4E0D\u606F\uFF0C\u7B56\u9A6C\u5373\u523B\u5954\u8D74\u3002", en: "The heart-fire never dies; I spur my steed and ride at once." } },
  { name: { zh: "\u6743\u6756\u738B\u540E", en: "Queen of Wands" }, line: { zh: "\u81EA\u4FE1\u76DB\u653E\uFF0C\u70ED\u70C8\u800C\u4ECE\u5BB9\u3002", en: "Confidence blooms within; passionate, yet composed." } },
  { name: { zh: "\u6743\u6756\u56FD\u738B", en: "King of Wands" }, line: { zh: "\u4EE5\u70ED\u5FF1\u9886\u8DEF\uFF0C\u4EE5\u9B44\u529B\u51B3\u65AD\u3002", en: "Lead with fervor, decide with resolve." } },
  // 小阿卡纳 · 圣杯系列（下标 36 起）
  { name: { zh: "\u5723\u676F ACE", en: "Ace of Cups" }, line: { zh: "\u5FC3\u5E95\u6F3E\u8D77\u6E29\u67D4\uFF0C\u7231\u610F\u81EA\u6B64\u840C\u751F\u3002", en: "Gentleness rises in the heart; love is born from it." } },
  { name: { zh: "\u5723\u676F\u4E8C", en: "Two of Cups" }, line: { zh: "\u7075\u9B42\u76F8\u5951\uFF0C\u676F\u76CF\u76F8\u5BF9\u5373\u662F\u5171\u9E23\u3002", en: "Kindred souls\u2014raised cups are their resonance." } },
  { name: { zh: "\u5723\u676F\u4E09", en: "Three of Cups" }, line: { zh: "\u559C\u4E50\u5171\u4EAB\uFF0C\u6B22\u6109\u4E0D\u5FC5\u72EC\u85CF\u3002", en: "Share the joy; happiness need not be hoarded." } },
  { name: { zh: "\u5723\u676F\u56DB", en: "Four of Cups" }, line: { zh: "\u7EB5\u4F7F\u9988\u8D60\u5728\u524D\uFF0C\u6211\u4ECD\u6C89\u5FC3\u81EA\u7701\u3002", en: "Though gifts lie before me, I still turn inward in reflection." } },
  { name: { zh: "\u5723\u676F\u4E94", en: "Five of Cups" }, line: { zh: "\u6C89\u6EBA\u5931\u53BB\u4E4B\u65F6\uFF0C\u522B\u5FFD\u7565\u5C1A\u5B58\u7684\u6E29\u6696\u3002", en: "When lost in grief, do not overlook the warmth that remains." } },
  { name: { zh: "\u5723\u676F\u516D", en: "Six of Cups" }, line: { zh: "\u65E7\u65E5\u6E29\u67D4\u957F\u5B58\uFF0C\u5584\u610F\u4EE3\u4EE3\u76F8\u9012\u3002", en: "The gentleness of yesterday endures; kindness passes across generations." } },
  { name: { zh: "\u5723\u676F\u4E03", en: "Seven of Cups" }, line: { zh: "\u5E7B\u68A6\u4E07\u5343\uFF0C\u9700\u5206\u6E05\u4F55\u4E3A\u771F\u5FC3\u6240\u6C42\u3002", en: "A thousand dreams; discern what the heart truly seeks." } },
  { name: { zh: "\u5723\u676F\u516B", en: "Eight of Cups" }, line: { zh: "\u820D\u5F03\u773C\u524D\u5B89\u7A33\uFF0C\u5954\u8D74\u5185\u5FC3\u771F\u6B63\u6E34\u6C42\u3002", en: "Leave present comfort behind, and go to what the heart truly longs for." } },
  { name: { zh: "\u5723\u676F\u4E5D", en: "Nine of Cups" }, line: { zh: "\u5185\u5FC3\u81EA\u8DB3\uFF0C\u6B22\u559C\u4E0D\u5FC5\u5411\u5916\u6C42\u8BC1\u3002", en: "Content within; joy needs no proof from without." } },
  { name: { zh: "\u5723\u676F\u5341", en: "Ten of Cups" }, line: { zh: "\u6240\u7231\u76F8\u4F34\uFF0C\u5BB6\u4E0E\u6E29\u60C5\u5373\u662F\u5706\u6EE1\u3002", en: "With loved ones beside, home and warmth are fulfillment." } },
  { name: { zh: "\u5723\u676F\u4F8D\u4ECE", en: "Page of Cups" }, line: { zh: "\u654F\u611F\u5171\u60C5\uFF0C\u4EE5\u6E29\u67D4\u611F\u77E5\u4E16\u95F4\u60C5\u7EEA\u3002", en: "Empathetic and sensitive, perceiving the world's feelings with tenderness." } },
  { name: { zh: "\u5723\u676F\u9A91\u58EB", en: "Knight of Cups" }, line: { zh: "\u643A\u7231\u610F\u7F13\u6B65\uFF0C\u6D6A\u6F2B\u6C38\u85CF\u4E8E\u5FC3\u3002", en: "Advancing gently with love, romance forever kept in heart." } },
  { name: { zh: "\u5723\u676F\u738B\u540E", en: "Queen of Cups" }, line: { zh: "\u5305\u5BB9\u4E07\u7269\u60C5\u7EEA\uFF0C\u6E29\u67D4\u5BB9\u7EB3\u4F17\u751F\u3002", en: "Holding all emotions, embracing all beings with tenderness." } },
  { name: { zh: "\u5723\u676F\u56FD\u738B", en: "King of Cups" }, line: { zh: "\u60C5\u7EEA\u6536\u653E\u81EA\u5982\uFF0C\u6E29\u6DA6\u4EA6\u53EF\u81EA\u6301\u3002", en: "Master of one's emotions\u2014gentle, yet self-possessed." } },
  // 小阿卡纳 · 宝剑系列（下标 50 起）
  { name: { zh: "\u5B9D\u5251 ACE", en: "Ace of Swords" }, line: { zh: "\u4E00\u5FF5\u51B3\u65AD\uFF0C\u771F\u7406\u81EA\u950B\u8292\u800C\u751F\u3002", en: "In a single resolve, truth is born from the blade's edge." } },
  { name: { zh: "\u5B9D\u5251\u4E8C", en: "Two of Swords" }, line: { zh: "\u95ED\u76EE\u9694\u7EDD\u7EB7\u6270\uFF0C\u6682\u5B88\u5185\u5FC3\u5E73\u9759\u3002", en: "Close the eyes to clamor; hold to inner calm for now." } },
  { name: { zh: "\u5B9D\u5251\u4E09", en: "Three of Swords" }, line: { zh: "\u5FC3\u788E\u96BE\u63A9\uFF0C\u4F24\u75DB\u4EA6\u662F\u771F\u5B9E\u611F\u53D7\u3002", en: "A shattered heart will not hide; pain, too, is real feeling." } },
  { name: { zh: "\u5B9D\u5251\u56DB", en: "Four of Swords" }, line: { zh: "\u55A7\u56A3\u6682\u6B47\uFF0C\u9759\u606F\u4EE5\u5F85\u91CD\u6574\u3002", en: "The noise stills; rest a while before regrouping." } },
  { name: { zh: "\u5B9D\u5251\u4E94", en: "Five of Swords" }, line: { zh: "\u8D62\u4E86\u4E89\u6267\uFF0C\u5374\u8F93\u6389\u4EBA\u5FC3\uFF0C\u53C8\u6709\u4F55\u76CA\u3002", en: "Win the argument yet lose the heart\u2014what is that worth?" } },
  { name: { zh: "\u5B9D\u5251\u516D", en: "Six of Swords" }, line: { zh: "\u8F7D\u4F24\u75DB\u6E21\u6C5F\u6D77\uFF0C\u6162\u6162\u9A76\u5411\u5B89\u5B81\u3002", en: "Carrying sorrow across the seas, sailing slowly toward peace." } },
  { name: { zh: "\u5B9D\u5251\u4E03", en: "Seven of Swords" }, line: { zh: "\u6B63\u9053\u96BE\u884C\uFF0C\u6211\u53EA\u80FD\u5BFB\u5DE7\u5F84\u81EA\u4FDD\u3002", en: "The straight path is hard; I must find a shrewd way to protect myself." } },
  { name: { zh: "\u5B9D\u5251\u516B", en: "Eight of Swords" }, line: { zh: "\u56F0\u4F4F\u6211\u7684\u4ECE\u4E0D\u662F\u67B7\u9501\uFF0C\u662F\u56FA\u6709\u8BA4\u77E5\u3002", en: "What binds me is never chains, but the beliefs I hold." } },
  { name: { zh: "\u5B9D\u5251\u4E5D", en: "Nine of Swords" }, line: { zh: "\u957F\u591C\u7126\u8651\uFF0C\u5FC3\u9B54\u72EC\u81EA\u714E\u71AC\u3002", en: "Anxious through the long night, tormented alone by inner demons." } },
  { name: { zh: "\u5B9D\u5251\u5341", en: "Ten of Swords" }, line: { zh: "\u82E6\u96BE\u81F3\u6B64\u843D\u5E55\uFF0C\u7EC8\u4F1A\u8FCE\u6765\u65B0\u751F\u3002", en: "Suffering closes its curtain; new life will surely follow." } },
  { name: { zh: "\u5B9D\u5251\u4F8D\u4ECE", en: "Page of Swords" }, line: { zh: "\u51B7\u773C\u89C2\u5BDF\uFF0C\u6D1E\u6089\u8A00\u8BED\u80CC\u540E\u7684\u771F\u76F8\u3002", en: "Observing with cool eyes, discerning the truth behind words." } },
  { name: { zh: "\u5B9D\u5251\u9A91\u58EB", en: "Knight of Swords" }, line: { zh: "\u601D\u7EEA\u5982\u98CE\uFF0C\u51B3\u65AD\u8FC5\u75BE\u4E0D\u7559\u8FDF\u7591\u3002", en: "Thought moves like the wind; decisions swift, no hesitation." } },
  { name: { zh: "\u5B9D\u5251\u738B\u540E", en: "Queen of Swords" }, line: { zh: "\u7406\u667A\u4E3A\u5203\uFF0C\u76F4\u8A00\u4E0D\u8BB3\uFF0C\u660E\u8FA8\u865A\u5B9E\u3002", en: "Reason as the blade; speak plainly, and see the false from the true." } },
  { name: { zh: "\u5B9D\u5251\u56FD\u738B", en: "King of Swords" }, line: { zh: "\u4EE5\u903B\u8F91\u5B9A\u662F\u975E\uFF0C\u51B7\u9759\u6267\u638C\u51B3\u65AD\u3002", en: "With logic to set right from wrong, holding judgment with calm." } },
  // 小阿卡纳 · 星币系列（下标 64 起）
  { name: { zh: "\u661F\u5E01 ACE", en: "Ace of Pentacles" }, line: { zh: "\u6C83\u571F\u4E4B\u4E0A\uFF0C\u673A\u9047\u4E0E\u8D22\u5BCC\u6084\u7136\u840C\u82BD\u3002", en: "On fertile soil, opportunity and wealth sprout quietly." } },
  { name: { zh: "\u661F\u5E01\u4E8C", en: "Two of Pentacles" }, line: { zh: "\u6D6E\u6C89\u4E4B\u95F4\uFF0C\u5E73\u8861\u751F\u8BA1\u4E0E\u53D8\u6570\u3002", en: "Amid the rising and falling, balance livelihood with change." } },
  { name: { zh: "\u661F\u5E01\u4E09", en: "Three of Pentacles" }, line: { zh: "\u540C\u5FC3\u5B9E\u5E72\uFF0C\u65B9\u80FD\u7B51\u6210\u6210\u679C\u3002", en: "Working together in earnest, only then is achievement built." } },
  { name: { zh: "\u661F\u5E01\u56DB", en: "Four of Pentacles" }, line: { zh: "\u63E1\u7D27\u6240\u5F97\uFF0C\u4E0D\u613F\u5931\u53BB\u5206\u6BEB\u3002", en: "Gripping what is gained, unwilling to lose a single part." } },
  { name: { zh: "\u661F\u5E01\u4E94", en: "Five of Pentacles" }, line: { zh: "\u8EAB\u5904\u56F0\u987F\uFF0C\u4ECD\u8981\u76F8\u4FE1\u5FAE\u5149\u3002", en: "In hardship, still believe in the faint light." } },
  { name: { zh: "\u661F\u5E01\u516D", en: "Six of Pentacles" }, line: { zh: "\u8D44\u6E90\u6709\u5EA6\uFF0C\u65BD\u4E0E\u53D7\u81EA\u6709\u5206\u5BF8\u3002", en: "Resources have their measure; giving and receiving keep proportion." } },
  { name: { zh: "\u661F\u5E01\u4E03", en: "Seven of Pentacles" }, line: { zh: "\u8015\u8018\u5DF2\u6BD5\uFF0C\u9759\u5F85\u6536\u6210\u5230\u6765\u3002", en: "The tilling is done; wait quietly for the harvest." } },
  { name: { zh: "\u661F\u5E01\u516B", en: "Eight of Pentacles" }, line: { zh: "\u6C89\u5FC3\u6253\u78E8\u6280\u827A\uFF0C\u4E45\u4E45\u65B9\u5F97\u7CBE\u8FDB\u3002", en: "Polish the craft with a still heart; mastery comes only in time." } },
  { name: { zh: "\u661F\u5E01\u4E5D", en: "Nine of Pentacles" }, line: { zh: "\u51ED\u5DF1\u4E4B\u529B\u5BCC\u8DB3\uFF0C\u72EC\u4EAB\u4ECE\u5BB9\u5B89\u5B81\u3002", en: "Prosperous by one's own hand, enjoying calm ease alone." } },
  { name: { zh: "\u661F\u5E01\u5341", en: "Ten of Pentacles" }, line: { zh: "\u5BB6\u4E1A\u4F20\u627F\uFF0C\u7269\u8D28\u4E0E\u8840\u8109\u5B89\u7A33\u5EF6\u7EED\u3002", en: "The household legacy lives on\u2014wealth and bloodline in steady succession." } },
  { name: { zh: "\u661F\u5E01\u4F8D\u4ECE", en: "Page of Pentacles" }, line: { zh: "\u811A\u8E0F\u5B9E\u5730\uFF0C\u8BA4\u771F\u7814\u4E60\u4E16\u95F4\u5B9E\u52A1\u3002", en: "With feet on the ground, earnestly studying the world's practical arts." } },
  { name: { zh: "\u661F\u5E01\u9A91\u58EB", en: "Knight of Pentacles" }, line: { zh: "\u7A33\u6B65\u524D\u884C\uFF0C\u65F6\u95F4\u81EA\u4F1A\u5151\u73B0\u6210\u679C\u3002", en: "Advancing steadily; time itself will cash in the results." } },
  { name: { zh: "\u661F\u5E01\u738B\u540E", en: "Queen of Pentacles" }, line: { zh: "\u7528\u5FC3\u7ECF\u8425\uFF0C\u5BCC\u8DB3\u5B89\u7A33\u7686\u7531\u81EA\u5DF1\u521B\u9020\u3002", en: "Nurture with care; abundance and stability are of one's own making." } },
  { name: { zh: "\u661F\u5E01\u56FD\u738B", en: "King of Pentacles" }, line: { zh: "\u7A33\u5B88\u57FA\u4E1A\uFF0C\u52A1\u5B9E\u89C4\u5212\u957F\u4E45\u672A\u6765\u3002", en: "Guard the foundation; plan pragmatically for a long future." } }
];
var TAROT_BY_RARITY = {
  // 每档：大阿卡纳 + 权杖/圣杯/宝剑/星币四套的低阶/侍从
  common: [
    0,
    1,
    // 愚人·魔术师
    22,
    23,
    24,
    25,
    // 权杖 ACE·二·三·四
    36,
    37,
    38,
    39,
    // 圣杯 ACE·二·三·四
    50,
    51,
    52,
    53,
    // 宝剑 ACE·二·三·四
    64,
    65,
    66,
    67
    // 星币 ACE·二·三·四
  ],
  rare: [
    26,
    27,
    28,
    // 权杖五·六·七
    40,
    41,
    42,
    // 圣杯五·六·七
    54,
    55,
    56,
    // 宝剑五·六·七
    68,
    69,
    70
    // 星币五·六·七
  ],
  epic: [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    14,
    // 女祭司…节制的大阿卡纳（除愚人/魔术师与顶级六柱）
    29,
    32,
    34,
    // 权杖八·侍从·王后
    43,
    46,
    48,
    // 圣杯八·侍从·王后
    57,
    60,
    62,
    // 宝剑八·侍从·王后
    71,
    74,
    76
    // 星币八·侍从·王后
  ],
  legendary: [
    30,
    31,
    33,
    35,
    // 权杖九·十·骑士·国王
    44,
    45,
    47,
    49,
    // 圣杯九·十·骑士·国王
    58,
    59,
    61,
    63,
    // 宝剑九·十·骑士·国王
    72,
    73,
    75,
    77
    // 星币九·十·骑士·国王
  ],
  myth: [
    16,
    17,
    18,
    19,
    20,
    21,
    15,
    13
    // 高塔·星星·月亮·太阳·审判·世界·恶魔·死神（最强八柱）
  ]
};
function buildDeck(achievements) {
  const byRarity = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
    myth: []
  };
  for (const a of achievements) {
    const bucket = byRarity[a.rarity];
    if (bucket) bucket.push(a);
  }
  const cardToAch = {};
  const achToCard = {};
  Object.keys(byRarity).forEach((r) => {
    const cards = TAROT_BY_RARITY[r] ?? [];
    byRarity[r].forEach((a, i) => {
      if (i < cards.length) {
        cardToAch[cards[i]] = a;
        achToCard[a.id] = cards[i];
      }
    });
  });
  return { cardToAch, achToCard };
}
function arcanaRoman(no) {
  if (no >= 22) {
    const marks = ["ACE", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "PAGE", "KNIGHT", "QUEEN", "KING"];
    return marks[(no - 22) % 14] ?? String(no);
  }
  if (no <= 0) return "0";
  const table = [
    [21, "XXI"],
    [20, "XX"],
    [19, "XIX"],
    [18, "XVIII"],
    [17, "XVII"],
    [16, "XVI"],
    [15, "XV"],
    [14, "XIV"],
    [13, "XIII"],
    [12, "XII"],
    [11, "XI"],
    [10, "X"],
    [9, "IX"],
    [8, "VIII"],
    [7, "VII"],
    [6, "VI"],
    [5, "V"],
    [4, "IV"],
    [3, "III"],
    [2, "II"],
    [1, "I"]
  ];
  for (const [v, r] of table) if (no >= v) return r;
  return "0";
}
function wandsSym(no, S, F) {
  const numeric = no >= 22 && no <= 31;
  const n = numeric ? no - 21 : 4;
  const stars = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const R = 14.5;
    const a = Math.PI * (0.2 + t * 0.44);
    const cx = Math.round(17 + Math.cos(a) * R);
    const cy = Math.round(50 - Math.sin(a) * (R * 0.95));
    stars.push(
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: `M${cx} ${cy} l1.7 2.1 -1.7 2.1 -1.7 -2.1 Z`, opacity: 0.85 }, i)
    );
  }
  const court = no >= 32 && no <= 35;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 52 V16", strokeWidth: 2.4 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 16 V11 M28 16 l-3 2 M28 16 l3 2" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 6.5 l2.6 3.3 a3.7 3.1 0 0 1 -5.2 0 Z" }),
    stars,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 44 H42", opacity: 0.55 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "20", y: "52", width: "16", height: "3", rx: "1", ...F, opacity: 0.9 }),
    court && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M20 30 l8 -7 8 7 Z" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M17 32 h22 v3 H17 Z" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "20", cy: "30", r: "1.5", ...F }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "23", r: "1.5", ...F }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "36", cy: "30", r: "1.5", ...F })
    ] })
  ] });
}
function minorArcPos(i, n) {
  const t = n === 1 ? 0.5 : i / (n - 1);
  const R = 14.5;
  const a = Math.PI * (0.2 + t * 0.44);
  return { x: Math.round(17 + Math.cos(a) * R), y: Math.round(50 - Math.sin(a) * (R * 0.95)) };
}
function courtCrown(F) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M22 46 l6 -5 6 5 Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M18.5 50 h19 v3.5 h-19 Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "22", cy: "46", r: "1.4", ...F }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "41", r: "1.4", ...F }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "34", cy: "46", r: "1.4", ...F })
  ] });
}
function cupsSym(no, S, F) {
  const numeric = no >= 36 && no <= 45;
  const n = numeric ? no - 35 : 4;
  const drops = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    drops.push(
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "path",
        {
          ...F,
          d: `M${x} ${y - 2} c1.1 1 .3 2.2 -1.7 3.5 a1.7 1.5 0 0 1 -1.6 0 c-2 -1.3 -2.8 -2.5 -1.7 -3.5 Z`,
          opacity: 0.85
        },
        i
      )
    );
  }
  const court = no >= 46 && no <= 49;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M21 18 h14 l-2 12 a6.5 4.2 0 0 1 -10 0 Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M19 18 H37", opacity: 0.55 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 32 V43 M22 43 H34" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "20", y: "43", width: "16", height: "2.5", rx: "1", ...F, opacity: 0.9 }),
    drops,
    court && courtCrown(F)
  ] });
}
function swordsSym(no, S, F) {
  const numeric = no >= 50 && no <= 59;
  const n = numeric ? no - 49 : 4;
  const blades = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    blades.push(/* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: `M${x} ${y - 3} l1.2 3 -1.2 3 -1.2 -3 Z`, opacity: 0.85 }, i));
  }
  const court = no >= 62 && no <= 63;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 12 V48", strokeWidth: 2.2 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 8 l-3 4 3 -1.8 3 1.8 Z", opacity: 0.9 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 26 H36 M21 31 H35", opacity: 0.7 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "44", r: "2.6", ...S }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "24", y: "47", width: "8", height: "2.5", rx: "1", ...F, opacity: 0.9 }),
    blades,
    court && courtCrown(F)
  ] });
}
function pentaclesSym(no, S, F) {
  const numeric = no >= 64 && no <= 73;
  const n = numeric ? no - 63 : 4;
  const coins = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    coins.push(/* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: x, cy: y, r: 2, ...F, opacity: 0.85 }, i));
  }
  const court = no >= 76 && no <= 77;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "25", r: "9.5", ...S }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "25", r: "6", ...S, opacity: 0.5 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 17 l2 3.4 4 .6 -3 2.6 .9 4 -3.9 -2 -3.9 2 .9 -4 -3 -2.6 4 -.6 Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 34.5 V42 M23 36 H33", opacity: 0.6 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "20", y: "42", width: "16", height: "2.5", rx: "1", ...F, opacity: 0.9 }),
    coins,
    court && courtCrown(F)
  ] });
}
function TarotArcana({ no, achieved, color }) {
  const fill = achieved ? color : "#64748b";
  const S = { fill: "none", stroke: fill, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const F = { fill };
  const sym = (() => {
    switch (no) {
      case 0:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "44", cy: "16", r: "4.5", ...F, opacity: 0.85 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M16 30 h14.5 l2.5 2.5 -2.5 2.5" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M46 28 V14 L31 52 H15" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "40", r: "5", ...F }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M23 40 V46 H33 V40" })
        ] });
      case 1:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 30 c-4 -6 -16 -6 -16 0 c0 6 12 6 16 0 c4 -6 16 -6 16 0 c0 6 -12 6 -16 0" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 30 V14" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M12 46 H44" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "17", y: "46", width: "5", height: "10", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "26", y: "46", width: "5", height: "10", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "35", y: "46", width: "5", height: "10", ...F, opacity: 0.9 })
        ] });
      case 2:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M12 20 Q28 8 44 20" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 22 l4 3 -1.3 5 2 4 -4.7 -2.4 -4.7 2.4 2 -4 -1.3 -5 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M15 30 H41 M14 24 V50 M42 24 V50" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 52 H42", opacity: 0.6 })
        ] });
      case 3:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M16 24 q-3 6 0 12 M40 24 q3 6 0 12" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M18 30 h-3 M36 30 h3", opacity: 0.6 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 22 l5.5 4 -2.5 7 -3 -1.6 -3 1.6 -2.5 -7 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 30 v8 M24 33 h8", opacity: 0.7 })
        ] });
      case 4:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 20 l8 3 V30 Q36 38 28 41 Q20 38 20 30 V23 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 20 Q28 26 36 20" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 41 V48 M24 48 h8" })
        ] });
      case 5:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M18 22 h20 M21 28 h14 M24 34 h8" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "40", r: "4", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M24 40 V52 M32 40 V52 M24 52 a4 3 0 0 0 8 0" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 46 l-6 3 M36 46 l6 3" })
        ] });
      case 6:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "14", r: "3.5", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "20", cy: "40", r: "5", ...F }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "36", cy: "40", r: "5", ...F }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M15 40 a5 5 0 0 0 4 5" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M41 40 a5 5 0 0 1 -4 5" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 33 a10 14 0 0 0 0 0", opacity: 0 })
        ] });
      case 7:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M18 30 h20 l3 8 H15 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M22 30 V22 Q28 18 34 22 V30" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "22", cy: "49", r: "6", ...S }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "25", cy: "46", r: "1.8", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "34", cy: "49", r: "6", ...S })
        ] });
      case 8:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 9 c-3 -4 -12 -4 -10 1 c1 4 12 4 10 -1 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 26 q14 -6 28 -2 Q44 34 28 40 Q12 34 14 26 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "33", r: "5", ...F, opacity: 0.9 })
        ] });
      case 9:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 26 l4 -9 a6 5 0 0 1 -8 0 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 26 V50 M20 30 H36" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "22", cy: "44", r: "4", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M36 50 h6", opacity: 0.6 })
        ] });
      case 10:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "32", r: "13", ...S }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "32", r: "4", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 14 V19 M28 45 V50 M10 32 H15 M41 32 H46" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M21 20 Q13 32 24 40", opacity: 0.75 })
        ] });
      case 11:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 14 l3 3 -3 3 -3 -3 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 20 V50" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 24 H14 M28 24 H42" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 30 V24 M42 30 V24" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M10 30 h8 v6 h-8 Z M38 30 h8 v6 h-8 Z" })
        ] });
      case 12:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M12 17 H44 M28 17 V28" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "34", r: "4", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 34 L20 47 L36 47 L36 34" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 40 H36", opacity: 0.7 })
        ] });
      case 13:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M22 20 a6 6 0 0 0 4 5 M22 26 V44" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M25 26 L36 12 M36 12 l3.5 1.5 -2 4 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "30", y: "28", width: "11", height: "9", rx: "2", ...F, opacity: 0.85 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M22 44 V52 M18 52 H27" })
        ] });
      case 14:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M16 38 V28 M16 28 a6 5 0 0 1 6 5" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M40 20 V36 M40 36 a6 5 0 0 1 -6 -5" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 36 q14 10 20 -4", opacity: 0.75 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 12 l2 3.4 4 .6 -3 2.6 .9 4 -3.9 -2 -3.9 2 .9 -4 -3 -2.6 4 -.6 Z" })
        ] });
      case 15:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "34", r: "12", ...S }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 26 L32 33 L29 42 L27 42 L24 33 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M17 30 Q14 20 21 16 M39 30 Q42 20 35 16", opacity: 0.8 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 46 V54 M24 54 h8" })
        ] });
      case 16:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M21 52 H35 L32 24 H24 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M22 34 h12", opacity: 0.7 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 13 l3 3 -1.5 4 -3 0 -1.5 -4 Z", opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 6 L25 26 M42 6 L31 26", opacity: 0.8 })
        ] });
      case 17:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M28 10 l2.1 4.6 5 .5 -3.8 3.3 1.1 4.9 -4.4 -2.6 -4.4 2.6 1.1 -4.9 -3.8 -3.3 5 -.5 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 42 H36 M15 50 H41" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 42 V50 M36 42 V50" })
        ] });
      case 18:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 14 A11 11 0 1 0 39 22 A8 8 0 0 1 28 14 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M14 48 H42 M14 52 H42" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M20 22 Q28 28 28 38 M36 22 Q28 30 28 38" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M26 30 h4", opacity: 0.7 })
        ] });
      case 19:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "30", r: "10", ...F, opacity: 0.95 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "30", r: "6", ...S }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M28 14 V8 M28 52 V46 M12 30 H6 M50 30 H44 M17 19 L12.6 14.6 M38.6 19 L43 14.6" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M30 30 v10 h9", opacity: 0.7 })
        ] });
      case 20:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M10 16 L22 16 L22 10 L30 16 L22 22 Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M26 20 l-5 6 M24 30 A8 6 0 0 1 42 30" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M32 30 V42 M26 30 V40 M38 30 V40" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M30 36 H34", opacity: 0.7 })
        ] });
      case 21:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ellipse", { cx: "28", cy: "34", rx: "16", ry: "14", ...S }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...S, d: "M12 20 q16 -12 32 0", opacity: 0.6 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "34", r: "5", ...F, opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M12 12 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z", opacity: 0.9 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { ...F, d: "M44 12 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z", opacity: 0.9 })
        ] });
      // 小阿卡纳 · 权杖系列（下标 22~35）
      case 22:
      case 23:
      case 24:
      case 25:
      case 26:
      case 27:
      case 28:
      case 29:
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
        return wandsSym(no, S, F);
      // 小阿卡纳 · 圣杯系列（下标 36~49）
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
      case 48:
      case 49:
        return cupsSym(no, S, F);
      // 小阿卡纳 · 宝剑系列（下标 50~63）
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      case 58:
      case 59:
      case 60:
      case 61:
      case 62:
      case 63:
        return swordsSym(no, S, F);
      // 小阿卡纳 · 星币系列（下标 64~77）
      case 64:
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
        return pentaclesSym(no, S, F);
      default:
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "28", cy: "32", r: "14", ...S });
    }
  })();
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "svg",
    {
      width: "92",
      height: "104",
      viewBox: "0 0 56 64",
      "aria-hidden": "true",
      style: {
        filter: achieved ? "none" : "blur(0.8px)",
        opacity: achieved ? 1 : 0.5,
        transition: "filter .25s ease, opacity .25s ease"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "path",
          {
            fill,
            opacity: achieved ? 0.8 : 0.5,
            d: "M28 2 L30.2 6.6 L35 7.2 L31.5 10.6 L32.9 15.4 L28 12.8 L23.1 15.4 L24.5 10.6 L21 7.2 L25.8 6.6 Z"
          }
        ),
        sym
      ]
    }
  );
}
function AchievementCard({ achievement, cardNo, t, TONE: TONE18, lang }) {
  const a = achievement;
  const pct = a.target > 0 ? Math.max(0, Math.min(100, a.progress / a.target * 100)) : 0;
  const arc = cardNo;
  const deck = TAROT_ARCANA[arc];
  const L = lang === "en" ? "en" : "zh";
  const name = deck.name[L];
  const nameAlt = deck.name[L === "en" ? "zh" : "en"];
  const line = deck.line[L];
  const c = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "li",
    {
      title: `${name} ${nameAlt} \xB7 ${a.achieved ? rarityLabel(a.rarity, t) + " \xB7 +" + a.points : t("pl.achievements.lockedHint")}`,
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.45,
        padding: "20px 10px 12px",
        borderRadius: 12,
        // 塔罗牌面：已解锁 = 顶部白辉 + 稀有度高光渐变 + 稀有度双晕「窗花」；未解锁 = 面板 + 灰色花边描边 + 灰虚影
        background: a.achieved ? `radial-gradient(140% 55% at 50% 0%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 55%), linear-gradient(168deg, ${c.high} 0%, ${c.base} 42%, ${c.deep} 100%)` : TONE18.panel,
        border: a.achieved ? `1px solid ${c.deep}` : `1px dashed rgba(154,163,178,.62)`,
        outline: "none",
        boxShadow: a.achieved ? `0 0 0 1px ${c.base}, 0 0 0 3px ${c.border}, 0 6px 18px ${c.shadow}` : "0 0 0 1px rgba(154,163,178,.32)",
        opacity: a.achieved ? 1 : 0.72,
        transition: "transform .16s ease, box-shadow .16s ease, opacity .16s ease"
      },
      onMouseEnter: (e) => {
        if (a.achieved) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = `0 0 0 1px ${c.high}, 0 0 0 4px ${c.border}, 0 10px 24px ${c.shadow}`;
        }
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = a.achieved ? `0 0 0 1px ${c.base}, 0 0 0 3px ${c.border}, 0 6px 18px ${c.shadow}` : "0 0 0 1px rgba(154,163,178,.32)";
      },
      children: [
        a.achieved && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pl-card-sheen" }),
        a.achieved && ["epic", "legendary", "myth"].includes(a.rarity) && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pl-card-gold" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "absolute",
              inset: 5,
              borderRadius: 10,
              border: a.achieved ? `1px dashed ${c.border}` : "1px solid rgba(154,163,178,.42)",
              pointerEvents: "none",
              opacity: a.achieved ? 1 : 0.75
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "absolute",
              inset: 9,
              borderRadius: 8,
              pointerEvents: "none",
              opacity: a.achieved ? 0.9 : 0.45,
              borderStyle: a.achieved ? "solid" : "dashed",
              borderWidth: 1,
              borderColor: a.achieved ? "rgba(255,255,255,.55)" : "rgba(154,163,178,.32)"
            }
          }
        ),
        [
          { top: 2, left: 2 },
          { top: 2, right: 2 },
          { bottom: 2, left: 2 },
          { bottom: 2, right: 2 }
        ].map((pos, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "absolute",
              width: 10,
              height: 10,
              zIndex: 1,
              transform: "rotate(45deg)",
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: a.achieved ? c.base : "rgba(154,163,178,0)",
              border: a.achieved ? `1px solid ${c.deep}` : "1px solid rgba(154,163,178,.85)",
              boxShadow: a.achieved ? `0 0 8px ${c.base}` : "none",
              ...pos
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "span",
              {
                style: {
                  width: 3.5,
                  height: 3.5,
                  borderRadius: 999,
                  background: a.achieved ? c.high : "rgba(154,163,178,.95)"
                }
              }
            )
          },
          i
        )),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              marginTop: 2,
              padding: "1px 9px",
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: "#fff",
              background: a.achieved ? `linear-gradient(135deg, ${c.high}, ${c.base})` : TONE18.border,
              boxShadow: a.achieved ? `0 1px 6px ${c.shadow}` : "none"
            },
            children: a.achieved ? arcanaRoman(arc) : "?"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              width: 92,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TarotArcana, { no: arc, achieved: a.achieved, color: a.achieved ? "#7c3aed" : "#64748b" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    fontWeight: 800,
                    fontFamily: a.achieved ? "Georgia, 'Songti SC', 'Noto Serif SC', serif" : void 0,
                    color: a.achieved ? "#fff" : TONE18.quiet,
                    fontSize: 13.5,
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                    textShadow: a.achieved ? "0 1px 3px rgba(0,0,0,.3)" : "none"
                  },
                  children: name
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    color: a.achieved ? "rgba(255,255,255,.75)" : TONE18.quiet,
                    fontSize: 9,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%"
                  },
                  children: nameAlt
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              width: "100%",
              color: a.achieved ? "rgba(255,255,255,.9)" : TONE18.quiet,
              fontSize: 10.5,
              textAlign: "center",
              lineHeight: 1.55,
              fontStyle: "italic",
              textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.25)" : "none",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 32
            },
            children: line
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              marginTop: 2
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: a.achieved ? "rgba(255,255,255,1)" : TONE18.text,
                    textAlign: "center",
                    textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.28)" : "none",
                    maxWidth: "100%"
                  },
                  children: a.title
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    width: "100%",
                    fontSize: 9.5,
                    lineHeight: 1.4,
                    color: a.achieved ? "rgba(255,255,255,.82)" : TONE18.muted,
                    textAlign: "center",
                    textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.2)" : "none",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  },
                  children: a.desc
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              width: "76%",
              height: 1,
              margin: "1px 0",
              display: "flex",
              alignItems: "center",
              opacity: a.achieved ? 0.7 : 0.45
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    flex: 1,
                    height: 1,
                    background: a.achieved ? "rgba(255,255,255,.55)" : TONE18.border
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    width: 5,
                    height: 5,
                    margin: "-2px 3px 0",
                    borderRadius: 1,
                    transform: "rotate(45deg)",
                    background: a.achieved ? "#fff7e0" : TONE18.quiet
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  style: {
                    flex: 1,
                    height: 1,
                    background: a.achieved ? "rgba(255,255,255,.55)" : TONE18.border
                  }
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "span",
          {
            style: {
              position: "relative",
              zIndex: 1,
              padding: "1px 7px",
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: "#fff",
              background: a.achieved ? `linear-gradient(135deg, ${c.high}, ${c.base})` : TONE18.border
            },
            children: [
              rarityLabel(a.rarity, t),
              a.achieved ? " \xB7 +" + a.points : ""
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              maxWidth: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "div",
                {
                  style: {
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    background: a.achieved ? "rgba(255,255,255,.28)" : TONE18.panel,
                    border: a.achieved ? "1px solid rgba(255,255,255,.35)" : `1px solid ${TONE18.border}`,
                    overflow: "hidden"
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                    "div",
                    {
                      style: {
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: a.achieved ? `linear-gradient(90deg, ${c.high}, ${c.base})` : TONE18.accent,
                        transition: "width .3s ease"
                      }
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 10.5, color: a.achieved ? "rgba(255,255,255,.9)" : TONE18.quiet, fontWeight: 600, whiteSpace: "nowrap" }, children: a.achieved ? "100%" : t("pl.achievements.progress").replace("{progress}", String(a.progress)).replace("{target}", String(a.target)) })
            ]
          }
        )
      ]
    }
  );
}
function TarotSlotCard({ no, t, TONE: TONE18, lang }) {
  const deck = TAROT_ARCANA[no];
  const L = lang === "en" ? "en" : "zh";
  const name = deck.name[L];
  const nameAlt = deck.name[L === "en" ? "zh" : "en"];
  const line = deck.line[L];
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "li",
    {
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.45,
        padding: "20px 10px 12px",
        borderRadius: 12,
        background: TONE18.panel,
        border: "1px dashed rgba(154,163,178,.62)",
        boxShadow: "0 0 0 1px rgba(154,163,178,.28)",
        opacity: 0.8
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "absolute",
              inset: 5,
              borderRadius: 10,
              border: "1px solid rgba(154,163,178,.4)",
              pointerEvents: "none",
              opacity: 0.6
            }
          }
        ),
        [{ top: 2, left: 2 }, { top: 2, right: 2 }, { bottom: 2, left: 2 }, { bottom: 2, right: 2 }].map((pos, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { position: "absolute", width: 10, height: 10, zIndex: 1, transform: "rotate(45deg)", borderRadius: 1.5, border: "1px solid rgba(154,163,178,.85)", ...pos } }, i)),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              padding: "1px 9px",
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: "#fff",
              background: TONE18.border
            },
            children: "?"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              width: 92,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TarotArcana, { no, achieved: false, color: "#64748b" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { position: "relative", zIndex: 1, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontWeight: 800, color: TONE18.quiet, fontSize: 13.5, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }, children: name }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { color: TONE18.quiet, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }, children: nameAlt })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { position: "relative", zIndex: 1, width: "100%", color: TONE18.quiet, fontSize: 10.5, textAlign: "center", lineHeight: 1.55, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32 }, children: line }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { position: "relative", zIndex: 1, marginTop: 2, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: TONE18.quiet, padding: "1px 8px", borderRadius: 999, border: `1px dashed ${TONE18.border}` }, children: t("pl.achievements.lockedHint") })
      ]
    }
  );
}
function AchievementModal({ open, onClose, t }) {
  useThemeSync();
  const TONE18 = getTone();
  const sectionTitleStyle2 = {
    fontSize: 13,
    fontWeight: 600,
    color: TONE18.text,
    marginBottom: 8
  };
  const [status, setStatus] = (0, import_react5.useState)(null);
  const lang = (0, import_react5.useMemo)(() => {
    const nav = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
    if (/^zh/.test(nav)) return "zh";
    if (/^en/.test(nav)) return "en";
    return /[\u4e00-\u9fff]/.test(t("pl.rarity.common")) ? "zh" : "en";
  }, [t, open]);
  (0, import_react5.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setStatus(null);
    getAssistantStatus(lang).then((s) => {
      if (alive) setStatus(s);
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, [open, lang]);
  const level = status?.level;
  const achievements = status?.achievements ?? [];
  const achievedCount = achievements.filter((a) => a.achieved).length;
  const summary = status?.achievementSummary;
  const overallPct = summary && summary.total > 0 ? Math.round(summary.unlocked / summary.total * 100) : 0;
  const upNext = (0, import_react5.useMemo)(() => {
    return achievements.filter((a) => !a.achieved && a.target > 0).sort((x, y) => y.progress / y.target - x.progress / x.target).slice(0, 3);
  }, [achievements]);
  const [filter, setFilter] = (0, import_react5.useState)("all");
  const [showLevels, setShowLevels] = (0, import_react5.useState)(false);
  const RARITIES = ["common", "rare", "epic", "legendary", "myth"];
  const { cardToAch, achToCard } = (0, import_react5.useMemo)(() => buildDeck(achievements), [achievements]);
  const rarityStats = (0, import_react5.useMemo)(
    () => RARITIES.map((r) => {
      const cards = TAROT_BY_RARITY[r] ?? [];
      return {
        rarity: r,
        total: cards.length,
        unlocked: cards.filter((c) => cardToAch[c]?.achieved).length
      };
    }),
    [cardToAch]
  );
  const wallCards = (0, import_react5.useMemo)(() => {
    if (filter === "all") return Array.from({ length: TAROT_ARCANA.length }, (_, i) => i);
    return TAROT_BY_RARITY[filter] ?? [];
  }, [filter]);
  const wallUnlocked = (0, import_react5.useMemo)(
    () => wallCards.filter((c) => cardToAch[c]?.achieved).length,
    [wallCards, cardToAch]
  );
  if (!open) return null;
  return (0, import_react_dom2.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("pl.achievements.title"),
        className: PL_DIALOG_OVERLAY,
        onClick: onClose,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "div",
            {
              onClick: (e) => e.stopPropagation(),
              className: PL_DIALOG,
              style: {
                width: 560,
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "min(660px, calc(100vh - 40px))"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { style: { flex: 1, fontSize: 15, fontWeight: 600, color: TONE18.text }, children: t("pl.achievements.title") }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflow: "auto",
                      /* 内容与滚动条之间预留 10px 间距（与官方一致） */
                      paddingRight: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      paddingTop: 14,
                      paddingBottom: 4
                    },
                    children: [
                      summary && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                        "section",
                        {
                          style: {
                            background: TONE18.row,
                            border: `1px solid ${TONE18.border}`,
                            borderRadius: 12,
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                "div",
                                {
                                  style: {
                                    flexShrink: 0,
                                    padding: "3px 10px",
                                    borderRadius: 12,
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: "#fff",
                                    background: summary.rankKey === "legend" ? "linear-gradient(135deg, #fde68a, #d97706)" : summary.rankKey === "star" ? "linear-gradient(135deg, #c4b5fd, #7c3aed)" : summary.rankKey === "collector" ? "linear-gradient(135deg, #93c5fd, #2563eb)" : summary.rankKey === "explorer" ? "linear-gradient(135deg, #6ee7b7, #059669)" : "linear-gradient(135deg, #cbd5e1, #64748b)"
                                  },
                                  children: summary.rank
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1 } }),
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 12, color: TONE18.quiet, fontWeight: 500 }, children: [
                                t("pl.achievements.collected").replace("{n}", String(summary.unlocked)),
                                " \xB7 ",
                                summary.unlocked,
                                " /",
                                " ",
                                summary.total
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                                "span",
                                {
                                  style: {
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: summary.earnedPoints > 0 ? "#d97706" : TONE18.quiet
                                  },
                                  children: [
                                    t("pl.achievements.points"),
                                    " ",
                                    summary.earnedPoints,
                                    " / ",
                                    summary.maxPoints
                                  ]
                                }
                              )
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                "div",
                                {
                                  style: {
                                    flex: 1,
                                    height: 8,
                                    borderRadius: 5,
                                    background: TONE18.panel,
                                    border: `1px solid ${TONE18.border}`,
                                    overflow: "hidden"
                                  },
                                  children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                    "div",
                                    {
                                      style: {
                                        width: `${overallPct}%`,
                                        height: "100%",
                                        borderRadius: 5,
                                        background: overallPct >= 100 ? "linear-gradient(90deg, #fde68a, #f59e0b)" : "linear-gradient(90deg, #93c5fd, #8b5cf6, #f59e0b)",
                                        transition: "width .4s ease"
                                      }
                                    }
                                  )
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 11.5, color: TONE18.quiet, fontWeight: 600, whiteSpace: "nowrap" }, children: [
                                overallPct,
                                "%"
                              ] })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: sectionTitleStyle2, children: t("pl.achievements.levelLabel") }),
                        !level ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "div",
                          {
                            style: {
                              fontSize: 12.5,
                              lineHeight: 1.7,
                              color: TONE18.quiet,
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`,
                              borderRadius: 7,
                              padding: "9px 11px",
                              fontStyle: "italic"
                            },
                            children: t("pl.achievements.loading")
                          }
                        ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                          "div",
                          {
                            style: {
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`,
                              borderRadius: 10,
                              padding: "12px 14px",
                              display: "flex",
                              alignItems: "center",
                              gap: 16
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LevelRing, { level, TONE: TONE18 }),
                              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                    "div",
                                    {
                                      style: {
                                        flex: 1,
                                        height: 7,
                                        borderRadius: 4,
                                        background: TONE18.panel,
                                        border: `1px solid ${TONE18.border}`,
                                        overflow: "hidden"
                                      },
                                      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                        "div",
                                        {
                                          style: {
                                            width: `${level.pct}%`,
                                            height: "100%",
                                            background: `linear-gradient(90deg, ${levelColor(level.level)}, ${TONE18.accent})`,
                                            borderRadius: 4,
                                            transition: "width .3s ease"
                                          }
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 11.5, color: TONE18.quiet, fontWeight: 600, whiteSpace: "nowrap" }, children: [
                                    level.pct,
                                    "%"
                                  ] })
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, color: TONE18.quiet }, children: level.next > level.current ? t("pl.gamification.progress").replace("{n}", String(level.next - level.current)) : t("pl.gamification.maxed") }),
                                level.decayed && level.inactiveDays !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, color: TONE18.red, fontWeight: 500 }, children: t("pl.achievements.decayed").replace("{days}", String(level.inactiveDays)) }),
                                level.decayed && level.level > 1 && level.dropGap !== void 0 && level.prevTitle && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, color: TONE18.red, fontWeight: 500 }, children: t("pl.achievements.dropGap").replace("{prev}", level.prevTitle).replace("{n}", String(level.dropGap)) })
                              ] })
                            ]
                          }
                        ),
                        level && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { marginTop: 10 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                            "button",
                            {
                              onClick: (e) => {
                                e.stopPropagation();
                                setShowLevels((v) => !v);
                              },
                              style: {
                                background: TONE18.row,
                                border: `1px solid ${TONE18.border}`,
                                color: TONE18.accent,
                                height: 28,
                                borderRadius: 14,
                                padding: "0 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "background .24s ease"
                              },
                              children: showLevels ? t("pl.achievements.levelDetailHide") : t("pl.achievements.levelDetail")
                            }
                          ),
                          showLevels && status && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                            "div",
                            {
                              style: {
                                marginTop: 10,
                                padding: "10px 12px",
                                borderRadius: 9,
                                background: TONE18.row,
                                border: `1px solid ${TONE18.border}`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 6
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, fontWeight: 700, color: TONE18.text }, children: t("pl.achievements.levelThresholds") }),
                                status.levelRules.map((r, idx) => {
                                  const cur = r.level === status.level.level;
                                  const reached = r.level <= status.level.level;
                                  const maxT = status.levelRules.length ? status.levelRules[status.levelRules.length - 1].threshold : 1;
                                  const span = maxT > 0 ? Math.max(4, Math.min(100, r.threshold / maxT * 100)) : 100;
                                  const g = LEVEL_GRAD[r.level] ?? LEVEL_GRAD[1];
                                  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                                    "div",
                                    {
                                      className: cur ? "pl-lv-row pl-lv-cur" : "pl-lv-row",
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        fontSize: 11.5,
                                        padding: "5px 7px",
                                        borderRadius: 8,
                                        background: cur ? "color-mix(in srgb, var(--dsw-alias-accent, #7c9cff) 14%, transparent)" : "transparent",
                                        fontWeight: cur ? 700 : 500,
                                        color: TONE18.text
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                                          "span",
                                          {
                                            className: cur ? "pl-lv-cur" : void 0,
                                            style: {
                                              flexShrink: 0,
                                              width: 27,
                                              height: 27,
                                              borderRadius: 8,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: 9,
                                              fontWeight: 800,
                                              color: "#fff",
                                              letterSpacing: 0.5,
                                              background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                                              boxShadow: `0 2px 8px ${g.glow}`,
                                              ["--pl-lv-glow"]: g.glow
                                            },
                                            children: [
                                              "LV",
                                              r.level
                                            ]
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }, children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }, children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: lang === "en" ? r.en : r.zh }),
                                            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { color: cur ? TONE18.accent : g.from, fontWeight: cur ? 700 : 600, flexShrink: 0 }, children: t("pl.achievements.levelNeed").replace("{n}", String(r.threshold)) })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                            "div",
                                            {
                                              style: {
                                                height: 4,
                                                borderRadius: 999,
                                                background: "rgba(154,163,178,.2)",
                                                overflow: "hidden",
                                                position: "relative"
                                              },
                                              children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                                "div",
                                                {
                                                  className: "pl-lv-fill",
                                                  style: {
                                                    width: `${span}%`,
                                                    height: "100%",
                                                    borderRadius: 999,
                                                    background: reached ? `linear-gradient(90deg, ${g.from}, ${g.to})` : "rgba(154,163,178,.35)",
                                                    boxShadow: reached ? `0 0 6px ${g.glow}` : "none",
                                                    animationDelay: `${idx * 0.12}s`
                                                  }
                                                }
                                              )
                                            }
                                          )
                                        ] })
                                      ]
                                    },
                                    r.level
                                  );
                                }),
                                status.pointSources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, fontWeight: 700, color: TONE18.text, marginTop: 4 }, children: t("pl.achievements.pointSources") }),
                                  status.pointSources.map((p) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                                    "div",
                                    {
                                      style: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, padding: "2px 6px" },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1, color: TONE18.text }, children: lang === "en" ? p.en : p.zh }),
                                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { color: "#059669", fontWeight: 700 }, children: [
                                          "+",
                                          p.points
                                        ] })
                                      ]
                                    },
                                    p.kind
                                  ))
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, fontWeight: 700, color: TONE18.text, marginTop: 4 }, children: t("pl.achievements.decayRule") }),
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11.5, color: TONE18.quiet, lineHeight: 1.6 }, children: status.decayRule })
                              ]
                            }
                          )
                        ] }),
                        level && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "div",
                          {
                            style: {
                              marginTop: 10,
                              fontSize: 12,
                              lineHeight: 1.6,
                              padding: "9px 11px",
                              borderRadius: 7,
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              background: TONE18.row,
                              border: "1px solid transparent",
                              borderColor: level.next > level.current ? TONE18.accent : "var(--dsw-alias-state-success-primary, #78dda0)",
                              color: level.next > level.current ? TONE18.accent : "var(--dsw-alias-state-success-primary, #78dda0)",
                              fontWeight: 600
                            },
                            children: level.next > level.current ? t("pl.achievements.unlockAssistant") : t("pl.achievements.unlockAssistantDone")
                          }
                        )
                      ] }),
                      status && upNext.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { ...sectionTitleStyle2, display: "flex", alignItems: "center" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1 }, children: t("pl.achievements.upNext") }),
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontSize: 11, color: TONE18.quiet, fontWeight: 500 }, children: [
                            t("pl.achievements.collected").replace("{n}", String(achievedCount)),
                            " \xB7 ",
                            achievedCount,
                            " /",
                            " ",
                            achievements.length
                          ] })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "ul",
                          {
                            style: {
                              margin: 0,
                              padding: 0,
                              listStyle: "none",
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 8
                            },
                            children: upNext.map((a) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                              AchievementCard,
                              {
                                achievement: a,
                                cardNo: achToCard[a.id] ?? 0,
                                t,
                                TONE: TONE18,
                                lang
                              },
                              a.id
                            ))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { ...sectionTitleStyle2, display: "flex", alignItems: "center" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { flex: 1 }, children: t("pl.achievements.title") }),
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, color: TONE18.quiet, fontWeight: 500 }, children: t("pl.achievements.count").replace("{n}", String(wallUnlocked)).replace("{total}", String(wallCards.length)) })
                        ] }),
                        rarityStats.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "div",
                          {
                            style: {
                              display: "flex",
                              flexDirection: "column",
                              gap: 7,
                              margin: "2px 0 10px",
                              padding: "10px 11px",
                              borderRadius: 9,
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`
                            },
                            children: rarityStats.map((s) => {
                              const c = RARITY_COLORS[s.rarity] ?? RARITY_COLORS.common;
                              const p = s.total > 0 ? Math.round(s.unlocked / s.total * 100) : 0;
                              return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { width: 44, flexShrink: 0, color: c.text, fontWeight: 600 }, children: rarityLabel(s.rarity, t) }),
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                  "div",
                                  {
                                    style: {
                                      flex: 1,
                                      height: 6,
                                      borderRadius: 3,
                                      background: TONE18.panel,
                                      border: `1px solid ${TONE18.border}`,
                                      overflow: "hidden"
                                    },
                                    children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                                      "div",
                                      {
                                        style: {
                                          width: `${p}%`,
                                          height: "100%",
                                          borderRadius: 3,
                                          background: `linear-gradient(90deg, ${c.base}, ${c.high})`,
                                          transition: "width .3s ease"
                                        }
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { flexShrink: 0, color: TONE18.quiet, fontWeight: 600, whiteSpace: "nowrap" }, children: [
                                  s.unlocked,
                                  "/",
                                  s.total
                                ] })
                              ] }, s.rarity);
                            })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 10px" }, children: ["all", ...RARITIES].map((r) => {
                          const active = filter === r;
                          const c = r === "all" ? { deep: TONE18.accent, border: TONE18.border } : RARITY_COLORS[r] ?? RARITY_COLORS.common;
                          return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setFilter(r),
                              style: {
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                border: `1px solid ${active ? c.deep : TONE18.border}`,
                                color: active ? "#fff" : TONE18.quiet,
                                background: active ? c.deep : TONE18.row,
                                transition: "background .16s ease, color .16s ease, border-color .16s ease"
                              },
                              children: r === "all" ? t("pl.achievements.all") : rarityLabel(r, t)
                            },
                            r
                          );
                        }) }),
                        !status ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "div",
                          {
                            style: {
                              fontSize: 12.5,
                              lineHeight: 1.7,
                              color: TONE18.quiet,
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`,
                              borderRadius: 7,
                              padding: "9px 11px",
                              fontStyle: "italic"
                            },
                            children: t("pl.achievements.loading")
                          }
                        ) : wallCards.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "div",
                          {
                            style: {
                              fontSize: 12.5,
                              lineHeight: 1.7,
                              color: TONE18.quiet,
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`,
                              borderRadius: 7,
                              padding: "9px 11px"
                            },
                            children: t("pl.achievements.empty")
                          }
                        ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "ul",
                          {
                            style: {
                              margin: 0,
                              padding: 0,
                              listStyle: "none",
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 8
                            },
                            children: wallCards.map((card) => {
                              const a = cardToAch[card];
                              return a ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(AchievementCard, { achievement: a, cardNo: card, t, TONE: TONE18, lang }, card) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TarotSlotCard, { no: card, t, TONE: TONE18, lang }, card);
                            })
                          }
                        )
                      ] })
                    ]
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    document.body
  );
}

// src/client/components/assistant/PersonaManagerModal.tsx
var import_react6 = require("react");
var import_react_dom3 = require("react-dom");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

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
  const TONE18 = getTone();
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
                style: { ...btn, color: TONE18.text },
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

// src/client/components/assistant/PersonaManagerModal.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var MONO2 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function BookIcon({ color, size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "path",
      {
        d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z",
        stroke: "currentColor",
        strokeWidth: "1.7",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
function PersonaManagerModal({ open, onClose, t }) {
  useThemeSync();
  const TONE18 = getTone();
  const [personas, setPersonas] = (0, import_react6.useState)([]);
  const [loaded, setLoaded] = (0, import_react6.useState)(false);
  const [scopes, setScopes] = (0, import_react6.useState)([]);
  const [scopesLoaded, setScopesLoaded] = (0, import_react6.useState)(false);
  const [expanded, setExpanded] = (0, import_react6.useState)(/* @__PURE__ */ new Set());
  const refreshScopes = () => listScopeTree().then((tree) => {
    setScopes(tree);
    const expandAll = /* @__PURE__ */ new Set();
    for (const ws of tree) expandAll.add(ws.path);
    setExpanded(expandAll);
    setScopesLoaded(true);
  });
  const tRef = (0, import_react6.useRef)(t);
  tRef.current = t;
  const [createName, setCreateName] = (0, import_react6.useState)("");
  const [names, setNames] = (0, import_react6.useState)({});
  const [editingId, setEditingId] = (0, import_react6.useState)(null);
  const [editContent, setEditContent] = (0, import_react6.useState)("");
  const [deleteId, setDeleteId] = (0, import_react6.useState)(null);
  const [detailId, setDetailId] = (0, import_react6.useState)(null);
  const [error, setError] = (0, import_react6.useState)(null);
  const [busy, setBusy] = (0, import_react6.useState)(false);
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setLoaded(false);
    setError(null);
    setEditingId(null);
    setDeleteId(null);
    setDetailId(null);
    setCreateName("");
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
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    refreshScopes().catch(() => {
    });
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
      setEditingId(null);
    } catch {
      setError(t("pl.personas.opFailed"));
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
    deletePersona(deleteId).then(() => refresh()).catch(() => setError(t("pl.personas.opFailed"))).finally(() => {
      setBusy(false);
      setDeleteId(null);
      if (editingId === deleteId) setEditingId(null);
    });
  };
  const defaultPersona = personas.find((p) => p.isDefault);
  const customPersonas = personas.filter((p) => !p.isDefault);
  const bindablePersonas = customPersonas.filter((p) => p.enabled);
  const handleScopeBind = (nodePath, personaId) => {
    const value = personaId === "default" ? "" : personaId;
    setBusy(true);
    setError(null);
    setPersonaBinding(nodePath, value || "default").then(() => refreshScopes()).catch(() => setError(t("pl.personas.opFailed"))).finally(() => setBusy(false));
  };
  const toggleExpand = (wsPath) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(wsPath)) next.delete(wsPath);
    else next.add(wsPath);
    return next;
  });
  const renderScopeNode = (node, depth) => {
    const selectValue = bindablePersonas.some((p) => p.id === node.bound) ? node.bound : "default";
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { marginLeft: depth * 18 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
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
            node.kind === "workspace" && node.children.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                type: "button",
                onClick: () => toggleExpand(node.path),
                title: node.title,
                style: {
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  border: "none",
                  background: "transparent",
                  color: TONE18.quiet,
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
            ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { flexShrink: 0, width: 18 } }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "span",
              {
                style: {
                  flexShrink: 0,
                  fontSize: 10.5,
                  color: node.kind === "workspace" ? TONE18.accent : TONE18.quiet,
                  background: TONE18.accentSoft,
                  border: `1px solid ${TONE18.border}`,
                  borderRadius: 999,
                  padding: "0 6px",
                  lineHeight: "15px"
                },
                children: node.kind === "workspace" ? t("pl.personas.scopes.workspace") : t("pl.personas.scopes.project")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "span",
              {
                style: {
                  flex: 1,
                  fontSize: 12.5,
                  color: TONE18.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                },
                title: node.path,
                children: node.title
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "select",
              {
                value: selectValue,
                disabled: busy,
                onChange: (e) => handleScopeBind(node.path, e.target.value),
                style: {
                  flexShrink: 0,
                  boxSizing: "border-box",
                  width: "auto",
                  minWidth: 120,
                  maxWidth: 180,
                  fontSize: 12,
                  color: TONE18.text,
                  background: TONE18.row,
                  border: `1px solid ${TONE18.border}`,
                  borderRadius: 7,
                  padding: "3px 6px",
                  outline: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: MONO2
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "default", children: t("pl.personas.scopes.defaultOption") }),
                  bindablePersonas.map((p) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: p.id, children: names[p.id] ?? p.name }, p.id))
                ]
              }
            )
          ]
        }
      ),
      node.kind === "workspace" && expanded.has(node.path) && node.children.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: node.children.map((child) => renderScopeNode(child, depth + 1)) })
    ] }, node.path);
  };
  const inputStyle8 = {
    boxSizing: "border-box",
    width: "100%",
    background: TONE18.row,
    border: `1px solid ${TONE18.border}`,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 12.5,
    color: TONE18.text,
    fontFamily: MONO2,
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
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "div",
      {
        style: {
          background: TONE18.panel,
          border: `1px solid ${TONE18.border}`,
          borderRadius: 10,
          overflow: "hidden",
          opacity: p.enabled ? 1 : 0.6
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: TONE18.row,
                borderBottom: `1px solid ${TONE18.border}`
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(BookIcon, { color: isDefault ? TONE18.accent : p.enabled ? TONE18.accent : TONE18.quiet }),
                isDefault ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE18.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: p.name }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    "span",
                    {
                      style: {
                        fontSize: 10.5,
                        color: TONE18.accent,
                        background: TONE18.accentSoft,
                        border: `1px solid ${TONE18.border}`,
                        borderRadius: 999,
                        padding: "1px 8px"
                      },
                      children: t("pl.personas.defaultBadge")
                    }
                  )
                ] }) : isEditing ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "input",
                  {
                    value: names[p.id] ?? p.name,
                    onChange: (e) => setNames((prev) => ({ ...prev, [p.id]: e.target.value })),
                    disabled: busy,
                    style: { ...inputStyle8, flex: 1, minWidth: 60, background: TONE18.panel },
                    maxLength: 25,
                    title: t("pl.personas.namePlaceholder")
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "strong",
                  {
                    style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE18.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                    title: names[p.id] ?? p.name,
                    children: names[p.id] ?? p.name
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
                      border: `1px solid ${TONE18.border}`,
                      background: p.enabled ? TONE18.accent : "transparent",
                      position: "relative",
                      cursor: busy || isDefault ? "not-allowed" : "pointer",
                      padding: 0,
                      opacity: isDefault ? 0.7 : 1
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                      "span",
                      {
                        style: {
                          position: "absolute",
                          top: 2,
                          left: p.enabled ? 17 : 2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: p.enabled ? TONE18.panel : TONE18.quiet,
                          transition: "left .24s cubic-bezier(.22,1,.36,1)"
                        }
                      }
                    )
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  import_dsh_client_ui_primitives.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => isEditing ? cancelEdit(p) : openEditor(p),
                    children: isEditing ? t("pl.personas.cancel") : t("pl.personas.edit")
                  }
                ),
                !isDefault && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setDeleteId(p.id), children: t("pl.personas.delete") })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { padding: 10 }, children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 11.5, color: TONE18.muted }, children: t("pl.personas.contentLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "textarea",
              {
                value: editContent,
                onChange: (e) => setEditContent(e.target.value),
                disabled: busy || isDefault,
                placeholder: "# SOUL",
                style: { ...textareaStyle, minHeight: isDefault ? 130 : 120 }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 11, color: TONE18.quiet, lineHeight: 1.5 }, children: t("pl.personas.contentHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy || isDefault, onClick: () => void handleSave(p), children: t("pl.personas.save") }) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: {
                background: TONE18.row,
                border: `1px solid ${TONE18.border}`,
                borderRadius: 7,
                padding: "7px 9px",
                minHeight: 40,
                maxHeight: 96,
                overflow: "hidden",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: TONE18.quiet,
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
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
    (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("pl.personas.title"),
          className: PL_DIALOG_OVERLAY,
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("style", { children: PL_DIALOG_CSS }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "div",
              {
                className: PL_DIALOG,
                style: {
                  width: 860,
                  maxWidth: "calc(100vw - 40px)",
                  maxHeight: "min(760px, calc(100vh - 40px))"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(BookIcon, { color: TONE18.accent }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { style: { flex: 1, fontSize: 15, fontWeight: 600, color: TONE18.text }, children: t("pl.personas.title") }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    "div",
                    {
                      style: {
                        marginTop: 10,
                        fontSize: 11.5,
                        lineHeight: 1.6,
                        color: TONE18.quiet,
                        background: TONE18.accentSoft,
                        border: `1px solid ${TONE18.border}`,
                        borderRadius: 7,
                        padding: "7px 10px",
                        flexShrink: 0
                      },
                      children: t("pl.personas.note")
                    }
                  ),
                  error && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { marginTop: 8, fontSize: 12, color: TONE18.red, lineHeight: 1.5, flexShrink: 0 }, children: error }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                    "div",
                    {
                      style: {
                        flex: 1,
                        minHeight: 0,
                        overflow: "auto",
                        /* 内容与滚动条之间预留 10px 间距（与官方一致） */
                        paddingRight: 10,
                        display: "flex",
                        gap: 14,
                        paddingTop: 14,
                        paddingBottom: 4,
                        marginTop: 8,
                        alignItems: "flex-start"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1 1 0",
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 10
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE18.accent, flexShrink: 0 } }),
                                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: 13, fontWeight: 600, color: TONE18.text }, children: t("pl.personas.listTitle") })
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 11, color: TONE18.quiet, lineHeight: 1.5, marginTop: 3 }, children: t("pl.personas.listHint") })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                                "div",
                                {
                                  style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    background: TONE18.accentSoft,
                                    border: `1px dashed ${TONE18.accent}`,
                                    borderRadius: 10,
                                    padding: 10
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { style: { fontSize: 12.5, fontWeight: 600, color: TONE18.accent }, children: [
                                      "+ ",
                                      t("pl.personas.createTitle")
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: 11, color: TONE18.quiet, lineHeight: 1.5, marginTop: -4 }, children: t("pl.personas.createHint") }),
                                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
                                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), disabled: busy || !createName.trim(), onClick: () => void handleCreate(), children: t("pl.personas.save") })
                                    ] })
                                  ]
                                }
                              ),
                              !loaded ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 12.5, color: TONE18.quiet, textAlign: "center", padding: "22px 0" }, children: t("pl.achievements.loading") }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
                                defaultPersona && renderPersonaCard(defaultPersona),
                                customPersonas.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 12.5, color: TONE18.quiet, textAlign: "center", padding: "18px 0" }, children: t("pl.personas.empty") }) : customPersonas.map((p) => renderPersonaCard(p))
                              ] })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                          "div",
                          {
                            style: {
                              flex: "1.15 1 0",
                              minWidth: 0,
                              background: TONE18.row,
                              border: `1px solid ${TONE18.border}`,
                              borderRadius: 10,
                              padding: 10,
                              position: "sticky",
                              top: 0
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE18.accent, flexShrink: 0 } }),
                                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: TONE18.text }, children: t("pl.personas.scopes.title") }),
                                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), title: t("pl.refresh"), onClick: () => void refreshScopes().catch(() => setError(t("pl.personas.opFailed"))), children: t("pl.refresh") })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 11, color: TONE18.quiet, lineHeight: 1.6, marginTop: 4 }, children: t("pl.personas.scopes.hint") }),
                              !scopesLoaded ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 12.5, color: TONE18.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.achievements.loading") }) : scopes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 12.5, color: TONE18.quiet, textAlign: "center", padding: "14px 0" }, children: t("pl.personas.scopes.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { display: "flex", flexDirection: "column", marginTop: 4 }, children: scopes.map((ws) => renderScopeNode(ws, 0)) })
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
                  )
                ]
              }
            )
          ]
        }
      ),
      document.body
    ),
    detailId ? (() => {
      const p = personas.find((x) => x.id === detailId);
      if (!p) return null;
      const detailName = p.isDefault ? p.name : names[p.id] ?? p.name;
      const content = p.content && p.content.trim() ? p.content.trim() : t("pl.personas.detailEmpty");
      return (0, import_react_dom3.createPortal)(
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "div",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": t("pl.personas.detailTitle"),
            className: PL_DIALOG_OVERLAY,
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("style", { children: PL_DIALOG_CSS }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: PL_DIALOG, style: { width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(520px, calc(100vh - 40px))", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(BookIcon, { color: TONE18.accent }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { style: { flex: 1, fontSize: 14, fontWeight: 600, color: TONE18.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: detailName }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setDetailId(null), children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("path", { d: "M4 4l8 8M12 4l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }) }) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      padding: "10px 11px",
                      paddingRight: 10,
                      background: TONE18.row,
                      border: `1px solid ${TONE18.border}`,
                      borderRadius: 8
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                      "pre",
                      {
                        style: {
                          margin: 0,
                          fontFamily: MONO2,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: TONE18.text,
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
        document.body
      );
    })() : null
  ] });
}

// src/client/components/assistant/WhaleStage.tsx
var import_react7 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var PET_VIDEO_ROOT = "/api/prompt-library/assets/whale-webm/";
var THUMB_EXT = ".webm";
var FRAME = { w: 640, h: 360, whaleX0: 200, whaleY0: 50, whaleX1: 440, whaleY1: 335 };
var WHALE_CX = (FRAME.whaleX0 + FRAME.whaleX1) / 2;
var WHALE_FEET_Y = FRAME.whaleY1;
var PHASE_POOL = {
  idle: ["\u5F85\u673A\u547C\u5438\u4F11\u95F2", "\u60A0\u95F2\u54FC\u6B4C", "\u4E1C\u5F20\u897F\u671B", "\u539F\u5730\u6F02\u6D6E\u8E0F\u6B65"],
  waiting: ["\u4E1C\u5F20\u897F\u671B", "\u539F\u5730\u6F02\u6D6E\u8E0F\u6B65", "\u60A0\u95F2\u54FC\u6B4C"],
  thinking: ["\u6DF1\u5EA6\u601D\u8003\u788E\u788E\u5FF5"],
  tool: ["\u5199\u4EE3\u7801", "\u8F7B\u5FEB\u8BB0\u5F55", "\u539F\u5730\u6572\u51FB\u684C\u9762\u4E92\u52A8"],
  review: ["\u8F7B\u5FEB\u8BB0\u5F55", "\u7167\u955C\u5B50"],
  done: ["\u70B9\u51FB\u56DE\u5E94-\u5F00\u5FC3\u8DC3\u52A8", "\u539F\u5730\u8DF3\u8DC3\u6293\u788E\u5934\u9876\u7269\u54C1"],
  failed: ["\u88AB\u5413\u4E00\u8DF3", "\u54C8\u6B20\u8FDE\u5929"]
};
var HOVER_ANIM = "\u70B9\u51FB\u56DE\u5E94-\u5143\u6C14\u6325\u624B";
var CLICK_ANIM = "\u70B9\u51FB\u56DE\u5E94-\u5F00\u5FC3\u8DC3\u52A8";
function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function WhaleStage({ phase, hovering, clickRev, size = 72, onFail }) {
  const aRef = (0, import_react7.useRef)(null);
  const bRef = (0, import_react7.useRef)(null);
  const frontRef = (0, import_react7.useRef)(0);
  const genRef = (0, import_react7.useRef)(0);
  const [ambient, setAmbient] = (0, import_react7.useState)(0);
  const scale = size / (FRAME.whaleY1 - FRAME.whaleY0);
  const videoW = FRAME.w * scale;
  const videoH = FRAME.h * scale;
  const videoLeft = size / 2 - WHALE_CX * scale;
  const videoTop = size - WHALE_FEET_Y * scale;
  const switchTo = (name, loop) => {
    const target = frontRef.current === 0 ? bRef : aRef;
    const el = target.current;
    if (!el) return;
    const gen = ++genRef.current;
    el.src = PET_VIDEO_ROOT + encodeURIComponent(name) + THUMB_EXT;
    el.loop = loop;
    el.muted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.onended = null;
    el.load();
    const onReady = () => {
      el.removeEventListener("loadeddata", onReady);
      if (genRef.current !== gen) return;
      const old = frontRef.current === 0 ? aRef : bRef;
      frontRef.current = frontRef.current === 0 ? 1 : 0;
      el.classList.add("whale-front");
      if (old.current && old.current !== el) {
        old.current.classList.remove("whale-front");
        old.current.onended = null;
        old.current.onerror = null;
        old.current.pause();
      }
      if (!loop) el.onended = () => setAmbient((a) => a + 1);
      el.play().catch(() => {
      });
    };
    el.addEventListener("loadeddata", onReady);
    if (el.readyState >= 2) onReady();
  };
  const prevClickRef = (0, import_react7.useRef)(0);
  (0, import_react7.useEffect)(() => {
    if (clickRev === prevClickRef.current) return;
    prevClickRef.current = clickRev;
    if (clickRev > 0) switchTo(CLICK_ANIM, false);
  }, [clickRev]);
  (0, import_react7.useEffect)(() => {
    if (hovering) {
      switchTo(HOVER_ANIM, false);
      return;
    }
    const pool = PHASE_POOL[phase];
    const name = pool.length === 1 ? pool[0] : pickFrom(pool);
    switchTo(name, phase !== "idle");
  }, [phase, hovering, ambient]);
  (0, import_react7.useEffect)(() => {
    const mark = () => onFail();
    aRef.current?.addEventListener("error", mark);
    bRef.current?.addEventListener("error", mark);
    return () => {
      aRef.current?.removeEventListener("error", mark);
      bRef.current?.removeEventListener("error", mark);
    };
  }, [onFail]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
    "div",
    {
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: `
        .whale-video {
          position: absolute;
          opacity: 0;
          transition: opacity .18s ease;
          object-fit: fill;
          background: transparent;
        }
        .whale-video.whale-front { opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .whale-video { transition: none; } }
      ` }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          "video",
          {
            ref: aRef,
            className: "whale-video",
            style: { left: videoLeft, top: videoTop, width: videoW, height: videoH },
            muted: true,
            playsInline: true,
            "aria-hidden": "true"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          "video",
          {
            ref: bRef,
            className: "whale-video",
            style: { left: videoLeft, top: videoTop, width: videoW, height: videoH },
            muted: true,
            playsInline: true,
            "aria-hidden": "true"
          }
        )
      ]
    }
  );
}

// src/client/components/assistant/DashboardModal.tsx
var import_react_dom4 = require("react-dom");

// src/client/components/stats/StatsPanel.tsx
var import_react8 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime8 = require("react/jsx-runtime");
var MONO3 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
function formatAgo(ts, T) {
  if (ts <= 0) return T("pl.stats.neverUsed");
  const diff = Date.now() - ts;
  if (diff < 0) return "\u2014";
  const min = Math.floor(diff / 6e4);
  if (min < 1) return T("pl.stats.justNow");
  if (min < 60) return T("pl.stats.minAgo", { n: min });
  const hour = Math.floor(min / 60);
  if (hour < 24) return T("pl.stats.hourAgo", { n: hour });
  const day = Math.floor(hour / 24);
  if (day < 60) return T("pl.stats.dayAgo", { n: day });
  return new Date(ts).toLocaleDateString();
}
function formatDay(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}
function Legend({ color, label }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: TONE18.muted }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 } }),
    label
  ] });
}
function StatCard({ label, value, sub }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "9px 11px",
        background: TONE18.row,
        border: `1px solid ${TONE18.border}`,
        borderRadius: 8,
        minWidth: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 10, color: TONE18.quiet, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 16, fontWeight: 600, color: TONE18.text, lineHeight: 1.2 }, children: value }),
        sub ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 10, color: TONE18.muted }, children: sub }) : null
      ]
    }
  );
}
function KpiCard({ label, value, sub }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        background: TONE18.row,
        border: `1px solid ${TONE18.border}`,
        borderRadius: 8,
        minWidth: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 10, color: TONE18.quiet, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 26, fontWeight: 700, color: TONE18.text, lineHeight: 1.15 }, children: value }),
        sub ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 10, color: TONE18.muted }, children: sub }) : null
      ]
    }
  );
}
function Section({ title, children }) {
  const TONE18 = getTone();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "h3",
      {
        style: {
          margin: 0,
          fontSize: 12,
          fontWeight: 560,
          color: TONE18.text,
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { width: 3, height: 13, borderRadius: 2, background: TONE18.accent, flexShrink: 0 } }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { flex: 1, minWidth: 0 }, children: title })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children })
  ] });
}
function BarList({
  rows,
  T
}) {
  const TONE18 = getTone();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "10px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.emptyList") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 3 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "span",
        {
          style: { fontSize: 12, color: TONE18.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 },
          "data-tip": r.label,
          children: r.label
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE18.muted, flexShrink: 0, whiteSpace: "nowrap" }, children: r.sub ? `${r.value} \xB7 ${r.sub}` : r.value })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { height: 6, background: TONE18.accentSoft, borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "div",
      {
        style: {
          height: "100%",
          width: `${r.value / max * 100}%`,
          background: TONE18.accent,
          borderRadius: 3,
          transition: "width .3s ease",
          minWidth: r.value > 0 ? 3 : 0
        }
      }
    ) })
  ] }, r.key)) });
}
function TrendChart({ snapshots, T }) {
  const TONE18 = getTone();
  if (snapshots.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "14px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.trendEmpty") });
  }
  const W = 340;
  const H = 140;
  const TOP = 10;
  const BOTTOM = 18;
  const innerH = H - TOP - BOTTOM;
  const max = Math.max(1, ...snapshots.map((s) => Math.max(s.stats.addedCount, s.stats.usageCount)));
  const n = snapshots.length;
  const gw = W / n;
  const bw = Math.max(2, Math.min(7, gw * 0.24));
  const gap = Math.max(2, Math.min(5, bw));
  const lines = [0, 0.5, 1];
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "auto", role: "img", "aria-label": T("pl.stats.trend"), children: [
      lines.map((f) => {
        const y = TOP + innerH - innerH * f;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("line", { x1: 0, x2: W, y1: y, y2: y, stroke: TONE18.border, strokeWidth: 1 }, f);
      }),
      snapshots.map((s, i) => {
        const cx = i * gw + gw / 2;
        const a = s.stats.addedCount;
        const u = s.stats.usageCount;
        const ah = a / max * innerH;
        const uh = u / max * innerH;
        const label = new Date(s.createdAt).toLocaleDateString(void 0, {
          month: "2-digit",
          day: "2-digit"
        });
        const showLabel = n <= 8 || i % 2 === 0;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("g", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "rect",
            {
              x: cx - gap / 2 - bw,
              y: TOP + innerH - ah,
              width: bw,
              height: Math.max(0, ah),
              rx: 1.5,
              fill: TONE18.accent,
              opacity: 0.88,
              "data-tip": `${T("pl.stats.trendAdded")}: ${a}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "rect",
            {
              x: cx + gap / 2,
              y: TOP + innerH - uh,
              width: bw,
              height: Math.max(0, uh),
              rx: 1.5,
              fill: TONE18.mint,
              opacity: 0.88,
              "data-tip": `${T("pl.stats.trendUsage")}: ${u}`
            }
          ),
          showLabel ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("text", { x: cx, y: H - 6, textAnchor: "middle", fontSize: 9, fill: TONE18.quiet, children: label }) : null
        ] }, s.id);
      })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Legend, { color: TONE18.accent, label: T("pl.stats.trendAdded") }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Legend, { color: TONE18.mint, label: T("pl.stats.trendUsage") })
    ] })
  ] });
}
function StatsContent({
  stats,
  snapshots,
  T
}) {
  useThemeSync();
  const TONE18 = getTone();
  const usedRate = stats.total > 0 ? Math.round(stats.usedCount / stats.total * 100) : 0;
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(KpiCard, { label: T("pl.stats.total"), value: stats.total }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(KpiCard, { label: T("pl.stats.totalUsage"), value: stats.totalUsage }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        KpiCard,
        {
          label: T("pl.stats.usedRate"),
          value: `${usedRate}%`,
          sub: T("pl.stats.usedCount", { count: stats.usedCount })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        KpiCard,
        {
          label: T("pl.stats.aiRefined"),
          value: `${stats.aiRefinedPct}%`,
          sub: T("pl.stats.aiRefinedCount", { count: stats.aiRefinedCount })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.added7"), value: stats.addedIn7Days }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.used7"), value: stats.usedIn7Days })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.analysis"), children: !lastSnap ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "10px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.analysisEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { fontSize: 11, color: TONE18.muted }, children: T("pl.stats.analysisPeriod", { start: formatDay(lastSnap.stats.rangeStart), end: formatDay(lastSnap.stats.rangeEnd) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.analysisAdded"), value: lastSnap.stats.addedCount }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          StatCard,
          {
            label: T("pl.stats.analysisUsage"),
            value: lastSnap.stats.usageCount,
            sub: T("pl.stats.analysisActive", { n: lastSnap.stats.usedPromptCount })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.analysisAi"), value: lastSnap.stats.aiRefinedCount })
      ] }),
      lastSnap.comment ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "9px 11px",
            background: TONE18.row,
            border: `1px solid ${TONE18.border}`,
            borderRadius: 8
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, fontWeight: 560, color: TONE18.accent }, children: T("pl.stats.aiComment") }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { style: { margin: 0, fontSize: 12, lineHeight: 1.6, color: TONE18.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: lastSnap.comment })
          ]
        }
      ) : null,
      lastSnap.stats.addedTitles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE18.quiet }, children: T("pl.stats.analysisNewTitles") }),
        lastSnap.stats.addedTitles.map((t) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "div",
          {
            style: { padding: "5px 10px", background: TONE18.row, border: `1px solid ${TONE18.border}`, borderRadius: 7, fontSize: 12, color: TONE18.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
            "data-tip": t,
            children: t
          },
          t
        ))
      ] })
    ] }) })
  ] });
}
function StatsDetails({
  stats,
  snapshots,
  T
}) {
  useThemeSync();
  const TONE18 = getTone();
  const topUsedRows = (0, import_react8.useMemo)(
    () => stats.topUsed.map((p) => ({
      key: p.title,
      label: p.title,
      value: p.usageCount,
      sub: formatAgo(p.lastUsedAt, T)
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.topUsed]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.trend"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TrendChart, { snapshots, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.topUsed"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BarList, { rows: topUsedRows, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.recentUsed"), children: stats.recentUsed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "10px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.emptyList") }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: stats.recentUsed.map((p) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          background: TONE18.row,
          border: `1px solid ${TONE18.border}`,
          borderRadius: 7,
          alignItems: "baseline",
          minWidth: 0
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 12, color: TONE18.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }, "data-tip": p.title, children: p.title }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE18.muted, flexShrink: 0, whiteSpace: "nowrap" }, children: formatAgo(p.lastUsedAt, T) })
        ]
      },
      p.title
    )) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.sleeper"), children: stats.longestUnused.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "10px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.sleeperEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: stats.longestUnused.map((p) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          background: TONE18.row,
          border: `1px solid ${TONE18.border}`,
          borderRadius: 7,
          alignItems: "baseline",
          minWidth: 0
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 12, color: TONE18.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }, "data-tip": p.title, children: p.title }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE18.quiet, flexShrink: 0, whiteSpace: "nowrap" }, children: T("pl.stats.days", { days: p.days }) })
        ]
      },
      p.title
    )) }) })
  ] });
}
var WEEK_KEYS = [
  "pl.stats.week0",
  "pl.stats.week1",
  "pl.stats.week2",
  "pl.stats.week3",
  "pl.stats.week4",
  "pl.stats.week5",
  "pl.stats.week6"
];
function HeatmapChart({ heatmap, T }) {
  useThemeSync();
  const TONE18 = getTone();
  if (heatmap.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "14px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.heatmapEmpty") });
  }
  const max = Math.max(1, ...heatmap.map((c) => c.count));
  const counts = new Map(heatmap.map((c) => [`${c.weekday}:${c.hour}`, c.count]));
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const weeks = Array.from({ length: 7 }, (_, w) => w);
  const fill = (count) => count <= 0 ? `color-mix(in srgb, ${TONE18.border} 35%, transparent)` : `color-mix(in srgb, ${TONE18.accent} ${Math.round(20 + count / max * 66)}%, transparent)`;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", alignItems: "flex-end", gap: 2, marginLeft: 28 }, children: hours.map((h) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "span",
      {
        style: {
          flex: 1,
          textAlign: "center",
          fontSize: 8,
          color: TONE18.quiet,
          height: 10,
          lineHeight: 1
        },
        children: h % 4 === 0 ? h : ""
      },
      h
    )) }),
    weeks.map((wd) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 2 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "span",
        {
          style: {
            width: 26,
            flexShrink: 0,
            fontSize: 9,
            color: TONE18.quiet,
            whiteSpace: "nowrap",
            overflow: "hidden"
          },
          children: T(WEEK_KEYS[wd])
        }
      ),
      hours.map((h) => {
        const count = counts.get(`${wd}:${h}`) ?? 0;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "div",
          {
            style: { flex: 1, height: 13, borderRadius: 2, minWidth: 2, background: fill(count) },
            "data-tip": `${T(WEEK_KEYS[wd])} ${h}:00 \xB7 ${count}`
          },
          h
        );
      })
    ] }, wd))
  ] });
}
function LifecycleSection({ stats, T }) {
  useThemeSync();
  const topUsed7Rows = (0, import_react8.useMemo)(
    () => (stats.topUsed7 ?? []).map((p) => ({
      key: p.title,
      label: p.title,
      value: p.count
    })),
    [stats.topUsed7]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.lcAdded"), value: stats.addedIn7Days }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        StatCard,
        {
          label: T("pl.stats.lcActive"),
          value: stats.usedIn7Days,
          sub: T("pl.stats.lcActive30", { n: stats.usedIn30Days })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.lcDormant"), value: stats.unusedCount }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatCard, { label: T("pl.stats.lcTrash"), value: stats.trashCount })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.topUsed7"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BarList, { rows: topUsed7Rows, T }) })
  ] });
}
function HealthCard({ stats, T }) {
  const TONE18 = getTone();
  const util = stats.total > 0 ? Math.round(stats.usedCount / stats.total * 100) : 0;
  const active30 = stats.total > 0 ? Math.round(stats.usedIn30Days / stats.total * 100) : 0;
  const ai = stats.aiRefinedPct;
  const score = Math.round(util * 0.45 + active30 * 0.35 + ai * 0.2);
  const lv = score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "ok" : "poor";
  const color = lv === "great" ? TONE18.mint : lv === "good" ? TONE18.accent : lv === "ok" ? "#f59e0b" : TONE18.red;
  const label = lv === "great" ? T("pl.stats.healthGreat") : lv === "good" ? T("pl.stats.healthGood") : lv === "ok" ? T("pl.stats.healthOk") : T("pl.stats.healthPoor");
  const dims = [
    { key: "util", label: T("pl.stats.healthDimUtil"), val: util },
    { key: "act", label: T("pl.stats.healthDimActive"), val: active30 },
    { key: "ai", label: T("pl.stats.healthDimAi"), val: ai }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        gap: 14,
        padding: "12px 14px",
        background: TONE18.row,
        border: `1px solid ${TONE18.border}`,
        borderRadius: 10
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              width: 74,
              flexShrink: 0
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 30, fontWeight: 700, lineHeight: 1, color }, children: score }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color, fontWeight: 560 }, children: label })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }, children: dims.map((d) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: TONE18.muted }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: d.label }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
              d.val,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { height: 5, background: TONE18.accentSoft, borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "div",
            {
              style: {
                height: "100%",
                width: `${Math.min(100, d.val)}%`,
                background: color,
                borderRadius: 3,
                transition: "width .3s ease"
              }
            }
          ) })
        ] }, d.key)) })
      ]
    }
  );
}
function GrowthChart({ snapshots, T }) {
  const TONE18 = getTone();
  if (snapshots.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "14px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.trendEmpty") });
  }
  let ca = 0;
  let cu = 0;
  const added = [];
  const used = [];
  snapshots.forEach((s) => {
    ca += s.stats.addedCount;
    cu += s.stats.usageCount;
    added.push(ca);
    used.push(cu);
  });
  const W = 340;
  const H = 120;
  const TOP = 8;
  const BOT = 16;
  const innerH = H - TOP - BOT;
  const max = Math.max(1, ...added, ...used);
  const n = snapshots.length;
  const x = (i) => n === 1 ? W / 2 : i / (n - 1) * W;
  const y = (v) => TOP + innerH - v / max * innerH;
  const linePath = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = (arr) => `${linePath(arr)} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const lastAdded = added[added.length - 1];
  const lastUsed = used[used.length - 1];
  const dayLabel = (i) => new Date(snapshots[i].createdAt).toLocaleDateString(void 0, { month: "2-digit", day: "2-digit" });
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "auto", role: "img", "aria-label": T("pl.stats.growthTitle"), children: [
      [0, 0.5, 1].map((f) => {
        const yy = TOP + innerH - innerH * f;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("line", { x1: 0, x2: W, y1: yy, y2: yy, stroke: TONE18.border, strokeWidth: 1 }, f);
      }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: areaPath(used), fill: TONE18.mint, opacity: 0.18 }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: linePath(used), stroke: TONE18.mint, strokeWidth: 1.8, fill: "none" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: areaPath(added), fill: TONE18.accent, opacity: 0.16 }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: linePath(added), stroke: TONE18.accent, strokeWidth: 1.8, fill: "none" }),
      n > 1 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("text", { x: x(0), y: H - 4, textAnchor: "start", fontSize: 8, fill: TONE18.quiet, children: dayLabel(0) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("text", { x: x(n - 1), y: H - 4, textAnchor: "end", fontSize: 8, fill: TONE18.quiet, children: dayLabel(n - 1) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Legend, { color: TONE18.accent, label: `${T("pl.stats.cumAdded")} \xB7 ${lastAdded}` }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Legend, { color: TONE18.mint, label: `${T("pl.stats.cumUsed")} \xB7 ${lastUsed}` })
    ] })
  ] });
}
function PeakInsight({ heatmap, T }) {
  const TONE18 = getTone();
  if (heatmap.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "14px 12px", color: TONE18.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.emptyList") });
  }
  const sorted = [...heatmap].sort((a, b) => b.count - a.count);
  const p1 = sorted[0];
  const p2 = sorted.find((c) => !(c.weekday === p1.weekday && c.hour === p1.hour));
  const top5 = sorted.slice(0, 5);
  const max5 = Math.max(1, top5[0].count);
  const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "9px 11px",
          background: TONE18.row,
          border: `1px solid ${TONE18.border}`,
          borderRadius: 8
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 12, fontWeight: 560, color: TONE18.accent }, children: T("pl.stats.peakPrimary", { day: T(WEEK_KEYS[p1.weekday]), hour: hourLabel(p1.hour), n: p1.count }) }),
          p2 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE18.muted }, children: T("pl.stats.peakSecondary", { day: T(WEEK_KEYS[p2.weekday]), hour: hourLabel(p2.hour) }) }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: top5.map((c) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: TONE18.muted }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          T(WEEK_KEYS[c.weekday]),
          " ",
          hourLabel(c.hour)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
          c.count,
          " ",
          T("pl.stats.times")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { height: 5, background: TONE18.accentSoft, borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "div",
        {
          style: {
            height: "100%",
            width: `${c.count / max5 * 100}%`,
            background: TONE18.accent,
            borderRadius: 3,
            transition: "width .3s ease"
          }
        }
      ) })
    ] }, `${c.weekday}:${c.hour}`)) })
  ] });
}
function HotRank({ stats, T }) {
  const tagRows = stats.tagStats.slice(0, 8).map((t) => ({ key: t.name, label: t.name, value: t.count }));
  const weekRows = (stats.topUsed7 ?? []).map((p) => ({
    key: p.title,
    label: p.title,
    value: p.count
  }));
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.hotRankTags"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BarList, { rows: tagRows, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.hotRankWeek"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BarList, { rows: weekRows, T }) })
  ] });
}
function InsightSection({ data, T }) {
  useThemeSync();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.healthTitle"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(HealthCard, { stats: data.stats, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.growthTitle"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GrowthChart, { snapshots: data.snapshots, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Section, { title: T("pl.stats.peakTitle"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PeakInsight, { heatmap: data.heatmap ?? [], T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(HotRank, { stats: data.stats, T })
  ] });
}
function StatsTabBar({ active, onChange, T }) {
  const TONE18 = getTone();
  const tabs = [
    { id: "overview", label: T("pl.stats.tabOverview") },
    { id: "heatmap", label: T("pl.stats.tabHeatmap") },
    { id: "lifecycle", label: T("pl.stats.tabLifecycle") },
    { id: "details", label: T("pl.stats.tabDetails") },
    { id: "insight", label: T("pl.stats.tabInsight") }
  ];
  const activeStyle = {
    background: TONE18.accentSoft,
    color: TONE18.accent
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "div",
    {
      style: {
        display: "flex",
        gap: 4,
        padding: 3,
        background: TONE18.row,
        border: `1px solid ${TONE18.border}`,
        borderRadius: 14,
        width: "100%",
        boxSizing: "border-box"
      },
      children: tabs.map((tb) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          onClick: () => onChange(tb.id),
          style: {
            flex: 1,
            height: 26,
            padding: "0 10px",
            border: "none",
            borderRadius: 11,
            fontSize: 12,
            whiteSpace: "nowrap",
            cursor: "pointer",
            background: tb.id === active ? activeStyle.background : "transparent",
            color: tb.id === active ? activeStyle.color : TONE18.muted,
            transition: "background .24s ease, color .24s ease"
          },
          children: tb.label
        },
        tb.id
      ))
    }
  );
}
function StatsPanel({ t, onBack }) {
  useThemeSync();
  const TONE18 = getTone();
  const T = t ?? fallbackT;
  const [data, setData] = (0, import_react8.useState)(null);
  const [error, setError] = (0, import_react8.useState)(null);
  const [tab, setTab] = (0, import_react8.useState)("overview");
  const load = (0, import_react8.useCallback)(() => {
    getStats().then((d) => {
      setData(d);
      setError(null);
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  (0, import_react8.useEffect)(() => {
    load();
  }, [load]);
  useDataChanged(() => {
    load();
  });
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: MONO3
      },
      children: [
        (onBack || data) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
          "div",
          {
            style: {
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "12px 14px 0"
            },
            children: [
              onBack && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                import_dsh_client_ui_primitives2.Button,
                {
                  type: "button",
                  variant: "primary",
                  size: "sm",
                  className: plBtn("primary", "sm"),
                  onClick: onBack,
                  icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
                      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M19 12H5M11 18l-6-6 6-6" })
                    }
                  ),
                  children: T("pl.stats.back")
                }
              ) }),
              data && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatsTabBar, { active: tab, onChange: setTab, T })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "12px 10px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12
            },
            children: [
              error && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                "div",
                {
                  style: {
                    padding: "9px 12px",
                    color: TONE18.red,
                    fontSize: 12,
                    lineHeight: 1.5,
                    textAlign: "center",
                    wordBreak: "break-word",
                    background: `color-mix(in srgb, ${TONE18.red} 8%, transparent)`,
                    border: `1px solid ${TONE18.border}`,
                    borderRadius: 7
                  },
                  children: [
                    T("pl.stats.loadFail"),
                    "\uFF1A",
                    error
                  ]
                }
              ),
              !data && !error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { padding: "24px 12px", color: TONE18.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
              data && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
                tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatsContent, { stats: data.stats, snapshots: data.snapshots, T }),
                tab === "heatmap" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(HeatmapChart, { heatmap: data.heatmap ?? [], T }),
                tab === "lifecycle" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LifecycleSection, { stats: data.stats, T }),
                tab === "details" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatsDetails, { stats: data.stats, snapshots: data.snapshots, T }),
                tab === "insight" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(InsightSection, { data, T })
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/client/components/assistant/DashboardModal.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
function DashboardModal({ open, onClose, t }) {
  useThemeSync();
  const TONE18 = getTone();
  if (!open) return null;
  return (0, import_react_dom4.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("pl.ctx.dashboard"),
        className: PL_DIALOG_OVERLAY,
        onClick: onClose,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "div",
            {
              onClick: (e) => e.stopPropagation(),
              className: PL_DIALOG,
              style: {
                width: 640,
                maxWidth: "calc(100vw - 40px)",
                height: "min(700px, calc(100vh - 40px))",
                display: "flex",
                flexDirection: "column"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { style: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 560, color: TONE18.text }, children: t("pl.ctx.dashboard") }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(DialogCloseButton, { onClick: onClose, label: t("pl.close") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { flex: 1, minHeight: 0, marginTop: 4, display: "flex", flexDirection: "column" }, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatsPanel, { t }) })
              ]
            }
          )
        ]
      }
    ),
    document.body
  );
}

// src/client/components/settings/modules/ImportExportModal.tsx
var import_react12 = require("react");
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/settings/modules/SkillImportModal.tsx
var import_react10 = require("react");
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/common/TemplateVariables.tsx
var import_react9 = require("react");
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime10 = require("react/jsx-runtime");
var MONO4 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE2 = {
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
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { "data-var": name, style: hlStrong(color, active), "data-tip": `{{${name}}}`, children: val }, `f${key++}`)
      );
    } else {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { "data-var": name, style: hlPlaceholder(color, active), children: `{{${name}}}` }, `p${key++}`)
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
function pickVarMemory(variables) {
  const mem = loadVarMemory();
  const out = {};
  for (const name of variables) {
    if (Object.prototype.hasOwnProperty.call(mem, name)) out[name] = mem[name];
  }
  return out;
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
  const [values, setValues] = (0, import_react9.useState)({});
  const [focusName, setFocusName] = (0, import_react9.useState)(null);
  (0, import_react9.useEffect)(() => {
    if (open) {
      setValues({ ...pickVarMemory(variables), ...initialValues ?? {} });
      setWarnMsg(null);
    }
  }, [open, variables, initialValues]);
  const colorOf = (0, import_react9.useCallback)(
    (name) => varColor(Math.max(0, variables.indexOf(name))),
    [variables]
  );
  const previewRef = (0, import_react9.useRef)(null);
  (0, import_react9.useEffect)(() => {
    if (!focusName) return;
    const el = previewRef.current;
    if (!el) return;
    const target = el.querySelector(`[data-var="${CSS.escape(focusName)}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusName]);
  const [warnMsg, setWarnMsg] = (0, import_react9.useState)(null);
  const inputListRef = (0, import_react9.useRef)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("pl.template.title"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 4, flexShrink: 0 }, children: t("pl.template.title") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { fontSize: 12, color: TONE2.muted, lineHeight: 1.6, flexShrink: 0 }, children: t("pl.template.desc") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
                    return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                      "label",
                      {
                        style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE2.muted, flexShrink: 0 },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
                                borderColor: focused ? color : TONE2.border,
                                boxShadow: focused ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : "none",
                                background: focused ? `color-mix(in srgb, ${color} 6%, ${TONE2.row})` : TONE2.row,
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontSize: 11, color: TONE2.muted }, children: t("pl.template.preview") }),
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
                          color: TONE2.text,
                          background: TONE2.row,
                          border: `1px solid ${TONE2.border}`,
                          borderRadius: 7,
                          fontFamily: MONO4
                        },
                        children: renderPreview(body, values, colorOf, focusName)
                      }
                    )
                  ]
                }
              ),
              warnMsg && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 16 16", style: { flexShrink: 0 }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                      "path",
                      {
                        d: "M8 4v5M8 11.5v.5",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "1.8",
                        strokeLinecap: "round"
                      }
                    ) }),
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: warnMsg })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives3.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: onCancel, children: t("pl.cancel") }),
                showInsertAndSend && onInsertAndSend && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                  import_dsh_client_ui_primitives3.Button,
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
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives3.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: submit, children: confirmLabel ?? t("pl.insert") })
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
  color: TONE2.text,
  background: TONE2.row,
  border: `1px solid ${TONE2.border}`,
  borderRadius: 7,
  fontFamily: MONO4,
  fontSize: 13,
  outline: "none"
};

// src/client/components/settings/modules/SkillImportModal.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var MONO5 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE3 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var inputStyle2 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE3.text,
  background: TONE3.row,
  border: `1px solid ${TONE3.border}`,
  borderRadius: 7,
  fontFamily: MONO5,
  fontSize: 13,
  outline: "none"
};
function kebabFromName(raw, fallback) {
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || `skill-file-${fallback}`;
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
  const { open, onClose, t, mode = "import", initialEntries, onExported } = props;
  const T = usePLT(t);
  const [entries, setEntries] = (0, import_react10.useState)([]);
  const [validation, setValidation] = (0, import_react10.useState)(null);
  const [fixLog, setFixLog] = (0, import_react10.useState)([]);
  const [saving, setSaving] = (0, import_react10.useState)(false);
  const [aiState, setAiState] = (0, import_react10.useState)("idle");
  const [aiResult, setAiResult] = (0, import_react10.useState)(null);
  const [msg, setMsg] = (0, import_react10.useState)(null);
  const fileRef = (0, import_react10.useRef)(null);
  const jsonRef = (0, import_react10.useRef)(null);
  const bodyRefs = (0, import_react10.useRef)({});
  const seqRef = (0, import_react10.useRef)(0);
  const [collapsed, setCollapsed] = (0, import_react10.useState)({});
  (0, import_react10.useEffect)(() => {
    if (!open) return;
    setEntries([]);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setCollapsed({});
    setAiState("idle");
    setAiResult(null);
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
    listAvailableSkills().then(
      (list) => {
        if (list.length === 0) return;
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
      () => {
      }
    );
  }, [open]);
  const addEntries = (0, import_react10.useCallback)(
    (incoming) => {
      setEntries((prev) => {
        const next = [...prev];
        for (const it of incoming) {
          const ident = it.promptId ?? it.name;
          if (ident && next.some((e) => e.source === it.source && (e.promptId ?? e.name) === ident)) {
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
  const onPickFile = (0, import_react10.useCallback)(
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
  const onPickJson = (0, import_react10.useCallback)(
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
  const scanSkills = (0, import_react10.useCallback)(() => {
    listAvailableSkills().then(
      (list) => {
        if (list.length === 0) {
          setMsg({ text: T("pl.skillImportNone"), error: false });
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
  const updateEntry = (0, import_react10.useCallback)((key, patch) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, ...patch } : e));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);
  const toggleChecked = (0, import_react10.useCallback)((key) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, checked: !e.checked } : e));
  }, []);
  const removeEntry = (0, import_react10.useCallback)((key) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);
  const toggleCollapse = (0, import_react10.useCallback)((key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const insertVar = (0, import_react10.useCallback)(
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
  const validateTemplateVars2 = (0, import_react10.useCallback)(
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
          else if (/[{}\n]/.test(inner)) errs.push(T("pl.skillModal.varInvalid", { name: inner }));
        }
      }
      if (opens.length > 0) errs.push(T("pl.skillModal.varUnclosed", { n: opens.length }));
      return errs;
    },
    [T]
  );
  const validateEntries = (0, import_react10.useCallback)(
    (list) => {
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
      return { ok: issues.length === 0, issues, fixable: issues.some((i) => i.fixable) };
    },
    [T, validateTemplateVars2]
  );
  const handleValidate = (0, import_react10.useCallback)(async () => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    const result = validateEntries(entries);
    setValidation(result);
    setFixLog([]);
    setMsg(null);
    if (mode !== "export" || !result.ok) {
      setAiState("idle");
      setAiResult(null);
      return;
    }
    setAiState("running");
    setAiResult(null);
    const checked = entries.filter((e) => e.checked);
    const updates = /* @__PURE__ */ new Map();
    const errors = [];
    for (const entry of checked) {
      try {
        const desc = await describeSkill({
          title: entry.title,
          body: entry.body,
          summary: entry.summary.trim() || void 0
        });
        if (desc && desc.desc && desc.desc.name && desc.desc.description) {
          updates.set(entry.key, {
            name: entry.name.trim() ? entry.name : desc.desc.name,
            summary: entry.summary.trim() ? entry.summary : desc.desc.description
          });
        } else {
          errors.push({ key: entry.key, title: entry.title, reason: skillFailReason(desc?.fail, T) });
        }
      } catch (err) {
        errors.push({
          key: entry.key,
          title: entry.title,
          reason: err instanceof Error ? err.message : String(err)
        });
      }
    }
    setEntries(
      (prev) => prev.map((e) => {
        const update = updates.get(e.key);
        if (update) return { ...e, ...update, aiFailed: false, aiFailReason: void 0 };
        const error = errors.find((err) => err.key === e.key);
        if (error && e.checked) return { ...e, aiFailed: true, aiFailReason: error.reason };
        return e;
      })
    );
    setAiState("done");
    setAiResult({
      done: updates.size,
      errors: errors.map(({ title, reason }) => ({ title, reason }))
    });
  }, [entries, mode, T, validateEntries]);
  const handleFix = (0, import_react10.useCallback)(() => {
    if (!validation || validation.ok) return;
    const fixesLog = [];
    const next = entries.map((e) => {
      if (!validation.issues.some((i) => i.key === e.key && i.fixable)) return e;
      const res = autoFixEntry(e, T);
      for (const f of res.fixes) fixesLog.push(`\u300C${res.entry.title}\u300D${f}`);
      return res.entry;
    });
    setEntries(next);
    setFixLog(fixLog);
    setValidation(validateEntries(next));
  }, [entries, validation, T, validateEntries]);
  const handleSave = (0, import_react10.useCallback)(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setSaving(true);
    if (mode === "export") {
      const payload2 = checked.map((e) => ({
        promptId: e.promptId,
        name: e.name,
        title: e.title,
        body: e.body,
        summary: e.summary
      }));
      exportSkillEntries(payload2).then(
        (result) => {
          setSaving(false);
          onExported?.(result);
          onClose();
        },
        (err) => {
          setSaving(false);
          setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
        }
      );
      return;
    }
    const payload = checked.map((e) => ({
      name: e.name,
      title: e.title,
      body: e.body,
      summary: e.summary
    }));
    importSkillEntries(payload).then(
      () => {
        setSaving(false);
        notifyDataChanged();
        onClose();
      },
      (err) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
      }
    );
  }, [validation, saving, entries, mode, onClose, onExported, T]);
  if (!open) return null;
  const checkedCount = entries.filter((e) => e.checked).length;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 1020,
              maxWidth: "90%",
              height: "min(720px, calc(100vh - 60px))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": T("pl.close"),
                    "data-tip": T("pl.close"),
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
                      color: TONE3.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE3.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE3.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { fontSize: 12, color: TONE3.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T(mode === "export" ? "pl.skillModal.exportSubtitle" : "pl.skillModal.subtitle") }),
              mode === "import" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: () => fileRef.current?.click(),
                    children: T("pl.skillModal.chooseFile")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: scanSkills,
                    children: T("pl.skillModal.scanSkills")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { fontSize: 11, color: TONE3.quiet }, children: entries.length === 0 ? T("pl.skillModal.selectHint") : T("pl.skillModal.selectHint") + ` \xB7 ${checkedCount}/${entries.length}` })
              ] }),
              mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => jsonRef.current?.click(),
                    "data-tip": T("pl.skillModal.uploadJsonTitle"),
                    children: T("pl.skillModal.uploadJson")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { style: { fontSize: 11, color: TONE3.quiet }, children: [
                  T("pl.skillModal.selectHint"),
                  " \xB7 ",
                  checkedCount,
                  "/",
                  entries.length
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 10 }, children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "div",
                {
                  style: {
                    padding: "22px 0",
                    textAlign: "center",
                    fontSize: 12,
                    color: TONE3.quiet,
                    border: `1px dashed ${TONE3.border}`,
                    borderRadius: 8
                  },
                  children: T("pl.skillModal.noEntry")
                }
              ) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px 12px",
                    background: TONE3.row,
                    border: `1px solid ${TONE3.border}`,
                    borderRadius: 8,
                    opacity: entry.checked ? 1 : 0.55,
                    transition: "opacity .18s"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleCollapse(entry.key),
                          "data-tip": collapsed[entry.key] ? T("pl.skillModal.expand") : T("pl.skillModal.collapse"),
                          "aria-expanded": !collapsed[entry.key],
                          style: {
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            border: "none",
                            outline: "none",
                            borderRadius: 6,
                            background: "transparent",
                            color: TONE3.muted,
                            cursor: "pointer",
                            transition: "background-color .18s, color .18s"
                          },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                            e.currentTarget.style.color = TONE3.text;
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = TONE3.muted;
                          },
                          children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                            "svg",
                            {
                              width: "12",
                              height: "12",
                              viewBox: "0 0 16 16",
                              style: {
                                flexShrink: 0,
                                transform: collapsed[entry.key] ? "rotate(-90deg)" : "rotate(0deg)",
                                transition: "transform .2s ease"
                              },
                              children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "input",
                        {
                          type: "checkbox",
                          checked: entry.checked,
                          onChange: () => toggleChecked(entry.key),
                          "data-tip": T("pl.skillModal.selectHint"),
                          style: { flexShrink: 0, accentColor: TONE3.accent }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "input",
                        {
                          type: "text",
                          value: entry.title,
                          onChange: (e) => updateEntry(entry.key, { title: e.target.value }),
                          placeholder: T("pl.skillModal.titleLabel"),
                          disabled: !entry.checked,
                          style: { ...inputStyle2, flex: 1, minWidth: 0 }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            fontSize: 10,
                            lineHeight: 1,
                            color: entry.source === "disk" ? TONE3.muted : TONE3.accent,
                            border: `1px solid ${entry.source === "disk" ? TONE3.border : "var(--dsw-alias-brand-primary, #8ec5ff)"}`,
                            borderRadius: 4,
                            padding: "2px 5px"
                          },
                          children: entry.source === "file" ? T("pl.skillModal.fromFile") : entry.source === "disk" ? T("pl.skillModal.fromDisk") : entry.source === "json" ? T("pl.skillModal.fromJson") : T("pl.skillModal.fromLibrary")
                        }
                      ),
                      entry.exists && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            fontSize: 10,
                            lineHeight: 1,
                            color: TONE3.success,
                            border: `1px solid color-mix(in srgb, ${TONE3.success} 45%, transparent)`,
                            borderRadius: 4,
                            padding: "2px 5px"
                          },
                          children: T("pl.skillModal.exists")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => removeEntry(entry.key),
                          "data-tip": T("pl.skillModal.remove"),
                          style: {
                            flexShrink: 0,
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            color: TONE3.quiet,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: MONO5,
                            padding: "2px 4px",
                            borderRadius: 4,
                            transition: "color .18s, background-color .18s"
                          },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.color = TONE3.red;
                            e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.color = TONE3.quiet;
                            e.currentTarget.style.backgroundColor = "transparent";
                          },
                          children: T("pl.skillModal.remove")
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                      "div",
                      {
                        style: {
                          display: "grid",
                          gridTemplateRows: collapsed[entry.key] ? "0fr" : "1fr",
                          transition: "grid-template-rows .22s ease",
                          marginTop: collapsed[entry.key] ? 0 : 7
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
                          "div",
                          {
                            style: {
                              display: "flex",
                              flexDirection: "column",
                              gap: 7,
                              minHeight: 0,
                              overflow: "hidden"
                            },
                            children: [
                              mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                                "input",
                                {
                                  type: "text",
                                  value: entry.name,
                                  onChange: (e) => updateEntry(entry.key, { name: e.target.value }),
                                  placeholder: T("pl.skillModal.nameLabel"),
                                  disabled: !entry.checked,
                                  style: inputStyle2
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                                "input",
                                {
                                  type: "text",
                                  value: entry.summary,
                                  onChange: (e) => updateEntry(entry.key, { summary: e.target.value }),
                                  placeholder: T("pl.skillModal.summaryLabel"),
                                  disabled: !entry.checked,
                                  style: inputStyle2
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: 8 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                                  "textarea",
                                  {
                                    ref: (el) => {
                                      bodyRefs.current[entry.key] = el;
                                    },
                                    value: entry.body,
                                    onChange: (e) => updateEntry(entry.key, { body: e.target.value }),
                                    placeholder: T("pl.skillModal.bodyLabel"),
                                    disabled: !entry.checked,
                                    spellCheck: false,
                                    style: {
                                      ...inputStyle2,
                                      flex: 1,
                                      minHeight: 200,
                                      resize: "vertical",
                                      lineHeight: 1.6,
                                      whiteSpace: "pre-wrap"
                                    }
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                                  import_dsh_client_ui_primitives4.Button,
                                  {
                                    type: "button",
                                    variant: "ghost",
                                    size: "sm",
                                    className: plBtn("ghost", "sm"),
                                    onClick: () => insertVar(entry.key),
                                    disabled: !entry.checked,
                                    "data-tip": T("pl.insertVariableTitle"),
                                    style: { flexShrink: 0 },
                                    children: T("pl.skillModal.insertVar")
                                  }
                                )
                              ] })
                            ]
                          }
                        )
                      }
                    ),
                    entry.aiFailed && entry.aiFailReason && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
                      "div",
                      {
                        role: "alert",
                        style: {
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          marginTop: 7,
                          padding: "6px 9px",
                          borderRadius: 6,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: TONE3.red,
                          background: "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { flexShrink: 0 }, children: T("pl.skillModal.aiFailed") }),
                          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { minWidth: 0 }, children: entry.aiFailReason })
                        ]
                      }
                    )
                  ]
                },
                entry.key
              )) }),
              msg && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE3.red : TONE3.text
                  },
                  children: msg.text
                }
              ),
              validation && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "div",
                {
                  role: "alert",
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: validation.ok ? TONE3.success : TONE3.red,
                    background: validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                    border: `1px solid ${validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"}`
                  },
                  children: validation.ok ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.validatePass") }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.issueCount", { count: validation.issues.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: validation.issues.map((issue, idx) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("li", { children: [
                          "\u300C",
                          issue.entryTitle,
                          "\u300D",
                          issue.message
                        ] }, idx))
                      }
                    ),
                    validation.fixable && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                        import_dsh_client_ui_primitives4.Button,
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
                      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { color: TONE3.muted }, children: T("pl.skillModal.fixHint", {
                        fixable: validation.issues.filter((i) => i.fixable).length
                      }) })
                    ] })
                  ] })
                }
              ),
              fixLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: TONE3.success,
                    background: "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.fixDone", { count: fixLog.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: fixLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("li", { children: f }, idx))
                      }
                    )
                  ]
                }
              ),
              mode === "export" && aiState !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "div",
                {
                  role: aiState === "done" ? "status" : void 0,
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: aiState === "running" ? TONE3.accent : aiResult && aiResult.errors.length > 0 ? TONE3.red : TONE3.success,
                    background: aiState === "running" ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 8%, transparent)" : aiResult && aiResult.errors.length > 0 ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
                    border: `1px solid ${aiState === "running" ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)" : aiResult && aiResult.errors.length > 0 ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"}`
                  },
                  children: aiState === "running" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.aiValidating") }) : aiResult && aiResult.errors.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.aiDoneErrors", {
                      done: aiResult.done,
                      n: aiResult.errors.length
                    }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: aiResult.errors.map((err, idx) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("li", { children: [
                          "\u300C",
                          err.title,
                          "\u300D",
                          err.reason
                        ] }, idx))
                      }
                    )
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { children: T("pl.skillModal.aiDone", { done: aiResult?.done ?? 0 }) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: handleValidate,
                    disabled: mode === "export" && aiState === "running",
                    children: mode === "export" ? T("pl.skillModal.validateAi") : T("pl.skillModal.validate")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  import_dsh_client_ui_primitives4.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: handleSave,
                    disabled: !validation?.ok || saving || checkedCount === 0 || mode === "export" && aiState === "running",
                    "data-tip": validation?.ok ? "" : T("pl.skillModal.selectHint"),
                    children: saving ? T("pl.skillModal.saving") : mode === "export" ? T("pl.skillModal.saveExport") : T("pl.skillModal.save")
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "input",
          {
            ref: fileRef,
            type: "file",
            accept: ".md,text/markdown,text/plain",
            style: { display: "none" },
            onChange: onPickFile
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "input",
          {
            ref: jsonRef,
            type: "file",
            accept: "application/json,.json",
            style: { display: "none" },
            onChange: onPickJson
          }
        )
      ]
    }
  );
}

// src/client/components/settings/modules/ImportEditModal.tsx
var import_react11 = require("react");
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime12 = require("react/jsx-runtime");
var MONO6 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE4 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var inputStyle3 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE4.text,
  background: TONE4.row,
  border: `1px solid ${TONE4.border}`,
  borderRadius: 7,
  fontFamily: MONO6,
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
  const { open, onClose, t, initialEntries, onImported } = props;
  const T = usePLT(t);
  const [entries, setEntries] = (0, import_react11.useState)([]);
  const [validation, setValidation] = (0, import_react11.useState)(null);
  const [fixLog, setFixLog] = (0, import_react11.useState)([]);
  const [saving, setSaving] = (0, import_react11.useState)(false);
  const [msg, setMsg] = (0, import_react11.useState)(null);
  const bodyRefs = (0, import_react11.useRef)({});
  const seqRef = (0, import_react11.useRef)(0);
  const [collapsed, setCollapsed] = (0, import_react11.useState)({});
  (0, import_react11.useEffect)(() => {
    if (!open) return;
    const seed = (initialEntries ?? []).map((e) => ({
      // 序号保证每条 key 唯一，同名标题也可独立编辑
      key: `imp:${++seqRef.current}`,
      title: e.title,
      body: e.body,
      tags: (e.tags ?? []).join(", "),
      source: e.source ?? "txt",
      checked: true
    }));
    setEntries(seed);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setCollapsed({});
    setSaving(false);
  }, [open]);
  const updateEntry = (0, import_react11.useCallback)((key, patch) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, ...patch } : e));
    setValidation(null);
    setFixLog([]);
  }, []);
  const toggleChecked = (0, import_react11.useCallback)((key) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, checked: !e.checked } : e));
  }, []);
  const removeEntry = (0, import_react11.useCallback)((key) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setValidation(null);
    setFixLog([]);
  }, []);
  const toggleCollapse = (0, import_react11.useCallback)((key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const toggleAll = (0, import_react11.useCallback)(() => {
    setEntries((prev) => {
      const all = prev.every((e) => e.checked);
      return prev.map((e) => ({ ...e, checked: !all }));
    });
    setValidation(null);
    setFixLog([]);
  }, []);
  const insertVar = (0, import_react11.useCallback)(
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
  const validateEntries = (0, import_react11.useCallback)(
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
  const handleValidate = (0, import_react11.useCallback)(() => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setValidation(validateEntries(entries));
    setFixLog([]);
    setMsg(null);
  }, [entries, T, validateEntries]);
  const handleFix = (0, import_react11.useCallback)(() => {
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
  const handleSave = (0, import_react11.useCallback)(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setSaving(true);
    const payload = checked.map((e) => ({
      title: e.title.trim(),
      body: e.body,
      ...e.tags.trim() ? {
        tags: e.tags.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean)
      } : {}
    }));
    importPrompts(payload).then(
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        onClose();
      },
      (err) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
      }
    );
  }, [validation, saving, entries, onClose, onImported, T]);
  if (!open) return null;
  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T("pl.importEdit.title"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 1020,
              maxWidth: "90%",
              height: "min(720px, calc(100vh - 60px))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T("pl.importEdit.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": T("pl.close"),
                    "data-tip": T("pl.close"),
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
                      color: TONE4.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE4.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE4.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { fontSize: 12, color: TONE4.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.importEdit.subtitle") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                  "label",
                  {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: TONE4.muted,
                      cursor: "pointer",
                      userSelect: "none"
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("input", { type: "checkbox", checked: allChecked, onChange: toggleAll, disabled: entries.length === 0 }),
                      allChecked ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { style: { fontSize: 11, color: TONE4.quiet }, children: [
                  T("pl.skillModal.selectHint"),
                  " \xB7 ",
                  checkedCount,
                  "/",
                  entries.length
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    /* 内容与滚动条之间预留 10px 间距（与官方一致） */
                    paddingRight: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  },
                  children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                    "div",
                    {
                      style: {
                        padding: "22px 0",
                        textAlign: "center",
                        fontSize: 12,
                        color: TONE4.quiet,
                        border: `1px dashed ${TONE4.border}`,
                        borderRadius: 8
                      },
                      children: T("pl.importEdit.noEntry")
                    }
                  ) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        padding: "10px 12px",
                        background: TONE4.row,
                        border: `1px solid ${TONE4.border}`,
                        borderRadius: 8,
                        opacity: entry.checked ? 1 : 0.55,
                        transition: "opacity .18s"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => toggleCollapse(entry.key),
                              "data-tip": collapsed[entry.key] ? T("pl.skillModal.expand") : T("pl.skillModal.collapse"),
                              "aria-expanded": !collapsed[entry.key],
                              style: {
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                border: "none",
                                outline: "none",
                                borderRadius: 6,
                                background: "transparent",
                                color: TONE4.muted,
                                cursor: "pointer",
                                transition: "background-color .18s, color .18s"
                              },
                              onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                                e.currentTarget.style.color = TONE4.text;
                              },
                              onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.color = TONE4.muted;
                              },
                              children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                                "svg",
                                {
                                  width: "12",
                                  height: "12",
                                  viewBox: "0 0 16 16",
                                  style: {
                                    flexShrink: 0,
                                    transform: collapsed[entry.key] ? "rotate(-90deg)" : "rotate(0deg)",
                                    transition: "transform .2s ease"
                                  },
                                  children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
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
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            "input",
                            {
                              type: "checkbox",
                              checked: entry.checked,
                              onChange: () => toggleChecked(entry.key),
                              "data-tip": T("pl.skillModal.selectHint"),
                              style: { flexShrink: 0, accentColor: TONE4.accent }
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            "input",
                            {
                              type: "text",
                              value: entry.title,
                              onChange: (e) => updateEntry(entry.key, { title: e.target.value }),
                              placeholder: T("pl.skillModal.titleLabel"),
                              disabled: !entry.checked,
                              style: { ...inputStyle3, flex: 1, minWidth: 0 }
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            "span",
                            {
                              style: {
                                flexShrink: 0,
                                fontSize: 10,
                                lineHeight: 1,
                                color: TONE4.accent,
                                border: `1px solid var(--dsw-alias-brand-primary, #8ec5ff)`,
                                borderRadius: 4,
                                padding: "2px 5px"
                              },
                              children: entry.source === "json" ? "JSON" : entry.source === "csv" ? "CSV" : entry.source === "md" ? "Markdown" : T("pl.importEdit.fromTxt")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => removeEntry(entry.key),
                              "data-tip": T("pl.skillModal.remove"),
                              style: {
                                flexShrink: 0,
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                color: TONE4.quiet,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: MONO6,
                                padding: "2px 4px",
                                borderRadius: 4,
                                transition: "color .18s, background-color .18s"
                              },
                              onMouseEnter: (e) => {
                                e.currentTarget.style.color = TONE4.red;
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                              },
                              onMouseLeave: (e) => {
                                e.currentTarget.style.color = TONE4.quiet;
                                e.currentTarget.style.backgroundColor = "transparent";
                              },
                              children: T("pl.skillModal.remove")
                            }
                          )
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                          "div",
                          {
                            style: {
                              display: "grid",
                              gridTemplateRows: collapsed[entry.key] ? "0fr" : "1fr",
                              transition: "grid-template-rows .22s ease",
                              marginTop: collapsed[entry.key] ? 0 : 7
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 7,
                                  minHeight: 0,
                                  overflow: "hidden"
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                                    "input",
                                    {
                                      type: "text",
                                      value: entry.tags,
                                      onChange: (e) => updateEntry(entry.key, { tags: e.target.value }),
                                      placeholder: T("pl.importEdit.tagsLabel"),
                                      disabled: !entry.checked,
                                      style: inputStyle3
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: 8 }, children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                                      "textarea",
                                      {
                                        ref: (el) => {
                                          bodyRefs.current[entry.key] = el;
                                        },
                                        value: entry.body,
                                        onChange: (e) => updateEntry(entry.key, { body: e.target.value }),
                                        placeholder: T("pl.skillModal.bodyLabel"),
                                        disabled: !entry.checked,
                                        spellCheck: false,
                                        style: {
                                          ...inputStyle3,
                                          flex: 1,
                                          minHeight: 200,
                                          resize: "vertical",
                                          lineHeight: 1.6,
                                          whiteSpace: "pre-wrap"
                                        }
                                      }
                                    ),
                                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                                      import_dsh_client_ui_primitives5.Button,
                                      {
                                        type: "button",
                                        variant: "ghost",
                                        size: "sm",
                                        className: plBtn("ghost", "sm"),
                                        onClick: () => insertVar(entry.key),
                                        disabled: !entry.checked,
                                        "data-tip": T("pl.insertVariableTitle"),
                                        style: { flexShrink: 0 },
                                        children: T("pl.skillModal.insertVar")
                                      }
                                    )
                                  ] })
                                ]
                              }
                            )
                          }
                        )
                      ]
                    },
                    entry.key
                  ))
                }
              ),
              msg && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE4.red : TONE4.text
                  },
                  children: msg.text
                }
              ),
              validation && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "div",
                {
                  role: "alert",
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: validation.ok ? TONE4.success : TONE4.red,
                    background: validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                    border: `1px solid ${validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"}`
                  },
                  children: validation.ok ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { children: T("pl.importEdit.validatePass") }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { children: T("pl.skillModal.issueCount", { count: validation.issues.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: validation.issues.map((issue, idx) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("li", { children: [
                          "\u300C",
                          issue.entryTitle,
                          "\u300D",
                          issue.message
                        ] }, idx))
                      }
                    ),
                    validation.fixable && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                        import_dsh_client_ui_primitives5.Button,
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
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { color: TONE4.muted }, children: T("pl.skillModal.fixHint", {
                        fixable: validation.issues.filter((i) => i.fixable).length
                      }) })
                    ] })
                  ] })
                }
              ),
              fixLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: TONE4.success,
                    background: "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { children: T("pl.skillModal.fixDone", { count: fixLog.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: fixLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("li", { children: f }, idx))
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      import_dsh_client_ui_primitives5.Button,
                      {
                        type: "button",
                        variant: "ghost",
                        size: "sm",
                        className: plBtn("ghost", "sm"),
                        onClick: handleValidate,
                        children: T("pl.skillModal.validate")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      import_dsh_client_ui_primitives5.Button,
                      {
                        type: "button",
                        variant: "primary",
                        size: "sm",
                        className: plBtn("primary", "sm"),
                        onClick: handleSave,
                        disabled: !validation?.ok || saving || checkedCount === 0,
                        "data-tip": validation?.ok ? "" : T("pl.skillModal.selectHint"),
                        children: saving ? T("pl.importEdit.importing") : T("pl.importEdit.import")
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
  );
}

// src/client/services/data-formats.ts
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
    out.push({ title, body, tags: tags.length ? tags : void 0, source: "csv" });
  }
  return out;
}
function parseMarkdown(fileName, text) {
  let title = baseName(fileName);
  let tags;
  let body = text.trim();
  if (text.trimStart().startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(3, end);
      body = text.slice(end + 4).trim();
      const titleMatch = fm.match(/^title\s*:\s*(.+)$/m);
      const tagsMatch = fm.match(/^tags\s*:\s*\[?([^\]]+)\]?$/m);
      if (titleMatch) title = titleMatch[1].trim();
      if (tagsMatch) {
        tags = tagsMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
    }
  }
  return [{ title: title || baseName(fileName), body, tags: tags?.length ? tags : void 0, source: "md" }];
}
function parseTxt(fileName, text) {
  const body = text.trim();
  return body ? [{ title: baseName(fileName), body, source: "txt" }] : [];
}
function parseImportFile(fileName, text) {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "json") return parseJson(text);
  if (ext === "csv") return parseCsv(text);
  if (ext === "md" || ext === "markdown") return parseMarkdown(fileName, text);
  return parseTxt(fileName, text);
}
function csvEscape(v) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function serializeExport(format, prompts) {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = `prompt-library-${stamp}`;
  switch (format) {
    case "json":
      return {
        fileName: `${base}.json`,
        mime: "application/json",
        content: JSON.stringify({ version: 1, exportedAt: Date.now(), prompts }, null, 2)
      };
    case "csv": {
      const lines = ["title,body,tags"];
      for (const p of prompts) {
        lines.push(
          `${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))}`
        );
      }
      return { fileName: `${base}.csv`, mime: "text/csv", content: lines.join("\r\n") };
    }
    case "md": {
      const parts = [];
      for (const p of prompts) {
        const tagsLine = p.tags && p.tags.length ? `

\u6807\u7B7E\uFF1A${p.tags.join("\u3001")}` : "";
        parts.push(`# ${p.title}${tagsLine}

${p.body.trim()}`);
      }
      return {
        fileName: `${base}.md`,
        mime: "text/markdown",
        content: parts.join("\n\n---\n\n") + "\n"
      };
    }
    case "txt": {
      const parts = [];
      for (const p of prompts) {
        parts.push(`\u3010${p.title}\u3011

${p.body.trim()}`);
      }
      return {
        fileName: `${base}.txt`,
        mime: "text/plain",
        content: parts.join("\n\n" + "-".repeat(24) + "\n\n")
      };
    }
  }
}

// src/client/components/settings/modules/ImportExportModal.tsx
var import_jsx_runtime13 = require("react/jsx-runtime");
var MONO7 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE5 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var sectionCardStyle = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "12px 14px",
  background: TONE5.row,
  border: `1px solid ${TONE5.border}`,
  borderRadius: 10
};
var sectionTitleStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap"
};
function PromptCheckRow(props) {
  const { title, body, checked, onToggle } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "label",
    {
      className: "pl-data-card",
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        background: checked ? "rgba(142, 197, 255, 0.10)" : TONE5.row,
        border: `1px solid ${checked ? "rgba(142, 197, 255, 0.5)" : TONE5.border}`,
        borderRadius: 9,
        cursor: "pointer",
        userSelect: "none",
        transition: "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "input",
          {
            type: "checkbox",
            checked,
            onChange: onToggle,
            style: { marginTop: 3, accentColor: TONE5.accent, cursor: "pointer", flexShrink: 0 }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            "span",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 560,
                lineHeight: 1.4,
                minWidth: 0
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                "span",
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  },
                  "data-tip": title,
                  children: title
                }
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            "span",
            {
              style: {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                fontSize: 11,
                color: TONE5.quiet,
                lineHeight: 1.5,
                marginTop: 3,
                overflow: "hidden",
                wordBreak: "break-word"
              },
              children: body.replace(/\s+/g, " ").trim() || " "
            }
          )
        ] })
      ]
    }
  );
}
function ImportExportModal(props) {
  const { open, onClose, t } = props;
  const T = usePLT(t);
  const importRef = (0, import_react12.useRef)(null);
  const [promptList, setPromptList] = (0, import_react12.useState)([]);
  const [promptLoading, setPromptLoading] = (0, import_react12.useState)(false);
  const [exportSelected, setExportSelected] = (0, import_react12.useState)(/* @__PURE__ */ new Set());
  const [skillImportOpen, setSkillImportOpen] = (0, import_react12.useState)(false);
  const [importEditOpen, setImportEditOpen] = (0, import_react12.useState)(false);
  const [importEntries, setImportEntries] = (0, import_react12.useState)([]);
  const [exportFormat, setExportFormat] = (0, import_react12.useState)("json");
  const [skillExportOpen, setSkillExportOpen] = (0, import_react12.useState)(false);
  const [skillExportInitial, setSkillExportInitial] = (0, import_react12.useState)([]);
  const [exportView, setExportView] = (0, import_react12.useState)("list");
  const [exportCollapsed, setExportCollapsed] = (0, import_react12.useState)(/* @__PURE__ */ new Set());
  const [msg, setMsg] = (0, import_react12.useState)(null);
  const msgTimerRef = (0, import_react12.useRef)(null);
  const showMsg = (0, import_react12.useCallback)((text, error = false) => {
    setMsg({ text, error });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react12.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  (0, import_react12.useEffect)(() => {
    if (!open) return;
    setMsg(null);
    setExportSelected(/* @__PURE__ */ new Set());
    setPromptLoading(true);
    listPrompts().then(
      (list) => {
        setPromptList(list);
        setPromptLoading(false);
      },
      (e) => {
        showMsg(e instanceof Error ? e.message : String(e), true);
        setPromptLoading(false);
      }
    );
  }, [open, showMsg]);
  const toggleExport = (0, import_react12.useCallback)((id) => {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleExportAll = (0, import_react12.useCallback)(() => {
    setExportSelected(
      (prev) => prev.size === promptList.length ? /* @__PURE__ */ new Set() : new Set(promptList.map((p) => p.id))
    );
  }, [promptList]);
  const groupedPrompts = (0, import_react12.useMemo)(() => {
    const groups = /* @__PURE__ */ new Map();
    for (const p of promptList) {
      const key = p.tags?.[0]?.trim() || T("pl.sidebar.uncategorized");
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [promptList, T]);
  const exportSelectedPrompts = (0, import_react12.useCallback)(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.exportNeedSelect"), true);
      return;
    }
    exportPrompts(ids).then(
      (backup) => {
        const file = serializeExport(
          exportFormat,
          backup.prompts.map((p) => ({
            title: p.title,
            body: p.body,
            tags: p.tags
          }))
        );
        const blob = new Blob([file.content], { type: file.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showMsg(T("pl.exported", { count: backup.prompts.length }));
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [exportSelected, exportFormat, showMsg, T]);
  const openSkillExport = (0, import_react12.useCallback)(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.skillExportNeedSelect"), true);
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
  const onImportFile = (0, import_react12.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) {
          showMsg(T("pl.importEdit.parseEmpty"), true);
          return;
        }
        try {
          const parsed = parseImportFile(file.name, text);
          if (parsed.length === 0) {
            showMsg(T("pl.importEdit.parseEmpty"), true);
            return;
          }
          setImportEntries(parsed);
          setImportEditOpen(true);
        } catch (err) {
          showMsg(T("pl.importEdit.parseFail", { err: err instanceof Error ? err.message : String(err) }), true);
        }
      };
      reader.readAsText(file);
    },
    [showMsg, T]
  );
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T("pl.moduleImportExport"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("style", { children: `
.pl-data-action{background:var(--dsw-alias-bg-layer-3, #1d2735)}
.pl-data-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-data-action:active{background:var(--dsw-alias-interactive-bg-active)}
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 820,
              maxWidth: "90%",
              height: "min(680px, calc(100vh - 60px))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T("pl.moduleImportExport") }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": T("pl.close"),
                    "data-tip": T("pl.close"),
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
                      color: TONE5.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE5.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE5.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { fontSize: 12, color: TONE5.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.moduleImportExportDesc") }),
              msg && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE5.red : TONE5.text
                  },
                  children: msg.text
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    paddingRight: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: sectionCardStyle, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: sectionTitleStyle, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { style: { fontSize: 13, color: TONE5.text }, children: T("pl.importSection") }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontSize: 11, color: TONE5.quiet }, children: T("pl.importSectionDesc") })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          import_dsh_client_ui_primitives6.Button,
                          {
                            type: "button",
                            variant: "primary",
                            size: "sm",
                            className: plBtn("primary", "sm"),
                            onClick: () => importRef.current?.click(),
                            "data-tip": T("pl.importTitle"),
                            children: T("pl.import")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          import_dsh_client_ui_primitives6.Button,
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
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: sectionCardStyle, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: sectionTitleStyle, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { style: { fontSize: 13, color: TONE5.text }, children: T("pl.exportSection") }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontSize: 11, color: TONE5.quiet }, children: T("pl.exportSectionDesc") })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                          "label",
                          {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 12,
                              color: TONE5.muted,
                              cursor: "pointer",
                              userSelect: "none"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                                "input",
                                {
                                  type: "checkbox",
                                  checked: promptList.length > 0 && exportSelected.size === promptList.length,
                                  onChange: toggleExportAll,
                                  disabled: promptList.length === 0
                                }
                              ),
                              T("pl.exportSelectAll")
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { display: "inline-flex", borderRadius: 7, border: `1px solid ${TONE5.border}`, overflow: "hidden" }, children: ["list", "group"].map((view) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => setExportView(view),
                            style: {
                              border: "none",
                              outline: "none",
                              padding: "3px 9px",
                              fontSize: 12,
                              lineHeight: 1.6,
                              cursor: "pointer",
                              fontFamily: MONO7,
                              backgroundColor: exportView === view ? "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))" : "transparent",
                              color: exportView === view ? TONE5.text : TONE5.muted,
                              transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                            },
                            children: view === "list" ? T("pl.viewList") : T("pl.viewGroup")
                          },
                          view
                        )) }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                          "label",
                          {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 12,
                              color: TONE5.muted
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: T("pl.exportFormat") }),
                              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                                "select",
                                {
                                  value: exportFormat,
                                  onChange: (e) => setExportFormat(e.target.value),
                                  style: {
                                    padding: "3px 6px",
                                    fontSize: 12,
                                    fontFamily: MONO7,
                                    color: TONE5.text,
                                    background: TONE5.row,
                                    border: `1px solid ${TONE5.border}`,
                                    borderRadius: 7,
                                    outline: "none",
                                    cursor: "pointer"
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "json", children: "JSON" }),
                                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "csv", children: "CSV" }),
                                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "md", children: "Markdown" }),
                                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "txt", children: T("pl.format.txt") })
                                  ]
                                }
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          import_dsh_client_ui_primitives6.Button,
                          {
                            type: "button",
                            variant: "primary",
                            size: "sm",
                            className: plBtn("primary", "sm"),
                            onClick: exportSelectedPrompts,
                            "data-tip": T("pl.exportTitle"),
                            children: T("pl.exportSelected")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          import_dsh_client_ui_primitives6.Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: plBtn("ghost", "sm"),
                            onClick: openSkillExport,
                            "data-tip": T("pl.skillExportBtnTitle"),
                            children: T("pl.skillExport")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontSize: 11, color: TONE5.quiet }, children: exportSelected.size > 0 ? `${exportSelected.size}/${promptList.length}` : T("pl.sidebar.total", { count: promptList.length }) })
                      ] }),
                      promptLoading ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE5.muted }, children: T("pl.loading") }) : promptList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE5.muted }, children: T("pl.empty") }) : exportView === "group" ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            maxHeight: 300,
                            overflow: "auto",
                            padding: "12px",
                            boxSizing: "border-box",
                            background: TONE5.row,
                            border: `1px solid ${TONE5.border}`,
                            borderRadius: 10
                          },
                          children: groupedPrompts.map(([group, prompts]) => {
                            const groupChecked = prompts.length > 0 && prompts.every((p) => exportSelected.has(p.id));
                            const collapsed = exportCollapsed.has(group);
                            return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [
                              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
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
                                    "data-tip": T("pl.exportSelectAll"),
                                    style: { margin: 0, accentColor: TONE5.accent, cursor: "pointer", flexShrink: 0 }
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => setExportCollapsed((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(group)) next.delete(group);
                                      else next.add(group);
                                      return next;
                                    }),
                                    style: {
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      border: "none",
                                      background: "transparent",
                                      padding: 0,
                                      cursor: "pointer",
                                      color: TONE5.text,
                                      fontSize: 12,
                                      fontFamily: MONO7,
                                      userSelect: "none"
                                    },
                                    "aria-expanded": !collapsed,
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                                        "svg",
                                        {
                                          width: "12",
                                          height: "12",
                                          viewBox: "0 0 16 16",
                                          style: {
                                            color: TONE5.muted,
                                            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                            transition: "transform .24s cubic-bezier(.22,1,.36,1)",
                                            flexShrink: 0
                                          },
                                          "aria-hidden": "true",
                                          children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
                                        }
                                      ),
                                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontWeight: 560 }, children: group }),
                                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontSize: 11, color: TONE5.quiet }, children: T("pl.sidebar.groupCount", { count: prompts.length }) })
                                    ]
                                  }
                                )
                              ] }),
                              !collapsed && prompts.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                                PromptCheckRow,
                                {
                                  title: prompt.title || T("pl.sidebar.uncategorized"),
                                  body: prompt.body,
                                  checked: exportSelected.has(prompt.id),
                                  onToggle: () => toggleExport(prompt.id)
                                },
                                prompt.id
                              ))
                            ] }, group);
                          })
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            maxHeight: 380,
                            overflow: "auto",
                            padding: "12px",
                            boxSizing: "border-box",
                            background: TONE5.row,
                            border: `1px solid ${TONE5.border}`,
                            borderRadius: 10
                          },
                          children: promptList.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                            PromptCheckRow,
                            {
                              title: prompt.title || T("pl.sidebar.uncategorized"),
                              body: prompt.body,
                              checked: exportSelected.has(prompt.id),
                              onToggle: () => toggleExport(prompt.id)
                            },
                            prompt.id
                          ))
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                "input",
                {
                  ref: importRef,
                  type: "file",
                  accept: ".json,.csv,.md,.markdown,.txt,text/plain,text/markdown,text/csv,application/json",
                  style: { display: "none" },
                  onChange: onImportFile
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(SkillImportModal, { open: skillImportOpen, onClose: () => setSkillImportOpen(false), t }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                ImportEditModal,
                {
                  open: importEditOpen,
                  onClose: () => setImportEditOpen(false),
                  t,
                  initialEntries: importEntries,
                  onImported: (res) => {
                    showMsg(
                      T("pl.imported", {
                        imported: res.imported,
                        updated: res.updated,
                        skipped: res.skipped
                      })
                    );
                    notifyDataChanged();
                    listPrompts().then((list) => setPromptList(list));
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                SkillImportModal,
                {
                  open: skillExportOpen,
                  onClose: () => setSkillExportOpen(false),
                  t,
                  mode: "export",
                  initialEntries: skillExportInitial,
                  onExported: (result) => {
                    const errNote = result.errors.length ? T("pl.skillModal.savedExportErrors", { n: result.errors.length }) : "";
                    const names = result.items.length ? `\uFF1A${result.items.map((i) => i.name).join(", ")}` : "";
                    showMsg(`${T("pl.skillModal.savedExport", { exported: result.exported })}${names}${errNote}`);
                  }
                }
              )
            ]
          }
        )
      ]
    }
  );
}

// src/client/components/settings/modules/TagsModal.tsx
var import_react13 = require("react");
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime14 = require("react/jsx-runtime");
var MONO8 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE6 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var inputStyle4 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE6.text,
  background: TONE6.row,
  border: `1px solid ${TONE6.border}`,
  borderRadius: 7,
  fontFamily: MONO8,
  fontSize: 13,
  outline: "none"
};
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
function TagsModal(props) {
  const { open, onClose, t } = props;
  const T = usePLT(t);
  const [tagList, setTagList] = (0, import_react13.useState)([]);
  const [renamingTag, setRenamingTag] = (0, import_react13.useState)(null);
  const [newTag, setNewTag] = (0, import_react13.useState)("");
  const [msg, setMsg] = (0, import_react13.useState)(null);
  const msgTimerRef = (0, import_react13.useRef)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react13.useState)(null);
  const requestConfirm = (0, import_react13.useCallback)((message, danger, action) => {
    setPendingConfirm({ message, danger, action });
  }, []);
  const showMsg = (0, import_react13.useCallback)((text, error = false) => {
    setMsg({ text, error });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react13.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  const refreshTags = (0, import_react13.useCallback)(() => {
    listTags().then(
      (list) => setTagList(list),
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [showMsg]);
  (0, import_react13.useEffect)(() => {
    if (!open) return;
    setMsg(null);
    setNewTag("");
    setRenamingTag(null);
    refreshTags();
  }, [open, refreshTags]);
  const addTag = (0, import_react13.useCallback)(() => {
    const name = newTag.trim();
    if (!name) {
      showMsg(T("pl.createTagEmpty"), true);
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
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [newTag, showMsg, T]);
  const confirmRenameTag = (0, import_react13.useCallback)(() => {
    if (!renamingTag) return;
    const from = renamingTag.from;
    const to = renamingTag.value.trim();
    if (!to) {
      showMsg(T("pl.renameTagEmpty"), true);
      return;
    }
    if (to === from) {
      showMsg(T("pl.renameTagNoChange"), true);
      return;
    }
    renameTag(from, to).then(
      () => {
        showMsg(T("pl.renameTagDone", { name: to }));
        setRenamingTag(null);
        setTagList(
          (prev) => prev.map((x) => x.name === from ? { name: to, count: x.count } : x)
        );
        notifyDataChanged();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [renamingTag, showMsg, T]);
  const removeTag = (0, import_react13.useCallback)(
    (name) => {
      const used = tagList.find((x) => x.name === name)?.count ?? 0;
      if (used > 0) {
        showMsg(T("pl.deleteTagInUse", { name, count: used }), true);
        return;
      }
      requestConfirm(T("pl.deleteTagConfirm", { name }), true, () => {
        deleteTag(name).then(
          () => {
            showMsg(T("pl.deleteTagDone", { name }));
            setTagList((prev) => prev.filter((x) => x.name !== name));
            notifyDataChanged();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), true)
        );
      });
    },
    [showMsg, T, tagList, requestConfirm]
  );
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T("pl.moduleTags"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: `
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 560,
              maxWidth: "90%",
              height: "min(560px, calc(100vh - 60px))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T("pl.moduleTags") }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": T("pl.close"),
                    "data-tip": T("pl.close"),
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
                      color: TONE6.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE6.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE6.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: 12, color: TONE6.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.moduleTagsDesc") }),
              msg && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE6.red : TONE6.text
                  },
                  children: msg.text
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "input",
                  {
                    value: newTag,
                    onChange: (e) => setNewTag(clampTag(e.target.value)),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") addTag();
                    },
                    placeholder: T("pl.createTagPlaceholder"),
                    style: { ...inputStyle4, flex: 1 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: addTag, children: T("pl.createTag") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10 }, children: tagList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { padding: "10px 0", fontSize: 12, color: TONE6.muted }, children: T("pl.tagsNone") }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: tagList.map((tag) => {
                const editing = renamingTag?.from === tag.name;
                return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                  "div",
                  {
                    className: "pl-data-card",
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      background: TONE6.row,
                      border: `1px solid ${TONE6.border}`,
                      borderRadius: 9
                    },
                    children: editing ? /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "input",
                        {
                          autoFocus: true,
                          value: renamingTag.value,
                          onChange: (e) => setRenamingTag({ from: tag.name, value: clampTag(e.target.value) }),
                          onKeyDown: (e) => {
                            if (e.key === "Enter") confirmRenameTag();
                            if (e.key === "Escape") setRenamingTag(null);
                          },
                          placeholder: T("pl.renameTagPlaceholder"),
                          style: { ...inputStyle4, flex: 1 }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setRenamingTag(null), children: T("pl.cancel") }),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: confirmRenameTag, children: T("pl.save") })
                    ] }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "span",
                        {
                          style: {
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: TONE6.accent,
                            flexShrink: 0
                          },
                          "aria-hidden": "true"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
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
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            fontSize: 11,
                            color: TONE6.muted,
                            lineHeight: 1.4,
                            background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                            border: `1px solid ${TONE6.border}`,
                            borderRadius: 999,
                            padding: "1px 8px"
                          },
                          children: tag.count
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        import_dsh_client_ui_primitives7.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: () => setRenamingTag({ from: tag.name, value: tag.name }),
                          children: T("pl.renameTag")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        import_dsh_client_ui_primitives7.Button,
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
        pendingConfirm && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: PL_DIALOG_OVERLAY, children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
            "div",
            {
              role: "dialog",
              "aria-modal": "true",
              className: PL_DIALOG,
              style: { width: 360, maxWidth: "100%", gap: 14 },
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: pendingConfirm.message }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    import_dsh_client_ui_primitives7.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setPendingConfirm(null),
                      children: T("pl.cancel")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    import_dsh_client_ui_primitives7.Button,
                    {
                      type: "button",
                      variant: "primary",
                      size: "sm",
                      className: plBtn("primary", "sm"),
                      style: pendingConfirm.danger ? { color: TONE6.red } : void 0,
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
      ]
    }
  );
}

// src/client/components/settings/modules/TrashModal.tsx
var import_react14 = require("react");
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime15 = require("react/jsx-runtime");
var TONE7 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
function formatTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function daysLeft(deletedAt) {
  const remain = deletedAt + 30 * 24 * 60 * 60 * 1e3 - Date.now();
  return remain <= 0 ? 0 : Math.ceil(remain / (24 * 60 * 60 * 1e3));
}
function TrashModal(props) {
  const { open, onClose, t } = props;
  const T = usePLT(t);
  const [trashList, setTrashList] = (0, import_react14.useState)([]);
  const [trashSelected, setTrashSelected] = (0, import_react14.useState)(/* @__PURE__ */ new Set());
  const [trashLoading, setTrashLoading] = (0, import_react14.useState)(false);
  const [msg, setMsg] = (0, import_react14.useState)(null);
  const msgTimerRef = (0, import_react14.useRef)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react14.useState)(null);
  const requestConfirm = (0, import_react14.useCallback)((message, danger, action) => {
    setPendingConfirm({ message, danger, action });
  }, []);
  const showMsg = (0, import_react14.useCallback)((text, error = false) => {
    setMsg({ text, error });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react14.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  const refreshTrash = (0, import_react14.useCallback)(() => {
    setTrashLoading(true);
    listTrash().then(
      (list) => {
        setTrashList(list);
        setTrashSelected(/* @__PURE__ */ new Set());
        setTrashLoading(false);
      },
      (e) => {
        showMsg(e instanceof Error ? e.message : String(e), true);
        setTrashLoading(false);
      }
    );
  }, [showMsg]);
  (0, import_react14.useEffect)(() => {
    if (!open) return;
    setMsg(null);
    refreshTrash();
  }, [open, refreshTrash]);
  useDataChanged(() => {
    if (open) refreshTrash();
  });
  const toggleTrash = (0, import_react14.useCallback)((id) => {
    setTrashSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleTrashAll = (0, import_react14.useCallback)(() => {
    setTrashSelected(
      (prev) => prev.size === trashList.length ? /* @__PURE__ */ new Set() : new Set(trashList.map((x) => x.id))
    );
  }, [trashList]);
  const restoreSelected = (0, import_react14.useCallback)(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    restoreTrash(ids).then(
      (res) => {
        showMsg(T("pl.trashRestoreDone", { count: res.restored }));
        notifyDataChanged();
        refreshTrash();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [trashSelected, showMsg, T, refreshTrash]);
  const deleteSelected = (0, import_react14.useCallback)(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    requestConfirm(T("pl.trashDeleteConfirm", { count: ids.length }), true, () => {
      deleteTrash(ids).then(
        (res) => {
          showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
          refreshTrash();
        },
        (e) => showMsg(e instanceof Error ? e.message : String(e), true)
      );
    });
  }, [trashSelected, showMsg, T, refreshTrash, requestConfirm]);
  const restoreOne = (0, import_react14.useCallback)(
    (item) => {
      requestConfirm(T("pl.trashRestoreOneConfirm", { title: item.title }), false, () => {
        restoreTrash([item.id]).then(
          (res) => {
            showMsg(T("pl.trashRestoreDone", { count: res.restored }));
            notifyDataChanged();
            refreshTrash();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), true)
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm]
  );
  const deleteOne = (0, import_react14.useCallback)(
    (item) => {
      requestConfirm(T("pl.trashDeleteOneConfirm", { title: item.title }), true, () => {
        deleteTrash([item.id]).then(
          (res) => {
            showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
            refreshTrash();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), true)
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm]
  );
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T("pl.moduleTrash"),
      className: PL_DIALOG_OVERLAY,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: PL_DIALOG_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: `
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "div",
          {
            className: PL_DIALOG,
            style: {
              width: 680,
              maxWidth: "90%",
              height: "min(600px, calc(100vh - 60px))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T("pl.moduleTrash") }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    "aria-label": T("pl.close"),
                    "data-tip": T("pl.close"),
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
                      color: TONE7.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE7.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE7.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 12, color: TONE7.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.moduleTrashDesc") }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: TONE7.quiet,
                    background: TONE7.row,
                    border: `1px solid ${TONE7.border}`,
                    borderRadius: 6,
                    padding: "6px 10px"
                  },
                  children: T("pl.trashCleanupNote")
                }
              ),
              msg && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE7.red : TONE7.text
                  },
                  children: msg.text
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                  "label",
                  {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: TONE7.muted,
                      cursor: "pointer",
                      userSelect: "none"
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                        "input",
                        {
                          type: "checkbox",
                          checked: trashList.length > 0 && trashSelected.size === trashList.length,
                          onChange: toggleTrashAll,
                          disabled: trashList.length === 0
                        }
                      ),
                      T("pl.trashSelectAll")
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  import_dsh_client_ui_primitives8.Button,
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
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  import_dsh_client_ui_primitives8.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: deleteSelected,
                    disabled: trashSelected.size === 0,
                    style: { color: TONE7.red },
                    children: T("pl.trashDeleteSelected")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 11, color: TONE7.quiet }, children: trashSelected.size > 0 ? `${trashSelected.size}/${trashList.length}` : "" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10 }, children: trashLoading ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE7.muted }, children: T("pl.loading") }) : trashList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE7.muted }, children: T("pl.trashEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: trashList.map((item) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "div",
                {
                  className: "pl-data-card",
                  style: {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: TONE7.row,
                    border: `1px solid ${TONE7.border}`,
                    borderRadius: 9
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      "input",
                      {
                        type: "checkbox",
                        checked: trashSelected.has(item.id),
                        onChange: () => toggleTrash(item.id),
                        style: { marginTop: 3 }
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
                                  style: { flexShrink: 0, color: TONE7.muted },
                                  "aria-hidden": "true",
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M14 2v6h6" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 10, color: TONE7.quiet, flexShrink: 0, whiteSpace: "nowrap" }, children: T("pl.trashDeletedAt", { time: formatTime(item.deletedAt) }) })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                        "div",
                        {
                          style: {
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            fontSize: 11,
                            color: TONE7.quiet,
                            lineHeight: 1.5,
                            overflow: "hidden",
                            wordBreak: "break-word"
                          },
                          children: item.body.replace(/\s+/g, " ").trim() || " "
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                          "span",
                          {
                            style: {
                              flexShrink: 0,
                              fontSize: 10,
                              color: daysLeft(item.deletedAt) <= 1 ? TONE7.red : TONE7.muted,
                              lineHeight: 1.4,
                              background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                              border: `1px solid ${TONE7.border}`,
                              borderRadius: 999,
                              padding: "2px 8px"
                            },
                            "data-tip": T("pl.trashCleanupNote"),
                            children: T("pl.trashDaysLeft", { n: daysLeft(item.deletedAt) })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { flex: 1 } }),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => restoreOne(item), children: T("pl.trashRestoreOne") }),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => deleteOne(item), style: { color: TONE7.red }, children: T("pl.trashDeleteOne") })
                      ] })
                    ] })
                  ]
                },
                item.id
              )) }) })
            ]
          }
        ),
        pendingConfirm && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: PL_DIALOG_OVERLAY, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
            "div",
            {
              role: "dialog",
              "aria-modal": "true",
              className: PL_DIALOG,
              style: { width: 360, maxWidth: "100%", gap: 14 },
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: pendingConfirm.message }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    import_dsh_client_ui_primitives8.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setPendingConfirm(null),
                      children: T("pl.cancel")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    import_dsh_client_ui_primitives8.Button,
                    {
                      type: "button",
                      variant: "primary",
                      size: "sm",
                      className: plBtn("primary", "sm"),
                      style: pendingConfirm.danger ? { color: TONE7.red } : void 0,
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
      ]
    }
  );
}

// src/client/components/assistant/PromptAssistant.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
var MONO9 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE8 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
function CtxIcon({
  bg,
  color,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
    "span",
    {
      className: "pl-ctx-ic",
      style: { background: bg, color },
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "svg",
        {
          width: "15",
          height: "15",
          viewBox: "0 0 16 16",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          children
        }
      )
    }
  );
}
var PERSON_SIZE = 72;
var FLOAT_MARGIN = 8;
var POS_KEY = "pl:assistant-pos";
var MOOD_KEY_PREFIX = "pl:mood:";
function moodDayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function loadMood() {
  try {
    const raw = localStorage.getItem(MOOD_KEY_PREFIX + moodDayKey());
    if (!raw) return { happy: 0, sad: 0 };
    const p = JSON.parse(raw);
    return { happy: Math.max(0, p.happy ?? 0), sad: Math.max(0, p.sad ?? 0) };
  } catch {
    return { happy: 0, sad: 0 };
  }
}
function saveMood(m) {
  try {
    const key = MOOD_KEY_PREFIX + moodDayKey();
    localStorage.setItem(key, JSON.stringify(m));
    const allKeys = localStorage.keys?.() ?? [];
    for (const k of allKeys) {
      if (k.startsWith(MOOD_KEY_PREFIX) && k !== key)
        localStorage.removeItem(k);
    }
  } catch {
  }
}
function clamp(v, lo, hi) {
  return Math.min(Math.max(lo, v), Math.max(lo, hi));
}
function edgePos(p, vw, vh) {
  const EDGE = 12;
  const leftSpace = p.px;
  const rightSpace = vw - (p.px + PERSON_SIZE);
  const topSpace = p.py;
  const bottomSpace = vh - (p.py + PERSON_SIZE);
  const min = Math.min(leftSpace, rightSpace, topSpace, bottomSpace);
  let px = p.px;
  let py = p.py;
  if (min === leftSpace) px = -(PERSON_SIZE - EDGE);
  else if (min === rightSpace) px = vw - EDGE;
  else if (min === topSpace) py = -(PERSON_SIZE - EDGE);
  else py = vh - EDGE;
  return { px, py };
}
function loadPos() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const def = {
    px: Math.max(FLOAT_MARGIN, w - PERSON_SIZE - FLOAT_MARGIN),
    py: Math.max(FLOAT_MARGIN, h - PERSON_SIZE - FLOAT_MARGIN)
  };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch {
  }
  return def;
}
var CONFETTI_COLORS = ["#f59e0b", "#8b5cf6", "#3b82f6", "#22c55e", "#f43f5e", "#06b6d4", "#facc15"];
var CONFETTI_PIECES = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + i * 8.5}%`,
  fall: 60 + i * 13 % 50,
  spin: (i % 2 === 0 ? 1 : -1) * (240 + i * 47 % 320),
  delay: 0 + i * 90 % 320 / 1e3,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
}));
function PromptAssistant(props) {
  const { t, settings, settingsReady, onTogglePanel } = props;
  const T = usePLT(t);
  const dark = useThemeSync();
  const [pos, setPos] = (0, import_react15.useState)(loadPos);
  const updatePos = (0, import_react15.useCallback)((patch) => {
    setPos((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, []);
  const viewportRef = (0, import_react15.useRef)({ w: window.innerWidth, h: window.innerHeight });
  const [viewVersion, setViewVersion] = (0, import_react15.useState)(0);
  (0, import_react15.useEffect)(() => {
    const onViewport = () => {
      viewportRef.current = { w: window.innerWidth, h: window.innerHeight };
      setViewVersion((v) => v + 1);
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", onViewport);
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", onViewport);
    let lastDpr = window.devicePixelRatio;
    const iv = window.setInterval(() => {
      if (window.devicePixelRatio !== lastDpr) {
        lastDpr = window.devicePixelRatio;
        onViewport();
      }
    }, 500);
    return () => {
      window.removeEventListener("resize", onViewport);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", onViewport);
      window.clearInterval(iv);
    };
  }, []);
  const [bubble, setBubble] = (0, import_react15.useState)(false);
  const bubbleRef = (0, import_react15.useRef)(null);
  const [bubbleW, setBubbleW] = (0, import_react15.useState)(176);
  const [bubbleH, setBubbleH] = (0, import_react15.useState)(56);
  const hoverRef = (0, import_react15.useRef)(false);
  const lastActiveRef = (0, import_react15.useRef)(Date.now());
  const [docked, setDocked] = (0, import_react15.useState)(false);
  const dockedRef = (0, import_react15.useRef)(false);
  const preDockRef = (0, import_react15.useRef)(null);
  const bubbleRefId = (0, import_react15.useRef)(false);
  (0, import_react15.useEffect)(() => {
    bubbleRefId.current = bubble;
  }, [bubble]);
  const [dragging, setDragging] = (0, import_react15.useState)(false);
  const lastCursorRef = (0, import_react15.useRef)(null);
  (0, import_react15.useEffect)(() => {
    lastActiveRef.current = Date.now();
    const IDLE_MS = 3e4;
    const markActive = () => {
      lastActiveRef.current = Date.now();
      if (dockedRef.current) {
        dockedRef.current = false;
        setDocked(false);
        if (preDockRef.current) setPos(preDockRef.current);
        preDockRef.current = null;
      }
    };
    const onMove = (e) => {
      const prev = lastCursorRef.current;
      lastCursorRef.current = { x: e.clientX, y: e.clientY };
      if (prev && Math.abs(e.clientX - prev.x) < 2 && Math.abs(e.clientY - prev.y) < 2)
        return;
      markActive();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", markActive);
    window.addEventListener("keydown", markActive);
    const iv = window.setInterval(() => {
      if (!dockedRef.current && !bubbleRefId.current && !hoverRef.current && Date.now() - lastActiveRef.current >= IDLE_MS) {
        dockedRef.current = true;
        setDocked(true);
      }
    }, 2e3);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", markActive);
      window.removeEventListener("keydown", markActive);
      window.clearInterval(iv);
    };
  }, [setPos]);
  (0, import_react15.useEffect)(() => {
    if (!docked) return;
    preDockRef.current = { px: pos.px, py: pos.py };
    setBubble(false);
    setEggMode(false);
    hoverRef.current = false;
  }, [docked]);
  const view = (0, import_react15.useMemo)(() => {
    const vw = viewportRef.current.w;
    const vh = viewportRef.current.h;
    const hiX = Math.max(FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
    const hiY = Math.max(FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
    if (docked) return edgePos(pos, vw, vh);
    return {
      px: clamp(pos.px, FLOAT_MARGIN, hiX),
      py: clamp(pos.py, FLOAT_MARGIN, hiY)
    };
  }, [pos, docked, viewVersion]);
  const [intros, setIntros] = (0, import_react15.useState)(() => [
    T("pl.intro.0"),
    T("pl.intro.1"),
    T("pl.intro.2"),
    T("pl.intro.3"),
    T("pl.intro.4")
  ]);
  const [activity, setActivity] = (0, import_react15.useState)({
    phase: "idle",
    sessionActive: false
  });
  (0, import_react15.useEffect)(() => {
    let cancelled = false;
    const lang = (document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("en") ? "en" : "zh";
    const tick = () => {
      getActivity(lang).then((snap) => {
        if (!cancelled) setActivity(snap);
      }).catch(() => {
      });
    };
    tick();
    const iv = window.setInterval(tick, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);
  const [moodCounts, setMoodCounts] = (0, import_react15.useState)(
    loadMood
  );
  const prevPhaseRef = (0, import_react15.useRef)(null);
  (0, import_react15.useEffect)(() => {
    const phase = activity.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === null || !activity.sessionActive) return;
    if (phase === "done" && prev !== "done") {
      setMoodCounts((m) => {
        const next = { ...m, happy: m.happy + 1 };
        saveMood(next);
        return next;
      });
    } else if (phase === "failed" && prev !== "failed") {
      setMoodCounts((m) => {
        const next = { ...m, sad: m.sad + 1 };
        saveMood(next);
        return next;
      });
    }
  }, [activity.phase, activity.sessionActive]);
  const mood = moodCounts.happy > moodCounts.sad ? "happy" : moodCounts.sad > moodCounts.happy ? "sad" : "neutral";
  const [status, setStatus] = (0, import_react15.useState)(null);
  const [toast, setToast] = (0, import_react15.useState)(null);
  const [eggMode, setEggMode] = (0, import_react15.useState)(false);
  const [announced] = (0, import_react15.useState)(() => {
    try {
      const raw = localStorage.getItem("pl:achievements-announced");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return /* @__PURE__ */ new Set();
    }
  });
  const announcedRef = (0, import_react15.useRef)(announced);
  const statusRef = (0, import_react15.useRef)(null);
  const settingsRef = (0, import_react15.useRef)(settings);
  settingsRef.current = settings;
  const statusInitedRef = (0, import_react15.useRef)(false);
  const toastTimerRef = (0, import_react15.useRef)(void 0);
  const tapTimesRef = (0, import_react15.useRef)([]);
  const showToast = (0, import_react15.useCallback)((t2) => {
    setToast(t2);
    if (toastTimerRef.current !== void 0)
      window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      t2.kind === "achievement" ? 4e3 : 2200
    );
  }, []);
  const tRef = (0, import_react15.useRef)(T);
  tRef.current = T;
  (0, import_react15.useEffect)(
    () => () => {
      if (toastTimerRef.current !== void 0)
        window.clearTimeout(toastTimerRef.current);
    },
    []
  );
  (0, import_react15.useEffect)(() => {
    let cancelled = false;
    const lang = (document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("en") ? "en" : "zh";
    const tick = () => {
      getAssistantStatus(lang).then((s) => {
        if (cancelled) return;
        setStatus(s);
        statusRef.current = s;
        if (!statusInitedRef.current) {
          statusInitedRef.current = true;
          for (const a of s.achievements)
            if (a.achieved) announcedRef.current.add(a.id);
          try {
            localStorage.setItem(
              "pl:achievements-announced",
              JSON.stringify([...announcedRef.current])
            );
          } catch {
          }
          return;
        }
        const fresh = s.achievements.find(
          (a) => a.achieved && !announcedRef.current.has(a.id)
        );
        if (fresh) {
          announcedRef.current.add(fresh.id);
          try {
            localStorage.setItem(
              "pl:achievements-announced",
              JSON.stringify([...announcedRef.current])
            );
          } catch {
          }
          const levelAnnouncement = settingsRef.current?.levelAnnouncementEnabled ?? DEFAULT_SETTINGS.levelAnnouncementEnabled;
          if (levelAnnouncement) {
            showToast({
              kind: "achievement",
              title: tRef.current("pl.gamification.unlockTitle"),
              text: `${fresh.title}\uFF1A${fresh.desc}`
            });
          }
        }
      }).catch(() => {
      });
    };
    tick();
    const iv = window.setInterval(tick, 8e3);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [showToast]);
  const triggerTap = (0, import_react15.useCallback)(() => {
    const now = Date.now();
    const recent = tapTimesRef.current.filter((t2) => now - t2 < 2e3);
    recent.push(now);
    tapTimesRef.current = recent;
    if (recent.length >= 5) {
      tapTimesRef.current = [];
      showToast({ kind: "tap", text: tRef.current("pl.tap.dizzy") });
      return;
    }
    const egg = statusRef.current?.easterEgg ? statusRef.current.easterEgg.text : "";
    const lucky = [
      tRef.current("pl.lucky.0"),
      tRef.current("pl.lucky.1"),
      tRef.current("pl.lucky.2"),
      tRef.current("pl.lucky.3"),
      tRef.current("pl.lucky.4"),
      tRef.current("pl.lucky.5")
    ].filter((x, i) => x && x !== `pl.lucky.${i}`);
    const pool = egg ? [egg, ...lucky] : lucky;
    const taps = [
      tRef.current("pl.tap.0"),
      tRef.current("pl.tap.1"),
      tRef.current("pl.tap.2"),
      tRef.current("pl.tap.3")
    ];
    const useEgg = pool.length > 0 && Math.random() < 0.5;
    const text = useEgg ? pool[Math.floor(Math.random() * pool.length)] : taps[Math.floor(Math.random() * taps.length)];
    showToast({ kind: "tap", text });
    setClickRev((c) => c + 1);
  }, [showToast]);
  const [sheet, setSheet] = (0, import_react15.useState)(null);
  const [whaleBroken, setWhaleBroken] = (0, import_react15.useState)(false);
  const [clickRev, setClickRev] = (0, import_react15.useState)(0);
  const spriteRef = (0, import_react15.useRef)(null);
  const [hovering, setHovering] = (0, import_react15.useState)(false);
  const spriteTopic = activity.topic ?? "general";
  const levelEnabled = settings?.levelEnabled ?? DEFAULT_SETTINGS.levelEnabled;
  const spriteLevel = levelEnabled ? status?.level?.level : void 0;
  const character = settings?.assistantCharacter ?? DEFAULT_SETTINGS.assistantCharacter;
  const spriteOpts = (0, import_react15.useMemo)(
    () => ({
      character: "classic",
      level: spriteLevel,
      topic: spriteTopic,
      mood
    }),
    [spriteLevel, spriteTopic, mood]
  );
  (0, import_react15.useEffect)(() => {
    let alive = true;
    const load = character === "whale" ? getWhaleSpriteSheet() : getSpriteSheet(spriteOpts);
    load.then((s) => {
      if (!alive) return;
      if (s === null) return;
      setSheet(s);
    }).catch(() => {
      if (alive) setSheet(null);
    });
    return () => {
      alive = false;
    };
  }, [character, spriteOpts]);
  (0, import_react15.useEffect)(() => {
    if (!sheet) return;
    const el = spriteRef.current;
    if (!el) return;
    const scale = PERSON_SIZE / Math.max(sheet.cellW, sheet.cellH);
    const stepX = sheet.cellW * scale;
    const stepY = sheet.cellH * scale;
    const trackRow = sheet.trackRow;
    const tracks = sheet.tracks;
    const paint = (f) => {
      const row = trackRow[f.track];
      el.style.backgroundPosition = `${-f.col * stepX}px ${-row * stepY}px`;
    };
    const seqFor = () => hovering ? HOVER_SEQUENCE : SEQUENCES[activity.phase] ?? SEQUENCES.idle;
    paint(sequenceFrame(seqFor(), 0, tracks));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (ts) => {
      elapsed += ts - last;
      last = ts;
      paint(sequenceFrame(seqFor(), elapsed, tracks));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sheet, hovering, activity.phase]);
  const PHASE_KEY = {
    idle: "pl.phase.idle",
    waiting: "pl.phase.waiting",
    thinking: "pl.phase.thinking",
    tool: "pl.phase.tool",
    review: "pl.phase.review",
    done: "pl.phase.done",
    failed: "pl.phase.failed"
  };
  const personAnim = (0, import_react15.useMemo)(() => {
    switch (activity.phase) {
      case "thinking":
        return "pl-person-fastbob .9s ease-in-out infinite";
      case "tool":
        return "pl-person-tilt 1.6s ease-in-out infinite";
      case "done":
        return "pl-person-jump .7s cubic-bezier(.3,1.4,.4,1) 2";
      case "failed":
        return "pl-person-shake .5s ease-in-out 2";
      case "waiting":
        return "pl-person-bob 2s ease-in-out infinite";
      default:
        if (mood === "happy")
          return "pl-person-happybob 1.8s ease-in-out infinite";
        if (mood === "sad") return "pl-person-sadbob 2.8s ease-in-out infinite";
        return "pl-person-bob 2.6s ease-in-out infinite";
    }
  }, [activity.phase, mood]);
  const phaseActive = activity.sessionActive && activity.phase !== "idle";
  const phaseActiveRef = (0, import_react15.useRef)(phaseActive);
  (0, import_react15.useEffect)(() => {
    phaseActiveRef.current = phaseActive;
  }, [phaseActive]);
  (0, import_react15.useEffect)(() => {
    if (!bubble && !phaseActive && !toast || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => {
      setBubbleW(el.offsetWidth || 176);
      setBubbleH(el.offsetHeight || 56);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bubble, phaseActive, toast]);
  const [announceOpen, setAnnounceOpen] = (0, import_react15.useState)(false);
  const [achievementOpen, setAchievementOpen] = (0, import_react15.useState)(false);
  const [personaOpen, setPersonaOpen] = (0, import_react15.useState)(false);
  const [dashboardOpen, setDashboardOpen] = (0, import_react15.useState)(false);
  const [importExportOpen, setImportExportOpen] = (0, import_react15.useState)(false);
  const [tagsOpen, setTagsOpen] = (0, import_react15.useState)(false);
  const [trashOpen, setTrashOpen] = (0, import_react15.useState)(false);
  const [dataMenuOpen, setDataMenuOpen] = (0, import_react15.useState)(false);
  const [ctxMenu, setCtxMenu] = (0, import_react15.useState)(null);
  const ctxMenuRef = (0, import_react15.useRef)(null);
  const [ctxPos, setCtxPos] = (0, import_react15.useState)({ left: 0, top: 0 });
  const openMenuAnnounce = () => {
    setCtxMenu(null);
    setAnnounceOpen(true);
  };
  const openMenuAchievements = () => {
    setCtxMenu(null);
    setAchievementOpen(true);
  };
  const openMenuDashboard = () => {
    setCtxMenu(null);
    setDashboardOpen(true);
  };
  const ctxMenuEnabled = (settings?.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled) || (settings?.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled) || levelEnabled || (settings?.personaEnabled ?? DEFAULT_SETTINGS.personaEnabled) || (settings?.dashboardEnabled ?? DEFAULT_SETTINGS.dashboardEnabled) || (settings?.dataManagementEnabled ?? DEFAULT_SETTINGS.dataManagementEnabled);
  (0, import_react15.useLayoutEffect)(() => {
    if (!ctxMenu || !ctxMenuEnabled) return;
    const el = ctxMenuRef.current;
    if (!el) return;
    const mw = el.offsetWidth;
    const mh = el.offsetHeight;
    const M = 8;
    const left = ctxMenu.x + mw > window.innerWidth - M ? Math.max(M, ctxMenu.x - mw) : ctxMenu.x;
    const top = ctxMenu.y + mh > window.innerHeight - M ? Math.max(M, ctxMenu.y - mh) : ctxMenu.y;
    setCtxPos({ left, top });
  }, [ctxMenu, dataMenuOpen]);
  const personDragRef = (0, import_react15.useRef)(null);
  const startPersonDrag = (e) => {
    if (e.button !== 0) return;
    setCtxMenu(null);
    e.preventDefault();
    setDragging(true);
    personDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: pos.px,
      oy: pos.py,
      moved: false
    };
    const onMove = (ev) => {
      const d = personDragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const px = clamp(
        d.ox + dx,
        FLOAT_MARGIN,
        vw - PERSON_SIZE - FLOAT_MARGIN
      );
      const py = clamp(
        d.oy + dy,
        FLOAT_MARGIN,
        vh - PERSON_SIZE - FLOAT_MARGIN
      );
      updatePos({ px, py });
    };
    const onUp = () => {
      const d = personDragRef.current;
      const clicked = d ? !d.moved : false;
      personDragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (clicked) {
        triggerTap();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const [introIdx, setIntroIdx] = (0, import_react15.useState)(0);
  const rotMs = 2500;
  (0, import_react15.useEffect)(() => {
    if (!bubble) {
      setIntroIdx(0);
      return;
    }
    const timer = setInterval(() => setIntroIdx((i) => i + 1), rotMs);
    return () => clearInterval(timer);
  }, [bubble]);
  const bubblePos = (0, import_react15.useMemo)(() => {
    if (!bubble && !phaseActive && !toast) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = bubbleW;
    const H = bubbleH;
    const cx = view.px + PERSON_SIZE / 2;
    const cy = view.py + PERSON_SIZE / 2;
    const ANCHOR = 18;
    const gap = 5;
    let dir;
    let left;
    let top;
    if (view.py + ANCHOR - gap - H >= FLOAT_MARGIN) {
      dir = "above";
      top = view.py + ANCHOR - 8 - H;
      left = Math.min(
        Math.max(FLOAT_MARGIN, cx - W / 2),
        vw - W - FLOAT_MARGIN
      );
    } else if (view.py + PERSON_SIZE + gap + H <= vh - FLOAT_MARGIN) {
      dir = "below";
      top = view.py + PERSON_SIZE - ANCHOR + gap;
      left = Math.min(
        Math.max(FLOAT_MARGIN, cx - W / 2),
        vw - W - FLOAT_MARGIN
      );
    } else if (view.px - gap - W >= FLOAT_MARGIN) {
      dir = "left";
      left = view.px - gap - W;
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    } else {
      dir = "right";
      left = Math.min(view.px + PERSON_SIZE + gap, vw - W - FLOAT_MARGIN);
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    }
    const tailX = cx - left - 5;
    const tailY = cy - top - 5;
    return { left, top, dir, tailX, tailY };
  }, [
    bubble,
    phaseActive,
    toast,
    bubbleW,
    bubbleH,
    view.px,
    view.py,
    viewVersion
  ]);
  (0, import_react15.useEffect)(() => {
    const lang = (document.documentElement.lang || "zh").toLowerCase().startsWith("en") ? "en" : "zh";
    const now = /* @__PURE__ */ new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const cacheKey = `pl:intro:${lang}:${day}`;
    let cancelled = false;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setIntros(parsed.lines.slice(0, 6));
          return;
        }
      }
    } catch {
    }
    genIntro(lang).then((r) => {
      if (cancelled) return;
      if (Array.isArray(r.lines) && r.lines.length > 0) {
        const lines = r.lines.slice(0, 6);
        setIntros(lines);
        try {
          const allKeys = localStorage.keys?.() ?? [];
          for (const k of allKeys) {
            if (k.startsWith(`pl:intro:${lang}:`) && k !== cacheKey)
              localStorage.removeItem(k);
          }
          localStorage.setItem(cacheKey, JSON.stringify({ lines }));
        } catch {
        }
      }
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, []);
  (0, import_react15.useEffect)(() => {
    const intervalMs = Math.max(
      5,
      settings?.personTipInterval ?? DEFAULT_SETTINGS.personTipInterval
    ) * 1e3;
    const hideDuration = Math.max(
      10,
      settings?.personTipDuration ?? DEFAULT_SETTINGS.personTipDuration
    ) * 1e3;
    let showT;
    let hideT;
    const loop = () => {
      showT = setTimeout(
        () => {
          if (phaseActiveRef.current) {
            loop();
            return;
          }
          if (dockedRef.current) {
            dockedRef.current = false;
            setDocked(false);
            if (preDockRef.current) setPos(preDockRef.current);
            preDockRef.current = null;
          }
          if (hoverRef.current) {
            loop();
            return;
          }
          setEggMode(
            statusRef.current?.easterEgg != null && Math.random() < 0.3
          );
          setIntroIdx((i) => i + 1);
          setBubble(true);
          hideT = setTimeout(() => {
            if (!hoverRef.current && !dockedRef.current) {
              setBubble(false);
              setEggMode(false);
            }
            loop();
          }, hideDuration);
        },
        intervalMs + Math.random() * intervalMs
      );
    };
    loop();
    return () => {
      if (showT) clearTimeout(showT);
      if (hideT) clearTimeout(hideT);
    };
  }, [settings?.personTipInterval, settings?.personTipDuration]);
  const assistantMaxed = (status?.level?.next ?? 1) === 0;
  if (assistantMaxed && !(settings?.assistantEnabled ?? DEFAULT_SETTINGS.assistantEnabled))
    return null;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("style", { children: `
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-person-bob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-5px) scale(1.03,.97); } }
@keyframes pl-person-shadow { 0%,100% { transform: scaleX(1); opacity: .22; } 50% { transform: scaleX(.82); opacity: .14; } }
@keyframes pl-person-blink { 0%,88%,100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes pl-person-talk { 0%,100% { transform: scaleY(.22); } 20% { transform: scaleY(.9); } 40% { transform: scaleY(.3); } 60% { transform: scaleY(1); } 80% { transform: scaleY(.26); } }
@keyframes pl-bubble-in { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-bubble-intro { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.pl-grab { cursor: grab; user-select: none; }
.pl-grab:active { cursor: grabbing; }
.pl-person-arm { transform-origin: 6px 8px; animation: pl-person-wave 2.4s ease-in-out infinite; }
@keyframes pl-person-wave { 0%,60%,100% { transform: rotate(0deg); } 70% { transform: rotate(-14deg); } 80% { transform: rotate(0deg); } }
@keyframes pl-person-fastbob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-7px) scale(1.05,.95); } }
@keyframes pl-person-tilt { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
@keyframes pl-person-jump { 0% { transform: translateY(0); } 30% { transform: translateY(-14px); } 50% { transform: translateY(0); } 70% { transform: translateY(-7px); } 100% { transform: translateY(0); } }
@keyframes pl-person-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes pl-person-happybob { 0%,100% { transform: translateY(0) scale(1,1); } 40% { transform: translateY(-8px) scale(1.06,.94); } 70% { transform: translateY(-3px); } }
@keyframes pl-person-sadbob { 0%,100% { transform: translateY(0) rotate(0deg) scale(1,1); } 50% { transform: translateY(2px) rotate(-3deg) scale(.99,1.02); } }
.pl-think-dot { display: inline-block; border-radius: 50%; animation: pl-think-bounce 1.2s ease-in-out infinite; }
@keyframes pl-think-bounce { 0%, 80%, 100% { transform: scale(.55); opacity: .45; } 40% { transform: scale(1); opacity: 1; } }
@keyframes pl-ctx-in { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
.pl-ctx-menu { padding: 6px; border-radius: 13px; background: var(--dsw-specific-sidebar-fill, #f5f6f7); border: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .14)); box-shadow: 0 10px 32px rgba(2, 6, 23, .2), 0 2px 8px rgba(2, 6, 23, .1), inset 0 1px 0 rgba(255, 255, 255, .55); animation: pl-ctx-in .16s cubic-bezier(.22, 1, .36, 1); transform-origin: top left; }
.pl-ctx-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px 8px; font-size: 12px; font-weight: 600; letter-spacing: .2px; color: var(--dsw-alias-label-secondary, #6b7280); border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .08)); margin-bottom: 4px; }
.pl-ctx-item { display: flex; align-items: center; gap: 9px; padding: 6px 9px; font-size: 12.5px; border-radius: 9px; cursor: pointer; user-select: none; color: var(--dsw-alias-label-primary, #1f2937); transition: background .16s ease, transform .12s ease; }
.pl-ctx-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.pl-ctx-item:active { background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, .2)); transform: scale(.97); }
.pl-ctx-sub { display: flex; align-items: center; gap: 9px; padding: 6px 9px 6px 20px; font-size: 12.5px; border-radius: 9px; cursor: pointer; user-select: none; color: var(--dsw-alias-label-primary, #1f2937); transition: background .16s ease, transform .12s ease; }
.pl-ctx-sub:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.pl-ctx-sub:active { background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, .2)); transform: scale(.97); }
.pl-ctx-ic { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; }
/* \u6210\u5C31\u89E3\u9501\u5F69\u5E26\uFF1A\u7EC6\u6761\u4ECE\u6C14\u6CE1\u9876\u90E8\u4E24\u4FA7\u98D8\u843D\uFF0C\u914D\u5408\u6446\u52A8\u4E0E\u6DE1\u51FA */
@keyframes pl-confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(var(--fall, 84px)) rotate(var(--spin, 300deg)); opacity: 0; } }
.pl-confetti { position: absolute; top: -6px; width: 6px; height: 11px; border-radius: 2px; pointer-events: none; animation: pl-confetti-fall 1.1s cubic-bezier(.2,.6,.4,1) forwards; }
@keyframes pl-shine-pop { 0%,30% { opacity: 0; transform: rotate(var(--tilt, -20deg)) scale(.5); } 45% { opacity: 1; transform: rotate(var(--tilt, -20deg)) scale(1.15); } 60%,100% { opacity: 0; transform: rotate(var(--tilt, -20deg)) scale(1); } }
.pl-shine { position: absolute; width: 34px; height: 34px; left: 50%; top: 2px; margin-left: -17px; pointer-events: none; color: #fde68a; filter: drop-shadow(0 0 6px rgba(245,158,11,.7)); animation: pl-shine-pop 1s ease forwards; }
` }),
    (0, import_react_dom5.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
        "div",
        {
          "aria-label": T("pl.title"),
          onMouseDown: startPersonDrag,
          onContextMenu: (e) => {
            e.preventDefault();
            if (!ctxMenuEnabled) return;
            setCtxMenu({ x: e.clientX, y: e.clientY });
          },
          onMouseEnter: () => {
            hoverRef.current = true;
            setHovering(true);
            setBubble(true);
          },
          onMouseLeave: () => {
            hoverRef.current = false;
            setHovering(false);
            setBubble(false);
            setEggMode(false);
          },
          style: {
            position: "fixed",
            left: view.px,
            top: view.py,
            zIndex: 2147483647,
            width: PERSON_SIZE,
            height: PERSON_SIZE,
            cursor: "grab",
            animation: "pl-pop-in .3s cubic-bezier(.22,1,.36,1)",
            // 拖拽中跟手无动画，其余（贴边/恢复）平滑过渡
            transition: dragging ? "none" : "left .35s cubic-bezier(.22,1,.36,1), top .35s cubic-bezier(.22,1,.36,1)",
            userSelect: "none"
          },
          children: [
            (phaseActive || bubble || toast) && bubblePos && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
              "div",
              {
                ref: bubbleRef,
                style: {
                  position: "fixed",
                  left: bubblePos.left,
                  top: bubblePos.top,
                  zIndex: 2147483646,
                  // 建立层叠上下文，使尾巴 zIndex:-1 相对本气泡生效（否则会逃逸层级）
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  width: "max-content",
                  // 宽随文字尺寸自适应（短文案贴合、长文案展开）
                  maxWidth: 288,
                  // 仅保留最大宽度，避免超长文案撑出屏幕
                  padding: "8px 14px",
                  background: TONE8.panel,
                  color: TONE8.text,
                  border: `1px solid ${TONE8.border}`,
                  borderRadius: 16,
                  // 圆弧气泡：大圆角圆润风格
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  textAlign: "center",
                  boxShadow: "0 3px 12px rgba(17, 24, 39, .1)",
                  animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
                  pointerEvents: "none"
                  // 气泡仅展示，穿透不挡页面点击
                },
                children: [
                  toast ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                    toast.kind === "achievement" && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                      CONFETTI_PIECES.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "span",
                        {
                          className: "pl-confetti",
                          style: {
                            left: c.left,
                            background: c.color,
                            boxShadow: `0 0 4px ${c.color}`,
                            animationDelay: `${c.delay}s`,
                            "--fall": `${c.fall}px`,
                            "--spin": `${c.spin}deg`
                          }
                        },
                        i
                      )),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "pl-shine", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("svg", { width: "34", height: "34", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M12 1l2.6 6.5L21 9l-5 4.3 1.5 6.7L12 16.9 6.5 20l1.5-6.7L3 9l6.4-1.5z" }) }) })
                    ] }),
                    toast.title && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          fontWeight: 600,
                          letterSpacing: 1,
                          color: TONE8.accent
                        },
                        children: toast.title
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "span",
                      {
                        style: {
                          color: TONE8.muted,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          textAlign: "center"
                        },
                        children: toast.text
                      }
                    )
                  ] }) : phaseActive ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                          justifyContent: "center",
                          height: 7
                        },
                        children: [0, 1, 2].map((i) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                          "span",
                          {
                            className: "pl-think-dot",
                            style: {
                              width: 5,
                              height: 5,
                              background: TONE8.accent,
                              animationDelay: `${i * 0.18}s`
                            }
                          },
                          i
                        ))
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: TONE8.muted, whiteSpace: "nowrap" }, children: activity.text || T(PHASE_KEY[activity.phase]) })
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                    mood !== "neutral" && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          fontWeight: 600,
                          fontSize: 10.5,
                          letterSpacing: 0.5,
                          color: mood === "happy" ? "var(--dsw-alias-state-success-primary, #16a34a)" : TONE8.red
                        },
                        children: mood === "happy" ? T("pl.mood.happy") : T("pl.mood.sad")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontWeight: 600, letterSpacing: 2 }, children: T("pl.floating.title") }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          color: TONE8.muted,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          animation: "pl-bubble-intro .45s ease"
                        },
                        children: eggMode && status?.easterEgg ? status.easterEgg.text : intros[introIdx % intros.length]
                      },
                      introIdx
                    ),
                    !eggMode && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          gap: 4,
                          justifyContent: "center"
                        },
                        children: intros.map((_, i) => {
                          const active = i === introIdx % intros.length;
                          return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                            "span",
                            {
                              style: {
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: active ? TONE8.accent : TONE8.quiet,
                                transition: "background .2s, transform .2s",
                                transform: active ? "scale(1.35)" : "scale(1)"
                              }
                            },
                            i
                          );
                        })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "span",
                    {
                      style: {
                        position: "absolute",
                        // 上/下方向：尖角在气泡水平居中（相对助手中心）；左/右方向：垂直居中
                        ...bubblePos.dir === "above" ? { left: bubblePos.tailX, bottom: -5 } : bubblePos.dir === "below" ? { left: bubblePos.tailX, top: -5 } : bubblePos.dir === "left" ? { top: bubblePos.tailY, right: -5 } : { top: bubblePos.tailY, left: -5 },
                        width: 10,
                        height: 10,
                        background: "inherit",
                        zIndex: -1,
                        // 让伸入气泡内的部分沉到背景之下，避免压盖内容
                        // 朝向决定用哪对邻边；四种朝向均旋转 45°，尖角指各方向
                        borderTop: bubblePos.dir === "below" || bubblePos.dir === "left" ? `1px solid ${TONE8.border}` : "none",
                        borderRight: bubblePos.dir === "above" || bubblePos.dir === "left" ? `1px solid ${TONE8.border}` : "none",
                        borderBottom: bubblePos.dir === "above" || bubblePos.dir === "right" ? `1px solid ${TONE8.border}` : "none",
                        borderLeft: bubblePos.dir === "below" || bubblePos.dir === "right" ? `1px solid ${TONE8.border}` : "none",
                        transform: "rotate(45deg)"
                      }
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
              "div",
              {
                style: {
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none"
                },
                children: [
                  settingsReady && (character === "dshpet" && !whaleBroken ? (
                    /* 鲸鱼款·动效：dsh-pet webm 双缓冲 video 动效；加载失败回退下方经典雪碧图/SVG */
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      WhaleStage,
                      {
                        phase: activity.phase,
                        hovering,
                        clickRev,
                        size: PERSON_SIZE,
                        onFail: () => setWhaleBroken(true)
                      }
                    )
                  ) : sheet ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "div",
                    {
                      ref: spriteRef,
                      style: {
                        position: "absolute",
                        // 按每帧几何等比缩放到 PERSON_SIZE 内居中：经典款为满框正方形，
                        // 鲸鱼款 192×208 等比缩放保留比例，避免纵向压扁。
                        left: (PERSON_SIZE - sheet.cellW * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)) / 2,
                        top: (PERSON_SIZE - sheet.cellH * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)) / 2,
                        width: sheet.cellW * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH),
                        height: sheet.cellH * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH),
                        backgroundImage: `url(${sheet.url})`,
                        backgroundSize: `${sheet.cellW * sheet.columns * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)}px ${sheet.cellH * sheet.rows * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)}px`,
                        backgroundRepeat: "no-repeat",
                        // 心情/阶段动作动画与 SVG 回退保持一致（背景帧播放与 transform 互不冲突）
                        animation: personAnim,
                        filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))"
                      }
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "svg",
                    {
                      width: PERSON_SIZE,
                      height: PERSON_SIZE,
                      viewBox: "0 0 72 72",
                      fill: "none",
                      style: {
                        position: "absolute",
                        inset: 0,
                        animation: personAnim,
                        pointerEvents: "none",
                        filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("title", { children: T("pl.title") }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                          "ellipse",
                          {
                            cx: "36",
                            cy: "42",
                            rx: "12",
                            ry: "9",
                            fill: "#f9f5ec",
                            stroke: "#c9c2b4",
                            strokeWidth: "0.9"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "33", cy: "49", rx: "3.4", ry: "2.7", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.8" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "39", cy: "49", rx: "3.4", ry: "2.7", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.8" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "29", cy: "52", rx: "4.2", ry: "3.4", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.8" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "43", cy: "52", rx: "4.2", ry: "3.4", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.8" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("g", { className: "pl-person-arm", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "36", cy: "52", rx: "12", ry: "9", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.8" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "26", cy: "50", rx: "5", ry: "4", fill: "#1f2937" })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("g", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "27.5", cy: "14.5", rx: "4.6", ry: "9", transform: "rotate(7 27.5 14.5)", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.9", opacity: "0.92" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "44.5", cy: "14.5", rx: "4.6", ry: "9", transform: "rotate(-7 44.5 14.5)", fill: "#f9f5ec", stroke: "#c9c2b4", strokeWidth: "0.9", opacity: "0.92" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "27.5", cy: "14.5", rx: "2", ry: "6", transform: "rotate(7 27.5 14.5)", fill: "#f6a9c4", opacity: "0.85" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "44.5", cy: "14.5", rx: "2", ry: "6", transform: "rotate(-7 44.5 14.5)", fill: "#f6a9c4", opacity: "0.85" })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                          "circle",
                          {
                            cx: "36",
                            cy: "34",
                            r: "15",
                            fill: "#f9f5ec",
                            stroke: "#c9c2b4",
                            strokeWidth: "1"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "29", cy: "37", r: "2.6", fill: "#f6a9c4", opacity: ".5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "43", cy: "37", r: "2.6", fill: "#f6a9c4", opacity: ".5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                          "g",
                          {
                            style: {
                              animation: "pl-person-blink 4s ease-in-out infinite",
                              transformOrigin: "32px 34px"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "31", cy: "33", r: "2.6", fill: "#1f2937" }),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "41", cy: "33", r: "2.6", fill: "#1f2937" }),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "32", cy: "33.2", r: "1", fill: "#ffffff" }),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "42", cy: "33.2", r: "1", fill: "#ffffff" })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("g", { style: { transformOrigin: "36px 43.5px", animation: "pl-person-talk 1.4s ease-in-out infinite" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "36", cy: "42.6", rx: "3.6", ry: "2.4", fill: "#ff6b5e" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ellipse", { cx: "36", cy: "43.2", rx: "2.2", ry: "1.2", fill: "#e0553f" })
                        ] })
                      ]
                    }
                  )),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        left: "50%",
                        bottom: 2,
                        width: 34,
                        height: 8,
                        borderRadius: "50%",
                        background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 45%, rgba(2, 6, 23, .55))",
                        opacity: 0.34,
                        transform: "translateX(-50%)",
                        filter: "blur(1px)",
                        boxShadow: "0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 30%, transparent)",
                        animation: "pl-person-shadow 2.6s ease-in-out infinite"
                      }
                    }
                  ),
                  status && levelEnabled && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      title: status.level.next > status.level.current ? `${status.level.title} \xB7 ${T("pl.gamification.progress").replace("{n}", String(status.level.next - status.level.current))}` : `${status.level.title} \xB7 ${T("pl.gamification.maxed")}`,
                      style: {
                        position: "absolute",
                        right: -4,
                        bottom: -2,
                        minWidth: 22,
                        height: 16,
                        padding: "0 4px",
                        borderRadius: 8,
                        background: TONE8.accent,
                        // 黑夜模式下品牌色偏浅（浅蓝），文字需用深色；白天品牌色偏深（深蓝），文字用白色
                        color: dark ? "#10141c" : "#fff",
                        fontSize: 9,
                        fontWeight: 600,
                        lineHeight: "16px",
                        textAlign: "center",
                        boxShadow: "0 1px 4px rgba(2, 6, 23, .25)",
                        pointerEvents: "none"
                      },
                      children: [
                        "Lv.",
                        status.level.level
                      ]
                    }
                  )
                ]
              }
            )
          ]
        }
      ),
      document.body
    ),
    ctxMenu && ctxMenuEnabled && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
      (0, import_react_dom5.createPortal)(
        // 透明遮罩：与菜单同为最高层级且渲染在助手 portal 之后（DOM 靠后），
        // 因此能盖住助手/等级徽章，点击任意位置即关闭菜单（也阻止误拖助手）
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "div",
          {
            style: { position: "fixed", inset: 0, zIndex: 2147483647 },
            onMouseDown: () => setCtxMenu(null),
            onContextMenu: (e) => {
              e.preventDefault();
              setCtxMenu(null);
            }
          }
        ),
        document.body
      ),
      (0, import_react_dom5.createPortal)(
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
          "div",
          {
            ref: ctxMenuRef,
            className: "pl-ctx-menu",
            style: {
              position: "fixed",
              left: ctxPos.left,
              top: ctxPos.top,
              zIndex: 2147483647,
              minWidth: 150,
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              boxSizing: "border-box",
              fontFamily: MONO9
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pl-ctx-head", children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "svg",
                  {
                    width: "13",
                    height: "13",
                    viewBox: "0 0 16 16",
                    fill: "var(--dsw-alias-brand-primary, #2563eb)",
                    "aria-hidden": "true",
                    children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M8 2.2l1.1 3.7 3.7 1.1-3.7 1.1L8 11.8 6.9 8.1 3.2 7l3.7-1.1L8 2.2z" })
                  }
                ),
                T("pl.floating.title")
              ] }),
              (settings?.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled) && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                "div",
                {
                  className: "pl-ctx-item",
                  onClick: () => {
                    setCtxMenu(null);
                    onTogglePanel?.();
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                      CtxIcon,
                      {
                        bg: "rgba(37, 99, 235, .12)",
                        color: "var(--dsw-alias-brand-primary, #2563eb)",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("rect", { x: "2.5", y: "2.5", width: "4.6", height: "4.6", rx: "1.1" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("rect", { x: "8.9", y: "2.5", width: "4.6", height: "4.6", rx: "1.1" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("rect", { x: "2.5", y: "8.9", width: "4.6", height: "4.6", rx: "1.1" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("rect", { x: "8.9", y: "8.9", width: "4.6", height: "4.6", rx: "1.1" })
                        ]
                      }
                    ),
                    T("pl.ctx.openPanel")
                  ]
                }
              ),
              (settings?.dataManagementEnabled ?? DEFAULT_SETTINGS.dataManagementEnabled) && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                  "div",
                  {
                    className: "pl-ctx-item",
                    onClick: () => setDataMenuOpen((v) => !v),
                    "aria-expanded": dataMenuOpen,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(CtxIcon, { bg: "rgba(16, 185, 129, .12)", color: "#10b981", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M8 3.5v9M4.8 5.7l3.2-3.2 3.2 3.2" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M12.5 11l2.2 1.4a1 1 0 0 0 1-.1L15.8 12" }),
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M13 14H5.2a.8.8 0 0 1-.8-.8V13" })
                      ] }),
                      T("pl.ctx.dataManagement"),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "svg",
                        {
                          width: "12",
                          height: "12",
                          viewBox: "0 0 16 16",
                          style: {
                            flexShrink: 0,
                            color: TONE8.muted,
                            transform: dataMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform .2s ease"
                          },
                          "aria-hidden": "true",
                          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                dataMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      className: "pl-ctx-sub",
                      onClick: () => {
                        setCtxMenu(null);
                        setDataMenuOpen(false);
                        setImportExportOpen(true);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                          CtxIcon,
                          {
                            bg: "rgba(37, 99, 235, .12)",
                            color: "var(--dsw-alias-brand-primary, #2563eb)",
                            children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M8 12V4M8 4L5 7M8 4l3 3M8 12l-3-3M8 12l3-3" })
                          }
                        ),
                        T("pl.moduleImportExport")
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      className: "pl-ctx-sub",
                      onClick: () => {
                        setCtxMenu(null);
                        setDataMenuOpen(false);
                        setTagsOpen(true);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(CtxIcon, { bg: "rgba(139, 92, 246, .12)", color: "#8b5cf6", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M3 4.5A1.5 1.5 0 0 1 4.5 3h3l5 5-4.5 4.5-5-5v-3Z" }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("circle", { cx: "6.4", cy: "6.4", r: ".4", strokeWidth: "2" })
                        ] }),
                        T("pl.moduleTags")
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                    "div",
                    {
                      className: "pl-ctx-sub",
                      onClick: () => {
                        setCtxMenu(null);
                        setDataMenuOpen(false);
                        setTrashOpen(true);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                          CtxIcon,
                          {
                            bg: "rgba(220, 38, 38, .1)",
                            color: "var(--dsw-alias-state-error-primary, #dc2626)",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M5 4.5h6v8.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 5 13V4.5Z" }),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M4 4.5h8M6.7 2.5h2.6" })
                            ]
                          }
                        ),
                        T("pl.moduleTrash")
                      ]
                    }
                  )
                ] })
              ] }),
              (settings?.personaEnabled ?? DEFAULT_SETTINGS.personaEnabled) && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                "div",
                {
                  className: "pl-ctx-item",
                  onClick: () => {
                    setCtxMenu(null);
                    setPersonaOpen(true);
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(CtxIcon, { bg: "rgba(139, 92, 246, .12)", color: "#8b5cf6", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z" }),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z" })
                    ] }),
                    T("pl.ctx.personas")
                  ]
                }
              ),
              (settings?.dashboardEnabled ?? DEFAULT_SETTINGS.dashboardEnabled) && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pl-ctx-item", onClick: openMenuDashboard, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  CtxIcon,
                  {
                    bg: "rgba(37, 99, 235, .12)",
                    color: "var(--dsw-alias-brand-primary, #2563eb)",
                    children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M7 13V7M11 13V9M15 13V4M4 13h15" })
                  }
                ),
                T("pl.ctx.dashboard")
              ] }),
              levelEnabled && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pl-ctx-item", onClick: openMenuAchievements, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(CtxIcon, { bg: "rgba(217, 119, 6, .14)", color: "#b45309", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M5.8 2.5h4.4v3a2.2 2.2 0 0 1-4.4 0v-3Z" }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M5.8 3.5H4.2A1.2 1.2 0 0 0 3 4.7v.1a2.6 2.6 0 0 0 2.8 2.6" }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M10.2 3.5h1.6A1.2 1.2 0 0 1 13 4.7v.1a2.6 2.6 0 0 1-2.8 2.6" }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M8 7.4v1.6M6.5 12.2h3M7.2 14h1.6" })
                ] }),
                T("pl.ctx.achievements")
              ] }),
              (settings?.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled) && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pl-ctx-item", onClick: openMenuAnnounce, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                  CtxIcon,
                  {
                    bg: "rgba(220, 38, 38, .1)",
                    color: "var(--dsw-alias-state-error-primary, #dc2626)",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M3 8.5V7a1.5 1.5 0 0 1 1.5-1.5h1L10 3.5v9l-4.5-2H4.5A1.5 1.5 0 0 1 3 9v-.5Z" }),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: "M11 6.5a2.6 2.6 0 0 1 0 3" })
                    ]
                  }
                ),
                T("pl.ctx.announce")
              ] })
            ]
          }
        ),
        document.body
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      AnnouncementModal,
      {
        open: announceOpen,
        onClose: () => setAnnounceOpen(false),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      AchievementModal,
      {
        open: achievementOpen,
        onClose: () => setAchievementOpen(false),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      PersonaManagerModal,
      {
        open: personaOpen,
        onClose: () => setPersonaOpen(false),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      DashboardModal,
      {
        open: dashboardOpen,
        onClose: () => setDashboardOpen(false),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      ImportExportModal,
      {
        open: importExportOpen,
        onClose: () => setImportExportOpen(false),
        t: T
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(TagsModal, { open: tagsOpen, onClose: () => setTagsOpen(false), t: T }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(TrashModal, { open: trashOpen, onClose: () => setTrashOpen(false), t: T })
  ] });
}

// src/client/components/common/SearchBox.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
var MONO10 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE9 = {
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
  border: `1px solid ${TONE9.border}`,
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M12 17v5" }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" })
      ]
    }
  );
}
function TagFilterBar(props) {
  const { tags, active, onChange, allLabel } = props;
  const chip = (selected) => ({
    ...chipStyle,
    background: selected ? TONE9.accentSoft : TONE9.row,
    color: selected ? TONE9.accent : TONE9.text,
    borderColor: selected ? TONE9.accent : TONE9.border,
    // pin 效果：选中标签轻微上浮、带投影，像被图钉钉在过滤条上
    transform: selected ? "translateY(-1px)" : "none",
    boxShadow: selected ? "0 2px 6px rgba(15, 23, 42, 0.18)" : "none",
    padding: selected ? "0 7px 0 6px" : "0 8px"
  });
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: barStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("button", { type: "button", onClick: () => onChange(""), style: chip(active === ""), children: [
      active === "" && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(PinIcon, {}),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: chipTextStyle, children: allLabel ?? "\u5168\u90E8" })
    ] }),
    tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onChange(active === tag ? "" : tag),
        "data-tip": tag,
        style: chip(active === tag),
        children: [
          active === tag && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(PinIcon, {}),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: chipTextStyle, children: tag })
        ]
      },
      tag
    ))
  ] });
}
function Highlight({ text, query }) {
  const q = query?.trim();
  if (!q) return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(import_jsx_runtime17.Fragment, { children: text });
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const nodes = [];
  let i = 0;
  let key = 0;
  for (; ; ) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      nodes.push(text.slice(i));
      break;
    }
    if (idx > i) nodes.push(text.slice(i, idx));
    nodes.push(
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        "mark",
        {
          style: {
            background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 26%, transparent)",
            color: "inherit",
            borderRadius: 3,
            padding: "0 1px"
          },
          children: text.slice(idx, idx + q.length)
        },
        key++
      )
    );
    i = idx + q.length;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(import_jsx_runtime17.Fragment, { children: nodes });
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { position: "relative", width: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          color: hasText ? TONE9.accent : TONE9.quiet,
          background: "transparent",
          border: "none",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M21 21l-4.35-4.35" })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          color: TONE9.text,
          background: TONE9.row,
          border: `1px solid ${TONE9.border}`,
          borderRadius: 9,
          fontFamily: MONO10,
          fontSize: 13,
          outline: "none"
        }
      }
    ),
    hasText && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          color: TONE9.quiet,
          background: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M15 9l-6 6M9 9l6 6" })
            ]
          }
        )
      }
    )
  ] });
}

// src/client/components/common/TagInput.tsx
var import_jsx_runtime18 = require("react/jsx-runtime");
function TagInput({ value, onChange, suggestions, inputStyle: inputStyle8, t }) {
  const T = usePLT(t);
  const current = value.split("#").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("option", { value: "", children: T("pl.tagsNoneSelect") }),
          suggestions.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("option", { value: tag, children: tag }, tag))
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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

// src/client/components/sidebar/SidebarPromptLibrary.tsx
var import_jsx_runtime19 = require("react/jsx-runtime");
var MONO11 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE10 = {
  // 与宿主左侧栏（ui-sidebar .root）保持一致，随宿主主题自动深浅。
  // 背景/文字用宿主侧栏专属 token，不使用渲染器近似色。
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  row: "var(--dsw-alias-input-fill, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #16a34a)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
var NO_EDITOR = { mode: "none", title: "", body: "", tags: "" };
var EXPANDED_GROUPS_KEY = "pl:expanded-groups";
var HOVER_W = 300;
var HOVER_GAP = 12;
var SIDEBAR_WIDTH = 380;
var FLOAT_KEY = "pl:float-state";
var FLOAT_MARGIN2 = 8;
var FLOAT_MIN_W = 300;
var FLOAT_MIN_H = 340;
function loadFloatState() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const def = {
    x: Math.max(FLOAT_MARGIN2, w - SIDEBAR_WIDTH - FLOAT_MARGIN2),
    y: Math.max(FLOAT_MARGIN2, h - 520 - FLOAT_MARGIN2),
    width: SIDEBAR_WIDTH,
    height: 520,
    collapsed: true
  };
  try {
    const raw = localStorage.getItem(FLOAT_KEY);
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch {
  }
  return def;
}
function clampPos(x, y, width, height, r) {
  return {
    x: Math.min(Math.max(r.left + FLOAT_MARGIN2, x), Math.max(r.left + FLOAT_MARGIN2, r.right - width - FLOAT_MARGIN2)),
    y: Math.min(Math.max(r.top + FLOAT_MARGIN2, y), Math.max(r.top + FLOAT_MARGIN2, r.bottom - height - FLOAT_MARGIN2))
  };
}
function findChatWindow(panel) {
  let el = panel?.parentElement ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute("data-phase")) return el;
    el = el.parentElement;
  }
  el = panel?.parentElement ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (!el.hasAttribute("data-composer-card")) {
      const r = el.getBoundingClientRect();
      if (r.width >= 360 && r.height >= 240) return el;
    }
    el = el.parentElement;
  }
  return null;
}
function anchorRect(anchor) {
  if (!anchor) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const r = anchor.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}
function useChatWindow(panelRef) {
  const anchorRef = (0, import_react16.useRef)(null);
  const [rect, setRect] = (0, import_react16.useState)(() => anchorRect(findChatWindow(panelRef.current)));
  (0, import_react16.useEffect)(() => {
    anchorRef.current = findChatWindow(panelRef.current);
    const measure = () => setRect(anchorRect(anchorRef.current ?? findChatWindow(panelRef.current)));
    measure();
    const targets = [panelRef.current, document.body];
    const ro = new ResizeObserver(measure);
    for (const t of targets) if (t) ro.observe(t);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const iv = window.setInterval(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(iv);
    };
  }, []);
  return rect;
}
function useSettings() {
  const [settings, setSettings] = (0, import_react16.useState)(DEFAULT_SETTINGS);
  const [ready, setReady] = (0, import_react16.useState)(false);
  const load = (0, import_react16.useCallback)(() => {
    getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => {
    });
  }, []);
  (0, import_react16.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react16.useEffect)(() => {
    const onChanged = (e) => {
      const detail = e.detail;
      if (detail) {
        setSettings(detail);
        setReady(true);
      } else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);
  return { settings, ready };
}
function SidebarPromptLibrary(props) {
  const { inputActions, draft, t } = props ?? {};
  const T = usePLT(t);
  const { settings, ready: settingsReady } = useSettings();
  const [float, setFloat] = (0, import_react16.useState)(loadFloatState);
  const collapsed = float.collapsed;
  const setCollapsed = (0, import_react16.useCallback)(
    (v) => updateFloat({ collapsed: v }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  function updateFloat(patch) {
    setFloat((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(FLOAT_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }
  const [prompts, setPrompts] = (0, import_react16.useState)([]);
  const [tagNames, setTagNames] = (0, import_react16.useState)([]);
  const [query, setQuery] = (0, import_react16.useState)("");
  const [tagFilter, setTagFilter] = (0, import_react16.useState)("");
  const clearSearch = (0, import_react16.useCallback)(() => setQuery(""), []);
  const [phase, setPhase] = (0, import_react16.useState)("idle");
  const [error, setError] = (0, import_react16.useState)(null);
  const [editor, setEditor] = (0, import_react16.useState)(NO_EDITOR);
  const [copiedId, setCopiedId] = (0, import_react16.useState)(null);
  const [polish, setPolish] = (0, import_react16.useState)({ status: "idle" });
  const [polishResult, setPolishResult] = (0, import_react16.useState)("");
  const [polishError, setPolishError] = (0, import_react16.useState)(null);
  const [polishInsert, setPolishInsert] = (0, import_react16.useState)(null);
  const [template, setTemplate] = (0, import_react16.useState)(null);
  const [deleteConfirm, setDeleteConfirm] = (0, import_react16.useState)(null);
  const [polishConfirm, setPolishConfirm] = (0, import_react16.useState)(null);
  const [viewing, setViewing] = (0, import_react16.useState)(null);
  const [viewPolish, setViewPolish] = (0, import_react16.useState)({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = (0, import_react16.useState)("");
  const [viewShowOriginal, setViewShowOriginal] = (0, import_react16.useState)(false);
  const [expandedGroups, setExpandedGroups] = (0, import_react16.useState)(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
    }
    return /* @__PURE__ */ new Set();
  });
  const toggleGroup = (0, import_react16.useCallback)((tag) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      try {
        localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
      }
      return next;
    });
  }, []);
  const [recentCollapsed, setRecentCollapsed] = (0, import_react16.useState)(false);
  const searchRef = (0, import_react16.useRef)(null);
  const refreshController = (0, import_react16.useRef)(null);
  const hover = useHoverDetail();
  const hoverEnabled = settings.hoverDetailEnabled;
  const panelRef = (0, import_react16.useRef)(null);
  const chatAnchorRef = (0, import_react16.useRef)(null);
  const bodyRef = (0, import_react16.useRef)(null);
  const chat = useChatWindow(chatAnchorRef);
  const view = (0, import_react16.useMemo)(() => {
    const availW = Math.max(0, chat.right - chat.left - FLOAT_MARGIN2 * 2);
    const availH = Math.max(0, chat.bottom - chat.top - FLOAT_MARGIN2 * 2);
    const width = Math.min(float.width, availW);
    const height = Math.min(float.height, availH);
    const pos = clampPos(float.x, float.y, width, height, chat);
    return { ...pos, width, height };
  }, [float.x, float.y, float.width, float.height, chat]);
  const dragRef = (0, import_react16.useRef)(null);
  const startPanelDrag = (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      updateFloat({
        ...clampPos(d.ox + (ev.clientX - d.startX), d.oy + (ev.clientY - d.startY), float.width, float.height, chat)
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const resizeRef = (0, import_react16.useRef)(null);
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, ow: float.width, oh: float.height };
    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      const width = Math.min(Math.max(r.ow + (ev.clientX - r.startX), FLOAT_MIN_W), chat.right - view.x - FLOAT_MARGIN2);
      const height = Math.min(Math.max(r.oh + (ev.clientY - r.startY), FLOAT_MIN_H), chat.bottom - view.y - FLOAT_MARGIN2);
      updateFloat({ width, height });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const showDetail = (p, rowTop) => {
    const panel = panelRef.current;
    const leftEdge = panel ? panel.getBoundingClientRect().left : window.innerWidth - Math.min(SIDEBAR_WIDTH, window.innerWidth);
    hover.show(p, leftEdge - HOVER_W - HOVER_GAP, rowTop);
  };
  const refresh = (0, import_react16.useCallback)(() => {
    refreshController.current?.abort();
    const ctrl = new AbortController();
    refreshController.current = ctrl;
    setPhase("loading");
    setError(null);
    listPrompts().then((list) => {
      if (ctrl.signal.aborted) return;
      setPrompts(list);
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
  (0, import_react16.useEffect)(() => {
    if (collapsed) return;
    if (phase === "idle") refresh();
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [collapsed, phase, refresh]);
  const filtered = (0, import_react16.useMemo)(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (tagFilter && !(p.tags ?? []).some((t2) => t2.trim() === tagFilter)) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query, tagFilter]);
  const preSearchExpanded = (0, import_react16.useRef)(null);
  (0, import_react16.useEffect)(() => {
    const hasQuery = query.trim().length > 0;
    if (hasQuery) {
      if (preSearchExpanded.current === null) {
        preSearchExpanded.current = new Set(expandedGroups);
      }
      setRecentCollapsed(false);
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        for (const p of filtered) {
          if (p.tags && p.tags.length > 0) p.tags.forEach((t2) => next.add(t2));
          else next.add(T("pl.sidebar.uncategorized"));
        }
        return next;
      });
    } else if (preSearchExpanded.current !== null) {
      setExpandedGroups(preSearchExpanded.current);
      preSearchExpanded.current = null;
    }
  }, [query, filtered, T]);
  const preTagExpanded = (0, import_react16.useRef)(null);
  (0, import_react16.useEffect)(() => {
    if (tagFilter) {
      if (preTagExpanded.current === null) {
        preTagExpanded.current = { groups: new Set(expandedGroups), recent: recentCollapsed };
      }
      setExpandedGroups(/* @__PURE__ */ new Set([tagFilter]));
      setRecentCollapsed(true);
    } else if (preTagExpanded.current !== null) {
      setExpandedGroups(preTagExpanded.current.groups);
      setRecentCollapsed(preTagExpanded.current.recent);
      preTagExpanded.current = null;
    }
  }, [tagFilter]);
  const allTags = (0, import_react16.useMemo)(() => {
    const s = new Set(tagNames);
    for (const p of prompts) for (const t2 of p.tags ?? []) s.add(t2);
    return Array.from(s).sort();
  }, [prompts, tagNames]);
  const scrollRef = (0, import_react16.useRef)(null);
  const seenIdsRef = (0, import_react16.useRef)(/* @__PURE__ */ new Set());
  (0, import_react16.useEffect)(() => {
    const fresh = prompts.filter((p) => !seenIdsRef.current.has(p.id) && isRecent(p.id));
    seenIdsRef.current = new Set(prompts.map((p) => p.id));
    if (fresh.length === 0) return;
    const tags = /* @__PURE__ */ new Set();
    for (const p of fresh) {
      if (p.tags && p.tags.length > 0) p.tags.forEach((t2) => tags.add(t2));
      else tags.add(T("pl.sidebar.uncategorized"));
    }
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      tags.forEach((t2) => next.add(t2));
      return next;
    });
    const id = fresh[0].id;
    window.setTimeout(() => {
      scrollRef.current?.querySelector(`[data-pl-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
    }, 60);
  }, [prompts, T]);
  const insertText = (0, import_react16.useCallback)(
    (text) => {
      if (inputActions) {
        inputActions.setDraft(draft && draft.trim() ? `${draft}

${text}` : text);
      } else {
        navigator.clipboard.writeText(text).catch(() => {
        });
      }
    },
    [inputActions, draft]
  );
  const insert = (0, import_react16.useCallback)(
    (prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "insert" });
        return;
      }
      usePrompt(prompt.id).catch(() => {
      });
      insertText(prompt.body);
    },
    [insertText]
  );
  const overwrite = (0, import_react16.useCallback)(
    (prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "overwrite" });
        return;
      }
      usePrompt(prompt.id).catch(() => {
      });
      if (inputActions) inputActions.setDraft(prompt.body);
      else navigator.clipboard.writeText(prompt.body).catch(() => {
      });
    },
    [inputActions]
  );
  const applyTemplate = (0, import_react16.useCallback)(
    (values) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      usePrompt(template.prompt.id).catch(() => {
      });
      if (template.mode === "insert") insertText(filled);
      else if (inputActions) inputActions.setDraft(filled);
      else navigator.clipboard.writeText(filled).catch(() => {
      });
      setTemplate(null);
    },
    [template, insertText, inputActions]
  );
  const applyPolishInsert = (0, import_react16.useCallback)(
    (values) => {
      if (polishInsert === null) return;
      insertText(applyVariables(polishInsert, values));
      setPolishInsert(null);
    },
    [polishInsert, insertText]
  );
  const insertAndSend = (0, import_react16.useCallback)(
    (values) => {
      const source = polishInsert !== null ? polishInsert : template?.prompt.body;
      if (source == null) return;
      const filled = applyVariables(source, values);
      if (template) usePrompt(template.prompt.id).catch(() => {
      });
      if (inputActions) {
        inputActions.setDraft(filled);
        inputActions.submit?.();
      } else {
        navigator.clipboard.writeText(filled).catch(() => {
        });
      }
      setTemplate(null);
      setPolishInsert(null);
    },
    [template, polishInsert, inputActions]
  );
  const copy = (0, import_react16.useCallback)((p) => {
    navigator.clipboard.writeText(p.body).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((cur) => cur === p.id ? null : cur), 1500);
    }).catch(() => {
    });
  }, []);
  const startPolish = (0, import_react16.useCallback)((p) => {
    setPolishError(null);
    setPolish({ status: "loading", id: p.id });
    polishPrompt(p.body).then(
      (res) => {
        setPolishResult(res.polished);
        setPolish({ status: "done", id: p.id });
      },
      (e) => {
        setPolishError(e instanceof Error ? e.message : String(e));
        setPolish({ status: "idle" });
      }
    );
  }, []);
  const closePolish = (0, import_react16.useCallback)(() => {
    setPolish({ status: "idle" });
    setError(null);
    setPolishInsert(null);
  }, []);
  const handlePolishClick = (0, import_react16.useCallback)((p) => {
    if (p.aiRefined) setPolishConfirm(p);
    else startPolish(p);
  }, [startPolish]);
  (0, import_react16.useEffect)(() => {
    if (!polishError) return;
    const timer = setTimeout(() => setPolishError(null), 4e3);
    return () => clearTimeout(timer);
  }, [polishError]);
  const savePolish = (0, import_react16.useCallback)(() => {
    if (polish.status !== "done") return;
    const id = polish.id;
    const original = prompts.find((x) => x.id === id);
    updatePrompt(id, {
      body: polishResult,
      sourceBody: original && original.body !== polishResult ? original.body : void 0,
      aiRefined: true
    }).then(() => {
      closePolish();
      notifyDataChanged();
    }, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [polish, polishResult, prompts, closePolish]);
  const closeView = (0, import_react16.useCallback)(() => {
    setViewing(null);
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewShowOriginal(false);
  }, []);
  const startViewPolish = (0, import_react16.useCallback)(async () => {
    if (!viewing || viewPolish.status === "loading") return;
    setViewPolish({ status: "loading", id: viewing.id });
    setViewShowOriginal(false);
    setPolishError(null);
    try {
      const res = await polishPrompt(viewing.body);
      setViewPolishText(res.polished);
      setViewPolish({ status: "done", id: viewing.id });
    } catch (e) {
      setViewPolish({ status: "idle", id: "" });
      setPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [viewing, viewPolish.status]);
  const saveViewPolish = (0, import_react16.useCallback)(async () => {
    if (viewPolish.status !== "done" || !viewing) return;
    const body = viewPolishText.trim();
    if (!body) return;
    try {
      const updated = await updatePrompt(viewing.id, {
        body,
        sourceBody: viewing.body !== body ? viewing.body : void 0,
        aiRefined: true
      });
      setViewing(updated);
      setPrompts((list) => list.map((p) => p.id === updated.id ? updated : p));
      setViewPolish({ status: "idle", id: "" });
      setViewPolishText("");
      setViewShowOriginal(false);
      notifyDataChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [viewPolish.status, viewPolishText, viewing]);
  const tagGrouped = (0, import_react16.useMemo)(() => {
    const recentKey = T("pl.sidebar.recent");
    const uncategorized = T("pl.sidebar.uncategorized");
    const recentCut = Date.now() - 30 * 24 * 60 * 60 * 1e3;
    const recent = filtered.filter((p) => p.lastUsedAt > 0 && p.lastUsedAt >= recentCut).sort((a, b) => b.usageCount - a.usageCount || b.lastUsedAt - a.lastUsedAt).slice(0, 10);
    const groups = /* @__PURE__ */ new Map();
    for (const p of filtered) {
      const validTags = (p.tags ?? []).map((x) => x.trim()).filter(Boolean);
      if (validTags.length > 0) {
        for (const tag of new Set(validTags)) {
          if (!groups.has(tag)) groups.set(tag, []);
          groups.get(tag).push(p);
        }
      } else {
        if (!groups.has(uncategorized)) groups.set(uncategorized, []);
        groups.get(uncategorized).push(p);
      }
    }
    const rest = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === uncategorized) return 1;
      if (b === uncategorized) return -1;
      return a.localeCompare(b);
    });
    const ordered = [];
    if (tagFilter === "" && recent.length > 0) ordered.push([recentKey, recent]);
    ordered.push(...rest);
    return ordered;
  }, [filtered, T, tagFilter]);
  const editing = editor.mode !== "none";
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
    } else if (editor.mode === "edit") {
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
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { ref: chatAnchorRef, "aria-hidden": "true", style: { display: "contents" } }),
    (0, import_react_dom6.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("style", { children: `@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
/* \u6D6E\u52A8\u9762\u677F\u5C55\u5F00\u65F6\u7684\u6D6E\u5165\u52A8\u753B\uFF1A\u8F7B\u5FAE\u4E0A\u79FB + \u7F29\u653E + \u6DE1\u5165 */
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: translateY(0) scale(1); } }
/* AI \u4F18\u5316\u8FDB\u5EA6\u6761\u52A8\u753B\uFF1A\u4E0D\u786E\u5B9A\u8FDB\u5EA6\u5DE6\u53F3\u6ED1\u52A8 */
@keyframes pl-progress { 0% { transform: translateX(-100%); } 50% { transform: translateX(150%); } 100% { transform: translateX(350%); } }
.pl-grab { cursor: grab; user-select: none; }
.pl-grab:active { cursor: grabbing; }
/* \u5185\u5BB9\u533A\u7EC6\u6EDA\u52A8\u6761 */
.pl-scroll::-webkit-scrollbar { width: 8px; }
.pl-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 30%, transparent); border-radius: 4px; }
.pl-scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 50%, transparent); }
.pl-scroll::-webkit-scrollbar-track { background: transparent; }
.pl-scroll { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 30%, transparent) transparent; }
/* \u63D0\u793A\u8BCD\u5361\u7247\uFF1A\u60AC\u6D6E\u65F6\u8F7B\u5FAE\u4E0A\u6D6E + \u6295\u5F71 + \u63CF\u8FB9\u9AD8\u4EAE */
.pl-prompt-card {
  background: var(--dsw-alias-bg-layer-3, #1d2735);
  border: 1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16));
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.pl-prompt-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1); border-color: var(--dsw-alias-brand-primary, #2563eb); }
/* \u5206\u7EC4\u5934\u60AC\u6D6E\u80CC\u666F */
.pl-group-header { border-radius: 6px; transition: background .15s ease; }
.pl-group-header:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 6%, transparent); }
/* \u641C\u7D22\u8F93\u5165\u6846\u805A\u7126\u5149\u5708 */
.pl-search-input:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent); }
}` }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("style", { children: PL_BUTTON_CSS }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          PromptAssistant,
          {
            t: T,
            settings,
            settingsReady,
            onTogglePanel: () => updateFloat({ collapsed: !float.collapsed })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "section",
          {
            ref: panelRef,
            role: "dialog",
            "aria-label": T("pl.title"),
            style: {
              position: "fixed",
              left: view.x,
              top: view.y,
              zIndex: 2147483646,
              width: view.width,
              height: view.height,
              display: !settings.rightPanelEnabled || collapsed ? "none" : "flex",
              flexDirection: "column",
              animation: collapsed ? "none" : "pl-pop-in .28s cubic-bezier(.22,1,.36,1)",
              overflow: "hidden",
              color: TONE10.text,
              background: TONE10.panel,
              border: `1px solid ${TONE10.border}`,
              borderRadius: 14,
              boxShadow: "0 1px 2px rgba(15, 23, 42, .04), 0 8px 24px rgba(15, 23, 42, .1), 0 24px 64px rgba(15, 23, 42, .16)",
              fontFamily: MONO11
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                "div",
                {
                  onMouseDown: startResize,
                  "data-tip": T("pl.floating.resize"),
                  style: {
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 18,
                    height: 18,
                    cursor: "nwse-resize",
                    color: TONE10.quiet,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "flex-end",
                    padding: 3,
                    zIndex: 2
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M7 17L17 7M9 17h8V9", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                "header",
                {
                  onMouseDown: startPanelDrag,
                  className: "pl-grab",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 14px",
                    borderBottom: `1px solid ${TONE10.border}`,
                    flexShrink: 0,
                    height: 52
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                        "svg",
                        {
                          width: "15",
                          height: "15",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "1.6",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0 },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z", strokeLinejoin: "round" }),
                            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M8 9h3M8 12h3", strokeLinecap: "round" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        "strong",
                        {
                          style: {
                            fontSize: 14,
                            fontWeight: 520,
                            color: TONE10.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          },
                          children: T("pl.title")
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { justifySelf: "end", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        import_dsh_client_ui_primitives9.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: refresh,
                          disabled: phase === "loading",
                          "data-tip": phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle"),
                          icon: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
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
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M23 4v6h-6M1 20v-6h6" }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
                              ]
                            }
                          ),
                          children: phase === "loading" ? T("pl.refreshing") : T("pl.refresh")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        import_dsh_client_ui_primitives9.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: plBtn("ghost", "sm"),
                          onClick: startCreate,
                          disabled: editing,
                          children: T("pl.new")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                        import_dsh_client_ui_primitives9.Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: `${plBtn("ghost", "sm")} pl-btn--no-border`,
                          onMouseDown: (e) => e.stopPropagation(),
                          onClick: () => setCollapsed(true),
                          "data-tip": T("pl.close"),
                          icon: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M18 6L6 18M6 6l12 12" }) })
                        }
                      )
                    ] })
                  ]
                }
              ),
              !editing && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { padding: "12px 12px 4px", flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    SearchBox,
                    {
                      inputRef: searchRef,
                      value: query,
                      onChange: setQuery,
                      onSearch: () => setQuery(query),
                      onClear: clearSearch,
                      placeholder: T("pl.search")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    TagFilterBar,
                    {
                      tags: allTags,
                      active: tagFilter,
                      onChange: setTagFilter,
                      allLabel: T("pl.tagFilterAll")
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { ref: scrollRef, className: "pl-scroll", style: { flex: 1, overflow: "auto", marginRight: 2, paddingRight: 4 }, children: [
                  phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { padding: "20px 12px", color: TONE10.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
                  phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { padding: "12px 12px", color: TONE10.red, fontSize: 13 }, children: error }),
                  polishError && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    "div",
                    {
                      style: {
                        padding: "9px 12px",
                        margin: "6px 8px",
                        color: TONE10.red,
                        fontSize: 12,
                        lineHeight: 1.5,
                        textAlign: "center",
                        wordBreak: "break-word",
                        background: `color-mix(in srgb, ${TONE10.red} 8%, transparent)`,
                        border: `1px solid ${TONE10.border}`,
                        borderRadius: 7
                      },
                      children: polishError
                    }
                  ),
                  polish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { style: { fontSize: 13 }, children: T("pl.polishResult") }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closePolish, children: T("pl.close") })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                      "textarea",
                      {
                        value: polishResult,
                        onChange: (e) => setPolishResult(e.target.value),
                        rows: 8,
                        style: { ...inputStyle5, resize: "vertical", minHeight: 220 }
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                        navigator.clipboard.writeText(polishResult).catch(() => {
                        });
                      }, children: T("pl.copy") }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                        if (hasVariables(polishResult)) setPolishInsert(polishResult);
                        else insertText(polishResult);
                      }, children: T("pl.insert") }),
                      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: savePolish, children: T("pl.saveToLibrary") })
                    ] })
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
                    phase === "ready" && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { padding: "16px 12px", color: TONE10.muted, fontSize: 13, textAlign: "center" }, children: T("pl.empty") }),
                    tagGrouped.map(([tag, items]) => {
                      const recentKey = T("pl.sidebar.recent");
                      const isRecentSection = tag === recentKey;
                      const isCollapsed = isRecentSection ? recentCollapsed : !expandedGroups.has(tag);
                      return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                          "div",
                          {
                            className: "pl-group-header",
                            onClick: () => {
                              hover.hide();
                              if (isRecentSection) setRecentCollapsed((v) => !v);
                              else toggleGroup(tag);
                            },
                            style: {
                              padding: "8px 10px 6px",
                              margin: "6px 10px 2px",
                              fontSize: 11,
                              fontWeight: 470,
                              color: TONE10.quiet,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                              userSelect: "none"
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { display: "inline-flex", width: 12, justifyContent: "center", flexShrink: 0 }, children: isRecentSection ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("circle", { cx: "12", cy: "12", r: "9" }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M12 7v5l3 2" })
                              ] }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "svg",
                                {
                                  width: "10",
                                  height: "10",
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: "currentColor",
                                  strokeWidth: "2",
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  style: { transition: "transform .2s ease", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 },
                                  "aria-hidden": "true",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M6 9l6 6 6-6" })
                                }
                              ) }),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "span",
                                {
                                  style: {
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  },
                                  "data-tip": tag,
                                  children: tag
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 10, opacity: 0.6, flexShrink: 0 }, children: T("pl.sidebar.groupCount", { count: items.length }) })
                            ]
                          }
                        ),
                        !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { padding: "2px 10px 8px", display: "flex", flexDirection: "column", gap: 8 }, children: items.map((p) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                          "div",
                          {
                            "data-pl-id": p.id,
                            className: "pl-prompt-card",
                            onClick: hoverEnabled ? hover.hide : void 0,
                            style: {
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { style: {
                                  fontSize: 13,
                                  fontWeight: 460,
                                  flex: "1 1 auto",
                                  minWidth: 0,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }, "data-tip": p.title, children: query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Highlight, { text: clampTitle(p.title), query }) : clampTitle(p.title) }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }, children: [
                                  isRecent(p.id) && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                    "span",
                                    {
                                      "data-tip": T("pl.recentNew"),
                                      style: { width: 8, height: 8, borderRadius: "50%", background: TONE10.mint, display: "inline-block", flexShrink: 0 }
                                    }
                                  ),
                                  p.usageCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: TONE10.quiet, fontSize: 10, whiteSpace: "nowrap" }, children: T("pl.sidebar.usageCount", { count: p.usageCount }) })
                                ] })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                "pre",
                                {
                                  onMouseEnter: hoverEnabled ? (e) => {
                                    e.currentTarget.style.background = "rgba(142, 197, 255, 0.08)";
                                    showDetail(p, e.currentTarget.getBoundingClientRect().top);
                                  } : void 0,
                                  onMouseLeave: hoverEnabled ? (e) => {
                                    e.currentTarget.style.background = "transparent";
                                    hover.leave();
                                  } : void 0,
                                  onClick: hoverEnabled ? hover.hide : void 0,
                                  style: {
                                    margin: 0,
                                    padding: "8px 10px",
                                    color: TONE10.quiet,
                                    fontSize: 11,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    fontFamily: MONO11,
                                    lineHeight: 1.55,
                                    maxHeight: 96,
                                    overflow: "hidden",
                                    borderRadius: 6,
                                    cursor: hoverEnabled ? "pointer" : "default",
                                    transition: "background 0.15s ease"
                                  },
                                  children: query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Highlight, { text: p.body, query }) : p.body
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: () => insert(p), children: T("pl.insert") }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => overwrite(p), children: T("pl.overwrite") }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => copy(p), children: copiedId === p.id ? T("pl.copied") : T("pl.copy") }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setViewing(p), children: T("pl.view") }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => startEdit(p), children: T("pl.edit") }),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                                  import_dsh_client_ui_primitives9.Button,
                                  {
                                    type: "button",
                                    variant: "ghost",
                                    size: "sm",
                                    className: plBtn("ghost", "sm"),
                                    onClick: () => handlePolishClick(p),
                                    disabled: polish.status === "loading",
                                    children: polish.status === "loading" && polish.id === p.id ? T("pl.polishing") : T("pl.polish")
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => remove(p), children: T("pl.delete") })
                              ] })
                            ]
                          },
                          p.id
                        )) })
                      ] }, tag);
                    })
                  ] })
                ] })
              ] }),
              editing && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
                  T("pl.titleField"),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    "input",
                    {
                      value: editor.title,
                      onChange: (e) => setEditor({ ...editor, title: e.target.value }),
                      style: inputStyle5
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                    T("pl.bodyField"),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                      import_dsh_client_ui_primitives9.Button,
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
                          insertVariableAt(bodyRef.current, editor.body, (v) => setEditor({ ...editor, body: v }), t("pl.insertVariableDefault"));
                        },
                        "data-tip": T("pl.insertVariableTitle"),
                        children: `{{${T("pl.insertVariableDefault")}}}`
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    "textarea",
                    {
                      ref: bodyRef,
                      value: editor.body,
                      onChange: (e) => setEditor({ ...editor, body: e.target.value }),
                      rows: 6,
                      style: { ...inputStyle5, resize: "vertical", minHeight: 250 }
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
                  T("pl.tagsField"),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(TagInput, { value: editor.tags, onChange: (v) => setEditor({ ...editor, tags: v }), suggestions: allTags, inputStyle: inputStyle5, t })
                ] }),
                error && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { color: TONE10.red, fontSize: 12 }, children: error }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                    setEditor(NO_EDITOR);
                    setError(null);
                  }, children: T("pl.cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveEditor, children: T("pl.save") })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
                "footer",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    padding: "8px 12px",
                    borderTop: `1px solid ${TONE10.border}`,
                    color: TONE10.muted,
                    fontSize: 11,
                    flexShrink: 0
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { children: T("pl.sidebar.tagTotal", {
                      count: tagGrouped.filter(
                        ([k]) => k !== T("pl.sidebar.recent") && k !== T("pl.sidebar.uncategorized")
                      ).length
                    }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { children: T("pl.sidebar.total", { count: prompts.length }) })
                  ]
                }
              ),
              viewing && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { role: "dialog", "aria-label": T("pl.view"), style: {
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                background: TONE10.panel
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: {
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderBottom: `1px solid ${TONE10.border}`
                }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("strong", { style: {
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }, "data-tip": viewing.title, children: clampTitle(viewing.title) }),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    import_dsh_client_ui_primitives9.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setViewing(null),
                      "data-tip": T("pl.close"),
                      style: { flexShrink: 0 },
                      children: "\u2715"
                    }
                  )
                ] }),
                viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }, children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: {
                  maxWidth: 96,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  padding: "2px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  color: TONE10.accent,
                  background: TONE10.accentSoft
                }, "data-tip": tag, children: tag }, tag)) }),
                viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: {
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "8px 14px 0",
                  boxSizing: "border-box"
                }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }, children: [
                    { value: false, label: T("pl.polished") },
                    { value: true, label: T("pl.original") }
                  ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => setViewShowOriginal(opt.value),
                      style: {
                        cursor: "pointer",
                        padding: "2px 10px",
                        fontSize: 11,
                        fontFamily: MONO11,
                        color: viewShowOriginal === opt.value ? TONE10.accent : TONE10.muted,
                        background: viewShowOriginal === opt.value ? TONE10.accentSoft : "transparent",
                        border: `1px solid ${viewShowOriginal === opt.value ? TONE10.accent : TONE10.border}`,
                        borderRadius: 999
                      },
                      children: opt.label
                    },
                    String(opt.value)
                  )) }),
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
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
                        color: TONE10.text,
                        background: viewShowOriginal ? TONE10.panel : rowBackground(),
                        border: `1px solid ${TONE10.border}`,
                        borderRadius: 6,
                        fontFamily: MONO11,
                        outline: "none",
                        resize: "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        opacity: viewShowOriginal ? 0.75 : 1
                      }
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: {
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: "10px 14px 14px",
                  color: TONE10.text,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }, children: viewing.body }),
                polishError && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: {
                  flexShrink: 0,
                  padding: "4px 14px 0",
                  color: TONE10.red,
                  fontSize: 11,
                  lineHeight: 1.5,
                  wordBreak: "break-word"
                }, children: polishError }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: {
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 14px 12px",
                  borderTop: `1px solid ${TONE10.border}`
                }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: 11, color: viewing.aiRefined ? TONE10.mint : TONE10.quiet, flexShrink: 0 }, children: viewPolish.status === "loading" ? T("pl.polishing") : viewPolish.status === "done" ? T("pl.polishResult") : viewing.aiRefined ? `${"\u2713"} ${T("pl.refinedDone")}` : `${"\u2026"} ${T("pl.refinePending")}` }),
                  viewPolish.status === "loading" ? (
                    // 优化中：不确定进度条动画
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { flex: 1, marginLeft: 8, height: 3, borderRadius: 2, overflow: "hidden", background: TONE10.border }, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: {
                      height: "100%",
                      width: "40%",
                      borderRadius: 2,
                      background: TONE10.accent,
                      animation: "pl-progress 1.2s ease-in-out infinite"
                    } }) })
                  ) : viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                      navigator.clipboard.writeText(viewPolishText).catch(() => {
                      });
                    }, children: T("pl.copy") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                      if (!viewPolishText) return;
                      if (inputActions) {
                        inputActions.setDraft(draft && draft.trim() ? `${draft}

${viewPolishText}` : viewPolishText);
                      } else {
                        navigator.clipboard.writeText(viewPolishText).catch(() => {
                        });
                      }
                      closeView();
                    }, children: T("pl.insert") }),
                    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_dsh_client_ui_primitives9.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveViewPolish, children: T("pl.saveToLibrary") })
                  ] }) : !viewing.aiRefined && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                    import_dsh_client_ui_primitives9.Button,
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
            ]
          }
        ),
        hoverEnabled && hover.overlay,
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          TemplateFillModal,
          {
            open: template !== null || polishInsert !== null,
            variables: polishInsert !== null ? extractVariables(polishInsert) : template ? extractVariables(template.prompt.body) : [],
            body: polishInsert !== null ? polishInsert : template ? template.prompt.body : "",
            onCancel: () => {
              setTemplate(null);
              setPolishInsert(null);
            },
            onConfirm: polishInsert !== null ? applyPolishInsert : applyTemplate,
            onInsertAndSend: insertAndSend,
            showInsertAndSend: polishInsert !== null ? true : template?.mode !== "overwrite",
            confirmLabel: polishInsert !== null ? T("pl.insert") : template?.mode === "overwrite" ? T("pl.overwrite") : T("pl.insert"),
            draftEmpty: !draft?.trim(),
            t: T
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
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
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          ConfirmDialog,
          {
            open: polishConfirm !== null,
            message: T("pl.polishReconfirmMsg", { title: polishConfirm?.title ?? "" }),
            confirmLabel: T("pl.polishReconfirmOk"),
            cancelLabel: T("pl.cancel"),
            onCancel: () => setPolishConfirm(null),
            onConfirm: () => {
              const p = polishConfirm;
              setPolishConfirm(null);
              if (p) startPolish(p);
            }
          }
        )
      ] }),
      document.body
    )
  ] });
}
var inputStyle5 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO11,
  fontSize: 13,
  outline: "none"
};

// src/client/components/selection/SelectionAddPrompt.tsx
var import_react17 = require("react");
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime20 = require("react/jsx-runtime");
var MONO12 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
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
var TONE11 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  panel: "var(--dsw-alias-bg-layer-1, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
var inputStyle6 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE11.text,
  background: "var(--dsw-alias-bg-layer-2, #ffffff)",
  border: `1px solid ${TONE11.border}`,
  borderRadius: 7,
  fontFamily: MONO12,
  fontSize: 13,
  outline: "none"
};
function tplTagChipStyle(active) {
  return {
    padding: "3px 9px",
    borderRadius: 11,
    border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE11.border}`,
    background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #4f9df5) 16%, transparent)" : "var(--dsw-alias-bg-layer-2, #ffffff)",
    color: active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE11.muted,
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
  boxShadow: "none",
  color: TONE11.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.15s"
};
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
  const [selection, setSelection] = (0, import_react17.useState)(null);
  const [open, setOpen] = (0, import_react17.useState)(false);
  const [copied, setCopied] = (0, import_react17.useState)(false);
  const copyingRef = (0, import_react17.useRef)(false);
  const [title, setTitle] = (0, import_react17.useState)("");
  const [body, setBody] = (0, import_react17.useState)("");
  const [tags, setTags] = (0, import_react17.useState)("");
  const bodyRef = (0, import_react17.useRef)(null);
  const [error, setError] = (0, import_react17.useState)(null);
  const [saving, setSaving] = (0, import_react17.useState)(false);
  const [allTags, setAllTags] = (0, import_react17.useState)([]);
  const [prompts, setPrompts] = (0, import_react17.useState)([]);
  const [tplPickerOpen, setTplPickerOpen] = (0, import_react17.useState)(false);
  const [tplText, setTplText] = (0, import_react17.useState)("");
  const [tplPrefill, setTplPrefill] = (0, import_react17.useState)({});
  const [tplPick, setTplPick] = (0, import_react17.useState)(null);
  const [tplQuery, setTplQuery] = (0, import_react17.useState)("");
  const [tplTag, setTplTag] = (0, import_react17.useState)("");
  const loadTags = (0, import_react17.useCallback)(() => {
    if (!enabled) return;
    listTags().then((list) => setAllTags(list.map((t) => t.name).sort())).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadTags);
  (0, import_react17.useEffect)(() => {
    loadTags();
  }, [loadTags]);
  const loadPrompts = (0, import_react17.useCallback)(() => {
    if (!enabled) return;
    listPrompts().then(setPrompts).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadPrompts);
  (0, import_react17.useEffect)(() => {
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
  const applyTpl = (0, import_react17.useCallback)(
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
  const templateTags = (0, import_react17.useMemo)(
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
  (0, import_react17.useEffect)(() => {
    if (!enabled) return;
    const update = () => {
      if (open) {
        setSelection(null);
        return;
      }
      if (copyingRef.current) return;
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
    document.addEventListener("selectionchange", update);
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", update);
    window.addEventListener("scroll", update, true);
    const timer = window.setInterval(() => {
      if (copyingRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) setSelection(null);
    }, 300);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mouseup", update);
      document.removeEventListener("keyup", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(timer);
    };
  }, [enabled, open]);
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
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("style", { children: `
.pl-selection-btn{background:var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))}
.pl-selection-btn:hover{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.12))}
.pl-selection-btn:active{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.18))}
.pl-selection-btn:disabled{opacity:.6;cursor:default}
` }),
    enabled && selection && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
      "div",
      {
        style: {
          position: "fixed",
          left: selection.rect.left + selection.rect.width / 2,
          top: selection.rect.top - 8,
          transform: "translate(-50%, -100%)",
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          gap: 6
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => copySelected(selection.text),
              "data-tip": T("pl.copySelected"),
              style: floatingBtnStyle,
              children: [
                copied ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M20 6 9 17l-5-5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) : /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2", stroke: "currentColor", strokeWidth: "1.8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M5 15V6a2 2 0 0 1 2-2h9", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
                ] }),
                copied ? T("pl.copiedSelected") : T("pl.copySelected")
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => openModal(selection.text),
              "data-tip": T("pl.addToLibrary"),
              style: floatingBtnStyle,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M12 5v14M5 12h14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }),
                T("pl.addToLibrary")
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => openTplPicker(selection.text),
              "data-tip": T("pl.applyTemplateTitle"),
              style: floatingBtnStyle,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M4 6h9v4H4V6Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M4 14h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
                ] }),
                T("pl.applyTemplate")
              ]
            }
          )
        ]
      }
    ),
    enabled && open && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.addToLibrary"),
        className: PL_DIALOG_OVERLAY,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
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
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 6, flexShrink: 0 }, children: T("pl.addToLibrary") }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 9 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE11.muted, flexShrink: 0 }, children: [
                    T("pl.titleField"),
                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), style: inputStyle6 })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE11.muted, flexShrink: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                      T("pl.bodyField"),
                      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                        import_dsh_client_ui_primitives10.Button,
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
                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("textarea", { ref: bodyRef, value: body, onChange: (e) => setBody(e.target.value), rows: 8, style: { ...inputStyle6, resize: "vertical" } })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE11.muted, flexShrink: 0 }, children: [
                    T("pl.tagsField"),
                    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(TagInput, { value: tags, onChange: setTags, suggestions: allTags, inputStyle: inputStyle6, t: props?.t })
                  ] }),
                  error && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { color: TONE11.red, fontSize: 12, flexShrink: 0 }, children: error })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(import_dsh_client_ui_primitives10.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeModal, disabled: saving, children: T("pl.cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(import_dsh_client_ui_primitives10.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: save, disabled: saving, children: saving ? T("pl.saving") : T("pl.save") })
                ] })
              ]
            }
          )
        ]
      }
    ),
    enabled && tplPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.applyTemplate"),
        className: PL_DIALOG_OVERLAY,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("style", { children: PL_DIALOG_CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
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
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 2, flexShrink: 0 }, children: T("pl.applyTemplate") }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { fontSize: 12, color: TONE11.muted, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.applyTemplateDesc", { length: tplText.length }) }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  "div",
                  {
                    style: {
                      boxSizing: "border-box",
                      maxHeight: 84,
                      overflow: "auto",
                      padding: "8px 10px",
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: TONE11.muted,
                      background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                      border: `1px solid ${TONE11.border}`,
                      borderRadius: 7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      flexShrink: 0
                    },
                    children: tplText || " "
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  "input",
                  {
                    autoFocus: true,
                    value: tplQuery,
                    onChange: (e) => setTplQuery(e.target.value),
                    placeholder: T("pl.search"),
                    style: inputStyle6
                  }
                ),
                templateTags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { type: "button", onClick: () => setTplTag(""), style: tplTagChipStyle(tplTag === ""), children: T("pl.tagFilterAll") }),
                  templateTags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 6 }, children: [
                  templates.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { padding: "18px 12px", color: TONE11.muted, fontSize: 13, textAlign: "center" }, children: T("pl.applyTemplateEmpty") }),
                  templates.map((p) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
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
                        border: `1px solid ${TONE11.border}`,
                        background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                        color: TONE11.text,
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
                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { style: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }, children: clampTitle(p.title) }),
                        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: extractVariables(p.body).slice(0, 4).map((v) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                          "span",
                          {
                            style: {
                              fontSize: 10,
                              lineHeight: 1,
                              padding: "3px 6px",
                              borderRadius: 6,
                              color: TONE11.muted,
                              border: `1px solid ${TONE11.border}`,
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
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(import_dsh_client_ui_primitives10.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setTplPickerOpen(false), children: T("pl.cancel") }) })
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
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
var import_dsh_client_ui_primitives11 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime21 = require("react/jsx-runtime");
var TONE12 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))"
};
function Pagination({
  page,
  totalPages,
  onChange
}) {
  if (totalPages <= 1) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
    "div",
    {
      style: {
        padding: "8px 12px",
        borderTop: `1px solid ${TONE12.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { style: { fontSize: 12, color: TONE12.muted }, children: [
          page,
          " / ",
          totalPages
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
            import_dsh_client_ui_primitives11.Button,
            {
              type: "button",
              size: "sm",
              disabled: page <= 1,
              onClick: () => onChange(page - 1),
              style: { color: TONE12.text },
              children: [
                "\u2039",
                " \u4E0A\u4E00\u9875"
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
            import_dsh_client_ui_primitives11.Button,
            {
              type: "button",
              size: "sm",
              disabled: page >= totalPages,
              onClick: () => onChange(page + 1),
              style: { color: TONE12.text },
              children: [
                "\u4E0B\u4E00\u9875 ",
                "\u203A"
              ]
            }
          )
        ] })
      ]
    }
  );
}

// src/client/utils/auto-learn.ts
var import_react18 = require("react");
var AUTO_LEARN_DEBOUNCE_MS = 3e3;
var AUTO_LEARN_TOAST_MS = 2500;
var AUTO_LEARN_UNDO_MS = 8e3;
var LOW_QUALITY_PATTERNS = [
  /^(好的|好|嗯|嗯嗯|噢|ok|okay|收到|谢谢|感谢|辛苦了|了解|明白了|可以|没问题|行|赞|666|厉害|不错|牛|绝了|好的收到|谢谢您)$/i,
  /^(你好|哈喽|hello|hi|嗨|早上好|中午好|下午好|晚上好|在吗)$/i
];
var EMOJI_OR_SYMBOL_RE = /^[\p{So}\p{Po}\p{Pi}\p{Pf}\p{Ps}\p{Pe}\p{Sc}…~！?。，；：、\s]+$/u;
var CLAUSE_BOUNDARY_RE = /[。！？!?；;…]|[\r\n]/g;
var STRUCTURE_HINT_RE = /[#*\-•1-9]\.|【|】|\[|\]|<|>|：|、/;
var INSTRUCTION_HINT_RE = /翻译|总结|概括|摘要|生成|撰写|编写|写|创建|制作|设计|规划|分析|比较|对比|解释|说明|描述|润色|改写|优化|转换|提炼|提取|列举|列出|推荐|建议|评估|判断|分类|整理|修复|调试|代码|脚本|步骤|流程|方案|报告|邮件|论文|文案|大纲|你是|你是一位|你是一个|你扮演|扮演|作为|请|帮我|translate|summar|generat|write|creat|design|analyz|compar|explain|describ|polish|rewrit|optimiz|convert|extract|list|recommend|suggest|evaluat|classif|debug|refactor|script|code|draft|outline|report|email|essay|you are|please/i;
function isLowQuality(text) {
  const t = text.trim();
  if (!t) return true;
  if (EMOJI_OR_SYMBOL_RE.test(t)) return true;
  const compact = t.replace(/\s+/g, "");
  return LOW_QUALITY_PATTERNS.some((re) => re.test(compact));
}
function isLearnWorthy(text, minLength) {
  const t = text.trim();
  if (isLowQuality(t)) return false;
  const meaningful = t.replace(/[\s\p{P}\p{S}]/gu, "").length;
  if (meaningful < minLength) return false;
  const clauseCount = (t.match(CLAUSE_BOUNDARY_RE) ?? []).length;
  const hasStructure = STRUCTURE_HINT_RE.test(t);
  const hasInstruction = INSTRUCTION_HINT_RE.test(t);
  if (clauseCount >= 1 || hasStructure || hasInstruction) return true;
  return meaningful >= Math.max(minLength * 2, 20);
}
function similarity(a, b) {
  const grams = (s) => {
    const set = /* @__PURE__ */ new Set();
    const t = s.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < t.length; i++) set.add(t.slice(i, i + 2));
    if (!t) set.add("");
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  const union = A.size + B.size;
  if (union === 0) return 1;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (union - inter);
}
function isNearDuplicate(text, existingPrompts, threshold = 0.8) {
  const t = text.trim();
  if (!t) return false;
  const tLen = t.length;
  let compared = 0;
  const MAX_COMPARE = 40;
  for (const p of existingPrompts) {
    const b = p.body.trim();
    if (!b) continue;
    const bLen = b.length;
    if (bLen < tLen * 0.5 || bLen > tLen * 2) continue;
    if (compared++ >= MAX_COMPARE) break;
    if (similarity(t, b) >= threshold) return true;
  }
  return false;
}
function useAutoLearn(draft, existingPrompts, settings, onLearned, onManual) {
  const timerRef = (0, import_react18.useRef)(null);
  const submittedRef = (0, import_react18.useRef)(/* @__PURE__ */ new Set());
  const manualActive = !!onManual && settings.autoLearnManualConfirm;
  (0, import_react18.useEffect)(() => {
    if (!settings.autoLearnEnabled) return;
    const text = draft.trim();
    if (!text) return;
    if (!isLearnWorthy(text, settings.autoLearnMinLength)) return;
    const normalized = text.toLowerCase();
    if (submittedRef.current.has(normalized)) return;
    if (existingPrompts.some((p) => p.body.trim().toLowerCase() === normalized)) return;
    if (isNearDuplicate(text, existingPrompts)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      submittedRef.current.add(normalized);
      if (manualActive) {
        onManual?.(text);
        return;
      }
      try {
        const learned = await learnPrompt(text, settings.autoLearnTag);
        markRecent(learned.id);
        onLearned(learned);
      } catch {
      }
    }, AUTO_LEARN_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, existingPrompts, settings.autoLearnEnabled, settings.autoLearnMinLength, settings.autoLearnTag, manualActive, onLearned, onManual]);
  (0, import_react18.useEffect)(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

// src/client/components/chat/PromptLibraryButton.tsx
var import_jsx_runtime22 = require("react/jsx-runtime");
var MONO13 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE13 = {
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
  const activeRef = (0, import_react19.useRef)(false);
  const triggerIdxRef = (0, import_react19.useRef)(-1);
  const draftRef = (0, import_react19.useRef)(draft);
  const inputActionsRef = (0, import_react19.useRef)(inputActions);
  const onSelectRef = (0, import_react19.useRef)(onSelect);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
  onSelectRef.current = onSelect;
  lastPromptsForSelect = prompts;
  (0, import_react19.useEffect)(() => {
    if (!settings.tildaTriggerEnabled) return;
    const tryShowOverlay = (target) => {
      if (activeRef.current) return;
      const el = target;
      if (!el || !(el instanceof HTMLElement)) return;
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
  const filtered = (q ? prompts.filter(
    (p) => `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q)
  ) : prompts).map((p, idx) => ({ p, idx }));
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
    `background: ${TONE13.panel}`,
    `border: 1px solid ${TONE13.borderStrong}`,
    "border-radius: 8px",
    `font-family: ${MONO13}`,
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
      item.style.background = TONE13.accentSoft;
      item.scrollIntoView({ block: "nearest" });
    }
  };
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = q ? t("pl.overlayNoMatch", { query: q }) : t("pl.empty");
    empty.style.cssText = [
      "padding: 10px",
      "font-size: 12px",
      `color: ${TONE13.quiet}`
    ].join(";");
    listBox.appendChild(empty);
  }
  filtered.forEach(({ p, idx }, i) => {
    const item = document.createElement("div");
    item.dataset.promptLibraryItem = "";
    item.dataset.index = String(idx);
    item._prompt = p;
    item.style.cssText = [
      "padding: 6px 10px",
      "cursor: pointer",
      "border-radius: 4px",
      "display: flex",
      "flex-direction: column",
      "gap: 2px",
      i === 0 ? `background: ${TONE13.accentSoft}` : ""
    ].join(";");
    const title = document.createElement("div");
    title.textContent = clampTitle(p.title);
    title.dataset.tip = p.title;
    title.style.cssText = [
      "font-size: 12px",
      "font-weight: 600",
      `color: ${TONE13.text}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis"
    ].join(";");
    const body = document.createElement("div");
    const preview = p.body.replace(/\s+/g, " ").trim();
    body.textContent = preview.length > 80 ? `${preview.slice(0, 80)}\u2026` : preview;
    body.style.cssText = [
      "font-size: 11px",
      `color: ${TONE13.muted}`,
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
    `color: ${TONE13.quiet}`,
    "border-top: 1px solid " + TONE13.border,
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
    next.style.background = TONE13.accentSoft;
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
function useSettings2() {
  const [settings, setSettings] = (0, import_react19.useState)(DEFAULT_SETTINGS);
  const [ready, setReady] = (0, import_react19.useState)(false);
  const load = (0, import_react19.useCallback)(() => {
    getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);
  (0, import_react19.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react19.useEffect)(() => {
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
  const [open, setOpen] = (0, import_react19.useState)(false);
  const [prompts, setPrompts] = (0, import_react19.useState)([]);
  const [deleteConfirm, setDeleteConfirm] = (0, import_react19.useState)(null);
  const [tagNames, setTagNames] = (0, import_react19.useState)([]);
  const [phase, setPhase] = (0, import_react19.useState)("idle");
  const [error, setError] = (0, import_react19.useState)(null);
  const [query, setQuery] = (0, import_react19.useState)("");
  const clearSearch = (0, import_react19.useCallback)(() => setQuery(""), []);
  const [tagFilter, setTagFilter] = (0, import_react19.useState)("");
  const [editor, setEditor] = (0, import_react19.useState)({
    mode: "none",
    title: "",
    body: "",
    tags: ""
  });
  const bodyRef = (0, import_react19.useRef)(null);
  const [toast, setToast] = (0, import_react19.useState)({ visible: false });
  const [template, setTemplate] = (0, import_react19.useState)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react19.useState)(null);
  const [polishConfirmUsed, setPolishConfirmUsed] = (0, import_react19.useState)(false);
  const [polishConfirmLoading, setPolishConfirmLoading] = (0, import_react19.useState)(false);
  const [polishConfirmError, setPolishConfirmError] = (0, import_react19.useState)(null);
  const [viewing, setViewing] = (0, import_react19.useState)(null);
  const [viewPolish, setViewPolish] = (0, import_react19.useState)({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = (0, import_react19.useState)("");
  const [viewShowOriginal, setViewShowOriginal] = (0, import_react19.useState)(false);
  const [viewPolishError, setViewPolishError] = (0, import_react19.useState)(null);
  const closeView = (0, import_react19.useCallback)(() => {
    setViewing(null);
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewShowOriginal(false);
    setViewPolishError(null);
  }, []);
  (0, import_react19.useEffect)(() => {
    if (!open) closeView();
  }, [open, closeView]);
  const [settings] = useSettings2();
  const panelId = (0, import_react19.useId)();
  const refreshController = (0, import_react19.useRef)(null);
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });
  const showToast = (0, import_react19.useCallback)((text, undoId) => {
    setToast({ visible: true, text, undoId });
    setTimeout(() => setToast({ visible: false }), undoId ? AUTO_LEARN_UNDO_MS : AUTO_LEARN_TOAST_MS);
  }, []);
  const refresh = (0, import_react19.useCallback)(() => {
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
  useExportDownloaded((0, import_react19.useCallback)((count) => {
    showToast(T("pl.exported", { count }));
  }, [showToast, T]));
  useAutoLearn(
    draft,
    prompts,
    settings,
    (0, import_react19.useCallback)((learned) => {
      notifyDataChanged();
      showToast(void 0, learned.id);
      if (!settings.aiEnrichEnabled) return;
      const started = Date.now();
      const maxWaitMs = 6e4;
      const timer = setInterval(async () => {
        if (Date.now() - started > maxWaitMs) {
          clearInterval(timer);
          return;
        }
        try {
          const list = await listPrompts();
          const updated = list.find((p) => p.id === learned.id);
          if (updated?.aiRefined) {
            clearInterval(timer);
            setPrompts(list);
            notifyDataChanged();
          }
        } catch {
        }
      }, 4e3);
    }, [showToast, settings.aiEnrichEnabled]),
    // 手动确认模式回调：学习到正文后不自动保存，交由界面弹出保存/取消
    (0, import_react19.useCallback)((text) => {
      setPendingConfirm({ text, original: text, showOriginal: false });
      setPolishConfirmUsed(false);
    }, [])
  );
  (0, import_react19.useEffect)(() => {
    if (phase === "idle") refresh();
  }, [phase, refresh]);
  (0, import_react19.useEffect)(() => {
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
  const filtered = (0, import_react19.useMemo)(() => {
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
  const [page, setPage] = (0, import_react19.useState)(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  (0, import_react19.useEffect)(() => {
    setPage(1);
  }, [query, tagFilter, prompts]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allTags = (0, import_react19.useMemo)(() => {
    const s = new Set(tagNames);
    for (const p of prompts) for (const t2 of p.tags ?? []) s.add(t2);
    return Array.from(s).sort();
  }, [prompts, tagNames]);
  const insert = (0, import_react19.useCallback)(
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
  const selectFromOverlay = (0, import_react19.useCallback)(
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
  const overwrite = (0, import_react19.useCallback)(
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
  const applyTemplate = (0, import_react19.useCallback)(
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
  const insertAndSend = (0, import_react19.useCallback)(
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
  const NO_EDITOR2 = { mode: "none", title: "", body: "", tags: "" };
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
      setEditor(NO_EDITOR2);
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
  (0, import_react19.useEffect)(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      const t2 = e.target;
      if (!(t2 instanceof HTMLElement)) return;
      const panel = document.getElementById(panelId);
      if (panel && panel.contains(t2)) return;
      if (t2.closest("[data-prompt-library]")) return;
      if (editing || pendingConfirm !== null || viewing) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [open, editing, pendingConfirm, viewing, panelId]);
  const confirmLearn = (0, import_react19.useCallback)(async () => {
    const item = pendingConfirm;
    if (!item) return;
    setPendingConfirm(null);
    try {
      const text = (item.showOriginal ? item.original : item.text).trim();
      const learned = await learnPrompt(text, settings.autoLearnTag, polishConfirmUsed);
      setPolishConfirmUsed(false);
      markRecent(learned.id);
      notifyDataChanged();
      showToast();
    } catch {
    }
  }, [pendingConfirm, settings.autoLearnTag, showToast, polishConfirmUsed]);
  const cancelLearn = (0, import_react19.useCallback)(() => {
    setPendingConfirm(null);
    setPolishConfirmLoading(false);
    setPolishConfirmUsed(false);
  }, []);
  const polishLearnText = (0, import_react19.useCallback)(async () => {
    if (!pendingConfirm || polishConfirmLoading) return;
    setPolishConfirmLoading(true);
    setPolishConfirmError(null);
    try {
      const res = await polishPrompt(pendingConfirm.text);
      setPendingConfirm((prev) => prev ? { ...prev, text: res.polished, showOriginal: false } : prev);
      setPolishConfirmUsed(true);
    } catch (e) {
      setPolishConfirmError(e instanceof Error ? e.message : String(e));
    } finally {
      setPolishConfirmLoading(false);
    }
  }, [pendingConfirm, polishConfirmLoading]);
  const undoLearn = (0, import_react19.useCallback)(async () => {
    const id = toast.undoId;
    setToast({ visible: false });
    if (!id) return;
    try {
      await deletePrompt(id);
      notifyDataChanged();
    } catch {
    }
  }, [toast.undoId]);
  const startViewPolish = (0, import_react19.useCallback)(async () => {
    if (!viewing || viewPolish.status === "loading") return;
    setViewPolish({ status: "loading", id: viewing.id });
    setViewShowOriginal(false);
    setViewPolishError(null);
    try {
      const res = await polishPrompt(viewing.body);
      setViewPolishText(res.polished);
      setViewPolish({ status: "done", id: viewing.id });
    } catch (e) {
      setViewPolish({ status: "idle", id: "" });
      setViewPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [viewing, viewPolish.status]);
  const saveViewPolish = (0, import_react19.useCallback)(async () => {
    if (viewPolish.status !== "done" || !viewing) return;
    const body = viewPolishText.trim();
    if (!body) return;
    try {
      const updated = await updatePrompt(viewing.id, {
        body,
        sourceBody: viewing.body !== body ? viewing.body : void 0,
        aiRefined: true
      });
      setViewing(updated);
      setPrompts((list) => list.map((p) => p.id === updated.id ? updated : p));
      setViewPolish({ status: "idle", id: "" });
      setViewPolishText("");
      setViewShowOriginal(false);
      notifyDataChanged();
    } catch {
    }
  }, [viewPolish.status, viewPolishText, viewing]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO13
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
    color: TONE13.text,
    background: TONE13.panel,
    border: `1px solid ${TONE13.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO13
  };
  const showComposerButton = settings.showComposerButton;
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("span", { "data-prompt-library": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: `@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: `@keyframes pl-progress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: PL_BUTTON_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: `.pl-btn.pl-cbn-btn{border:none;background:var(--dsw-alias-bg-layer-2,#ffffff);box-shadow:none}.pl-btn.pl-cbn-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.pl-btn.pl-cbn-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}` }),
    showComposerButton && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(import_jsx_runtime22.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
        import_dsh_client_ui_primitives12.Button,
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
          icon: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "path",
              {
                d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z",
                stroke: "currentColor",
                strokeWidth: "1.6",
                strokeLinejoin: "round"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
          ] }),
          children: [
            !settings.composerButtonIconOnly && T("pl.title"),
            !settings.composerButtonIconOnly && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: {
              marginLeft: 2,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
          ]
        }
      ),
      toast.visible && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
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
            color: TONE13.panel,
            background: TONE13.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO13,
            whiteSpace: "nowrap",
            // 有撤销按钮时需可点击；纯提示时穿透不挡点击
            pointerEvents: toast.undoId ? "auto" : "none",
            opacity: 0.94,
            zIndex: 1001
          },
          children: [
            "\u2713 ",
            toast.text || T("pl.learnedToast"),
            toast.undoId && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                onMouseDown: (e) => e.stopPropagation(),
                onClick: undoLearn,
                style: {
                  cursor: "pointer",
                  padding: "1px 8px",
                  color: "inherit",
                  background: "rgba(0,0,0,0.14)",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: MONO13,
                  lineHeight: "16px"
                },
                children: T("pl.undo")
              }
            )
          ]
        }
      ),
      pendingConfirm !== null && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
        "span",
        {
          role: "dialog",
          "aria-label": T("pl.confirmSave"),
          style: {
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            zIndex: 1002,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: 300,
            boxSizing: "border-box",
            padding: "10px 12px",
            color: TONE13.text,
            background: TONE13.panel,
            border: `1px solid ${TONE13.borderStrong}`,
            borderRadius: 10,
            fontFamily: MONO13
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { fontSize: 12, fontWeight: 600 }, children: T("pl.learnFound") }),
            pendingConfirm.original !== pendingConfirm.text && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [
              { value: false, label: T("pl.polished") },
              { value: true, label: T("pl.original") }
            ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setPendingConfirm((prev) => prev ? { ...prev, showOriginal: opt.value } : prev),
                style: {
                  cursor: "pointer",
                  padding: "2px 10px",
                  fontSize: 11,
                  fontFamily: MONO13,
                  color: pendingConfirm.showOriginal === opt.value ? TONE13.accent : TONE13.muted,
                  background: pendingConfirm.showOriginal === opt.value ? TONE13.accentSoft : "transparent",
                  border: `1px solid ${pendingConfirm.showOriginal === opt.value ? TONE13.accent : TONE13.border}`,
                  borderRadius: 999
                },
                children: opt.label
              },
              String(opt.value)
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "textarea",
              {
                value: pendingConfirm.showOriginal ? pendingConfirm.original : pendingConfirm.text,
                readOnly: pendingConfirm.showOriginal,
                onChange: (e) => setPendingConfirm((prev) => prev ? { ...prev, text: e.target.value } : prev),
                style: {
                  maxHeight: 300,
                  minHeight: 96,
                  resize: "vertical",
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: TONE13.text,
                  background: pendingConfirm.showOriginal ? TONE13.panel : rowBackground(),
                  border: `1px solid ${TONE13.border}`,
                  borderRadius: 6,
                  fontFamily: MONO13,
                  outline: "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  opacity: pendingConfirm.showOriginal ? 0.75 : 1
                }
              }
            ),
            polishConfirmError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { color: TONE13.red, fontSize: 11, lineHeight: 1.5, wordBreak: "break-word" }, children: T("pl.polishFail") }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                import_dsh_client_ui_primitives12.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: plBtn("ghost", "sm"),
                  onClick: polishLearnText,
                  disabled: polishConfirmLoading,
                  "data-tip": polishConfirmLoading ? T("pl.polishLoadingTitle") : T("pl.polishBtnTitle"),
                  children: polishConfirmLoading ? T("pl.polishing") : T("pl.polish")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: cancelLearn,
                    children: T("pl.cancel")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    onClick: confirmLearn,
                    children: T("pl.save")
                  }
                )
              ] })
            ] })
          ]
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_jsx_runtime22.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("section", { id: panelId, role: "dialog", "aria-label": T("pl.title"), style: panelStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
          "header",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${TONE13.border}`,
              flexShrink: 0
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("strong", { style: { fontSize: 14, fontWeight: 470, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: T("pl.title") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: refresh,
                    disabled: phase === "loading",
                    "data-tip": phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M23 4v6h-6M1 20v-6h6" }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
                        ]
                      }
                    ),
                    children: phase === "loading" ? T("pl.refreshing") : T("pl.refresh")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
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
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: `${plBtn("ghost", "sm")} pl-btn--no-border`,
                    onClick: () => setOpen(false),
                    "data-tip": T("pl.close"),
                    "aria-label": T("pl.close"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
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
                        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M18 6L6 18M6 6l12 12" })
                      }
                    )
                  }
                )
              ] })
            ]
          }
        ),
        !editing && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { padding: "10px 16px 4px", flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            SearchBox,
            {
              value: query,
              onChange: setQuery,
              onSearch: () => setQuery(query),
              onClear: clearSearch,
              placeholder: T("pl.search")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            TagFilterBar,
            {
              tags: allTags,
              active: tagFilter,
              onChange: setTagFilter,
              allLabel: T("pl.tagFilterAll")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { flex: 1, overflow: "auto", minHeight: 0 }, children: [
          phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { padding: "20px 16px", color: TONE13.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
          phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { padding: "12px 16px", color: TONE13.red, fontSize: 13 }, children: error }),
          editing ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE13.muted }, children: [
              T("pl.titleField"),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  value: editor.title,
                  onChange: (e) => setEditor({ ...editor, title: e.target.value }),
                  style: inputStyle7
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE13.muted }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                T("pl.bodyField"),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  import_dsh_client_ui_primitives12.Button,
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
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  ref: bodyRef,
                  value: editor.body,
                  onChange: (e) => setEditor({ ...editor, body: e.target.value }),
                  rows: 6,
                  style: { ...inputStyle7, resize: "vertical", minHeight: 90 }
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE13.muted }, children: [
              T("pl.tagsField"),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(TagInput, { value: editor.tags, onChange: (v) => setEditor({ ...editor, tags: v }), suggestions: allTags, inputStyle: inputStyle7, t })
            ] }),
            error && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { color: TONE13.red, fontSize: 12 }, children: error })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("ul", { style: { listStyle: "none", margin: 0, padding: "4px 8px 8px" }, children: [
            phase === "ready" && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("li", { style: { padding: "18px 12px", color: TONE13.muted, fontSize: 13, textAlign: "center" }, children: T("pl.empty") }),
            pageItems.map((p) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
              "li",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "7px 10px",
                  marginBottom: 4,
                  borderRadius: 8,
                  background: TONE13.row,
                  border: `1px solid ${TONE13.border}`,
                  transition: "background-color .18s ease, border-color .18s ease"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                  e.currentTarget.style.borderColor = TONE13.borderStrong;
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = TONE13.row;
                  e.currentTarget.style.borderColor = TONE13.border;
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
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
                    isRecent(p.id) && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "span",
                      {
                        "data-tip": T("pl.recentNew"),
                        style: { width: 7, height: 7, borderRadius: "50%", background: TONE13.mint, display: "inline-block", flexShrink: 0 }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      style: {
                        color: TONE13.muted,
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: p.body.replace(/\s+/g, " ").trim()
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: { display: "flex", gap: 4, alignItems: "center", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }, children: (p.tags ?? []).slice(0, 3).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "span",
                      {
                        "data-tip": tag,
                        style: {
                          flexShrink: 0,
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "2px 6px",
                          borderRadius: 8,
                          color: TONE13.quiet,
                          border: `1px solid ${TONE13.border}`,
                          whiteSpace: "nowrap",
                          maxWidth: 96,
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        },
                        children: tag
                      },
                      tag
                    )) }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("span", { style: { display: "flex", gap: 4, flexShrink: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: () => insert(p), children: T("pl.insert") }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => overwrite(p), children: T("pl.overwrite") }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setViewing(p), children: T("pl.view") }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => startEdit(p), children: T("pl.edit") }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => remove(p), children: T("pl.delete") })
                    ] })
                  ] })
                ]
              },
              p.id
            ))
          ] })
        ] }),
        editing && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
          "div",
          {
            style: {
              flexShrink: 0,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              padding: "12px 16px",
              borderTop: `1px solid ${TONE13.border}`
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                setEditor(NO_EDITOR2);
                setError(null);
              }, children: T("pl.cancel") }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveEditor, children: T("pl.save") })
            ]
          }
        ),
        !editing && phase === "ready" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Pagination, { page, totalPages, onChange: setPage }),
        viewing && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { role: "dialog", "aria-label": T("pl.view"), style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: TONE13.panel
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: `1px solid ${TONE13.border}`
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("strong", { style: {
              flex: "1 1 auto",
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }, "data-tip": viewing.title, children: clampTitle(viewing.title) }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              import_dsh_client_ui_primitives12.Button,
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
          viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }, children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: {
            padding: "2px 8px",
            borderRadius: 8,
            fontSize: 11,
            color: TONE13.accent,
            background: TONE13.accentSoft,
            whiteSpace: "nowrap"
          }, children: tag }, tag)) }),
          viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: {
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 14px 0",
            boxSizing: "border-box"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }, children: [
              { value: false, label: T("pl.polished") },
              { value: true, label: T("pl.original") }
            ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setViewShowOriginal(opt.value),
                style: {
                  cursor: "pointer",
                  padding: "2px 10px",
                  fontSize: 11,
                  fontFamily: MONO13,
                  color: viewShowOriginal === opt.value ? TONE13.accent : TONE13.muted,
                  background: viewShowOriginal === opt.value ? TONE13.accentSoft : "transparent",
                  border: `1px solid ${viewShowOriginal === opt.value ? TONE13.accent : TONE13.border}`,
                  borderRadius: 999
                },
                children: opt.label
              },
              String(opt.value)
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
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
                  color: TONE13.text,
                  background: viewShowOriginal ? TONE13.panel : rowBackground(),
                  border: `1px solid ${TONE13.border}`,
                  borderRadius: 6,
                  fontFamily: MONO13,
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  opacity: viewShowOriginal ? 0.75 : 1
                }
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: {
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "10px 14px 14px",
            color: TONE13.text,
            fontSize: 12.5,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }, children: viewing.body }),
          viewPolishError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: {
            flexShrink: 0,
            padding: "4px 14px 0",
            color: TONE13.red,
            fontSize: 11,
            lineHeight: 1.5,
            wordBreak: "break-word"
          }, children: T("pl.polishFail") }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 14px 12px",
            borderTop: `1px solid ${TONE13.border}`
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { style: { fontSize: 11, color: viewing.aiRefined ? TONE13.mint : TONE13.quiet, flexShrink: 0 }, children: viewPolish.status === "loading" ? T("pl.polishing") : viewPolish.status === "done" ? T("pl.polishResult") : viewing.aiRefined ? `${"\u2713"} ${T("pl.refinedDone")}` : `${"\u2026"} ${T("pl.refinePending")}` }),
            viewPolish.status === "loading" ? (
              // 优化中：不确定进度条动画
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { flex: 1, marginLeft: 8, height: 3, borderRadius: 2, overflow: "hidden", background: TONE13.border }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: {
                height: "100%",
                width: "40%",
                borderRadius: 2,
                background: TONE13.accent,
                animation: "pl-progress 1.2s ease-in-out infinite"
              } }) })
            ) : viewPolish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                navigator.clipboard.writeText(viewPolishText).catch(() => {
                });
              }, children: T("pl.copy") }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                if (!viewPolishText) return;
                inputActions.setDraft(draft && draft.trim() ? `${draft}

${viewPolishText}` : viewPolishText);
                closeView();
              }, children: T("pl.insert") }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveViewPolish, children: T("pl.saveToLibrary") })
            ] }) : !viewing.aiRefined && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              import_dsh_client_ui_primitives12.Button,
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
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(SidebarPromptLibrary, { inputActions, draft, t }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(SelectionAddPrompt, { t, enabled: settings.selectionAddEnabled, inputActions, draft }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
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
var inputStyle7 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO13,
  fontSize: 13,
  outline: "none"
};

// src/client/components/chat/AIPolishButton.tsx
var import_react20 = require("react");
var import_dsh_client_ui_primitives13 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime23 = require("react/jsx-runtime");
var MONO14 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE14 = {
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
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
      style: { animation: spinning ? "pl-polish-spin 0.9s linear infinite" : "none" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          "path",
          {
            d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z",
            stroke: "currentColor",
            strokeWidth: "1.6",
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
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
function useSettings3() {
  const [settings, setSettings] = (0, import_react20.useState)(DEFAULT_SETTINGS);
  const load = (0, import_react20.useCallback)(() => {
    getSettings().then(setSettings).catch(() => {
    });
  }, []);
  (0, import_react20.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react20.useEffect)(() => {
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
  const settings = useSettings3();
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });
  const [status, setStatus] = (0, import_react20.useState)("idle");
  const [result, setResult] = (0, import_react20.useState)("");
  const [original, setOriginal] = (0, import_react20.useState)("");
  const [showOriginal, setShowOriginal] = (0, import_react20.useState)(false);
  const [error, setError] = (0, import_react20.useState)("");
  const [toast, setToast] = (0, import_react20.useState)("");
  (0, import_react20.useEffect)(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  const showToast = (0, import_react20.useCallback)((msg) => setToast(msg), []);
  const closeResult = (0, import_react20.useCallback)(() => {
    setStatus("idle");
    setResult("");
    setOriginal("");
    setShowOriginal(false);
    setError("");
  }, []);
  const handlePolish = (0, import_react20.useCallback)(() => {
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
      showToast(T("pl.polishDoneLearn"));
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      showToast(T("pl.polishFail"));
    });
  }, [draft, showToast, T]);
  const applyResult = (0, import_react20.useCallback)(() => {
    if (!result) return;
    inputActions.setDraft(result);
    showToast(T("pl.polishReplaced"));
    closeResult();
  }, [result, inputActions, showToast, closeResult, T]);
  const copyResult = (0, import_react20.useCallback)(() => {
    navigator.clipboard.writeText(result).catch(() => {
    });
    showToast(T("pl.copied"));
  }, [result, showToast, T]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO14
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
    color: TONE14.text,
    background: TONE14.panel,
    border: `1px solid ${TONE14.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO14
  };
  if (!settings.showAIPolishButton) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { "data-prompt-library-ai-polish": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: PL_BUTTON_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: `.pl-btn.pl-cbn-btn{border:none;box-shadow:none}` }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: `@keyframes pl-polish-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      import_dsh_client_ui_primitives13.Button,
      {
        type: "button",
        variant: "ghost",
        size: "sm",
        className: `${plBtn("ghost", "sm")} pl-cbn-btn`,
        onClick: handlePolish,
        disabled: status === "polishing" || !draft.trim(),
        "data-tip": status === "polishing" ? T("pl.polishLoadingTitle") : draft.trim() ? T("pl.polishHoverContent") : T("pl.polishEmpty"),
        "aria-label": T("pl.polish"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(SparkleIcon, { spinning: status === "polishing" }),
        children: !settings.aiPolishButtonIconOnly && (status === "polishing" ? T("pl.polishing") : T("pl.polish"))
      }
    ),
    toast && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        style: {
          position: "absolute",
          bottom: "calc(100% + 4px)",
          right: 0,
          padding: "4px 10px",
          color: TONE14.panel,
          background: status === "error" ? TONE14.red : TONE14.mint,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: MONO14,
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
    status === "done" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_jsx_runtime23.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { role: "dialog", "aria-label": T("pl.polishResult"), style: panelStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("strong", { style: { fontSize: 13, fontWeight: 470 }, children: T("pl.polishResult") }),
        error && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { style: { color: TONE14.red, fontSize: 11 }, children: error })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [
        { value: false, label: T("pl.polished") },
        { value: true, label: T("pl.original") }
      ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setShowOriginal(opt.value),
          style: {
            cursor: "pointer",
            padding: "2px 10px",
            fontSize: 11,
            fontFamily: MONO14,
            color: showOriginal === opt.value ? TONE14.accent : TONE14.muted,
            background: showOriginal === opt.value ? TONE14.accentSoft : "transparent",
            border: `1px solid ${showOriginal === opt.value ? TONE14.accent : TONE14.border}`,
            borderRadius: 999
          },
          children: opt.label
        },
        String(opt.value)
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
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
            color: TONE14.text,
            background: showOriginal ? TONE14.panel : rowBackground(),
            border: `1px solid ${TONE14.border}`,
            borderRadius: 7,
            fontFamily: MONO14,
            fontSize: 12,
            outline: "none",
            opacity: showOriginal ? 0.75 : 1
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: copyResult, children: T("pl.copy") }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeResult, children: T("pl.close") }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_dsh_client_ui_primitives13.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: applyResult, children: T("pl.replaceContent") })
      ] })
    ] }) })
  ] });
}

// src/client/components/chat/ContextRecommendations.tsx
var import_react21 = require("react");
var import_jsx_runtime24 = require("react/jsx-runtime");
var MONO15 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE15 = {
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
  const [enabled, setEnabled] = (0, import_react21.useState)(false);
  (0, import_react21.useEffect)(() => {
    getSettings().then((s) => setEnabled(!!s.contextRecommendEnabled)).catch(() => {
    });
  }, []);
  (0, import_react21.useEffect)(() => {
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
  const nodes = useSession?.((s) => s.chat.legacy.nodes);
  const draft = useInput?.((s) => s.draft) ?? "";
  const userText = (0, import_react21.useMemo)(() => {
    if (!nodes) return "";
    const users = nodes.filter((n) => n.kind === "user");
    return users.slice(-CONTEXT_USER_COUNT).map((n) => textOf(n.content)).join("\n").trim();
  }, [nodes]);
  const [prompts, setPrompts] = (0, import_react21.useState)([]);
  const refresh = (0, import_react21.useCallback)(() => {
    listPrompts().then(setPrompts).catch(() => {
    });
  }, []);
  (0, import_react21.useEffect)(() => {
    refresh();
  }, [refresh]);
  useDataChanged(refresh);
  const keywordText = (0, import_react21.useMemo)(() => {
    const parts = [];
    if (draft.trim()) parts.push(draft);
    if (userText) parts.push(userText);
    return parts.join("\n").trim();
  }, [draft, userText]);
  const hits = (0, import_react21.useMemo)(() => {
    if (!enabled) return [];
    const now = Date.now();
    if (!keywordText) {
      const fallbackScore = (p) => {
        const freq = p.usageCount > 0 ? Math.log(1 + p.usageCount) / Math.log(11) : 0;
        const fresh = p.lastUsedAt > 0 && now - p.lastUsedAt < FRESH_MS ? 1 : 0;
        return freq * 0.6 + fresh * 0.4;
      };
      return prompts.filter((p) => p.usageCount > 0 || p.lastUsedAt > 0 && now - p.lastUsedAt < FRESH_MS).map((p) => ({ p, score: fallbackScore(p) })).sort((a, b) => b.score - a.score).slice(0, LIMIT).map((x) => x.p);
    }
    const kw = extractKeywords(keywordText);
    if (kw.size === 0) return [];
    return prompts.map((p) => ({ p, score: scorePrompt(p, kw, now) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, LIMIT).map((x) => x.p);
  }, [enabled, keywordText, prompts]);
  const [template, setTemplate] = (0, import_react21.useState)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(import_jsx_runtime24.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
      "div",
      {
        style: {
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 var(--dsh-composer-side-clearance, 16px)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(
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
              fontFamily: MONO15,
              fontSize: 12,
              color: TONE15.muted,
              overflow: "hidden"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: TONE15.quiet }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color: TONE15.accent }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
                    "path",
                    {
                      d: "M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4",
                      stroke: "currentColor",
                      strokeWidth: "1.8",
                      strokeLinecap: "round"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("circle", { cx: "12", cy: "12", r: "3.2", stroke: "currentColor", strokeWidth: "1.8" })
                ] }),
                T("pl.recommend")
              ] }),
              hits.map((p) => /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(
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
                    border: `1px solid ${TONE15.border}`,
                    borderRadius: 13,
                    background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                    color: TONE15.text,
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
                    e.currentTarget.style.borderColor = TONE15.border;
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { style: { flexShrink: 0, color: TONE15.accent, display: "inline-flex" }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("path", { d: "M4 6h9v4H4V6Zm0 8h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: clampTitle(p.title) })
                  ]
                },
                p.id
              ))
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
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

// src/client/components/settings/SettingsSection.tsx
var import_react23 = require("react");
var import_dsh_client_ui_primitives15 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/version.ts
var PLUGIN_VERSION = "0.9.0" ? "0.9.0" : "0.0.0";

// src/client/components/settings/modules/BackupModule.tsx
var import_react22 = require("react");
var import_dsh_client_ui_primitives14 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime25 = require("react/jsx-runtime");
var MONO16 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE16 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var moduleStyle = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE16.panel,
  border: `1px solid ${TONE16.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12
};
var moduleTitleStyle = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE16.text
};
var moduleDescStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE16.quiet
};
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatBackupTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function ModuleCard(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("section", { style: moduleStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { style: moduleTitleStyle, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { style: moduleDescStyle, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 16 16",
              style: {
                flexShrink: 0,
                color: TONE16.muted,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)"
              },
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children })
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
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { style: { display: "flex", flexDirection: "column", gap: 2, flex: 1, opacity: dim }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet }, children: desc })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
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
              accentColor: TONE16.accent
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
  const clamp2 = (v) => {
    if (Number.isNaN(v)) return defaultValue ?? min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };
  const dim = disabled ? 0.45 : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { style: { fontSize: 11, color: TONE16.quiet }, children: [
            min,
            "-",
            max
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
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
              if (!disabled) onChange(clamp2(value));
            },
            style: {
              width: 80,
              padding: "4px 6px",
              color: TONE16.text,
              background: TONE16.row,
              border: `1px solid ${TONE16.border}`,
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
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { style: { padding: "8px 0", opacity: dim }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
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
                color: TONE16.text,
                background: TONE16.row,
                border: `1px solid ${TONE16.border}`,
                borderRadius: 5,
                fontFamily: MONO16,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "pointer"
              },
              children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { value: opt.value, children: opt.label }, opt.value))
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { style: { fontSize: 11, color: TONE16.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
}
function BackupModule(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [draft, setDraft] = (0, import_react22.useState)(DEFAULT_SETTINGS);
  const [open, setOpen] = (0, import_react22.useState)(false);
  const [backups, setBackups] = (0, import_react22.useState)([]);
  const [backuping, setBackuping] = (0, import_react22.useState)(false);
  const [backupMsg, setBackupMsg] = (0, import_react22.useState)(null);
  const [restoreTarget, setRestoreTarget] = (0, import_react22.useState)(null);
  const [restoring, setRestoring] = (0, import_react22.useState)(false);
  const [deleteTarget, setDeleteTarget] = (0, import_react22.useState)(null);
  const [deleting, setDeleting] = (0, import_react22.useState)(false);
  const saveTimerRef = (0, import_react22.useRef)(null);
  (0, import_react22.useEffect)(() => {
    getSettings().then((s) => setDraft(s)).catch(() => {
    });
  }, []);
  const saveSettings = (0, import_react22.useCallback)((next) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateSettings(next).then(() => {
        window.dispatchEvent(new CustomEvent("pl:settings-changed", { detail: next }));
      }).catch(() => {
      });
    }, 300);
  }, []);
  const updateAndSave = (0, import_react22.useCallback)((patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);
  const refreshBackups = (0, import_react22.useCallback)(() => {
    listBackups().then(
      (list) => setBackups(list),
      () => setBackups([])
    );
  }, []);
  (0, import_react22.useEffect)(() => {
    if (open) refreshBackups();
  }, [open, refreshBackups]);
  const handleBackupNow = (0, import_react22.useCallback)(async () => {
    setBackuping(true);
    setBackupMsg(null);
    try {
      const res = await runBackup(draft.backupFormat);
      setBackupMsg({ text: T("pl.set.backupDone", { name: res.name }) });
      refreshBackups();
    } catch {
      setBackupMsg({ text: T("pl.set.backupFail"), error: true });
    } finally {
      setBackuping(false);
    }
  }, [T, refreshBackups, draft.backupFormat]);
  const handleRestore = (0, import_react22.useCallback)(async () => {
    if (!restoreTarget || restoring) return;
    setRestoring(true);
    setBackupMsg(null);
    try {
      const res = await restoreBackup(restoreTarget.name);
      setRestoreTarget(null);
      setBackupMsg({ text: T("pl.set.restoreDone", { count: res.count, format: res.format }) });
      refreshBackups();
      notifyDataChanged();
    } catch (e) {
      setRestoreTarget(null);
      setBackupMsg({
        text: e instanceof Error ? e.message : T("pl.set.restoreFail"),
        error: true
      });
    } finally {
      setRestoring(false);
    }
  }, [restoreTarget, restoring, T, refreshBackups]);
  const handleDelete = (0, import_react22.useCallback)(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setBackupMsg(null);
    try {
      await deleteBackup(deleteTarget.name);
      setDeleteTarget(null);
      setBackupMsg({ text: T("pl.set.backupDeleteDone", { name: deleteTarget.name }) });
      refreshBackups();
    } catch (e) {
      setDeleteTarget(null);
      setBackupMsg({
        text: T("pl.set.backupDeleteFail", {
          err: e instanceof Error ? e.message : String(e)
        }),
        error: true
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, T, refreshBackups]);
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
      ModuleCard,
      {
        title: T("pl.setModuleBackup"),
        desc: T("pl.setModuleBackupDesc"),
        open,
        onToggle: () => setOpen((v) => !v),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            ToggleRow,
            {
              label: T("pl.set.backupEnabled"),
              desc: T("pl.set.backupEnabledDesc"),
              checked: draft.backupEnabled,
              onChange: (v) => updateAndSave({ backupEnabled: v })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
            "div",
            {
              style: {
                marginLeft: 22,
                display: "flex",
                flexDirection: "column"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                  SelectRow,
                  {
                    label: T("pl.set.backupSchedule"),
                    value: draft.backupSchedule,
                    options: [
                      { value: "daily", label: T("pl.set.backupScheduleDaily") },
                      { value: "weekly", label: T("pl.set.backupScheduleWeekly") },
                      { value: "monthly", label: T("pl.set.backupScheduleMonthly") }
                    ],
                    desc: T("pl.set.backupScheduleDesc"),
                    disabled: !draft.backupEnabled,
                    onChange: (v) => updateAndSave({ backupSchedule: v })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                  NumberRow,
                  {
                    label: T("pl.set.backupRetention"),
                    value: draft.backupRetention,
                    min: 1,
                    max: 30,
                    step: 1,
                    defaultValue: DEFAULT_SETTINGS.backupRetention,
                    disabled: !draft.backupEnabled,
                    onChange: (v) => updateAndSave({ backupRetention: v })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                  SelectRow,
                  {
                    label: T("pl.set.backupFormat"),
                    value: draft.backupFormat,
                    options: [
                      { value: "db", label: T("pl.set.backupFormatDb") },
                      { value: "json", label: T("pl.set.backupFormatJson") }
                    ],
                    desc: T("pl.set.backupFormatDesc"),
                    disabled: !draft.backupEnabled,
                    onChange: (v) => updateAndSave({ backupFormat: v })
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "8px 0"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 13 }, children: T("pl.set.backupListTitle") }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                    import_dsh_client_ui_primitives14.Button,
                    {
                      type: "button",
                      variant: "primary",
                      size: "sm",
                      className: plBtn("primary", "sm"),
                      onClick: handleBackupNow,
                      disabled: backuping,
                      children: backuping ? T("pl.set.backupBacking") : T("pl.set.backupNow")
                    }
                  )
                ] }),
                backupMsg && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: backupMsg.error ? TONE16.red : TONE16.text
                    },
                    children: backupMsg.text
                  }
                ),
                backups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { style: { fontSize: 11, color: TONE16.quiet }, children: T("pl.set.backupEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      maxHeight: 200,
                      overflow: "auto"
                    },
                    children: backups.map((b) => /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 9px",
                          background: TONE16.row,
                          border: `1px solid ${TONE16.border}`,
                          borderRadius: 6,
                          fontSize: 12
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                            "span",
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              },
                              "data-tip": b.name,
                              children: b.name
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                            "span",
                            {
                              style: {
                                flexShrink: 0,
                                fontSize: 10,
                                lineHeight: 1,
                                color: b.format === "json" ? TONE16.accent : TONE16.muted,
                                border: `1px solid ${b.format === "json" ? "var(--dsw-alias-brand-primary, #8ec5ff)" : TONE16.border}`,
                                borderRadius: 4,
                                padding: "2px 5px"
                              },
                              children: b.format
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet, flexShrink: 0 }, children: formatSize(b.size) }),
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet, flexShrink: 0 }, children: formatBackupTime(b.createdAt) }),
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                            import_dsh_client_ui_primitives14.Button,
                            {
                              type: "button",
                              variant: "ghost",
                              size: "sm",
                              className: plBtn("ghost", "sm"),
                              onClick: () => setRestoreTarget(b),
                              "data-tip": T("pl.set.restoreTitle", { name: b.name }),
                              children: T("pl.set.restore")
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setDeleteTarget(b),
                              "data-tip": T("pl.set.backupDeleteTitle"),
                              style: {
                                flexShrink: 0,
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                color: TONE16.quiet,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: MONO16,
                                padding: "2px 4px",
                                borderRadius: 4,
                                transition: "color .18s, background-color .18s"
                              },
                              onMouseEnter: (e) => {
                                e.currentTarget.style.color = TONE16.red;
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                              },
                              onMouseLeave: (e) => {
                                e.currentTarget.style.color = TONE16.quiet;
                                e.currentTarget.style.backgroundColor = "transparent";
                              },
                              children: T("pl.set.backupDelete")
                            }
                          )
                        ]
                      },
                      b.name
                    ))
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      ConfirmDialog,
      {
        open: restoreTarget !== null,
        danger: true,
        message: restoreTarget ? T("pl.set.restoreConfirm", { name: restoreTarget.name }) : "",
        confirmLabel: T("pl.set.restore"),
        cancelLabel: T("pl.cancel"),
        onCancel: () => setRestoreTarget(null),
        onConfirm: handleRestore
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      ConfirmDialog,
      {
        open: deleteTarget !== null,
        danger: true,
        message: deleteTarget ? T("pl.set.backupDeleteConfirm", { name: deleteTarget.name }) : "",
        confirmLabel: T("pl.set.backupDelete"),
        cancelLabel: T("pl.cancel"),
        onCancel: () => setDeleteTarget(null),
        onConfirm: handleDelete
      }
    )
  ] });
}

// src/client/components/settings/SettingsSection.tsx
var import_jsx_runtime26 = require("react/jsx-runtime");
var MONO17 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE17 = {
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
var moduleStyle2 = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE17.panel,
  border: `1px solid ${TONE17.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12
};
var moduleTitleStyle2 = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE17.text
};
var moduleDescStyle2 = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE17.quiet
};
function ModuleCard2(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("section", { style: moduleStyle2, children: [
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
            /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: moduleTitleStyle2, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: moduleDescStyle2, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 16 16",
              style: {
                flexShrink: 0,
                color: TONE17.muted,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)"
              },
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children })
  ] });
}
function ToggleRow2({
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
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("span", { style: { display: "flex", flexDirection: "column", gap: 2, flex: 1, opacity: dim }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 11, color: TONE17.quiet }, children: desc })
        ] }),
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
              accentColor: TONE17.accent
            }
          }
        )
      ]
    }
  );
}
function NumberRow2({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  disabled
}) {
  const clamp2 = (v) => {
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
          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("span", { style: { fontSize: 11, color: TONE17.quiet }, children: [
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
              if (!disabled) onChange(clamp2(value));
            },
            style: {
              width: 80,
              padding: "4px 6px",
              color: TONE17.text,
              background: TONE17.row,
              border: `1px solid ${TONE17.border}`,
              borderRadius: 5,
              fontFamily: MONO17,
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
function TextRow({
  label,
  value,
  placeholder,
  desc,
  onChange,
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
            "input",
            {
              type: "text",
              value,
              placeholder,
              disabled,
              onChange: (e) => {
                if (!disabled) onChange(e.target.value);
              },
              style: {
                width: 120,
                padding: "4px 6px",
                color: TONE17.text,
                background: TONE17.row,
                border: `1px solid ${TONE17.border}`,
                borderRadius: 5,
                fontFamily: MONO17,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "text"
              }
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { fontSize: 11, color: TONE17.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
}
function SelectRow2({
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
                color: TONE17.text,
                background: TONE17.row,
                border: `1px solid ${TONE17.border}`,
                borderRadius: 5,
                fontFamily: MONO17,
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
    desc && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { fontSize: 11, color: TONE17.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
}
function SettingsSection(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [loading, setLoading] = (0, import_react23.useState)(true);
  const [draft, setDraft] = (0, import_react23.useState)(DEFAULT_SETTINGS);
  const [selectables, setSelectables] = (0, import_react23.useState)([]);
  const [openLearn, setOpenLearn] = (0, import_react23.useState)(false);
  const [openPanel, setOpenPanel] = (0, import_react23.useState)(false);
  const [openDisplay, setOpenDisplay] = (0, import_react23.useState)(false);
  const [openUpdate, setOpenUpdate] = (0, import_react23.useState)(false);
  const [updateInfo, setUpdateInfo] = (0, import_react23.useState)(null);
  const [checking, setChecking] = (0, import_react23.useState)(false);
  const [updating, setUpdating] = (0, import_react23.useState)(false);
  const [updateMsg, setUpdateMsg] = (0, import_react23.useState)(null);
  const saveTimerRef = (0, import_react23.useRef)(null);
  const [learnStats, setLearnStats] = (0, import_react23.useState)(null);
  const [assistantMaxed, setAssistantMaxed] = (0, import_react23.useState)(false);
  (0, import_react23.useEffect)(() => {
    getSettings().then((s) => setDraft(s)).catch(() => {
    }).finally(() => setLoading(false));
    getAiSelectables().then(setSelectables).catch(() => setSelectables([]));
  }, []);
  (0, import_react23.useEffect)(() => {
    getStats().then(
      (data) => setLearnStats({
        autoLearnedCount: data.stats.autoLearnedCount,
        aiRefinedIn7: data.stats.aiRefinedIn7
      })
    ).catch(() => setLearnStats(null));
  }, []);
  (0, import_react23.useEffect)(() => {
    getAssistantStatus().then((s) => setAssistantMaxed((s.level?.next ?? 1) === 0)).catch(() => setAssistantMaxed(false));
  }, []);
  const saveSettings = (0, import_react23.useCallback)((next) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateSettings(next).then(() => {
        window.dispatchEvent(new CustomEvent("pl:settings-changed", { detail: next }));
      }).catch(() => {
      });
    }, 300);
  }, []);
  const updateAndSave = (0, import_react23.useCallback)((patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);
  const handleCheckUpdate = (0, import_react23.useCallback)(async () => {
    setChecking(true);
    setUpdateMsg(null);
    try {
      const info = await getUpdate();
      setUpdateInfo(info);
      if (!info.hasUpdate) {
        setUpdateMsg({ ok: true, text: T("pl.set.updateLatest") });
      }
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setChecking(false);
    }
  }, [T]);
  const handleApplyUpdate = (0, import_react23.useCallback)(async () => {
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const res = await applyUpdate();
      if (res.ok) {
        setUpdateMsg({ ok: true, text: T("pl.set.updateSuccess") });
        try {
          const info = await getUpdate();
          setUpdateInfo(info);
        } catch {
        }
      } else {
        setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
      }
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setUpdating(false);
    }
  }, [T]);
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { padding: 16, color: TONE17.quiet, fontFamily: MONO17, fontSize: 13 }, children: T("pl.loading") });
  }
  const providerOptions = [{ value: "", label: T("pl.set.autoDiscover") }];
  for (const s of selectables) {
    if (s.provider && !providerOptions.some((o) => o.value === s.provider)) {
      providerOptions.push({ value: s.provider, label: s.name || s.provider });
    }
  }
  if (draft.aiProvider && !providerOptions.some((o) => o.value === draft.aiProvider)) {
    providerOptions.push({ value: draft.aiProvider, label: T("pl.set.notFound", { value: draft.aiProvider }) });
  }
  const activeProvider = selectables.find((s) => s.provider === draft.aiProvider);
  const modelOptions = [{ value: "", label: T("pl.set.autoDiscover") }];
  for (const m of activeProvider?.models ?? []) {
    if (m.id && !modelOptions.some((o) => o.value === m.id)) {
      modelOptions.push({ value: m.id, label: m.name || m.id });
    }
  }
  if (draft.aiModel && !modelOptions.some((o) => o.value === draft.aiModel)) {
    modelOptions.push({ value: draft.aiModel, label: T("pl.set.notFound", { value: draft.aiModel }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
    "div",
    {
      style: {
        color: TONE17.text,
        fontFamily: MONO17,
        maxWidth: 520
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { padding: "2px 0 4px", display: "flex", flexDirection: "column", gap: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { fontSize: 20, fontWeight: 700, letterSpacing: 1, color: TONE17.text, lineHeight: 1.2 }, children: T("pl.setSectionTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12, color: TONE17.quiet, lineHeight: 1.5 }, children: T("pl.set.setSectionDesc") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard2,
          {
            title: T("pl.setModuleLearn"),
            desc: T("pl.setModuleLearnDesc"),
            open: openLearn,
            onToggle: () => setOpenLearn((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.autoLearn"),
                  desc: T("pl.set.autoLearnDesc"),
                  checked: draft.autoLearnEnabled,
                  onChange: (v) => updateAndSave({ autoLearnEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                "div",
                {
                  style: {
                    marginLeft: 22,
                    display: "flex",
                    flexDirection: "column"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.manualConfirm"),
                        desc: T("pl.set.manualConfirmDesc"),
                        checked: draft.autoLearnManualConfirm,
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ autoLearnManualConfirm: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      TextRow,
                      {
                        label: T("pl.set.autoLearnTag"),
                        value: draft.autoLearnTag,
                        placeholder: "auto-learned",
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ autoLearnTag: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      NumberRow2,
                      {
                        label: T("pl.set.minLength"),
                        value: draft.autoLearnMinLength,
                        min: 20,
                        max: 500,
                        step: 10,
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ autoLearnMinLength: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.aiEnrich"),
                        desc: T("pl.set.aiEnrichDesc"),
                        checked: draft.aiEnrichEnabled,
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ aiEnrichEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                      "div",
                      {
                        style: {
                          marginLeft: 22,
                          display: "flex",
                          flexDirection: "column"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                            SelectRow2,
                            {
                              label: T("pl.set.aiProvider"),
                              value: draft.aiProvider,
                              options: providerOptions,
                              desc: T("pl.set.aiProviderDesc"),
                              disabled: !draft.autoLearnEnabled || !draft.aiEnrichEnabled,
                              onChange: (v) => updateAndSave({ aiProvider: v })
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                            SelectRow2,
                            {
                              label: T("pl.set.aiModel"),
                              value: draft.aiModel,
                              options: modelOptions,
                              desc: T("pl.set.aiModelDesc"),
                              disabled: !draft.autoLearnEnabled || !draft.aiEnrichEnabled,
                              onChange: (v) => updateAndSave({ aiModel: v })
                            }
                          )
                        ]
                      }
                    ),
                    learnStats && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: {
                      marginTop: 4,
                      padding: "6px 10px",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: TONE17.quiet,
                      background: TONE17.row,
                      border: `1px solid ${TONE17.border}`,
                      borderRadius: 6
                    }, children: T("pl.set.learnStats", { count: learnStats.autoLearnedCount, n: learnStats.aiRefinedIn7 }) })
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard2,
          {
            title: T("pl.setModulePanel"),
            desc: T("pl.setModulePanelDesc"),
            open: openPanel,
            onToggle: () => setOpenPanel((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow2,
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
                NumberRow2,
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
                NumberRow2,
                {
                  label: T("pl.set.maxCount"),
                  value: draft.maxPromptCount,
                  min: 10,
                  max: 1e3,
                  step: 10,
                  defaultValue: DEFAULT_SETTINGS.maxPromptCount,
                  onChange: (v) => updateAndSave({ maxPromptCount: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow2,
                {
                  label: T("pl.set.personTipInterval"),
                  value: draft.personTipInterval,
                  min: 5,
                  max: 60,
                  step: 1,
                  defaultValue: DEFAULT_SETTINGS.personTipInterval,
                  onChange: (v) => updateAndSave({ personTipInterval: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                NumberRow2,
                {
                  label: T("pl.set.personTipDuration"),
                  value: draft.personTipDuration,
                  min: 10,
                  max: 30,
                  step: 1,
                  defaultValue: DEFAULT_SETTINGS.personTipDuration,
                  onChange: (v) => updateAndSave({ personTipDuration: v })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard2,
          {
            title: T("pl.setModuleDisplay"),
            desc: T("pl.setModuleDisplayDesc"),
            open: openDisplay,
            onToggle: () => setOpenDisplay((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.assistant"),
                  desc: `${T("pl.set.assistantDesc")} \xB7 ${assistantMaxed ? T("pl.set.assistantUnlocked") : T("pl.set.assistantUnlock")}`,
                  checked: assistantMaxed ? draft.assistantEnabled : true,
                  disabled: !assistantMaxed,
                  onChange: (v) => updateAndSave({ assistantEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                "div",
                {
                  style: {
                    marginLeft: 22,
                    display: "flex",
                    flexDirection: "column"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      SelectRow2,
                      {
                        label: T("pl.set.character"),
                        desc: T("pl.set.characterDesc"),
                        value: draft.assistantCharacter,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({
                          assistantCharacter: v === "dshpet" ? "dshpet" : v === "whale" ? "whale" : "classic"
                        }),
                        options: [
                          { value: "classic", label: T("pl.set.characterClassic") },
                          { value: "whale", label: T("pl.set.characterWhale") },
                          { value: "dshpet", label: T("pl.set.characterDshpet") }
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.announcement"),
                        desc: T("pl.set.announcementDesc"),
                        checked: draft.announcementEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ announcementEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.rightPanel"),
                        desc: T("pl.set.rightPanelDesc"),
                        checked: draft.rightPanelEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ rightPanelEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.persona"),
                        desc: T("pl.set.personaDesc"),
                        checked: draft.personaEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ personaEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.dashboard"),
                        desc: T("pl.set.dashboardDesc"),
                        checked: draft.dashboardEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ dashboardEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.dataManagement"),
                        desc: T("pl.set.dataManagementDesc"),
                        checked: draft.dataManagementEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ dataManagementEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.levelAssistant"),
                        desc: T("pl.set.levelAssistantDesc"),
                        checked: draft.levelEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ levelEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                      ToggleRow2,
                      {
                        label: T("pl.set.levelAnnouncement"),
                        desc: T("pl.set.levelAnnouncementDesc"),
                        checked: draft.levelAnnouncementEnabled,
                        disabled: assistantMaxed && !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ levelAnnouncementEnabled: v })
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.showComposerBtn"),
                  desc: T("pl.set.showComposerBtnDesc"),
                  checked: draft.showComposerButton,
                  onChange: (v) => updateAndSave({ showComposerButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { paddingLeft: 14, borderLeft: `1px solid ${TONE17.border}`, marginLeft: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.composerBtnIconOnly"),
                  desc: T("pl.set.composerBtnIconOnlyDesc"),
                  checked: draft.composerButtonIconOnly,
                  disabled: !draft.showComposerButton,
                  onChange: (v) => updateAndSave({ composerButtonIconOnly: v })
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.showPolishBtn"),
                  desc: T("pl.set.showPolishBtnDesc"),
                  checked: draft.showAIPolishButton,
                  onChange: (v) => updateAndSave({ showAIPolishButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { paddingLeft: 14, borderLeft: `1px solid ${TONE17.border}`, marginLeft: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.polishBtnIconOnly"),
                  desc: T("pl.set.polishBtnIconOnlyDesc"),
                  checked: draft.aiPolishButtonIconOnly,
                  disabled: !draft.showAIPolishButton,
                  onChange: (v) => updateAndSave({ aiPolishButtonIconOnly: v })
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.tildaTrigger"),
                  desc: T("pl.set.tildaTriggerDesc"),
                  checked: draft.tildaTriggerEnabled,
                  onChange: (v) => updateAndSave({ tildaTriggerEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.hoverDetail"),
                  desc: T("pl.set.hoverDetailDesc"),
                  checked: draft.hoverDetailEnabled,
                  onChange: (v) => updateAndSave({ hoverDetailEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.selectionAdd"),
                  desc: T("pl.set.selectionAddDesc"),
                  checked: draft.selectionAddEnabled,
                  onChange: (v) => updateAndSave({ selectionAddEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
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
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(BackupModule, { t }),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
          ModuleCard2,
          {
            title: T("pl.setModuleAboutUpdate"),
            desc: T("pl.setModuleAboutUpdateDesc"),
            open: openUpdate,
            onToggle: () => setOpenUpdate((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                ToggleRow2,
                {
                  label: T("pl.set.autoUpdate"),
                  desc: T("pl.set.autoUpdateDesc"),
                  checked: draft.autoUpdateEnabled,
                  onChange: (v) => updateAndSave({ autoUpdateEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "8px 0"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 13 }, children: T("pl.set.updateReminder") }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: handleCheckUpdate,
                          disabled: checking || updating,
                          style: {
                            padding: "5px 12px",
                            fontSize: 12,
                            color: checking || updating ? TONE17.quiet : TONE17.text,
                            background: TONE17.row,
                            border: `1px solid ${TONE17.border}`,
                            borderRadius: 5,
                            cursor: checking || updating ? "default" : "pointer"
                          },
                          children: checking ? T("pl.set.updateChecking") : T("pl.set.checkUpdate")
                        }
                      )
                    ] }),
                    checking ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { fontSize: 11, color: TONE17.quiet }, children: T("pl.set.updateChecking") }) : updating ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { fontSize: 11, color: TONE17.accent }, children: T("pl.set.updating") }) : updateInfo ? /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { fontSize: 11, color: TONE17.quiet }, children: [
                        T("pl.set.updateCurrent", { version: updateInfo.current }),
                        updateInfo.hasUpdate && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { color: TONE17.accent, marginLeft: 4 }, children: T("pl.set.updateAvailable", { version: updateInfo.latest }) })
                      ] }),
                      updateInfo.hasUpdate && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                          import_dsh_client_ui_primitives15.Button,
                          {
                            type: "button",
                            variant: "primary",
                            size: "sm",
                            className: plBtn("primary", "sm"),
                            onClick: handleApplyUpdate,
                            disabled: updating,
                            children: updating ? T("pl.set.updating") : T("pl.set.updateNow")
                          }
                        ) }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                          "div",
                          {
                            role: "note",
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 6,
                              padding: "6px 9px",
                              borderRadius: 5,
                              background: "rgba(245, 158, 11, 0.1)",
                              border: `1px solid ${TONE17.border}`,
                              color: TONE17.muted,
                              fontSize: 11,
                              lineHeight: 1.55
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                "svg",
                                {
                                  width: "14",
                                  height: "14",
                                  viewBox: "0 0 16 16",
                                  style: { flexShrink: 0, marginTop: 1, color: "var(--dsw-alias-state-warning-primary, #f59e0b)" },
                                  "aria-hidden": "true",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                    "path",
                                    {
                                      d: "M8 2L1.5 13h13L8 2zM8 7v3M8 12.5v.5",
                                      fill: "none",
                                      stroke: "currentColor",
                                      strokeWidth: "1.6",
                                      strokeLinecap: "round",
                                      strokeLinejoin: "round"
                                    }
                                  )
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: T("pl.set.updateRequireRestartHint") })
                            ]
                          }
                        )
                      ] })
                    ] }) : null,
                    updateMsg && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          alignItems: "flex-start"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                color: updateMsg.ok ? TONE17.success : TONE17.red,
                                lineHeight: 1.5
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                  "svg",
                                  {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 16 16",
                                    style: { flexShrink: 0 },
                                    "aria-hidden": "true",
                                    children: updateMsg.ok ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                      "path",
                                      {
                                        d: "M3 8.5l3.2 3.2L13 4.8",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "1.8",
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round"
                                      }
                                    ) : /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                      "path",
                                      {
                                        d: "M8 4v5M8 11.5v.5",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "1.8",
                                        strokeLinecap: "round"
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: updateMsg.text })
                              ]
                            }
                          ),
                          updateMsg.ok && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
                            "div",
                            {
                              role: "alert",
                              style: {
                                width: "100%",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                padding: "10px 12px",
                                borderRadius: 7,
                                background: "linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)",
                                border: "1px solid var(--dsw-alias-state-info-primary, rgba(59, 130, 246, 0.35))",
                                color: TONE17.text,
                                fontSize: 12,
                                lineHeight: 1.6
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                  "svg",
                                  {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 16 16",
                                    style: {
                                      flexShrink: 0,
                                      marginTop: 1,
                                      color: "var(--dsw-alias-state-info-primary, #3b82f6)"
                                    },
                                    "aria-hidden": "true",
                                    children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                                      "path",
                                      {
                                        d: "M8 1.5A6.5 6.5 0 1 1 8 14.5 6.5 6.5 0 0 1 8 1.5zm0 2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zM6.5 7.5a.8.8 0 1 0 1.6 0V7a.8.8 0 0 0-1.6 0v.5zM7.2 6a.8.8 0 0 1 1.6 0v3.2a.8.8 0 0 1-1.6 0V6z",
                                        fill: "currentColor"
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("strong", { style: { fontSize: 12, fontWeight: 600 }, children: T("pl.set.updateSuccessRestartTitle") }),
                                  /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { color: TONE17.muted, fontSize: 11.5 }, children: T("pl.set.updateSuccessRestartHint") })
                                ] })
                              ]
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { style: { height: 1, background: TONE17.border } }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }, children: [
                [
                  [T("pl.about.version"), `v${PLUGIN_VERSION}`],
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
                      borderBottom: `1px solid ${TONE17.border}`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE17.quiet }, children: label }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE17.text }, children: value })
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
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { style: { fontSize: 12.5, color: TONE17.quiet }, children: T("pl.about.repo") }),
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
                            color: TONE17.accent,
                            textDecoration: "none",
                            fontSize: 12.5,
                            opacity: 0.9,
                            transition: "opacity 0.15s ease"
                          },
                          onMouseEnter: (e) => e.currentTarget.style.opacity = "1",
                          onMouseLeave: (e) => e.currentTarget.style.opacity = "0.9",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("path", { d: "M12 0C5.37 0 0 5.4 0 12.06c0 5.33 3.44 9.84 8.21 11.43.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .32.22.7.83.58A12.4 12.4 0 0 0 24 12.06C24 5.4 18.63 0 12 0z" }) }),
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
                      borderTop: `1px dashed ${TONE17.border}`,
                      color: TONE17.quiet,
                      fontSize: 11,
                      lineHeight: 1.55,
                      textAlign: "center"
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: T("pl.about.copyright", { year: (/* @__PURE__ */ new Date()).getFullYear(), author: "master1Sun" }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: T("pl.footer.disclaimer") })
                    ]
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

// src/client/index.ts
var inject = ["slots", "locale"];
function apply(ctx) {
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
    "prompt-library: sse subscription"
  );
  const t = ctx.locale.bind(NS);
  ctx.slots.inject(
    "conversation.input.left",
    () => ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library",
        order: 60,
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
        order: 61,
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
        order: 30,
        locale: NS
      },
      ContextRecommendations
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
        order: 100,
        locale: NS,
        label: () => t("pl.setSectionTitle")
      },
      SettingsSection
    )
  );
}
		module.exports = { apply, inject };
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map

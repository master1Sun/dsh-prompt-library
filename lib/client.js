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
var import_react10 = require("react");

// src/types.ts
var TITLE_MAX_LEN = 25;
function clampTitle(title) {
  return title.slice(0, TITLE_MAX_LEN);
}
var DEFAULT_SETTINGS = {
  autoLearnEnabled: false,
  autoLearnTag: "auto-learned",
  autoLearnMinLength: 60,
  autoLearnManualConfirm: false,
  panelWidth: 360,
  panelHeight: 500,
  assistantEnabled: true,
  rightPanelEnabled: true,
  showComposerButton: true,
  showAIPolishButton: true,
  tildaTriggerEnabled: true,
  maxPromptCount: 100,
  hoverDetailEnabled: false,
  selectionAddEnabled: false,
  contextRecommendEnabled: true,
  aiEnrichEnabled: false,
  aiProvider: "",
  aiModel: "",
  personTipInterval: 10,
  // 10 秒
  personTipDuration: 20,
  // 20 秒
  applyCharacterToChat: false,
  autoUpdateEnabled: true,
  // 自动更新默认开启：发现新版本后台自动安装
  announcementEnabled: true,
  // 公告默认开启：双击词库助手展示使用手册与版本通告
  backupEnabled: true,
  // 自动备份默认开启
  backupRetention: 15,
  // 默认保留最近 5 份备份
  backupSchedule: "weekly",
  // 默认每天备份一次
  backupFormat: "json"
  // 默认备份为数据库文件（.json）
};

// src/client/services/api.ts
var BASE = "/api/prompt-library/prompts";
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
function getActivity() {
  return send("GET", "/api/prompt-library/activity");
}
function getAnnouncement(lang) {
  const url = lang ? `/api/prompt-library/announcement?lang=${encodeURIComponent(lang)}` : "/api/prompt-library/announcement";
  return send("GET", url);
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
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/utils/button-style.ts
var PL_BUTTON_CSS = `
.pl-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:none;border-radius:18px;cursor:pointer;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary,#f2f6fc);background:transparent;padding:0 14px;font-family:inherit;white-space:nowrap}
.pl-btn:disabled{cursor:not-allowed;opacity:.4}
.pl-btn--md{height:36px}
.pl-btn--sm{height:28px;font-size:12px;line-height:18px;padding:0 10px;border-radius:14px}
.pl-btn--primary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--primary:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.pl-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--ghost:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
`;
var plBtn = (variant, size = "sm") => `pl-btn pl-btn--${variant} pl-btn--${size}`;

// src/client/components/sidebar/SidebarPromptLibrary.tsx
var import_react7 = require("react");

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
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");

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

// src/client/components/assistant/PromptAssistant.tsx
var import_react4 = require("react");
var import_react_dom2 = require("react-dom");

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
  "pl.sidebar.collapse": "\u6298\u53E0\u8BCD\u5E93",
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
  "pl.announce.manual.0": "\u8F93\u5165 # \u547C\u51FA\u8BCD\u5E93\uFF1A\u5B9E\u65F6\u7B5B\u9009\u3001\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165",
  "pl.announce.manual.1": "\u81EA\u52A8\u5B66\u4E60\u804A\u5929\u4E2D\u6709\u4EF7\u503C\u7684\u63D0\u793A\u8BCD\uFF0C\u53EF\u968F\u65F6\u7F16\u8F91\u6216\u5220\u9664",
  "pl.announce.manual.2": "\u652F\u6301 AI \u4F18\u5316\u4E0E\u667A\u80FD\u5B8C\u5584\uFF0C\u63D0\u5347\u63D0\u793A\u8BCD\u8D28\u91CF",
  "pl.announce.manual.3": "\u652F\u6301 {{\u53D8\u91CF}} \u5360\u4F4D\u7B26\uFF0C\u63D2\u5165\u65F6\u5F39\u7A97\u9010\u4E2A\u586B\u5199",
  "pl.announce.manual.4": "\u4FA7\u8FB9\u680F / \u804A\u5929\u9762\u677F\u53CC\u5165\u53E3\u7BA1\u7406\u8BCD\u5E93\uFF0C\u652F\u6301\u5BFC\u51FA\u4E0E\u5907\u4EFD",
  // 导入导出 / 备份恢复
  "pl.moduleImportExport": "\u5BFC\u5165\u5BFC\u51FA",
  "pl.moduleImportExportDesc": "\u52FE\u9009\u8981\u5BFC\u51FA\u7684\u63D0\u793A\u8BCD\uFF0C\u751F\u6210\u5907\u4EFD\u6587\u4EF6\uFF1B\u6216\u4ECE\u5907\u4EFD\u6587\u4EF6\u5BFC\u5165\uFF08\u540C ID \u8986\u76D6\u5408\u5E76\uFF09\u3002",
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
  "pl.imported": "\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E {imported}\u3001\u66F4\u65B0 {updated}\u3001\u8DF3\u8FC7 {skipped}",
  // 词库助手活动阶段气泡
  "pl.phase.idle": "\u5F85\u547D\u4E2D",
  "pl.phase.waiting": "\u5728\u7B49\u4F60\u8BF4\u5462\u2026",
  "pl.phase.thinking": "\u6B63\u5728\u601D\u8003\u2026",
  "pl.phase.tool": "\u6B63\u5728\u8C03\u7528\u5DE5\u5177\u2026",
  "pl.phase.review": "\u6B63\u5728\u6574\u7406\u2026",
  "pl.phase.done": "\u5B8C\u6210\u5566\uFF01",
  "pl.phase.failed": "\u521A\u624D\u6CA1\u6210\u529F\u2026",
  "pl.importFail": "\u5BFC\u5165\u5931\u8D25\uFF1A{err}",
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
  "pl.set.announcement": "\u663E\u793A\u516C\u544A",
  "pl.set.announcementDesc": "\u53CC\u51FB\u8BCD\u5E93\u52A9\u624B\u65F6\u5F39\u51FA\u4F7F\u7528\u624B\u518C\u4E0E\u7248\u672C\u901A\u544A\uFF1B\u4EC5\u5728\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u540E\u53EF\u914D\u7F6E",
  "pl.set.rightPanel": "\u663E\u793A\u8BCD\u5E93\u5DE5\u5177\u9762\u677F",
  "pl.set.rightPanelDesc": "\u63A7\u5236\u8BCD\u5E93\u5DE5\u5177\u9762\u677F\u663E\u793A\uFF0C\u9700\u5148\u5F00\u542F\u300C\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u300D\u624D\u80FD\u542F\u7528\uFF0C\u5F00\u542F\u540E\u70B9\u51FB\u8BCD\u5E93\u52A9\u624B\u5373\u53EF\u5C55\u5F00\u5DE5\u5177\u9762\u677F",
  "pl.set.showComposerBtn": "\u804A\u5929\u6846\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.showComposerBtnDesc": "\u5728\u8F93\u5165\u6846\u5DE5\u5177\u680F\u663E\u793A\u8BCD\u5E93\u6309\u94AE",
  "pl.set.showPolishBtn": "\u804A\u5929\u6846\u663E\u793A AI \u4F18\u5316\u6309\u94AE",
  "pl.set.showPolishBtnDesc": "\u5728\u8F93\u5165\u6846\u5DE5\u5177\u680F\u663E\u793A AI \u4F18\u5316\u6309\u94AE",
  "pl.set.tildaTrigger": "\u8F93\u5165 # \u89E6\u53D1\u8BCD\u5E93\u9009\u62E9",
  "pl.set.tildaTriggerDesc": "\u8F93\u5165 # \u540E\u5F39\u51FA\u8BCD\u5E93\uFF1B\u7EE7\u7EED\u8F93\u5165\u53EF\u5B9E\u65F6\u7B5B\u9009\uFF0C\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165\uFF0C\u8F93\u5165\u7A7A\u683C\u6216 Esc \u7ED3\u675F\u7B5B\u9009",
  "pl.set.hoverDetail": "\u60AC\u505C\u663E\u793A\u8BE6\u60C5",
  "pl.set.hoverDetailDesc": "\u5728\u53F3\u4FA7\u9762\u677F\u60AC\u505C\u63D0\u793A\u8BCD\u65F6\u663E\u793A\u5B8C\u6574\u8BE6\u60C5",
  "pl.set.selectionAdd": "\u9009\u4E2D\u6587\u5B57\u6DFB\u52A0\u63D0\u793A\u8BCD",
  "pl.set.selectionAddDesc": "\u5728\u804A\u5929\u5185\u5BB9\u9AD8\u4EAE\u9009\u4E2D\u6587\u5B57\u540E\uFF0C\u6D6E\u51FA\u300C\u6DFB\u52A0\u63D0\u793A\u8BCD\u300D\u6309\u94AE\u5E76\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3",
  "pl.set.lab": "\u5B9E\u9A8C\u5BA4\u529F\u80FD",
  "pl.set.labWarning": "\u4EE5\u4E0B\u4E3A\u5B9E\u9A8C\u6027\u80FD\u529B\uFF0C\u53EF\u80FD\u5F71\u54CD\u6574\u4E2A AI \u5BF9\u8BDD\u7684\u8868\u73B0\u3002\u8BF7\u8C28\u614E\u52FE\u9009\u3002",
  "pl.set.chatCharacter": "\u6574\u4E2A\u804A\u5929\u5E94\u7528\u4EBA\u683C",
  "pl.set.chatCharacterDesc": "\u52FE\u9009\u540E\u4EBA\u683C\u6587\u4EF6\u7EA6\u675F\u6574\u4E2A\u5BF9\u8BDD\uFF0C\u4F46\u53EA\u5BF9\u65B0\u4F1A\u8BDD\u751F\u6548\uFF0C\u4E0D\u5F71\u54CD\u5F53\u524D\u6B63\u5728\u8FDB\u884C\u7684\u5BF9\u8BDD",
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
  "pl.setModuleLab": "\u5B9E\u9A8C\u5BA4",
  "pl.setModuleLabDesc": "\u5B9E\u9A8C\u6027\u80FD\u529B\uFF0C\u53EF\u80FD\u5F71\u54CD\u6574\u4E2A AI \u5BF9\u8BDD\u7684\u8868\u73B0\uFF0C\u8BF7\u8C28\u614E\u5F00\u542F\u3002",
  "pl.setModuleUpdate": "\u66F4\u65B0",
  "pl.setModuleUpdateDesc": "\u7BA1\u7406\u63D2\u4EF6\u7248\u672C\u68C0\u67E5\u4E0E\u81EA\u52A8\u66F4\u65B0\u3002",
  "pl.setModuleBackup": "\u81EA\u52A8\u5907\u4EFD",
  "pl.setModuleBackupDesc": "\u6309\u5468\u671F\u628A\u6570\u636E\u5E93\u5907\u4EFD\u5230 backup \u76EE\u5F55\uFF0C\u53EF\u624B\u52A8\u7ACB\u5373\u5907\u4EFD\u5E76\u67E5\u770B\u5907\u4EFD\u5217\u8868\u3002",
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
  "pl.stats.days": "{days} \u5929\u672A\u4F7F\u7528"
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
  "pl.sidebar.collapse": "Collapse prompt library",
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
  "pl.announce.manual.0": "Type # to open the library: live filter, up/down to select, Enter to insert",
  "pl.announce.manual.1": "Automatically learn valuable prompts from chats; edit or delete anytime",
  "pl.announce.manual.2": "AI polish and smart enrichment to improve prompt quality",
  "pl.announce.manual.3": "Supports {{variable}} placeholders, filled in a popup before insert",
  "pl.announce.manual.4": "Manage the library from the sidebar / chat panel, with export & backup",
  // Import / Export / Backup
  "pl.moduleImportExport": "Import / Export",
  "pl.moduleImportExportDesc": "Check the prompts to export as a backup file; or import from a backup file (merge, overwrite same ID).",
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
  "pl.imported": "Import done: {imported} added, {updated} updated, {skipped} skipped",
  // Library assistant activity phase bubble
  "pl.phase.idle": "On standby",
  "pl.phase.waiting": "Waiting for you\u2026",
  "pl.phase.thinking": "Thinking\u2026",
  "pl.phase.tool": "Using a tool\u2026",
  "pl.phase.review": "Composing\u2026",
  "pl.phase.done": "Done!",
  "pl.phase.failed": "That didn't work\u2026",
  "pl.importFail": "Import failed: {err}",
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
  "pl.set.announcement": "Show announcement dialog",
  "pl.set.announcementDesc": "Double-click the assistant to open the user guide and release notes. Only configurable when the assistant is enabled",
  "pl.set.rightPanel": "Show prompt library panel",
  "pl.set.rightPanelDesc": "Controls the prompt library panel. Requires opening the assistant first, then click the assistant to expand the panel",
  "pl.set.showComposerBtn": "Show library button in chat",
  "pl.set.showComposerBtnDesc": "Show the prompt library button in the input toolbar",
  "pl.set.showPolishBtn": "Show AI polish button in chat",
  "pl.set.showPolishBtnDesc": "Show the AI polish button in the input toolbar",
  "pl.set.tildaTrigger": "Type # to trigger library selection",
  "pl.set.tildaTriggerDesc": "Type # to open the library; keep typing to filter live, \u2191\u2193 to select, Enter to insert, Space or Esc to finish",
  "pl.set.hoverDetail": "Show details on hover",
  "pl.set.hoverDetailDesc": "Show full details when hovering a prompt in the side panel",
  "pl.set.selectionAdd": "Add prompt from selected text",
  "pl.set.selectionAddDesc": "After highlighting text in chat, show an \u201CAdd to library\u201D button and open a standalone window",
  "pl.set.lab": "Lab features",
  "pl.set.labWarning": "Experimental features below may affect all AI conversations. Enable with caution.",
  "pl.set.chatCharacter": "Apply personality to entire chat",
  "pl.set.chatCharacterDesc": "Constrain the whole chat with the personality file, but only for new sessions, not current ones",
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
  "pl.setModuleLab": "Lab",
  "pl.setModuleLabDesc": "Experimental capabilities that may affect the whole AI conversation. Enable with caution.",
  "pl.setModuleUpdate": "Update",
  "pl.setModuleUpdateDesc": "Manage plugin version checking and auto-update.",
  "pl.setModuleBackup": "Auto backup",
  "pl.setModuleBackupDesc": "Back up the database to the backup directory on a schedule; back up manually or view the backup list here.",
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
  "pl.stats.days": "{days} days idle"
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
var import_react3 = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
var MONO2 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE2 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)"
};
var sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: TONE2.text,
  marginBottom: 8
};
function CheckIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "svg",
    {
      width: "13",
      height: "13",
      viewBox: "0 0 16 16",
      style: { flexShrink: 0, color: TONE2.accent, marginTop: 3 },
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "path",
        {
          d: "M3 8.5l3.2 3.2L13 4.8",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.8",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      )
    }
  );
}
function BulletIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "svg",
    {
      width: "8",
      height: "8",
      viewBox: "0 0 8 8",
      style: { flexShrink: 0, color: TONE2.accent, marginTop: 8 },
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M4 0 L8 4 L4 8 L0 4 Z", fill: "currentColor" })
    }
  );
}
var MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4"
];
function currentLang() {
  const raw = (typeof document !== "undefined" ? document.documentElement.lang : "") || (typeof navigator !== "undefined" ? navigator.language : "zh") || "zh";
  return raw.toLowerCase().startsWith("en") ? "en" : "zh";
}
function AnnouncementModal({ open, onClose, t }) {
  const [data, setData] = (0, import_react3.useState)(null);
  const lang = (0, import_react3.useMemo)(() => currentLang(), [open]);
  (0, import_react3.useEffect)(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    getAnnouncement(lang).then((res) => {
      if (alive) setData(res);
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, [open, lang]);
  if (!open) return null;
  const manualItems = data?.manual && data.manual.length > 0 ? data.manual.map((m) => m.text).filter(Boolean) : MANUAL_KEYS.map((key) => t(key));
  const latest = (0, import_react3.useMemo)(() => {
    if (!data?.versions || data.versions.length === 0) return null;
    const byCurrent = data.current ? data.versions.find((v) => v.version === data.current) : void 0;
    return byCurrent ?? data.versions[0];
  }, [data]);
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("pl.announce.title"),
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.35)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            style: {
              width: 560,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "min(640px, calc(100vh - 40px))",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              background: TONE2.panel,
              border: `1px solid ${TONE2.borderStrong}`,
              borderRadius: 12,
              padding: "18px 20px",
              color: TONE2.text,
              fontFamily: MONO2
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { style: { flex: 1, fontSize: 15, fontWeight: 600, color: TONE2.text }, children: t("pl.announce.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "path",
                  {
                    d: "M4 4l8 8M12 4l-8 8",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.8",
                    strokeLinecap: "round"
                  }
                ) }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    paddingTop: 14,
                    paddingBottom: 4
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: sectionTitleStyle, children: t("pl.announce.manualTitle") }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }, children: manualItems.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "li",
                        {
                          style: {
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            fontSize: 12.5,
                            lineHeight: 1.6,
                            color: TONE2.muted,
                            background: TONE2.row,
                            border: `1px solid ${TONE2.border}`,
                            borderRadius: 7,
                            padding: "7px 10px"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CheckIcon, {}),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: item })
                          ]
                        },
                        idx
                      )) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: sectionTitleStyle, children: t("pl.announce.noticeTitle") }),
                      !latest ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "div",
                        {
                          style: {
                            fontSize: 12.5,
                            lineHeight: 1.7,
                            color: TONE2.quiet,
                            background: TONE2.row,
                            border: `1px solid ${TONE2.border}`,
                            borderRadius: 7,
                            padding: "9px 11px",
                            fontStyle: "italic"
                          },
                          children: t("pl.announce.noNotice")
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "div",
                        {
                          style: {
                            background: TONE2.row,
                            border: `1px solid ${TONE2.border}`,
                            borderRadius: 8,
                            padding: "10px 12px"
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginBottom: 8
                                },
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                    "span",
                                    {
                                      style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        background: "rgba(142, 197, 255, 0.14)",
                                        color: TONE2.accent,
                                        border: `1px solid ${TONE2.border}`,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        lineHeight: 1.5,
                                        letterSpacing: 0.2
                                      },
                                      children: [
                                        "v",
                                        latest.version
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { style: { fontSize: 13, fontWeight: 600, color: TONE2.text, flex: "1 1 auto" }, children: latest.title }),
                                  latest.date && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                    "span",
                                    {
                                      style: {
                                        fontSize: 11.5,
                                        color: TONE2.quiet,
                                        fontWeight: 500
                                      },
                                      children: latest.date
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "ul",
                              {
                                style: {
                                  margin: 0,
                                  padding: 0,
                                  listStyle: "none",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6
                                },
                                children: latest.items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                  "li",
                                  {
                                    style: {
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 8,
                                      fontSize: 12,
                                      lineHeight: 1.65,
                                      color: TONE2.muted
                                    },
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(BulletIcon, {}),
                                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { flex: 1 }, children: item })
                                    ]
                                  },
                                  i
                                ))
                              }
                            )
                          ]
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: onClose, children: t("pl.announce.dismiss") }) })
            ]
          }
        )
      }
    ),
    document.body
  );
}

// src/client/utils/sprite.ts
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
function sequenceFrame(sequence, elapsedMs) {
  const itemDurations = sequence.map((tk) => TRACKS[tk].durations.reduce((a, b) => a + b, 0));
  const total = itemDurations.reduce((a, b) => a + b, 0);
  let off = Math.max(0, elapsedMs) % total;
  let item = 0;
  while (item < sequence.length - 1 && off >= itemDurations[item]) {
    off -= itemDurations[item];
    item += 1;
  }
  const track = sequence[item];
  const dur = TRACKS[track].durations;
  const frames = TRACKS[track].frames;
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
  idle: [P({}), P({ dip: 1, blink: 1 }), P({}), P({ dip: -1 })],
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
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(n >> 16 & 255);
  const g = toLinear(n >> 8 & 255);
  const b = toLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function resolvePalette() {
  let body = "#1f2937";
  try {
    const v = window.getComputedStyle(document.documentElement).getPropertyValue("--dsw-alias-label-primary").trim();
    if (v) body = v;
  } catch {
  }
  const feature = luminance(body) > 0.5 ? "#10141c" : "#fff";
  return { body, feature };
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
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.arc(32, 33.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 33.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawMouth(ctx, mouth, pal) {
  ctx.strokeStyle = pal.feature;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.fillStyle = pal.feature;
  if (mouth === "open") {
    ctx.beginPath();
    ctx.ellipse(36, 41.5, 3.6, 3.2, 0, 0, Math.PI * 2);
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
function drawCell(ctx, gx, gy, pose, pal) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.translate(pose.shx, pose.dip);
  ctx.translate(36, 47);
  ctx.rotate(pose.tilt * Math.PI / 180);
  ctx.scale(1, pose.squashY);
  ctx.translate(-36, -47);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(36, 29, 15, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(36, 47);
  ctx.rotate(pose.arm);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.ellipse(-11, 4, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.arc(36, 34, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.45 * pose.cheek;
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.arc(29, 37, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(43, 37, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawEyes(ctx, pose.blink, pal);
  drawMouth(ctx, pose.mouth, pal);
  ctx.restore();
}
async function buildSheet() {
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
      drawCell(ctx, col * SPRITE_CELL, row * SPRITE_CELL, pose, pal);
    }
  }
  const url = canvas.toDataURL("image/png");
  return { url, cell: SPRITE_CELL, columns: SPRITE_COLUMNS, rows: SPRITE_ROWS };
}
var sheetPromise;
function getSpriteSheet() {
  if (!sheetPromise) {
    sheetPromise = buildSheet().catch(() => null);
  }
  return sheetPromise;
}

// src/client/components/assistant/PromptAssistant.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var TONE3 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
var PERSON_SIZE = 72;
var FLOAT_MARGIN = 8;
var POS_KEY = "pl:assistant-pos";
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
function PromptAssistant(props) {
  const { t, settings, onTogglePanel } = props;
  const T = usePLT(t);
  const [pos, setPos] = (0, import_react4.useState)(loadPos);
  const updatePos = (0, import_react4.useCallback)((patch) => {
    setPos((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, []);
  const viewportRef = (0, import_react4.useRef)({ w: window.innerWidth, h: window.innerHeight });
  const [viewVersion, setViewVersion] = (0, import_react4.useState)(0);
  (0, import_react4.useEffect)(() => {
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
  const [bubble, setBubble] = (0, import_react4.useState)(false);
  const bubbleRef = (0, import_react4.useRef)(null);
  const [bubbleW, setBubbleW] = (0, import_react4.useState)(176);
  const [bubbleH, setBubbleH] = (0, import_react4.useState)(56);
  (0, import_react4.useEffect)(() => {
    if (!bubble || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => {
      setBubbleW(el.offsetWidth || 176);
      setBubbleH(el.offsetHeight || 56);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bubble]);
  const hoverRef = (0, import_react4.useRef)(false);
  const lastActiveRef = (0, import_react4.useRef)(Date.now());
  const [docked, setDocked] = (0, import_react4.useState)(false);
  const dockedRef = (0, import_react4.useRef)(false);
  const preDockRef = (0, import_react4.useRef)(null);
  const bubbleRefId = (0, import_react4.useRef)(false);
  (0, import_react4.useEffect)(() => {
    bubbleRefId.current = bubble;
  }, [bubble]);
  const [dragging, setDragging] = (0, import_react4.useState)(false);
  const lastCursorRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
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
      if (prev && Math.abs(e.clientX - prev.x) < 2 && Math.abs(e.clientY - prev.y) < 2) return;
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
  (0, import_react4.useEffect)(() => {
    if (!docked) return;
    preDockRef.current = { px: pos.px, py: pos.py };
    setBubble(false);
    hoverRef.current = false;
  }, [docked]);
  const view = (0, import_react4.useMemo)(() => {
    const vw = viewportRef.current.w;
    const vh = viewportRef.current.h;
    const hiX = Math.max(FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
    const hiY = Math.max(FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
    if (docked) return edgePos(pos, vw, vh);
    return { px: clamp(pos.px, FLOAT_MARGIN, hiX), py: clamp(pos.py, FLOAT_MARGIN, hiY) };
  }, [pos, docked, viewVersion]);
  const [intros, setIntros] = (0, import_react4.useState)(() => [
    T("pl.intro.0"),
    T("pl.intro.1"),
    T("pl.intro.2"),
    T("pl.intro.3"),
    T("pl.intro.4")
  ]);
  const [activity, setActivity] = (0, import_react4.useState)({ phase: "idle", sessionActive: false });
  (0, import_react4.useEffect)(() => {
    let cancelled = false;
    const tick = () => {
      getActivity().then((snap) => {
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
  const [sheet, setSheet] = (0, import_react4.useState)(null);
  const spriteRef = (0, import_react4.useRef)(null);
  const [hovering, setHovering] = (0, import_react4.useState)(false);
  (0, import_react4.useEffect)(() => {
    let alive = true;
    getSpriteSheet().then((s) => {
      if (alive) setSheet(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  (0, import_react4.useEffect)(() => {
    if (!sheet) return;
    const el = spriteRef.current;
    if (!el) return;
    const paint = (f) => {
      const row = TRACK_ROW[f.track];
      el.style.backgroundPosition = `${-f.col * SPRITE_CELL}px ${-row * SPRITE_CELL}px`;
    };
    const seqFor = () => hovering ? HOVER_SEQUENCE : SEQUENCES[activity.phase] ?? SEQUENCES.idle;
    paint(sequenceFrame(seqFor(), 0));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (ts) => {
      elapsed += ts - last;
      last = ts;
      paint(sequenceFrame(seqFor(), elapsed));
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
  const personAnim = (0, import_react4.useMemo)(() => {
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
        return "pl-person-bob 2.6s ease-in-out infinite";
    }
  }, [activity.phase]);
  const phaseActive = activity.sessionActive && activity.phase !== "idle";
  const phasePulsing = activity.phase === "thinking" || activity.phase === "tool";
  const [announceOpen, setAnnounceOpen] = (0, import_react4.useState)(false);
  const clickTimerRef = (0, import_react4.useRef)(null);
  const pendingClickRef = (0, import_react4.useRef)(false);
  const personDragRef = (0, import_react4.useRef)(null);
  const startPersonDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    personDragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.px, oy: pos.py, moved: false };
    const onMove = (ev) => {
      const d = personDragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const px = clamp(d.ox + dx, FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
      const py = clamp(d.oy + dy, FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
      updatePos({ px, py });
    };
    const onUp = () => {
      const d = personDragRef.current;
      const clicked = d ? !d.moved : false;
      personDragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!clicked) return;
      if (pendingClickRef.current) {
        pendingClickRef.current = false;
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        return;
      }
      pendingClickRef.current = true;
      clickTimerRef.current = setTimeout(() => {
        pendingClickRef.current = false;
        clickTimerRef.current = null;
        onTogglePanel?.();
      }, 240);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const [introIdx, setIntroIdx] = (0, import_react4.useState)(0);
  const rotMs = 2500;
  (0, import_react4.useEffect)(() => {
    if (!bubble) {
      setIntroIdx(0);
      return;
    }
    const timer = setInterval(() => setIntroIdx((i) => i + 1), rotMs);
    return () => clearInterval(timer);
  }, [bubble]);
  const bubblePos = (0, import_react4.useMemo)(() => {
    if (!bubble) return null;
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
      left = Math.min(Math.max(FLOAT_MARGIN, cx - W / 2), vw - W - FLOAT_MARGIN);
    } else if (view.py + PERSON_SIZE + gap + H <= vh - FLOAT_MARGIN) {
      dir = "below";
      top = view.py + PERSON_SIZE - ANCHOR + gap;
      left = Math.min(Math.max(FLOAT_MARGIN, cx - W / 2), vw - W - FLOAT_MARGIN);
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
  }, [bubble, bubbleW, bubbleH, view.px, view.py, viewVersion]);
  (0, import_react4.useEffect)(() => {
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
            if (k.startsWith(`pl:intro:${lang}:`) && k !== cacheKey) localStorage.removeItem(k);
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
  (0, import_react4.useEffect)(() => {
    const intervalMs = Math.max(5, settings?.personTipInterval ?? DEFAULT_SETTINGS.personTipInterval) * 1e3;
    const hideDuration = Math.max(10, settings?.personTipDuration ?? DEFAULT_SETTINGS.personTipDuration) * 1e3;
    let showT;
    let hideT;
    const loop = () => {
      showT = setTimeout(() => {
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
        setIntroIdx((i) => i + 1);
        setBubble(true);
        hideT = setTimeout(() => {
          if (!hoverRef.current && !dockedRef.current) setBubble(false);
          loop();
        }, hideDuration);
      }, intervalMs + Math.random() * intervalMs);
    };
    loop();
    return () => {
      if (showT) clearTimeout(showT);
      if (hideT) clearTimeout(hideT);
    };
  }, [settings?.personTipInterval, settings?.personTipDuration]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: `
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-person-bob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-5px) scale(1.03,.97); } }
@keyframes pl-person-shadow { 0%,100% { transform: scaleX(1); opacity: .22; } 50% { transform: scaleX(.82); opacity: .14; } }
@keyframes pl-person-blink { 0%,88%,100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
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
.pl-phase-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
.pl-phase-pulse { animation: pl-fade-pulse 1s ease-in-out infinite; }
@keyframes pl-fade-pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
` }),
    (0, import_react_dom2.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          "aria-label": T("pl.title"),
          onMouseDown: startPersonDrag,
          onDoubleClick: () => {
            const enabled = settings?.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled;
            if (!enabled) return;
            pendingClickRef.current = false;
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            setAnnounceOpen(true);
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
            bubble && bubblePos && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                ref: bubbleRef,
                style: {
                  position: "fixed",
                  left: bubblePos.left,
                  top: bubblePos.top,
                  zIndex: 2147483646,
                  // 建立层叠上下文，使尾巴 zIndex:-1 相对本气泡生效（否则会逃逸层级）
                  width: "max-content",
                  // 宽随内容动态伸缩
                  minWidth: 160,
                  maxWidth: 288,
                  padding: "6px 10px",
                  background: TONE3.panel,
                  color: TONE3.text,
                  border: `1px solid ${TONE3.border}`,
                  borderRadius: 8,
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  textAlign: "center",
                  boxShadow: "none",
                  animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
                  pointerEvents: "none"
                  // 气泡仅展示，穿透不挡页面点击
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontWeight: 600, letterSpacing: 2, marginBottom: 4 }, children: T("pl.floating.title") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "div",
                    {
                      style: {
                        color: TONE3.muted,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        animation: "pl-bubble-intro .45s ease"
                      },
                      children: intros[introIdx % intros.length]
                    },
                    introIdx
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", gap: 4, justifyContent: "center", marginTop: 7 }, children: intros.map((_, i) => {
                    const active = i === introIdx % intros.length;
                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "span",
                      {
                        style: {
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: active ? TONE3.accent : TONE3.quiet,
                          transition: "background .2s, transform .2s",
                          transform: active ? "scale(1.35)" : "scale(1)"
                        }
                      },
                      i
                    );
                  }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "span",
                    {
                      style: {
                        position: "absolute",
                        // 上/下方向：尖角在气泡水平居中（相对小人中心）；左/右方向：垂直居中
                        ...bubblePos.dir === "above" ? { left: bubblePos.tailX, bottom: -5 } : bubblePos.dir === "below" ? { left: bubblePos.tailX, top: -5 } : bubblePos.dir === "left" ? { top: bubblePos.tailY, right: -5 } : { top: bubblePos.tailY, left: -5 },
                        width: 10,
                        height: 10,
                        background: "inherit",
                        zIndex: -1,
                        // 让伸入气泡内的部分沉到背景之下，避免压盖内容
                        // 朝向决定用哪对邻边；四种朝向均旋转 45°，尖角指各方向
                        borderTop: bubblePos.dir === "below" || bubblePos.dir === "left" ? `1px solid ${TONE3.border}` : "none",
                        borderRight: bubblePos.dir === "above" || bubblePos.dir === "left" ? `1px solid ${TONE3.border}` : "none",
                        borderBottom: bubblePos.dir === "above" || bubblePos.dir === "right" ? `1px solid ${TONE3.border}` : "none",
                        borderLeft: bubblePos.dir === "below" || bubblePos.dir === "right" ? `1px solid ${TONE3.border}` : "none",
                        transform: "rotate(45deg)"
                      }
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { position: "relative", width: "100%", height: "100%", pointerEvents: "none" }, children: [
              sheet ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "div",
                {
                  ref: spriteRef,
                  style: {
                    position: "absolute",
                    inset: 0,
                    width: PERSON_SIZE,
                    height: PERSON_SIZE,
                    backgroundImage: `url(${sheet.url})`,
                    backgroundSize: `${SPRITE_CELL * SPRITE_COLUMNS}px ${SPRITE_CELL * SPRITE_ROWS}px`,
                    backgroundRepeat: "no-repeat",
                    filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))"
                  }
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: PERSON_SIZE, height: PERSON_SIZE, viewBox: "0 0 72 72", fill: "none", style: { position: "absolute", inset: 0, animation: personAnim, pointerEvents: "none", filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("title", { children: T("pl.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M22 47 C18 47 14 42 13 34 C12 26 18 21 25 20 C22 15 26 11 33 12 C40 11 44 15 41 20 C48 21 54 26 53 34 C52 42 48 47 44 47 Z", fill: "var(--dsw-alias-label-primary, #1f2937)", opacity: ".16" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("g", { className: "pl-person-arm", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ellipse", { cx: "36", cy: "52", rx: "12", ry: "9", fill: "var(--dsw-alias-label-primary, #1f2937)", opacity: "0.85" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ellipse", { cx: "26", cy: "50", rx: "5", ry: "4", fill: "var(--dsw-alias-interactive-bg-hover, rgba(100,116,139,.4))" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "36", cy: "34", r: "15", fill: "var(--dsw-alias-label-primary, #1f2937)" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "29", cy: "37", r: "2.4", fill: "#fff", opacity: ".55" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "43", cy: "37", r: "2.4", fill: "#fff", opacity: ".55" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("g", { style: { animation: "pl-person-blink 4s ease-in-out infinite", transformOrigin: "32px 34px" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "31", cy: "33", r: "2.6", fill: "#fff" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "41", cy: "33", r: "2.6", fill: "#fff" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "32", cy: "33.6", r: "1.2", fill: "#10141c" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "42", cy: "33.6", r: "1.2", fill: "#10141c" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M30 39.5 Q36 43.5 42 39.5", stroke: "#fff", strokeWidth: "1.8", strokeLinecap: "round" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
              )
            ] }),
            phaseActive && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                style: {
                  position: "absolute",
                  left: "50%",
                  bottom: "100%",
                  transform: "translateX(-50%)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  maxWidth: 200,
                  padding: "3px 9px",
                  background: TONE3.panel,
                  color: TONE3.text,
                  border: `1px solid ${TONE3.border}`,
                  borderRadius: 999,
                  fontSize: 10,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(17, 24, 39, .08)",
                  animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
                  pointerEvents: "none"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: phasePulsing ? "pl-phase-dot pl-phase-pulse" : "pl-phase-dot" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: T(PHASE_KEY[activity.phase]) })
                ]
              },
              activity.phase
            )
          ]
        }
      ),
      document.body
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(AnnouncementModal, { open: announceOpen, onClose: () => setAnnounceOpen(false), t: T })
  ] });
}

// src/client/components/stats/StatsPanel.tsx
var import_react5 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime4 = require("react/jsx-runtime");
var MONO3 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE4 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)"
};
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
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: TONE4.muted }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 } }),
    label
  ] });
}
function StatCard({ label, value, sub }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "9px 10px",
        background: TONE4.row,
        border: `1px solid ${TONE4.border}`,
        borderRadius: 8,
        minWidth: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 10, color: TONE4.quiet, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 16, fontWeight: 600, color: TONE4.text, lineHeight: 1.2 }, children: value }),
        sub ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 10, color: TONE4.muted }, children: sub }) : null
      ]
    }
  );
}
function Section({ title, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "h3",
      {
        style: {
          margin: 0,
          fontSize: 12,
          fontWeight: 560,
          color: TONE4.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6
        },
        children: title
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children })
  ] });
}
function BarList({
  rows,
  T
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "10px 12px", color: TONE4.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.emptyList") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 3 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "span",
        {
          style: { fontSize: 12, color: TONE4.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 },
          "data-tip": r.label,
          children: r.label
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, color: TONE4.muted, flexShrink: 0, whiteSpace: "nowrap" }, children: r.sub ? `${r.value} \xB7 ${r.sub}` : r.value })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { height: 6, background: TONE4.accentSoft, borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        style: {
          height: "100%",
          width: `${r.value / max * 100}%`,
          background: TONE4.accent,
          borderRadius: 3,
          transition: "width .3s ease",
          minWidth: r.value > 0 ? 3 : 0
        }
      }
    ) })
  ] }, r.key)) });
}
function TrendChart({ snapshots, T }) {
  if (snapshots.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "14px 12px", color: TONE4.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.trendEmpty") });
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
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "auto", role: "img", "aria-label": T("pl.stats.trend"), children: [
      lines.map((f) => {
        const y = TOP + innerH - innerH * f;
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("line", { x1: 0, x2: W, y1: y, y2: y, stroke: TONE4.border, strokeWidth: 1 }, f);
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
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("g", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "rect",
            {
              x: cx - gap / 2 - bw,
              y: TOP + innerH - ah,
              width: bw,
              height: Math.max(0, ah),
              rx: 1.5,
              fill: TONE4.accent,
              opacity: 0.85,
              "data-tip": `${T("pl.stats.trendAdded")}: ${a}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "rect",
            {
              x: cx + gap / 2,
              y: TOP + innerH - uh,
              width: bw,
              height: Math.max(0, uh),
              rx: 1.5,
              fill: TONE4.mint,
              opacity: 0.85,
              "data-tip": `${T("pl.stats.trendUsage")}: ${u}`
            }
          ),
          showLabel ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("text", { x: cx, y: H - 6, textAnchor: "middle", fontSize: 9, fill: TONE4.quiet, children: label }) : null
        ] }, s.id);
      })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Legend, { color: TONE4.accent, label: T("pl.stats.trendAdded") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Legend, { color: TONE4.mint, label: T("pl.stats.trendUsage") })
    ] })
  ] });
}
function StatsContent({
  stats,
  snapshots,
  T
}) {
  const usedRate = stats.total > 0 ? Math.round(stats.usedCount / stats.total * 100) : 0;
  const topTags = (0, import_react5.useMemo)(
    () => [...stats.tagStats].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8).map((t) => ({ key: t.name, label: t.name, value: t.count })),
    [stats.tagStats]
  );
  const topUsedRows = (0, import_react5.useMemo)(
    () => stats.topUsed.map((p) => ({
      key: p.title,
      label: p.title,
      value: p.usageCount,
      sub: formatAgo(p.lastUsedAt, T)
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.topUsed]
  );
  const topUsed7Rows = (0, import_react5.useMemo)(
    () => (stats.topUsed7 ?? []).map((p) => ({
      key: p.title,
      label: p.title,
      value: p.count
    })),
    [stats.topUsed7]
  );
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.total"), value: stats.total }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.totalUsage"), value: stats.totalUsage }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        StatCard,
        {
          label: T("pl.stats.usedRate"),
          value: `${usedRate}%`,
          sub: T("pl.stats.usedCount", { count: stats.usedCount })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.aiRefined"), value: `${stats.aiRefinedPct}%`, sub: T("pl.stats.aiRefinedCount", { count: stats.aiRefinedCount }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.used7"), value: stats.usedIn7Days }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.used30"), value: stats.usedIn30Days }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.added7"), value: stats.addedIn7Days }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.added30"), value: stats.addedIn30Days }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.aiRefined7"), value: stats.aiRefinedIn7 ?? 0 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.avgBody"), value: stats.avgBodyLength }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.trash"), value: stats.trashCount })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.trend"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TrendChart, { snapshots, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.analysis"), children: !lastSnap ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "10px 12px", color: TONE4.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.analysisEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: 11, color: TONE4.muted }, children: T("pl.stats.analysisPeriod", { start: formatDay(lastSnap.stats.rangeStart), end: formatDay(lastSnap.stats.rangeEnd) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.analysisAdded"), value: lastSnap.stats.addedCount }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          StatCard,
          {
            label: T("pl.stats.analysisUsage"),
            value: lastSnap.stats.usageCount,
            sub: T("pl.stats.analysisActive", { n: lastSnap.stats.usedPromptCount })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatCard, { label: T("pl.stats.analysisAi"), value: lastSnap.stats.aiRefinedCount })
      ] }),
      lastSnap.comment ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "9px 11px",
            background: TONE4.row,
            border: `1px solid ${TONE4.border}`,
            borderRadius: 8
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, fontWeight: 560, color: TONE4.accent }, children: T("pl.stats.aiComment") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { margin: 0, fontSize: 12, lineHeight: 1.6, color: TONE4.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: lastSnap.comment })
          ]
        }
      ) : null,
      lastSnap.stats.addedTitles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, color: TONE4.quiet }, children: T("pl.stats.analysisNewTitles") }),
        lastSnap.stats.addedTitles.map((t) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: { padding: "5px 10px", background: TONE4.row, border: `1px solid ${TONE4.border}`, borderRadius: 7, fontSize: 12, color: TONE4.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
            "data-tip": t,
            children: t
          },
          t
        ))
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.topUsed7"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BarList, { rows: topUsed7Rows, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.tags"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BarList, { rows: topTags, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.topUsed"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BarList, { rows: topUsedRows, T }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.recentUsed"), children: stats.recentUsed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "10px 12px", color: TONE4.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.emptyList") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: stats.recentUsed.map((p) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          background: TONE4.row,
          border: `1px solid ${TONE4.border}`,
          borderRadius: 7,
          alignItems: "baseline",
          minWidth: 0
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 12, color: TONE4.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }, "data-tip": p.title, children: p.title }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, color: TONE4.muted, flexShrink: 0, whiteSpace: "nowrap" }, children: formatAgo(p.lastUsedAt, T) })
        ]
      },
      p.title
    )) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Section, { title: T("pl.stats.sleeper"), children: stats.longestUnused.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "10px 12px", color: TONE4.quiet, fontSize: 12, textAlign: "center" }, children: T("pl.stats.sleeperEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: stats.longestUnused.map((p) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          background: TONE4.row,
          border: `1px solid ${TONE4.border}`,
          borderRadius: 7,
          alignItems: "baseline",
          minWidth: 0
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 12, color: TONE4.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }, "data-tip": p.title, children: p.title }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 11, color: TONE4.quiet, flexShrink: 0, whiteSpace: "nowrap" }, children: T("pl.stats.days", { days: p.days }) })
        ]
      },
      p.title
    )) }) })
  ] });
}
function StatsPanel({ t, onBack }) {
  const T = t ?? fallbackT;
  const [data, setData] = (0, import_react5.useState)(null);
  const [error, setError] = (0, import_react5.useState)(null);
  const load = (0, import_react5.useCallback)(() => {
    getStats().then((d) => {
      setData(d);
      setError(null);
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  (0, import_react5.useEffect)(() => {
    load();
  }, [load]);
  useDataChanged(() => {
    load();
  });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      style: {
        flex: 1,
        overflow: "auto",
        padding: "12px 14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: MONO3
      },
      children: [
        onBack && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_dsh_client_ui_primitives2.Button,
          {
            type: "button",
            variant: "primary",
            size: "sm",
            className: plBtn("primary", "sm"),
            onClick: onBack,
            icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M19 12H5M11 18l-6-6 6-6" })
              }
            ),
            children: T("pl.stats.back")
          }
        ) }),
        error && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: {
              padding: "9px 12px",
              color: TONE4.red,
              fontSize: 12,
              lineHeight: 1.5,
              textAlign: "center",
              wordBreak: "break-word",
              background: `color-mix(in srgb, ${TONE4.red} 8%, transparent)`,
              border: `1px solid ${TONE4.border}`,
              borderRadius: 7
            },
            children: [
              T("pl.stats.loadFail"),
              "\uFF1A",
              error
            ]
          }
        ),
        !data && !error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "24px 12px", color: TONE4.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
        data && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StatsContent, { stats: data.stats, snapshots: data.snapshots, T })
      ]
    }
  );
}

// src/client/components/common/SearchBox.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var MONO4 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE5 = {
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
  border: `1px solid ${TONE5.border}`,
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M12 17v5" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" })
      ]
    }
  );
}
function TagFilterBar(props) {
  const { tags, active, onChange, allLabel } = props;
  const chip = (selected) => ({
    ...chipStyle,
    background: selected ? TONE5.accentSoft : TONE5.row,
    color: selected ? TONE5.accent : TONE5.text,
    borderColor: selected ? TONE5.accent : TONE5.border,
    // pin 效果：选中标签轻微上浮、带投影，像被图钉钉在过滤条上
    transform: selected ? "translateY(-1px)" : "none",
    boxShadow: selected ? "0 2px 6px rgba(15, 23, 42, 0.18)" : "none",
    padding: selected ? "0 7px 0 6px" : "0 8px"
  });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: barStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("button", { type: "button", onClick: () => onChange(""), style: chip(active === ""), children: [
      active === "" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PinIcon, {}),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: chipTextStyle, children: allLabel ?? "\u5168\u90E8" })
    ] }),
    tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => onChange(active === tag ? "" : tag),
        "data-tip": tag,
        style: chip(active === tag),
        children: [
          active === tag && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PinIcon, {}),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: chipTextStyle, children: tag })
        ]
      },
      tag
    ))
  ] });
}
function Highlight({ text, query }) {
  const q = query?.trim();
  if (!q) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: text });
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
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: nodes });
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { position: "relative", width: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
          color: hasText ? TONE5.accent : TONE5.quiet,
          background: "transparent",
          border: "none",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M21 21l-4.35-4.35" })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
          color: TONE5.text,
          background: TONE5.row,
          border: `1px solid ${TONE5.border}`,
          borderRadius: 9,
          fontFamily: MONO4,
          fontSize: 13,
          outline: "none"
        }
      }
    ),
    hasText && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
          color: TONE5.quiet,
          background: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M15 9l-6 6M9 9l6 6" })
            ]
          }
        )
      }
    )
  ] });
}

// src/client/components/common/TagInput.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function TagInput({ value, onChange, suggestions, inputStyle: inputStyle7, t }) {
  const T = usePLT(t);
  const current = value.split("#").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "select",
      {
        value: current,
        onChange: (e) => onChange(e.target.value),
        style: {
          width: "100%",
          boxSizing: "border-box",
          ...inputStyle7
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "", children: T("pl.tagsNoneSelect") }),
          suggestions.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: tag, children: tag }, tag))
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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

// src/client/components/common/ConfirmDialog.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var MONO5 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TEXT = "var(--dsw-alias-label-primary, #1f2937)";
var PANEL = "var(--dsw-specific-sidebar-fill, #f5f6f7)";
var BORDER = "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))";
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
  if (!open) return null;
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    outline: "none",
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: MONO5,
    background: "transparent",
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
  };
  const hover = {
    background: "var(--dsw-alias-interactive-bg-hover)",
    color: TEXT
  };
  const hoverAccent = {
    background: "var(--dsw-alias-interactive-bg-hover)"
  };
  const hoverDanger = {
    background: "var(--dsw-alias-interactive-bg-hover)",
    color: RED
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.32)",
        padding: 20,
        boxSizing: "border-box"
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          style: {
            width: 360,
            maxWidth: "100%",
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "16px 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,.12)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            color: TEXT,
            fontFamily: MONO5
          },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: message }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", style: { ...btn, color: TEXT }, onMouseEnter: (e) => Object.assign(e.currentTarget.style, hover), onMouseLeave: (e) => {
                e.currentTarget.style.background = "transparent";
              }, onClick: onCancel, children: cancelLabel }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  style: {
                    ...btn,
                    color: danger ? RED : "var(--dsw-alias-brand-primary, #2563eb)",
                    fontWeight: 600
                  },
                  onMouseEnter: (e) => Object.assign(e.currentTarget.style, danger ? hoverDanger : hoverAccent),
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
      )
    }
  );
}

// src/client/components/common/TemplateVariables.tsx
var import_react6 = require("react");
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime8 = require("react/jsx-runtime");
var MONO6 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE6 = {
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
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { "data-var": name, style: hlStrong(color, active), "data-tip": `{{${name}}}`, children: val }, `f${key++}`)
      );
    } else {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { "data-var": name, style: hlPlaceholder(color, active), children: `{{${name}}}` }, `p${key++}`)
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
  const [values, setValues] = (0, import_react6.useState)({});
  const [focusName, setFocusName] = (0, import_react6.useState)(null);
  (0, import_react6.useEffect)(() => {
    if (open) {
      setValues({ ...pickVarMemory(variables), ...initialValues ?? {} });
      setWarnMsg(null);
    }
  }, [open, variables, initialValues]);
  const colorOf = (0, import_react6.useCallback)(
    (name) => varColor(Math.max(0, variables.indexOf(name))),
    [variables]
  );
  const previewRef = (0, import_react6.useRef)(null);
  (0, import_react6.useEffect)(() => {
    if (!focusName) return;
    const el = previewRef.current;
    if (!el) return;
    const target = el.querySelector(`[data-var="${CSS.escape(focusName)}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusName]);
  const [warnMsg, setWarnMsg] = (0, import_react6.useState)(null);
  const inputListRef = (0, import_react6.useRef)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("pl.template.title"),
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)"
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            width: 460,
            maxWidth: "calc(100vw - 40px)",
            maxHeight: "min(520px, calc(100vh - 40px))",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: TONE6.panel,
            border: `1px solid ${TONE6.borderStrong}`,
            borderRadius: 12,
            boxShadow: "none",
            padding: "18px 20px",
            color: TONE6.text,
            fontFamily: MONO6
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 4, flexShrink: 0 }, children: t("pl.template.title") }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { fontSize: 12, color: TONE6.muted, lineHeight: 1.6, flexShrink: 0 }, children: t("pl.template.desc") }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "div",
              {
                ref: inputListRef,
                style: {
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                },
                children: variables.map((name) => {
                  const color = colorOf(name);
                  const focused = focusName === name;
                  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                    "label",
                    {
                      style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE6.muted, flexShrink: 0 },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
                        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
                              borderColor: focused ? color : TONE6.border,
                              boxShadow: focused ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : "none",
                              background: focused ? `color-mix(in srgb, ${color} 6%, ${TONE6.row})` : TONE6.row,
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
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
              "div",
              {
                style: {
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: 11, color: TONE6.muted }, children: t("pl.template.preview") }),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
                        color: TONE6.text,
                        background: TONE6.row,
                        border: `1px solid ${TONE6.border}`,
                        borderRadius: 7,
                        fontFamily: MONO6
                      },
                      children: renderPreview(body, values, colorOf, focusName)
                    }
                  )
                ]
              }
            ),
            warnMsg && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
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
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 16 16", style: { flexShrink: 0 }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                    "path",
                    {
                      d: "M8 4v5M8 11.5v.5",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "1.8",
                      strokeLinecap: "round"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: warnMsg })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6, flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives3.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: onCancel, children: t("pl.cancel") }),
              showInsertAndSend && onInsertAndSend && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives3.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: submit, children: confirmLabel ?? t("pl.insert") })
            ] })
          ]
        }
      )
    }
  );
}
var inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE6.text,
  background: TONE6.row,
  border: `1px solid ${TONE6.border}`,
  borderRadius: 7,
  fontFamily: MONO6,
  fontSize: 13,
  outline: "none"
};

// src/client/components/sidebar/SidebarPromptLibrary.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var MONO7 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE7 = {
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
    const r = el.getBoundingClientRect();
    if (r.width >= 360 && r.height >= 240) return el;
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
  const anchorRef = (0, import_react7.useRef)(null);
  const [rect, setRect] = (0, import_react7.useState)(() => anchorRect(findChatWindow(panelRef.current)));
  (0, import_react7.useEffect)(() => {
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
function SidebarPromptLibrary(props) {
  const { inputActions, draft, t } = props ?? {};
  const T = usePLT(t);
  const settings = useSettings();
  const [float, setFloat] = (0, import_react7.useState)(loadFloatState);
  const collapsed = float.collapsed;
  const setCollapsed = (0, import_react7.useCallback)(
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
  const [prompts, setPrompts] = (0, import_react7.useState)([]);
  const [tagNames, setTagNames] = (0, import_react7.useState)([]);
  const [query, setQuery] = (0, import_react7.useState)("");
  const [tagFilter, setTagFilter] = (0, import_react7.useState)("");
  const [activeView, setActiveView] = (0, import_react7.useState)("list");
  const clearSearch = (0, import_react7.useCallback)(() => setQuery(""), []);
  const [phase, setPhase] = (0, import_react7.useState)("idle");
  const [error, setError] = (0, import_react7.useState)(null);
  const [editor, setEditor] = (0, import_react7.useState)(NO_EDITOR);
  const [copiedId, setCopiedId] = (0, import_react7.useState)(null);
  const [polish, setPolish] = (0, import_react7.useState)({ status: "idle" });
  const [polishResult, setPolishResult] = (0, import_react7.useState)("");
  const [polishError, setPolishError] = (0, import_react7.useState)(null);
  const [polishInsert, setPolishInsert] = (0, import_react7.useState)(null);
  const [template, setTemplate] = (0, import_react7.useState)(null);
  const [deleteConfirm, setDeleteConfirm] = (0, import_react7.useState)(null);
  const [viewing, setViewing] = (0, import_react7.useState)(null);
  const [expandedGroups, setExpandedGroups] = (0, import_react7.useState)(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
    }
    return /* @__PURE__ */ new Set();
  });
  const toggleGroup = (0, import_react7.useCallback)((tag) => {
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
  const [recentCollapsed, setRecentCollapsed] = (0, import_react7.useState)(false);
  const searchRef = (0, import_react7.useRef)(null);
  const refreshController = (0, import_react7.useRef)(null);
  const hover = useHoverDetail();
  const hoverEnabled = settings.hoverDetailEnabled;
  const panelRef = (0, import_react7.useRef)(null);
  const bodyRef = (0, import_react7.useRef)(null);
  const chat = useChatWindow(panelRef);
  const view = (0, import_react7.useMemo)(() => {
    const availW = Math.max(0, chat.right - chat.left - FLOAT_MARGIN2 * 2);
    const availH = Math.max(0, chat.bottom - chat.top - FLOAT_MARGIN2 * 2);
    const width = Math.min(float.width, availW);
    const height = Math.min(float.height, availH);
    const pos = clampPos(float.x, float.y, width, height, chat);
    return { ...pos, width, height };
  }, [float.x, float.y, float.width, float.height, chat]);
  const dragRef = (0, import_react7.useRef)(null);
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
  const resizeRef = (0, import_react7.useRef)(null);
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
  const refresh = (0, import_react7.useCallback)(() => {
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
  (0, import_react7.useEffect)(() => {
    if (collapsed) return;
    if (phase === "idle") refresh();
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [collapsed, phase, refresh]);
  const filtered = (0, import_react7.useMemo)(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (tagFilter && !(p.tags ?? []).some((t2) => t2.trim() === tagFilter)) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query, tagFilter]);
  const preSearchExpanded = (0, import_react7.useRef)(null);
  (0, import_react7.useEffect)(() => {
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
  const preTagExpanded = (0, import_react7.useRef)(null);
  (0, import_react7.useEffect)(() => {
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
  const allTags = (0, import_react7.useMemo)(() => {
    const s = new Set(tagNames);
    for (const p of prompts) for (const t2 of p.tags ?? []) s.add(t2);
    return Array.from(s).sort();
  }, [prompts, tagNames]);
  const scrollRef = (0, import_react7.useRef)(null);
  const seenIdsRef = (0, import_react7.useRef)(/* @__PURE__ */ new Set());
  (0, import_react7.useEffect)(() => {
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
  const insertText = (0, import_react7.useCallback)(
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
  const insert = (0, import_react7.useCallback)(
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
  const overwrite = (0, import_react7.useCallback)(
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
  const applyTemplate = (0, import_react7.useCallback)(
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
  const applyPolishInsert = (0, import_react7.useCallback)(
    (values) => {
      if (polishInsert === null) return;
      insertText(applyVariables(polishInsert, values));
      setPolishInsert(null);
    },
    [polishInsert, insertText]
  );
  const insertAndSend = (0, import_react7.useCallback)(
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
  const copy = (0, import_react7.useCallback)((p) => {
    navigator.clipboard.writeText(p.body).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((cur) => cur === p.id ? null : cur), 1500);
    }).catch(() => {
    });
  }, []);
  const startPolish = (0, import_react7.useCallback)((p) => {
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
  const closePolish = (0, import_react7.useCallback)(() => {
    setPolish({ status: "idle" });
    setError(null);
    setPolishInsert(null);
  }, []);
  (0, import_react7.useEffect)(() => {
    if (!polishError) return;
    const timer = setTimeout(() => setPolishError(null), 4e3);
    return () => clearTimeout(timer);
  }, [polishError]);
  const savePolish = (0, import_react7.useCallback)(() => {
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
  const tagGrouped = (0, import_react7.useMemo)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("style", { children: `@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
/* \u6D6E\u52A8\u9762\u677F\u5C55\u5F00\u65F6\u7684\u6D6E\u5165\u52A8\u753B\uFF1A\u8F7B\u5FAE\u4E0A\u79FB + \u7F29\u653E + \u6DE1\u5165 */
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: translateY(0) scale(1); } }
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
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("style", { children: PL_BUTTON_CSS }),
    settings.assistantEnabled && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptAssistant,
      {
        t: T,
        settings,
        onTogglePanel: () => updateFloat({ collapsed: !float.collapsed })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
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
          display: !settings.assistantEnabled || !settings.rightPanelEnabled || collapsed ? "none" : "flex",
          flexDirection: "column",
          animation: collapsed ? "none" : "pl-pop-in .28s cubic-bezier(.22,1,.36,1)",
          overflow: "hidden",
          color: TONE7.text,
          background: TONE7.panel,
          border: `1px solid ${TONE7.border}`,
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(15, 23, 42, .04), 0 8px 24px rgba(15, 23, 42, .1), 0 24px 64px rgba(15, 23, 42, .16)",
          fontFamily: MONO7
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
                color: TONE7.quiet,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 3,
                zIndex: 2
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M7 17L17 7M9 17h8V9", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "header",
            {
              onMouseDown: startPanelDrag,
              className: "pl-grab",
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 14px",
                borderBottom: `1px solid ${TONE7.border}`,
                flexShrink: 0,
                height: 52
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
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
                        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z", strokeLinejoin: "round" }),
                        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M8 9h3M8 12h3", strokeLinecap: "round" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    "strong",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 520,
                        color: TONE7.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: T("pl.title")
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { justifySelf: "end", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    import_dsh_client_ui_primitives4.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: refresh,
                      disabled: phase === "loading",
                      "data-tip": phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle"),
                      icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
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
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M23 4v6h-6M1 20v-6h6" }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
                          ]
                        }
                      ),
                      children: phase === "loading" ? T("pl.refreshing") : T("pl.refresh")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    import_dsh_client_ui_primitives4.Button,
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
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    import_dsh_client_ui_primitives4.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setActiveView((v) => v === "stats" ? "list" : "stats"),
                      disabled: editing,
                      "data-tip": activeView === "stats" ? T("pl.stats.back") : T("pl.stats.view"),
                      icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                        "svg",
                        {
                          width: "13",
                          height: "13",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: activeView === "stats" ? TONE7.accent : "currentColor",
                          strokeWidth: "2",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M4 20V14M10 20V10M16 20V4M22 20H2" })
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                    import_dsh_client_ui_primitives4.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onMouseDown: (e) => e.stopPropagation(),
                      onClick: () => setCollapsed(true),
                      "data-tip": T("pl.sidebar.collapse"),
                      icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M3 8l9 9 9-9" }) })
                    }
                  )
                ] })
              ]
            }
          ),
          !editing && activeView === "list" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { padding: "12px 12px 4px", flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                TagFilterBar,
                {
                  tags: allTags,
                  active: tagFilter,
                  onChange: setTagFilter,
                  allLabel: T("pl.tagFilterAll")
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { ref: scrollRef, className: "pl-scroll", style: { flex: 1, overflow: "auto", marginRight: 2, paddingRight: 4 }, children: [
              phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { padding: "20px 12px", color: TONE7.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
              phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { padding: "12px 12px", color: TONE7.red, fontSize: 13 }, children: error }),
              polishError && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "div",
                {
                  style: {
                    padding: "9px 12px",
                    margin: "6px 8px",
                    color: TONE7.red,
                    fontSize: 12,
                    lineHeight: 1.5,
                    textAlign: "center",
                    wordBreak: "break-word",
                    background: `color-mix(in srgb, ${TONE7.red} 8%, transparent)`,
                    border: `1px solid ${TONE7.border}`,
                    borderRadius: 7
                  },
                  children: polishError
                }
              ),
              polish.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { style: { fontSize: 13 }, children: T("pl.polishResult") }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closePolish, children: T("pl.close") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                  "textarea",
                  {
                    value: polishResult,
                    onChange: (e) => setPolishResult(e.target.value),
                    rows: 8,
                    style: { ...inputStyle2, resize: "vertical", minHeight: 220 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                    navigator.clipboard.writeText(polishResult).catch(() => {
                    });
                  }, children: T("pl.copy") }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                    if (hasVariables(polishResult)) setPolishInsert(polishResult);
                    else insertText(polishResult);
                  }, children: T("pl.insert") }),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: savePolish, children: T("pl.saveToLibrary") })
                ] })
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
                phase === "ready" && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { padding: "16px 12px", color: TONE7.muted, fontSize: 13, textAlign: "center" }, children: T("pl.empty") }),
                tagGrouped.map(([tag, items]) => {
                  const recentKey = T("pl.sidebar.recent");
                  const isRecentSection = tag === recentKey;
                  const isCollapsed = isRecentSection ? recentCollapsed : !expandedGroups.has(tag);
                  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
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
                          color: TONE7.quiet,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          userSelect: "none"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { display: "inline-flex", width: 12, justifyContent: "center", flexShrink: 0 }, children: isRecentSection ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("circle", { cx: "12", cy: "12", r: "9" }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M12 7v5l3 2" })
                          ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
                              children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M6 9l6 6 6-6" })
                            }
                          ) }),
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { fontSize: 10, opacity: 0.6, flexShrink: 0 }, children: T("pl.sidebar.groupCount", { count: items.length }) })
                        ]
                      }
                    ),
                    !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { padding: "2px 10px 8px", display: "flex", flexDirection: "column", gap: 8 }, children: items.map((p) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { style: {
                              fontSize: 13,
                              fontWeight: 460,
                              flex: "1 1 auto",
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }, "data-tip": p.title, children: query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Highlight, { text: clampTitle(p.title), query }) : clampTitle(p.title) }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }, children: [
                              isRecent(p.id) && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                                "span",
                                {
                                  "data-tip": T("pl.recentNew"),
                                  style: { width: 8, height: 8, borderRadius: "50%", background: TONE7.mint, display: "inline-block", flexShrink: 0 }
                                }
                              ),
                              p.usageCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: { color: TONE7.quiet, fontSize: 10, whiteSpace: "nowrap" }, children: T("pl.sidebar.usageCount", { count: p.usageCount }) })
                            ] })
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
                                color: TONE7.quiet,
                                fontSize: 11,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                fontFamily: MONO7,
                                lineHeight: 1.55,
                                maxHeight: 96,
                                overflow: "hidden",
                                borderRadius: 6,
                                cursor: hoverEnabled ? "pointer" : "default",
                                transition: "background 0.15s ease"
                              },
                              children: query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Highlight, { text: p.body, query }) : p.body
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: () => insert(p), children: T("pl.insert") }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => overwrite(p), children: T("pl.overwrite") }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => copy(p), children: copiedId === p.id ? T("pl.copied") : T("pl.copy") }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setViewing(p), children: T("pl.view") }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => startEdit(p), children: T("pl.edit") }),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                              import_dsh_client_ui_primitives4.Button,
                              {
                                type: "button",
                                variant: "ghost",
                                size: "sm",
                                className: plBtn("ghost", "sm"),
                                onClick: () => startPolish(p),
                                disabled: polish.status === "loading",
                                children: polish.status === "loading" && polish.id === p.id ? T("pl.polishing") : T("pl.polish")
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => remove(p), children: T("pl.delete") })
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
          !editing && activeView === "stats" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatsPanel, { t: T, onBack: () => setActiveView("list") }),
          editing && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE7.muted }, children: [
              T("pl.titleField"),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "input",
                {
                  value: editor.title,
                  onChange: (e) => setEditor({ ...editor, title: e.target.value }),
                  style: inputStyle2
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE7.muted }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                T("pl.bodyField"),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
                      insertVariableAt(bodyRef.current, editor.body, (v) => setEditor({ ...editor, body: v }), t("pl.insertVariableDefault"));
                    },
                    "data-tip": T("pl.insertVariableTitle"),
                    children: `{{${T("pl.insertVariableDefault")}}}`
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "textarea",
                {
                  ref: bodyRef,
                  value: editor.body,
                  onChange: (e) => setEditor({ ...editor, body: e.target.value }),
                  rows: 6,
                  style: { ...inputStyle2, resize: "vertical", minHeight: 250 }
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE7.muted }, children: [
              T("pl.tagsField"),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(TagInput, { value: editor.tags, onChange: (v) => setEditor({ ...editor, tags: v }), suggestions: allTags, inputStyle: inputStyle2, t })
            ] }),
            error && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { color: TONE7.red, fontSize: 12 }, children: error }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                setEditor(NO_EDITOR);
                setError(null);
              }, children: T("pl.cancel") }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives4.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveEditor, children: T("pl.save") })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "footer",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                padding: "8px 12px",
                borderTop: `1px solid ${TONE7.border}`,
                color: TONE7.muted,
                fontSize: 11,
                flexShrink: 0
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: T("pl.sidebar.tagTotal", {
                  count: tagGrouped.filter(
                    ([k]) => k !== T("pl.sidebar.recent") && k !== T("pl.sidebar.uncategorized")
                  ).length
                }) }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: T("pl.sidebar.total", { count: prompts.length }) })
              ]
            }
          ),
          viewing && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { role: "dialog", "aria-label": T("pl.view"), style: {
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            background: TONE7.panel
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: {
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: `1px solid ${TONE7.border}`
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { style: {
                flex: "1 1 auto",
                minWidth: 0,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }, "data-tip": viewing.title, children: clampTitle(viewing.title) }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                import_dsh_client_ui_primitives4.Button,
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
            viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }, children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: {
              maxWidth: 96,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "2px 8px",
              borderRadius: 8,
              fontSize: 11,
              color: TONE7.accent,
              background: TONE7.accentSoft
            }, "data-tip": tag, children: tag }, tag)) }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: {
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              padding: "10px 14px 14px",
              color: TONE7.text,
              fontSize: 12.5,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }, children: viewing.body })
          ] })
        ]
      }
    ),
    hoverEnabled && hover.overlay,
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
var inputStyle2 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO7,
  fontSize: 13,
  outline: "none"
};

// src/client/components/selection/SelectionAddPrompt.tsx
var import_react8 = require("react");
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime10 = require("react/jsx-runtime");
var MONO8 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
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
var TONE8 = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  panel: "var(--dsw-alias-bg-layer-1, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  red: "var(--dsw-alias-state-error-primary, #dc2626)"
};
var inputStyle3 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE8.text,
  background: "var(--dsw-alias-bg-layer-2, #ffffff)",
  border: `1px solid ${TONE8.border}`,
  borderRadius: 7,
  fontFamily: MONO8,
  fontSize: 13,
  outline: "none"
};
function tplTagChipStyle(active) {
  return {
    padding: "3px 9px",
    borderRadius: 11,
    border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE8.border}`,
    background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #4f9df5) 16%, transparent)" : "var(--dsw-alias-bg-layer-2, #ffffff)",
    color: active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE8.muted,
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
  color: TONE8.text,
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
  const [selection, setSelection] = (0, import_react8.useState)(null);
  const [open, setOpen] = (0, import_react8.useState)(false);
  const [copied, setCopied] = (0, import_react8.useState)(false);
  const copyingRef = (0, import_react8.useRef)(false);
  const [title, setTitle] = (0, import_react8.useState)("");
  const [body, setBody] = (0, import_react8.useState)("");
  const [tags, setTags] = (0, import_react8.useState)("");
  const bodyRef = (0, import_react8.useRef)(null);
  const [error, setError] = (0, import_react8.useState)(null);
  const [saving, setSaving] = (0, import_react8.useState)(false);
  const [allTags, setAllTags] = (0, import_react8.useState)([]);
  const [prompts, setPrompts] = (0, import_react8.useState)([]);
  const [tplPickerOpen, setTplPickerOpen] = (0, import_react8.useState)(false);
  const [tplText, setTplText] = (0, import_react8.useState)("");
  const [tplPrefill, setTplPrefill] = (0, import_react8.useState)({});
  const [tplPick, setTplPick] = (0, import_react8.useState)(null);
  const [tplQuery, setTplQuery] = (0, import_react8.useState)("");
  const [tplTag, setTplTag] = (0, import_react8.useState)("");
  const loadTags = (0, import_react8.useCallback)(() => {
    if (!enabled) return;
    listTags().then((list) => setAllTags(list.map((t) => t.name).sort())).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadTags);
  (0, import_react8.useEffect)(() => {
    loadTags();
  }, [loadTags]);
  const loadPrompts = (0, import_react8.useCallback)(() => {
    if (!enabled) return;
    listPrompts().then(setPrompts).catch(() => {
    });
  }, [enabled]);
  useDataChanged(loadPrompts);
  (0, import_react8.useEffect)(() => {
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
  const applyTpl = (0, import_react8.useCallback)(
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
  const templateTags = (0, import_react8.useMemo)(
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
  (0, import_react8.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("style", { children: `
.pl-selection-btn{background:var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))}
.pl-selection-btn:hover{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.12))}
.pl-selection-btn:active{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.18))}
.pl-selection-btn:disabled{opacity:.6;cursor:default}
` }),
    enabled && selection && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => copySelected(selection.text),
              "data-tip": T("pl.copySelected"),
              style: floatingBtnStyle,
              children: [
                copied ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("path", { d: "M20 6 9 17l-5-5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2", stroke: "currentColor", strokeWidth: "1.8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("path", { d: "M5 15V6a2 2 0 0 1 2-2h9", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
                ] }),
                copied ? T("pl.copiedSelected") : T("pl.copySelected")
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => openModal(selection.text),
              "data-tip": T("pl.addToLibrary"),
              style: floatingBtnStyle,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("path", { d: "M12 5v14M5 12h14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }),
                T("pl.addToLibrary")
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            "button",
            {
              type: "button",
              className: "pl-selection-btn",
              onClick: () => openTplPicker(selection.text),
              "data-tip": T("pl.applyTemplateTitle"),
              style: floatingBtnStyle,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("path", { d: "M4 6h9v4H4V6Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("path", { d: "M4 14h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
                ] }),
                T("pl.applyTemplate")
              ]
            }
          )
        ]
      }
    ),
    enabled && open && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.addToLibrary"),
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.35)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            style: {
              width: 520,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "min(600px, calc(100vh - 40px))",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 9,
              background: TONE8.panel,
              border: `1px solid ${TONE8.border}`,
              borderRadius: 12,
              boxShadow: "none",
              padding: "18px 20px",
              color: TONE8.text,
              fontFamily: MONO8
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 6, flexShrink: 0 }, children: T("pl.addToLibrary") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 9 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE8.muted, flexShrink: 0 }, children: [
                  T("pl.titleField"),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("input", { autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), style: inputStyle3 })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE8.muted, flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                    T("pl.bodyField"),
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                      import_dsh_client_ui_primitives5.Button,
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
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("textarea", { ref: bodyRef, value: body, onChange: (e) => setBody(e.target.value), rows: 8, style: { ...inputStyle3, resize: "vertical" } })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE8.muted, flexShrink: 0 }, children: [
                  T("pl.tagsField"),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TagInput, { value: tags, onChange: setTags, suggestions: allTags, inputStyle: inputStyle3, t: props?.t })
                ] }),
                error && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { color: TONE8.red, fontSize: 12, flexShrink: 0 }, children: error })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeModal, disabled: saving, children: T("pl.cancel") }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: save, disabled: saving, children: saving ? T("pl.saving") : T("pl.save") })
              ] })
            ]
          }
        )
      }
    ),
    enabled && tplPickerOpen && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": T("pl.applyTemplate"),
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.35)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            style: {
              width: 480,
              maxWidth: "calc(100vw - 40px)",
              // 固定宽高（480 × 560）：仅当页面窗口小于固定尺寸时才自适应收缩，
              // 内容多时列表在内部滚动，不随内容撑高
              height: "min(560px, calc(100vh - 40px))",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: TONE8.panel,
              border: `1px solid ${TONE8.border}`,
              borderRadius: 12,
              boxShadow: "none",
              padding: "18px 20px",
              color: TONE8.text,
              fontFamily: MONO8
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { style: { fontSize: 15, fontWeight: 520, paddingBottom: 2, flexShrink: 0 }, children: T("pl.applyTemplate") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { fontSize: 12, color: TONE8.muted, lineHeight: 1.6, flexShrink: 0 }, children: T("pl.applyTemplateDesc", { length: tplText.length }) }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                "div",
                {
                  style: {
                    boxSizing: "border-box",
                    maxHeight: 84,
                    overflow: "auto",
                    padding: "8px 10px",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: TONE8.muted,
                    background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                    border: `1px solid ${TONE8.border}`,
                    borderRadius: 7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    flexShrink: 0
                  },
                  children: tplText || " "
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                "input",
                {
                  autoFocus: true,
                  value: tplQuery,
                  onChange: (e) => setTplQuery(e.target.value),
                  placeholder: T("pl.search"),
                  style: inputStyle3
                }
              ),
              templateTags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", onClick: () => setTplTag(""), style: tplTagChipStyle(tplTag === ""), children: T("pl.tagFilterAll") }),
                templateTags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }, children: [
                templates.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { padding: "18px 12px", color: TONE8.muted, fontSize: 13, textAlign: "center" }, children: T("pl.applyTemplateEmpty") }),
                templates.map((p) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
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
                      border: `1px solid ${TONE8.border}`,
                      background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                      color: TONE8.text,
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
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }, children: clampTitle(p.title) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: extractVariables(p.body).slice(0, 4).map((v) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            lineHeight: 1,
                            padding: "3px 6px",
                            borderRadius: 6,
                            color: TONE8.muted,
                            border: `1px solid ${TONE8.border}`,
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives5.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setTplPickerOpen(false), children: T("pl.cancel") }) })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime11 = require("react/jsx-runtime");
var TONE9 = {
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
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    "div",
    {
      style: {
        padding: "8px 12px",
        borderTop: `1px solid ${TONE9.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { style: { fontSize: 12, color: TONE9.muted }, children: [
          page,
          " / ",
          totalPages
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
            import_dsh_client_ui_primitives6.Button,
            {
              type: "button",
              size: "sm",
              disabled: page <= 1,
              onClick: () => onChange(page - 1),
              style: { color: TONE9.text },
              children: [
                "\u2039",
                " \u4E0A\u4E00\u9875"
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
            import_dsh_client_ui_primitives6.Button,
            {
              type: "button",
              size: "sm",
              disabled: page >= totalPages,
              onClick: () => onChange(page + 1),
              style: { color: TONE9.text },
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
var import_react9 = require("react");
var AUTO_LEARN_DEBOUNCE_MS = 3e3;
var AUTO_LEARN_TOAST_MS = 2500;
var LOW_QUALITY_PATTERNS = [
  /^(好的|好|嗯|嗯嗯|噢|ok|okay|收到|谢谢|感谢|辛苦了|了解|明白了|可以|没问题|行|赞|666|厉害|不错|牛|绝了|好的收到|谢谢您)$/i,
  /^(你好|哈喽|hello|hi|嗨|早上好|中午好|下午好|晚上好|在吗)$/i
];
var EMOJI_OR_SYMBOL_RE = /^[\p{So}\p{Po}\p{Pi}\p{Pf}\p{Ps}\p{Pe}\p{Sc}…~！?。，；：、\s]+$/u;
var CLAUSE_BOUNDARY_RE = /[。！？!?；;…]|[\r\n]/g;
var STRUCTURE_HINT_RE = /[#*\-•1-9]\.|【|】|\[|\]|<|>|：|、/;
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
  if (clauseCount >= 1 || hasStructure) return true;
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
  for (const p of existingPrompts) {
    const b = p.body.trim();
    if (!b) continue;
    const ratio = Math.min(t.length, b.length) / Math.max(t.length, b.length);
    if (ratio < 0.5) continue;
    if (similarity(t, b) >= threshold) return true;
  }
  return false;
}
function useAutoLearn(draft, existingPrompts, settings, onLearned, onManual) {
  const timerRef = (0, import_react9.useRef)(null);
  const submittedRef = (0, import_react9.useRef)(/* @__PURE__ */ new Set());
  const manualActive = !!onManual && settings.autoLearnManualConfirm;
  (0, import_react9.useEffect)(() => {
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
  (0, import_react9.useEffect)(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

// src/client/components/chat/PromptLibraryButton.tsx
var import_jsx_runtime12 = require("react/jsx-runtime");
var MONO9 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE10 = {
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
  const activeRef = (0, import_react10.useRef)(false);
  const triggerIdxRef = (0, import_react10.useRef)(-1);
  const draftRef = (0, import_react10.useRef)(draft);
  const inputActionsRef = (0, import_react10.useRef)(inputActions);
  const onSelectRef = (0, import_react10.useRef)(onSelect);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
  onSelectRef.current = onSelect;
  lastPromptsForSelect = prompts;
  (0, import_react10.useEffect)(() => {
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
    `background: ${TONE10.panel}`,
    `border: 1px solid ${TONE10.borderStrong}`,
    "border-radius: 8px",
    `font-family: ${MONO9}`,
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
      item.style.background = TONE10.accentSoft;
      item.scrollIntoView({ block: "nearest" });
    }
  };
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = q ? t("pl.overlayNoMatch", { query: q }) : t("pl.empty");
    empty.style.cssText = [
      "padding: 10px",
      "font-size: 12px",
      `color: ${TONE10.quiet}`
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
      i === 0 ? `background: ${TONE10.accentSoft}` : ""
    ].join(";");
    const title = document.createElement("div");
    title.textContent = clampTitle(p.title);
    title.dataset.tip = p.title;
    title.style.cssText = [
      "font-size: 12px",
      "font-weight: 600",
      `color: ${TONE10.text}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis"
    ].join(";");
    const body = document.createElement("div");
    const preview = p.body.replace(/\s+/g, " ").trim();
    body.textContent = preview.length > 80 ? `${preview.slice(0, 80)}\u2026` : preview;
    body.style.cssText = [
      "font-size: 11px",
      `color: ${TONE10.muted}`,
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
    `color: ${TONE10.quiet}`,
    "border-top: 1px solid " + TONE10.border,
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
    next.style.background = TONE10.accentSoft;
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
  const [settings, setSettings] = (0, import_react10.useState)(DEFAULT_SETTINGS);
  const [ready, setReady] = (0, import_react10.useState)(false);
  const load = (0, import_react10.useCallback)(() => {
    getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);
  (0, import_react10.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react10.useEffect)(() => {
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
  const [open, setOpen] = (0, import_react10.useState)(false);
  const [activeView, setActiveView] = (0, import_react10.useState)("list");
  const [prompts, setPrompts] = (0, import_react10.useState)([]);
  const [deleteConfirm, setDeleteConfirm] = (0, import_react10.useState)(null);
  const [tagNames, setTagNames] = (0, import_react10.useState)([]);
  const [phase, setPhase] = (0, import_react10.useState)("idle");
  const [error, setError] = (0, import_react10.useState)(null);
  const [query, setQuery] = (0, import_react10.useState)("");
  const clearSearch = (0, import_react10.useCallback)(() => setQuery(""), []);
  const [tagFilter, setTagFilter] = (0, import_react10.useState)("");
  const [editor, setEditor] = (0, import_react10.useState)({
    mode: "none",
    title: "",
    body: "",
    tags: ""
  });
  const bodyRef = (0, import_react10.useRef)(null);
  const [toast, setToast] = (0, import_react10.useState)({ visible: false });
  const [template, setTemplate] = (0, import_react10.useState)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react10.useState)(null);
  const [polishConfirmUsed, setPolishConfirmUsed] = (0, import_react10.useState)(false);
  const [polishConfirmLoading, setPolishConfirmLoading] = (0, import_react10.useState)(false);
  const [viewing, setViewing] = (0, import_react10.useState)(null);
  (0, import_react10.useEffect)(() => {
    if (!open) setViewing(null);
  }, [open]);
  const [settings] = useSettings2();
  const panelId = (0, import_react10.useId)();
  const refreshController = (0, import_react10.useRef)(null);
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });
  const showToast = (0, import_react10.useCallback)((text) => {
    setToast({ visible: true, text });
    setTimeout(() => setToast({ visible: false }), AUTO_LEARN_TOAST_MS);
  }, []);
  const refresh = (0, import_react10.useCallback)(() => {
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
  useExportDownloaded((0, import_react10.useCallback)((count) => {
    showToast(T("pl.exported", { count }));
  }, [showToast, T]));
  useAutoLearn(
    draft,
    prompts,
    settings,
    (0, import_react10.useCallback)((learned) => {
      notifyDataChanged();
      showToast();
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
    (0, import_react10.useCallback)((text) => {
      setPendingConfirm(text);
      setPolishConfirmUsed(false);
    }, [])
  );
  (0, import_react10.useEffect)(() => {
    if (phase === "idle") refresh();
  }, [phase, refresh]);
  (0, import_react10.useEffect)(() => {
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
  const filtered = (0, import_react10.useMemo)(() => {
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
  const [page, setPage] = (0, import_react10.useState)(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  (0, import_react10.useEffect)(() => {
    setPage(1);
  }, [query, tagFilter, prompts]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allTags = (0, import_react10.useMemo)(() => {
    const s = new Set(tagNames);
    for (const p of prompts) for (const t2 of p.tags ?? []) s.add(t2);
    return Array.from(s).sort();
  }, [prompts, tagNames]);
  const insert = (0, import_react10.useCallback)(
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
  const selectFromOverlay = (0, import_react10.useCallback)(
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
  const overwrite = (0, import_react10.useCallback)(
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
  const applyTemplate = (0, import_react10.useCallback)(
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
  const insertAndSend = (0, import_react10.useCallback)(
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
  (0, import_react10.useEffect)(() => {
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
  const confirmLearn = (0, import_react10.useCallback)(async () => {
    const text = pendingConfirm;
    if (!text) return;
    setPendingConfirm(null);
    try {
      const learned = await learnPrompt(text, settings.autoLearnTag, polishConfirmUsed);
      setPolishConfirmUsed(false);
      markRecent(learned.id);
      notifyDataChanged();
      showToast();
    } catch {
    }
  }, [pendingConfirm, settings.autoLearnTag, showToast, polishConfirmUsed]);
  const cancelLearn = (0, import_react10.useCallback)(() => {
    setPendingConfirm(null);
    setPolishConfirmLoading(false);
    setPolishConfirmUsed(false);
  }, []);
  const polishLearnText = (0, import_react10.useCallback)(async () => {
    if (!pendingConfirm || polishConfirmLoading) return;
    setPolishConfirmLoading(true);
    try {
      const res = await polishPrompt(pendingConfirm);
      setPendingConfirm(res.polished);
      setPolishConfirmUsed(true);
    } catch {
    } finally {
      setPolishConfirmLoading(false);
    }
  }, [pendingConfirm, polishConfirmLoading]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO9
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
    color: TONE10.text,
    background: TONE10.panel,
    border: `1px solid ${TONE10.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO9
  };
  const showComposerButton = settings.showComposerButton;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { "data-prompt-library": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("style", { children: `@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("style", { children: PL_BUTTON_CSS }),
    showComposerButton && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        import_dsh_client_ui_primitives7.Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          className: plBtn("ghost", "sm"),
          onClick: handleButtonClick,
          "data-tip": T("pl.title"),
          "aria-label": T("pl.title"),
          "aria-expanded": open,
          "aria-controls": panelId,
          style: {
            color: "var(--dsw-alias-label-primary, #f2f6fc)",
            background: "var(--dsw-alias-bg-layer-2, #ffffff)",
            border: "1px solid var(--dsw-alias-border-l2, rgba(196,211,232,0.16))",
            opacity: 1
          },
          icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              "path",
              {
                d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z",
                stroke: "currentColor",
                strokeWidth: "1.6",
                strokeLinejoin: "round"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
          ] }),
          children: [
            T("pl.title"),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: {
              marginLeft: 2,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
          ]
        }
      ),
      toast.visible && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        "span",
        {
          role: "status",
          "aria-live": "polite",
          style: {
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            padding: "4px 10px",
            color: TONE10.panel,
            background: TONE10.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO9,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0.92,
            zIndex: 1001
          },
          children: [
            "\u2713 ",
            toast.text || T("pl.learnedToast")
          ]
        }
      ),
      pendingConfirm !== null && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
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
            width: 280,
            boxSizing: "border-box",
            padding: "10px 12px",
            color: TONE10.text,
            background: TONE10.panel,
            border: `1px solid ${TONE10.borderStrong}`,
            borderRadius: 10,
            fontFamily: MONO9
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { fontSize: 12, fontWeight: 600 }, children: T("pl.learnFound") }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              "div",
              {
                style: {
                  maxHeight: 96,
                  overflowY: "auto",
                  padding: "6px 8px",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: TONE10.muted,
                  background: TONE10.row,
                  border: `1px solid ${TONE10.border}`,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                },
                children: pendingConfirm
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                import_dsh_client_ui_primitives7.Button,
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
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: cancelLearn,
                    children: T("pl.cancel")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
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
      open && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_jsx_runtime12.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { id: panelId, role: "dialog", "aria-label": T("pl.title"), style: panelStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
          "header",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${TONE10.border}`,
              flexShrink: 0
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M8 9h3M8 12h3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { style: { fontSize: 14, fontWeight: 470, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: T("pl.title") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: refresh,
                    disabled: phase === "loading",
                    "data-tip": phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M23 4v6h-6M1 20v-6h6" }),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
                        ]
                      }
                    ),
                    children: phase === "loading" ? T("pl.refreshing") : T("pl.refresh")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
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
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => setActiveView((v) => v === "stats" ? "list" : "stats"),
                    disabled: editing,
                    "data-tip": activeView === "stats" ? T("pl.stats.back") : T("pl.stats.view"),
                    icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      "svg",
                      {
                        width: "13",
                        height: "13",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: activeView === "stats" ? TONE10.accent : "currentColor",
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M4 20V14M10 20V10M16 20V4M22 20H2" })
                      }
                    )
                  }
                )
              ] })
            ]
          }
        ),
        !editing && activeView === "list" && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { padding: "10px 16px 4px", flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            SearchBox,
            {
              value: query,
              onChange: setQuery,
              onSearch: () => setQuery(query),
              onClear: clearSearch,
              placeholder: T("pl.search")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            TagFilterBar,
            {
              tags: allTags,
              active: tagFilter,
              onChange: setTagFilter,
              allLabel: T("pl.tagFilterAll")
            }
          )
        ] }),
        activeView === "stats" && !editing ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(StatsPanel, { t: T, onBack: () => setActiveView("list") }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { flex: 1, overflow: "auto", minHeight: 0 }, children: [
          phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { padding: "20px 16px", color: TONE10.muted, fontSize: 13, textAlign: "center" }, children: T("pl.loading") }),
          phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { padding: "12px 16px", color: TONE10.red, fontSize: 13 }, children: error }),
          editing ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
              T("pl.titleField"),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "input",
                {
                  value: editor.title,
                  onChange: (e) => setEditor({ ...editor, title: e.target.value }),
                  style: inputStyle4
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                T("pl.bodyField"),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  import_dsh_client_ui_primitives7.Button,
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
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "textarea",
                {
                  ref: bodyRef,
                  value: editor.body,
                  onChange: (e) => setEditor({ ...editor, body: e.target.value }),
                  rows: 6,
                  style: { ...inputStyle4, resize: "vertical", minHeight: 90 }
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE10.muted }, children: [
              T("pl.tagsField"),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TagInput, { value: editor.tags, onChange: (v) => setEditor({ ...editor, tags: v }), suggestions: allTags, inputStyle: inputStyle4, t })
            ] }),
            error && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { color: TONE10.red, fontSize: 12 }, children: error })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("ul", { style: { listStyle: "none", margin: 0, padding: "4px 8px 8px" }, children: [
            phase === "ready" && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("li", { style: { padding: "18px 12px", color: TONE10.muted, fontSize: 13, textAlign: "center" }, children: T("pl.empty") }),
            pageItems.map((p) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
              "li",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "7px 10px",
                  marginBottom: 4,
                  borderRadius: 8,
                  background: TONE10.row,
                  border: `1px solid ${TONE10.border}`,
                  transition: "background-color .18s ease, border-color .18s ease"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                  e.currentTarget.style.borderColor = TONE10.borderStrong;
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = TONE10.row;
                  e.currentTarget.style.borderColor = TONE10.border;
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
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
                    isRecent(p.id) && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      "span",
                      {
                        "data-tip": T("pl.recentNew"),
                        style: { width: 7, height: 7, borderRadius: "50%", background: TONE10.mint, display: "inline-block", flexShrink: 0 }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                    "div",
                    {
                      style: {
                        color: TONE10.muted,
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: p.body.replace(/\s+/g, " ").trim()
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { display: "flex", gap: 4, alignItems: "center", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }, children: (p.tags ?? []).slice(0, 3).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      "span",
                      {
                        "data-tip": tag,
                        style: {
                          flexShrink: 0,
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "2px 6px",
                          borderRadius: 8,
                          color: TONE10.quiet,
                          border: `1px solid ${TONE10.border}`,
                          whiteSpace: "nowrap",
                          maxWidth: 96,
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        },
                        children: tag
                      },
                      tag
                    )) }),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { style: { display: "flex", gap: 4, flexShrink: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: () => insert(p), children: T("pl.insert") }),
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => overwrite(p), children: T("pl.overwrite") }),
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setViewing(p), children: T("pl.view") }),
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => startEdit(p), children: T("pl.edit") }),
                      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => remove(p), children: T("pl.delete") })
                    ] })
                  ] })
                ]
              },
              p.id
            ))
          ] })
        ] }),
        editing && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
          "div",
          {
            style: {
              flexShrink: 0,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              padding: "12px 16px",
              borderTop: `1px solid ${TONE10.border}`
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => {
                setEditor(NO_EDITOR2);
                setError(null);
              }, children: T("pl.cancel") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives7.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: saveEditor, children: T("pl.save") })
            ]
          }
        ),
        !editing && activeView === "list" && phase === "ready" && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Pagination, { page, totalPages, onChange: setPage }),
        viewing && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { role: "dialog", "aria-label": T("pl.view"), style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: TONE10.panel
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: `1px solid ${TONE10.border}`
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { style: {
              flex: "1 1 auto",
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }, "data-tip": viewing.title, children: clampTitle(viewing.title) }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              import_dsh_client_ui_primitives7.Button,
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
          viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }, children: viewing.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: {
            padding: "2px 8px",
            borderRadius: 8,
            fontSize: 11,
            color: TONE10.accent,
            background: TONE10.accentSoft,
            whiteSpace: "nowrap"
          }, children: tag }, tag)) }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: {
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "10px 14px 14px",
            color: TONE10.text,
            fontSize: 12.5,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }, children: viewing.body })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(SidebarPromptLibrary, { inputActions, draft, t }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(SelectionAddPrompt, { t, enabled: settings.selectionAddEnabled, inputActions, draft }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
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
var inputStyle4 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO9,
  fontSize: 13,
  outline: "none"
};

// src/client/components/chat/AIPolishButton.tsx
var import_react11 = require("react");
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime13 = require("react/jsx-runtime");
var MONO10 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE11 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)"
};
var TOAST_MS = 2200;
function SparkleIcon({ spinning }) {
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
      style: { animation: spinning ? "pl-polish-spin 0.9s linear infinite" : "none" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "path",
          {
            d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z",
            stroke: "currentColor",
            strokeWidth: "1.6",
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
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
  const [settings, setSettings] = (0, import_react11.useState)(DEFAULT_SETTINGS);
  const load = (0, import_react11.useCallback)(() => {
    getSettings().then(setSettings).catch(() => {
    });
  }, []);
  (0, import_react11.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react11.useEffect)(() => {
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
  const [status, setStatus] = (0, import_react11.useState)("idle");
  const [result, setResult] = (0, import_react11.useState)("");
  const [error, setError] = (0, import_react11.useState)("");
  const [toast, setToast] = (0, import_react11.useState)("");
  (0, import_react11.useEffect)(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  const showToast = (0, import_react11.useCallback)((msg) => setToast(msg), []);
  const closeResult = (0, import_react11.useCallback)(() => {
    setStatus("idle");
    setResult("");
    setError("");
  }, []);
  const handlePolish = (0, import_react11.useCallback)(() => {
    const text = draft.trim();
    if (!text) {
      showToast(T("pl.polishEmpty"));
      return;
    }
    setStatus("polishing");
    setError("");
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
  const applyResult = (0, import_react11.useCallback)(() => {
    if (!result) return;
    inputActions.setDraft(result);
    showToast(T("pl.polishReplaced"));
    closeResult();
  }, [result, inputActions, showToast, closeResult, T]);
  const copyResult = (0, import_react11.useCallback)(() => {
    navigator.clipboard.writeText(result).catch(() => {
    });
    showToast(T("pl.copied"));
  }, [result, showToast, T]);
  const containerStyle = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO10
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
    color: TONE11.text,
    background: TONE11.panel,
    border: `1px solid ${TONE11.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO10
  };
  if (!settings.showAIPolishButton) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { "data-prompt-library-ai-polish": true, style: containerStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("style", { children: PL_BUTTON_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("style", { children: `@keyframes pl-polish-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      import_dsh_client_ui_primitives8.Button,
      {
        type: "button",
        variant: "ghost",
        size: "sm",
        className: plBtn("ghost", "sm"),
        onClick: handlePolish,
        disabled: status === "polishing" || !draft.trim(),
        "data-tip": status === "polishing" ? T("pl.polishLoadingTitle") : draft.trim() ? T("pl.polishHoverContent") : T("pl.polishEmpty"),
        "aria-label": T("pl.polish"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(SparkleIcon, { spinning: status === "polishing" }),
        children: status === "polishing" ? T("pl.polishing") : T("pl.polish")
      }
    ),
    toast && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        style: {
          position: "absolute",
          bottom: "calc(100% + 4px)",
          right: 0,
          padding: "4px 10px",
          color: TONE11.panel,
          background: status === "error" ? TONE11.red : TONE11.mint,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: MONO10,
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
    status === "done" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_jsx_runtime13.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("section", { role: "dialog", "aria-label": T("pl.polishResult"), style: panelStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { style: { fontSize: 13, fontWeight: 470 }, children: T("pl.polishResult") }),
        error && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { color: TONE11.red, fontSize: 11 }, children: error })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        "textarea",
        {
          value: result,
          onChange: (e) => setResult(e.target.value),
          rows: 7,
          "aria-label": T("pl.polishResultAria"),
          style: {
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            padding: "7px 9px",
            color: TONE11.text,
            background: TONE11.row,
            border: `1px solid ${TONE11.border}`,
            borderRadius: 7,
            fontFamily: MONO10,
            fontSize: 12,
            outline: "none"
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: copyResult, children: T("pl.copy") }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: closeResult, children: T("pl.close") }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_dsh_client_ui_primitives8.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: applyResult, children: T("pl.replaceContent") })
      ] })
    ] }) })
  ] });
}

// src/client/components/chat/ContextRecommendations.tsx
var import_react12 = require("react");
var import_jsx_runtime14 = require("react/jsx-runtime");
var MONO11 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE12 = {
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
  const [enabled, setEnabled] = (0, import_react12.useState)(false);
  (0, import_react12.useEffect)(() => {
    getSettings().then((s) => setEnabled(!!s.contextRecommendEnabled)).catch(() => {
    });
  }, []);
  (0, import_react12.useEffect)(() => {
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
  const userText = (0, import_react12.useMemo)(() => {
    if (!nodes) return "";
    const users = nodes.filter((n) => n.kind === "user");
    return users.slice(-CONTEXT_USER_COUNT).map((n) => textOf(n.content)).join("\n").trim();
  }, [nodes]);
  const [prompts, setPrompts] = (0, import_react12.useState)([]);
  const refresh = (0, import_react12.useCallback)(() => {
    listPrompts().then(setPrompts).catch(() => {
    });
  }, []);
  (0, import_react12.useEffect)(() => {
    refresh();
  }, [refresh]);
  useDataChanged(refresh);
  const hits = (0, import_react12.useMemo)(() => {
    if (!enabled || !userText) return [];
    const kw = extractKeywords(userText);
    if (kw.size === 0) return [];
    const now = Date.now();
    return prompts.map((p) => ({ p, score: scorePrompt(p, kw, now) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, LIMIT).map((x) => x.p);
  }, [enabled, userText, prompts]);
  const [template, setTemplate] = (0, import_react12.useState)(null);
  if (!enabled || !useSession || !useInput || !inputActions || hits.length === 0 || draft.trim() && !template) {
    return null;
  }
  const insert = (p) => {
    if (hasVariables(p.body)) {
      setTemplate({ p });
      return;
    }
    usePrompt(p.id).catch(() => {
    });
    inputActions.setDraft(p.body);
  };
  const applyTpl = (values) => {
    if (!template) return;
    const filled = applyVariables(template.p.body, values);
    usePrompt(template.p.id).catch(() => {
    });
    inputActions.setDraft(filled);
    setTemplate(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      "div",
      {
        style: {
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 var(--dsh-composer-side-clearance, 16px)"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
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
              fontFamily: MONO11,
              fontSize: 12,
              color: TONE12.muted,
              overflow: "hidden"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: TONE12.quiet }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { color: TONE12.accent }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    "path",
                    {
                      d: "M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4",
                      stroke: "currentColor",
                      strokeWidth: "1.8",
                      strokeLinecap: "round"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("circle", { cx: "12", cy: "12", r: "3.2", stroke: "currentColor", strokeWidth: "1.8" })
                ] }),
                T("pl.recommend")
              ] }),
              hits.map((p) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
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
                    border: `1px solid ${TONE12.border}`,
                    borderRadius: 13,
                    background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                    color: TONE12.text,
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
                    e.currentTarget.style.borderColor = TONE12.border;
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { style: { flexShrink: 0, color: TONE12.accent, display: "inline-flex" }, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M4 6h9v4H4V6Zm0 8h9v4H4v-4ZM17 6h3M17 12h3M17 18h3", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: clampTitle(p.title) })
                  ]
                },
                p.id
              ))
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
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
var import_react13 = require("react");
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime15 = require("react/jsx-runtime");
var MONO12 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE13 = {
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
  background: TONE13.panel,
  border: `1px solid ${TONE13.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12
};
var moduleTitleStyle = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE13.text
};
var moduleDescStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE13.quiet
};
function ModuleCard(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("section", { style: moduleStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: moduleTitleStyle, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: moduleDescStyle, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 16 16",
              style: {
                flexShrink: 0,
                color: TONE13.muted,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)"
              },
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children })
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
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { display: "flex", flexDirection: "column", gap: 2, flex: 1, opacity: dim }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 11, color: TONE13.quiet }, children: desc })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
              accentColor: TONE13.accent
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
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { fontSize: 11, color: TONE13.quiet }, children: [
            min,
            "-",
            max
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
              color: TONE13.text,
              background: TONE13.row,
              border: `1px solid ${TONE13.border}`,
              borderRadius: 5,
              fontFamily: MONO12,
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
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { padding: "8px 0", opacity: dim }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                color: TONE13.text,
                background: TONE13.row,
                border: `1px solid ${TONE13.border}`,
                borderRadius: 5,
                fontFamily: MONO12,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "text"
              }
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE13.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
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
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { padding: "8px 0", opacity: dim }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                color: TONE13.text,
                background: TONE13.row,
                border: `1px solid ${TONE13.border}`,
                borderRadius: 5,
                fontFamily: MONO12,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "pointer"
              },
              children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("option", { value: opt.value, children: opt.label }, opt.value))
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE13.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
}
function SettingsSection(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [loading, setLoading] = (0, import_react13.useState)(true);
  const [draft, setDraft] = (0, import_react13.useState)(DEFAULT_SETTINGS);
  const [selectables, setSelectables] = (0, import_react13.useState)([]);
  const [openLearn, setOpenLearn] = (0, import_react13.useState)(false);
  const [openPanel, setOpenPanel] = (0, import_react13.useState)(false);
  const [openDisplay, setOpenDisplay] = (0, import_react13.useState)(false);
  const [openUpdate, setOpenUpdate] = (0, import_react13.useState)(false);
  const [openLab, setOpenLab] = (0, import_react13.useState)(false);
  const [updateInfo, setUpdateInfo] = (0, import_react13.useState)(null);
  const [checking, setChecking] = (0, import_react13.useState)(false);
  const [updating, setUpdating] = (0, import_react13.useState)(false);
  const [updateMsg, setUpdateMsg] = (0, import_react13.useState)(null);
  const saveTimerRef = (0, import_react13.useRef)(null);
  (0, import_react13.useEffect)(() => {
    getSettings().then((s) => setDraft(s)).catch(() => {
    }).finally(() => setLoading(false));
    getAiSelectables().then(setSelectables).catch(() => setSelectables([]));
  }, []);
  const saveSettings = (0, import_react13.useCallback)((next) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateSettings(next).then(() => {
        window.dispatchEvent(new CustomEvent("pl:settings-changed", { detail: next }));
      }).catch(() => {
      });
    }, 300);
  }, []);
  const updateAndSave = (0, import_react13.useCallback)((patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);
  const handleCheckUpdate = (0, import_react13.useCallback)(async () => {
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
  const handleApplyUpdate = (0, import_react13.useCallback)(async () => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { padding: 16, color: TONE13.quiet, fontFamily: MONO12, fontSize: 13 }, children: T("pl.loading") });
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
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
    "div",
    {
      style: {
        color: TONE13.text,
        fontFamily: MONO12,
        maxWidth: 520
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { padding: "2px 0 4px", display: "flex", flexDirection: "column", gap: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 20, fontWeight: 700, letterSpacing: 1, color: TONE13.text, lineHeight: 1.2 }, children: T("pl.setSectionTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 12, color: TONE13.quiet, lineHeight: 1.5 }, children: T("pl.set.setSectionDesc") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModuleLearn"),
            desc: T("pl.setModuleLearnDesc"),
            open: openLearn,
            onToggle: () => setOpenLearn((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.autoLearn"),
                  desc: T("pl.set.autoLearnDesc"),
                  checked: draft.autoLearnEnabled,
                  onChange: (v) => updateAndSave({ autoLearnEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "div",
                {
                  style: {
                    marginLeft: 22,
                    display: "flex",
                    flexDirection: "column"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      ToggleRow,
                      {
                        label: T("pl.set.manualConfirm"),
                        desc: T("pl.set.manualConfirmDesc"),
                        checked: draft.autoLearnManualConfirm,
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ autoLearnManualConfirm: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      TextRow,
                      {
                        label: T("pl.set.autoLearnTag"),
                        value: draft.autoLearnTag,
                        placeholder: "auto-learned",
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ autoLearnTag: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      NumberRow,
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
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      ToggleRow,
                      {
                        label: T("pl.set.aiEnrich"),
                        desc: T("pl.set.aiEnrichDesc"),
                        checked: draft.aiEnrichEnabled,
                        disabled: !draft.autoLearnEnabled,
                        onChange: (v) => updateAndSave({ aiEnrichEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                      "div",
                      {
                        style: {
                          marginLeft: 22,
                          display: "flex",
                          flexDirection: "column"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                            SelectRow,
                            {
                              label: T("pl.set.aiProvider"),
                              value: draft.aiProvider,
                              options: providerOptions,
                              desc: T("pl.set.aiProviderDesc"),
                              disabled: !draft.autoLearnEnabled || !draft.aiEnrichEnabled,
                              onChange: (v) => updateAndSave({ aiProvider: v })
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                            SelectRow,
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
                    )
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModulePanel"),
            desc: T("pl.setModulePanelDesc"),
            open: openPanel,
            onToggle: () => setOpenPanel((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                NumberRow,
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
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                NumberRow,
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
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                NumberRow,
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
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModuleDisplay"),
            desc: T("pl.setModuleDisplayDesc"),
            open: openDisplay,
            onToggle: () => setOpenDisplay((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.assistant"),
                  desc: T("pl.set.assistantDesc"),
                  checked: draft.assistantEnabled,
                  onChange: (v) => updateAndSave({ assistantEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "div",
                {
                  style: {
                    marginLeft: 22,
                    display: "flex",
                    flexDirection: "column"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      ToggleRow,
                      {
                        label: T("pl.set.announcement"),
                        desc: T("pl.set.announcementDesc"),
                        checked: draft.announcementEnabled,
                        disabled: !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ announcementEnabled: v })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      ToggleRow,
                      {
                        label: T("pl.set.rightPanel"),
                        desc: T("pl.set.rightPanelDesc"),
                        checked: draft.rightPanelEnabled,
                        disabled: !draft.assistantEnabled,
                        onChange: (v) => updateAndSave({ rightPanelEnabled: v })
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.showComposerBtn"),
                  desc: T("pl.set.showComposerBtnDesc"),
                  checked: draft.showComposerButton,
                  onChange: (v) => updateAndSave({ showComposerButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.showPolishBtn"),
                  desc: T("pl.set.showPolishBtnDesc"),
                  checked: draft.showAIPolishButton,
                  onChange: (v) => updateAndSave({ showAIPolishButton: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.tildaTrigger"),
                  desc: T("pl.set.tildaTriggerDesc"),
                  checked: draft.tildaTriggerEnabled,
                  onChange: (v) => updateAndSave({ tildaTriggerEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.hoverDetail"),
                  desc: T("pl.set.hoverDetailDesc"),
                  checked: draft.hoverDetailEnabled,
                  onChange: (v) => updateAndSave({ hoverDetailEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.selectionAdd"),
                  desc: T("pl.set.selectionAddDesc"),
                  checked: draft.selectionAddEnabled,
                  onChange: (v) => updateAndSave({ selectionAddEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          ModuleCard,
          {
            title: T("pl.setModuleUpdate"),
            desc: T("pl.setModuleUpdateDesc"),
            open: openUpdate,
            onToggle: () => setOpenUpdate((v) => !v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                ToggleRow,
                {
                  label: T("pl.set.autoUpdate"),
                  desc: T("pl.set.autoUpdateDesc"),
                  checked: draft.autoUpdateEnabled,
                  onChange: (v) => updateAndSave({ autoUpdateEnabled: v })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "8px 0"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: 13 }, children: T("pl.set.updateReminder") }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: handleCheckUpdate,
                          disabled: checking || updating,
                          style: {
                            padding: "5px 12px",
                            fontSize: 12,
                            color: checking || updating ? TONE13.quiet : TONE13.text,
                            background: TONE13.row,
                            border: `1px solid ${TONE13.border}`,
                            borderRadius: 5,
                            cursor: checking || updating ? "default" : "pointer"
                          },
                          children: checking ? T("pl.set.updateChecking") : T("pl.set.checkUpdate")
                        }
                      )
                    ] }),
                    checking ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE13.quiet }, children: T("pl.set.updateChecking") }) : updating ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: 11, color: TONE13.accent }, children: T("pl.set.updating") }) : updateInfo ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { fontSize: 11, color: TONE13.quiet }, children: [
                        T("pl.set.updateCurrent", { version: updateInfo.current }),
                        updateInfo.hasUpdate && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE13.accent, marginLeft: 4 }, children: T("pl.set.updateAvailable", { version: updateInfo.latest }) })
                      ] }),
                      updateInfo.hasUpdate && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                          import_dsh_client_ui_primitives9.Button,
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
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
                              border: `1px solid ${TONE13.border}`,
                              color: TONE13.muted,
                              fontSize: 11,
                              lineHeight: 1.55
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                "svg",
                                {
                                  width: "14",
                                  height: "14",
                                  viewBox: "0 0 16 16",
                                  style: { flexShrink: 0, marginTop: 1, color: "var(--dsw-alias-state-warning-primary, #f59e0b)" },
                                  "aria-hidden": "true",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: T("pl.set.updateRequireRestartHint") })
                            ]
                          }
                        )
                      ] })
                    ] }) : null,
                    updateMsg && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          alignItems: "flex-start"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                color: updateMsg.ok ? TONE13.success : TONE13.red,
                                lineHeight: 1.5
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                  "svg",
                                  {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 16 16",
                                    style: { flexShrink: 0 },
                                    "aria-hidden": "true",
                                    children: updateMsg.ok ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                      "path",
                                      {
                                        d: "M3 8.5l3.2 3.2L13 4.8",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "1.8",
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round"
                                      }
                                    ) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: updateMsg.text })
                              ]
                            }
                          ),
                          updateMsg.ok && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
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
                                color: TONE13.text,
                                fontSize: 12,
                                lineHeight: 1.6
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
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
                                    children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                                      "path",
                                      {
                                        d: "M8 1.5A6.5 6.5 0 1 1 8 14.5 6.5 6.5 0 0 1 8 1.5zm0 2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zM6.5 7.5a.8.8 0 1 0 1.6 0V7a.8.8 0 0 0-1.6 0v.5zM7.2 6a.8.8 0 0 1 1.6 0v3.2a.8.8 0 0 1-1.6 0V6z",
                                        fill: "currentColor"
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("strong", { style: { fontSize: 12, fontWeight: 600 }, children: T("pl.set.updateSuccessRestartTitle") }),
                                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: TONE13.muted, fontSize: 11.5 }, children: T("pl.set.updateSuccessRestartHint") })
                                ] })
                              ]
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
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          ModuleCard,
          {
            title: T("pl.setModuleLab"),
            desc: T("pl.setModuleLabDesc"),
            open: openLab,
            onToggle: () => setOpenLab((v) => !v),
            children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              ToggleRow,
              {
                label: T("pl.set.chatCharacter"),
                desc: T("pl.set.chatCharacterDesc"),
                checked: draft.applyCharacterToChat,
                onChange: (v) => updateAndSave({ applyCharacterToChat: v })
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "footer",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 0 12px",
              marginTop: 16
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "span",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    color: TONE13.text
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.4L5.7 21 8 13.8 2 9.2h7.6L12 2z", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }) }),
                    "master1Sun"
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "a",
                {
                  href: "https://github.com/master1Sun/dsh-prompt-library",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: TONE13.accent,
                    textDecoration: "none",
                    fontSize: 11,
                    opacity: 0.9,
                    transition: "opacity 0.15s ease"
                  },
                  onMouseEnter: (e) => e.currentTarget.style.opacity = "1",
                  onMouseLeave: (e) => e.currentTarget.style.opacity = "0.9",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M12 0C5.37 0 0 5.4 0 12.06c0 5.33 3.44 9.84 8.21 11.43.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .32.22.7.83.58A12.4 12.4 0 0 0 24 12.06C24 5.4 18.63 0 12 0z" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: "github.com/master1Sun/dsh-prompt-library" })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                "div",
                {
                  "aria-label": "\u7248\u6743\u4FE1\u606F",
                  style: {
                    width: "100%",
                    marginTop: 8,
                    paddingTop: 12,
                    borderTop: `1px dashed ${TONE13.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    color: TONE13.quiet,
                    fontSize: 11,
                    lineHeight: 1.55,
                    textAlign: "center",
                    fontFamily: MONO12
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { children: [
                        "\xA9 ",
                        (/* @__PURE__ */ new Date()).getFullYear(),
                        " master1Sun"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { "aria-hidden": "true", children: "\xB7" }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: "All rights reserved" }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { "aria-hidden": "true", children: "\xB7" }),
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: {
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: TONE13.row,
                        border: `1px solid ${TONE13.border}`,
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        color: TONE13.muted
                      }, children: "MIT" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { children: T("pl.footer.disclaimer") })
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

// src/client/components/settings/SettingsDataSection.tsx
var import_react16 = require("react");
var import_dsh_client_ui_primitives12 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/components/settings/modules/SkillImportModal.tsx
var import_react14 = require("react");
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime16 = require("react/jsx-runtime");
var MONO13 = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var TONE14 = {
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
var inputStyle5 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE14.text,
  background: TONE14.row,
  border: `1px solid ${TONE14.border}`,
  borderRadius: 7,
  fontFamily: MONO13,
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
  const [entries, setEntries] = (0, import_react14.useState)([]);
  const [validation, setValidation] = (0, import_react14.useState)(null);
  const [fixLog, setFixLog] = (0, import_react14.useState)([]);
  const [saving, setSaving] = (0, import_react14.useState)(false);
  const [aiState, setAiState] = (0, import_react14.useState)("idle");
  const [aiResult, setAiResult] = (0, import_react14.useState)(null);
  const [msg, setMsg] = (0, import_react14.useState)(null);
  const fileRef = (0, import_react14.useRef)(null);
  const jsonRef = (0, import_react14.useRef)(null);
  const bodyRefs = (0, import_react14.useRef)({});
  const seqRef = (0, import_react14.useRef)(0);
  const [collapsed, setCollapsed] = (0, import_react14.useState)({});
  (0, import_react14.useEffect)(() => {
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
  const addEntries = (0, import_react14.useCallback)(
    (incoming) => {
      setEntries((prev) => {
        const next = [...prev];
        for (const it of incoming) {
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
  const updateEntry = (0, import_react14.useCallback)((key, patch) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, ...patch } : e));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);
  const toggleChecked = (0, import_react14.useCallback)((key) => {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, checked: !e.checked } : e));
  }, []);
  const removeEntry = (0, import_react14.useCallback)((key) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);
  const toggleCollapse = (0, import_react14.useCallback)((key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
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
  const validateTemplateVars = (0, import_react14.useCallback)(
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
  const validateEntries = (0, import_react14.useCallback)(
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
        for (const m of validateTemplateVars(e.body)) {
          issues.push({ key: e.key, entryTitle, message: m, fixable: true });
        }
      }
      return { ok: issues.length === 0, issues, fixable: issues.some((i) => i.fixable) };
    },
    [T, validateTemplateVars]
  );
  const handleValidate = (0, import_react14.useCallback)(async () => {
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
  const handleFix = (0, import_react14.useCallback)(() => {
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
  const handleSave = (0, import_react14.useCallback)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title"),
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.35)",
        padding: 20,
        boxSizing: "border-box"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
          "div",
          {
            style: {
              width: 1020,
              maxWidth: "90%",
              height: "min(720px, calc(100vh - 60px))",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: TONE14.panel,
              border: `1px solid ${TONE14.borderStrong}`,
              borderRadius: 12,
              padding: "18px 20px",
              color: TONE14.text,
              fontFamily: MONO13
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("strong", { style: { fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }, children: T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                      color: TONE14.muted,
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE14.text;
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE14.muted;
                    },
                    children: "\u2715"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: 12, color: TONE14.quiet, lineHeight: 1.6, flexShrink: 0 }, children: T(mode === "export" ? "pl.skillModal.exportSubtitle" : "pl.skillModal.subtitle") }),
              mode === "import" && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: 11, color: TONE14.quiet }, children: entries.length === 0 ? T("pl.skillModal.selectHint") : T("pl.skillModal.selectHint") + ` \xB7 ${checkedCount}/${entries.length}` })
              ] }),
              mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: 11, color: TONE14.quiet }, children: [
                  T("pl.skillModal.selectHint"),
                  " \xB7 ",
                  checkedCount,
                  "/",
                  entries.length
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }, children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                "div",
                {
                  style: {
                    padding: "22px 0",
                    textAlign: "center",
                    fontSize: 12,
                    color: TONE14.quiet,
                    border: `1px dashed ${TONE14.border}`,
                    borderRadius: 8
                  },
                  children: T("pl.skillModal.noEntry")
                }
              ) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px 12px",
                    background: TONE14.row,
                    border: `1px solid ${TONE14.border}`,
                    borderRadius: 8,
                    opacity: entry.checked ? 1 : 0.55,
                    transition: "opacity .18s"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                            color: TONE14.muted,
                            cursor: "pointer",
                            transition: "background-color .18s, color .18s"
                          },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                            e.currentTarget.style.color = TONE14.text;
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = TONE14.muted;
                          },
                          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "input",
                        {
                          type: "checkbox",
                          checked: entry.checked,
                          onChange: () => toggleChecked(entry.key),
                          "data-tip": T("pl.skillModal.selectHint"),
                          style: { flexShrink: 0, accentColor: TONE14.accent }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "input",
                        {
                          type: "text",
                          value: entry.title,
                          onChange: (e) => updateEntry(entry.key, { title: e.target.value }),
                          placeholder: T("pl.skillModal.titleLabel"),
                          disabled: !entry.checked,
                          style: { ...inputStyle5, flex: 1, minWidth: 0 }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            fontSize: 10,
                            lineHeight: 1,
                            color: entry.source === "disk" ? TONE14.muted : TONE14.accent,
                            border: `1px solid ${entry.source === "disk" ? TONE14.border : "var(--dsw-alias-brand-primary, #8ec5ff)"}`,
                            borderRadius: 4,
                            padding: "2px 5px"
                          },
                          children: entry.source === "file" ? T("pl.skillModal.fromFile") : entry.source === "disk" ? T("pl.skillModal.fromDisk") : entry.source === "json" ? T("pl.skillModal.fromJson") : T("pl.skillModal.fromLibrary")
                        }
                      ),
                      entry.exists && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                        "span",
                        {
                          style: {
                            flexShrink: 0,
                            fontSize: 10,
                            lineHeight: 1,
                            color: TONE14.success,
                            border: `1px solid color-mix(in srgb, ${TONE14.success} 45%, transparent)`,
                            borderRadius: 4,
                            padding: "2px 5px"
                          },
                          children: T("pl.skillModal.exists")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                            color: TONE14.quiet,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: MONO13,
                            padding: "2px 4px",
                            borderRadius: 4,
                            transition: "color .18s, background-color .18s"
                          },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.color = TONE14.red;
                            e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.color = TONE14.quiet;
                            e.currentTarget.style.backgroundColor = "transparent";
                          },
                          children: T("pl.skillModal.remove")
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "div",
                      {
                        style: {
                          display: "grid",
                          gridTemplateRows: collapsed[entry.key] ? "0fr" : "1fr",
                          transition: "grid-template-rows .22s ease",
                          marginTop: collapsed[entry.key] ? 0 : 7
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
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
                              mode === "export" && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                                "input",
                                {
                                  type: "text",
                                  value: entry.name,
                                  onChange: (e) => updateEntry(entry.key, { name: e.target.value }),
                                  placeholder: T("pl.skillModal.nameLabel"),
                                  disabled: !entry.checked,
                                  style: inputStyle5
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                                "input",
                                {
                                  type: "text",
                                  value: entry.summary,
                                  onChange: (e) => updateEntry(entry.key, { summary: e.target.value }),
                                  placeholder: T("pl.skillModal.summaryLabel"),
                                  disabled: !entry.checked,
                                  style: inputStyle5
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: 8 }, children: [
                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                                      ...inputStyle5,
                                      flex: 1,
                                      minHeight: 200,
                                      resize: "vertical",
                                      lineHeight: 1.6,
                                      whiteSpace: "pre-wrap"
                                    }
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                                  import_dsh_client_ui_primitives10.Button,
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
                    entry.aiFailed && entry.aiFailReason && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
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
                          color: TONE14.red,
                          background: "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { flexShrink: 0 }, children: T("pl.skillModal.aiFailed") }),
                          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { minWidth: 0 }, children: entry.aiFailReason })
                        ]
                      }
                    )
                  ]
                },
                entry.key
              )) }),
              msg && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: msg.error ? TONE14.red : TONE14.text
                  },
                  children: msg.text
                }
              ),
              validation && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                    color: validation.ok ? TONE14.success : TONE14.red,
                    background: validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                    border: `1px solid ${validation.ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"}`
                  },
                  children: validation.ok ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.validatePass") }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.issueCount", { count: validation.issues.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: validation.issues.map((issue, idx) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("li", { children: [
                          "\u300C",
                          issue.entryTitle,
                          "\u300D",
                          issue.message
                        ] }, idx))
                      }
                    ),
                    validation.fixable && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: TONE14.muted }, children: T("pl.skillModal.fixHint", {
                        fixable: validation.issues.filter((i) => i.fixable).length
                      }) })
                    ] })
                  ] })
                }
              ),
              fixLog.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
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
                    color: TONE14.success,
                    background: "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.fixDone", { count: fixLog.length }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: fixLog.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("li", { children: f }, idx))
                      }
                    )
                  ]
                }
              ),
              mode === "export" && aiState !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
                    color: aiState === "running" ? TONE14.accent : aiResult && aiResult.errors.length > 0 ? TONE14.red : TONE14.success,
                    background: aiState === "running" ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 8%, transparent)" : aiResult && aiResult.errors.length > 0 ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
                    border: `1px solid ${aiState === "running" ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)" : aiResult && aiResult.errors.length > 0 ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"}`
                  },
                  children: aiState === "running" ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.aiValidating") }) : aiResult && aiResult.errors.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.aiDoneErrors", {
                      done: aiResult.done,
                      n: aiResult.errors.length
                    }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                      "ul",
                      {
                        style: {
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        },
                        children: aiResult.errors.map((err, idx) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("li", { children: [
                          "\u300C",
                          err.title,
                          "\u300D",
                          err.reason
                        ] }, idx))
                      }
                    )
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { children: T("pl.skillModal.aiDone", { done: aiResult?.done ?? 0 }) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexShrink: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  import_dsh_client_ui_primitives10.Button,
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
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  import_dsh_client_ui_primitives10.Button,
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
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "input",
          {
            ref: fileRef,
            type: "file",
            accept: ".md,text/markdown,text/plain",
            style: { display: "none" },
            onChange: onPickFile
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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

// src/client/components/settings/modules/BackupModule.tsx
var import_react15 = require("react");
var import_dsh_client_ui_primitives11 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime17 = require("react/jsx-runtime");
var MONO14 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE15 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)"
};
var moduleStyle2 = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE15.panel,
  border: `1px solid ${TONE15.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12
};
var moduleTitleStyle2 = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE15.text
};
var moduleDescStyle2 = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE15.quiet
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
function ModuleCard2(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("section", { style: moduleStyle2, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: moduleTitleStyle2, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: moduleDescStyle2, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 16 16",
              style: {
                flexShrink: 0,
                color: TONE15.muted,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)"
              },
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children })
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { style: { display: "flex", flexDirection: "column", gap: 2, flex: 1, opacity: dim }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 11, color: TONE15.quiet }, children: desc })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
              accentColor: TONE15.accent
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { style: { fontSize: 11, color: TONE15.quiet }, children: [
            min,
            "-",
            max
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
              color: TONE15.text,
              background: TONE15.row,
              border: `1px solid ${TONE15.border}`,
              borderRadius: 5,
              fontFamily: MONO14,
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
function SelectRow2({
  label,
  value,
  options,
  onChange,
  desc,
  disabled
}) {
  const dim = disabled ? 0.45 : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { padding: "8px 0", opacity: dim }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 13 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
                color: TONE15.text,
                background: TONE15.row,
                border: `1px solid ${TONE15.border}`,
                borderRadius: 5,
                fontFamily: MONO14,
                fontSize: 12,
                outline: "none",
                cursor: disabled ? "not-allowed" : "pointer"
              },
              children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: opt.value, children: opt.label }, opt.value))
            }
          )
        ]
      }
    ),
    desc && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { fontSize: 11, color: TONE15.quiet, marginTop: 4, lineHeight: 1.5 }, children: desc })
  ] });
}
function BackupModule(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [draft, setDraft] = (0, import_react15.useState)(DEFAULT_SETTINGS);
  const [open, setOpen] = (0, import_react15.useState)(false);
  const [backups, setBackups] = (0, import_react15.useState)([]);
  const [backuping, setBackuping] = (0, import_react15.useState)(false);
  const [backupMsg, setBackupMsg] = (0, import_react15.useState)(null);
  const [restoreTarget, setRestoreTarget] = (0, import_react15.useState)(null);
  const [restoring, setRestoring] = (0, import_react15.useState)(false);
  const [deleteTarget, setDeleteTarget] = (0, import_react15.useState)(null);
  const [deleting, setDeleting] = (0, import_react15.useState)(false);
  const saveTimerRef = (0, import_react15.useRef)(null);
  (0, import_react15.useEffect)(() => {
    getSettings().then((s) => setDraft(s)).catch(() => {
    });
  }, []);
  const saveSettings = (0, import_react15.useCallback)((next) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateSettings(next).then(() => {
        window.dispatchEvent(new CustomEvent("pl:settings-changed", { detail: next }));
      }).catch(() => {
      });
    }, 300);
  }, []);
  const updateAndSave = (0, import_react15.useCallback)((patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);
  const refreshBackups = (0, import_react15.useCallback)(() => {
    listBackups().then(
      (list) => setBackups(list),
      () => setBackups([])
    );
  }, []);
  (0, import_react15.useEffect)(() => {
    if (open) refreshBackups();
  }, [open, refreshBackups]);
  const handleBackupNow = (0, import_react15.useCallback)(async () => {
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
  const handleRestore = (0, import_react15.useCallback)(async () => {
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
  const handleDelete = (0, import_react15.useCallback)(async () => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
      ModuleCard2,
      {
        title: T("pl.setModuleBackup"),
        desc: T("pl.setModuleBackupDesc"),
        open,
        onToggle: () => setOpen((v) => !v),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            ToggleRow2,
            {
              label: T("pl.set.backupEnabled"),
              desc: T("pl.set.backupEnabledDesc"),
              checked: draft.backupEnabled,
              onChange: (v) => updateAndSave({ backupEnabled: v })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
            "div",
            {
              style: {
                marginLeft: 22,
                display: "flex",
                flexDirection: "column"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  SelectRow2,
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
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  NumberRow2,
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
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  SelectRow2,
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
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "8px 0"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 13 }, children: T("pl.set.backupListTitle") }),
                  /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                    import_dsh_client_ui_primitives11.Button,
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
                backupMsg && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: backupMsg.error ? TONE15.red : TONE15.text
                    },
                    children: backupMsg.text
                  }
                ),
                backups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { fontSize: 11, color: TONE15.quiet }, children: T("pl.set.backupEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      maxHeight: 200,
                      overflow: "auto"
                    },
                    children: backups.map((b) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 9px",
                          background: TONE15.row,
                          border: `1px solid ${TONE15.border}`,
                          borderRadius: 6,
                          fontSize: 12
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                            "span",
                            {
                              style: {
                                flexShrink: 0,
                                fontSize: 10,
                                lineHeight: 1,
                                color: b.format === "json" ? TONE15.accent : TONE15.muted,
                                border: `1px solid ${b.format === "json" ? "var(--dsw-alias-brand-primary, #8ec5ff)" : TONE15.border}`,
                                borderRadius: 4,
                                padding: "2px 5px"
                              },
                              children: b.format
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 11, color: TONE15.quiet, flexShrink: 0 }, children: formatSize(b.size) }),
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: 11, color: TONE15.quiet, flexShrink: 0 }, children: formatBackupTime(b.createdAt) }),
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                            import_dsh_client_ui_primitives11.Button,
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
                          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
                                color: TONE15.quiet,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: MONO14,
                                padding: "2px 4px",
                                borderRadius: 4,
                                transition: "color .18s, background-color .18s"
                              },
                              onMouseEnter: (e) => {
                                e.currentTarget.style.color = TONE15.red;
                                e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                              },
                              onMouseLeave: (e) => {
                                e.currentTarget.style.color = TONE15.quiet;
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
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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

// src/client/components/settings/SettingsDataSection.tsx
var import_jsx_runtime18 = require("react/jsx-runtime");
var MONO15 = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "\u9ED1\u4F53", sans-serif';
var TONE16 = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #f87171)"
};
var inputStyle6 = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE16.text,
  background: TONE16.row,
  border: `1px solid ${TONE16.border}`,
  borderRadius: 7,
  fontFamily: MONO15,
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
var moduleStyle3 = {
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
var moduleTitleStyle3 = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE16.text
};
var moduleDescStyle3 = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE16.quiet
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
function ModuleCard3(props) {
  const { title, desc, open, onToggle, children } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { style: moduleStyle3, children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: moduleTitleStyle3, children: title }),
            desc && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: moduleDescStyle3, children: desc })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
              children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children })
  ] });
}
function PromptCheckRow(props) {
  const { title, body, checked, onToggle } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "label",
    {
      className: "pl-data-card",
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        background: TONE16.row,
        border: `1px solid ${TONE16.border}`,
        borderRadius: 9,
        cursor: "pointer",
        userSelect: "none"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { type: "checkbox", checked, onChange: onToggle, style: { marginTop: 3 } }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
              children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "span",
            {
              style: {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                fontSize: 11,
                color: TONE16.quiet,
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
function SettingsDataSection(props) {
  const { t } = props ?? {};
  const T = usePLT(t);
  const importRef = (0, import_react16.useRef)(null);
  const [promptList, setPromptList] = (0, import_react16.useState)([]);
  const [promptLoading, setPromptLoading] = (0, import_react16.useState)(false);
  const [exportSelected, setExportSelected] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [skillImportOpen, setSkillImportOpen] = (0, import_react16.useState)(false);
  const [skillExportOpen, setSkillExportOpen] = (0, import_react16.useState)(false);
  const [skillExportInitial, setSkillExportInitial] = (0, import_react16.useState)([]);
  const [tagList, setTagList] = (0, import_react16.useState)([]);
  const [renamingTag, setRenamingTag] = (0, import_react16.useState)(null);
  const [newTag, setNewTag] = (0, import_react16.useState)("");
  const [trashList, setTrashList] = (0, import_react16.useState)([]);
  const [trashSelected, setTrashSelected] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [trashLoading, setTrashLoading] = (0, import_react16.useState)(false);
  const [openIE, setOpenIE] = (0, import_react16.useState)(false);
  const [openTags, setOpenTags] = (0, import_react16.useState)(false);
  const [openTrash, setOpenTrash] = (0, import_react16.useState)(false);
  const [exportView, setExportView] = (0, import_react16.useState)("list");
  const [exportCollapsed, setExportCollapsed] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [msg, setMsg] = (0, import_react16.useState)(null);
  const msgTimerRef = (0, import_react16.useRef)(null);
  const [pendingConfirm, setPendingConfirm] = (0, import_react16.useState)(null);
  const requestConfirm = (0, import_react16.useCallback)((message, danger, action) => {
    setPendingConfirm({ message, danger, action });
  }, []);
  const showMsg = (0, import_react16.useCallback)((text, error = false) => {
    setMsg({ text, error });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  (0, import_react16.useEffect)(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );
  const refreshPrompts = (0, import_react16.useCallback)(() => {
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
  }, [showMsg]);
  const refreshTags = (0, import_react16.useCallback)(() => {
    listTags().then(
      (list) => setTagList(list),
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [showMsg]);
  const refreshTrash = (0, import_react16.useCallback)(() => {
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
  (0, import_react16.useEffect)(() => {
    refreshPrompts();
    refreshTags();
    refreshTrash();
  }, [refreshPrompts, refreshTags, refreshTrash]);
  useDataChanged(() => {
    refreshPrompts();
    refreshTags();
    refreshTrash();
  });
  const exportSelectedPrompts = (0, import_react16.useCallback)(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.exportNeedSelect"), true);
      return;
    }
    exportPrompts(ids).then(
      (backup) => {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const d = /* @__PURE__ */ new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        a.href = url;
        a.download = `prompt-library-backup-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showMsg(T("pl.exported", { count: backup.prompts.length }));
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [exportSelected, showMsg, T]);
  const openSkillExport = (0, import_react16.useCallback)(() => {
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
  const toggleExport = (0, import_react16.useCallback)((id) => {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleExportAll = (0, import_react16.useCallback)(() => {
    setExportSelected(
      (prev) => prev.size === promptList.length ? /* @__PURE__ */ new Set() : new Set(promptList.map((p) => p.id))
    );
  }, [promptList]);
  const groupedPrompts = (0, import_react16.useMemo)(() => {
    const groups = /* @__PURE__ */ new Map();
    for (const p of promptList) {
      const key = p.tags?.[0]?.trim() || T("pl.sidebar.uncategorized");
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [promptList, T]);
  const onImportFile = (0, import_react16.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          requestConfirm(T("pl.importConfirm"), false, () => {
            importPrompts(data).then(
              (res) => {
                showMsg(
                  T("pl.imported", {
                    imported: res.imported,
                    updated: res.updated,
                    skipped: res.skipped
                  })
                );
                notifyDataChanged();
                refreshPrompts();
                refreshTags();
              },
              (err) => showMsg(err instanceof Error ? err.message : String(err), true)
            );
          });
        } catch (err) {
          showMsg(err instanceof Error ? err.message : String(err), true);
        }
      };
      reader.readAsText(file);
    },
    [showMsg, T, refreshPrompts, refreshTags, requestConfirm]
  );
  const addTag = (0, import_react16.useCallback)(() => {
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
  const confirmRenameTag = (0, import_react16.useCallback)(() => {
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
        refreshPrompts();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [renamingTag, showMsg, T, refreshPrompts]);
  const removeTag = (0, import_react16.useCallback)(
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
            refreshPrompts();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), true)
        );
      });
    },
    [showMsg, T, tagList, refreshPrompts, requestConfirm]
  );
  const toggleTrash = (0, import_react16.useCallback)((id) => {
    setTrashSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleTrashAll = (0, import_react16.useCallback)(() => {
    setTrashSelected(
      (prev) => prev.size === trashList.length ? /* @__PURE__ */ new Set() : new Set(trashList.map((x) => x.id))
    );
  }, [trashList]);
  const restoreSelected = (0, import_react16.useCallback)(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    restoreTrash(ids).then(
      (res) => {
        showMsg(T("pl.trashRestoreDone", { count: res.restored }));
        notifyDataChanged();
        refreshTrash();
        refreshPrompts();
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true)
    );
  }, [trashSelected, showMsg, T, refreshTrash, refreshPrompts]);
  const deleteSelected = (0, import_react16.useCallback)(() => {
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
  const restoreOne = (0, import_react16.useCallback)(
    (item) => {
      requestConfirm(T("pl.trashRestoreOneConfirm", { title: item.title }), false, () => {
        restoreTrash([item.id]).then(
          (res) => {
            showMsg(T("pl.trashRestoreDone", { count: res.restored }));
            notifyDataChanged();
            refreshTrash();
            refreshPrompts();
          },
          (e) => showMsg(e instanceof Error ? e.message : String(e), true)
        );
      });
    },
    [showMsg, T, refreshTrash, refreshPrompts, requestConfirm]
  );
  const deleteOne = (0, import_react16.useCallback)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { color: TONE16.text, fontFamily: MONO15, maxWidth: 640 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("style", { children: `
.pl-data-action{background:var(--dsw-alias-bg-layer-3, #1d2735)}
.pl-data-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-data-action:active{background:var(--dsw-alias-interactive-bg-active)}
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
` }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { padding: "2px 0 4px", display: "flex", flexDirection: "column", gap: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { fontSize: 20, fontWeight: 700, letterSpacing: 1, color: TONE16.text, lineHeight: 1.2 }, children: T("pl.set.dataSection") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 12, color: TONE16.quiet, lineHeight: 1.5 }, children: T("pl.set.dataSectionDesc") })
    ] }),
    msg && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      "div",
      {
        style: {
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.5,
          color: msg.error ? TONE16.red : TONE16.text,
          background: TONE16.row,
          border: `1px solid ${TONE16.border}`,
          borderRadius: 6,
          padding: "7px 10px"
        },
        children: msg.text
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
      ModuleCard3,
      {
        title: T("pl.moduleImportExport"),
        desc: T("pl.moduleImportExportDesc"),
        open: openIE,
        onToggle: () => setOpenIE((v) => !v),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
              "label",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: TONE16.muted,
                  cursor: "pointer",
                  userSelect: "none"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "inline-flex", borderRadius: 7, border: `1px solid ${TONE16.border}`, overflow: "hidden" }, children: ["list", "group"].map((view) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
                  fontFamily: MONO15,
                  backgroundColor: exportView === view ? "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))" : "transparent",
                  color: exportView === view ? TONE16.text : TONE16.muted,
                  transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)"
                },
                children: view === "list" ? T("pl.viewList") : T("pl.viewGroup")
              },
              view
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              import_dsh_client_ui_primitives12.Button,
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
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              import_dsh_client_ui_primitives12.Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: plBtn("ghost", "sm"),
                onClick: () => importRef.current?.click(),
                "data-tip": T("pl.importTitle"),
                children: T("pl.import")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
            ),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
            ),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet }, children: exportSelected.size > 0 ? `${exportSelected.size}/${promptList.length}` : T("pl.sidebar.total", { count: promptList.length }) })
          ] }),
          promptLoading ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE16.muted }, children: T("pl.loading") }) : promptList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE16.muted }, children: T("pl.empty") }) : exportView === "group" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflow: "auto" }, children: groupedPrompts.map(([group, prompts]) => {
            const groupChecked = prompts.length > 0 && prompts.every((p) => exportSelected.has(p.id));
            const collapsed = exportCollapsed.has(group);
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
                    style: { margin: 0 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
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
                      gap: 6,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      color: TONE16.text,
                      fontSize: 12,
                      fontFamily: MONO15,
                      userSelect: "none"
                    },
                    "aria-expanded": !collapsed,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                        "svg",
                        {
                          width: "12",
                          height: "12",
                          viewBox: "0 0 16 16",
                          style: {
                            color: TONE16.muted,
                            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                            transition: "transform .24s cubic-bezier(.22,1,.36,1)",
                            flexShrink: 0
                          },
                          "aria-hidden": "true",
                          children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontWeight: 560 }, children: group }),
                      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet }, children: T("pl.sidebar.groupCount", { count: prompts.length }) })
                    ]
                  }
                )
              ] }),
              !collapsed && prompts.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
          }) }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflow: "auto" }, children: promptList.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            PromptCheckRow,
            {
              title: prompt.title || T("pl.sidebar.uncategorized"),
              body: prompt.body,
              checked: exportSelected.has(prompt.id),
              onToggle: () => toggleExport(prompt.id)
            },
            prompt.id
          )) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
      ModuleCard3,
      {
        title: T("pl.moduleTags"),
        desc: T("pl.moduleTagsDesc"),
        open: openTags,
        onToggle: () => setOpenTags((v) => !v),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "input",
              {
                value: newTag,
                onChange: (e) => setNewTag(clampTag(e.target.value)),
                onKeyDown: (e) => {
                  if (e.key === "Enter") addTag();
                },
                placeholder: T("pl.createTagPlaceholder"),
                style: { ...inputStyle6, flex: 1 }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: addTag, children: T("pl.createTag") })
          ] }),
          tagList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "10px 0", fontSize: 12, color: TONE16.muted }, children: T("pl.tagsNone") }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflow: "auto" }, children: tagList.map((tag) => {
            const editing = renamingTag?.from === tag.name;
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "div",
              {
                className: "pl-data-card",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: TONE16.row,
                  border: `1px solid ${TONE16.border}`,
                  borderRadius: 9
                },
                children: editing ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
                      style: { ...inputStyle6, flex: 1 }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => setRenamingTag(null), children: T("pl.cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "primary", size: "sm", className: plBtn("primary", "sm"), onClick: confirmRenameTag, children: T("pl.save") })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    "span",
                    {
                      style: {
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: TONE16.accent,
                        flexShrink: 0
                      },
                      "aria-hidden": "true"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    "span",
                    {
                      style: {
                        flexShrink: 0,
                        fontSize: 11,
                        color: TONE16.muted,
                        lineHeight: 1.4,
                        background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                        border: `1px solid ${TONE16.border}`,
                        borderRadius: 999,
                        padding: "1px 8px"
                      },
                      children: tag.count
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    import_dsh_client_ui_primitives12.Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: plBtn("ghost", "sm"),
                      onClick: () => setRenamingTag({ from: tag.name, value: tag.name }),
                      children: T("pl.renameTag")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    import_dsh_client_ui_primitives12.Button,
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
          }) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
      ModuleCard3,
      {
        title: T("pl.moduleTrash"),
        desc: T("pl.moduleTrashDesc"),
        open: openTrash,
        onToggle: () => setOpenTrash((v) => !v),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { fontSize: 11, lineHeight: 1.5, color: TONE16.quiet, background: TONE16.row, border: `1px solid ${TONE16.border}`, borderRadius: 6, padding: "6px 10px" }, children: T("pl.trashCleanupNote") }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
              "label",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: TONE16.muted,
                  cursor: "pointer",
                  userSelect: "none"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              import_dsh_client_ui_primitives12.Button,
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
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              import_dsh_client_ui_primitives12.Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: plBtn("ghost", "sm"),
                onClick: deleteSelected,
                disabled: trashSelected.size === 0,
                style: { color: TONE16.red },
                children: T("pl.trashDeleteSelected")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 11, color: TONE16.quiet }, children: trashSelected.size > 0 ? `${trashSelected.size}/${trashList.length}` : "" })
          ] }),
          trashLoading ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE16.muted }, children: T("pl.loading") }) : trashList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "12px 0", fontSize: 12, color: TONE16.muted }, children: T("pl.trashEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }, children: trashList.map((item) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
            "div",
            {
              className: "pl-data-card",
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                background: TONE16.row,
                border: `1px solid ${TONE16.border}`,
                borderRadius: 9
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: trashSelected.has(item.id),
                    onChange: () => toggleTrash(item.id),
                    style: { marginTop: 3 }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
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
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
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
                              style: { flexShrink: 0, color: TONE16.muted },
                              "aria-hidden": "true",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M14 2v6h6" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: 10, color: TONE16.quiet, flexShrink: 0, whiteSpace: "nowrap" }, children: T("pl.trashDeletedAt", { time: formatTime(item.deletedAt) }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                    "div",
                    {
                      style: {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        fontSize: 11,
                        color: TONE16.quiet,
                        lineHeight: 1.5,
                        overflow: "hidden",
                        wordBreak: "break-word"
                      },
                      children: item.body.replace(/\s+/g, " ").trim() || " "
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                      "span",
                      {
                        style: {
                          flexShrink: 0,
                          fontSize: 10,
                          color: daysLeft(item.deletedAt) <= 1 ? TONE16.red : TONE16.muted,
                          lineHeight: 1.4,
                          background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                          border: `1px solid ${TONE16.border}`,
                          borderRadius: 999,
                          padding: "2px 8px"
                        },
                        "data-tip": T("pl.trashCleanupNote"),
                        children: T("pl.trashDaysLeft", { n: daysLeft(item.deletedAt) })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { flex: 1 } }),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => restoreOne(item), children: T("pl.trashRestoreOne") }),
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_dsh_client_ui_primitives12.Button, { type: "button", variant: "ghost", size: "sm", className: plBtn("ghost", "sm"), onClick: () => deleteOne(item), style: { color: TONE16.red }, children: T("pl.trashDeleteOne") })
                  ] })
                ] })
              ]
            },
            item.id
          )) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(BackupModule, { t }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      "input",
      {
        ref: importRef,
        type: "file",
        accept: "application/json,.json",
        style: { display: "none" },
        onChange: onImportFile
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SkillImportModal, { open: skillImportOpen, onClose: () => setSkillImportOpen(false), t }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
    ),
    pendingConfirm && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,.32)",
          padding: 20,
          boxSizing: "border-box"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          "div",
          {
            role: "dialog",
            "aria-modal": "true",
            style: {
              width: 360,
              maxWidth: "100%",
              background: TONE16.panel,
              border: `1px solid ${TONE16.border}`,
              borderRadius: 10,
              padding: "16px 18px",
              boxShadow: "0 8px 32px rgba(0,0,0,.12)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              color: TONE16.text,
              fontFamily: MONO15
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: pendingConfirm.message }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: plBtn("ghost", "sm"),
                    onClick: () => setPendingConfirm(null),
                    children: T("pl.cancel")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  import_dsh_client_ui_primitives12.Button,
                  {
                    type: "button",
                    variant: "primary",
                    size: "sm",
                    className: plBtn("primary", "sm"),
                    style: pendingConfirm.danger ? { color: TONE16.red } : void 0,
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
      }
    )
  ] });
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
      const disposeDataMarker = registerSettingsNavIcon(
        () => t("pl.set.dataSection"),
        SETTINGS_NAV_MARKER_DATA
      );
      return () => {
        disposePromptMarker();
        disposeDataMarker();
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
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library-data",
        order: 101,
        locale: NS,
        label: () => t("pl.set.dataSection")
      },
      SettingsDataSection
    )
  );
}
		module.exports = { apply, inject };
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map

/**
 * 插件推荐面板 — 设置面板（词库菜单按钮弹窗）右侧「插件推荐」导航的内嵌内容。
 *
 * 数据源：DSH 插件市场（dsh-plugin.org）热门榜单（host 路由实时获取，
 * 失败回退 localStorage 上次记录，再回退内置条目）。每个推荐位均标注
 * 「广告」标签与热门排名徽标；顶部提供「刷新」按钮与数据来源徽标
 * （实时 / 缓存 / 内置）。
 *
 * 布局：左侧热门推荐列表 + 右侧选中插件详情
 * （包名 / 版本 / 许可证 / stars / Git 地址 / Git 与 DSH 安装命令 / 简介）。
 * 置顶顺序：dsh-file-workbench 第 1、dsh-prompt-library（本插件）第 2，
 * 市场热门插件从第 3 位起；详情简介统一精简为纯功能描述。
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchHotPlugins,
  pluginDisplayName,
  pluginDisplayDesc,
  PINNED_PLUGIN,
  type HotPlugin,
  type MarketData,
  type MarketSource,
} from "../../utils/plugin-reco.js";
import { getVersion } from "../../utils/api.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { type PLTranslate, type PLT, usePLT } from "../../utils/i18n.js";
import { PanelHeader } from "../common/PanelHeader.js";

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** 数据来源徽标文案与颜色。 */
function sourceBadge(
  T: PLT,
  source: MarketSource | undefined,
  fetchedAt: number,
): { label: string; color: string; title?: string } | null {
  if (!source) return null;
  if (source === "live") {
    return { label: T("pl.pluginReco.live"), color: "var(--dsw-alias-state-success-primary, #16a34a)" };
  }
  if (source === "cache") {
    const time = fetchedAt ? new Date(fetchedAt).toLocaleString() : "";
    return {
      label: T("pl.pluginReco.cache"),
      color: "var(--dsw-alias-label-tertiary, #94a3b8)",
      title: T("pl.pluginReco.cacheAt", { time }),
    };
  }
  return { label: T("pl.pluginReco.builtin"), color: "var(--dsw-alias-label-tertiary, #94a3b8)" };
}

export function PluginRecoPanel({ t }: { t?: PLTranslate }): ReactNode {
  useThemeSync();
  const T = usePLT(t);
  const TONE = getTone();

  // 榜单数据与选中项
  const [market, setMarket] = useState<MarketData | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // 置顶本插件（dsh-prompt-library）的当前版本：从 /version 接口取已安装版本
  const [selfVersion, setSelfVersion] = useState("—");
  // 复制成功提示（自动消失）
  const [copied, setCopied] = useState(false);

  const items: HotPlugin[] = market?.items ?? [];
  const selectedPlugin = items.find((p) => p.id === selectedId) ?? items[0];

  /** 拉取榜单（force=true 时跳过 host 缓存强制实时抓取）。 */
  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = await fetchHotPlugins(force);
      setMarket(data);
      setSelectedId((prev) => (data.items.some((p) => p.id === prev) ? prev : (data.items[0]?.id ?? "")));
    } finally {
      setLoading(false);
    }
  }, []);

  // 挂载即拉取一次榜单 + 本插件版本
  useEffect(() => {
    void refresh();
    getVersion()
      .then((v) => {
        if (v.installed) setSelfVersion(v.installed);
      })
      .catch(() => {
        /* 读取失败保持占位 */
      });
  }, [refresh]);

  // 复制成功提示自动消失
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  /** 复制文本到剪贴板并给出反馈。 */
  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
  }, []);

  /** 详情的一行「标签 + 内容」。 */
  const renderInfoRow = (label: string, node: ReactNode): ReactNode => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, color: TONE.quiet }}>{label}</span>
      {node}
    </div>
  );

  /** 详情的一行命令：等宽字体展示 + 一键复制。 */
  const renderCmdRow = (label: string, cmd: string): ReactNode => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, color: TONE.quiet }}>{label}</span>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          background: TONE.panel,
          border: `1px solid ${TONE.border}`,
          borderRadius: 7,
          padding: "7px 10px",
        }}
      >
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: MONO,
            fontSize: 11.5,
            lineHeight: 1.55,
            color: TONE.text,
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {cmd}
        </code>
        <button
          type="button"
          onClick={() => copyText(cmd)}
          data-tip={T("pl.copy")}
          style={{
            flexShrink: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: TONE.accent,
            cursor: "pointer",
            fontSize: 11.5,
            lineHeight: 1.5,
            padding: 0,
            fontFamily: MONO,
          }}
        >
          {T("pl.copy")}
        </button>
      </div>
    </div>
  );

  const badge = sourceBadge(T, market?.source, market?.fetchedAt ?? 0);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflow: "hidden",
      }}
    >
      <PanelHeader title={T("pl.modulePluginReco")} desc={T("pl.modulePluginRecoDesc")} />

      {/* 主体：左列表 + 右详情 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 8, minWidth: 0 }}>
        {/* 左侧热门推荐列表（推荐位统一带「广告」标签） */}
        <div
          style={{
            flexShrink: 0,
            width: 232,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 10,
            padding: 8,
            overflowY: "auto",
          }}
        >
          {items.map((plugin) => {
            const active = plugin.id === selectedPlugin?.id;
            return (
              <div
                key={plugin.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(plugin.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(plugin.id);
                  }
                }}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: `1px solid ${active ? "rgba(142,197,255,.5)" : TONE.border}`,
                  background: active ? "rgba(142,197,255,.10)" : TONE.panel,
                  transition:
                    "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  {/* 热门排名徽标 */}
                  {plugin.rank > 0 && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 9.5,
                        lineHeight: 1,
                        fontWeight: 700,
                        padding: "3px 5px",
                        borderRadius: 5,
                        color: "#fff",
                        background: plugin.rank <= 3 ? "#f97316" : "var(--dsw-alias-label-tertiary, #94a3b8)",
                      }}
                    >
                      {plugin.rank}
                    </span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: TONE.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pluginDisplayName(plugin, T)}
                  </span>
                  {/* 广告标签：推荐位标识 */}
                  <span
                    title={T("pl.pluginReco.reco")}
                    style={{
                      flexShrink: 0,
                      fontSize: 9,
                      lineHeight: 1,
                      fontWeight: 600,
                      padding: "3px 5px",
                      borderRadius: 5,
                      color: "var(--dsw-alias-label-tertiary, #94a3b8)",
                      border: "1px solid currentColor",
                      opacity: 0.85,
                    }}
                  >
                    {T("pl.pluginReco.reco")}
                  </span>
                </div>
                {/* 子行：stars / 版本（置顶的本插件版本走 /version 接口实时值） */}
                <div
                  style={{
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    lineHeight: 1.4,
                    color: TONE.quiet,
                    fontFamily: MONO,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {plugin.stars > 0 && (
                    <span
                      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 2 }}
                    >
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M8 .8l2.2 4.5 5 .7-3.6 3.5.9 4.9L8 12.1l-4.5 2.3.9-4.9L.8 6l5-.7L8 .8z" />
                      </svg>
                      {plugin.stars.toLocaleString()}
                    </span>
                  )}
                  <span>v{plugin.id === PINNED_PLUGIN.id ? selfVersion : plugin.version}</span>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ padding: 12, fontSize: 11.5, color: TONE.quiet }}>
              {T("pl.pluginReco.refreshing")}
            </div>
          )}
        </div>

        {/* 右侧选中插件详情 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {/* 详情头部：插件名 + 数据来源徽标 + 刷新按钮 */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderBottom: `1px solid ${TONE.border}`,
            }}
          >
            <span
              style={{
                width: 3,
                height: 13,
                borderRadius: 2,
                background: TONE.accent,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13.5,
                fontWeight: 600,
                color: TONE.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedPlugin ? pluginDisplayName(selectedPlugin, T) : ""}
            </span>
            {badge && (
              <span
                title={badge.title}
                style={{
                  flexShrink: 0,
                  fontSize: 10.5,
                  lineHeight: 1,
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 999,
                  color: badge.color,
                  background: TONE.panel,
                  border: `1px solid ${TONE.border}`,
                }}
              >
                {loading
                  ? T("pl.pluginReco.refreshing")
                  : badge.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={loading}
              title={T("pl.pluginReco.refresh")}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: `1px solid ${TONE.border}`,
                outline: "none",
                background: TONE.panel,
                color: TONE.accent,
                cursor: loading ? "default" : "pointer",
                fontSize: 11.5,
                lineHeight: 1,
                padding: "6px 10px",
                borderRadius: 7,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: loading ? "pl-reco-spin 1s linear infinite" : "none" }}
              >
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6" />
              </svg>
              {T("pl.pluginReco.refresh")}
            </button>
          </div>

          {/* 详情内容：包名 / 版本 / 许可证 / stars / Git 地址 / 安装命令 / 简介 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {selectedPlugin && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: TONE.text,
                      wordBreak: "break-word",
                    }}
                  >
                    {pluginDisplayName(selectedPlugin, T)}
                  </div>
                  {/* 热门推荐广告标签 */}
                  <span
                    style={{
                      fontSize: 10,
                      lineHeight: 1,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 999,
                      color: "var(--dsw-alias-label-tertiary, #94a3b8)",
                      border: "1px solid currentColor",
                    }}
                  >
                    {T("pl.pluginReco.reco")}
                  </span>
                  {!selectedPlugin.pinned && (
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1,
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 999,
                        color: "#fff",
                        background: "#f97316",
                      }}
                    >
                      {T("pl.pluginReco.hot", { rank: selectedPlugin.rank })}
                    </span>
                  )}
                </div>
                {renderInfoRow(
                  T("pl.pluginReco.pkgName"),
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: TONE.text,
                      fontFamily: MONO,
                      wordBreak: "break-all",
                      userSelect: "all",
                    }}
                  >
                    {selectedPlugin.id}
                  </span>,
                )}
                {renderInfoRow(
                  T("pl.pluginReco.version"),
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: TONE.text, fontFamily: MONO }}>
                    v{selectedPlugin.id === PINNED_PLUGIN.id ? selfVersion : selectedPlugin.version}
                  </span>,
                )}
                {renderInfoRow(
                  T("pl.pluginReco.license"),
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: TONE.text, fontFamily: MONO }}>
                    {selectedPlugin.license}
                  </span>,
                )}
                {selectedPlugin.stars > 0 &&
                  renderInfoRow(
                    T("pl.pluginReco.stars"),
                    <span style={{ fontSize: 12, lineHeight: 1.5, color: TONE.text, fontFamily: MONO }}>
                      ★ {selectedPlugin.stars.toLocaleString()}
                    </span>,
                  )}
                {renderInfoRow(
                  T("pl.pluginReco.repo"),
                  <a
                    href={selectedPlugin.repo}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: TONE.accent,
                      wordBreak: "break-all",
                      textDecoration: "none",
                    }}
                  >
                    {selectedPlugin.repo}
                  </a>,
                )}
                {renderCmdRow(T("pl.pluginReco.cloneCmd"), selectedPlugin.cloneCmd)}
                {renderCmdRow(T("pl.pluginReco.dshCmd"), selectedPlugin.dshCmd)}
                {renderInfoRow(
                  T("pl.pluginReco.descTitle"),
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.65,
                      color: TONE.muted,
                      wordBreak: "break-word",
                    }}
                  >
                    {pluginDisplayDesc(selectedPlugin, T)}
                  </span>,
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 复制成功提示 */}
      {copied && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 18,
            transform: "translateX(-50%)",
            zIndex: 10,
            fontSize: 12,
            lineHeight: 1,
            padding: "8px 14px",
            borderRadius: 999,
            color: TONE.text,
            background: TONE.panel,
            border: `1px solid ${TONE.borderStrong}`,
            boxShadow: "0 6px 18px rgba(2,6,23,.18)",
            pointerEvents: "none",
          }}
        >
          {T("pl.copied")}
        </div>
      )}

      <style>{`@keyframes pl-reco-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

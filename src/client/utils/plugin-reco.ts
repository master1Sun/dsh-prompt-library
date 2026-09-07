/**
 * 插件推荐数据 — 从 DSH 插件市场（dsh-plugin.org）热门榜单获取。
 *
 * 数据链路（逐层降级）：
 * 1. host 路由 `/api/prompt-library/plugin-market`：host 侧实时抓
 *    dsh-plugin.org 热门榜单（TTL 缓存 6 小时，?force=1 强制刷新）；
 * 2. host 不可达时 → localStorage 里上一次成功获取的完整记录（cache）；
 * 3. 连缓存都没有 → 内置兜底条目（builtin，dsh-file-workbench）。
 *
 * 任何失败都静默降级，不阻断调用方 UI。
 */
import type { PLT } from "./i18n.js";

/** 统一展示的插件条目。 */
export interface HotPlugin {
  /** 唯一 id（owner/repo）。 */
  id: string;
  /** 插件名（live/cache 数据）；builtin 条目为空、走 nameKey。 */
  name: string;
  /** 内置条目的 i18n 名称 key。 */
  nameKey?: string;
  /** 简介（live/cache 数据）；builtin 条目为空、走 descKey。 */
  desc: string;
  /** 内置条目的 i18n 简介 key。 */
  descKey?: string;
  /** 版本号（不含前导 v）；未知为 "—"。 */
  version: string;
  license: string;
  /** GitHub 仓库主页。 */
  repo: string;
  cloneCmd: string;
  /** DSH 官方安装命令（dsh plugin add）。 */
  dshCmd: string;
  /** GitHub stars 数。 */
  stars: number;
  /** 市场兼容性状态。 */
  verified: boolean;
  /** 热门排名（1 起）。 */
  rank: number;
  /** 是否为置顶的本插件（dsh-prompt-library，永远排第一、展示完整详情）。 */
  pinned?: boolean;
}

/** 数据来源：live host 实时 / cache 上次记录 / builtin 内置兜底。 */
export type MarketSource = "live" | "cache" | "builtin";

/** 一次获取的完整结果。 */
export interface MarketData {
  source: MarketSource;
  /** 数据获取时间戳（毫秒）；builtin 为 0。 */
  fetchedAt: number;
  items: HotPlugin[];
}

/**
 * 置顶推荐第 1 位：dsh-file-workbench（写死配置仅作兜底；
 * 榜单里有该插件时，版本 / stars / 简介等走实时数据）。
 */
export const PINNED_WB: HotPlugin = {
  id: "master1Sun/dsh-file-workbench-lib",
  name: "",
  nameKey: "pl.pluginReco.wbName",
  desc: "",
  descKey: "pl.pluginReco.wbDesc",
  version: "0.3.1",
  license: "MIT",
  repo: "https://github.com/master1Sun/dsh-file-workbench-lib",
  cloneCmd: "git clone --depth 1 https://github.com/master1Sun/dsh-file-workbench-lib.git",
  dshCmd: 'dsh plugin --profile web add "github:master1Sun/dsh-file-workbench-lib"',
  stars: 0,
  verified: true,
  rank: 1,
  pinned: true,
};

/**
 * 置顶推荐第 2 位：本插件（dsh-prompt-library，写死配置仅作兜底；
 * 面板中版本号由 /version 接口实时填充，榜单实时数据同样优先）。
 */
export const PINNED_PLUGIN: HotPlugin = {
  id: "master1Sun/dsh-prompt-library",
  name: "",
  nameKey: "pl.pluginReco.plName",
  desc: "",
  descKey: "pl.pluginReco.plDesc",
  version: "—",
  license: "MIT",
  repo: "https://github.com/master1Sun/dsh-prompt-library",
  cloneCmd: "git clone --depth 1 https://github.com/master1Sun/dsh-prompt-library.git",
  dshCmd: 'dsh plugin --profile web add "github:master1Sun/dsh-prompt-library"',
  stars: 0,
  verified: true,
  rank: 2,
  pinned: true,
};

/** 置顶条目 id 集合（统一小写比较：市场返回的 owner 大小写可能与本地写法不一致）。 */
const PINNED_IDS = new Set([PINNED_WB.id.toLowerCase(), PINNED_PLUGIN.id.toLowerCase()]);

/** localStorage 缓存键（存整份 MarketData）。 */
const CACHE_KEY = "pl.pluginReco.market.v1";

/** 读取本地缓存（损坏 / 不可用时返回 null）。 */
function readLocalCache(): MarketData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketData;
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) return parsed;
  } catch {
    /* 忽略 */
  }
  return null;
}

/** 把一次成功获取写进缓存（写失败静默忽略）。 */
function writeLocalCache(data: MarketData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* 隐私模式等场景写入失败：不影响展示 */
  }
}

/**
 * 把置顶条目与榜单里的同名实时记录合并：
 * 写死的配置只在榜单中找不到该插件时兜底；能匹配到实时记录则
 * 版本 / 许可证 / stars / 简介 / verified 均以实时数据为准（名字保留 i18n 文案）。
 */
function applyLiveToPinned(p: HotPlugin, live: HotPlugin | undefined): HotPlugin {
  if (!live) return p;
  return {
    ...p,
    desc: live.desc || p.desc,
    version: live.version && live.version !== "—" ? live.version : p.version,
    license: live.license && live.license !== "—" ? live.license : p.license,
    stars: live.stars > 0 ? live.stars : p.stars,
    verified: live.verified || p.verified,
  };
}

/** 把两个置顶条目插到榜单最前（workbench 第 1、本插件第 2），市场热门从第 3 位起依次重排。 */
function withPinned(data: MarketData): MarketData {
  // id 统一小写匹配（市场 owner 大小写可能与本地写法不一致，如 master1sun vs master1Sun）
  const byId = new Map(data.items.map((p) => [p.id.toLowerCase(), p]));
  const pinned = [
    applyLiveToPinned({ ...PINNED_WB }, byId.get(PINNED_WB.id.toLowerCase())),
    applyLiveToPinned({ ...PINNED_PLUGIN }, byId.get(PINNED_PLUGIN.id.toLowerCase())),
  ];
  const rest = data.items
    .filter((p) => !PINNED_IDS.has(p.id.toLowerCase()))
    .map((p, i) => ({ ...p, rank: i + 3 }));
  return { ...data, items: [...pinned, ...rest] };
}

/**
 * 获取插件市场热门榜单：
 * 1. 请求 host 路由（host 内部已有 TTL 磁盘缓存），成功即写 localStorage；
 * 2. 失败回退 localStorage 上一次记录（cache）；
 * 3. 无缓存回退内置条目（builtin）。
 * 置顶的本插件（dsh-prompt-library）永远排在第一位。
 */
export async function fetchHotPlugins(force = false): Promise<MarketData> {
  try {
    const res = await fetch(`/api/prompt-library/plugin-market${force ? "?force=1" : ""}`);
    const payload = (await res.json()) as
      | { ok: boolean; data?: MarketData; error?: string }
      | undefined;
    if (res.ok && payload?.ok && payload.data && Array.isArray(payload.data.items)) {
      const data = payload.data;
      if (data.items.length > 0) {
        const merged = withPinned(data);
        writeLocalCache(merged);
        return merged;
      }
    }
  } catch {
    /* host 不可达 → 走本地缓存 */
  }
  const cached = readLocalCache();
  if (cached) return withPinned({ ...cached, source: "cache" });
  return withPinned({ source: "builtin", fetchedAt: 0, items: [] });
}

/**
 * 精简市场简介：只保留第一段功能描述。
 * 去掉 Markdown 标题/强调符号与多余空白，超长截断（约 140 字符）加省略号。
 */
function simplifyDesc(raw: string): string {
  const text = raw
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_`>]/g, "")
    .replace(/\r/g, "");
  const firstPara = (text.split(/\n\s*\n/)[0] ?? text).replace(/\s+/g, " ").trim();
  return firstPara.length > 140 ? `${firstPara.slice(0, 140)}…` : firstPara;
}

/** 解析条目展示名：live/cache 用 name，builtin 走 i18n key（由调用方翻译）。 */
export function pluginDisplayName(p: HotPlugin, translate: PLT): string {
  return p.name || (p.nameKey ? translate(p.nameKey as never) : p.id);
}

/** 解析条目展示简介：live/cache 用 desc（精简为功能描述），builtin 走 i18n key（由调用方翻译）。 */
export function pluginDisplayDesc(p: HotPlugin, translate: PLT): string {
  return p.desc ? simplifyDesc(p.desc) : p.descKey ? translate(p.descKey as never) : "";
}

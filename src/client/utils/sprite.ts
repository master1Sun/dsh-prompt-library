/**
 * 词库助手「小人雪碧图」。
 *
 * 把蓝脸小人渲染成一张运行时生成的雪碧图：用 canvas 按「轨道 = 行、帧 = 列」
 * 逐格绘制定格帧，再由 background-position 按每轨道每帧时长播放。
 *
 * - TRACKS        ：每个动画轨道一行的每帧停留时长（ms）。
 * - SEQUENCES     ：活动阶段 → 轨道序列（播放该阶段时依次切轨）。
 * - HOVER_SEQUENCE：鼠标移入小人的打招呼序列（小动画）。
 * - getSpriteSheet：按「等级 + 聊天主题 + 心情」组合懒生成并缓存雪碧图 data URL；
 *                   失败返回 null，由调用方回退到原生 SVG 小人。
 *
 * 小人差异化（QQ 式成长 & 换装人格化 & 心情表情）：
 * - 等级：身体主色按等级分阶变化（灰→蓝→绿→紫→金→橙），胸前缀一枚同色小星章；
 * - 聊天主题：按职业换装（代码=工程师帽 / 写作=贝雷帽 / 翻译=领带 / 问答=眼镜）；
 * - 心情：开心时笑容更开、腮红更浓，低落时嘴角下垂、略低头。
 */

/** 心情状态（客户端每天成功/失败统计得出）。 */
export type SpriteMood = "happy" | "neutral" | "sad";

/** 聊天主题风格（与 host 侧 phrases.ts 保持一致）。 */
export type SpriteTopic = "code" | "writing" | "translate" | "qa" | "general";

/** 生成雪碧图的可选差异项。 */
export interface SpriteOptions {
  /** 等级 1-6：决定身体主色与胸前徽章色。 */
  level?: number;
  /** 聊天主题：决定职业装扮（帽子/贝雷帽/领带/眼镜）。 */
  topic?: SpriteTopic;
  /** 心情：决定脸部表情（开心/平常/低落）。 */
  mood?: SpriteMood;
}

/** 等级分阶配色（1 灰 → 6 橙，QQ 式成长色阶）。 */
export const LEVEL_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb923c"];

/** 依据背景色返回高对比文字色（白/深）。 */
export function contrastText(hex: string): string {
  return luminance(hex) > 0.5 ? "#10141c" : "#fff";
}

/** 把等级夹取到 1..LEVEL_COLORS.length。 */
function clampLevel(level: number | undefined): number {
  const n = Math.floor(level ?? 1);
  return Math.min(Math.max(n, 1), LEVEL_COLORS.length);
}

export const SPRITE_CELL = 72; // 每帧设计尺寸（与 SVG viewBox 一致）
export const SPRITE_COLUMNS = 8; // 雪碧图每行的帧数上限

/** 小人动画轨道（对应雪碧图的一整行）。 */
export type SpriteTrack =
  | "idle"
  | "hover"
  | "waiting"
  | "thinking"
  | "tool"
  | "review"
  | "done"
  | "failed"
  | "wave";

/** 轨道 → 雪碧图行号（固定 9 行契约）。 */
export const TRACK_ROW: Record<SpriteTrack, number> = {
  idle: 0,
  hover: 1,
  waiting: 2,
  thinking: 3,
  tool: 4,
  review: 5,
  done: 6,
  failed: 7,
  wave: 8,
};

/** 雪碧图总行数。 */
export const SPRITE_ROWS = Object.keys(TRACK_ROW).length;

/** 每个动画轨道：frames 为本行实际用到的帧下标，durations 为每帧停留时长。 */
export const TRACKS: Record<SpriteTrack, { frames: number[]; durations: number[] }> = {
  idle: { frames: [0, 1, 2, 3], durations: [450, 110, 450, 470] },
  hover: { frames: [0, 1, 2, 3], durations: [150, 150, 150, 150] },
  waiting: { frames: [0, 1, 2, 3], durations: [520, 520, 520, 520] },
  thinking: { frames: [0, 1, 2, 1], durations: [340, 340, 340, 340] },
  tool: { frames: [0, 1, 2, 3], durations: [400, 400, 400, 400] },
  review: { frames: [0, 1, 0, 2], durations: [460, 460, 460, 460] },
  done: { frames: [0, 1, 2, 3, 4], durations: [170, 170, 170, 170, 240] },
  failed: { frames: [0, 1, 2, 3], durations: [90, 90, 90, 90] },
  wave: { frames: [0, 1, 2, 3], durations: [150, 150, 150, 150] },
};

/** 活动阶段 → 轨道序列。 */
export const SEQUENCES: Record<string, SpriteTrack[]> = {
  idle: ["idle"],
  waiting: ["waiting"],
  thinking: ["thinking"],
  tool: ["tool"],
  review: ["review"],
  done: ["done", "wave"],
  failed: ["failed"],
};

/** 鼠标移入小人时的打招呼序列（小动画）。 */
export const HOVER_SEQUENCE: SpriteTrack[] = ["wave", "idle"];

/** 雪碧图结果：data URL 与几何信息。 */
export interface SpriteSheet {
  url: string;
  cell: number;
  columns: number;
  rows: number;
}

/** 帧定位结果。 */
export interface SpriteFrame {
  track: SpriteTrack;
  col: number;
}

/** 序列中 elapsedMs 对应的（轨道, 帧）：先按轨道总时长分配轨道，再按帧时长定位帧。 */
export function sequenceFrame(sequence: SpriteTrack[], elapsedMs: number): SpriteFrame {
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

// ── 逐格绘制：一帧的姿势 ─────────────────────────────────────────────────────

interface Pose {
  dip: number; // 垂直位移（上为正）
  tilt: number; // 整体倾斜角度（度）
  shx: number; // 水平位移（摇头）
  arm: number; // 手臂摆动弧度
  blink: number; // 眼睛闭合度 0..1
  squashY: number; // 纵向压扁
  mouth: "smile" | "open" | "flat" | "frown";
  cheek: number; // 腮红透明度
}

const BASE: Pose = { dip: 0, tilt: 0, shx: 0, arm: 0, blink: 0, squashY: 1, mouth: "smile", cheek: 0.55 };
const P = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });

/** 每个轨道一行的逐帧姿势（下标对应帧）。 */
const POSE: Record<SpriteTrack, Pose[]> = {
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
    P({ mouth: "open" }),
  ],
  failed: [P({ mouth: "frown" }), P({ shx: -4, mouth: "frown" }), P({ mouth: "frown" }), P({ shx: 4, mouth: "frown" })],
  wave: [P({ arm: -0.55, mouth: "open" }), P({ arm: 0, mouth: "open" }), P({ arm: -0.9, mouth: "smile" }), P({ arm: 0, mouth: "open" })],
};

/** 小人配色：body 为身体/脸主色，feature 为五官对比色。 */
interface Palette {
  body: string;
  feature: string;
}

/** 相对亮度（0..1），用于判断主色深浅。 */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const toLinear = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 两个十六进制颜色按比例混合（ratio 为 b 的占比），返回 #rrggbb。 */
function blend(a: string, b: string, ratio: number): string {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a.trim());
  const pb = /^#?([0-9a-f]{6})$/i.exec(b.trim());
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const lerp = (x: number, y: number): number => Math.round(x + (y - x) * ratio);
  const toHex = (n: number): string => n.toString(16).padStart(2, "0");
  const r = lerp((na >> 16) & 255, (nb >> 16) & 255);
  const g = lerp((na >> 8) & 255, (nb >> 8) & 255);
  const b0 = lerp(na & 255, nb & 255);
  return `#${toHex(r)}${toHex(g)}${toHex(b0)}`;
}

/** 读取主题前景色，并按等级叠加分阶色调；五官取其对比色。 */
function resolvePalette(level = 1): Palette {
  let body = "#1f2937";
  try {
    const v = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--dsw-alias-label-primary")
      .trim();
    if (v) body = v;
  } catch {
    /* 忽略，用默认深色 */
  }
  // 等级分阶：身体主色按 50% 向等级色混合，让不同等级小人一眼可辨
  body = blend(body, LEVEL_COLORS[clampLevel(level) - 1], 0.5);
  const feature = luminance(body) > 0.5 ? "#10141c" : "#fff";
  return { body, feature };
}

function drawEyes(ctx: CanvasRenderingContext2D, blink: number, pal: Palette): void {
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.arc(31, 33, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(41, 33, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (blink >= 0.4) {
    // 闭合：用短线盖住眼睛
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(29.6, 33.4); ctx.lineTo(32.4, 33.4);
    ctx.moveTo(39.6, 33.4); ctx.lineTo(42.4, 33.4);
    ctx.stroke();
  } else {
    // 睁眼：画瞳孔
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.arc(32, 33.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 33.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, mouth: Pose["mouth"], pal: Palette): void {
  ctx.strokeStyle = pal.feature;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.fillStyle = pal.feature;
  if (mouth === "open") {
    // 开心的「o」形嘴
    ctx.beginPath();
    ctx.ellipse(36, 41.5, 3.6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mouth === "frown") {
    ctx.beginPath();
    ctx.moveTo(30, 42); ctx.quadraticCurveTo(36, 38.5, 42, 42);
    ctx.stroke();
  } else if (mouth === "flat") {
    ctx.beginPath();
    ctx.moveTo(32, 41); ctx.lineTo(40, 41);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(30, 39.5); ctx.quadraticCurveTo(36, 43.5, 42, 39.5);
    ctx.stroke();
  }
}

/** 心情 → 脸部的表情修正：开心笑更开、腮红更浓；低落嘴角下垂、略低头。 */
function applyMood(pose: Pose, mood: SpriteMood | undefined): Pose {
  if (mood === "sad") {
    return {
      ...pose,
      mouth: "frown",
      dip: pose.dip - 1.2, // 略低头，垂头丧气
    };
  }
  if (mood === "happy") {
    const mouth = pose.mouth === "smile" || pose.mouth === "flat" ? "open" : pose.mouth;
    return { ...pose, mouth, cheek: Math.min(1, pose.cheek + 0.25) };
  }
  return pose;
}

/** 工程师帽（聊代码）。 */
function drawHardHat(ctx: CanvasRenderingContext2D): void {
  // 帽顶半圆
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.ellipse(36, 23, 13, 8.5, 0, Math.PI, 0);
  ctx.fill();
  // 帽檐
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(21, 23, 30, 3.6);
  // 顶部圆脊
  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.ellipse(36, 15.5, 6, 2.6, 0, Math.PI, 0);
  ctx.fill();
}

/** 贝雷帽（聊写作）。 */
function drawBeret(ctx: CanvasRenderingContext2D): void {
  // 帽身（扁椭圆）
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath();
  ctx.ellipse(36, 17, 14.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 顶部小梗
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(36, 12.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // 帽沿内侧阴影
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.beginPath();
  ctx.ellipse(36, 20, 14.5, 3.4, 0, Math.PI, 0);
  ctx.fill();
}

/** 翻译官领带（聊翻译）。 */
function drawTie(ctx: CanvasRenderingContext2D): void {
  // 领结结
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(30, 47.5);
  ctx.lineTo(42, 47.5);
  ctx.lineTo(38, 51);
  ctx.lineTo(34, 51);
  ctx.closePath();
  ctx.fill();
  // 领带主体（向下渐宽）
  ctx.beginPath();
  ctx.moveTo(33.5, 50);
  ctx.lineTo(38.5, 50);
  ctx.lineTo(39.5, 60.5);
  ctx.lineTo(36, 63);
  ctx.lineTo(32.5, 60.5);
  ctx.closePath();
  ctx.fill();
  // 领带浅色条纹
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(34.5, 50.5);
  ctx.lineTo(37.5, 50.5);
  ctx.lineTo(37, 61.5);
  ctx.lineTo(35, 61.5);
  ctx.closePath();
  ctx.fill();
}

/** 学者眼镜（聊问答）。 */
function drawGlasses(ctx: CanvasRenderingContext2D, pal: Palette): void {
  ctx.strokeStyle = pal.feature;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(31, 33, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(41, 33, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  // 鼻梁
  ctx.beginPath();
  ctx.moveTo(35.2, 33);
  ctx.lineTo(36.8, 33);
  ctx.stroke();
  // 镜腿
  ctx.beginPath();
  ctx.moveTo(26.8, 33);
  ctx.lineTo(24.5, 33.5);
  ctx.moveTo(45.2, 33);
  ctx.lineTo(47.5, 33.5);
  ctx.stroke();
}

/** 按聊天主题绘制职业装扮。 */
function drawCostume(ctx: CanvasRenderingContext2D, topic: SpriteTopic | undefined, pal: Palette): void {
  switch (topic) {
    case "code": drawHardHat(ctx); break;
    case "writing": drawBeret(ctx); break;
    case "translate": drawTie(ctx); break;
    case "qa": drawGlasses(ctx, pal); break;
    default: break;
  }
}

/** 等级胸前小星章（QQ 式成长标识，与职业装扮不冲突）。 */
function drawLevelBadge(ctx: CanvasRenderingContext2D, level: number | undefined): void {
  const color = LEVEL_COLORS[clampLevel(level) - 1];
  ctx.fillStyle = color;
  ctx.beginPath();
  const cx = 36;
  const cy = 60;
  const R = 5.4;
  const r = 2.3;
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** 在一个格子里按姿势绘制一帧小人（含等级配色、主题装扮与心情表情）。 */
function drawCell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  pose: Pose,
  pal: Palette,
  opts: SpriteOptions,
): void {
  const p = applyMood(pose, opts.mood);
  ctx.save();
  ctx.translate(gx, gy);
  ctx.translate(p.shx, p.dip);
  ctx.translate(36, 47);
  ctx.rotate((p.tilt * Math.PI) / 180);
  ctx.scale(1, p.squashY);
  ctx.translate(-36, -47);

  // 淡色身体
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(36, 29, 15, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 小手（绕身体底部摆动）
  ctx.save();
  ctx.translate(36, 47);
  ctx.rotate(p.arm);
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

  // 脸
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.arc(36, 34, 15, 0, Math.PI * 2);
  ctx.fill();

  // 腮红
  ctx.globalAlpha = 0.45 * p.cheek;
  ctx.fillStyle = pal.feature;
  ctx.beginPath();
  ctx.arc(29, 37, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(43, 37, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawEyes(ctx, p.blink, pal);
  drawMouth(ctx, p.mouth, pal);

  // 职业装扮（换装人格化）
  drawCostume(ctx, opts.topic, pal);
  // 等级胸前星章（QQ 式成长标识）
  drawLevelBadge(ctx, opts.level);
  ctx.restore();
}

async function buildSheet(opts: SpriteOptions): Promise<SpriteSheet> {
  const pal = resolvePalette(opts.level);
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_CELL * SPRITE_COLUMNS;
  canvas.height = SPRITE_CELL * SPRITE_ROWS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  const order: SpriteTrack[] = Object.keys(TRACK_ROW) as SpriteTrack[];
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
  return { url, cell: SPRITE_CELL, columns: SPRITE_COLUMNS, rows: SPRITE_ROWS };
}

/** 模块级缓存：按「等级-主题-心情」组合懒生成并缓存雪碧图；失败返回 null 由调用方回退。 */
const sheetCache = new Map<string, Promise<SpriteSheet | null>>();
export function getSpriteSheet(opts: SpriteOptions = {}): Promise<SpriteSheet | null> {
  const key = `${opts.level ?? 1}-${opts.topic ?? "general"}-${opts.mood ?? "neutral"}`;
  let p = sheetCache.get(key);
  if (!p) {
    p = buildSheet(opts).catch(() => null);
    sheetCache.set(key, p);
  }
  return p;
}
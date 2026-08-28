/**
 * 词库助手「助手雪碧图」。
 *
 * 把米兔（长耳圆脸小兔）渲染成一张运行时生成的雪碧图：用 canvas 按「轨道 = 行、帧 = 列」
 * 逐格绘制定格帧，再由 background-position 按每轨道每帧时长播放。
 *
 * - TRACKS        ：每个动画轨道一行的每帧停留时长（ms）。
 * - SEQUENCES     ：活动阶段 → 轨道序列（播放该阶段时依次切轨）。
 * - HOVER_SEQUENCE：鼠标移入助手的打招呼序列（小动画）。
 * - getSpriteSheet：按「等级 + 聊天主题 + 心情」组合懒生成并缓存雪碧图 data URL；
 *                   失败返回 null，由调用方回退到原生 SVG 助手。
 *
 * 助手差异化（QQ 式成长 & 换装人格化 & 心情表情）：
 * - 等级：米兔身体随等级换色（按 LEVEL_COLORS 对应色相做柔和粉彩），
 *   胸前星章保留等级色；满级（>= MAX_LEVEL）整体切换为「炫彩」渐变皮肤（彩虹流光 + 柔光晕）；
 * - 聊天主题：按职业换装（代码=工程师帽 / 写作=贝雷帽 / 翻译=领带 / 问答=眼镜）；
 * - 心情：开心时笑容更开、腮红更浓，低落时嘴角下垂、略低头。
 */

/** 心情状态（客户端每天成功/失败统计得出）。 */
export type SpriteMood = "happy" | "neutral" | "sad";

/** 聊天主题风格（与 host 侧 phrases.ts 保持一致）。 */
export type SpriteTopic = "code" | "writing" | "translate" | "qa" | "general";

/** 生成雪碧图的可选差异项。 */
export interface SpriteOptions {
  /** 程序化款型：经典米兔（鲸鱼款走 dsh-pet webm 动画，不参与绘制）。 */
  character?: DrawnCharacter;
  /** 等级 1-6：决定胸前徽章色。 */
  level?: number;
  /** 聊天主题：决定职业装扮（帽子/贝雷帽/领带/眼镜）。 */
  topic?: SpriteTopic;
  /** 心情：决定脸部表情（开心/平常/低落）。 */
  mood?: SpriteMood;
}

/** 等级分阶配色（1 灰 → 6 橙，QQ 式成长色阶）。 */
export const LEVEL_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb923c"];

/** 满级档位（对应 LEVEL_COLORS 长度 = 6，'词库宗师'）：满级解锁黄金专属皮肤。 */
export const MAX_LEVEL = LEVEL_COLORS.length;

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

/** 助手动画轨道（对应雪碧图的一整行）。 */
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

/** 鼠标移入助手时的打招呼序列（小动画）。 */
export const HOVER_SEQUENCE: SpriteTrack[] = ["wave", "idle"];

// ── 鲸鱼款助手：使用随插件分发的静态雪碧图素材，几何/轨道与鲸鱼素材对齐 ──
// 词库助手全部轨道语义保留（待机/等待/思考/忙碌/整理/完成/失败/打招呼），
// 只是把每个轨道映射到鲸鱼素材的行，并按鲸鱼素材的帧数与时长为每帧定位。

/** 词库助手助手款型（与 host 的 assistantCharacter 设置保持一致）。
 *  classic：经典米兔（程序化）；whale：鲸鱼款（静态雪碧图）；dshpet：dsh-pet 动态鲸鱼（webm 动画）。 */
export type PetCharacter = "classic" | "whale" | "dshpet";

/** 程序化绘制款型：经典米兔（鲸鱼款走静态素材 / dsh-pet 走 webm，均不参与程序化绘制）。 */
export type DrawnCharacter = "classic";

/** 鲸鱼款雪碧图几何：每帧 192×208、每行 8 帧、共 9 行。
 * 素材由 host 路由按字节返回（见 routes.ts 的 /assets/whale）。 */
export const WHALE_COLUMNS = 8;
export const WHALE_ROWS = 9;
/** 鲸鱼素材的静态地址（host 路由提供 image/webp 字节）。 */
export const WHALE_ASSET_URL = "/api/prompt-library/assets/whale";

/** 鲸鱼款：词库助手轨道 → 雪碧图行号（与素材行为单位对齐）。 */
export const WHALE_TRACK_ROW: Record<SpriteTrack, number> = {
  idle: 0, // 待机
  hover: 3, // 打招呼 → 挥舞
  waiting: 6, // 等待
  thinking: 7, // 思考 → 小跑
  tool: 1, // 忙碌 → 向右移动
  review: 8, // 整理
  done: 4, // 完成 → 跳跃
  failed: 5, // 失败
  wave: 3, // 挥舞（打招呼）
};

/** 鲸鱼款：每个轨道一行的帧下标与每帧停留时长（取自鲸鱼素材的原始动画节拍）。 */
export const WHALE_TRACKS: Record<SpriteTrack, { frames: number[]; durations: number[] }> = {
  idle: { frames: [0, 1, 2, 3, 4, 5], durations: [500, 500, 600, 500, 500, 600] },
  hover: { frames: [0, 1, 2, 3], durations: [450, 450, 450, 450] },
  waiting: { frames: [0, 1, 2, 3, 4, 5], durations: [550, 550, 600, 550, 550, 600] },
  thinking: { frames: [0, 1, 2, 3, 4, 5], durations: [330, 330, 330, 330, 330, 400] },
  tool: { frames: [0, 1, 2, 3, 4, 5, 6, 7], durations: [300, 300, 300, 300, 300, 300, 300, 400] },
  review: { frames: [0, 1, 2, 3, 4, 5], durations: [650, 650, 650, 650, 650, 650] },
  done: { frames: [0, 1, 2, 3, 4], durations: [400, 400, 400, 450, 450] },
  failed: { frames: [0, 1, 2, 3, 4, 5, 6, 7], durations: [550, 550, 550, 600, 650, 700, 550, 550] },
  wave: { frames: [0, 1, 2, 3], durations: [450, 450, 450, 450] },
};

/** 轨道定义集合类型（经典/鲸鱼款通用）。 */
export type TrackDefMap = Record<SpriteTrack, { frames: number[]; durations: number[] }>;

/** 雪碧图结果：可用的素材地址 + 几何信息 + 轨道行为与延时。 */
export interface SpriteSheet {
  url: string;
  /** 单帧在图片上的像素宽（经典 72 / 鲸鱼款 192）。 */
  cellW: number;
  /** 单帧在图片上的像素高（经典 72 / 鲸鱼款 208）。 */
  cellH: number;
  columns: number;
  rows: number;
  /** 轨道 → 雪碧图行号（随形象不同而变化）。 */
  trackRow: Record<SpriteTrack, number>;
  /** 轨道 → 帧下标与每帧时长（随形象不同而变化）。 */
  tracks: TrackDefMap;
}

/** 帧定位结果。 */
export interface SpriteFrame {
  track: SpriteTrack;
  col: number;
}

/** 序列中 elapsedMs 对应的（轨道, 帧）：先按轨道总时长分配轨道，再按帧时长定位帧。 */
export function sequenceFrame(
  sequence: SpriteTrack[],
  elapsedMs: number,
  tracks: TrackDefMap = TRACKS,
): SpriteFrame {
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
    P({ mouth: "open" }),
  ],
  failed: [P({ mouth: "frown" }), P({ shx: -4, mouth: "frown" }), P({ mouth: "frown" }), P({ shx: 4, mouth: "frown" })],
  wave: [P({ arm: -0.55, mouth: "open" }), P({ arm: 0, mouth: "open" }), P({ arm: -0.9, mouth: "smile" }), P({ arm: 0, mouth: "open" })],
};

/** 米兔皮肤配色：body 为身体/脸主力色，feature 为五官深色，outline 为描边色。
 *  全部等级身体跟随 LEVEL_COLORS（1 灰 → 6 橙）；满级仅背后光晕转为彩虹炫彩。 */
interface Palette {
  body: string;
  feature: string;
  outline: string;
}

/** 炫彩（彩虹）色标：用于满级背后光晕的彩虹渐变。 */
export const PRISM_STOPS: Array<[number, string]> = [
  [0, "#ff5aa2"],
  [0.17, "#a78bfa"],
  [0.34, "#60a5fa"],
  [0.51, "#34d399"],
  [0.68, "#fbbf24"],
  [0.85, "#fb923c"],
  [1, "#ff5aa2"],
];

/** 把 #rrggbb 朝白色混合 tint（0..1），得到柔和粉彩身体。 */
function tintTowardWhite(hex: string, tint: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * tint);
  return `#${[((n >> 16) & 255), ((n >> 8) & 255), (n & 255)]
    .map(mix)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 把 #rrggbb 调暗 ratio（0..1），得到与身体同色系的描边/五官色。 */
function darken(hex: string, ratio: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#000000";
  const n = parseInt(m[1], 16);
  const per = (c: number) => Math.round(c * (1 - ratio));
  return `#${[((n >> 16) & 255), ((n >> 8) & 255), (n & 255)]
    .map(per)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 米兔皮肤配色：等级 1-6 身体随 LEVEL_COLORS 换色（满级即最高档橙色，主体仍跟色系，
 * 彩虹炫彩只出现在背后光晕，见 drawHalo）。 */
function resolvePalette(level?: number): Palette {
  const lv = clampLevel(level);
  // 等级色 → 柔和粉彩身体 + 同色系五官描边，主体紧跟等级色（轻调亮即可，避免洗白对不上色系）
  const base = LEVEL_COLORS[lv - 1];
  return {
    body: tintTowardWhite(base, 0.18),
    feature: darken(base, 0.55),
    outline: darken(base, 0.28),
  };
}

/** 为身体主力形设置填充（全部等级用等级色平涂，满级炫彩由 drawHalo 光晕承担）。 */
function bodyFill(ctx: CanvasRenderingContext2D, pal: Palette): string {
  ctx.fillStyle = pal.body;
  return pal.body;
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
    // 睁眼：深色眼珠上加白色高光，米兔水灵灵的眼睛
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(32, 33.6, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 33.6, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 米兔嘴：统一用珊瑚橙红（比亮红更活泼，米兔标志性嘴色）。 */
const MOUTH_RED = "#ff6b5e";

function drawMouth(ctx: CanvasRenderingContext2D, mouth: Pose["mouth"]): void {
  ctx.strokeStyle = MOUTH_RED;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.fillStyle = MOUTH_RED;
  if (mouth === "open") {
    // 张开的「o」形嘴（比闭合更大的开口，营造开合说话感）；高度压低，唇显薄
    ctx.beginPath();
    ctx.ellipse(36, 42, 3.9, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // 口腔暗部：让「张开」更分明
    ctx.fillStyle = "#e0553f";
    ctx.beginPath();
    ctx.ellipse(36, 42.7, 2.4, 1.5, 0, 0, Math.PI * 2);
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

/** 等级胸前小星章（QQ 式成长标识，与职业装扮不冲突）；随等级色，满级为最高档橙色。 */
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

/** 米兔双耳：长圆形竖耳（暖白+描边）+ 粉色内耳；在画脸前绘制，耳根被脸盖住更自然。 */
function drawEars(ctx: CanvasRenderingContext2D, pal: Palette): void {
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.9;
  // 左耳
  ctx.beginPath();
  ctx.ellipse(27.5, 14.5, 4.6, 9, 0.12, 0, Math.PI * 2);
  bodyFill(ctx, pal);
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.stroke();
  // 右耳
  ctx.beginPath();
  ctx.ellipse(44.5, 14.5, 4.6, 9, -0.12, 0, Math.PI * 2);
  bodyFill(ctx, pal);
  ctx.fill();
  ctx.stroke();
  // 内耳（米兔经典粉）
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

/** 把 #rrggbb 转成带透明度的 rgba() 字符串，供 canvas 光晕渐变使用。 */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(255, 255, 255, ${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 等级背后光晕：1 级（灰）不显示；满级（>= MAX_LEVEL）画彩虹光晕；其余等级按等级色画出呼吸感光晕。 */
function drawHalo(ctx: CanvasRenderingContext2D, level: number): void {
  // 满级炫彩：彩虹光晕 + 一圈彩虹描记，强化炫彩轮廓
  if (level >= MAX_LEVEL) {
    const grad = ctx.createRadialGradient(36, 44, 2, 36, 44, 27);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    grad.addColorStop(0.5, "rgba(232, 121, 249, 0.2)");
    grad.addColorStop(1, "rgba(96, 165, 250, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(36, 44, 27, 0, Math.PI * 2);
    ctx.fill();
    const ring = ctx.createLinearGradient(20, 18, 52, 70);
    for (const [o, c] of PRISM_STOPS) ring.addColorStop(o, c);
    ctx.strokeStyle = ring;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(36, 44, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  // 非满级：按等级色画柔和光晕
  const base = LEVEL_COLORS[clampLevel(level) - 1];
  const grad = ctx.createRadialGradient(36, 44, 2, 36, 44, 28);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  grad.addColorStop(0.5, hexToRgba(base, 0.22));
  grad.addColorStop(1, hexToRgba(base, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(36, 44, 28, 0, Math.PI * 2);
  ctx.fill();
  // 边缘一圈等级色描记，强化轮廓
  const ring = ctx.createLinearGradient(20, 18, 52, 70);
  ring.addColorStop(0, hexToRgba(base, 0.7));
  ring.addColorStop(1, hexToRgba(base, 0.3));
  ctx.strokeStyle = ring;
  ctx.lineWidth = 1.1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(36, 44, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** 在一个格子里按姿势绘制一帧（先施加姿态变换，再按款型分派绘制）。 */
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

  // 背后光晕：1 级（灰）不显示；2-5 级按等级色，满级（>= MAX_LEVEL）为彩虹炫彩
  const lv = opts.level ?? 1;
  if (lv >= 2) drawHalo(ctx, lv);
  drawBunnyBody(ctx, p, pal, opts);
  ctx.restore();
}

/** 经典米兔：暖白长耳圆脸小兔（含等级配色、主题装扮与心情表情）。 */
function drawBunnyBody(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  pal: Palette,
  opts: SpriteOptions,
): void {
  // 身体（米兔短胖的小身子：等级色/炫彩 + 描边）
  bodyFill(ctx, pal);
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(36, 42, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 小手（绕身体底部摆动）
  ctx.save();
  ctx.translate(36, 47);
  ctx.rotate(p.arm);
  bodyFill(ctx, pal);
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

  // 四只脚（米兔四脚：前后各一对等级色/炫彩小椭圆，靠后的一对略小略高形成纵深感）
  bodyFill(ctx, pal);
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 0.8;
  // 后脚（较小，稍高）
  ctx.beginPath();
  ctx.ellipse(33, 49, 3.4, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(39, 49, 3.4, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 前脚（较大，稍低）
  ctx.beginPath();
  ctx.ellipse(29, 52, 4.2, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(43, 52, 4.2, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 双耳（在脸之下绘制，耳根自然被脸盖住）
  drawEars(ctx, pal);

  // 脸（米兔等级色/炫彩圆脸 + 描边）
  bodyFill(ctx, pal);
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(36, 34, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 腮红（米兔经典粉）
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

  // 职业装扮（换装人格化）
  drawCostume(ctx, opts.topic, pal);
  // 等级胸前星章（QQ 式成长标识，等级色仅作小点缀不改全身）
  drawLevelBadge(ctx, opts.level);
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
  return { url, cellW: SPRITE_CELL, cellH: SPRITE_CELL, columns: SPRITE_COLUMNS, rows: SPRITE_ROWS, trackRow: TRACK_ROW, tracks: TRACKS };
}

/** 模块级缓存：按「等级-主题-心情」组合懒生成并缓存雪碧图；失败返回 null 由调用方回退。 */
const sheetCache = new Map<string, Promise<SpriteSheet | null>>();
export function getSpriteSheet(opts: SpriteOptions = {}): Promise<SpriteSheet | null> {
  const key = `${opts.character ?? "classic"}-${opts.level ?? 1}-${opts.topic ?? "general"}-${opts.mood ?? "neutral"}`;
  let p = sheetCache.get(key);
  if (!p) {
    p = buildSheet(opts).catch(() => null);
    sheetCache.set(key, p);
  }
  return p;
}

// ── 鲸鱼款：静态素材雪碧图（懒生成、缓存、失败回退请求方）───────────────────

let whaleSheetPromise: Promise<SpriteSheet> | null = null;
/**
 * 鲸鱼款助手雪碧图：直接指向随插件分发的静态素材地址，几何与轨道由
 * 鲸鱼轨道常量描述；每次返回同一份（素材为固定形象，无差异化参数）。
 * 先预加载素材图片，就绪后才 resolve，避免页面刷新时先闪经典米兔或空白。
 */
export function getWhaleSpriteSheet(): Promise<SpriteSheet> {
  if (!whaleSheetPromise) {
    const sheet: SpriteSheet = {
      url: WHALE_ASSET_URL,
      cellW: 192,
      cellH: 208,
      columns: WHALE_COLUMNS,
      rows: WHALE_ROWS,
      trackRow: WHALE_TRACK_ROW,
      tracks: WHALE_TRACKS,
    };
    whaleSheetPromise = new Promise<SpriteSheet>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(sheet);
      img.onerror = () => reject(new Error("whale asset load failed"));
      img.src = WHALE_ASSET_URL;
    });
  }
  return whaleSheetPromise;
}
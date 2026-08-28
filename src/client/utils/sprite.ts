/**
 * 词库助手「助手雪碧图」。
 *
 * 词库助手统一使用鲸鱼款形象（静态雪碧图 / dsh-pet 动效 webm），不再包含
 * 经典米兔程序化绘制。静态鲸鱼款直接指向随插件分发的素材图片，由
 * background-position 按每轨道每帧时长播放。
 *
 * - SEQUENCES      ：活动阶段 → 轨道序列（播放该阶段时依次切轨）。
 * - HOVER_SEQUENCE ：鼠标移入助手的打招呼序列（小动画）。
 * - WHALE_TRACKS   ：鲸鱼款每个动画轨道一行的每帧停留时长（ms）。
 * - getWhaleSpriteSheet：静态鲸鱼款素材雪碧图（懒加载、缓存）。
 */

/** 心情状态（客户端每天成功/失败统计得出）。 */
export type SpriteMood = "happy" | "neutral" | "sad";

/** 聊天主题风格（与 host 侧 phrases.ts 保持一致）。 */
export type SpriteTopic = "code" | "writing" | "translate" | "qa" | "general";

/** 等级分阶配色（1 灰 → 6 橙，QQ 式成长色阶）。 */
export const LEVEL_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb923c"];

/** 满级档位（对应 LEVEL_COLORS 长度 = 6，'词库宗师'）。 */
export const MAX_LEVEL = LEVEL_COLORS.length;

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

/** 轨道定义集合类型（鲸鱼款使用）。 */
export type TrackDefMap = Record<SpriteTrack, { frames: number[]; durations: number[] }>;

/** 雪碧图结果：可用的素材地址 + 几何信息 + 轨道行为与延时。 */
export interface SpriteSheet {
  url: string;
  /** 单帧在图片上的像素宽（鲸鱼款 192）。 */
  cellW: number;
  /** 单帧在图片上的像素高（鲸鱼款 208）。 */
  cellH: number;
  columns: number;
  rows: number;
  /** 轨道 → 雪碧图行号（随形象不同而变化）。 */
  trackRow: Record<SpriteTrack, number>;
  /** 轨道 → 帧下标与每帧时长（随形象不同而变化）。 */
  tracks: TrackDefMap;
}

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

/** 帧定位结果。 */
export interface SpriteFrame {
  track: SpriteTrack;
  col: number;
}

/** 序列中 elapsedMs 对应的（轨道, 帧）：先按轨道总时长分配轨道，再按帧时长定位帧。 */
export function sequenceFrame(
  sequence: SpriteTrack[],
  elapsedMs: number,
  tracks: TrackDefMap = WHALE_TRACKS,
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

// ── 鲸鱼款助手：使用随插件分发的静态雪碧图素材，几何/轨道与鲸鱼素材对齐 ──
// 词库助手全部轨道语义保留（待机/等待/思考/忙碌/整理/完成/失败/打招呼），
// 只是把每个轨道映射到鲸鱼素材的行，并按鲸鱼素材的帧数与时长为每帧定位。

/** 词库助手助手款型（与 host 的 assistantCharacter 设置保持一致）。
 *  whale：鲸鱼款（静态雪碧图）；dshpet：dsh-pet 动态鲸鱼（webm 动画）。 */
export type PetCharacter = "whale" | "dshpet";

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

// ── 鲸鱼款：静态素材雪碧图（懒加载、缓存、失败回退请求方）───────────────────

let whaleSheetPromise: Promise<SpriteSheet> | null = null;
/**
 * 鲸鱼款助手雪碧图：直接指向随插件分发的静态素材地址，几何与轨道由
 * 鲸鱼轨道常量描述；每次返回同一份（素材为固定形象，无差异化参数）。
 * 先预加载素材图片，就绪后才 resolve，避免页面刷新时先闪空白。
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

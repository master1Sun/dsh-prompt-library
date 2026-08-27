/**
 * 词库助手「鲸鱼款」动效舞台。
 *
 * 播放随插件自带分发的 webm 动画（由本插件路由 /assets/whale-webm/*.webm 按字节返回），
 * 用「双 video 元素 + 交叉淡入」实现动画无缝切换：前台播放当前动画，切换时在
 * 后台 <video> 缓冲下一个动画，loadeddata 后叠到前台并把旧视频停掉收作背景。
 *
 * 尺寸：按 dsh-pet thumb 画布 640×360 内鲸鱼实际占用区域（命中框 200,50 → 440,335）
 * 等比映射到助手 PERSON_SIZE 方形框内，保持鲸鱼不拉伸、脚底贴地。
 *
 * 动画选择：
 * - 活动阶段决定基础动画池（待机/等待/思考/忙碌/整理/完成/失败）；
 * - 空闲（idle）时每个动画播完自动从池中再抽一个，形成连续小动作变化；
 * - 悬停播放一次性打招呼动画，移开回到阶段动画；
 * - 单击播放一次性点击回应动画。
 *
 * 若 webm 无法加载（如 dsh-pet 未安装），通过 onFail 通知上层回退经典助手。
 */
import { useEffect, useRef, useState } from "react";
import type { ActivityPhase } from "../../services/api.js";

/** 本插件自带动画的静态路由前缀（素材随构建产物分发，由 routes.ts 返回字节）。 */
const PET_VIDEO_ROOT = "/api/prompt-library/assets/whale-webm/";
/** webm 播放扩展名。 */
const THUMB_EXT = ".webm";
/** dsh-pet thumb 画布几何与鲸鱼实际占用（命中框）坐标。 */
const FRAME = { w: 640, h: 360, whaleX0: 200, whaleY0: 50, whaleX1: 440, whaleY1: 335 };
/** 鲸鱼占用区域中心 x（画布内）与脚底 y（贴地参考）。 */
const WHALE_CX = (FRAME.whaleX0 + FRAME.whaleX1) / 2; // = 320
const WHALE_FEET_Y = FRAME.whaleY1; // = 335

/** 活动阶段 → 鲸鱼动画名池（任选一个播放）。 */
const PHASE_POOL: Record<ActivityPhase, string[]> = {
  idle: ["待机呼吸休闲", "悠闲哼歌", "东张西望", "原地漂浮踏步"],
  waiting: ["东张西望", "原地漂浮踏步", "悠闲哼歌"],
  thinking: ["深度思考碎碎念"],
  tool: ["写代码", "轻快记录", "原地敲击桌面互动"],
  review: ["轻快记录", "照镜子"],
  done: ["点击回应-开心跃动", "原地跳跃抓碎头顶物品"],
  failed: ["被吓一跳", "哈欠连天"],
};
/** 悬停打招呼动画（一次性）。 */
const HOVER_ANIM = "点击回应-元气挥手";
/** 单击回应动画（一次性）。 */
const CLICK_ANIM = "点击回应-开心跃动";

/** 从池中随机抽一个动画名。 */
function pickFrom(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface WhaleStageProps {
  /** 当前活动阶段。 */
  phase: ActivityPhase;
  /** 是否悬停在助手上。 */
  hovering: boolean;
  /** 单击递增计数：每次变化播放一次点击回应动画。 */
  clickRev: number;
  /** 助手显示边长（px），默认 72。 */
  size?: number;
  /** webm 加载失败回调（如 dsh-pet 未安装），由上层回退经典助手。 */
  onFail: () => void;
}

export function WhaleStage({ phase, hovering, clickRev, size = 72, onFail }: WhaleStageProps) {
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const frontRef = useRef(0); // 当前前台：0=videoA，1=videoB
  const genRef = useRef(0); // 切换代次：旧 loadeddata 不得抢占已更新的前台
  const [ambient, setAmbient] = useState(0); // 空闲动画播完后 +1，触发重新抽池

  // 让鲸鱼占用区域高度恰好填满 size 方形框（不拉伸）
  const scale = size / (FRAME.whaleY1 - FRAME.whaleY0);
  const videoW = FRAME.w * scale;
  const videoH = FRAME.h * scale;
  // 鲸鱼水平居中、脚底贴底
  const videoLeft = size / 2 - WHALE_CX * scale;
  const videoTop = size - WHALE_FEET_Y * scale;

  /** 把动画切到后台 video，loadeddata 后就位前台（交叉淡入）。 */
  const switchTo = (name: string, loop: boolean) => {
    const target = frontRef.current === 0 ? bRef : aRef;
    const el = target.current;
    if (!el) return;
    const gen = ++genRef.current;
    // 中文动画名需 URL 编码
    el.src = PET_VIDEO_ROOT + encodeURIComponent(name) + THUMB_EXT;
    el.loop = loop;
    el.muted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.onended = null;
    el.load();
    const onReady = () => {
      el.removeEventListener("loadeddata", onReady);
      if (genRef.current !== gen) return; // 已被更新的切换取代
      const old = frontRef.current === 0 ? aRef : bRef;
      frontRef.current = frontRef.current === 0 ? 1 : 0;
      el.classList.add("whale-front");
      if (old.current && old.current !== el) {
        old.current.classList.remove("whale-front");
        old.current.onended = null;
        old.current.onerror = null;
        old.current.pause();
      }
      // 一次性动画播完 → 步进 ambient，触发上层重新驱动阶段/空闲动画
      if (!loop) el.onended = () => setAmbient((a) => a + 1);
      el.play().catch(() => {});
    };
    el.addEventListener("loadeddata", onReady);
    if (el.readyState >= 2) onReady(); // 已在缓存中就绪时直接切换
  };

  // 单击回应：clickRev 每次递增播放一次性动画
  const prevClickRef = useRef(0);
  useEffect(() => {
    if (clickRev === prevClickRef.current) return;
    prevClickRef.current = clickRev;
    if (clickRev > 0) switchTo(CLICK_ANIM, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickRev]);

  // 阶段 / 悬停 / 空闲变化：驱动基础动画
  useEffect(() => {
    if (hovering) {
      switchTo(HOVER_ANIM, false); // 打招呼一次性，播完跳回阶段/空闲
      return;
    }
    const pool = PHASE_POOL[phase];
    const name = pool.length === 1 ? pool[0] : pickFrom(pool);
    switchTo(name, phase !== "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hovering, ambient]);

  // 加载失败 → 通知上层回退经典助手
  useEffect(() => {
    const mark = () => onFail();
    aRef.current?.addEventListener("error", mark);
    bRef.current?.addEventListener("error", mark);
    return () => {
      aRef.current?.removeEventListener("error", mark);
      bRef.current?.removeEventListener("error", mark);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFail]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        .whale-video {
          position: absolute;
          opacity: 0;
          transition: opacity .18s ease;
          object-fit: fill;
          background: transparent;
        }
        .whale-video.whale-front { opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .whale-video { transition: none; } }
      `}</style>
      <video
        ref={aRef}
        className="whale-video"
        style={{ left: videoLeft, top: videoTop, width: videoW, height: videoH }}
        muted
        playsInline
        aria-hidden="true"
      />
      <video
        ref={bRef}
        className="whale-video"
        style={{ left: videoLeft, top: videoTop, width: videoW, height: videoH }}
        muted
        playsInline
        aria-hidden="true"
      />
    </div>
  );
}
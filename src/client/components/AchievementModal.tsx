/**
 * 成就弹窗 — 右键词库助手菜单里的「成就」入口打开。
 *
 * 腾讯 QQ 风格成就展示：
 * - 等级区块：圆形等级徽章（环形进度 + 中心等级号/称号），右侧升级进度条；
 *   若因长期未使用触发等级回落，附回落提示。
 * - 成就区块：奖牌墙（每项一枚圆形奖牌，已解锁金色奖杯 / 未解锁灰色锁）。
 *
 * 数据来自 host 的 `/assistant/status`（等级、成就均已按系统语言翻译）。
 * 交互：点击遮罩/外部区域、右上角关闭按钮或底部「知道了」按钮均可关闭。
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLT } from "../utils/i18n.js";
import {
  getAssistantStatus,
  type AssistantAchievement,
  type AssistantLevel,
  type AssistantStatus,
} from "../utils/api.js";
import { getTone, useThemeSync, contrastFg, type ThemeTone } from "../utils/theme.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { LEVEL_COLORS, MAX_LEVEL } from "../utils/sprite.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮 / 「知道了」按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 等级对应的分阶色（与助手身体/胸前星章同源，QQ 式成长色阶；满级即最高档橙色）。 */
function levelColor(level: number): string {
  return LEVEL_COLORS[Math.min(Math.max(level, 1), LEVEL_COLORS.length) - 1];
}

/** 圆形等级徽章：环形进度 + 中心「Lv.N · 称号」，QQ 风格。 */
function LevelRing({ level, TONE }: { level: AssistantLevel; TONE: ThemeTone }): ReactNode {
  const R = 40;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, level.pct));
  const dash = (pct / 100) * C;
  const color = levelColor(level.level);
  return (
    <div style={{ position: "relative", width: 108, height: 108, flexShrink: 0 }} aria-hidden="true">
      <svg width="108" height="108" viewBox="0 0 108 108">
        {/* 底色圆盘 + 进度轨道 */}
        <circle cx="54" cy="54" r={R} fill={TONE.panel} stroke={TONE.border} strokeWidth="8" />
        {/* 进度弧：按 pct 画圈，圆角端点 */}
        <circle
          cx="54"
          cy="54"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dasharray .4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: 0.3 }}>
          Lv.{level.level}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: TONE.muted,
            whiteSpace: "nowrap",
            maxWidth: 92,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {level.title}
        </span>
      </div>
    </div>
  );
}

/** 稀有度 → 主色（奖牌渐变主色 + 高光 + 边框 + 阴影）。 */
const RARITY_COLORS: Record<
  string,
  { base: string; high: string; deep: string; border: string; shadow: string; text: string }
> = {
  common: { base: "#94a3b8", high: "#cbd5e1", deep: "#64748b", border: "rgba(148,163,184,.55)", shadow: "rgba(148,163,184,.28)", text: "#94a3b8" },
  rare: { base: "#3b82f6", high: "#93c5fd", deep: "#1d4ed8", border: "rgba(59,130,246,.55)", shadow: "rgba(59,130,246,.35)", text: "#3b82f6" },
  epic: { base: "#8b5cf6", high: "#c4b5fd", deep: "#6d28d9", border: "rgba(139,92,246,.55)", shadow: "rgba(139,92,246,.35)", text: "#8b5cf6" },
  legendary: { base: "#f59e0b", high: "#fde68a", deep: "#b45309", border: "rgba(245,158,11,.6)", shadow: "rgba(245,158,11,.38)", text: "#d97706" },
  myth: { base: "#e879f9", high: "#f5d0fe", deep: "#a21caf", border: "rgba(232,121,249,.6)", shadow: "rgba(192,38,211,.4)", text: "#c026d3" },
};

/** 等级徽章渐变（与 LEVEL_COLORS 同色系逐级点亮，灰→蓝→绿→紫→黄→橙，
 *  from 取等级色、to 为该色系的加深版，保证与等级环/进度条/鲸鱼一致）。 */
const LEVEL_GRAD: Record<number, { from: string; to: string; glow: string }> = {
  1: { from: "#94a3b8", to: "#475569", glow: "rgba(148,163,184,.5)" },
  2: { from: "#60a5fa", to: "#2563eb", glow: "rgba(96,165,250,.55)" },
  3: { from: "#34d399", to: "#059669", glow: "rgba(52,211,153,.55)" },
  4: { from: "#a78bfa", to: "#6d28d9", glow: "rgba(167,139,250,.55)" },
  5: { from: "#fbbf24", to: "#d97706", glow: "rgba(251,191,36,.55)" },
  6: { from: "#fb923c", to: "#ea580c", glow: "rgba(251,146,60,.6)" },
};

/** 稀有度标签文案（映射到 i18n 键）。 */
function rarityLabel(rarity: string, t: PLT): string {
  const key =
    rarity === "myth"
      ? "pl.rarity.myth"
      : rarity === "legendary"
        ? "pl.rarity.legendary"
        : rarity === "epic"
          ? "pl.rarity.epic"
          : rarity === "rare"
            ? "pl.rarity.rare"
            : "pl.rarity.common";
  return t(key);
}

/** ----------------------------------------------------------------
 * 大阿卡纳塔罗牌面数据（22 张）：name = 牌名，line = 对应解锁的牌面名言。
 * ---------------------------------------------------------------- */
const TAROT_ARCANA: Array<{ name: { zh: string; en: string }; line: { zh: string; en: string } }> = [
  { name: { zh: "愚人", en: "The Fool" }, line: { zh: "前路本无岸，深渊亦是启程。", en: "Before me is no shore; the abyss itself is a departure." } },
  { name: { zh: "魔术师", en: "The Magician" }, line: { zh: "上承天意，下启凡尘，手中万物皆可造。", en: "Heaven above, earth below—all lies within my hands to create." } },
  { name: { zh: "女祭司", en: "The High Priestess" }, line: { zh: "真相藏于静默，不必急于言说。", en: "Truth lies in stillness; no need to rush to speak." } },
  { name: { zh: "皇后", en: "The Empress" }, line: { zh: "大地孕育一切，温柔自有力量。", en: "The earth nurtures all; gentleness is its own power." } },
  { name: { zh: "皇帝", en: "The Emperor" }, line: { zh: "规则由我立定，秩序方能长存。", en: "I set the rules; only order endures." } },
  { name: { zh: "教皇", en: "The Hierophant" }, line: { zh: "循古道而寻心安，以教诲渡众生。", en: "Walk the old path to find peace; guide all with teaching." } },
  { name: { zh: "恋人", en: "The Lovers" }, line: { zh: "心之所向，便是抉择。", en: "Where the heart points, that is the choice." } },
  { name: { zh: "战车", en: "The Chariot" }, line: { zh: "纵有两股对立，我亦可驾驭向前。", en: "Though two forces pull, I ride forward." } },
  { name: { zh: "力量", en: "Strength" }, line: { zh: "真正的征服，从来不是对抗，而是温柔驯服。", en: "True conquest is not opposition but gentle taming." } },
  { name: { zh: "隐士", en: "The Hermit" }, line: { zh: "世人喧嚣，我携孤灯自寻真理。", en: "While the world shouts, I carry a lone lamp in search of truth." } },
  { name: { zh: "命运之轮", en: "Wheel of Fortune" }, line: { zh: "盛衰轮转，万般不由人，亦万般皆可等。", en: "Fortune spins, nothing keeps its course—and all can be awaited." } },
  { name: { zh: "正义", en: "Justice" }, line: { zh: "利剑断是非，天平量因果。", en: "The blade rules right and wrong; the scales measure cause and effect." } },
  { name: { zh: "倒吊人", en: "The Hanged Man" }, line: { zh: "换一种视角，牺牲亦是觉醒。", en: "Change your view; sacrifice is awakening." } },
  { name: { zh: "死神", en: "Death" }, line: { zh: "旧的落幕，才容新生降临。", en: "Only when the old closes can the new arrive." } },
  { name: { zh: "节制", en: "Temperance" }, line: { zh: "两相调和，方得长久平衡。", en: "Harmonize two sides to hold lasting balance." } },
  { name: { zh: "恶魔", en: "The Devil" }, line: { zh: "枷锁从来不在身外，而在执念之中。", en: "Shackles never lie outside—they live in attachment." } },
  { name: { zh: "高塔", en: "The Tower" }, line: { zh: "虚妄终将崩塌，毁灭方见真实。", en: "Illusion must collapse; only ruin reveals truth." } },
  { name: { zh: "星星", en: "The Star" }, line: { zh: "长夜再暗，我仍向人间倾注希望。", en: "Dark as the night, I still pour hope upon the world." } },
  { name: { zh: "月亮", en: "The Moon" }, line: { zh: "幻象丛生，需辨本心真伪。", en: "Illusions abound; discern the true from the false heart." } },
  { name: { zh: "太阳", en: "The Sun" }, line: { zh: "光明坦荡，纯粹自会驱散阴霾。", en: "Bright and open, purity itself dispels the haze." } },
  { name: { zh: "审判", en: "Judgement" }, line: { zh: "号角响起，直面过往，重新抉择。", en: "The horn sounds—face the past and choose anew." } },
  { name: { zh: "世界", en: "The World" }, line: { zh: "行完轮回之路，万事终得圆满。", en: "The cycle complete, all things find their fulfillment." } },
  // 小阿卡纳 · 权杖系列（下标 22 起）
  { name: { zh: "权杖 ACE", en: "Ace of Wands" }, line: { zh: "心火初生，万事皆可启程。", en: "The heart-fire ignites; all may be set in motion." } },
  { name: { zh: "权杖二", en: "Two of Wands" }, line: { zh: "立足当下，远眺我将要奔赴的远方。", en: "Stand firm now, and gaze at the far shore I will set out for." } },
  { name: { zh: "权杖三", en: "Three of Wands" }, line: { zh: "静待航船归岸，前路已有方向。", en: "Wait for the ship's return; the path ahead already has its bearing." } },
  { name: { zh: "权杖四", en: "Four of Wands" }, line: { zh: "喧嚣散去，安稳与欢聚即是归宿。", en: "When the clamor fades, peace and gathering are the true home." } },
  { name: { zh: "权杖五", en: "Five of Wands" }, line: { zh: "纷争四起，我要在较量中争得一席之地。", en: "Strife rises on every side; I will carve out my own place in the contest." } },
  { name: { zh: "权杖六", en: "Six of Wands" }, line: { zh: "奋力前行，荣光自会为我而来。", en: "Press forward with all your might; glory will come to you on its own." } },
  { name: { zh: "权杖七", en: "Seven of Wands" }, line: { zh: "纵众敌袭来，我亦坚守阵地不退。", en: "Though many foes advance, I hold my ground and do not yield." } },
  { name: { zh: "权杖八", en: "Eight of Wands" }, line: { zh: "心念一动，万事疾速奔赴。", en: "At the stirring of intent, all things hasten to arrive." } },
  { name: { zh: "权杖九", en: "Nine of Wands" }, line: { zh: "满身疲惫，仍要守住最后的防线。", en: "Weary to the bone, I still guard the final line." } },
  { name: { zh: "权杖十", en: "Ten of Wands" }, line: { zh: "身负重担，咬牙走完这段长路。", en: "Shouldering the heavy load, I grit my teeth and finish the long road." } },
  { name: { zh: "权杖侍从", en: "Page of Wands" }, line: { zh: "满怀热忱，万事皆愿一试。", en: "Full of fervor, I am willing to try every endeavor." } },
  { name: { zh: "权杖骑士", en: "Knight of Wands" }, line: { zh: "心火不息，策马即刻奔赴。", en: "The heart-fire never dies; I spur my steed and ride at once." } },
  { name: { zh: "权杖王后", en: "Queen of Wands" }, line: { zh: "自信盛放，热烈而从容。", en: "Confidence blooms within; passionate, yet composed." } },
  { name: { zh: "权杖国王", en: "King of Wands" }, line: { zh: "以热忱领路，以魄力决断。", en: "Lead with fervor, decide with resolve." } },
  // 小阿卡纳 · 圣杯系列（下标 36 起）
  { name: { zh: "圣杯 ACE", en: "Ace of Cups" }, line: { zh: "心底漾起温柔，爱意自此萌生。", en: "Gentleness rises in the heart; love is born from it." } },
  { name: { zh: "圣杯二", en: "Two of Cups" }, line: { zh: "灵魂相契，杯盏相对即是共鸣。", en: "Kindred souls—raised cups are their resonance." } },
  { name: { zh: "圣杯三", en: "Three of Cups" }, line: { zh: "喜乐共享，欢愉不必独藏。", en: "Share the joy; happiness need not be hoarded." } },
  { name: { zh: "圣杯四", en: "Four of Cups" }, line: { zh: "纵使馈赠在前，我仍沉心自省。", en: "Though gifts lie before me, I still turn inward in reflection." } },
  { name: { zh: "圣杯五", en: "Five of Cups" }, line: { zh: "沉溺失去之时，别忽略尚存的温暖。", en: "When lost in grief, do not overlook the warmth that remains." } },
  { name: { zh: "圣杯六", en: "Six of Cups" }, line: { zh: "旧日温柔长存，善意代代相递。", en: "The gentleness of yesterday endures; kindness passes across generations." } },
  { name: { zh: "圣杯七", en: "Seven of Cups" }, line: { zh: "幻梦万千，需分清何为真心所求。", en: "A thousand dreams; discern what the heart truly seeks." } },
  { name: { zh: "圣杯八", en: "Eight of Cups" }, line: { zh: "舍弃眼前安稳，奔赴内心真正渴求。", en: "Leave present comfort behind, and go to what the heart truly longs for." } },
  { name: { zh: "圣杯九", en: "Nine of Cups" }, line: { zh: "内心自足，欢喜不必向外求证。", en: "Content within; joy needs no proof from without." } },
  { name: { zh: "圣杯十", en: "Ten of Cups" }, line: { zh: "所爱相伴，家与温情即是圆满。", en: "With loved ones beside, home and warmth are fulfillment." } },
  { name: { zh: "圣杯侍从", en: "Page of Cups" }, line: { zh: "敏感共情，以温柔感知世间情绪。", en: "Empathetic and sensitive, perceiving the world's feelings with tenderness." } },
  { name: { zh: "圣杯骑士", en: "Knight of Cups" }, line: { zh: "携爱意缓步，浪漫永藏于心。", en: "Advancing gently with love, romance forever kept in heart." } },
  { name: { zh: "圣杯王后", en: "Queen of Cups" }, line: { zh: "包容万物情绪，温柔容纳众生。", en: "Holding all emotions, embracing all beings with tenderness." } },
  { name: { zh: "圣杯国王", en: "King of Cups" }, line: { zh: "情绪收放自如，温润亦可自持。", en: "Master of one's emotions—gentle, yet self-possessed." } },
  // 小阿卡纳 · 宝剑系列（下标 50 起）
  { name: { zh: "宝剑 ACE", en: "Ace of Swords" }, line: { zh: "一念决断，真理自锋芒而生。", en: "In a single resolve, truth is born from the blade's edge." } },
  { name: { zh: "宝剑二", en: "Two of Swords" }, line: { zh: "闭目隔绝纷扰，暂守内心平静。", en: "Close the eyes to clamor; hold to inner calm for now." } },
  { name: { zh: "宝剑三", en: "Three of Swords" }, line: { zh: "心碎难掩，伤痛亦是真实感受。", en: "A shattered heart will not hide; pain, too, is real feeling." } },
  { name: { zh: "宝剑四", en: "Four of Swords" }, line: { zh: "喧嚣暂歇，静息以待重整。", en: "The noise stills; rest a while before regrouping." } },
  { name: { zh: "宝剑五", en: "Five of Swords" }, line: { zh: "赢了争执，却输掉人心，又有何益。", en: "Win the argument yet lose the heart—what is that worth?" } },
  { name: { zh: "宝剑六", en: "Six of Swords" }, line: { zh: "载伤痛渡江海，慢慢驶向安宁。", en: "Carrying sorrow across the seas, sailing slowly toward peace." } },
  { name: { zh: "宝剑七", en: "Seven of Swords" }, line: { zh: "正道难行，我只能寻巧径自保。", en: "The straight path is hard; I must find a shrewd way to protect myself." } },
  { name: { zh: "宝剑八", en: "Eight of Swords" }, line: { zh: "困住我的从不是枷锁，是固有认知。", en: "What binds me is never chains, but the beliefs I hold." } },
  { name: { zh: "宝剑九", en: "Nine of Swords" }, line: { zh: "长夜焦虑，心魔独自煎熬。", en: "Anxious through the long night, tormented alone by inner demons." } },
  { name: { zh: "宝剑十", en: "Ten of Swords" }, line: { zh: "苦难至此落幕，终会迎来新生。", en: "Suffering closes its curtain; new life will surely follow." } },
  { name: { zh: "宝剑侍从", en: "Page of Swords" }, line: { zh: "冷眼观察，洞悉言语背后的真相。", en: "Observing with cool eyes, discerning the truth behind words." } },
  { name: { zh: "宝剑骑士", en: "Knight of Swords" }, line: { zh: "思绪如风，决断迅疾不留迟疑。", en: "Thought moves like the wind; decisions swift, no hesitation." } },
  { name: { zh: "宝剑王后", en: "Queen of Swords" }, line: { zh: "理智为刃，直言不讳，明辨虚实。", en: "Reason as the blade; speak plainly, and see the false from the true." } },
  { name: { zh: "宝剑国王", en: "King of Swords" }, line: { zh: "以逻辑定是非，冷静执掌决断。", en: "With logic to set right from wrong, holding judgment with calm." } },
  // 小阿卡纳 · 星币系列（下标 64 起）
  { name: { zh: "星币 ACE", en: "Ace of Pentacles" }, line: { zh: "沃土之上，机遇与财富悄然萌芽。", en: "On fertile soil, opportunity and wealth sprout quietly." } },
  { name: { zh: "星币二", en: "Two of Pentacles" }, line: { zh: "浮沉之间，平衡生计与变数。", en: "Amid the rising and falling, balance livelihood with change." } },
  { name: { zh: "星币三", en: "Three of Pentacles" }, line: { zh: "同心实干，方能筑成成果。", en: "Working together in earnest, only then is achievement built." } },
  { name: { zh: "星币四", en: "Four of Pentacles" }, line: { zh: "握紧所得，不愿失去分毫。", en: "Gripping what is gained, unwilling to lose a single part." } },
  { name: { zh: "星币五", en: "Five of Pentacles" }, line: { zh: "身处困顿，仍要相信微光。", en: "In hardship, still believe in the faint light." } },
  { name: { zh: "星币六", en: "Six of Pentacles" }, line: { zh: "资源有度，施与受自有分寸。", en: "Resources have their measure; giving and receiving keep proportion." } },
  { name: { zh: "星币七", en: "Seven of Pentacles" }, line: { zh: "耕耘已毕，静待收成到来。", en: "The tilling is done; wait quietly for the harvest." } },
  { name: { zh: "星币八", en: "Eight of Pentacles" }, line: { zh: "沉心打磨技艺，久久方得精进。", en: "Polish the craft with a still heart; mastery comes only in time." } },
  { name: { zh: "星币九", en: "Nine of Pentacles" }, line: { zh: "凭己之力富足，独享从容安宁。", en: "Prosperous by one's own hand, enjoying calm ease alone." } },
  { name: { zh: "星币十", en: "Ten of Pentacles" }, line: { zh: "家业传承，物质与血脉安稳延续。", en: "The household legacy lives on—wealth and bloodline in steady succession." } },
  { name: { zh: "星币侍从", en: "Page of Pentacles" }, line: { zh: "脚踏实地，认真研习世间实务。", en: "With feet on the ground, earnestly studying the world's practical arts." } },
  { name: { zh: "星币骑士", en: "Knight of Pentacles" }, line: { zh: "稳步前行，时间自会兑现成果。", en: "Advancing steadily; time itself will cash in the results." } },
  { name: { zh: "星币王后", en: "Queen of Pentacles" }, line: { zh: "用心经营，富足安稳皆由自己创造。", en: "Nurture with care; abundance and stability are of one's own making." } },
  { name: { zh: "星币国王", en: "King of Pentacles" }, line: { zh: "稳守基业，务实规划长久未来。", en: "Guard the foundation; plan pragmatically for a long future." } },
];

/** 塔罗牌按稀有度分组（序号 = TAROT_ARCANA 下标）。 */
const TAROT_BY_RARITY: Record<string, number[]> = {
  // 每档：大阿卡纳 + 权杖/圣杯/宝剑/星币四套的低阶/侍从
  common: [
    0, 1, // 愚人·魔术师
    22, 23, 24, 25, // 权杖 ACE·二·三·四
    36, 37, 38, 39, // 圣杯 ACE·二·三·四
    50, 51, 52, 53, // 宝剑 ACE·二·三·四
    64, 65, 66, 67, // 星币 ACE·二·三·四
  ],
  rare: [
    26, 27, 28, // 权杖五·六·七
    40, 41, 42, // 圣杯五·六·七
    54, 55, 56, // 宝剑五·六·七
    68, 69, 70, // 星币五·六·七
  ],
  epic: [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, // 女祭司…节制的大阿卡纳（除愚人/魔术师与顶级六柱）
    29, 32, 34, // 权杖八·侍从·王后
    43, 46, 48, // 圣杯八·侍从·王后
    57, 60, 62, // 宝剑八·侍从·王后
    71, 74, 76, // 星币八·侍从·王后
  ],
  legendary: [
    30, 31, 33, 35, // 权杖九·十·骑士·国王
    44, 45, 47, 49, // 圣杯九·十·骑士·国王
    58, 59, 61, 63, // 宝剑九·十·骑士·国王
    72, 73, 75, 77, // 星币九·十·骑士·国王
  ],
  myth: [
    16, 17, 18, 19, 20, 21, 15, 13, // 高塔·星星·月亮·太阳·审判·世界·恶魔·死神（最强八柱）
  ],
};

/** 当前成就的稀有度值。 */
type AchievementRarity = AssistantAchievement["rarity"];

/**
 * 将全部成就按稀有度分组，再按各组塔罗牌集合（TAROT_BY_RARITY 顺序）顺序一一对应，
 * 保证「成就 ↔ 塔罗牌」稳定一对一、无冲突：同稀有度内，越靠前的成就对应越靠前的牌，
 * 且每个稀有度组都优先覆盖该组开头的全部大阿卡纳牌。返回：
 * - cardToAch：牌序号 → 对应成就（无成就的牌不在其中，用于待解锁展示）；
 * - achToCard：成就 id → 牌序号（反查，供「即将解锁」等复用）。
 */
function buildDeck(achievements: AssistantAchievement[]): {
  cardToAch: Record<number, AssistantAchievement>;
  achToCard: Record<string, number>;
} {
  const byRarity: Record<AchievementRarity, AssistantAchievement[]> = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
    myth: [],
  };
  for (const a of achievements) {
    const bucket = byRarity[a.rarity];
    if (bucket) bucket.push(a);
  }
  const cardToAch: Record<number, AssistantAchievement> = {};
  const achToCard: Record<string, number> = {};
  (Object.keys(byRarity) as AchievementRarity[]).forEach((r) => {
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

/** 大阿卡纳序号 → 罗马数字（0 保留为 0）；小阿卡纳 → ACE/II…X/宫廷阶名。 */
function arcanaRoman(no: number): string {
  if (no >= 22) {
    const marks = ["ACE", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "PAGE", "KNIGHT", "QUEEN", "KING"];
    return marks[(no - 22) % 14] ?? String(no);
  }
  if (no <= 0) return "0";
  const table: Array<[number, string]> = [
    [21, "XXI"], [20, "XX"], [19, "XIX"], [18, "XVIII"], [17, "XVII"], [16, "XVI"],
    [15, "XV"], [14, "XIV"], [13, "XIII"], [12, "XII"], [11, "XI"], [10, "X"],
    [9, "IX"], [8, "VIII"], [7, "VII"], [6, "VI"], [5, "V"], [4, "IV"], [3, "III"], [2, "II"], [1, "I"],
  ];
  for (const [v, r] of table) if (no >= v) return r;
  return "0";
}

/**
 * 绘制小阿卡纳「权杖」牌的象征图标（下标 22~35）：
 * 中央一支火杖 + 顶部火芽，左侧沿弧线分布权杖数量标记；
 * 宫廷牌（侍从/骑士/王后/国王）在火杖中部叠加王冠以示身份。
 */
function wandsSym(no: number, S: Record<string, unknown>, F: Record<string, unknown>): ReactNode {
  const numeric = no >= 22 && no <= 31;
  const n = numeric ? no - 21 : 4; // ACE=1，权杖二~十 = 2~10；宫廷牌 = 4
  const stars: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const R = 14.5;
    const a = Math.PI * (0.2 + t * 0.44); // 0.2π ~ 0.64π（左下至左侧）
    const cx = Math.round(17 + Math.cos(a) * R);
    const cy = Math.round(50 - Math.sin(a) * (R * 0.95));
    stars.push(
      <path key={i} {...F} d={`M${cx} ${cy} l1.7 2.1 -1.7 2.1 -1.7 -2.1 Z`} opacity={0.85} />,
    );
  }
  const court = no >= 32 && no <= 35;
  return (
    <>
      {/* 中央主杖 */}
      <path {...S} d="M28 52 V16" strokeWidth={2.4} />
      {/* 杖顶火芽 */}
      <path {...S} d="M28 16 V11 M28 16 l-3 2 M28 16 l3 2" />
      <path {...F} d="M28 6.5 l2.6 3.3 a3.7 3.1 0 0 1 -5.2 0 Z" />
      {/* 左侧数量标记 */}
      {stars}
      {/* 横向握带 + 底台 */}
      <path {...S} d="M14 44 H42" opacity={0.55} />
      <rect x="20" y="52" width="16" height="3" rx="1" {...F} opacity={0.9} />
      {/* 宫廷牌：王冠 */}
      {court && (
        <>
          <path {...F} d="M20 30 l8 -7 8 7 Z" />
          <path {...F} d="M17 32 h22 v3 H17 Z" />
          <circle cx="20" cy="30" r="1.5" {...F} />
          <circle cx="28" cy="23" r="1.5" {...F} />
          <circle cx="36" cy="30" r="1.5" {...F} />
        </>
      )}
    </>
  );
}

/** 小阿卡纳数量标记的弧线坐标（左下至左侧弧段，避让中央主符号）。 */
function minorArcPos(i: number, n: number): { x: number; y: number } {
  const t = n === 1 ? 0.5 : i / (n - 1);
  const R = 14.5;
  const a = Math.PI * (0.2 + t * 0.44);
  return { x: Math.round(17 + Math.cos(a) * R), y: Math.round(50 - Math.sin(a) * (R * 0.95)) };
}

/** 宫廷牌底部的统一王冠标记（叠加在牌面下方，作为身份阶标）。 */
function courtCrown(F: Record<string, unknown>): ReactNode {
  return (
    <>
      <path {...F} d="M22 46 l6 -5 6 5 Z" />
      <path {...F} d="M18.5 50 h19 v3.5 h-19 Z" />
      <circle cx="22" cy="46" r="1.4" {...F} />
      <circle cx="28" cy="41" r="1.4" {...F} />
      <circle cx="34" cy="46" r="1.4" {...F} />
    </>
  );
}

/**
 * 绘制小阿卡纳「圣杯」（水/情感）牌的象征图标（下标 36~49）：
 * 中央圣杯 + 沿弧线的水滴数量标记；宫廷牌底部叠加王冠。
 */
function cupsSym(no: number, S: Record<string, unknown>, F: Record<string, unknown>): ReactNode {
  const numeric = no >= 36 && no <= 45;
  const n = numeric ? no - 35 : 4; // ACE=1，圣杯二~十 = 2~10；宫廷牌 = 4
  const drops: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    drops.push(
      <path
        key={i}
        {...F}
        d={`M${x} ${y - 2} c1.1 1 .3 2.2 -1.7 3.5 a1.7 1.5 0 0 1 -1.6 0 c-2 -1.3 -2.8 -2.5 -1.7 -3.5 Z`}
        opacity={0.85}
      />,
    );
  }
  const court = no >= 46 && no <= 49;
  return (
    <>
      {/* 圣杯杯身 + 宽口杯沿 */}
      <path {...S} d="M21 18 h14 l-2 12 a6.5 4.2 0 0 1 -10 0 Z" />
      <path {...S} d="M19 18 H37" opacity={0.55} />
      {/* 杯脚底座 */}
      <path {...S} d="M28 32 V43 M22 43 H34" />
      <rect x="20" y="43" width="16" height="2.5" rx="1" {...F} opacity={0.9} />
      {drops}
      {court && courtCrown(F)}
    </>
  );
}

/**
 * 绘制小阿卡纳「宝剑」（风/理性）牌的象征图标（下标 50~63）：
 * 中央竖剑 + 沿弧线的短刃数量标记；宫廷牌底部叠加王冠。
 */
function swordsSym(no: number, S: Record<string, unknown>, F: Record<string, unknown>): ReactNode {
  const numeric = no >= 50 && no <= 59;
  const n = numeric ? no - 49 : 4; // ACE=1，宝剑二~十 = 2~10；宫廷牌 = 4
  const blades: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    blades.push(<path key={i} {...F} d={`M${x} ${y - 3} l1.2 3 -1.2 3 -1.2 -3 Z`} opacity={0.85} />);
  }
  const court = no >= 62 && no <= 63;
  return (
    <>
      {/* 剑刃脊 + 剑尖 */}
      <path {...S} d="M28 12 V48" strokeWidth={2.2} />
      <path {...F} d="M28 8 l-3 4 3 -1.8 3 1.8 Z" opacity={0.9} />
      {/* 护手横梁 */}
      <path {...S} d="M20 26 H36 M21 31 H35" opacity={0.7} />
      {/* 剑柄圆座 */}
      <circle cx="28" cy="44" r="2.6" {...S} />
      <rect x="24" y="47" width="8" height="2.5" rx="1" {...F} opacity={0.9} />
      {blades}
      {court && courtCrown(F)}
    </>
  );
}

/**
 * 绘制小阿卡纳「星币」（土/物质）牌的象征图标（下标 64~77）：
 * 中央五芒天秤圆币 + 沿弧线的钱币数量标记；宫廷牌底部叠加王冠。
 */
function pentaclesSym(no: number, S: Record<string, unknown>, F: Record<string, unknown>): ReactNode {
  const numeric = no >= 64 && no <= 73;
  const n = numeric ? no - 63 : 4; // ACE=1，星币二~十 = 2~10；宫廷牌 = 4
  const coins: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = minorArcPos(i, n);
    coins.push(<circle key={i} cx={x} cy={y} r={2} {...F} opacity={0.85} />);
  }
  const court = no >= 76 && no <= 77;
  return (
    <>
      {/* 圆币外环 + 内环 */}
      <circle cx="28" cy="25" r="9.5" {...S} />
      <circle cx="28" cy="25" r="6" {...S} opacity={0.5} />
      {/* 内嵌五芒星 */}
      <path {...F} d="M28 17 l2 3.4 4 .6 -3 2.6 .9 4 -3.9 -2 -3.9 2 .9 -4 -3 -2.6 4 -.6 Z" />
      {/* 底座 */}
      <path {...S} d="M28 34.5 V42 M23 36 H33" opacity={0.6} />
      <rect x="20" y="42" width="16" height="2.5" rx="1" {...F} opacity={0.9} />
      {coins}
      {court && courtCrown(F)}
    </>
  );
}

/**
 * 绘制单张大阿卡纳的线描象征图标：
 * 已解锁 = 金色/紫色线描实心，「真实彩面」；未解锁 = 浅灰低透明模糊虚影。
 * 顶部共通星芒 + 中央按牌号绘制的专属象征符号，呼应每张原牌的意象。
 */
function TarotArcana({ no, achieved, color }: { no: number; achieved: boolean; color: string }): ReactNode {
  const fill = achieved ? color : "#64748b";
  const S = { fill: "none", stroke: fill, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const F = { fill } as const;
  const sym: ReactNode = (() => {
    switch (no) {
      case 0: // 愚人：行囊杖 + 悬崖 + 远方太阳
        return (
          <>
            <circle cx="44" cy="16" r="4.5" {...F} opacity={0.85} />
            <path {...S} d="M16 30 h14.5 l2.5 2.5 -2.5 2.5" />
            <path {...S} d="M46 28 V14 L31 52 H15" />
            <circle cx="28" cy="40" r="5" {...F} />
            <path {...S} d="M23 40 V46 H33 V40" />
          </>
        );
      case 1: // 魔术师：∞ 记号 + 拈杖 + 桌面三盏杯
        return (
          <>
            <path {...S} d="M28 30 c-4 -6 -16 -6 -16 0 c0 6 12 6 16 0 c4 -6 16 -6 16 0 c0 6 -12 6 -16 0" />
            <path {...S} d="M28 30 V14" />
            <path {...S} d="M12 46 H44" />
            <rect x="17" y="46" width="5" height="10" {...F} opacity={0.9} />
            <rect x="26" y="46" width="5" height="10" {...F} opacity={0.9} />
            <rect x="35" y="46" width="5" height="10" {...F} opacity={0.9} />
          </>
        );
      case 2: // 女祭司：月弧 + 星徽 + 垂帘卷轴与双柱
        return (
          <>
            <path {...S} d="M12 20 Q28 8 44 20" />
            <path {...F} d="M28 22 l4 3 -1.3 5 2 4 -4.7 -2.4 -4.7 2.4 2 -4 -1.3 -5 Z" />
            <path {...S} d="M15 30 H41 M14 24 V50 M42 24 V50" />
            <path {...S} d="M14 52 H42" opacity={0.6} />
          </>
        );
      case 3: // 皇后：麦环 + 王冠心盾
        return (
          <>
            <path {...S} d="M16 24 q-3 6 0 12 M40 24 q3 6 0 12" />
            <path {...S} d="M18 30 h-3 M36 30 h3" opacity={0.6} />
            <path {...F} d="M28 22 l5.5 4 -2.5 7 -3 -1.6 -3 1.6 -2.5 -7 Z" />
            <path {...S} d="M28 30 v8 M24 33 h8" opacity={0.7} />
          </>
        );
      case 4: // 皇帝：公羊角盾 + 王冠 + 权杖
        return (
          <>
            <path {...S} d="M28 20 l8 3 V30 Q36 38 28 41 Q20 38 20 30 V23 Z" />
            <path {...S} d="M20 20 Q28 26 36 20" />
            <path {...S} d="M28 41 V48 M24 48 h8" />
          </>
        );
      case 5: // 教皇：三重冠 + 权杖 + 交叉钥匙
        return (
          <>
            <path {...S} d="M18 22 h20 M21 28 h14 M24 34 h8" />
            <circle cx="28" cy="40" r="4" {...F} opacity={0.9} />
            <path {...S} d="M24 40 V52 M32 40 V52 M24 52 a4 3 0 0 0 8 0" />
            <path {...S} d="M20 46 l-6 3 M36 46 l6 3" />
          </>
        );
      case 6: // 恋人：下方双人 + 中央光环 + 上方天使太阳
        return (
          <>
            <circle cx="28" cy="14" r="3.5" {...F} opacity={0.9} />
            <circle cx="20" cy="40" r="5" {...F} />
            <circle cx="36" cy="40" r="5" {...F} />
            <path {...S} d="M15 40 a5 5 0 0 0 4 5" />
            <path {...S} d="M41 40 a5 5 0 0 1 -4 5" />
            <path {...S} d="M28 33 a10 14 0 0 0 0 0" opacity={0} />
          </>
        );
      case 7: // 战车：车篷 + 车体 + 双轮
        return (
          <>
            <path {...S} d="M18 30 h20 l3 8 H15 Z" />
            <path {...S} d="M22 30 V22 Q28 18 34 22 V30" />
            <circle cx="22" cy="49" r="6" {...S} />
            <circle cx="25" cy="46" r="1.8" {...F} opacity={0.9} />
            <circle cx="34" cy="49" r="6" {...S} />
          </>
        );
      case 8: // 力量：∞ 顶环 + 驯狮
        return (
          <>
            <path {...S} d="M28 9 c-3 -4 -12 -4 -10 1 c1 4 12 4 10 -1 Z" />
            <path {...S} d="M14 26 q14 -6 28 -2 Q44 34 28 40 Q12 34 14 26 Z" />
            <circle cx="28" cy="33" r="5" {...F} opacity={0.9} />
          </>
        );
      case 9: // 隐士：提灯望路 + 手杖
        return (
          <>
            <path {...S} d="M28 26 l4 -9 a6 5 0 0 1 -8 0 Z" />
            <path {...S} d="M28 26 V50 M20 30 H36" />
            <circle cx="22" cy="44" r="4" {...F} opacity={0.9} />
            <path {...S} d="M36 50 h6" opacity={0.6} />
          </>
        );
      case 10: // 命运之轮：轮盘 + 蛇脊 + 十字轴
        return (
          <>
            <circle cx="28" cy="32" r="13" {...S} />
            <circle cx="28" cy="32" r="4" {...F} opacity={0.9} />
            <path {...S} d="M28 14 V19 M28 45 V50 M10 32 H15 M41 32 H46" />
            <path {...S} d="M21 20 Q13 32 24 40" opacity={0.75} />
          </>
        );
      case 11: // 正义：天平 + 剑 + 中冠
        return (
          <>
            <path {...F} d="M28 14 l3 3 -3 3 -3 -3 Z" />
            <path {...S} d="M28 20 V50" />
            <path {...S} d="M28 24 H14 M28 24 H42" />
            <path {...S} d="M14 30 V24 M42 30 V24" />
            <path {...S} d="M10 30 h8 v6 h-8 Z M38 30 h8 v6 h-8 Z" />
          </>
        );
      case 12: // 倒吊人：横梁 + 倒挂双腿 + 头光环
        return (
          <>
            <path {...S} d="M12 17 H44 M28 17 V28" />
            <circle cx="28" cy="34" r="4" {...F} opacity={0.9} />
            <path {...S} d="M20 34 L20 47 L36 47 L36 34" />
            <path {...S} d="M20 40 H36" opacity={0.7} />
          </>
        );
      case 13: // 死神：镰 + 白玫瑰旗 + 头骨
        return (
          <>
            <path {...S} d="M22 20 a6 6 0 0 0 4 5 M22 26 V44" />
            <path {...S} d="M25 26 L36 12 M36 12 l3.5 1.5 -2 4 Z" />
            <rect x="30" y="28" width="11" height="9" rx="2" {...F} opacity={0.85} />
            <path {...S} d="M22 44 V52 M18 52 H27" />
          </>
        );
      case 14: // 节制：双杯倒水 + 星
        return (
          <>
            <path {...S} d="M16 38 V28 M16 28 a6 5 0 0 1 6 5" />
            <path {...S} d="M40 20 V36 M40 36 a6 5 0 0 1 -6 -5" />
            <path {...S} d="M20 36 q14 10 20 -4" opacity={0.75} />
            <path {...F} d="M28 12 l2 3.4 4 .6 -3 2.6 .9 4 -3.9 -2 -3.9 2 .9 -4 -3 -2.6 4 -.6 Z" />
          </>
        );
      case 15: // 恶魔：倒五角 + 巨角 + 锁链
        return (
          <>
            <circle cx="28" cy="34" r="12" {...S} />
            <path {...S} d="M28 26 L32 33 L29 42 L27 42 L24 33 Z" />
            <path {...S} d="M17 30 Q14 20 21 16 M39 30 Q42 20 35 16" opacity={0.8} />
            <path {...S} d="M28 46 V54 M24 54 h8" />
          </>
        );
      case 16: // 高塔：被雷击的塔 + 坠冠
        return (
          <>
            <path {...S} d="M21 52 H35 L32 24 H24 Z" />
            <path {...S} d="M22 34 h12" opacity={0.7} />
            <path {...F} d="M28 13 l3 3 -1.5 4 -3 0 -1.5 -4 Z" opacity={0.9} />
            <path {...S} d="M14 6 L25 26 M42 6 L31 26" opacity={0.8} />
          </>
        );
      case 17: // 星星：大星 + 双倾壶倒水
        return (
          <>
            <path {...F} d="M28 10 l2.1 4.6 5 .5 -3.8 3.3 1.1 4.9 -4.4 -2.6 -4.4 2.6 1.1 -4.9 -3.8 -3.3 5 -.5 Z" />
            <path {...S} d="M20 42 H36 M15 50 H41" />
            <path {...S} d="M20 42 V50 M36 42 V50" />
          </>
        );
      case 18: // 月亮：月牙 + 双塔 + 犬狼
        return (
          <>
            <path {...S} d="M28 14 A11 11 0 1 0 39 22 A8 8 0 0 1 28 14 Z" />
            <path {...S} d="M14 48 H42 M14 52 H42" />
            <path {...S} d="M20 22 Q28 28 28 38 M36 22 Q28 30 28 38" />
            <path {...S} d="M26 30 h4" opacity={0.7} />
          </>
        );
      case 19: // 太阳：光芒日盘 + 旗
        return (
          <>
            <circle cx="28" cy="30" r="10" {...F} opacity={0.95} />
            <circle cx="28" cy="30" r="6" {...S} />
            <path {...S} d="M28 14 V8 M28 52 V46 M12 30 H6 M50 30 H44 M17 19 L12.6 14.6 M38.6 19 L43 14.6" />
            <path {...S} d="M30 30 v10 h9" opacity={0.7} />
          </>
        );
      case 20: // 审判：号角 + 复魂
        return (
          <>
            <path {...S} d="M10 16 L22 16 L22 10 L30 16 L22 22 Z" />
            <path {...S} d="M26 20 l-5 6 M24 30 A8 6 0 0 1 42 30" />
            <path {...S} d="M32 30 V42 M26 30 V40 M38 30 V40" />
            <path {...S} d="M30 36 H34" opacity={0.7} />
          </>
        );
      case 21: // 世界：椭圆环 + 舞者 + 四角星
        return (
          <>
            <ellipse cx="28" cy="34" rx="16" ry="14" {...S} />
            <path {...S} d="M12 20 q16 -12 32 0" opacity={0.6} />
            <circle cx="28" cy="34" r="5" {...F} opacity={0.9} />
            <path {...F} d="M12 12 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z" opacity={0.9} />
            <path {...F} d="M44 12 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z" opacity={0.9} />
          </>
        );
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
        return <circle cx="28" cy="32" r="14" {...S} />;
    }
  })();
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 56 64"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{
        filter: achieved ? "none" : "blur(0.8px)",
        opacity: achieved ? 1 : 0.5,
        transition: "filter .25s ease, opacity .25s ease",
      }}
    >
      {/* 顶部星芒（塔罗共通点缀） */}
      <path
        fill={fill}
        opacity={achieved ? 0.8 : 0.5}
        d="M28 2 L30.2 6.6 L35 7.2 L31.5 10.6 L32.9 15.4 L28 12.8 L23.1 15.4 L24.5 10.6 L21 7.2 L25.8 6.6 Z"
      />
      {sym}
    </svg>
  );
}

/**
 * 塔罗牌成就卡：竖版「牌面」，顶部序标（罗马数字）+ 双线内框 + 中央该成就对应的大阿卡纳象征 +
 * 牌名 / 牌面名言 / 稀有度 / 解锁进度。已解锁为金紫渐变真实牌面，未解锁为灰色虚线占位角牌。
 * 塔罗牌由 buildDeck 按稀有度顺序指派给成就 —— 同一成就永远对应同一张牌。
 */
function AchievementCard({ achievement, cardNo, t, TONE, lang }: { achievement: AssistantAchievement; cardNo: number; t: PLT; TONE: ThemeTone; lang: "zh" | "en" }): ReactNode {
  const a = achievement;
  const pct = a.target > 0 ? Math.max(0, Math.min(100, (a.progress / a.target) * 100)) : 0;
  // 该成就对应的大阿卡纳牌（由 buildDeck 顺序指派），牌名与名言按界面语言取
  const arc = cardNo;
  const deck = TAROT_ARCANA[arc];
  const L: "zh" | "en" = lang === "en" ? "en" : "zh";
  const name = deck.name[L];
  const nameAlt = deck.name[L === "en" ? "zh" : "en"];
  const line = deck.line[L];
  // 稀有度主色：解锁后牌面随稀有度换色（普通灰 / 稀有蓝 / 史诗紫 / 传说橙）
  const c = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common;
  return (
    <li
      title={`${name} ${nameAlt} · ${a.achieved ? rarityLabel(a.rarity, t) + " · +" + a.points : t("pl.achievements.lockedHint")}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.45,
        padding: "14px 8px 9px",
        borderRadius: 12,
        // 塔罗牌面：已解锁 = 顶部白辉 + 稀有度高光渐变 + 稀有度双晕「窗花」；未解锁 = 面板 + 灰色花边描边 + 灰虚影
        background: a.achieved
          ? `radial-gradient(140% 55% at 50% 0%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 55%), linear-gradient(168deg, ${c.high} 0%, ${c.base} 42%, ${c.deep} 100%)`
          : TONE.panel,
        border: a.achieved
          ? `1px solid ${c.deep}`
          : `1px dashed rgba(154,163,178,.62)`,
        outline: "none",
        boxShadow: a.achieved
          ? `0 0 0 1px ${c.base}, 0 0 0 3px ${c.border}, 0 6px 18px ${c.shadow}`
          : "0 0 0 1px rgba(154,163,178,.32)",
        opacity: a.achieved ? 1 : 0.72,
        transition: "transform .16s ease, box-shadow .16s ease, opacity .16s ease",
      }}
      onMouseEnter={(e) => {
        if (a.achieved) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow =
            `0 0 0 1px ${c.high}, 0 0 0 4px ${c.border}, 0 10px 24px ${c.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          a.achieved
            ? `0 0 0 1px ${c.base}, 0 0 0 3px ${c.border}, 0 6px 18px ${c.shadow}`
            : "0 0 0 1px rgba(154,163,178,.32)";
      }}
    >
      {/* 解锁光效：表面流动高光扫光（仅解锁） */}
      {a.achieved && <div className="pl-card-sheen" />}
      {/* 史诗及以上：炫彩流动金边（仅解锁） */}
      {a.achieved && ["epic", "legendary", "myth"].includes(a.rarity) && <div className="pl-card-gold" />}
      {/* 三层花边内框（窗花）：已解锁金双层花边 / 未解锁灰色细线描边 */}
      <div
        style={{
          position: "absolute",
          inset: 5,
          borderRadius: 10,
          border: a.achieved
            ? `1px dashed ${c.border}`
            : "1px solid rgba(154,163,178,.42)",
          pointerEvents: "none",
          opacity: a.achieved ? 1 : 0.75,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 9,
          borderRadius: 8,
          pointerEvents: "none",
          opacity: a.achieved ? 0.9 : 0.45,
          borderStyle: a.achieved ? "solid" : "dashed",
          borderWidth: 1,
          borderColor: a.achieved ? "rgba(255,255,255,.55)" : "rgba(154,163,178,.32)",
        }}
      />
      {/* 四角菱花窗花：已解锁稀有度菱花（内点高光色），未解锁灰色菱花（未结算周边灰色窗花描边） */}
      {(
        [
          { top: 2, left: 2 },
          { top: 2, right: 2 },
          { bottom: 2, left: 2 },
          { bottom: 2, right: 2 },
        ] as const
      ).map((pos, i) => (
        <div
          key={i}
          style={{
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
            ...pos,
          }}
        >
          <span
            style={{
              width: 3.5,
              height: 3.5,
              borderRadius: 999,
              background: a.achieved ? c.high : "rgba(154,163,178,.95)",
            }}
          />
        </div>
      ))}
      {/* 顶部编号条：塔罗式「稀有度序标」，居中放小字 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 2,
          padding: "1px 9px",
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: "#fff",
          background: a.achieved
            ? `linear-gradient(135deg, ${c.high}, ${c.base})`
            : TONE.border,
          boxShadow: a.achieved ? `0 1px 6px ${c.shadow}` : "none",
        }}
      >
        {a.achieved ? arcanaRoman(arc) : "?"}
      </div>
      {/* 中央象征：该成就对应的大阿卡纳牌面（解锁真实线描彩面 / 未解锁灰虚影） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 78,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <TarotArcana no={arc} achieved={a.achieved} color={a.achieved ? "#7c3aed" : "#64748b"} />
      </div>
      {/* 牌名（界面语言）+ 另一语种牌名小字 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontFamily: a.achieved ? "Georgia, 'Songti SC', 'Noto Serif SC', serif" : undefined,
            color: a.achieved ? "#fff" : TONE.quiet,
            fontSize: 13.5,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            textShadow: a.achieved ? "0 1px 3px rgba(0,0,0,.3)" : "none",
          }}
        >
          {name}
        </span>
        <span
          style={{
            color: a.achieved ? "rgba(255,255,255,.75)" : TONE.quiet,
            fontSize: 9,
            letterSpacing: 1,
            textTransform: "uppercase" as const,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {nameAlt}
        </span>
      </div>
      {/* 牌面名言（引文，最多两行截断） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          color: a.achieved ? "rgba(255,255,255,.9)" : TONE.quiet,
          fontSize: 10.5,
          textAlign: "center",
          lineHeight: 1.55,
          fontStyle: "italic",
          textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.25)" : "none",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
          minHeight: 32,
        }}
      >
        {line}
      </div>
      {/* 对应成就：该牌对应成就标题 + 描述（居中，标题加粗） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          marginTop: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.3,
            color: a.achieved ? "rgba(255,255,255,1)" : TONE.text,
            textAlign: "center",
            textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.28)" : "none",
            maxWidth: "100%",
          }}
        >
          {a.title}
        </span>
        <span
          style={{
            width: "100%",
            fontSize: 9.5,
            lineHeight: 1.4,
            color: a.achieved ? "rgba(255,255,255,.82)" : TONE.muted,
            textAlign: "center",
            textShadow: a.achieved ? "0 1px 2px rgba(0,0,0,.2)" : "none",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {a.desc}
        </span>
      </div>
      {/* 细分隔花边（分割进度与牌面信息） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "76%",
          height: 1,
          margin: "1px 0",
          display: "flex",
          alignItems: "center",
          opacity: a.achieved ? 0.7 : 0.45,
        }}
      >
        <span
          style={{
            flex: 1,
            height: 1,
            background: a.achieved ? "rgba(255,255,255,.55)" : TONE.border,
          }}
        />
        <span
          style={{
            width: 5,
            height: 5,
            margin: "-2px 3px 0",
            borderRadius: 1,
            transform: "rotate(45deg)",
            background: a.achieved ? "#fff7e0" : TONE.quiet,
          }}
        />
        <span
          style={{
            flex: 1,
            height: 1,
            background: a.achieved ? "rgba(255,255,255,.55)" : TONE.border,
          }}
        />
      </div>
      {/* 稀有度 + 成就点数（金胶囊） */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          padding: "1px 7px",
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: "#fff",
          background: a.achieved
            ? `linear-gradient(135deg, ${c.high}, ${c.base})`
            : TONE.border,
        }}
      >
        {rarityLabel(a.rarity, t)}
        {a.achieved ? " · +" + a.points : ""}
      </span>
      {/* 解锁进度条：展示 progress / target */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: a.achieved ? "rgba(255,255,255,.28)" : TONE.panel,
            border: a.achieved ? "1px solid rgba(255,255,255,.35)" : `1px solid ${TONE.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              background: a.achieved ? `linear-gradient(90deg, ${c.high}, ${c.base})` : TONE.accent,
              transition: "width .3s ease",
            }}
          />
        </div>
        <span style={{ fontSize: 10.5, color: a.achieved ? "rgba(255,255,255,.9)" : TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
          {a.achieved
            ? "100%"
            : t("pl.achievements.progress")
                .replace("{progress}", String(a.progress))
                .replace("{target}", String(a.target))}
        </span>
      </div>
    </li>
  );
}

/** 满级专属隐藏彩蛋卡：超越 78 张塔罗的「库之尽头」，仅满级（词库宗师）解锁。
 *  以金色神话牌呈现，带流动金光边与扫光，属于等级之巅的收藏者私藏。 */
function HiddenMasterCard({ t, lang }: { t: PLT; lang: "zh" | "en" }): ReactNode {
  const L: "zh" | "en" = lang === "en" ? "en" : "zh";
  const name = L === "en" ? "End of the Library" : "库之尽头";
  const nameAlt = L === "en" ? "库之尽头" : "End of the Library";
  const line =
    L === "en"
      ? "You reached the top of the shelf; every line from here begins with love alone."
      : "行至藏书之巅，往后每一句，皆因热爱而始。";
  // 满级黄金神话光泽
  const gold = {
    base: "#f5c518",
    high: "#ffef9e",
    deep: "#a8791e",
    border: "rgba(245,197,24,.62)",
    shadow: "rgba(245,197,24,.42)",
  };
  return (
    <li
      title={`${name} ${nameAlt} · ${t("pl.rarity.myth")} · +∞`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.45,
        padding: "14px 8px 9px",
        borderRadius: 12,
        background: `radial-gradient(140% 55% at 50% 0%, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 55%), linear-gradient(168deg, ${gold.high} 0%, ${gold.base} 42%, ${gold.deep} 100%)`,
        border: `1px solid ${gold.deep}`,
        outline: "none",
        boxShadow: `0 0 0 1px ${gold.base}, 0 0 0 3px ${gold.border}, 0 6px 18px ${gold.shadow}`,
        transition: "transform .16s ease, box-shadow .16s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow =
          `0 0 0 1px ${gold.high}, 0 0 0 4px ${gold.border}, 0 10px 24px ${gold.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          `0 0 0 1px ${gold.base}, 0 0 0 3px ${gold.border}, 0 6px 18px ${gold.shadow}`;
      }}
    >
      {/* 扫光 + 流动金光边 */}
      <div className="pl-card-sheen" />
      <div className="pl-card-gold" />
      {/* 金色双线内框 */}
      <div
        style={{
          position: "absolute",
          inset: 5,
          borderRadius: 10,
          border: `1px dashed ${gold.border}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 9,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.6)",
          pointerEvents: "none",
          opacity: 0.9,
        }}
      />
      {/* 四角金光菱花 */}
      {(
        [
          { top: 2, left: 2 },
          { top: 2, right: 2 },
          { bottom: 2, left: 2 },
          { bottom: 2, right: 2 },
        ] as const
      ).map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            zIndex: 1,
            transform: "rotate(45deg)",
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: gold.base,
            border: `1px solid ${gold.deep}`,
            boxShadow: `0 0 8px ${gold.base}`,
            ...pos,
          }}
        >
          <span style={{ width: 3.5, height: 3.5, borderRadius: 999, background: gold.high }} />
        </div>
      ))}
      {/* 顶部序标：用「∞」表达超越既有塔罗体系 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 2,
          padding: "0 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          color: "#7a4d00",
          background: "linear-gradient(135deg, #fff3c4, #f5c518)",
          boxShadow: `0 1px 6px ${gold.shadow}`,
        }}
      >
        ∞
      </div>
      {/* 中央象征：金色皇冠（等级之巅的徽记） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 78,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <svg width="58" height="58" viewBox="0 0 64 56" fill="none" aria-hidden="true">
          <path
            d="M6 44 12 16l13 12 7-14 7 14 13-12 6 28z"
            fill="#fff8e1"
            stroke="#8a5a00"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="16" r="2" fill="#d4a017" />
          <circle cx="17" cy="27" r="2" fill="#d4a017" />
          <circle cx="47" cy="27" r="2" fill="#d4a017" />
          <rect x="8" y="44" width="48" height="5" rx="2.5" fill="#d4a017" stroke="#8a5a00" strokeWidth="1" />
          <rect x="20" y="49" width="24" height="4" rx="2" fill="#fff3c4" stroke="#8a5a00" strokeWidth="1" />
        </svg>
      </div>
      {/* 牌名 + 另一语种牌名 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontFamily: "Georgia, 'Songti SC', 'Noto Serif SC', serif",
            color: "#fff",
            fontSize: 13.5,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            maxWidth: "100%",
            textShadow: "0 1px 3px rgba(0,0,0,.35)",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 9.5,
            letterSpacing: 0.4,
            color: "#3d2a00",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nameAlt}
        </span>
      </div>
      {/* 牌面名言 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "100%",
          width: "100%",
          textAlign: "center",
          fontSize: 10,
          lineHeight: 1.5,
          color: "#3d2a00",
          minHeight: 30,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {line}
      </div>
      {/* 稀有度徽标 */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          padding: "1px 8px",
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: "#fff",
          background: "linear-gradient(135deg, #fff3c4, #d4a017)",
        }}
      >
        {t("pl.rarity.myth")} · +∞
      </span>
      {/* 进度：满级即已解锁，恒为 100% */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,.3)",
            border: "1px solid rgba(255,255,255,.4)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #fff3c4, #d4a017)" }} />
        </div>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.95)", fontWeight: 700, whiteSpace: "nowrap" }}>
          100%
        </span>
      </div>
      <span style={{ fontSize: 9, color: "#7a5a10", lineHeight: 1.4, zIndex: 1, textAlign: "center" }}>
        {t("pl.achievements.hiddenCardHint")}
      </span>
    </li>
  );
}

/** 待解锁占位卡：无对应成就的塔罗牌仅展示牌面信息，隐藏一切成就信息（灰色虚影花边）。 */
function TarotSlotCard({ no, t, TONE, lang }: { no: number; t: PLT; TONE: ThemeTone; lang: "zh" | "en" }): ReactNode {
  const deck: { name: { zh: string; en: string }; line: { zh: string; en: string } } = TAROT_ARCANA[no];
  const L: "zh" | "en" = lang === "en" ? "en" : "zh";
  const name = deck.name[L];
  const nameAlt = deck.name[L === "en" ? "zh" : "en"];
  const line = deck.line[L];
  return (
    <li
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.45,
        padding: "14px 8px 9px",
        borderRadius: 12,
        background: TONE.panel,
        border: "1px dashed rgba(154,163,178,.62)",
        boxShadow: "0 0 0 1px rgba(154,163,178,.28)",
        opacity: 0.8,
      }}
    >
      {/* 内框花边 */}
      <div
        style={{
          position: "absolute",
          inset: 5,
          borderRadius: 10,
          border: "1px solid rgba(154,163,178,.4)",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />
      {/* 四角灰菱花 */}
      {([{ top: 2, left: 2 }, { top: 2, right: 2 }, { bottom: 2, left: 2 }, { bottom: 2, right: 2 }] as const).map((pos, i) => (
        <div key={i} style={{ position: "absolute", width: 10, height: 10, zIndex: 1, transform: "rotate(45deg)", borderRadius: 1.5, border: "1px solid rgba(154,163,178,.85)", ...pos }} />
      ))}
      {/* 顶部占位序标 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "1px 9px",
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: "#fff",
          background: TONE.border,
        }}
      >
        ?
      </div>
      {/* 中央象征（灰虚影） */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 78,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <TarotArcana no={no} achieved={false} color="#64748b" />
      </div>
      {/* 牌名 + 另一语种小字 */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontWeight: 800, color: TONE.quiet, fontSize: 13.5, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
          {name}
        </span>
        <span style={{ color: TONE.quiet, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" as const, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
          {nameAlt}
        </span>
      </div>
      {/* 牌面名言 */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", color: TONE.quiet, fontSize: 10.5, textAlign: "center", lineHeight: 1.55, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", minHeight: 32 }}>
        {line}
      </div>
      {/* 待解锁标签 */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 2, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: TONE.quiet, padding: "1px 8px", borderRadius: 999, border: `1px dashed ${TONE.border}` }}>
        {t("pl.achievements.lockedHint")}
      </div>
    </li>
  );
}

/** 居中遮罩成就弹窗（QQ 风格：等级圆环 + 奖牌墙）。 */
export function AchievementModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  // 区块小标题样式（跟随当前主题）
  const sectionTitleStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: TONE.text,
    marginBottom: 8,
  };
  // 打开时拉取游戏化快照；传入语言，host 返回对应语言的等级与成就
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  // 取出界面语言：优先宿主真实界面语言（<html lang>），回退浏览器语言。
  // 与词库助手其余双语内容保持一致，避免界面英文但系统中文时误判为 zh。
  const lang = useMemo<"zh" | "en">(() => {
    const raw = (
      document.documentElement.lang ||
      navigator.language ||
      navigator.languages?.[0] ||
      ""
    ).toLowerCase();
    return raw.startsWith("en") ? "en" : "zh";
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setStatus(null);
    getAssistantStatus(lang)
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        /* 拉取失败保持 null，展示加载/空状态 */
      });
    return () => {
      alive = false;
    };
  }, [open, lang]);

  const level = status?.level;
  const achievements = status?.achievements ?? [];
  const achievedCount = achievements.filter((a) => a.achieved).length;
  const summary = status?.achievementSummary;
  // 是否已满级（词库宗师）：满级才展示隐藏彩蛋卡「库之尽头」
  const isMaster = !!(level && level.level >= MAX_LEVEL);
  const overallPct = summary && summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0;

  // 近期待解锁：未解锁成就按完成度降序，固定展示前 3 张（填满 3 列网格）
  const upNext = useMemo(() => {
    return achievements
      .filter((a) => !a.achieved && a.target > 0)
      .sort((x, y) => y.progress / y.target - x.progress / x.target)
      .slice(0, 3);
  }, [achievements]);

  // 成就稀有度筛选（all = 全部）
  const [filter, setFilter] = useState<"all" | AssistantAchievement["rarity"]>("all");
  // 等级详情展开状态（各等级门槛 + 积分来路）
  const [showLevels, setShowLevels] = useState(false);
  const RARITIES: AssistantAchievement["rarity"][] = ["common", "rare", "epic", "legendary", "myth"];

  // 构建「成就 ↔ 塔罗牌」完整牌组：每张塔罗牌至多挂一个成就，其余为待解锁位
  const { cardToAch, achToCard } = useMemo(() => buildDeck(achievements), [achievements]);

  // 各稀有度的收集完成度统计（以完整塔罗牌组为基数：total = 该稀有度牌数）
  const rarityStats = useMemo(
    () =>
      RARITIES.map((r) => {
        const cards = TAROT_BY_RARITY[r] ?? [];
        return {
          rarity: r,
          total: cards.length,
          unlocked: cards.filter((c) => cardToAch[c]?.achieved).length,
        };
      }),
    [cardToAch],
  );

  // 按当前稀有度筛出的塔罗牌墙：all = 全部 78 张；单档 = 该稀有度牌组
  const wallCards = useMemo<number[]>(() => {
    if (filter === "all") return Array.from({ length: TAROT_ARCANA.length }, (_, i) => i);
    return TAROT_BY_RARITY[filter] ?? [];
  }, [filter]);
  const wallUnlocked = useMemo(
    () => wallCards.filter((c) => cardToAch[c]?.achieved).length,
    [wallCards, cardToAch],
  );

  // 关闭时不渲染弹窗。注意：该提前返回必须位于所有 hooks 之后，避免渲染期间 hook 数量变化（React #310）
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.achievements.title")}
      className={PL_DIALOG_OVERLAY}
      onClick={(e) => {
        // 点击蒙层（空白处）关闭；点击对话框内部不关闭
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        className={PL_DIALOG}
        style={{
          width: 800,
          height: 800,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "calc(100vh - 40px)",
        }}
      >
        {/* 标题行 + 右上角关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, color: TONE.text, display: "flex", alignItems: "center", gap: 7 }}>
            <BookIcon color={TONE.accent} size={15} />
            <span>{t("pl.achievements.title")}</span>
          </strong>
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>

        {/* 说明 */}
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: TONE.quiet,
            background: TONE.accentSoft,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            padding: "7px 10px",
            flexShrink: 0,
          }}
        >
          {t("pl.achievements.desc")}
        </div>

        {/* 内容区：与人格管理一致的两栏布局，左右两栏各自独立滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 14,
            marginTop: 10,
          }}
        >
          {/* 左栏：成长档案（独立滚动） */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              overflowY: "auto",
            }}
          >
            {/* 顶部标题：内容向上滚动时悬浮固定（与人格管理一致） */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 10px 8px",
                background: TONE.row,
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
                  {t("pl.achievements.colOverview")}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 10px 14px" }}>
          {/* 成长称号总览：称号 + 达成数 + 成就点 + 总进度 */}
          {summary && (
            <section
              style={{
                background: TONE.row,
                border: `1px solid ${TONE.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* 称号徽标 */}
                <div
                  style={{
                    flexShrink: 0,
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#fff",
                    background:
                      summary.rankKey === "legend"
                        ? "linear-gradient(135deg, #fde68a, #d97706)"
                        : summary.rankKey === "star"
                          ? "linear-gradient(135deg, #c4b5fd, #7c3aed)"
                          : summary.rankKey === "collector"
                            ? "linear-gradient(135deg, #93c5fd, #2563eb)"
                            : summary.rankKey === "explorer"
                              ? "linear-gradient(135deg, #6ee7b7, #059669)"
                              : "linear-gradient(135deg, #cbd5e1, #64748b)",
                  }}
                >
                  {summary.rank}
                </div>
                <span style={{ flex: 1 }} />
                {/* 达成数与成就点 */}
                <span style={{ fontSize: 12, color: TONE.quiet, fontWeight: 500 }}>
                  {t("pl.achievements.collected").replace("{n}", String(summary.unlocked))} · {summary.unlocked} /{" "}
                  {summary.total}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: summary.earnedPoints > 0 ? "#d97706" : TONE.quiet,
                  }}
                >
                  {t("pl.achievements.points")} {summary.earnedPoints} / {summary.maxPoints}
                </span>
              </div>
              {/* 总收集进度条 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 5,
                    background: TONE.panel,
                    border: `1px solid ${TONE.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${overallPct}%`,
                      height: "100%",
                      borderRadius: 5,
                      background:
                        overallPct >= 100
                          ? "linear-gradient(90deg, #fde68a, #f59e0b)"
                          : "linear-gradient(90deg, #93c5fd, #8b5cf6, #f59e0b)",
                      transition: "width .4s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {overallPct}%
                </span>
              </div>
            </section>
          )}

          {/* 等级区块：QQ 风格圆形徽章 + 升级进度 + 回落提示 */}
          <section>
            <div style={sectionTitleStyle}>{t("pl.achievements.levelLabel")}</div>
            {!level ? (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE.quiet,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  padding: "9px 11px",
                  fontStyle: "italic",
                }}
              >
                {t("pl.achievements.loading")}
              </div>
            ) : (
              <div
                style={{
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <LevelRing level={level} TONE={TONE} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 升级进度条 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 7,
                        borderRadius: 4,
                        background: TONE.panel,
                        border: `1px solid ${TONE.border}`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${level.pct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${levelColor(level.level)}, ${TONE.accent})`,
                          borderRadius: 4,
                          transition: "width .3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11.5, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {level.pct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: TONE.quiet }}>
                    {level.next > level.current
                      ? t("pl.gamification.progress").replace("{n}", String(level.next - level.current))
                      : t("pl.gamification.maxed")}
                  </div>
                  {/* 等级回落提示：长期未使用触发时展示 */}
                  {level.decayed && level.inactiveDays !== undefined && (
                    <div style={{ fontSize: 11.5, color: TONE.red, fontWeight: 500 }}>
                      {t("pl.achievements.decayed").replace("{days}", String(level.inactiveDays))}
                    </div>
                  )}
                  {/* 距上一档的衰减警示：已衰减且非初始档时，提示距再回落还有多少积分空间 */}
                  {level.decayed && level.level > 1 && level.dropGap !== undefined && level.prevTitle && (
                    <div style={{ fontSize: 11.5, color: TONE.red, fontWeight: 500 }}>
                      {t("pl.achievements.dropGap")
                        .replace("{prev}", level.prevTitle)
                        .replace("{n}", String(level.dropGap))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* 等级详情（可展开）：各等级所需积分 + 积分获取来路 + 衰减规则 */}
            {level && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLevels((v) => !v);
                  }}
                  style={{
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    color: contrastFg(TONE.row),
                    height: 28,
                    borderRadius: 14,
                    padding: "0 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background .24s ease",
                  }}
                >
                  {showLevels ? t("pl.achievements.levelDetailHide") : t("pl.achievements.levelDetail")}
                </button>
                {showLevels && status && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 9,
                      background: TONE.row,
                      border: `1px solid ${TONE.border}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: TONE.text }}>
                      {t("pl.achievements.levelThresholds")}
                    </div>
                    {status.levelRules.map((r, idx) => {
                      const cur = r.level === status.level.level;
                      const reached = r.level <= status.level.level;
                      const maxT = status.levelRules.length
                        ? status.levelRules[status.levelRules.length - 1].threshold
                        : 1;
                      const span = maxT > 0 ? Math.max(4, Math.min(100, (r.threshold / maxT) * 100)) : 100;
                      const g = LEVEL_GRAD[r.level] ?? LEVEL_GRAD[1];
                      return (
                        <div
                          key={r.level}
                          className={cur ? "pl-lv-row pl-lv-cur" : "pl-lv-row"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11.5,
                            padding: "5px 7px",
                            borderRadius: 8,
                            background: cur
                              ? `color-mix(in srgb, ${g.from} 16%, transparent)`
                              : "transparent",
                            fontWeight: cur ? 700 : 500,
                            color: TONE.text,
                          }}
                        >
                          {/* 等级徽章：专属渐变 + 当前级脉冲光环 */}
                          <span
                            className={cur ? "pl-lv-cur" : undefined}
                            style={{
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
                              ["--pl-lv-glow" as string]: g.glow,
                            }}
                          >
                            LV{r.level}
                          </span>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {lang === "en" ? r.en : r.zh}
                              </span>
                              <span style={{ color: cur ? g.to : g.from, fontWeight: cur ? 700 : 600, flexShrink: 0 }}>
                                {t("pl.achievements.levelNeed").replace("{n}", String(r.threshold))}
                              </span>
                            </div>
                            {/* 等级对比条：按积分跨度生长填充，已点亮用等级色流光，未达为暗槽 */}
                            <div
                              style={{
                                height: 4,
                                borderRadius: 999,
                                background: "rgba(154,163,178,.2)",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <div
                                className="pl-lv-fill"
                                style={{
                                  width: `${span}%`,
                                  height: "100%",
                                  borderRadius: 999,
                                  background: reached
                                    ? `linear-gradient(90deg, ${g.from}, ${g.to})`
                                    : "rgba(154,163,178,.35)",
                                  boxShadow: reached ? `0 0 6px ${g.glow}` : "none",
                                  animationDelay: `${idx * 0.12}s`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {status.pointSources.length > 0 && (
                      <>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: TONE.text, marginTop: 4 }}>
                          {t("pl.achievements.pointSources")}
                        </div>
                        {status.pointSources.map((p) => (
                          <div
                            key={p.kind}
                            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, padding: "2px 6px" }}
                          >
                            <span style={{ flex: 1, color: TONE.text }}>{lang === "en" ? p.en : p.zh}</span>
                            <span style={{ color: "#059669", fontWeight: 700 }}>+{p.points}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: TONE.text, marginTop: 4 }}>
                      {t("pl.achievements.decayRule")}
                    </div>
                    <div style={{ fontSize: 11.5, color: TONE.quiet, lineHeight: 1.6 }}>{status.decayRule}</div>
                  </div>
                )}
              </div>
            )}
            {/* 等级激励提示（彩蛋式）：未满级以神秘语气激励升级，满级告知尘封惊喜已苏醒 */}
            {level && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: "9px 11px",
                  borderRadius: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: TONE.row,
                  border: "1px solid transparent",
                  borderColor:
                    level.next > level.current
                      ? TONE.accent
                      : "var(--dsw-alias-state-success-primary, #78dda0)",
                  color:
                    level.next > level.current
                      ? TONE.accent
                      : "var(--dsw-alias-state-success-primary, #78dda0)",
                  fontWeight: 600,
                }}
              >
                {level.next > level.current
                  ? t("pl.achievements.unlockAssistant")
                  : t("pl.achievements.unlockAssistantDone")}
              </div>
            )}
          </section>

            {/* 近期待解锁：进度最高的未解锁成就，增强目标感 */}
            {status && upNext.length > 0 && (
              <section>
                <div style={{ ...sectionTitleStyle, display: "flex", alignItems: "center" }}>
                  <span style={{ flex: 1 }}>{t("pl.achievements.upNext")}</span>
                  <span style={{ fontSize: 11, color: TONE.quiet, fontWeight: 500 }}>
                    {t("pl.achievements.collected").replace("{n}", String(achievedCount))} · {achievedCount} /{" "}
                    {achievements.length}
                  </span>
                </div>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {upNext.map((a) => (
                    <AchievementCard
                      key={a.id}
                      achievement={a}
                      cardNo={achToCard[a.id] ?? 0}
                      t={t}
                      TONE={TONE}
                      lang={lang}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
          </div>

          {/* 右栏：成就牌组（独立滚动，隐藏横向滚动条） */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              overflowX: "hidden",
              overflowY: "auto",
            }}
          >
            {/* 顶部标题：内容向上滚动时悬浮固定（与人格管理一致） */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 10px 8px",
                background: TONE.row,
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
                  {t("pl.achievements.colDeck")}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 10px 14px" }}>

          {/* 塔罗牌成就墙：标题行含解锁计数 — 全部 78 张都展示，大阿卡纳全覆盖 */}
          <section>
            <div style={{ ...sectionTitleStyle, display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1 }}>{t("pl.achievements.title")}</span>
              <span style={{ fontSize: 11, color: TONE.quiet, fontWeight: 500 }}>
                {t("pl.achievements.count")
                  .replace("{n}", String(wallUnlocked))
                  .replace("{total}", String(wallCards.length))}
              </span>
            </div>
            {/* 按稀有度分组的收集完成度统计条 */}
            {rarityStats.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  margin: "2px 0 10px",
                  padding: "10px 11px",
                  borderRadius: 9,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                }}
              >
                {rarityStats.map((s) => {
                  const c = RARITY_COLORS[s.rarity] ?? RARITY_COLORS.common;
                  const p = s.total > 0 ? Math.round((s.unlocked / s.total) * 100) : 0;
                  return (
                    <div key={s.rarity} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                      <span style={{ width: 44, flexShrink: 0, color: c.text, fontWeight: 600 }}>
                        {rarityLabel(s.rarity, t)}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: TONE.panel,
                          border: `1px solid ${TONE.border}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${c.base}, ${c.high})`,
                            transition: "width .3s ease",
                          }}
                        />
                      </div>
                      <span style={{ flexShrink: 0, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {s.unlocked}/{s.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 稀有度筛选 tab */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 10px" }}>
              {(["all", ...RARITIES] as ("all" | AssistantAchievement["rarity"])[]).map((r) => {
                const active = filter === r;
                const c = r === "all" ? { deep: TONE.accent, border: TONE.border } : RARITY_COLORS[r] ?? RARITY_COLORS.common;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFilter(r)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${active ? c.deep : TONE.border}`,
                      // 前景色按背景真实亮度取反，避免自定义黑夜皮肤把 brand/bg 覆盖成白色导致「白底白字」
                      color: active ? contrastFg(c.deep) : contrastFg(TONE.row),
                      background: active ? c.deep : TONE.row,
                      transition: "background .16s ease, color .16s ease, border-color .16s ease",
                    }}
                  >
                    {r === "all" ? t("pl.achievements.all") : rarityLabel(r, t)}
                  </button>
                );
              })}
            </div>
            {!status ? (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE.quiet,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  padding: "9px 11px",
                  fontStyle: "italic",
                }}
              >
                {t("pl.achievements.loading")}
              </div>
            ) : wallCards.length === 0 ? (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE.quiet,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  padding: "9px 11px",
                }}
              >
                {t("pl.achievements.empty")}
              </div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {/* 满级隐藏彩蛋卡：词库宗师在「全部/神话」视图下额外展示，超越 78 张的私藏 */}
                {isMaster && (filter === "all" || filter === "myth") && (
                  <HiddenMasterCard t={t} lang={lang} />
                )}
                {wallCards.map((card) => {
                  const a = cardToAch[card];
                  return a ? (
                    <AchievementCard key={card} achievement={a} cardNo={card} t={t} TONE={TONE} lang={lang} />
                  ) : (
                    <TarotSlotCard key={card} no={card} t={t} TONE={TONE} lang={lang} />
                  );
                })}
              </ul>
            )}
          </section>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

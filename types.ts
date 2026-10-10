
export enum GameStatus {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  CHARACTER_DETAIL = 'CHARACTER_DETAIL'
}

export type QuestionType = '語譯' | '背誦' | '內容' | '作法';

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  answer: string; // 原始答案字串 (包含 /)
  answers: string[]; // 分解後的正確答案列表（只含學生要輸入的部分，不含預填）
  /** 預填格（鎖定、不可點選或清除），例如 ['以', '…']；沒有則為空陣列或缺省 */
  prefill?: string[];
  options: string[];
}

export interface UserInputSlot {
  char: string;
  originIndex: number | null;
  /** 預填格：鎖定，不能點選、清除 */
  locked?: boolean;
}

/**
 * Boss 攻擊演出類型（每位 Boss 於 data/levels.ts 個別設定，未設定者沿用舊演出）
 * - 'swingSlash'   ：立繪前後衝撞兩次＋兩道交叉斬線（預設，兩段命中）
 * - 'chariotCharge'：孔子戰車衝鋒（一段命中、背景不變暗）
 * - 'flyingSword'  ：武器圖層（劍＋火焰）離手化為飛劍刺向玩家、命中後飛回手中（一段命中）
 * - 'xSlash'       ：武器圖層飛到玩家區，先左上→右下、再右上→左下連斬兩刀，兩道火光斬痕交成 X 後命中（一段命中），劍飛回手中
 */
export type BossAttackStyle = 'swingSlash' | 'chariotCharge' | 'flyingSword' | 'xSlash';

/** 'flyingSword' / 'xSlash' 共用的分層武器素材與幾何資料（全部以全幅圖層的像素座標表示） */
export interface WeaponLayerConfig {
  /** 不含武器的角色圖層（全幅，與 effectImg 像素對齊） */
  characterImg: string;
  /** 會飛出的武器圖層（劍＋半透明火焰，全幅，置於角色圖層之下） */
  effectImg: string;
  /** 全幅圖層尺寸 */
  frameW: number;
  frameH: number;
  /** 戰鬥立繪（liu_zong_yuan_battle.png 等）在全幅圖層中的裁切範圍，用以把圖層疊回與戰鬥立繪完全相同的位置 */
  crop: { x: number; y: number; w: number; h: number };
  /** 飛劍的旋轉／縮放中心（劍柄握持點） */
  pivot: { x: number; y: number };
  /** 靜止時劍尖指向的角度（度；0 = 向右，順時針為正，與 CSS rotate 同向） */
  tipAngle: number;
  /** 旋轉中心到劍尖的距離（全幅 px），用來讓劍尖剛好刺中衝擊點 */
  bladeLength: number;
}
/** @deprecated 舊名，等同 WeaponLayerConfig */
export type FlyingSwordAttackConfig = WeaponLayerConfig;

export interface LevelConfig {
  id: number;
  title: string;
  subTitle: string;
  sheetIds: number[];
  bossName: string;
  bossImg: string;
  bgImg: string;
  startSpeech?: string;
  victorySpeech?: string;
  defeatSpeech?: string;
  hpThresholds?: { [key: number]: string };
  locked?: boolean;
  /** 主頁英雄區名句：須逐字摘自 DSE 指定篇章原文（教育局《指定文言經典學習材料原文（十二篇）》），不含外層「」；缺省則不顯示 */
  quote?: string;
  /** 戰鬥畫面專用立繪（缺省用 bossImg）；版面錨點見 data/battleLayout.ts */
  battleImg?: string;
  /** Boss 攻擊演出；缺省時：孔子（id 6）為 'chariotCharge'，其餘為 'swingSlash' */
  attackStyle?: BossAttackStyle;
  /** attackStyle 為 'flyingSword' 或 'xSlash' 時必填 */
  weaponLayers?: WeaponLayerConfig;
}

/** 需要分層武器素材的攻擊類型 */
export const isWeaponAttackStyle = (s: BossAttackStyle): s is 'flyingSword' | 'xSlash' => s === 'flyingSword' || s === 'xSlash';

/** 取得關卡的 Boss 攻擊演出（保留舊有行為作為預設） */
export const getBossAttackStyle = (level: Pick<LevelConfig, 'id' | 'attackStyle' | 'weaponLayers'> | null | undefined): BossAttackStyle => {
  if (!level) return 'swingSlash';
  if (level.attackStyle && isWeaponAttackStyle(level.attackStyle) && !level.weaponLayers) return 'swingSlash';
  if (level.attackStyle) return level.attackStyle;
  return level.id === 6 ? 'chariotCharge' : 'swingSlash';
};

/** 飛劍演出時間軸（毫秒，速度倍率 1x 時）；App 的命中／扣血時機與 BattleArea 的 CSS 動畫共用此表 */
export const FLYING_SWORD_TIMING = {
  /** 蓄勢：劍離手、後拉、轉向瞄準 */
  anticipation: 220,
  /** 命中（扣血、震屏、閃光）的時間點 */
  impact: 520,
  /** 劍拔出、開始飛回的時間點 */
  recall: 660,
  /** 劍回到手中、演出結束 */
  total: 1100,
} as const;

/**
 * 飛劍穿梭 X 斬時間軸（毫秒，速度倍率 1x 時）；App 的命中／扣血時機與 BattleArea / swordWeave 的 rAF 動畫共用此表。
 * keys 為 3D 曲線的關鍵點時間（曲線本身連續平滑，見 components/swordWeave.ts）。
 */
export const X_SLASH_TIMING = {
  keys: {
    rest: 0,
    /** 離手上提 */
    lift: 110,
    /** 從人物背後飛出畫面左上（最遠） */
    exit1: 250,
    /** 第一刀：左上 → 右下，刀身由舉起（柄下刀上）往前下方劈落約 150° */
    pass1Start: 360, pass1Mid: 470, pass1End: 580,
    /** 近鏡頭衝出右下，再於畫面外繞到右上（遠） */
    exit2: 690, loop: 790,
    /** 第二刀：右上 → 左下，同樣舉起後劈落 */
    pass2Start: 860, pass2Mid: 970,
    /** 第二刀劈完＝命中 */
    impact: 1080,
    /** 上揚弧線回程 */
    rise: 1190,
    total: 1380,
  },
  /** 刀圖水平鏡像的開／關（讓刀刃朝向下劈方向）：都在劍飛出畫面的最遠點切換 */
  mirrorOn: 250, mirrorOff: 790,
  /** 命中（第二刀劈完：扣血、震屏、閃光） */
  impact: 1080,
  /** 劍回到手中、演出結束 */
  total: 1380,
} as const;

/** 分層武器攻擊的命中時間與總長（ms，1x） */
export const weaponAttackTiming = (s: 'flyingSword' | 'xSlash') => (s === 'xSlash' ? X_SLASH_TIMING : FLYING_SWORD_TIMING);

export interface GameState {
  playerHp: number;
  maxPlayerHp: number;
  enemyHp: number;
  maxEnemyHp: number;
  currentQuestionIndex: number;
  timer: number;
  isTurnActive: boolean;
  status: GameStatus;
  userInput: UserInputSlot[];
  usedIndices: Set<number>;
  isPaused: boolean;
}


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
  answers: string[]; // 分解後的正確答案列表
  options: string[];
}

export interface UserInputSlot {
  char: string;
  originIndex: number | null;
}

/**
 * Boss 攻擊演出類型（每位 Boss 於 data/levels.ts 個別設定，未設定者沿用舊演出）
 * - 'swingSlash'   ：立繪前後衝撞兩次＋兩道交叉斬線（預設，兩段命中）
 * - 'chariotCharge'：孔子戰車衝鋒（一段命中、背景不變暗）
 * - 'flyingSword'  ：武器圖層（劍＋火焰）離手化為飛劍刺向玩家、命中後飛回手中（一段命中）
 */
export type BossAttackStyle = 'swingSlash' | 'chariotCharge' | 'flyingSword';

/** 'flyingSword' 所需的分層素材與幾何資料（全部以全幅圖層的像素座標表示） */
export interface FlyingSwordAttackConfig {
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
  /** Boss 攻擊演出；缺省時：孔子（id 6）為 'chariotCharge'，其餘為 'swingSlash' */
  attackStyle?: BossAttackStyle;
  /** attackStyle 為 'flyingSword' 時必填 */
  flyingSword?: FlyingSwordAttackConfig;
}

/** 取得關卡的 Boss 攻擊演出（保留舊有行為作為預設） */
export const getBossAttackStyle = (level: Pick<LevelConfig, 'id' | 'attackStyle' | 'flyingSword'> | null | undefined): BossAttackStyle => {
  if (!level) return 'swingSlash';
  if (level.attackStyle === 'flyingSword' && !level.flyingSword) return 'swingSlash';
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
  totalDamage: number;
}

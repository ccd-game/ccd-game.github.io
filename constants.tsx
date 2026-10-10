


/** 玩家最大 HP */
export const MAX_HP = 1000;
/** 每回合作答時限（秒）；時間到視同答錯 */
export const TURN_TIME = 30;

// ── 戰鬥規則（老師設定） ─────────────────────────────
/** 每位 Boss 的 HP（所有關卡相同）；HP 歸 0 即勝 */
export const BOSS_MAX_HP = 1000;
/** 每答對一題的基本傷害；實際傷害＝round(基本傷害 × 速度倍率)，見 src/lib/battleRules.ts */
export const CORRECT_ANSWER_DAMAGE = 100;
/** 每答錯一題或超時，玩家損失的 HP（舊版為 1000，即一擊即敗） */
export const WRONG_ANSWER_DAMAGE = 100;
/** Boss HP 百分比門檻台詞（由高至低；每場戰鬥每個門檻只說一次） */
export const BOSS_HP_SPEECH_THRESHOLDS = [80, 60, 40, 20, 0] as const;
/**
 * 題目用盡而 Boss HP 仍大於 0 時的處理：
 * - 'defeat' ：判為戰敗（播放戰敗台詞及戰敗畫面）← 老師已決定
 * - 'loop'   ：由第一題重新開始
 * - 'victory'：直接勝出（即舊版「答完所有題目即勝」的做法）
 * 註：答錯／超時會重答同一題，不會消耗題目；只有答對才會換下一題。
 */
export type QuestionsExhaustedPolicy = 'loop' | 'victory' | 'defeat';
export const QUESTIONS_EXHAUSTED_POLICY: QuestionsExhaustedPolicy = 'defeat';

export const UI_STATIC_TEXT = {
  LOADING: { title: "文言地城", sub: "感應雲端中...", startBtn: "深入不毛", cancelBtn: "驀然回首" },
  PAUSE: { quote: "夫戰，勇氣也。\n一鼓作氣，再而衰，三而竭。\n《曹劌論戰》", resume: "學不可已", quit: "驀然回首" },
  QUIT_CONFIRM: { title: "中止修煉？", keep: "鍥而不舍", leave: "鍥而舍之" },
  WARNING: { timer: "時間將盡！", lowHp: "命懸一線！" }
};

export const ANIMATION_CONFIG = {
  INTRO: {
    GOLD_LINE: 0,
    BG_FADE: 300,
    BOSS_SPRITE: 750,
    BOSS_NAME: 1000,
    ENEMY_HP: 1150,
    PLAYER_HP: 1300,
    INPUT_PAD: 1500, 
    READY_START: 2000
  },
  TURN_START: {
    ANNOUNCE_IN: 0,
    ANNOUNCE_OUT: 1500,
    INPUT_PAD_SHOW: 2400,
    QUESTION_SHOW: 3600,
    SLOTS_DROP: 4500
  },
  ATTACK: {
    DIM_INPUT: 0,
    ANIM_START: 500,  
    SLASH_LINE: 1140, 
    SCREEN_HIT: 1780, 
    RECOVER: 2600    
  }
};

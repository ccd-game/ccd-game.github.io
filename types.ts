
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
}

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

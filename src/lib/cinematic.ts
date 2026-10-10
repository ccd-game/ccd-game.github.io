/**
 * 「演出中」狀態（isCinematicActive）：載入動畫、Boss 台詞、Boss 受擊動畫進行時為 true。
 *
 * 演出中暫停所有 idle 飛劍動畫（主頁 .home-saber*、圖鑑 .codex-saber*、戰鬥 .btl-saber*），
 * 演出結束才繼續。做法是在 <html> 加上 data-cinematic="1"，由 src/index.css 的一條規則把
 * animation-play-state 設為 paused —— 不卸載元素、不改 BattleArea 版面，繼續時由原位置接續，沒有跳格。
 */
import { useEffect } from 'react';

export interface CinematicInputs {
  /** 開機載入遮罩（BootLoadingMask） */
  isBooting: boolean;
  /** 入陣準備畫面正在讀取題庫（LoadingScreen 的載入動畫） */
  isQuestionsFetching: boolean;
  /** 戰鬥開場動畫（introStage 由 starting 至 ready，尚未進入 playing） */
  isBattleIntro: boolean;
  /** Boss 台詞顯示中（開場、門檻、勝利、戰敗台詞） */
  isBossSpeaking: boolean;
  /** Boss 受擊動畫（enemyAnim === 'hurt'） */
  isBossHitReaction: boolean;
}

/** 任何一項演出進行中即為 true */
export function deriveCinematicActive(i: CinematicInputs): boolean {
  return i.isBooting || i.isQuestionsFetching || i.isBattleIntro || i.isBossSpeaking || i.isBossHitReaction;
}

/** 戰鬥開場動畫的 introStage（'none' 為未開始，'playing' 為開場完畢） */
export function isBattleIntroStage(introStage: string): boolean {
  return introStage !== 'none' && introStage !== 'playing';
}

/** <html> 上的屬性名；index.css 以 html[data-cinematic="1"] 暫停 idle 飛劍 */
export const CINEMATIC_ATTRIBUTE = 'data-cinematic';

/** 把 isCinematicActive 同步到 <html data-cinematic>（卸載時移除） */
export function useCinematicAttribute(active: boolean, root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  useEffect(() => {
    if (!root) return;
    root.setAttribute(CINEMATIC_ATTRIBUTE, active ? '1' : '0');
  }, [active, root]);
  useEffect(() => () => { root?.removeAttribute(CINEMATIC_ATTRIBUTE); }, [root]);
}

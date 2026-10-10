/**
 * React 接線：把 BattleRecorder 接到 App 的戰鬥狀態。
 * - 暫停／回合／自動作答改變 → sync()
 * - status 變成 VICTORY → takeVictoryClear() → onClear()（只在 VICTORY 記錄）
 * - status 變成 GAME_OVER 或 MENU → abandon()（戰敗或退出不記錄）
 */
import { useEffect, useRef, useState } from 'react';
import { GameStatus } from '../../types';
import { BattleRecorder, VictoryClear } from './battleRecorder';

export function useBattleRecorder(
  state: { status: GameStatus; isPaused: boolean; isTurnActive: boolean; isAutoPlaying: boolean; isBossSpeaking: boolean },
  onClear: (clear: VictoryClear) => void,
): BattleRecorder {
  const [recorder] = useState(() => new BattleRecorder());
  const onClearRef = useRef(onClear);
  useEffect(() => {
    onClearRef.current = onClear;
  }, [onClear]);

  const { status, isPaused, isTurnActive, isAutoPlaying, isBossSpeaking } = state;
  useEffect(() => {
    recorder.sync({ isPaused, isTurnActive, isAutoPlaying, isBossSpeaking });
  }, [recorder, isPaused, isTurnActive, isAutoPlaying, isBossSpeaking]);

  useEffect(() => {
    if (status === GameStatus.VICTORY) {
      const clear = recorder.takeVictoryClear();
      if (clear) onClearRef.current(clear);
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.MENU) {
      recorder.abandon();
    }
  }, [recorder, status]);

  return recorder;
}

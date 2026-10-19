import { describe, expect, it } from 'vitest';
import { BattleClock } from './battleClock';
import { BattleRecorder } from './battleRecorder';

const setup = () => {
  let t = 0;
  const recorder = new BattleRecorder(new BattleClock(() => t));
  const idle = { isPaused: false, isTurnActive: false, isAutoPlaying: false };
  return { recorder, advance: (ms: number) => { t += ms; }, idle };
};

describe('BattleRecorder：只在 VICTORY 記錄', () => {
  it('正常勝利：由開始計時到最後一擊；之後的勝利演出不計；答對題數正確', () => {
    const { recorder, advance, idle } = setup();
    recorder.begin(2, true);
    advance(5000); // 開場演出（不計）
    recorder.startClock();
    advance(60_000);
    for (let i = 0; i < 20; i++) recorder.noteCorrectAnswer();
    recorder.markVictoryDecided();
    advance(3000); // 勝利台詞（不計）
    recorder.sync(idle);
    expect(recorder.takeVictoryClear()).toEqual({ levelId: 2, timeMs: 60_000, correctAnswers: 20 });
    expect(recorder.takeVictoryClear()).toBeNull(); // 只取出一次
  });
  it('暫停：只扣除「已暫停且正在作答回合」的時間（與回合倒數計時器相同）', () => {
    const { recorder, advance, idle } = setup();
    recorder.begin(1, true);
    recorder.startClock();
    advance(1000);
    // 演出期間暫停：動畫仍播放，照常計時
    recorder.sync({ ...idle, isPaused: true });
    advance(2000);
    // 下一回合開始時仍在暫停 → 凍結
    recorder.sync({ ...idle, isPaused: true, isTurnActive: true });
    advance(30_000);
    recorder.sync({ ...idle, isPaused: false, isTurnActive: true });
    advance(4000);
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()?.timeMs).toBe(7000);
  });
  it('戰敗不記錄（abandon）', () => {
    const { recorder, advance } = setup();
    recorder.begin(1, true);
    recorder.startClock();
    advance(50_000);
    recorder.noteCorrectAnswer();
    recorder.abandon();
    expect(recorder.takeVictoryClear()).toBeNull();
  });
  it('測試模式不記錄', () => {
    const { recorder, advance } = setup();
    recorder.begin(1, false);
    recorder.startClock();
    advance(50_000);
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toBeNull();
  });
  it('本場曾開啟自動作答（即使之後關閉）仍入帳', () => {
    const { recorder, advance, idle } = setup();
    recorder.begin(1, true);
    recorder.startClock();
    recorder.sync({ ...idle, isAutoPlaying: true });
    advance(1000);
    recorder.sync(idle);
    advance(50_000);
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toEqual({ levelId: 1, timeMs: 51_000, correctAnswers: 0 });
  });
  it('AUTO 開啟中標勝利亦入帳（eligible 不因 isAutoPlaying 作廢）', () => {
    const { recorder, advance, idle } = setup();
    recorder.begin(2, true);
    recorder.startClock();
    recorder.sync({ ...idle, isAutoPlaying: true });
    advance(60_000);
    recorder.noteCorrectAnswer();
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toEqual({ levelId: 2, timeMs: 60_000, correctAnswers: 1 });
  });
  it('未經最後一擊而進入 VICTORY（調試 WIN）不記錄', () => {
    const { recorder, advance } = setup();
    recorder.begin(1, true);
    recorder.startClock();
    advance(50_000);
    expect(recorder.takeVictoryClear()).toBeNull();
  });
  it('未開始計時就宣告勝利不記錄；未 begin 的操作無效', () => {
    const { recorder } = setup();
    recorder.startClock();
    recorder.noteCorrectAnswer();
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toBeNull();
    recorder.begin(1, true);
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toBeNull();
  });
  it('新一場 begin() 會清除上一場', () => {
    const { recorder, advance } = setup();
    recorder.begin(1, true);
    recorder.startClock();
    advance(99_000);
    recorder.noteCorrectAnswer();
    recorder.begin(3, true);
    recorder.startClock();
    advance(61_000);
    recorder.markVictoryDecided();
    expect(recorder.takeVictoryClear()).toEqual({ levelId: 3, timeMs: 61_000, correctAnswers: 0 });
  });
  it('HP 歸零即勝：致勝一擊停止計時（題目未答完）；Boss 說話期間不計；勝利台詞不計', () => {
    const { recorder, advance, idle } = setup();
    recorder.begin(2, true);
    recorder.startClock();
    for (let hit = 0; hit < 4; hit++) {
      recorder.sync({ ...idle, isTurnActive: true });
      advance(2000); // 作答
      recorder.sync(idle);
      recorder.noteCorrectAnswer();
      advance(600); // 收合演出
      if (hit === 3) { recorder.markVictoryDecided(); break; }
      advance(1000); // 命中演出
      recorder.sync({ ...idle, isBossSpeaking: true });
      advance(2100); // 門檻台詞（不計）
      recorder.sync(idle);
      advance(350); // 出題演出
    }
    recorder.sync({ ...idle, isBossSpeaking: true });
    advance(5000); // 0% 及勝利台詞（已停止）
    expect(recorder.takeVictoryClear()).toEqual({ levelId: 2, timeMs: 4 * 2600 + 3 * 1350, correctAnswers: 4 });
  });
  it('isFrozen 條件', () => {
    expect(BattleRecorder.isFrozen({ isPaused: false, isTurnActive: false, isAutoPlaying: false, isBossSpeaking: true })).toBe(true);
    expect(BattleRecorder.isFrozen({ isPaused: true, isTurnActive: true, isAutoPlaying: false })).toBe(true);
    expect(BattleRecorder.isFrozen({ isPaused: true, isTurnActive: false, isAutoPlaying: false })).toBe(false);
    expect(BattleRecorder.isFrozen({ isPaused: false, isTurnActive: true, isAutoPlaying: false })).toBe(false);
  });
});

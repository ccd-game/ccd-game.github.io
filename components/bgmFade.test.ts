import { describe, expect, it } from 'vitest';
import { BGM_FADE_IN_MS, BGM_FADE_OUT_MS, FadeClock, TrackFader, applyUserVolumeWithSnap } from './bgmFade';

/** 可手動推進的假時鐘 */
function fakeClock() {
  let t = 0; let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: FadeClock = {
    now: () => t,
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { at: t + ms, fn }); return id; },
    clearTimeout: (id) => { timers.delete(id as number); },
  };
  const advance = (ms: number) => {
    const end = t + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void }] | null = null;
      for (const e of timers) if (e[1].at <= end && (!next || e[1].at < next[1].at)) next = e;
      if (!next) break;
      timers.delete(next[0]); t = next[1].at; next[1].fn();
    }
    t = end;
  };
  return { clock, advance, pending: () => timers.size };
}
const audio = () => ({ volume: 1, muted: false });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('淡入淡出常數', () => {
  it('淡出約 800 ms、淡入 600–800 ms', () => {
    expect(BGM_FADE_OUT_MS).toBe(800);
    expect(BGM_FADE_IN_MS).toBeGreaterThanOrEqual(600);
    expect(BGM_FADE_IN_MS).toBeLessThanOrEqual(800);
  });
});

describe('TrackFader', () => {
  it('淡出：音量逐步下降（不是一下跳到 0），800 ms 後為 0', async () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 0.6, clock);
    f.set(1);
    expect(el.volume).toBeCloseTo(0.6, 9);
    const done = f.fadeTo(0, BGM_FADE_OUT_MS);
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) { advance(20); samples.push(el.volume); }
    expect(await done).toBe(true);
    expect(el.volume).toBe(0);
    const mid = samples.filter((v) => v > 0 && v < 0.6);
    expect(mid.length).toBeGreaterThan(20);
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1e-12);
    // 400 ms 時約一半
    const f2 = new TrackFader(audio(), () => 1, clock); f2.set(1); f2.fadeTo(0, 800); advance(400);
    expect(f2.gain).toBeGreaterThan(0.45); expect(f2.gain).toBeLessThan(0.55);
  });

  it('淡入：由 0 升至使用者音量，永不超過', async () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 0.4, clock);
    f.set(0);
    const done = f.fadeTo(1, BGM_FADE_IN_MS);
    let max = 0;
    for (let i = 0; i < 60; i++) { advance(16); max = Math.max(max, el.volume); }
    expect(await done).toBe(true);
    expect(max).toBeLessThanOrEqual(0.4 + 1e-12);
    expect(el.volume).toBeCloseTo(0.4, 9);
  });

  it('淡變途中改變使用者音量：即時跟隨，仍不超過新設定', () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    let user = 1;
    const f = new TrackFader(el, () => user, clock);
    f.set(0); f.fadeTo(1, 800);
    advance(400);
    user = 0.2;
    advance(16);
    expect(el.volume).toBeLessThanOrEqual(0.2);
    advance(800);
    expect(el.volume).toBeCloseTo(0.2, 9);
  });

  it('使用者音量 0：一律 muted（v1.2.2），淡入亦不會解除', () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 0, clock);
    f.set(0); f.fadeTo(1, 700); advance(800);
    expect(el.muted).toBe(true);
    expect(el.volume).toBe(0);
  });

  it('使用者音量 > 0：淡出至 0 時不設 muted（只是音量 0）', () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 0.5, clock);
    f.set(1); f.fadeTo(0, 800); advance(900);
    expect(el.volume).toBe(0);
    expect(el.muted).toBe(false);
  });

  it('新的淡變取消進行中的淡變（不疊加），由目前 gain 起算', async () => {
    const { clock, advance, pending } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 1, clock);
    f.set(1);
    const first = f.fadeTo(0, 800);
    advance(400);
    const g = f.gain;
    const second = f.fadeTo(1, 800);
    expect(await first).toBe(false);
    advance(16);
    expect(f.gain).toBeGreaterThanOrEqual(g - 1e-9);
    expect(pending()).toBe(1); // 只有一個計時器在跑
    advance(1000);
    expect(await second).toBe(true);
    expect(f.gain).toBe(1);
  });

  it('時長按差距比例：由 0.5 淡出至 0 只需一半時間', async () => {
    const { clock, advance } = fakeClock();
    const f = new TrackFader(audio(), () => 1, clock);
    f.set(0.5);
    const done = f.fadeTo(0, 800);
    advance(410);
    await flush();
    expect(f.gain).toBe(0);
    expect(await done).toBe(true);
  });

  it('cancel() 停在目前音量；set() 立即設定', async () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    const f = new TrackFader(el, () => 1, clock);
    f.set(1);
    const p = f.fadeTo(0, 800);
    advance(200);
    f.cancel();
    expect(await p).toBe(false);
    const g = f.gain;
    advance(500);
    expect(f.gain).toBe(g);
    expect(f.isFading).toBe(false);
    f.set(0.3);
    expect(el.volume).toBeCloseTo(0.3, 9);
  });

  it('目標等於目前值：立即完成', async () => {
    const f = new TrackFader(audio(), () => 1, fakeClock().clock);
    f.set(1);
    expect(await f.fadeTo(1, 800)).toBe(true);
  });
});

describe('desiredTrack（頁面與音樂轉場）', () => {
  it('主頁／圖鑑播主頁音樂；戰鬥播戰鬥音樂；暫停、入陣準備、勝利、戰敗靜音', async () => {
    const { desiredTrack } = await import('./bgmFade');
    const { GameStatus } = await import('../types');
    expect(desiredTrack(GameStatus.MENU, false)).toBe('menu');
    expect(desiredTrack(GameStatus.CHARACTER_DETAIL, false)).toBe('menu');
    expect(desiredTrack(GameStatus.LOADING, false)).toBe('menu');
    expect(desiredTrack(GameStatus.PLAYING, false)).toBe('battle');
    expect(desiredTrack(GameStatus.PLAYING, true)).toBeNull();
    expect(desiredTrack(GameStatus.VICTORY, false)).toBeNull();
    expect(desiredTrack(GameStatus.GAME_OVER, false)).toBeNull();
  });
});

describe('applyUserVolumeWithSnap（拖動即時無極）', () => {
  it('一連串音量：每步後雙軌 volume＝user 且 gain=1', () => {
    let user = 0.5;
    const menuEl = audio();
    const battleEl = audio();
    const menu = new TrackFader(menuEl, () => user, fakeClock().clock);
    const battle = new TrackFader(battleEl, () => user, fakeClock().clock);
    menu.set(1);
    battle.set(1);
    for (const v of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      user = v;
      applyUserVolumeWithSnap(menu, { shouldHear: true });
      applyUserVolumeWithSnap(battle, { shouldHear: true });
      expect(menu.gain).toBe(1);
      expect(battle.gain).toBe(1);
      expect(menuEl.volume).toBeCloseTo(v, 9);
      expect(battleEl.volume).toBeCloseTo(v, 9);
      expect(menuEl.volume).toBe(battleEl.volume);
    }
  });

  it('fade 中改音量：shouldHear 時 gain 恢復為 1 且 volume＝user', () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    let user = 1;
    const f = new TrackFader(el, () => user, clock);
    f.set(0);
    void f.fadeTo(1, 800);
    advance(400);
    expect(f.isFading).toBe(true);
    expect(f.gain).toBeGreaterThan(0.4);
    expect(f.gain).toBeLessThan(0.6);
    user = 0.7;
    applyUserVolumeWithSnap(f, { shouldHear: true });
    expect(f.isFading).toBe(false);
    expect(f.gain).toBe(1);
    expect(el.volume).toBeCloseTo(0.7, 9);
  });

  it('非 shouldHear（淡出中）：只 apply，不 snap gain', () => {
    const { clock, advance } = fakeClock();
    const el = audio();
    let user = 1;
    const f = new TrackFader(el, () => user, clock);
    f.set(1);
    void f.fadeTo(0, 800);
    advance(400);
    const g = f.gain;
    user = 0.3;
    applyUserVolumeWithSnap(f, { shouldHear: false });
    expect(f.gain).toBeCloseTo(g, 9);
    expect(el.volume).toBeCloseTo(0.3 * g, 9);
  });
});

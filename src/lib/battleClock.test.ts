import { describe, expect, it } from 'vitest';
import { BattleClock } from './battleClock';

const fakeNow = (start = 1000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; }, set: (ms: number) => { t = ms; } };
};

describe('BattleClock：單調累加、凍結期間不計', () => {
  it('未開始為 idle，stop() 回傳 null', () => {
    const c = new BattleClock(fakeNow().now);
    expect(c.state).toBe('idle');
    expect(c.elapsedMs()).toBe(0);
    expect(c.stop()).toBeNull();
  });
  it('連續計時', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start();
    f.advance(1500);
    expect(c.elapsedMs()).toBe(1500);
    f.advance(500);
    expect(c.stop()).toBe(2000);
  });
  it('凍結期間不計時；多次暫停累加正確', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start();
    f.advance(1000);
    c.setFrozen(true);
    f.advance(60_000);
    expect(c.elapsedMs()).toBe(1000);
    c.setFrozen(false);
    f.advance(2000);
    c.setFrozen(true);
    f.advance(5000);
    c.setFrozen(false);
    f.advance(3000);
    expect(c.stop()).toBe(6000);
  });
  it('重複凍結／解凍不會重複計算', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start();
    f.advance(100);
    c.setFrozen(true);
    c.setFrozen(true);
    f.advance(100);
    c.setFrozen(false);
    c.setFrozen(false);
    f.advance(100);
    expect(c.stop()).toBe(200);
  });
  it('可在凍結狀態開始；停止時在凍結中亦正確', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start(true);
    f.advance(1000);
    c.setFrozen(false);
    f.advance(400);
    c.setFrozen(true);
    f.advance(1000);
    expect(c.stop()).toBe(400);
  });
  it('stop() 冪等；之後的凍結／時間流逝不影響結果', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start();
    f.advance(700);
    expect(c.stop()).toBe(700);
    f.advance(1000);
    c.setFrozen(false);
    expect(c.stop()).toBe(700);
    expect(c.elapsedMs()).toBe(700);
    expect(c.state).toBe('stopped');
  });
  it('時鐘倒退時該段以 0 計，累計值不減少', () => {
    const f = fakeNow(10_000);
    const c = new BattleClock(f.now);
    c.start();
    f.advance(500);
    c.setFrozen(true);
    c.setFrozen(false);
    f.set(9000);
    expect(c.elapsedMs()).toBe(500);
    f.set(9300);
    expect(c.stop()).toBe(500);
  });
  it('start() 重新開始、reset() 回到 idle', () => {
    const f = fakeNow();
    const c = new BattleClock(f.now);
    c.start();
    f.advance(900);
    c.start();
    f.advance(100);
    expect(c.elapsedMs()).toBe(100);
    c.reset();
    expect(c.state).toBe('idle');
    expect(c.elapsedMs()).toBe(0);
  });
  it('預設使用 performance.now()', () => {
    const c = new BattleClock();
    c.start();
    expect(c.elapsedMs()).toBeGreaterThanOrEqual(0);
  });
});

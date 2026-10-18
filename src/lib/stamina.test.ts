import { describe, expect, it } from 'vitest';
import { MAX_STAMINA, STAMINA_COST, STAMINA_REFUND, STAMINA_REGEN_INTERVAL_MS } from './playerData';
import {
  StaminaAttemptGuard,
  canEnterBattle,
  formatCountdown,
  formatFullIn,
  materialise,
  planDeduct,
  planRefund,
  staminaAt,
} from './stamina';

const I = STAMINA_REGEN_INTERVAL_MS;
const full = (at = 1_000_000): { stamina: number; staminaUpdatedAt: number; staminaRefundable: boolean } => ({
  stamina: MAX_STAMINA,
  staminaUpdatedAt: at,
  staminaRefundable: false,
});

describe('staminaAt／regen', () => {
  it('滿格不回復、倒數為 0', () => {
    const v = staminaAt(full(0), 10 * I);
    expect(v).toEqual({ stamina: MAX_STAMINA, full: true, nextPointInMs: 0, fullInMs: 0 });
  });
  it('每 6 分鐘回復 1 點；保留未滿一格進度', () => {
    const s = { stamina: 90, staminaUpdatedAt: 0 };
    expect(staminaAt(s, I - 1).stamina).toBe(90);
    expect(staminaAt(s, I).stamina).toBe(91);
    expect(staminaAt(s, 2 * I + 100).stamina).toBe(92);
    expect(staminaAt(s, 2 * I + 100).nextPointInMs).toBe(I - 100);
  });
  it('時鐘倒退不倒扣', () => {
    expect(staminaAt({ stamina: 50, staminaUpdatedAt: 5000 }, 1000).stamina).toBe(50);
  });
  it('materialise 保留部分進度；滿格起點＝now', () => {
    const m = materialise({ stamina: 98, staminaUpdatedAt: 0 }, 2 * I + 123);
    expect(m.stamina).toBe(100);
    expect(m.capped).toBe(true);
    expect(m.staminaUpdatedAt).toBe(2 * I + 123);
    const m2 = materialise({ stamina: 50, staminaUpdatedAt: 0 }, 2 * I + 123);
    expect(m2.stamina).toBe(52);
    expect(m2.staminaUpdatedAt).toBe(2 * I);
    expect(m2.capped).toBe(false);
  });
});

describe('deduct／refund／block', () => {
  it('滿格扣除 10，標記可返還', () => {
    const p = planDeduct(full(0), 0);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.next.stamina).toBe(90);
    expect(p.next.staminaRefundable).toBe(true);
  });
  it('不足 10 不可入陣', () => {
    const s = { stamina: 9, staminaUpdatedAt: 0, staminaRefundable: false };
    expect(canEnterBattle(s, 0)).toBe(false);
    const p = planDeduct(s, 0);
    expect(p.ok).toBe(false);
    if (p.ok !== false) return;
    expect(p.reason).toBe('insufficient');
  });
  it('戰敗返還 5；不可重複', () => {
    const after = planDeduct(full(0), 0);
    if (!after.ok) throw new Error();
    const r1 = planRefund(after.next, 0);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.next.stamina).toBe(95);
    expect(r1.next.staminaRefundable).toBe(false);
    expect(planRefund(r1.next, 0).ok).toBe(false);
  });
  it('未標記可返還則不返還', () => {
    expect(planRefund(full(0), 0).ok).toBe(false);
  });
});

describe('StaminaAttemptGuard 防連點／只返還一次', () => {
  it('連點 tryBegin 第二次為 null', () => {
    const g = new StaminaAttemptGuard();
    expect(g.tryBegin()).toBe(1);
    expect(g.tryBegin()).toBeNull();
    g.charged(1);
    expect(g.tryBegin()).toBe(2);
  });
  it('settle：只有 defeat 且已 charged 才返還；同一 attempt 只一次', () => {
    const g = new StaminaAttemptGuard();
    const id = g.tryBegin()!;
    expect(g.settle('defeat')).toBe(false); // 尚未 charged
    g.charged(id);
    expect(g.settle('defeat')).toBe(true);
    expect(g.settle('defeat')).toBe(false);
  });
  it('victory／exit 不返還', () => {
    const g = new StaminaAttemptGuard();
    const id = g.tryBegin()!;
    g.charged(id);
    expect(g.settle('victory')).toBe(false);
    const g2 = new StaminaAttemptGuard();
    const id2 = g2.tryBegin()!;
    g2.charged(id2);
    expect(g2.settle('exit')).toBe(false);
  });
  it('failed 解鎖後可再 tryBegin', () => {
    const g = new StaminaAttemptGuard();
    const id = g.tryBegin()!;
    g.failed(id);
    expect(g.tryBegin()).toBe(2);
  });
});

describe('時間文案', () => {
  it('formatCountdown → m:ss', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(1000)).toBe('0:01');
    expect(formatCountdown(4 * 60 * 1000 + 32_000)).toBe('4:32');
  });
  it('formatFullIn：向上取整分鐘；<1 分→1 分；≥1h 含小時', () => {
    expect(formatFullIn(1)).toBe('1 分');
    expect(formatFullIn(59_999)).toBe('1 分');
    expect(formatFullIn(60_000)).toBe('1 分');
    expect(formatFullIn(15 * 60_000)).toBe('15 分');
    expect(formatFullIn(2 * 3600_000 + 15 * 60_000)).toBe('2 小時 15 分');
    expect(formatFullIn(2 * 3600_000)).toBe('2 小時');
  });
});

describe('常數', () => {
  it('MAX=100 COST=10 REFUND=5 INTERVAL=6min', () => {
    expect(MAX_STAMINA).toBe(100);
    expect(STAMINA_COST).toBe(10);
    expect(STAMINA_REFUND).toBe(5);
    expect(STAMINA_REGEN_INTERVAL_MS).toBe(6 * 60 * 1000);
  });
});

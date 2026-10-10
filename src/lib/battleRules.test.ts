import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { playerHpAfterBossHit } from './battleRules';
import { MAX_HP, WRONG_ANSWER_DAMAGE } from '../../constants';

describe('Boss 攻擊：每擊固定 100 HP', () => {
  it('常數為 100（舊版 v1.2.7 以前為 1000，一擊即敗）', () => {
    expect(WRONG_ANSWER_DAMAGE).toBe(100);
  });

  it('滿血一擊 → 900；連續 10 擊才歸 0', () => {
    let hp = MAX_HP;
    hp = playerHpAfterBossHit(hp, WRONG_ANSWER_DAMAGE);
    expect(hp).toBe(900);
    const trail = [hp];
    for (let i = 0; i < 9; i++) { hp = playerHpAfterBossHit(hp, WRONG_ANSWER_DAMAGE); trail.push(hp); }
    expect(trail).toEqual([900, 800, 700, 600, 500, 400, 300, 200, 100, 0]);
    expect(Math.ceil(MAX_HP / WRONG_ANSWER_DAMAGE)).toBe(10);
  });

  it('不低於 0；異常輸入安全', () => {
    expect(playerHpAfterBossHit(50, WRONG_ANSWER_DAMAGE)).toBe(0);
    expect(playerHpAfterBossHit(0, WRONG_ANSWER_DAMAGE)).toBe(0);
    expect(playerHpAfterBossHit(NaN, WRONG_ANSWER_DAMAGE)).toBe(0);
    expect(playerHpAfterBossHit(500, -100)).toBe(500);
    expect(playerHpAfterBossHit(500, NaN)).toBe(500);
  });

  it('App.tsx 只有一處扣玩家 HP，且經 playerHpAfterBossHit 及 WRONG_ANSWER_DAMAGE（防止再出現寫死的數值）', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    // 任何「playerHp - 數字」或「playerHp: 數字以外的運算」都視為另一個扣血路徑
    expect(src).not.toMatch(/playerHp\s*-\s*\d/);
    expect(src.match(/playerHpAfterBossHit\(/g)?.length).toBe(1);
    expect(src).toMatch(/playerHpAfterBossHit\(gameStateRef\.current\.playerHp,\s*damageOverride \?\? WRONG_ANSWER_DAMAGE\)/);
    // playerHp 只會被設為：0（重置）、MAX_HP（開場補滿）或 newPlayerHp（Boss 一擊的結果）
    const writes = [...src.matchAll(/playerHp:\s*([^,}\s]+)/g)].map((m) => m[1]);
    for (const w of writes) expect(['0', 'MAX_HP', 'newPlayerHp']).toContain(w);
    // 測試模式「直接戰敗」按鈕是唯一的 damageOverride
    expect(src.match(/triggerEnemyAttack\([^)]*,\s*[^)]+\)/g)).toEqual(['triggerEnemyAttack(true, MAX_HP)']);
  });
});

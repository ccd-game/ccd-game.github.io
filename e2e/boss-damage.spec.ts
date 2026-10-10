/**
 * Boss 攻擊＝每擊 100 HP（WRONG_ANSWER_DAMAGE）：每種攻擊演出（xSlash 柳宗元、chariotCharge 孔子、swingSlash 諸葛亮／李白）
 * 答錯一次，玩家 HP 由 1000 直接變為 900（中間沒有其他數值、只扣一次）；超時亦同。
 */
import { test, expect } from '@playwright/test';
import { WRONG_ANSWER_DAMAGE, MAX_HP } from '../constants';
import { blockFirebase, clickChars, enterBattle, hpTrail, levelBank, playerHp, recordPlayerHp, waitTurnActive, wrongChars } from './support/battle';

const CASES = [
  { id: 2, style: 'xSlash（柳宗元飛劍）' },
  { id: 6, style: 'chariotCharge（孔子）' },
  { id: 9, style: 'swingSlash（諸葛亮）' },
  { id: 11, style: 'swingSlash（李白）' },
];

test.describe('Boss 攻擊每擊 100 HP', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ context }) => { await blockFirebase(context); await recordPlayerHp(context); });

  for (const c of CASES) {
    test(`答錯一次扣 100：第 ${c.id} 關 ${c.style}`, async ({ page }) => {
      test.setTimeout(90_000);
      expect(WRONG_ANSWER_DAMAGE).toBe(100);
      const bank = levelBank(c.id);
      const q = await enterBattle(page, bank);
      expect(await playerHp(page)).toBe(MAX_HP);
      await clickChars(page, await wrongChars(page, bank, q));
      await waitTurnActive(page, bank);
      await page.waitForTimeout(500);
      expect(await playerHp(page)).toBe(MAX_HP - WRONG_ANSWER_DAMAGE);
      const trail = await hpTrail(page);
      expect(trail.slice(trail.indexOf(MAX_HP))).toEqual([MAX_HP, MAX_HP - WRONG_ANSWER_DAMAGE]);
    });
  }

  for (const id of [6, 9]) {
    test(`超時一次扣 100：第 ${id} 關`, async ({ page }) => {
      test.setTimeout(120_000);
      const bank = levelBank(id);
      await enterBattle(page, bank);
      await page.waitForTimeout(31_500);
      await waitTurnActive(page, bank);
      await page.waitForTimeout(500);
      expect(await playerHp(page)).toBe(MAX_HP - WRONG_ANSWER_DAMAGE);
      const trail = await hpTrail(page);
      expect(trail.slice(trail.indexOf(MAX_HP))).toEqual([MAX_HP, MAX_HP - WRONG_ANSWER_DAMAGE]);
    });
  }
});

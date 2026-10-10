/**
 * 字卡盤面（各關干擾字池，data/distractors.ts）：第 2、6、9、11 關各取兩盤（第一題及答對後的第二題），
 * 以畫面上實際的字卡檢查：20 格、只有漢字、答案拼得出、干擾字不重複、不是答案字或其異體、沒有同組異體字對。
 */
import { test, expect, type Page } from '@playwright/test';
import { variantsOf } from '../data/distractors';
import { blockFirebase, clickChars, enterBattle, levelBank, waitTurnActive, type LevelBank } from './support/battle';

const tiles = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')).map((b) => b.textContent!.trim()));

function checkBoard(bank: LevelBank, q: string, board: string[]) {
  const item = bank.byText.get(q)!;
  expect(board.length).toBe(20);
  expect(board.every((c) => /\p{Script=Han}/u.test(c))).toBe(true);
  // 拿走答案字（concat：所有可接受答案的字），餘下是干擾字
  const left = [...board];
  for (const c of item.answers.flatMap((a) => [...a])) {
    const i = left.indexOf(c);
    expect(i, `答案字「${c}」不在盤上`).toBeGreaterThanOrEqual(0);
    left.splice(i, 1);
  }
  for (const a of item.answers) {
    const pool = [...board];
    for (const c of a) { const i = pool.indexOf(c); expect(i).toBeGreaterThanOrEqual(0); pool.splice(i, 1); }
  }
  expect(new Set(left).size).toBe(left.length);
  const banned = new Set<string>();
  for (const c of [...item.answers.join(''), ...item.prefill.filter((x) => x !== '…')]) { banned.add(c); for (const v of variantsOf(c)) banned.add(v); }
  expect(left.filter((c) => banned.has(c))).toEqual([]);
  const seen = new Set<string>();
  for (const c of left) { for (const v of variantsOf(c)) expect(seen.has(v), `同組異體字對 ${c}/${v}`).toBe(false); seen.add(c); }
}

test.describe('各關干擾字盤面', () => {
  for (const id of [2, 6, 9, 11]) {
    test(`第 ${id} 關：兩盤`, async ({ context, page }) => {
      test.setTimeout(90_000);
      await blockFirebase(context);
      const bank = levelBank(id);
      let q = await enterBattle(page, bank);
      checkBoard(bank, q, await tiles(page));
      await clickChars(page, [...bank.byText.get(q)!.answers[0]]);
      const q2 = await waitTurnActive(page, bank);
      expect(q2).not.toBe(q); // 同一場戰鬥內不重複
      q = q2;
      checkBoard(bank, q, await tiles(page));
    });
  }
});

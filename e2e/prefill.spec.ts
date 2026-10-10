/**
 * 預填格（[預填] 語法，移植自 prefill.patch）：第 2 關「始指異之」＝ [才指著西山認為它]奇特/奇異。
 * 出題次序每場洗牌，所以只在測試中把第 2 關題庫縮為這一題（改寫內嵌題庫的 bundle 回應；遊戲本身沒有任何後門），並封鎖 Firebase。
 */
import { test, expect } from '@playwright/test';
import { MAX_HP, WRONG_ANSWER_DAMAGE } from '../constants';
import { QUESTION_BANK_MD, blockFirebase, clickChars, enterBattle, hpText, levelBank, playerHp, waitTurnActive } from './support/battle';

const ROW = QUESTION_BANK_MD.split('\n').find((l) => l.includes('「始指異之」一句解作？'))!;
const OTHER_L2 = QUESTION_BANK_MD.split('\n').filter((l) => /^\|\s*2\s*\|/.test(l) && l !== ROW);
const PREFILL = [...'才指著西山認為它'];

test('預填格鎖定；只輸入其後的字；答錯重試時預填仍在；字卡沒有預填字及標點', async ({ context, page }) => {
  test.setTimeout(120_000);
  expect(ROW).toContain('[才指著西山認為它]奇特/奇異');
  await blockFirebase(context);
  await context.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    if (!body.includes(ROW + '\n')) throw new Error('bundle 中找不到題庫行');
    for (const row of OTHER_L2) {
      if (!body.includes(row + '\n')) throw new Error('bundle 中找不到題庫行：' + row);
      body = body.replace(row + '\n', '');
    }
    await route.fulfill({ response: res, body });
  });
  const bank = levelBank(2);
  const q = await enterBattle(page, bank);
  expect(q).toBe('「始指異之」一句解作？');

  const slots = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-slot-index]')).map((e) => ({ locked: e.getAttribute('data-locked') === 'true', char: e.textContent!.trim() })));
  const tiles = () => page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')).map((b) => b.textContent!.trim()));

  let s = await slots();
  expect(s.length).toBe(PREFILL.length + 2);
  expect(s.filter((x) => x.locked).map((x) => x.char)).toEqual(PREFILL);
  expect(s.slice(PREFILL.length).every((x) => !x.locked && x.char === '')).toBe(true);
  const t = await tiles();
  expect(t.length).toBe(20);
  expect(t.every((c) => /\p{Script=Han}/u.test(c))).toBe(true);
  expect(t.filter((c) => PREFILL.includes(c))).toEqual([]);

  // 點預填格沒有作用
  await page.locator('[data-slot-index="0"]').click({ force: true });
  expect((await slots())[0]).toEqual({ locked: true, char: PREFILL[0] });

  // 答錯（填滿 2 個可輸入格）：扣 100，重答同一題，預填仍在
  const wrong = t.filter((c) => !'奇特異'.includes(c)).slice(0, 2);
  await clickChars(page, wrong);
  expect(await waitTurnActive(page, bank)).toBe(q);
  expect(await playerHp(page)).toBe(MAX_HP - WRONG_ANSWER_DAMAGE);
  s = await slots();
  expect(s.filter((x) => x.locked).map((x) => x.char)).toEqual(PREFILL);
  expect(s.slice(PREFILL.length).every((x) => x.char === '')).toBe(true);

  // 答對：只輸入「奇特」
  const bossBefore = await hpText(page, 'boss');
  await clickChars(page, ['奇', '特']);
  await expect.poll(() => hpText(page, 'boss'), { timeout: 10_000 }).not.toBe(bossBefore);
});

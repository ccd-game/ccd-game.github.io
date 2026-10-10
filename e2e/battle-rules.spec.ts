/**
 * 戰鬥規則 E2E（移植自 battle-rules/battle-rules.e2e.mjs，改用 @playwright/test 及遊客模式）
 * - 答對：速度傷害；Boss HP 歸零即勝（題目未答完）；門檻台詞各說一次；勝利後不再出題
 * - 答錯／超時：玩家 −100 HP，重答同一題；第 10 次戰敗，只觸發一次
 * - 題目用盡而 Boss 未倒：戰敗（在測試中把第 2 關題庫縮為 3 題）
 * - 通關紀錄：勝利才記錄（經驗 +5 × 答對 + 50）；機械式極速通關低於防作弊下限，不記錄；戰敗不記錄
 * 只在測試中封鎖 Firebase／Google 後端。網址一律相對於 playwright.config 的 baseURL（不寫死路徑）。
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseQuestionBank } from '../src/utils/questionParser';

const ROOT = process.cwd();
const LEVEL_ID = 2; // 《始得西山宴遊記》（已開放，40 題）
const LEVEL_TITLE = '始得西山宴遊記';
const PLAYER_MAX = 1000, WRONG_DMG = 100, BOSS_MAX = 1000;
const THRESHOLDS = [80, 60, 40, 20, 0];
const GUEST_DATA_KEY = 'ccd.guest.data.v2';

// ── 題庫與台詞（與 App 相同的解析規則） ──
const qbMd = fs.readFileSync(path.join(ROOT, 'QUESTION_BANK.md'), 'utf8');
const rowRe = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;
const levelRows = qbMd.split('\n').filter((l) => { const m = l.match(rowRe); return m && +m[1] === LEVEL_ID; });
// 答案以遊戲本身的解析器拆出（[預填]、/ ／）；answers 只含要輸入的部分
const bank = parseQuestionBank(levelRows.join('\n'), () => {}).map((q) => ({ question: q.question, answers: q.answers }));
const byText = new Map(bank.map((q) => [q.question, q]));

const spMd = fs.readFileSync(path.join(ROOT, 'BOSS_SPEECHES.md'), 'utf8');
const speeches: Record<string, string> = {};
{
  let cur: number | null = null;
  for (const line of spMd.split('\n')) {
    const id = line.match(/^\|\s*\*\*(\d+)\*\*\s*\|/); if (id) cur = +id[1];
    if (cur !== LEVEL_ID) continue;
    const p = line.split('|').map((s) => s.trim()); if (p.length < 6) continue;
    const content = p[5].replace(/\\n/g, '\n');
    const hp = p[4].match(/HP\s*(\d+)%/);
    if (hp) speeches['HP' + hp[1]] = content;
    else if (p[4] === '戰勝 (玩家勝)') speeches.victory = content;
    else if (p[4] === '戰敗 (玩家亡)') speeches.defeat = content;
  }
}

type Ev = { k: string; t: number; damage?: number; mult?: string };

async function setup(context: BrowserContext, { truncateLevelTo }: { truncateLevelTo?: number } = {}) {
  await context.route('**/*', (route) => {
    const h = new URL(route.request().url()).hostname;
    const firebase = /(^|\.)(firestore|firebase[a-z]*|identitytoolkit|securetoken|firebaseinstallations)\.googleapis\.com$/.test(h)
      || /(^|\.)(firebaseio\.com|firebaseapp\.com|web\.app)$/.test(h) || ['www.google.com', 'apis.google.com', 'www.googleapis.com'].includes(h);
    return firebase ? route.abort() : route.fallback();
  });
  if (truncateLevelTo != null) {
    // 題庫以 ?raw 內嵌於主程式 bundle：只在測試中刪去第 LEVEL_ID 關第 truncateLevelTo 題之後的題目
    await context.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      let removed = 0;
      for (const row of levelRows.slice(truncateLevelTo)) {
        if (body.includes(row + '\n')) { body = body.replace(row + '\n', ''); removed++; }
      }
      if (removed !== levelRows.length - truncateLevelTo) throw new Error(`題庫縮減失敗：${removed}`);
      await route.fulfill({ response: res, body });
    });
  }
  await context.addInitScript((sp: Record<string, string>) => {
    const w = window as unknown as { __events: Ev[] };
    w.__events = [];
    const seen: Record<string, boolean> = {};
    const seenPopups = new WeakSet<Element>();
    setInterval(() => {
      const texts = new Set(Array.from(document.querySelectorAll('body *')).filter((e) => e.children.length === 0).map((e) => e.textContent));
      const mark = (k: string, on: boolean) => { if (on && !seen[k]) w.__events.push({ k, t: performance.now() }); seen[k] = on; };
      for (const [k, v] of Object.entries(sp)) mark(k, texts.has(v));
      for (const el of document.querySelectorAll('[data-testid=damage-popup]')) {
        if (seenPopups.has(el)) continue;
        seenPopups.add(el);
        const d = el.querySelector('[data-testid=damage-popup-damage]')?.textContent || '';
        const m = el.querySelector('[data-testid=damage-popup-multiplier]')?.textContent || '';
        w.__events.push({ k: 'POPUP', t: performance.now(), damage: parseInt(d.replace(/[^0-9]/g, ''), 10), mult: m });
      }
      mark('VICTORY_SCREEN', texts.has('大獲全勝'));
      mark('GAMEOVER_SCREEN', texts.has('勝敗乃兵家常事'));
    }, 50);
  }, speeches);
}

const events = (page: Page) => page.evaluate(() => (window as unknown as { __events: Ev[] }).__events.slice());
const popups = async (page: Page) => (await events(page)).filter((e) => e.k === 'POPUP');
const clearEvents = (page: Page) => page.evaluate(() => { (window as unknown as { __events: Ev[] }).__events.length = 0; });
const waitPopupCount = (page: Page, n: number) =>
  page.waitForFunction((n) => (window as unknown as { __events: Ev[] }).__events.filter((e) => e.k === 'POPUP').length >= n, n, { timeout: 15_000 });

/** 讀取 HP 文字：玩家 HP 條的填色為綠（#28a745），Boss 為紅 */
const hpText = (page: Page, who: 'player' | 'boss') => page.evaluate((who) => {
  const el = Array.from(document.querySelectorAll('.hp-text')).find((e) => {
    const html = e.parentElement?.innerHTML || '';
    return who === 'player' ? html.includes('#28a745') : html.includes('#ff0000');
  });
  return el ? el.textContent!.trim() : null;
}, who);
const playerHp = async (page: Page) => parseInt((await hpText(page, 'player')) || 'NaN', 10);

async function waitTurnActive(page: Page, timeout = 40_000): Promise<string> {
  const qs = [...byText.keys()];
  await page.waitForFunction((qs) => {
    if (!document.querySelector('.input-pad-btn:not([disabled])')) return false;
    return Array.from(document.querySelectorAll('p')).some((p) => qs.includes(p.textContent!.trim()));
  }, qs, { timeout });
  return page.evaluate((qs) => Array.from(document.querySelectorAll('p')).map((p) => p.textContent!.trim()).find((t) => qs.includes(t))!, qs);
}

async function clickChars(page: Page, chars: string[]) {
  for (const ch of chars) {
    const ok = await page.evaluate((c) => {
      const b = Array.from(document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')).find((x) => !x.disabled && x.style.visibility !== 'hidden' && x.textContent!.trim() === c);
      if (!b) return false; b.click(); return true;
    }, ch);
    if (!ok) throw new Error('找不到選項字：' + ch);
    await page.waitForTimeout(60);
  }
}

async function wrongChars(page: Page, q: string) {
  const item = byText.get(q)!;
  const bad = [...new Set(item.answers.join(''))];
  const n = Math.max(...item.answers.map((a) => [...a].length));
  return page.evaluate(({ bad, n }) => {
    const out: string[] = [];
    for (const b of document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')) { const c = b.textContent!.trim(); if (!b.disabled && !bad.includes(c) && out.length < n) out.push(c); }
    return out;
  }, { bad, n });
}

async function enterBattle(page: Page) {
  await page.goto('./');
  await expect(page.getByText('載入中')).toHaveCount(0, { timeout: 20_000 });
  await page.getByTestId('guest-enter').click();
  await expect(page.getByRole('navigation', { name: '主選單' })).toBeVisible({ timeout: 25_000 });
  // 首頁篇章卡：切換至目標篇章後按「入陣」
  const enter = page.getByRole('button', { name: new RegExp(`入陣.*${LEVEL_TITLE}`) });
  for (let i = 0; i < 12 && !(await enter.isVisible()); i++) await page.getByRole('button', { name: '下一位古人' }).click();
  await enter.click();
  // 按「入陣」後跳出選擇小視窗（深入不毛／驀然回首），選深入不毛才開始無縫入陣
  const go = page.getByRole('dialog', { name: '選擇入陣方式' }).getByRole('button', { name: '深入不毛' });
  await expect(go).toBeEnabled({ timeout: 20_000 });
  await go.click();
  return waitTurnActive(page);
}

const guestData = (page: Page) => page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) || 'null'), GUEST_DATA_KEY);

/** 一直答對直至勝利；thinkMs＝每題作答前的等待（模擬人手） */
async function winByAnswering(page: Page, firstQ: string, thinkMs: number) {
  let q = firstQ; let answered = 0; const asked: string[] = [];
  for (;;) {
    asked.push(q);
    if (thinkMs) await page.waitForTimeout(thinkMs);
    await clickChars(page, [...byText.get(q)!.answers[0]]);
    answered++;
    await waitPopupCount(page, answered);
    const sum = (await popups(page)).reduce((a, e) => a + (e.damage || 0), 0);
    if (sum >= BOSS_MAX) break;
    if (answered >= bank.length) throw new Error('題目用盡仍未勝利');
    q = await waitTurnActive(page);
  }
  await expect(page.getByText('大獲全勝')).toBeVisible({ timeout: 30_000 });
  return { answered, asked };
}

test.describe('戰鬥規則（HP 歸零即勝）', () => {
  test.describe.configure({ mode: 'serial' });

  test('人手速度答對：速度傷害、HP 歸零即勝、門檻台詞各一次、通關紀錄與經驗', async ({ page, context }) => {
    test.setTimeout(180_000);
    await setup(context);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    const q = await enterBattle(page);
    await clearEvents(page);
    const { answered, asked } = await winByAnswering(page, q, 1600);
    const pops = await popups(page);
    expect(pops[0].damage).toBeGreaterThan(100);
    expect(pops[0].mult).toMatch(/^×\d\.\d\d$/);
    expect(Math.abs(pops[0].damage! - 100 * parseFloat(pops[0].mult!.slice(1)))).toBeLessThanOrEqual(1);
    expect(answered).toBeLessThan(bank.length); // 題目未答完即勝
    expect(pops.slice(0, -1).reduce((a, e) => a + e.damage!, 0)).toBeLessThan(BOSS_MAX); // 最後一擊才致勝
    expect(new Set(asked).size).toBe(asked.length);
    const order = (await events(page)).map((e) => e.k).filter((k) => k !== 'POPUP');
    expect(order.filter((k) => k.startsWith('HP'))).toEqual(THRESHOLDS.map((t) => 'HP' + t));
    expect(order.indexOf('victory')).toBeGreaterThan(order.indexOf('HP0'));
    expect(order.indexOf('VICTORY_SCREEN')).toBeGreaterThan(order.indexOf('victory'));
    expect(order).not.toContain('GAMEOVER_SCREEN');
    await page.waitForTimeout(3000);
    const late = (await events(page)).map((e) => e.k);
    expect(late.filter((k) => k === 'VICTORY_SCREEN')).toHaveLength(1);
    expect(late).not.toContain('GAMEOVER_SCREEN');
    // 通關紀錄（遊客：sessionStorage）：經驗 +5 × 答對 + 50；時間 ≥ 防作弊下限；總分＝最佳分數＋floor(exp × 0.3)
    const d = await guestData(page);
    expect(d.exp).toBe(5 * answered + 50);
    expect(d.levels[String(LEVEL_ID)].bestTimeMs).toBeGreaterThanOrEqual(12_000);
    expect(d.score).toBe(d.levels[String(LEVEL_ID)].bestScore + Math.floor((d.exp * 3) / 10));
    expect(pageErrors).toEqual([]);
  });

  test('機械式極速通關（低於防作弊下限）：勝利但不記錄', async ({ page, context }) => {
    test.setTimeout(120_000);
    await setup(context);
    const q = await enterBattle(page);
    await clearEvents(page);
    const { answered } = await winByAnswering(page, q, 0);
    expect(answered).toBeLessThanOrEqual(5);
    const d = await guestData(page);
    expect(d === null || (d.exp === 0 && Object.keys(d.levels).length === 0)).toBe(true);
  });

  test('答錯／超時 −100 HP、重答同一題；第 10 次戰敗只觸發一次；戰敗不記錄', async ({ page, context }) => {
    test.setTimeout(240_000);
    await setup(context);
    let q = await enterBattle(page);
    await clearEvents(page);
    expect(await playerHp(page)).toBe(PLAYER_MAX);
    await clickChars(page, await wrongChars(page, q));
    await page.waitForTimeout(2200);
    const retry = await waitTurnActive(page);
    expect(await playerHp(page)).toBe(PLAYER_MAX - WRONG_DMG);
    expect(retry).toBe(q);
    expect(await hpText(page, 'boss')).toBe('1000 / 1000');
    expect((await events(page)).some((e) => e.k === 'GAMEOVER_SCREEN')).toBe(false);
    // 超時
    await page.waitForTimeout(31_500);
    q = await waitTurnActive(page);
    expect(await playerHp(page)).toBe(PLAYER_MAX - 2 * WRONG_DMG);
    // 再錯 7 次 → HP 100
    for (let i = 0; i < 7; i++) {
      await clickChars(page, await wrongChars(page, q));
      await page.waitForTimeout(2500);
      q = await waitTurnActive(page);
    }
    expect(await playerHp(page)).toBe(100);
    await clickChars(page, await wrongChars(page, q));
    await expect(page.getByText('勝敗乃兵家常事')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);
    const ev = (await events(page)).map((e) => e.k);
    expect(ev.indexOf('GAMEOVER_SCREEN')).toBeGreaterThan(ev.indexOf('defeat'));
    expect(ev.filter((k) => k === 'GAMEOVER_SCREEN')).toHaveLength(1);
    expect(ev).not.toContain('VICTORY_SCREEN');
    const d = await guestData(page);
    expect(d === null || d.exp === 0).toBe(true);
  });

  test('題目用盡而 Boss 未倒：戰敗（題庫縮為 3 題）；門檻台詞正確', async ({ page, context }) => {
    test.setTimeout(180_000);
    await setup(context, { truncateLevelTo: 3 });
    let q = await enterBattle(page);
    await clearEvents(page);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      seen.push(q);
      if (i === 0) await page.waitForTimeout(11_500); // 慢答：約剩 18 秒 → 倍率 < 1
      await clickChars(page, [...byText.get(q)!.answers[0]]);
      await waitPopupCount(page, i + 1);
      if (i === 0) {
        const p = (await popups(page))[0];
        expect(p.damage).toBeLessThan(100);
      }
      if (i < 2) q = await waitTurnActive(page);
    }
    await expect(page.getByText('勝敗乃兵家常事')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect(new Set(seen).size).toBe(3);
    const dealt = (await popups(page)).reduce((a, e) => a + e.damage!, 0);
    expect(dealt).toBeLessThan(BOSS_MAX);
    const ev = (await events(page)).map((e) => e.k).filter((k) => k !== 'POPUP');
    expect(ev.indexOf('GAMEOVER_SCREEN')).toBeGreaterThan(ev.indexOf('defeat'));
    expect(ev).not.toContain('victory');
    expect(ev).not.toContain('VICTORY_SCREEN');
    const pct = (BOSS_MAX - dealt) / BOSS_MAX;
    for (const t of THRESHOLDS) expect(ev.filter((k) => k === 'HP' + t).length).toBe(pct <= t / 100 ? 1 : 0);
    expect(ev.filter((k) => k === 'GAMEOVER_SCREEN')).toHaveLength(1);
    const d = await guestData(page);
    expect(d === null || d.exp === 0).toBe(true);
  });
});

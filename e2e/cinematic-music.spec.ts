/**
 * 1) 演出中暫停 idle 飛劍：Boss 台詞、Boss 受擊動畫進行時，戰鬥（第 2 關柳宗元）的 .btl-saber／.btl-saber-idle
 *    computed animation-play-state 為 paused，元素不卸載；演出結束後回到 running。主頁平時為 running。
 * 2) 音樂淡入淡出：入陣小視窗開著時主頁音樂照常播放；深入不毛（主頁音樂淡出、戰鬥音樂同時淡入）及戰敗（戰鬥音樂淡出）時音量是逐步變化，不是一下跳變。
 */
import { test, expect, type Page } from '@playwright/test';
import { BGM_FADE_IN_MS, BGM_FADE_OUT_MS } from '../components/bgmFade';
import { blockFirebase, clickChars, enterAsGuest, levelBank, openBattle, pickChapter, waitTurnActive } from './support/battle';

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

/** computed animation-play-state 可以是多個值（例如「running, running」），逐一比較 */
const allAre = (states: string[], v: string) => states.every((st) => st.split(',').every((x) => x.trim() === v));

type SaberSample = { speech: boolean; hurt: boolean; states: string[]; tagged: boolean; cin: string | null };

test.describe('演出中暫停 idle 飛劍', () => {
  test('主頁平時播放；戰鬥中 Boss 台詞與受擊時暫停（不卸載），之後繼續', async ({ context, page }) => {
    test.setTimeout(120_000);
    await blockFirebase(context);
    await context.addInitScript(() => {
      const w = window as unknown as { __saber: SaberSample[] };
      w.__saber = [];
      setInterval(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('.btl-saber, .btl-saber-idle'));
        if (!els.length) return;
        // 第一次看到時加上記號：之後若被卸載重建，記號會消失
        const first = els[0];
        const tagged = first.dataset.e2eTag === '1';
        if (!tagged && !w.__saber.length) first.dataset.e2eTag = '1';
        w.__saber.push({
          speech: !!document.querySelector('.speech-anim, .speech-fatal-anim'),
          hurt: !!document.querySelector('.hurt-anim-base'),
          states: els.map((e) => getComputedStyle(e).animationPlayState),
          tagged: first.dataset.e2eTag === '1',
          cin: document.documentElement.getAttribute('data-cinematic'),
        });
      }, 25);
    });

    // 主頁：沒有演出時飛劍照常播放
    await enterAsGuest(page);
    const bank = levelBank(2);
    const home = page.locator('.home-saber-idle').first();
    await pickChapter(page, bank.title);
    for (let i = 0; i < 12 && !(await home.isVisible().catch(() => false)); i++) await page.getByRole('button', { name: '下一位古人' }).click();
    await expect(home).toBeVisible();
    await expect.poll(() => home.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('running');
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-cinematic'))).toBe('0');

    await openBattle(page, bank);
    const q = await waitTurnActive(page, bank);
    // 開場台詞期間全部暫停
    let samples = await page.evaluate(() => (window as unknown as { __saber: SaberSample[] }).__saber);
    const duringSpeech = samples.filter((s) => s.speech);
    expect(duringSpeech.length).toBeGreaterThan(5);
    expect(duringSpeech.every((s) => allAre(s.states, 'paused') && s.cin === '1')).toBe(true);
    // 回合進行中（沒有演出）：播放
    await page.waitForTimeout(300);
    const states = () => page.evaluate(() => Array.from(document.querySelectorAll('.btl-saber, .btl-saber-idle')).map((e) => getComputedStyle(e).animationPlayState));
    expect((await states()).length).toBeGreaterThan(0);
    expect(allAre(await states(), 'running')).toBe(true);

    // 答對 → Boss 受擊動畫期間暫停，元素沒有卸載
    await page.evaluate(() => { (window as unknown as { __saber: SaberSample[] }).__saber.length = 0; });
    await clickChars(page, [...bank.byText.get(q)!.answers[0]]);
    await waitTurnActive(page, bank);
    samples = await page.evaluate(() => (window as unknown as { __saber: SaberSample[] }).__saber);
    const duringHurt = samples.filter((s) => s.hurt);
    expect(duringHurt.length).toBeGreaterThan(5);
    expect(duringHurt.every((s) => allAre(s.states, 'paused'))).toBe(true);
    expect(samples.every((s) => s.tagged)).toBe(true);
    // 受擊與台詞結束後回到 running（由原位置繼續）
    await page.waitForTimeout(300);
    expect(allAre(await states(), 'running')).toBe(true);
    expect(await page.locator('[data-e2e-tag="1"]').count()).toBe(1);
  });
});

type VolSample = { t: number; menu: number; battle: number; menuPaused: boolean; battlePaused: boolean };
const startVolumeSampler = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __vol: VolSample[]; __bgmAudio: { menu: HTMLAudioElement; battle: HTMLAudioElement } };
  w.__vol = [];
  const tick = () => {
    const a = w.__bgmAudio;
    w.__vol.push({ t: performance.now(), menu: a.menu.volume, battle: a.battle.volume, menuPaused: a.menu.paused, battlePaused: a.battle.paused });
  };
  setInterval(tick, 10);
});
const volSamples = (page: Page) => page.evaluate(() => (window as unknown as { __vol: VolSample[] }).__vol.slice());
const clearVol = (page: Page) => page.evaluate(() => { (window as unknown as { __vol: VolSample[] }).__vol.length = 0; });
const userVolume = (page: Page) => page.evaluate(() => (window as unknown as { __bgmAudio: { menu: HTMLAudioElement } }).__bgmAudio.menu.volume);

/** 檢查一段音量序列是「逐步」由 from 變到 to：中間值夠多、單調、相鄰兩點的跳變不大 */
function expectRamp(values: number[], from: number, to: number) {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const span = hi - lo;
  const mid = values.filter((v) => v > lo + span * 0.05 && v < hi - span * 0.05);
  expect(mid.length, `中間值 ${mid.length} 個`).toBeGreaterThan(8);
  const dir = Math.sign(to - from);
  for (let i = 1; i < values.length; i++) expect((values[i] - values[i - 1]) * dir).toBeGreaterThanOrEqual(-1e-9);
  let maxJump = 0;
  for (let i = 1; i < values.length; i++) maxJump = Math.max(maxJump, Math.abs(values[i] - values[i - 1]));
  expect(maxJump, '最大單步跳變').toBeLessThan(span * 0.35);
}

test.describe('音樂淡入淡出', () => {
  test('入陣：小視窗不停主頁音樂；深入不毛：主頁音樂淡出、戰鬥音樂同時淡入；戰敗：戰鬥音樂淡出（不是一下切斷）', async ({ context, page }) => {
    test.setTimeout(120_000);
    await blockFirebase(context);
    const bank = levelBank(2);
    await enterAsGuest(page);
    // 主頁音樂已淡入至使用者音量
    await expect.poll(() => page.evaluate(() => !(window as unknown as { __bgmAudio: { menu: HTMLAudioElement } }).__bgmAudio.menu.paused), { timeout: 15_000 }).toBe(true);
    await page.waitForTimeout(BGM_FADE_IN_MS + 300);
    const V = await userVolume(page);
    expect(V).toBeGreaterThan(0);
    await startVolumeSampler(page);

    // 入陣 → 「深入不毛／驀然回首」小視窗：主頁音樂照常播放（不淡出、不暫停）
    await pickChapter(page, bank.title);
    const enter = page.getByRole('button', { name: new RegExp(`入陣.*${bank.title}`) });
    for (let i = 0; i < 12 && !(await enter.isVisible()); i++) await page.getByRole('button', { name: '下一位古人' }).click();
    await clearVol(page);
    await enter.click();
    const go = page.getByRole('dialog', { name: '選擇入陣方式' }).getByRole('button', { name: '深入不毛' });
    await expect(go).toBeEnabled({ timeout: 20_000 });
    await page.waitForTimeout(BGM_FADE_OUT_MS + 400);
    let s = await volSamples(page);
    expect(s.length).toBeGreaterThan(5);
    expect(s.every((x) => !x.menuPaused && Math.abs(x.menu - V) < 1e-9), '小視窗開著時主頁音樂維持原音量').toBe(true);
    expect(s.every((x) => x.battlePaused)).toBe(true);

    // 深入不毛 → 主頁音樂淡出、戰鬥音樂同時由 0 淡入（交叉淡變）
    await clearVol(page);
    await go.click();
    await page.waitForTimeout(Math.max(BGM_FADE_IN_MS, BGM_FADE_OUT_MS) + 600);
    s = await volSamples(page);
    const outStart = s.findIndex((x) => x.menu < V - 1e-6);
    const outEnd = s.findIndex((x, i) => i > outStart && x.menuPaused);
    expect(outStart).toBeGreaterThanOrEqual(0);
    expect(outEnd).toBeGreaterThan(outStart);
    expectRamp(s.slice(Math.max(0, outStart - 1), outEnd + 1).map((x) => x.menu), V, 0);
    const outMs = s[outEnd].t - s[outStart].t;
    expect(outMs).toBeGreaterThan(BGM_FADE_OUT_MS * 0.6);
    expect(outMs).toBeLessThan(BGM_FADE_OUT_MS * 1.6);
    const inStart = s.findIndex((x) => !x.battlePaused);
    const inEnd = s.findIndex((x, i) => i > inStart && Math.abs(x.battle - V) < 1e-9);
    expect(inStart).toBeGreaterThanOrEqual(0);
    expect(inEnd).toBeGreaterThan(inStart);
    expectRamp(s.slice(inStart, inEnd + 1).map((x) => x.battle), 0, V);
    // 同時進行：戰鬥音樂開始淡入時主頁音樂尚未淡完（兩段時間重疊）
    expect(s[inStart].t).toBeLessThan(s[outEnd].t);
    expect(Math.abs(s[inStart].t - s[outStart].t)).toBeLessThan(250);
    expect(Math.max(...s.map((x) => x.battle))).toBeLessThanOrEqual(V + 1e-9); // 永不超過使用者音量
    expect(s[s.length - 1].menuPaused).toBe(true);

    // 戰敗：正常戰鬥中連續答錯 10 次（每次 −100），第 10 次後進入戰敗畫面，戰鬥音樂須淡出
    let q = await waitTurnActive(page, bank);
    for (let i = 0; i < 10; i++) {
      const item = bank.byText.get(q)!;
      const bad = await page.evaluate(({ bad, n }) => {
        const out: string[] = [];
        for (const b of document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')) { const c = b.textContent!.trim(); if (!b.disabled && !bad.includes(c) && out.length < n) out.push(c); }
        return out;
      }, { bad: [...new Set(item.answers.join(''))], n: Math.max(...item.answers.map((a) => [...a].length)) });
      if (i === 9) await clearVol(page);
      await clickChars(page, bad);
      if (i < 9) q = await waitTurnActive(page, bank);
    }
    await expect(page.getByText('勝敗乃兵家常事')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(BGM_FADE_OUT_MS + 400);
    s = await volSamples(page);
    const dStart = s.findIndex((x) => x.battle < V - 1e-6);
    const dEnd = s.findIndex((x, i) => i > dStart && x.battlePaused);
    expect(dStart).toBeGreaterThanOrEqual(0);
    expect(dEnd).toBeGreaterThan(dStart);
    expectRamp(s.slice(Math.max(0, dStart - 1), dEnd + 1).map((x) => x.battle), V, 0);
    expect(s[dEnd].t - s[dStart].t).toBeGreaterThan(BGM_FADE_OUT_MS * 0.6);
    expect(s[s.length - 1].battlePaused).toBe(true);
  });
});

/**
 * 戰鬥 E2E 共用工具：題庫以遊戲本身的 parseQuestionBank 解析（支援 / ／ 及 [預填] 語法），
 * 只在測試中封鎖 Firebase／Google 後端。網址一律相對於 playwright.config 的 baseURL。
 */
import { expect, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseQuestionBank } from '../../src/utils/questionParser';

export const ROOT = process.cwd();
export const QUESTION_BANK_MD = fs.readFileSync(path.join(ROOT, 'QUESTION_BANK.md'), 'utf8');
const BANK = parseQuestionBank(QUESTION_BANK_MD);

export interface LevelBank {
  id: number;
  /** 篇名（不含《》），用於首頁「入陣」按鈕 */
  title: string;
  questions: { question: string; answers: string[]; prefill: string[] }[];
  byText: Map<string, { question: string; answers: string[]; prefill: string[] }>;
}

/** 由 data/levels.ts 讀取關卡 id、篇名及 sheetIds（不 import：該檔用到 import.meta.env，Node 端無法載入） */
const LEVELS_SRC = fs.readFileSync(path.join(ROOT, 'data/levels.ts'), 'utf8');
const LEVELS = [...LEVELS_SRC.matchAll(/id:\s*(\d+),\s*title:\s*"([^"]+)"[^\n]*?sheetIds:\s*\[([\d,\s]+)\]/g)]
  .map((m) => ({ id: +m[1], title: m[2], sheetIds: m[3].split(',').map((n) => +n.trim()) }));

export function levelBank(levelId: number): LevelBank {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) throw new Error(`找不到第 ${levelId} 關`);
  const questions = BANK.filter((q) => level.sheetIds.includes(q.id)).map((q) => ({ question: q.question, answers: q.answers, prefill: q.prefill ?? [] }));
  return { id: levelId, title: level.title.replace(/[《》]|（.*?）/g, ''), questions, byText: new Map(questions.map((q) => [q.question, q])) };
}

export function isFirebaseHost(h: string) {
  return /(^|\.)(firestore|firebase[a-z]*|identitytoolkit|securetoken|firebaseinstallations)\.googleapis\.com$/.test(h)
    || /(^|\.)(firebaseio\.com|firebaseapp\.com|web\.app)$/.test(h) || ['www.google.com', 'apis.google.com', 'www.googleapis.com'].includes(h);
}

export async function blockFirebase(context: BrowserContext) {
  await context.route('**/*', (route) => (isFirebaseHost(new URL(route.request().url()).hostname) ? route.abort() : route.fallback()));
}

/** 記錄玩家 HP 文字的每一次變化（window.__hp） */
export async function recordPlayerHp(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __hp: { t: number; v: number }[] };
    w.__hp = [];
    let last: number | null = null;
    setInterval(() => {
      const el = Array.from(document.querySelectorAll('.hp-text')).find((e) => (e.parentElement?.innerHTML || '').includes('#28a745'));
      if (!el) return;
      const v = parseInt(el.textContent || '', 10);
      if (!Number.isNaN(v) && v !== last) { w.__hp.push({ t: performance.now(), v }); last = v; }
    }, 20);
  });
}
export const hpTrail = (page: Page) => page.evaluate(() => (window as unknown as { __hp: { t: number; v: number }[] }).__hp.map((e) => e.v));

export const hpText = (page: Page, who: 'player' | 'boss') => page.evaluate((who) => {
  const el = Array.from(document.querySelectorAll('.hp-text')).find((e) => {
    const html = e.parentElement?.innerHTML || '';
    return who === 'player' ? html.includes('#28a745') : html.includes('#ff0000');
  });
  return el ? el.textContent!.trim() : null;
}, who);
export const playerHp = async (page: Page) => parseInt((await hpText(page, 'player')) || 'NaN', 10);

export async function enterAsGuest(page: Page) {
  await page.goto('./');
  await expect(page.getByText('載入中')).toHaveCount(0, { timeout: 20_000 });
  await page.getByTestId('guest-enter').click();
  await expect(page.getByRole('navigation', { name: '主選單' })).toBeVisible({ timeout: 25_000 });
}

/** 由首頁篇章卡進入戰鬥，並按「深入不毛」 */
export async function openBattle(page: Page, bank: LevelBank) {
  const enter = page.getByRole('button', { name: new RegExp(`入陣.*${bank.title}`) });
  for (let i = 0; i < 12 && !(await enter.isVisible()); i++) await page.getByRole('button', { name: '下一位古人' }).click();
  await enter.click();
  const go = page.getByRole('button', { name: '深入不毛' });
  await expect(go).toBeEnabled({ timeout: 20_000 });
  await go.click();
}

export async function enterBattle(page: Page, bank: LevelBank) {
  await enterAsGuest(page);
  await openBattle(page, bank);
  return waitTurnActive(page, bank);
}

/** 等候回合開始（有可按的字卡，且看得到本關的題目），回傳題目文字 */
export async function waitTurnActive(page: Page, bank: LevelBank, timeout = 40_000): Promise<string> {
  const qs = [...bank.byText.keys()];
  await page.waitForFunction((qs) => {
    if (!document.querySelector('.input-pad-btn:not([disabled])')) return false;
    return Array.from(document.querySelectorAll('p')).some((p) => qs.includes(p.textContent!.trim()));
  }, qs, { timeout });
  return page.evaluate((qs) => Array.from(document.querySelectorAll('p')).map((p) => p.textContent!.trim()).find((t) => qs.includes(t))!, qs);
}

export async function clickChars(page: Page, chars: string[]) {
  for (const ch of chars) {
    const ok = await page.evaluate((c) => {
      const b = Array.from(document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')).find((x) => !x.disabled && x.style.visibility !== 'hidden' && x.textContent!.trim() === c);
      if (!b) return false; b.click(); return true;
    }, ch);
    if (!ok) throw new Error('找不到選項字：' + ch);
    await page.waitForTimeout(60);
  }
}

/** 填滿所有可輸入格的錯字（不含任何答案字） */
export async function wrongChars(page: Page, bank: LevelBank, q: string) {
  const item = bank.byText.get(q)!;
  const bad = [...new Set(item.answers.join(''))];
  const n = Math.max(...item.answers.map((a) => [...a].length));
  return page.evaluate(({ bad, n }) => {
    const out: string[] = [];
    for (const b of document.querySelectorAll<HTMLButtonElement>('.input-pad-btn')) { const c = b.textContent!.trim(); if (!b.disabled && !bad.includes(c) && out.length < n) out.push(c); }
    return out;
  }, { bad, n });
}

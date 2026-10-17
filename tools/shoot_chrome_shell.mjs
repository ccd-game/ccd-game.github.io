import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = process.env.OUT || '/workspace/chrome-hotfix-2/screenshots';
const URL = process.env.SHOT_URL || 'http://127.0.0.1:4192/';
fs.mkdirSync(OUT, { recursive: true });

const chromePath = fs.existsSync('/usr/bin/google-chrome')
  ? '/usr/bin/google-chrome'
  : undefined;

const b = await chromium.launch({ executablePath: chromePath, headless: true });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce',
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e)));
p.on('console', msg => {
  if (msg.type() === 'error') errs.push('console: ' + msg.text());
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

const skip = p.getByText('跳過動畫');
try {
  await skip.waitFor({ timeout: 25000 });
  await p.waitForTimeout(600);
  await skip.click({ force: true });
} catch { /* */ }

for (const label of ['以遊客身分進入', '遊客進入', '遊客模式', '開始修煉', '進入地城']) {
  const btn = p.getByText(label, { exact: false });
  if (await btn.count()) {
    try {
      await btn.first().click({ force: true, timeout: 3000 });
      await p.waitForTimeout(500);
    } catch { /* */ }
  }
}

const guest = p.getByTestId('guest-enter');
if (await guest.count()) {
  try { await guest.click({ force: true, timeout: 3000 }); } catch { /* */ }
}

await p.locator('.home-bar-top, .home-hero, nav[aria-label="主選單"]').first().waitFor({ timeout: 45000 });
await p.waitForTimeout(1500);

const drawer = p.locator('.home-drawer');
if (await drawer.count()) {
  const drawerClass = await drawer.getAttribute('class');
  if (drawerClass && drawerClass.includes('is-open')) {
    await p.locator('.home-drawer-bar').click({ force: true });
    await p.waitForTimeout(600);
  }
}

const nav = p.locator('nav[aria-label="主選單"]');
await nav.waitFor({ timeout: 10000 });
try {
  await nav.getByRole('button', { name: '地城' }).click({ force: true });
} catch { /* */ }
await p.waitForTimeout(600);

// Wait for shell images
await p.waitForSelector('.home-chrome-shell--top img', { timeout: 10000 });
await p.waitForSelector('.home-chrome-shell--bottom img', { timeout: 10000 });
await p.waitForSelector('.home-nav-gold-frame img', { timeout: 10000 });

// Probe shell visibility
const probe = await p.evaluate(() => {
  const top = document.querySelector('.home-chrome-shell--top img');
  const bot = document.querySelector('.home-chrome-shell--bottom img');
  const gold = document.querySelector('.home-nav-gold-frame img');
  const labels = [...document.querySelectorAll('.home-nav-label')].map(el => el.textContent);
  const meiren = getComputedStyle(document.querySelector('.home-nav-label')).fontFamily;
  const topBar = document.querySelector('.home-bar-top');
  const botBar = document.querySelector('.home-bar-bottom');
  const tb = topBar?.getBoundingClientRect();
  const bb = botBar?.getBoundingClientRect();
  return {
    topLoaded: !!(top && top.complete && top.naturalWidth > 0),
    botLoaded: !!(bot && bot.complete && bot.naturalWidth > 0),
    goldLoaded: !!(gold && gold.complete && gold.naturalWidth > 0),
    topSrc: top?.currentSrc || top?.src,
    botSrc: bot?.currentSrc || bot?.src,
    labels,
    meiren,
    topH: tb?.height,
    botBottom: bb ? Math.round(bb.bottom) : null,
    viewportH: window.innerHeight,
    topPointer: getComputedStyle(document.querySelector('.home-chrome-shell--top')).pointerEvents,
  };
});
console.log('probe', JSON.stringify(probe, null, 2));

const full = path.join(OUT, 'home-chrome-390.png');
await p.screenshot({ path: full, type: 'png' });
console.log('wrote', full);

await p.screenshot({
  path: path.join(OUT, 'home-chrome-top-390.png'),
  clip: { x: 0, y: 0, width: 390, height: 120 },
  type: 'png',
});
await p.screenshot({
  path: path.join(OUT, 'home-chrome-bottom-390.png'),
  clip: { x: 0, y: 844 - 120, width: 390, height: 120 },
  type: 'png',
});
console.log('wrote top/bottom crops');
if (errs.length) console.log('errs', errs.slice(0, 10));
await b.close();

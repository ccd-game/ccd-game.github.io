import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('home-chrome HUD 暱稱／校名權重', () => {
  const css = readFileSync(resolve(__dirname, 'styles/home-chrome.css'), 'utf8');

  it('.home-hud-vnext-name 為 400', () => {
    const m = css.match(/\.home-hud-vnext-name\s*\{[^}]*font-weight:\s*(\d+)/);
    expect(m?.[1]).toBe('400');
  });

  it('.home-hud-vnext-school 為 400', () => {
    const m = css.match(/\.home-hud-vnext-school\s*\{[^}]*font-weight:\s*(\d+)/);
    expect(m?.[1]).toBe('400');
  });

  it('未改名／校字級（18px／12px）', () => {
    expect(css).toMatch(/\.home-hud-vnext-name\s*\{[^}]*font-size:\s*18px/s);
    expect(css).toMatch(/\.home-hud-vnext-school\s*\{[^}]*font-size:\s*12px/s);
  });
});

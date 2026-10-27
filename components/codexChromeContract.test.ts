import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * 圖鑑內頁 chrome：描述紙面與首頁 peek 抽屜共用 .peek-sheet；
 * 頂欄只走液態玻璃。不改綠線 493.5／hostH（那是另一條 PR）。
 */
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./CharacterDetailView.tsx', import.meta.url), 'utf8');
const drawer = readFileSync(new URL('./tabs/DungeonTab.tsx', import.meta.url), 'utf8');

describe('codex detail chrome contract', () => {
  it('keeps the green-line rect at 493.5 (no 400.8 host lift)', () => {
    expect(css).toContain('--peek-h: calc(100% - (493.5px - var(--hud-vnext-zone-h)))');
    expect(css).not.toContain('522.6');
  });

  it('shares one peek-sheet rule for the drawer and the detail desc', () => {
    expect(drawer).toContain('home-drawer peek-sheet');
    expect(detail).toContain('peek-sheet');
    expect(css).toMatch(/\.peek-sheet\s*\{[^}]*rgba\(244,\s*240,\s*232,\s*0\.80\)/);
    expect(css).toMatch(/\.peek-sheet\s*\{[^}]*border-radius:\s*var\(--peek-sheet-radius/);
    expect(css).toMatch(/\.codex-inner-desc\.peek-sheet\s*\{[^}]*padding-top:\s*var\(--peek-sheet-pad-y/);
    expect(css).toMatch(/\.codex-inner-desc\.peek-sheet\s*\{[^}]*padding-bottom:\s*var\(--peek-sheet-pad-y/);
  });

  it('paints detail top chrome as medium glass over the page, with no second background', () => {
    const start = css.indexOf('.codex-inner-top-frost {');
    const block = css.slice(start, css.indexOf('}', start) + 1);
    expect(block).toContain('backdrop-filter: blur(var(--glass-medium-blur');
    expect(block).toContain('var(--glass-ink-edge');
    expect(block).toContain('background: none');
    expect(block).not.toContain('background-image');
    expect(block).not.toContain('rgba(244, 240, 232');
    expect(block).toContain('var(--hud-vnext-zone-h');
    expect(detail).not.toContain('codex-inner-scene-extend');
    expect(detail).not.toContain('codex-inner-desc-shanshui');
    expect(css).not.toContain('.codex-inner-scene-extend');
    expect(css).not.toContain('.codex-inner-desc-shanshui');
  });

  it('does not special-case Confucius on the detail shell', () => {
    const shell = detail.slice(detail.indexOf('return ('), detail.indexOf('const CompactStat'));
    expect(shell).not.toMatch(/kong_zi|孔子|char\.id\s*===/);
  });
});

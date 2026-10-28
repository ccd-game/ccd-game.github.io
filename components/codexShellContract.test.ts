import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * 圖鑑內頁與 peek 同構：不另鋪戰景／宣紙複本，紙透 .home-menu-shell。
 * 頂紙 α 0.42、描述紙 α 0.876，皆不 blur。綠線 493.5 與抽屜紙不動；抽屜同禁 blur（純 α 透殼）。
 */
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./CharacterDetailView.tsx', import.meta.url), 'utf8');

function block(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return source.slice(start, source.indexOf('}', start) + 1);
}

describe('codex detail shell contract', () => {
  it('keeps the peek green-line rect and the drawer sheet', () => {
    expect(css).toContain('--peek-h: calc(100% - (493.5px - var(--hud-vnext-zone-h)))');
    const drawer = block(css, '.home-drawer {');
    expect(drawer).toContain('rgba(244, 240, 232, 0.80)');
    expect(drawer).toContain('backdrop-filter: none');
    expect(drawer).not.toContain('blur(');
  });

  it('drops the detail battle and shanshui underlays', () => {
    expect(detail).not.toContain('codex-inner-scene-extend');
    expect(detail).not.toContain('codex-inner-desc-shanshui');
    expect(detail).not.toContain('HOME_SHANSHUI');
    expect(detail).not.toContain('fadeIn');
    expect(css).not.toContain('.codex-inner-scene-extend');
    expect(css).not.toContain('.codex-inner-desc-shanshui');
  });

  it('lets the top frost show the shell without a second paint', () => {
    const frost = block(css, '.codex-inner-top-frost {');
    expect(frost).toContain('rgba(244, 240, 232, 0.42)');
    expect(frost).toContain('backdrop-filter: none');
    expect(frost).toContain('background-image: none');
    expect(frost).toContain('var(--hud-vnext-zone-h');
    expect(frost).not.toContain('blur(');
    expect(frost).not.toContain('background-size');
  });

  it('keeps the detail root from becoming a backdrop root', () => {
    const inner = block(css, '.codex-inner {');
    expect(inner).toContain('backdrop-filter: none');
    expect(inner).toContain('animation: none');
    expect(inner).not.toContain('blur(');
  });

  it('tints the description sheet at the peek-row weight, unblurred', () => {
    const sheet = block(css, '.codex-inner-desc.peek-sheet {');
    expect(sheet).toContain('rgba(244, 240, 232, 0.876)');
    expect(sheet).toContain('backdrop-filter: none');
    expect(sheet).toContain('padding-top: var(--peek-sheet-pad-y');
    expect(sheet).not.toContain('blur(');
    expect(detail).toContain('peek-sheet');
  });
});

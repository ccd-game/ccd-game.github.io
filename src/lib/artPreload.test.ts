import { describe, expect, it } from 'vitest';
import { LEVELS_DATA } from '../../data/levels';
import { collectAllArt } from './artPreload';

describe('collectAllArt', () => {
  it('收集所有關卡背景、立繪與分層人物圖（去重）', () => {
    const urls = collectAllArt(LEVELS_DATA);
    expect(new Set(urls).size).toBe(urls.length);
    for (const l of LEVELS_DATA) {
      expect(urls).toContain(l.bgImg);
      expect(urls).toContain(l.bossImg);
    }
    expect(urls.some(u => u.endsWith('liu_zong_yuan_character.png'))).toBe(true);
    expect(urls.some(u => u.endsWith('liu_zong_yuan_effect.png'))).toBe(true);
    expect(urls.every(u => /\.(png|jpe?g|webp)$/i.test(u))).toBe(true);
  });
  it('有 WebP 版本時優先用 WebP', () => {
    const png = LEVELS_DATA[0].bgImg!;
    const webp = png.replace(/\.png$/, '.webp');
    const urls = collectAllArt(LEVELS_DATA, new Set([webp]));
    expect(urls).toContain(webp);
    expect(urls).not.toContain(png);
  });
});

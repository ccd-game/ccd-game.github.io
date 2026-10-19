/**
 * soukou-display-expand-r1：子集須含沈香林示意校名／暱稱等關鍵字。
 * 以 child_process 呼叫 fontTools（vitest 環境無直接綁定 woff2 解碼時）。
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const woff2 = resolve(__dirname, '../public/fonts/soukou-display.woff2');

describe('soukou-display.woff2 cmap', () => {
  it('檔案存在', () => {
    expect(existsSync(woff2)).toBe(true);
  });

  it('含佛教沈香林紀念中學、林同學、歐陽同學、卜維廉等', () => {
    const py = `
from fontTools.ttLib import TTFont
cmap = TTFont(${JSON.stringify(woff2)}).getBestCmap()
for s in ["佛教沈香林紀念中學","林同學","歐陽同學","救世軍卜維廉中學","等級","體力","銅錢","EXP"]:
  miss = [c for c in s if ord(c) not in cmap]
  assert not miss, f"{s} missing {miss}"
print("ok", len(cmap))
`;
    const r = spawnSync('python3', ['-c', py], { encoding: 'utf-8' });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(r.stdout).toMatch(/ok \d+/);
  });
});

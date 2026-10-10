import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AMBIGUOUS_SPACED_COMPOUNDS, CJK_SURNAME_RE, SURNAME_MAP, validateSurnameMap } from './surnames';
import raw from './surname_map.json';

describe('surname_map.json', () => {
  it('與原始資料檔 /workspace/surnames/surname_map.json 一致（若原檔存在）', () => {
    let original: string | null = null;
    try {
      original = readFileSync('/workspace/surnames/surname_map.json', 'utf8');
    } catch {
      original = null; // 其他電腦沒有原檔時略過
    }
    if (original !== null) expect(readFileSync(resolve(__dirname, 'surname_map.json'), 'utf8')).toBe(original);
  });
  it('共 266 個拼寫：auto 187、choose 79', () => {
    const entries = Object.values(raw as Record<string, { mode: string }>);
    expect(entries.length).toBe(266);
    expect(entries.filter((e) => e.mode === 'auto').length).toBe(187);
    expect(entries.filter((e) => e.mode === 'choose').length).toBe(79);
  });
  it('沒有任何格式問題：每個選項都是一至兩個中文字', () => {
    expect(validateSurnameMap(raw)).toEqual([]);
    for (const e of Object.values(SURNAME_MAP)) for (const o of e.options) expect(o).toMatch(CJK_SURNAME_RE);
    expect(Object.keys(SURNAME_MAP).length).toBe(266);
  });
  it('validateSurnameMap 會找出錯誤', () => {
    const bad = {
      Chan: { options: ['陳'], mode: 'auto' },
      lee: { options: ['Lee'], mode: 'auto' },
      wong: { options: ['黃'], mode: 'choose' },
      ho: { options: ['何何何'], mode: 'auto' },
      ng: { options: ['吳'], mode: 'maybe' },
    };
    const keys = validateSurnameMap(bad).map((p) => p.key);
    expect(new Set(keys)).toEqual(new Set(['Chan', 'lee', 'wong', 'ho', 'ng']));
  });
  it('五個以空格分開時有歧義的複姓都在對照表內', () => {
    for (const k of AMBIGUOUS_SPACED_COMPOUNDS) expect(SURNAME_MAP[k]).toBeDefined();
  });
});

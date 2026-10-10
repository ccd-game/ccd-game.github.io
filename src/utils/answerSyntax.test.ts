/** 答案欄語法與判定（移植自 prefill.patch 的 answerSyntax.check.ts，改用 vitest） */
import { describe, expect, it, vi } from 'vitest';
import { parseAnswerCell, ELLIPSIS } from './answerSyntax';
import { evaluateInput, editableCellCount, MatchCell } from './answerMatch';
import { parseQuestionBank } from './questionParser';

const same = (raw: string, prefill: string[], answers: string[], warnings = 0) => {
  const r = parseAnswerCell(raw);
  expect(r.prefill).toEqual(prefill);
  expect(r.answers).toEqual(answers);
  expect(r.warnings.length).toBe(warnings);
};

describe('parseAnswerCell：有效語法', () => {
  it('沒有預填', () => { same('讚美/嘉許', [], ['讚美', '嘉許']); same('師不必賢於弟子', [], ['師不必賢於弟子']); });
  it('半形 [以…]為恥', () => same('[以…]為恥', ['以', ELLIPSIS], ['為恥']));
  it('半形 [以…]為恥/感到羞恥', () => same('[以…]為恥/感到羞恥', ['以', ELLIPSIS], ['為恥', '感到羞恥']));
  it('全形括號＋全形斜線', () => same('［以…］為恥／感到羞恥', ['以', ELLIPSIS], ['為恥', '感到羞恥']));
  it('混用括號', () => same('[以…］為恥', ['以', ELLIPSIS], ['為恥']));
  it('各種省略號 → 一格 …', () => { for (const e of ['...', '……', '⋯', '⋯⋯', '．．', '.....']) same(`[以${e}]為恥`, ['以', ELLIPSIS], ['為恥']); });
  it('多字預填 [使之]富/強', () => same('[使之]富/強', ['使', '之'], ['富', '強']));
  it('空白忽略', () => same('  [ 以 … ] 為恥 / 感到 羞恥 ', ['以', ELLIPSIS], ['為恥', '感到羞恥']));
  it('每個答案寫相同預填 → 共用', () => same('[以…]為恥/[以…]感到羞恥', ['以', ELLIPSIS], ['為恥', '感到羞恥']));
  it('轉義字面括號', () => { same('\\[注\\]甲', [], ['[注]甲']); same('[\\［甲\\］]乙', ['［', '甲', '］'], ['乙']); });
  it('空答案片段略去', () => same('甲//乙', [], ['甲', '乙']));
  it('全形分隔 全都／都／皆', () => same('全都／都／皆', [], ['全都', '都', '皆']));
});

describe('parseAnswerCell：格式錯誤（只警告，退回沒有預填）', () => {
  it('未閉合', () => same('[以…為恥/感到羞恥', [], ['以為恥', '感到羞恥'], 2));
  it('預填不一致', () => same('[以…]為恥/[於…]感到羞恥', [], ['以為恥', '於感到羞恥'], 3));
  it('只有第二個答案有預填', () => same('為恥/[以…]感到羞恥', [], ['為恥', '以感到羞恥'], 2));
  it('空預填', () => same('[]甲', [], ['甲'], 1));
  it('只有預填', () => same('[以…]', [], ['以'], 1));
  it('可輸入部分有省略號', () => same('以...為恥', [], ['以為恥'], 1));
  it('括號不在開頭', () => same('為[恥]', [], ['為恥'], 1));
  it('空欄', () => { const r = parseAnswerCell('  '); expect(r.answers).toEqual([]); expect(r.warnings.length).toBeGreaterThan(0); });
});

describe('parseQuestionBank', () => {
  it('解析 [預填]、/ ／；警告附行號；沒有答案的題目略去', () => {
    const warn = vi.fn();
    const md = ['| ID | 類型 | 題目 | 答案 |', '|:---:|:---:|:---|:---|', '| 4 | 語譯 | 甲 | [以…]為恥 |', '| 4 | 語譯 | 乙 | 全都／都/皆 |', '| 4 | 語譯 | 丙 | [以…為恥 |', '| 4 | 語譯 | 丁 |   |'].join('\n');
    const qs = parseQuestionBank(md, warn);
    expect(qs.map((q) => [q.question, q.prefill, q.answers])).toEqual([
      ['甲', ['以', ELLIPSIS], ['為恥']],
      ['乙', [], ['全都', '都', '皆']],
      ['丙', [], ['以為恥']],
    ]);
    expect(warn.mock.calls.some(([m]) => /^第 5 行（ID 4）：/.test(m))).toBe(true);
  });
});

const cells = (prefill: string[], input: string, n: number): MatchCell[] => [
  ...prefill.map((c) => ({ char: c, locked: true })),
  ...Array.from({ length: n }, (_, i) => ({ char: Array.from(input)[i] ?? '' })),
];

describe('evaluateInput / editableCellCount', () => {
  const ans = ['為恥', '感到羞恥'];
  const n = editableCellCount(ans);
  it('格數＝最長答案（以字元計）', () => { expect(n).toBe(4); expect(editableCellCount(['𠀋甲'])).toBe(2); });
  it('較短答案不必填滿', () => expect(evaluateInput(cells(['以', '…'], '為恥', n), ans)).toBe('correct'));
  it('較長答案', () => expect(evaluateInput(cells(['以', '…'], '感到羞恥', n), ans)).toBe('correct'));
  it('前綴 → 未完成', () => { expect(evaluateInput(cells(['以', '…'], '感到', n), ans)).toBe('incomplete'); expect(evaluateInput(cells(['以', '…'], '羞恥', n), ans)).toBe('incomplete'); });
  it('填滿不符 → 錯', () => expect(evaluateInput(cells(['以', '…'], '感到羞愧', n), ans)).toBe('wrong'));
  it('只有預填 → 未完成', () => expect(evaluateInput(cells(['以', '…'], '', n), ans)).toBe('incomplete'));
  it('中間清空一格不會被當作較短答案', () => {
    const c = cells([], '為', 4); c[2] = { char: '恥' };
    expect(evaluateInput(c, ans)).toBe('incomplete');
  });
  it('全都/都/皆', () => {
    const multi = ['全都', '都', '皆'];
    expect(editableCellCount(multi)).toBe(2);
    for (const a of multi) expect(evaluateInput(cells([], a, 2), multi)).toBe('correct');
    expect(evaluateInput(cells([], '全', 2), multi)).toBe('incomplete');
    expect(evaluateInput(cells([], '全部', 2), multi)).toBe('wrong');
  });
});

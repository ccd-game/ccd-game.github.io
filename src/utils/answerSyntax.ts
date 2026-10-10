/**
 * 題庫「答案」欄語法（詳見 /workspace/prefill/SYNTAX.md）
 *
 *   [以…]為恥/感到羞恥    → 預填格「以」「…」（學生不能更改）；可接受答案「為恥」或「感到羞恥」
 *   ［以…］為恥／感到羞恥  → 全形括號、全形斜線，效果相同
 *   讚美/嘉許              → 沒有預填（舊格式不變）
 *
 * 規則：
 * - 預填寫在答案欄最前面，以 [ ] 或 ［ ］ 包住（半形、全形可混用），適用於全部可接受答案。
 * - 不支援每個答案各自不同的預填；若每個答案都寫上「相同」的預填，視同共用預填。
 * - 省略號 ...（兩點或以上）、．．、…、⋯（一個或多個）一律化為一格「…」。省略號只可出現在預填內；
 *   在可輸入部分出現會發出警告並刪去（「…」永遠不會成為字卡）。
 * - 字面括號或反斜線：\[ \] \［ \］ \\。
 * - 格式錯誤只會發出警告（不會令遊戲停止），並以最安全的方式處理：取消預填，所有字都由學生輸入。
 */

export const ELLIPSIS = '…';
const OPEN = new Set(['[', '［']);
const CLOSE = new Set([']', '］']);
const ELLIPSIS_RE = /\.{2,}|．{2,}|[…⋯]+/g;
// 轉義字元的暫存代號（Unicode 私用區，不會出現在題庫）
const ESC: Record<string, string> = { '[': '\uE000', ']': '\uE001', '［': '\uE002', '］': '\uE003', '\\': '\uE004' };
const UNESC: Record<string, string> = Object.fromEntries(Object.entries(ESC).map(([k, v]) => [v, k]));

export interface ParsedAnswerCell {
  /** 預填格（每格一字；可包括「…」）；沒有預填時為空陣列 */
  prefill: string[];
  /** 可接受答案（只含學生要輸入的部分） */
  answers: string[];
  /** 警告訊息（格式錯誤等） */
  warnings: string[];
}

const chars = (s: string) => Array.from(s);
const normalizeEllipsis = (s: string) => s.replace(ELLIPSIS_RE, ELLIPSIS);
const unescape = (s: string) => s.replace(/[\uE000-\uE004]/g, c => UNESC[c]);

interface Alt { prefix: string | null; body: string }

/** 拆出一個答案開頭的 [預填]；回傳 null 表示沒有預填 */
function splitLeadingPrefix(alt: string, warnings: string[]): Alt {
  const s = alt.trim();
  const first = chars(s)[0];
  if (!first || !OPEN.has(first)) return { prefix: null, body: s };
  const rest = chars(s).slice(1);
  const closeAt = rest.findIndex(c => CLOSE.has(c));
  if (closeAt < 0) {
    warnings.push(`預填括號未閉合：「${unescape(s)}」；已當作沒有預填`);
    return { prefix: null, body: rest.join('') };
  }
  return { prefix: rest.slice(0, closeAt).join('').replace(/\s/g, ''), body: rest.slice(closeAt + 1).join('').trim() };
}

/** 清理可輸入部分：刪去未轉義的括號及省略號（發出警告）、空白 */
function cleanBody(body: string, warnings: string[]): string {
  let s = body.replace(/\s/g, '');
  if (chars(s).some(c => OPEN.has(c) || CLOSE.has(c))) {
    warnings.push(`答案「${unescape(s)}」中有括號不在開頭；已刪去（如需字面括號請寫 \\[ \\]）`);
    s = chars(s).filter(c => !OPEN.has(c) && !CLOSE.has(c)).join('');
  }
  const n = normalizeEllipsis(s);
  if (n.includes(ELLIPSIS)) {
    warnings.push(`答案「${unescape(n)}」的可輸入部分含省略號；省略號只可放在預填 [ ] 內，已刪去`);
    s = n.split(ELLIPSIS).join('');
  }
  return unescape(s);
}

/** 解析一格答案欄 */
export function parseAnswerCell(raw: string): ParsedAnswerCell {
  const warnings: string[] = [];
  const escaped = raw.replace(/\\([[\]［］\\])/g, (_, c: string) => ESC[c]);
  const alts: Alt[] = escaped.split(/[/／]/).map(a => splitLeadingPrefix(a, warnings)).filter(a => a.prefix !== null || a.body.length > 0);

  const prefixes = alts.map(a => a.prefix);
  const firstPrefix = prefixes[0] ?? null;
  let shared: string | null = null;
  let mismatch = false;
  if (firstPrefix !== null) {
    const others = prefixes.slice(1);
    if (others.every(p => p === null) || others.every(p => p === firstPrefix)) shared = firstPrefix;
    else mismatch = true;
  } else if (prefixes.some(p => p !== null)) mismatch = true;

  if (mismatch) warnings.push(`各答案的預填不一致（${prefixes.map(p => p === null ? '無' : `[${unescape(p)}]`).join('、')}）；不支援個別預填，已取消預填，所有字改由學生輸入`);
  if (shared !== null && shared.length === 0) { warnings.push('預填 [ ] 是空的；已忽略'); shared = null; }

  let prefill: string[] = [];
  if (shared !== null) {
    const p = normalizeEllipsis(shared);
    prefill = chars(p).map(c => (c in UNESC ? UNESC[c] : c));
  }

  const answers: string[] = [];
  for (const a of alts) {
    // 預填不一致時，把各自的預填字（不含省略號）放回答案開頭，讓學生輸入
    const body = mismatch && a.prefix ? a.prefix + a.body : a.body;
    const cleaned = cleanBody(body, warnings);
    if (cleaned.length > 0) answers.push(cleaned);
    else if (a.body.length > 0 || mismatch) warnings.push(`答案「${unescape(a.body)}」清理後是空的；已略去`);
  }

  if (answers.length === 0 && prefill.length > 0) {
    // 只有預填、沒有可輸入部分：改為由學生輸入預填字（不含省略號）
    warnings.push('只有預填、沒有可輸入的答案；已取消預填，改由學生輸入預填字');
    const fallback = prefill.filter(c => c !== ELLIPSIS).join('');
    prefill = [];
    if (fallback) answers.push(fallback);
  }
  if (answers.length === 0) warnings.push('沒有可接受答案');
  return { prefill, answers, warnings };
}

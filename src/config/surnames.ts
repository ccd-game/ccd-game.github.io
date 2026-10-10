/**
 * 英文拼寫 → 中文姓氏對照表（唯一載入點）
 *
 * 資料：src/config/surname_map.json（原檔 /workspace/surnames/surname_map.json，未經修改）
 * 格式：{ "<小寫、無空格及連字號的拼寫>": { "options": ["陳", ...], "mode": "auto" | "choose" } }
 *   - auto：直接採用 options[0]，學生毋須選擇
 *   - choose：學生在 options 之中選擇
 *
 * 更換資料：直接以新的 surname_map.json 覆蓋同名檔案，然後執行 `npm run test:unit`
 * （測試會檢查每個選項都是一至兩個中文字、mode 合法、鍵值已正規化）。程式碼毋須修改。
 */
import rawMap from './surname_map.json';

export type SurnameMode = 'auto' | 'choose';
export interface SurnameEntry {
  options: string[];
  mode: SurnameMode;
}

/** 一至兩個中文字（與 firestore.rules 的 \p{Han}{1,2} 相同） */
export const CJK_SURNAME_RE = /^\p{Script=Han}{1,2}$/u;

/**
 * 以空格分開時可能是「單姓＋名字首字」的複姓（CCD 文案指定的五個）。
 * 例如「Wong Fu」可能是皇甫，亦可能是姓黃、名字以 Fu 開首。須讓學生選擇。
 * 連寫（Wongfu）或以連字號連接（Wong-Fu）則直接採用複姓。
 */
export const AMBIGUOUS_SPACED_COMPOUNDS: readonly string[] = ['wongfu', 'lingwu', 'hahau', 'moyung', 'tungfong'];

export interface SurnameMapProblem {
  key: string;
  problem: string;
}

/** 檢查對照表；回傳所有問題（空陣列表示全部合格） */
export function validateSurnameMap(map: unknown): SurnameMapProblem[] {
  const problems: SurnameMapProblem[] = [];
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [{ key: '*', problem: '不是物件' }];
  for (const [key, entry] of Object.entries(map as Record<string, unknown>)) {
    if (!/^[a-z]+$/.test(key)) problems.push({ key, problem: '鍵值須為小寫英文字母（無空格、連字號）' });
    const e = entry as Partial<SurnameEntry> | null;
    if (!e || typeof e !== 'object') {
      problems.push({ key, problem: '項目不是物件' });
      continue;
    }
    if (e.mode !== 'auto' && e.mode !== 'choose') problems.push({ key, problem: `mode 不合法：${String(e.mode)}` });
    if (!Array.isArray(e.options) || e.options.length === 0) {
      problems.push({ key, problem: 'options 須為非空陣列' });
      continue;
    }
    for (const o of e.options) {
      if (typeof o !== 'string' || !CJK_SURNAME_RE.test(o)) problems.push({ key, problem: `選項不是一至兩個中文字：${String(o)}` });
    }
    if (new Set(e.options).size !== e.options.length) problems.push({ key, problem: 'options 有重複' });
    if (e.mode === 'choose' && e.options.length < 2) problems.push({ key, problem: 'choose 須有至少兩個選項' });
  }
  return problems;
}

function loadSurnameMap(map: unknown): Readonly<Record<string, SurnameEntry>> {
  const problems = validateSurnameMap(map);
  if (problems.length > 0) {
    // 不令遊戲崩潰：略過有問題的項目，並在主控台列出（單元測試會令這種情況失敗）
    console.error('surname_map.json 有問題，已略過相關項目：', problems);
  }
  const bad = new Set(problems.map((p) => p.key));
  const out: Record<string, SurnameEntry> = Object.create(null);
  for (const [key, entry] of Object.entries((map ?? {}) as Record<string, SurnameEntry>)) {
    if (!bad.has(key)) out[key] = { options: [...entry.options], mode: entry.mode };
  }
  return Object.freeze(out);
}

export const SURNAME_MAP = loadSurnameMap(rawMap);

export function lookupSurname(key: string): SurnameEntry | null {
  return Object.prototype.hasOwnProperty.call(SURNAME_MAP, key) ? SURNAME_MAP[key] : null;
}

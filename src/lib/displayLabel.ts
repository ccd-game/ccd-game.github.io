/**
 * 排行榜顯示名稱：「學校名稱 + 中文姓氏 + 同學」，例如「救世軍卜維廉中學 陳同學」。
 * 絕不顯示全名，亦不顯示英文拼寫。純函式，方便單元測試（src/lib/displayLabel.test.ts）。
 *
 * 格式（亦由 firestore.rules 檢查）：
 *   displayLabel = `${學校名稱} ${surname}同學`
 *   surname 為一至兩個中文字，或空字串（未選擇／無法判斷）→「救世軍卜維廉中學 同學」
 *
 * 英文拼寫的比對規則（CCD 文案）：
 *   1. 不分大小寫，忽略空格及連字號（Au-Yeung、Au Yeung、Auyeung → auyeung）
 *   2. 有 Google family_name 時優先使用
 *   3. 否則先以首兩個詞合併比對複姓（Au Yeung Ka Ho → auyeung），不中再以首詞比對；不會使用末詞
 *   4. 對照表沒有的拼寫 → 由學生輸入中文姓氏
 *   5. 以空格分開的 Wong Fu／Ling Wu／Ha Hau／Mo Yung／Tung Fong → 讓學生在複姓與單姓之間選擇
 *   6. 以中文書寫的姓名維持原有做法（取第一段漢字的姓，含複姓），不需選擇
 */
import { schoolNameForEmail } from '../config/auth';
import { AMBIGUOUS_SPACED_COMPOUNDS, CJK_SURNAME_RE, SurnameEntry, lookupSurname } from '../config/surnames';

export interface NameProfile {
  /** Google 顯示名稱（user.displayName 或 OAuth profile.name） */
  displayName?: string | null;
  /** Google OAuth profile.family_name（只在剛以彈出視窗／重新導向登入時取得，只在記憶體使用） */
  familyName?: string | null;
  /** Google OAuth profile.given_name（目前未使用） */
  givenName?: string | null;
}

export type SurnameResolution =
  /** 以中文書寫的姓名 */
  | { kind: 'han'; surname: string }
  /** 對照表 auto：直接採用 */
  | { kind: 'auto'; surname: string }
  /** 對照表 choose，或以空格分開的歧義複姓：由學生在 options 中選擇 */
  | { kind: 'choose'; options: string[]; reason: 'map' | 'ambiguous-compound' }
  /** 對照表沒有此拼寫：由學生輸入 */
  | { kind: 'unknown' };

export const LABEL_SUFFIX = '同學';
export const FALLBACK_SHORT_LABEL = '同學';
export const DISPLAY_LABEL_MAX = 40;

/** 以中文書寫姓名時辨認的複姓（繁體為主，附常見簡體寫法） */
export const COMPOUND_SURNAMES: readonly string[] = [
  '歐陽', '司徒', '上官', '諸葛', '司馬', '東方', '皇甫', '尉遲', '公孫', '慕容', '長孫', '夏侯',
  '端木', '令狐', '西門', '南宮', '宇文', '澹臺', '澹台', '軒轅', '鍾離', '鐘離', '呼延', '聞人',
  '赫連', '申屠', '万俟', '太史', '獨孤', '濮陽', '淳于', '單于', '拓跋', '百里', '東郭', '公羊',
  '公冶', '左丘', '宗政', '司空', '司寇', '顓孫', '壤駟', '漆雕', '樂正', '穀梁', '巫馬', '公西',
  '梁丘', '羊舌', '微生', '第五', '段干', '夾谷', '子車', '公良', '宰父', '南門', '東門',
  // 簡體
  '欧阳', '诸葛', '司马', '尉迟', '公孙', '长孙', '令狐', '轩辕', '钟离', '闻人', '赫连', '独孤', '单于', '上官',
];

const HAN_RUN = /\p{Script=Han}+/gu;
const HAN_ONLY = /^\p{Script=Han}+$/u;

/** 正規化英文拼寫：小寫、刪去空格及連字號 */
export function normaliseRomanisation(s: string): string {
  return s.toLowerCase().replace(/[\s\-‐‑–]+/g, '');
}

/**
 * 把姓名拆成詞（以空格、逗號等分隔）。每個詞須只含英文字母，可用連字號相連
 * （Au-Yeung 視為一個詞 auyeung）；含數字或其他符號的詞（學號、班號）整個捨棄。
 */
export function romanWords(s: string): string[] {
  return s
    .split(/[\s,;/()（）、，]+/)
    .filter((w) => /^[A-Za-z]+(?:[-‐‑–][A-Za-z]+)*$/.test(w))
    .map(normaliseRomanisation);
}

/** 由一串漢字取姓：先比對複姓，否則取第一個字 */
function surnameFromHan(han: string): string {
  const chars = Array.from(han);
  if (chars.length >= 2 && COMPOUND_SURNAMES.includes(chars[0] + chars[1])) return chars[0] + chars[1];
  return chars[0];
}

const isCompoundEntry = (e: SurnameEntry) => e.options.every((o) => Array.from(o).length === 2);
const dedupe = (xs: string[]) => Array.from(new Set(xs));

function fromEntry(e: SurnameEntry): SurnameResolution {
  return e.mode === 'auto' ? { kind: 'auto', surname: e.options[0] } : { kind: 'choose', options: [...e.options], reason: 'map' };
}

/** 規則 3、5：首兩詞合併（只接受複姓項目）→ 首詞；絕不使用末詞 */
function resolveWords(words: string[]): SurnameResolution {
  if (words.length >= 2) {
    const key = words[0] + words[1];
    const entry = lookupSurname(key);
    if (entry && isCompoundEntry(entry)) {
      if (AMBIGUOUS_SPACED_COMPOUNDS.includes(key)) {
        const single = lookupSurname(words[0]);
        return { kind: 'choose', options: dedupe([...entry.options, ...(single?.options ?? [])]), reason: 'ambiguous-compound' };
      }
      return fromEntry(entry);
    }
  }
  if (words.length >= 1) {
    const entry = lookupSurname(words[0]);
    if (entry) return fromEntry(entry);
  }
  return { kind: 'unknown' };
}

/** 推算姓氏（見檔案開首的規則） */
export function resolveSurname(profile: NameProfile | null | undefined): SurnameResolution {
  const familyName = (profile?.familyName ?? '').trim();
  const displayName = (profile?.displayName ?? '').trim();

  // 規則 6：中文書寫
  if (familyName && HAN_ONLY.test(familyName.replace(/\s+/g, ''))) {
    return { kind: 'han', surname: surnameFromHan(familyName.replace(/\s+/g, '')) };
  }
  const hanRuns = displayName.match(HAN_RUN);
  if (hanRuns && hanRuns.length > 0) {
    return { kind: 'han', surname: surnameFromHan(hanRuns[0]) };
  }

  // 規則 2：family_name 優先（有可用的英文詞時即以它為準，不再看顯示名稱）
  const familyWords = romanWords(familyName);
  if (familyWords.length > 0) return resolveWords(familyWords);

  // 規則 3：顯示名稱
  const displayWords = romanWords(displayName);
  if (displayWords.length > 0) return resolveWords(displayWords);

  return { kind: 'unknown' };
}

/** 只接受一至兩個中文字，否則回傳空字串 */
export function sanitizeSurname(surname: string | null | undefined): string {
  if (typeof surname !== 'string') return '';
  const s = surname.trim();
  return CJK_SURNAME_RE.test(s) ? s : '';
}

export type ManualSurnameResult = { ok: true; surname: string } | { ok: false; message: string };

/** 學生手動輸入的姓氏：去除前後及中間空白後，須為一至兩個中文字 */
export function validateManualSurname(input: string): ManualSurnameResult {
  const s = (input ?? '').replace(/[\s\u3000]+/g, '');
  if (s.length === 0) return { ok: false, message: '請輸入你的中文姓氏。' };
  if (!CJK_SURNAME_RE.test(s)) return { ok: false, message: '姓氏須為一至兩個中文字，例如「陳」或「歐陽」。' };
  return { ok: true, surname: s };
}

export function labelFor(school: string, surname: string): string {
  return `${school} ${sanitizeSurname(surname)}${LABEL_SUFFIX}`.slice(0, DISPLAY_LABEL_MAX);
}

/** 排行榜顯示名稱；電郵不屬於任何學校時只回傳「同學」 */
export function buildDisplayLabel(email: string | null | undefined, surname: string | null | undefined): string {
  const school = schoolNameForEmail(email);
  if (!school) return FALLBACK_SHORT_LABEL;
  return labelFor(school, sanitizeSurname(surname));
}

/** 本人畫面頂部用的短稱，例如「陳同學」 */
export function shortLabelFor(surname: string | null | undefined): string {
  return `${sanitizeSurname(surname)}${LABEL_SUFFIX}`;
}

/** 安全地讀取 Firestore 文件中的顯示名稱；絕不使用 name / displayName 等舊欄位 */
export function safeDisplayLabel(data: { displayLabel?: unknown } | null | undefined): string {
  const label = data?.displayLabel;
  if (typeof label !== 'string') return FALLBACK_SHORT_LABEL;
  const clean = label.replace(/[^\p{Script=Han} ]/gu, '').slice(0, DISPLAY_LABEL_MAX);
  return clean.endsWith(LABEL_SUFFIX) ? clean : FALLBACK_SHORT_LABEL;
}

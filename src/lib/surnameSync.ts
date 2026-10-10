/**
 * 登入時姓氏同步的決定邏輯（純函式，方便單元測試；src/lib/surnameSync.test.ts）。
 * Firestore 讀寫在 src/lib/firebase.ts 的 syncUserProfile()。
 */
import { CJK_SURNAME_RE } from '../config/surnames';
import { SurnameResolution } from './displayLabel';

/**
 * 姓氏來源：
 * - han：由中文姓名取得　- auto：對照表自動對應
 * - chosen：學生在選項中選擇　- manual：學生自行輸入（包括 choose 視窗的「其他（自行輸入）」）
 * - pending：須由學生選擇／輸入，尚未完成（排行榜顯示「學校 同學」）
 * - none：學生選擇暫不顯示姓氏
 * chosen／manual／none 由學生決定，之後登入不會被覆寫。
 */
export type SurnameSource = 'han' | 'auto' | 'chosen' | 'manual' | 'pending' | 'none';
export const SURNAME_SOURCES: readonly SurnameSource[] = ['han', 'auto', 'chosen', 'manual', 'pending', 'none'];
export const USER_DECIDED: readonly SurnameSource[] = ['chosen', 'manual', 'none'];

/** 只有本人可讀寫的 users/{uid}/private/surname 內容（只存中文字） */
export interface PrivateSurnameDoc {
  options: string[];
  /** true：只以文字輸入（對照表沒有、或只有一個對應）；false：在 options 中選擇（亦可按「其他（自行輸入）」） */
  manual: boolean;
}

export const isSurnameValue = (v: unknown): v is string => typeof v === 'string' && (v === '' || CJK_SURNAME_RE.test(v));
export const isSurnameSource = (v: unknown): v is SurnameSource =>
  typeof v === 'string' && (SURNAME_SOURCES as readonly string[]).includes(v);

export function privateSurnameFor(r: SurnameResolution): PrivateSurnameDoc {
  switch (r.kind) {
    case 'han':
    case 'auto':
      return { options: [r.surname], manual: true };
    case 'choose':
      return { options: r.options, manual: false };
    case 'unknown':
      return { options: [], manual: true };
  }
}

export function publicSurnameFor(r: SurnameResolution): { surname: string; source: SurnameSource } {
  return r.kind === 'han' || r.kind === 'auto' ? { surname: r.surname, source: r.kind } : { surname: '', source: 'pending' };
}

export interface SurnameSyncPlan {
  surname: string;
  source: SurnameSource;
  /** true：以這次推算結果覆寫私人選項（否則只在私人文件不存在時補上） */
  rewritePrivate: boolean;
}

/**
 * - 學生已決定（chosen／manual／none）且文件有效 → 保留，不論是否剛以 Google 登入
 * - 已保存的登入（freshSignIn = false）→ 保留現有有效的 auto／han／pending
 * - 其他（新用戶、剛以 Google 登入、文件無效或屬 v2 英文姓氏格式）→ 重新推算
 */
export function planSurnameSync(
  existing: { surname?: unknown; surnameSource?: unknown } | null,
  resolution: SurnameResolution,
  freshSignIn: boolean,
): SurnameSyncPlan {
  const source = isSurnameSource(existing?.surnameSource) ? existing!.surnameSource : null;
  const surname = isSurnameValue(existing?.surname) ? existing!.surname : null;
  const consistent =
    source !== null &&
    surname !== null &&
    (source === 'pending' || source === 'none' ? surname === '' : surname !== '');
  if (consistent && (USER_DECIDED.includes(source!) || !freshSignIn)) {
    return { surname: surname!, source: source!, rewritePrivate: false };
  }
  return { ...publicSurnameFor(resolution), rewritePrivate: true };
}

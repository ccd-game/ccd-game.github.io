/**
 * 登入網域及學校設定（唯一來源）
 *
 * 客戶端所有網域判斷及排行榜學校名稱都必須經由此檔案。
 * ⚠️ Firestore 安全規則無法匯入 TypeScript：修改 SCHOOLS_BY_EMAIL_DOMAIN 時，
 *    必須同步修改 firestore.rules 內的 schools() 對照表（網域 → 學校名稱），
 *    否則規則仍會拒絕新網域，或拒絕新學校的排行榜名稱。
 *
 * 判斷規則（亦見 src/config/auth.test.ts）：
 * - 只接受「完全相同」的網域：x@wbss.edu.hk ✔；x@sub.wbss.edu.hk ✘；x@wbss.edu.hk.evil.com ✘
 * - 不分大小寫：x@WBSS.EDU.HK ✔（Google 帳戶電郵本身不分大小寫；規則亦以 lower() 比對）
 * - 不會自動去除空白；空字串、null、多於一個 @、@ 前為空 一律拒絕
 */

/** 允許登入的電郵網域 → 排行榜顯示的學校名稱（網域須為小寫） */
export const SCHOOLS_BY_EMAIL_DOMAIN: Readonly<Record<string, string>> = {
  'wbss.edu.hk': '救世軍卜維廉中學',
};

/** 允許登入的電郵網域（由 SCHOOLS_BY_EMAIL_DOMAIN 推算） */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = Object.keys(SCHOOLS_BY_EMAIL_DOMAIN);

/** 取得電郵的小寫網域；格式不符時回傳 null */
export function emailDomainOf(email: string | null | undefined): string | null {
  if (typeof email !== 'string' || email.length === 0 || /\s/.test(email)) return null;
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return null;
  return parts[1];
}

/** 電郵所屬學校名稱；不屬於任何允許網域時回傳 null */
export function schoolNameForEmail(email: string | null | undefined): string | null {
  const domain = emailDomainOf(email);
  return domain && Object.prototype.hasOwnProperty.call(SCHOOLS_BY_EMAIL_DOMAIN, domain)
    ? SCHOOLS_BY_EMAIL_DOMAIN[domain]
    : null;
}

/** 只接受 Google 登入 */
export const REQUIRED_SIGN_IN_PROVIDER = 'google.com';

/** Google 帳戶選擇畫面的網域提示（只是 UI 提示，並非安全措施） */
export const GOOGLE_HOSTED_DOMAIN_HINT = ALLOWED_EMAIL_DOMAINS[0];

const domainLabel = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join('、');

/** 帳戶網域不符或電郵未驗證時顯示的訊息 */
export const REJECTION_MESSAGE = `本遊戲暫時只開放予 ${domainLabel} 學生帳戶，請改用學校 Google 帳戶登入。`;

export function isAllowedEmail(email: string | null | undefined): boolean {
  return schoolNameForEmail(email) !== null;
}

/** 只需要 firebase User 的這幾個欄位，方便單元測試 */
export interface AuthUserLike {
  email: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  providerData?: ReadonlyArray<{ providerId: string } | null>;
}

/** 完整的客戶端檢查：Google 帳戶、已驗證電郵、允許的網域 */
export function isAllowedUser(user: AuthUserLike | null | undefined): boolean {
  if (!user || user.isAnonymous) return false;
  if (user.emailVerified !== true) return false;
  if (!isAllowedEmail(user.email)) return false;
  const providers = user.providerData ?? [];
  return providers.some((p) => p?.providerId === REQUIRED_SIGN_IN_PROVIDER);
}

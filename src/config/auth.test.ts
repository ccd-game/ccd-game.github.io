import { describe, it, expect } from 'vitest';
import { ALLOWED_EMAIL_DOMAINS, REJECTION_MESSAGE, isAllowedEmail, isAllowedUser } from './auth';

describe('ALLOWED_EMAIL_DOMAINS', () => {
  it('只包含 wbss.edu.hk', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toEqual(['wbss.edu.hk']);
  });
  it('拒絕訊息與規格一致', () => {
    expect(REJECTION_MESSAGE).toBe('本遊戲暫時只開放予 @wbss.edu.hk 學生帳戶，請改用學校 Google 帳戶登入。');
  });
});

describe('isAllowedEmail', () => {
  it.each([
    ['s1234567@wbss.edu.hk', true],
    ['teacher.chan@wbss.edu.hk', true],
    // 決定：不分大小寫（電郵網域本身不分大小寫；規則亦用 lower()）
    ['x@WBSS.EDU.HK', true],
    ['X@Wbss.Edu.Hk', true],
    // 決定：不接受子網域，只接受完全相同的網域
    ['x@sub.wbss.edu.hk', false],
    ['x@wbss.edu.hk.evil.com', false],
    ['x@evilwbss.edu.hk', false],
    ['x@wbss-edu.hk', false],
    ['x@wbssXedu.hk', false],
    ['x@gmail.com', false],
    ['wbss.edu.hk@gmail.com', false],
    ['x@wbss.edu.hk@gmail.com', false],
    ['a@b@wbss.edu.hk', false],
    ['@wbss.edu.hk', false],
    ['wbss.edu.hk', false],
    // 決定：不自動去除空白
    [' x@wbss.edu.hk', false],
    ['x@wbss.edu.hk ', false],
    ['', false],
  ])('%j → %s', (email, expected) => {
    expect(isAllowedEmail(email)).toBe(expected);
  });

  it('null / undefined → false', () => {
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
  });
});

describe('isAllowedUser', () => {
  const google = [{ providerId: 'google.com' }];
  it('已驗證的學校 Google 帳戶 → 允許', () => {
    expect(isAllowedUser({ email: 'a@wbss.edu.hk', emailVerified: true, providerData: google })).toBe(true);
  });
  it('未驗證電郵 → 拒絕', () => {
    expect(isAllowedUser({ email: 'a@wbss.edu.hk', emailVerified: false, providerData: google })).toBe(false);
  });
  it('其他網域 → 拒絕', () => {
    expect(isAllowedUser({ email: 'a@gmail.com', emailVerified: true, providerData: google })).toBe(false);
  });
  it('電郵／密碼帳戶（非 Google）→ 拒絕', () => {
    expect(isAllowedUser({ email: 'a@wbss.edu.hk', emailVerified: true, providerData: [{ providerId: 'password' }] })).toBe(false);
  });
  it('匿名帳戶 → 拒絕', () => {
    expect(isAllowedUser({ email: null, emailVerified: false, isAnonymous: true, providerData: [] })).toBe(false);
  });
  it('null → 拒絕', () => {
    expect(isAllowedUser(null)).toBe(false);
  });
});

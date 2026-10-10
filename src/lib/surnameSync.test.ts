import { describe, it, expect } from 'vitest';
import { planSurnameSync, privateSurnameFor, publicSurnameFor } from './surnameSync';
import { resolveSurname, validateManualSurname } from './displayLabel';

const waiManChan = resolveSurname({ displayName: 'Wai Man Chan' });

describe('choose 用戶「其他（自行輸入）」', () => {
  it('Wai Man Chan（沒有 family_name）→ choose 韋／衛／惠，選項中沒有陳', () => {
    expect(waiManChan).toEqual({ kind: 'choose', options: ['韋', '衛', '惠'], reason: 'map' });
  });
  it('私人選項：manual = false（顯示按鈕及「其他（自行輸入）」）；首次為 pending', () => {
    expect(privateSurnameFor(waiManChan)).toEqual({ options: ['韋', '衛', '惠'], manual: false });
    expect(publicSurnameFor(waiManChan)).toEqual({ surname: '', source: 'pending' });
  });
  it('自行輸入「陳」：與 unknown 用戶相同的驗證', () => {
    expect(validateManualSurname('陳')).toEqual({ ok: true, surname: '陳' });
    expect(validateManualSurname('Chan').ok).toBe(false);
    expect(validateManualSurname('陳大文').ok).toBe(false);
  });
  it.each([true, false])('已自行輸入「陳」（manual）→ 之後登入不覆寫（剛以 Google 登入：%s）', (fresh) => {
    expect(planSurnameSync({ surname: '陳', surnameSource: 'manual' }, waiManChan, fresh)).toEqual({ surname: '陳', source: 'manual', rewritePrivate: false });
  });
  it('即使 family_name 之後可對應 auto，亦不覆寫自行輸入的姓氏', () => {
    const fam = resolveSurname({ displayName: 'Wai Man Chan', familyName: 'Lam' });
    expect(fam).toEqual({ kind: 'auto', surname: '林' });
    expect(planSurnameSync({ surname: '陳', surnameSource: 'manual' }, fam, true).surname).toBe('陳');
  });
});

describe('planSurnameSync', () => {
  const auto = resolveSurname({ displayName: 'Chan Tai Man' });
  it('新用戶 → 推算', () => {
    expect(planSurnameSync(null, auto, true)).toEqual({ surname: '陳', source: 'auto', rewritePrivate: true });
    expect(planSurnameSync(null, waiManChan, false)).toEqual({ surname: '', source: 'pending', rewritePrivate: true });
  });
  it.each([
    [{ surname: '黃', surnameSource: 'chosen' }],
    [{ surname: '區', surnameSource: 'manual' }],
    [{ surname: '', surnameSource: 'none' }],
  ])('學生已決定 %j → 保留（不論是否剛登入）', (existing) => {
    for (const fresh of [true, false]) {
      expect(planSurnameSync(existing, auto, fresh)).toEqual({ surname: existing.surname, source: existing.surnameSource, rewritePrivate: false });
    }
  });
  it('已保存的登入 → 保留 auto／han／pending；剛以 Google 登入 → 重新推算', () => {
    expect(planSurnameSync({ surname: '戴', surnameSource: 'auto' }, auto, false).surname).toBe('戴');
    expect(planSurnameSync({ surname: '戴', surnameSource: 'auto' }, auto, true).surname).toBe('陳');
    expect(planSurnameSync({ surname: '', surnameSource: 'pending' }, waiManChan, false).source).toBe('pending');
  });
  it.each([
    [{ surname: 'Chan' }],
    [{ surname: 'Chan', surnameSource: 'manual' }],
    [{ surname: '', surnameSource: 'manual' }],
    [{ surname: '陳', surnameSource: 'pending' }],
    [{ surname: '陳', surnameSource: 'teacher' }],
    [{ name: 'Chan Tai Man' }],
  ])('無效或 v2 文件 %j → 重新推算', (existing) => {
    expect(planSurnameSync(existing as never, auto, false)).toEqual({ surname: '陳', source: 'auto', rewritePrivate: true });
  });
});

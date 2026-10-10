import { describe, it, expect } from 'vitest';
import {
  buildDisplayLabel,
  labelFor,
  normaliseRomanisation,
  resolveSurname,
  romanWords,
  safeDisplayLabel,
  sanitizeSurname,
  shortLabelFor,
  validateManualSurname,
} from './displayLabel';
import { SURNAME_MAP } from '../config/surnames';
import { ALLOWED_EMAIL_DOMAINS, SCHOOLS_BY_EMAIL_DOMAIN, schoolNameForEmail } from '../config/auth';

const EMAIL = 's0001@wbss.edu.hk';
const L = (surname: string) => `救世軍卜維廉中學 ${surname}同學`;
const auto = (surname: string) => ({ kind: 'auto', surname });
const choose = (options: string[], reason = 'map') => ({ kind: 'choose', options, reason });
const r = (displayName: string | null, familyName?: string | null) => resolveSurname({ displayName, familyName });

describe('學校對照表', () => {
  it('ALLOWED_EMAIL_DOMAINS 由對照表推算', () => {
    expect(SCHOOLS_BY_EMAIL_DOMAIN).toEqual({ 'wbss.edu.hk': '救世軍卜維廉中學' });
    expect(ALLOWED_EMAIL_DOMAINS).toEqual(['wbss.edu.hk']);
  });
  it('schoolNameForEmail', () => {
    expect(schoolNameForEmail('a@WBSS.edu.hk')).toBe('救世軍卜維廉中學');
    expect(schoolNameForEmail('a@gmail.com')).toBeNull();
    expect(schoolNameForEmail('a@constructor')).toBeNull();
    expect(schoolNameForEmail('a@__proto__')).toBeNull();
  });
});

describe('規則 1：正規化（大小寫、空格、連字號）', () => {
  it.each(['Au-Yeung', 'Au Yeung', 'Auyeung', 'AUYEUNG', 'au - yeung', 'AU‐YEUNG'])('%j → auyeung', (s) => {
    expect(normaliseRomanisation(s)).toBe('auyeung');
  });
  it('拆詞：連字號相連視為一個詞；含數字的詞捨棄；逗號為分隔', () => {
    expect(romanWords('Au-Yeung Ka Ho')).toEqual(['auyeung', 'ka', 'ho']);
    expect(romanWords('S1234567 Lee Siu Ming')).toEqual(['lee', 'siu', 'ming']);
    expect(romanWords('CHAN, Tai Man')).toEqual(['chan', 'tai', 'man']);
  });
  it.each([
    ['Au-Yeung Ka Ho'], ['Au Yeung Ka Ho'], ['Auyeung Ka Ho'], ['AU YEUNG KA HO'], ['au-yeung ka ho'],
  ])('%j → 歐陽', (d) => {
    expect(r(d)).toEqual(auto('歐陽'));
  });
  it('family_name 寫法不同亦相同', () => {
    for (const f of ['Au-Yeung', 'Au Yeung', 'AUYEUNG']) expect(r('Ka Ho', f)).toEqual(auto('歐陽'));
  });
});

describe('規則 2：family_name 優先', () => {
  it('family_name 比顯示名稱首詞優先', () => {
    expect(r('Tai Man Chan', 'Chan')).toEqual(auto('陳')); // 沒有 family_name 時會變成「戴」
    expect(r('Siu Ming', 'Lam')).toEqual(auto('林'));
    expect(r('Tai Man Wong', 'Wong')).toEqual(choose(['黃', '王', '汪']));
  });
  it('family_name 無法對應 → unknown（不改用顯示名稱，以免把名字當姓）', () => {
    expect(r('Tai Man Smith', 'Smith')).toEqual({ kind: 'unknown' });
  });
  it('family_name 沒有可用的英文詞（例如只有符號）→ 改用顯示名稱', () => {
    expect(r('Chan Tai Man', '<>')).toEqual(auto('陳'));
    expect(r('Chan Tai Man', '')).toEqual(auto('陳'));
  });
});

describe('規則 3：首兩詞合併（複姓）→ 首詞；不使用末詞', () => {
  it('首兩詞合併為複姓', () => {
    expect(r('Au Yeung Ka Ho')).toEqual(auto('歐陽'));
    expect(r('Sze To Wai Man')).toEqual(auto('司徒'));
  });
  it('首兩詞不是複姓 → 首詞', () => {
    expect(r('Chan Tai Man')).toEqual(auto('陳'));
    expect(r('Lam Siu Ming')).toEqual(auto('林'));
    expect(r('Ho Wai Lam')).toEqual(auto('何'));
    expect(r('CHAN, Tai Man')).toEqual(auto('陳'));
    expect(r('S1234567 Lee Siu Ming')).toEqual(auto('李'));
  });
  it('首兩詞合併後即使是單姓鍵值（如 Lo + Ng → long）亦不採用，只接受複姓', () => {
    expect(SURNAME_MAP.long).toBeDefined();
    expect(r('Lo Ng Siu Fong')).toEqual(choose(['羅', '盧', '勞']));
  });
  it('不使用末詞：「Tai Man Chan」（沒有 family_name）→ 首詞 Tai → 戴（auto）', () => {
    expect(SURNAME_MAP.tai).toEqual({ options: ['戴'], mode: 'auto' });
    expect(r('Tai Man Chan')).toEqual(auto('戴'));
    expect(r('Tai Man CHAN')).toEqual(auto('戴'));
    expect(buildDisplayLabel(EMAIL, '戴')).toBe(L('戴'));
  });
  it('首詞不在對照表 → unknown（即使末詞是常見姓氏）', () => {
    expect(r('Peter Chan')).toEqual({ kind: 'unknown' });
  });
});

describe('auto 與 choose', () => {
  it.each([
    ['Chan Tai Man', '陳'],
    ['Lam Ka Yan', '林'],
    ['Leung Wai Kit', '梁'],
    ['Lee Ka Yan', '李'],
    ['Tsang Ho Yin', '曾'],
  ])('auto：%j → %s', (d, s) => {
    expect(r(d)).toEqual(auto(s));
  });
  it.each([
    ['Wong Siu Ming', ['黃', '王', '汪']],
    ['Ng Ka Yan', ['吳', '伍']],
    ['Cheung Ka Yan', ['張', '蔣', '章']],
    ['Chow Wing Sze', ['周', '鄒']],
  ])('choose：%j → %j', (d, opts) => {
    expect(r(d)).toEqual(choose(opts as string[]));
  });
  it('choose 選項與對照表完全相同（同一次序）', () => {
    expect(r('Wong Siu Ming')).toEqual(choose(SURNAME_MAP.wong.options));
  });
});

describe('規則 5：五個以空格分開的歧義複姓', () => {
  it.each([
    ['Wong Fu Ming', ['皇甫', '黃', '王', '汪']],
    ['Ling Wu Kit', ['令狐', '凌']],
    ['Ha Hau Man', ['夏侯', '夏']],
    ['Mo Yung Ching', ['慕容', '毛', '巫', '莫', '武']],
    ['Tung Fong Wai', ['東方', '董']],
  ])('%j → 選擇（複姓＋首詞單姓）%j', (d, opts) => {
    expect(r(d)).toEqual(choose(opts as string[], 'ambiguous-compound'));
  });
  it('連寫或以連字號連接 → 直接採用複姓', () => {
    expect(r('Wongfu Ming')).toEqual(auto('皇甫'));
    expect(r('Wong-Fu Ming')).toEqual(auto('皇甫'));
    expect(r('Tung-Fong Wai')).toEqual(auto('東方'));
    expect(r('Moyung Ching')).toEqual(auto('慕容'));
  });
  it('family_name「Wong Fu」（空格）亦須選擇；「Wong-Fu」直接採用', () => {
    expect(r('Ming', 'Wong Fu')).toEqual(choose(['皇甫', '黃', '王', '汪'], 'ambiguous-compound'));
    expect(r('Ming', 'Wong-Fu')).toEqual(auto('皇甫'));
  });
  it('其他以空格分開的複姓（Au Yeung、Sze To）直接採用', () => {
    expect(r('Au Yeung Ka Ho').kind).toBe('auto');
    expect(r('Sze To Wai Man').kind).toBe('auto');
  });
});

describe('規則 4：對照表沒有的拼寫', () => {
  it.each(['John Smith', 'Muhammad Ali Khan', 'Peter', 'Emily Johnson'])('%j → unknown（由學生輸入）', (d) => {
    expect(r(d)).toEqual({ kind: 'unknown' });
  });
  it.each([null, undefined, '', '   ', '12345', '<script>alert(1)</script>'])('空值／無效 %j → unknown', (d) => {
    expect(resolveSurname({ displayName: d as string | null })).toEqual({ kind: 'unknown' });
  });
  it('null profile → unknown', () => {
    expect(resolveSurname(null)).toEqual({ kind: 'unknown' });
  });
});

describe('規則 6：中文書寫（維持原有做法，不需選擇）', () => {
  it.each([
    ['林小明', '林'],
    ['陳大文', '陳'],
    ['歐陽靖', '歐陽'],
    ['司徒志明', '司徒'],
    ['諸葛亮', '諸葛'],
    ['欧阳娜娜', '欧阳'],
    ['陳李美玲', '陳'],
    ['陳大文 Peter Chan', '陳'],
    ['Peter Chan 陳大文', '陳'],
    ['Wong Fu Ming 黃富明', '黃'],
    ['1A01 林小明', '林'],
  ])('%j → %s', (d, s) => {
    expect(r(d)).toEqual({ kind: 'han', surname: s });
  });
  it('中文 family_name 優先', () => {
    expect(r('Peter', '歐陽')).toEqual({ kind: 'han', surname: '歐陽' });
    expect(r('Chan Tai Man', '林')).toEqual({ kind: 'han', surname: '林' });
  });
  it('有中文顯示名稱時，以中文為準（即使 family_name 是英文）', () => {
    expect(r('陳大文', 'Chan')).toEqual({ kind: 'han', surname: '陳' });
  });
});

describe('手動輸入驗證', () => {
  it.each([
    ['陳', '陳'],
    ['歐陽', '歐陽'],
    [' 林 ', '林'],
    ['司　徒', '司徒'], // 全形空格
    ['欧阳', '欧阳'],
  ])('%j → 接受 %s', (input, s) => {
    expect(validateManualSurname(input)).toEqual({ ok: true, surname: s });
  });
  it.each(['', '   ', '陳大文', 'Chan', '陳1', '<b>', '陳.', '😀'])('%j → 拒絕', (input) => {
    const res = validateManualSurname(input);
    expect(res.ok).toBe(false);
    expect((res as { message: string }).message).toMatch(/中文/);
  });
});

describe('名稱及清理', () => {
  it('sanitizeSurname 只接受一至兩個中文字（英文已不接受）', () => {
    expect(sanitizeSurname('歐陽')).toBe('歐陽');
    expect(sanitizeSurname('陳')).toBe('陳');
    expect(sanitizeSurname('Chan')).toBe('');
    expect(sanitizeSurname('陳大文')).toBe('');
    expect(sanitizeSurname(null)).toBe('');
  });
  it('buildDisplayLabel／labelFor', () => {
    expect(buildDisplayLabel(EMAIL, '陳')).toBe(L('陳'));
    expect(buildDisplayLabel(EMAIL, '')).toBe('救世軍卜維廉中學 同學');
    expect(buildDisplayLabel(EMAIL, 'Chan')).toBe('救世軍卜維廉中學 同學');
    expect(buildDisplayLabel('a@gmail.com', '陳')).toBe('同學');
    expect(labelFor('救世軍卜維廉中學', '<script>')).toBe('救世軍卜維廉中學 同學');
  });
  it('safeDisplayLabel：不讀舊欄位，亦不顯示 v2 的英文姓氏', () => {
    expect(safeDisplayLabel({ displayLabel: L('陳') })).toBe(L('陳'));
    expect(safeDisplayLabel({ displayLabel: '救世軍卜維廉中學 Chan同學' })).toBe('救世軍卜維廉中學 同學');
    expect(safeDisplayLabel({ name: '陳大文' } as never)).toBe('同學');
    expect(safeDisplayLabel({ displayLabel: '<img>陳大文' })).toBe('同學');
  });
  it('shortLabelFor', () => {
    expect(shortLabelFor('陳')).toBe('陳同學');
    expect(shortLabelFor('')).toBe('同學');
    expect(shortLabelFor('Chan')).toBe('同學');
  });
});

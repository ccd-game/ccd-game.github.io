import { describe, expect, it } from 'vitest';
import { MENU_MAIN_PAD_WITH_SAB, MENU_NAV_CHROME_PX, menuMainPaddingBottom } from './menuChromeInset';

const browser = {
  summoning: false,
  viewingDetail: false,
  standalone: false,
  sab: 0,
};

describe('menuMainPaddingBottom', () => {
  it('Browser sab＝0：仍是 76+env(sab)', () => {
    expect(menuMainPaddingBottom(browser)).toBe(MENU_MAIN_PAD_WITH_SAB);
  });

  it('Browser 即使 sab>0 也不改式子（手機 Safari 畫面維持原樣）', () => {
    expect(menuMainPaddingBottom({ ...browser, sab: 34 })).toBe(MENU_MAIN_PAD_WITH_SAB);
  });

  it('standalone 且 sab>0：列表／外頁只墊殼高，底貼 nav 頂', () => {
    expect(menuMainPaddingBottom({ ...browser, standalone: true, sab: 34 })).toBe(`${MENU_NAV_CHROME_PX}px`);
  });

  it('standalone 但 sab＝0：與 Browser 同一條式子', () => {
    expect(menuMainPaddingBottom({ ...browser, standalone: true, sab: 0 })).toBe(MENU_MAIN_PAD_WITH_SAB);
  });

  it('圖鑑內頁維持 76+sab，不改 #4 霜帶對 nav 盒頂', () => {
    expect(menuMainPaddingBottom({
      summoning: false,
      viewingDetail: true,
      standalone: true,
      sab: 34,
    })).toBe(MENU_MAIN_PAD_WITH_SAB);
  });

  it('召喚中底墊為 0，蓋過 standalone', () => {
    expect(menuMainPaddingBottom({
      summoning: true,
      viewingDetail: false,
      standalone: true,
      sab: 34,
    })).toBe('0');
  });

  it('sab 非數值時不當成有 inset', () => {
    expect(menuMainPaddingBottom({ ...browser, standalone: true, sab: Number.NaN })).toBe(MENU_MAIN_PAD_WITH_SAB);
  });
});

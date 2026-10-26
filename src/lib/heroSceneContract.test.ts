import { describe, expect, it } from 'vitest';
import {
  HERO_SCENES,
  SCENE_GEOMETRY,
  ONE_SOURCE_ACCEPTANCE_HEROES,
  computeHeroFit,
  heroPeekHeight,
  DRAWER_BAR_H,
} from '../../components/home/heroScene';

/**
 * P0 CI 契約：HERO_SCENES 一源（純函數）。
 * 鎖現況非改幾何 — 只斷言單一匯出、別名同參照、keys、驗收關主、柳 figScale、computeHeroFit 純煙測。
 */
describe('CI contract：HERO_SCENES 一源（純函數）', () => {
  it('HERO_SCENES 為單一匯出表（非空 Record）', () => {
    expect(HERO_SCENES).toBeTruthy();
    expect(typeof HERO_SCENES).toBe('object');
    expect(Object.keys(HERO_SCENES).length).toBeGreaterThan(0);
  });

  it('SCENE_GEOMETRY ≡ HERO_SCENES（同一物件參照）', () => {
    expect(SCENE_GEOMETRY).toBe(HERO_SCENES);
  });

  it('keys 快照穩定（排序）', () => {
    expect(HERO_SCENES.liu_zong_yuan).toBeTruthy();
    expect(Object.keys(HERO_SCENES).sort()).toEqual([
      'kong_zi',
      'li_bai',
      'lian_po',
      'lin_xiang_ru',
      'liu_zong_yuan',
      'zhu_ge_liang',
    ]);
  });

  it('ONE_SOURCE_ACCEPTANCE_HEROES ＝柳＋孔', () => {
    expect([...ONE_SOURCE_ACCEPTANCE_HEROES]).toEqual(['liu_zong_yuan', 'kong_zi']);
  });

  it('柳 figScale === 0.64（鎖現況非改幾何）', () => {
    expect(HERO_SCENES.liu_zong_yuan.figScale).toBe(0.64);
  });

  it('computeHeroFit：固定輸入 → 穩定輸出（純煙測；390×peek）', () => {
    const W = 390;
    const D = 646.203125;
    const H = heroPeekHeight(D);
    const sc = HERO_SCENES.liu_zong_yuan;
    const a = computeHeroFit(sc, W, H, D, DRAWER_BAR_H);
    const b = computeHeroFit(sc, W, H, D, DRAWER_BAR_H);
    expect(a).toEqual(b);
    expect(Number.isFinite(a.s) && a.s > 0).toBe(true);
    expect(Number.isFinite(a.left) && Number.isFinite(a.top)).toBe(true);
  });
});

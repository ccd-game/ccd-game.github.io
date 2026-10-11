/**
 * 首頁預覽的落地場景設定（HERO_SCENES）與幾何：首頁預覽（ChapterHero）與圖鑑內頁（CharacterDetailView）共用，
 * 兩頁的背景／人物錨點、縮放、位置完全相同。
 */
import type React from 'react';

/**
 * 落地場景：背景與立繪放在同一個容器（同一個 transform），人物坐／站在畫中的岩石或地面上，不會浮空。
 * 單位皆為背景原圖像素。fig＝立繪在背景中的位置框（柳宗元、孔子的立繪與背景同尺寸、逐像素對齊，即整張）；
 * ax＝要放在英雄區寬度 X 處的水平錨點（身體中線）；head／foot＝畫面需完整露出的上緣與「地面線」，
 * 地面線對齊篇名區下緣（即「第 N 回」上方），腳下的岩石／地面自然延伸到下方文字區；
 * k＝場景寬／英雄區寬（以寬度決定大小），英雄區太矮時改以 head–foot 塞進可用高度為準（取較小者）；
 * 水平位置在不露出場景左右邊的範圍內盡量接近 X（露邊時才以鏡射延伸補滿，上方天空亦同）；
 * breathe＝呼吸縮放原點（立繪框百分比，坐處／腳底，雙腳不動）。
 */
export interface HeroScene {
  bg: string; w: number; h: number; fig: [number, number, number, number];
  ax: number; X: number; head: number; foot: number; k: number; breathe: string;
  /** 立繪＋特效相對場景縮放（腳底錨點）；背景 cover 不變 */
  figScale?: number;
  /** 腳底接觸點 X（場景原圖像素）；缺省用 ax */
  footX?: number;
  /** 'coverBottom'：背景 cover 英雄區並貼齊底部（頂部多餘天空被裁，底部無墨黑）；地面線不再對齊篇名區 */
  fill?: 'coverBottom';
  /** 靴底要落在背景中的岩頂點（場景原圖像素）；立繪以 (footX, foot) 為原點縮放後平移到此 */
  rest?: [number, number];
  /** 只放大背景（人物不動）：[倍率, 原點 X（場景原圖像素）]，原點在底邊 → 底邊不動、往左上右長大 */
  bgZoom?: [number, number];
  /** 'headTop'：JS 即時定位——縮放沿用抽屜收合時（人物螢幕大小不變），整個場景下移到帽頂留白；矮英雄區時下半身可被裁 */
  fit?: 'headTop';
  /** 全身入框時腳底距（半開抽屜）英雄區下緣的距離 px（正＝腳在下緣上方；負＝允許裁到腳） */
  footPad?: number;
  /** 帽頂留白 px（預設 12） */
  topPad?: number;
  /** 疊在人物之上的前景層（與人物同框、同尺寸、逐像素對齊；例：孔子的雙馬＝武器層）。順序：背景 → 人物 → front */
  front?: string;
}
const BG = `${import.meta.env.BASE_URL}resources/background`;
export const HERO_SCENES: Record<string, HeroScene> = {
  // 坐於岩上，放大約兩成（場景含背景一起放大，地面線不動）；身體中線 53%，軀幹在篇名右側、右袖在印章之上；飛劍在篇名後方被柔焦或出框（首頁預覽不需顯示飛劍）
  // zoomout bg：cover＋貼底（不露墨黑）；靴底（人物層 975,633）落在岩丘頂 (948,429.5)（受光岩緣 y≈426、實岩 y≈429–430，逐欄量測）
  // figScale 0.64（相對新背景）＝螢幕上與先前 0.8 版同大小；靴底 (948,429.5) 踩岩丘；bgZoom 1.14 @ x995 底邊讓岩台寬到膝下（跪坐在岩上）
  // fit 'headTop'：抽屜半開時英雄區變矮 → 人物大小不變，背景＋人物下移到帽頂留白 12px，下半身可被 UI／抽屜遮
  liu_zong_yuan: { bg: `${BG}/bg_level_2.png`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 867, X: 0.53, head: 19, foot: 633, footX: 975, k: 1.62, breathe: '64.8% 79.9%', figScale: 0.64, fill: 'coverBottom', rest: [948, 429.5], bgZoom: [1.14, 995], fit: 'headTop' },
  // 坐於車中，放大約一成半；車輪著地，馬匹向右出框
  // v3 三層（1280×720 逐像素對齊）：kong_zi_bg → kong_zi_character（人物＋戰車）→ kong_zi_weapon（雙馬，疊在人物上）
  // head＝車蓋頂飾 y149.5；foot＝最低馬蹄 y705（前輪著地 640.9、後輪 623.2、馬蹄 659–705，皆在同一張背景的路面上）
  // ax＝戰車＋雙馬的水平中心（前輪外緣 x246～馬頭 x894 → 570）置於 X 0.5；breathe 原點＝輪／蹄著地線（y≈662＝92%），呼吸時輪蹄不離地
  kong_zi: { bg: `${BG}/kong_zi_bg.webp`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 570, X: 0.5, head: 149.5, foot: 705, k: 2.28, breathe: '45% 92%', front: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi_weapon.webp` },
  // 立於殿前木棧（欄杆右側的地板），雙足踏地
  zhu_ge_liang: { bg: `${BG}/bg_level_9.jpeg`, w: 1408, h: 768, fig: [860, 140, 320, 560], ax: 1020, X: 0.52, head: 152, foot: 712, k: 2.31, breathe: '50% 99%' },
  // 立於月下岩台
  li_bai: { bg: `${BG}/bg_level_11_1.png`, w: 2760, h: 1504, fig: [804, 270, 985, 900], ax: 1380, X: 0.5, head: 329, foot: 1200, k: 2.97, breathe: '50% 100%' },
};
// 只做左右鏡射補滿；下方不鏡射、無墨黑淡出／wash（zoomout bg 直通）
export const SCENE_TILES: [number, number][] = [-1, 0, 1].map(i => [i, 0] as [number, number]);
export const sceneVars = (sc: HeroScene) => ({ '--W': sc.w, '--H': sc.h, '--ax': sc.ax, '--X': sc.X, '--head': sc.head, '--foot': sc.foot, '--span': sc.foot - sc.head, '--k': sc.k }) as React.CSSProperties;
export const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** 抽屜標題列高（與 CSS .home-dungeon --bar-h 相同） */
export const DRAWER_BAR_H = 52;

/**
 * 場景縮放／位置（px）：W×H＝英雄區尺寸；D＝首頁內容區（.home-dungeon）高；bar＝抽屜標題列高。
 * fit 'headTop'（柳宗元）：人物維持抽屜收合時的螢幕大小（＝cover 縮放），背景＋人物一起下移到「帽頂留白 m」；
 * 其他古人：半開時「帽頂留白 m、腳底距下緣 footPad」的全身縮放；一律不小於英雄區 cover（無黑邊）。
 */
export function computeHeroFit(sc: HeroScene, W: number, H: number, D: number, bar: number = DRAWER_BAR_H) {
  const zoom = sc.bgZoom?.[0] ?? 1;
  const Hc = Math.max(H, D - bar);                 // 抽屜收合時英雄區高
  const Hp = Math.min(H, D - ((D + 2 * bar) / 3 - 1)); // 抽屜半開（四篇）時英雄區高
  const m = sc.topPad ?? 12;
  // 帽頂（場景像素）：有 rest 時以縮放後立繪計算，否則用 head
  const headY = sc.rest ? sc.rest[1] - (sc.foot - sc.head) * (sc.figScale ?? 1) : sc.head;
  const footY = sc.rest ? sc.rest[1] : sc.foot;
  const sFig = sc.fit === 'headTop' ? Hc / sc.h : (Hp - m - (sc.footPad ?? 0)) / (footY - headY);
  const s = Math.max(W / sc.w, H / sc.h, sFig);
  // top ≥ H − s·h（背景底不高於英雄區底）；top ≥ m − s·headY（頭不出框）；背景頂 ≤ 0（含 bgZoom）
  const top = Math.min(Math.max(H - s * sc.h, m - s * headY), s * sc.h * (zoom - 1));
  const left = Math.min(0, Math.max(W - s * sc.w, sc.X * W - s * sc.ax));
  return { s, left, top };
}

/** 抽屜半開（四篇）時的英雄區高：圖鑑內頁以此為場景框高，構圖與首頁預覽相同 */
export const heroPeekHeight = (D: number, bar: number = DRAWER_BAR_H) => D - ((D + 2 * bar) / 3 - 1);

/** 立繪框（.home-scene-fig）在場景中的位置＋靴底對岩頂的平移縮放 */
export function heroFigStyle(scene: HeroScene): React.CSSProperties {
  return {
    left: pct(scene.fig[0], scene.w), top: pct(scene.fig[1], scene.h),
    width: pct(scene.fig[2], scene.w), height: pct(scene.fig[3], scene.h),
    ...((scene.figScale ?? 1) !== 1 || scene.rest ? {
      transform: `${scene.rest ? `translate(${pct(scene.rest[0] - (scene.footX ?? scene.ax), scene.fig[2])}, ${pct(scene.rest[1] - scene.foot, scene.fig[3])}) ` : ''}scale(${scene.figScale ?? 1})`,
      transformOrigin: `${((scene.footX ?? scene.ax) - scene.fig[0]) / scene.fig[2] * 100}% ${(scene.foot - scene.fig[1]) / scene.fig[3] * 100}%`,
    } : {}),
  };
}

/** 場景外框（背景層）：sceneVars＋bgZoom（只放大背景，原點在底邊） */
export const heroBgFrameStyle = (scene: HeroScene): React.CSSProperties => ({
  ...sceneVars(scene),
  ...(scene.bgZoom ? { transform: `scale(${scene.bgZoom[0]})`, transformOrigin: `${pct(scene.bgZoom[1], scene.w)} 100%` } : {}),
});

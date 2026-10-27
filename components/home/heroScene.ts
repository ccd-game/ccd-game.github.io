/**
 * 首頁／圖鑑落地場景幾何（one-source-geom-home-r1）
 *
 * ## 唯一準源（sceneGeometry）
 * `HERO_SCENES`＋`computeHeroFit`／`heroFigStyle`／`heroBgFrameStyle`／`heroPeekHeight`
 * ＝**三頁唯一幾何準源**（主頁預覽｜圖鑑內頁｜入陣 homeBox／戰鬥應跟此）。
 * `heroPeekHeight` ≡ CSS hostH＠390×844 browser（`--chrome-drawer-rect-y` − zone；N=4：14／56／÷3）。
 *
 * - **驗收關主**：柳（`liu_zong_yuan`）＋孔（`kong_zi`）。
 * - **位置／scale／ax／X／figScale／rest／bgZoom／fit**：只寫在本檔 HERO；禁第二套 figScale／座標真相。
 * - **可共用變量（非幾何分叉）**：僅呼吸振幅／週期／相位（CSS／動畫）；不另開分叉改人物落點。
 * - 讀取方：`ChapterHero`（預覽）、`CharacterDetailView`（圖鑑內頁）；戰鬥本輪禁改
 *   `battleLayout`（柳仍有 homeSync 鏡像——**下輪廢柳 homeSync**，改只讀本準源）。
 *
 * 別名：`SCENE_GEOMETRY` ≡ `HERO_SCENES`（匯出，契約測試鎖同一參照）。
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
  /** figScale 變換原點 Y（場景原圖像素）；缺省用 foot。設為眼線可使縮臉時眼位不動，便於對齊孔子內頁眼高 */
  figOy?: number;
}
const BG = `${import.meta.env.BASE_URL}resources/background`;
/** 水墨遮罩（邊緣墨暈壓背景、中心較透）；主頁預覽用（圖鑑內頁已去水墨）。z：山景 → 此層 → 立繪 → UI */
export const INK_WASH_MASK = `${import.meta.env.BASE_URL}resources/effect/ink_wash_mask.webp`;
/** 主頁宣紙山水全頁底（art-xuan-shanshui-page-bg-r11 試套）：滿幅蓋白底＋取代舊 HOME_SHANSHUI；PNG 原檔禁 WebP／禁再壓 */
export const HOME_SHANSHUI = `${import.meta.env.BASE_URL}resources/background/xuan-shanshui-page-bg-r11-full844.png`;
export const HOME_SHANSHUI_2X = `${import.meta.env.BASE_URL}resources/background/xuan-shanshui-page-bg-r11-full844@2x.png`;
/** 入陣卷軸（art2 定稿）。主頁 .home-cta：雙軸＋畫心 PNG 切分（≡ scroll-unroll-ref-r2；禁 scaleX）。 */
export const SCROLL_ENTER_OPEN = `${import.meta.env.BASE_URL}resources/ui/scroll-enter/open.webp`;
export const SCROLL_ENTER_CLOSED = `${import.meta.env.BASE_URL}resources/ui/scroll-enter/closed-axles-filled.webp`;
/** 自 open.webp 裁：左軸 0–88／畫心 88–1026（938×631）／右軸 1026–1114；PNG 1:1 永不橫向拉伸。 */
export const SCROLL_ENTER_AXLE_LEFT = `${import.meta.env.BASE_URL}resources/ui/scroll-enter/axle-left.png`;
export const SCROLL_ENTER_PAPER = `${import.meta.env.BASE_URL}resources/ui/scroll-enter/paper.png`;
export const SCROLL_ENTER_AXLE_RIGHT = `${import.meta.env.BASE_URL}resources/ui/scroll-enter/axle-right.png`;
export const HERO_SCENES: Record<string, HeroScene> = {
  // 坐於岩上；靴底（人物層 975,633）落在岩丘頂 (948,429.5)；bgZoom 1.14 @ x995
  // 【align-v1315-home-r1】還原 v1.3.15（a628cce）：figScale 0.64、X:0.53、ax:867；無 figOy（縮放原點＝腳底）
  // 【one-source-geom-home-r1】唯一準源；三頁同讀；戰鬥 hold scale≈0.528＠390
  // fit 'headTop'；主頁／圖鑑／入陣 homeBox 同讀此 HERO
  liu_zong_yuan: { bg: `${BG}/bg_level_2.png`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 867, X: 0.53, head: 19, foot: 633, footX: 975, k: 1.62, breathe: '64.8% 79.9%', figScale: 0.64, fill: 'coverBottom', rest: [948, 429.5], bgZoom: [1.14, 995], fit: 'headTop' },
  // 坐於車中，放大約一成半；車輪著地，馬匹向右出框
  // v3 三層（1280×720 逐像素對齊）：kong_zi_bg → kong_zi_character（人物＋戰車）→ kong_zi_weapon（雙馬，疊在人物上）
  // head＝車蓋頂飾 y149.5；foot＝前輪著地 y640.9（後輪 623.2、馬蹄 659–705，皆在同一張背景的路面上；雙馬向右下出框）
  // v1.3.7：foot 705→640.9（全身入框改以「車蓋頂～前輪著地」為準）→ 場景放大、整體上移：390×844 背景頂高出畫面、不露鏡像，
  //   且螢幕臉高（faceH 35）＝柳宗元（faceH 52×figScale 0.64）≈29px；ax 533→508（＝face.cx）讓內頁臉水平置中於 host 中線
  // breathe 原點＝輪／蹄著地線（y≈662＝92%），呼吸時輪蹄不離地
  // 【align-v1315-home-r1】還原 v1.3.15（a628cce）：無 figScale／figOy（缺省 figScale＝1）
  // 【one-source-geom-home-r1】唯一準源；三頁同讀；戰鬥 hold scale≈0.783＠390；heroSync→本條
  kong_zi: { bg: `${BG}/kong_zi_bg.webp`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 508, X: 0.5, head: 149.5, foot: 640.9, k: 2.28, breathe: '45% 92%', front: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi_weapon.webp` },
  // 廉藺 solo：ax＝face.cx、X:0.5；figScale 使螢幕臉高≈孔子 29.04；front＝各自虎層（青／金）
  // 藺相如＝左文士＋青虎；廉頗＝右武將＋金虎
  // headTop＋figOy=眼線：figScale 縮臉高≈29；眼位對齊孔子內頁 eyeY≈112.8＠host
  // face-lock：figScale＝r2×(0.1949/0.126) 使內頁臉高隨外頁標註放大；figOy＝眼線鎖眼位；連動主頁
  // 同 lian_lin_bg、ax 分左右 → 可見窗不同裁（藺 vis≈左、廉 vis≈右）；禁同框同裁
  // 外頁頭框改動勿動此內頁基線（X:0.5／head:52.4／figScale:0.888）
  lin_xiang_ru: { bg: `${BG}/lian_lin_bg.webp`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 482, X: 0.5, head: 52.4, foot: 600, k: 2.75, breathe: '37.7% 83%', figScale: 0.888, figOy: 168, fit: 'headTop', front: `${import.meta.env.BASE_URL}resources/avatar/lin_xiang_ru/lin_xiang_ru_weapon.png` },
  lian_po: { bg: `${BG}/lian_lin_bg.webp`, w: 1280, h: 720, fig: [0, 0, 1280, 720], ax: 848, X: 0.5, head: 44.4, foot: 560, k: 2.75, breathe: '66.3% 78%', figScale: 0.737, figOy: 160, fit: 'headTop', front: `${import.meta.env.BASE_URL}resources/avatar/lian_po/lian_po_weapon.png` },
  // 暫留：levels／主頁仍引用立繪；圖鑑外頁已無藝（完整刪檔待 levels／battle 同批）
  zhu_ge_liang: { bg: `${BG}/bg_level_9.jpeg`, w: 1408, h: 768, fig: [860, 140, 320, 560], ax: 1020, X: 0.52, head: 152, foot: 712, k: 2.31, breathe: '50% 99%' },
  li_bai: { bg: `${BG}/bg_level_11_1.png`, w: 2760, h: 1504, fig: [804, 270, 985, 900], ax: 1380, X: 0.5, head: 329, foot: 1200, k: 2.97, breathe: '50% 100%' },
};
// 只做左右鏡射補滿；下方不鏡射、無墨黑淡出／wash（zoomout bg 直通）

/**
 * 過渡對照：battleKey → heroKey。
 * one-source：幾何以 HERO／SCENE_GEOMETRY 為準；有 heroSync 者戰鬥已跟 HERO；
 * 有 homeSync／restOnBg 者（柳）本輪仍鏡像 HERO——**下輪廢 homeSync**，勿再維護第二套常數。
 * 測試：src/lib/homePreviewFollowBattle.test.ts、oneSourceGeom。
 */
export const BATTLE_TO_HERO_KEY: Record<string, string> = {
  liu_zong_yuan_battle: 'liu_zong_yuan',
  kong_zi_character: 'kong_zi',
  zhu_ge_liang: 'zhu_ge_liang',
  li_bai: 'li_bai',
};

/**
 * 場景幾何準源別名（≡ HERO_SCENES，同一物件參照）。
 * 預覽／圖鑑／（下輪）戰鬥只應讀此；禁另建 figScale／ax 表。
 */
export const SCENE_GEOMETRY: Record<string, HeroScene> = HERO_SCENES;

/** 驗收關主（三頁同尺）：柳＋孔 */
export const ONE_SOURCE_ACCEPTANCE_HEROES = ['liu_zong_yuan', 'kong_zi'] as const;
export type OneSourceAcceptanceHero = (typeof ONE_SOURCE_ACCEPTANCE_HEROES)[number];

/** 戰鬥 hold 準源 box（390×844 browser；one-source-geom-home-r1／compare-preview-vs-battle-size-r1） */
export const BATTLE_HOLD_GEOM_390 = {
  liu_zong_yuan: { scale: 0.528, left: -204.3043122530318, top: 130.63806372829907, faceX: 191.6956765036499 },
  // peek-h-r1：heroPeekHeight≡CSS；PW 實測 hold（homeBox／heroSync）
  kong_zi: { scale: 0.79093017578125, left: -206.78125, top: 15.5625, faceX: 195.011279296875 },
} as const;

/** 從 restOnBg.relScale 與 bgZoom 反推應寫進 HERO 的 figScale（＝ relScale × zoom）；過渡用，下輪廢 homeSync 後可刪 */
export function heroFigScaleFromBattleRel(relScale: number, bgZoom: number): number {
  return relScale * bgZoom;
}

/** 解析人物螢幕 scale：場景 fit.s × HERO.figScale（唯一 figScale 真相） */
export function heroCharScale(sc: HeroScene, fitS: number): number {
  return fitS * (sc.figScale ?? 1);
}
export const SCENE_TILES: [number, number][] = [-1, 0, 1].map(i => [i, 0] as [number, number]);
export const sceneVars = (sc: HeroScene) => ({ '--W': sc.w, '--H': sc.h, '--ax': sc.ax, '--X': sc.X, '--head': sc.head, '--foot': sc.foot, '--span': sc.foot - sc.head, '--k': sc.k }) as React.CSSProperties;
export const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** 抽屜標題列高（與 CSS .home-dungeon --bar-h 相同） */
export const DRAWER_BAR_H = 52;

/**
 * 抽屜半開（四篇／N=4）時的英雄區高：圖鑑內頁／戰鬥 heroSync 以此為場景框高。
 * 390×844 browser：H ≡ CSS host（`--chrome-drawer-rect-y` − zone）。
 * 公式＝ D − (bar + 14 + (D − bar − 56) / 3)。
 * 禁改公式去貼舊綠線 rect 493.5（那會得到 hostH≈371.7／scale≈0.733）。
 */
export const heroPeekHeight = (D: number, bar: number = DRAWER_BAR_H) =>
  D - (bar + 14 + (D - bar - 56) / 3);


/**
 * 場景縮放／位置（px）：W×H＝英雄區尺寸；D＝首頁內容區（.home-dungeon）高；bar＝抽屜標題列高。
 * fit 'headTop'（柳宗元）：人物維持抽屜收合時的螢幕大小（＝cover 縮放），背景＋人物一起下移到「帽頂留白 m」；
 * 其他古人：半開時「帽頂留白 m、腳底距下緣 footPad」的全身縮放；一律不小於英雄區 cover（無黑邊）。
 */
export function computeHeroFit(sc: HeroScene, W: number, H: number, D: number, bar: number = DRAWER_BAR_H) {
  const zoom = sc.bgZoom?.[0] ?? 1;
  const Hc = Math.max(H, D - bar);                 // 抽屜收合時英雄區高
  const Hp = Math.min(H, heroPeekHeight(D, bar));  // 抽屜半開（四篇）時英雄區高 ≡ CSS --peek-h
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


/** 立繪框（.home-scene-fig）在場景中的位置＋靴底對岩頂的平移縮放 */
export function heroFigStyle(scene: HeroScene): React.CSSProperties {
  // rest 貼岩：縮放原點必須＝腳底，否則 figOy（眼線）會讓腳不落 rest（align-v1315-home-r1／follow-battle-r1）
  const oy = scene.rest ? scene.foot : (scene.figOy ?? scene.foot);
  return {
    left: pct(scene.fig[0], scene.w), top: pct(scene.fig[1], scene.h),
    width: pct(scene.fig[2], scene.w), height: pct(scene.fig[3], scene.h),
    ...((scene.figScale ?? 1) !== 1 || scene.rest ? {
      transform: `${scene.rest ? `translate(${pct(scene.rest[0] - (scene.footX ?? scene.ax), scene.fig[2])}, ${pct(scene.rest[1] - scene.foot, scene.fig[3])}) ` : ''}scale(${scene.figScale ?? 1})`,
      transformOrigin: `${((scene.footX ?? scene.ax) - scene.fig[0]) / scene.fig[2] * 100}% ${(oy - scene.fig[1]) / scene.fig[3] * 100}%`,
    } : {}),
  };
}

/** 場景外框（背景層）：sceneVars＋bgZoom（只放大背景，原點在底邊） */
export const heroBgFrameStyle = (scene: HeroScene): React.CSSProperties => ({
  ...sceneVars(scene),
  ...(scene.bgZoom ? { transform: `scale(${scene.bgZoom[0]})`, transformOrigin: `${pct(scene.bgZoom[1], scene.w)} 100%` } : {}),
});

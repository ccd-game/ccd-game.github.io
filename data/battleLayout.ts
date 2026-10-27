import { HERO_SCENES, computeHeroFit, heroPeekHeight } from '../components/home/heroScene';

/**
 * 戰鬥畫面 Boss 立繪定位（以人物本身為準，而非圖片外框）
 *
 * 每張「戰鬥立繪」記錄原圖像素座標：
 * - faceX / eyeY / faceH：臉部中心、眼線、臉高（與 data/portraits.ts 同一套量測；柳宗元的戰鬥立繪是全幅圖裁切 (70,13)，已換算）
 * - headTopY：頭頂（帽頂／髮頂），名牌與狀態列貼在它上方
 * - centerX：水平置中的基準（選填，預設＝faceX，即臉部置中）
 * - fitX0 / fitX1：希望完整入鏡的水平範圍（身形外緣：刀身、展開的衣袖、光環、戰車與馬匹）
 * - fitPriority：臉部尺寸下限使範圍放不下時，優先保住哪一側（'left'：保住左緣，右側可被裁切）
 * - cropL / cropR：允許左／右緣超出畫面的量（佔畫面寬比例）
 *
 * 縮放：先求「入鏡範圍放得下」與「高度放得下」的縮放，再夾在臉高的上下限之間（臉高以畫面寬為比例），
 * 所以寬身形不會縮到臉太小；代價是 fitPriority 的另一側可能被裁切。
 * 水平：優先讓臉對齊中線，若入鏡範圍會超出左右留白就夾回（臉可偏離中線）。
 * - bottomY：身形底部（腳底／衣襬）
 *
 * 版面計算只用這些已知數字與戰鬥區尺寸（ResizeObserver 取得），不讀取 DOM 版面，避免 layout thrash。
 * 新增 Boss 時，在 BATTLE_ANCHORS 以戰鬥立繪檔名（不含副檔名）加一筆即可；未登錄者（例如尚未上線的佔位關卡）退回置中＋底部對齊。
 */
export interface BattleSpriteAnchor {
  w: number; h: number;
  faceX: number; eyeY: number; faceH: number;
  headTopY: number;
  centerX?: number;
  fitX0: number; fitX1: number;
  fitPriority?: 'left' | 'right';
  /** 允許入鏡範圍左／右緣超出畫面的量（佔畫面寬比例），讓臉能更接近目標位置 */
  cropL?: number; cropR?: number;
  bottomY: number;
}

export const BATTLE_ANCHORS: Record<string, BattleSpriteAnchor> = {
  // liu_zong_yuan_battle.png 1135×623（= 全幅 1280×720 合成圖裁切 x70 y13）
  // 入鏡範圍：刀尖（全幅 x229 → 159）到衣襬右緣；待機姿勢不必顯示整把刀，刀尖與火焰可在左緣被裁切（cropL）
  liu_zong_yuan_battle: { w: 1135, h: 623, faceX: 750, eyeY: 112, faceH: 52, headTopY: 28, fitX0: 159, fitX1: 1127, cropL: 0.6, bottomY: 622 },
  // 孔子 v3 kong_zi_character.webp 1280×720（與背景、雙馬層逐像素對齊）：headTopY＝車蓋頂飾 149.5（名字在其上）；
  // 入鏡範圍＝前輪外緣 x246～馬頭 x894；bottomY＝最低馬蹄 705
  kong_zi_character: { w: 1280, h: 720, faceX: 508, eyeY: 271, faceH: 35, headTopY: 150, fitX0: 246, fitX1: 894, fitPriority: 'left', cropL: 0.06, bottomY: 705 },
  // zhu_ge_liang.png 768×1344：頭頂＝綸巾頂；身形含八卦光環
  zhu_ge_liang: { w: 768, h: 1344, faceX: 392, eyeY: 144, faceH: 97, headTopY: 35, fitX0: 54, fitX1: 739, bottomY: 1343 },
  // li_bai.png 1645×1503：頭頂＝髮頂；身形含舉杯的手與兩側衣袖（左側衣袖末端可裁切約 8% 畫面寬，酒杯不會被裁）
  li_bai: { w: 1645, h: 1503, faceX: 1040, eyeY: 205, faceH: 125, headTopY: 103, fitX0: 281, fitX1: 1644, cropL: 0.08, bottomY: 1502 },
};

/** 全體共用的版面參數（以戰鬥區＝畫面上方 62% 為基準） */
export const BATTLE_LAYOUT = {
  /** 戰鬥區高度佔整個遊戲畫面的比例（與 BattleArea 角色層 h-[62%] 一致） */
  sceneRatio: 0.62,
  /** 頭頂最高只能到這裡（留給頭上的名字標籤）：px 與戰鬥區高比例取大者 */
  headTopMinPx: 84,
  headTopMinRatio: 0.2,
  /** 左右至少留白（佔寬度比例） */
  sideMargin: 0.025,
  /** 在「放得下」的縮放之上再放大的倍率（允許邊緣裁切） */
  enlarge: 1.18,
  /** 臉高上下限（佔畫面寬比例）：390 寬時約 28–34px */
  faceMinRatio: 28 / 390,
  faceMaxRatio: 34 / 390,
  /** 臉的目標位置：中線往左偏移（佔寬度比例） */
  shiftLeftRatio: 0.05,
  /** 身形縮放上限：頭頂到腳底最多佔戰鬥區高度的比例（避免過大） */
  maxFigureRatio: 0.74,
  /** 若以腳底貼地會讓眼線低於此比例，就整體上移（寬身形縮小後不致沉到題目框後面） */
  eyeMaxRatio: 0.42,
} as const;

/**
 * 關主名字＋◆ 圖標：全體關主共用的固定槽位（永遠同一格式、同一螢幕位置，不隨關主頭頂或逐關參數改變）。
 * 格式＝緊湊版（名字 12px 在上、◆ 在下，整組水平置中於螢幕）；位置以柳宗元（v1.3.6）為標準：
 * 標籤底邊 y＝柳宗元戰鬥場景（未經首頁入陣時的 heroSync→HERO 幾何；帽頂＝bodyBox alpha 實測 y36）帽頂螢幕 y − gap，x＝畫面寬／2。
 * 新關主不需任何設定即套用；不得再加逐關的名字位置參數。
 */
export const BOSS_NAME_SLOT = {
  /** 位置基準關主（BATTLE_SCENES 鍵） */
  ref: 'liu_zong_yuan_battle',
  /** 標籤底邊（◆）與基準帽頂的間距 px */
  gap: 20,
  /** 版面淨空計算用的名字列高（px，同 v1.3.6 緊湊版） */
  labelH: 12,
  /** 槽位框固定寬高（px）：名字 12px（至多約四字）＋間距 2＋◆ 8；內容底部置中 */
  w: 64,
  h: 22,
} as const;

export interface BattleLayout {
  /** 立繪縮放（原圖 px → 畫面 px） */
  scale: number;
  /** 立繪外框在 BattleArea 根座標的位置與尺寸（px） */
  left: number; top: number; width: number; height: number;
  /** 頭頂錨點（名牌列貼在其上方）與臉部、身形底部（攻擊動畫的 transform-origin） */
  headX: number; headY: number;
  faceX: number; faceY: number;
  centerX: number; bottomY: number;
  anchor: BattleSpriteAnchor;
}

/** 由立繪路徑取得鍵值（檔名去副檔名）：.../avatar/zhu_ge_liang/zhu_ge_liang.png → zhu_ge_liang */
export const battleAnchorKey = (src: string): string => (src.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');

export function computeBattleLayout(anchor: BattleSpriteAnchor | undefined, rootW: number, rootH: number): BattleLayout | null {
  if (!anchor || rootW <= 0 || rootH <= 0) return null;
  const a = anchor, P = BATTLE_LAYOUT;
  const sceneH = rootH * P.sceneRatio;
  const cx = a.centerX ?? a.faceX;
  const headMin = Math.max(P.headTopMinPx, sceneH * P.headTopMinRatio);
  const figH = a.bottomY - a.headTopY;
  const sH = Math.min(sceneH - headMin, sceneH * P.maxFigureRatio) / figH;
  // 整個入鏡範圍放得進「寬度 − 左右留白」
  const margin = rootW * P.sideMargin;
  const sW = (rootW - 2 * margin) / (a.fitX1 - a.fitX0);
  const sFit = Math.min(sH, sW);
  const sFaceMin = (rootW * P.faceMinRatio) / a.faceH, sFaceMax = (rootW * P.faceMaxRatio) / a.faceH;
  const s = Math.min(Math.max(sFit * P.enlarge, sFaceMin), sFaceMax);
  // 腳底貼齊戰鬥區底部；眼線太低則上移；頭頂高過名字標籤的保留區則下移（腳底可沉到題目框後，被裁切）
  let top = sceneH - a.bottomY * s;
  const eyeMax = sceneH * P.eyeMaxRatio;
  if (top + a.eyeY * s > eyeMax) top = eyeMax - a.eyeY * s;
  if (top + a.headTopY * s < headMin) top = headMin - a.headTopY * s;
  // 水平：優先讓臉（centerX）對齊中線稍偏左處；若會讓入鏡範圍超出左右留白，就夾回範圍內（臉因此偏離中線）
  const leftMin = margin - a.fitX0 * s - (a.cropL ?? 0) * rootW;          // 入鏡範圍左緣 ≥ 左留白（減去允許裁切量）
  const leftMax = rootW - margin - a.fitX1 * s + (a.cropR ?? 0) * rootW;  // 入鏡範圍右緣 ≤ 右留白（加上允許裁切量）
  let left: number;
  const target = rootW * (0.5 - P.shiftLeftRatio) - cx * s;
  if (leftMin <= leftMax) left = Math.min(Math.max(target, leftMin), leftMax);
  else left = a.fitPriority === 'right' ? leftMax : a.fitPriority === 'left' ? leftMin : (leftMin + leftMax) / 2; // 放不下：保住指定的一側
  return {
    scale: s, left, top, width: a.w * s, height: a.h * s,
    headX: rootW / 2, headY: bossNameSlotY(rootW, rootH),
    faceX: left + a.faceX * s, faceY: top + a.eyeY * s,
    centerX: rootW / 2, bottomY: top + a.bottomY * s,
    anchor: a,
  };
}

/**
 * 戰鬥場景落地：背景與立繪放在同一個容器、同一個縮放／位移，人物坐／站在畫中的岩石或地面上。
 * 幾何對齊首頁 HERO_SCENES（home-v112）；單位為背景原圖像素。
 * - fig：立繪在背景中的位置框（柳宗元／孔子的立繪與背景同尺寸、逐像素對齊）
 * - crop：戰鬥立繪若是全幅裁切，記裁切起點與尺寸（相對全幅；無則立繪＝fig）
 * - foot：地面線（場景 Y），對齊戰鬥區底；多出的高度從上方裁切
 * - ax：身體／臉水平錨點（場景 X），對齊偏左目標
 */
export interface BattleScene {
  bgW: number; bgH: number;
  fig: [number, number, number, number];
  crop?: { x: number; y: number; w: number; h: number };
  foot: number;
  ax: number;
  /** 靴底接觸點 X（場景像素）；縮放原點。預設 ax */
  footX?: number;
  /**
   * 相對「與背景同 dpi（sBg）」的立繪／特效倍率。
   * 繞腳底縮放並對齊背景岩石接觸點；禁止對已 face-clamp 的尺寸再乘一次。
   */
  charScale?: number;
  /** 僅背景平移（螢幕 px）：正 X＝右、正 Y＝下 */
  bgOffsetX?: number;
  bgOffsetY?: number;
  /**
   * 臉心（背景原圖像素）。設定後人物＋背景同量平移，使臉心落在戰鬥畫面區正中
   * （頂 HP 條下緣 12px ～ 底 HP 條上緣 0.6·H−11）；腳仍貼岩。露邊時以靴底為原點放大背景補滿。
   */
  faceCenter?: [number, number];
  /**
   * 人物外框（背景原圖像素 [x0,y0,x1,y1]，帽頂～靴底）。設定後人物＋背景同量平移，使外框置中於
   * 「頂 HP 條下緣 12px ～ 題目框上緣（0.6·H − 162）」；腳仍貼岩；露邊時以靴底為原點放大背景補滿。
   */
  bodyBox?: [number, number, number, number];
  /** 待機呼吸的垂直位移（px，預設 8）。0＝只做 scale(1.01)（原點在靴底），腳不離岩 */
  breathY?: number;
  /** 最後套用的獨立位移（螢幕 px，正＝下移）：背景與人物（含飛劍）各自移動，不互相連動、不重新貼岩、不補邊 */
  bgShiftY?: number;
  charShiftY?: number;
  /** 背景上緣對齊此 y（螢幕 px；例：頂 HP 條下緣 12）。設定時取代 bgShiftY；不縮放、不鏡射補邊 */
  bgTopAlign?: number;
  /**
   * 與首頁同一貼合點：立繪 (foot 原點, 人物層像素) 對到背景原圖像素 bgRest，人物相對背景比例 relScale。
   * 在背景最終位置（含 bgTopAlign）之後套用，取代 charShiftY；人物螢幕位置由此推得。
   */
  restOnBg?: { foot: [number, number]; bg: [number, number]; relScale: number };
  /**
   * 與首頁預覽同步（同 viewport 時人物大小、背景縮放與位置與首頁相同）。
   * 首頁 headTop：場景縮放 s = max(W/w, (視窗高 − chrome)/h)；場景 left = min(0, max(W − s·w, X·W − s·ax))，
   * top = heroTop + topPad − s·headY；背景另以 (zoomX, 底邊) 為原點放大 zoom。chrome＝頂列 88＋導覽 76＋抽屜把手 52。
   */
  homeSync?: { w: number; h: number; chrome: number; heroTop: number; topPad: number; headY: number; X: number; ax: number; zoom: number; zoomX: number };
  /**
   * 與首頁預覽同步（通用版）：以 HERO_SCENES[heroSync] 及首頁同一套 computeHeroFit 算出同 viewport 下首頁英雄區（抽屜半開）的
   * 場景縮放與位置，背景與人物（全幅對齊的 fig）都套用它 → 人物大小、錨點與首頁相同。未從首頁無縫入陣（無 homeBox）時使用。
   */
  heroSync?: string;
  /** 疊在人物之上的前景層（與戰鬥立繪同框、逐像素對齊；例：孔子雙馬）。順序：背景 → 人物 → front */
  front?: string;
}

/** 首頁版面：頂欄區高（英雄區上緣＝--hud-vnext-zone-h）、底部導覽高；內容區高＝視窗高 − 兩者。
 * one-source-geom-battle-r2：88→121.8 對齊 index.css --hud-vnext-zone-h（browser＠390；禁再寫死 88）。
 * SA 不把 sat 加進這兩個常數。整頁 contain 見 src/lib/gameContain.ts。 */
export const HOME_TOP_BAR_H = 121.8;
export const HOME_NAV_H = 76;

export const BATTLE_SCENES: Record<string, BattleScene> = {
  // 坐於岩上；戰鬥立繪 = 全幅 1280×720 裁切 (70, 13) 1135×623
  // one-source-geom-battle-r2：廢 homeSync／restOnBg；heroSync→HERO_SCENES.liu_zong_yuan（figScale 0.64／bgZoom／rest）
  // 無 homeBox 時背景＋人物同讀 computeHeroFit＋bgZoom＋rest；禁第二套 figScale 真相
  liu_zong_yuan_battle: { bgW: 1280, bgH: 720, fig: [0, 0, 1280, 720], crop: { x: 70, y: 13, w: 1135, h: 623 }, foot: 633, footX: 975, ax: 867, bodyBox: [378, 36, 1198, 636], breathY: 0, heroSync: 'liu_zong_yuan' },
  // 孔子 v3：坐於戰車、雙馬在前；三層與背景同尺寸逐像素對齊（輪／蹄本來就踏在背景路面上）。
  // heroSync：縮放／位置與首頁預覽同 viewport 相同；front＝雙馬（武器層）疊在人物之上
  kong_zi_character: { bgW: 1280, bgH: 720, fig: [0, 0, 1280, 720], foot: 640.9, ax: 533, breathY: 0, heroSync: 'kong_zi', front: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi_weapon.webp` },
  // 立於殿前木棧（欄杆右側地板）
  zhu_ge_liang: { bgW: 1408, bgH: 768, fig: [860, 140, 320, 560], foot: 712, ax: 1020 },
  // 立於月下岩台
  li_bai: { bgW: 2760, bgH: 1504, fig: [804, 270, 985, 900], foot: 1200, ax: 1380 },
};

export interface BattleSceneBox {
  left: number; top: number; width: number; height: number; scale: number;
  /** 背景下緣高於戰鬥區底時，於下方接一張上下鏡射的延伸補滿（不縮放背景，岩座比例不變） */
  mirrorBottom?: boolean;
  /** 沿用主頁預覽背景時：背景未蓋滿戰鬥區的那幾邊，以上下／左右鏡射圖塊補滿（不縮放、不移動，交接時畫面不變） */
  mirrorTiles?: boolean;
  /** 沿用主頁背景後，各邊未被背景本體蓋到的寬度（px；0＝無缺口） */
  gap?: { left: number; top: number; right: number; bottom: number };
}

/**
 * 落地＋cover 填滿：場景縮放至少讓背景蓋住戰鬥區（寬與高），腳底貼齊戰鬥區底（多出的從上方／兩側裁）；
 * 水平對齊偏左目標。立繪版面由場景反推，與背景逐像素對齊。
 */
export function computeGroundedBattle(
  anchor: BattleSpriteAnchor | undefined,
  scene: BattleScene | undefined,
  rootW: number,
  rootH: number,
  homeBox?: Parameters<typeof groundedCore>[4],
): { layout: BattleLayout; sceneBox: BattleSceneBox } | null {
  const r = groundedCore(anchor, scene, rootW, rootH, homeBox);
  return r && { layout: r.layout, sceneBox: r.sceneBox };
}

function groundedCore(
  anchor: BattleSpriteAnchor | undefined,
  scene: BattleScene | undefined,
  rootW: number,
  rootH: number,
  /** 入陣無縫轉場：沿用主頁預覽的背景與人物幾何（見 src/lib/enterTransition.ts measureHomeScene） */
  homeBox?: { bg: { left: number; top: number; scale: number }; scene: { left: number; top: number; scale: number }; breatheOrigin?: [number, number] | null } | null,
  /** 僅供 bossNameSlotY 計算基準關主時使用（避免遞迴） */
  slotOverride?: number,
): { layout: BattleLayout; sceneBox: BattleSceneBox; hatScreenY: number } | null {
  if (!anchor || !scene || rootW <= 0 || rootH <= 0) return null;
  // SA 的 sat／sab 由 #root contain 的外黑邊吃掉（gameContain）。這裡永遠用傳入的 root 高，
  // 不扣 inset、不對場景做垂直 dy。用較矮的高重跑會把柳從 ≈0.528 縮到 ≈0.445。
  const a = anchor, P = BATTLE_LAYOUT, sc = scene;
  const sceneH = rootH * P.sceneRatio;
  const [fx, fy, fw, fh] = sc.fig;
  const crop = sc.crop ?? { x: fx, y: fy, w: fw, h: fh };
  const sameDpi = !!sc.crop || (fw === a.w && fh === a.h);

  // 背景 cover：蓋滿戰鬥區，腳底貼底（上方／兩側可裁）
  const sBg = Math.max(rootW / sc.bgW, sceneH / sc.bgH, sceneH / sc.foot);
  const topBg = sceneH - sc.foot * sBg;
  const targetX = rootW * (0.5 - P.shiftLeftRatio);
  let leftBg = targetX - sc.ax * sBg;
  if (sc.bgW * sBg < rootW) leftBg = (rootW - sc.bgW * sBg) / 2;
  const sceneBox: BattleSceneBox = { left: leftBg, top: topBg, width: sc.bgW * sBg, height: sc.bgH * sBg, scale: sBg }; // top 可被 offsetY 上移

  // 立繪：預設臉高 clamp。若設 charScale → 以 sBg×charScale 繞場景腳底縮放（與背景同原點；勿 face-clamp 後再 ×0.7）
  const sFaceMin = (rootW * P.faceMinRatio) / a.faceH;
  const sFaceMax = (rootW * P.faceMaxRatio) / a.faceH;
  const figScaleBase = Math.min(sFaceMax, Math.max(sFaceMin, sameDpi ? Math.min(sBg, sFaceMax) : sFaceMin));
  const charScale = sc.charScale ?? 1;
  const figScale = charScale !== 1 ? sBg * charScale : figScaleBase;
  const footY = topBg + sc.foot * sBg; // 背景岩石靴底線（= sceneH）
  const figW = sameDpi ? crop.w * figScale : a.w * figScale;
  const figH = sameDpi ? crop.h * figScale : a.h * figScale;
  let figTop: number;
  let figLeft: number;
  if (charScale !== 1 && sameDpi) {
    const footX = sc.footX ?? sc.ax;
    const footScreenX = leftBg + footX * sBg;
    const footInCropX = footX - crop.x;
    const footInCropY = sc.foot - crop.y;
    figLeft = footScreenX - footInCropX * figScale;
    figTop = footY - footInCropY * figScale;
  } else {
    figTop = footY - a.bottomY * figScale;
    figLeft = targetX - a.faceX * figScale;
    if (!sameDpi) {
      figTop = topBg + (fy + fh) * sBg - a.bottomY * figScale;
    }
  }

  // 背景單獨平移（bg only）；立繪維持腳底原點再套 offsetY（不上移背景）
  const bgOx = sc.bgOffsetX ?? 0;
  const bgOy = sc.bgOffsetY ?? 0;
  sceneBox.left += bgOx;
  sceneBox.top += bgOy;
  // 立繪錨在背景靴底：隨背景同量平移，腳仍貼岩
  figLeft += bgOx;
  figTop += bgOy;

  // 臉心置中：人物＋背景同量平移；露邊時以靴底螢幕點為原點放大背景（人物大小不變，腳下岩點不動）
  if ((sc.faceCenter || sc.bodyBox) && sameDpi) {
    const areaTop = 12; // 頂 HP 條 h-[12px]
    let dx: number, dy: number;
    if (sc.bodyBox) {
      // 題目框：bottom calc(40% + 124px)、高 40px → 上緣 0.6·H − 164
      const areaBottom = rootH * 0.6 - 164; // 題目 bottom calc(40%+124)+高40
      const [x0, y0, x1, y1] = sc.bodyBox;
      dx = rootW / 2 - (figLeft + ((x0 + x1) / 2 - crop.x) * figScale);
      dy = (areaTop + areaBottom) / 2 - (figTop + ((y0 + y1) / 2 - crop.y) * figScale);
      // 名字淨空優先：標籤頂需 ≥ HP 條下緣 + 8；呼吸中段 scale(1.01) 會讓帽頂再上移約 3px → 不足時整組最少量下移
      const BREATH_PEAK_UP = 3, LABEL_GAP = 6; // 緊湊標籤（BOSS_NAME_SLOT.labelH）＋帽頂間距 6（同 v1.3.6 柳宗元）
      const hatTop = figTop + dy + (y0 - crop.y) * figScale;
      const labelTop = hatTop - BREATH_PEAK_UP - LABEL_GAP - BOSS_NAME_SLOT.labelH;
      if (labelTop < areaTop + 8) dy += areaTop + 8 - labelTop;
    } else {
      const areaBottom = rootH * 0.6 - 11; // 底 HP 條：bottom calc(40% + 1px)、h 10px
      const [fcx, fcy] = sc.faceCenter!;
      const BREATH_MEAN_Y = 4;             // enemyBreath 在 translateY 0～8px 間擺動，取平均
      dx = rootW / 2 - (figLeft + (fcx - crop.x) * figScale);
      dy = (areaTop + areaBottom) / 2 - BREATH_MEAN_Y - (figTop + (fcy - crop.y) * figScale);
    }
    figLeft += dx; figTop += dy;
    sceneBox.left += dx; sceneBox.top += dy;
    const footSX = sceneBox.left + (sc.footX ?? sc.ax) * sceneBox.scale;
    const footSY = sceneBox.top + sc.foot * sceneBox.scale;
    const L = footSX - sceneBox.left, R = sceneBox.left + sceneBox.width - footSX;
    const T = footSY - sceneBox.top, B = sceneBox.top + sceneBox.height - footSY;
    const mirror = !!sc.bodyBox && sceneBox.top + sceneBox.height < sceneH;
    const m = Math.max(1, footSX / L, (rootW - footSX) / R, footSY / T, mirror ? 1 : (sceneH - footSY) / B);
    if (mirror) sceneBox.mirrorBottom = true;
    if (m > 1) {
      sceneBox.left = footSX - L * m; sceneBox.top = footSY - T * m;
      sceneBox.width *= m; sceneBox.height *= m; sceneBox.scale *= m;
    }
  }

  // 獨立位移（指定值，不連動、不補邊）
  if (sc.bgTopAlign != null) {
    sceneBox.top = sc.bgTopAlign;
    sceneBox.mirrorBottom = false;
    // 滿版：底部／兩側不足時，以背景上緣（水平取畫面中心）為原點等比放大補滿；上緣不動
    const ox = rootW / 2, oy = sceneBox.top;
    const Lw = ox - sceneBox.left, Rw = sceneBox.left + sceneBox.width - ox, Bh = sceneBox.height;
    const mFill = Math.max(1, ox / Lw, (rootW - ox) / Rw, (sceneH - oy) / Bh);
    if (mFill > 1) {
      sceneBox.left = ox - Lw * mFill;
      sceneBox.width *= mFill; sceneBox.height *= mFill; sceneBox.scale *= mFill;
    }
  } else if (sc.bgShiftY) sceneBox.top += sc.bgShiftY;
  if (sc.homeSync) {
    const hs = sc.homeSync;
    const s = Math.max(rootW / hs.w, (rootH - hs.chrome) / hs.h);
    const sl = Math.min(0, Math.max(rootW - s * hs.w, hs.X * rootW - s * hs.ax));
    const st = hs.heroTop + hs.topPad - s * hs.headY;
    const sB = s * hs.zoom;
    let left = sl + hs.zoomX * s * (1 - hs.zoom), top = st + hs.h * s * (1 - hs.zoom);
    let scale = sB;
    // 滿版保險：任一邊露空時，以背景上的貼合點為原點最小放大（正常尺寸不會觸發）
    if (sc.restOnBg) {
      const [rbx, rby] = sc.restOnBg.bg;
      const px = left + rbx * scale, py = top + rby * scale;
      const m = Math.max(1, (px - 0) / (px - left), (rootW - px) / (left + sc.bgW * scale - px),
        top > 0 ? (py - 0) / (py - top) : 1, (sceneH - py) / (top + sc.bgH * scale - py));
      if (m > 1) { left = px - (px - left) * m; top = py - (py - top) * m; scale *= m; }
    }
    sceneBox.left = left; sceneBox.top = top; sceneBox.scale = scale;
    sceneBox.width = sc.bgW * scale; sceneBox.height = sc.bgH * scale; sceneBox.mirrorBottom = false;
  }
  if (sc.charShiftY) figTop += sc.charShiftY;
  // 通用首頁同步（one-source）：場景＝computeHeroFit；有 bgZoom 則背景另放大（與 heroBgFrameStyle 同）；
  // 有 rest／figScale（柳）→ 人物由 HERO rest＋figScale 貼岩；否則（孔）人物與場景同框。
  let heroFigScale: number | null = null;
  const heroSc = sc.heroSync ? HERO_SCENES[sc.heroSync] : undefined;
  if (heroSc && !homeBox) {
    // rootW／rootH 是設計畫布。SA 的縮放只在 #root；這裡不扣 sat、不再乘 shell scale。
    const D = rootH - HOME_TOP_BAR_H - HOME_NAV_H;
    const { s, left: fitL, top: t } = computeHeroFit(heroSc, rootW, heroPeekHeight(D), D);
    const sceneTop = HOME_TOP_BAR_H + t;
    const zoom = heroSc.bgZoom?.[0] ?? 1;
    const zoomX = heroSc.bgZoom?.[1] ?? 0;
    // 背景：bake bgZoom（原點在底邊）→ sceneBox 供繪製；人物用未放大的 s／fitL／sceneTop
    let left = fitL, top = sceneTop, scale = s;
    if (zoom !== 1) {
      left = fitL + zoomX * s * (1 - zoom);
      top = sceneTop + heroSc.h * s * (1 - zoom);
      scale = s * zoom;
    }
    sceneBox.left = left; sceneBox.top = top; sceneBox.scale = scale;
    sceneBox.width = sc.bgW * scale; sceneBox.height = sc.bgH * scale; sceneBox.mirrorBottom = false;
    const gap = {
      left: Math.max(0, left), top: Math.max(0, top),
      right: Math.max(0, rootW - (left + sceneBox.width)), bottom: Math.max(0, sceneH - (top + sceneBox.height)),
    };
    sceneBox.gap = gap;
    sceneBox.mirrorTiles = gap.left > 0.5 || gap.top > 0.5 || gap.right > 0.5 || gap.bottom > 0.5;
    const figS = heroSc.figScale ?? 1;
    if (heroSc.rest && sameDpi) {
      // 柳：靴底落 HERO.rest；螢幕 scale＝fit.s × figScale（唯一 figScale 真相）
      const [rx, ry] = heroSc.rest;
      const rfx = heroSc.footX ?? heroSc.ax;
      const rfy = heroSc.foot;
      heroFigScale = s * figS;
      figLeft = fitL + rx * s - (rfx - crop.x) * heroFigScale;
      figTop = sceneTop + ry * s - (rfy - crop.y) * heroFigScale;
    } else {
      // 孔等：全幅對齊，人物＝場景（含已 bake 的 bgZoom，無 figScale 時＝s）
      heroFigScale = sameDpi ? scale : scale * fw / a.w;
      figLeft = left + (sameDpi ? crop.x : fx) * scale;
      figTop = top + (sameDpi ? crop.y : fy) * scale;
    }
  }
  if (homeBox) {
    // 戰鬥背景＝主頁預覽背景（同圖、同縮放、同位置）
    const { left, top, scale } = homeBox.bg;
    sceneBox.left = left; sceneBox.top = top; sceneBox.scale = scale;
    sceneBox.width = sc.bgW * scale; sceneBox.height = sc.bgH * scale; sceneBox.mirrorBottom = false;
    const gap = {
      left: Math.max(0, left), top: Math.max(0, top),
      right: Math.max(0, rootW - (left + sceneBox.width)), bottom: Math.max(0, sceneH - (top + sceneBox.height)),
    };
    sceneBox.gap = gap;
    sceneBox.mirrorTiles = gap.left > 0.5 || gap.top > 0.5 || gap.right > 0.5 || gap.bottom > 0.5;
  }
  let restScale: number | null = null;
  if (sc.restOnBg && sameDpi) {
    // 過渡：少數關若仍帶 restOnBg 數字；一源關主（柳）已刪，改走下方 HERO／homeBox
    const { foot: [rfx, rfy], bg: [rbx, rby], relScale } = sc.restOnBg;
    restScale = sceneBox.scale * relScale;
    figLeft = sceneBox.left + rbx * sceneBox.scale - (rfx - crop.x) * restScale;
    figTop = sceneBox.top + rby * sceneBox.scale - (rfy - crop.y) * restScale;
  } else if (homeBox) {
    // 入陣無縫：背景已＝homeBox.bg；人物須讀 HERO rest／figScale（禁把 scene.scale 當人物 scale——柳 scene.s 無 figScale）
    const heroForHome = sc.heroSync ? HERO_SCENES[sc.heroSync] : undefined;
    const s = homeBox.scene.scale;
    if (heroForHome?.rest && sameDpi) {
      const figS = heroForHome.figScale ?? 1;
      const [rx, ry] = heroForHome.rest;
      const rfx = heroForHome.footX ?? heroForHome.ax;
      const rfy = heroForHome.foot;
      restScale = s * figS;
      figLeft = homeBox.scene.left + rx * s - (rfx - crop.x) * restScale;
      figTop = homeBox.scene.top + ry * s - (rfy - crop.y) * restScale;
    } else {
      // 孔等：全幅對齊，人物框＝主頁場景層
      restScale = sameDpi ? s : s * fw / a.w;
      figLeft = homeBox.scene.left + (sameDpi ? crop.x : fx) * s;
      figTop = homeBox.scene.top + (sameDpi ? crop.y : fy) * s;
    }
  } else if (heroFigScale != null) {
    restScale = heroFigScale;
  }
  // 沿用主頁時，戰鬥待機呼吸改用主頁同一個 homeSceneBreathe（只有 scaleY，沒有 breathY 下移），相位由 syncHeroAnimations 接續
  const figScaleF = restScale ?? figScale;

  // 名字／圖示：全體共用固定槽位（BOSS_NAME_SLOT），不隨本關頭頂位置改變
  const faceScreenX = figLeft + a.faceX * figScaleF;
  const hatScreenY = figTop + (sc.bodyBox && sameDpi ? sc.bodyBox[1] - crop.y : a.headTopY) * figScaleF;
  const headX = rootW / 2;
  const headY = slotOverride ?? bossNameSlotY(rootW, rootH);
  const layout: BattleLayout = {
    scale: figScaleF,
    left: figLeft, top: figTop,
    width: restScale ? (sameDpi ? crop.w : a.w) * restScale : figW,
    height: restScale ? (sameDpi ? crop.h : a.h) * restScale : figH,
    headX, headY,
    faceX: faceScreenX,
    faceY: figTop + a.eyeY * figScaleF,
    centerX: rootW / 2,
    bottomY: figTop + a.bottomY * figScaleF,
    anchor: a,
  };
  return { layout, sceneBox, hatScreenY: hatScreenY };
}

/** 名字槽位 y（標籤底邊，螢幕 px）：由基準關主（柳宗元）同 viewport 的帽頂推得；依 viewport 快取 */
const slotCache = new Map<string, number>();
export function bossNameSlotY(rootW: number, rootH: number): number {
  const key = `${rootW}x${rootH}`;
  const hit = slotCache.get(key);
  if (hit != null) return hit;
  const R = BOSS_NAME_SLOT;
  const ref = groundedCore(BATTLE_ANCHORS[R.ref], BATTLE_SCENES[R.ref], rootW, rootH, null, 0);
  const y = ref ? ref.hatScreenY - R.gap : 0;
  if (slotCache.size > 32) slotCache.clear();
  slotCache.set(key, y);
  return y;
}

/** @deprecated 改由 computeGroundedBattle；保留給無場景資料時的退路 */
export function computeBattleScene(
  scene: BattleScene | undefined,
  layout: BattleLayout | null,
): BattleSceneBox | null {
  if (!scene || !layout) return null;
  const [fx, fy, fw] = scene.fig;
  const cropX = scene.crop?.x ?? 0, cropY = scene.crop?.y ?? 0;
  const scale = scene.crop ? layout.scale : layout.width / fw;
  return {
    left: layout.left - (fx + cropX) * scale,
    top: layout.top - (fy + cropY) * scale,
    width: scene.bgW * scale,
    height: scene.bgH * scale,
    scale,
  };
}

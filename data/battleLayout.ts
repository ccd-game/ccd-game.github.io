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
  // 入鏡範圍：刀尖（全幅 x229 → 159）到衣襬右緣；待機姿勢不必顯示整把刀，刀尖與火焰可在左緣被裁切（cropL），臉與其他角色同樣對齊偏左目標
  liu_zong_yuan_battle: { w: 1135, h: 623, faceX: 750, eyeY: 112, faceH: 52, headTopY: 28, fitX0: 159, fitX1: 1127, cropL: 0.6, bottomY: 622 },
  // kong_zi.png 1408×768：頭頂＝髮冠頂；入鏡範圍＝車輪（x248）到馬頭（x1355）；放不下時保住戰車（車輪外緣可裁切約 6% 畫面寬），馬匹可被裁切
  kong_zi: { w: 1408, h: 768, faceX: 610, eyeY: 177, faceH: 45, headTopY: 122, fitX0: 248, fitX1: 1355, fitPriority: 'left', cropL: 0.06, bottomY: 767 },
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
  /** 名字標籤底部與頭頂的距離 px */
  headGap: 4,
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
    headX: left + a.faceX * s, headY: top + a.headTopY * s - P.headGap,
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
}

export const BATTLE_SCENES: Record<string, BattleScene> = {
  // 坐於岩上；戰鬥立繪 = 全幅 1280×720 裁切 (70, 13) 1135×623
  liu_zong_yuan_battle: { bgW: 1280, bgH: 720, fig: [0, 0, 1280, 720], crop: { x: 70, y: 13, w: 1135, h: 623 }, foot: 650, ax: 820 },
  // 坐於車中；立繪與背景同尺寸
  kong_zi: { bgW: 1408, bgH: 768, fig: [0, 0, 1408, 768], foot: 705, ax: 616 },
  // 立於殿前木棧（欄杆右側地板）
  zhu_ge_liang: { bgW: 1408, bgH: 768, fig: [860, 140, 320, 560], foot: 712, ax: 1020 },
  // 立於月下岩台
  li_bai: { bgW: 2760, bgH: 1504, fig: [804, 270, 985, 900], foot: 1200, ax: 1380 },
};

export interface BattleSceneBox {
  left: number; top: number; width: number; height: number; scale: number;
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
): { layout: BattleLayout; sceneBox: BattleSceneBox } | null {
  if (!anchor || !scene || rootW <= 0 || rootH <= 0) return null;
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
  const sceneBox: BattleSceneBox = { left: leftBg, top: topBg, width: sc.bgW * sBg, height: sc.bgH * sBg, scale: sBg };

  // 立繪臉高 28–34px（390 寬）；腳底對齊場景地面線，水平以臉對齊偏左目標
  const sFaceMin = (rootW * P.faceMinRatio) / a.faceH;
  const sFaceMax = (rootW * P.faceMaxRatio) / a.faceH;
  const figScale = Math.min(sFaceMax, Math.max(sFaceMin, sameDpi ? Math.min(sBg, sFaceMax) : sFaceMin));
  const footY = topBg + sc.foot * sBg; // = sceneH
  const figW = sameDpi ? crop.w * figScale : a.w * figScale;
  const figH = sameDpi ? crop.h * figScale : a.h * figScale;
  let figTop = footY - a.bottomY * figScale;
  let figLeft = targetX - a.faceX * figScale;
  if (!sameDpi) {
    // 立繪底對齊 fig 框底（≈場景地面）
    figTop = topBg + (fy + fh) * sBg - a.bottomY * figScale;
  }

  // 名字標籤：水平對準臉心，避開左上 AUTO／WIN／LOSE 直欄與右上題型；垂直貼在頭頂上方（不低於 HP 條下緣）
  const headMin = Math.max(28, P.headTopMinPx * 0.35);
  const headX = Math.min(Math.max(targetX, 126), rootW - 126);
  const headY = Math.max(figTop + a.headTopY * figScale - P.headGap, headMin);
  const layout: BattleLayout = {
    scale: figScale,
    left: figLeft, top: figTop, width: figW, height: figH,
    headX, headY,
    faceX: targetX,
    faceY: figTop + a.eyeY * figScale,
    centerX: rootW / 2,
    bottomY: figTop + a.bottomY * figScale,
    anchor: a,
  };
  return { layout, sceneBox };
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

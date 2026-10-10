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
  /** 名字標籤底邊與頭頂的間距（px）；未設則用 BATTLE_LAYOUT.headGap。目前只調柳宗元 */
  nameGap?: number;
  /** 緊湊名字標籤：名字 12px 在上、◆ 在下（行高 1），整組置中 */
  nameCompact?: boolean;
  bottomY: number;
}

export const BATTLE_ANCHORS: Record<string, BattleSpriteAnchor> = {
  // liu_zong_yuan_battle.png 1135×623（= 全幅 1280×720 合成圖裁切 x70 y13）
  // 入鏡範圍：刀尖（全幅 x229 → 159）到衣襬右緣；待機姿勢不必顯示整把刀，刀尖與火焰可在左緣被裁切（cropL）
  // nameGap：名字底邊與頭頂間距（390 寬約 18px）；全體可玩 Boss 統一
  liu_zong_yuan_battle: { w: 1135, h: 623, faceX: 750, eyeY: 112, faceH: 52, headTopY: 28, fitX0: 159, fitX1: 1127, cropL: 0.6, nameGap: 6, nameCompact: true, bottomY: 622 }, // 人物 bbox 置中後帽頂≈40；標準標籤(38px+18)放不下 → 緊湊版
  // kong_zi.png 1408×768：頭頂＝髮冠頂；入鏡範圍＝車輪（x248）到馬頭（x1355）；放不下時保住戰車（車輪外緣可裁切約 6% 畫面寬），馬匹可被裁切
  kong_zi: { w: 1408, h: 768, faceX: 610, eyeY: 177, faceH: 45, headTopY: 122, fitX0: 248, fitX1: 1355, fitPriority: 'left', cropL: 0.06, nameGap: 18, bottomY: 767 },
  // zhu_ge_liang.png 768×1344：頭頂＝綸巾頂；身形含八卦光環
  zhu_ge_liang: { w: 768, h: 1344, faceX: 392, eyeY: 144, faceH: 97, headTopY: 35, fitX0: 54, fitX1: 739, nameGap: 18, bottomY: 1343 },
  // li_bai.png 1645×1503：頭頂＝髮頂；身形含舉杯的手與兩側衣袖（左側衣袖末端可裁切約 8% 畫面寬，酒杯不會被裁）
  li_bai: { w: 1645, h: 1503, faceX: 1040, eyeY: 205, faceH: 125, headTopY: 103, fitX0: 281, fitX1: 1644, cropL: 0.08, nameGap: 18, bottomY: 1502 },
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
    headX: left + a.faceX * s, headY: top + a.headTopY * s - (a.nameGap ?? P.headGap),
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
  /** 立繪＋特效上移像素（螢幕），正值＝上移；可與背景 offset 分離 */
  offsetY?: number;
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
  /** 名字標籤一律水平置中於螢幕（x = rootW/2），不跟臉 */
  nameScreenCenter?: boolean;
  /** 待機呼吸的垂直位移（px，預設 8）。0＝只做 scale(1.01)（原點在靴底），腳不離岩 */
  breathY?: number;
  /** 最後套用的獨立位移（螢幕 px，正＝下移）：背景與人物（含飛劍）各自移動，不互相連動、不重新貼岩、不補邊 */
  bgShiftY?: number;
  charShiftY?: number;
  /** 背景上緣對齊此 y（螢幕 px；例：頂 HP 條下緣 12）。設定時取代 bgShiftY；不縮放、不鏡射補邊 */
  bgTopAlign?: number;
  /** 名字標籤底邊（◆）與帽頂的顯示間距（px）；只影響名字位置，不影響人物／背景版面 */
  labelGap?: number;
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
}

export const BATTLE_SCENES: Record<string, BattleScene> = {
  // 坐於岩上；戰鬥立繪 = 全幅 1280×720 裁切 (70, 13) 1135×623
  // 坐於岩上（zoomout_v2 bg）；靴底 (974,634)；戰鬥人物／特效 charScale 0.7，腳仍貼岩；首頁預覽尺寸另見 home patch
  // charScale 0.56（=0.7×0.8）繞靴底縮放；人物外框（alpha bbox 378,36–1198,636）置中於題目框以上的畫面區，背景同量平移（腳貼岩）；名字置中於螢幕
  liu_zong_yuan_battle: { bgW: 1280, bgH: 720, fig: [0, 0, 1280, 720], crop: { x: 70, y: 13, w: 1135, h: 623 }, foot: 634, footX: 974, ax: 820, charScale: 0.56, bodyBox: [378, 36, 1198, 636], nameScreenCenter: true, breathY: 0, bgTopAlign: 12, labelGap: 20, restOnBg: { foot: [975, 633], bg: [953.77, 465.18], relScale: 0.64 / 1.14 },
    // v6：homeSync＝背景縮放／位置、人物大小與首頁同 viewport 一致（首頁 figScale 0.64、bgZoom 1.14@x995、rest 頭頂 y＝429.5−614·0.64）
    homeSync: { w: 1280, h: 720, chrome: 216, heroTop: 88, topPad: 12, headY: 429.5 - (633 - 19) * 0.64, X: 0.53, ax: 867, zoom: 1.14, zoomX: 995 } }, // v5：背景同 v4；人物沿用首頁貼合（首頁 rest(948,429.5)＋bgZoom 1.14@x995 底 → 背景原圖 (953.77,465.18)；0.64/1.14＝0.5614）
  // 坐於車中；立繪與背景同尺寸
  kong_zi: { bgW: 1408, bgH: 768, fig: [0, 0, 1408, 768], foot: 705, ax: 616 },
  // 立於殿前木棧（欄杆右側地板）
  zhu_ge_liang: { bgW: 1408, bgH: 768, fig: [860, 140, 320, 560], foot: 712, ax: 1020 },
  // 立於月下岩台
  li_bai: { bgW: 2760, bgH: 1504, fig: [804, 270, 985, 900], foot: 1200, ax: 1380 },
};

export interface BattleSceneBox {
  left: number; top: number; width: number; height: number; scale: number;
  /** 背景下緣高於戰鬥區底時，於下方接一張上下鏡射的延伸補滿（不縮放背景，岩座比例不變） */
  mirrorBottom?: boolean;
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
      // 題目框：bottom calc(40% + 122px)、高 40px → 上緣 0.6·H − 162
      const areaBottom = rootH * 0.6 - 162;
      const [x0, y0, x1, y1] = sc.bodyBox;
      dx = rootW / 2 - (figLeft + ((x0 + x1) / 2 - crop.x) * figScale);
      dy = (areaTop + areaBottom) / 2 - (figTop + ((y0 + y1) / 2 - crop.y) * figScale);
      // 名字淨空優先：標籤頂需 ≥ HP 條下緣 + 8；呼吸中段 scale(1.01) 會讓帽頂再上移約 3px → 不足時整組最少量下移
      const LABEL_H = a.nameCompact ? 12 : 39, BREATH_PEAK_UP = 3;
      const hatTop = figTop + dy + (y0 - crop.y) * figScale;
      const labelTop = hatTop - BREATH_PEAK_UP - (a.nameGap ?? P.headGap) - LABEL_H;
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
  let restScale: number | null = null;
  if (sc.restOnBg && sameDpi) {
    const { foot: [rfx, rfy], bg: [rbx, rby], relScale } = sc.restOnBg;
    restScale = sceneBox.scale * relScale;
    figLeft = sceneBox.left + rbx * sceneBox.scale - (rfx - crop.x) * restScale;
    figTop = sceneBox.top + rby * sceneBox.scale - (rfy - crop.y) * restScale;
  }
  const figScaleF = restScale ?? figScale;

  // 名字／圖示：水平對準實際臉心（cxΔ=0），垂直 nameGap（可玩 Boss 皆 18）
  const headMin = Math.max(26, P.headTopMinPx * 0.3);
  const faceScreenX = figLeft + a.faceX * figScaleF;
  const nameGap = a.nameGap ?? P.headGap;
  const lift = sc.offsetY ?? 0;
  // 名字只在貼近頂部（與左上 AUTO／右上題型同列）時才水平夾住；頭在下方時直接置中於臉心（cxΔ=0）
  const hatY = sc.bodyBox && sameDpi ? sc.bodyBox[1] - crop.y : a.headTopY; // bodyBox 為 alpha 實測帽頂
  const nameBottomRaw = figTop + hatY * figScaleF - (sc.labelGap ?? nameGap) - lift;
  const headX = sc.nameScreenCenter ? rootW / 2
    : nameBottomRaw < P.headTopMinPx + 40
      ? Math.min(Math.max(faceScreenX, 126), rootW - 126)
      : Math.min(Math.max(faceScreenX, 40), rootW - 40);
  // 先套 lift 再夾 headMin，避免名字被頂出戰鬥區
  const headY = a.nameCompact ? nameBottomRaw : Math.max(nameBottomRaw, headMin); // 緊湊版不夾 headMin（避免壓帽）；淨空由版面保證
  const layout: BattleLayout = {
    scale: figScaleF,
    left: figLeft, top: figTop - lift,
    width: restScale ? (sameDpi ? crop.w : a.w) * restScale : figW,
    height: restScale ? (sameDpi ? crop.h : a.h) * restScale : figH,
    headX, headY,
    faceX: faceScreenX,
    faceY: figTop + a.eyeY * figScaleF - lift,
    centerX: rootW / 2,
    bottomY: figTop + a.bottomY * figScaleF - lift,
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

/**
 * 柳宗元「飛劍穿梭 X 斬」（attackStyle: 'xSlash'）的 3D 路徑。
 *
 * 做法：
 * - 劍（全幅武器圖層，旋轉中心＝握柄）放在 CSS perspective 容器中，以 translate3d 在 x / y / z 三軸移動；
 *   除了 perspective 本身的近大遠小，再疊加明確的深度縮放，使「看起來的大小」＝ depthScale(z)
 *   （最遠約 0.4 倍、最近約 2.2 倍靜止大小），遠處同時略為變淡。
 * - 飛行中依速度方向 rotateZ（刀尖朝前）、依轉彎率沿刀身軸 bank、依 z 速度 pitch。
 * - 四段：飛出畫面再飛回 → 舉刀蓄勢、下劈 → 再飛出畫面、從另一側飛回 → 再舉刀蓄勢、下劈。
 * - 兩次斬擊為「真正的下劈」：飛回後在 X 的起點懸停，刀身舉起（柄在下、刀尖朝上偏後）並再往後蓄勢 WINDUP°，
 *   之後以握柄為軸往前下方揮落（第一刀順時針、第二刀逆時針），不是整把劍直線平移。
 * - 刀刃朝向：這把刀的刃在弧形外側（靜止時刀尖朝左、刃朝下＝刀身方向逆時針轉 90°）。
 *   第一刀順時針揮，刃要在順時針前方，所以整段改用水平鏡像（握柄為軸 scaleX(-1)）；第二刀逆時針揮，原圖的刃本來就在前方，不鏡像。
 *   鏡像只在劍位於畫面外的遠點時切換（X_SLASH_TIMING.mirrorOn / mirrorOff），回到手中時一定是原圖方向。
 * - 路徑是一條連續的 non-uniform Catmull-Rom 曲線（Barry–Goldman，節點＝時間），通過下表的關鍵點，
 *   先以 4ms 間隔密集取樣成表，播放時由 rAF 依經過時間查表內插（沒有任何直線段或 CSS keyframe 折點）。
 * - 兩次斜向穿越玩家區（左上→右下、右上→左下），握柄軌跡交成 X（沒有斬痕線條，只有飛行軌跡）；
 *   穿越之間與之後會飛出畫面再回來，最後回到手中。
 * - 關鍵點以「螢幕上的握柄位置＋深度 z」指定，再以透視公式反推 translate3d，所以螢幕軌跡精準走在 X 上。
 */
import type { WeaponLayerConfig } from '../types';
import { X_SLASH_TIMING as T } from '../types';

/** 透視距離（px）；z 越大越靠近鏡頭 */
export const WEAVE_PERSPECTIVE = 1000;
/** 深度 → 看起來的大小（相對靜止大小）：z = −380 → 0.4 倍，z = 0 → 1 倍，z ≥ +220 → 2.2 倍 */
export const DEPTH_SCALE = { far: 0.4, farZ: -380, near: 2.2, nearZ: 220 } as const;
export const depthScale = (z: number) => z < 0
  ? 1 - (1 - DEPTH_SCALE.far) * Math.min(1, z / DEPTH_SCALE.farZ)
  : 1 + (DEPTH_SCALE.near - 1) * Math.min(1, z / DEPTH_SCALE.nearZ);
/** 下劈：刀身絕對角度（0° = 向右，順時針為正）起訖。起手刀尖朝上略偏前，第一刀順時針劈向右下、第二刀逆時針劈向左下，各揮 140° */
const SLASH_ANGLES = { pass1: [-85, 55], pass2: [-95, -235] } as const;
/** 蓄勢：懸停時刀身再往後舉的角度（與下劈方向相反） */
const WINDUP = 18;
/** 取樣間隔（ms，1x 時間軸） */
const STEP = 4;

type V3 = { x: number; y: number; z: number };

export interface WeaveTrack {
  /** 每 STEP ms 一筆：translate3d、rotateZ、bank、pitch、額外縮放（疊在透視之上）、opacity */
  tx: Float32Array; ty: Float32Array; tz: Float32Array;
  rz: Float32Array; bank: Float32Array; pitch: Float32Array; k: Float32Array; op: Float32Array;
  /** 1 = 此時水平鏡像 */
  m: Uint8Array;
  n: number;
  /** 透視原點（根座標 px）＝ X 中心 */
  ox: number; oy: number;
  /** 命中點（X 中心） */
  cx: number; cy: number;
  /** 武器圖層在根座標的靜止外框 */
  left: number; top: number; width: number; height: number;
  /** 刀身軸（圖層局部座標的單位向量）與其垂直軸，用於 bank / pitch 的 rotate3d */
  axis: { x: number; y: number }; perp: { x: number; y: number };
  /** 鏡像時的刀身軸與垂直軸 */
  axisM: { x: number; y: number }; perpM: { x: number; y: number };
}

const lerp3 = (a: V3, b: V3, ta: number, tb: number, t: number): V3 => {
  const u = tb === ta ? 0 : (t - ta) / (tb - ta);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
};
/** Barry–Goldman：non-uniform Catmull-Rom，節點即時間 */
const catmull = (p: V3[], ts: number[], t: number): V3 => {
  let i = 1;
  while (i < ts.length - 3 && t > ts[i + 1]) i++;
  const [t0, t1, t2, t3] = [ts[i - 1], ts[i], ts[i + 1], ts[i + 2]];
  const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
  const a1 = lerp3(p0, p1, t0, t1, t), a2 = lerp3(p1, p2, t1, t2, t), a3 = lerp3(p2, p3, t2, t3, t);
  const b1 = lerp3(a1, a2, t0, t2, t), b2 = lerp3(a2, a3, t1, t3, t);
  return lerp3(b1, b2, t1, t2, t);
};
const smooth = (e0: number, e1: number, x: number) => { const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u); };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function buildWeave(root: DOMRect, layer: DOMRect, cfg: WeaponLayerConfig): WeaveTrack {
  const W = root.width, H = root.height, P = WEAVE_PERSPECTIVE;
  const s = layer.width / cfg.frameW;
  const left = layer.left - root.left, top = layer.top - root.top;
  const px = left + cfg.pivot.x * s, py = top + cfg.pivot.y * s;
  // X：中心在玩家血條一帶，握柄軌跡會掃過答案格與選字盤
  const cx = W * 0.5, cy = H * 0.6;
  const R = Math.min(W * 0.3, H * 0.17);
  const S1 = { x: cx - R, y: cy - R }, E1 = { x: cx + R, y: cy + R };
  const S2 = { x: cx + R, y: cy - R }, E2 = { x: cx - R, y: cy + R };
  const at = (m: { x: number; y: number }, z: number): V3 => ({ x: m.x, y: m.y, z });
  const P0: V3 = { x: px, y: py, z: 0 };
  const K = T.keys;
  const keys: [number, V3][] = [
    [K.rest, P0],
    [K.lift, { x: px + W * 0.02, y: py - H * 0.05, z: -90 }],                     // 離手上提、後退
    [K.exit1, { x: -W * 0.45, y: H * 0.08, z: -380 }],                             // 從人物背後飛出畫面左上（最遠、最小）
    [K.pass1Start, at(S1, 40)],                                                   // 飛回左上，刀身舉起
    [K.charge1, at({ x: S1.x - W * 0.02, y: S1.y - H * 0.035 }, 10)],             // 高舉蓄勢（微微後退上提）
    [K.pass1Mid, at({ x: cx, y: cy }, 170)],                                      // 下劈中段，最靠近鏡頭
    [K.pass1End, at(E1, 100)],                                                    // 劈到右下
    [K.exit2, { x: W * 1.45, y: H * 1.02, z: 260 }],                               // 近鏡頭衝出右下
    [K.loop, { x: W * 1.5, y: H * 0.15, z: -380 }],                                // 畫面外繞到右上（遠）
    [K.pass2Start, at(S2, 40)],                                                   // 從另一側（右上）飛回，刀身舉起
    [K.charge2, at({ x: S2.x + W * 0.02, y: S2.y - H * 0.035 }, 10)],             // 再次高舉蓄勢
    [K.pass2Mid, at({ x: cx, y: cy }, 170)],
    [K.impact, at(E2, 110)],                                                      // 第二刀劈到左下＝命中
    [K.rise, { x: (E2.x + px) / 2 - W * 0.12, y: Math.min(E2.y, py) - H * 0.06, z: 80 }], // 上揚弧線回程
    [K.total, P0],
  ];
  // 兩端各補一個重複點，使起訖速度趨近 0
  const pts = [keys[0][1], ...keys.map(k => k[1]), keys[keys.length - 1][1]];
  const ts = [keys[0][0] - 160, ...keys.map(k => k[0]), keys[keys.length - 1][0] + 160];
  const n = Math.floor(T.total / STEP) + 1;
  const tr = { m: new Uint8Array(n), tx: new Float32Array(n), ty: new Float32Array(n), tz: new Float32Array(n), rz: new Float32Array(n), bank: new Float32Array(n), pitch: new Float32Array(n), k: new Float32Array(n), op: new Float32Array(n) };
  const pos: V3[] = [];
  for (let i = 0; i < n; i++) pos.push(catmull(pts, ts, Math.min(T.total, i * STEP)));
  // 方向（螢幕速度）→ rotateZ（刀尖朝前，展開避免 ±180° 跳動）
  const heading: number[] = [];
  let prevH = 0;
  for (let i = 0; i < n; i++) {
    const a = pos[Math.max(0, i - 1)], b = pos[Math.min(n - 1, i + 1)];
    const vx = b.x - a.x, vy = b.y - a.y;
    let h = Math.hypot(vx, vy) > 0.05 ? Math.atan2(vy, vx) * 180 / Math.PI : prevH;
    if (i > 0) { while (h - prevH > 180) h -= 360; while (h - prevH < -180) h += 360; }
    heading.push(h); prevH = h;
  }
  // 鏡像：只在畫面外的遠點切換；鏡像後刀尖在圖層局部座標的角度 = 180° − tipAngle
  const tipM = 180 - cfg.tipAngle;
  const mirrorAt = (t: number) => t >= T.mirrorOn && t < T.mirrorOff;
  const tipAt = (i: number) => (mirrorAt(i * STEP) ? tipM : cfg.tipAngle);
  const rzFly = heading.map((h, i) => h - tipAt(i));
  // 開頭由 0° 混入飛行方向，結尾混回最接近的 360° 倍數（視覺上等同手中原角度）
  const rzEnd = Math.round(rzFly[n - 1] / 360) * 360;
  const startRz0 = Math.round(rzFly[Math.floor(K.lift / STEP)] / 360) * 360;
  // 下劈角度（rotateZ 值）：刀身絕對角度 − 刀尖靜止角度；以 ease-in-out（sine）揮落：起手舉刀、中段最快、收刀減速
  const easeInOut = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;
  // h0＝飛回舉刀（開始懸停蓄勢），t0＝開始下劈，t1＝劈完
  const passes = [
    { h0: K.pass1Start, t0: K.charge1, t1: K.pass1End, a: SLASH_ANGLES.pass1 },
    { h0: K.pass2Start, t0: K.charge2, t1: K.impact, a: SLASH_ANGLES.pass2 },
  ].map(p => {
    // 對齊到與飛行方向最接近的 360° 倍數，混合時不會多轉一圈
    const mid = Math.floor(((p.t0 + p.t1) / 2) / STEP), tip = tipAt(mid);
    const ref = rzFly[mid];
    const r0 = p.a[0] - tip, off = Math.round((ref - r0) / 360) * 360;
    const dir = Math.sign(p.a[1] - p.a[0]);
    return { ...p, r0: r0 + off, r1: p.a[1] - tip + off, rw: r0 + off - dir * WINDUP };
  });
  const BLEND_IN = 110, BLEND_OUT = 110;
  for (let i = 0; i < n; i++) {
    const t = i * STEP, p = pos[i];
    const w = smooth(0, K.lift + 60, t) * (1 - smooth(K.rise, K.total, t));
    const base = t < K.pass1Start ? startRz0 : rzEnd;
    let rz = base + (rzFly[i] - base) * w;
    let ws = 0;
    for (const ps of passes) {
      const wIn = smooth(ps.h0 - BLEND_IN, ps.h0, t) * (1 - smooth(ps.t1, ps.t1 + BLEND_OUT, t));
      if (wIn <= 0) continue;
      // 懸停：舉刀 → 再往後蓄勢；下劈：由蓄勢角揮落（ease-in：起手慢、劈到底最快）
      let rs: number;
      if (t < ps.t0) rs = ps.r0 + (ps.rw - ps.r0) * smooth(ps.h0, ps.t0, t);
      else { const u = clamp((t - ps.t0) / (ps.t1 - ps.t0), 0, 1); rs = ps.rw + (ps.r1 - ps.rw) * easeInOut(u); }
      rz = rz + (rs - rz) * wIn; ws = Math.max(ws, wIn);
    }
    // bank：轉彎率（度/ms）→ 沿刀身軸傾斜（下劈時收掉）；pitch：z 速度 → 俯仰
    const dh = (heading[Math.min(n - 1, i + 2)] - heading[Math.max(0, i - 2)]) / (4 * STEP);
    const a = pos[Math.max(0, i - 1)], b = pos[Math.min(n - 1, i + 1)];
    const vxy = Math.hypot(b.x - a.x, b.y - a.y) + 1e-3, vz = b.z - a.z;
    const bank = clamp(-dh * 55, -55, 55) * w * (1 - ws);
    const pitch = clamp(Math.atan2(vz, vxy) * 180 / Math.PI * 0.5, -30, 30) * w * (1 - 0.6 * ws);
    // 透視反推 translate3d：螢幕位置 = o + (p − o) · P / (P − z)
    const f = (P - p.z) / P;
    tr.tx[i] = cx + (p.x - cx) * f - px;
    tr.ty[i] = cy + (p.y - cy) * f - py;
    tr.m[i] = mirrorAt(t) ? 1 : 0;
    tr.tz[i] = p.z; tr.rz[i] = rz; tr.bank[i] = bank; tr.pitch[i] = pitch;
    // 明確深度縮放：看起來的大小 = depthScale(z)，扣掉透視已帶來的 P/(P−z)
    tr.k[i] = depthScale(p.z) * f;
    tr.op[i] = 1 - 0.35 * smooth(-120, -380, p.z);  // 遠處變淡（最低約 0.65）
  }
  const ta = cfg.tipAngle * Math.PI / 180, tm = tipM * Math.PI / 180;
  return {
    ...tr, n, ox: cx, oy: cy, cx, cy,
    left, top, width: layer.width, height: layer.height,
    axis: { x: Math.cos(ta), y: Math.sin(ta) }, perp: { x: -Math.sin(ta), y: Math.cos(ta) },
    axisM: { x: Math.cos(tm), y: Math.sin(tm) }, perpM: { x: -Math.sin(tm), y: Math.cos(tm) },
  };
}

/** 依 1x 時間軸上的 t（ms）查表內插 */
export function sampleWeave(tr: WeaveTrack, t: number) {
  const f = clamp(t, 0, T.total) / STEP, i = Math.min(tr.n - 2, Math.floor(f)), u = f - i;
  // 鏡像切換的那一格不內插角度（避免切換瞬間出現中間角度）
  const same = tr.m[i] === tr.m[i + 1];
  const L = (a: Float32Array) => a[i] + (a[i + 1] - a[i]) * u;
  const N = (a: Float32Array) => (same ? L(a) : a[u < 0.5 ? i : i + 1]);
  const m = tr.m[u < 0.5 || same ? i : i + 1] === 1;
  return { m, tx: L(tr.tx), ty: L(tr.ty), tz: L(tr.tz), rz: N(tr.rz), bank: N(tr.bank), pitch: N(tr.pitch), k: L(tr.k), op: L(tr.op) };
}

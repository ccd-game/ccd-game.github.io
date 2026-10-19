/**
 * HUD EXP 弧填動畫計畫（通關入帳後 from→to；含跨級先滿再從 0）。
 * 時長約 0.6–1.0s、ease-out；％文案跟 sample 走。
 */
import { clamp01 } from './hudExpArc';

export const EXP_ARC_ANIM_MS_MIN = 600;
export const EXP_ARC_ANIM_MS_MAX = 1000;
/** 預設時長（落在准許區間中段） */
export const EXP_ARC_ANIM_MS = 800;

export type ExpArcVisual = {
  level: number;
  /** 本級進度 0–1 */
  ratio: number;
};

export type ExpArcAnimSegment = {
  level: number;
  from: number;
  to: number;
};

export type ExpArcAnimPlan = {
  segments: ExpArcAnimSegment[];
  /** 各段加權長度（|to-from|；零行程段權重極小僅供等級切換） */
  weights: number[];
  totalWeight: number;
};

const EPS = 1e-6;

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/** 依 from／to 視覺狀態組段；降級則瞬跳至 to */
export function buildExpArcAnimPlan(from: ExpArcVisual, to: ExpArcVisual): ExpArcAnimPlan {
  const fromLv = Math.max(1, Math.floor(from.level) || 1);
  const toLv = Math.max(1, Math.floor(to.level) || 1);
  const fromR = clamp01(from.ratio);
  const toR = clamp01(to.ratio);

  const segments: ExpArcAnimSegment[] = [];

  if (toLv < fromLv) {
    segments.push({ level: toLv, from: toR, to: toR });
  } else if (toLv === fromLv) {
    segments.push({ level: fromLv, from: fromR, to: toR });
  } else {
    segments.push({ level: fromLv, from: fromR, to: 1 });
    for (let lv = fromLv + 1; lv < toLv; lv++) {
      segments.push({ level: lv, from: 0, to: 1 });
    }
    segments.push({ level: toLv, from: 0, to: toR });
  }

  const weights = segments.map((s) => {
    const travel = Math.abs(s.to - s.from);
    return travel < EPS ? EPS : travel;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return { segments, weights, totalWeight };
}

/** 線性進度 u∈[0,1]（呼叫端可先 ease）→ 當幀 level／ratio */
export function sampleExpArcAnimPlan(plan: ExpArcAnimPlan, u: number): ExpArcVisual {
  const t = clamp01(u);
  const segs = plan.segments;
  if (segs.length === 0) return { level: 1, ratio: 0 };
  if (plan.totalWeight < EPS || t >= 1) {
    const last = segs[segs.length - 1];
    return { level: last.level, ratio: clamp01(last.to) };
  }
  if (t <= 0) {
    const first = segs[0];
    return { level: first.level, ratio: clamp01(first.from) };
  }

  let remain = t * plan.totalWeight;
  for (let i = 0; i < segs.length; i++) {
    const w = plan.weights[i];
    const s = segs[i];
    if (remain > w + EPS && i < segs.length - 1) {
      remain -= w;
      continue;
    }
    const local = w < EPS ? 1 : clamp01(remain / w);
    const ratio = s.from + (s.to - s.from) * local;
    return { level: s.level, ratio: clamp01(ratio) };
  }
  const last = segs[segs.length - 1];
  return { level: last.level, ratio: clamp01(last.to) };
}

/** 依總行程微調時長，夾在 600–1000ms */
export function expArcAnimDurationMs(plan: ExpArcAnimPlan): number {
  const travel = plan.segments.reduce((a, s) => a + Math.abs(s.to - s.from), 0);
  // 單段小跳偏短；跨級／近滿行程偏長
  const scaled = EXP_ARC_ANIM_MS_MIN + (EXP_ARC_ANIM_MS_MAX - EXP_ARC_ANIM_MS_MIN) * clamp01(travel);
  return Math.round(Math.min(EXP_ARC_ANIM_MS_MAX, Math.max(EXP_ARC_ANIM_MS_MIN, scaled)));
}

export function expPctFromRatio(ratio: number): number {
  return Math.round(clamp01(ratio) * 100);
}

/** 兩視覺是否可視為相同（略過動畫） */
export function expArcVisualEq(a: ExpArcVisual, b: ExpArcVisual, eps = 1e-4): boolean {
  return a.level === b.level && Math.abs(a.ratio - b.ratio) <= eps;
}

/**
 * 戰鬥傷害計算（純函式，無副作用）
 * 答對傷害 = round(baseDamage × speedMultiplier(剩餘秒數))；速度曲線見 ./speedMultiplier.ts
 */
import { speedMultiplier as defaultSpeedMultiplier } from './speedMultiplier';

export interface DamageInput {
  /** 基本傷害（例如 CORRECT_ANSWER_DAMAGE） */
  baseDamage: number;
  /** 答對當刻剩餘秒數（可含小數，0 ~ totalSeconds） */
  remainingSeconds: number;
  /** 每回合總秒數（TURN_TIME） */
  totalSeconds: number;
}

export type SpeedMultiplierFn = (remainingSeconds: number, totalSeconds: number) => number;

/** 現行速度加成（可在 computeDamage 第二參數替換以作測試） */
export const speedMultiplier: SpeedMultiplierFn = defaultSpeedMultiplier;

/** 傷害與所用倍率 */
export interface DamageResult { damage: number; multiplier: number }

/** 計算傷害及倍率；傷害四捨五入為整數且不小於 0 */
export function computeDamageDetail(
  { baseDamage, remainingSeconds, totalSeconds }: DamageInput,
  multiplier: SpeedMultiplierFn = speedMultiplier
): DamageResult {
  const total = totalSeconds > 0 ? totalSeconds : 1;
  const remaining = Math.min(Math.max(Number.isNaN(remainingSeconds) ? 0 : remainingSeconds, 0), total);
  const raw = multiplier(remaining, total);
  const m = Number.isFinite(raw) ? raw : 1;
  return { damage: Math.max(0, Math.round(baseDamage * m)), multiplier: m };
}

/** 只回傳傷害（整數） */
export function computeDamage(input: DamageInput, multiplier: SpeedMultiplierFn = speedMultiplier): number {
  return computeDamageDetail(input, multiplier).damage;
}

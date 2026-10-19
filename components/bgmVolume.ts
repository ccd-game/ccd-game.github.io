/**
 * Apply BGM level to HTMLAudioElements（遊戲內音量，獨立於裝置硬體／系統音量）.
 * 只寫 el.volume／el.muted；不呼叫 navigator／mediaSession／系統 volume API。
 * Sets both volume and muted so 0% is truly silent (some browsers still
 * emit faintly when volume===0 but muted is false).
 */
export function applyBgmVolume(volume: number, ...elements: Pick<HTMLAudioElement, "volume" | "muted">[]): void {
  const v = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;
  const muted = v === 0;
  for (const el of elements) {
    el.volume = v;
    el.muted = muted;
  }
}

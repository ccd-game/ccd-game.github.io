/**
 * Apply BGM level to HTMLAudioElements.
 * Sets both volume and muted so 0% is truly silent (some browsers still
 * emit faintly when volume===0 but muted is false).
 */
export function applyBgmVolume(volume: number, ...elements: HTMLAudioElement[]): void {
  const v = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;
  const muted = v === 0;
  for (const el of elements) {
    el.volume = v;
    el.muted = muted;
  }
}

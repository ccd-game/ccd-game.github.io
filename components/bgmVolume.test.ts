import { describe, expect, it } from 'vitest';
import { applyBgmVolume } from './bgmVolume';

function fakeAudio(initial = { volume: 1, muted: false }): HTMLAudioElement {
  return { volume: initial.volume, muted: initial.muted } as HTMLAudioElement;
}

describe('applyBgmVolume', () => {
  it('sets volume 0 and muted true on all elements', () => {
    const a = fakeAudio();
    const b = fakeAudio();
    applyBgmVolume(0, a, b);
    expect(a.volume).toBe(0);
    expect(b.volume).toBe(0);
    expect(a.muted).toBe(true);
    expect(b.muted).toBe(true);
  });

  it('sets ~0.5 unmuted at 50%', () => {
    const a = fakeAudio({ volume: 0, muted: true });
    const b = fakeAudio({ volume: 0, muted: true });
    applyBgmVolume(0.5, a, b);
    expect(a.volume).toBeCloseTo(0.5, 5);
    expect(b.volume).toBeCloseTo(0.5, 5);
    expect(a.muted).toBe(false);
    expect(b.muted).toBe(false);
  });

  it('clamps above 1 and below 0', () => {
    const a = fakeAudio();
    applyBgmVolume(2, a);
    expect(a.volume).toBe(1);
    expect(a.muted).toBe(false);
    applyBgmVolume(-1, a);
    expect(a.volume).toBe(0);
    expect(a.muted).toBe(true);
  });

  it('sets volume 1 unmuted at 100%', () => {
    const a = fakeAudio({ volume: 0, muted: true });
    applyBgmVolume(1, a);
    expect(a.volume).toBe(1);
    expect(a.muted).toBe(false);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SettingsTab 音量滑桿即時性（onInput）', () => {
  it('range 同時綁 onInput 與 onChange，皆呼叫 onVolumeChange', () => {
    const src = readFileSync(resolve(__dirname, 'tabs/SettingsTab.tsx'), 'utf8');
    // 抽 range 區塊（音量調節）
    const rangeBlock = src.slice(src.indexOf('type="range"'), src.indexOf('type="range"') + 800);
    expect(rangeBlock).toMatch(/onInput=\{[^}]*onVolumeChange/);
    expect(rangeBlock).toMatch(/onChange=\{[^}]*onVolumeChange/);
  });
});

describe('App.handleVolumeChange 同步套用', () => {
  it('handleVolumeChange 內同步呼叫 applyVolumeToTracks（不仰賴 effect）', () => {
    const src = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    expect(src).toMatch(/import AudioManager,\s*\{\s*AudioManagerHandle,\s*applyVolumeToTracks\s*\}/);
    const fn = src.slice(src.indexOf('const handleVolumeChange'), src.indexOf('const handleVolumeChange') + 500);
    expect(fn).toMatch(/applyVolumeToTracks\(val\)/);
    expect(fn.indexOf('applyVolumeToTracks(val)')).toBeLessThan(fn.indexOf('pendingVolumeRef'));
  });
});

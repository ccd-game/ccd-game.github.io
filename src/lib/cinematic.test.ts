import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { deriveCinematicActive, isBattleIntroStage, CinematicInputs } from './cinematic';

const idle: CinematicInputs = { isBooting: false, isQuestionsFetching: false, isBattleIntro: false, isBossSpeaking: false, isBossHitReaction: false };

describe('isCinematicActive', () => {
  it('全部沒有 → false（idle 飛劍照常播放）', () => {
    expect(deriveCinematicActive(idle)).toBe(false);
  });
  it.each(Object.keys(idle) as (keyof CinematicInputs)[])('%s → true', (k) => {
    expect(deriveCinematicActive({ ...idle, [k]: true })).toBe(true);
  });
  it('開場動畫階段', () => {
    expect(isBattleIntroStage('none')).toBe(false);
    expect(isBattleIntroStage('playing')).toBe(false);
    for (const s of ['starting', 'gold_line', 'bg', 'enemy', 'boss_name_show', 'enemy_hp', 'player_hp', 'input_pad', 'ready']) expect(isBattleIntroStage(s)).toBe(true);
  });
  it('index.css 以 animation-play-state 暫停主頁、圖鑑、戰鬥三處的飛劍（不卸載）', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
    const rule = css.match(/([^{}]*)\{\s*animation-play-state:\s*paused\s*!important;?\s*\}/g)?.find((r) => r.includes('data-cinematic="1"'));
    expect(rule).toBeTruthy();
    for (const sel of ['.home-saber', '.home-saber-idle', '.codex-saber', '.codex-saber-idle', '.btl-saber', '.btl-saber-idle']) {
      expect(rule).toContain(`html[data-cinematic="1"] ${sel}`);
    }
  });
});

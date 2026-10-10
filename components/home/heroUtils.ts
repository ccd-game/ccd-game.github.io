import type React from 'react';
import { PORTRAIT_ANCHORS, portraitKey } from '../../data/portraits';

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
export const chapterLabel = (index: number) => `第${CN_NUM[index] ?? index + 1}回`;

export type Target = { faceH: number; eyeY: number; faceX: number };

/** 以 data/portraits.ts 的臉部錨點，把立繪放到指定目標位置（框架百分比） */
export function anchorStyle(src: string, t: Target): React.CSSProperties {
  const a = PORTRAIT_ANCHORS[portraitKey(src)];
  if (!a) return { position: 'absolute', height: '85%', width: 'auto', maxWidth: 'none', right: '-5%', bottom: 0 };
  return {
    position: 'absolute',
    height: `${(t.faceH * a.h / a.faceH) * 100}%`,
    width: 'auto',
    maxWidth: 'none',
    maxHeight: 'none',
    left: `${(0.5 + t.faceX) * 100}%`,
    top: `${t.eyeY * 100}%`,
    transform: `translate(${(-a.faceX / a.w) * 100}%, ${(-a.eyeY / a.h) * 100}%)`,
  };
}


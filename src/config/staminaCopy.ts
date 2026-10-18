/**
 * 體力相關文案（CCD 文案定稿）。所有體力介面文字只在此處修改；數字由常數插入。
 */
import { STAMINA_COST, STAMINA_REFUND, STAMINA_REGEN_INTERVAL_MS } from '../lib/playerData';
import { formatCountdown, formatFullIn } from '../lib/stamina';

const REGEN_MINUTES = STAMINA_REGEN_INTERVAL_MS / 60000;
/** 每格回復的點數 */
const REGEN_POINTS = 1;

export const STAMINA_COPY = {
  /** 「體力不足」視窗 */
  insufficient: {
    title: '體力不足',
    /** 兩行內文；fullInMs＝距離回滿的毫秒數 */
    body: (fullInMs: number): [string, string] => [
      `入陣需要 ${STAMINA_COST} 點體力，請先休整片刻。`,
      `每 ${REGEN_MINUTES} 分鐘回復 ${REGEN_POINTS} 點，約 ${formatFullIn(fullInMs)} 後回滿。`,
    ],
    back: '暫且休整',
  },
  /** 主頁體力條：倒數或已滿 */
  nextPoint: (ms: number) => `下一點 ${formatCountdown(ms)}`,
  full: '體力已滿',
  /** 戰敗畫面：實際已返還時才顯示 */
  refunded: `已返還 ${STAMINA_REFUND} 點體力`,
} as const;

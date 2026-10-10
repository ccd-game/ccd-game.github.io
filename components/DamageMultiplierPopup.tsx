import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { formatMultiplier } from '../src/lib/speedMultiplier';

export interface DamagePopupData {
  /** 每次命中遞增，用作 key 以重播動畫 */
  id: number;
  damage: number;
  multiplier: number;
}

interface Props {
  popup: DamagePopupData | null;
  /** 自動作答加速時縮短動畫 */
  timeScale?: number;
}

/** 答對命中時，在 Boss HP 條下方浮現「−傷害」及速度倍率「×1.50」 */
const DamageMultiplierPopup: React.FC<Props> = ({ popup, timeScale = 1 }) => {
  const isBonus = (popup?.multiplier ?? 1) > 1.0001;
  const isPenalty = (popup?.multiplier ?? 1) < 0.9999;
  return (
    <div className="absolute left-0 w-full flex justify-center pointer-events-none z-[120]" style={{ top: '92px' }}>
      <AnimatePresence>
        {popup && (
          <motion.div
            key={popup.id}
            data-testid="damage-popup"
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.25 * timeScale, ease: 'easeOut' }}
            className="flex items-baseline gap-2 font-black"
            style={{ fontFamily: "'LXGW WenKai Mono TC', monospace", textShadow: '0 0 6px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.7)' }}
          >
            <span data-testid="damage-popup-damage" className="text-white text-[26px]">−{popup.damage}</span>
            <span
              data-testid="damage-popup-multiplier"
              className="text-[18px]"
              style={{ color: isBonus ? '#facc15' : isPenalty ? '#9ca3af' : '#ffffff' }}
            >
              {formatMultiplier(popup.multiplier)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DamageMultiplierPopup;


import React, { useMemo } from 'react';
import { UserInputSlot } from '../types';

interface SlotsInterfaceProps {
  userInput: UserInputSlot[];
  showUI: boolean;
  isFalling: boolean;
  isConverging?: boolean;
  onSlotClear: (index: number) => void;
  lastImpactIndex: number | null;
  noExitAnim?: boolean;
  introStage?: string;
}

const SlotsInterface: React.FC<SlotsInterfaceProps> = React.memo(({ userInput, showUI, isFalling, isConverging, onSlotClear, lastImpactIndex, noExitAnim = false, introStage }) => {

  const getSlotAnimationClass = (slot: UserInputSlot, idx: number) => {
    if (isConverging) return 'char-converge-active';
    if (lastImpactIndex === idx && slot.char && !slot.locked) return 'stamp-active';
    return '';
  };

  const getTileFallStyle = (slot: UserInputSlot, idx: number) => {
    if (isFalling && slot.char && !slot.locked) { // 預填格固定，不會掉落
      const animName = idx % 2 === 0 ? 'fall-left' : 'fall-right';
      return `${animName} 1.4s cubic-bezier(0.5, 0, 0.75, 0) forwards ${idx * 0.05}s`;
    }
    return 'none';
  };

  const staggeredDelays = useMemo(() => {
    // 使用索引產生確定性的延遲，確保組件符合 React 的純粹性要求
    return userInput.map((_, idx) => 0.02 + ((idx * 7) % 8) * 0.01);
  }, [userInput]);

  const easing = showUI ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.33, 0, 0.67, 0)';

  return (
    <div 
      className="w-[92%] flex gap-[6px] justify-center min-h-[42px]"
      style={{ 
        willChange: 'transform, opacity, filter',
        opacity: showUI || isConverging ? 1 : 0,
        filter: showUI || isConverging ? 'blur(0px)' : 'blur(12px)',
        transform: showUI || isConverging
            ? 'translate3d(0, 0, 0)'
            : (noExitAnim ? 'translate3d(0, 0, 0)' : 'translate3d(0, 25px, 0)'),
        transition: `opacity 0.5s ${easing}, transform 0.5s ${easing}, filter 0.5s ${easing}`,
        pointerEvents: showUI && !isConverging ? 'auto' : 'none'
      }}
    >
      {userInput.map((slot, idx) => {
        const fallAnim = getTileFallStyle(slot, idx);
        const animClass = getSlotAnimationClass(slot, idx);
        const total = userInput.length;
        const centerIdx = (total - 1) / 2;
        const offsetX = (centerIdx - idx) * 48;
        const offsetY = -127;

        return (
          <div key={`slot-${idx}`} 
            onClick={slot.locked ? undefined : () => onSlotClear(idx)}
            data-slot-index={idx}
            data-locked={slot.locked ? 'true' : undefined}
            aria-disabled={slot.locked ? true : undefined}
            title={slot.locked ? '預填（不可更改）' : undefined}
            className={`w-full aspect-square max-w-[42px] rounded-xl flex items-center justify-center relative border-2 overflow-visible ${slot.locked ? 'cursor-default' : ''}`}
            style={{ 
              backgroundColor: 'var(--slot-bg)',
              borderColor: 'var(--panel-border)'
            }}
          >
            {slot.char && (
              <div 
                className={`absolute inset-[-2px] rounded-xl flex items-center justify-center text-[1.4rem] font-black border-2 transition-[opacity] duration-200 
                  ${slot.locked
                    ? 'bg-black/45 border-dashed border-[#d4af37]/60 text-[#d4af37]'
                    : 'bg-white/25 border-[#d4af37] text-white shadow-[0_0_15px_rgba(212,175,55,0.4)]'}
                  ${animClass}
                `}
                style={{ 
                  animation: fallAnim === 'none' ? undefined : fallAnim,
                  animationDelay: isConverging ? `${staggeredDelays[idx]}s` : undefined,
                  willChange: 'transform, opacity',
                  zIndex: 2,
                  ['--tx' as any]: `${offsetX}px`,
                  ['--ty' as any]: `${offsetY}px`
                }}
              >
                {slot.char}
                {showUI && !isFalling && !isConverging && lastImpactIndex === idx && !slot.locked && (
                  <div className="absolute inset-0 bg-white/20 rounded-xl animate-ping pointer-events-none" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default SlotsInterface;

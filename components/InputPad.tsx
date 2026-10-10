
import React, { useMemo } from 'react';

interface InputPadProps {
  options: string[];
  usedIndices: Set<number>;
  disabled: boolean;
  onOptionClick: (char: string, index: number) => void;
  isEnemyAttacking: boolean;
  showUI: boolean;
  isExiting: boolean;
  suppressExitAnim?: boolean;
}

const InputPad: React.FC<InputPadProps> = React.memo(({ 
  options, 
  usedIndices, 
  disabled, 
  onOptionClick, 
  isEnemyAttacking, 
  showUI, 
  isExiting, 
  suppressExitAnim = false 
}) => {
  const delays = useMemo(() => {
    return options.map((_, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      return (col * 0.04) + (row * 0.06);
    });
  }, [options]);

  return (
    <div 
      className={`input-pad-grid transition-opacity duration-300 ${isEnemyAttacking && !isExiting ? 'opacity-60' : 'opacity-100'}`}
      style={{ 
        contain: 'layout style paint',
        width: '100%',
        height: '100%',
        // 增加底部安全距離，防止手機瀏覽器導航條阻礙點擊
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)'
      }}
    >
      {options.map((char, index) => {
        const isUsed = usedIndices.has(index);
        const shouldAnimateIn = showUI && !isExiting && !suppressExitAnim;
        const shouldAnimateOut = isExiting && !isUsed;

        return (
          <button
            key={index}
            disabled={disabled || isUsed || isEnemyAttacking || isExiting}
            onClick={() => onOptionClick(char, index)}
            className={`
              input-pad-btn text-[1.4rem] font-bold
              ${isUsed 
                ? 'opacity-0 pointer-events-none' 
                : 'active:brightness-75'}
              ${shouldAnimateIn && !isUsed ? 'card-enter-active' : ''}
              ${shouldAnimateOut ? 'card-exit-active' : ''}
              ${!shouldAnimateIn && !shouldAnimateOut && !isUsed ? 'opacity-100' : ''}
            `}
            style={{
              backgroundColor: 'var(--input-btn-bg)',
              color: 'var(--input-btn-text)',
              borderColor: 'var(--input-btn-border)',
              borderWidth: '2px',
              animationDelay: shouldAnimateIn ? `${delays[index]}s` : (shouldAnimateOut ? `${delays[index] * 0.4}s` : '0s'),
              visibility: isUsed ? 'hidden' : 'visible',
            }}
          >
            <span className="leading-none">{char}</span>
          </button>
        );
      })}
    </div>
  );
});

export default InputPad;

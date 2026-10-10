
import React from 'react';

const SkillPanel: React.FC = () => {
  const slots = Array.from({ length: 5 });

  return (
    <div 
      className="flex items-center justify-center h-full mx-auto" 
      style={{ 
        width: '100%', 
        padding: '0 12px', 
        gap: '8px', 
        background: 'transparent'
      }}
    >
      {slots.map((_, i) => (
        <button 
          key={i}
          className="aspect-square h-[90%] rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-90"
          style={{
            background: 'rgba(240, 240, 240, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: '58px'
          }}
        >
          <div className="absolute inset-1.5 border border-white/5 rounded-lg pointer-events-none"></div>
          {/* 已移除中心光點 */}
        </button>
      ))}
    </div>
  );
};

export default SkillPanel;

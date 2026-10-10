
import React, { useMemo } from 'react';
import { Question } from '../types';

interface QuestionBoxProps {
  question: Question | null;
  showUI: boolean;
  noExitAnim?: boolean;
  introStage?: string;
}

const QuestionBox: React.FC<QuestionBoxProps> = React.memo(({ question, showUI, noExitAnim = false, introStage }) => {
  const qText = question?.question || "感應雲端題庫中...";

  const fontSize = useMemo(() => {
    const len = qText.length;
    const baseSize = 20;
    const shrinkStart = 10;
    const shrinkRate = 3; 
    
    const calculatedSize = baseSize - (Math.max(0, len - shrinkStart) / shrinkRate);
    const finalSize = Math.max(10, Math.min(20, Math.floor(calculatedSize)));
    return `${finalSize}px`;
  }, [qText]);

  // 同步緩動函數：進入用 Power4Out，退場用 Power2In
  const easing = showUI ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.33, 0, 0.67, 0)';

  return (
    <div className="w-full flex justify-center min-h-[40px] items-center pointer-events-none">
        <p className="text-center text-white font-bold tracking-[1px] whitespace-nowrap px-4" 
           style={{ 
             fontSize: fontSize, 
             fontFamily: "'LXGW WenKai Mono TC', monospace", 
             textShadow: '0 0 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8), 0 0 18px rgba(0,0,0,0.6)',
             willChange: 'transform, opacity, filter',
             opacity: showUI ? 1 : 0,
             filter: showUI ? 'blur(0px)' : 'blur(8px)',
             transform: showUI 
                ? 'translate3d(0, 0, 0)' 
                : (noExitAnim ? 'translate3d(0, 0, 0)' : 'translate3d(0, 25px, 0)'),
             transition: `opacity 0.5s ${easing}, transform 0.5s ${easing}, filter 0.5s ${easing}`,
             pointerEvents: showUI ? 'auto' : 'none'
           }}>
          {qText}
        </p>
    </div>
  );
});

export default QuestionBox;

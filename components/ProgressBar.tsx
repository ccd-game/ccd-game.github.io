
import React from 'react';

interface ProgressBarProps {
  progress: number;
  color: string;
  children?: React.ReactNode;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color, children }) => {
  return (
    <div className="h-full w-full bg-[#111] relative overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-300 ease-out absolute left-0 top-0`}
        style={{ width: `${progress}%` }}
      />
      {children}
    </div>
  );
};

export default ProgressBar;
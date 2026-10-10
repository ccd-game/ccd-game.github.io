
import React, { useState, useEffect } from 'react';
import { subscribeToRanking, UserData } from '../../src/lib/firebase';

const IconCrown = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z"/>
    <path d="M5 20h14"/>
  </svg>
);

/** 排行榜名稱：「學校 + 姓氏 + 同學」分兩行顯示（學校較小），避免窄欄位截斷 */
const RankName: React.FC<{ label: string; className: string }> = ({ label, className }) => {
  const i = label.indexOf(' ');
  const school = i > 0 ? label.slice(0, i) : '';
  const who = i > 0 ? label.slice(i + 1) : label;
  return (
    <span className={`flex flex-col items-center w-full text-center leading-tight ${className}`} style={{ color: 'var(--text-main)' }} title={label}>
      {school && <span className="text-[8px] font-bold opacity-60 truncate w-full">{school}</span>}
      <span className="truncate w-full">{who}</span>
    </span>
  );
};

const RankTab: React.FC = () => {
  const [rankingData, setRankingData] = useState<(UserData & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRanking(
      (data) => {
        setRankingData(data);
        setLoadError(false);
        setLoading(false);
      },
      50,
      () => {
        setLoadError(true);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-5" style={{ backgroundColor: 'var(--app-bg)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--text-sub)' }}>暫時無法載入排位，請稍後再試。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-5" style={{ backgroundColor: 'var(--app-bg)' }}>
        <p className="text-[var(--gold-accent)] animate-pulse">載入排位中...</p>
      </div>
    );
  }

  const top3 = rankingData.slice(0, 3).map((u, i) => ({
    // 只使用 displayLabel（已清理）；絕不顯示 name / displayName 等舊欄位
    name: u.displayLabel || "同學",
    score: u.level * 100 + u.exp, // 計算虛擬積分
    level: u.level,
    rank: i + 1
  }));

  // 如果不足 3 人，補足空位
  while (top3.length < 3) {
    top3.push({ name: "虛位以待", score: 0, level: 0, rank: top3.length + 1 });
  }

  // 修改 others 部分：只保留 4-20 名，且全部顯示虛位以待、0 經驗、Lv.0
  const others = Array.from({ length: 17 }, (_, i) => ({
    rank: i + 4,
    name: "虛位以待",
    score: 0,
    level: 0
  }));

  return (
    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar tab-slide-active" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* 統一標題樣式 */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-[var(--gold-accent)]"></div>
          <span className="text-[12px] font-black tracking-[6px] uppercase" style={{ color: 'var(--text-main)' }}>全服修煉排位</span>
        </div>
        <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-sub)' }}>GLOBAL RANK</span>
      </div>

      <div className="flex items-end justify-center gap-2 mb-8 mt-4 h-48">
        <div className="flex flex-col items-center w-1/3">
           <div className="w-12 h-12 rounded-full border-2 border-slate-400 flex items-center justify-center bg-black/10 mb-2">
             <span className="text-slate-400 font-black">2</span>
           </div>
           <div className="w-full h-24 bg-gradient-to-t from-black/20 to-transparent border-t border-white/20 rounded-t-lg flex flex-col items-center p-2">
             <RankName label={top3[1].name} className="text-[10px] font-bold" />
             <div className="flex flex-col items-center">
               <span className="text-[9px] text-[#d4af37] font-bold">{top3[1].score} pt</span>
               <span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-sub)' }}>LV.{top3[1].level}</span>
             </div>
           </div>
        </div>
        <div className="flex flex-col items-center w-1/3">
           <div className="w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center bg-black/10 mb-2 shadow-lg relative" style={{ borderColor: 'var(--gold-accent)' }}>
             <span className="font-black text-xl" style={{ color: 'var(--gold-accent)' }}>1</span>
             <div className="absolute -top-6 animate-bounce" style={{ color: 'var(--gold-accent)' }}>
               <IconCrown />
             </div>
           </div>
           <div className="w-full h-32 bg-gradient-to-t from-black/20 to-transparent border-t border-[#d4af37]/40 rounded-t-lg flex flex-col items-center p-2">
             <RankName label={top3[0].name} className="text-[12px] font-black" />
             <div className="flex flex-col items-center">
               <span className="text-[10px] text-[#d4af37] font-bold">{top3[0].score} pt</span>
               <span className="text-[9px] opacity-80 uppercase font-bold" style={{ color: 'var(--text-main)' }}>LV.{top3[0].level}</span>
             </div>
           </div>
        </div>
        <div className="flex flex-col items-center w-1/3">
           <div className="w-12 h-12 rounded-full border-2 border-[#cd7f32] flex items-center justify-center bg-black/10 mb-2">
             <span className="text-[#cd7f32] font-black">3</span>
           </div>
           <div className="w-full h-20 bg-gradient-to-t from-black/20 to-transparent border-t border-white/20 rounded-t-lg flex flex-col items-center p-2">
             <RankName label={top3[2].name} className="text-[10px] font-bold" />
             <div className="flex flex-col items-center">
               <span className="text-[9px] text-[#d4af37] font-bold">{top3[2].score} pt</span>
               <span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-sub)' }}>LV.{top3[2].level}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="space-y-2">
        {others.map(user => (
          <div key={user.rank} className="flex items-center gap-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <span className="w-6 text-[11px] font-black italic" style={{ color: 'var(--gold-accent)', opacity: 0.6 }}>{user.rank}</span>
            <div className="flex-1 text-sm font-bold" style={{ color: 'var(--text-main)' }}>{user.name}</div>
            <div className="text-right">
              <div className="text-[10px] font-bold" style={{ color: 'var(--gold-accent)' }}>{user.score} pt</div>
              <div className="text-[8px] uppercase" style={{ color: 'var(--text-sub)' }}>LV.{user.level}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="h-10"></div>
    </div>
  );
};

export default RankTab;

import React from 'react';
import RankIcon from '../../components/RankIcons';

interface MatchmakingOverlayProps {
  isMatching: boolean;
  matchStatus: 'waiting' | 'matched' | null;
  matchMode: 'ranked' | 'casual' | null;
  cancelMatching: () => void;
  opponent: any;
}

export default function MatchmakingOverlay({
  isMatching,
  matchStatus,
  matchMode,
  cancelMatching,
  opponent
}: MatchmakingOverlayProps) {
  if (!isMatching) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* 背景動畫效果 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-shimmer"></div>
        
        {matchStatus === 'waiting' ? (
          <>
            <div className="mb-6 relative">
              <div className="w-24 h-24 mx-auto border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🔍</span>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">正在尋找對手...</h3>
            <p className="text-slate-400 mb-8">
              {matchMode === 'ranked' ? '積分對戰' : '一般對戰'} • 預計等待時間: 30秒
            </p>
            
            <button
              onClick={cancelMatching}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              取消匹配
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 relative">
              <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-4xl">⚔️</span>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">匹配成功！</h3>
            <p className="text-slate-400 mb-6">即將開始對戰</p>
            
            {opponent && (
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-full overflow-hidden">
                   <img 
                      src={opponent.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent.username}`}
                      alt={opponent.username}
                      className="w-full h-full object-cover"
                    />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white">{opponent.username}</div>
                  <div className="text-sm text-slate-400">
                    Rating: {opponent.rating !== null ? opponent.rating : '未定級'}
                  </div>
                </div>
                {opponent.rating !== null && (
                  <RankIcon rating={opponent.rating} size={40} />
                )}
              </div>
            )}
            
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[width_3s_linear_forwards]" style={{ width: '100%' }}></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

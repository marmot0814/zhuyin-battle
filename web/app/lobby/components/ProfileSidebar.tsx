import React from 'react';
import { AVATAR_OPTIONS } from '../../../lib/utils';
import RankIcon from '../../components/RankIcons';

interface ProfileSidebarProps {
  user: any;
  selectedAvatar: string;
  setShowAvatarPicker: (show: boolean) => void;
  openProfileEdit: () => void;
  startMatching: (mode: 'ranked' | 'casual') => void;
  isMatching: boolean;
}

export default function ProfileSidebar({
  user,
  selectedAvatar,
  setShowAvatarPicker,
  openProfileEdit,
  startMatching,
  isMatching
}: ProfileSidebarProps) {
  return (
    <section className="w-80 bg-[#1e293b] border-r border-slate-800 flex flex-col p-6 flex-shrink-0 overflow-y-auto">
      <div className="flex flex-col items-center flex-1">
        {user && (
          <>
            <div className="relative group">
              <div 
                className="w-28 h-28 bg-gradient-to-tr from-indigo-600 to-purple-400 rounded-full border-4 border-slate-900 overflow-hidden shadow-2xl transition-transform group-hover:scale-105 cursor-pointer"
                onClick={() => setShowAvatarPicker(true)}
              >
                <img 
                  src={selectedAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${AVATAR_OPTIONS[0]}`} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <h2 className="text-xl font-bold text-white tracking-tight">{user.username}</h2>
              <button
                onClick={openProfileEdit}
                className="text-slate-500 hover:text-indigo-400 transition-colors"
                title="編輯個人資料"
              >
                ✏️
              </button>
            </div>
            {user.bio && (
              <p className="text-sm text-slate-400 mt-1 italic">{user.bio}</p>
            )}
            
            {/* Rating 顯示 */}
            <div className="mt-3 flex flex-col items-center">
              {user.games_played < 10 ? (
                <div className="flex items-center gap-1 relative group">
                  <p className="text-sm text-amber-400">定級中</p>
                  <span className="text-xs text-amber-500 cursor-help">ⓘ</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2.5 bg-slate-900 text-slate-100 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-10 shadow-xl border border-slate-700">
                    <div className="relative">
                      完成 10 場定級賽後即可查看分數
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <RankIcon rating={user.rating || 1500} size={64} />
                  <p className="text-sm text-slate-300">
                    Rating: <span className="text-amber-400 font-bold">{user.rating || 1500}</span>
                  </p>
                </div>
              )}
            </div>
            
            {/* 統計資料 */}
            <div className="w-full mt-6 space-y-4">
              {/* 積分對戰 */}
              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-wider">積分對戰</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">勝</span>
                    <span className="text-sm font-bold text-green-400">{user.ranked_games_won || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">敗</span>
                    <span className="text-sm font-bold text-red-400">{(user.ranked_games_played || 0) - (user.ranked_games_won || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">總</span>
                    <span className="text-sm font-bold text-slate-400">{user.ranked_games_played || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">率</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {user.ranked_games_played > 0 ? Math.round((user.ranked_games_won / user.ranked_games_played) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 一般對戰 */}
              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">一般對戰</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">勝</span>
                    <span className="text-sm font-bold text-green-400">{user.casual_games_won || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">敗</span>
                    <span className="text-sm font-bold text-red-400">{(user.casual_games_played || 0) - (user.casual_games_won || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">總</span>
                    <span className="text-sm font-bold text-slate-400">{user.casual_games_played || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">率</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {user.casual_games_played > 0 ? Math.round((user.casual_games_won / user.casual_games_played) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 好友對戰 */}
              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider">好友對戰</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">勝</span>
                    <span className="text-sm font-bold text-green-400">{user.custom_games_won || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">敗</span>
                    <span className="text-sm font-bold text-red-400">{(user.custom_games_played || 0) - (user.custom_games_won || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">總</span>
                    <span className="text-sm font-bold text-slate-400">{user.custom_games_played || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">率</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {user.custom_games_played > 0 ? Math.round((user.custom_games_won / user.custom_games_played) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full mt-4 space-y-3">
              <button 
                onClick={() => startMatching('ranked')}
                disabled={isMatching}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>🏆</span> 積分對戰
              </button>
              
              <button 
                onClick={() => startMatching('casual')}
                disabled={isMatching}
                className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>🎮</span> 一般對戰
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

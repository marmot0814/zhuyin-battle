import React from 'react';
import { getRankInfo, formatLastOnline } from '../../../lib/utils';
import RankIcon from '../../components/RankIcons';

interface UserDetailModalProps {
  showUserDetail: boolean;
  setShowUserDetail: (show: boolean) => void;
  selectedUser: any;
  addFriend: (userId: number) => void;
  removeFriend?: (userId: number) => void;
  onChallenge?: (userId: number) => void;
}

export default function UserDetailModal({
  showUserDetail,
  setShowUserDetail,
  selectedUser,
  addFriend,
  removeFriend,
  onChallenge
}: UserDetailModalProps) {
  if (!showUserDetail || !selectedUser) return null;

  const renderStats = (title: string, played: number, won: number, colorClass: string) => {
    const lost = played - won;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
    
    return (
      <div className="bg-slate-900/50 p-4 rounded-xl">
        <h4 className={`text-xs font-bold ${colorClass} mb-3 uppercase tracking-wider`}>{title}</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">勝場</span>
            <span className="font-bold text-green-400">{won}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">敗場</span>
            <span className="font-bold text-red-400">{lost}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">總場次</span>
            <span className="font-bold text-white">{played}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs">勝率</span>
            <span className="font-bold text-emerald-400">{winRate}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">玩家資料</h3>
          <button
            onClick={() => setShowUserDetail(false)}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* 頭像和基本資訊 */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`}
            alt={selectedUser.username}
            className="w-24 h-24 rounded-full border-4 border-indigo-500 mb-4"
          />
          <h2 className="text-2xl font-bold text-white">{selectedUser.username}</h2>
          
          {/* 上線狀態 */}
          {selectedUser.seconds_offline < 300 ? (
            <p className="text-green-400 text-sm mt-1">● 線上</p>
          ) : (
            <p className="text-slate-400 text-sm mt-1">離線 {formatLastOnline(selectedUser.seconds_offline)}</p>
          )}
          
          {/* Bio */}
          {selectedUser.bio && (
            <p className="text-slate-300 text-sm mt-3 text-center italic">{selectedUser.bio}</p>
          )}

          {/* Rank Icon */}
          {selectedUser.rating && (
            <div className="mt-4">
              <RankIcon rating={selectedUser.rating} size={64} />
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 mt-4 w-full justify-center">
            {selectedUser.is_friend && onChallenge && (
              <button
                onClick={() => onChallenge(selectedUser.id)}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>⚔️</span> 約戰
              </button>
            )}
            {!selectedUser.is_friend ? (
              <button
                onClick={() => addFriend(selectedUser.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                加為好友
              </button>
            ) : (
              removeFriend && (
                <button
                  onClick={() => {
                    if (confirm('確定要刪除這位好友嗎？')) {
                      removeFriend(selectedUser.id);
                      setShowUserDetail(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                >
                  刪除好友
                </button>
              )
            )}
          </div>
        </div>
        
        {/* 統計資訊 */}
        <div className="space-y-4 mb-6">
          {/* 積分對戰 */}
          <div className="bg-slate-900/50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-wider">積分對戰</h4>
            {selectedUser.ranked_games_played < 10 ? (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm text-amber-400 text-center font-medium">定級中</p>
                <p className="text-xs text-slate-400 text-center mt-2">完成 10 場定級賽後將顯示段位</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                   <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-xs">已完成</span>
                    <span className="font-bold text-white">{selectedUser.ranked_games_played}/10</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-xs">勝場</span>
                    <span className="font-bold text-green-400">{selectedUser.ranked_games_won}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-slate-400 text-xs block">段位</span>
                    <span className={`font-bold text-lg ${getRankInfo(selectedUser.rating).color}`}>
                      {getRankInfo(selectedUser.rating).nameZh}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-xs block">Rating</span>
                    <span className="font-bold text-lg text-amber-400">{selectedUser.rating}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">勝場</span>
                    <span className="font-bold text-green-400">{selectedUser.ranked_games_won}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">敗場</span>
                    <span className="font-bold text-red-400">{selectedUser.ranked_games_played - selectedUser.ranked_games_won}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">總場次</span>
                    <span className="font-bold text-white">{selectedUser.ranked_games_played}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">勝率</span>
                    <span className="font-bold text-emerald-400">
                      {selectedUser.ranked_games_played > 0 
                        ? Math.round((selectedUser.ranked_games_won / selectedUser.ranked_games_played) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 一般對戰 */}
          {renderStats('一般對戰', selectedUser.casual_games_played || 0, selectedUser.casual_games_won || 0, 'text-blue-400')}

          {/* 好友對戰 */}
          {renderStats('好友對戰', selectedUser.custom_games_played || 0, selectedUser.custom_games_won || 0, 'text-purple-400')}
        </div>
        
        {/* Rating 分佈圖 - 只有完成定級賽的人才顯示 */}
        {selectedUser.ranked_games_played >= 10 && (
          <div className="bg-slate-900/50 p-4 rounded-xl mb-6">
            <h4 className="text-sm font-bold text-white mb-3">Rating 分佈</h4>
            <div className="relative pt-6 pb-2">
              {/* 分段標記 (上方) */}
              <div className="absolute top-0 left-0 right-0 flex justify-between text-[10px] text-slate-500">
                <span style={{left: '0%'}} className="absolute">0</span>
                <span style={{left: '14%'}} className="absolute">800</span>
                <span style={{left: '28%'}} className="absolute">1200</span>
                <span style={{left: '42%'}} className="absolute">1500</span>
                <span style={{left: '57%'}} className="absolute">1800</span>
                <span style={{left: '71%'}} className="absolute">2200</span>
                <span style={{left: '85%'}} className="absolute">2500</span>
              </div>
            
              {/* 進度條 */}
              <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mt-1">
                {/* 漸層背景 */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-600 via-amber-700 via-slate-400 via-yellow-500 via-cyan-500 via-blue-600 to-purple-600 opacity-50"></div>
                
                {/* 當前位置標記 */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"
                  style={{ 
                    left: `${Math.min(Math.max((selectedUser.rating) / 3000 * 100, 0), 100)}%`
                  }}
                >
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded border border-slate-600 whitespace-nowrap">
                    {selectedUser.rating}
                  </div>
                </div>
              </div>
              
              {/* 段位標記 (下方) */}
              <div className="flex justify-between items-start mt-2 px-1">
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-slate-500">鐵</span>
                  <span className="text-[9px] text-slate-600">0-800</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-amber-700">銅</span>
                  <span className="text-[9px] text-slate-600">800+</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-slate-300">銀</span>
                  <span className="text-[9px] text-slate-600">1200+</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-yellow-500">金</span>
                  <span className="text-[9px] text-slate-600">1500+</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-cyan-400">白金</span>
                  <span className="text-[9px] text-slate-600">1800+</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-blue-400">鑽石</span>
                  <span className="text-[9px] text-slate-600">2200+</span>
                </div>
                 <div className="flex flex-col items-center w-8">
                  <span className="text-[10px] text-purple-400">大師</span>
                  <span className="text-[9px] text-slate-600">2500+</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 底部關閉按鈕 */}
        <div className="mt-4">
          <button
            onClick={() => setShowUserDetail(false)}
            className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

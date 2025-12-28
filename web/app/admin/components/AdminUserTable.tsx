import React from 'react';
import { User } from '../types';
import RankIcon from '../../components/RankIcons';
import { getRankInfo } from '../../../lib/utils';

interface AdminUserTableProps {
  users: User[];
  viewMode: 'turn-based' | 'rts';
  onDelete: (id: number) => void;
  onBan: (user: User) => void;
  onUnban: (user: User) => void;
}

export default function AdminUserTable({ users, viewMode, onDelete, onBan, onUnban }: AdminUserTableProps) {
  // 格式化時間
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 格式化上線狀態
  function formatOnlineStatus(secondsOffline: number) {
    if (secondsOffline < 300) return <span className="text-green-400">● 線上</span>;
    const minutes = Math.floor(secondsOffline / 60);
    if (minutes < 60) return <span className="text-slate-400">{minutes} 分鐘前</span>;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return <span className="text-slate-400">{hours} 小時前</span>;
    const days = Math.floor(hours / 24);
    return <span className="text-slate-400">{days} 天前</span>;
  }

  const getStats = (user: User) => {
    if (viewMode === 'rts') {
      return {
        rating: user.rts_rating,
        rankedPlayed: user.rts_ranked_games_played || 0,
        rankedWon: user.rts_ranked_games_won || 0,
        casualPlayed: user.rts_casual_games_played || 0,
        casualWon: user.rts_casual_games_won || 0,
        customPlayed: user.rts_custom_games_played || 0,
        customWon: user.rts_custom_games_won || 0,
      };
    }
    return {
      rating: user.rating,
      rankedPlayed: user.ranked_games_played || 0,
      rankedWon: user.ranked_games_won || 0,
      casualPlayed: user.casual_games_played || 0,
      casualWon: user.casual_games_won || 0,
      customPlayed: user.custom_games_played || 0,
      customWon: user.custom_games_won || 0,
    };
  };

  return (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">頭像</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">用戶名</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">Email</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating ({viewMode === 'rts' ? 'RTS' : '回合'})</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">積分對戰 (勝/敗/場/率)</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">一般對戰 (勝/敗/場/率)</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">好友對戰 (勝/敗/場/率)</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">上線狀態</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">註冊時間</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const stats = getStats(user);
              return (
              <tr
                key={user.id}
                className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                  idx % 2 === 0 ? 'bg-slate-900/20' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-10 h-10 rounded-full border-2 border-slate-600"
                  />
                </td>
                <td className="py-3 px-4 text-white font-medium">{user.username}</td>
                <td className="py-3 px-4 text-slate-300 text-sm">{user.email}</td>
                <td className="py-3 px-4 text-amber-400 font-bold">
                  {stats.rating !== null ? (
                    <div className="flex items-center gap-2 group relative">
                      <RankIcon rating={stats.rating} size={32} />
                      <span>{stats.rating}</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                        {getRankInfo(stats.rating).nameZh}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">定級中</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <div className="flex flex-col text-xs">
                    <span className="text-green-400">勝: {stats.rankedWon}</span>
                    <span className="text-red-400">敗: {stats.rankedPlayed - stats.rankedWon}</span>
                    <span>場: {stats.rankedPlayed}</span>
                    <span className="text-slate-400">
                      {stats.rankedPlayed > 0
                        ? `${Math.round((stats.rankedWon / stats.rankedPlayed) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <div className="flex flex-col text-xs">
                    <span className="text-green-400">勝: {stats.casualWon}</span>
                    <span className="text-red-400">敗: {stats.casualPlayed - stats.casualWon}</span>
                    <span>場: {stats.casualPlayed}</span>
                    <span className="text-slate-400">
                      {stats.casualPlayed > 0
                        ? `${Math.round((stats.casualWon / stats.casualPlayed) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <div className="flex flex-col text-xs">
                    <span className="text-green-400">勝: {stats.customWon}</span>
                    <span className="text-red-400">敗: {stats.customPlayed - stats.customWon}</span>
                    <span>場: {stats.customPlayed}</span>
                    <span className="text-slate-400">
                      {stats.customPlayed > 0
                        ? `${Math.round((stats.customWon / stats.customPlayed) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">{formatOnlineStatus(user.seconds_offline)}</td>
                <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(user.created_at)}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {user.banned_until && new Date(user.banned_until) > new Date() ? (
                      <button 
                        onClick={() => onUnban(user)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        解封
                      </button>
                    ) : (
                      <button 
                        onClick={() => onBan(user)}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        封禁
                      </button>
                    )}
                    <button 
                      onClick={() => onDelete(user.id)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

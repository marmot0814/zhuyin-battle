import React from 'react';
import { Stats, RatingDistribution, User } from '../types';
import RankIcon from '../../components/RankIcons';
import { getRankInfo } from '../../../lib/utils';

interface AdminOverviewProps {
  stats: Stats;
  ratingDist: RatingDistribution[];
  recentUsers: User[];
  totalUsersCount: number; // For calculating percentage
}

export default function AdminOverview({ stats, ratingDist, recentUsers, totalUsersCount }: AdminOverviewProps) {
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">總用戶數</p>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">平均 Rating</p>
          <p className="text-3xl font-bold text-indigo-400">{stats.averageRating}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">總對戰場次</p>
          <p className="text-3xl font-bold text-purple-400">{stats.totalGamesPlayed}</p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">段位分布</h2>
        <div className="space-y-3">
          {ratingDist.map((item) => (
            <div key={item.rank} className="flex items-center gap-4">
              <div className="w-48 text-slate-300 font-medium">{item.rank}</div>
              <div className="flex-1 bg-slate-800 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-end px-3"
                  style={{
                    width: `${Math.max(
                      (parseInt(item.count) / Math.max(totalUsersCount, 1)) * 100,
                      5
                    )}%`
                  }}
                >
                  <span className="text-white font-bold text-sm">{item.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">最近註冊用戶</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">ID</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">用戶名</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Rating</th>
                <th className="text-left py-4 px-4 text-slate-400 font-medium">對戰場次</th>
                <th className="text-left py-4 px-4 text-slate-400 font-medium">註冊時間</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-300">{user.id}</td>
                  <td className="py-3 px-4 text-white font-medium">{user.username}</td>
                  <td className="py-3 px-4 text-slate-300 text-sm">{user.email}</td>
                  <td className="py-3 px-4 text-amber-400 font-bold">
                    {user.rating !== null ? (
                      <div className="flex items-center gap-2 group relative">
                        <RankIcon rating={user.rating} size={24} />
                        <span>{user.rating}</span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                          {getRankInfo(user.rating).nameZh}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">定級中</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{user.games_played}</td>
                  <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

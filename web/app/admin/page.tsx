"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import RankIcon from '../components/RankIcons';
import { getRankInfo } from '../../lib/utils';


interface User {
  id: number;
  email: string;
  username: string;
  avatar_url: string;
  bio: string;
  rating: number;
  games_played: number;
  games_won: number;
  ranked_games_played: number;
  ranked_games_won: number;
  casual_games_played: number;
  casual_games_won: number;
  custom_games_played: number;
  custom_games_won: number;
  created_at: string;
  last_online: string;
  seconds_offline: number;
}

interface Friend {
  id: number;
  user_id: number;
  friend_id: number;
  status: string;
  created_at: string;
  user_username: string;
  user_email: string;
  friend_username: string;
  friend_email: string;
}

interface Stats {
  totalUsers: number;
  totalFriendships: number;
  pendingFriendRequests: number;
  averageRating: string;
  totalGamesPlayed: number;
}

interface RatingDistribution {
  rank: string;
  count: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 數據狀態
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [ratingDist, setRatingDist] = useState<RatingDistribution[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'friends' | 'battles'>('overview');

  // 驗證密碼
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      // 載入數據
      await loadAllData();
    } else {
      setError('密碼錯誤');
    }
    
    setLoading(false);
  }

  // 載入所有數據
  async function loadAllData() {
    try {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
      console.log('Admin password:', adminPassword);
      const headers = {
        'x-admin-password': adminPassword || ''
      };
      
      const [usersRes, friendsRes, statsRes, ratingRes, recentRes, battlesRes] = await Promise.all([
        api('/api/admin/users', { headers }),
        api('/api/admin/friends', { headers }),
        api('/api/admin/stats', { headers }),
        api('/api/admin/rating-distribution', { headers }),
        api('/api/admin/recent-users', { headers }),
        api('/api/matchmaking/active', { headers })
      ]);
      
      console.log('Users response status:', usersRes.status);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        console.log('Users data:', usersData);
        setUsers(usersData);
      } else {
        console.error('Users fetch failed:', await usersRes.text());
      }
      
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (ratingRes.ok) setRatingDist(await ratingRes.json());
      if (recentRes.ok) setRecentUsers(await recentRes.json());
      if (battlesRes.ok) setActiveBattles(await battlesRes.json());
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  }

  // 刪除對戰
  async function deleteBattle(battleId: string) {
    if (!confirm('確定要刪除這場對戰嗎？')) return;
    
    try {
      // Use the password from state which is verified
      const res = await api(`/api/admin/battles/${battleId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password }
      });
      
      if (res.ok) {
        setActiveBattles(prev => prev.filter(b => b.id !== battleId));
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      console.error('Failed to delete battle:', error);
      alert('刪除發生錯誤');
    }
  }

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

  // 如果未驗證，顯示登入畫面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-500 rotate-45 flex items-center justify-center">
              <span className="-rotate-45 font-black text-white italic text-lg">管</span>
            </div>
            <h1 className="text-2xl font-bold text-white">管理員登入</h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                管理員密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="輸入管理員密碼"
                autoFocus
              />
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {loading ? '驗證中...' : '登入'}
            </button>
          </form>
          
          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 text-slate-400 hover:text-white text-sm transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // 已驗證，顯示管理面板
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* Header */}
      <nav className="bg-[#1e293b] border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rotate-45 flex items-center justify-center">
                <span className="-rotate-45 font-black text-white italic text-lg">管</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">管理員後台</h1>
                <p className="text-sm text-slate-400">注音對戰系統管理</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                🔄 重新整理
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                返回首頁
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 總覽統計
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 用戶列表 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🤝 好友關係 ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'battles'
                ? 'text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚔️ 活躍對戰 ({activeBattles.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-2">總用戶數</p>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-2">好友關係數</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalFriendships}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-2">待處理請求</p>
                <p className="text-3xl font-bold text-amber-400">{stats.pendingFriendRequests}</p>
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
                            (parseInt(item.count) / users.filter(u => u.games_played >= 10).length) * 100,
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
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">對戰場次</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">註冊時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-slate-300">{user.id}</td>
                        <td className="py-3 px-4 text-white font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{user.email}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">
                          <div className="flex items-center gap-2 group relative">
                            <RankIcon rating={user.rating} size={24} />
                            <span>{user.rating}</span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                              {getRankInfo(user.rating).nameZh}
                            </div>
                          </div>
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
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">頭像</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">用戶名</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Email</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">積分對戰 (勝/敗/場/率)</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">一般對戰 (勝/敗/場/率)</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">好友對戰 (勝/敗/場/率)</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">上線狀態</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">註冊時間</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
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
                        <div className="flex items-center gap-2 group relative">
                          <RankIcon rating={user.rating} size={32} />
                          <span>{user.rating}</span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                            {getRankInfo(user.rating).nameZh}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex flex-col text-xs">
                          <span className="text-green-400">勝: {user.ranked_games_won || 0}</span>
                          <span className="text-red-400">敗: {(user.ranked_games_played || 0) - (user.ranked_games_won || 0)}</span>
                          <span>場: {user.ranked_games_played || 0}</span>
                          <span className="text-slate-400">
                            {user.ranked_games_played > 0
                              ? `${Math.round((user.ranked_games_won / user.ranked_games_played) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex flex-col text-xs">
                          <span className="text-green-400">勝: {user.casual_games_won || 0}</span>
                          <span className="text-red-400">敗: {(user.casual_games_played || 0) - (user.casual_games_won || 0)}</span>
                          <span>場: {user.casual_games_played || 0}</span>
                          <span className="text-slate-400">
                            {user.casual_games_played > 0
                              ? `${Math.round((user.casual_games_won / user.casual_games_played) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex flex-col text-xs">
                          <span className="text-green-400">勝: {user.custom_games_won || 0}</span>
                          <span className="text-red-400">敗: {(user.custom_games_played || 0) - (user.custom_games_won || 0)}</span>
                          <span>場: {user.custom_games_played || 0}</span>
                          <span className="text-slate-400">
                            {user.custom_games_played > 0
                              ? `${Math.round((user.custom_games_won / user.custom_games_played) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatOnlineStatus(user.seconds_offline)}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">關係 ID</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">用戶 ID</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">用戶名</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">用戶 Email</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">好友 ID</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">好友名</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">好友 Email</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">狀態</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {friends.map((friend, idx) => (
                    <tr
                      key={friend.id}
                      className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                        idx % 2 === 0 ? 'bg-slate-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 font-mono">{friend.id}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{friend.user_id}</td>
                      <td className="py-3 px-4 text-white font-medium">{friend.user_username}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{friend.user_email}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{friend.friend_id}</td>
                      <td className="py-3 px-4 text-white font-medium">{friend.friend_username}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{friend.friend_email}</td>
                      <td className="py-3 px-4">
                        {friend.status === 'accepted' ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            已接受
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                            待處理
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(friend.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Battles Tab */}
        {activeTab === 'battles' && (
          <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">對戰 ID</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">模式</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">玩家 1</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating 1</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">玩家 2</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating 2</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">開始時間</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBattles.map((battle, idx) => (
                    <tr
                      key={battle.id}
                      className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                        idx % 2 === 0 ? 'bg-slate-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 font-mono">{battle.id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          battle.mode === 'ranked' 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {battle.mode === 'ranked' ? '積分' : '一般'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                        <img src={battle.player1_avatar} className="w-6 h-6 rounded-full" />
                        {battle.player1_name}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{battle.player1_rating}</td>
                      <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                        <img src={battle.player2_avatar} className="w-6 h-6 rounded-full" />
                        {battle.player2_name}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{battle.player2_rating}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(battle.created_at)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteBattle(battle.id)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

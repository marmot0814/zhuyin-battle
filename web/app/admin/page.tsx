"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { User, Stats, RatingDistribution, Battle } from './types';
import AdminOverview from './components/AdminOverview';
import AdminUserTable from './components/AdminUserTable';
import AdminBattleTable from './components/AdminBattleTable';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 數據狀態
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [ratingDist, setRatingDist] = useState<RatingDistribution[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'battles'>('overview');
  const [viewMode, setViewMode] = useState<'turn-based' | 'rts'>('turn-based');

  // Ban Modal State
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState(1);
  const [banUnit, setBanUnit] = useState('days');
  const [banReason, setBanReason] = useState('');

  // Confirm Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [isDangerousAction, setIsDangerousAction] = useState(false);

  // Actions
  async function handleDeleteUser(id: number) {
    setConfirmTitle('刪除用戶');
    setConfirmMessage('確定要刪除此用戶嗎？此操作無法復原！');
    setIsDangerousAction(true);
    setConfirmAction(() => async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: { 'x-admin-password': password }
        });
        if (res.ok) {
          setUsers(users.filter(u => u.id !== id));
          alert('用戶已刪除');
        } else {
          alert('刪除失敗');
        }
      } catch (err) {
        console.error(err);
        alert('刪除失敗');
      } finally {
        setShowConfirm(false);
      }
    });
    setShowConfirm(true);
  }

  async function handleBanUser() {
    if (!selectedUser) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': password 
        },
        body: JSON.stringify({ duration: banDuration, unit: banUnit, reason: banReason })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        setShowBanModal(false);
        alert('用戶已封禁');
      } else {
        alert('封禁失敗');
      }
    } catch (err) {
      console.error(err);
      alert('封禁失敗');
    }
  }

  function openUnbanModal(user: User) {
    setSelectedUser(user);
    setShowUnbanModal(true);
  }

  async function executeUnban() {
    if (!selectedUser) return;
    
    try {
      console.log('Sending unban request...');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}/unban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': password 
        }
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        setShowUnbanModal(false);
        alert('用戶已解封');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`解封失敗: ${errorData.error || '未知錯誤'}`);
      }
    } catch (err) {
      console.error('Unban error:', err);
      alert('解封失敗: 網絡錯誤');
    }
  }

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
      const headers = {
        'x-admin-password': adminPassword || ''
      };
      
      const [usersRes, statsRes, ratingRes, recentRes, battlesRes] = await Promise.all([
        api('/api/admin/users', { headers }),
        api('/api/admin/stats', { headers }),
        api('/api/admin/rating-distribution', { headers }),
        api('/api/admin/recent-users', { headers }),
        api('/api/matchmaking/active', { headers })
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
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
    setConfirmTitle('刪除對戰');
    setConfirmMessage('確定要刪除這場對戰嗎？');
    setIsDangerousAction(true);
    setConfirmAction(() => async () => {
      try {
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
      } finally {
        setShowConfirm(false);
      }
    });
    setShowConfirm(true);
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
          <AdminOverview 
            stats={stats} 
            ratingDist={ratingDist} 
            recentUsers={recentUsers} 
            totalUsersCount={users.length}
          />
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="flex justify-end mb-4">
              <div className="bg-slate-800 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setViewMode('turn-based')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'turn-based'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  回合制
                </button>
                <button
                  onClick={() => setViewMode('rts')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'rts'
                      ? 'bg-pink-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  即時制 (RTS)
                </button>
              </div>
            </div>
            <AdminUserTable 
              users={users} 
              viewMode={viewMode}
              onDelete={handleDeleteUser} 
              onBan={(user) => {
                setSelectedUser(user);
                setShowBanModal(true);
              }}
              onUnban={openUnbanModal}
            />
          </>
        )}

        {/* Battles Tab */}
        {activeTab === 'battles' && (
          <AdminBattleTable 
            battles={activeBattles} 
            onDelete={deleteBattle} 
          />
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96">
            <h3 className="text-xl font-bold text-white mb-4">封禁用戶: {selectedUser?.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1">時長</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={banDuration} 
                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white w-20"
                    min="1"
                  />
                  <select 
                    value={banUnit} 
                    onChange={(e) => setBanUnit(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white flex-1"
                  >
                    <option value="minutes">分鐘</option>
                    <option value="hours">小時</option>
                    <option value="days">天</option>
                    <option value="permanent">永久</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">原因</label>
                <textarea 
                  value={banReason} 
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white w-full h-24"
                  placeholder="請輸入封禁原因..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                >
                  取消
                </button>
                <button 
                  onClick={handleBanUser}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  確認封禁
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unban Modal */}
      {showUnbanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96">
            <h3 className="text-xl font-bold text-white mb-4">解封用戶: {selectedUser.username}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">封禁原因</span>
                  <p className="text-white">{selectedUser.ban_reason || '無'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">解封時間</span>
                  <p className="text-white">
                    {selectedUser.banned_until 
                      ? new Date(selectedUser.banned_until).toLocaleString('zh-TW') 
                      : '永久'}
                  </p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                確定要立即解除此用戶的封禁狀態嗎？
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowUnbanModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                取消
              </button>
              <button 
                onClick={executeUnban}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                確認解封
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setShowConfirm(false)}
        isDangerous={isDangerousAction}
      />
    </div>
  );
}

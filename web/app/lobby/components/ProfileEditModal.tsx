import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface ProfileEditModalProps {
  showProfileEdit: boolean;
  setShowProfileEdit: (show: boolean) => void;
  user: any;
  onUpdate: (updatedUser: any) => void;
}

export default function ProfileEditModal({
  showProfileEdit,
  setShowProfileEdit,
  user,
  onUpdate
}: ProfileEditModalProps) {
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (showProfileEdit && user) {
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
    }
  }, [showProfileEdit, user]);

  async function handleUpdateProfile() {
    try {
      const response = await api('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ 
          username: editUsername,
          bio: editBio 
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdate(updatedUser);
        setShowProfileEdit(false);
      } else {
        const error = await response.json();
        alert(error.error || '更新失敗');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('更新失敗，請稍後再試');
    }
  }

  if (!showProfileEdit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">編輯個人資料</h3>
          <button
            onClick={() => setShowProfileEdit(false)}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">使用者名稱</label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="輸入使用者名稱"
              maxLength={20}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">個人簡介</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              placeholder="寫點關於自己的事情..."
              rows={3}
              maxLength={100}
            />
            <p className="text-xs text-slate-500 mt-1 text-right">{editBio.length} / 100</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowProfileEdit(false)}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleUpdateProfile}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}

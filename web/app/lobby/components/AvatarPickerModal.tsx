import React from 'react';
import { AVATAR_OPTIONS } from '../../../lib/utils';
import { api } from '../../../lib/api';

interface AvatarPickerModalProps {
  showAvatarPicker: boolean;
  setShowAvatarPicker: (show: boolean) => void;
  currentAvatar: string;
  onUpdate: (updatedUser: any) => void;
}

export default function AvatarPickerModal({
  showAvatarPicker,
  setShowAvatarPicker,
  currentAvatar,
  onUpdate
}: AvatarPickerModalProps) {
  
  async function handleSelectAvatar(seed: string) {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    
    try {
      const response = await api('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: avatarUrl })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdate(updatedUser);
        setShowAvatarPicker(false);
      }
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  }

  if (!showAvatarPicker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">選擇你的頭像</h3>
          <button
            onClick={() => setShowAvatarPicker(false)}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2">
          {AVATAR_OPTIONS.map((seed) => {
            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
            const isSelected = currentAvatar === avatarUrl;
            return (
              <button
                key={seed}
                onClick={() => handleSelectAvatar(seed)}
                className={`relative w-full aspect-square rounded-xl overflow-hidden border-4 transition-all hover:scale-105 ${
                  isSelected 
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/50' 
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img 
                  src={avatarUrl}
                  alt={seed}
                  className="w-full h-full object-cover bg-gradient-to-br from-indigo-600 to-purple-400"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-3xl">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

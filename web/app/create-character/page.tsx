'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CreateCharacter() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 產生 100 個頭貼選項
  const avatarSeeds = Array.from({ length: 100 }, (_, i) => i);

  useEffect(() => {
    // 從 localStorage 取得待處理的 email
    const pendingEmail = localStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      // 如果沒有 pendingEmail，導回首頁
      router.replace('/');
      return;
    }
    setEmail(pendingEmail);
    setSelectedAvatar(Math.floor(Math.random() * 100)); // 隨機預設頭貼
  }, [router]);

  const getAvatarUrl = (seed: number) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      alert('請輸入角色名稱');
      return;
    }

    if (username.length > 20) {
      alert('角色名稱不能超過 20 個字元');
      return;
    }

    if (bio.length > 100) {
      alert('自我介紹不能超過 100 個字元');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/users/create-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: username.trim(),
          avatar_url: getAvatarUrl(selectedAvatar),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('pendingEmail');
        router.replace('/lobby');
      } else {
        alert(data.error || '創建角色失敗，請稍後再試');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Create character error:', err);
      alert('創建角色失敗，請稍後再試');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">創建你的角色</h1>
        <p className="text-white/70 text-center mb-8">設定你的名字、頭貼和自我介紹</p>

        <div className="space-y-6">
          {/* 頭貼選擇 */}
          <div>
            <label className="block text-white font-semibold mb-3">頭貼</label>
            <div className="flex items-center gap-4">
              <img 
                src={getAvatarUrl(selectedAvatar)} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30"
              />
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                {showAvatarPicker ? '收起頭貼選單' : '選擇頭貼'}
              </button>
            </div>

            {showAvatarPicker && (
              <div className="mt-4 bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-8 gap-3">
                  {avatarSeeds.map((seed) => (
                    <button
                      key={seed}
                      onClick={() => {
                        setSelectedAvatar(seed);
                        setShowAvatarPicker(false);
                      }}
                      className={`w-12 h-12 rounded-full transition-all hover:scale-110 ${
                        selectedAvatar === seed 
                          ? 'ring-4 ring-yellow-400 scale-110' 
                          : 'ring-2 ring-white/20'
                      }`}
                    >
                      <img 
                        src={getAvatarUrl(seed)} 
                        alt={`Avatar ${seed}`}
                        className="w-full h-full rounded-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 角色名稱 */}
          <div>
            <label className="block text-white font-semibold mb-2">
              角色名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="輸入你的角色名稱"
              maxLength={20}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="text-right text-white/50 text-sm mt-1">{username.length}/20</div>
          </div>

          {/* 自我介紹 */}
          <div>
            <label className="block text-white font-semibold mb-2">自我介紹</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="介紹一下自己吧..."
              maxLength={100}
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="text-right text-white/50 text-sm mt-1">{bio.length}/100</div>
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => {
                localStorage.removeItem('pendingEmail');
                router.replace('/');
              }}
              className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors border border-white/30"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !username.trim()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? '創建中...' : '完成創建'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

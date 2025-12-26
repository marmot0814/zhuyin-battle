"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 20 個預設頭像選項
const AVATAR_OPTIONS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5',
  'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10',
  'avatar11', 'avatar12', 'avatar13', 'avatar14', 'avatar15',
  'avatar16', 'avatar17', 'avatar18', 'avatar19', 'avatar20'
];

// 排位等級系統
function getRankInfo(rating: number) {
  if (rating < 800) return { name: 'IRON', nameZh: '鐵牌', color: 'text-slate-400' };
  if (rating < 1000) return { name: 'BRONZE', nameZh: '銅牌', color: 'text-amber-700' };
  if (rating < 1200) return { name: 'SILVER', nameZh: '銀牌', color: 'text-slate-300' };
  if (rating < 1500) return { name: 'GOLD', nameZh: '金牌', color: 'text-yellow-400' };
  if (rating < 1800) return { name: 'PLATINUM', nameZh: '白金', color: 'text-cyan-400' };
  if (rating < 2200) return { name: 'DIAMOND', nameZh: '鑽石', color: 'text-blue-400' };
  if (rating < 2500) return { name: 'MASTER', nameZh: '大師', color: 'text-purple-400' };
  return { name: 'GRANDMASTER', nameZh: '宗師', color: 'text-red-400' };
}

// 格式化上線時間
function formatLastOnline(secondsOffline: number) {
  if (secondsOffline < 30) return '線上';
  if (secondsOffline < 60) return '剛剛上線';
  const minutes = Math.floor(secondsOffline / 60);
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function LobbyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatFriend, setChatFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // 匹配相關狀態
  const [isMatching, setIsMatching] = useState(false);
  const [matchMode, setMatchMode] = useState<'ranked' | 'casual' | null>(null);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'matched' | null>(null);
  const [matchedBattleId, setMatchedBattleId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  // 檢查登入狀態
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // 未登入，導向首頁
      router.replace('/');
    } else {
      // 取得用戶資料
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // 如果用戶沒有頭像，設定預設頭像
        if (!parsedUser.avatar_url) {
          setSelectedAvatar(AVATAR_OPTIONS[0]);
        } else {
          setSelectedAvatar(parsedUser.avatar_url);
        }
      }
      setIsLoading(false);
    }
  }, [router]);

  // 每 20 秒 ping 一次（表示線上）
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 初次 ping
    fetch(`${API_URL}/api/friends/ping`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 每 20 秒 ping 一次
    const interval = setInterval(() => {
      fetch(`${API_URL}/api/friends/ping`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 載入好友和線上用戶
  useEffect(() => {
    if (!user) return;
    
    const token = localStorage.getItem('token');
    
    async function loadFriendsAndUsers() {
      try {
        const [friendsRes, usersRes, requestsRes] = await Promise.all([
          fetch(`${API_URL}/api/friends/my-friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/friends/online-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/friends/pending-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriends(friendsData);
        }
        
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setOnlineUsers(usersData);
        }

        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setFriendRequests(requestsData);
        }
      } catch (error) {
        console.error('Failed to load friends and users:', error);
      }
    }
    
    loadFriendsAndUsers();
    
    // 每 30 秒更新一次
    const interval = setInterval(loadFriendsAndUsers, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 登出函數
  async function handleLogout() {
    try {
      // 呼叫後端登出 API
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/api/users/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除本地資料並導向首頁
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/?forceLogin=true');
    }
  }

  // 開啟編輯個人資料
  function openProfileEdit() {
    setEditUsername(user?.username || '');
    setEditBio(user?.bio || '');
    setShowProfileEdit(true);
  }

  // 更新個人資料
  async function handleUpdateProfile() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          username: editUsername,
          bio: editBio 
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
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

  // 選擇頭像
  async function handleSelectAvatar(avatarSeed: string) {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    setSelectedAvatar(avatarUrl);
    
    // 更新到伺服器
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: avatarUrl })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowAvatarPicker(false);
      }
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  }

  // 查看用戶詳情
  async function viewUserDetail(userId: number) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/friends/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setSelectedUser(userData);
        setShowUserDetail(true);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    }
  }

  // 發送好友請求
  async function sendFriendRequest(userId: number) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/friends/add-friend/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('好友請求已發送！');
        // 更新線上用戶列表
        const usersRes = await fetch(`${API_URL}/api/friends/online-users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          setOnlineUsers(await usersRes.json());
        }
      } else {
        const data = await response.json();
        alert(data.error || '發送失敗');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  }

  // 接受好友請求
  async function acceptFriendRequest(requestId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/friends/accept-friend/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // 重新載入好友列表、請求列表和線上玩家列表
        const [friendsRes, requestsRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/friends/my-friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/friends/pending-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/friends/online-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        if (friendsRes.ok) setFriends(await friendsRes.json());
        if (requestsRes.ok) setFriendRequests(await requestsRes.json());
        if (usersRes.ok) setOnlineUsers(await usersRes.json());
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  }

  // 拒絕好友請求
  async function rejectFriendRequest(requestId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/friends/reject-friend/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // 重新載入請求列表
        const requestsRes = await fetch(`${API_URL}/api/friends/pending-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (requestsRes.ok) {
          setFriendRequests(await requestsRes.json());
        }
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  }

  // 刪除好友
  async function removeFriend(friendId: number) {
    if (!confirm('確定要刪除這位好友嗎？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/friends/remove-friend/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // 重新載入好友列表
        const friendsRes = await fetch(`${API_URL}/api/friends/my-friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (friendsRes.ok) {
          setFriends(await friendsRes.json());
        }
        // 如果正在聊天的是這位好友，關閉聊天視窗
        if (chatFriend && chatFriend.id === friendId) {
          setShowChat(false);
          setChatFriend(null);
        }
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  }

  // 開啟聊天視窗
  async function openChat(friend: any) {
    setChatFriend(friend);
    setShowChat(true);
    await loadMessages(friend.id);
  }

  // 載入聊天記錄
  async function loadMessages(friendId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/friends/messages/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  // 發送訊息
  async function sendMessage() {
    if (!newMessage.trim() || !chatFriend) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/friends/send-message/${chatFriend.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });
      
      if (res.ok) {
        setNewMessage('');
        await loadMessages(chatFriend.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  // 格式化訊息時間
  function formatMessageTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return '剛剛';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 開始匹配
  async function startMatching(mode: 'ranked' | 'casual') {
    try {
      setIsMatching(true);
      setMatchMode(mode);
      setMatchStatus('waiting');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/matchmaking/queue/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
        throw new Error('Failed to join queue');
      }

      const data = await response.json();
      
      if (data.status === 'matched') {
        // 立即匹配成功
        setMatchStatus('matched');
        setMatchedBattleId(data.battleId);
        setOpponent(data.opponent);
        // 3 秒後跳轉到對戰頁面
        setTimeout(() => {
          router.push(`/battle/${data.battleId}`);
        }, 3000);
      } else {
        // 等待匹配，開始輪詢
        startMatchPolling();
      }
    } catch (error) {
      console.error('Failed to start matching:', error);
      setIsMatching(false);
      setMatchMode(null);
      setMatchStatus(null);
      alert('匹配失敗，請重試');
    }
  }

  // 輪詢匹配狀態
  function startMatchPolling() {
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/matchmaking/queue/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const data = await response.json();

        if (data.status === 'matched') {
          clearInterval(pollInterval);
          setMatchStatus('matched');
          setMatchedBattleId(data.battleId);
          setOpponent(data.opponent);
          // 3 秒後跳轉
          setTimeout(() => {
            router.push(`/battle/${data.battleId}`);
          }, 3000);
        }
      } catch (error) {
        console.error('Error polling match status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // 每 2 秒輪詢一次

    // 存儲 interval ID 以便取消時清除
    (window as any).matchPollInterval = pollInterval;
  }

  // 取消匹配
  async function cancelMatching() {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/matchmaking/queue/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 清除輪詢
      if ((window as any).matchPollInterval) {
        clearInterval((window as any).matchPollInterval);
      }

      setIsMatching(false);
      setMatchMode(null);
      setMatchStatus(null);
    } catch (error) {
      console.error('Failed to cancel matching:', error);
    }
  }

  // 加好友（保留舊函數給用戶詳情頁使用）
  async function addFriend(userId: number) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/friends/add-friend/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('好友請求已發送！');
        // 重新載入請求列表
        const requestsRes = await fetch(`${API_URL}/api/friends/pending-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (requestsRes.ok) {
          setFriendRequests(await requestsRes.json());
        }
        // 更新用戶詳情
        if (selectedUser && selectedUser.id === userId) {
          viewUserDetail(userId);
        }
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  }

  // 如果正在檢查登入狀態，顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* 1. Navbar (固定高度) */}
      <nav className="h-16 border-b border-slate-800 bg-[#1e293b]/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rotate-45 flex items-center justify-center">
            <span className="-rotate-45 font-black text-white italic text-sm">注</span>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">注音對戰</span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowFriendRequests(!showFriendRequests)}
            className="relative px-3 py-2 text-slate-300 hover:text-white transition-colors"
          >
            <span className="text-2xl">🔔</span>
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {friendRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            登出
          </button>
        </div>
      </nav>

      {/* 2. Main Content Area (滿版高度，隱藏外層滾動) */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* 左側：Profile Sidebar (滿版且固定) */}
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
                <div className="mt-3">
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
                    <p className="text-sm text-slate-300">
                      Rating: <span className="text-amber-400 font-bold">{user.rating || 1500}</span>
                    </p>
                  )}
                </div>
                
                {/* 積分對戰統計 */}
                <div className="w-full mt-6 space-y-3">
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">積分對戰次數</span>
                      <span className="text-sm font-bold text-white">{user.games_played || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">積分對戰勝率</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => startMatching('ranked')}
                    disabled={isMatching}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>🏆</span> 積分對戰
                  </button>
                  
                  <div className="border-t border-slate-700/50 my-2"></div>
                  
                  {/* 一般對戰統計 */}
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">一般對戰次數</span>
                      <span className="text-sm font-bold text-white">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">一般對戰勝率</span>
                      <span className="text-sm font-bold text-indigo-400">0%</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => startMatching('casual')}
                    disabled={isMatching}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>⚔️</span> 一般對戰
                  </button>
                  
                  <div className="border-t border-slate-700/50 my-2"></div>
                  
                  <button className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <span>👥</span> 好友對戰
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 右側：好友列表和線上用戶 */}
        <section className="flex-1 flex flex-col bg-[#0f172a] p-6 overflow-y-auto">
          {/* 好友列表 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>👥</span> 我的好友 ({friends.length})
            </h3>
            
            {friends.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>還沒有好友</p>
                <p className="text-sm mt-1">從下方的線上用戶中添加好友吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                        alt={friend.username}
                        className="w-10 h-10 rounded-full border-2 border-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-white">{friend.username}</p>
                        <p className="text-xs text-slate-400">
                          {friend.seconds_offline < 30 
                            ? <span className="text-green-400">● 線上</span>
                            : formatLastOnline(friend.seconds_offline)
                          }
                        </p>
                      </div>
                      {friend.games_played >= 10 && (
                        <div className={`text-sm font-bold ${getRankInfo(friend.rating).color}`}>
                          {friend.rating}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => openChat(friend)}
                        className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                      >
                        💬 聊天
                      </button>
                      <button
                        onClick={() => viewUserDetail(friend.id)}
                        className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                      >
                        📋 資料
                      </button>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 線上用戶 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🌐</span> 線上玩家 ({onlineUsers.length})
            </h3>
            
            {onlineUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>目前沒有其他線上玩家</p>
              </div>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map((player) => (
                  <div
                    key={player.id}
                    className="w-full bg-slate-800/30 p-3 rounded-xl flex items-center gap-3 border border-slate-700/30"
                  >
                    <button
                      onClick={() => viewUserDetail(player.id)}
                      className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                        alt={player.username}
                        className="w-10 h-10 rounded-full border-2 border-slate-600"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{player.username}</p>
                        <p className="text-xs text-green-400">● 線上</p>
                      </div>
                      {player.games_played >= 10 ? (
                        <div className={`text-sm font-bold ${getRankInfo(player.rating).color}`}>
                          {player.rating}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-400 font-mono">
                          定級中
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendFriendRequest(player.id);
                      }}
                      className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors flex-shrink-0"
                    >
                      加好友
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
      {showAvatarPicker && (
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
                const isSelected = selectedAvatar === avatarUrl;
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
      )}

      {/* 個人資料編輯 Modal */}
      {showProfileEdit && (
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
      )}

      {/* 用戶詳情 Modal */}
      {showUserDetail && selectedUser && (
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
            </div>
            
            {/* 排位資訊 */}
            <div className="bg-slate-900/50 p-4 rounded-xl mb-6">
              {selectedUser.games_played < 10 ? (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-sm text-amber-400 text-center font-medium">定級中</p>
                  <p className="text-xs text-slate-400 text-center mt-2">完成 10 場定級賽後將顯示段位</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">段位</span>
                    <span className={`font-bold ${getRankInfo(selectedUser.rating).color}`}>
                      {getRankInfo(selectedUser.rating).nameZh}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">Rating</span>
                    <span className="font-bold text-amber-400">{selectedUser.rating}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">對戰場次</span>
                    <span className="font-bold text-white">{selectedUser.games_played}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">勝率</span>
                    <span className="font-bold text-emerald-400">
                      {selectedUser.games_played > 0 
                        ? Math.round((selectedUser.games_won / selectedUser.games_played) * 100) 
                        : 0}%
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {/* Rating 分佈圖 - 只有完成定級賽的人才顯示 */}
            {selectedUser.games_played >= 10 && (
              <div className="bg-slate-900/50 p-4 rounded-xl mb-6">
                <h4 className="text-sm font-bold text-white mb-3">Rating 分佈</h4>
                <div className="relative">
                  {/* 分段標記 */}
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>800</span>
                    <span>1200</span>
                    <span>1500</span>
                  <span>1800</span>
                  <span>2200</span>
                </div>
                
                {/* 進度條 */}
                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                  {/* 漸層背景 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-400 via-yellow-400 via-cyan-400 via-blue-400 to-purple-400 opacity-30"></div>
                  
                  {/* 當前位置標記 */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                    style={{ 
                      left: `${Math.min(Math.max((selectedUser.rating - 800) / (2200 - 800) * 100, 0), 100)}%`
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white whitespace-nowrap">
                      {selectedUser.rating}
                    </div>
                  </div>
                </div>
                
                {/* 段位標記 */}
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-400">鐵</span>
                  <span className="text-slate-300">銀</span>
                  <span className="text-yellow-400">金</span>
                  <span className="text-cyan-400">白金</span>
                  <span className="text-blue-400">鑽</span>
                </div>
              </div>
              </div>
            )}
            
            {/* 操作按鈕 */}
            <div className="flex gap-3">
              {!selectedUser.is_friend && (
                <button
                  onClick={() => addFriend(selectedUser.id)}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  加為好友
                </button>
              )}
              <button
                onClick={() => setShowUserDetail(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 好友請求彈窗 */}
      {showFriendRequests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">好友請求</h3>
              <button
                onClick={() => setShowFriendRequests(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>目前沒有待處理的好友請求</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {friendRequests.map((request) => (
                  <div
                    key={request.request_id}
                    className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img 
                        src={request.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.username}`}
                        alt={request.username}
                        className="w-12 h-12 rounded-full border-2 border-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-white">{request.username}</p>
                        {request.games_played >= 10 ? (
                          <p className={`text-sm ${getRankInfo(request.rating).color}`}>
                            {getRankInfo(request.rating).nameZh} · {request.rating}
                          </p>
                        ) : (
                          <p className="text-sm text-amber-400">定級中</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(request.request_id)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.request_id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                      >
                        拒絕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 聊天視窗 */}
      {showChat && chatFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-2xl h-[600px] border border-slate-700 shadow-2xl flex flex-col">
            {/* 聊天標題 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <img 
                  src={chatFriend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatFriend.username}`}
                  alt={chatFriend.username}
                  className="w-10 h-10 rounded-full border-2 border-indigo-500"
                />
                <div>
                  <h3 className="text-lg font-bold text-white">{chatFriend.username}</h3>
                  <p className="text-xs text-slate-400">
                    {chatFriend.seconds_offline < 30 
                      ? <span className="text-green-400">● 線上</span>
                      : formatLastOnline(chatFriend.seconds_offline)
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChat(false);
                  setChatFriend(null);
                  setMessages([]);
                }}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* 聊天訊息區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>還沒有訊息</p>
                  <p className="text-sm mt-1">開始聊天吧！</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-2 rounded-2xl ${
                          isMe 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-700 text-white'
                        }`}>
                          <p className="text-sm break-words">{msg.content}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 px-2">
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* 輸入區域 */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="輸入訊息..."
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  發送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 匹配等待畫面 */}
      {isMatching && (
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
                    <div className="text-left">
                      <div className="font-bold text-white">{opponent.username}</div>
                      <div className="text-sm text-slate-400">Rating: {opponent.rating}</div>
                    </div>
                  </div>
                )}
                
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 animate-[width_3s_linear_forwards]" style={{ width: '100%' }}></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { AVATAR_OPTIONS } from '../../lib/utils';

import Navbar from './components/Navbar';
import ProfileSidebar from './components/ProfileSidebar';
import SocialPanel from './components/SocialPanel';
import ActiveBattleList from './components/ActiveBattleList';
import AvatarPickerModal from './components/AvatarPickerModal';
import ProfileEditModal from './components/ProfileEditModal';
import UserDetailModal from './components/UserDetailModal';
import FriendRequestsModal from './components/FriendRequestsModal';
import ChatWindow from './components/ChatWindow';
import MatchmakingOverlay from './components/MatchmakingOverlay';
import RankDistributionModal from './components/RankDistributionModal';

export default function LobbyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // UI Visibility States
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Data States
  const [friends, setFriends] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [battleInvites, setBattleInvites] = useState<any[]>([]);
  
  // Selection States
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [chatFriend, setChatFriend] = useState<any>(null);
  
  // Matchmaking States
  const [isMatching, setIsMatching] = useState(false);
  const [matchMode, setMatchMode] = useState<'ranked' | 'casual' | null>(null);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'matched' | null>(null);
  const [matchedBattleId, setMatchedBattleId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<any>(null);

  // Derived State
  const currentAvatar = user?.avatar_url || AVATAR_OPTIONS[0];

  // 檢查登入狀態並獲取最新資料
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
    } else {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      // Fetch latest user data
      api('/api/users/me')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch user');
        })
        .then(updatedUser => {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        })
        .catch(err => {
          console.error(err);
          // If 401, maybe redirect to login? For now just log error.
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [router]);

  // Heartbeat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    api('/api/friends/ping', { method: 'POST' });
    const interval = setInterval(() => {
      api('/api/friends/ping', { method: 'POST' });
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Load Friends & Users
  useEffect(() => {
    if (!user) return;
    
    async function loadFriendsAndUsers() {
      try {
        const [friendsRes, usersRes, requestsRes, invitesRes] = await Promise.all([
          api('/api/friends/my-friends'),
          api('/api/friends/online-users'),
          api('/api/friends/pending-requests'),
          api('/api/friends/battle-invites')
        ]);
        
        if (friendsRes.ok) setFriends(await friendsRes.json());
        if (usersRes.ok) setOnlineUsers(await usersRes.json());
        if (requestsRes.ok) setFriendRequests(await requestsRes.json());
        if (invitesRes.ok) setBattleInvites(await invitesRes.json());
      } catch (error) {
        console.error('Failed to load friends and users:', error);
      }
    }
    
    loadFriendsAndUsers();
    const interval = setInterval(loadFriendsAndUsers, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Handlers
  async function handleChallenge(userId: number) {
    try {
      const res = await api(`/api/friends/invite-battle/${userId}`, { method: 'POST' });
      if (res.ok) {
        alert('已發送約戰邀請！');
      } else {
        const data = await res.json();
        alert(data.error || '發送邀請失敗');
      }
    } catch (error) {
      console.error('Challenge error:', error);
    }
  }

  async function handleAcceptInvite(inviteId: number) {
    try {
      const res = await api(`/api/friends/accept-battle-invite/${inviteId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        router.push(`/battle?id=${data.battleId}`);
      } else {
        alert('接受邀請失敗');
      }
    } catch (error) {
      console.error('Accept invite error:', error);
    }
  }

  async function handleRejectInvite(inviteId: number) {
    try {
      await api(`/api/friends/reject-battle-invite/${inviteId}`, { method: 'POST' });
      setBattleInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error('Reject invite error:', error);
    }
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api('/api/users/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/');
    }
  }

  function handleUserUpdate(updatedUser: any) {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  function openProfileEdit() {
    setShowProfileEdit(true);
  }

  async function viewUserDetail(userId: number) {
    try {
      const response = await api(`/api/friends/user/${userId}`);
      if (response.ok) {
        setSelectedUser(await response.json());
        setShowUserDetail(true);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    }
  }

  async function sendFriendRequest(userId: number) {
    try {
      const response = await api(`/api/friends/add-friend/${userId}`, { method: 'POST' });
      if (response.ok) {
        alert('好友請求已發送！');
        const usersRes = await api('/api/friends/online-users');
        if (usersRes.ok) setOnlineUsers(await usersRes.json());
      } else {
        const data = await response.json();
        alert(data.error || '發送失敗');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  }

  async function acceptFriendRequest(requestId: number) {
    try {
      const res = await api(`/api/friends/accept-friend/${requestId}`, { method: 'POST' });
      if (res.ok) {
        const [friendsRes, requestsRes, usersRes] = await Promise.all([
          api('/api/friends/my-friends'),
          api('/api/friends/pending-requests'),
          api('/api/friends/online-users')
        ]);
        if (friendsRes.ok) setFriends(await friendsRes.json());
        if (requestsRes.ok) setFriendRequests(await requestsRes.json());
        if (usersRes.ok) setOnlineUsers(await usersRes.json());
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  }

  async function rejectFriendRequest(requestId: number) {
    try {
      const res = await api(`/api/friends/reject-friend/${requestId}`, { method: 'DELETE' });
      if (res.ok) {
        const requestsRes = await api('/api/friends/pending-requests');
        if (requestsRes.ok) setFriendRequests(await requestsRes.json());
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  }

  async function removeFriend(friendId: number) {
    if (!confirm('確定要刪除這位好友嗎？')) return;
    try {
      const res = await api(`/api/friends/remove-friend/${friendId}`, { method: 'DELETE' });
      if (res.ok) {
        const friendsRes = await api('/api/friends/my-friends');
        if (friendsRes.ok) setFriends(await friendsRes.json());
        if (chatFriend && chatFriend.id === friendId) {
          setShowChat(false);
          setChatFriend(null);
        }
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  }

  function openChat(friend: any) {
    setChatFriend(friend);
    setShowChat(true);
  }

  // Matchmaking Logic
  async function startMatching(mode: 'ranked' | 'casual') {
    try {
      setIsMatching(true);
      setMatchMode(mode);
      setMatchStatus('waiting');

      const response = await api('/api/matchmaking/queue/join', {
        method: 'POST',
        body: JSON.stringify({ mode })
      });

      if (!response.ok) throw new Error('Failed to join queue');

      const data = await response.json();
      
      if (data.status === 'matched') {
        setMatchStatus('matched');
        setMatchedBattleId(data.battleId);
        setOpponent(data.opponent);
        setTimeout(() => router.push(`/battle?id=${data.battleId}`), 3000);
      } else {
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

  function startMatchPolling() {
    const pollInterval = setInterval(async () => {
      try {
        const response = await api('/api/matchmaking/queue/status');
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
          setTimeout(() => router.push(`/battle?id=${data.battleId}`), 3000);
        }
      } catch (error) {
        console.error('Error polling match status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
    (window as any).matchPollInterval = pollInterval;
  }

  async function cancelMatching() {
    try {
      await api('/api/matchmaking/queue/leave', { method: 'POST' });
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

  async function addFriend(userId: number) {
    try {
      const response = await api(`/api/friends/add-friend/${userId}`, { method: 'POST' });
      if (response.ok) {
        alert('好友請求已發送！');
        const requestsRes = await api('/api/friends/pending-requests');
        if (requestsRes.ok) setFriendRequests(await requestsRes.json());
        if (selectedUser && selectedUser.id === userId) {
          viewUserDetail(userId);
        }
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      <Navbar 
        friendRequestsCount={friendRequests.length + battleInvites.length}
        showFriendRequests={showFriendRequests}
        setShowFriendRequests={setShowFriendRequests}
        handleLogout={handleLogout}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
      />

      <main className="flex flex-1 overflow-hidden">
        <ProfileSidebar 
          user={user}
          selectedAvatar={currentAvatar}
          setShowAvatarPicker={setShowAvatarPicker}
          openProfileEdit={openProfileEdit}
          startMatching={startMatching}
          isMatching={isMatching}
        />

        <ActiveBattleList user={user} />

        <SocialPanel 
          friends={friends}
          onlineUsers={onlineUsers}
          openChat={openChat}
          viewUserDetail={viewUserDetail}
          removeFriend={removeFriend}
          sendFriendRequest={sendFriendRequest}
        />
      </main>

      <AvatarPickerModal 
        showAvatarPicker={showAvatarPicker}
        setShowAvatarPicker={setShowAvatarPicker}
        currentAvatar={currentAvatar}
        onUpdate={handleUserUpdate}
      />

      <ProfileEditModal 
        showProfileEdit={showProfileEdit}
        setShowProfileEdit={setShowProfileEdit}
        user={user}
        onUpdate={handleUserUpdate}
      />

      <UserDetailModal 
        showUserDetail={showUserDetail}
        setShowUserDetail={setShowUserDetail}
        selectedUser={selectedUser}
        addFriend={addFriend}
        removeFriend={removeFriend}
        onChallenge={handleChallenge}
      />

      <FriendRequestsModal
        showFriendRequests={showFriendRequests}
        setShowFriendRequests={setShowFriendRequests}
        friendRequests={friendRequests}
        acceptFriendRequest={acceptFriendRequest}
        rejectFriendRequest={rejectFriendRequest}
        battleInvites={battleInvites}
        acceptBattleInvite={handleAcceptInvite}
        rejectBattleInvite={handleRejectInvite}
      />

      <ChatWindow 
        showChat={showChat}
        setShowChat={setShowChat}
        chatFriend={chatFriend}
        user={user}
      />

      <MatchmakingOverlay 
        isMatching={isMatching}
        matchStatus={matchStatus}
        matchMode={matchMode}
        cancelMatching={cancelMatching}
        opponent={opponent}
      />

      <RankDistributionModal 
        show={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  );
}

import React from 'react';
import { getRankInfo, formatLastOnline } from '../../../lib/utils';

interface SocialPanelProps {
  friends: any[];
  onlineUsers: any[];
  openChat: (friend: any) => void;
  viewUserDetail: (userId: number) => void;
  removeFriend: (friendId: number) => void;
  sendFriendRequest: (userId: number) => void;
}

export default function SocialPanel({
  friends,
  onlineUsers,
  openChat,
  viewUserDetail,
  removeFriend,
  sendFriendRequest
}: SocialPanelProps) {
  return (
    <section className="w-80 flex flex-col bg-[#0f172a] p-6 overflow-y-auto border-l border-slate-800 flex-shrink-0">
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
                onClick={() => viewUserDetail(friend.id)}
                className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-all cursor-pointer relative group"
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
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(friend);
                  }}
                  className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                  title="聊天"
                >
                  💬
                </button>
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
  );
}

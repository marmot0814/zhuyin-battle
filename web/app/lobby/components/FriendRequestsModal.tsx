import React from 'react';
import { getRankInfo } from '../../../lib/utils';

interface FriendRequestsModalProps {
  showFriendRequests: boolean;
  setShowFriendRequests: (show: boolean) => void;
  friendRequests: any[];
  acceptFriendRequest: (requestId: number) => void;
  rejectFriendRequest: (requestId: number) => void;
  battleInvites?: any[];
  acceptBattleInvite?: (inviteId: number) => void;
  rejectBattleInvite?: (inviteId: number) => void;
}

export default function FriendRequestsModal({
  showFriendRequests,
  setShowFriendRequests,
  friendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  battleInvites = [],
  acceptBattleInvite,
  rejectBattleInvite
}: FriendRequestsModalProps) {
  if (!showFriendRequests) return null;

  const hasNotifications = friendRequests.length > 0 || battleInvites.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">通知中心</h3>
          <button
            onClick={() => setShowFriendRequests(false)}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {!hasNotifications ? (
          <div className="text-center py-8 text-slate-500">
            <p>目前沒有新的通知</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Battle Invites */}
            {battleInvites.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-wider">對戰邀請</h4>
                <div className="space-y-3">
                  {battleInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="bg-slate-800/50 p-4 rounded-xl border border-amber-500/30"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src={invite.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.username}`}
                          alt={invite.username}
                          className="w-12 h-12 rounded-full border-2 border-amber-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            <span className="text-amber-400">{invite.username}</span> 邀請你進行對戰
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(invite.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptBattleInvite && acceptBattleInvite(invite.id)}
                          className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                        >
                          接受挑戰
                        </button>
                        <button
                          onClick={() => rejectBattleInvite && rejectBattleInvite(invite.id)}
                          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                        >
                          拒絕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">好友請求</h4>
                <div className="space-y-3">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

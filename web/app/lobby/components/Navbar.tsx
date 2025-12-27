import React from 'react';

interface NavbarProps {
  friendRequestsCount: number;
  showFriendRequests: boolean;
  setShowFriendRequests: (show: boolean) => void;
  handleLogout: () => void;
  onOpenLeaderboard: () => void;
}

export default function Navbar({ 
  friendRequestsCount, 
  showFriendRequests, 
  setShowFriendRequests, 
  handleLogout,
  onOpenLeaderboard
}: NavbarProps) {
  return (
    <nav className="h-16 border-b border-slate-800 bg-[#1e293b]/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-50">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black text-white tracking-tighter italic">
          注音 <span className="text-indigo-500">對戰</span>
        </h1>
      </div>
      <div className="flex gap-4 items-center">
        <button
          onClick={onOpenLeaderboard}
          className="px-3 py-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
          title="排行榜"
        >
          <span className="text-2xl">📊</span>
        </button>
        <button
          onClick={() => setShowFriendRequests(!showFriendRequests)}
          className="relative px-3 py-2 text-slate-300 hover:text-white transition-colors"
        >
          <span className="text-2xl">🔔</span>
          {friendRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {friendRequestsCount}
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
  );
}

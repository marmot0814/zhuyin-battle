import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

interface ActiveBattle {
  id: number;
  mode: 'ranked' | 'casual';
  created_at: string;
  player1_id: number;
  player1_name: string;
  player1_avatar: string;
  player1_rating: number | null;
  player2_id: number;
  player2_name: string;
  player2_avatar: string;
  player2_rating: number | null;
}

interface ActiveBattleListProps {
  user: any;
}

export default function ActiveBattleList({ user }: ActiveBattleListProps) {
  const router = useRouter();
  const [battles, setBattles] = useState<ActiveBattle[]>([]);

  useEffect(() => {
    fetchActiveBattles();
    const interval = setInterval(fetchActiveBattles, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchActiveBattles() {
    try {
      const res = await api('/api/matchmaking/active');
      if (res.ok) {
        setBattles(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch active battles:', error);
    }
  }

  const myBattles = battles.filter(b => user && (b.player1_id === user.id || b.player2_id === user.id));
  const otherBattles = battles.filter(b => !user || (b.player1_id !== user.id && b.player2_id !== user.id));

  const BattleCard = ({ battle, isMyBattle }: { battle: ActiveBattle, isMyBattle: boolean }) => (
    <div 
      className={`bg-slate-800/50 rounded-xl p-3 border transition-all cursor-pointer group ${
        isMyBattle 
          ? 'border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-900/20' 
          : 'border-slate-700/50 hover:border-indigo-500/30 hover:bg-slate-800'
      }`}
      onClick={() => router.push(`/battle?id=${battle.id}`)}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            battle.mode === 'ranked' 
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {battle.mode === 'ranked' ? '積分對戰' : '一般對戰'}
          </span>
          {isMyBattle && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
              進行中
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(battle.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div className="flex items-center justify-between gap-4">
        {/* Player 1 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img 
            src={battle.player1_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.player1_name}`}
            alt={battle.player1_name}
            className="w-8 h-8 rounded-full bg-slate-700"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{battle.player1_name}</div>
            <div className="text-xs text-slate-500">
              {battle.player1_rating ? `Rating: ${battle.player1_rating}` : 'Unranked'}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-slate-600 font-bold text-sm">VS</span>
          {!isMyBattle && (
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              觀戰
            </span>
          )}
        </div>

        {/* Player 2 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{battle.player2_name}</div>
            <div className="text-xs text-slate-500">
              {battle.player2_rating ? `Rating: ${battle.player2_rating}` : 'Unranked'}
            </div>
          </div>
          <img 
            src={battle.player2_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.player2_name}`}
            alt={battle.player2_name}
            className="w-8 h-8 rounded-full bg-slate-700"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-slate-900/50 border-x border-slate-800 flex flex-col min-w-0">
      {/* 我的對戰 */}
      {myBattles.length > 0 && (
        <div className="flex-shrink-0">
          <div className="p-4 border-b border-slate-800 bg-indigo-900/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚔️</span> 我的對戰
            </h2>
          </div>
          <div className="p-4 space-y-3 border-b border-slate-800">
            {myBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} isMyBattle={true} />
            ))}
          </div>
        </div>
      )}

      {/* 正在進行的對戰 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            正在進行的對戰
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {otherBattles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>目前沒有其他正在進行的對戰</p>
            </div>
          ) : (
            otherBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} isMyBattle={false} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

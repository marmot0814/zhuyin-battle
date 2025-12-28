import React from 'react';
import { Battle } from '../types';

interface AdminBattleTableProps {
  battles: Battle[];
  onDelete: (id: string) => void;
}

export default function AdminBattleTable({ battles, onDelete }: AdminBattleTableProps) {
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">對戰 ID</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">模式</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">玩家 1</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating 1</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">玩家 2</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">Rating 2</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">開始時間</th>
              <th className="text-left py-4 px-4 text-slate-300 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {battles.map((battle, idx) => (
              <tr
                key={battle.id}
                className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                  idx % 2 === 0 ? 'bg-slate-900/20' : ''
                }`}
              >
                <td className="py-3 px-4 text-slate-300 font-mono">{battle.id}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    battle.mode === 'ranked' 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {battle.mode === 'ranked' ? '積分' : '一般'}
                  </span>
                </td>
                <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                  <img src={battle.player1_avatar} className="w-6 h-6 rounded-full" />
                  {battle.player1_name}
                </td>
                <td className="py-3 px-4 text-amber-400 font-bold">{battle.player1_rating}</td>
                <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                  <img src={battle.player2_avatar} className="w-6 h-6 rounded-full" />
                  {battle.player2_name}
                </td>
                <td className="py-3 px-4 text-amber-400 font-bold">{battle.player2_rating}</td>
                <td className="py-3 px-4 text-slate-400 text-sm">{formatDate(battle.created_at)}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onDelete(battle.id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

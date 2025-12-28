import React, { useState } from 'react';

interface BattleSettingsModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (settings: BattleSettings) => void;
  friendName: string;
}

export interface BattleSettings {
  mode: 'turn-based' | 'rts';
  timeControl: 'unlimited' | 'increment';
  baseTime: number; // seconds
  increment: number; // seconds
}

export default function BattleSettingsModal({ show, onClose, onConfirm, friendName }: BattleSettingsModalProps) {
  const [mode, setMode] = useState<'turn-based' | 'rts'>('turn-based');
  const [timeControl, setTimeControl] = useState<'unlimited' | 'increment'>('increment');
  const [baseTime, setBaseTime] = useState(60);
  const [increment, setIncrement] = useState(60);

  if (!show) return null;

  const handleConfirm = () => {
    onConfirm({
      mode,
      timeControl,
      baseTime,
      increment
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚔️</span> 發起挑戰
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-center">
            設定與 <span className="text-indigo-400 font-bold">{friendName}</span> 的對戰規則
          </p>

          {/* Game Mode */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">對戰模式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('turn-based')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  mode === 'turn-based'
                    ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/20'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold">回合制</div>
                <div className="text-xs opacity-70 mt-1">經典輪流出牌</div>
              </button>
              <button
                onClick={() => setMode('rts')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  mode === 'rts'
                    ? 'border-pink-500 bg-pink-500/20 text-white shadow-lg shadow-pink-500/20'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold">即時制 (RTS)</div>
                <div className="text-xs opacity-70 mt-1">快節奏搶地盤</div>
              </button>
            </div>
          </div>

          {/* Time Control - Only for Turn-based */}
          {mode === 'turn-based' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">時間設定</label>
              <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setTimeControl('unlimited')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    timeControl === 'unlimited' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  不限時間
                </button>
                <button
                  onClick={() => setTimeControl('increment')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    timeControl === 'increment' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  加秒制
                </button>
              </div>

              {timeControl === 'increment' && (
                <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">基礎時間 (秒)</label>
                    <input
                      type="number"
                      value={baseTime}
                      onChange={(e) => setBaseTime(Math.max(10, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">每回合加秒 (秒)</label>
                    <input
                      type="number"
                      value={increment}
                      onChange={(e) => setIncrement(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            發送邀請
          </button>
        </div>
      </div>
    </div>
  );
}

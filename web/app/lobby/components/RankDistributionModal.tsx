import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import RankIcon from '../../components/RankIcons';

interface RankDistributionModalProps {
  show: boolean;
  onClose: () => void;
}

interface RankData {
  rank: string;
  count: number;
}

const RANK_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER'];

const RANK_CONFIG: Record<string, { nameZh: string, gradient: string, rating: number }> = {
  'IRON': { nameZh: '鐵牌', gradient: 'from-zinc-500 to-zinc-700', rating: 700 },
  'BRONZE': { nameZh: '銅牌', gradient: 'from-amber-600 to-amber-800', rating: 900 },
  'SILVER': { nameZh: '銀牌', gradient: 'from-slate-300 to-slate-500', rating: 1100 },
  'GOLD': { nameZh: '金牌', gradient: 'from-yellow-300 to-yellow-600', rating: 1350 },
  'PLATINUM': { nameZh: '白金', gradient: 'from-cyan-300 to-cyan-600', rating: 1650 },
  'DIAMOND': { nameZh: '鑽石', gradient: 'from-blue-400 to-blue-700', rating: 2000 },
  'MASTER': { nameZh: '大師', gradient: 'from-purple-400 to-purple-700', rating: 2300 },
  'GRANDMASTER': { nameZh: '宗師', gradient: 'from-red-400 to-red-700', rating: 2600 },
};

export default function RankDistributionModal({ show, onClose }: RankDistributionModalProps) {
  const [data, setData] = useState<RankData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) {
      setLoading(true);
      api('/api/users/rank-distribution')
        .then(res => res.json())
        .then(data => {
          // Sort data according to RANK_ORDER
          const sortedData = RANK_ORDER.map(rank => {
            const found = data.find((d: any) => d.rank === rank);
            return { rank, count: found ? found.count : 0 };
          });
          setData(sortedData);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [show]);

  if (!show) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid division by zero

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] p-8 rounded-2xl w-full max-w-4xl border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl leading-none"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-white mb-8 text-center">全服段位分佈</h2>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="h-80 flex items-end justify-between gap-2 px-4">
            {data.map((item) => {
              const config = RANK_CONFIG[item.rank];
              const heightPercent = (item.count / maxCount) * 100;
              
              return (
                <div key={item.rank} className="flex flex-col items-center flex-1 group relative">
                  {/* Count Label (Hover) */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-600 whitespace-nowrap z-10">
                    {item.count} 人 ({config.nameZh})
                  </div>

                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t-lg bg-gradient-to-t ${config.gradient} transition-all duration-500 hover:brightness-110 relative`}
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    {/* Top Glow */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>
                  </div>

                  {/* X-Axis Label (Icon) */}
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <div className="transform transition-transform group-hover:scale-110">
                      <RankIcon rating={config.rating} size={32} />
                    </div>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-full mt-1 whitespace-nowrap">
                      {config.nameZh}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-8 text-center text-slate-500 text-sm">
          統計範圍：完成 10 場定級賽的活躍玩家
        </div>
      </div>
    </div>
  );
}

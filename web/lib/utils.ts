
// 排位等級系統
export function getRankInfo(rating: number) {
  if (rating < 800) return { name: 'IRON', nameZh: '鐵牌', color: 'text-slate-400' };
  if (rating < 1000) return { name: 'BRONZE', nameZh: '銅牌', color: 'text-amber-700' };
  if (rating < 1200) return { name: 'SILVER', nameZh: '銀牌', color: 'text-slate-300' };
  if (rating < 1500) return { name: 'GOLD', nameZh: '金牌', color: 'text-yellow-400' };
  if (rating < 1800) return { name: 'PLATINUM', nameZh: '白金', color: 'text-cyan-400' };
  if (rating < 2200) return { name: 'DIAMOND', nameZh: '鑽石', color: 'text-blue-400' };
  if (rating < 2500) return { name: 'MASTER', nameZh: '大師', color: 'text-purple-400' };
  return { name: 'GRANDMASTER', nameZh: '宗師', color: 'text-red-400' };
}

// 20 個預設頭像選項
export const AVATAR_OPTIONS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5',
  'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10',
  'avatar11', 'avatar12', 'avatar13', 'avatar14', 'avatar15',
  'avatar16', 'avatar17', 'avatar18', 'avatar19', 'avatar20'
];

// 格式化上線時間
export function formatLastOnline(secondsOffline: number) {
  if (secondsOffline < 30) return '線上';
  if (secondsOffline < 60) return '剛剛上線';
  const minutes = Math.floor(secondsOffline / 60);
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

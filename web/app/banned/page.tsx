"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function BannedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState<string>('');
  const [bannedUntil, setBannedUntil] = useState<string>('');

  useEffect(() => {
    // Try to get info from URL params first
    const r = searchParams.get('reason');
    const u = searchParams.get('until');
    
    if (r) setReason(r);
    if (u) setBannedUntil(u);

    // If not in URL, maybe check localStorage or just show generic message
    // But usually we will redirect here with params
  }, [searchParams]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/50 shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🚫</span>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">帳號已被停權</h1>
        <p className="text-slate-400 mb-6">
          您的帳號因違反社群規範已被暫時停權。
        </p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">停權原因</span>
            <p className="text-white font-medium">{reason || '未提供原因'}</p>
          </div>
          
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">解封時間</span>
            <p className="text-white font-medium">
              {bannedUntil ? format(new Date(bannedUntil), 'yyyy年MM月dd日 HH:mm', { locale: zhTW }) : '永久停權'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
        >
          登出並返回首頁
        </button>
      </div>
    </div>
  );
}

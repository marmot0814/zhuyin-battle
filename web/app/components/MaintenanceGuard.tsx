'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const res = await fetch(`${API_URL}/api/health`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error('Health check failed');
        }
        const data = await res.json();
        if (data.status !== 'ok') {
          setIsMaintenance(true);
        } else {
          setIsMaintenance(false);
        }
      } catch (error) {
        console.error('Health check error:', error);
        setIsMaintenance(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
    
    // Poll every 10 seconds if in maintenance mode to auto-recover
    const interval = setInterval(() => {
      if (isMaintenance) {
        checkHealth();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isMaintenance]);

  if (isLoading) {
    // Optional: Show a loading spinner while checking initial health
    // For now, we can just render nothing or a simple loader
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4 overflow-hidden relative">
      {/* Background animated blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/3 w-64 h-64 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 text-center max-w-lg mx-auto backdrop-blur-sm bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl">
        {/* Animated Icon */}
        <div className="mb-8 relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-2xl rotate-3 flex items-center justify-center shadow-lg animate-bounce-slow">
            <span className="text-5xl font-bold text-white">ㄅ</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 6.524a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-pink-200">
          系統維護中
        </h1>
        
        <p className="text-lg text-gray-300 mb-8 leading-relaxed">
          為了提供更好的對戰體驗，我們正在進行系統升級與維護。
          <br />
          <span className="text-sm text-gray-400 mt-2 block">
            伺服器暫時無法連線，請稍後再試。
          </span>
        </p>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
          <span>系統將自動嘗試重新連線...</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-gray-500 text-sm">
        &copy; 2025 Zhuyin Battle. All rights reserved.
      </div>
    </div>
  );
}

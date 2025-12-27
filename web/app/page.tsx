"use client";

import { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';


function Typewriter(props: { text: string; phoneticMap?: Record<string, string>; phoneticDelay?: number; charDelay?: number; className?: string }) {
  const { text, phoneticMap = {}, phoneticDelay = 600, charDelay = 40, className } = props;
  const [parts, setParts] = useState<string[]>([]); // rendered characters
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    setParts([]);

    (async function run() {
      for (let i = 0; i < text.length && mounted; i++) {
        const ch = text.charAt(i);
        const phon = phoneticMap[ch];

        if (phon) {
          // show phonetic first
          setParts((p) => [...p, phon]);
          await new Promise((r) => setTimeout(r, phoneticDelay));
          // replace last with real char
          setParts((p) => { const copy = [...p]; copy[copy.length - 1] = ch; return copy; });
        } else {
          setParts((p) => [...p, ch]);
        }

        await new Promise((r) => setTimeout(r, charDelay));
      }
    })();

    const cInterval = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => { mounted = false; clearInterval(cInterval); };
  }, [text, phoneticMap, phoneticDelay, charDelay]);

  return (
    <p className={className}>
      {parts.join('')}
      <span className={cursorVisible ? 'inline-block ml-1 text-indigo-300' : 'inline-block ml-1 text-transparent'}>|</span>
    </p>
  );
}
export default function LandingPage() {
  const intro = '注音對戰！與世界各地玩家一較高下，成為注音大師！';
  const phoneticMap: Record<string, string> = {
    '注': 'ㄓㄨˋ', '音': 'ㄧㄣ', '對': 'ㄉㄨㄟˋ', '戰': 'ㄓㄢˋ', '與': 'ㄩˇ',
    '世': 'ㄕˋ', '界': 'ㄐㄧㄝˋ', '各': 'ㄍㄜˋ', '地': 'ㄉㄧˋ', '玩': 'ㄨㄢˊ',
    '家': 'ㄐㄧㄚ', '一': 'ㄧ', '較': 'ㄐㄧㄠˋ', '高': 'ㄍㄠ', '下': 'ㄒㄧㄚˋ',
    '成': 'ㄔㄥˊ', '為': 'ㄨㄟˊ', '大': 'ㄉㄚˋ', '師': 'ㄕ',
  };

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 1. 檢查是否已經登入，若有則直接跳轉
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      router.replace('/lobby'); 
    } else {
      setIsLoading(false);
    }
  }, [router]);

  // 2. Google 登入處理
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // 使用 access_token 取得使用者資訊
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await userInfoRes.json();

        // 將 Google 使用者資訊送到後端
        const res = await api('/api/users/google-login', {
          method: 'POST',
          body: JSON.stringify({ googleUser }), 
        });

        const data = await res.json();
        if (data.needsCharacterCreation) {
          // 新用戶，導航到角色創造頁面
          localStorage.setItem('pendingEmail', data.email);
          router.replace('/create-character');
        } else if (data.token) {
          // 現有用戶，直接登入
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          router.replace('/lobby');
        } else {
          console.error("Login failed:", data.error);
          alert('登入失敗，請稍後再試');
        }
      } catch (err) {
        console.error("Login Failed:", err);
        alert('登入失敗，請稍後再試');
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      alert('Google 登入失敗');
    },
  });

  // 如果正在檢查登入狀態或已經準備跳轉，顯示深色背景避免畫面閃爍
  if (isLoading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>;
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black text-white tracking-tighter italic">
          注音 <span className="text-indigo-500">對戰</span>
        </h1>
        
        <Typewriter text={intro} phoneticMap={phoneticMap} phoneticDelay={100} charDelay={150} className="text-slate-400 text-lg" />

        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => login()}
            className="flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 shadow-2xl"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="google" />
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    </main>
  );
}
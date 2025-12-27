"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../lib/api";

function BattlePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const ROWS = 8;
  const COLS = 8;

  const [gameState, setGameState] = useState<any>(null);
  const [selectedSequence, setSelectedSequence] = useState<Array<{r: number, c: number, phonetic: string}>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ winnerName: string, isWinner: boolean } | null>(null);

  const [hoveredHex, setHoveredHex] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  // Polling Game State
  useEffect(() => {
    if (!id) return;
    
    const fetchState = async () => {
      try {
        const res = await api(`/api/game/${id}`);
        if (res.ok) {
          const data = await res.json();
          setGameState(data);
          if (data.status === 'finished' && !gameOverState) {
            // Handle game over
            const winnerName = data.winner === data.player1Id ? data.player1Name : data.player2Name;
            const isWinner = (data.winner === data.player1Id && data.player1Id === data.turn) || // Wait, turn might be switched? No, check my ID
                             (data.winner === data.player1Id && data.isMyTurn && false) // isMyTurn is based on turn, which might be irrelevant if game finished
            
            // We need to know my ID to determine if I won.
            // The API returns `isMyTurn` but that's for playing.
            // Let's assume if I can see the board, I am one of the players.
            // But the API doesn't explicitly return "myId".
            // However, `isMyTurn` is true if `turn === req.userId`.
            // So if `isMyTurn` was true when it was my turn...
            // Actually, let's just use the winner name for now.
            // To know if *I* won, I need to know my ID.
            // The API doesn't return my ID directly.
            // But I can infer it? No.
            // Let's just show the winner name.
            // Wait, user wants "Victory" or "Defeat" animation.
            // I need to know if I am the winner.
            // I can decode the token on client side? Or ask API to return `myId`.
            // Or just check `isMyTurn` logic? No.
            // Let's update the API to return `myId` or `amIWinner`.
            // Or I can just rely on the fact that I am logged in.
            // Let's assume for now we just show the winner name.
            // Actually, I can check `data.winner` against `data.player1Id` etc.
            // But I don't know which one is ME.
            // I'll update the API to return `currentUserId` or similar.
            // For now, let's just show the winner name.
            
            // Actually, I can try to guess.
            // If I am player 1, `isMyTurn` is true when turn is player 1.
            // So `myId` = `isMyTurn ? turn : (turn === p1 ? p2 : p1)`.
            // This is reliable if I am a player.
            
            let myId = -1;
            if (data.isMyTurn) {
                myId = data.turn;
            } else {
                // If it's not my turn, I am the other player.
                myId = data.turn === data.player1Id ? data.player2Id : data.player1Id;
            }
            
            const amIWinner = data.winner === myId;
            
            setGameOverState({
                winnerName: winnerName,
                isWinner: amIWinner
            });
          }
        } else {
          console.error('Failed to fetch game state');
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [id, router, gameOverState]);

  const onWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = Math.exp(-e.deltaY * 0.015);
    setScale((prev) => {
      const newScale = clamp(prev * zoomFactor, 0.5, 3);
      setTx((prevTx) => mouseX - (mouseX - prevTx) * (newScale / prev));
      setTy((prevTy) => mouseY - (mouseY - prevTy) * (newScale / prev));
      return newScale;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  function onPointerDown(e: React.PointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
    isPanningRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setTx((t) => t + dx);
    setTy((t) => t + dy);
  }

  function onPointerUp(e: React.PointerEvent) {
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
    isPanningRef.current = false;
  }

  // Center grid
  useEffect(() => {
    if (!containerRef.current) return;
    const gridInner = containerRef.current.querySelector('.hex-map-inner') as HTMLElement | null;
    if (!gridInner) return;

    const performCentering = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const containerHeight = containerRef.current!.offsetHeight;
      const gridWidth = gridInner.offsetWidth;
      const gridHeight = gridInner.offsetHeight;

      if (containerWidth > 0 && containerHeight > 0 && gridWidth > 0 && gridHeight > 0) {
        const centerX = (containerWidth - gridWidth) / 2;
        const centerY = (containerHeight - gridHeight) / 2;
        setTx(centerX);
        setTy(centerY);
      }
    };

    const initTimer = setTimeout(performCentering, 100);
    const ro = new ResizeObserver(performCentering);
    ro.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      ro.disconnect();
    };
  }, []);

  function handleTileClick(r: number, c: number, phonetic: string | null) {
    if (!gameState || !gameState.isMyTurn) return;
    if (!phonetic) return; // Can't select empty/territory tiles without phonetic

    // Check if already selected
    if (selectedSequence.some(s => s.r === r && s.c === c)) return;

    // Adjacency check removed as per new rules

    setSelectedSequence([...selectedSequence, { r, c, phonetic }]);
  }

  function handleBackspace() {
    setSelectedSequence(prev => prev.slice(0, -1));
  }

  function handleClear() {
    setSelectedSequence([]);
  }

  async function handleSubmit() {
    if (selectedSequence.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await api(`/api/game/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ sequence: selectedSequence.map(s => ({ r: s.r, c: s.c })) })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSelectedSequence([]);
        // State will update via polling
      } else {
        setErrorMsg(data.error);
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetMap() {
    setScale(1);
    setTx(0);
    setTy(0);
    setTimeout(() => {
      if (!containerRef.current) return;
      const gridInner = containerRef.current.querySelector('.hex-map-inner') as HTMLElement | null;
      if (!gridInner) return;
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      const gridWidth = gridInner.offsetWidth;
      const gridHeight = gridInner.offsetHeight;
      if (containerWidth > 0 && containerHeight > 0 && gridWidth > 0 && gridHeight > 0) {
        const centerX = (containerWidth - gridWidth) / 2;
        const centerY = (containerHeight - gridHeight) / 2;
        setTx(centerX);
        setTy(centerY);
      }
    }, 50);
  }

  if (!gameState) return <div className="flex items-center justify-center h-screen bg-[#071029] text-white">Loading game...</div>;

  const board = gameState.board;

  return (
    <div className="flex h-screen bg-[#071029] text-slate-200 relative">
      {/* Game Over Overlay */}
      {gameOverState && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="text-center p-12 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-2xl max-w-2xl w-full mx-4 transform transition-all scale-100">
            <div className="mb-6 text-8xl animate-bounce">
              {gameOverState.isWinner ? '🏆' : '💀'}
            </div>
            <h1 className={`text-6xl font-black mb-4 tracking-tight ${
              gameOverState.isWinner 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                : 'text-slate-400'
            }`}>
              {gameOverState.isWinner ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p className="text-2xl text-slate-300 mb-8 font-light">
              Winner: <span className="font-bold text-white">{gameOverState.winnerName}</span>
            </p>
            <button
              onClick={() => router.push('/lobby')}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* 左：蜂巢地圖 */}
      <div className="flex-1 overflow-hidden relative">
        <button
          onClick={resetMap}
          className="absolute top-4 left-4 z-50 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-white text-sm font-medium transition"
        >
          🔄 重置視角
        </button>

        {/* Timer & Turn Info Overlay Removed */}

        {errorMsg && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-xl shadow-xl animate-bounce">
            {errorMsg}
          </div>
        )}

        <div
          className="hex-map h-full overflow-hidden"
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ ['--hex-size' as any]: '72px' } as React.CSSProperties}
        >
          <div
            className="hex-map-inner"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}
          >
            {board.map((row: any[], r: number) => (
              <div
                key={r}
                className="hex-row flex gap-0"
                style={{
                  marginBottom: 'calc(var(--hex-size) * -0.25)',
                  ...(r % 2 === 1 ? { marginLeft: 'calc(var(--hex-size) * 0.53)' } : {}),
                }}
              >
                {row.map((tile: any, c: number) => {
                  const idx = `${r},${c}`;
                  const isHovered = hoveredHex === idx;
                  const isSelected = selectedSequence.some(s => s.r === r && s.c === c);
                  
                  let bg = 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)'; // Default neutral
                  if (tile.state === 'red_castle' || tile.state === 'red_territory') bg = 'linear-gradient(180deg,#fca5a5,#ef4444)';
                  if (tile.state === 'blue_castle' || tile.state === 'blue_territory') bg = 'linear-gradient(180deg,#93c5fd,#3b82f6)';
                  if (isSelected) bg = 'linear-gradient(180deg, #fbbf24, #d97706)'; // Amber for selection

                  return (
                    <div
                      key={idx}
                      role="button"
                      onMouseEnter={() => setHoveredHex(idx)}
                      onMouseLeave={() => setHoveredHex(null)}
                      onClick={() => handleTileClick(r, c, tile.phonetic)}
                      className="hex-tile relative transition-all duration-150 cursor-pointer"
                      style={{
                        width: 'var(--hex-size)',
                        paddingBottom: 'calc(var(--hex-size) * 1.1547)',
                        marginLeft: 'calc(var(--hex-size) * 0.05)',
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        background: bg,
                        boxShadow: isHovered || isSelected
                          ? '0 12px 24px rgba(2,6,23,0.3), inset 0 8px 16px rgba(255,255,255,0.12)'
                          : '0 4px 8px rgba(2,6,23,0.08), inset 0 4px 8px rgba(255,255,255,0.04)',
                        filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
                        zIndex: isSelected ? 10 : 1
                      }}
                    >
                      <div className="absolute inset-0 border border-slate-200/60"></div>

                      {tile.state.includes('castle') ? (
                        <div className="absolute inset-0 flex items-center justify-center z-30 text-3xl">
                          🏰
                        </div>
                      ) : tile.phonetic ? (
                        <div className="absolute inset-0 flex items-center justify-center z-30 text-2xl font-bold text-slate-900">
                          {tile.phonetic}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右：控制面板 */}
      <aside className="w-96 h-screen bg-[#0b1422] border-l border-slate-800 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl text-white">
            {gameState.gameMode === 'ranked' ? '積分對戰' : '一般對戰'}
          </h3>
          <button onClick={() => router.push('/lobby')} className="text-sm text-slate-400 hover:text-white">離開</button>
        </div>

        {/* 玩家狀態 */}
        <div className="space-y-4 mb-8">
          {/* Player 1 (Red) */}
          <div className={`p-4 rounded-xl border transition-all ${gameState.turn === gameState.player1Id ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-red-400">{gameState.player1Name || 'Player 1'}</span>
              <span className={`text-2xl font-mono font-bold ${gameState.timer[gameState.player1Id] < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {gameState.timer[gameState.player1Id]}s
              </span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-1000" 
                style={{ width: `${(gameState.timer[gameState.player1Id] / 120) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Player 2 (Blue) */}
          <div className={`p-4 rounded-xl border transition-all ${gameState.turn === gameState.player2Id ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-400">{gameState.player2Name || 'Player 2'}</span>
              <span className={`text-2xl font-mono font-bold ${gameState.timer[gameState.player2Id] < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {gameState.timer[gameState.player2Id]}s
              </span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${(gameState.timer[gameState.player2Id] / 120) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 操作區 */}
        <div className="flex-1 flex flex-col bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="text-slate-400 text-sm mb-2">當前輸入序列：</div>
          <div className="flex-1 bg-slate-950 rounded-lg p-4 mb-4 flex items-center justify-center text-4xl font-bold tracking-widest text-yellow-400 border border-slate-800 shadow-inner">
            {selectedSequence.map(s => s.phonetic).join('') || <span className="text-slate-700 text-2xl">請點擊地圖選擇注音</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button 
              onClick={handleBackspace}
              disabled={selectedSequence.length === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors"
            >
              ⌫ 退格
            </button>
            <button 
              onClick={handleClear}
              disabled={selectedSequence.length === 0}
              className="bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-200 py-3 rounded-lg font-bold transition-colors border border-red-900"
            >
              🗑️ 清空
            </button>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={!gameState.isMyTurn || selectedSequence.length === 0 || isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-all transform active:scale-95 ${
              gameState.isMyTurn 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '驗證中...' : gameState.isMyTurn ? '確認送出 (Enter)' : '等待對手行動...'}
          </button>
        </div>

        {/* 遊戲日誌 */}
        <div className="mt-4 h-32 overflow-y-auto bg-slate-950 rounded-lg p-3 text-xs space-y-1 font-mono border border-slate-800">
          {gameState.logs.slice().reverse().map((log: string, i: number) => (
            <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-1 last:border-0">
              {log}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#071029] text-white">Loading battle...</div>}>
      <BattlePageContent />
    </Suspense>
  );
}

"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { useNotification } from "../../hooks/useNotification";
import ConfirmModal from "../components/ConfirmModal";

const HexTile = React.memo(({ tile, isHovered, isSelected, onMouseEnter, onMouseLeave, onClick }: {
  tile: { state: string; phonetic?: string };
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) => {
  const [animate, setAnimate] = useState(false);
  const prevTile = useRef(tile);

  useEffect(() => {
    if (prevTile.current.state !== tile.state || prevTile.current.phonetic !== tile.phonetic) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
    prevTile.current = tile;
  }, [tile.state, tile.phonetic]);

  const tileState = tile.state;
  
  let background = 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)';
  if (tileState === 'red_castle' || tileState === 'red_territory') {
    background = 'linear-gradient(180deg,#fca5a5,#ef4444)';
  } else if (tileState === 'blue_castle' || tileState === 'blue_territory') {
    background = 'linear-gradient(180deg,#93c5fd,#3b82f6)';
  }
  if (isSelected) {
    background = 'linear-gradient(180deg, #fbbf24, #d97706)';
  }

  return (
    <div
      role="button"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`hex-tile relative transition-all duration-500 cursor-pointer ${animate ? 'z-10' : (isSelected ? 'z-10' : 'z-0')}`}
      style={{
        width: 'var(--hex-size)',
        paddingBottom: 'calc(var(--hex-size) * 1.1547)',
        marginLeft: 'calc(var(--hex-size) * 0.05)',
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        background: background,
        boxShadow: isHovered || isSelected
          ? '0 12px 24px rgba(2,6,23,0.3), inset 0 8px 16px rgba(255,255,255,0.12)'
          : '0 4px 8px rgba(2,6,23,0.08), inset 0 4px 8px rgba(255,255,255,0.04)',
        filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
        transform: animate ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      <div className="absolute inset-0 border border-slate-200/60"></div>

      {(tileState === 'red_castle' || tileState === 'blue_castle') ? (
        <div className="absolute inset-0 flex items-center justify-center z-30 animate-in zoom-in duration-300">
          <span style={{ fontSize: 30, lineHeight: 1 }}>{'🏰'}</span>
        </div>
      ) : (tileState === 'white_phonetic' && tile.phonetic) ? (
        <div key={tile.phonetic} className="absolute inset-0 flex items-center justify-center z-30 animate-in zoom-in duration-300">
          <div
            style={{
              fontSize: 30,
              color: '#0f172a',
              fontWeight: 700,
            }}
          >
            {tile.phonetic}
          </div>
        </div>
      ) : null}
    </div>
  );
});

function BattlePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { playSound, updateTitle, notificationCount } = useNotification();

  const ROWS = 8;
  const COLS = 8;

  const [gameState, setGameState] = useState<any>(null);
  const prevTurnRef = useRef<number | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<Array<{r: number, c: number, phonetic: string}>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ winnerName: string, isWinner: boolean } | null>(null);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  const [hoveredHex, setHoveredHex] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  async function handleUseSkill() {
    if (!gameState || !gameState.isMyTurn) return;
    try {
      const res = await api(`/api/game/${id}/skill`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error);
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Polling Game State
  useEffect(() => {
    if (!id) return;
    
    const fetchState = async () => {
      try {
        const res = await api(`/api/game/${id}`);
        if (res.ok) {
          const data = await res.json();
          setGameState(data);

          // Turn notification
          if (data.turn !== prevTurnRef.current) {
            if (data.isMyTurn && !document.hasFocus()) {
              playSound();
              updateTitle(notificationCount + 1);
            }
            prevTurnRef.current = data.turn;
          }

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
            
            // Use currentUserId returned from API to determine if I won
            const amIWinner = data.winner === data.currentUserId;
            
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

  async function handleSurrender() {
    setShowSurrenderModal(false);
    try {
      await api(`/api/game/${id}/surrender`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRequestTimeout() {
    try {
      await api(`/api/game/${id}/timeout/request`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRespondTimeout(accept: boolean) {
    try {
      await api(`/api/game/${id}/timeout/respond`, { 
        method: 'POST',
        body: JSON.stringify({ accept })
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRequestResume() {
    try {
      await api(`/api/game/${id}/resume/request`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRespondResume(accept: boolean) {
    try {
      await api(`/api/game/${id}/resume/respond`, { 
        method: 'POST',
        body: JSON.stringify({ accept })
      });
    } catch (e) {
      console.error(e);
    }
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

        {/* Skill UI */}
        {gameState && (
          <div className="absolute bottom-8 left-8 z-50 flex flex-col items-center gap-2">
            <div className="relative group">
              <button
                onClick={handleUseSkill}
                disabled={!gameState.isMyTurn || (gameState.skillInventory?.[gameState.currentUserId] || 0) < 1}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all transform active:scale-95 border-4 ${
                  (gameState.skillInventory?.[gameState.currentUserId] || 0) > 0
                    ? 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white cursor-pointer animate-pulse'
                    : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                }`}
                title="Shuffle Board (Cost: 1 Skill Item)"
              >
                🎲
              </button>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                {gameState.skillInventory?.[gameState.currentUserId] || 0}
              </div>
            </div>
            
            {/* Charge Bar */}
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-yellow-400 transition-all duration-500"
                style={{ width: `${((gameState.skillCharges?.[gameState.currentUserId] || 0) / 3) * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded">
              Charge: {gameState.skillCharges?.[gameState.currentUserId] || 0}/3
            </div>
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
                  
                  return (
                    <HexTile
                      key={idx}
                      tile={tile}
                      isHovered={isHovered}
                      isSelected={isSelected}
                      onMouseEnter={() => setHoveredHex(idx)}
                      onMouseLeave={() => setHoveredHex(null)}
                      onClick={() => handleTileClick(r, c, tile.phonetic)}
                    />
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
            {gameState.gameMode === 'ranked' ? '積分對戰' : (gameState.gameMode === 'ranked_rts' ? '即時戰略 (RTS)' : '一般對戰')}
          </h3>
          <button onClick={() => router.push('/lobby')} className="text-sm text-slate-400 hover:text-white">離開</button>
        </div>

        {/* 玩家狀態 */}
        <div className="space-y-4 mb-8">
          {/* Player 1 (Red) */}
          <div className={`p-4 rounded-xl border transition-all ${gameState.turn === gameState.player1Id ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-red-400">{gameState.player1Name || 'Player 1'}</span>
              {gameState.gameMode !== 'ranked_rts' && (
                <span className={`text-2xl font-mono font-bold ${gameState.timer[gameState.player1Id] < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(gameState.timer[gameState.player1Id])}
                </span>
              )}
            </div>
            {gameState.gameMode !== 'ranked_rts' && (
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-1000" 
                  style={{ width: `${Math.min((gameState.timer[gameState.player1Id] / 7200) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Player 2 (Blue) */}
          <div className={`p-4 rounded-xl border transition-all ${gameState.turn === gameState.player2Id ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-400">{gameState.player2Name || 'Player 2'}</span>
              {gameState.gameMode !== 'ranked_rts' && (
                <span className={`text-2xl font-mono font-bold ${gameState.timer[gameState.player2Id] < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(gameState.timer[gameState.player2Id])}
                </span>
              )}
            </div>
            {gameState.gameMode !== 'ranked_rts' && (
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${Math.min((gameState.timer[gameState.player2Id] / 7200) * 100, 100)}%` }}
                ></div>
              </div>
            )}
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

          <div className="grid grid-cols-2 gap-3 mt-3">
             <button
               onClick={() => setShowSurrenderModal(true)}
               className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-red-900"
             >
               🏳️ 投降
             </button>
             <button
               onClick={handleRequestTimeout}
               disabled={!!gameState.pauseRequest || gameState.status === 'paused'}
               className="bg-slate-800 hover:bg-yellow-900/30 text-slate-400 hover:text-yellow-400 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-yellow-900 disabled:opacity-50"
             >
               ⏸️ 暫停
             </button>
          </div>
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

      {/* Modals & Overlays */}
      <ConfirmModal
        isOpen={showSurrenderModal}
        title="確認投降"
        message="確定要投降嗎？這將視為您輸掉這場比賽。"
        onConfirm={handleSurrender}
        onCancel={() => setShowSurrenderModal(false)}
        confirmText="投降"
        cancelText="取消"
        isDangerous={true}
      />

      {/* Pause Request Modal (Receiver) */}
      {gameState.pauseRequest && gameState.pauseRequest.requesterId !== gameState.currentUserId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-4">對手請求暫停</h3>
            <p className="text-slate-400 mb-6">是否同意暫停遊戲？</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleRespondTimeout(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">拒絕</button>
              <button onClick={() => handleRespondTimeout(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">同意</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Request Pending (Sender) */}
      {gameState.pauseRequest && gameState.pauseRequest.requesterId === gameState.currentUserId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-200">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">等待對手回應...</h3>
            <p className="text-slate-400">已發送暫停請求</p>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {gameState.status === 'paused' && (
        <div className="absolute inset-0 z-[55] bg-slate-900 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <h2 className="text-4xl font-bold text-white mb-4">遊戲暫停中</h2>
          <p className="text-slate-400 mb-8">雙方同意暫停，畫面已遮蔽</p>
          
          {gameState.resumeRequest ? (
             gameState.resumeRequest.requesterId !== gameState.currentUserId ? (
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-white mb-4">對手請求恢復</h3>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => handleRespondResume(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">拒絕</button>
                    <button onClick={() => handleRespondResume(true)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors">同意恢復</button>
                  </div>
                </div>
             ) : (
                <div className="text-yellow-400 animate-pulse font-bold text-xl">等待對手同意恢復...</div>
             )
          ) : (
            <button 
              onClick={handleRequestResume}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95"
            >
              請求恢復遊戲
            </button>
          )}
        </div>
      )}
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

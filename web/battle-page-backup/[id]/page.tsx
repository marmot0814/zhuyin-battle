"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// 標記為動態路由（客戶端渲染）
export const dynamic = 'force-static';
export const dynamicParams = true;

export default function BattlePage({ params }: any) {
  const router = useRouter();
  // `params` may be a Promise in the app router. Unwrap it with React.use()
  const { id } = (React as any).use ? (React as any).use(params) : params;

  const ROWS = 8;
  const COLS = 8;

  const [players, setPlayers] = useState<Array<{ id: number; name: string; timer: number; posIdx?: number; side?: string }>>([]);
  const [board, setBoard] = useState<Array<Array<{ state: string; phonetic?: string }>>>(() =>
    Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ state: 'white_empty' }))
    )
  );

  const [spectators, setSpectators] = useState<Array<{ id: number; name: string }>>([]);
  const [messages, setMessages] = useState<Array<{ from: string; text: string }>>([
    { from: "System", text: `歡迎進入房間 ${id}` },
  ]);
  const [input, setInput] = useState("");
  const [hoveredHex, setHoveredHex] = useState<number | null>(null);
  const [currentTurnId, setCurrentTurnId] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const onWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = Math.exp(-e.deltaY * 0.015);
    setScale((prev) => {
      const newScale = clamp(prev * zoomFactor, 0.5, 3);
      // adjust translate so the point under cursor stays fixed
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

  // center grid after render
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

    // Initial centering with delay to allow layout
    const initTimer = setTimeout(performCentering, 100);

    // Recenter when container resizes
    const ro = new ResizeObserver(performCentering);
    ro.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      ro.disconnect();
    };
  }, []);

  // per-second turn timer (only current player's timer decrements)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) => {
        if (prev.length === 0) return prev;
        const updated = prev.map((p) => {
          if (p.id === currentTurnId) {
            return { ...p, timer: p.timer > 0 ? p.timer - 1 : 0 };
          }
          return p;
        });

        const currentPlayer = updated.find((p) => p.id === currentTurnId);
        if (currentPlayer && currentPlayer.timer === 0) {
          const nextIdx = (prev.findIndex((p) => p.id === currentTurnId) + 1) % prev.length;
          const nextPlayer = prev[nextIdx];
          if (nextPlayer) {
            setCurrentTurnId(nextPlayer.id);
            updated[nextIdx].timer = 45;
          }
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurnId]);

  // initialize two players: red (right-top) and blue (left-bottom)
  useEffect(() => {
    const topRightIdx = 0 * COLS + (COLS - 1);
    const bottomLeftIdx = (ROWS - 1) * COLS + 0;

    setPlayers([
      { id: 1, name: "Red_Player", timer: 45, posIdx: topRightIdx, side: 'red' },
      { id: 2, name: "Blue_Player", timer: 45, posIdx: bottomLeftIdx, side: 'blue' },
    ]);
    setSpectators([]);

    // try fetch board from backend, fallback to mock
    (async () => {
      try {
        const res = await fetch(`/api/board/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tiles) && data.tiles.length === ROWS &&
              data.tiles.every((row: any) => Array.isArray(row) && row.length === COLS)) {
            setBoard(data.tiles);
            return;
          }
        }
      } catch (e) {}
      // fallback mock board: 2D array
      const mock = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({ state: 'white_empty' } as { state: string; phonetic?: string }))
      );
      mock[0][COLS - 1] = { state: 'red_castle' };
      mock[ROWS - 1][0] = { state: 'blue_castle' };
      mock[0][COLS - 2] = { state: 'red_territory' };
      mock[ROWS - 1][1] = { state: 'blue_territory' };
      mock[Math.floor(ROWS / 2)][Math.floor(COLS / 2)] = { state: 'white_phonetic', phonetic: 'ㄓ' };
      setBoard(mock);
    })();
  }, [id, ROWS, COLS]);

  function sendMessage() {
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: "You", text: input }]);
    setInput("");
  }

  function resetMap() {
    setScale(1);
    setTx(0);
    setTy(0);
    // Wait for state update and DOM render, then center
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

  return (
    <div className="flex h-screen bg-[#071029] text-slate-200">
      {/* 左：蜂巢地圖 */}
      <div className="flex-1 overflow-hidden relative">
        <button
          onClick={resetMap}
          className="absolute top-4 left-4 z-50 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-white text-sm font-medium transition"
          title="重置地圖位置和縮放"
        >
          🔄 地圖位置重置
        </button>
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
            {Array.from({ length: ROWS }).map((_, row) => (
              <div
                key={row}
                className="hex-row flex gap-0"
                style={{
                  marginBottom: 'calc(var(--hex-size) * -0.25)',
                  ...(row % 2 === 1 ? { marginLeft: 'calc(var(--hex-size) * 0.53)' } : {}),
                }}
              >
                {Array.from({ length: COLS }).map((__, col) => {
                  const idx = row * COLS + col;
                  const isHovered = hoveredHex === idx;
                  const tile = board[row]?.[col] || { state: 'white_empty' };
                  const tileState = tile.state;
                  return (
                    <div
                      key={idx}
                      role="button"
                      aria-label={`hex-${idx}`}
                      onMouseEnter={() => setHoveredHex(idx)}
                      onMouseLeave={() => setHoveredHex(null)}
                      className="hex-tile relative transition-all duration-150 cursor-pointer"
                      style={{
                        width: 'var(--hex-size)',
                        paddingBottom: 'calc(var(--hex-size) * 1.1547)', // height = size * sqrt(3)
                        marginLeft: 'calc(var(--hex-size) * 0.05)', // overlap for horizontal fit
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        background:
                          tileState === 'red_castle' || tileState === 'red_territory'
                            ? 'linear-gradient(180deg,#fca5a5,#ef4444)'
                            : tileState === 'blue_castle' || tileState === 'blue_territory'
                            ? 'linear-gradient(180deg,#93c5fd,#3b82f6)'
                            : 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)',
                        boxShadow: isHovered
                          ? '0 12px 24px rgba(2,6,23,0.3), inset 0 8px 16px rgba(255,255,255,0.12)'
                          : '0 4px 8px rgba(2,6,23,0.08), inset 0 4px 8px rgba(255,255,255,0.04)',
                        filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
                      }}
                    >
                      <div className="absolute inset-0 border border-slate-200/60"></div>

                      {/* 若為城堡，顯示置中城堡；若為有注音的白色領地則顯示注音 */}
                      {tileState === 'red_castle' || tileState === 'blue_castle' ? (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 30,
                          }}
                        >
                          <span style={{ fontSize: 30, lineHeight: 1 }}>{'🏰'}</span>
                        </div>
                      ) : tileState === 'white_phonetic' && tile.phonetic ? (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 30,
                            fontSize: 30,
                            color: '#0f172a',
                            fontWeight: 700,
                          }}
                        >
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

      {/* 右：對手資訊 + 聊天（固定寬度滿版高度） */}
      <aside className="w-96 h-screen bg-[#0b1422] border-l border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Room {id} — Players</h3>
          <button onClick={() => router.push('/lobby')} className="text-sm text-slate-400 hover:text-white">離開</button>
        </div>

        {/* 玩家列表 */}
        <div className="flex-1 overflow-auto space-y-3 mb-4 min-h-0">
          {players.map((p) => {
            const isTurn = p.id === currentTurnId;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg border transition-all ${
                  isTurn
                    ? 'bg-indigo-900/40 border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'bg-[#0f172a] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isTurn && <span className="text-lg">🎯</span>}
                      <div className="font-bold">{p.name}</div>
                    </div>
                    <div className="text-xs text-slate-400">Rating: 1450</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300">Online</div>
                    <div className={`text-sm font-bold ${isTurn ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {p.timer}s
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 觀戰者列表 */}
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-400 mb-2">觀戰者 ({spectators.length})</h4>
          <div className="max-h-24 overflow-auto space-y-1">
            {spectators.map((s) => (
              <div key={s.id} className="text-xs text-slate-400 px-2 py-1 bg-[#0f172a] rounded truncate">
                👁️ {s.name}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
          <div className="h-40 overflow-auto mb-3 bg-[#071827] p-3 rounded-lg">
            {messages.map((m, i) => (
              <div key={i} className="text-sm mb-2">
                <span className="font-bold text-slate-200">{m.from}:</span>{' '}
                <span className="text-slate-300">{m.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="輸入訊息並按 Enter 傳送"
              className="flex-1 bg-[#071827] px-3 py-2 rounded-lg text-sm outline-none border border-slate-700"
            />
            <button onClick={sendMessage} className="bg-indigo-600 px-3 py-2 rounded-lg text-white">送出</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

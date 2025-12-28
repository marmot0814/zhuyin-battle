import React, { useEffect, useState } from "react";

interface TutorialModalProps {
  show: boolean;
  onClose: () => void;
}

export default function TutorialModal({ show, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (show) {
      setStep(0);
    }
  }, [show]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  if (!show) return null;

  const HexTile = ({ char, color = "slate", animate = false, scale = 1 }: any) => {
    let bg = "linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)";
    if (color === "red") bg = "linear-gradient(180deg,#fca5a5,#ef4444)";
    if (color === "indigo") bg = "linear-gradient(180deg, #818cf8, #4f46e5)";
    
    return (
      <div 
        className={`relative flex items-center justify-center transition-all duration-300 ${animate ? "animate-bounce" : ""}`}
        style={{
          width: "64px",
          height: "74px",
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: bg,
          transform: `scale(${scale})`,
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
        }}
      >
        <div className="absolute inset-0 border border-white/20" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div>
        <span className="text-2xl font-bold text-slate-900 z-10">{char}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎓</span> 遊戲教學
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            &times;
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center">
          {/* Animation Container */}
          <div className="w-full h-72 bg-slate-950 rounded-xl border border-slate-800 mb-6 relative overflow-hidden flex items-center justify-center">
            
            {/* Step 0: Connect Tiles */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${step === 0 ? "opacity-100 translate-x-0" : step > 0 ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"}`}>
              <div className="flex items-center justify-center gap-1 mb-6">
                <div className="mt-8"><HexTile char="ㄌ" animate /></div>
                <div className="mb-8"><HexTile char="ㄧ" animate /></div>
                <div className="mt-8"><HexTile char="ㄓ" animate /></div>
              </div>
              <p className="text-xl font-bold text-indigo-400 mb-2">1. 連接相鄰符號</p>
              <p className="text-slate-400 text-sm">在地圖上滑動或點擊，連接相鄰的注音符號</p>
            </div>

            {/* Step 1: Form Words */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${step === 1 ? "opacity-100 translate-x-0" : step > 1 ? "opacity-0 -translate-x-full" : step < 1 ? "opacity-0 translate-x-full" : ""}`}>
              <div className="flex items-center justify-center gap-1 mb-6">
                <div className="mt-8"><HexTile char="ㄌ" color="indigo" scale={1.1} /></div>
                <div className="mb-8"><HexTile char="ㄧ" color="indigo" scale={1.1} /></div>
                <div className="mt-8"><HexTile char="ㄓ" color="indigo" scale={1.1} /></div>
              </div>
              <p className="text-xl font-bold text-green-400 mb-2">2. 組成有效詞彙</p>
              <div className="text-slate-400 text-sm text-center max-w-md px-4">
                <p className="mb-1">必須組成字典中存在的注音組合（如：ㄌㄧㄓ 荔枝）</p>
                <p className="text-xs text-slate-500">
                  也可以是成語，詞彙來源參考 <a href="https://www.moedict.tw/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">萌典 (Moedict)</a>
                </p>
              </div>
            </div>

            {/* Step 2: Capture Territory */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${step === 2 ? "opacity-100 translate-x-0" : step > 2 ? "opacity-0 -translate-x-full" : step < 2 ? "opacity-0 translate-x-full" : ""}`}>
              <div className="flex items-center justify-center gap-1 mb-6">
                <div className="mt-8"><HexTile char="" color="red" /></div>
                <div className="mb-8"><HexTile char="" color="red" /></div>
                <div className="mt-8"><HexTile char="" color="red" /></div>
              </div>
              <p className="text-xl font-bold text-red-400 mb-2">3. 佔領地盤</p>
              <p className="text-slate-400 text-sm">成功組詞後，該區域將變為你的領地。連接到對方城堡即可獲勝！</p>
            </div>

            {/* Step 3: Use Skills */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${step === 3 ? "opacity-100 translate-x-0" : step < 3 ? "opacity-0 translate-x-full" : ""}`}>
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(147,51,234,0.5)] animate-bounce">
                  🎲
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full border-2 border-slate-900">
                  Skill Ready!
                </div>
              </div>
              <p className="text-xl font-bold text-purple-400 mb-2">4. 使用技能</p>
              <p className="text-slate-400 text-sm">每回合累積能量，集滿 3 點可獲得技能道具，改變戰局！</p>
            </div>

          </div>

          {/* Progress Indicators */}
          <div className="flex gap-2 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${step === i ? "bg-indigo-500 scale-125" : "bg-slate-700"}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 w-full">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="flex-1 py-3 rounded-xl font-bold transition-all bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
            >
              上一步
            </button>
            
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/25"
              >
                開始戰鬥！
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useOS } from '@/lib/os/store';

export function BootScreen() {
  const setPhase = useOS((s) => s.setPhase);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const dur = 2000;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setPhase('lock'), 300);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setPhase]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="text-7xl animate-pulse">🖥️</div>
        <div className="text-2xl font-light tracking-widest">WebOS</div>
        <div className="w-48 h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white transition-[width] duration-100"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="text-xs text-white/40">正在启动…</div>
      </div>
    </div>
  );
}

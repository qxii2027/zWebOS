'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, RotateCw, ChevronRight, User } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { getWallpaperCss } from '@/lib/os/defaultApps';

export function LockScreen() {
  const unlock = useOS((s) => s.unlock);
  const shutdown = useOS((s) => s.shutdown);
  const restart = useOS((s) => s.restart);
  const username = useOS((s) => s.settings.username);
  const wallpaper = useOS((s) => s.settings.wallpaper);
  const [now, setNow] = useState(new Date());
  const [stage, setStage] = useState<'clock' | 'login'>('clock');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // any key / click advances from clock to login (macOS behavior)
  const advance = () => {
    if (stage === 'clock') setStage('login');
  };

  const handleUnlock = () => {
    setUnlocking(true);
    setTimeout(() => unlock(), 500);
  };

  const dateStr = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-between text-white overflow-hidden ${
        unlocking ? '' : ''
      }`}
      style={{ background: getWallpaperCss(wallpaper) }}
      onClick={advance}
      onKeyDown={advance}
      tabIndex={0}
      animate={{ filter: unlocking ? 'blur(8px)' : 'blur(0px)', opacity: unlocking ? 0 : 1 }}
      transition={{ duration: 0.45 }}
    >
      {/* blurred wallpaper overlay */}
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute inset-0 backdrop-blur-2xl transition-all duration-700"
        style={{ opacity: stage === 'login' ? 1 : 0 }}
      />

      {/* Clock view (top) */}
      <AnimatePresence mode="wait">
        {stage === 'clock' && (
          <motion.div
            key="clock"
            className="relative flex flex-col items-center pt-[14vh] sm:pt-[18vh]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-[20vw] sm:text-[120px] font-semibold tabular-nums leading-none drop-shadow-2xl tracking-tight">
              {timeStr}
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-light opacity-95 drop-shadow-lg">
              {dateStr}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login view (center) */}
      <AnimatePresence mode="wait">
        {stage === 'login' && (
          <motion.div
            key="login"
            className="relative flex flex-col items-center justify-center gap-4 my-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Avatar */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl flex items-center justify-center border border-white/40 shadow-2xl"
            >
              <User className="w-14 h-14 text-white/90" strokeWidth={1.5} />
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-medium drop-shadow-lg"
            >
              {username}
            </motion.div>

            {/* Unlock pill */}
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                handleUnlock();
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group flex items-center gap-2 pl-5 pr-2 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/30 shadow-lg transition-colors"
            >
              <span className="text-sm font-medium">点击进入</span>
              <span className="w-7 h-7 rounded-full bg-white/30 group-hover:bg-white/50 flex items-center justify-center transition">
                <ChevronRight className="w-4 h-4" />
              </span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mt-6"
            >
              <PowerButton title="关机" onClick={(e) => { e.stopPropagation(); shutdown(); }}>
                <Power className="w-4 h-4" />
              </PowerButton>
              <PowerButton title="重启" onClick={(e) => { e.stopPropagation(); restart(); }}>
                <RotateCw className="w-4 h-4" />
              </PowerButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint (clock stage) */}
      {stage === 'clock' && (
        <motion.div
          className="relative pb-[8vh] text-sm text-white/70 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          点击任意位置或按键以解锁
        </motion.div>
      )}

      {/* Top-right status (macOS style) */}
      <div className="absolute top-3 right-4 flex items-center gap-3 text-xs text-white/80 z-10">
        <span className="tabular-nums">{timeStr}</span>
      </div>
    </motion.div>
  );
}

function PowerButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center transition"
    >
      {children}
    </button>
  );
}

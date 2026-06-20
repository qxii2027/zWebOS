'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/os/store';
import { AppIcon, WebappIcon } from './AppIcon';

// Shows a temporary switcher overlay while Alt is held after an Alt+Tab cycle.
export function WindowSwitcher() {
  const windows = useOS((s) => s.windows);
  const apps = useOS((s) => s.apps);
  const activeWindowId = useOS((s) => s.activeWindowId);

  const [visible, setVisible] = useState(false);
  const [showTimer, setShowTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Show the switcher briefly whenever the active window changes due to Alt+Tab.
  // We detect Alt being pressed via a global keydown listener here.
  useEffect(() => {
    let altHeld = false;
    let lastActive = activeWindowId;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        altHeld = true;
        setVisible(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        altHeld = false;
        // hide shortly after releasing Alt
        const t = setTimeout(() => setVisible(false), 120);
        setShowTimer(t);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (showTimer) clearTimeout(showTimer);
      void lastActive;
    };
  }, [activeWindowId]);

  const visibleWins = windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)
    .slice(0, 8);

  return (
    <AnimatePresence>
      {visible && visibleWins.length > 0 && (
        <motion.div
          className="fixed inset-0 z-[9700] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div
            className="flex items-center gap-2 p-3 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            {visibleWins.map((w) => {
              const app = apps.find((a) => a.id === w.appId);
              if (!app) return null;
              const isActive = w.id === activeWindowId;
              return (
                <div
                  key={w.id}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl w-20 transition ${
                    isActive ? 'bg-accent ring-2 ring-primary' : ''
                  }`}
                >
                  {app.url ? (
                    <WebappIcon url={app.url} name={app.name} size={36} />
                  ) : (
                    <AppIcon icon={app.icon} color={app.color} size={36} />
                  )}
                  <span className="text-[11px] truncate w-full text-center">{w.title}</span>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

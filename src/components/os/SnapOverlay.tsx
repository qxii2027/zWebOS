'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/os/store';

export function SnapOverlay() {
  const snapPreview = useOS((s) => s.snapPreview);

  const rect: React.CSSProperties | null = (() => {
    if (!snapPreview) return null;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const top = 28; // menu bar
    const bottom = 90; // dock
    if (snapPreview === 'max') {
      return { left: 8, top: top + 4, width: vw - 16, height: vh - top - bottom - 12 };
    }
    if (snapPreview === 'left') {
      return { left: 8, top: top + 4, width: vw / 2 - 12, height: vh - top - bottom - 12 };
    }
    // right
    return { left: vw / 2 + 4, top: top + 4, width: vw / 2 - 12, height: vh - top - bottom - 12 };
  })();

  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          className="fixed z-[8500] rounded-xl border-2 border-white/60 bg-white/15 backdrop-blur-[1px] pointer-events-none"
          style={rect}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </AnimatePresence>
  );
}

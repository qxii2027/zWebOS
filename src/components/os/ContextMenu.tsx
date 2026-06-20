'use client';

import { useEffect, useRef } from 'react';
import { useOS } from '@/lib/os/store';

export function ContextMenu() {
  const cm = useOS((s) => s.contextMenu);
  const setContextMenu = useOS((s) => s.setContextMenu);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cm?.open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [cm, setContextMenu]);

  if (!cm?.open) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = Math.min(cm.x, vw - 220);
  const y = Math.min(cm.y, vh - (cm.items.length * 34 + 16));

  return (
    <div
      ref={ref}
      className="fixed z-[9500] min-w-[180px] py-1 rounded-lg bg-popover/95 backdrop-blur-xl border border-border shadow-2xl text-popover-foreground win-pop"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {cm.items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-px my-1 bg-border" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              setContextMenu(null);
              item.onClick?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent transition"
          >
            <span className="w-4 text-center text-xs">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

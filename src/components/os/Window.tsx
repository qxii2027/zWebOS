'use client';

import { Minus, Square, X, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOS } from '@/lib/os/store';
import type { WindowInstance, AppDef } from '@/lib/os/types';
import { useWindowDrag, useWindowResize } from './useWindowDrag';
import { AppRenderer } from './AppRenderer';
import { AppIcon, WebappIcon } from './AppIcon';

const RESIZE_HANDLES = [
  { dir: 'n', cls: 'top-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { dir: 's', cls: 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { dir: 'e', cls: 'right-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { dir: 'w', cls: 'left-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { dir: 'ne', cls: 'top-0 right-0 w-3 h-3 cursor-nesw-resize' },
  { dir: 'nw', cls: 'top-0 left-0 w-3 h-3 cursor-nwse-resize' },
  { dir: 'se', cls: 'bottom-0 right-0 w-3 h-3 cursor-nwse-resize' },
  { dir: 'sw', cls: 'bottom-0 left-0 w-3 h-3 cursor-nesw-resize' },
];

export function Window({ win, app }: { win: WindowInstance; app: AppDef }) {
  const focusWindow = useOS((s) => s.focusWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const activeWindowId = useOS((s) => s.activeWindowId);
  const reduceMotion = useOS((s) => s.settings.reduceMotion);

  const minSize = app.minSize || { width: 320, height: 240 };
  const { onPointerDown, onPointerMove, onPointerUp, onDouble } = useWindowDrag(win);
  const { startResize, onMove, onUp } = useWindowResize(win, minSize);

  const isActive = activeWindowId === win.id;

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: 28, // below menu bar
        width: '100vw',
        height: 'calc(100vh - 120px)', // above dock
        zIndex: win.zIndex,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  const motionTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.7 };

  return (
    <motion.div
      className={`absolute flex flex-col overflow-hidden bg-card text-card-foreground shadow-2xl border ${
        isActive ? 'border-border ring-1 ring-black/5 dark:ring-white/10' : 'border-border/60'
      } ${win.maximized ? 'rounded-none' : 'rounded-xl'} ${win.minimized ? 'pointer-events-none' : ''}`}
      style={style}
      layout={false}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={
        win.minimized
          ? { opacity: 0, scale: 0.85, y: 240, pointerEvents: 'none' as const }
          : { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' as const }
      }
      exit={{ opacity: 0, scale: 0.94, transition: { duration: reduceMotion ? 0 : 0.15 } }}
      transition={motionTransition}
      onPointerDown={() => focusWindow(win.id)}
      aria-hidden={win.minimized}
    >
      {/* Title bar */}
      <div
        className={`flex items-center gap-2 h-9 px-2 shrink-0 select-none ${
          isActive ? 'bg-muted/60' : 'bg-muted/30'
        } ${win.maximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDouble}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-1.5 px-1" data-no-drag>
          <button
            aria-label="关闭"
            onClick={() => closeWindow(win.id)}
            className="group relative w-3.5 h-3.5 rounded-full bg-red-500 hover:brightness-110 flex items-center justify-center transition"
          >
            <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button
            aria-label="最小化"
            onClick={() => minimizeWindow(win.id)}
            className="group relative w-3.5 h-3.5 rounded-full bg-yellow-500 hover:brightness-110 flex items-center justify-center transition"
          >
            <Minus className="w-2 h-2 text-yellow-900 opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button
            aria-label="最大化"
            onClick={() => toggleMaximize(win.id)}
            className="group relative w-3.5 h-3.5 rounded-full bg-green-500 hover:brightness-110 flex items-center justify-center transition"
          >
            {win.maximized ? (
              <Copy className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" strokeWidth={3} />
            ) : (
              <Square className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" strokeWidth={3} />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
          {app.url ? (
            <WebappIcon url={app.url} name={app.name} size={18} rounded="rounded-md" />
          ) : (
            <AppIcon icon={app.icon} color={app.color} size={18} rounded="rounded-md" />
          )}
          <span className="text-xs font-medium truncate">{win.title}</span>
        </div>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background relative">
        <AppRenderer win={win} app={app} />
      </div>

      {/* Resize handles (hidden when maximized) */}
      {!win.maximized &&
        RESIZE_HANDLES.map((h) => (
          <div
            key={h.dir}
            className={`absolute z-50 ${h.cls}`}
            onPointerDown={startResize(h.dir)}
            onPointerMove={onMove}
            onPointerUp={onUp}
          />
        ))}
    </motion.div>
  );
}

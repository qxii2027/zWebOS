'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Trash2, Folder } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import type { ContextMenuItem } from '@/lib/os/store';
import { AppIcon, WebappIcon } from './AppIcon';

const DOCK_W = 56; // base icon size
const MAG = 30; // max magnification in px
const RANGE = 130; // pixels of influence from mouse

export function Dock() {
  const apps = useOS((s) => s.apps);
  const windows = useOS((s) => s.windows);
  const activeWindowId = useOS((s) => s.activeWindowId);
  const openApp = useOS((s) => s.openApp);
  const focusWindow = useOS((s) => s.focusWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const setContextMenu = useOS((s) => s.setContextMenu);
  const trashCount = useOS((s) => s.trash.length);

  // pinned dock apps (like macOS Finder, Launchpad, etc.)
  const pinnedIds = ['filemanager', 'browser', 'appstore', 'settings', 'texteditor', 'fileviewer', 'terminal', 'calculator', 'clock', 'paint', 'musicplayer', 'imageviewer', 'about'];
  const pinned = pinnedIds.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as typeof apps;
  // plus any running apps not in pinned
  const runningExtra = apps.filter(
    (a) => !pinnedIds.includes(a.id) && windows.some((w) => w.appId === a.id),
  );
  const dockApps = [...pinned, ...runningExtra];

  const mouseX = useMotionValue(Infinity);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleClick = (appId: string) => {
    const wins = windows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      openApp(appId);
      return;
    }
    const activeWin = wins.find((w) => w.id === activeWindowId);
    if (activeWin && !activeWin.minimized) {
      minimizeWindow(activeWin.id);
    } else {
      focusWindow(wins.sort((a, b) => b.zIndex - a.zIndex)[0].id);
    }
  };

  const onContext = (e: React.MouseEvent, appId: string) => {
    e.preventDefault();
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    const ws = windows.filter((w) => w.appId === appId);
    const items: ContextMenuItem[] = [
      { label: `打开 ${app.name}`, icon: '➕', onClick: () => openApp(appId) },
    ];
    if (ws.length > 0) items.push({ separator: true });
    ws.forEach((w) =>
      items.push({
        label: w.title + (w.minimized ? ' (最小化)' : w.id === activeWindowId ? ' (活动)' : ''),
        icon: '▢',
        onClick: () => focusWindow(w.id),
      }),
    );
    if (ws.length > 1) {
      items.push({ separator: true });
      items.push({ label: '关闭所有窗口', icon: '✕', onClick: () => ws.forEach((w) => closeWindow(w.id)) });
    }
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, items });
  };

  return (
    <div className="absolute bottom-1.5 inset-x-0 z-[9000] flex justify-center pointer-events-none select-none">
      <motion.div
        className="flex items-end gap-1.5 px-2.5 py-1.5 rounded-[22px] bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-2xl pointer-events-auto"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => { mouseX.set(Infinity); setHovered(null); }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
      >
        {dockApps.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            mouseX={mouseX}
            isRunning={windows.some((w) => w.appId === app.id)}
            isActive={windows.some((w) => w.appId === app.id && w.id === activeWindowId && !w.minimized)}
            hovered={hovered === app.id}
            onHover={(h) => setHovered(h ? app.id : null)}
            onClick={() => handleClick(app.id)}
            onContext={(e) => onContext(e, app.id)}
          />
        ))}

        {/* Divider */}
        <div className="w-px h-10 bg-white/25 dark:bg-white/15 mx-1 self-center" />

        {/* Recycle bin */}
        <DockTrash
          mouseX={mouseX}
          count={trashCount}
          onClick={() => openApp('filemanager', { view: 'trash' })}
        />
      </motion.div>
    </div>
  );
}

function DockIcon({
  app,
  mouseX,
  isRunning,
  isActive,
  hovered,
  onHover,
  onClick,
  onContext,
}: {
  app: ReturnType<typeof useOS.getState>['apps'][number];
  mouseX: ReturnType<typeof useMotionValue<number>>;
  isRunning: boolean;
  isActive: boolean;
  hovered: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [center, setCenter] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setCenter(el.getBoundingClientRect().left + el.offsetWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // distance from mouse to icon center
  const distance = useTransform(mouseX, (mx) => (center === null ? Infinity : Math.abs(mx - center)));
  // size: base + magnification * falloff
  const sizeRaw = useTransform(distance, [0, RANGE], [MAG, 0]);
  const size = useSpring(sizeRaw, { stiffness: 280, damping: 22, mass: 0.5 });
  const motionSize = useTransform(size, (s) => DOCK_W + s);

  return (
    <div className="relative flex flex-col items-center justify-end">
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 px-2.5 py-1 rounded-lg bg-popover text-popover-foreground text-xs whitespace-nowrap shadow-lg border border-border pointer-events-none"
          >
            {app.name}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={ref}
        onClick={onClick}
        onContextMenu={onContext}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        style={{ width: motionSize, height: motionSize }}
        whileTap={{ scale: 0.85 }}
        className="relative flex items-center justify-center rounded-[22%] origin-bottom shrink-0"
        title={app.name}
      >
        {app.url ? (
          <WebappIcon url={app.url} name={app.name} size={48} />
        ) : (
          <AppIcon icon={app.icon} color={app.color} size={48} />
        )}
      </motion.button>

      {/* Running indicator dot */}
      <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/80 dark:bg-white/70 transition-opacity" style={{ opacity: isRunning ? 1 : 0 }} />
      {isActive && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}

function DockTrash({
  mouseX,
  count,
  onClick,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>;
  count: number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [center, setCenter] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setCenter(el.getBoundingClientRect().left + el.offsetWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const distance = useTransform(mouseX, (mx) => (center === null ? Infinity : Math.abs(mx - center)));
  const sizeRaw = useTransform(distance, [0, RANGE], [MAG, 0]);
  const size = useSpring(sizeRaw, { stiffness: 280, damping: 22, mass: 0.5 });
  const motionSize = useTransform(size, (s) => DOCK_W + s);

  return (
    <div className="relative flex flex-col items-center justify-end">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 px-2.5 py-1 rounded-lg bg-popover text-popover-foreground text-xs whitespace-nowrap shadow-lg border border-border pointer-events-none"
          >
            回收站
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: motionSize, height: motionSize }}
        whileTap={{ scale: 0.85 }}
        className="relative flex items-center justify-center rounded-[22%] origin-bottom shrink-0"
        title="回收站"
      >
        <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-sm ring-1 ring-black/5 text-white">
          <Trash2 className="w-6 h-6" />
        </span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white/30">
            {count}
          </span>
        )}
      </motion.button>
      <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-transparent" />
    </div>
  );
}

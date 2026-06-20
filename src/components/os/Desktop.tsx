'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { getWallpaperCss, WALLPAPERS } from '@/lib/os/defaultApps';
import type { ContextMenuItem } from '@/lib/os/store';
import { AppIcon } from './AppIcon';

export function Desktop({ children }: { children?: React.ReactNode }) {
  const apps = useOS((s) => s.apps);
  const openApp = useOS((s) => s.openApp);
  const wallpaper = useOS((s) => s.settings.wallpaper);
  const updateSettings = useOS((s) => s.updateSettings);
  const setContextMenu = useOS((s) => s.setContextMenu);
  const notify = useOS((s) => s.notify);
  const lock = useOS((s) => s.lock);
  const trashCount = useOS((s) => s.trash.length);
  const reduceMotion = useOS((s) => s.settings.reduceMotion);

  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 20);
    return () => clearInterval(t);
  }, []);

  const desktopApps = apps.filter(
    (a) =>
      ['browser', 'filemanager', 'appstore', 'settings', 'terminal', 'texteditor'].includes(a.id) ||
      !a.builtin,
  );

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const items: ContextMenuItem[] = [
      { label: '更换壁纸', icon: '🖼', onClick: () => openApp('settings') },
      { separator: true },
      {
        label: '下一张壁纸',
        icon: '🎨',
        onClick: () => {
          const idx = WALLPAPERS.findIndex((w) => w.id === wallpaper);
          const next = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
          updateSettings({ wallpaper: next.id });
          notify({ title: '壁纸已更换', body: next.name, icon: '🎨' });
        },
      },
      { separator: true },
      { label: 'Spotlight 搜索', icon: '🔍', onClick: () => useOS.getState().toggleCommandPalette(true) },
      { label: '打开终端', icon: '⌘', onClick: () => openApp('terminal') },
      { label: '显示设置', icon: '⚙', onClick: () => openApp('settings') },
      { separator: true },
      { label: '锁屏', icon: '🔒', onClick: () => lock() },
    ];
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, items });
  };

  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: getWallpaperCss(wallpaper) }}
      onContextMenu={handleContext}
      onPointerDown={() => setSelected(null)}
    >
      {/* Desktop clock widget (moved below menu bar) */}
      <div className="absolute top-9 right-8 hidden sm:flex flex-col items-end text-white drop-shadow-lg pointer-events-none">
        <div className="text-5xl font-thin tabular-nums leading-none">{timeStr}</div>
        <div className="text-sm font-light mt-1 opacity-90">{dateStr}</div>
      </div>

      {/* Desktop icons */}
      <div className="absolute top-10 left-3 grid grid-flow-col grid-rows-[repeat(auto-fill,96px)] gap-1 max-h-[calc(100%-140px)]">
        {desktopApps.map((app, i) => (
          <motion.button
            key={app.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.04 * i, duration: 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(app.id);
            }}
            onDoubleClick={() => openApp(app.id)}
            className={`group flex flex-col items-center gap-1 w-20 p-2 rounded-lg transition ${
              selected === app.id ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <span className="transition-transform group-hover:-translate-y-0.5 group-active:scale-95">
              <AppIcon icon={app.icon} color={app.color} size={48} />
            </span>
            <span className="text-xs text-white font-medium drop-shadow text-center leading-tight line-clamp-2">
              {app.name}
            </span>
          </motion.button>
        ))}
        {/* Recycle bin */}
        <motion.button
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.04 * desktopApps.length, duration: 0.25 }}
          onClick={(e) => {
            e.stopPropagation();
            setSelected('__trash');
          }}
          onDoubleClick={() => openApp('filemanager', { view: 'trash' })}
          className={`group flex flex-col items-center gap-1 w-20 p-2 rounded-lg transition ${
            selected === '__trash' ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          <span className="relative transition-transform group-hover:-translate-y-0.5 group-active:scale-95">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg ring-1 ring-black/5 text-white">
              <Trash2 className="w-6 h-6" />
            </span>
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-black/20">
                {trashCount}
              </span>
            )}
          </span>
          <span className="text-xs text-white font-medium drop-shadow text-center leading-tight line-clamp-2">
            回收站
          </span>
        </motion.button>
      </div>

      {children}
    </div>
  );
}

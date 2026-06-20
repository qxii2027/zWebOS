'use client';

import { useEffect, useState } from 'react';
import { Wifi, Volume2, Bell, Search } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import type { ContextMenuItem } from '@/lib/os/store';
import { AppIcon } from './AppIcon';

export function Taskbar() {
  const apps = useOS((s) => s.apps);
  const windows = useOS((s) => s.windows);
  const activeWindowId = useOS((s) => s.activeWindowId);
  const openApp = useOS((s) => s.openApp);
  const focusWindow = useOS((s) => s.focusWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const setContextMenu = useOS((s) => s.setContextMenu);
  const toggleStartMenu = useOS((s) => s.toggleStartMenu);
  const startMenuOpen = useOS((s) => s.startMenuOpen);
  const toggleNotifCenter = useOS((s) => s.toggleNotifCenter);
  const notifications = useOS((s) => s.notifications);
  const volume = useOS((s) => s.settings.volume);
  const lock = useOS((s) => s.lock);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  // pinned + running
  const pinnedIds = ['browser', 'filemanager', 'appstore', 'terminal', 'texteditor'];
  const pinned = apps.filter((a) => pinnedIds.includes(a.id));
  const taskbarApps = [
    ...pinned,
    ...apps.filter(
      (a) => !pinnedIds.includes(a.id) && windows.some((w) => w.appId === a.id),
    ),
  ];

  const handleClick = (appId: string) => {
    const wins = windows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      openApp(appId);
      return;
    }
    // if active window is this app -> minimize; else focus
    const activeWin = wins.find((w) => w.id === activeWindowId);
    if (activeWin && !activeWin.minimized) {
      minimizeWindow(activeWin.id);
    } else {
      focusWindow(wins.sort((a, b) => b.zIndex - a.zIndex)[0].id);
    }
  };

  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

  return (
    <div className="absolute bottom-0 inset-x-0 h-14 z-[9000] flex items-center px-2 gap-1 bg-black/40 backdrop-blur-xl border-t border-white/10 text-white">
      {/* Start button */}
      <button
        onClick={() => toggleStartMenu()}
        className={`flex items-center justify-center w-11 h-11 rounded-lg transition ${
          startMenuOpen ? 'bg-white/25' : 'hover:bg-white/15'
        }`}
        title="开始菜单"
        aria-label="开始菜单"
      >
        <span className="text-2xl">⊞</span>
      </button>

      <div className="w-px h-7 bg-white/15 mx-1" />

      {/* App buttons */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
        {taskbarApps.map((app) => {
          const wins = windows.filter((w) => w.appId === app.id);
          const active = wins.some((w) => w.id === activeWindowId && !w.minimized);
          const has = wins.length > 0;
          return (
            <button
              key={app.id}
              onClick={() => handleClick(app.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                const ws = windows.filter((w) => w.appId === app.id);
                const items: ContextMenuItem[] = [
                  { label: `打开 ${app.name}`, icon: '➕', onClick: () => openApp(app.id) },
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
              }}
              title={app.name}
              className={`relative flex items-center justify-center w-11 h-11 rounded-lg transition group ${
                active ? 'bg-white/25' : has ? 'hover:bg-white/15' : 'hover:bg-white/15'
              }`}
            >
              <span className="transition-transform group-active:scale-90">
                <AppIcon icon={app.icon} color={app.color} size={26} rounded="rounded-lg" />
              </span>
              {has && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 rounded-full bg-white transition-all ${
                    active ? 'w-5' : 'w-1.5'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => openApp('settings')}
          className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/15"
          title="音量"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        <button
          className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/15"
          title="网络"
        >
          <Wifi className="w-4 h-4" />
        </button>
        <button
          onClick={() => toggleNotifCenter()}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/15"
          title="通知"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => toggleNotifCenter()}
          className="flex flex-col items-end px-2 h-10 rounded-lg hover:bg-white/15 leading-tight"
          title="日期和时间"
        >
          <span className="text-xs font-medium tabular-nums">{timeStr}</span>
          <span className="text-[10px] opacity-80">{dateStr}</span>
        </button>
      </div>
    </div>
  );
}

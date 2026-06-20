'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, X, Search, Wifi, BatteryFull, Signal } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { getWallpaperCss } from '@/lib/os/defaultApps';
import { AppRenderer } from './AppRenderer';
import { AppIcon, WebappIcon } from './AppIcon';

export function MobileShell() {
  const apps = useOS((s) => s.apps);
  const windows = useOS((s) => s.windows);
  const activeWindowId = useOS((s) => s.activeWindowId);
  const openApp = useOS((s) => s.openApp);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const focusWindow = useOS((s) => s.focusWindow);
  const wallpaper = useOS((s) => s.settings.wallpaper);

  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  const activeWin = windows.find((w) => w.id === activeWindowId && !w.minimized);
  const activeApp = activeWin ? apps.find((a) => a.id === activeWin.appId) : null;

  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const goHome = () => {
    // minimize all -> show home
    windows.forEach((w) => {
      if (!w.minimized) minimizeWindow(w.id);
    });
  };

  // HOME SCREEN
  if (!activeWin || !activeApp) {
    const filtered = apps.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <div
        className="absolute inset-0 flex flex-col text-white overflow-hidden"
        style={{ background: getWallpaperCss(wallpaper) }}
      >
        {/* Status bar */}
        <MobileStatusBar time={timeStr} dark />

        {/* Clock widget */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="text-6xl font-thin tabular-nums drop-shadow-lg">{timeStr}</div>
          <div className="text-sm font-light opacity-90 mt-1 drop-shadow">
            {now.toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-3">
          <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
            <Search className="w-4 h-4 opacity-80" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索应用"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/70"
            />
          </div>
        </div>

        {/* App grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-10">
          <div className="grid grid-cols-4 gap-x-4 gap-y-5">
            {filtered.map((app) => (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <AppIcon icon={app.icon} color={app.color} size={56} />
                <span className="text-xs font-medium drop-shadow text-center line-clamp-1 w-full">
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dock */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-center gap-3 p-2.5 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/20">
            {['browser', 'appstore', 'settings', 'filemanager'].map((id) => {
              const app = apps.find((a) => a.id === id);
              if (!app) return null;
              return (
                <button
                  key={id}
                  onClick={() => openApp(id)}
                  className="active:scale-90 transition"
                >
                    {app.url ? (
                      <WebappIcon url={app.url} name={app.name} size={48} />
                    ) : (
                      <AppIcon icon={app.icon} color={app.color} size={48} />
                    )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1.5 rounded-full bg-white/60" />
        </div>
      </div>
    );
  }

  // APP FULLSCREEN
  return (
    <div className="absolute inset-0 flex flex-col bg-background overflow-hidden">
      {/* Status bar */}
      <MobileStatusBar time={timeStr} />

      {/* App top bar */}
      <div className="flex items-center gap-2 h-11 px-2 bg-muted/60 border-b border-border shrink-0">
        <button
          onClick={goHome}
          className="flex items-center gap-0.5 px-2 h-8 rounded-lg hover:bg-accent text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {activeApp.url ? (
          <WebappIcon url={activeApp.url} name={activeApp.name} size={22} rounded="rounded-md" />
        ) : (
          <AppIcon icon={activeApp.icon} color={activeApp.color} size={22} rounded="rounded-md" />
        )}
        <span className="text-sm font-medium truncate flex-1">{activeWin.title}</span>
        <button
          onClick={() => closeWindow(activeWin.id)}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AppRenderer win={activeWin} app={activeApp} />
      </div>

      {/* Home indicator */}
      <div className="flex justify-center py-1.5 bg-background shrink-0">
        <button
          onClick={goHome}
          className="w-32 h-1.5 rounded-full bg-foreground/40 hover:bg-foreground/60 transition"
          aria-label="返回主屏幕"
        />
      </div>
    </div>
  );
}

function MobileStatusBar({ time, dark }: { time: string; dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-5 h-7 text-xs font-medium shrink-0 ${
        dark ? 'text-white' : 'text-foreground'
      }`}
    >
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <BatteryFull className="w-4 h-4" />
      </div>
    </div>
  );
}

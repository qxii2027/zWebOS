'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  BatteryFull,
  Search,
  Volume2,
  Bell,
  Sun,
  Moon,
  Power,
  RotateCw,
  Lock,
  Settings as SettingsIcon,
  Command as CommandIcon,
} from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { AppIcon } from './AppIcon';

export function MenuBar() {
  const apps = useOS((s) => s.apps);
  const windows = useOS((s) => s.windows);
  const activeWindowId = useOS((s) => s.activeWindowId);
  const openApp = useOS((s) => s.openApp);
  const toggleCommandPalette = useOS((s) => s.toggleCommandPalette);
  const toggleNotifCenter = useOS((s) => s.toggleNotifCenter);
  const lock = useOS((s) => s.lock);
  const restart = useOS((s) => s.restart);
  const shutdown = useOS((s) => s.shutdown);
  const theme = useOS((s) => s.settings.theme);
  const updateSettings = useOS((s) => s.updateSettings);
  const volume = useOS((s) => s.settings.volume);
  const notifCount = useOS((s) => s.notifications.filter((n) => !n.read).length);

  const [now, setNow] = useState(new Date());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  // active app name
  const activeWin = windows.find((w) => w.id === activeWindowId && !w.minimized);
  const activeApp = activeWin ? apps.find((a) => a.id === activeWin.appId) : null;
  const activeName = activeApp?.name || '访达';

  // close menus on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (appMenuRef.current && !appMenuRef.current.contains(e.target as Node)) setAppMenuOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' });

  return (
    <div className="absolute top-0 inset-x-0 h-7 z-[9000] flex items-center px-2 gap-1 text-white text-[13px] bg-black/25 backdrop-blur-xl border-b border-white/10 select-none">
      {/* Apple-style logo → app menu */}
      <div ref={appMenuRef} className="relative h-full">
        <button
          onClick={() => { setAppMenuOpen((v) => !v); setStatusMenuOpen(false); }}
          className={`h-full px-2 flex items-center rounded transition ${appMenuOpen ? 'bg-white/20' : 'hover:bg-white/15'}`}
          title="系统菜单"
        >
          {/* stylized logo */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
            <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.33.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.92-.03-.01-2.7-1.04-2.73-4.13zM14.6 4.59c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z"/>
          </svg>
        </button>
        <AnimatePresence>
          {appMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute top-7 left-0 w-56 rounded-xl bg-popover/95 backdrop-blur-2xl border border-border shadow-2xl py-1.5 text-popover-foreground"
              style={{ originY: 0 }}
            >
              <MenuItem label="关于此系统" onClick={() => { openApp('about'); setAppMenuOpen(false); }} />
              <MenuSep />
              <MenuItem label="系统设置…" onClick={() => { openApp('settings'); setAppMenuOpen(false); }} icon={<SettingsIcon className="w-3.5 h-3.5" />} />
              <MenuItem label="文件管理器" onClick={() => { openApp('filemanager'); setAppMenuOpen(false); }} />
              <MenuItem label="应用商店" onClick={() => { openApp('appstore'); setAppMenuOpen(false); }} />
              <MenuSep />
              <MenuItem label="Spotlight 搜索" shortcut="⌘K" onClick={() => { toggleCommandPalette(true); setAppMenuOpen(false); }} icon={<Search className="w-3.5 h-3.5" />} />
              <MenuSep />
              <MenuItem label="锁屏" onClick={() => { lock(); setAppMenuOpen(false); }} icon={<Lock className="w-3.5 h-3.5" />} />
              <MenuItem label="重启…" onClick={() => { restart(); setAppMenuOpen(false); }} icon={<RotateCw className="w-3.5 h-3.5" />} />
              <MenuItem label="关机…" onClick={() => { shutdown(); setAppMenuOpen(false); }} icon={<Power className="w-3.5 h-3.5" />} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active app name (bold) */}
      <span className="font-semibold px-1.5 hidden sm:inline">{activeName}</span>
      <span className="px-1.5 text-white/70 hidden md:inline">文件</span>
      <span className="px-1.5 text-white/70 hidden md:inline">编辑</span>
      <span className="px-1.5 text-white/70 hidden lg:inline">视图</span>
      <span className="px-1.5 text-white/70 hidden lg:inline">窗口</span>
      <span className="px-1.5 text-white/70 hidden lg:inline">帮助</span>

      <div className="flex-1" />

      {/* Status icons (right) */}
      <div className="flex items-center gap-0.5">
        <BarIcon title="Spotlight" onClick={() => toggleCommandPalette(true)}>
          <Search className="w-3.5 h-3.5" />
        </BarIcon>
        <BarIcon title="主题" onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}>
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </BarIcon>
        <BarIcon title="音量" className="hidden sm:flex">
          <Volume2 className="w-3.5 h-3.5" />
        </BarIcon>
        <BarIcon title="网络" className="hidden sm:flex">
          <Wifi className="w-3.5 h-3.5" />
        </BarIcon>
        <BarIcon title="电池" className="hidden sm:flex">
          <BatteryFull className="w-4 h-4" />
        </BarIcon>

        {/* Notification / control center */}
        <div ref={statusRef} className="relative h-full">
          <button
            onClick={() => { setStatusMenuOpen((v) => !v); setAppMenuOpen(false); }}
            className={`relative h-full px-2 flex items-center rounded transition ${statusMenuOpen ? 'bg-white/20' : 'hover:bg-white/15'}`}
            title="控制中心"
          >
            <div className="flex flex-col gap-0.5">
              <span className="block w-3.5 h-0.5 bg-white/90 rounded-full" />
              <span className="block w-3.5 h-0.5 bg-white/90 rounded-full" />
            </div>
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-3 h-3 px-0.5 rounded-full bg-red-500 text-[9px] flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {statusMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute top-7 right-0 w-64 rounded-2xl bg-popover/95 backdrop-blur-2xl border border-border shadow-2xl p-3 text-popover-foreground"
                style={{ originY: 0 }}
              >
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <ToggleTile active={theme === 'dark'} icon={theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} label={theme === 'dark' ? '深色' : '浅色'} onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
                  <ToggleTile active icon={<Wifi className="w-4 h-4" />} label="Wi-Fi" onClick={() => {}} />
                  <ToggleTile active icon={<Volume2 className="w-4 h-4" />} label="音量" onClick={() => updateSettings({ volume: volume > 0 ? 0 : 70 })} />
                  <ToggleTile active={false} icon={<Bell className="w-4 h-4" />} label="通知" onClick={() => toggleNotifCenter(true)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                    <input type="range" min={30} max={100} value={useOS.getState().settings.brightness} onChange={(e) => updateSettings({ brightness: Number(e.target.value) })} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <input type="range" min={0} max={100} value={volume} onChange={(e) => updateSettings({ volume: Number(e.target.value) })} className="flex-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <button onClick={() => { lock(); setStatusMenuOpen(false); }} className="flex items-center gap-1.5 text-xs hover:opacity-70 transition">
                    <Lock className="w-3.5 h-3.5" /> 锁屏
                  </button>
                  <button onClick={() => { toggleCommandPalette(true); setStatusMenuOpen(false); }} className="flex items-center gap-1.5 text-xs hover:opacity-70 transition">
                    <CommandIcon className="w-3.5 h-3.5" /> Spotlight
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clock + date */}
        <button
          onClick={() => toggleNotifCenter()}
          className="h-full px-2 flex items-center gap-2 rounded hover:bg-white/15 transition tabular-nums"
          title="通知中心"
        >
          <span className="hidden sm:inline">{dateStr}</span>
          <span>{timeStr}</span>
        </button>
      </div>
    </div>
  );
}

function BarIcon({
  children,
  title,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-full px-1.5 flex items-center rounded hover:bg-white/15 transition ${className}`}
    >
      {children}
    </button>
  );
}

function MenuItem({
  label,
  onClick,
  icon,
  shortcut,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1 text-[13px] text-left hover:bg-primary hover:text-primary-foreground transition rounded-md mx-1"
      style={{ width: 'calc(100% - 8px)' }}
    >
      {icon ? <span className="w-3.5 flex justify-center">{icon}</span> : <span className="w-3.5" />}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-xs text-muted-foreground">{shortcut}</span>}
    </button>
  );
}

function MenuSep() {
  return <div className="h-px my-1 mx-2 bg-border" />;
}

function ToggleTile({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded-xl text-xs transition ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
      }`}
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center" style={active ? { background: 'rgba(255,255,255,0.2)' } : {}}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

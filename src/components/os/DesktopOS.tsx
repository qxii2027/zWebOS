'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/os/store';
import { BootScreen } from './BootScreen';
import { LockScreen } from './LockScreen';
import { Desktop } from './Desktop';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { ContextMenu } from './ContextMenu';
import { NotificationCenter } from './NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { WindowSwitcher } from './WindowSwitcher';
import { SnapOverlay } from './SnapOverlay';
import { Window } from './Window';
import { MobileShell } from './MobileShell';
import { useGlobalShortcuts } from './useGlobalShortcuts';

export function DesktopOS() {
  const phase = useOS((s) => s.phase);
  const windows = useOS((s) => s.windows);
  const apps = useOS((s) => s.apps);
  const theme = useOS((s) => s.settings.theme);
  const brightness = useOS((s) => s.settings.brightness);
  const accent = useOS((s) => s.settings.accent);
  const notify = useOS((s) => s.notify);

  const [isMobile, setIsMobile] = useState(false);

  // responsive detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // theme + accent application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.setProperty('--accent-color', accent);
    // expose accent as --primary-ish for range thumbs etc.
    root.style.setProperty('--accent', accent);
  }, [theme, accent]);

  // global keyboard shortcuts (desktop only)
  useGlobalShortcuts(isMobile);

  // welcome notification after first boot to desktop
  useEffect(() => {
    if (phase === 'desktop') {
      const t = setTimeout(() => {
        notify({
          title: '欢迎使用 WebOS',
          body: '点击左下角打开开始菜单，按 Ctrl+K 打开命令面板，右键桌面更换壁纸。',
          icon: '👋',
        });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, notify]);

  if (phase === 'boot') return <BootScreen />;
  if (phase === 'lock') return <LockScreen />;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ filter: `brightness(${brightness / 100})` }}
    >
      {isMobile ? (
        <MobileShell />
      ) : (
        <>
          <Desktop>
            <AnimatePresence>
              {windows
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((win) => {
                  const app = apps.find((a) => a.id === win.appId);
                  if (!app) return null;
                  return <Window key={win.id} win={win} app={app} />;
                })}
            </AnimatePresence>
          </Desktop>
          <MenuBar />
          <Dock />
          <NotificationCenter />
          <CommandPalette />
          <WindowSwitcher />
          <SnapOverlay />
        </>
      )}
      <ContextMenu />
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useOS } from '@/lib/os/store';

// Global keyboard shortcuts for the desktop shell.
export function useGlobalShortcuts(disabled: boolean) {
  const toggleCommandPalette = useOS((s) => s.toggleCommandPalette);
  const toggleStartMenu = useOS((s) => s.toggleStartMenu);
  const cycleWindow = useOS((s) => s.cycleWindow);
  const setContextMenu = useOS((s) => s.setContextMenu);
  const toggleNotifCenter = useOS((s) => s.toggleNotifCenter);

  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K -> command palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      // Alt + Tab -> cycle windows
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        cycleWindow(e.shiftKey ? -1 : 1);
        return;
      }
      // Meta (Win) or Super -> toggle start menu
      if (e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault();
        toggleStartMenu();
        return;
      }
      // Escape -> close open menus
      if (e.key === 'Escape') {
        const s = useOS.getState();
        if (s.commandPaletteOpen) {
          toggleCommandPalette(false);
          return;
        }
        if (s.startMenuOpen) {
          toggleStartMenu(false);
          return;
        }
        if (s.notifCenterOpen) {
          toggleNotifCenter(false);
          return;
        }
        if (s.contextMenu?.open) {
          setContextMenu(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, toggleCommandPalette, toggleStartMenu, cycleWindow, setContextMenu, toggleNotifCenter]);
}

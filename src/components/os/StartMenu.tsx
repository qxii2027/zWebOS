'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Power, RotateCw, Lock, Settings as SettingsIcon, FileText, Clock as ClockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/os/store';
import { AppIcon, WebappIcon } from './AppIcon';

export function StartMenu() {
  const open = useOS((s) => s.startMenuOpen);
  const toggle = useOS((s) => s.toggleStartMenu);
  const apps = useOS((s) => s.apps);
  const openApp = useOS((s) => s.openApp);
  const username = useOS((s) => s.settings.username);
  const lock = useOS((s) => s.lock);
  const restart = useOS((s) => s.restart);
  const shutdown = useOS((s) => s.shutdown);
  const recentFiles = useOS((s) => s.recentFiles);
  const files = useOS((s) => s.files);
  const [query, setQuery] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  const ref = useRef<HTMLDivElement>(null);

  // Clear the search query whenever the menu closes (render-time adjustment).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-start-trigger]')) return;
        toggle(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, toggle]);

  const filtered = apps.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );

  const builtin = filtered.filter((a) => a.builtin);
  const installed = filtered.filter((a) => !a.builtin);

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      ref={ref}
      className="absolute bottom-16 left-2 z-[9100] w-[min(560px,calc(100vw-16px))] max-h-[70vh] flex flex-col rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl overflow-hidden text-card-foreground"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{ originX: 0, originY: 1 }}
    >
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-muted">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索应用…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {!query && recentFiles.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground px-1 mb-2 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" /> 最近使用
            </div>
            <div className="flex flex-col gap-0.5">
              {recentFiles.slice(0, 4).map((r) => {
                const f = files.find((x) => x.id === r.id);
                if (!f) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (f.type === 'folder') openApp('filemanager', { folderId: f.id });
                      else openApp('fileviewer', { fileId: f.id });
                      toggle(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition text-left"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted shrink-0">
                      <FileText className="w-3.5 h-3.5 text-sky-500" />
                    </span>
                    <span className="text-sm truncate flex-1">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(r.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {builtin.length > 0 && (
          <>
            <div className="text-xs font-medium text-muted-foreground px-1 mb-2">
              内置应用
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 mb-4">
              {builtin.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    openApp(app.id);
                    toggle(false);
                  }}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition"
                >
                  <span className="transition-transform group-hover:scale-105 group-active:scale-95">
                    <AppIcon icon={app.icon} color={app.color} size={48} />
                  </span>
                  <span className="text-xs text-center line-clamp-1 w-full">{app.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {installed.length > 0 && (
          <>
            <div className="text-xs font-medium text-muted-foreground px-1 mb-2">
              已安装应用
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {installed.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    openApp(app.id);
                    toggle(false);
                  }}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition"
                >
                  <span className="transition-transform group-hover:scale-105 group-active:scale-95">
                    {app.url ? (
                      <WebappIcon url={app.url} name={app.name} size={48} />
                    ) : (
                      <AppIcon icon={app.icon} color={app.color} size={48} />
                    )}
                  </span>
                  <span className="text-xs text-center line-clamp-1 w-full">{app.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            未找到 "{query}" 相关应用
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-border bg-muted/40">
        <button
          onClick={() => {
            openApp('settings');
            toggle(false);
          }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-sm font-medium">
            {username.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{username}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openApp('settings')}
            title="设置"
            className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => lock()}
            title="锁屏"
            className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={() => restart()}
            title="重启"
            className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => shutdown()}
            title="关机"
            className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

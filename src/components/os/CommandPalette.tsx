'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, FileText, Folder, Settings as SettingsIcon, Power, Lock, Moon, Sun, Plus } from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { AppIcon, WebappIcon } from './AppIcon';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  section: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useOS((s) => s.commandPaletteOpen);
  const toggle = useOS((s) => s.toggleCommandPalette);
  const apps = useOS((s) => s.apps);
  const files = useOS((s) => s.files);
  const openApp = useOS((s) => s.openApp);
  const lock = useOS((s) => s.lock);
  const shutdown = useOS((s) => s.shutdown);
  const restart = useOS((s) => s.restart);
  const updateSettings = useOS((s) => s.updateSettings);
  const theme = useOS((s) => s.settings.theme);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // reset on open
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActive(0);
    }
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const appItems: CommandItem[] = apps
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .map((a) => ({
        id: 'app:' + a.id,
        label: a.name,
        hint: a.url || '应用',
        section: '应用',
        icon: a.url ? (
          <WebappIcon url={a.url} name={a.name} size={26} rounded="rounded-md" />
        ) : (
          <AppIcon icon={a.icon} color={a.color} size={26} rounded="rounded-md" />
        ),
        run: () => openApp(a.id),
      }));

    const fileItems: CommandItem[] = files
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((f) => ({
        id: 'file:' + f.id,
        label: f.name,
        hint: f.type === 'folder' ? '文件夹' : '文件',
        section: '文件',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            {f.type === 'folder' ? (
              <Folder className="w-4 h-4 text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-sky-500" />
            )}
          </span>
        ),
        run: () => {
          if (f.type === 'folder') {
            openApp('filemanager', { folderId: f.id });
          } else {
            openApp('fileviewer', { fileId: f.id });
          }
        },
      }));

    const actionItems: CommandItem[] = [
      {
        id: 'act:settings',
        label: '打开设置',
        hint: '操作',
        section: '操作',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            <SettingsIcon className="w-4 h-4" />
          </span>
        ),
        run: () => openApp('settings'),
      },
      {
        id: 'act:theme',
        label: theme === 'dark' ? '切换到浅色主题' : '切换到深色主题',
        hint: '操作',
        section: '操作',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </span>
        ),
        run: () => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' }),
      },
      {
        id: 'act:lock',
        label: '锁屏',
        hint: '操作',
        section: '操作',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            <Lock className="w-4 h-4" />
          </span>
        ),
        run: () => lock(),
      },
      {
        id: 'act:restart',
        label: '重启系统',
        hint: '操作',
        section: '操作',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            <Plus className="w-4 h-4 rotate-45" />
          </span>
        ),
        run: () => restart(),
      },
      {
        id: 'act:shutdown',
        label: '关机',
        hint: '操作',
        section: '操作',
        icon: (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-muted">
            <Power className="w-4 h-4" />
          </span>
        ),
        run: () => shutdown(),
      },
    ].filter((a) => !q || a.label.toLowerCase().includes(q));

    // prioritize: if query empty show actions first, then apps, then files
    if (!q) return [...actionItems.slice(0, 3), ...appItems.slice(0, 6), ...fileItems.slice(0, 3)];
    return [...appItems, ...fileItems, ...actionItems].slice(0, 24);
  }, [query, apps, files, openApp, lock, restart, shutdown, updateSettings, theme]);

  // clamp active index (render-time adjustment)
  const safeActive = active >= items.length ? 0 : active;
  if (safeActive !== active) setActive(safeActive);

  // scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${safeActive}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeActive]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[safeActive];
      if (item) {
        item.run();
        toggle(false);
      }
    }
  };

  // group by section preserving order
  const grouped = useMemo(() => {
    const seen = new Set<string>();
    const out: { section: string; items: CommandItem[] }[] = [];
    for (const it of items) {
      if (!seen.has(it.section)) {
        seen.add(it.section);
        out.push({ section: it.section, items: [] });
      }
      out[out.length - 1].items.push(it);
    }
    return out;
  }, [items]);

  let flatIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9600] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) toggle(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <motion.div
            className="relative w-full max-w-xl rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                placeholder="搜索应用、文件或操作…"
                className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded border border-border text-[10px] text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Search className="w-7 h-7 mb-2 opacity-40" />
                  <p className="text-sm">未找到匹配项</p>
                </div>
              ) : (
                grouped.map((g) => (
                  <div key={g.section} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {g.section}
                    </div>
                    {g.items.map((it) => {
                      flatIdx += 1;
                      const idx = flatIdx;
                      const isActive = idx === safeActive;
                      return (
                        <button
                          key={it.id}
                          data-idx={idx}
                          onMouseMove={() => setActive(idx)}
                          onClick={() => {
                            it.run();
                            toggle(false);
                          }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition ${
                            isActive ? 'bg-accent' : 'hover:bg-accent/50'
                          }`}
                        >
                          {it.icon}
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm truncate">{it.label}</span>
                            {it.hint && (
                              <span className="block text-[11px] text-muted-foreground truncate">
                                {it.hint}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-3 px-3 h-8 border-t border-border bg-muted/40 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" /> 选择
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" /> 打开
              </span>
              <span className="ml-auto">Ctrl + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

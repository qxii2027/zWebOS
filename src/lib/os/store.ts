'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppDef,
  WindowInstance,
  OSSettings,
  VFile,
  OSNotification,
  Bookmark,
  HistoryEntry,
} from './types';
import { DEFAULT_APPS, WALLPAPERS, APPS_VERSION } from './defaultApps';

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const DEFAULT_SETTINGS: OSSettings = {
  wallpaper: 'aurora',
  theme: 'dark',
  accent: '#6366f1',
  username: '用户',
  volume: 70,
  brightness: 100,
  taskbarPosition: 'bottom',
  reduceMotion: false,
};

function seedFiles(): VFile[] {
  const now = Date.now();
  return [
    {
      id: 'folder_documents',
      name: '文档',
      type: 'folder',
      parentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'folder_pictures',
      name: '图片',
      type: 'folder',
      parentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'folder_music',
      name: '音乐',
      type: 'folder',
      parentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'file_welcome',
      name: '欢迎.txt',
      type: 'file',
      parentId: 'folder_documents',
      content:
        '欢迎使用 WebOS！\n\n这是一个运行在浏览器中的伪操作系统。\n\n特性：\n• 窗口管理（拖拽、缩放、最小化、最大化）\n• 应用商店可安装任意网站为应用\n• 内置浏览器、文件管理器、终端等\n• 数据保存在浏览器本地\n• 移动端与桌面端自适应\n\n提示：右键桌面可更换壁纸，点击左下角开始菜单打开应用。',
      mimeType: 'text/plain',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

interface OSStore {
  // lifecycle
  phase: 'boot' | 'lock' | 'desktop';
  booted: boolean;

  // windows
  windows: WindowInstance[];
  activeWindowId: string | null;
  zTop: number;

  // apps
  apps: AppDef[];

  // settings
  settings: OSSettings;

  // files
  files: VFile[];
  trash: VFile[];
  recentFiles: { id: string; name: string; appId: string; time: number }[];

  // notifications
  notifications: OSNotification[];

  // browser data
  bookmarks: Bookmark[];
  history: HistoryEntry[];

  // ui
  startMenuOpen: boolean;
  notifCenterOpen: boolean;
  commandPaletteOpen: boolean;
  snapPreview: 'left' | 'right' | 'max' | null;
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null;

  // actions
  setPhase: (p: 'boot' | 'lock' | 'desktop') => void;
  lock: () => void;
  unlock: () => void;
  shutdown: () => void;
  restart: () => void;

  openApp: (appId: string, initialState?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (
    id: string,
    rect: { x: number; y: number; width: number; height: number },
  ) => void;
  setWindowState: (id: string, state: Record<string, unknown>) => void;
  setWindowTitle: (id: string, title: string) => void;
  snapWindow: (id: string, side: 'left' | 'right' | 'max') => void;

  installApp: (app: AppDef) => void;
  uninstallApp: (appId: string) => void;

  updateSettings: (patch: Partial<OSSettings>) => void;

  // files
  createFile: (file: Partial<VFile> & { name: string; type: 'file' | 'folder' }) => string;
  updateFile: (id: string, patch: Partial<VFile>) => void;
  deleteFile: (id: string) => void; // moves to trash
  restoreFile: (id: string) => void;
  emptyTrash: () => void;
  purgeFile: (id: string) => void; // permanently delete from trash
  addRecentFile: (entry: { id: string; name: string; appId: string }) => void;

  // notifications
  notify: (n: { title: string; body: string; icon?: string }) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleNotifCenter: (open?: boolean) => void;

  // browser data
  addBookmark: (b: { title: string; url: string }) => void;
  removeBookmark: (id: string) => void;
  addHistory: (h: { title: string; url: string }) => void;
  clearHistory: () => void;

  toggleStartMenu: (open?: boolean) => void;
  setContextMenu: (cm: OSStore['contextMenu']) => void;
  toggleCommandPalette: (open?: boolean) => void;
  cycleWindow: (direction?: 1 | -1) => void;
  setSnapPreview: (s: OSStore['snapPreview']) => void;

  resetAll: () => void;
}

export interface ContextMenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export const useOS = create<OSStore>()(
  persist(
    (set, get) => ({
      phase: 'boot',
      booted: false,

      windows: [],
      activeWindowId: null,
      zTop: 10,

      apps: DEFAULT_APPS,

      settings: DEFAULT_SETTINGS,

      files: seedFiles(),
      trash: [],
      recentFiles: [],

      notifications: [],
      bookmarks: [
        { id: 'bm1', title: 'Bing', url: 'https://www.bing.com' },
        { id: 'bm2', title: 'Wikipedia', url: 'https://www.wikipedia.org' },
        { id: 'bm3', title: 'GitHub', url: 'https://github.com' },
      ],
      history: [],

      startMenuOpen: false,
      notifCenterOpen: false,
      commandPaletteOpen: false,
      snapPreview: null,
      contextMenu: null,

      setPhase: (p) => set({ phase: p, booted: p === 'desktop' || get().booted }),

      lock: () => set({ phase: 'lock', startMenuOpen: false }),
      unlock: () => set({ phase: 'desktop' }),
      shutdown: () => set({ phase: 'boot', windows: [], startMenuOpen: false }),
      restart: () => {
        set({ phase: 'boot', windows: [], startMenuOpen: false });
        setTimeout(() => set({ phase: 'lock' }), 2200);
      },

      openApp: (appId, initialState) => {
        const state = get();
        const app = state.apps.find((a) => a.id === appId);
        if (!app) return '';
        // For singleton-ish apps, focus existing if open (not for browser/webapp/texteditor)
        const singletons = ['settings', 'appstore', 'about', 'calculator', 'clock'];
        if (singletons.includes(app.component)) {
          const existing = state.windows.find((w) => w.appId === appId);
          if (existing) {
            // focusWindow already un-minimizes and raises z-index
            get().focusWindow(existing.id);
            return existing.id;
          }
        }
        const id = uid('win');
        const z = state.zTop + 1;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const dw = app.defaultSize?.width || 640;
        const dh = app.defaultSize?.height || 480;
        const offset = (state.windows.length % 6) * 28;
        const x = Math.max(12, Math.min(vw - dw - 12, Math.round((vw - dw) / 2) + offset - 80));
        const y = Math.max(36, Math.min(vh - dh - 110, Math.round((vh - dh) / 2) + offset - 40));
        const win: WindowInstance = {
          id,
          appId,
          title: app.name,
          icon: app.icon,
          x,
          y,
          width: dw,
          height: dh,
          minimized: false,
          maximized: false,
          zIndex: z,
          state: initialState,
        };
        set({
          windows: [...state.windows, win],
          activeWindowId: id,
          zTop: z,
          startMenuOpen: false,
        });
        return id;
      },

      closeWindow: (id) =>
        set((s) => ({
          windows: s.windows.filter((w) => w.id !== id),
          activeWindowId:
            s.activeWindowId === id
              ? s.windows
                  .filter((w) => w.id !== id && !w.minimized)
                  .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null
              : s.activeWindowId,
        })),

      focusWindow: (id) =>
        set((s) => {
          const z = s.zTop + 1;
          return {
            zTop: z,
            activeWindowId: id,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, zIndex: z, minimized: false } : w,
            ),
          };
        }),

      minimizeWindow: (id) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, minimized: !w.minimized } : w,
          ),
          activeWindowId:
            s.activeWindowId === id
              ? s.windows
                  .filter((w) => w.id !== id && !w.minimized)
                  .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null
              : s.activeWindowId,
        })),

      toggleMaximize: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized) {
              const r = w.prevRect || { x: 80, y: 60, width: w.width, height: w.height };
              return { ...w, maximized: false, ...r };
            }
            return {
              ...w,
              maximized: true,
              prevRect: { x: w.x, y: w.y, width: w.width, height: w.height },
            };
          }),
        })),

      moveWindow: (id, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),

      resizeWindow: (id, rect) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)),
        })),

      setWindowState: (id, state) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, state: { ...w.state, ...state } } : w,
          ),
        })),

      setWindowTitle: (id, title) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)),
        })),

      snapWindow: (id, side) => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const topPad = 28; // menu bar
        const bottomPad = 90; // dock
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            const prevRect = w.prevRect || { x: w.x, y: w.y, width: w.width, height: w.height };
            if (side === 'max') {
              return { ...w, maximized: true, prevRect };
            }
            if (side === 'left') {
              return {
                ...w,
                maximized: false,
                x: 0,
                y: topPad,
                width: Math.round(vw / 2),
                height: vh - topPad - bottomPad,
                prevRect,
              };
            }
            return {
              ...w,
              maximized: false,
              x: Math.round(vw / 2),
              y: topPad,
              width: Math.round(vw / 2),
              height: vh - topPad - bottomPad,
              prevRect,
            };
          }),
        }));
      },

      installApp: (app) =>
        set((s) => {
          if (s.apps.some((a) => a.id === app.id)) return s;
          return { apps: [...s.apps, app] };
        }),

      uninstallApp: (appId) =>
        set((s) => ({
          apps: s.apps.filter((a) => a.id !== appId || a.builtin),
          windows: s.windows.filter((w) => w.appId !== appId),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      createFile: (file) => {
        const id = uid('file');
        const now = Date.now();
        const f: VFile = {
          id,
          name: file.name,
          type: file.type,
          parentId: file.parentId ?? null,
          content: file.content,
          mimeType: file.mimeType,
          dataUrl: file.dataUrl,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ files: [...s.files, f] }));
        return id;
      },

      updateFile: (id, patch) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f,
          ),
        })),

      deleteFile: (id) =>
        set((s) => {
          // collect the subtree and move it to trash (soft delete)
          const toTrash = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const f of s.files) {
              if (f.parentId && toTrash.has(f.parentId) && !toTrash.has(f.id)) {
                toTrash.add(f.id);
                changed = true;
              }
            }
          }
          const trashed = s.files
            .filter((f) => toTrash.has(f.id))
            .map((f) => ({ ...f, _origParent: f.parentId } as VFile & { _origParent?: string | null }));
          return {
            files: s.files.filter((f) => !toTrash.has(f.id)),
            trash: [...trashed, ...s.trash],
          };
        }),

      restoreFile: (id) =>
        set((s) => {
          const item = s.trash.find((f) => f.id === id);
          if (!item) return s;
          // restore subtree (all items whose original ancestor chain includes id)
          const toRestore = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const f of s.trash) {
              const op = (f as VFile & { _origParent?: string | null })._origParent;
              if (op && toRestore.has(op) && !toRestore.has(f.id)) {
                toRestore.add(f.id);
                changed = true;
              }
            }
          }
          const restored = s.trash
            .filter((f) => toRestore.has(f.id))
            .map((f) => {
              const { _origParent, ...rest } = f as VFile & { _origParent?: string | null };
              return { ...rest, parentId: _origParent ?? null };
            });
          return {
            trash: s.trash.filter((f) => !toRestore.has(f.id)),
            files: [...s.files, ...restored],
          };
        }),

      purgeFile: (id) =>
        set((s) => {
          const toPurge = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const f of s.trash) {
              const op = (f as VFile & { _origParent?: string | null })._origParent;
              if (op && toPurge.has(op) && !toPurge.has(f.id)) {
                toPurge.add(f.id);
                changed = true;
              }
            }
          }
          return { trash: s.trash.filter((f) => !toPurge.has(f.id)) };
        }),

      emptyTrash: () => set({ trash: [] }),

      addRecentFile: (entry) =>
        set((s) => ({
          recentFiles: [
            { ...entry, time: Date.now() },
            ...s.recentFiles.filter((r) => r.id !== entry.id),
          ].slice(0, 12),
        })),

      notify: (n) => {
        const notif: OSNotification = {
          id: uid('ntf'),
          title: n.title,
          body: n.body,
          icon: n.icon,
          time: Date.now(),
          read: false,
        };
        set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 50) }));
      },

      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      clearNotifications: () => set({ notifications: [] }),

      toggleNotifCenter: (open) =>
        set((s) => ({ notifCenterOpen: open ?? !s.notifCenterOpen })),

      addBookmark: (b) =>
        set((s) => ({
          bookmarks: [...s.bookmarks, { id: uid('bm'), ...b }],
        })),

      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      addHistory: (h) =>
        set((s) => ({
          history: [{ id: uid('hist'), ...h, time: Date.now() }, ...s.history].slice(0, 200),
        })),

      clearHistory: () => set({ history: [] }),

      toggleStartMenu: (open) =>
        set((s) => ({ startMenuOpen: open ?? !s.startMenuOpen })),

      setContextMenu: (cm) => set({ contextMenu: cm }),

      toggleCommandPalette: (open) =>
        set((s) => ({
          commandPaletteOpen: open ?? !s.commandPaletteOpen,
          startMenuOpen: false,
          notifCenterOpen: false,
        })),

      cycleWindow: (direction = 1) => {
        const s = get();
        const visible = s.windows
          .filter((w) => !w.minimized)
          .sort((a, b) => b.zIndex - a.zIndex);
        if (visible.length === 0) return;
        const curIdx = visible.findIndex((w) => w.id === s.activeWindowId);
        const nextIdx = (curIdx + direction + visible.length) % visible.length;
        const target = visible[nextIdx];
        if (target) get().focusWindow(target.id);
      },

      setSnapPreview: (s) => set({ snapPreview: s }),

      resetAll: () => {
        try {
          localStorage.removeItem('webos-store');
        } catch {}
        set({
          phase: 'boot',
          windows: [],
          activeWindowId: null,
          zTop: 10,
          apps: DEFAULT_APPS,
          settings: DEFAULT_SETTINGS,
          files: seedFiles(),
          trash: [],
          recentFiles: [],
          notifications: [],
          bookmarks: [],
          history: [],
          startMenuOpen: false,
        });
        setTimeout(() => set({ phase: 'lock' }), 2200);
      },
    }),
    {
      name: 'webos-store',
      version: APPS_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        apps: s.apps,
        settings: s.settings,
        files: s.files,
        trash: s.trash,
        recentFiles: s.recentFiles,
        bookmarks: s.bookmarks,
        history: s.history,
        notifications: s.notifications,
        booted: s.booted,
      }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<OSStore>;
        // Re-sync builtin apps to the latest DEFAULT_APPS (keeps user-installed webapps).
        const userApps = (p.apps || []).filter((a) => !a.builtin);
        const apps = [...DEFAULT_APPS, ...userApps];
        // De-duplicate by id (DEFAULT wins).
        const seen = new Set<string>();
        const deduped = apps.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        return {
          ...current,
          ...p,
          apps: deduped,
          phase: 'lock',
          windows: [],
          activeWindowId: null,
          zTop: 10,
          startMenuOpen: false,
          notifCenterOpen: false,
          commandPaletteOpen: false,
          snapPreview: null,
          contextMenu: null,
        };
      },
    },
  ),
);

export { WALLPAPERS };

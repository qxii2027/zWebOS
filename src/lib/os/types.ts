// Core types for the pseudo-OS

export type AppComponentType =
  | 'browser'
  | 'filemanager'
  | 'settings'
  | 'appstore'
  | 'texteditor'
  | 'calculator'
  | 'terminal'
  | 'musicplayer'
  | 'imageviewer'
  | 'clock'
  | 'about'
  | 'webapp'
  | 'paint'
  | 'fileviewer';

export interface AppDef {
  id: string;
  name: string;
  icon: string; // emoji or data/url
  component: AppComponentType;
  color?: string; // tailwind gradient or hex for icon bg
  url?: string; // for webapp (installed website)
  builtin?: boolean;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
}

export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  // app-specific persisted state per window
  state?: Record<string, unknown>;
  // store prev geometry for restore from maximize
  prevRect?: { x: number; y: number; width: number; height: number };
}

export interface OSSettings {
  wallpaper: string; // id of wallpaper
  theme: 'light' | 'dark';
  accent: string; // hex color
  username: string;
  volume: number;
  brightness: number;
  taskbarPosition: 'bottom' | 'left';
  reduceMotion: boolean;
}

export interface VFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null; // null = root
  content?: string; // for text files
  mimeType?: string; // for images etc
  dataUrl?: string; // for binary stored as data url
  createdAt: number;
  updatedAt: number;
}

export interface OSNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  time: number;
  read: boolean;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  time: number;
}

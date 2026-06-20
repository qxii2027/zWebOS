import type { AppDef } from './types';

export const DEFAULT_APPS: AppDef[] = [
  {
    id: 'browser',
    name: '浏览器',
    icon: 'globe',
    component: 'browser',
    color: 'from-sky-500 to-cyan-600',
    builtin: true,
    defaultSize: { width: 980, height: 660 },
    minSize: { width: 420, height: 360 },
  },
  {
    id: 'filemanager',
    name: '文件管理器',
    icon: 'folder',
    component: 'filemanager',
    color: 'from-amber-500 to-orange-600',
    builtin: true,
    defaultSize: { width: 820, height: 560 },
    minSize: { width: 360, height: 320 },
  },
  {
    id: 'appstore',
    name: '应用商店',
    icon: 'shopping',
    component: 'appstore',
    color: 'from-rose-500 to-pink-600',
    builtin: true,
    defaultSize: { width: 900, height: 620 },
    minSize: { width: 380, height: 420 },
  },
  {
    id: 'settings',
    name: '设置',
    icon: 'settings',
    component: 'settings',
    color: 'from-slate-500 to-slate-700',
    builtin: true,
    defaultSize: { width: 780, height: 560 },
    minSize: { width: 360, height: 380 },
  },
  {
    id: 'texteditor',
    name: '记事本',
    icon: 'filetext',
    component: 'texteditor',
    color: 'from-yellow-500 to-amber-600',
    builtin: true,
    defaultSize: { width: 720, height: 540 },
    minSize: { width: 320, height: 280 },
  },
  {
    id: 'calculator',
    name: '计算器',
    icon: 'calculator',
    component: 'calculator',
    color: 'from-emerald-500 to-teal-600',
    builtin: true,
    defaultSize: { width: 340, height: 540 },
    minSize: { width: 300, height: 480 },
  },
  {
    id: 'terminal',
    name: '终端',
    icon: 'terminal',
    component: 'terminal',
    color: 'from-zinc-700 to-zinc-900',
    builtin: true,
    defaultSize: { width: 720, height: 460 },
    minSize: { width: 360, height: 260 },
  },
  {
    id: 'musicplayer',
    name: '音乐',
    icon: 'music',
    component: 'musicplayer',
    color: 'from-fuchsia-500 to-purple-600',
    builtin: true,
    defaultSize: { width: 420, height: 600 },
    minSize: { width: 360, height: 520 },
  },
  {
    id: 'imageviewer',
    name: '相册',
    icon: 'image',
    component: 'imageviewer',
    color: 'from-lime-500 to-green-600',
    builtin: true,
    defaultSize: { width: 840, height: 600 },
    minSize: { width: 380, height: 360 },
  },
  {
    id: 'paint',
    name: '画图',
    icon: 'palette',
    component: 'paint',
    color: 'from-pink-500 to-rose-600',
    builtin: true,
    defaultSize: { width: 820, height: 600 },
    minSize: { width: 420, height: 380 },
  },
  {
    id: 'clock',
    name: '时钟',
    icon: 'clock',
    component: 'clock',
    color: 'from-indigo-500 to-violet-600',
    builtin: true,
    defaultSize: { width: 560, height: 460 },
    minSize: { width: 360, height: 380 },
  },
  {
    id: 'about',
    name: '关于系统',
    icon: 'info',
    component: 'about',
    color: 'from-blue-500 to-cyan-600',
    builtin: true,
    defaultSize: { width: 560, height: 480 },
    minSize: { width: 360, height: 380 },
  },
  {
    id: 'fileviewer',
    name: '文件查看器',
    icon: 'filetext',
    component: 'fileviewer',
    color: 'from-violet-500 to-indigo-600',
    builtin: true,
    defaultSize: { width: 880, height: 620 },
    minSize: { width: 420, height: 360 },
  },
];

// Bump this when DEFAULT_APPS structure changes so persisted state migrates.
export const APPS_VERSION = 3;

export interface WallpaperDef {
  id: string;
  name: string;
  // CSS background value
  css: string;
  // preview thumbnail (same css)
  dark?: boolean;
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'aurora',
    name: '极光',
    css: 'radial-gradient(at 20% 20%, #4f46e5 0px, transparent 50%), radial-gradient(at 80% 10%, #db2777 0px, transparent 50%), radial-gradient(at 60% 80%, #0891b2 0px, transparent 50%), linear-gradient(135deg, #0f172a, #1e1b4b)',
    dark: true,
  },
  {
    id: 'sunset',
    name: '日落',
    css: 'linear-gradient(135deg, #f97316 0%, #db2777 50%, #7c3aed 100%)',
  },
  {
    id: 'ocean',
    name: '海洋',
    css: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)',
    dark: true,
  },
  {
    id: 'forest',
    name: '森林',
    css: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #84cc16 100%)',
    dark: true,
  },
  {
    id: 'peach',
    name: '蜜桃',
    css: 'linear-gradient(135deg, #fda4af 0%, #fcd34d 100%)',
  },
  {
    id: 'graphite',
    name: '石墨',
    css: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    dark: true,
  },
  {
    id: 'cotton',
    name: '棉花糖',
    css: 'linear-gradient(135deg, #a5b4fc 0%, #f0abfc 50%, #fbcfe8 100%)',
  },
  {
    id: 'ember',
    name: '余烬',
    css: 'radial-gradient(circle at 30% 20%, #f59e0b 0%, transparent 40%), radial-gradient(circle at 70% 70%, #dc2626 0%, transparent 45%), linear-gradient(135deg, #1c1917, #292524)',
    dark: true,
  },
  {
    id: 'monolith',
    name: '巨石',
    css: 'radial-gradient(at 50% 0%, #1e293b 0%, transparent 60%), radial-gradient(at 50% 100%, #334155 0%, transparent 60%), linear-gradient(180deg, #020617, #0f172a)',
    dark: true,
  },
  {
    id: 'mist',
    name: '薄雾',
    css: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
  },
  {
    id: 'bloom',
    name: '绽放',
    css: 'radial-gradient(at 0% 0%, #8b5cf6 0px, transparent 50%), radial-gradient(at 100% 100%, #ec4899 0px, transparent 50%), radial-gradient(at 50% 50%, #06b6d4 0px, transparent 60%), linear-gradient(135deg, #1e1b4b, #0f172a)',
    dark: true,
  },
  {
    id: 'sand',
    name: '沙丘',
    css: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 40%, #d97706 100%)',
  },
  {
    id: 'night',
    name: '夜空',
    css: 'radial-gradient(2px 2px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 60% 70%, #fff, transparent), radial-gradient(1.5px 1.5px at 80% 20%, #fff, transparent), radial-gradient(1px 1px at 35% 85%, #fff, transparent), radial-gradient(2px 2px at 90% 50%, #fff, transparent), linear-gradient(180deg, #020617, #1e1b4b)',
    dark: true,
  },
];

export function getWallpaperCss(id: string): string {
  return (WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0]).css;
}

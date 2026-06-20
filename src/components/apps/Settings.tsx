'use client';

import { useState } from 'react';
import {
  Palette,
  Monitor,
  Database,
  Info,
  User,
  Volume2,
  Sun,
  RotateCcw,
  Trash2,
  Check,
} from 'lucide-react';
import { useOS } from '@/lib/os/store';
import { WALLPAPERS } from '@/lib/os/defaultApps';
import type { WindowInstance } from '@/lib/os/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Section = 'personalize' | 'system' | 'storage' | 'about';

const ACCENTS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'];

function storageSize(): string {
  try {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += (localStorage[key] || '').length + key.length;
      }
    }
    const kb = total / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  } catch {
    return '未知';
  }
}

export function Settings({ win }: { win: WindowInstance }) {
  const settings = useOS((s) => s.settings);
  const update = useOS((s) => s.updateSettings);
  const resetAll = useOS((s) => s.resetAll);
  const files = useOS((s) => s.files);
  const apps = useOS((s) => s.apps);
  const windows = useOS((s) => s.windows);
  const openApp = useOS((s) => s.openApp);

  const [section, setSection] = useState<Section>('personalize');
  const [storage, setStorage] = useState(storageSize());

  const nav = [
    { id: 'personalize' as const, label: '个性化', icon: Palette },
    { id: 'system' as const, label: '系统', icon: Monitor },
    { id: 'storage' as const, label: '存储', icon: Database },
    { id: 'about' as const, label: '关于', icon: Info },
  ];

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-16 sm:w-48 shrink-0 border-r border-border bg-muted/30 flex flex-col p-2 gap-1">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setSection(n.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              section === n.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            <n.icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{n.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {section === 'personalize' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-semibold">个性化</h2>

            <div>
              <h3 className="text-sm font-medium mb-3">壁纸</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => update({ wallpaper: w.id })}
                    className={`relative rounded-xl overflow-hidden h-20 border-2 transition ${
                      settings.wallpaper === w.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ background: w.css }}
                  >
                    {settings.wallpaper === w.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-2 text-xs text-white drop-shadow font-medium">
                      {w.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">主题</h3>
              <div className="flex gap-3">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                      settings.theme === t
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-2xl">{t === 'light' ? '☀️' : '🌙'}</span>
                    <span className="text-sm font-medium">{t === 'light' ? '浅色' : '深色'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">强调色</h3>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ accent: c })}
                    className={`w-9 h-9 rounded-full transition hover:scale-110 ${
                      settings.accent === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'system' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-semibold">系统</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <User className="w-5 h-5 text-muted-foreground" />
                <label className="text-sm flex-1">用户名</label>
                <input
                  value={settings.username}
                  onChange={(e) => update({ username: e.target.value.slice(0, 20) })}
                  className="h-8 px-3 rounded-lg bg-muted border border-border text-sm outline-none w-40"
                />
              </div>

              <div className="p-3 rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Sun className="w-5 h-5 text-muted-foreground" />
                  <label className="text-sm flex-1">屏幕亮度</label>
                  <span className="text-sm tabular-nums">{settings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={settings.brightness}
                  onChange={(e) => update({ brightness: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              <div className="p-3 rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <label className="text-sm flex-1">系统音量</label>
                  <span className="text-sm tabular-nums">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.volume}
                  onChange={(e) => update({ volume: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <label className="text-sm flex-1">减弱动态效果</label>
                <button
                  onClick={() => update({ reduceMotion: !settings.reduceMotion })}
                  className={`w-11 h-6 rounded-full transition relative ${
                    settings.reduceMotion ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                      settings.reduceMotion ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'storage' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-semibold">存储</h2>
            <div className="p-5 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">本地存储已用</span>
                <span className="text-lg font-semibold tabular-nums">{storage}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-chart-1"
                  style={{ width: '35%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                数据保存在浏览器本地 (localStorage)，清除浏览器数据将丢失所有内容。
              </p>
              <button
                onClick={() => setStorage(storageSize())}
                className="mt-3 text-xs text-primary hover:underline"
              >
                刷新统计
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-border text-center">
                <div className="text-2xl font-semibold">{apps.length}</div>
                <div className="text-xs text-muted-foreground mt-1">应用</div>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <div className="text-2xl font-semibold">{files.length}</div>
                <div className="text-xs text-muted-foreground mt-1">文件</div>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <div className="text-2xl font-semibold">{windows.length}</div>
                <div className="text-xs text-muted-foreground mt-1">窗口</div>
              </div>
            </div>

            <AlertDialog>
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <span className="font-medium">危险区域</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  重置系统将清除所有应用、文件、设置并恢复到初始状态。
                </p>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-2 px-4 h-9 rounded-lg bg-destructive text-destructive-foreground text-sm hover:opacity-90 transition">
                    <RotateCcw className="w-4 h-4" /> 重置系统
                  </button>
                </AlertDialogTrigger>
              </div>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认重置系统？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将清除所有本地数据并重启系统，无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetAll()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    重置
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {section === 'about' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-semibold">关于</h2>
            <div className="flex flex-col items-center py-6">
              <div className="text-6xl mb-3">🖥️</div>
              <div className="text-2xl font-light">WebOS</div>
              <div className="text-sm text-muted-foreground">版本 1.0.0</div>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="操作系统" value="WebOS 1.0 (Zephyr)" />
              <Row label="内核" value="Browser-based Pseudo-Kernel" />
              <Row label="渲染引擎" value="Next.js 16 + React 19" />
              <Row label="存储引擎" value="localStorage" />
              <Row label="分辨率" value={`${window.innerWidth} × ${window.innerHeight}`} />
              <Row label="CPU 核心" value={`${navigator.hardwareConcurrency || '未知'} 核`} />
              <Row label="在线状态" value={navigator.onLine ? '已连接' : '离线'} />
            </div>
            <button
              onClick={() => openApp('about')}
              className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
            >
              查看详细信息
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

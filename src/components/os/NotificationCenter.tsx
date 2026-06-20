'use client';

import { useEffect, useRef } from 'react';
import { X, Bell, Trash2, Moon, Sun, Wifi, Volume2, Lock } from 'lucide-react';
import { useOS } from '@/lib/os/store';

export function NotificationCenter() {
  const open = useOS((s) => s.notifCenterOpen);
  const toggle = useOS((s) => s.toggleNotifCenter);
  const notifications = useOS((s) => s.notifications);
  const dismiss = useOS((s) => s.dismissNotification);
  const clear = useOS((s) => s.clearNotifications);
  const theme = useOS((s) => s.settings.theme);
  const updateSettings = useOS((s) => s.updateSettings);
  const volume = useOS((s) => s.settings.volume);
  const brightness = useOS((s) => s.settings.brightness);
  const lock = useOS((s) => s.lock);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        toggle(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, toggle]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-16 right-2 z-[9100] w-[min(380px,calc(100vw-16px))] max-h-[75vh] flex flex-col rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl overflow-hidden text-card-foreground win-pop"
      style={{ animationDuration: '0.2s' }}
    >
      {/* Quick toggles */}
      <div className="p-3 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <QuickToggle
            active={theme === 'dark'}
            icon={theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            label={theme === 'dark' ? '深色' : '浅色'}
            onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
          />
          <QuickToggle
            active
            icon={<Wifi className="w-4 h-4" />}
            label="网络"
            onClick={() => {}}
          />
          <QuickToggle
            active={volume > 0}
            icon={<Volume2 className="w-4 h-4" />}
            label={volume > 0 ? '音量' : '静音'}
            onClick={() => updateSettings({ volume: volume > 0 ? 0 : 70 })}
          />
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              className="flex-1 accent-primary h-1"
            />
            <span className="text-xs w-7 text-right tabular-nums">{volume}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min={30}
              max={100}
              value={brightness}
              onChange={(e) => updateSettings({ brightness: Number(e.target.value) })}
              className="flex-1 accent-primary h-1"
            />
            <span className="text-xs w-7 text-right tabular-nums">{brightness}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="w-4 h-4" />
          通知
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clear()}
            title="清除全部"
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => lock()}
            title="锁屏"
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            暂无通知
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="group relative p-3 rounded-xl bg-muted/60 hover:bg-muted transition"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">{n.icon || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {n.body}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.time).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuickToggle({
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
      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/50 border-border hover:bg-muted'
      }`}
    >
      {icon}
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

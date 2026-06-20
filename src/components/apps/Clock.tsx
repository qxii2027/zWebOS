'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Plus,
  Trash2,
  Bell,
  BellRing,
  Globe,
  X,
} from 'lucide-react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';

interface AlarmItem {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  label?: string;
}

const TIMEZONES = [
  { id: 'Asia/Shanghai', name: '北京' },
  { id: 'America/New_York', name: '纽约' },
  { id: 'Europe/London', name: '伦敦' },
  { id: 'Asia/Tokyo', name: '东京' },
  { id: 'Australia/Sydney', name: '悉尼' },
  { id: 'America/Los_Angeles', name: '洛杉矶' },
  { id: 'Europe/Paris', name: '巴黎' },
];

function playBeep(freq = 880, duration = 1200) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    osc.start(now);
    osc.stop(now + duration / 1000);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* audio not available */
  }
}

function pad(n: number, w = 2) {
  return String(n).padStart(w, '0');
}

export function Clock({ win }: { win: WindowInstance }) {
  const [tab, setTab] = useState('clock');
  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="h-full w-full flex flex-col gap-3 p-3"
      >
        <TabsList className="grid grid-cols-4 w-full shrink-0 h-9">
          <TabsTrigger value="clock">时钟</TabsTrigger>
          <TabsTrigger value="stopwatch">秒表</TabsTrigger>
          <TabsTrigger value="timer">计时器</TabsTrigger>
          <TabsTrigger value="alarm">闹钟</TabsTrigger>
        </TabsList>
        <TabsContent value="clock" className="flex-1 min-h-0 overflow-auto">
          <ClockTab />
        </TabsContent>
        <TabsContent value="stopwatch" className="flex-1 min-h-0 overflow-auto">
          <StopwatchTab />
        </TabsContent>
        <TabsContent value="timer" className="flex-1 min-h-0 overflow-auto">
          <TimerTab />
        </TabsContent>
        <TabsContent value="alarm" className="flex-1 min-h-0 overflow-auto">
          <AlarmTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Clock tab ===

function ClockTab() {
  const [now, setNow] = useState(new Date());
  const [worldZones, setWorldZones] = useState<string[]>([
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
  ]);
  const [addingZone, setAddingZone] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  const secAngle = s * 6;
  const minAngle = (m + s / 60) * 6;
  const hourAngle = ((h % 12) + m / 60) * 30;

  const hand = (angle: number, len: number, w: number, color: string) => {
    const a = (angle - 90) * (Math.PI / 180);
    return (
      <line
        x1={100}
        y1={100}
        x2={100 + Math.cos(a) * len}
        y2={100 + Math.sin(a) * len}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
    );
  };

  const formatTime = (date: Date, tz?: string) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(date);
  };

  return (
    <div className="h-full w-full flex flex-col items-center gap-3 p-3 overflow-auto">
      <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0">
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="var(--color-muted)"
          stroke="var(--color-border)"
          strokeWidth="2"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          const r1 = 86;
          const r2 = i % 3 === 0 ? 72 : 80;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * r1}
              y1={100 + Math.sin(a) * r1}
              x2={100 + Math.cos(a) * r2}
              y2={100 + Math.sin(a) * r2}
              stroke="var(--color-muted-foreground)"
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
            />
          );
        })}
        {hand(hourAngle, 46, 5, 'var(--color-foreground)')}
        {hand(minAngle, 68, 3.5, 'var(--color-foreground)')}
        {hand(secAngle, 80, 1.5, 'oklch(0.6 0.22 25)')}
        <circle cx="100" cy="100" r="4" fill="var(--color-foreground)" />
        <circle cx="100" cy="100" r="2" fill="oklch(0.6 0.22 25)" />
      </svg>
      <div className="text-2xl font-mono font-semibold tabular-nums">
        {formatTime(now)}
      </div>
      <div className="text-sm text-muted-foreground">
        {now.toLocaleDateString('zh-CN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      <div className="w-full max-w-sm border-t pt-3 mt-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Globe className="w-4 h-4" />
          世界时钟
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            'Asia/Shanghai',
            ...worldZones.filter((z) => z !== 'Asia/Shanghai'),
          ].map((tz) => {
            const info = TIMEZONES.find((t) => t.id === tz);
            return (
              <div
                key={tz}
                className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm">{info?.name || tz}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {tz}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono tabular-nums">
                    {formatTime(now, tz)}
                  </span>
                  {tz !== 'Asia/Shanghai' && (
                    <button
                      onClick={() =>
                        setWorldZones((z) => z.filter((t) => t !== tz))
                      }
                      className="text-muted-foreground hover:text-foreground"
                      title="移除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Select value={addingZone} onValueChange={setAddingZone}>
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="选择时区..." />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.filter(
                (t) => !worldZones.includes(t.id) && t.id !== 'Asia/Shanghai',
              ).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              if (addingZone && !worldZones.includes(addingZone)) {
                setWorldZones((z) => [...z, addingZone]);
                setAddingZone('');
              }
            }}
            disabled={!addingZone}
          >
            <Plus className="w-4 h-4" /> 添加
          </Button>
        </div>
      </div>
    </div>
  );
}

// === Stopwatch tab ===

function StopwatchTab() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now() - elapsed;
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const format = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = Math.floor(ms % 1000);
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(mm, 3)}`;
    return `${pad(m)}:${pad(s)}.${pad(mm, 3)}`;
  };

  const lap = () => {
    if (running) setLaps((l) => [elapsed, ...l]);
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
  };

  // best & worst lap (diff)
  const lapDiffs = laps.map((lap, i) => {
    const prev = i < laps.length - 1 ? laps[i + 1] : 0;
    return lap - prev;
  });
  const validDiffs = lapDiffs.filter((d) => isFinite(d));
  const bestDiff = validDiffs.length > 1 ? Math.min(...validDiffs) : null;
  const worstDiff = validDiffs.length > 1 ? Math.max(...validDiffs) : null;

  return (
    <div className="h-full w-full flex flex-col items-center gap-4 p-4">
      <div className="text-5xl font-mono font-bold tabular-nums mt-4">
        {format(elapsed)}
      </div>
      <div className="flex gap-2">
        <Button
          variant={running ? 'secondary' : 'default'}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? (
            <>
              <Pause className="w-4 h-4" /> 暂停
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> 开始
            </>
          )}
        </Button>
        <Button variant="outline" onClick={lap} disabled={!running}>
          <Flag className="w-4 h-4" /> 计圈
        </Button>
        <Button variant="outline" onClick={reset} disabled={running && elapsed > 0 ? false : elapsed === 0}>
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
      </div>

      <div className="w-full max-w-sm flex-1 min-h-0 flex flex-col">
        <div className="text-sm text-muted-foreground mb-1">
          圈数 ({laps.length})
        </div>
        <ScrollArea className="flex-1 border rounded-md">
          <div className="p-1">
            {laps.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-6">
                暂无圈数
              </div>
            ) : (
              laps.map((lap, i) => {
                const prev = i < laps.length - 1 ? laps[i + 1] : 0;
                const diff = lap - prev;
                const isBest = bestDiff !== null && diff === bestDiff;
                const isWorst = worstDiff !== null && diff === worstDiff;
                return (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 px-2 border-b last:border-b-0 text-sm font-mono tabular-nums"
                  >
                    <span className="text-muted-foreground">圈 {laps.length - i}</span>
                    <span
                      className={cn(
                        isBest && 'text-emerald-500 font-semibold',
                        isWorst && 'text-rose-500 font-semibold',
                        !isBest && !isWorst && 'text-muted-foreground',
                      )}
                    >
                      +{format(diff)}
                    </span>
                    <span>{format(lap)}</span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// === Timer tab ===

function TimerTab() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const endTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = endTimeRef.current - performance.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        if (!beepedRef.current) {
          beepedRef.current = true;
          playBeep(880, 1500);
        }
        return;
      }
      setRemaining(left);
    };
    intervalRef.current = setInterval(tick, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = () => {
    let r = remaining;
    if (r === null || r <= 0) {
      const total = (minutes * 60 + seconds) * 1000;
      if (total <= 0) return;
      r = total;
      setRemaining(total);
      beepedRef.current = false;
    }
    endTimeRef.current = performance.now() + r;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setRemaining(null);
    beepedRef.current = false;
  };

  const formatTimer = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${pad(m)}:${pad(s)}`;
  };

  const displayMs =
    remaining !== null ? remaining : (minutes * 60 + seconds) * 1000;
  const done = remaining === 0;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-4">
      {remaining === null ? (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex flex-col items-center">
            <Input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) =>
                setMinutes(
                  Math.max(0, Math.min(59, Number(e.target.value) || 0)),
                )
              }
              className="w-20 h-14 text-center text-2xl font-mono tabular-nums"
            />
            <span className="text-xs text-muted-foreground mt-1">分钟</span>
          </div>
          <span className="text-2xl font-mono mb-5">:</span>
          <div className="flex flex-col items-center">
            <Input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) =>
                setSeconds(
                  Math.max(0, Math.min(59, Number(e.target.value) || 0)),
                )
              }
              className="w-20 h-14 text-center text-2xl font-mono tabular-nums"
            />
            <span className="text-xs text-muted-foreground mt-1">秒</span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'text-7xl font-mono font-bold tabular-nums',
            done && 'text-destructive animate-pulse',
          )}
        >
          {formatTimer(displayMs)}
        </div>
      )}

      {done && (
        <div className="text-sm text-destructive font-medium">时间到！</div>
      )}

      <div className="flex gap-2 mt-2">
        {!running ? (
          <Button onClick={start} disabled={done && remaining === 0 && minutes === 0 && seconds === 0}>
            <Play className="w-4 h-4" /> {remaining === null ? '开始' : '继续'}
          </Button>
        ) : (
          <Button variant="secondary" onClick={pause}>
            <Pause className="w-4 h-4" /> 暂停
          </Button>
        )}
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
      </div>
    </div>
  );
}

// === Alarm tab ===

function AlarmTab() {
  const notify = useOS((s) => s.notify);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(30);
  const [label, setLabel] = useState('');
  const [alarms, setAlarms] = useState<AlarmItem[]>([
    { id: 'a1', hour: 8, minute: 0, enabled: true, label: '起床' },
  ]);
  const [now, setNow] = useState(new Date());
  const lastTriggered = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const dateKey = now.toDateString();
    for (const a of alarms) {
      if (!a.enabled) continue;
      if (a.hour === now.getHours() && a.minute === now.getMinutes()) {
        const triggerKey = `${a.id}-${dateKey}`;
        if (!lastTriggered.current[triggerKey]) {
          lastTriggered.current[triggerKey] = true;
          notify({
            title: '闹钟提醒',
            body: `${pad(a.hour)}:${pad(a.minute)}${a.label ? ' · ' + a.label : ''}`,
            icon: '⏰',
          });
          playBeep(880, 1800);
        }
      }
    }
    // clean old trigger keys once a day boundary passes
    const newMap: Record<string, boolean> = {};
    for (const k of Object.keys(lastTriggered.current)) {
      if (k.endsWith(dateKey)) newMap[k] = true;
    }
    lastTriggered.current = newMap;
  }, [now, alarms, notify]);

  const addAlarm = () => {
    const id = `alm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setAlarms((a) => [
      ...a,
      { id, hour, minute, enabled: true, label: label.trim() || undefined },
    ]);
    setLabel('');
  };
  const toggleAlarm = (id: string) =>
    setAlarms((a) =>
      a.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    );
  const deleteAlarm = (id: string) =>
    setAlarms((a) => a.filter((x) => x.id !== id));

  return (
    <div className="h-full w-full flex flex-col gap-3 p-3 overflow-auto">
      <div className="text-center text-sm text-muted-foreground">
        当前时间{' '}
        <span className="font-mono tabular-nums">
          {pad(now.getHours())}:{pad(now.getMinutes())}:
          {pad(now.getSeconds())}
        </span>
      </div>

      <div className="flex flex-col gap-2 bg-muted/40 rounded-lg p-3">
        <div className="text-xs font-medium text-muted-foreground">添加闹钟</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="number"
            min="0"
            max="23"
            value={hour}
            onChange={(e) =>
              setHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))
            }
            className="w-16 text-center font-mono"
          />
          <span className="font-mono">:</span>
          <Input
            type="number"
            min="0"
            max="59"
            value={minute}
            onChange={(e) =>
              setMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
            }
            className="w-16 text-center font-mono"
          />
          <Input
            placeholder="标签 (可选)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 min-w-24"
          />
          <Button size="sm" onClick={addAlarm}>
            <Plus className="w-4 h-4" /> 添加
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 border rounded-md min-h-0">
        <div className="p-2 flex flex-col gap-1.5">
          {alarms.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              暂无闹钟
            </div>
          ) : (
            alarms.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {a.enabled ? (
                    <BellRing className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Bell className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={cn(
                        'text-2xl font-mono tabular-nums',
                        !a.enabled && 'text-muted-foreground',
                      )}
                    >
                      {pad(a.hour)}:{pad(a.minute)}
                    </div>
                    {a.label && (
                      <div className="text-xs text-muted-foreground truncate">
                        {a.label}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={a.enabled}
                    onCheckedChange={() => toggleAlarm(a.id)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => deleteAlarm(a.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

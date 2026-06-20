'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Upload,
  ListMusic,
  Music2,
  Disc3,
} from 'lucide-react';

interface Note {
  freq: number;
  dur: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  notes?: Note[];
  buffer?: AudioBuffer;
  accent: string;
  uploaded?: boolean;
}

const FREQ: Record<string, number> = {
  rest: 0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
};

function n(name: keyof typeof FREQ, dur: number): Note {
  return { freq: FREQ[name], dur };
}

function trackDuration(t: Track): number {
  if (t.buffer) return t.buffer.duration;
  return (t.notes || []).reduce((a, x) => a + x.dur, 0);
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const BUILTIN_TRACKS: Track[] = [
  {
    id: 'twinkle',
    title: '小星星',
    artist: '传统童谣',
    accent: '#ec4899',
    notes: [
      n('C4', 0.4), n('C4', 0.4), n('G4', 0.4), n('G4', 0.4),
      n('A4', 0.4), n('A4', 0.4), n('G4', 0.8),
      n('F4', 0.4), n('F4', 0.4), n('E4', 0.4), n('E4', 0.4),
      n('D4', 0.4), n('D4', 0.4), n('C4', 0.8),
      n('G4', 0.4), n('G4', 0.4), n('F4', 0.4), n('F4', 0.4),
      n('E4', 0.4), n('E4', 0.4), n('D4', 0.8),
      n('G4', 0.4), n('G4', 0.4), n('F4', 0.4), n('F4', 0.4),
      n('E4', 0.4), n('E4', 0.4), n('D4', 0.8),
      n('C4', 0.4), n('C4', 0.4), n('G4', 0.4), n('G4', 0.4),
      n('A4', 0.4), n('A4', 0.4), n('G4', 0.8),
      n('F4', 0.4), n('F4', 0.4), n('E4', 0.4), n('E4', 0.4),
      n('D4', 0.4), n('D4', 0.4), n('C4', 0.8),
    ],
  },
  {
    id: 'ode',
    title: '欢乐颂',
    artist: '贝多芬',
    accent: '#f59e0b',
    notes: [
      n('E4', 0.4), n('E4', 0.4), n('F4', 0.4), n('G4', 0.4),
      n('G4', 0.4), n('F4', 0.4), n('E4', 0.4), n('D4', 0.4),
      n('C4', 0.4), n('C4', 0.4), n('D4', 0.4), n('E4', 0.4),
      n('E4', 0.6), n('D4', 0.2), n('D4', 0.9),
      n('E4', 0.4), n('E4', 0.4), n('F4', 0.4), n('G4', 0.4),
      n('G4', 0.4), n('F4', 0.4), n('E4', 0.4), n('D4', 0.4),
      n('C4', 0.4), n('C4', 0.4), n('D4', 0.4), n('E4', 0.4),
      n('D4', 0.6), n('C4', 0.2), n('C4', 0.9),
    ],
  },
  {
    id: 'birthday',
    title: '生日快乐',
    artist: '传统歌曲',
    accent: '#10b981',
    notes: [
      n('C4', 0.3), n('C4', 0.2), n('D4', 0.5), n('C4', 0.5),
      n('F4', 0.5), n('E4', 0.9),
      n('C4', 0.3), n('C4', 0.2), n('D4', 0.5), n('C4', 0.5),
      n('G4', 0.5), n('F4', 0.9),
      n('C4', 0.3), n('C4', 0.2), n('C5', 0.5), n('A4', 0.5),
      n('F4', 0.5), n('E4', 0.5), n('D4', 0.9),
      n('A4', 0.3), n('A4', 0.2), n('G4', 0.5), n('F4', 0.5),
      n('G4', 0.5), n('F4', 0.9),
    ],
  },
  {
    id: 'mary',
    title: '玛丽有只小羊羔',
    artist: '传统童谣',
    accent: '#06b6d4',
    notes: [
      n('E4', 0.4), n('D4', 0.4), n('C4', 0.4), n('D4', 0.4),
      n('E4', 0.4), n('E4', 0.4), n('E4', 0.8),
      n('D4', 0.4), n('D4', 0.4), n('D4', 0.8),
      n('E4', 0.4), n('G4', 0.4), n('G4', 0.8),
      n('E4', 0.4), n('D4', 0.4), n('C4', 0.4), n('D4', 0.4),
      n('E4', 0.4), n('E4', 0.4), n('E4', 0.4), n('E4', 0.4),
      n('D4', 0.4), n('D4', 0.4), n('E4', 0.4), n('D4', 0.4),
      n('C4', 0.9),
    ],
  },
];

export function MusicPlayer({ win }: { win: WindowInstance }) {
  const settings = useOS((s) => s.settings);
  const updateSettings = useOS((s) => s.updateSettings);
  const notify = useOS((s) => s.notify);

  const [tracks, setTracks] = useState<Track[]>(BUILTIN_TRACKS);
  const [curIdx, setCurIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [uploading, setUploading] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeNodesRef = useRef<
    { osc?: OscillatorNode; gain: GainNode; src?: AudioBufferSourceNode }[]
  >([]);
  const playStartRef = useRef<{ ctxTime: number; offset: number }>({
    ctxTime: 0,
    offset: 0,
  });
  const pauseOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const vizRafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // mirror state into refs for use inside rAF / timeouts
  const tracksRef = useRef(tracks);
  const curIdxRef = useRef(curIdx);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const volumeRef = useRef(settings.volume);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    curIdxRef.current = curIdx;
  }, [curIdx]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  useEffect(() => {
    volumeRef.current = settings.volume;
  }, [settings.volume]);

  const curTrack = tracks[curIdx];
  const duration = curTrack ? trackDuration(curTrack) : 0;

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = volumeRef.current / 100;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
      analyserRef.current = analyser;
    }
    return audioCtxRef.current;
  }, []);

  const stopAllNodes = useCallback(() => {
    for (const node of activeNodesRef.current) {
      try {
        node.osc?.stop();
      } catch {}
      try {
        node.osc?.disconnect();
      } catch {}
      try {
        node.src?.stop();
      } catch {}
      try {
        node.src?.disconnect();
      } catch {}
      try {
        node.gain.disconnect();
      } catch {}
    }
    activeNodesRef.current = [];
  }, []);

  const scheduleNotes = useCallback(
    (track: Track, startCtxTime: number, offset: number) => {
      const ctx = audioCtxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return startCtxTime;
      const vol = volumeRef.current / 100;

      if (track.buffer) {
        const src = ctx.createBufferSource();
        src.buffer = track.buffer;
        const g = ctx.createGain();
        g.gain.value = vol;
        src.connect(g);
        g.connect(master);
        try {
          src.start(startCtxTime, Math.max(0, offset));
        } catch {}
        activeNodesRef.current.push({ gain: g, src });
        return (
          startCtxTime + Math.max(0, track.buffer.duration - Math.max(0, offset))
        );
      }

      let t = 0;
      let end = startCtxTime;
      const notes = track.notes || [];
      for (const note of notes) {
        if (t >= offset - 0.001) {
          if (note.freq > 0) {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = note.freq;
            const g = ctx.createGain();
            osc.connect(g);
            g.connect(master);
            const peak = 0.22 * vol;
            const attack = 0.02;
            const decay = 0.05;
            const sustain = peak * 0.7;
            const release = 0.06;
            const noteStart = startCtxTime + (t - offset);
            const noteDur = note.dur;
            g.gain.setValueAtTime(0, noteStart);
            g.gain.linearRampToValueAtTime(peak, noteStart + attack);
            g.gain.linearRampToValueAtTime(
              sustain,
              noteStart + attack + decay,
            );
            const sustainEnd = noteStart + Math.max(attack + decay + 0.001, noteDur - release);
            g.gain.setValueAtTime(sustain, sustainEnd);
            g.gain.linearRampToValueAtTime(0, noteStart + noteDur);
            osc.start(noteStart);
            osc.stop(noteStart + noteDur + 0.02);
            activeNodesRef.current.push({ osc, gain: g });
          }
          end = startCtxTime + (t - offset) + note.dur;
        }
        t += note.dur;
      }
      return end;
    },
    [],
  );

  const playIndex = useCallback(
    (idx: number, offset = 0) => {
      const ctx = ensureCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      stopAllNodes();
      const track = tracksRef.current[idx];
      if (!track) return;
      const startCtxTime = ctx.currentTime + 0.06;
      playStartRef.current = { ctxTime: startCtxTime, offset };
      scheduleNotes(track, startCtxTime, offset);
      isPlayingRef.current = true;
      setIsPlaying(true);
      setElapsed(offset);
    },
    [ensureCtx, scheduleNotes, stopAllNodes],
  );

  const advance = useCallback(() => {
    const idx = curIdxRef.current;
    const rep = repeatRef.current;
    const shuf = shuffleRef.current;
    const list = tracksRef.current;
    if (rep === 'one') {
      playIndex(idx, 0);
      return;
    }
    let next: number;
    if (shuf && list.length > 1) {
      next = idx;
      while (next === idx) next = Math.floor(Math.random() * list.length);
    } else if (idx + 1 < list.length) {
      next = idx + 1;
    } else if (rep === 'all') {
      next = 0;
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setElapsed(0);
      pauseOffsetRef.current = 0;
      return;
    }
    curIdxRef.current = next;
    setCurIdx(next);
    playIndex(next, 0);
  }, [playIndex]);

  // main ticking loop (elapsed + advance)
  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      if (!isPlayingRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx) {
        const e =
          ctx.currentTime -
          playStartRef.current.ctxTime +
          playStartRef.current.offset;
        const dur = trackDuration(tracksRef.current[curIdxRef.current]);
        if (e >= dur) {
          setElapsed(dur);
          advance();
        } else {
          setElapsed(e);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, advance]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const e =
          ctx.currentTime -
          playStartRef.current.ctxTime +
          playStartRef.current.offset;
        const dur = trackDuration(tracksRef.current[curIdxRef.current]);
        pauseOffsetRef.current = Math.min(e, dur);
      }
      stopAllNodes();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      const offset = pauseOffsetRef.current;
      const dur = trackDuration(tracksRef.current[curIdxRef.current]);
      const start = offset >= dur - 0.05 ? 0 : offset;
      pauseOffsetRef.current = start;
      playIndex(curIdxRef.current, start);
    }
  }, [playIndex, stopAllNodes]);

  const skipTo = useCallback(
    (dir: 1 | -1) => {
      const list = tracksRef.current;
      const idx = curIdxRef.current;
      let next: number;
      if (shuffleRef.current && list.length > 1) {
        next = idx;
        while (next === idx) next = Math.floor(Math.random() * list.length);
      } else {
        next = (idx + dir + list.length) % list.length;
      }
      pauseOffsetRef.current = 0;
      curIdxRef.current = next;
      setCurIdx(next);
      if (isPlayingRef.current) {
        playIndex(next, 0);
      } else {
        setElapsed(0);
      }
    },
    [playIndex],
  );

  const selectTrack = useCallback(
    (idx: number) => {
      pauseOffsetRef.current = 0;
      curIdxRef.current = idx;
      setCurIdx(idx);
      playIndex(idx, 0);
    },
    [playIndex],
  );

  const seek = useCallback(
    (val: number[]) => {
      const t = val[0] ?? 0;
      pauseOffsetRef.current = t;
      if (isPlayingRef.current) {
        playIndex(curIdxRef.current, t);
      } else {
        setElapsed(t);
      }
    },
    [playIndex],
  );

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      const ctx = ensureCtx();
      const newTracks: Track[] = [];
      for (const file of Array.from(files)) {
        try {
          const buf = await file.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(buf.slice(0));
          newTracks.push({
            id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: file.name.replace(/\.[^.]+$/, ''),
            artist: '本地音乐',
            buffer: audioBuf,
            accent: '#8b5cf6',
            uploaded: true,
          });
        } catch {
          notify({ title: '上传失败', body: `无法解码: ${file.name}` });
        }
      }
      if (newTracks.length > 0) {
        setTracks((t) => [...t, ...newTracks]);
        notify({
          title: '上传成功',
          body: `已添加 ${newTracks.length} 首音乐到播放列表`,
        });
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [ensureCtx, notify],
  );

  // keep master gain in sync with settings.volume
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        settings.volume / 100,
        audioCtxRef.current.currentTime,
        0.02,
      );
    }
  }, [settings.volume]);

  // visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const dpr = window.devicePixelRatio || 1;
    const draw = () => {
      vizRafRef.current = requestAnimationFrame(draw);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = Math.max(1, cw * dpr);
        canvas.height = Math.max(1, ch * dpr);
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      const analyser = analyserRef.current;
      const bars = 40;
      if (!analyser) {
        // idle waveform
        ctx2d.lineWidth = 2 * dpr;
        ctx2d.strokeStyle = settings.accent + '60';
        ctx2d.beginPath();
        for (let i = 0; i < w; i += 2) {
          const y = h / 2 + Math.sin(i * 0.05 + Date.now() * 0.002) * 4 * dpr;
          if (i === 0) ctx2d.moveTo(i, y);
          else ctx2d.lineTo(i, y);
        }
        ctx2d.stroke();
        return;
      }
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const step = Math.max(1, Math.floor(buf.length / bars));
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        let v = 0;
        for (let j = 0; j < step; j++) v += buf[i * step + j] || 0;
        v = v / step / 255;
        const bh = Math.max(2 * dpr, v * h);
        const grad = ctx2d.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, settings.accent);
        grad.addColorStop(1, curTrack?.accent || settings.accent);
        ctx2d.fillStyle = grad;
        const x = i * bw + 1;
        ctx2d.fillRect(x, h - bh, Math.max(1, bw - 2), bh);
      }
    };
    vizRafRef.current = requestAnimationFrame(draw);
    return () => {
      if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);
      vizRafRef.current = null;
    };
  }, [settings.accent, curTrack]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllNodes();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (vizRafRef.current) cancelAnimationFrame(vizRafRef.current);
      const ctx = audioCtxRef.current;
      if (ctx) {
        ctx.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stopAllNodes]);

  const progressPct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <div
      data-win-id={win.id}
      className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
    >
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Disc3 className="size-4" style={{ color: settings.accent }} />
          <span>音乐播放器</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={onUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">上传音乐</span>
          </Button>
          <Button
            variant={showPlaylist ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            onClick={() => setShowPlaylist((v) => !v)}
            aria-label="播放列表"
          >
            <ListMusic className="size-4" />
          </Button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* main player */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 min-h-0 overflow-y-auto">
          {/* album art */}
          <div
            className="relative size-36 sm:size-40 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: `linear-gradient(135deg, ${curTrack?.accent || settings.accent}, ${settings.accent})`,
            }}
          >
            <Music2
              className={cn(
                'size-12 text-white/90 transition-transform',
                isPlaying && 'animate-spin',
              )}
              style={{ animationDuration: '4s' }}
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl" />
          </div>

          {/* track info */}
          <div className="text-center min-w-0 w-full">
            <div className="font-semibold text-base truncate">
              {curTrack?.title || '无曲目'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {curTrack?.artist || '—'}
            </div>
          </div>

          {/* visualizer */}
          <div className="w-full h-14 rounded-lg bg-muted/50 overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>

          {/* progress */}
          <div className="w-full space-y-1">
            <Slider
              value={[elapsed]}
              min={0}
              max={Math.max(0.1, duration)}
              step={0.1}
              onValueChange={seek}
              className="cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{fmt(elapsed)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <Button
              variant={shuffle ? 'secondary' : 'ghost'}
              size="icon"
              className="size-9"
              onClick={() => setShuffle((v) => !v)}
              aria-label="随机播放"
            >
              <Shuffle className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => skipTo(-1)}
              aria-label="上一首"
            >
              <SkipBack className="size-5" />
            </Button>
            <Button
              size="icon"
              className="size-12 rounded-full"
              onClick={togglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
              style={{ backgroundColor: settings.accent }}
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 translate-x-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => skipTo(1)}
              aria-label="下一首"
            >
              <SkipForward className="size-5" />
            </Button>
            <Button
              variant={repeat !== 'off' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-9"
              onClick={cycleRepeat}
              aria-label="循环模式"
            >
              {repeat === 'one' ? (
                <Repeat1 className="size-4" />
              ) : (
                <Repeat className="size-4" />
              )}
            </Button>
          </div>

          {/* volume */}
          <div className="w-full flex items-center gap-2 max-w-xs">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() =>
                updateSettings({ volume: settings.volume > 0 ? 0 : 70 })
              }
              aria-label="静音"
            >
              {settings.volume === 0 ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
            <Slider
              value={[settings.volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => updateSettings({ volume: v[0] ?? 0 })}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {settings.volume}
            </span>
          </div>
        </div>

        {/* playlist */}
        {showPlaylist && (
          <aside className="w-full sm:w-60 md:w-64 border-t sm:border-t-0 sm:border-l border-border bg-muted/30 flex flex-col min-h-0 max-h-[40%] sm:max-h-none">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border flex items-center justify-between">
              <span>播放列表 ({tracks.length})</span>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <ul className="p-1.5 space-y-0.5">
                {tracks.map((t, i) => (
                  <li key={t.id}>
                    <button
                      onClick={() => selectTrack(i)}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-md flex items-center gap-2.5 transition-colors',
                        i === curIdx
                          ? 'bg-primary/15 text-foreground'
                          : 'hover:bg-accent/60 text-muted-foreground',
                      )}
                    >
                      <span
                        className="size-8 rounded-md shrink-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${t.accent}, ${settings.accent})`,
                        }}
                      >
                        {i === curIdx && isPlaying ? (
                          <Pause className="size-3.5 text-white" />
                        ) : (
                          <Play className="size-3.5 text-white translate-x-0.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium truncate text-foreground">
                          {t.title}
                        </span>
                        <span className="block text-[10px] truncate">
                          {t.artist} · {fmt(trackDuration(t))}
                        </span>
                      </span>
                      {t.uploaded && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground shrink-0">
                          本地
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Brush,
  Eraser,
  Minus,
  Square,
  Circle,
  PaintBucket,
  Undo2,
  Redo2,
  Trash2,
  Save,
} from 'lucide-react';

type Tool = 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill';

const SWATCHES = [
  '#000000', '#ffffff', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#78350f', '#14532d', '#1e3a8a', '#581c87',
];

const MAX_HISTORY = 20;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function Paint({ win }: { win: WindowInstance }) {
  const settings = useOS((s) => s.settings);
  const createFile = useOS((s) => s.createFile);
  const notify = useOS((s) => s.notify);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const opacityRef = useRef(opacity);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  useEffect(() => {
    opacityRef.current = opacity;
  }, [opacity]);

  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const snapshotRef = useRef<ImageData | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMidRef = useRef<{ x: number; y: number } | null>(null);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const setupCanvas = useCallback((preserve: boolean) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    let saved: HTMLCanvasElement | null = null;
    if (preserve && canvas.width > 0 && canvas.height > 0) {
      saved = document.createElement('canvas');
      saved.width = canvas.width;
      saved.height = canvas.height;
      const sctx = saved.getContext('2d');
      if (sctx) sctx.drawImage(canvas, 0, 0);
    }

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (saved) {
      ctx.drawImage(saved, 0, 0, w, h);
    }
    ctxRef.current = ctx;
  }, []);

  // initial setup
  useEffect(() => {
    setupCanvas(false);
  }, [setupCanvas]);

  // resize observer — preserve content on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setupCanvas(true));
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [setupCanvas]);

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(img);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const img = undoStackRef.current.pop();
    if (!img) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(current);
    ctx.putImageData(img, 0, 0);
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const img = redoStackRef.current.pop();
    if (!img) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(current);
    ctx.putImageData(img, 0, 0);
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    pushUndo();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [pushUndo]);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    createFile({
      name: `画图_${Date.now()}.png`,
      type: 'file',
      parentId: 'folder_pictures',
      mimeType: 'image/png',
      dataUrl,
    });
    notify({ title: '保存成功', body: '画作已保存到图片文件夹' });
  }, [createFile, notify]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const applyStyle = (ctx: CanvasRenderingContext2D, isEraser: boolean) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = sizeRef.current;
    ctx.globalAlpha = opacityRef.current / 100;
    ctx.globalCompositeOperation = 'source-over';
    if (isEraser) {
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.strokeStyle = colorRef.current;
      ctx.fillStyle = colorRef.current;
    }
  };

  const resetCtx = (ctx: CanvasRenderingContext2D) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  const floodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = dprRef.current;
    const px = Math.floor(startX * dpr);
    const py = Math.floor(startY * dpr);
    const w = canvas.width;
    const h = canvas.height;
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const startIdx = (py * w + px) * 4;
    const tr = data[startIdx];
    const tg = data[startIdx + 1];
    const tb = data[startIdx + 2];
    const ta = data[startIdx + 3];
    const [fr, fg, fb] = hexToRgb(colorRef.current);
    const fa = Math.round((opacityRef.current / 100) * 255);
    if (tr === fr && tg === fg && tb === fb && ta === fa) return;
    const matches = (i: number) =>
      data[i] === tr &&
      data[i + 1] === tg &&
      data[i + 2] === tb &&
      data[i + 3] === ta;
    const stack: number[] = [px, py];
    const visited = new Uint8Array(w * h);
    let guard = 0;
    const max = w * h;
    while (stack.length > 0 && guard < max + 10) {
      guard++;
      const y = stack.pop() as number;
      const x = stack.pop() as number;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const pi = y * w + x;
      if (visited[pi]) continue;
      const i = pi * 4;
      if (!matches(i)) continue;
      visited[pi] = 1;
      data[i] = fr;
      data[i + 1] = fg;
      data[i + 2] = fb;
      data[i + 3] = fa;
      stack.push(x + 1, y);
      stack.push(x - 1, y);
      stack.push(x, y + 1);
      stack.push(x, y - 1);
    }
    ctx.putImageData(img, 0, 0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const p = getPoint(e);
    const t = toolRef.current;
    pushUndo();
    drawingRef.current = true;
    startPointRef.current = p;
    lastPointRef.current = p;
    lastMidRef.current = null;

    if (t === 'fill') {
      floodFill(p.x, p.y);
      drawingRef.current = false;
      return;
    }

    if (t === 'brush' || t === 'eraser') {
      applyStyle(ctx, t === 'eraser');
      ctx.beginPath();
      ctx.arc(p.x, p.y, sizeRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
      resetCtx(ctx);
      return;
    }

    // shape tools: snapshot for live preview
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const p = getPoint(e);
    const t = toolRef.current;

    if (t === 'brush' || t === 'eraser') {
      applyStyle(ctx, t === 'eraser');
      const last = lastPointRef.current;
      if (last) {
        const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
        const prevMid = lastMidRef.current;
        ctx.beginPath();
        if (prevMid) {
          ctx.moveTo(prevMid.x, prevMid.y);
          ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
        } else {
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(mid.x, mid.y);
        }
        ctx.stroke();
        lastMidRef.current = mid;
      }
      lastPointRef.current = p;
      resetCtx(ctx);
      return;
    }

    if (t === 'line' || t === 'rect' || t === 'ellipse') {
      const canvas = canvasRef.current;
      if (canvas && snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      applyStyle(ctx, false);
      const start = startPointRef.current;
      if (start) {
        ctx.beginPath();
        if (t === 'line') {
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (t === 'rect') {
          ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
        } else if (t === 'ellipse') {
          const cx = (start.x + p.x) / 2;
          const cy = (start.y + p.y) / 2;
          const rx = Math.abs(p.x - start.x) / 2;
          const ry = Math.abs(p.y - start.y) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      resetCtx(ctx);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    snapshotRef.current = null;
    startPointRef.current = null;
    lastPointRef.current = null;
    lastMidRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const tools: { id: Tool; icon: typeof Brush; label: string }[] = [
    { id: 'brush', icon: Brush, label: '画笔' },
    { id: 'eraser', icon: Eraser, label: '橡皮' },
    { id: 'line', icon: Minus, label: '直线' },
    { id: 'rect', icon: Square, label: '矩形' },
    { id: 'ellipse', icon: Circle, label: '椭圆' },
    { id: 'fill', icon: PaintBucket, label: '填充' },
  ];

  return (
    <div
      data-win-id={win.id}
      className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
    >
      {/* toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-border bg-muted/50 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-background">
          {tools.map((t) => (
            <Button
              key={t.id}
              variant={tool === t.id ? 'default' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setTool(t.id)}
              aria-label={t.label}
              title={t.label}
              style={tool === t.id ? { backgroundColor: settings.accent } : undefined}
            >
              <t.icon className="size-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* color picker */}
        <div className="flex items-center gap-1.5">
          <div className="relative size-8 rounded-md overflow-hidden border border-border shadow-sm">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="选择颜色"
            />
            <div className="size-full" style={{ backgroundColor: color }} />
          </div>
          <div className="hidden lg:grid grid-cols-8 gap-1">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-5 rounded border transition-transform hover:scale-110',
                  color === c
                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                    : 'border-border',
                )}
                style={{ backgroundColor: c }}
                aria-label={`颜色 ${c}`}
              />
            ))}
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* size */}
        <div className="flex items-center gap-2 w-28 sm:w-32">
          <span className="text-xs text-muted-foreground shrink-0">粗细</span>
          <Slider
            value={[size]}
            min={1}
            max={50}
            step={1}
            onValueChange={(v) => setSize(v[0] ?? 1)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-5 tabular-nums">
            {size}
          </span>
        </div>

        {/* opacity */}
        <div className="hidden md:flex items-center gap-2 w-28">
          <span className="text-xs text-muted-foreground shrink-0">不透明</span>
          <Slider
            value={[opacity]}
            min={1}
            max={100}
            step={1}
            onValueChange={(v) => setOpacity(v[0] ?? 100)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 tabular-nums">
            {opacity}%
          </span>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={undo}
            disabled={!canUndo}
            aria-label="撤销"
            title="撤销"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={redo}
            disabled={!canRedo}
            aria-label="重做"
            title="重做"
          >
            <Redo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={clearCanvas}
            aria-label="清空"
            title="清空"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={save}
            style={{ backgroundColor: settings.accent }}
          >
            <Save className="size-4" />
            <span className="hidden sm:inline">保存</span>
          </Button>
        </div>
      </div>

      {/* canvas area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="block touch-none cursor-crosshair bg-white"
          style={{ width: '100%', height: '100%' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {/* current tool indicator */}
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border pointer-events-none">
          {tools.find((t) => t.id === tool)?.label} · {size}px
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Play,
  Pause,
  Grid2x2,
  Info,
  Trash2,
} from 'lucide-react';

interface GalleryImage {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  fromStore: boolean;
  fileId?: string;
}

function buildSvg(stops: string[], shapes: string, title: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
${stops.map((s, i) => `<stop offset="${(i * 100) / Math.max(1, stops.length - 1)}%" stop-color="${s}"/>`).join('\n')}
</linearGradient>
<radialGradient id="r" cx="0.5" cy="0.4" r="0.6">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="600" height="600" fill="url(#g)"/>
${shapes}
<rect width="600" height="600" fill="url(#r)"/>
<text x="30" y="560" font-family="sans-serif" font-size="28" fill="#ffffff" fill-opacity="0.85">${title}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_SVGS: { id: string; name: string; stops: string[]; shapes: string }[] = [
  {
    id: 'sample_sunset',
    name: '黄昏',
    stops: ['#f59e0b', '#ef4444', '#7c2d12'],
    shapes: '<circle cx="300" cy="300" r="120" fill="#fff7ed" fill-opacity="0.85"/><circle cx="300" cy="300" r="180" fill="#fff7ed" fill-opacity="0.15"/>',
  },
  {
    id: 'sample_aurora',
    name: '极光',
    stops: ['#10b981', '#06b6d4', '#1e3a8a'],
    shapes: '<path d="M0 380 Q150 250 300 360 T600 320 L600 600 L0 600 Z" fill="#042f2e" fill-opacity="0.55"/><path d="M0 430 Q180 330 360 420 T600 400 L600 600 L0 600 Z" fill="#022c22" fill-opacity="0.55"/>',
  },
  {
    id: 'sample_blossom',
    name: '樱花',
    stops: ['#fce7f3', '#ec4899', '#be185d'],
    shapes: '<circle cx="150" cy="180" r="40" fill="#fff" fill-opacity="0.7"/><circle cx="440" cy="120" r="28" fill="#fff" fill-opacity="0.6"/><circle cx="480" cy="380" r="36" fill="#fff" fill-opacity="0.65"/><circle cx="120" cy="420" r="24" fill="#fff" fill-opacity="0.55"/>',
  },
  {
    id: 'sample_ocean',
    name: '深海',
    stops: ['#06b6d4', '#0e7490', '#0c4a6e'],
    shapes: '<path d="M0 420 Q150 360 300 420 T600 410 L600 600 L0 600 Z" fill="#082f49" fill-opacity="0.6"/><circle cx="460" cy="160" r="50" fill="#bae6fd" fill-opacity="0.4"/>',
  },
  {
    id: 'sample_forest',
    name: '森林',
    stops: ['#84cc16', '#15803d', '#14532d'],
    shapes: '<polygon points="300,120 220,300 380,300" fill="#052e16" fill-opacity="0.7"/><polygon points="300,200 200,400 400,400" fill="#052e16" fill-opacity="0.6"/><rect x="285" y="380" width="30" height="80" fill="#451a03"/>',
  },
  {
    id: 'sample_nebula',
    name: '星云',
    stops: ['#1e1b4b', '#7c3aed', '#db2777'],
    shapes: '<circle cx="200" cy="220" r="90" fill="#a78bfa" fill-opacity="0.45"/><circle cx="420" cy="320" r="70" fill="#f9a8d4" fill-opacity="0.4"/><g fill="#fff"><circle cx="80" cy="90" r="2"/><circle cx="520" cy="120" r="1.5"/><circle cx="150" cy="450" r="2"/><circle cx="480" cy="470" r="1.5"/><circle cx="350" cy="80" r="1.5"/><circle cx="540" cy="280" r="2"/></g>',
  },
];

function buildSamples(): GalleryImage[] {
  return SAMPLE_SVGS.map((s) => ({
    id: s.id,
    name: s.name,
    src: buildSvg(s.stops, s.shapes, s.name),
    width: 600,
    height: 600,
    fromStore: false,
  }));
}

export function ImageViewer({ win }: { win: WindowInstance }) {
  const settings = useOS((s) => s.settings);
  const files = useOS((s) => s.files);
  const createFile = useOS((s) => s.createFile);
  const deleteFile = useOS((s) => s.deleteFile);
  const notify = useOS((s) => s.notify);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const storeImages: GalleryImage[] = useMemo(() => {
    return files
      .filter(
        (f) =>
          f.type === 'file' &&
          f.parentId === 'folder_pictures' &&
          f.dataUrl &&
          f.dataUrl.startsWith('data:image'),
      )
      .map((f) => ({
        id: f.id,
        name: f.name,
        src: f.dataUrl!,
        width: 0,
        height: 0,
        fromStore: true,
        fileId: f.id,
      }));
  }, [files]);

  const samples = useMemo(() => buildSamples(), []);

  const images: GalleryImage[] = useMemo(
    () => [...storeImages, ...samples],
    [storeImages, samples],
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [loadedDims, setLoadedDims] = useState<{
    id: string;
    w: number;
    h: number;
  } | null>(null);

  // load dimensions for the currently selected image (async only)
  useEffect(() => {
    if (selected === null) return;
    const img = images[selected];
    if (!img) return;
    if (img.width && img.height) return;
    const i = new Image();
    i.onload = () =>
      setLoadedDims({ id: img.id, w: i.naturalWidth, h: i.naturalHeight });
    i.src = img.src;
  }, [selected, images]);

  const dims = (() => {
    if (selected === null) return null;
    const img = images[selected];
    if (!img) return null;
    if (img.width && img.height) return { w: img.width, h: img.height };
    if (loadedDims && loadedDims.id === img.id)
      return { w: loadedDims.w, h: loadedDims.h };
    return null;
  })();

  const openImage = useCallback((idx: number) => {
    setSelected(idx);
    setZoom(1);
    setRotation(0);
  }, []);

  const closeImage = useCallback(() => {
    setSelected(null);
    setSlideshow(false);
    setZoom(1);
    setRotation(0);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (images.length === 0) return;
      setSelected((cur) => {
        if (cur === null) return 0;
        const next = (cur + dir + images.length) % images.length;
        return next;
      });
      setZoom(1);
      setRotation(0);
    },
    [images.length],
  );

  // slideshow
  useEffect(() => {
    if (!slideshow || selected === null) return;
    const id = window.setInterval(() => step(1), 3000);
    return () => window.clearInterval(id);
  }, [slideshow, selected, step]);

  const onUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list || list.length === 0) return;
      let count = 0;
      let processed = 0;
      const total = list.length;
      Array.from(list).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          createFile({
            name: file.name,
            type: 'file',
            parentId: 'folder_pictures',
            mimeType: file.type || 'image/png',
            dataUrl,
          });
          count += 1;
          processed += 1;
          if (processed === total) {
            setRefreshKey((k) => k + 1);
            notify({
              title: '上传成功',
              body: `已保存 ${count} 张图片到相册`,
            });
          }
        };
        reader.onerror = () => {
          processed += 1;
          if (processed === total) {
            setRefreshKey((k) => k + 1);
            notify({ title: '上传完成', body: `已保存 ${count} 张图片` });
          }
        };
        reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [createFile, notify],
  );

  const removeImage = useCallback(
    (idx: number) => {
      const img = images[idx];
      if (img?.fromStore && img.fileId) {
        deleteFile(img.fileId);
        notify({ title: '已删除', body: `已从相册移除 ${img.name}` });
      }
    },
    [images, deleteFile, notify],
  );

  // keyboard nav
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Escape') closeImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, step, closeImage]);

  // refreshKey is used to trigger re-render after upload; reference it
  void refreshKey;

  const selectedImg = selected !== null ? images[selected] : null;

  return (
    <div
      data-win-id={win.id}
      className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
    >
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="size-4" style={{ color: settings.accent }} />
          <span>图片浏览器</span>
          <span className="text-xs text-muted-foreground">({images.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">上传图片</span>
          </Button>
          {selected !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSelected(null)}
              aria-label="返回网格"
            >
              <Grid2x2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
            <ImageIcon className="size-12 opacity-30" />
            <div className="text-sm">暂无图片</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              上传第一张图片
            </Button>
          </div>
        ) : selected === null ? (
          <ScrollArea className="h-full w-full">
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => openImage(idx)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40 hover:ring-2 hover:ring-primary/60 transition-all"
                >
                  <img
                    src={img.src}
                    alt={img.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <div className="text-[11px] text-white truncate">{img.name}</div>
                  </div>
                  {img.fromStore && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
                      相册
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full w-full flex flex-col bg-neutral-950">
            {/* viewer area */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center">
              <img
                src={selectedImg?.src}
                alt={selectedImg?.name || ''}
                className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  cursor: zoom > 1 ? 'grab' : 'default',
                }}
                draggable={false}
              />

              {/* prev / next */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={() => step(-1)}
                aria-label="上一张"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={() => step(1)}
                aria-label="下一张"
              >
                <ChevronRight className="size-5" />
              </Button>

              {/* counter */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-white/90 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
                {(selected ?? 0) + 1} / {images.length}
              </div>
            </div>

            {/* toolbar */}
            <div className="shrink-0 bg-neutral-900/95 border-t border-neutral-800 px-3 py-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))}
                    aria-label="缩小"
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="text-xs text-neutral-400 w-12 text-center tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                    aria-label="放大"
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    onClick={() => setZoom(1)}
                    aria-label="重置缩放"
                  >
                    <span className="text-[10px]">1:1</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    onClick={() => setRotation((r) => r - 90)}
                    aria-label="左旋"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    onClick={() => setRotation((r) => r + 90)}
                    aria-label="右旋"
                  >
                    <RotateCw className="size-4" />
                  </Button>
                  <Button
                    variant={slideshow ? 'secondary' : 'ghost'}
                    size="icon"
                    className="size-8 text-neutral-300 hover:text-white hover:bg-neutral-800 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    onClick={() => setSlideshow((v) => !v)}
                    aria-label="幻灯片"
                  >
                    {slideshow ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </Button>
                  {selectedImg?.fromStore && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-neutral-300 hover:text-red-400 hover:bg-neutral-800"
                      onClick={() => {
                        removeImage(selected ?? 0);
                        if (images.length <= 1) closeImage();
                        else step(1);
                      }}
                      aria-label="删除"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* info line */}
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400 min-w-0">
                <Info className="size-3 shrink-0" />
                <span className="truncate">{selectedImg?.name}</span>
                {dims && (
                  <span className="shrink-0 tabular-nums">
                    · {dims.w} × {dims.h}
                  </span>
                )}
                {slideshow && (
                  <span className="shrink-0 ml-auto text-emerald-400">
                    幻灯片播放中
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

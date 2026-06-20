'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Save,
  Download,
  Eye,
  Code,
  Columns2,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileQuestion,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode2,
  Table as TableIcon,
  IndentIncrease,
} from 'lucide-react';
import { useOS } from '@/lib/os/store';
import type { VFile, WindowInstance } from '@/lib/os/types';
import ReactMarkdown from 'react-markdown';

type FileKind =
  | 'text'
  | 'markdown'
  | 'html'
  | 'json'
  | 'csv'
  | 'code'
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'unknown';

const EXT_MAP: Record<string, FileKind> = {
  txt: 'text',
  log: 'text',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  html: 'html',
  htm: 'html',
  json: 'json',
  csv: 'csv',
  tsv: 'csv',
  js: 'code',
  mjs: 'code',
  cjs: 'code',
  ts: 'code',
  tsx: 'code',
  jsx: 'code',
  py: 'code',
  java: 'code',
  c: 'code',
  h: 'code',
  cpp: 'code',
  cc: 'code',
  cs: 'code',
  go: 'code',
  rs: 'code',
  rb: 'code',
  php: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  css: 'code',
  scss: 'code',
  less: 'code',
  xml: 'code',
  svg: 'image',
  yml: 'code',
  yaml: 'code',
  toml: 'code',
  ini: 'code',
  sql: 'code',
  lua: 'code',
  r: 'code',
  swift: 'code',
  kt: 'code',
  dart: 'code',
  vue: 'code',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  ico: 'image',
  avif: 'image',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  oga: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
  opus: 'audio',
  mp4: 'video',
  m4v: 'video',
  webm: 'video',
  mov: 'video',
  mkv: 'video',
  avi: 'video',
  ogv: 'video',
  pdf: 'pdf',
};

function detectKind(f: VFile | undefined): FileKind {
  if (!f) return 'unknown';
  if (f.mimeType) {
    if (f.mimeType.startsWith('image/')) return f.mimeType === 'image/svg+xml' ? 'image' : 'image';
    if (f.mimeType.startsWith('audio/')) return 'audio';
    if (f.mimeType.startsWith('video/')) return 'video';
    if (f.mimeType === 'application/pdf') return 'pdf';
    if (f.mimeType === 'text/markdown') return 'markdown';
    if (f.mimeType === 'text/html') return 'html';
    if (f.mimeType === 'application/json' || f.mimeType === 'text/json') return 'json';
    if (f.mimeType === 'text/csv') return 'csv';
    if (f.mimeType.startsWith('text/')) return 'text';
  }
  const ext = f.name.split('.').pop()?.toLowerCase() || '';
  return EXT_MAP[ext] || 'unknown';
}

const KIND_LABEL: Record<FileKind, string> = {
  text: 'TXT',
  markdown: 'Markdown',
  html: 'HTML',
  json: 'JSON',
  csv: 'CSV',
  code: 'Code',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  pdf: 'PDF',
  unknown: 'File',
};

const EDITABLE: FileKind[] = ['text', 'markdown', 'html', 'json', 'csv', 'code'];

export function FileViewer({ win }: { win: WindowInstance }) {
  const files = useOS((s) => s.files);
  const updateFile = useOS((s) => s.updateFile);
  const setWindowTitle = useOS((s) => s.setWindowTitle);
  const notify = useOS((s) => s.notify);

  const fileId = (win.state?.fileId as string) || null;
  const file = useMemo(() => files.find((f) => f.id === fileId) || null, [files, fileId]);
  const kind = detectKind(file || undefined);
  const editable = EDITABLE.includes(kind);

  // editor text state — initialized lazily from file content
  const [text, setText] = useState<string>(() => file?.content ?? '');
  const [prevFileId, setPrevFileId] = useState<string | null>(fileId);
  if (fileId !== prevFileId) {
    setPrevFileId(fileId);
    setText(file?.content ?? '');
    setViewMode('edit');
  }

  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const dirty = editable && file ? text !== (file.content ?? '') : false;

  // window title
  useEffect(() => {
    setWindowTitle(win.id, file ? `${file.name} — 文件查看器` : '文件查看器');
  }, [file?.name, win.id, setWindowTitle]);

  // reset view mode when kind changes to a non-editable type
  useEffect(() => {
    if (!editable) setViewMode('preview');
    else if (viewMode === 'preview' && kind === 'csv') setViewMode('edit');
  }, [kind]);

  const handleSave = useCallback(() => {
    if (!file || !editable) return;
    updateFile(file.id, { content: text });
    notify({ title: '已保存', body: file.name, icon: '💾' });
  }, [file, editable, text, updateFile, notify]);

  const handleDownload = useCallback(() => {
    if (!file) return;
    let blob: Blob;
    if (file.dataUrl) {
      // dataUrl -> blob
      const [meta, b64] = file.dataUrl.split(',');
      const mime = /:(.*?);/.exec(meta)?.[1] || 'application/octet-stream';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blob = new Blob([arr], { type: mime });
    } else {
      blob = new Blob([file.content ?? ''], { type: file.mimeType || 'text/plain' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [file]);

  // keyboard: Ctrl+S save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileQuestion className="w-10 h-10 opacity-40" />
        <p className="text-sm">未选择文件</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 h-11 px-3 border-b border-border bg-muted/40 shrink-0">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1 min-w-0">{file.name}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
          {KIND_LABEL[kind]}
        </span>
        {dirty && (
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="未保存" />
        )}
        {editable && (
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
            <ModeBtn active={viewMode === 'edit'} onClick={() => setViewMode('edit')} icon={<Code className="w-3.5 h-3.5" />} label="编辑" />
            {kind === 'markdown' || kind === 'html' ? (
              <ModeBtn active={viewMode === 'split'} onClick={() => setViewMode('split')} icon={<Columns2 className="w-3.5 h-3.5" />} label="分屏" />
            ) : null}
            {kind === 'markdown' || kind === 'html' || kind === 'csv' ? (
              <ModeBtn active={viewMode === 'preview'} onClick={() => setViewMode('preview')} icon={<Eye className="w-3.5 h-3.5" />} label="预览" />
            ) : null}
          </div>
        )}
        {kind === 'json' && (
          <button
            onClick={() => {
              try {
                const obj = JSON.parse(text);
                setText(JSON.stringify(obj, null, 2));
                notify({ title: '已格式化', body: 'JSON 已重新缩进', icon: '✨' });
              } catch (e) {
                notify({ title: '格式化失败', body: 'JSON 语法错误', icon: '⚠' });
              }
            }}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center shrink-0"
            title="格式化 JSON"
          >
            <IndentIncrease className="w-4 h-4" />
          </button>
        )}
        {editable && (
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-40 transition shrink-0"
          >
            <Save className="w-4 h-4" /> 保存
          </button>
        )}
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center shrink-0"
          title="下载"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {kind === 'text' || kind === 'code' || kind === 'json' ? (
          <CodeEditor value={text} onChange={setText} readOnly={!editable} />
        ) : kind === 'markdown' ? (
          viewMode === 'edit' ? (
            <CodeEditor value={text} onChange={setText} readOnly={!editable} />
          ) : viewMode === 'preview' ? (
            <MarkdownPreview source={text} />
          ) : (
            <div className="flex h-full">
              <div className="w-1/2 border-r border-border min-w-0">
                <CodeEditor value={text} onChange={setText} readOnly={!editable} />
              </div>
              <div className="w-1/2 min-w-0">
                <MarkdownPreview source={text} />
              </div>
            </div>
          )
        ) : kind === 'html' ? (
          viewMode === 'edit' ? (
            <CodeEditor value={text} onChange={setText} readOnly={!editable} lang="html" />
          ) : viewMode === 'preview' ? (
            <iframe srcDoc={text} title="html-preview" className="w-full h-full border-0 bg-white" sandbox="allow-scripts" />
          ) : (
            <div className="flex h-full">
              <div className="w-1/2 border-r border-border min-w-0">
                <CodeEditor value={text} onChange={setText} readOnly={!editable} lang="html" />
              </div>
              <iframe srcDoc={text} title="html-preview" className="w-1/2 border-0 bg-white" sandbox="allow-scripts" />
            </div>
          )
        ) : kind === 'csv' ? (
          viewMode === 'preview' ? (
            <CsvTable source={text} />
          ) : (
            <CodeEditor value={text} onChange={setText} readOnly={!editable} />
          )
        ) : kind === 'image' ? (
          <ImagePanel src={file.dataUrl || ''} name={file.name} />
        ) : kind === 'audio' ? (
          <AudioPanel src={file.dataUrl || ''} name={file.name} />
        ) : kind === 'video' ? (
          <VideoPanel src={file.dataUrl || ''} name={file.name} />
        ) : kind === 'pdf' ? (
          <iframe src={file.dataUrl} title="pdf" className="w-full h-full border-0 bg-white" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <FileQuestion className="w-10 h-10 opacity-40" />
            <p className="text-sm">无法预览此文件格式</p>
            <button
              onClick={handleDownload}
              className="mt-2 flex items-center gap-1.5 px-3 h-8 rounded-lg bg-muted hover:bg-accent text-sm transition"
            >
              <Download className="w-4 h-4" /> 下载到本地查看
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2 h-7 rounded-md text-xs transition ${
        active ? 'bg-background shadow-sm' : 'hover:bg-accent/60 text-muted-foreground'
      }`}
    >
      {icon}
    </button>
  );
}

// --- Code editor with line numbers ---
function CodeEditor({
  value,
  onChange,
  readOnly,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  lang?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split('\n');

  const syncScroll = () => {
    if (taRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  // tab inserts two spaces
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = value.slice(0, start) + '  ' + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex h-full bg-background">
      <div
        ref={gutterRef}
        className="select-none text-right py-3 px-2 text-xs text-muted-foreground/60 font-mono leading-[1.6] overflow-hidden bg-muted/30 border-r border-border shrink-0"
        style={{ minWidth: 48 }}
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        data-lang={lang}
        className="flex-1 w-full p-3 font-mono text-sm leading-[1.6] bg-transparent outline-none resize-none thin-scroll"
        placeholder={readOnly ? '' : '开始输入…'}
      />
    </div>
  );
}

// --- Markdown preview ---
function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="h-full overflow-y-auto thin-scroll bg-background">
      <div className="prose prose-sm dark:prose-invert max-w-none p-6 markdown-body">
        <ReactMarkdown>{source || '*暂无内容*'}</ReactMarkdown>
      </div>
    </div>
  );
}

// --- CSV table ---
function CsvTable({ source }: { source: string }) {
  const rows = useMemo(() => {
    const lines = source.split(/\r?\n/).filter((l) => l.length > 0);
    return lines.map((line) => parseCsvLine(line));
  }, [source]);
  if (rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">空 CSV</div>;
  }
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <div className="h-full overflow-auto thin-scroll bg-background">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="text-left px-3 py-2 border-b border-border font-medium whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-accent/40">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 border-b border-border/50 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQ = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

// --- Image panel ---
function ImagePanel({ src, name }: { src: string; name: string }) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  return (
    <div className="flex flex-col h-full bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:24px_24px]">
      <div className="flex items-center gap-1 px-2 h-9 border-b border-border bg-background/80 backdrop-blur shrink-0">
        <ToolBtn onClick={() => setZoom((z) => Math.max(0.1, z - 0.2))} icon={<ZoomOut className="w-4 h-4" />} />
        <span className="text-xs tabular-nums w-12 text-center text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn onClick={() => setZoom((z) => Math.min(8, z + 0.2))} icon={<ZoomIn className="w-4 h-4" />} />
        <ToolBtn onClick={() => { setZoom(1); setRot(0); }} icon={<Maximize2 className="w-4 h-4" />} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn onClick={() => setRot((r) => r - 90)} icon={<RotateCcw className="w-4 h-4" />} />
        <ToolBtn onClick={() => setRot((r) => r + 90)} icon={<RotateCw className="w-4 h-4" />} />
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[50%]">{name}</span>
        {dims && (
          <span className="text-xs text-muted-foreground shrink-0">
            {dims.w}×{dims.h}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto thin-scroll flex items-center justify-center p-4">
        {src ? (
          <img
            src={src}
            alt={name}
            style={{ transform: `scale(${zoom}) rotate(${rot}deg)`, maxWidth: zoom === 1 ? '100%' : 'none', maxHeight: zoom === 1 ? '100%' : 'none' }}
            className="object-contain shadow-lg transition-transform"
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        ) : (
          <div className="text-sm text-muted-foreground">无图像数据</div>
        )}
      </div>
    </div>
  );
}

// --- Audio panel ---
function AudioPanel({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 gap-6 p-8">
      <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center shadow-2xl">
        <Music className="w-16 h-16 text-white" />
      </div>
      <div className="text-center">
        <div className="font-medium truncate max-w-sm">{name}</div>
        <div className="text-xs text-muted-foreground mt-1">音频文件</div>
      </div>
      {src ? (
        <audio ref={audioRef} src={src} controls className="w-full max-w-md" />
      ) : (
        <div className="text-sm text-muted-foreground">无音频数据</div>
      )}
    </div>
  );
}

// --- Video panel ---
function VideoPanel({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center px-3 h-9 bg-black/60 text-white text-xs shrink-0">
        <Video className="w-4 h-4 mr-2" />
        <span className="truncate">{name}</span>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {src ? (
          <video src={src} controls className="max-w-full max-h-full" />
        ) : (
          <div className="text-sm text-white/60">无视频数据</div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
    >
      {icon}
    </button>
  );
}

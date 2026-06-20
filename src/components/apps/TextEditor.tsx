'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOS } from '@/lib/os/store';
import type { VFile, WindowInstance } from '@/lib/os/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  FileText,
  FilePlus,
  Save,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Minus,
  Plus,
  Type,
} from 'lucide-react';

function isTextFile(f: VFile): boolean {
  if (f.type !== 'file') return false;
  if (f.mimeType && f.mimeType.startsWith('text/')) return true;
  if (!f.mimeType) return true;
  return f.name.toLowerCase().endsWith('.txt');
}

export function TextEditor({ win }: { win: WindowInstance }) {
  const files = useOS((s) => s.files);
  const createFile = useOS((s) => s.createFile);
  const updateFile = useOS((s) => s.updateFile);
  const deleteFile = useOS((s) => s.deleteFile);
  const setWindowTitle = useOS((s) => s.setWindowTitle);
  const notify = useOS((s) => s.notify);

  const folderId =
    win.state && typeof win.state.folderId === 'string'
      ? (win.state.folderId as string)
      : null;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(win.width > 520);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (win.state && typeof win.state.fileId === 'string' ? (win.state.fileId as string) : null),
  );
  // Initialize the editor text from the effective file's content so that
  // reopening a saved document shows its persisted content on first render.
  const [text, setText] = useState<string>(() => {
    const id =
      (win.state && typeof win.state.fileId === 'string' ? (win.state.fileId as string) : null) ??
      files.find(isTextFile)?.id ??
      null;
    const f = id ? files.find((x) => x.id === id) : null;
    return f?.content ?? '';
  });
  const [fontSize, setFontSize] = useState(14);
  const [mono, setMono] = useState(false);

  const [renaming, setRenaming] = useState<VFile | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const pendingRef = useRef<{ id: string; content: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const textFiles = useMemo(() => files.filter(isTextFile), [files]);

  // Create an initial file once on mount if there are none (side-effect only).
  useEffect(() => {
    if (textFiles.length === 0) {
      createFile({
        name: '未命名.txt',
        type: 'file',
        parentId: folderId,
        content: '',
        mimeType: 'text/plain',
      });
    }
  }, []);

  // Fall back to the first available text file when nothing is selected.
  const effectiveId = selectedId ?? textFiles[0]?.id ?? null;

  const selected = useMemo(
    () => files.find((f) => f.id === effectiveId) || null,
    [files, effectiveId],
  );

  // Sync local text when the effective file changes (render-time adjustment).
  // NOTE: only local state here — store updates go in the effect below to avoid
  // triggering a setState in another component during render.
  const [prevEffId, setPrevEffId] = useState<string | null>(effectiveId);
  if (effectiveId !== prevEffId) {
    setPrevEffId(effectiveId);
    setText(selected?.content ?? '');
  }

  // Track recent file + focus editor when the effective file changes.
  useEffect(() => {
    if (!effectiveId) return;
    const sel = files.find((f) => f.id === effectiveId);
    if (sel) {
      useOS.getState().addRecentFile({ id: effectiveId, name: sel.name, appId: 'texteditor' });
    }
    const t = setTimeout(() => taRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [effectiveId, files]);

  // Update window title when the selected file's name changes
  useEffect(() => {
    if (selected) {
      setWindowTitle(win.id, `${selected.name} — 记事本`);
    } else {
      setWindowTitle(win.id, '记事本');
    }
  }, [selected?.name, selectedId, win.id]);

  const dirty = selected ? text !== (selected.content ?? '') : false;

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (pendingRef.current) {
      const { id, content } = pendingRef.current;
      updateFile(id, { content });
      pendingRef.current = null;
    }
  }, [updateFile]);

  const scheduleSave = useCallback(
    (id: string, content: string) => {
      pendingRef.current = { id, content };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (pendingRef.current) {
          const { id: pid, content: pc } = pendingRef.current;
          updateFile(pid, { content: pc });
          pendingRef.current = null;
        }
        saveTimer.current = null;
      }, 500);
    },
    [updateFile],
  );

  // Flush any pending save on unmount
  useEffect(() => {
    return () => flushSave();
  }, [flushSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (selected) {
      scheduleSave(selected.id, value);
      setWindowTitle(win.id, `${selected.name} — 记事本`);
    }
  };

  const handleSelect = (id: string) => {
    if (id === selectedId) return;
    flushSave();
    setSelectedId(id);
  };

  const handleNew = () => {
    flushSave();
    const id = createFile({
      name: '未命名.txt',
      type: 'file',
      parentId: folderId,
      content: '',
      mimeType: 'text/plain',
    });
    setSelectedId(id);
    setTimeout(() => taRef.current?.focus(), 30);
  };

  const handleSave = () => {
    if (!selected) return;
    flushSave();
    notify({ title: '已保存', body: `${selected.name} 已保存`, icon: '📝' });
  };

  const handleRenameStart = (f: VFile) => {
    setRenaming(f);
    setRenameValue(f.name);
  };

  const confirmRename = () => {
    if (renaming) {
      const name = renameValue.trim() || renaming.name;
      updateFile(renaming.id, { name });
      setRenaming(null);
    }
  };

  const handleDelete = (f: VFile) => {
    if (pendingRef.current?.id === f.id) {
      pendingRef.current = null;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    }
    deleteFile(f.id);
    if (selectedId === f.id) {
      const remaining = textFiles.filter((t) => t.id !== f.id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    notify({ title: '已删除', body: `${f.name} 已删除`, icon: '🗑️' });
  };

  // Counts
  const chars = text.length;
  const cjkCount = (
    text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []
  ).length;
  const tokens = text.trim() ? text.trim().split(/\s+/).length : 0;
  const totalWords = tokens + cjkCount;
  const lines = text ? text.split('\n').length : 1;

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      {sidebarOpen && (
        <aside className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
          <div className="flex items-center justify-between gap-1 px-2 h-9 border-b border-border">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">
              文件
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setSidebarOpen(false)}
              aria-label="收起侧边栏"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-1.5 space-y-0.5">
              {textFiles.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                  暂无文件
                </div>
              ) : (
                textFiles.map((f) => {
                  const active = selectedId === f.id;
                  const parent = f.parentId
                    ? files.find((p) => p.id === f.parentId)
                    : null;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelect(f.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(f.id);
                        }
                      }}
                      className={cn(
                        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        active && 'bg-accent',
                      )}
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{f.name}</div>
                        {parent && (
                          <div className="text-[10px] text-muted-foreground/80 truncate">
                            /{parent.name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label="重命名"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameStart(f);
                          }}
                          className="size-6 inline-flex items-center justify-center rounded hover:bg-background/80"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          aria-label="删除"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(f);
                          }}
                          className="size-6 inline-flex items-center justify-center rounded hover:bg-background/80 text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border">
            <Button onClick={handleNew} className="w-full" size="sm">
              <FilePlus className="size-4" /> 新建
            </Button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* toolbar */}
        <div className="flex items-center gap-1 px-2 h-10 border-b border-border bg-muted/20 flex-wrap">
          {!sidebarOpen && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setSidebarOpen(true)}
              aria-label="展开侧边栏"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={!selected}
          >
            <Save className="size-4" /> 保存
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selected && handleRenameStart(selected)}
            disabled={!selected}
          >
            <Pencil className="size-4" /> 重命名
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selected && handleDelete(selected)}
            disabled={!selected}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" /> 删除
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              aria-label="缩小字号"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="text-xs tabular-nums w-9 text-center text-muted-foreground">
              {fontSize}px
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setFontSize((s) => Math.min(36, s + 1))}
              aria-label="放大字号"
            >
              <Plus className="size-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button
              size="sm"
              variant={mono ? 'default' : 'ghost'}
              onClick={() => setMono((m) => !m)}
              aria-pressed={mono}
              className="gap-1"
            >
              <Type className="size-3.5" /> 等宽
            </Button>
          </div>
        </div>

        {/* editor body */}
        <div className="flex-1 min-h-0 relative">
          {selected ? (
            <textarea
              ref={taRef}
              value={text}
              onChange={handleChange}
              placeholder="开始输入..."
              spellCheck={false}
              aria-label="文本编辑区"
              className="absolute inset-0 w-full h-full resize-none border-0 bg-background text-foreground px-4 py-3 outline-none placeholder:text-muted-foreground/60"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
                fontFamily: mono
                  ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
                  : 'inherit',
                fieldSizing: 'fixed',
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="size-10 opacity-30" />
              <p className="text-sm">请选择一个文件或点击「新建」</p>
              <Button size="sm" onClick={handleNew}>
                <FilePlus className="size-4" /> 新建文件
              </Button>
            </div>
          )}
        </div>

        {/* status bar */}
        <div className="flex items-center gap-3 px-3 h-7 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <span className="truncate max-w-[40%]">
            {selected ? selected.name : '无文件'}
          </span>
          <Separator orientation="vertical" className="h-3.5" />
          <span
            className={cn(
              'flex items-center gap-1',
              dirty ? 'text-amber-500' : 'text-emerald-500',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                dirty ? 'bg-amber-500' : 'bg-emerald-500',
              )}
            />
            {dirty ? '未保存' : '已保存'}
          </span>
          <div className="ml-auto flex items-center gap-3 tabular-nums">
            <span>字符 {chars}</span>
            <span>词 {totalWords}</span>
            <span>行 {lines}</span>
          </div>
        </div>
      </div>

      {/* rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重命名文件</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') setRenaming(null);
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              取消
            </Button>
            <Button onClick={confirmRename}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

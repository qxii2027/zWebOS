'use client';

import { useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/os/store';
import type { VFile, WindowInstance } from '@/lib/os/types';

interface Entry {
  id: number;
  kind: 'output' | 'error' | 'input';
  text: string; // for input: the command; for others: full text
  prompt?: string; // for input: the prompt string at execution time
}

let ENTRY_ID = 0;
const nextId = () => ++ENTRY_ID;

const WELCOME = [
  'WebOS Terminal [Version 1.0.0]',
  '(c) WebOS Corporation. 保留所有权利。',
  '',
  '输入 "help" 查看可用命令, "apps" 查看已安装应用。',
  '',
].join('\n');

const HELP_LINES = [
  '可用命令:',
  '  help                显示此帮助',
  '  ls [path]           列出目录内容',
  '  cd <dir>            切换目录 (支持 .., /, ~)',
  '  pwd                 显示当前路径',
  '  cat <file>          查看文件内容',
  '  echo <text>         输出文本',
  '  mkdir <name>        创建文件夹',
  '  touch <name>        创建空文件',
  '  rm <name>           删除文件或文件夹',
  '  write <file> <text> 写入文件 (覆盖)',
  '  clear               清屏 (Ctrl+L)',
  '  date                显示当前时间',
  '  whoami              显示当前用户',
  '  history             显示命令历史',
  '  neofetch            显示系统信息',
  '  open <app>          打开应用 (如 open browser)',
  '  apps                列出已安装应用',
  '  theme <light|dark>  切换主题',
  '  exit                关闭终端',
];

function buildNeofetch(
  user: string,
  fileCount: number,
  appCount: number,
  theme: string,
): string[] {
  const uptimeMs =
    typeof performance !== 'undefined' ? performance.now() : 0;
  const totalSec = Math.floor(uptimeMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const uptime = `${h}h ${m}m ${s}s`;

  const logo = [
    '       _    _   ',
    '      | |  | |  ',
    '      | |__| | ___  _ __ ___  ',
    "      |  __  |/ _ \\| '__/ _ \\ ",
    '      | |  | | (_) | | |  __/ ',
    '      |_|  |_|\\___/|_|  \\___| ',
  ];
  const info = [
    user + '@webos',
    '-------------------------------',
    'OS:       WebOS 1.0',
    'Host:     Browser Sandbox',
    'Kernel:   NextJS 16',
    'Shell:    zsh-mock 1.0',
    'Terminal: WebOS Terminal',
    'CPU:      WebAssembly v1',
    'Memory:   4.0 GiB / 8.0 GiB',
    'Uptime:   ' + uptime,
    'Files:    ' + fileCount,
    'Apps:     ' + appCount,
    'Theme:    ' + theme,
  ];
  const maxLen = Math.max(logo.length, info.length);
  const lines: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    const l = (logo[i] || '').padEnd(28);
    const r = info[i] || '';
    lines.push(l + r);
  }
  return lines;
}

export function Terminal({ win }: { win: WindowInstance }) {
  const files = useOS((s) => s.files);
  const apps = useOS((s) => s.apps);
  const settings = useOS((s) => s.settings);
  const createFile = useOS((s) => s.createFile);
  const deleteFile = useOS((s) => s.deleteFile);
  const updateFile = useOS((s) => s.updateFile);
  const openApp = useOS((s) => s.openApp);
  const updateSettings = useOS((s) => s.updateSettings);
  const closeWindow = useOS((s) => s.closeWindow);

  const username = settings.username || 'user';

  // current working directory id; null = root
  const [cwd, setCwd] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { id: nextId(), kind: 'output', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const focusInput = () => inputRef.current?.focus();

  // ---------- path helpers (use closure-captured `files`) ----------
  const pwdPath = (cwdId: string | null): string => {
    if (cwdId === null) return '/';
    const parts: string[] = [];
    let cur: VFile | undefined = files.find((f) => f.id === cwdId);
    let safety = 0;
    while (cur && safety < 100) {
      parts.unshift(cur.name);
      const parentId = cur.parentId;
      cur = parentId ? files.find((f) => f.id === parentId) : undefined;
      safety++;
    }
    return '/' + parts.join('/');
  };

  const promptPath = (cwdId: string | null): string => {
    if (cwdId === null) return '~';
    return '~' + pwdPath(cwdId);
  };

  const resolvePath = (
    cwdId: string | null,
    rawArg: string,
  ): { ok: true; id: string | null } | { ok: false; msg: string } => {
    let arg = rawArg;
    if (arg === '~') arg = '/';
    else if (arg.startsWith('~/')) arg = '/' + arg.slice(2);

    let segments: string[];
    let cur: string | null;
    if (arg.startsWith('/')) {
      segments = arg.split('/').filter(Boolean);
      cur = null;
    } else {
      segments = arg.split('/').filter(Boolean);
      cur = cwdId;
    }
    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        if (cur === null) continue;
        const curFile = files.find((f) => f.id === cur);
        cur = curFile?.parentId ?? null;
        continue;
      }
      const child = files.find((f) => f.parentId === cur && f.name === seg);
      if (!child) {
        return { ok: false, msg: `路径不存在: ${rawArg}` };
      }
      cur = child.id;
    }
    return { ok: true, id: cur };
  };

  // ---------- output helpers ----------
  const push = (text: string, kind: Entry['kind'] = 'output') => {
    setEntries((prev) => [...prev, { id: nextId(), kind, text }]);
  };
  const pushMany = (lines: string[], kind: Entry['kind'] = 'output') => {
    push(lines.join('\n'), kind);
  };
  const pushInput = (raw: string, prompt: string) => {
    setEntries((prev) => [
      ...prev,
      { id: nextId(), kind: 'input', text: raw, prompt },
    ]);
  };

  // ---------- command runner ----------
  const runCommand = (raw: string) => {
    const user = settings.username || 'user';
    pushInput(raw, `${user}@webos:${promptPath(cwd)}$`);

    const trimmed = raw.trim();
    if (!trimmed) return;

    const newHistory = [...history, trimmed];
    setHistory(newHistory);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        pushMany(HELP_LINES);
        break;

      case 'ls': {
        const arg = args[0] || '.';
        const res = resolvePath(cwd, arg);
        if (!res.ok) {
          push(res.msg, 'error');
          break;
        }
        const children = files.filter((f) => f.parentId === res.id);
        if (children.length === 0) {
          push('(空目录)');
        } else {
          const sorted = [...children].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name, 'zh');
          });
          const lines = sorted.map((f) => {
            const tag = f.type === 'folder' ? '/' : '';
            return `${f.type === 'folder' ? 'd' : '-'}rw-r--r--  ${f.name}${tag}`;
          });
          pushMany(lines);
        }
        break;
      }

      case 'cd': {
        const arg = args[0] || '~';
        const res = resolvePath(cwd, arg);
        if (!res.ok) {
          push(res.msg, 'error');
          break;
        }
        const target =
          res.id === null ? undefined : files.find((f) => f.id === res.id);
        if (res.id !== null && target?.type !== 'folder') {
          push(`cd: 不是目录: ${arg}`, 'error');
          break;
        }
        setCwd(res.id);
        break;
      }

      case 'pwd':
        push(pwdPath(cwd));
        break;

      case 'cat': {
        if (!args[0]) {
          push('cat: 缺少文件参数', 'error');
          break;
        }
        const res = resolvePath(cwd, args[0]);
        if (!res.ok) {
          push(res.msg, 'error');
          break;
        }
        const f =
          res.id === null ? undefined : files.find((x) => x.id === res.id);
        if (!f || f.type !== 'file') {
          push(`cat: ${args[0]}: 不是文件`, 'error');
          break;
        }
        push(f.content || '');
        break;
      }

      case 'echo':
        push(args.join(' '));
        break;

      case 'mkdir': {
        if (!args[0]) {
          push('mkdir: 缺少名称', 'error');
          break;
        }
        const exists = files.find(
          (f) => f.parentId === cwd && f.name === args[0],
        );
        if (exists) {
          push(`mkdir: ${args[0]}: 已存在`, 'error');
          break;
        }
        createFile({
          name: args[0],
          type: 'folder',
          parentId: cwd,
        });
        push(`已创建文件夹: ${args[0]}`);
        break;
      }

      case 'touch': {
        if (!args[0]) {
          push('touch: 缺少名称', 'error');
          break;
        }
        const exists = files.find(
          (f) => f.parentId === cwd && f.name === args[0],
        );
        if (exists) {
          push(`touch: ${args[0]}: 已存在`);
          break;
        }
        createFile({
          name: args[0],
          type: 'file',
          parentId: cwd,
          content: '',
          mimeType: 'text/plain',
        });
        push(`已创建文件: ${args[0]}`);
        break;
      }

      case 'rm': {
        if (!args[0]) {
          push('rm: 缺少名称', 'error');
          break;
        }
        const res = resolvePath(cwd, args[0]);
        if (!res.ok) {
          push(res.msg, 'error');
          break;
        }
        if (res.id === null) {
          push('rm: 不能删除根目录', 'error');
          break;
        }
        deleteFile(res.id);
        push(`已删除: ${args[0]}`);
        break;
      }

      case 'write': {
        if (!args[0]) {
          push('write: 用法: write <file> <text...>', 'error');
          break;
        }
        const fileName = args[0];
        const content = args.slice(1).join(' ');
        const existing = files.find(
          (f) =>
            f.parentId === cwd &&
            f.name === fileName &&
            f.type === 'file',
        );
        if (existing) {
          updateFile(existing.id, { content });
        } else {
          createFile({
            name: fileName,
            type: 'file',
            parentId: cwd,
            content,
            mimeType: 'text/plain',
          });
        }
        push(`已写入 ${fileName} (${content.length} 字符)`);
        break;
      }

      case 'clear':
        setEntries([]);
        break;

      case 'date':
        push(new Date().toLocaleString());
        break;

      case 'whoami':
        push(settings.username || 'user');
        break;

      case 'history':
        pushMany(
          newHistory.length === 0
            ? ['(无历史)']
            : newHistory.map(
                (h, i) => `  ${String(i + 1).padStart(3, ' ')}  ${h}`,
              ),
        );
        break;

      case 'neofetch':
        pushMany(
          buildNeofetch(
            settings.username || 'user',
            files.length,
            apps.length,
            settings.theme,
          ),
        );
        break;

      case 'open': {
        if (!args[0]) {
          push('open: 用法: open <app>', 'error');
          break;
        }
        const name = args.join(' ').toLowerCase();
        const app = apps.find(
          (a) =>
            a.id.toLowerCase() === name ||
            a.name.toLowerCase() === name ||
            a.component.toLowerCase() === name,
        );
        if (!app) {
          push(`open: 未找到应用: ${args.join(' ')}`, 'error');
          break;
        }
        openApp(app.id);
        push(`正在打开: ${app.name}`);
        break;
      }

      case 'apps':
        pushMany(
          apps.length === 0
            ? ['(无应用)']
            : apps.map((a) => `${a.icon}  ${a.name} (${a.id})`),
        );
        break;

      case 'theme': {
        const t = args[0]?.toLowerCase();
        if (t !== 'light' && t !== 'dark') {
          push('theme: 用法: theme <light|dark>', 'error');
          break;
        }
        updateSettings({ theme: t });
        push(`主题已切换为: ${t}`);
        break;
      }

      case 'exit':
        closeWindow(win.id);
        break;

      default:
        push(`${cmd}: command not found`, 'error');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input;
      setInput('');
      runCommand(value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx =
        historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0 || historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= history.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(newIdx);
        setInput(history[newIdx] || '');
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setEntries([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      push('^C', 'output');
    }
  };

  const livePrompt = `${username}@webos:${promptPath(cwd)}$`;

  return (
    <div
      className="h-full w-full flex flex-col bg-zinc-950 text-zinc-200 font-mono text-[13px] leading-relaxed selection:bg-emerald-500/30"
      onClick={focusInput}
      role="log"
      aria-label="终端输出"
    >
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2"
      >
        {entries.map((e) => {
          if (e.kind === 'input') {
            return (
              <div
                key={e.id}
                className="whitespace-pre-wrap break-words leading-relaxed"
              >
                <span className="text-emerald-400">{e.prompt || ''}</span>
                {' '}
                <span className="text-zinc-100">{e.text}</span>
              </div>
            );
          }
          if (e.kind === 'error') {
            return (
              <div
                key={e.id}
                className="whitespace-pre-wrap break-words text-red-400 leading-relaxed"
              >
                {e.text}
              </div>
            );
          }
          return (
            <div
              key={e.id}
              className="whitespace-pre-wrap break-words text-zinc-300 leading-relaxed"
            >
              {e.text}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-zinc-800/80 shrink-0 bg-zinc-950">
        <span className="text-emerald-400 shrink-0 select-none">
          {livePrompt}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-zinc-100 caret-emerald-400 placeholder:text-zinc-600"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="终端输入"
          autoFocus
        />
      </div>
    </div>
  );
}

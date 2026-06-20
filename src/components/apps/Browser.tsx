'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Star,
  StarOff,
  Plus,
  X,
  Lock,
  Download,
  ExternalLink,
  Globe,
  Search,
  Clock,
  Shield,
} from 'lucide-react';
import { useOS, uid } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';
import { AppIcon } from '@/components/os/AppIcon';

interface Tab {
  id: string;
  url: string;
  inputUrl: string;
  title: string;
  history: string[];
  histIndex: number;
  loading: boolean;
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) return 'https://' + v;
  // treat as search
  return 'https://www.bing.com/search?q=' + encodeURIComponent(v);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const QUICK_LINKS = [
  { name: 'Bing', url: 'https://www.bing.com', icon: '🔍', color: 'from-sky-400 to-blue-600' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📚', color: 'from-slate-500 to-slate-700' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', color: 'from-gray-700 to-gray-900' },
  { name: 'MDN', url: 'https://developer.mozilla.org', icon: '📖', color: 'from-blue-500 to-indigo-700' },
  { name: 'CodePen', url: 'https://codepen.io', icon: '✏️', color: 'from-gray-600 to-gray-800' },
  { name: 'Example', url: 'https://example.com', icon: '🌐', color: 'from-emerald-400 to-teal-600' },
  { name: 'Z.ai', url: 'https://chat.z.ai', icon: '🤖', color: 'from-violet-500 to-purple-700' },
  { name: 'WebOS', url: 'about:home', icon: '🖥️', color: 'from-indigo-500 to-violet-700' },
];

export function Browser({ win }: { win: WindowInstance }) {
  const bookmarks = useOS((s) => s.bookmarks);
  const addBookmark = useOS((s) => s.addBookmark);
  const removeBookmark = useOS((s) => s.removeBookmark);
  const history = useOS((s) => s.history);
  const addHistory = useOS((s) => s.addHistory);
  const clearHistory = useOS((s) => s.clearHistory);
  const installApp = useOS((s) => s.installApp);
  const openApp = useOS((s) => s.openApp);
  const notify = useOS((s) => s.notify);
  const setWindowState = useOS((s) => s.setWindowState);
  const setWindowTitle = useOS((s) => s.setWindowTitle);

  const persisted = (win.state?.tabs as Tab[] | undefined) || undefined;
  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (persisted && persisted.length) return persisted;
    return [
      {
        id: uid('tab'),
        url: 'about:home',
        inputUrl: '',
        title: '新标签页',
        history: ['about:home'],
        histIndex: 0,
        loading: false,
      },
    ];
  });
  const [activeId, setActiveId] = useState<string>(() => (win.state?.activeTabId as string) || tabs[0].id);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];

  // persist to window state
  useEffect(() => {
    setWindowState(win.id, { tabs, activeTabId: activeId });
  }, [tabs, activeId, win.id, setWindowState]);

  // update window title
  useEffect(() => {
    setWindowTitle(win.id, activeTab?.title ? `${activeTab.title} — 浏览器` : '浏览器');
  }, [activeTab?.title, win.id, setWindowTitle]);

  const updateTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const navigate = useCallback(
    (tabId: string, url: string) => {
      setTabs((ts) =>
        ts.map((t) => {
          if (t.id !== tabId) return t;
          const newHist = t.history.slice(0, t.histIndex + 1);
          newHist.push(url);
          return {
            ...t,
            url,
            inputUrl: url === 'about:home' ? '' : url,
            history: newHist,
            histIndex: newHist.length - 1,
            loading: url !== 'about:home',
            title: url === 'about:home' ? '新标签页' : hostOf(url),
          };
        }),
      );
      if (url !== 'about:home') {
        addHistory({ title: hostOf(url), url });
      }
    },
    [addHistory],
  );

  const goBack = (tab: Tab) => {
    if (tab.histIndex <= 0) return;
    const ni = tab.histIndex - 1;
    const url = tab.history[ni];
    updateTab(tab.id, {
      histIndex: ni,
      url,
      inputUrl: url === 'about:home' ? '' : url,
      loading: url !== 'about:home',
      title: url === 'about:home' ? '新标签页' : hostOf(url),
    });
  };
  const goForward = (tab: Tab) => {
    if (tab.histIndex >= tab.history.length - 1) return;
    const ni = tab.histIndex + 1;
    const url = tab.history[ni];
    updateTab(tab.id, {
      histIndex: ni,
      url,
      inputUrl: url === 'about:home' ? '' : url,
      loading: url !== 'about:home',
      title: url === 'about:home' ? '新标签页' : hostOf(url),
    });
  };
  const reload = (tab: Tab) => {
    if (tab.url === 'about:home') return;
    updateTab(tab.id, { loading: true });
    // force iframe reload by bumping a key via url re-set
    setTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, url: t.url } : t)));
  };

  const newTab = () => {
    const t: Tab = {
      id: uid('tab'),
      url: 'about:home',
      inputUrl: '',
      title: '新标签页',
      history: ['about:home'],
      histIndex: 0,
      loading: false,
    };
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  };
  const closeTab = (id: string) => {
    setTabs((ts) => {
      const idx = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (next.length === 0) {
        const t: Tab = {
          id: uid('tab'),
          url: 'about:home',
          inputUrl: '',
          title: '新标签页',
          history: ['about:home'],
          histIndex: 0,
          loading: false,
        };
        setActiveId(t.id);
        return [t];
      }
      if (id === activeId) {
        setActiveId(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
  };

  const isBookmarked = activeTab && bookmarks.some((b) => b.url === activeTab.url);
  const toggleBookmark = () => {
    if (!activeTab || activeTab.url === 'about:home') return;
    if (isBookmarked) {
      const bm = bookmarks.find((b) => b.url === activeTab.url);
      if (bm) removeBookmark(bm.id);
      notify({ title: '已移除书签', body: hostOf(activeTab.url), icon: '⭐' });
    } else {
      addBookmark({ title: activeTab.title, url: activeTab.url });
      notify({ title: '已添加书签', body: activeTab.title, icon: '⭐' });
    }
  };

  const installAsApp = () => {
    if (!activeTab || activeTab.url === 'about:home') return;
    const host = hostOf(activeTab.url);
    const id = 'webapp_' + host.replace(/[^a-z0-9]/gi, '_');
    const app = {
      id,
      name: activeTab.title || host,
      icon: '🌐',
      component: 'webapp' as const,
      color: 'from-sky-400 to-cyan-600',
      url: activeTab.url,
      defaultSize: { width: 980, height: 660 },
      minSize: { width: 360, height: 360 },
    };
    installApp(app);
    notify({ title: '应用已安装', body: `${app.name} 已添加到开始菜单`, icon: '📦' });
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = normalizeUrl(activeTab.inputUrl);
      if (url) navigate(activeTab.id, url);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tab strip */}
      <div className="flex items-center gap-1 h-9 px-2 bg-muted/50 border-b border-border overflow-x-auto no-scrollbar shrink-0">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-lg max-w-[180px] cursor-default transition ${
              t.id === activeId ? 'bg-background' : 'hover:bg-accent/60'
            }`}
          >
            {t.loading ? (
              <RotateCw className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs truncate flex-1">{t.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
              className="w-5 h-5 rounded hover:bg-accent flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={newTab}
          className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center shrink-0"
          title="新建标签页"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-11 bg-background border-b border-border shrink-0">
        <button
          onClick={() => goBack(activeTab)}
          disabled={activeTab.histIndex <= 0}
          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center"
          title="后退"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => goForward(activeTab)}
          disabled={activeTab.histIndex >= activeTab.history.length - 1}
          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center"
          title="前进"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => reload(activeTab)}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          title="刷新"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(activeTab.id, 'about:home')}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          title="主页"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-2 h-8 px-3 mx-1 rounded-full bg-muted border border-border focus-within:ring-2 focus-within:ring-primary/30">
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={activeTab.inputUrl}
            onChange={(e) => updateTab(activeTab.id, { inputUrl: e.target.value })}
            onKeyDown={onInputKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="搜索或输入网址"
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
        </div>

        <button
          onClick={toggleBookmark}
          disabled={activeTab.url === 'about:home'}
          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center"
          title={isBookmarked ? '移除书签' : '添加书签'}
        >
          {isBookmarked ? (
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => setShowBookmarks((v) => !v)}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          title="书签"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={installAsApp}
          disabled={activeTab.url === 'about:home'}
          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center"
          title="安装为应用"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Bookmarks/history bar */}
      {showBookmarks && (
        <div className="absolute right-2 top-[84px] z-50 w-72 max-h-80 rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden win-pop">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium">书签与历史</span>
            <button
              onClick={() => clearHistory()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清除历史
            </button>
          </div>
          <div className="overflow-y-auto max-h-64">
            {bookmarks.length > 0 && (
              <div className="px-2 pt-2 text-[10px] font-medium text-muted-foreground uppercase">
                书签
              </div>
            )}
            {bookmarks.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  navigate(activeTab.id, b.url);
                  setShowBookmarks(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-sm text-left"
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                <span className="truncate">{b.title}</span>
              </button>
            ))}
            {history.length > 0 && (
              <div className="px-2 pt-2 text-[10px] font-medium text-muted-foreground uppercase">
                历史
              </div>
            )}
            {history.slice(0, 30).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  navigate(activeTab.id, h.url);
                  setShowBookmarks(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-sm text-left"
              >
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{h.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(h.time).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
            ))}
            {bookmarks.length === 0 && history.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                暂无书签或历史
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 relative bg-white">
        {activeTab.url === 'about:home' ? (
          <NewTabPage
            onNavigate={(url) => navigate(activeTab.id, url)}
            bookmarks={bookmarks}
            history={history}
          />
        ) : (
          <>
            <iframe
              key={activeTab.url + activeTab.id}
              src={activeTab.url}
              title={activeTab.title}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
              referrerPolicy="no-referrer"
              onLoad={() => updateTab(activeTab.id, { loading: false })}
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs backdrop-blur-md opacity-0 hover:opacity-100 transition pointer-events-none">
              <Shield className="w-3 h-3" />
              <span>若页面空白，该网站可能禁止嵌入</span>
              <a
                href={activeTab.url}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto flex items-center gap-1 underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" /> 外部打开
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NewTabPage({
  onNavigate,
  bookmarks,
  history,
}: {
  onNavigate: (url: string) => void;
  bookmarks: { id: string; title: string; url: string }[];
  history: { id: string; title: string; url: string; time: number }[];
}) {
  const [q, setQ] = useState('');
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
        <AppIcon icon="globe" color="from-sky-500 to-cyan-600" size={64} rounded="rounded-2xl" />
        <h1 className="text-2xl font-light mt-3 mb-6 text-foreground">WebOS 浏览器</h1>
        <div className="w-full flex items-center gap-2 h-12 px-4 rounded-full bg-white dark:bg-slate-800 border border-border shadow-sm">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) {
                onNavigate(normalizeUrl(q));
              }
            }}
            placeholder="搜索或输入网址"
            className="flex-1 bg-transparent outline-none text-base"
          />
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8 w-full">
          {QUICK_LINKS.map((l) => (
            <button
              key={l.url}
              onClick={() => onNavigate(l.url)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${l.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition`}
              >
                {l.icon}
              </span>
              <span className="text-xs text-foreground/80">{l.name}</span>
            </button>
          ))}
        </div>

        {bookmarks.length > 0 && (
          <div className="w-full mt-8">
            <div className="text-xs font-medium text-muted-foreground mb-2">书签</div>
            <div className="flex flex-wrap gap-2">
              {bookmarks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onNavigate(b.url)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-border text-sm hover:shadow-sm transition"
                >
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="max-w-[160px] truncate">{b.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="w-full mt-6">
            <div className="text-xs font-medium text-muted-foreground mb-2">最近访问</div>
            <div className="space-y-1">
              {history.slice(0, 6).map((h) => (
                <button
                  key={h.id}
                  onClick={() => onNavigate(h.url)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-sm text-left transition"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate flex-1">{h.title}</span>
                  <span className="text-[10px] text-muted-foreground">{h.url}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

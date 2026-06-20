'use client';

import { useState } from 'react';
import { Download, Trash2, Check, Search, Globe, Plus } from 'lucide-react';
import { useOS, uid } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';
import { WebappIcon } from '@/components/os/AppIcon';

interface CatalogItem {
  name: string;
  url: string;
  category: string;
  desc: string;
}

const CATALOG: CatalogItem[] = [
  { name: 'Bing', url: 'https://www.bing.com', category: '搜索', desc: '微软搜索引擎' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', category: '参考', desc: '自由的百科全书' },
  { name: 'GitHub', url: 'https://github.com', category: '开发', desc: '全球最大代码托管平台' },
  { name: 'MDN', url: 'https://developer.mozilla.org', category: '开发', desc: 'Web 开发者文档' },
  { name: 'CodePen', url: 'https://codepen.io', category: '开发', desc: '在线代码编辑器' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', category: '开发', desc: '编程问答社区' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', category: '资讯', desc: '黑客新闻' },
  { name: 'Reddit', url: 'https://www.reddit.com', category: '社区', desc: '兴趣社区' },
  { name: 'Z.ai', url: 'https://chat.z.ai', category: 'AI', desc: 'AI 对话助手' },
  { name: 'Example', url: 'https://example.com', category: '其他', desc: '示例网站' },
  { name: 'Lobsters', url: 'https://lobste.rs', category: '资讯', desc: '技术链接聚合' },
  { name: 'Project Gutenberg', url: 'https://www.gutenberg.org', category: '阅读', desc: '免费电子书' },
];

export function AppStore({ win }: { win: WindowInstance }) {
  const apps = useOS((s) => s.apps);
  const installApp = useOS((s) => s.installApp);
  const uninstallApp = useOS((s) => s.uninstallApp);
  const openApp = useOS((s) => s.openApp);
  const notify = useOS((s) => s.notify);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  const installedIds = new Set(apps.map((a) => a.id));

  const categories = ['全部', ...Array.from(new Set(CATALOG.map((c) => c.category)))];
  const filtered = CATALOG.filter(
    (c) =>
      (category === '全部' || c.category === category) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const installedApps = apps.filter((a) => !a.builtin);

  const install = (item: { name: string; url: string }) => {
    const id = 'webapp_' + new URL(item.url).hostname.replace(/[^a-z0-9]/gi, '_');
    if (installedIds.has(id)) {
      notify({ title: '已安装', body: `${item.name} 已经安装过了`, icon: '📦' });
      return;
    }
    installApp({
      id,
      name: item.name,
      icon: '',
      component: 'webapp',
      color: '',
      url: item.url,
      defaultSize: { width: 980, height: 660 },
      minSize: { width: 360, height: 360 },
    });
    notify({ title: '安装成功', body: `${item.name} 已添加到开始菜单`, icon: '📦' });
  };

  const handleCustomInstall = () => {
    let url = customUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const name = customName.trim() || (() => {
      try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
    })();
    install({ name, url });
    setCustomUrl('');
    setCustomName('');
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-16 sm:w-52 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-3 hidden sm:block">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🛍️</span>
            <span>应用商店</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                category === c ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="sm:hidden">{c[0]}</span>
              <span className="hidden sm:inline">{c}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <button
            onClick={() => setCategory('已安装')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
              category === '已安装' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">已安装 ({installedApps.length})</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 h-9 px-3 rounded-lg bg-muted">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索应用…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {category === '已安装' ? (
            <div>
              <h2 className="text-lg font-semibold mb-3">已安装的应用</h2>
              {installedApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Globe className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">还没有安装第三方应用</p>
                  <p className="text-xs mt-1">从左侧目录选择网站安装</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {installedApps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition"
                    >
                      <WebappIcon url={app.url || ''} name={app.name} size={48} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{app.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{app.url}</div>
                      </div>
                      <button
                        onClick={() => openApp(app.id)}
                        className="px-3 h-8 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
                      >
                        打开
                      </button>
                      <button
                        onClick={() => {
                          uninstallApp(app.id);
                          notify({ title: '已卸载', body: app.name, icon: '🗑️' });
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
                        title="卸载"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Custom install */}
              <div className="mb-5 p-4 rounded-xl border border-dashed border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-3 font-medium">
                  <Plus className="w-4 h-4" /> 自定义安装
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="网址 (如 example.com)"
                    className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="应用名称 (可选)"
                    className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleCustomInstall}
                    className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition flex items-center gap-1.5 justify-center"
                  >
                    <Download className="w-4 h-4" /> 安装
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  应用图标将根据网址自动生成。
                </p>
              </div>

              <h2 className="text-lg font-semibold mb-3">
                {category === '全部' ? '推荐应用' : category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((item) => {
                  const id = 'webapp_' + new URL(item.url).hostname.replace(/[^a-z0-9]/gi, '_');
                  const installed = installedIds.has(id);
                  return (
                    <div
                      key={item.url}
                      className="p-3 rounded-xl border border-border bg-card hover:shadow-md transition flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <WebappIcon url={item.url} name={item.name} size={48} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            installed
                              ? openApp(id)
                              : install(item)
                          }
                          className={`flex-1 h-8 rounded-lg text-sm transition flex items-center justify-center gap-1.5 ${
                            installed
                              ? 'bg-muted hover:bg-accent'
                              : 'bg-primary text-primary-foreground hover:opacity-90'
                          }`}
                        >
                          {installed ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> 打开
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" /> 安装
                            </>
                          )}
                        </button>
                        {installed && (
                          <button
                            onClick={() => {
                              uninstallApp(id);
                              notify({ title: '已卸载', body: item.name, icon: '🗑️' });
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">未找到匹配的应用</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { RotateCw, ExternalLink, AlertCircle } from 'lucide-react';
import type { WindowInstance, AppDef } from '@/lib/os/types';
import { WebappIcon } from '@/components/os/AppIcon';

export function WebApp({ win, app }: { win: WindowInstance; app: AppDef }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const url = app.url || '';

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">无效的应用地址</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center gap-2 h-9 px-2 bg-muted/50 border-b border-border shrink-0">
        <WebappIcon url={app.url || ''} name={app.name} size={20} rounded="rounded-md" />
        <span className="text-xs text-muted-foreground truncate flex-1">{app.name}</span>
        <button
          onClick={reload}
          className="w-7 h-7 rounded hover:bg-accent flex items-center justify-center"
          title="刷新"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="w-7 h-7 rounded hover:bg-accent flex items-center justify-center"
          title="在新标签页打开"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="flex-1 min-h-0 relative">
        <iframe
          key={reloadKey}
          src={url}
          title={app.name}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
        />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3 pointer-events-none">
            <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">加载中…</p>
          </div>
        )}
      </div>
    </div>
  );
}

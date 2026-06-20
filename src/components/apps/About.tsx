'use client';

import { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Monitor,
  Globe,
  CheckCircle2,
  RefreshCw,
  Info,
  Wifi,
  WifiOff,
  AppWindow,
  Folder,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';

const BUILD_DATE = '2025-01-15';
const OS_VERSION = '1.0.0';

interface Specs {
  cores: number;
  storageUsed: number;
  display: string;
  browser: string;
  online: boolean;
  platform: string;
  language: string;
}

export function About({ win }: { win: WindowInstance }) {
  const notify = useOS((s) => s.notify);
  const resetAll = useOS((s) => s.resetAll);
  const apps = useOS((s) => s.apps);
  const files = useOS((s) => s.files);
  const windows = useOS((s) => s.windows);

  const [specs, setSpecs] = useState<Specs>({
    cores: 0,
    storageUsed: 0,
    display: '',
    browser: '',
    online: true,
    platform: '',
    language: '',
  });

  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 0;
    let storageUsed = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const val = localStorage.getItem(key) || '';
        // UTF-16 uses ~2 bytes per char
        storageUsed += (key.length + val.length) * 2;
      }
    } catch {
      /* ignore */
    }
    // One-shot initialization of client-only specs (navigator/window).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpecs({
      cores,
      storageUsed,
      display: `${window.innerWidth} × ${window.innerHeight}`,
      browser: navigator.userAgent,
      online: navigator.onLine,
      platform: navigator.platform || 'unknown',
      language: navigator.language || 'unknown',
    });

    const onResize = () =>
      setSpecs((s) => ({
        ...s,
        display: `${window.innerWidth} × ${window.innerHeight}`,
      }));
    const onOnline = () => setSpecs((s) => ({ ...s, online: true }));
    const onOffline = () => setSpecs((s) => ({ ...s, online: false }));
    window.addEventListener('resize', onResize);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  const estimatedRam = Math.max(2, Math.round((specs.cores || 4) * 2));

  const truncBrowser = (ua: string) => {
    if (!ua) return '未知';
    return ua.length > 60 ? ua.slice(0, 60) + '…' : ua;
  };

  return (
    <div className="h-full w-full bg-background text-foreground">
      <ScrollArea className="h-full">
        <div className="flex flex-col items-center gap-4 p-6 max-w-2xl mx-auto">
          {/* Logo + name */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20">
              🖥️
            </div>
            <h1 className="text-2xl font-bold mt-1">WebOS</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">v{OS_VERSION}</Badge>
              <span>构建于 {BUILD_DATE}</span>
            </div>
          </div>

          {/* Hardware specs */}
          <Card className="w-full p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              系统规格
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <SpecItem
                icon={<Cpu className="w-4 h-4" />}
                label="处理器"
                value={`Z.ai Virtual Core @ 3.6GHz · ${specs.cores || '未知'} 核`}
              />
              <SpecItem
                icon={<HardDrive className="w-4 h-4" />}
                label="内存"
                value={`${specs.cores || '?'} 核 / ~${estimatedRam} GB (估算)`}
              />
              <SpecItem
                icon={<HardDrive className="w-4 h-4" />}
                label="存储"
                value={`${formatBytes(specs.storageUsed)} / ~5 MB (本地)`}
              />
              <SpecItem
                icon={<Monitor className="w-4 h-4" />}
                label="显示"
                value={specs.display || '未知'}
              />
              <SpecItem
                icon={specs.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                label="网络"
                value={specs.online ? '已连接' : '离线'}
              />
              <SpecItem
                icon={<Globe className="w-4 h-4" />}
                label="平台"
                value={specs.platform || '未知'}
              />
              <SpecItem
                icon={<Info className="w-4 h-4" />}
                label="浏览器"
                value={truncBrowser(specs.browser)}
                full
              />
            </div>
          </Card>

          {/* System info */}
          <Card className="w-full p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4" />
              系统信息
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat
                icon={<LayoutGrid className="w-4 h-4" />}
                label="已安装应用"
                value={apps.length}
              />
              <Stat
                icon={<Folder className="w-4 h-4" />}
                label="文件"
                value={files.length}
              />
              <Stat
                icon={<AppWindow className="w-4 h-4" />}
                label="打开窗口"
                value={windows.length}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 w-full justify-center pt-1">
            <Button
              variant="outline"
              onClick={() =>
                notify({
                  title: '系统更新',
                  body: 'WebOS 已是最新版本 (v' + OS_VERSION + ')',
                  icon: '✓',
                })
              }
            >
              <CheckCircle2 className="w-4 h-4" /> 检查更新
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <RefreshCw className="w-4 h-4" /> 重置系统
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要重置系统吗？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将清除所有数据（应用、文件、设置、通知等）并重新启动系统。此操作不可撤销，请谨慎操作。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetAll()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    确认重置
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Credits */}
          <div className="text-center text-xs text-muted-foreground pt-4 pb-2 mt-auto">
            <div>WebOS · 基于 Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui</div>
            <div className="mt-1">© 2025 Z.ai · 致敬所有开源贡献者</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function SpecItem({
  icon,
  label,
  value,
  full,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-2', full && 'sm:col-span-2')}>
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-all" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-muted/40 rounded-md p-3 flex flex-col items-center gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}


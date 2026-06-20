'use client';

import type { WindowInstance, AppDef } from '@/lib/os/types';
import { Browser } from '@/components/apps/Browser';
import { FileManager } from '@/components/apps/FileManager';
import { AppStore } from '@/components/apps/AppStore';
import { Settings } from '@/components/apps/Settings';
import { TextEditor } from '@/components/apps/TextEditor';
import { Calculator } from '@/components/apps/Calculator';
import { Terminal } from '@/components/apps/Terminal';
import { MusicPlayer } from '@/components/apps/MusicPlayer';
import { ImageViewer } from '@/components/apps/ImageViewer';
import { Paint } from '@/components/apps/Paint';
import { Clock } from '@/components/apps/Clock';
import { About } from '@/components/apps/About';
import { WebApp } from '@/components/apps/WebApp';
import { FileViewer } from '@/components/apps/FileViewer';

export function AppRenderer({ win, app }: { win: WindowInstance; app: AppDef }) {
  switch (app.component) {
    case 'browser':
      return <Browser win={win} />;
    case 'filemanager':
      return <FileManager win={win} />;
    case 'appstore':
      return <AppStore win={win} />;
    case 'settings':
      return <Settings win={win} />;
    case 'texteditor':
      return <TextEditor win={win} />;
    case 'calculator':
      return <Calculator win={win} />;
    case 'terminal':
      return <Terminal win={win} />;
    case 'musicplayer':
      return <MusicPlayer win={win} />;
    case 'imageviewer':
      return <ImageViewer win={win} />;
    case 'paint':
      return <Paint win={win} />;
    case 'clock':
      return <Clock win={win} />;
    case 'about':
      return <About win={win} />;
    case 'webapp':
      return <WebApp win={win} app={app} />;
    case 'fileviewer':
      return <FileViewer win={win} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          未知应用
        </div>
      );
  }
}

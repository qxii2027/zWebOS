'use client';

import {
  Globe,
  Folder,
  ShoppingBag,
  Settings,
  FileText,
  Calculator,
  SquareTerminal,
  Music,
  Image as ImageIcon,
  Palette,
  Clock,
  Info,
  Trash2,
  Search,
  Bell,
  Download,
  Star,
  type LucideIcon,
} from 'lucide-react';

// Map of icon name -> Lucide component
const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  folder: Folder,
  shopping: ShoppingBag,
  settings: Settings,
  filetext: FileText,
  calculator: Calculator,
  terminal: SquareTerminal,
  music: Music,
  image: ImageIcon,
  palette: Palette,
  clock: Clock,
  info: Info,
  trash: Trash2,
  search: Search,
  bell: Bell,
  download: Download,
  star: Star,
};

function isLucideName(s: string): boolean {
  return !!ICON_MAP[s];
}

// Generate a deterministic gradient from a string (for installed webapps / letter avatars)
const COLOR_PAIRS: [string, string][] = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#f97316', '#f59e0b'],
  ['#10b981', '#14b8a6'],
  ['#06b6d4', '#0ea5e9'],
  ['#8b5cf6', '#d946ef'],
  ['#ef4444', '#f97316'],
  ['#14b8a6', '#22c55e'],
  ['#3b82f6', '#6366f1'],
  ['#a855f7', '#ec4899'],
];

function colorFromString(s: string): [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLOR_PAIRS[h % COLOR_PAIRS.length];
}

export function AppIcon({
  icon,
  color,
  size = 48,
  rounded = 'rounded-2xl',
  className = '',
}: {
  icon: string;
  color?: string; // tailwind gradient classes like "from-sky-400 to-cyan-500"
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const LucideComp = isLucideName(icon) ? ICON_MAP[icon] : null;

  const innerSize = Math.round(size * 0.5);
  const style: React.CSSProperties = {
    width: size,
    height: size,
  };

  // Determine background
  let bgStyle: React.CSSProperties = {};
  let bgClass = '';
  if (LucideComp) {
    // Use gradient color classes
    bgClass = color ? `bg-gradient-to-br ${color}` : 'bg-gradient-to-br from-slate-500 to-slate-700';
  } else if (icon && icon.length <= 3) {
    // Letter avatar for webapps — use deterministic color
    const [c1, c2] = colorFromString(icon);
    bgStyle = { background: `linear-gradient(135deg, ${c1}, ${c2})` };
  } else {
    // Fallback: emoji on subtle bg
    bgClass = 'bg-muted';
  }

  return (
    <span
      className={`inline-flex items-center justify-center text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0 ${rounded} ${bgClass} ${className}`}
      style={{ ...style, ...bgStyle }}
    >
      {LucideComp ? (
        <LucideComp
          className="text-white"
          style={{ width: innerSize, height: innerSize }}
          strokeWidth={2}
        />
      ) : icon && icon.length <= 3 ? (
        <span
          className="font-semibold text-white"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {icon.toUpperCase()}
        </span>
      ) : (
        <span style={{ fontSize: Math.round(size * 0.5) }}>{icon || '?'}</span>
      )}
    </span>
  );
}

// Helper: given a webapp url, produce a letter + color
export function webappIconFor(url: string): { icon: string; color: string } {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {}
  const letter = host.charAt(0).toUpperCase() || 'A';
  const [c1, c2] = colorFromString(host);
  // find matching tailwind pair or just return inline
  return { icon: letter, color: '' }; // color handled inline; we keep icon as the letter
}

// For installed webapps, render with inline gradient derived from url
export function WebappIcon({
  url,
  name,
  size = 48,
  rounded = 'rounded-2xl',
}: {
  url: string;
  name?: string;
  size?: number;
  rounded?: string;
}) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {}
  const letter = (host.charAt(0) || (name?.charAt(0) || 'A')).toUpperCase();
  const [c1, c2] = colorFromString(host);
  const innerSize = Math.round(size * 0.42);
  return (
    <span
      className={`inline-flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0 ${rounded}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      <span
        className="font-semibold text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
      <Globe className="absolute" style={{ width: innerSize, height: innerSize, opacity: 0 }} />
    </span>
  );
}

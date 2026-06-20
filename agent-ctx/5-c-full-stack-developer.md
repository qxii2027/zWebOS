# Task 5-c — full-stack-developer

## Task
Create 3 self-contained WebOS apps (MusicPlayer, ImageViewer, Paint) in `src/components/apps/` using Next.js 16 + TypeScript + Tailwind + shadcn/ui + the global `useOS` Zustand store.

## Context Reviewed
- Read `/home/z/my-project/worklog.md` — project is a pseudo-OS shell rendered by `<DesktopOS />` in `src/app/page.tsx`, using a Zustand store (`useOS`) with localStorage persistence.
- Read `src/lib/os/store.ts` — confirmed `createFile`, `updateSettings`, `notify`, `files`, `settings` (incl. `volume`, `accent`) APIs and `uid` helper.
- Read `src/lib/os/types.ts` — confirmed `WindowInstance` shape and `VFile` shape.
- Read `src/components/os/AppRenderer.tsx` — confirmed my 3 components are imported and rendered via switch on `app.component` (`musicplayer`, `imageviewer`, `paint`).
- Confirmed shadcn/ui components available in `src/components/ui/*` (button, slider, scroll-area, separator, etc.).
- Confirmed ESLint config has `react-hooks/exhaustive-deps: off` but enforces `react-hooks/refs` and `react-hooks/set-state-in-effect` (React Compiler rules).

## Files Created (only these 3)
1. `src/components/apps/MusicPlayer.tsx`
2. `src/components/apps/ImageViewer.tsx`
3. `src/components/apps/Paint.tsx`

## Implementation Notes

### MusicPlayer.tsx
- Web Audio API synthesis: built-in playlist of 4 melodies encoded as note sequences (小星星, 欢乐颂, 生日快乐, 玛丽有只小羊羔) using a note-name → frequency table.
- Each note scheduled via `OscillatorNode` (triangle wave) + `GainNode` with a simple ADSR envelope (attack 20ms, decay 50ms, sustain 70% of peak, release 60ms).
- Master signal chain: `osc → noteGain → masterGain → analyser → destination`.
- `AnalyserNode` (fftSize 128) drives a canvas frequency-bar visualizer (40 bars, gradient from track accent → settings.accent). Idle state draws a gentle sine waveform when no audio context exists yet.
- Progress driven by `AudioContext.currentTime` vs a `playStartRef` (`{ctxTime, offset}`) updated each rAF tick; elapsed/total displayed in m:ss.
- Play/pause/resume: on pause, compute elapsed → store in `pauseOffsetRef`, stop all active oscillators. On resume, re-schedule remaining notes from offset (notes whose cumulative start > elapsed).
- Auto-advance: rAF tick checks `elapsed >= duration` → `advance()` which respects shuffle / repeat (off|all|one).
- Volume slider bound to `settings.volume` via `updateSettings({volume})`; master gain kept in sync via `setTargetAtTime`.
- Upload button: `<input type=file accept=audio/* multiple>` → `decodeAudioData` → adds `AudioBuffer`-backed track to in-memory playlist state (NOT persisted to localStorage). Reports via `notify()`.
- Playlist panel toggled via button; click a track to play it.
- Cleanup on unmount: stop all nodes, cancel rAFs, close `AudioContext`.
- State mirrored into refs via `useEffect` (not during render) to satisfy `react-hooks/refs` rule while keeping rAF/timeout callbacks reading latest values.

### ImageViewer.tsx
- 6 in-code SVG samples generated as `data:image/svg+xml` data URLs (黄昏, 极光, 樱花, 深海, 森林, 星云) — each with a multi-stop linear gradient + abstract shapes + radial highlight + title text.
- Gallery sources = store image files (`parentId === 'folder_pictures'`, `dataUrl` starts with `data:image`) + the 6 samples.
- Responsive thumbnail grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`), aspect-square, object-cover, hover scale + ring.
- Large viewer: dark backdrop, image centered with `object-contain`, prev/next chevrons, zoom in/out (0.2–5x) + 1:1 reset, rotate ±90°, slideshow toggle (3s interval), delete (store images only).
- Keyboard nav (←/→/Esc) when viewer open.
- Info line shows name + natural dimensions (loaded async via `new Image()` onload; samples carry known 600×600).
- Upload: `<input type=file accept=image/* multiple>` → `FileReader.readAsDataURL` → `createFile({name, type:'file', parentId:'folder_pictures', mimeType, dataUrl})` → `notify()`.
- Empty state with upload CTA when no images.
- Dimension loading refactored to avoid synchronous `setState` in effect (derive `dims` during render, only async-set `loadedDims` in onload) to satisfy `react-hooks/set-state-in-effect`.

### Paint.tsx
- Main `<canvas>` fills container; high-DPI handling (`canvas.width = clientWidth * dpr`, `ctx.setTransform(dpr,0,0,dpr,0,0)`).
- `ResizeObserver` on container resizes canvas while preserving content via a temp canvas + `drawImage` (re-scales old bitmap to new logical size). Debounced with rAF.
- Tools: brush, eraser, line, rectangle, ellipse, fill (bucket).
  - Brush/eraser: smooth quadratic-curve drawing using midpoint technique (`moveTo(prevMid) → quadraticCurveTo(lastPoint, currentMid)`). Eraser paints white (source-over) so saved PNGs stay opaque on white paper.
  - Line/rect/ellipse: snapshot saved on pointerdown (`getImageData`), restored via `putImageData` each move, then shape stroked — final preview is the committed shape.
  - Fill: scanline stack-based flood fill on full-canvas `ImageData` with `visited` Uint8Array guard; matches target RGBA exactly, fills with hex→rgb + opacity→alpha.
- Color: native `<input type="color">` overlaid on a swatch preview + 16 preset swatches (hidden on small screens, shown as `lg:grid`).
- Brush size slider 1–50, opacity slider 1–100 (hidden on `<md`).
- Undo/redo: `ImageData` history stacks capped at 20; `pushUndo()` called on every pointerdown (before mutation) and clears redo stack. Undo/redo buttons disabled appropriately.
- Clear: fills canvas white (with undo entry). Save: `canvas.toDataURL('image/png')` → `createFile({name: \`画图_${Date.now()}.png\`, parentId:'folder_pictures', mimeType:'image/png', dataUrl})` → `notify()`.
- Pointer events with `setPointerCapture`, `touch-none` CSS, left-button-only guard for mouse.
- Tool/size/color/opacity state mirrored into refs via `useEffect` for synchronous reads inside pointer handlers.
- Theme-aware: toolbar `bg-muted/50`, canvas wrapper `bg-neutral-200 dark:bg-neutral-800`, canvas itself `bg-white`. Active tool button uses `settings.accent`.

## Lint
- Initial run flagged `react-hooks/refs` errors (ref-during-render) in MusicPlayer + Paint, and `react-hooks/set-state-in-effect` in ImageViewer.
- Fixed all by: (a) moving ref mirroring into `useEffect` deps-sync, (b) restructuring ImageViewer dimension loading to derive `dims` during render and only async-set in `Image.onload`.
- Also removed two unused `@next/next/no-img-element` eslint-disable directives in ImageViewer (rule is off in config).
- Final `bun run lint`: my 3 files produce **0 errors and 0 warnings**. Remaining lint errors are in other agents' files (Terminal.tsx, TextEditor.tsx, About.tsx, Calculator.tsx, Clock.tsx) — out of scope per task constraints ("fix issues in YOUR files only"; "Do NOT modify other files").

## Dev Server
- `dev.log` shows `✓ Ready` and `GET / 200` responses — app compiles and serves successfully with my 3 components integrated via `AppRenderer`.

## Stage Summary
- Delivered 3 production-ready, theme-aware, responsive WebOS apps conforming to the required component signature `export function AppName({ win }: { win: WindowInstance })`.
- Each file begins with `'use client';`, uses only shadcn/ui + lucide-react, and integrates with the global `useOS` store (`createFile`, `updateSettings`, `notify`, `files`, `settings`).
- All three pass ESLint cleanly. No emojis in code. No test files. No other files modified.

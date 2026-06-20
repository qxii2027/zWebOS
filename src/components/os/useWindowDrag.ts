'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  pointerId: number;
}

export function useWindowDrag(win: WindowInstance) {
  const moveWindow = useOS((s) => s.moveWindow);
  const focusWindow = useOS((s) => s.focusWindow);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const snapWindow = useOS((s) => s.snapWindow);
  const dragRef = useRef<DragState | null>(null);
  const snapeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) {
        // un-maximize and center under cursor
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-drag]')) return;
      focusWindow(win.id);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
        pointerId: e.pointerId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.id, win.x, win.y, win.maximized, focusWindow],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      let nx = d.origX + dx;
      let ny = d.origY + dy;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      nx = Math.max(-win.width + 80, Math.min(vw - 80, nx));
      ny = Math.max(0, Math.min(vh - 60, ny));
      moveWindow(win.id, nx, ny);

      // snap zone detection with live preview
      const setSnapPreview = useOS.getState().setSnapPreview;
      const snap = useOS.getState().snapWindow;
      const atTop = e.clientY <= 4;
      const atLeft = e.clientX <= 4;
      const atRight = e.clientX >= vw - 4;
      if (atTop) {
        setSnapPreview('max');
        if (!snapeRef.current) {
          snapeRef.current = setTimeout(() => {
            snap(win.id, 'max');
            dragRef.current = null;
            setSnapPreview(null);
          }, 350);
        }
      } else if (atLeft) {
        setSnapPreview('left');
        if (snapeRef.current) {
          clearTimeout(snapeRef.current);
          snapeRef.current = null;
        }
      } else if (atRight) {
        setSnapPreview('right');
        if (snapeRef.current) {
          clearTimeout(snapeRef.current);
          snapeRef.current = null;
        }
      } else {
        setSnapPreview(null);
        if (snapeRef.current) {
          clearTimeout(snapeRef.current);
          snapeRef.current = null;
        }
      }
    },
    [win.id, win.width, moveWindow, snapWindow],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const setSnapPreview = useOS.getState().setSnapPreview;
      const snap = useOS.getState().snapWindow;
      const sp = useOS.getState().snapPreview;
      if (snapeRef.current) {
        clearTimeout(snapeRef.current);
        snapeRef.current = null;
      }
      // apply left/right snap on release if preview was showing
      if (sp === 'left') snap(win.id, 'left');
      else if (sp === 'right') snap(win.id, 'right');
      setSnapPreview(null);
      if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        dragRef.current = null;
      }
    },
    [win.id],
  );

  const onDouble = useCallback(() => {
    toggleMaximize(win.id);
  }, [win.id, toggleMaximize]);

  useEffect(() => {
    return () => {
      if (snapeRef.current) clearTimeout(snapeRef.current);
    };
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onDouble };
}

interface ResizeState {
  dir: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  pointerId: number;
}

export function useWindowResize(
  win: WindowInstance,
  minSize: { width: number; height: number },
) {
  const resizeWindow = useOS((s) => s.resizeWindow);
  const ref = useRef<ResizeState | null>(null);

  const startResize = useCallback(
    (dir: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      useOS.getState().focusWindow(win.id);
      ref.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
        origW: win.width,
        origH: win.height,
        pointerId: e.pointerId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.id, win.x, win.y, win.width, win.height],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const r = ref.current;
      if (!r || r.pointerId !== e.pointerId) return;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      let { origX: x, origY: y, origW: w, origH: h } = r;
      const minW = minSize.width;
      const minH = minSize.height;
      const d = r.dir;
      if (d.includes('e')) w = Math.max(minW, r.origW + dx);
      if (d.includes('s')) h = Math.max(minH, r.origH + dy);
      if (d.includes('w')) {
        w = Math.max(minW, r.origW - dx);
        x = r.origX + (r.origW - w);
      }
      if (d.includes('n')) {
        h = Math.max(minH, r.origH - dy);
        y = r.origY + (r.origH - h);
      }
      resizeWindow(win.id, { x, y, width: w, height: h });
    },
    [win.id, minSize.width, minSize.height, resizeWindow],
  );

  const onUp = useCallback((e: React.PointerEvent) => {
    if (ref.current && ref.current.pointerId === e.pointerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      ref.current = null;
    }
  }, []);

  return { startResize, onMove, onUp };
}

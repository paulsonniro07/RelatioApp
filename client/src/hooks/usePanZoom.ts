import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;

export interface PanZoomTransform {
  x: number;
  y: number;
  zoom: number;
}

interface PanZoomGesture {
  mode: 'pan' | 'pinch';
  startPan: { x: number; y: number };
  startZoom: number;
  startMid: { x: number; y: number };
  startDist: number;
}

export interface PanZoomHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

/**
 * Canvas pan/zoom:
 * - mouse wheel / trackpad scroll → pan
 * - ctrl/cmd + wheel and touch pinch → zoom around the cursor/finger midpoint
 * - drag on the background (mouse or single touch) → pan
 */
export function usePanZoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransformState] = useState<PanZoomTransform>({ x: 0, y: 0, zoom: 1 });
  const transformRef = useRef(transform);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<PanZoomGesture | null>(null);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const setTransform = useCallback((next: PanZoomTransform) => setTransformState(next), []);

  const toContainerPoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  const zoomAt = useCallback((point: { x: number; y: number }, nextZoom: number) => {
    const current = transformRef.current;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const worldX = (point.x - current.x) / current.zoom;
    const worldY = (point.y - current.y) / current.zoom;
    setTransformState({ zoom, x: point.x - worldX * zoom, y: point.y - worldY * zoom });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const current = transformRef.current;
      const el = containerRef.current;
      const center = { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
      zoomAt(center, current.zoom * factor);
    },
    [zoomAt],
  );

  /** Positions the content so it fits the container with margin. */
  const fit = useCallback((contentWidth: number, contentHeight: number) => {
    const el = containerRef.current;
    if (!el || contentWidth <= 0 || contentHeight <= 0) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const zoom = Math.min(1, (cw - 48) / contentWidth, (ch - 48) / contentHeight);
    const safeZoom = Math.max(MIN_ZOOM, zoom);
    setTransformState({
      zoom: safeZoom,
      x: Math.max(0, (cw - contentWidth * safeZoom) / 2),
      y: Math.max(0, (ch - contentHeight * safeZoom) / 2),
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = toContainerPoint(event.clientX, event.clientY);
      if (event.ctrlKey || event.metaKey) {
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomAt(point, transformRef.current.zoom * factor);
      } else {
        const current = transformRef.current;
        setTransformState({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toContainerPoint, zoomAt, setTransformState]);

  const syncGesture = useCallback(() => {
    const points = [...pointersRef.current.values()];
    const current = transformRef.current;
    if (points.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startPan: { x: current.x, y: current.y },
        startZoom: current.zoom,
        startMid: points[0],
        startDist: 0,
      };
    } else if (points.length >= 2) {
      const [a, b] = points;
      gestureRef.current = {
        mode: 'pinch',
        startPan: { x: current.x, y: current.y },
        startZoom: current.zoom,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startDist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      };
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-node-drag], [data-edge-handle]')) return;
      event.preventDefault();
      pointersRef.current.set(event.pointerId, toContainerPoint(event.clientX, event.clientY));
      event.currentTarget.setPointerCapture(event.pointerId);
      syncGesture();
    },
    [toContainerPoint, syncGesture],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      const point = toContainerPoint(event.clientX, event.clientY);
      pointersRef.current.set(event.pointerId, point);
      const gesture = gestureRef.current;
      if (!gesture) return;
      const points = [...pointersRef.current.values()];
      if (gesture.mode === 'pan' && points.length === 1) {
        const [p] = points;
        const current = transformRef.current;
        setTransformState({
          ...current,
          x: gesture.startPan.x + (p.x - gesture.startMid.x),
          y: gesture.startPan.y + (p.y - gesture.startMid.y),
        });
      } else if (gesture.mode === 'pinch' && points.length >= 2) {
        const [a, b] = points;
        const dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, gesture.startZoom * (dist / gesture.startDist)));
        const worldX = (gesture.startMid.x - gesture.startPan.x) / gesture.startZoom;
        const worldY = (gesture.startMid.y - gesture.startPan.y) / gesture.startZoom;
        setTransformState({ zoom, x: mid.x - worldX * zoom, y: mid.y - worldY * zoom });
      }
    },
    [toContainerPoint],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) {
        gestureRef.current = null;
      } else {
        syncGesture();
      }
    },
    [syncGesture],
  );

  const handlers: PanZoomHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return {
    containerRef,
    transform,
    transformRef,
    setTransform,
    zoomAt,
    zoomBy,
    fit,
    handlers,
  };
}


import type { ReactNode } from 'react';

import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type { ChartTheme } from '@/features/tree/theme/types';

/** Tight bounds of the drawn tree (cards) in content coordinates. */
export interface DecorationBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface CanvasDecorationsProps {
  bounds: DecorationBounds;
  /** Content-canvas size (tree bounds + surrounding margins). */
  width: number;
  height: number;
}

/** Minimum distance from decoration ink to the nearest node/connector. */
const CLEARANCE = 64;
/** Corner accents never reach deeper than this toward the tree. */
const MAX_CORNER = 44;
/** Hide an accent if it can't keep this much room. */
const MIN_CORNER = 22;
/** Thin rails along edges stay at least CLEARANCE away horizontally. */
const MAX_EDGE = 24;
/** Master opacity — decorations read as texture, never content. */
const FADE = 0.16;

/**
 * Biggest square that can hug an outer content corner while every ink point
 * keeps >= CLEARANCE from the tree. marginX/marginY are the content-space gaps
 * between the tree bounds and that corner.
 */
function cornerSquare(marginX: number, marginY: number): number {
  if (marginX <= 0 || marginY <= 0) return 0;
  let size = MAX_CORNER;
  while (size >= MIN_CORNER) {
    if (Math.hypot(marginX - size, marginY - size) >= CLEARANCE) return size;
    size -= 2;
  }
  return 0;
}

/** Thin rail thickness for a vertical/horizontal edge with `marginX` gap. */
function edgeThickness(marginX: number): number {
  if (marginX <= CLEARANCE) return 0;
  return Math.min(MAX_EDGE, Math.floor(marginX - CLEARANCE));
}

/** Absolutely-positioned box that keeps a motif inside its safe margin area. */
function CornerBox({
  left,
  top,
  size,
  children,
}: {
  left: number;
  top: number;
  size: number;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left, top, width: size, height: size }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/** Cute Pastel: soft sage sprigs tucked in opposite corners. */
function Botanical({
  theme,
  bounds,
  width,
  height,
}: {
  theme: ChartTheme;
  bounds: DecorationBounds;
  width: number;
  height: number;
}) {
  const ink = theme.relationshipTones?.grandparent?.accent ?? theme.accent;
  const topLeft = cornerSquare(bounds.left, bounds.top);
  const bottomRight = cornerSquare(width - bounds.right, height - bounds.bottom);

  const sprig = (flip: boolean) => (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" aria-hidden="true">
      <g transform={flip ? 'scale(-1,1) translate(-64,0)' : undefined} strokeLinecap="round">
        <path d="M12 58 C 26 46 38 30 52 12" stroke={ink} strokeWidth={3} opacity={FADE} />
        <g fill={ink} stroke="none" opacity={FADE * 0.7}>
          <path
            transform="translate(26 46) rotate(-44)"
            d="M0 0 C5 -11 15 -11 18 0 C15 10 5 10 0 0 Z"
          />
          <path
            transform="translate(40 30) rotate(-60)"
            d="M0 0 C5 -11 15 -11 18 0 C15 10 5 10 0 0 Z"
          />
        </g>
        <circle cx="52" cy="12" r="2.4" fill={ink} opacity={FADE} />
      </g>
    </svg>
  );

  return (
    <>
      {topLeft >= MIN_CORNER ? (
        <CornerBox left={0} top={0} size={topLeft}>
          {sprig(false)}
        </CornerBox>
      ) : null}
      {bottomRight >= MIN_CORNER ? (
        <CornerBox left={width - bottomRight} top={height - bottomRight} size={bottomRight}>
          {sprig(true)}
        </CornerBox>
      ) : null}
    </>
  );
}
/** School: simple doodles (pencil, star, book) in the corners that have room. */
function Doodles({
  theme,
  bounds,
  width,
  height,
}: {
  theme: ChartTheme;
  bounds: DecorationBounds;
  width: number;
  height: number;
}) {
  const ink = theme.accent;
  const star =
    'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5z';
  const pencil =
    'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487zm0 0L19.5 7.125';
  const book =
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';

  const icons = [star, pencil, book];
  const slots = [
    { size: cornerSquare(bounds.left, bounds.top), left: 0, top: 0 },
    { size: cornerSquare(width - bounds.right, bounds.top), left: width, top: 0, right: true },
    {
      size: cornerSquare(width - bounds.right, height - bounds.bottom),
      left: width,
      top: height,
      right: true,
      bottom: true,
    },
    { size: cornerSquare(bounds.left, height - bounds.bottom), left: 0, top: height, bottom: true },
  ];

  const doodle = (d: string, right: boolean, bottom: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full"
      fill="none"
      stroke={ink}
      strokeWidth={1.05}
      opacity={FADE}
      style={{ transform: `${right ? 'scaleX(-1)' : ''} ${bottom ? 'scaleY(-1)' : ''}` }}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  const rendered: ReactNode[] = [];
  let used = 0;
  for (const slot of slots) {
    if (slot.size < MIN_CORNER || used >= icons.length) continue;
    const left = slot.right ? slot.left - slot.size : slot.left;
    const top = slot.bottom ? slot.top - slot.size : slot.top;
    rendered.push(
      <CornerBox key={`${slot.left}-${slot.top}`} left={left} top={top} size={slot.size}>
        {doodle(icons[used], Boolean(slot.right), Boolean(slot.bottom))}
      </CornerBox>,
    );
    used += 1;
  }
  return <>{rendered}</>;
}
/** Project Team / Tech: faint circuit rail along the right edge + corner node. */
function Circuit({
  theme,
  bounds,
  width,
  height,
}: {
  theme: ChartTheme;
  bounds: DecorationBounds;
  width: number;
  height: number;
}) {
  const ink = theme.accent;
  const rail = edgeThickness(width - bounds.right);
  const corner = cornerSquare(bounds.left, height - bounds.bottom);
  const railHeight = Math.max(0, Math.min(height - 40, 900));

  const railSvg =
    rail >= 12 ? (
      <svg
        className="absolute"
        style={{ right: 0, top: 20, width: rail, height: railHeight, opacity: FADE }}
        viewBox={`0 0 24 ${Math.max(railHeight, 1)}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 8 h 16 M4 44 h 10 M4 80 h 16 M4 116 h 8" />
        <circle cx="4" cy="8" r="3" fill={ink} stroke="none" />
        <circle cx="20" cy="44" r="3" fill={ink} stroke="none" />
        <circle cx="4" cy="80" r="3" fill={ink} stroke="none" />
      </svg>
    ) : null;

  const cornerSvg =
    corner >= MIN_CORNER ? (
      <CornerBox left={0} top={height - corner} size={corner}>
        <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke={ink} strokeWidth={2} opacity={FADE} aria-hidden="true">
          <path d="M10 52 h 24 v -22" strokeLinecap="round" />
          <circle cx="40" cy="24" r="5" fill={ink} stroke="none" />
          <circle cx="10" cy="58" r="3" fill={ink} stroke="none" />
          <circle cx="34" cy="52" r="3" fill={ink} stroke="none" />
        </svg>
      </CornerBox>
    ) : null;

  return (
    <>
      {railSvg}
      {cornerSvg}
    </>
  );
}

/** Dark Neon: small soft glow blobs kept inside the corner margins. */
function Glow({
  theme,
  bounds,
  width,
  height,
}: {
  theme: ChartTheme;
  bounds: DecorationBounds;
  width: number;
  height: number;
}) {
  const topLeft = cornerSquare(bounds.left, bounds.top);
  const bottomRight = cornerSquare(width - bounds.right, height - bounds.bottom);

  const blob = (gradientId: string, size: number, color: string) => (
    <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={0.34} />
          <stop offset="70%" stopColor={color} stopOpacity={0.08} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
    </svg>
  );

  return (
    <>
      {topLeft >= MIN_CORNER ? (
        <CornerBox left={0} top={0} size={topLeft}>
          {blob(`deco-glow-${theme.id}-tl`, topLeft, theme.accent)}
        </CornerBox>
      ) : null}
      {bottomRight >= MIN_CORNER ? (
        <CornerBox left={width - bottomRight} top={height - bottomRight} size={bottomRight}>
          {blob(`deco-glow-${theme.id}-br`, bottomRight, theme.dragPreviewColor)}
        </CornerBox>
      ) : null}
    </>
  );
}

/** Professional: very faint dot-grid texture across the canvas surface. */
function Dots({ theme }: { theme: ChartTheme }) {
  const id = `deco-dots-${theme.id}`;
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width={26} height={26} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={1.2} fill={theme.textMuted} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={0.08} />
    </svg>
  );
}

/**
 * Theme-driven canvas decorations. Every motif is sized from `bounds` and kept
 * at least CLEARANCE px away from the tree; accents that cannot keep that
 * margin are hidden. This layer is never rendered by the PNG export stage.
 */
export function CanvasDecorations({ bounds, width, height }: CanvasDecorationsProps) {
  const { theme } = useTheme();
  const decor = theme.canvasDecor ?? 'none';
  if (decor === 'none') return null;

  let content: ReactNode = null;
  if (decor === 'botanical') {
    content = <Botanical theme={theme} bounds={bounds} width={width} height={height} />;
  } else if (decor === 'doodles') {
    content = <Doodles theme={theme} bounds={bounds} width={width} height={height} />;
  } else if (decor === 'circuit') {
    content = <Circuit theme={theme} bounds={bounds} width={width} height={height} />;
  } else if (decor === 'glow') {
    content = <Glow theme={theme} bounds={bounds} width={width} height={height} />;
  } else {
    content = <Dots theme={theme} />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {content}
    </div>
  );
}

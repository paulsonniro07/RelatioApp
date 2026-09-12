import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import { toPng } from 'html-to-image';

import { TreeNodeCard } from '@/features/tree/components/TreeNodeCard';
import { resolvePartnerRelationship } from '@/features/tree/chartTypes';
import { computeEdges, parentEdgePath, partnerEdgePath } from '@/features/tree/edges';
import {
  computeBounds,
  computeDepths,
  NODE_HEIGHT,
} from '@/features/tree/layout';
import { resolvePersona } from '@/features/tree/theme/persona';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type { RelationshipType } from '@/features/tree/theme/types';
import type { Chart, ChartType } from '@/features/tree/types';

/** Empty margin around the tree inside the exported frame. */
const TREE_PAD = 40;
/** Extra transparent margin around the framed card so its shadow is included. */
const FRAME_SHADOW_PAD = 30;

const HEART_PATH =
  'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z';

export interface ChartExportOptions {
  /** true → transparent background; false → current theme canvas background. */
  transparent: boolean;
}

export interface ChartExportHandle {
  exportPng: (options: ChartExportOptions) => Promise<string | null>;
}

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'chart';
}

function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

interface ChartExportStageProps {
  chart: Chart;
  chartType: ChartType;
}

export const ChartExportStage = forwardRef<ChartExportHandle, ChartExportStageProps>(
  function ChartExportStage({ chart, chartType }, ref) {
    const { theme } = useTheme();

    const rawTreeRef = useRef<HTMLDivElement>(null);
    const framedWrapRef = useRef<HTMLDivElement>(null);

    const nodes = chart.nodes;

    const childLabel =
      chartType.relationships.find((def) => def.directional && def.link === 'parent')
        ?.backwardLabel ?? 'Child';

    const depths = useMemo(() => computeDepths(nodes), [nodes]);
    const bounds = useMemo(() => computeBounds(nodes), [nodes]);

    const childCount = useMemo(() => {
      const counts = new Map<string, number>();
      for (const n of nodes) {
        if (n.parentId) counts.set(n.parentId, (counts.get(n.parentId) ?? 0) + 1);
      }
      return counts;
    }, [nodes]);

    const personas = useMemo(() => {
      const map = new Map<string, RelationshipType>();
      for (const n of nodes) {
        map.set(
          n.id,
          resolvePersona(n, chartType, depths.get(n.id) ?? 0, (childCount.get(n.id) ?? 0) > 0),
        );
      }
      return map;
    }, [nodes, chartType, depths, childCount]);

    const edges = useMemo(() => computeEdges(nodes), [nodes]);
    const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

    /** Tight bounds + 40px padding — NOT the full pan/zoom viewport. */
    const geometry = useMemo(() => {
      if (nodes.length === 0 || !Number.isFinite(bounds.minX)) return null;
      const offsetX = TREE_PAD - bounds.minX;
      const offsetY = TREE_PAD - bounds.minY;
      return {
        offsetX,
        offsetY,
        width: Math.ceil(bounds.maxX - bounds.minX) + TREE_PAD * 2,
        height: Math.ceil(bounds.maxY - bounds.minY) + TREE_PAD * 2,
      };
    }, [nodes.length, bounds]);

    /** SVG of connectors + labels (no grab handles / UI overlays). */
    const renderEdges = (): ReactNode => {
      if (!geometry) return null;
      const { offsetX, offsetY } = geometry;
      return (
        <svg width={geometry.width} height={geometry.height} className="block">
          {edges.map((edge) => {
            const from = byId.get(edge.fromId);
            const to = byId.get(edge.toId);
            if (!from || !to) return null;
            if (edge.kind === 'partner') {
              const { path, midX, midY } = partnerEdgePath(from, to, offsetX, offsetY);
              const spouse = theme.spouseConnectorColor ?? theme.connectorColor;
              const partnerDef = resolvePartnerRelationship(chartType, from, to);
              const showHeart = partnerDef?.icon === 'heart';
              return (
                <g key={`${edge.fromId}->${edge.toId}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={spouse}
                    strokeWidth={theme.connectorWidth}
                    strokeDasharray="5 4"
                  />
                  {showHeart && (
                    <g
                      transform={`translate(${midX} ${midY}) scale(0.55) translate(-12 -12)`}
                      pointerEvents="none"
                    >
                      <path d={HEART_PATH} fill={spouse} />
                    </g>
                  )}
                  <text
                    x={midX}
                    y={midY - NODE_HEIGHT / 2 - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill={theme.textSecondary}
                  >
                    {partnerDef?.label ?? 'Partner'}
                  </text>
                </g>
              );
            }
            const midX = (from.positionX + to.positionX) / 2 + offsetX;
            const midY = (from.positionY + to.positionY) / 2 + offsetY;
            return (
              <g key={`${edge.fromId}->${edge.toId}`}>
                <path
                  d={parentEdgePath(from, to, offsetX, offsetY)}
                  fill="none"
                  stroke={theme.connectorColor}
                  strokeWidth={theme.connectorWidth}
                />
                <text x={midX} y={midY - 12} textAnchor="middle" fontSize={10} fill={theme.textSecondary}>
                  {childLabel}
                </text>
              </g>
            );
          })}
        </svg>
      );
    };

    /** Cards exactly as on the canvas (tinted, 3-line body, connector labels). */
    const renderCards = (): ReactNode[] =>
      nodes.map((node) => {
        if (!geometry) return null;
        const left = node.positionX + geometry.offsetX;
        const top = node.positionY + geometry.offsetY;
        return (
          <div
            key={node.id}
            style={{ position: 'absolute', left, top, transform: 'translate(-50%, -50%)' }}
          >
            <TreeNodeCard
              node={node}
              depth={depths.get(node.id) ?? 0}
              persona={personas.get(node.id) ?? 'child'}
            />
          </div>
        );
      });

    const exportPng = async ({ transparent }: ChartExportOptions): Promise<string | null> => {
      if (!geometry || nodes.length === 0) return null;
      const target = transparent ? rawTreeRef.current : framedWrapRef.current;
      if (!target) return null;
      const dataUrl = await toPng(target, {
        pixelRatio: 2,
        backgroundColor: transparent ? undefined : theme.canvasBackground,
        cacheBust: true,
      });
      downloadPng(dataUrl, `${slugifyName(chart.name)}-${theme.id}.png`);
      return dataUrl;
    };

    useImperativeHandle(ref, () => ({ exportPng }), [exportPng]);
    if (!geometry) return null;

    const frameHeader = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 20px',
          borderBottom: `1px solid ${theme.borderColor}`,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {chart.name}
        </span>
        <span style={{ fontSize: 12, color: theme.textSecondary, whiteSpace: 'nowrap' }}>
          {nodes.length} node{nodes.length === 1 ? '' : 's'}
        </span>
      </div>
    );

    const treeArea = (
      <div style={{ position: 'relative', width: geometry.width, height: geometry.height }}>
        {renderEdges()}
        {renderCards()}
      </div>
    );

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{ position: 'fixed', left: -20000, top: 0 }}
      >
        {/* Transparent capture target: the bare tree (cards + connectors + labels). */}
        <div
          ref={rawTreeRef}
          style={{ position: 'relative', width: geometry.width, height: geometry.height }}
        >
          {renderEdges()}
          {renderCards()}
        </div>

        {/* Default capture target: the tree wrapped in a rounded "card" frame. */}
        <div ref={framedWrapRef} style={{ padding: FRAME_SHADOW_PAD }}>
          <div
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(46, 42, 36, 0.22)',
              backgroundColor: theme.surfaceBackground,
            }}
          >
            {frameHeader}
            <div style={{ backgroundColor: theme.canvasBackground }}>
              {treeArea}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { findDropTarget, type DropTargetInfo } from '@/features/tree/drag';
import { computeEdges, parentEdgeLabelPoint, parentEdgePath, partnerEdgePath } from '@/features/tree/edges';
import {
  chartTypeAllowsPartners,
  relationshipOptions,
  resolveEdgeStyle,
} from '@/features/tree/chartTypes';
import { computeBounds, computeDepths, LAYOUT_MARGIN, NODE_HEIGHT, NODE_WIDTH } from '@/features/tree/layout';
import { wouldCreateCycle } from '@/features/tree/store';
import { usePanZoom } from '@/hooks/usePanZoom';
import { useTreeChart } from '@/hooks/useTreeChart';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import { resolvePersona } from '@/features/tree/theme/persona';
import type { RelationshipType } from '@/features/tree/theme/types';
import type { ChartType, TreeNode } from '@/features/tree/types';

import { CanvasControls } from './CanvasControls';
import { CanvasDecorations } from './CanvasDecorations';
import { TreeNodeCard } from './TreeNodeCard';

type DragState =
  | {
      type: 'move';
      nodeId: string;
      startX: number;
      startY: number;
      nodeX: number;
      nodeY: number;
      moved: boolean;
    }
  | {
      type: 'edge';
      fromId: string;
      toId: string;
      end: 'parent' | 'child';
      startX: number;
      startY: number;
      handleX: number;
      handleY: number;
      moved: boolean;
    }
  | null;

interface TreeCanvasProps {
  nodes: TreeNode[];
  chartType: ChartType;
  selectedId: string | null;
  selectionMode: boolean;
  multiSelectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onRename: (id: string, name: string) => void;
  /** Resolves a chart id to its name for the link badge tooltip. */
  chartNameFor?: (chartId: string) => string | null;
  onOpenLink?: (node: TreeNode) => void;
  onNavigateLink?: (node: TreeNode) => void;
  /** Node to center when arriving via a cross-chart link. */
  focusNodeId?: string | null;
  /** Quick-create a card below/beside the selected node. */
  onQuickAdd?: (
    node: TreeNode,
    kind: 'below' | 'beside',
    name: string,
    relationshipValue: string,
  ) => Promise<void> | void;
  /** Open the "connect to an existing card" dialog for a node. */
  onLinkExisting?: (node: TreeNode) => void;
  /** Dropped one card onto another — choose a relationship to connect them. */
  onConnectDrop?: (
    source: TreeNode,
    target: TreeNode,
    category: 'directional' | 'lateral',
  ) => void;
  /** Dropped a card onto a sibling — reorder instead of link. */
  onReorder?: (source: TreeNode, target: TreeNode) => void;
  /** Move the selected card one slot earlier/later among its siblings. */
  onMoveSibling?: (node: TreeNode, delta: -1 | 1) => void;
}

export function TreeCanvas({
  nodes,
  chartType,
  selectedId,
  selectionMode,
  multiSelectedIds,
  onToggleSelect,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onRename,
  chartNameFor,
  onOpenLink,
  onNavigateLink,
  focusNodeId,
  onQuickAdd,
  onLinkExisting,
  onConnectDrop,
  onReorder,
  onMoveSibling,
}: TreeCanvasProps) {
  const { setPosition, setParent, setPartner } = useTreeChart();
  const { success: toastSuccess, error: toastError } = useToast();
  const { containerRef, transform, transformRef, setTransform, zoomBy, fit, handlers } =
    usePanZoom();

  const [drag, setDrag] = useState<DragState>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetInfo | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);
  const [quickKind, setQuickKind] = useState<'below' | 'beside' | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickRelationship, setQuickRelationship] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const { theme } = useTheme();

  const allowPartner = chartTypeAllowsPartners(chartType);
  const partnerLabel =
    chartType.relationships.find((def) => def.link === 'partner')?.label ?? 'Partner';
  const childLabel =
    chartType.relationships.find((def) => def.directional && def.link === 'parent')
      ?.backwardLabel ?? 'Child';

  const bounds = useMemo(() => computeBounds(nodes), [nodes]);
  const edges = useMemo(() => computeEdges(nodes), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const depths = useMemo(() => computeDepths(nodes), [nodes]);

  const childCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) {
      if (n.parentId) counts.set(n.parentId, (counts.get(n.parentId) ?? 0) + 1);
    }
    return counts;
  }, [nodes]);

  /** Left-to-right index of each node among its siblings (for staggered labels). */
  const siblingIndex = useMemo(() => {
    const groups = new Map<string, TreeNode[]>();
    for (const n of nodes) {
      if (!n.parentId) continue;
      const list = groups.get(n.parentId) ?? [];
      list.push(n);
      groups.set(n.parentId, list);
    }
    const map = new Map<string, number>();
    for (const list of groups.values()) {
      list.sort((a, b) => a.positionX - b.positionX);
      list.forEach((n, index) => map.set(n.id, index));
    }
    return map;
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

  /** Nodes whose incident connectors should thicken/darken (hover/drag/select). */
  const emphasisIds = useMemo(() => {
    const ids = new Set<string>();
    if (drag?.type === 'move') ids.add(drag.nodeId);
    if (hoveredNodeId) ids.add(hoveredNodeId);
    if (selectionMode) {
      for (const id of multiSelectedIds) ids.add(id);
    } else if (selectedId) {
      ids.add(selectedId);
    }
    return ids;
  }, [drag, hoveredNodeId, selectionMode, multiSelectedIds, selectedId]);

  const contentWidth = nodes.length === 0 ? 0 : Math.ceil(bounds.maxX - bounds.minX) + LAYOUT_MARGIN * 2;
  const contentHeight = nodes.length === 0 ? 0 : Math.ceil(bounds.maxY - bounds.minY) + LAYOUT_MARGIN * 2;
  const nodeSignature = useMemo(() => nodes.map((n) => n.id).sort().join('|'), [nodes]);

  // Fit the chart whenever the set of nodes structurally changes (mount, sample
  // load, add/delete). When arriving via a cross-chart link, center that node.
  useEffect(() => {
    if (contentWidth <= 0 || contentHeight <= 0) return;
    const focusNode = focusNodeId ? nodes.find((n) => n.id === focusNodeId) : null;
    const el = containerRef.current;
    if (focusNode && el) {
      const offsetX = LAYOUT_MARGIN - bounds.minX;
      const offsetY = LAYOUT_MARGIN - bounds.minY;
      const cx = focusNode.positionX + offsetX;
      const cy = focusNode.positionY + offsetY;
      setTransform({
        zoom: 1,
        x: el.clientWidth / 2 - cx,
        y: el.clientHeight / 2 - cy,
      });
      return;
    }
    fit(contentWidth, contentHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeSignature]);

  const displayPositions = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, { x: n.positionX, y: n.positionY }]));
    if (drag?.type === 'move' && ghostPos) map.set(drag.nodeId, ghostPos);
    return map;
  }, [nodes, drag, ghostPos]);

  const shownNode = (node: TreeNode): TreeNode => {
    const pos = displayPositions.get(node.id);
    return pos ? { ...node, positionX: pos.x, positionY: pos.y } : node;
  };

  useEffect(() => {
    if (!drag) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrag(null);
        setGhostPos(null);
        setPointerPos(null);
        setDropTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drag]);

  // Close the quick-add popover when the selection changes.
  useEffect(() => {
    setQuickKind(null);
    setQuickName('');
    setQuickRelationship('');
  }, [selectedId]);

  const handleNodePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    node: TreeNode,
  ) => {
    if (selectionMode) return;
    if ((event.target as HTMLElement).closest('button, input')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      type: 'move',
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: node.positionX,
      nodeY: node.positionY,
      moved: false,
    });
  };

  const handleNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.type !== 'move') return;
    const zoom = transformRef.current.zoom;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    const nextPos = { x: drag.nodeX + dx, y: drag.nodeY + dy };
    setDrag({ ...drag, moved: true });
    setGhostPos(nextPos);
    setDropTarget(findDropTarget(nodes, nextPos, allowPartner, drag.nodeId));
  };

  const handleNodePointerUp = async () => {
    if (!drag || drag.type !== 'move') return;
    if (drag.moved) {
      suppressClickRef.current = true;
      if (dropTarget?.zone && ghostPos) {
        const source = byId.get(drag.nodeId);
        const target = byId.get(dropTarget.nodeId);
        const category: 'directional' | 'lateral' =
          dropTarget.zone === 'partner' ? 'lateral' : 'directional';
        const compatible =
          category === 'lateral'
            ? chartType.relationships.filter((def) => def.link === 'partner')
            : chartType.relationships.filter((def) => def.directional && def.link === 'parent');

        const sameRow = (source?.parentId ?? null) === (target?.parentId ?? null);
        if (onReorder && source && target && sameRow) {
          // Dropping onto a sibling reorders instead of linking.
          onReorder(source, target);
        } else if (onConnectDrop && source && target && compatible.length > 0) {
          // Let the app choose the relationship instead of assuming one.
          onConnectDrop(source, target, category);
        } else if (dropTarget.zone === 'partner') {
          try {
            await setPartner(drag.nodeId, dropTarget.nodeId);
            toastSuccess('Partner linked');
          } catch {
            toastError('Failed to link partner');
          }
        } else if (!wouldCreateCycle(nodes, drag.nodeId, dropTarget.nodeId)) {
          try {
            await setParent(drag.nodeId, dropTarget.nodeId);
            toastSuccess('Relationship updated');
          } catch {
            toastError('Failed to update relationship');
          }
        } else {
          toastError('Cannot move a node under its own descendant');
        }
      } else if (ghostPos) {
        try {
          await setPosition(drag.nodeId, ghostPos.x, ghostPos.y);
        } catch {
          toastError('Failed to save position');
        }
      }
    }
    setDrag(null);
    setGhostPos(null);
    setDropTarget(null);
  };

  const handleEdgePointerDown = (
    event: React.PointerEvent<SVGCircleElement>,
    edge: { fromId: string; toId: string },
    end: 'parent' | 'child',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const shownFrom = shownNode(from);
    const shownTo = shownNode(to);
    const handlePos =
      end === 'parent'
        ? { x: shownFrom.positionX, y: shownFrom.positionY + NODE_HEIGHT / 2 }
        : { x: shownTo.positionX, y: shownTo.positionY - NODE_HEIGHT / 2 };
    setDrag({
      type: 'edge',
      fromId: edge.fromId,
      toId: edge.toId,
      end,
      startX: event.clientX,
      startY: event.clientY,
      handleX: handlePos.x,
      handleY: handlePos.y,
      moved: false,
    });
    setPointerPos(handlePos);
  };

  const handleEdgePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!drag || drag.type !== 'edge') return;
    const zoom = transformRef.current.zoom;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    setDrag({ ...drag, moved: true });
    const pos = { x: drag.handleX + dx, y: drag.handleY + dy };
    setPointerPos(pos);
    setDropTarget(
      findDropTarget(
        nodes,
        pos,
        allowPartner,
        drag.end === 'parent' ? drag.toId : drag.fromId,
        drag.end === 'parent' ? drag.fromId : drag.toId,
      ),
    );
  };

  const handleEdgePointerUp = async () => {
    if (!drag || drag.type !== 'edge') return;
    if (drag.moved && dropTarget) {
      suppressClickRef.current = true;
      const targetId = dropTarget.nodeId;
      try {
        if (drag.end === 'parent') {
          const childId = drag.toId;
          if (
            targetId !== drag.fromId &&
            targetId !== childId &&
            !wouldCreateCycle(nodes, childId, targetId)
          ) {
            await setParent(childId, targetId);
            toastSuccess('Edge reconnected');
          } else {
            toastError('Cannot reconnect that way');
          }
        } else {
          const parentId = drag.fromId;
          if (
            targetId !== drag.fromId &&
            targetId !== drag.toId &&
            !wouldCreateCycle(nodes, targetId, parentId)
          ) {
            await setParent(targetId, parentId);
            toastSuccess('Edge reconnected');
          } else {
            toastError('Cannot reconnect that way');
          }
        }
      } catch {
        toastError('Failed to reconnect edge');
      }
    }
    setDrag(null);
    setPointerPos(null);
    setDropTarget(null);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center" onClick={() => onSelect(null)}>
        <EmptyState
          message="No nodes yet"
          description="Add your first node to start building the tree."
          action={
            <Button size="sm" onClick={onAdd}>
              Add first node
            </Button>
          }
        />
      </div>
    );
  }

  const offsetX = LAYOUT_MARGIN - bounds.minX;
  const offsetY = LAYOUT_MARGIN - bounds.minY;

  const selectedNode = selectedId ? (byId.get(selectedId) ?? null) : null;
  const quickScreen = (() => {
    if (!selectedNode) return null;
    const cx = selectedNode.positionX + offsetX;
    const cy = selectedNode.positionY + offsetY;
    return {
      x: transform.x + cx * transform.zoom,
      y: transform.y + (cy + NODE_HEIGHT / 2) * transform.zoom + 8,
    };
  })();

  const quickBelowOptions = relationshipOptions(chartType).filter(
    (option) => option.direction === 'backward',
  );
  const quickBesideOptions = relationshipOptions(chartType).filter(
    (option) => option.direction === 'lateral',
  );
  const quickActiveOptions = quickKind === 'below' ? quickBelowOptions : quickBesideOptions;

  const submitQuickAdd = async () => {
    if (!selectedNode || !quickKind || !onQuickAdd) return;
    const name = quickName.trim();
    if (!name) return;
    setQuickSaving(true);
    try {
      await onQuickAdd(selectedNode, quickKind, name, quickRelationship);
      setQuickKind(null);
      setQuickName('');
      setQuickRelationship('');
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{ background: theme.canvasBackground }}
      {...handlers}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect(null);
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <CanvasDecorations
          width={contentWidth}
          height={contentHeight}
          bounds={{
            left: bounds.minX + offsetX,
            top: bounds.minY + offsetY,
            right: bounds.maxX + offsetX,
            bottom: bounds.maxY + offsetY,
          }}
        />
        <svg width={contentWidth} height={contentHeight} className="block">
          {edges.map((edge) => {
            const from = byId.get(edge.fromId);
            const to = byId.get(edge.toId);
            if (!from || !to) return null;
            const shownFrom = shownNode(from);
            const shownTo = shownNode(to);
            const key = `${edge.fromId}->${edge.toId}`;
            const isDraggedEdge =
              drag?.type === 'edge' &&
              drag.fromId === edge.fromId &&
              drag.toId === edge.toId;
            const edgeActive =
              emphasisIds.has(edge.fromId) || emphasisIds.has(edge.toId);
            const style = resolveEdgeStyle(chartType, edge.kind, shownFrom, shownTo);
            if (edge.kind === 'partner') {
              const { path, midX, midY } = partnerEdgePath(shownFrom, shownTo, offsetX, offsetY);
              const spouseColor = theme.spouseConnectorColor ?? theme.connectorColor;
              const edgeLabel = style.label || partnerLabel;
              return (
                <g key={key}>
                  <path
                    d={path}
                    fill="none"
                    stroke={spouseColor}
                    strokeWidth={edgeActive ? 2 : theme.connectorWidth}
                    strokeDasharray={style.dashed ? '5 4' : undefined}
                    opacity={isDraggedEdge ? 0.2 : 1}
                  />
                  {style.showHeart && (
                    <g
                      transform={`translate(${midX} ${midY}) scale(${edgeActive ? 0.7 : 0.55}) translate(-12 -12)`}
                      pointerEvents="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        fill={spouseColor}
                      />
                    </g>
                  )}
                  <text
                    x={midX}
                    y={midY - NODE_HEIGHT / 2 - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill={theme.textSecondary}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {edgeLabel}
                  </text>
                </g>
              );
            }
            const fanCount = childCount.get(edge.fromId) ?? 1;
            const childIndex = siblingIndex.get(edge.toId) ?? 0;
            const labelPoint = parentEdgeLabelPoint(
              shownFrom,
              shownTo,
              offsetX,
              offsetY,
              childIndex,
              fanCount,
            );
            return (
              <g key={key}>
                <path
                  d={parentEdgePath(shownFrom, shownTo, offsetX, offsetY, fanCount)}
                  fill="none"
                  stroke={
                    edgeActive
                      ? (theme.connectorActiveColor ?? theme.connectorColor)
                      : theme.connectorColor
                  }
                  strokeWidth={edgeActive ? 2 : theme.connectorWidth}
                  opacity={isDraggedEdge ? 0.2 : 1}
                />
                {!isDraggedEdge && (
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y}
                    textAnchor="middle"
                    fontSize={10}
                    fill={theme.textSecondary}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {style.label || childLabel}
                  </text>
                )}
                {!isDraggedEdge && !selectionMode && (
                  <>
                    <circle
                      cx={shownFrom.positionX + offsetX}
                      cy={shownFrom.positionY + offsetY + NODE_HEIGHT / 2}
                      r={22}
                      fill="transparent"
                      data-edge-handle=""
                      className="cursor-grab"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => handleEdgePointerDown(e, edge, 'parent')}
                      onPointerMove={handleEdgePointerMove}
                      onPointerUp={handleEdgePointerUp}
                    />
                    <circle
                      cx={shownFrom.positionX + offsetX}
                      cy={shownFrom.positionY + offsetY + NODE_HEIGHT / 2}
                      r={4}
                      fill={theme.handleColor}
                      pointerEvents="none"
                    />
                    <circle
                      cx={shownTo.positionX + offsetX}
                      cy={shownTo.positionY + offsetY - NODE_HEIGHT / 2}
                      r={22}
                      fill="transparent"
                      data-edge-handle=""
                      className="cursor-grab"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => handleEdgePointerDown(e, edge, 'child')}
                      onPointerMove={handleEdgePointerMove}
                      onPointerUp={handleEdgePointerUp}
                    />
                    <circle
                      cx={shownTo.positionX + offsetX}
                      cy={shownTo.positionY + offsetY - NODE_HEIGHT / 2}
                      r={4}
                      fill={theme.handleColor}
                      pointerEvents="none"
                    />
                  </>
                )}
              </g>
            );
          })}

          {drag?.type === 'edge' && pointerPos && (() => {
            const fixed = byId.get(drag.end === 'parent' ? drag.toId : drag.fromId);
            if (!fixed) return null;
            const shownFixed = shownNode(fixed);
            const ax = shownFixed.positionX;
            const ay =
              drag.end === 'parent'
                ? shownFixed.positionY - NODE_HEIGHT / 2
                : shownFixed.positionY + NODE_HEIGHT / 2;
            return (
              <path
                d={`M ${ax + offsetX} ${ay + offsetY} L ${pointerPos.x + offsetX} ${pointerPos.y + offsetY}`}
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 4"
                stroke={theme.dragPreviewColor}
              />
            );
          })()}
        </svg>

        {dropTarget && (() => {
          const target = byId.get(dropTarget.nodeId);
          if (!target) return null;
          const shown = shownNode(target);
          const isEdgeDrag = drag?.type === 'edge';
          return (
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: shown.positionX + offsetX,
                top: shown.positionY + offsetY,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="rounded-lg border-2"
                style={{ width: NODE_WIDTH, height: NODE_HEIGHT, borderColor: theme.accent }}
              />
              <div
                className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded px-2 py-1 text-xs font-medium shadow"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                {isEdgeDrag
                  ? 'Reconnect edge here'
                  : dropTarget.zone === 'partner'
                    ? `Link ${target.name} (${partnerLabel})`
                    : `Add as ${childLabel} of ${target.name}`}
              </div>
            </div>
          );
        })()}

        {nodes.map((node) => {
          const pos = displayPositions.get(node.id) ?? {
            x: node.positionX,
            y: node.positionY,
          };
          const isDragged = drag?.type === 'move' && drag.nodeId === node.id;
          const isMultiSelected = selectionMode && multiSelectedIds.has(node.id);
          return (
            <div
              key={node.id}
              data-node-drag=""
              className={`absolute touch-none ${
                selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
              } ${isDragged ? 'z-20' : 'z-10'}`}
              style={{
                left: pos.x + offsetX,
                top: pos.y + offsetY,
                transform: 'translate(-50%, -50%)',
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
            >
              <TreeNodeCard
                node={node}
                depth={depths.get(node.id) ?? 0}
                persona={personas.get(node.id) ?? 'child'}
                selected={selectionMode ? isMultiSelected : node.id === selectedId}
                selectionMode={selectionMode}
                dragging={isDragged}
                suppressClickRef={suppressClickRef}
                onHoverChange={(next) => setHoveredNodeId(next ? node.id : null)}
                onSelect={() =>
                  selectionMode ? onToggleSelect(node.id) : onSelect(node.id)
                }
                onEdit={() => onEdit(node)}
                onDelete={() => onDelete(node)}
                onRename={(name) => onRename(node.id, name)}
                linkInfo={
                  chartNameFor
                    ? node.linkedNodeRef
                      ? { chartName: chartNameFor(node.linkedNodeRef.chartId) }
                      : null
                    : undefined
                }
                onOpenLink={onOpenLink ? () => onOpenLink(node) : undefined}
                onNavigateLink={onNavigateLink ? () => onNavigateLink(node) : undefined}
              />
            </div>
          );
        })}
      </div>

      {selectedNode &&
        quickScreen &&
        !selectionMode &&
        (onQuickAdd || onLinkExisting || onMoveSibling) && (
        <div
          className="absolute z-30 -translate-x-1/2"
          style={{ left: quickScreen.x, top: quickScreen.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="flex items-center gap-1 rounded-lg border p-1 shadow-md"
            style={{
              backgroundColor: 'var(--surface-background)',
              borderColor: 'var(--border-color)',
            }}
          >
            {onMoveSibling && (
              <button
                type="button"
                title="Move earlier in the row"
                aria-label="Move earlier in the row"
                onClick={() => onMoveSibling(selectedNode, -1)}
                className="rounded px-2 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--control-hover)]"
              >
                ◀
              </button>
            )}
            {onMoveSibling && (
              <button
                type="button"
                title="Move later in the row"
                aria-label="Move later in the row"
                onClick={() => onMoveSibling(selectedNode, 1)}
                className="rounded px-2 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--control-hover)]"
              >
                ▶
              </button>
            )}
            {onQuickAdd && (
              <button
                type="button"
                onClick={() => {
                  setQuickKind('below');
                  setQuickName('');
                  setQuickRelationship(quickBelowOptions[0]?.value ?? '');
                }}
                className="rounded px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--control-hover)]"
              >
                ＋ Below
              </button>
            )}
            {onQuickAdd && (
              <button
                type="button"
                onClick={() => {
                  setQuickKind('beside');
                  setQuickName('');
                  setQuickRelationship(quickBesideOptions[0]?.value ?? '');
                }}
                className="rounded px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--control-hover)]"
              >
                ＋ Beside
              </button>
            )}
            {onLinkExisting && (
              <button
                type="button"
                onClick={() => onLinkExisting(selectedNode)}
                className="rounded px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--control-hover)]"
              >
                Link existing…
              </button>
            )}
          </div>

          {quickKind && onQuickAdd && (
            <div
              className="mt-1 flex flex-col gap-1 rounded-lg border p-1 shadow-md"
              style={{
                backgroundColor: 'var(--surface-background)',
                borderColor: 'var(--border-color)',
              }}
            >
              {quickActiveOptions.length > 1 && (
                <select
                  value={quickRelationship}
                  onChange={(event) => setQuickRelationship(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  aria-label="Relationship"
                  className="rounded border border-[var(--border-color)] bg-[var(--surface-background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  {quickActiveOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={quickName}
                  onChange={(event) => setQuickName(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') void submitQuickAdd();
                    if (event.key === 'Escape') setQuickKind(null);
                  }}
                  placeholder={quickKind === 'below' ? 'New card below…' : 'New card beside…'}
                  className="w-40 rounded border border-[var(--border-color)] bg-[var(--surface-background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  disabled={quickSaving || !quickName.trim()}
                  onClick={() => void submitQuickAdd()}
                  className="rounded px-2 py-1 text-xs font-semibold text-[var(--accent)] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <CanvasControls
        zoom={transform.zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onReset={() => setTransform({ x: 0, y: 0, zoom: 1 })}
        onFit={() => fit(contentWidth, contentHeight)}
      />
    </div>
  );
}





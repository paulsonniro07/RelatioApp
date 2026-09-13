import { NODE_HEIGHT, NODE_WIDTH } from './layout';
import type { TreeNode } from './types';

export type EdgeKind = 'parent' | 'partner';

export interface TreeEdge {
  fromId: string;
  toId: string;
  kind: EdgeKind;
}

/**
 * Builds the list of edges to draw.
 * - parent: every node pointing at its parent.
 * - partner: mutual lateral links, deduplicated (one edge per pair).
 */
export function computeEdges(nodes: TreeNode[]): TreeEdge[] {
  const ids = new Set(nodes.map((n) => n.id));
  const edges: TreeEdge[] = [];
  const seenPartners = new Set<string>();
  for (const node of nodes) {
    if (node.parentId && ids.has(node.parentId)) {
      edges.push({ fromId: node.parentId, toId: node.id, kind: 'parent' });
    }
    if (node.partnerId && ids.has(node.partnerId)) {
      // Deduplicate on the unordered pair so a one-directional lateral link
      // still renders (the old `node.id < partnerId` check could drop edges
      // when only one side pointed at the other).
      const key = [node.id, node.partnerId].sort().join('|');
      if (!seenPartners.has(key)) {
        seenPartners.add(key);
        edges.push({ fromId: node.id, toId: node.partnerId, kind: 'partner' });
      }
    }
  }
  return edges;
}

/** Above this many siblings, connectors fan out earlier and labels stagger. */
export const FAN_STYLE_THRESHOLD = 3;

interface ParentEdgeGeometry {
  x1: number;
  y1: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  x2: number;
  y2: number;
  wide: boolean;
}

/**
 * Control points from the bottom of a parent to the top of one child.
 *
 * - Small fans (≤ FAN_STYLE_THRESHOLD) keep the original symmetric S-curve that
 *   leaves the parent vertically.
 * - Wide fans instead bias the first control point toward the child so the line
 *   diverges from the parent immediately (instead of leaving as a tight bundle).
 */
function parentEdgeGeometry(
  from: TreeNode,
  to: TreeNode,
  offsetX: number,
  offsetY: number,
  fanCount: number,
): ParentEdgeGeometry {
  const x1 = from.positionX + offsetX;
  const y1 = from.positionY + offsetY + NODE_HEIGHT / 2;
  const x2 = to.positionX + offsetX;
  const y2 = to.positionY + offsetY - NODE_HEIGHT / 2;

  if (fanCount > FAN_STYLE_THRESHOLD) {
    const dy = y2 - y1;
    return {
      x1,
      y1,
      c1x: x1 + (x2 - x1) * 0.55,
      c1y: y1 + dy * 0.4,
      c2x: x2,
      c2y: y2 - dy * 0.25,
      x2,
      y2,
      wide: true,
    };
  }

  const dy = Math.max(Math.abs(y2 - y1) * 0.5, 20);
  return {
    x1,
    y1,
    c1x: x1,
    c1y: y1 + dy,
    c2x: x2,
    c2y: y2 - dy,
    x2,
    y2,
    wide: false,
  };
}

/** Smooth S-curve from the bottom of the parent to the top of the child. */
export function parentEdgePath(
  from: TreeNode,
  to: TreeNode,
  offsetX: number,
  offsetY: number,
  fanCount = 1,
): string {
  const g = parentEdgeGeometry(from, to, offsetX, offsetY, fanCount);
  return `M ${g.x1} ${g.y1} C ${g.c1x} ${g.c1y}, ${g.c2x} ${g.c2y}, ${g.x2} ${g.y2}`;
}

/**
 * Where to place a parent→child edge label.
 *
 * Small fans keep the original straight-line midpoint (unchanged rendering).
 * Wide fans place the label on its own curve at a per-sibling `t`, so labels
 * sit at different points along the fan instead of one crowded row.
 */
export function parentEdgeLabelPoint(
  from: TreeNode,
  to: TreeNode,
  offsetX: number,
  offsetY: number,
  index: number,
  fanCount: number,
): { x: number; y: number } {
  if (fanCount <= FAN_STYLE_THRESHOLD) {
    return {
      x: (from.positionX + to.positionX) / 2 + offsetX,
      y: (from.positionY + to.positionY) / 2 + offsetY - 12,
    };
  }

  const g = parentEdgeGeometry(from, to, offsetX, offsetY, fanCount);
  const ratio = fanCount <= 1 ? 0.5 : index / (fanCount - 1);
  const t = 0.3 + ratio * 0.5; // 0.30 … 0.80 along the curve
  const mt = 1 - t;
  const x =
    mt * mt * mt * g.x1 +
    3 * mt * mt * t * g.c1x +
    3 * mt * t * t * g.c2x +
    t * t * t * g.x2;
  const y =
    mt * mt * mt * g.y1 +
    3 * mt * mt * t * g.c1y +
    3 * mt * t * t * g.c2y +
    t * t * t * g.y2;
  return { x, y: y - 6 };
}

/** Horizontal line between two side-by-side partners, plus the midpoint marker. */
export function partnerEdgePath(
  from: TreeNode,
  to: TreeNode,
  offsetX: number,
  offsetY: number,
): { path: string; midX: number; midY: number } {
  const x1 = from.positionX + offsetX;
  const y1 = from.positionY + offsetY;
  const x2 = to.positionX + offsetX;
  const y2 = to.positionY + offsetY;
  const path =
    x1 <= x2
      ? `M ${x1 + NODE_WIDTH / 2} ${y1} L ${x2 - NODE_WIDTH / 2} ${y2}`
      : `M ${x1 - NODE_WIDTH / 2} ${y1} L ${x2 + NODE_WIDTH / 2} ${y2}`;
  return { path, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
}

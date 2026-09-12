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
  for (const node of nodes) {
    if (node.parentId && ids.has(node.parentId)) {
      edges.push({ fromId: node.parentId, toId: node.id, kind: 'parent' });
    }
    if (node.partnerId && ids.has(node.partnerId) && node.id < node.partnerId) {
      edges.push({ fromId: node.id, toId: node.partnerId, kind: 'partner' });
    }
  }
  return edges;
}

/** Smooth S-curve from the bottom of the parent to the top of the child. */
export function parentEdgePath(
  from: TreeNode,
  to: TreeNode,
  offsetX: number,
  offsetY: number,
): string {
  const x1 = from.positionX + offsetX;
  const y1 = from.positionY + offsetY + NODE_HEIGHT / 2;
  const x2 = to.positionX + offsetX;
  const y2 = to.positionY + offsetY - NODE_HEIGHT / 2;
  const dy = Math.max(Math.abs(y2 - y1) * 0.5, 20);
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
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

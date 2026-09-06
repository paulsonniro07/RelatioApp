import type { TreeNode } from './types';

export const NODE_WIDTH = 180;
/** Card height — sized to fit a two-line name plus role and note lines. */
export const NODE_HEIGHT = 112;
/** Row-to-row distance between generations (generous breathing room). */
export const VERTICAL_GAP = 200;
/** Gap between sibling cards on the same row (1.7x the previous 36px). */
export const HORIZONTAL_GAP = 60;
export const LAYOUT_MARGIN = 90;

/**
 * Computes the hierarchy depth of every node (root = 0, its children = 1, ...).
 * Handles orphaned nodes and corrupted cycles gracefully.
 */
export function computeDepths(nodes: TreeNode[]): Map<string, number> {
  const byId = new Map<string, TreeNode>(nodes.map((n) => [n.id, n]));
  const depths = new Map<string, number>();
  const pending = new Set<string>(nodes.map((n) => n.id));

  let guard = 0;
  while (pending.size > 0 && guard <= nodes.length) {
    guard += 1;
    let progressed = false;
    for (const id of [...pending]) {
      const node = byId.get(id);
      if (!node) {
        pending.delete(id);
        continue;
      }
      if (node.parentId === null || !byId.has(node.parentId)) {
        depths.set(id, 0);
        pending.delete(id);
        progressed = true;
      } else {
        const parentDepth = depths.get(node.parentId);
        if (parentDepth !== undefined) {
          depths.set(id, parentDepth + 1);
          pending.delete(id);
          progressed = true;
        }
      }
    }
    if (!progressed) {
      // Orphan chains / corrupted cycles — break them by assigning top depth.
      for (const id of pending) {
        depths.set(id, 0);
      }
      break;
    }
  }
  return depths;
}

/**
 * Tiered tree auto-layout.
 * - Y is derived from computed depth (computed depth drives the layout position).
 * - X is derived from subtree leaf widths (Reingold–Tilford style in-order pass).
 * - Spouses are nudged to sit side-by-side on the same row when they are close.
 * - All positions are normalized so the minimum point starts at LAYOUT_MARGIN.
 */
export function computeAutoLayout(
  nodes: TreeNode[],
  options: { horizontalGap?: number; verticalGap?: number } = {},
): Map<string, { x: number; y: number }> {
  const horizontalGap = options.horizontalGap ?? HORIZONTAL_GAP;
  const verticalGap = options.verticalGap ?? VERTICAL_GAP;

  const depths = computeDepths(nodes);
  const byId = new Map<string, TreeNode>(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, TreeNode[]>();
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    if (parentId === null) {
      roots.push(node);
    } else {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(node);
      childrenOf.set(parentId, siblings);
    }
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const positions = new Map<string, { x: number; y: number }>();
  let cursorX = 0;

  function place(node: TreeNode): number {
    const children = childrenOf.get(node.id) ?? [];
    const y = (depths.get(node.id) ?? 0) * verticalGap;
    if (children.length === 0) {
      positions.set(node.id, { x: cursorX, y });
      cursorX += NODE_WIDTH + horizontalGap;
      return NODE_WIDTH + horizontalGap;
    }
    let width = 0;
    for (const child of children) {
      width += place(child);
    }
    const first = positions.get(children[0].id);
    const last = positions.get(children[children.length - 1].id);
    positions.set(node.id, {
      x: first && last ? (first.x + last.x) / 2 : cursorX,
      y,
    });
    return width;
  }

  for (const root of roots) {
    place(root);
  }

  // Spouse alignment: partners share a row and sit side by side.
  const spousePairs = new Set<string>();
  for (const node of nodes) {
    if (node.partnerId && byId.has(node.partnerId) && node.id < node.partnerId) {
      spousePairs.add(`${node.id}|${node.partnerId}`);
    }
  }
  for (const pair of spousePairs) {
    const [aId, bId] = pair.split('|');
    const a = positions.get(aId);
    const b = positions.get(bId);
    if (!a || !b) continue;
    const aDepth = depths.get(aId) ?? 0;
    const bDepth = depths.get(bId) ?? 0;
    if (aDepth === bDepth) {
      // Same generation — place the right one directly beside the left one.
      a.y = Math.max(a.y, b.y);
      b.y = a.y;
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      right.x = left.x + NODE_WIDTH + horizontalGap / 2;
    } else {
      // Different generations — keep the tree-embedded spouse fixed and
      // bring the detached spouse (e.g. an in-law with no parents shown)
      // onto the same row, directly beside them.
      const [embedded, loose] = aDepth > bDepth ? [a, b] : [b, a];
      loose.y = embedded.y;
      loose.x = embedded.x + NODE_WIDTH + horizontalGap / 2;
    }
  }

  // Row compaction: within each row push overlapping nodes right so no two
  // cards collide (fixes overlaps introduced by the spouse alignment).
  const rows = new Map<number, string[]>();
  for (const [id, pos] of positions) {
    const list = rows.get(pos.y) ?? [];
    list.push(id);
    rows.set(pos.y, list);
  }
  for (const list of rows.values()) {
    list.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0));
    let prevEnd = -Infinity;
    for (const id of list) {
      const pos = positions.get(id);
      if (!pos) continue;
      if (pos.x < prevEnd + horizontalGap) {
        pos.x = prevEnd + horizontalGap;
      }
      prevEnd = pos.x + NODE_WIDTH;
    }
  }

  // Normalize so the top-left of the drawing starts at LAYOUT_MARGIN.
  let minX = Infinity;
  let minY = Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
  }
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;
  const offsetX = LAYOUT_MARGIN - minX;
  const offsetY = LAYOUT_MARGIN - minY;
  for (const pos of positions.values()) {
    pos.x += offsetX;
    pos.y += offsetY;
  }

  return positions;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box of the node cards (card size accounted for). */
export function computeBounds(nodes: TreeNode[]): Bounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.positionX - NODE_WIDTH / 2);
    minY = Math.min(minY, n.positionY - NODE_HEIGHT / 2);
    maxX = Math.max(maxX, n.positionX + NODE_WIDTH / 2);
    maxY = Math.max(maxY, n.positionY + NODE_HEIGHT / 2);
  }
  return { minX, minY, maxX, maxY };
}


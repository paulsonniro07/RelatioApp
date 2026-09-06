import { NODE_HEIGHT, NODE_WIDTH } from './layout';
import type { ChartMode, TreeNode } from './types';

export const DROP_THRESHOLD = 150;

export type DropZone = 'child' | 'partner' | null;

export interface DropTargetInfo {
  nodeId: string;
  zone: DropZone;
}

/**
 * Finds the node closest to `pointer` (canvas coordinates) within DROP_THRESHOLD.
 * - `child` zone: pointer is above the card's top edge → drop makes the dragged
 *   node a child of the target.
 * - `partner` zone (family mode only): pointer is beside the card → drop links
 *   the dragged node as a partner of the target.
 * `sourceId` and `excludeId` (optional) are never returned as a target.
 */
export function findDropTarget(
  nodes: TreeNode[],
  pointer: { x: number; y: number },
  mode: ChartMode,
  sourceId?: string,
  excludeId?: string,
): DropTargetInfo | null {
  let best: DropTargetInfo | null = null;
  let bestDistance = Infinity;

  for (const node of nodes) {
    if (node.id === sourceId) continue;
    if (excludeId && node.id === excludeId) continue;
    const dx = pointer.x - node.positionX;
    const dy = pointer.y - node.positionY;
    const distance = Math.hypot(dx, dy);
    if (distance > DROP_THRESHOLD || distance >= bestDistance) continue;
    bestDistance = distance;

    let zone: DropZone = null;
    if (dy < -NODE_HEIGHT * 0.3) {
      zone = 'child';
    } else if (
      mode === 'family' &&
      Math.abs(dx) > NODE_WIDTH * 0.5 &&
      Math.abs(dy) < NODE_HEIGHT * 0.6
    ) {
      zone = 'partner';
    }
    best = { nodeId: node.id, zone };
  }

  return best;
}

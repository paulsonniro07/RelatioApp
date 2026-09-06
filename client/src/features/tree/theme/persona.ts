import type { ChartMode, TreeNode } from '../types';
import type { RelationshipType } from './types';

const EXTENDED_RE = /sibling|brother|sister|aunt|uncle|cousin/i;
const SPOUSE_RE = /spouse|partner|girlfriend|boyfriend|husband|wife|in-law/i;
const CHILD_RE = /child|son|daughter|grandchild/i;
const PARENT_RE = /parent|father|mother|step/i;

/**
 * Resolves which relationship-type tint a node should use.
 *
 * - Org mode is structural: nodes that have reports are "Manager", leaves are
 *   "Report / team member".
 * - Family mode prefers the explicit relationship role when present, then
 *   falls back to the generation tier (root = grandparent / senior, depth 1 =
 *   parent, deeper = child) for generic or empty roles.
 */
export function resolvePersona(
  node: TreeNode,
  mode: ChartMode,
  depth: number,
  hasChildren: boolean,
): RelationshipType {
  if (mode === 'org') return hasChildren ? 'manager' : 'report';

  const role = node.role.trim().toLowerCase();
  if (role) {
    if (SPOUSE_RE.test(role)) return 'spouse';
    if (role.includes('grandparent')) return 'grandparent';
    if (PARENT_RE.test(role)) return 'parent';
    if (CHILD_RE.test(role)) return 'child';
    if (EXTENDED_RE.test(role)) return 'sibling';
  }

  if (depth <= 0) return 'grandparent';
  if (depth === 1) return 'parent';
  return 'child';
}

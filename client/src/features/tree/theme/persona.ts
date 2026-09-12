import { findRelationshipDef } from '../chartTypes';
import type { ChartType, TreeNode } from '../types';
import type { RelationshipType } from './types';

const EXTENDED_RE = /sibling|brother|sister|aunt|uncle|cousin/i;
const SPOUSE_RE = /spouse|partner|girlfriend|boyfriend|husband|wife|in-law/i;
const CHILD_RE = /child|son|daughter|grandchild/i;
const PARENT_RE = /parent|father|mother|step/i;

/**
 * Resolves which relationship-type tint a node should use.
 *
 * The node's chosen relationship type is authoritative (partner → spouse,
 * shared-parent → sibling, hierarchy → parent/child). Legacy nodes without a
 * relationship type fall back to their role text, then to generation depth.
 */
export function resolvePersona(
  node: TreeNode,
  chartType: ChartType,
  depth: number,
  hasChildren: boolean,
): RelationshipType {
  const def = findRelationshipDef(chartType, node.relationshipTypeId);
  if (def) {
    if (def.link === 'partner') return 'spouse';
    if (def.link === 'shared-parent') return 'sibling';
    return hasChildren ? 'parent' : 'child';
  }

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

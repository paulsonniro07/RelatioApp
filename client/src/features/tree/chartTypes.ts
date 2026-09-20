import type {
  ChartType,
  ChartTypeInput,
  RelationshipLink,
  RelationshipOption,
  RelationshipTypeDef,
  TreeNode,
} from './types';

/** Icon keys the relationship editor can offer (resolved in TreeNodeCard). */
export const RELATIONSHIP_ICON_KEYS = [
  'user',
  'users',
  'heart',
  'briefcase',
  'star',
  'tag',
] as const;

export type RelationshipIconKey = (typeof RELATIONSHIP_ICON_KEYS)[number];

/**
 * Starter chart types. These are ordinary, editable chart types — nothing in the
 * code treats them specially beyond being pre-filled on first load.
 */
export const STARTER_CHART_TYPES: ChartTypeInput[] = [
  {
    name: 'Family',
    usesLevels: false,
    isExample: true,
    relationships: [
      {
        id: 'parent-child',
        label: 'Parent / Child',
        forwardLabel: 'Parent',
        backwardLabel: 'Child',
        icon: 'user',
        directional: true,
        link: 'parent',
      },
      {
        id: 'spouse',
        label: 'Spouse',
        forwardLabel: 'Spouse',
        backwardLabel: 'Spouse',
        icon: 'heart',
        directional: false,
        link: 'partner',
      },
      {
        id: 'sibling',
        label: 'Sibling',
        forwardLabel: 'Sibling',
        backwardLabel: 'Sibling',
        icon: 'users',
        directional: false,
        link: 'shared-parent',
      },
    ],
  },
  {
    name: 'Organization',
    usesLevels: true,
    isExample: true,
    relationships: [
      {
        id: 'manager-report',
        label: 'Manager / Report',
        forwardLabel: 'Manager',
        backwardLabel: 'Report',
        icon: 'briefcase',
        directional: true,
        link: 'parent',
      },
      {
        id: 'peer',
        label: 'Peer / Colleague',
        forwardLabel: 'Peer',
        backwardLabel: 'Colleague',
        icon: 'users',
        directional: false,
        link: 'partner',
      },
    ],
  },
  {
    name: 'School',
    usesLevels: false,
    isExample: true,
    relationships: [
      {
        id: 'teacher-student',
        label: 'Teacher / Student',
        forwardLabel: 'Teacher',
        backwardLabel: 'Student',
        icon: 'star',
        directional: true,
        link: 'parent',
      },
      {
        id: 'classmate',
        label: 'Classmate',
        forwardLabel: 'Classmate',
        backwardLabel: 'Classmate',
        icon: 'users',
        directional: false,
        link: 'partner',
      },
      {
        id: 'mentor-mentee',
        label: 'Mentor / Mentee',
        forwardLabel: 'Mentor',
        backwardLabel: 'Mentee',
        icon: 'star',
        directional: true,
        link: 'parent',
      },
    ],
  },
];

/** Chart types with no relationship types are valid (users build them up). */
export function emptyChartType(name: string): ChartTypeInput {
  return { name, relationships: [] };
}

/**
 * Builds the "Add as …" options offered by the Add Node form.
 *
 * - directional types produce two options: the forward label and the backward
 *   label (e.g. "Parent" / "Child").
 * - lateral / shared-parent types produce one option using `label`.
 */
export function relationshipOptions(chartType: ChartType): RelationshipOption[] {
  const options: RelationshipOption[] = [];
  for (const def of chartType.relationships) {
    if (def.directional) {
      options.push({
        value: `${def.id}:forward`,
        relationshipId: def.id,
        direction: 'forward',
        label: def.forwardLabel,
        link: def.link,
        directional: true,
      });
      options.push({
        value: `${def.id}:backward`,
        relationshipId: def.id,
        direction: 'backward',
        label: def.backwardLabel,
        link: def.link,
        directional: true,
      });
    } else {
      options.push({
        value: `${def.id}:lateral`,
        relationshipId: def.id,
        direction: 'lateral',
        label: def.label,
        link: def.link,
        directional: false,
      });
    }
  }
  return options;
}

export function findRelationshipOption(
  chartType: ChartType,
  value: string,
): RelationshipOption | null {
  return relationshipOptions(chartType).find((option) => option.value === value) ?? null;
}

export function findRelationshipDef(
  chartType: ChartType,
  relationshipId: string | null,
): RelationshipTypeDef | null {
  if (!relationshipId) return null;
  return chartType.relationships.find((def) => def.id === relationshipId) ?? null;
}

/** Label to display on a node card, preferring the node's stored role text. */
export function relationshipLabelForNode(
  node: TreeNode,
  chartType: ChartType,
): string {
  if (node.role.trim()) return node.role;
  return findRelationshipDef(chartType, node.relationshipTypeId)?.label ?? '';
}

/** Whether a chart type can draw lateral (partner) links — drives the drop zone. */
export function chartTypeAllowsPartners(chartType: ChartType): boolean {
  return chartType.relationships.some((def) => def.link === 'partner');
}

/**
 * Resolves the relationship type that labels a lateral (partner-style) edge.
 * Prefers the relationship the connected node was placed with, so a sibling
 * (shared-parent fallback) shows "Sibling" rather than the chart's partner label.
 */
export function resolvePartnerRelationship(
  chartType: ChartType,
  ...nodes: Array<TreeNode | undefined | null>
): RelationshipTypeDef | null {
  for (const node of nodes) {
    if (!node) continue;
    const id = node.relationshipTypeId ?? inferRelationshipId(chartType, node.role);
    const def = findRelationshipDef(chartType, id);
    if (def && (def.link === 'partner' || def.link === 'shared-parent')) return def;
  }
  return chartType.relationships.find((def) => def.link === 'partner') ?? null;
}

/** Connector geometry family: hierarchy (S-curve) or lateral (side-by-side line). */
export type EdgeConnector = 'hierarchy' | 'lateral';

export interface ResolvedEdgeStyle {
  connector: EdgeConnector;
  dashed: boolean;
  showHeart: boolean;
  label: string;
}

/**
 * Resolves how any edge should be drawn from the relationship type definition
 * that produced it (never from a hardcoded per-type branch). Every relationship
 * type renders a connector; types with no matching definition fall back to a
 * solid neutral line so nothing is silently dropped.
 */
export function resolveEdgeStyle(
  chartType: ChartType,
  kind: 'parent' | 'partner',
  from: TreeNode | undefined,
  to: TreeNode | undefined,
): ResolvedEdgeStyle {
  if (kind === 'parent') {
    const def =
      findRelationshipDef(
        chartType,
        to?.relationshipTypeId ?? inferRelationshipId(chartType, to?.role ?? ''),
      ) ??
      findRelationshipDef(
        chartType,
        from?.relationshipTypeId ?? inferRelationshipId(chartType, from?.role ?? ''),
      ) ??
      chartType.relationships.find((d) => d.directional && d.link === 'parent') ??
      null;
    return {
      connector: 'hierarchy',
      dashed: false,
      showHeart: false,
      label: def?.backwardLabel ?? '',
    };
  }

  const def = resolvePartnerRelationship(chartType, from, to);
  const isSpouseLike = def?.icon === 'heart';
  return {
    connector: 'lateral',
    dashed: isSpouseLike,
    showHeart: isSpouseLike,
    label: def?.label ?? '',
  };
}

/** Whether a chart type exposes the manual level/tier field and legend. */
export function chartTypeUsesLevels(chartType: ChartType): boolean {
  return chartType.usesLevels;
}

/** Plain-language description of how a relationship type connects nodes. */
export function relationshipKindLabel(def: RelationshipTypeDef): string {
  if (def.link === 'shared-parent') return 'Same parent (siblings)';
  if (def.directional) return 'Above / Below';
  return 'Side by side';
}

/**
 * Resolves a stored relationship value (`<id>:<direction>`, or a legacy free-text
 * role) to a human label. Never returns the raw internal key.
 */
export function relationshipLabelForValue(
  chartType: ChartType,
  value: string,
  fallbackRole = '',
): string {
  const option = findRelationshipOption(chartType, value);
  if (option) return option.label;
  const id = value.includes(':') ? value.slice(0, value.indexOf(':')) : value;
  const def = findRelationshipDef(chartType, id);
  if (def) return def.label || def.forwardLabel || 'Relationship';
  return fallbackRole.trim() || 'Custom relationship';
}

/** A relationship type with sensible defaults for the inline create form. */
export function newRelationshipType(): RelationshipTypeDef {
  return {
    id: `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    forwardLabel: '',
    backwardLabel: '',
    icon: 'user',
    directional: true,
    link: 'parent',
  };
}

/** Slugifies a label into a relationship id unique within the chart type. */
export function relationshipIdFromLabel(label: string, existing: string[]): string {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'relationship';
  if (!existing.includes(base)) return base;
  let suffix = 2;
  while (existing.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Infers a relationship id from free-text role when migrating legacy nodes. */
export function inferRelationshipId(
  chartType: ChartType,
  role: string,
): string | null {
  const target = role.trim().toLowerCase();
  if (!target) return null;
  for (const def of chartType.relationships) {
    const labels = [def.label, def.forwardLabel, def.backwardLabel];
    if (labels.some((label) => label.toLowerCase() === target)) return def.id;
  }
  return null;
}

/** Maps a legacy `mode` value onto the matching seeded chart type, if any. */
export function chartTypeForLegacyMode(
  chartTypes: ChartType[],
  mode: string | undefined,
): ChartType | null {
  if (!mode) return null;
  const wanted = mode === 'family' ? 'Family' : 'Organization';
  return (
    chartTypes.find((ct) => ct.name.toLowerCase() === wanted.toLowerCase()) ??
    chartTypes[0] ??
    null
  );
}

export type { RelationshipLink };

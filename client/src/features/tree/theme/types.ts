/**
 * Theme layer — "one chart engine, many visual personalities".
 *
 * A `ChartTheme` only declares visual tokens. It never changes the layout
 * algorithm, the data model, or any editing behaviour. Every token below is a
 * plain CSS value so themes can be swapped at runtime without recompiling.
 */

export type ThemeId =
  | 'cute-pastel'
  | 'professional'
  | 'minimal'
  | 'school'
  | 'project-tech'
  | 'dark-neon';

/** How a node's avatar is presented on the card. */
export type AvatarStyle = 'tile' | 'circle' | 'square';

/** Lightweight inline-SVG decoration family drawn in the canvas margins. */
export type ThemeCanvasDecor =
  | 'botanical'
  | 'doodles'
  | 'circuit'
  | 'glow'
  | 'dots'
  | 'none';

/** Relationship-type card persona (drives tint, accent strip, avatar + icon). */
export type RelationshipType =
  | 'grandparent'
  | 'parent'
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'manager'
  | 'report';

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'grandparent',
  'parent',
  'spouse',
  'child',
  'sibling',
  'manager',
  'report',
];

/** One relationship-type tint: soft card background + matching accent. */
export interface RelationshipTone {
  /** Card background (soft pastel tint — never pure white). */
  background: string;
  /** Accent used for the left strip, avatar fallback fill and icons. */
  accent: string;
}

/** One generation "stripe" of the avatar palette. */
export interface ThemeAvatarEntry {
  /** Avatar tile / circle background. */
  background: string;
  /** Avatar foreground (initials) + tint for badges derived from it. */
  foreground: string;
}

export interface ChartTheme {
  id: ThemeId;
  /** Shown in the theme picker. */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  /** Font stack applied to the whole app. */
  fontFamily: string;

  /* ---- App shell & surfaces ---- */
  /** Full CSS `background` of the chart canvas area. */
  canvasBackground: string;
  /** Outer page/app-shell backdrop. */
  appBackground: string;
  /** Decorative accent family for the canvas margins (subtle, behind nodes). */
  canvasDecor?: ThemeCanvasDecor;
  /** Raised surfaces: header, panels, toolbars, floating pills. */
  surfaceBackground: string;
  /** Hairlines between surfaces (borders, dividers). */
  borderColor: string;
  /** Subtle fill for hover / active controls. */
  controlHover: string;

  /* ---- Node cards ---- */
  nodeBackground: string;
  nodeBorder: string;
  /** CSS `border-radius` of the card. */
  nodeRadius: string;
  /** CSS `box-shadow` for resting cards. */
  nodeShadow: string;
  /** CSS `box-shadow` while hovering / dragging. */
  nodeHoverShadow: string;

  /* ---- Typography ---- */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  /* ---- Selection & accents ---- */
  accent: string;
  /** Text/icon color placed on top of `accent`. */
  accentText: string;
  /** Transparent accent fill used for soft chips and rings. */
  accentSoft: string;
  /** Border color of a selected node card. */
  selectedBorder: string;
  /** Box-shadow (usually a ring + glow) of a selected node card. */
  selectedShadow: string;

  /* ---- Connectors ---- */
  /** SVG stroke for parent→child edges. */
  connectorColor: string;
  connectorWidth: number;
  /** Darker stroke used while a connected node is hovered/selected. */
  connectorActiveColor?: string;
  /** Dashed spouse/partner line color. */
  spouseConnectorColor?: string;
  /** SVG fill for grab handles / midpoint markers. */
  handleColor: string;
  /** SVG stroke while dragging an edge / moving a node. */
  dragPreviewColor: string;

  /* ---- Badges / pills (level chips, legend) ---- */
  badgeBackground: string;
  badgeText: string;

  /* ---- Avatars ---- */
  avatarStyle: AvatarStyle;
  /** Palette indexed by hierarchy depth (cycles past the end). */
  avatarPalette: ThemeAvatarEntry[];

  /* ---- Relationship-type tints (Cute Pastel uses these; neutral themes omit) ---- */
  relationshipTones?: Partial<Record<RelationshipType, RelationshipTone>>;
}

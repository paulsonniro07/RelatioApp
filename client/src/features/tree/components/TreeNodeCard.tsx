import { useState, type MutableRefObject, type ReactNode } from 'react';

import {
  BriefcaseIcon,
  CheckIcon,
  HeartIcon,
  LinkIcon,
  NoteIcon,
  PencilIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
} from '@/components/ui/icons';
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/tree/layout';
import { avatarEntryForDepth } from '@/features/tree/theme/colorUtils';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type { RelationshipType } from '@/features/tree/theme/types';
import type { TreeNode } from '@/features/tree/types';

import { NodeAvatar } from './NodeAvatar';

interface TreeNodeCardProps {
  node: TreeNode;
  /** Hierarchy depth (root = 0). */
  depth?: number;
  /** Relationship-type persona resolved from the tree (drives tint/strip). */
  persona?: RelationshipType;
  selected?: boolean;
  dragging?: boolean;
  selectionMode?: boolean;
  suppressClickRef?: MutableRefObject<boolean>;
  onHoverChange?: (hovered: boolean) => void;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  /**
   * Cross-chart link UI. `undefined` hides all link UI (used by the export
   * stage so badges never appear in the PNG). `null` = no link yet. An object
   * = linked; `chartName` is null when the target chart is gone.
   */
  linkInfo?: { chartName: string | null } | null;
  onOpenLink?: () => void;
  onNavigateLink?: () => void;
}

/** Small prefix icon for the role/relationship line, per persona. */
function personaIcon(persona: RelationshipType, className: string): ReactNode {
  if (persona === 'manager' || persona === 'report') return <BriefcaseIcon className={className} />;
  if (persona === 'spouse') return <HeartIcon className={className} />;
  if (persona === 'parent' || persona === 'grandparent') return <StarIcon className={className} />;
  return <UserIcon className={className} />;
}

export function TreeNodeCard({
  node,
  depth = 0,
  persona = 'child',
  selected = false,
  dragging = false,
  selectionMode = false,
  suppressClickRef,
  onHoverChange,
  onSelect,
  onEdit,
  onDelete,
  onRename,
  linkInfo,
  onOpenLink,
  onNavigateLink,
}: TreeNodeCardProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);

  const tone = theme.relationshipTones?.[persona];
  const hasTint = Boolean(tone);
  const cardBackground = tone?.background ?? theme.nodeBackground;
  const cardAccent = tone?.accent ?? theme.accent;

  /** Consistent avatar treatment: colored circle + initials (no photo mixing). */
  const avatarEntry = avatarEntryForDepth(depth, theme);
  const avatarBackground = hasTint ? cardAccent : avatarEntry.background;
  const avatarForeground = hasTint ? '#ffffff' : avatarEntry.foreground;

  /** Third body line: note/trait, or the manual level when no note is set. */
  const hasNotes = Boolean(node.notes);
  const thirdLine = node.notes || node.level || '';

  const startRename = () => {
    setDraft(node.name);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== node.name) onRename?.(trimmed);
  };

  const cancelRename = () => {
    setEditing(false);
    setDraft(node.name);
  };

  const setCardHovered = (next: boolean) => {
    setHovered(next);
    onHoverChange?.(next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={node.name}
      onClick={(event) => {
        event.stopPropagation();
        if (suppressClickRef?.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect?.();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      className="group relative cursor-pointer overflow-hidden text-left transition-shadow duration-150"
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: cardBackground,
        /* --node-radius + --node-shadow live on the active theme; both are
           emitted as CSS custom properties AND mirrored here from the theme. */
        borderRadius: theme.nodeRadius,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: selected || dragging ? theme.selectedBorder : theme.nodeBorder,
        borderLeftWidth: hasTint ? 4 : 1,
        borderLeftColor: hasTint ? cardAccent : theme.nodeBorder,
        boxShadow: selected
          ? theme.selectedShadow
          : hovered
            ? theme.nodeHoverShadow
            : theme.nodeShadow,
      }}
    >
      <div className="flex h-full flex-col justify-center p-2.5 pl-3">
        <div className="flex items-center gap-2.5">
          <NodeAvatar
            name={node.name}
            background={avatarBackground}
            foreground={avatarForeground}
            photoUrl={node.photoUrl}
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 self-stretch">
            {/* Line 1 — name */}
            <div className="flex min-h-5 items-center">
              {editing ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') commitRename();
                    if (event.key === 'Escape') cancelRename();
                  }}
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Rename node"
                  className="w-full rounded-md px-1.5 py-0.5 text-[15px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                  style={{
                    backgroundColor: theme.surfaceBackground,
                    border: `1px solid ${theme.accent}`,
                    color: theme.textPrimary,
                  }}
                />
              ) : (
                <p
                  onDoubleClick={selectionMode ? undefined : startRename}
                  title={node.name}
                  className="line-clamp-2 min-w-0 break-words text-[15px] font-bold leading-snug"
                  style={{ color: theme.textPrimary }}
                >
                  {node.name}
                </p>
              )}
            </div>

            {/* Line 2 — role / relationship (with persona icon) */}
            <div className="flex min-h-4 items-center">
              {node.role ? (
                <p
                  className="flex items-center gap-1 truncate text-xs leading-tight"
                  style={{ color: theme.textSecondary }}
                >
                  {personaIcon(persona, 'h-3.5 w-3.5 shrink-0')}
                  <span className="truncate">{node.role}</span>
                </p>
              ) : null}
            </div>

            {/* Line 3 — note / trait / level (with icon); empty when no data */}
            <div
              className="flex min-h-4 items-center gap-1 truncate text-[10px] leading-tight"
              style={{ color: theme.textSecondary, opacity: 0.78 }}
            >
              {thirdLine ? (
                <>
                  {hasNotes ? (
                    <NoteIcon className="h-3 w-3 shrink-0" />
                  ) : (
                    <TagIcon className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{thirdLine}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute right-1 top-1 z-10 flex items-center gap-0.5 transition-opacity ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        {selectionMode ? (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
              selected
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                : 'border-[var(--border-color)] bg-[var(--surface-background)] text-transparent'
            }`}
            aria-hidden="true"
          >
            <CheckIcon className="h-3 w-3" />
          </span>
        ) : (
          <>
            {linkInfo !== undefined && onOpenLink && (
              <button
                type="button"
                aria-label={
                  linkInfo ? `Change link for ${node.name}` : `Link ${node.name} to another chart`
                }
                title={linkInfo ? 'Change or remove link' : 'Link to another chart'}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenLink();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Edit ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {linkInfo && onNavigateLink && (
        <button
          type="button"
          title={linkInfo.chartName ? `Also in: ${linkInfo.chartName}` : 'Linked chart no longer exists'}
          aria-label={
            linkInfo.chartName ? `Go to ${linkInfo.chartName}` : 'Linked chart no longer exists'
          }
          onClick={(event) => {
            event.stopPropagation();
            onNavigateLink();
          }}
          className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: theme.accent, color: theme.accentText }}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

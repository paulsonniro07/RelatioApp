import { useMemo } from 'react';

import { useTheme } from '@/features/tree/theme/ThemeProvider';
import { levelBadgeStyle } from '@/features/tree/theme/colorUtils';
import type { ChartMode, TreeNode } from '@/features/tree/types';

/**
 * Compact list of the distinct manual rank/tier labels in an ORG chart,
 * colored from the active theme's avatar palette. Hidden for family charts —
 * generation there is conveyed by the tree shape, not a manual level.
 */
export function LevelLegend({
  nodes,
  mode,
}: {
  nodes: TreeNode[];
  mode: ChartMode;
}) {
  const { theme } = useTheme();

  const levels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (!node.level) continue;
      counts.set(node.level, (counts.get(node.level) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  if (levels.length === 0 || mode === 'family') return null;

  return (
    <div className="mt-2 hidden flex-wrap items-center gap-2 md:flex">
      <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>
        Tiers:
      </span>
      {levels.map(([level, count]) => {
        const palette = levelBadgeStyle(level, theme);
        return (
          <span
            key={level}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: palette.background, color: palette.foreground }}
          >
            {level}
            <span className="opacity-60">({count})</span>
          </span>
        );
      })}
    </div>
  );
}

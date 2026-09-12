import { useMemo } from 'react';

import { useTheme } from '@/features/tree/theme/ThemeProvider';
import { levelBadgeStyle } from '@/features/tree/theme/colorUtils';
import type { TreeNode } from '@/features/tree/types';

/**
 * Compact list of the distinct manual rank/tier labels in a chart, colored
 * from the active theme's avatar palette. Hidden when no node has a level.
 */
export function LevelLegend({ nodes }: { nodes: TreeNode[] }) {
  const { theme } = useTheme();

  const levels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (!node.level) continue;
      counts.set(node.level, (counts.get(node.level) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  if (levels.length === 0) return null;

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

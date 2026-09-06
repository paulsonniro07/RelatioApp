import type { ChartMode } from './types';

/** Mode-aware relationship/job-title choices for the node form dropdown. */
export const RELATIONSHIP_OPTIONS: Record<ChartMode, readonly string[]> = {
  org: [
    'CEO',
    'CTO',
    'Director',
    'Manager',
    'Team Lead',
    'Senior',
    'Staff',
    'Intern',
    'Other',
  ],
  family: [
    'Parent',
    'Child',
    'Spouse',
    'Partner',
    'Girlfriend',
    'Boyfriend',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Aunt / Uncle',
    'Cousin',
    'In-law',
    'Other',
  ],
};

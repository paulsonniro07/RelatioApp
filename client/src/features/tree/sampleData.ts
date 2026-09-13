import type { Chart, TreeNode } from './types';

type SampleKind = 'org' | 'family';

function node(
  id: string,
  name: string,
  role: string,
  level: string,
  parentId: string | null = null,
  partnerId: string | null = null,
  notes = '',
): TreeNode {
  return {
    id,
    chartId: 'sample',
    name,
    parentId,
    partnerId,
    level,
    role,
    relationshipTypeId: null,
    linkedNodeRef: null,
    notes,
    photoUrl: null,
    positionX: 0,
    positionY: 0,
    createdAt: '',
    updatedAt: '',
  };
}

function createOrgSample(): Chart {
  return {
    id: 'sample-org',
    name: 'Acme Org Chart',
    chartTypeId: '',
    isExample: true,
    createdAt: '',
    updatedAt: '',
    nodes: [
      node('org-ceo', 'Alex Rivera', 'Chief Executive Officer', 'Executive'),
      node('org-vp-eng', 'Jamie Chen', 'VP Engineering', 'Executive', 'org-ceo'),
      node('org-vp-mkt', 'Sam Patel', 'VP Marketing', 'Executive', 'org-ceo'),
      node('org-vp-fin', 'Taylor Kim', 'VP Finance', 'Executive', 'org-ceo'),
      node('org-eng-mgr', 'Jordan Lee', 'Engineering Manager', 'Management', 'org-vp-eng'),
      node('org-senior', 'Riley Wu', 'Senior Developer', 'Staff', 'org-eng-mgr'),
      node('org-junior', 'Casey Moore', 'Developer', 'Staff', 'org-eng-mgr'),
      node('org-mkt-lead', 'Dana Okafor', 'Marketing Lead', 'Management', 'org-vp-mkt'),
    ],
  };
}

function createFamilySample(): Chart {
  return {
    id: 'sample-family',
    name: 'Rivera Family Tree',
    chartTypeId: '',
    // Level/manual grouping is org-only — family uses the tree depth implicitly.
    isExample: true,
    createdAt: '',
    updatedAt: '',
    nodes: [
      node('fam-gf', 'Jorge Rivera', 'Parent', '', null, 'fam-gm'),
      node('fam-gm', 'Maria Rivera', 'Spouse', '', null, 'fam-gf'),
      node('fam-father', 'Luis Rivera', 'Parent', '', 'fam-gf', 'fam-mother'),
      node('fam-mother', 'Elena Rivera', 'Spouse', '', null, 'fam-father'),
      node('fam-child1', 'Sofia Rivera', 'Child', '', 'fam-father'),
      node('fam-child2', 'Mateo Rivera', 'Child', '', 'fam-father'),
      node('fam-uncle', 'Carlos Rivera', 'Parent', '', 'fam-gf', 'fam-aunt'),
      node('fam-aunt', 'Ana Rivera', 'Spouse', '', null, 'fam-uncle'),
      node('fam-cousin', 'Lucia Rivera', 'Child', '', 'fam-uncle'),
    ],
  };
}

export function createSampleChart(kind: SampleKind): Chart {
  return kind === 'family' ? createFamilySample() : createOrgSample();
}

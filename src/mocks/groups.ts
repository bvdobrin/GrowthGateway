import type { Group, Permission } from '@/types';

export const ALL_EMPLOYEES = 'ALL_EMPLOYEES';

const CONTRIBUTOR: Permission[] = ['asset:read', 'asset:upload', 'asset:download', 'asset:generate'];

/** IdP groups as they would arrive in the SSO token's `groups` claim. */
export const GROUPS: Group[] = [
  {
    id: ALL_EMPLOYEES,
    name: 'All employees',
    description: 'Every internal Atlas Meridian employee. Implied for all non-external identities.',
    permissions: ['asset:read', 'asset:download'],
  },
  {
    id: 'CG-Global-Brand-Admin',
    name: 'Global Brand Admins',
    description: 'Owns the global brand, taxonomy and approval policy.',
    region: 'GLOBAL',
    permissions: [...CONTRIBUTOR, 'asset:approve', 'admin:audit', 'admin:taxonomy'],
  },
  {
    id: 'CG-Global-Brand-Read',
    name: 'Global Brand (read)',
    description: 'Read access to global brand and shared regional libraries.',
    region: 'GLOBAL',
    permissions: ['asset:read', 'asset:download'],
  },
  {
    id: 'CG-NA-Comms',
    name: 'NA Communications',
    description: 'North America communications team.',
    region: 'NA',
    permissions: CONTRIBUTOR,
  },
  {
    id: 'CG-EMEA-Marketing',
    name: 'EMEA Marketing',
    description: 'Europe marketing team, including the Norland Infrastructure acquisition.',
    region: 'EMEA',
    permissions: CONTRIBUTOR,
  },
  {
    id: 'CG-MEA-Comms',
    name: 'MEA Communications',
    description: 'Middle East communications team.',
    region: 'MEA',
    permissions: CONTRIBUTOR,
  },
  {
    id: 'CG-MEA-Approvers',
    name: 'MEA Approvers',
    description: 'Regional approvers for Middle East assets.',
    region: 'MEA',
    permissions: ['asset:approve'],
  },
  {
    id: 'CG-APAC-Content',
    name: 'APAC Content',
    description: 'Asia-Pacific content creators.',
    region: 'APAC',
    permissions: CONTRIBUTOR,
  },
  {
    id: 'CG-Media-Relations',
    name: 'Media Relations',
    description: 'Press office. The only group allowed to create press releases and press conferences.',
    region: 'GLOBAL',
    permissions: CONTRIBUTOR,
  },
  {
    id: 'CG-Leadership-Office',
    name: 'Leadership Office',
    description: 'Executive office. Holds restricted board and market-sensitive material.',
    region: 'GLOBAL',
    permissions: ['asset:read', 'asset:download'],
  },
  {
    id: 'CG-Agency-External',
    name: 'Agency partners (external)',
    description: 'External creative agencies. Public assets only; Visual uploads only.',
    external: true,
    permissions: ['asset:read', 'asset:upload', 'asset:download'],
  },
];

export const GROUPS_BY_ID: Record<string, Group> = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

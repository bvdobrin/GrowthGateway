import type { User } from '@/types';
import { GROUPS } from './groups';

const internalGroupIds = GROUPS.filter((g) => !g.external && g.id !== 'ALL_EMPLOYEES').map((g) => g.id);

/** Demo personas offered by the mock SSO screen. */
export const PERSONAS: User[] = [
  {
    id: 'u-amelia',
    name: 'Amelia Hart',
    email: 'amelia.hart@atlasmeridian.com',
    title: 'Global Brand Admin',
    department: 'Comms & Growth · Global Brand',
    region: 'GLOBAL',
    groups: internalGroupIds,
    clearance: 'restricted',
    organization: 'Atlas Meridian',
    preferredLocale: 'en',
    avatarHue: 255,
  },
  {
    id: 'u-marcus',
    name: 'Marcus Lee',
    email: 'marcus.lee@atlasmeridian.com',
    title: 'NA Communications Manager',
    department: 'Comms & Growth · North America',
    region: 'NA',
    groups: ['CG-NA-Comms', 'CG-Global-Brand-Read'],
    clearance: 'confidential',
    organization: 'Atlas Meridian',
    preferredLocale: 'en',
    avatarHue: 200,
  },
  {
    id: 'u-sophie',
    name: 'Sophie Laurent',
    email: 'sophie.laurent@atlasmeridian.com',
    title: 'EMEA Marketing Specialist',
    department: 'Comms & Growth · Europe',
    region: 'EMEA',
    groups: ['CG-EMEA-Marketing'],
    clearance: 'internal',
    organization: 'Atlas Meridian',
    preferredLocale: 'fr',
    avatarHue: 330,
  },
  {
    id: 'u-omar',
    name: 'Omar Haddad',
    email: 'omar.haddad@atlasmeridian.com',
    title: 'MEA Regional Communications Lead',
    department: 'Comms & Growth · Middle East',
    region: 'MEA',
    groups: ['CG-MEA-Comms', 'CG-MEA-Approvers', 'CG-Media-Relations', 'CG-Global-Brand-Read'],
    clearance: 'confidential',
    organization: 'Atlas Meridian',
    preferredLocale: 'ar',
    avatarHue: 150,
  },
  {
    id: 'u-yuki',
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@atlasmeridian.com',
    title: 'APAC Content Creator',
    department: 'Comms & Growth · Asia-Pacific',
    region: 'APAC',
    groups: ['CG-APAC-Content'],
    clearance: 'internal',
    organization: 'Atlas Meridian',
    preferredLocale: 'ja',
    avatarHue: 20,
  },
  {
    id: 'u-jordan',
    name: 'Jordan Blake',
    email: 'jordan@brightline-creative.com',
    title: 'Agency Designer',
    department: 'Brightline Creative (external)',
    region: 'NA',
    groups: ['CG-Agency-External'],
    clearance: 'public',
    external: true,
    organization: 'Brightline Creative',
    preferredLocale: 'en',
    avatarHue: 75,
  },
];

/** Colleagues who own seeded assets but are not demo personas. */
const COLLEAGUES: Pick<User, 'id' | 'name'>[] = [
  { id: 'u-priya', name: 'Priya Nair' },
  { id: 'u-lars', name: 'Lars Eriksen' },
  { id: 'u-chen', name: 'Chen Wei' },
  { id: 'u-fatima', name: 'Fatima Al-Sayed' },
  { id: 'u-daniel', name: 'Daniel Okafor' },
];

const DIRECTORY: Record<string, string> = Object.fromEntries(
  [...PERSONAS, ...COLLEAGUES].map((u) => [u.id, u.name]),
);

export const directoryName = (userId: string) => DIRECTORY[userId] ?? userId;

export const PERSONAS_BY_ID: Record<string, User> = Object.fromEntries(PERSONAS.map((u) => [u.id, u]));

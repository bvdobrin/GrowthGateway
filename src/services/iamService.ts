import { ALL_EMPLOYEES, GROUPS, GROUPS_BY_ID } from '@/mocks/groups';
import type { CategoryDefinition, CategoryGroup, Group, Permission, User } from '@/types';

export const ADMIN_GROUP = 'CG-Global-Brand-Admin';

/** Categories whose creation is limited to specific groups (brand and press governance). */
export const CATEGORY_UPLOAD_POLICY: Record<string, string[]> = {
  'press-release': ['CG-Media-Relations', ADMIN_GROUP],
  'press-conference': ['CG-Media-Relations', ADMIN_GROUP],
  'branding-material': [ADMIN_GROUP],
};

/** External identities may only contribute to these category groups. */
export const EXTERNAL_UPLOAD_GROUPS: CategoryGroup[] = ['Visual'];

/** Groups from the token plus the implicit ALL_EMPLOYEES group for internal identities. */
export const effectiveGroups = (user: User): string[] =>
  user.external ? [...user.groups] : [ALL_EMPLOYEES, ...user.groups];

export function resolvePermissions(user: User): Permission[] {
  const permissions = new Set<Permission>();
  for (const groupId of effectiveGroups(user)) {
    GROUPS_BY_ID[groupId]?.permissions.forEach((p) => permissions.add(p));
  }
  return [...permissions].sort();
}

export const hasPermission = (user: User, permission: Permission) => resolvePermissions(user).includes(permission);

export const isAdmin = (user: User) => user.groups.includes(ADMIN_GROUP);

export function canUploadCategory(user: User, category: CategoryDefinition): boolean {
  if (!hasPermission(user, 'asset:upload')) return false;
  if (user.external && !EXTERNAL_UPLOAD_GROUPS.includes(category.group)) return false;
  const restrictedTo = CATEGORY_UPLOAD_POLICY[category.id];
  if (restrictedTo && !restrictedTo.some((g) => user.groups.includes(g))) return false;
  return true;
}

export const uploadableCategories = (user: User, categories: CategoryDefinition[]) =>
  categories.filter((c) => canUploadCategory(user, c));

/** Groups a user may grant access to: only groups they belong to. */
export const assignableGroups = (user: User): Group[] => {
  const mine = new Set(effectiveGroups(user));
  return GROUPS.filter((g) => mine.has(g.id) && g.permissions.includes('asset:read'));
};

export const groupName = (groupId: string) => GROUPS_BY_ID[groupId]?.name ?? groupId;

/** Simulates the entitlement lookup a real IAM service would answer after sign-in. */
export async function fetchEntitlements(user: User) {
  return { groups: effectiveGroups(user), permissions: resolvePermissions(user) };
}

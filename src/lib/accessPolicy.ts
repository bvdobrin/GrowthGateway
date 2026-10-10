import { ALL_EMPLOYEES, GROUPS_BY_ID } from '@/mocks/groups';
import { effectiveGroups, hasPermission, isAdmin } from '@/services/iamService';
import type { Asset, Classification, User } from '@/types';

const CLEARANCE_RANK: Record<Classification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export const hasClearance = (user: User, classification: Classification) =>
  CLEARANCE_RANK[user.clearance] >= CLEARANCE_RANK[classification];

export interface AccessExplanation {
  allowed: boolean;
  /** Groups through which the user is granted access. */
  matchedGroups: string[];
  denial?: 'clearance' | 'groups';
}

export function explainAccess(user: User, asset: Asset): AccessExplanation {
  const mine = new Set(effectiveGroups(user));
  const matchedGroups = asset.accessGroups.filter((g) => mine.has(g));
  if (!hasClearance(user, asset.classification)) return { allowed: false, matchedGroups, denial: 'clearance' };
  if (matchedGroups.length === 0) return { allowed: false, matchedGroups, denial: 'groups' };
  return { allowed: true, matchedGroups };
}

export const canView = (user: User, asset: Asset) =>
  hasPermission(user, 'asset:read') && explainAccess(user, asset).allowed;

export const filterVisible = (user: User, assets: Asset[]) => assets.filter((a) => canView(user, a));

export const canDownload = (user: User, asset: Asset) =>
  canView(user, asset) && hasPermission(user, 'asset:download') && (asset.status !== 'expired' || isAdmin(user));

/** Owners and admins can edit; internal contributors can edit assets shared with one of their team groups. */
export function canEdit(user: User, asset: Asset): boolean {
  if (!canView(user, asset) || !hasPermission(user, 'asset:upload')) return false;
  if (asset.ownerId === user.id || isAdmin(user)) return true;
  if (user.external) return false;
  const teamGroups = new Set(user.groups.filter((g) => g !== ALL_EMPLOYEES && GROUPS_BY_ID[g]?.permissions.includes('asset:upload')));
  return asset.accessGroups.some((g) => teamGroups.has(g));
}

export const canGenerate = (user: User, asset: Asset) =>
  canView(user, asset) && hasPermission(user, 'asset:generate') && asset.status !== 'expired';

export const canValidate = (user: User, asset: Asset) => canEdit(user, asset);

export const canSubmit = (user: User, asset: Asset) =>
  canEdit(user, asset) &&
  (asset.status === 'draft' || asset.status === 'rejected') &&
  !!asset.validation &&
  asset.validation.overall !== 'fail';

/**
 * Global admins approve anything; regional approvers approve their own region.
 * Nobody approves their own submission.
 */
export function canApprove(user: User, asset: Asset): boolean {
  if (!hasPermission(user, 'asset:approve') || !canView(user, asset)) return false;
  if (asset.status !== 'pending_approval' || asset.ownerId === user.id || asset.submittedBy === user.id) return false;
  if (isAdmin(user)) return true;
  const approverRegions = user.groups
    .map((g) => GROUPS_BY_ID[g])
    .filter((g) => g?.permissions.includes('asset:approve'))
    .map((g) => g!.region);
  return approverRegions.includes(asset.region);
}

export const canMigrate = (user: User, asset: Asset) => canEdit(user, asset) && asset.migrationStatus === 'linked';

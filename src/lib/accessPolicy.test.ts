import { createSeedAssets } from '@/mocks/assets';
import { PERSONAS_BY_ID } from '@/mocks/users';
import { canUploadCategory } from '@/services/iamService';
import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import type { Asset, User } from '@/types';
import { canDownload, canView, explainAccess } from './accessPolicy';

const assets = createSeedAssets();
const byId = (id: string) => assets.find((asset) => asset.id === id)!;
const user = (id: string): User => PERSONAS_BY_ID[id];

const annualReport = byId('ast-001');
const boardReport = byId('ast-002');
const sharedEmea = byId('ast-003');
const apacOnly = byId('ast-004');
const commonInternal = byId('ast-005');

const category = (id: string) => SEEDED_CATEGORIES.find((item) => item.id === id)!;

describe('accessPolicy', () => {
  it('shows an exclusive asset only to the group it names', () => {
    expect(apacOnly.accessGroups).toEqual(['CG-APAC-Content']);
    expect(canView(user('u-yuki'), apacOnly)).toBe(true);
    expect(explainAccess(user('u-sophie'), apacOnly)).toMatchObject({ allowed: false, denial: 'groups' });
    expect(canView(user('u-marcus'), apacOnly)).toBe(false);
    expect(canView(user('u-jordan'), apacOnly)).toBe(false);
    expect(canView(user('u-amelia'), apacOnly)).toBe(true);
  });

  it('shows a shared asset to each named group and not to the others', () => {
    expect(sharedEmea.accessGroups).toEqual(expect.arrayContaining(['CG-EMEA-Marketing', 'CG-NA-Comms']));
    expect(canView(user('u-sophie'), sharedEmea)).toBe(true);
    expect(canView(user('u-marcus'), sharedEmea)).toBe(true);
    expect(canView(user('u-yuki'), sharedEmea)).toBe(false);
    expect(canView(user('u-omar'), sharedEmea)).toBe(false);
  });

  it('shows common assets to every internal employee and public ones to the agency too', () => {
    expect(commonInternal.accessGroups).toEqual(['ALL_EMPLOYEES']);
    for (const id of ['u-amelia', 'u-marcus', 'u-sophie', 'u-omar', 'u-yuki']) {
      expect(canView(user(id), commonInternal)).toBe(true);
    }
    expect(canView(user('u-jordan'), commonInternal)).toBe(false);
    expect(canView(user('u-jordan'), annualReport)).toBe(true);
    expect(canDownload(user('u-jordan'), annualReport)).toBe(true);
    expect(canDownload(user('u-jordan'), commonInternal)).toBe(false);
  });

  it('denies a restricted asset when clearance is too low, even if the group matches', () => {
    const restrictedCommon: Asset = { ...commonInternal, classification: 'restricted' };
    expect(explainAccess(user('u-marcus'), restrictedCommon)).toMatchObject({ allowed: false, denial: 'clearance' });
    expect(canView(user('u-amelia'), restrictedCommon)).toBe(true);
    expect(canView(user('u-amelia'), boardReport)).toBe(true);
    expect(canView(user('u-marcus'), boardReport)).toBe(false);
  });

  it('lets only an admin download an expired asset', () => {
    const expired: Asset = { ...annualReport, status: 'expired' };
    expect(canDownload(user('u-marcus'), expired)).toBe(false);
    expect(canDownload(user('u-amelia'), expired)).toBe(true);
  });
});

describe('category upload entitlements', () => {
  it('limits press material to media relations and branding to global admins', () => {
    expect(canUploadCategory(user('u-omar'), category('press-release'))).toBe(true);
    expect(canUploadCategory(user('u-omar'), category('press-conference'))).toBe(true);
    expect(canUploadCategory(user('u-yuki'), category('press-release'))).toBe(false);
    expect(canUploadCategory(user('u-amelia'), category('branding-material'))).toBe(true);
    expect(canUploadCategory(user('u-marcus'), category('branding-material'))).toBe(false);
  });

  it('lets an agency upload visual assets only', () => {
    expect(canUploadCategory(user('u-jordan'), category('photograph'))).toBe(true);
    expect(canUploadCategory(user('u-jordan'), category('promotional-material'))).toBe(true);
    expect(canUploadCategory(user('u-jordan'), category('email'))).toBe(false);
    expect(canUploadCategory(user('u-jordan'), category('press-release'))).toBe(false);
  });
});

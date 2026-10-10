import { fileMatchesFormat } from '@/config/taxonomy/formats';
import { SOURCES_BY_ID } from '@/mocks/sources';
import { DAY_MS, isBlank, isoDay, primaryFile } from './helpers';
import { fail, pass, warn, type ValidationRule } from './types';

const JUNK_TITLE = /\b(untitled|copy of|final[\s_-]*final|new folder|do not use)\b/i;
const CAMERA_NAME = /^(img|dsc|dscn|pxl|gopr)[_-]?\d+/i;

export const GLOBAL_RULES: ValidationRule[] = [
  {
    id: 'required-fields',
    scope: 'global',
    check: (asset, category) => {
      const missing = category.metadataSchema
        .filter((field) => field.required && isBlank(asset.categoryMetadata[field.key]))
        .map((field) => field.key);
      if (!asset.title.trim()) missing.unshift('title');
      return missing.length ? fail('requiredFields.fail', { fields: missing.join(',') }) : pass('requiredFields.pass');
    },
  },
  {
    id: 'naming-convention',
    scope: 'global',
    check: (asset) => {
      if (JUNK_TITLE.test(asset.title) || asset.title.trim().length < 5) return fail('naming.title');
      const file = primaryFile(asset);
      if (file && (/\s/.test(file.name) || CAMERA_NAME.test(file.name))) return warn('naming.fileName', { name: file.name });
      return pass('naming.pass');
    },
  },
  {
    id: 'format-allowed',
    scope: 'global',
    check: (asset, category) => {
      if (!category.allowedFormats.includes(asset.format)) return fail('format.notAllowed', { format: asset.format });
      const file = primaryFile(asset);
      if (!file) return fail('format.noFile');
      if (!fileMatchesFormat(file.mime, file.name, asset.format)) return fail('format.mimeMismatch', { name: file.name });
      return pass('format.pass', { format: asset.format });
    },
  },
  {
    id: 'classification-set',
    scope: 'global',
    check: (asset) =>
      asset.accessGroups.length === 0
        ? fail('classification.noGroups')
        : pass('classification.pass', { classification: asset.classification, count: asset.accessGroups.length }),
  },
  {
    id: 'rights-not-expired',
    scope: 'global',
    check: (asset, _category, { now }) => {
      if (!asset.rightsExpiry) return pass('rights.none');
      const expiry = new Date(asset.rightsExpiry);
      if (expiry.getTime() < now.getTime()) return fail('rights.expired', { date: asset.rightsExpiry });
      if (expiry.getTime() - now.getTime() < 30 * DAY_MS) return warn('rights.expiringSoon', { date: asset.rightsExpiry });
      return pass('rights.valid', { date: isoDay(expiry) });
    },
  },
  {
    id: 'legacy-link',
    scope: 'global',
    check: (asset) =>
      asset.migrationStatus === 'linked'
        ? warn('legacy.linked', { source: SOURCES_BY_ID[asset.sourceSystem]?.name ?? asset.sourceSystem })
        : pass('legacy.migrated'),
  },
];

import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BUSINESS_UNITS, CONTENT_LOCALES, KNOWN_CAMPAIGNS } from '@/config/options';
import { useFormatters } from '@/hooks/useFormatters';
import { hasClearance } from '@/lib/accessPolicy';
import { SOURCES } from '@/mocks/sources';
import type { CommonFields as CommonFieldsValue } from '@/services/assetService';
import { assignableGroups } from '@/services/iamService';
import { CLASSIFICATIONS, REGIONS, type User } from '@/types';
import { Checkbox, Field, Fieldset } from '../Field/Field';
import styles from './AssetForm.module.css';

interface CommonFieldsProps {
  user: User;
  value: CommonFieldsValue;
  onChange: (patch: Partial<CommonFieldsValue>) => void;
  showSource?: boolean;
  groupsError?: string;
  /** Groups already on the asset (when editing) stay selectable even if the user isn't in them. */
  existingGroups?: string[];
}

export function CommonFields({ user, value, onChange, showSource = true, groupsError, existingGroups = [] }: CommonFieldsProps) {
  const { t } = useTranslation(['asset', 'common']);
  const { locale } = useFormatters();
  const campaignsId = useId();
  const languageNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'language' }), [locale]);
  const groups = useMemo(() => {
    const mine = assignableGroups(user);
    const extra = existingGroups.filter((g) => !mine.some((m) => m.id === g)).map((id) => ({ id, name: id }));
    return [...mine, ...extra];
  }, [user, existingGroups]);

  const toggleGroup = (id: string) =>
    onChange({ accessGroups: value.accessGroups.includes(id) ? value.accessGroups.filter((g) => g !== id) : [...value.accessGroups, id] });

  return (
    <div className="l-form-grid">
      <Field label={t('add.region')}>
        {(props) => (
          <select {...props} value={value.region} onChange={(e) => onChange({ region: e.target.value as CommonFieldsValue['region'] })}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(`common:region.${r}`)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('add.locale')}>
        {(props) => (
          <select {...props} value={value.locale} onChange={(e) => onChange({ locale: e.target.value })}>
            {CONTENT_LOCALES.map((l) => (
              <option key={l} value={l}>
                {languageNames.of(l)} ({l})
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('add.businessUnit')}>
        {(props) => (
          <select {...props} value={value.businessUnit} onChange={(e) => onChange({ businessUnit: e.target.value })}>
            {BUSINESS_UNITS.map((bu) => (
              <option key={bu} value={bu}>
                {bu}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('add.campaign')}>
        {(props) => (
          <>
            <input {...props} list={campaignsId} value={value.campaign ?? ''} onChange={(e) => onChange({ campaign: e.target.value })} />
            <datalist id={campaignsId}>
              {KNOWN_CAMPAIGNS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label={t('add.tags')} hint={t('add.tagsHint')} className="l-span-full">
        {(props) => (
          <input
            {...props}
            value={value.tags.join(', ')}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(',')
                  .map((s) => s.trimStart())
                  .filter((s, i, all) => s || i === all.length - 1),
              })
            }
            onBlur={() => onChange({ tags: value.tags.map((s) => s.trim()).filter(Boolean) })}
          />
        )}
      </Field>
      <Field label={t('add.classification')} hint={t('add.classificationHint', { clearance: t(`common:classification.${user.clearance}`) })}>
        {(props) => (
          <select {...props} value={value.classification} onChange={(e) => onChange({ classification: e.target.value as CommonFieldsValue['classification'] })}>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c} disabled={!hasClearance(user, c)}>
                {t(`common:classification.${c}`)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('add.rightsExpiry')}>
        {(props) => <input {...props} type="date" value={value.rightsExpiry ?? ''} onChange={(e) => onChange({ rightsExpiry: e.target.value })} />}
      </Field>
      {showSource && (
        <Field label={t('add.source')}>
          {(props) => (
            <select {...props} value={value.sourceSystem} onChange={(e) => onChange({ sourceSystem: e.target.value })}>
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Fieldset legend={t('add.groups')} hint={t('add.groupsHint')} error={groupsError} className="l-span-full">
        <div className={styles.groups}>
          {groups.map((group) => (
            <Checkbox key={group.id} label={group.name} hint={group.id} checked={value.accessGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} />
          ))}
        </div>
      </Fieldset>
    </div>
  );
}

export const defaultCommonFields = (user: User): CommonFieldsValue => ({
  region: user.region,
  locale: user.preferredLocale === 'en' ? (user.region === 'NA' ? 'en-US' : 'en') : CONTENT_LOCALES.find((l) => l.startsWith(user.preferredLocale)) ?? 'en',
  businessUnit: 'Corporate',
  campaign: '',
  tags: [],
  classification: user.external ? 'public' : 'internal',
  accessGroups: user.groups.filter((g) => !g.endsWith('Approvers') && !g.endsWith('Brand-Read')).slice(0, 1),
  sourceSystem: 'gg-native',
  rightsExpiry: '',
});

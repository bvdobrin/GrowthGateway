import { useMemo, useState } from 'react';
import { CircleCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { AssetThumbnail } from '@/components/AssetThumbnail/AssetThumbnail';
import { CategoryBadge, StatusBadge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/PageHeader/PageHeader';
import { generatorsFor, type GeneratorDefinition } from '@/config/taxonomy/generators';
import { useDocumentTitle, useToast } from '@/hooks/useAppHelpers';
import { useFormatters } from '@/hooks/useFormatters';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { canGenerate } from '@/lib/accessPolicy';
import { useGenerateVariantMutation, useListAssetsQuery } from '@/store/damApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/sessionSlice';
import type { Asset } from '@/types';
import styles from './GeneratePage.module.css';

function GeneratorCard({ asset, generator }: { asset: Asset; generator: GeneratorDefinition }) {
  const { t } = useTranslation(['asset', 'common', 'taxonomy']);
  const toast = useToast();
  const { optionLabel, categoryLabel } = useTaxonomy();
  const { locale } = useFormatters();
  const languageNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'language' }), [locale]);
  const [generate, { isLoading, data }] = useGenerateVariantMutation();
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (generator.params ?? []).map((param) => [
        param.key,
        param.kind === 'text' ? '' : param.key === 'outputCategory' ? 'photograph' : (param.options?.find((option) => option !== asset.locale) ?? param.options?.[0] ?? ''),
      ]),
    ),
  );
  const promptMissing = (generator.params ?? []).some((param) => param.kind === 'text' && param.required && !(params[param.key] ?? '').trim());

  const run = async () => {
    try {
      const created = await generate({ assetId: asset.id, generatorId: generator.id, params }).unwrap();
      toast.success(t('common:toast.generated', { title: created.title }));
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <li className={styles.generator}>
      <div className={styles.generatorHead}>
        <span className={styles.generatorIcon} aria-hidden="true">
          <Icon name={generator.icon} />
        </span>
        <div>
          <h3 className={styles.generatorTitle}>{t(`generators.${generator.id}.label`)}</h3>
          <p className={styles.generatorDescription}>{t(`generators.${generator.id}.description`)}</p>
          {generator.global && <p className={styles.scope}>{t('generate.global')}</p>}
        </div>
      </div>
      {(generator.params ?? []).map((param) => (
        <label key={param.key} className={styles.param}>
          <span>{t(`generate.params.${param.key}`)}</span>
          {param.kind === 'text' ? (
            <textarea
              rows={4}
              value={params[param.key] ?? ''}
              placeholder={t('generate.promptPlaceholder')}
              onChange={(e) => setParams((current) => ({ ...current, [param.key]: e.target.value }))}
            />
          ) : (
            <select value={params[param.key]} onChange={(e) => setParams((current) => ({ ...current, [param.key]: e.target.value }))}>
              {(param.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {param.key === 'targetLocale'
                    ? `${languageNames.of(option) ?? option} (${option})`
                    : param.key === 'outputCategory'
                      ? categoryLabel(option)
                      : optionLabel(option)}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
      <div className={styles.generatorFoot}>
        <Button variant="primary" icon={<Sparkles />} onClick={run} loading={isLoading} disabled={promptMissing}>
          {isLoading ? t('generate.running') : t('generate.run')}
        </Button>
        {data && (
          <p className={styles.result} role="status">
            <CircleCheck aria-hidden="true" />
            <Link to={`/assets/${data.id}`}>{t('generate.openResult')}</Link>
          </p>
        )}
      </div>
    </li>
  );
}

export function GeneratePage() {
  const { t } = useTranslation(['asset', 'common']);
  const user = useAppSelector(selectCurrentUser);
  const [params, setParams] = useSearchParams();
  const { data: assets = [], isLoading } = useListAssetsQuery();
  const { byId, categoryLabel } = useTaxonomy();
  const [filter, setFilter] = useState('');
  useDocumentTitle(t('generate.title'));

  const selectedId = params.get('asset') ?? '';
  const selected = assets.find((a) => a.id === selectedId);
  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return assets
      .filter((a) => user && canGenerate(user, a))
      .filter((a) => !q || a.title.toLowerCase().includes(q) || categoryLabel(a.category).toLowerCase().includes(q) || a.tags.some((tag) => tag.toLowerCase().includes(q)));
  }, [assets, filter, user, categoryLabel]);

  if (!user) return null;
  const category = selected ? byId[selected.category] : undefined;
  const generators = selected && category ? generatorsFor(selected, category) : [];
  const allowed = selected ? canGenerate(user, selected) : false;

  return (
    <div className="l-page">
      <PageHeader title={t('generate.title')} subtitle={t('generate.subtitle')} />
      <div className={styles.layout}>
        <Card title={t('generate.pickAsset')} className={styles.picker}>
          <label className="u-visually-hidden" htmlFor="generate-filter">
            {t('generate.filterAssets')}
          </label>
          <input id="generate-filter" type="search" placeholder={t('generate.filterAssets')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          {isLoading ? (
            <Spinner label={t('common:actions.loading')} />
          ) : (
            <ul role="list" className={styles.assetList}>
              {candidates.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className={styles.assetOption}
                    aria-pressed={asset.id === selectedId}
                    onClick={() => setParams({ asset: asset.id }, { replace: true })}
                  >
                    <span className={styles.assetTitle}>{asset.title}</span>
                    <span className={styles.assetMeta}>
                      {categoryLabel(asset.category)} · {t(`common:region.${asset.region}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className={styles.workspace}>
          {!selected ? (
            <EmptyState icon={<Sparkles />} title={t('generate.chooseAsset')} />
          ) : (
            <>
              <div className={styles.summary}>
                <AssetThumbnail asset={selected} className={styles.summaryThumb} />
                <div className={styles.summaryText}>
                  <div className={styles.badges}>
                    <CategoryBadge categoryId={selected.category} />
                    <StatusBadge status={selected.status} />
                  </div>
                  <h2 className={styles.summaryTitle}>
                    <Link to={`/assets/${selected.id}`}>{selected.title}</Link>
                  </h2>
                  <p className="u-small u-muted">{selected.description}</p>
                </div>
              </div>
              {!allowed ? (
                <p className={styles.notice}>{t('generate.notAllowed')}</p>
              ) : generators.length === 0 || !category ? (
                <p className={styles.notice}>{t('generate.none')}</p>
              ) : (
                <ul role="list" className={styles.generators}>
                  {generators.map((generator) => (
                    <GeneratorCard key={`${selected.id}-${generator.id}`} asset={selected} generator={generator} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

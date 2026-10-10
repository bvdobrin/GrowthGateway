import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import { useListCategoriesQuery } from '@/store/damApi';
import type { AssetFormat, CategoryDefinition, CategoryGroup, MetadataField } from '@/types';

/** Categories plus translated labels. Custom categories fall back to the label the admin typed. */
export function useTaxonomy() {
  const { t } = useTranslation('taxonomy');
  const { data } = useListCategoriesQuery();
  const categories = data ?? SEEDED_CATEGORIES;
  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, CategoryDefinition>, [categories]);

  const categoryLabel = useCallback(
    (idOrCategory: string | CategoryDefinition) => {
      const category = typeof idOrCategory === 'string' ? byId[idOrCategory] : idOrCategory;
      const id = typeof idOrCategory === 'string' ? idOrCategory : idOrCategory.id;
      return t(`category.${id}`, { defaultValue: category?.label ?? id });
    },
    [byId, t],
  );
  const groupLabel = useCallback((group: CategoryGroup) => t(`group.${group}`), [t]);
  const formatLabel = useCallback((format: AssetFormat | string) => t(`format.${format}`, { defaultValue: format }), [t]);
  const fieldLabel = useCallback(
    (field: MetadataField | string) =>
      typeof field === 'string' ? t(`field.${field}`, { defaultValue: field }) : t(`field.${field.key}`, { defaultValue: field.label }),
    [t],
  );
  const optionLabel = useCallback((value: string) => t(`option.${value}`, { defaultValue: value }), [t]);

  return { categories, byId, categoryLabel, groupLabel, formatLabel, fieldLabel, optionLabel };
}

import { SEEDED_CATEGORIES } from '@/config/taxonomy/categories';
import { GENERATORS_BY_ID } from '@/config/taxonomy/generators';
import { createSeedAssets } from '@/mocks/assets';
import { RULES } from '@/lib/validation/registry';
import { tokens } from '@/styles/generated/tokens';

describe('taxonomy integrity', () => {
  it('points every seeded category at rules, generators and colour tokens that exist', () => {
    for (const category of SEEDED_CATEGORIES) {
      for (const ruleId of category.validationRuleIds) {
        expect(RULES[ruleId], `${category.id} rule ${ruleId}`).toBeDefined();
      }
      for (const generatorId of category.generatorIds) {
        expect(GENERATORS_BY_ID[generatorId], `${category.id} generator ${generatorId}`).toBeDefined();
      }
      expect(tokens, category.colorToken).toHaveProperty(category.colorToken);
    }
  });

  it('seeds at least four assets in every category, each in an allowed format', () => {
    const assets = createSeedAssets();
    expect(assets.length).toBeGreaterThanOrEqual(90);
    for (const category of SEEDED_CATEGORIES) {
      const owned = assets.filter((asset) => asset.category === category.id);
      expect(owned.length, category.id).toBeGreaterThanOrEqual(4);
      for (const asset of owned) {
        expect(category.allowedFormats, `${asset.id} ${asset.format}`).toContain(asset.format);
      }
    }
  });
});

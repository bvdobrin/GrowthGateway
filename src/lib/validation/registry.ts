import type { Asset, CategoryDefinition, ValidationReport, ValidationStatus } from '@/types';
import { CATEGORY_RULES } from './categoryRules';
import { GLOBAL_RULES } from './globalRules';
import type { RuleContext, ValidationRule } from './types';

export const RULES: Record<string, ValidationRule> = Object.fromEntries(
  [...GLOBAL_RULES, ...CATEGORY_RULES].map((rule) => [rule.id, rule]),
);

export const GLOBAL_RULE_IDS = GLOBAL_RULES.map((r) => r.id);

/** Global rules plus the category's own rules, in that order. */
export const rulesFor = (category: CategoryDefinition): ValidationRule[] => [
  ...GLOBAL_RULES,
  ...category.validationRuleIds.map((id) => RULES[id]).filter((r): r is ValidationRule => !!r),
];

const RANK: Record<ValidationStatus, number> = { pass: 0, warn: 1, fail: 2 };

export function runValidation(asset: Asset, category: CategoryDefinition, ctx: RuleContext = { now: new Date() }): ValidationReport {
  const results = rulesFor(category).map((rule) => ({ ruleId: rule.id, ...rule.check(asset, category, ctx) }));
  const overall = results.reduce<ValidationStatus>((worst, r) => (RANK[r.status] > RANK[worst] ? r.status : worst), 'pass');
  return { checkedAt: ctx.now.toISOString(), overall, results };
}

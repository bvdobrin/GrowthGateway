import type { Asset, CategoryDefinition, ValidationResult } from '@/types';

export interface RuleContext {
  now: Date;
}

export type RuleOutcome = Omit<ValidationResult, 'ruleId'>;

export interface ValidationRule {
  id: string;
  scope: 'global' | 'category';
  check: (asset: Asset, category: CategoryDefinition, ctx: RuleContext) => RuleOutcome;
}

export const pass = (key: string, params?: RuleOutcome['message']['params']): RuleOutcome => ({
  status: 'pass',
  message: { key, params },
});
export const warn = (key: string, params?: RuleOutcome['message']['params']): RuleOutcome => ({
  status: 'warn',
  message: { key, params },
});
export const fail = (key: string, params?: RuleOutcome['message']['params']): RuleOutcome => ({
  status: 'fail',
  message: { key, params },
});

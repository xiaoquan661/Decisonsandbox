import { Decision } from '../components/types';

export const WIZARD_STEPS = ['title', 'options', 'dimensions', 'scoring', 'weights', 'timeline', 'lock'] as const;
export type WizardStep = typeof WIZARD_STEPS[number];

export function hasValidTitle(decision: Decision): boolean {
  return decision.title.trim().length > 0;
}

export function hasValidOptions(decision: Decision): boolean {
  return decision.options.length >= 2 && decision.options.every((option) => option.name.trim().length > 0);
}

export function hasValidDimensions(decision: Decision): boolean {
  return decision.dimensions.length >= 2;
}

export function canAdvanceFrom(step: WizardStep, decision: Decision): boolean {
  if (step === 'title') return hasValidTitle(decision);
  if (step === 'options') return hasValidOptions(decision);
  if (step === 'dimensions') return hasValidDimensions(decision);
  if (step === 'lock') return false;
  return true;
}

export function getHighestReachableStepIndex(decision: Decision): number {
  if (!hasValidTitle(decision)) return 0;
  if (!hasValidOptions(decision)) return 1;
  if (!hasValidDimensions(decision)) return 2;
  return WIZARD_STEPS.length - 1;
}

export function getLockIssue(decision: Decision, selectedOptionId?: string): string {
  if (!hasValidTitle(decision)) return '请先填写决策标题';
  if (!hasValidOptions(decision)) return '请保留至少两个有效选项';
  if (!hasValidDimensions(decision)) return '请至少选择两个评估维度';
  if (!selectedOptionId || !decision.options.some((option) => option.id === selectedOptionId)) {
    return '请选择最终选项';
  }
  return '';
}

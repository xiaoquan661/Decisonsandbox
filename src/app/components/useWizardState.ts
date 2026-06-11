// SandboxWizard 状态机 hook —— 让父组件（PCLayout）能拥有并控制状态，
// 左侧 StepSidebar / 右侧 RightPanel 通过 Context 订阅同一份状态

import { useState, useCallback, useEffect } from 'react';
import { Decision } from './types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const STEPS = ['title', 'options', 'dimensions', 'scoring', 'weights', 'timeline', 'lock'] as const;
export type WizardStep = typeof STEPS[number];

export function createBlankDecision(): Decision {
  return {
    id: uid(),
    title: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft',
    options: [
      { id: uid(), name: '选项 A', scores: {} },
      { id: uid(), name: '选项 B', scores: {} },
    ],
    dimensions: [],
    timelineNodes: [],
    timelineSpan: 6,
    timelineSkipped: false,
    reason: '',
    category: 'career',
  };
}

export interface UseWizardState {
  decision: Decision;
  step: WizardStep;
  stepIndex: number;
  totalSteps: number;
  locked: boolean;
  canGoNext: boolean;
  hoveredOptionId: string | null;

  setHoveredOptionId: (id: string | null) => void;
  update: (patch: Partial<Decision>) => void;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (s: string) => void;
  save: () => void;
  lock: () => void;
  unlock: () => void;
  skipTimeline: () => void;
}

export function useWizardState(
  initial: Decision | null,
  onSave: (d: Decision) => void
): UseWizardState {
  const [decision, setDecision] = useState<Decision>(initial ?? createBlankDecision());
  const [step, setStep] = useState<WizardStep>(initial?.status === 'locked' ? 'lock' : 'title');
  const [locked, setLocked] = useState(initial?.status === 'locked');
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);

  const update = useCallback((patch: Partial<Decision>) => {
    setDecision((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const save = useCallback(() => {
    setDecision((prev) => {
      const next = { ...prev, updatedAt: Date.now() };
      onSave(next);
      return next;
    });
  }, [onSave]);

  const goNext = useCallback(() => {
    setDecision((prev) => {
      const next = { ...prev, updatedAt: Date.now() };
      onSave(next);
      return next;
    });
    setStep((s) => {
      const idx = STEPS.indexOf(s);
      if (idx < STEPS.length - 1) return STEPS[idx + 1];
      return s;
    });
  }, [onSave]);

  const goPrev = useCallback(() => {
    setStep((s) => {
      const idx = STEPS.indexOf(s);
      if (idx > 0) return STEPS[idx - 1];
      return s;
    });
  }, []);

  const goToStep = useCallback((s: string) => {
    if ((STEPS as readonly string[]).includes(s)) setStep(s as WizardStep);
  }, []);

  const lock = useCallback(() => {
    setDecision((prev) => {
      const next = { ...prev, status: 'locked' as const, lockedAt: Date.now() };
      onSave(next);
      return next;
    });
    setLocked(true);
  }, [onSave]);

  const unlock = useCallback(() => {
    setDecision((prev) => {
      const { lockedAt: _lockedAt, ...rest } = prev;
      const next = { ...rest, status: 'draft' as const, updatedAt: Date.now() };
      onSave(next);
      return next;
    });
    setLocked(false);
  }, [onSave]);

  const skipTimeline = useCallback(() => {
    setDecision((prev) => {
      const next = { ...prev, timelineSkipped: true, updatedAt: Date.now() };
      onSave(next);
      return next;
    });
    setStep('lock');
  }, [onSave]);

  const canGoNext = (() => {
    if (step === 'title') return decision.title.trim().length > 0;
    if (step === 'options') return decision.options.length >= 2 && decision.options.every((o) => o.name.trim().length >= 1);
    return true;
  })();

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (locked) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
        return;
      }
      if (inField) return;
      if (e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        goToStep(STEPS[Number(e.key) - 1]);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && canGoNext) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save, goNext, goToStep, locked, canGoNext]);

  return {
    decision,
    step,
    stepIndex: STEPS.indexOf(step),
    totalSteps: STEPS.length,
    locked,
    canGoNext,
    hoveredOptionId,
    setHoveredOptionId,
    update,
    goNext,
    goPrev,
    goToStep,
    save,
    lock,
    unlock,
    skipTimeline,
  };
}

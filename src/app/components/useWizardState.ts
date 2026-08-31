// SandboxWizard 状态机 hook —— 让父组件（PCLayout）能拥有并控制状态，
// 左侧 StepSidebar / 右侧 RightPanel 通过 Context 订阅同一份状态

import { useState, useCallback, useEffect, useRef } from 'react';
import { Decision } from './types';
import { DecisionSaveMode } from './useDecisions';
import {
  canAdvanceFrom,
  getHighestReachableStepIndex,
  getLockIssue,
  WIZARD_STEPS,
  WizardStep,
} from '../lib/wizardValidation';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

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
  highestReachableStepIndex: number;
  locked: boolean;
  canGoNext: boolean;
  hoveredOptionId: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';

  setHoveredOptionId: (id: string | null) => void;
  update: (patch: Partial<Decision>) => void;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (s: string) => void;
  save: () => boolean;
  flushSave: () => boolean;
  lock: (selectedOptionId?: string) => void;
  unlock: () => void;
  skipTimeline: () => void;
}

export function useWizardState(
  initial: Decision | null,
  onSave: (d: Decision, mode: DecisionSaveMode) => void
): UseWizardState {
  const [decision, setDecision] = useState<Decision>(initial ?? createBlankDecision());
  const [step, setStep] = useState<WizardStep>(initial?.status === 'locked' ? 'lock' : 'title');
  const [locked, setLocked] = useState(initial?.status === 'locked');
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const latestDecisionRef = useRef(decision);
  const dirtyRef = useRef(false);
  const needsCommitRef = useRef(false);
  const persistedRef = useRef(!!initial);
  const lastNavigationAtRef = useRef(0);

  const update = useCallback((patch: Partial<Decision>) => {
    const next = { ...latestDecisionRef.current, ...patch, updatedAt: Date.now() };
    latestDecisionRef.current = next;
    dirtyRef.current = true;
    setSaveStatus('saving');
    setDecision(next);
  }, []);

  const persist = useCallback((mode: DecisionSaveMode, force = false) => {
    const shouldSave = mode === 'background'
      ? dirtyRef.current
      : dirtyRef.current || needsCommitRef.current || force;
    if (!shouldSave) return true;

    // update() 已记录最后编辑时间；自动保存和提交草稿都复用现有对象，
    // 只有从未编辑过的全新沙盘在显式保存时才补一次时间戳。
    const refreshBlankDecision = force && !dirtyRef.current;
    const next = refreshBlankDecision
      ? { ...latestDecisionRef.current, updatedAt: Date.now() }
      : latestDecisionRef.current;
    try {
      onSave(next, mode);
    } catch (error) {
      console.error('决策草稿保存失败', error);
      setSaveStatus('error');
      return false;
    }
    latestDecisionRef.current = next;
    dirtyRef.current = false;
    needsCommitRef.current = mode === 'background';
    persistedRef.current = true;
    if (refreshBlankDecision) setDecision(next);
    setSaveStatus('saved');
    return true;
  }, [onSave]);

  const flushSave = useCallback(() => {
    return persist('commit', false);
  }, [persist]);

  const save = useCallback(() => {
    // 已保存且没有改动时保持幂等；全新空白沙盘允许用户显式保存为“未命名决策”。
    return persist('commit', !persistedRef.current);
  }, [persist]);

  // 防抖并等待浏览器空闲时后台保存，避免在连续输入和动效期间抢占主线程。
  useEffect(() => {
    if (!dirtyRef.current || locked) return;
    let idleHandle: number | null = null;
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(
          () => persist('background'),
          { timeout: 1000 }
        );
      } else {
        persist('background');
      }
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [decision, locked, persist]);

  // 刷新或关闭时只写当前决策草稿，避免卸载阶段触发顶层状态更新。
  useEffect(() => {
    const saveBeforePageHide = () => {
      if (dirtyRef.current) persist('background');
    };
    window.addEventListener('pagehide', saveBeforePageHide);
    return () => window.removeEventListener('pagehide', saveBeforePageHide);
  }, [persist]);

  const goNext = useCallback(() => {
    if (locked) return;
    if (!canAdvanceFrom(step, latestDecisionRef.current)) return;
    const now = Date.now();
    if (now - lastNavigationAtRef.current < 350) return;
    if (!flushSave()) return;
    lastNavigationAtRef.current = now;
    setStep((s) => {
      const idx = WIZARD_STEPS.indexOf(s);
      if (idx < WIZARD_STEPS.length - 1) return WIZARD_STEPS[idx + 1];
      return s;
    });
  }, [flushSave, locked, step]);

  const goPrev = useCallback(() => {
    if (locked) return;
    const now = Date.now();
    if (now - lastNavigationAtRef.current < 350) return;
    lastNavigationAtRef.current = now;
    setStep((s) => {
      const idx = WIZARD_STEPS.indexOf(s);
      if (idx > 0) return WIZARD_STEPS[idx - 1];
      return s;
    });
  }, [locked]);

  const goToStep = useCallback((s: string) => {
    if (locked) return;
    const targetIndex = (WIZARD_STEPS as readonly string[]).indexOf(s);
    if (targetIndex < 0 || targetIndex > getHighestReachableStepIndex(latestDecisionRef.current)) return;
    const now = Date.now();
    if (now - lastNavigationAtRef.current < 350) return;
    if (!flushSave()) return;
    lastNavigationAtRef.current = now;
    setStep(s as WizardStep);
  }, [flushSave, locked]);

  const lock = useCallback((selectedOptionId?: string) => {
    const current = latestDecisionRef.current;
    const targetId = selectedOptionId ?? current.selectedOptionId;
    if (getLockIssue(current, targetId)) return;

    const next = {
      ...current,
      selectedOptionId: targetId,
      status: 'locked' as const,
      lockedAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      onSave(next, 'commit');
    } catch (error) {
      console.error('锁定决策失败', error);
      setSaveStatus('error');
      return;
    }
    latestDecisionRef.current = next;
    dirtyRef.current = false;
    needsCommitRef.current = false;
    persistedRef.current = true;
    setSaveStatus('saved');
    setDecision(next);
    setLocked(true);
  }, [onSave]);

  const unlock = useCallback(() => {
    const { lockedAt: _lockedAt, ...rest } = latestDecisionRef.current;
    const next = { ...rest, status: 'draft' as const, updatedAt: Date.now() };
    try {
      onSave(next, 'commit');
    } catch (error) {
      console.error('解锁决策失败', error);
      setSaveStatus('error');
      return;
    }
    latestDecisionRef.current = next;
    dirtyRef.current = false;
    needsCommitRef.current = false;
    persistedRef.current = true;
    setSaveStatus('saved');
    setDecision(next);
    setLocked(false);
  }, [onSave]);

  const skipTimeline = useCallback(() => {
    const next = { ...latestDecisionRef.current, timelineSkipped: true, updatedAt: Date.now() };
    try {
      onSave(next, 'commit');
    } catch (error) {
      console.error('保存时间轴状态失败', error);
      setSaveStatus('error');
      return;
    }
    latestDecisionRef.current = next;
    dirtyRef.current = false;
    needsCommitRef.current = false;
    persistedRef.current = true;
    setSaveStatus('saved');
    setDecision(next);
    setStep('lock');
  }, [onSave]);

  const canGoNext = canAdvanceFrom(step, decision);
  const highestReachableStepIndex = getHighestReachableStepIndex(decision);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (locked) return;
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      const inInteractiveElement = !!target?.closest(
        'input, textarea, select, button, a, [role="button"], [contenteditable="true"]'
      );
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
        return;
      }
      if (e.defaultPrevented || inInteractiveElement) return;
      if (e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        goToStep(WIZARD_STEPS[Number(e.key) - 1]);
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
    stepIndex: WIZARD_STEPS.indexOf(step),
    totalSteps: WIZARD_STEPS.length,
    highestReachableStepIndex,
    locked,
    canGoNext,
    hoveredOptionId,
    saveStatus,
    setHoveredOptionId,
    update,
    goNext,
    goPrev,
    goToStep,
    save,
    flushSave,
    lock,
    unlock,
    skipTimeline,
  };
}

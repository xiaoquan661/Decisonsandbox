import { useState, useCallback, useRef } from 'react';
import { Decision } from './types';

const STORAGE_KEY = 'decision_sandbox_v1';
const DRAFT_PREFIX = 'decision_sandbox_draft_v1:';

export type DecisionSaveMode = 'background' | 'commit';

function isDecision(value: unknown): value is Decision {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Decision>;
  return typeof candidate.id === 'string' && typeof candidate.updatedAt === 'number';
}

function readMainDecisions(): Decision[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isDecision) : [];
}

function load(): Decision[] {
  try {
    const main = readMainDecisions();
    const merged = [...main];
    const draftOnly: Decision[] = [];

    // 后台草稿按决策拆开存储：刷新后仍可恢复，同时避免每次输入都序列化整份档案。
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;

      try {
        const rawDraft = localStorage.getItem(key);
        const draft: unknown = rawDraft ? JSON.parse(rawDraft) : null;
        if (!isDecision(draft)) continue;

        const mainIndex = merged.findIndex((decision) => decision.id === draft.id);
        if (mainIndex < 0) draftOnly.push(draft);
        else if (draft.updatedAt > merged[mainIndex].updatedAt) merged[mainIndex] = draft;
      } catch {
        // 单条草稿损坏不应阻止其余决策加载。
      }
    }

    draftOnly.sort((a, b) => b.updatedAt - a.updatedAt);
    return [...draftOnly, ...merged];
  } catch {
    return [];
  }
}

function saveAll(decisions: Decision[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

function saveDraft(decision: Decision) {
  localStorage.setItem(`${DRAFT_PREFIX}${decision.id}`, JSON.stringify(decision));
}

export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>(() => load());
  const decisionsRef = useRef(decisions);

  const upsert = useCallback((decision: Decision, mode: DecisionSaveMode = 'commit') => {
    if (mode === 'background') {
      // 自动保存不更新 React 顶层状态，避免整个三栏页面在输入过程中重渲染。
      saveDraft(decision);
      return;
    }

    const prev = decisionsRef.current;
    const idx = prev.findIndex((d) => d.id === decision.id);
    const next = idx >= 0 ? [...prev] : [decision, ...prev];
    if (idx >= 0) next[idx] = decision;
    saveAll(next);
    localStorage.removeItem(`${DRAFT_PREFIX}${decision.id}`);
    decisionsRef.current = next;
    setDecisions(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = decisionsRef.current.filter((d) => d.id !== id);
    saveAll(next);
    localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
    decisionsRef.current = next;
    setDecisions(next);
  }, []);

  return { decisions, upsert, remove };
}

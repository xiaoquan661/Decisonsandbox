import { useState, useEffect, useCallback } from 'react';
import { Decision } from './types';

const STORAGE_KEY = 'decision_sandbox_v1';

function load(): Decision[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(decisions: Decision[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>(() => load());

  useEffect(() => {
    save(decisions);
  }, [decisions]);

  const upsert = useCallback((decision: Decision) => {
    setDecisions((prev) => {
      const idx = prev.findIndex((d) => d.id === decision.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = decision;
        return next;
      }
      return [decision, ...prev];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { decisions, upsert, remove };
}

// PC 端全局快捷键浮层：按 ? 触发，列出所有快捷键
// 必须在 PC 三栏布局顶层使用

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface KeyboardShortcutsProps {
  onBack?: () => void; // Esc 退出回调
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'S'], label: '保存当前决策' },
  { keys: ['1'], label: '跳到步骤 1 · 新建沙盘' },
  { keys: ['2'], label: '跳到步骤 2 · 拖入选项' },
  { keys: ['3'], label: '跳到步骤 3 · 选择维度' },
  { keys: ['4'], label: '跳到步骤 4 · 维度评分' },
  { keys: ['5'], label: '跳到步骤 5 · 权重配比' },
  { keys: ['6'], label: '跳到步骤 6 · 时间轴推演' },
  { keys: ['7'], label: '跳到步骤 7 · 锁定决策' },
  { keys: ['↵'], label: '进入下一步（当前步骤可继续时）' },
  { keys: ['?'], label: '显示 / 隐藏本快捷键面板' },
  { keys: ['Esc'], label: '关闭浮层 / 退出当前流程' },
];

export function KeyboardShortcuts({ onBack }: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 焦点在表单元素时不触发
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (inField) return;

      if (e.key === '?') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'Escape' && onBack) {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onBack]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-md w-[480px] max-w-[90vw] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                  KEYBOARD
                </p>
                <p className="text-sm text-foreground font-medium mt-0.5">快捷键</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-1 shrink-0 w-20">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground min-w-[20px] text-center"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
              <span>按 <kbd className="font-mono bg-muted border border-border rounded px-1 py-0.5">?</kbd> 或 <kbd className="font-mono bg-muted border border-border rounded px-1 py-0.5">Esc</kbd> 关闭</span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

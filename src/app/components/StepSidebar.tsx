import { useWizard } from './WizardContext';
import { motion } from 'motion/react';
import { Lock, Circle } from 'lucide-react';

const STEPS: { key: string; label: string; index: number }[] = [
  { key: 'title', label: '新建沙盘', index: 1 },
  { key: 'options', label: '拖入选项', index: 2 },
  { key: 'dimensions', label: '选择维度', index: 3 },
  { key: 'scoring', label: '维度评分', index: 4 },
  { key: 'weights', label: '权重配比', index: 5 },
  { key: 'timeline', label: '时间轴推演', index: 6 },
  { key: 'lock', label: '锁定决策', index: 7 },
];

export function StepSidebar() {
  const ctx = useWizard();
  if (!ctx) return null;
  const { step, stepIndex, totalSteps, goToStep, decision } = ctx;
  const locked = decision.status === 'locked';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            决策流程
          </p>
          {locked && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary font-mono">
              <Lock size={9} /> LOCKED
            </span>
          )}
        </div>
        <p className="text-2xl text-foreground mt-2 font-mono tabular-nums tracking-tight">
          {String(stepIndex + 1).padStart(2, '0')} <span className="text-muted-foreground">/ {String(totalSteps).padStart(2, '0')}</span>
        </p>
      </div>

      {/* Steps list */}
      <nav className="flex-1 p-3 pt-5 space-y-1 overflow-y-auto">
        {STEPS.map((s) => {
          const isCurrent = s.key === step;
          // 侧栏是纯导航器：未锁定时 7 步都能自由跳；锁定后也能切换查看每步
          return (
            <button
              key={s.key}
              onClick={() => goToStep(s.key)}
              className={`relative w-full text-left flex items-center gap-3 px-3 py-3 rounded-sm text-xs transition-colors cursor-pointer ${
                isCurrent
                  ? 'text-foreground bg-secondary before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {/* Step indicator with active rail */}
              <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
                {isCurrent && (
                  <motion.div
                    layoutId="step-active-ring"
                    className="absolute inset-0 rounded-full bg-primary/15 border border-primary/50"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {isCurrent ? (
                  <Circle size={7} className="text-primary fill-primary relative z-10" />
                ) : (
                  <Circle size={6} className="text-muted-foreground/40 relative z-10" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                    {String(s.index).padStart(2, '0')}
                  </span>
                  <span className={isCurrent ? 'font-medium' : ''}>{s.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

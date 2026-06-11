import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Lock, Unlock } from 'lucide-react';
import { Decision } from './types';
import {
  Step1, Step2, Step3, Step4b, Step4, Step5, Step6,
  calcScore, normalizeWeights,
} from './SandboxWizard.steps';
import { useWizard } from './WizardContext';
import { UseWizardState } from './useWizardState';

interface WizardProps {
  onBack: () => void;
}

/** PC 三栏模式：state 由父级 (PCWizardLayout) 创建并通过 WizardProvider 注入
 *  本组件不创建新 state，只消费 Context 渲染当前 Step
 */
export function SandboxWizard({ onBack }: WizardProps) {
  const state = useWizard();
  if (!state) {
    // 退化分支：没在 WizardProvider 内（理论上不会到这）
    return <div className="text-muted-foreground p-8 text-sm">未初始化沙盘状态</div>;
  }

  return (
    <div className="text-foreground pb-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.locked ? 'locked' : state.step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {renderStep(state, onBack)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function renderStep(state: UseWizardState, onBack: () => void) {
  if (state.locked) {
    return <LockedView decision={state.decision} onUnlock={state.unlock} />;
  }
  switch (state.step) {
    case 'title': return <Step1 decision={state.decision} onChange={state.update} />;
    case 'options': return <Step2 decision={state.decision} onChange={state.update} />;
    case 'dimensions': return <Step3 decision={state.decision} onChange={state.update} />;
    case 'scoring': return <Step4b decision={state.decision} onChange={state.update} />;
    case 'weights': return <Step4 decision={state.decision} onChange={state.update} />;
    case 'timeline': return <Step5 decision={state.decision} onChange={state.update} onSkip={state.skipTimeline} />;
    case 'lock': return <Step6 decision={state.decision} onChange={state.update} onLock={state.lock} />;
  }
}

// ─── LockedView ────────────────────────────────────────────────────────

function LockedView({ decision, onUnlock }: {
  decision: Decision;
  onUnlock: () => void;
}) {
  const dims = decision.dimensions;
  const scored = [...decision.options]
    .map((opt) => ({ opt, score: calcScore(opt, dims) }))
    .sort((a, b) => b.score - a.score);

  const [confirmUnlock, setConfirmUnlock] = useState(false);

  return (
    <div>
      {/* 顶部操作条：解锁 + 锁定时间 */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Lock size={12} className="text-primary" />
          <span>已锁定 · {decision.lockedAt ? new Date(decision.lockedAt).toLocaleString('zh-CN') : ''}</span>
        </div>
        <button
          onClick={() => setConfirmUnlock(true)}
          className="text-xs font-medium text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-colors rounded-md px-3 py-1.5 flex items-center gap-1.5"
        >
          <Unlock size={12} /> 解锁继续修改
        </button>
      </div>

      <div className="bg-card border border-border rounded-md p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-3">综合评分</p>
        <div className="space-y-2">
          {scored.map(({ opt, score }, rank) => {
            const isChosen = opt.id === decision.selectedOptionId;
            return (
              <div key={opt.id} className={`flex items-center gap-3 ${isChosen ? 'p-2 -m-2 rounded bg-primary/5 border border-primary/20' : ''}`}>
                <span className={`text-xs w-4 font-mono ${isChosen ? 'text-primary' : 'text-muted-foreground'}`}>{rank + 1}</span>
                <span className={`flex-1 text-sm ${isChosen ? 'text-primary font-medium' : ''}`}>
                  {opt.name}
                  {isChosen && <span className="ml-2 text-[10px] text-primary/80 font-mono">✓ 最终选择</span>}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(score / 10) * 100}%` }} />
                </div>
                <span className={`text-sm w-10 text-right font-mono tabular-nums ${isChosen ? 'text-primary' : 'text-muted-foreground'}`}>
                  {score.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {dims.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">评估维度</p>
          <div className="flex flex-wrap gap-2">
            {dims.map((d) => {
              const nw = normalizeWeights(dims);
              return (
                <div key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                  {d.name}
                  <span className="text-muted-foreground font-mono tabular-nums">{Math.round((nw[d.id] ?? 0) * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {decision.reason && (
        <div className="bg-card border border-border rounded-md p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2">决策理由</p>
          <p className="text-sm text-foreground leading-relaxed">{decision.reason}</p>
        </div>
      )}

      {decision.timelineNodes.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">时间轴节点</p>
          <div className="space-y-1.5">
            {[...decision.timelineNodes].sort((a, b) => a.month - b.month).map((n) => {
              const opt = decision.options.find((o) => o.id === n.optionId);
              const sentimentClass = n.sentiment === 'positive' ? 'border-success/30 bg-success/5 text-success' :
                                     n.sentiment === 'negative' ? 'border-danger/30 bg-danger/5 text-danger' :
                                     'border-warning/30 bg-warning/5 text-warning';
              return (
                <div key={n.id} className={`flex items-start gap-2 px-3 py-2 rounded-md border text-xs ${sentimentClass}`}>
                  <span className="text-muted-foreground shrink-0 font-mono">T+{n.month}月</span>
                  <span className="text-muted-foreground shrink-0">{opt?.name}</span>
                  <span className="flex-1">{n.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 解锁确认弹框 */}
      {confirmUnlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-card-foreground mb-2">确认解锁这个决策？</h3>
            <p className="text-sm text-muted-foreground mb-5">
              解锁后所有字段（标题、选项、维度、评分、权重、时间轴、最终选择、决策理由）都可以修改，再次锁定时锁定时间会更新。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onUnlock(); setConfirmUnlock(false); }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm"
              >
                确认解锁
              </button>
              <button
                onClick={() => setConfirmUnlock(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

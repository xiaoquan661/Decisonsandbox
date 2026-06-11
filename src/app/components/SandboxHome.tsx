import { Plus, Clock, ChevronRight, Lock, FileText } from 'lucide-react';
import { Decision, CATEGORY_LABELS } from './types';

interface Props {
  decisions: Decision[];
  onNew: () => void;
  onOpen: (id: string) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

function DecisionCard({ decision, onOpen }: { decision: Decision; onOpen: () => void }) {
  const optionCount = decision.options.length;
  const dimCount = decision.dimensions.length;
  const isLocked = decision.status === 'locked';
  const needsReview = isLocked && !decision.reviewedAt &&
    decision.lockedAt && Date.now() - decision.lockedAt > 7 * 24 * 3600 * 1000;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isLocked && <Lock size={12} className="text-primary shrink-0" />}
          {needsReview && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
              待回访
            </span>
          )}
          <span className="text-sm truncate text-card-foreground">{decision.title || '未命名决策'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(decision.createdAt)}</span>
          <span>{optionCount} 个选项</span>
          {dimCount > 0 && <span>{dimCount} 个维度</span>}
          <span className="px-1.5 py-0.5 bg-secondary rounded-full">
            {CATEGORY_LABELS[decision.category]}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground mt-1 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

export function SandboxHome({ decisions, onNew, onOpen }: Props) {
  const recent = decisions.slice(0, 1)[0];
  const history = decisions.slice(1);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">决策沙盘</p>
        <h1 className="text-card-foreground">把选择放上沙盘</h1>
        <p className="text-sm text-muted-foreground mt-1">用 10 分钟，做少后悔的决定</p>
      </div>

      {/* New Button */}
      <div className="px-5 mb-6">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-4 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
        >
          <Plus size={20} />
          <span>新建沙盘</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <p className="text-card-foreground mb-1">还没有决策记录</p>
            <p className="text-sm text-muted-foreground">点击上方按钮，开始第一次决策</p>
          </div>
        ) : (
          <>
            {/* Most Recent */}
            {recent && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">最近一次</span>
                </div>
                <div
                  onClick={() => onOpen(recent.id)}
                  className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {recent.status === 'locked' && <Lock size={13} className="text-primary" />}
                        <h3 className="text-card-foreground">{recent.title || '未命名决策'}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(recent.createdAt)} · {recent.options.length} 个选项 · {recent.dimensions.length} 个维度
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>

                  {/* Mini score preview */}
                  {recent.options.length > 0 && recent.dimensions.length > 0 && (
                    <div className="space-y-2">
                      {recent.options.slice(0, 3).map((opt) => {
                        const totalWeight = recent.dimensions.reduce((s, d) => s + d.weight, 0);
                        const score = totalWeight > 0
                          ? recent.dimensions.reduce((s, d) => s + (opt.scores[d.id] ?? 5) * (d.weight / totalWeight), 0)
                          : 5;
                        return (
                          <div key={opt.id}>
                            <p className="text-xs text-muted-foreground mb-0.5">{opt.name || '选项'}</p>
                            <ScoreBar score={score} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">历史记录</p>
                <div className="space-y-2">
                  {history.map((d) => (
                    <DecisionCard key={d.id} decision={d} onOpen={() => onOpen(d.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

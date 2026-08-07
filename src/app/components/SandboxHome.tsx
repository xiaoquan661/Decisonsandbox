import { Plus, Clock, ChevronRight, Lock, FileText, Layers3, SlidersHorizontal, Route, Crosshair, ArrowUpRight } from 'lucide-react';
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
      className="w-full text-left bg-card border border-border rounded-md p-4 flex items-start gap-3 hover:border-primary hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--border)] transition-all group"
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
          <span className="px-1.5 py-0.5 bg-secondary border border-border rounded-sm font-mono text-[9px] uppercase tracking-wide">
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
  const lockedCount = decisions.filter((d) => d.status === 'locked').length;

  return (
    <div className="relative pb-10">
      <section className="relative overflow-hidden border border-border-strong bg-card mb-7 reveal-up shadow-[8px_8px_0_color-mix(in_srgb,var(--border)_55%,transparent)]">
        <div className="h-1 bg-primary" />
        <div className="grid sm:grid-cols-[1fr_230px] min-h-[310px]">
          <div className="relative p-6 sm:p-9 flex flex-col justify-center">
            <div className="absolute left-0 top-8 w-3 h-px bg-primary" />
            <p className="text-[9px] text-primary mb-5 tracking-[0.28em] uppercase font-mono flex items-center gap-2">
              <Crosshair size={11} /> DECISION INSTRUMENT / 001
            </p>
            <h1 className="font-display text-[2rem] sm:text-[2.65rem] leading-[1.22] text-card-foreground tracking-[-0.04em] max-w-xl">
              把纠结，变成<br /><span className="text-primary">看得见</span>的比较
            </h1>
            <p className="text-sm text-muted-foreground mt-5 leading-7 max-w-lg">
              列出选项、校准权重、推演结果。<br className="hidden sm:block" />用一套可回看的过程，替代临时拍脑袋。
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
            <button
              onClick={onNew}
              className="group inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-sm px-5 py-3 hover:brightness-110 active:translate-y-px transition-all font-medium"
            >
              <Plus size={17} />
              <span>开始一次新决策</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            {recent && (
              <button
                onClick={() => onOpen(recent.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                继续上次草稿 <ChevronRight size={15} />
              </button>
            )}
            </div>
          </div>

          <div className="hidden sm:flex relative border-l border-border bg-background/60 instrument-grid items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 top-4 flex justify-between px-4 text-[8px] text-muted-foreground font-mono">
              <span>Y / VALUE</span><span>10.0</span>
            </div>
            <div className="relative w-40 h-40 border border-border-strong rounded-full flex items-center justify-center">
              <div className="absolute inset-4 border border-dashed border-border-strong rounded-full animate-[spin_28s_linear_infinite]" />
              <div className="absolute w-full h-px bg-border-strong" />
              <div className="absolute h-full w-px bg-border-strong" />
              <div className="w-16 h-16 bg-primary/10 border border-primary rotate-45 flex items-center justify-center shadow-[0_0_30px_color-mix(in_srgb,var(--primary)_15%,transparent)]">
                <span className="font-mono text-primary text-[10px] -rotate-45">DECIDE</span>
              </div>
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary" />
              <span className="absolute bottom-3 right-0 font-mono text-[8px] text-muted-foreground">X / RISK</span>
            </div>
            <div className="absolute bottom-4 inset-x-4 flex items-end justify-between font-mono">
              <span className="text-[8px] text-muted-foreground">CALIBRATED<br />FOR CLARITY</span>
              <span className="text-3xl text-border-strong">07</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border mb-9 reveal-up reveal-up-1" aria-label="决策流程概览">
        {[
          { icon: Layers3, index: '01', title: '摆出选择', text: '把脑中的候选项全部外化' },
          { icon: SlidersHorizontal, index: '02', title: '校准标准', text: '评分并看清真实权重' },
          { icon: Route, index: '03', title: '推演未来', text: '比较结果，留下决策依据' },
        ].map(({ icon: Icon, index, title, text }) => (
          <div key={index} className="group bg-card p-4 sm:p-5 flex items-start gap-3 hover:bg-secondary transition-colors">
            <div className="w-8 h-8 border border-border-strong bg-background flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
              <Icon size={15} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-primary font-mono">/{index}</span>
                <p className="text-sm text-card-foreground font-medium">{title}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-end justify-between mb-3 reveal-up reveal-up-2">
        <div>
          <p className="text-[9px] text-primary tracking-[0.22em] uppercase font-mono">YOUR SANDBOXES / ARCHIVE</p>
          <h2 className="font-display text-xl text-card-foreground mt-1.5">你的决策</h2>
        </div>
        {decisions.length > 0 && (
          <p className="text-xs text-muted-foreground font-mono">{decisions.length} 次决策 · {lockedCount} 次已锁定</p>
        )}
      </div>

      <div className="reveal-up reveal-up-3">
        {decisions.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center py-14 text-center bg-card border border-dashed border-border-strong overflow-hidden">
            <span className="absolute left-3 top-3 font-mono text-[8px] text-muted-foreground">EMPTY / 000</span>
            <span className="absolute right-3 bottom-3 w-8 h-8 border-r border-b border-primary/50" />
            <div className="w-12 h-12 border border-border-strong bg-muted flex items-center justify-center mb-4 rotate-3">
              <FileText size={22} className="text-muted-foreground" />
            </div>
            <p className="font-display text-lg text-card-foreground mb-1">这里还没有沙盘</p>
            <p className="text-sm text-muted-foreground mb-4">从一个最近让你纠结的问题开始</p>
            <button onClick={onNew} className="text-xs font-mono text-primary border-b border-primary pb-0.5 hover:text-foreground hover:border-foreground transition-colors">创建第一个沙盘 ↗</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {recent && (
              <div className="lg:row-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">最近编辑</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(recent.id)}
                  className="w-full text-left bg-card border border-border rounded-md p-5 cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--border)] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition-all group min-h-[180px]"
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
                </button>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 lg:mt-0 mt-2">其他记录</p>
                <div className="space-y-2">
                  {history.map((d) => (
                    <DecisionCard key={d.id} decision={d} onOpen={() => onOpen(d.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

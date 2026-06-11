// 右栏各步骤的实时预览组件
// 所有组件都通过 useWizard() 订阅 wizard state

import { motion } from 'motion/react';
import { CATEGORY_LABELS, Decision } from './types';
import { useWizard } from './WizardContext';
import { calcScore, normalizeWeights } from './SandboxWizard.steps';
import { Lock, FileText, Sparkles, Clock, BarChart3, AlertCircle, Check } from 'lucide-react';
import { RadarPreview } from './RadarPreview';
import { AiRecommenderCard } from './AiRecommenderCard';

// ─── 顶部：决策卡（始终显示） ──────────────────────────────────────────
export function DecisionCard() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;

  return (
    <div className="bg-card border border-border rounded-md p-3">
      <p className="text-[10px] text-muted-foreground mb-1.5 font-mono uppercase tracking-widest">决策</p>
      <p className="text-sm text-foreground font-medium truncate">
        {d.title || '未命名决策'}
      </p>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
        <span className="px-1.5 py-0.5 bg-muted rounded font-mono">
          {CATEGORY_LABELS[d.category]}
        </span>
        <span className="font-mono tabular-nums">{d.options.length} 选项</span>
        <span className="text-border">·</span>
        <span className="font-mono tabular-nums">{d.dimensions.length} 维度</span>
        {d.status === 'locked' && (
          <span className="ml-auto flex items-center gap-0.5 text-primary">
            <Lock size={9} /> 已锁
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Step 1 / 2 预览：决策基本信息 ─────────────────────────────────────
export function TitlePreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;

  return (
    <div className="space-y-3">
      <SectionLabel>步骤摘要</SectionLabel>
      <Stat label="标题" value={d.title || '未填'} mono={!d.title} muted={!d.title} />
      <Stat label="类型" value={CATEGORY_LABELS[d.category]} />
      <Stat label="选项数" value={String(d.options.length)} mono />
      <Hint icon={FileText}>
        标题会出现在所有档案列表里。简洁可识别（如"秋招 offer 选择"）。
      </Hint>
    </div>
  );
}

// ─── Step 2 预览：选项列表 ─────────────────────────────────────────────
export function OptionsPreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;

  return (
    <div className="space-y-3">
      <SectionLabel>选项</SectionLabel>
      <div className="space-y-1.5">
        {d.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          return (
            <motion.div
              key={opt.id}
              onMouseEnter={() => ctx.setHoveredOptionId(opt.id)}
              onMouseLeave={() => ctx.setHoveredOptionId(null)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors cursor-default ${
                ctx.hoveredOptionId === opt.id
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 font-mono">
                {letter}
              </span>
              <span className="text-xs text-foreground truncate flex-1">
                {opt.name || '未命名'}
              </span>
            </motion.div>
          );
        })}
      </div>
      <Stat label="限制" value="≥2, ≤6" mono />
      {d.options.length === 6 && (
        <div className="flex items-center gap-2 text-[11px] text-warning bg-warning/10 px-2.5 py-1.5 rounded-md">
          <AlertCircle size={11} />
          达到上限，建议拆分为多次决策
        </div>
      )}
    </div>
  );
}

// ─── Step 3 预览：维度选择 ─────────────────────────────────────────────
export function DimensionsPreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;

  return (
    <div className="space-y-3">
      <SectionLabel>已选维度</SectionLabel>
      {d.dimensions.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-1">
          还没有选维度。从模板点选或自定义。
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {d.dimensions.map((dim) => (
            <span
              key={dim.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-card border border-border rounded text-[11px] text-foreground"
            >
              {dim.aiRecommended && <Sparkles size={9} className="text-primary" />}
              {dim.name}
            </span>
          ))}
        </div>
      )}
      <Stat label="数量" value={`${d.dimensions.length} / 建议 2+`} mono />
      {d.dimensions.length < 2 && d.dimensions.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-warning bg-warning/10 px-2.5 py-1.5 rounded-md">
          <AlertCircle size={11} />
          至少 2 个维度，避免"考虑不全"
        </div>
      )}
    </div>
  );
}

// ─── Step 4 / Scoring 预览：雷达图 + 评分 ──────────────────────────────
export function ScoringPreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;
  const scored = d.dimensions.length > 0 ? d.options.map((opt) => ({
    opt,
    score: calcScore(opt, d.dimensions),
  })) : [];

  if (d.dimensions.length === 0) {
    return (
      <div className="space-y-3">
        <SectionLabel>评分</SectionLabel>
        <p className="text-[11px] text-muted-foreground italic px-1">先选维度才能评分</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionLabel>实时雷达图</SectionLabel>
      <RadarPreview decision={d} hoveredOptionId={ctx.hoveredOptionId} />
      <div className="space-y-1.5 pt-1">
        {scored.map(({ opt, score }, i) => {
          const letter = String.fromCharCode(65 + i);
          const isHovered = ctx.hoveredOptionId === opt.id;
          return (
            <div
              key={opt.id}
              onMouseEnter={() => ctx.setHoveredOptionId(opt.id)}
              onMouseLeave={() => ctx.setHoveredOptionId(null)}
              className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                isHovered ? 'bg-muted/60' : ''
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center font-mono">
                {letter}
              </span>
              <span className="text-[11px] text-foreground flex-1 truncate">{opt.name}</span>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                {score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5 / Weights 预览：权重分布 ──────────────────────────────────
export function WeightsPreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;

  if (d.dimensions.length === 0) {
    return (
      <div className="space-y-3">
        <SectionLabel>权重</SectionLabel>
        <p className="text-[11px] text-muted-foreground italic px-1">先选维度才能配权重</p>
      </div>
    );
  }

  const nw = normalizeWeights(d.dimensions);
  const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6'];
  const topEntry = Object.entries(nw).sort((a, b) => b[1] - a[1])[0];
  const topDim = d.dimensions.find((dim) => dim.id === topEntry?.[0]);

  return (
    <div className="space-y-3">
      <SectionLabel>权重分布</SectionLabel>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {d.dimensions.map((dim, i) => (
          <div
            key={dim.id}
            className={`${colors[i % 6]} transition-all duration-300`}
            style={{ width: `${(nw[dim.id] ?? 0) * 100}%` }}
          />
        ))}
      </div>
      <div className="space-y-1">
        {d.dimensions.map((dim, i) => (
          <div key={dim.id} className="flex items-center gap-2 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${colors[i % 6]}`} />
            <span className="text-foreground flex-1 truncate">{dim.name}</span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {Math.round((nw[dim.id] ?? 0) * 100)}%
            </span>
          </div>
        ))}
      </div>
      {topDim && topEntry && topEntry[1] > 0.5 && (
        <div className="flex items-center gap-2 text-[11px] text-warning bg-warning/10 px-2.5 py-1.5 rounded-md">
          <AlertCircle size={11} />
          「{topDim.name}」占了约一半
        </div>
      )}
    </div>
  );
}

// ─── Step 6 / Timeline 预览：节点统计 ────────────────────────────────
export function TimelinePreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;
  const nodes = d.timelineNodes;
  const bySentiment = {
    positive: nodes.filter((n) => n.sentiment === 'positive').length,
    negative: nodes.filter((n) => n.sentiment === 'negative').length,
    neutral: nodes.filter((n) => n.sentiment === 'neutral').length,
  };

  return (
    <div className="space-y-3">
      <SectionLabel>时间轴</SectionLabel>
      <Stat label="跨度" value={`${d.timelineSpan} 个月`} mono />
      <Stat label="节点数" value={String(nodes.length)} mono />
      {nodes.length > 0 && (
        <div className="space-y-1 pt-1">
          <SentimentBar
            label="积极"
            count={bySentiment.positive}
            total={nodes.length}
            color="bg-success"
            textClass="text-success"
          />
          <SentimentBar
            label="风险"
            count={bySentiment.negative}
            total={nodes.length}
            color="bg-danger"
            textClass="text-danger"
          />
          <SentimentBar
            label="中性"
            count={bySentiment.neutral}
            total={nodes.length}
            color="bg-warning"
            textClass="text-warning"
          />
        </div>
      )}
      {d.timelineSkipped && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md">
          <Clock size={11} />
          已跳过时间轴
        </div>
      )}
    </div>
  );
}

// ─── Step 7 / Lock 预览：综合排名 ────────────────────────────────────
export function LockPreview() {
  const ctx = useWizard();
  if (!ctx) return null;
  const d = ctx.decision;
  const scored = d.dimensions.length > 0
    ? [...d.options]
        .map((opt) => ({ opt, score: calcScore(opt, d.dimensions) }))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="space-y-3">
      <SectionLabel>综合排名</SectionLabel>
      {scored.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-1">先完成维度评分</p>
      ) : (
        <div className="space-y-1.5">
          {scored.map(({ opt, score }, rank) => {
            const letter = String.fromCharCode(65 + d.options.findIndex((o) => o.id === opt.id));
            return (
              <div
                key={opt.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${
                  rank === 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <span className={`text-[10px] font-mono w-3 ${rank === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {String(rank + 1).padStart(2, '0')}
                </span>
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center font-mono">
                  {letter}
                </span>
                <span className="text-xs text-foreground flex-1 truncate">{opt.name}</span>
                <span className={`text-xs font-mono tabular-nums ${rank === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {score.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {d.reason && d.reason.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] text-muted-foreground mb-1">决策理由</p>
          <p className="text-[11px] text-foreground leading-relaxed bg-muted/40 px-2.5 py-1.5 rounded-md line-clamp-4">
            {d.reason}
          </p>
        </div>
      )}

      <AiRecommenderCard />
    </div>
  );
}

// ─── 共享小组件 ──────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
      {children}
    </p>
  );
}

function Stat({ label, value, mono, muted }: { label: string; value: string; mono?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[12px] ${mono ? 'font-mono tabular-nums' : ''} ${muted ? 'text-muted-foreground italic' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function Hint({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-md px-2.5 py-2">
      <Icon size={11} className="text-primary mt-0.5 shrink-0" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function SentimentBar({ label, count, total, color, textClass }: { label: string; count: number; total: number; color: string; textClass: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono tabular-nums ${textClass}`}>{count}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// SandboxWizard 各 Step 子组件 + 共享 helpers
// 从原 SandboxWizard.tsx 抽出，保持 props 接口不变

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Check, Lock, Sparkles, AlertCircle,
  SkipForward, Play, Pause, X, Info, Settings as SettingsIcon,
} from 'lucide-react';
import {
  Decision, DecisionOption, Dimension, TimelineNode,
  DIMENSION_TEMPLATES, CATEGORY_LABELS,
} from './types';
import { requestDimensions, MissingApiKeyError, hasApiKey } from '../lib/llmClient';
import { getLockIssue } from '../lib/wizardValidation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── 共享 helpers ────────────────────────────────────────────────────────

export function normalizeWeights(dimensions: Dimension[]): Record<string, number> {
  const total = dimensions.reduce((s, d) => s + d.weight, 0);
  if (total === 0) {
    const eq = 1 / dimensions.length;
    return Object.fromEntries(dimensions.map((d) => [d.id, eq]));
  }
  return Object.fromEntries(dimensions.map((d) => [d.id, d.weight / total]));
}

export function calcScore(option: DecisionOption, dimensions: Dimension[]): number {
  const nw = normalizeWeights(dimensions);
  return dimensions.reduce((s, d) => s + (option.scores[d.id] ?? 5) * (nw[d.id] ?? 0), 0);
}

// ─── Step 1: Title + Category ─────────────────────────────────────────────

export function Step1({ decision, onChange }: { decision: Decision; onChange: (d: Partial<Decision>) => void }) {
  const categories = Object.entries(CATEGORY_LABELS) as [Decision['category'], string][];

  return (
    <div>
      <h2 className="text-foreground mb-1">你在做什么决定？</h2>
      <p className="text-sm text-muted-foreground mb-5">给这次决策起个名字</p>

      <input
        aria-label="决策标题"
        className="w-full bg-input-background border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 mb-5"
        placeholder="例如：秋招 offer 选择"
        value={decision.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={40}
        autoFocus
      />

      <p className="text-sm text-muted-foreground mb-3">决策类型</p>
      <div className="grid grid-cols-2 gap-2">
        {categories.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange({ category: key })}
            aria-pressed={decision.category === key}
            className={`py-3 rounded-md border text-sm transition-all ${
              decision.category === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground hover:border-primary/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Options ──────────────────────────────────────────────────────

import { Reorder } from 'motion/react';
import { GripVertical } from 'lucide-react';

export function Step2({ decision, onChange }: { decision: Decision; onChange: (d: Partial<Decision>) => void }) {
  const options = decision.options;
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const addOption = () => {
    if (options.length >= 6) return;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const newOpt: DecisionOption = { id: uid(), name: `选项 ${letters[options.length]}`, scores: {} };
    onChange({ options: [...options, newOpt] });
  };

  const updateName = (id: string, name: string) => {
    onChange({ options: options.map((o) => (o.id === id ? { ...o, name } : o)) });
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    const remainingNodes = decision.timelineNodes.filter((node) => node.optionId !== id);
    onChange({
      options: options.filter((o) => o.id !== id),
      selectedOptionId: decision.selectedOptionId === id ? undefined : decision.selectedOptionId,
      timelineNodes: remainingNodes,
      timelineSkipped: decision.timelineNodes.length > 0 && remainingNodes.length === 0
        ? true
        : decision.timelineSkipped,
    });
    setPendingDeleteId(null);
  };

  const requestRemoveOption = (id: string) => {
    const hasReferences = decision.selectedOptionId === id || decision.timelineNodes.some((node) => node.optionId === id);
    if (hasReferences) setPendingDeleteId(id);
    else removeOption(id);
  };

  const reorder = (newOrder: DecisionOption[]) => {
    onChange({ options: newOrder });
  };

  return (
    <div>
      <h2 className="text-foreground mb-1">你有哪些选项？</h2>
      <p className="text-sm text-muted-foreground mb-1">
        至少 2 个，最多 6 个
      </p>
      <p className="text-xs text-muted-foreground/70 mb-5 font-mono">
        拖拽手柄 ⠿ 重新排序 · 改变选项的优先级
      </p>

      <Reorder.Group
        axis="y"
        values={options}
        onReorder={reorder}
        className="space-y-2 mb-4"
      >
        {options.map((opt, i) => (
          <Reorder.Item
            key={opt.id}
            value={opt}
            className="group flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2.5 hover:border-border-strong transition-colors cursor-default"
            whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            layout
          >
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center shrink-0 font-mono">
              {String.fromCharCode(65 + i)}
            </span>
            <input
              aria-label={`选项 ${String.fromCharCode(65 + i)} 名称`}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              value={opt.name}
              onChange={(e) => updateName(opt.id, e.target.value)}
              placeholder={`选项 ${String.fromCharCode(65 + i)}`}
            />
            {options.length > 2 && (
              <button
                onClick={() => requestRemoveOption(opt.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="删除"
                aria-label={`删除选项 ${opt.name || String.fromCharCode(65 + i)}`}
              >
                <Trash2 size={13} />
              </button>
            )}
            <GripVertical
              size={14}
              className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {options.length < 6 && (
        <button
          onClick={addOption}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <Plus size={15} />
          添加选项
        </button>
      )}

      {options.length === 6 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-md">
          <Info size={13} />
          建议拆分为多次决策，选项过多可能增加决策难度
        </div>
      )}

      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent className="bg-card border-border rounded-md p-5 w-full max-w-sm gap-0 shadow-xl">
          <DialogTitle className="text-base text-foreground mb-2">删除这个选项？</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mb-5">
            {(() => {
              const option = options.find((item) => item.id === pendingDeleteId);
              const nodeCount = decision.timelineNodes.filter((node) => node.optionId === pendingDeleteId).length;
              const impacts = [
                nodeCount > 0 ? `${nodeCount} 条关联时间轴记录` : '',
                decision.selectedOptionId === pendingDeleteId ? '当前最终选择' : '',
              ].filter(Boolean).join('和');
              return `删除「${option?.name || '未命名选项'}」后，将同时移除${impacts || '相关数据'}。此操作会自动保存。`;
            })()}
          </DialogDescription>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pendingDeleteId && removeOption(pendingDeleteId)}
              className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-md text-sm"
            >
              确认删除
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-md text-sm"
            >
              取消
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Step 3: Dimensions + A6 AI ──────────────────────────────────────────

export function Step3({ decision, onChange }: { decision: Decision; onChange: (d: Partial<Decision>) => void }) {
  const [customInput, setCustomInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<{ name: string; reason: string }[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiConsented, setAiConsented] = useState(false);
  const [aiError, setAiError] = useState('');
  // 未配置 API key 时弹出的引导对话框
  const [showKeyMissingModal, setShowKeyMissingModal] = useState(false);
  // 监听 ai-key-updated 事件，确保用户在设置页保存 key 后能立即感知
  const [, forceNav] = useState(0);
  useEffect(() => {
    const handler = () => forceNav((n) => n + 1);
    window.addEventListener('ai-key-updated', handler);
    return () => window.removeEventListener('ai-key-updated', handler);
  }, []);

  const dims = decision.dimensions;

  const toggleDimension = (name: string) => {
    const existing = dims.find((d) => d.name === name);
    if (existing) {
      onChange({ dimensions: dims.filter((d) => d.name !== name) });
    } else {
      const newDim: Dimension = { id: uid(), name, weight: 50 };
      onChange({ dimensions: [...dims, newDim] });
    }
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name || dims.find((d) => d.name === name)) return;
    const newDim: Dimension = { id: uid(), name, weight: 50 };
    onChange({ dimensions: [...dims, newDim] });
    setCustomInput('');
  };

  const removeDim = (id: string) => {
    onChange({ dimensions: dims.filter((d) => d.id !== id) });
  };

  const handleAiClick = () => {
    // PRD § 6.2.6.5: 设置中关闭 AI 推荐 → F2 不显示按钮
    if (typeof window !== 'undefined' && localStorage.getItem('ai_enabled') === 'false') {
      setAiError('AI 推荐已在设置中关闭');
      return;
    }
    // 未填 key → 引导去设置页
    if (!hasApiKey()) {
      setShowKeyMissingModal(true);
      return;
    }
    if (!aiConsented) setShowPrivacyModal(true);
    else triggerAi();
  };

  const goToSettings = () => {
    setShowKeyMissingModal(false);
    // 通知 AppShell 切到 settings tab（在 AppShell 里监听这个事件）
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'settings' } }));
  };

  const triggerAi = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await requestDimensions({
        category: decision.category,
        optionNames: decision.options.map((o) => o.name).filter(Boolean),
        existingDims: dims.map((d) => d.name),
      });
      const existing = new Set(dims.map((d) => d.name));
      const candidates = res.dimensions
        .filter((c) => c.name && !existing.has(c.name))
        .slice(0, 5);
      if (candidates.length === 0) {
        setAiError('AI 未找到额外维度');
      } else {
        setAiCandidates(candidates);
      }
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setShowKeyMissingModal(true);
      } else if (e instanceof Error && e.message === 'InvalidApiKey') {
        setAiError('API Key 无效，请到设置中检查');
      } else {
        setAiError('AI 推荐暂不可用，可手动选择');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const confirmCandidates = () => {
    const toAdd = aiCandidates
      .filter((c) => selectedCandidates.has(c.name))
      .map((c) => ({ id: uid(), name: c.name, weight: 50, aiRecommended: true }));
    onChange({ dimensions: [...dims, ...toAdd] });
    setAiCandidates([]);
    setSelectedCandidates(new Set());
    setAiDismissed(true);
  };

  const currentTemplate = Object.entries(DIMENSION_TEMPLATES).find(
    ([key]) => key === decision.category
  );

  return (
    <div>
      <h2 className="text-foreground mb-1">你在意哪些方面？</h2>
      <p className="text-sm text-muted-foreground mb-5">选择评估维度，至少 2 个</p>

      {currentTemplate && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">推荐模板 · {currentTemplate[1].label}</p>
          <div className="flex flex-wrap gap-2">
            {currentTemplate[1].dimensions.map((name) => {
              const selected = dims.some((d) => d.name === name);
              return (
                <button
                  key={name}
                  onClick={() => toggleDimension(name)}
                  aria-pressed={selected}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {selected && <Check size={11} className="inline mr-1" />}
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {Object.entries(DIMENSION_TEMPLATES)
        .filter(([k]) => k !== decision.category)
        .map(([key, tmpl]) => (
          <details key={key} className="mb-2">
            <summary className="cursor-pointer text-xs text-muted-foreground py-1 select-none">
              其他模板 · {tmpl.label}
            </summary>
            <div className="flex flex-wrap gap-2 mt-2 pl-2">
              {tmpl.dimensions.map((name) => {
                const selected = dims.some((d) => d.name === name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleDimension(name)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/40'
                    }`}
                  >
                    {selected && <Check size={11} className="inline mr-1" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </details>
        ))}

      <div className="flex gap-2 mt-4 mb-4">
        <input
          aria-label="自定义评估维度"
          className="flex-1 bg-input-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="自定义维度..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
        />
        <button
          onClick={addCustom}
          disabled={!customInput.trim()}
          aria-label="添加自定义维度"
          className="px-3 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-40 transition-opacity"
        >
          <Plus size={16} />
        </button>
      </div>

      {dims.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">已选 {dims.length} 个维度</p>
          <div className="flex flex-wrap gap-2">
            {dims.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {d.aiRecommended && <Sparkles size={10} className="text-primary" />}
                {d.name}
                <button
                  onClick={() => removeDim(d.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  aria-label={`移除维度 ${d.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {dims.length < 2 && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-3 py-2 rounded-md mb-3">
          <AlertCircle size={13} />
          建议至少选择 2 个维度，以避免"考虑不全"
        </div>
      )}

      {!aiDismissed &&
        dims.length > 0 &&
        aiCandidates.length === 0 &&
        localStorage.getItem('ai_enabled') !== 'false' && (
        <button
          onClick={handleAiClick}
          disabled={aiLoading || aiError !== ''}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-primary/40 rounded-md text-sm text-primary hover:bg-primary/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          {aiLoading ? (
            <span className="animate-pulse">✨ AI 推荐加载中...</span>
          ) : (
            <>
              <Sparkles size={14} />
              ✨ AI 推荐更多维度
            </>
          )}
        </button>
      )}

      {aiError && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md mt-2">
          <AlertCircle size={13} />
          {aiError}
        </div>
      )}

      {aiCandidates.length > 0 && (
        <div className="mt-3 bg-card border border-primary/20 rounded-md p-4">
          <p className="text-xs text-primary mb-3 flex items-center gap-1">
            <Sparkles size={12} /> AI 推荐候选维度（勾选后加入）
          </p>
          <div className="space-y-2 mb-3">
            {aiCandidates.map((c) => (
              <label key={c.name} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCandidates.has(c.name)}
                  onChange={() => {
                    const next = new Set(selectedCandidates);
                    next.has(c.name) ? next.delete(c.name) : next.add(c.name);
                    setSelectedCandidates(next);
                  }}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmCandidates}
              disabled={selectedCandidates.size === 0}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-40"
            >
              加入已选 ({selectedCandidates.size})
            </button>
            <button
              onClick={() => { setAiCandidates([]); setAiDismissed(true); }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm"
            >
              全部忽略
            </button>
          </div>
        </div>
      )}

      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
          <DialogContent className="bg-card border-border rounded-md p-5 w-full max-w-sm gap-0 shadow-xl">
            <DialogTitle className="text-base text-foreground mb-2">使用 AI 推荐前</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-4">
              使用 AI 推荐功能将把你的选项名称发送至 DeepSeek（<span className="font-mono text-xs">api.deepseek.com</span>）以生成维度建议。
              你的决策理由、时间轴内容和档案数据不会被发送。
            </DialogDescription>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAiConsented(true);
                  setShowPrivacyModal(false);
                  triggerAi();
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md text-sm"
              >
                同意并继续
              </button>
              <button
                onClick={() => { setShowPrivacyModal(false); setAiDismissed(true); }}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-md text-sm"
              >
                不同意
              </button>
            </div>
          </DialogContent>
      </Dialog>

      <Dialog open={showKeyMissingModal} onOpenChange={setShowKeyMissingModal}>
          <DialogContent className="bg-card border-border rounded-md p-5 w-full max-w-sm gap-0 shadow-xl">
            <DialogTitle className="text-base text-foreground mb-2 flex items-center gap-2">
              <SettingsIcon size={15} className="text-primary" />
              还没配置 API Key
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-4">
              AI 推荐需要你的 DeepSeek API Key。Key 仅保存在浏览器，并在请求时经本站函数瞬时转发给 DeepSeek，本站不会持久化。
              前往「设置 → AI 推荐」填入即可使用。
            </DialogDescription>
            <div className="flex gap-2">
              <button
                onClick={goToSettings}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md text-sm"
              >
                去设置
              </button>
              <button
                onClick={() => setShowKeyMissingModal(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-md text-sm"
              >
                稍后
              </button>
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Step 4: Scoring (Step4b) ────────────────────────────────────────────

export function Step4b({ decision, onChange }: { decision: Decision; onChange: (d: Partial<Decision>) => void }) {
  const dims = decision.dimensions;
  const options = decision.options;

  const updateScore = (optId: string, dimId: string, score: number) => {
    onChange({
      options: options.map((o) =>
        o.id === optId ? { ...o, scores: { ...o.scores, [dimId]: score } } : o
      ),
    });
  };

  const scoreColor = (s: number) => {
    if (s >= 8) return 'text-success';
    if (s >= 5) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div>
      <h2 className="text-foreground mb-1">每个选项打几分？</h2>
      <p className="text-sm text-muted-foreground mb-5">在每个维度下，给每个选项打 0-10 分</p>

      <div className="space-y-5">
        {dims.map((dim) => (
          <div key={dim.id} className="bg-card border border-border rounded-md p-4">
            <p className="text-sm text-foreground mb-3">{dim.name}</p>
            <div className="space-y-3">
              {options.map((opt) => {
                const score = opt.scores[dim.id] ?? 5;
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{opt.name}</span>
                      <span className={`text-xs font-mono tabular-nums ${scoreColor(score)}`}>{score} 分</span>
                    </div>
                    <input
                      type="range"
                      aria-label={`${opt.name}在${dim.name}维度的评分`}
                      aria-valuetext={`${score} 分`}
                      min={0}
                      max={10}
                      step={0.5}
                      value={score}
                      onChange={(e) => updateScore(opt.id, dim.id, Number(e.target.value))}
                      className="w-full accent-primary h-2 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>差</span>
                      <span>一般</span>
                      <span>好</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Weights ──────────────────────────────────────────────────────

export function Step4({ decision, onChange }: { decision: Decision; onChange: (d: Partial<Decision>) => void }) {
  const dims = decision.dimensions;
  const nw = normalizeWeights(dims);
  const maxNw = Math.max(...Object.values(nw));

  const updateWeight = (id: string, val: number) => {
    onChange({ dimensions: dims.map((d) => (d.id === id ? { ...d, weight: val } : d)) });
  };

  return (
    <div>
      <h2 className="text-foreground mb-1">哪个维度更重要？</h2>
      <p className="text-sm text-muted-foreground mb-2">用任意数字表达重要程度，系统自动归一化</p>

      {maxNw > 0.5 && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-3 py-2 rounded-md mb-4">
          <AlertCircle size={13} />
          「{dims.find((d) => nw[d.id] === maxNw)?.name}」权重占了约一半，确认？
        </div>
      )}

      <div className="space-y-4 mb-6">
        {dims.map((d) => (
          <div key={d.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-foreground">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono tabular-nums">{d.weight}</span>
                <span className="text-xs text-primary font-mono tabular-nums">
                  → {Math.round((nw[d.id] ?? 0) * 100)}%
                </span>
              </div>
            </div>
            <input
              type="range"
              aria-label={`${d.name}的权重`}
              aria-valuetext={`${d.weight}，归一化后 ${Math.round((nw[d.id] ?? 0) * 100)}%`}
              min={1}
              max={100}
              value={d.weight}
              onChange={(e) => updateWeight(d.id, Number(e.target.value))}
              className="w-full accent-primary h-2 cursor-pointer"
            />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-md p-4">
        <p className="text-xs text-muted-foreground mb-3">权重分布</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {dims.map((d, i) => {
            const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6'];
            return (
              <div
                key={d.id}
                className={`${colors[i % 6]} transition-all`}
                style={{ width: `${(nw[d.id] ?? 0) * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {dims.map((d, i) => {
            const colors = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-chart-6'];
            return (
              <div key={d.id} className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${colors[i % 6].replace('text-', 'bg-')}`} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-mono tabular-nums text-foreground">{Math.round((nw[d.id] ?? 0) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: Timeline ─────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
  positive: 'border-success/40 bg-success/10 text-success',
  negative: 'border-danger/40 bg-danger/10 text-danger',
  neutral: 'border-warning/40 bg-warning/10 text-warning',
};

const SENTIMENT_LABELS = { positive: '积极', negative: '风险', neutral: '中性' };

export function Step5({
  decision,
  onChange,
  onSkip,
}: {
  decision: Decision;
  onChange: (d: Partial<Decision>) => void;
  onSkip: () => void;
}) {
  const nodes = decision.timelineNodes;
  const options = decision.options;
  const [newText, setNewText] = useState('');
  const [newMonth, setNewMonth] = useState(1);
  const [newSentiment, setNewSentiment] = useState<TimelineNode['sentiment']>('neutral');
  const [newOptId, setNewOptId] = useState(options[0]?.id ?? '');
  const [playing, setPlaying] = useState(false);
  const [playMonth, setPlayMonth] = useState(0);

  const addNode = () => {
    if (!newText.trim()) return;
    const node: TimelineNode = {
      id: uid(),
      optionId: newOptId,
      month: newMonth,
      text: newText.trim(),
      sentiment: newSentiment,
    };
    // 添加节点 = 实际完成时间轴推演，自动清除"已跳过"标志
    onChange({ timelineNodes: [...nodes, node], timelineSkipped: false });
    setNewText('');
  };

  const removeNode = (id: string) => {
    onChange({ timelineNodes: nodes.filter((n) => n.id !== id) });
  };

  const span = decision.timelineSpan;
  const months = Array.from({ length: span }, (_, i) => i + 1);

  const startPlay = () => {
    setPlaying(true);
    setPlayMonth(0);
    let m = 0;
    const interval = setInterval(() => {
      m++;
      setPlayMonth(m);
      if (m >= span) {
        clearInterval(interval);
        setPlaying(false);
      }
    }, 600);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-foreground">选完之后会发生什么？</h2>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <SkipForward size={13} />
          跳过
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">预演未来，减少后悔</p>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-muted-foreground">推演跨度</span>
        <div className="flex gap-2">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => onChange({ timelineSpan: m })}
              aria-pressed={span === m}
              className={`px-3 py-1 rounded-full text-sm border transition-all ${
                span === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
              }`}
            >
              {m} 月
            </button>
          ))}
        </div>
        {nodes.length > 0 && (
          <button
            onClick={startPlay}
            disabled={playing}
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:opacity-80"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? '播放中' : '播放'}
          </button>
        )}
      </div>

      {nodes.length === 0 && (
        <div className="bg-muted/30 border border-dashed border-border rounded-md p-6 text-center mb-4">
          <p className="text-xs text-muted-foreground">
            还没有节点。添加至少 1 个节点来预演未来，可选积极 / 风险 / 中性。
          </p>
        </div>
      )}

      {options.map((opt) => {
        const optNodes = nodes
          .filter((n) => n.optionId === opt.id)
          .sort((a, b) => a.month - b.month);
        return (
          <div key={opt.id} className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">{opt.name}</p>
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-px bg-border" />
              <div className="flex gap-1 overflow-x-auto pb-2">
                {months.map((m) => {
                  const mNodes = optNodes.filter((n) => n.month === m);
                  const visible = !playing || m <= playMonth;
                  return (
                    <div key={m} className="flex flex-col items-center min-w-[3.5rem]">
                      <div className={`w-2 h-2 rounded-full border-2 border-border bg-background relative z-10 transition-colors ${
                        mNodes.length > 0 ? 'border-primary bg-primary' : ''
                      }`} />
                      <span className="text-[10px] text-muted-foreground mt-1 font-mono">T+{m}月</span>
                      {visible && mNodes.map((n) => (
                        <div
                          key={n.id}
                          className={`mt-1 px-2 py-1 rounded-md border text-[10px] max-w-[4rem] text-center relative ${SENTIMENT_COLORS[n.sentiment]}`}
                        >
                          {n.text}
                          <button
                            onClick={() => removeNode(n.id)}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-muted rounded-full flex items-center justify-center"
                            aria-label={`删除节点 ${n.text}`}
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-card border border-border rounded-md p-4 mt-4">
        <p className="text-xs text-muted-foreground mb-3">添加节点</p>
        <div className="flex gap-2 mb-2">
          <select
            aria-label="时间轴节点所属选项"
            value={newOptId}
            onChange={(e) => setNewOptId(e.target.value)}
            className="flex-1 bg-input-background border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            aria-label="时间轴节点月份"
            value={newMonth}
            onChange={(e) => setNewMonth(Number(e.target.value))}
            className="bg-input-background border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none w-20 font-mono"
          >
            {months.map((m) => (
              <option key={m} value={m}>T+{m}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mb-2">
          {(['positive', 'negative', 'neutral'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setNewSentiment(s)}
              aria-pressed={newSentiment === s}
              className={`flex-1 py-1 rounded-md text-xs border transition-all ${
                newSentiment === s ? SENTIMENT_COLORS[s] : 'border-border text-muted-foreground bg-card'
              }`}
            >
              {SENTIMENT_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            aria-label="时间轴节点描述"
            className="flex-1 bg-input-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="描述影响..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNode()}
          />
          <button
            onClick={addNode}
            disabled={!newText.trim()}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-40 text-sm"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 7: Lock ─────────────────────────────────────────────────────────

export function Step6({ decision, onChange, onLock }: {
  decision: Decision;
  onChange: (d: Partial<Decision>) => void;
  onLock: (selectedOptionId?: string) => void;
}) {
  const dims = decision.dimensions;
  const scored = [...decision.options]
    .map((opt) => ({ opt, score: calcScore(opt, dims) }))
    .sort((a, b) => b.score - a.score);

  const topOption = scored[0];
  // 选中态：若用户已选 → 用用户选的；否则默认预选综合评分最高的那个
  const selectedId = decision.selectedOptionId ?? topOption?.opt.id ?? '';
  const selectedOpt = decision.options.find((o) => o.id === selectedId);
  const lockIssue = getLockIssue(decision, selectedId);

  const select = (id: string) => onChange({ selectedOptionId: id });

  return (
    <div>
      <h2 className="text-foreground mb-1">做出你的选择</h2>
      <p className="text-sm text-muted-foreground mb-5">点选你要锁定的选项，记录理由，生成决策档案</p>

      <div className="bg-card border border-border rounded-md p-4 mb-5">
        <p className="text-xs text-muted-foreground mb-3">综合评分排名（仅供参考）</p>
        <div className="space-y-2 mb-3">
          {scored.map(({ opt, score }, rank) => {
            const isSelected = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => select(opt.id)}
                aria-pressed={isSelected}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className={`text-xs w-5 text-center font-mono shrink-0 ${rank === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {String(rank + 1).padStart(2, '0')}
                </span>
                <span className={`flex-1 text-sm ${isSelected ? 'text-foreground font-medium' : 'text-foreground'}`}>
                  {opt.name}
                </span>
                <span className={`text-sm font-mono tabular-nums shrink-0 ${rank === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {score.toFixed(2)}
                </span>
                {isSelected && (
                  <Check size={15} className="text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            你最终选择：
            <span className="text-primary ml-1 font-medium">{selectedOpt?.name ?? '（未选）'}</span>
          </p>
        </div>
      </div>

      <div className="mb-5">
        <label className="text-sm text-foreground block mb-2">
          决策理由 <span className="text-muted-foreground text-xs">（可选，建议 20 字以上）</span>
        </label>
        <textarea
          aria-label="决策理由"
          className="w-full bg-input-background border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={4}
          placeholder="为什么选这个？当时最看重什么？有什么顾虑？"
          value={decision.reason}
          onChange={(e) => onChange({ reason: e.target.value })}
        />
        {decision.reason.length > 0 && decision.reason.length < 20 && (
          <p className="text-xs text-warning mt-1">建议再写多一点，方便将来回看时理解当时的思路</p>
        )}
      </div>

      {decision.timelineSkipped && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md mb-4">
          <Info size={13} />
          时间轴推演已跳过，将标记为"未推演"
        </div>
      )}

      <button
        onClick={() => onLock(selectedId)}
        disabled={!!lockIssue}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-4 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Lock size={18} />
        锁定{selectedOpt ? `「${selectedOpt.name}」` : '决策'}，生成档案
      </button>

      {lockIssue && (
        <p className="text-xs text-warning text-center mt-2">
          {lockIssue}
        </p>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        锁定后可在档案页随时解锁继续修改
      </p>
    </div>
  );
}

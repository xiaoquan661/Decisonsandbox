// A7 AI 综合推荐卡 — F7 锁定决策步骤右栏内嵌
//
// 设计原则（PRD v2.2 § 6.7）：
// - AI 是草稿不是决策：仅给推荐 + 理由，采纳由用户主动点按钮
// - 25s 客户端超时 / 1 次重试 / 24h 会话缓存（在 llmClient.requestRecommendation 内）
// - 隐私披露首次必弹，已同意后本决策不再弹
// - 失败：按钮置灰 + inline 错误；不阻塞 F7 主流程
// - 不送时间轴：只用结构化偏好（选项+评分+权重+理由）
// - 同一决策限 1 次：返回结果后按钮变成"已采纳"或"重新分析"

import { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  Settings as SettingsIcon,
  Check,
  RefreshCw,
  ChevronRight,
  Scale,
  ShieldAlert,
  MoveRight,
} from 'lucide-react';
import { useWizard } from './WizardContext';
import { normalizeWeights } from './SandboxWizard.steps';
import { hasApiKey, MissingApiKeyError, requestRecommendation, AiRecommendation } from '../lib/llmClient';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

const CONSENT_LS = 'ai_recommendation_consent';

function consentGiven(): boolean {
  try { return localStorage.getItem(CONSENT_LS) === 'true'; } catch { return false; }
}
function setConsent(): void {
  try { localStorage.setItem(CONSENT_LS, 'true'); } catch { /* noop */ }
}

// 前置校验：评分/权重/理由 中至少 1 项非空
function canRequest(d: ReturnType<typeof useWizard>['decision']): { ok: boolean; reason: string } {
  if (d.options.length < 2) return { ok: false, reason: '至少 2 个选项' };
  if (d.dimensions.length < 1) return { ok: false, reason: '请先选择评估维度' };
  // 至少 1 个非默认（5）评分
  const hasMeaningfulScore = d.options.some((o) =>
    d.dimensions.some((dim) => {
      const s = o.scores[dim.id];
      return typeof s === 'number' && s !== 5;
    })
  );
  if (!hasMeaningfulScore && !d.reason.trim()) {
    return { ok: false, reason: '请先完成维度评分或填写决策理由' };
  }
  return { ok: true, reason: '' };
}

export function AiRecommenderCard() {
  const ctx = useWizard();
  if (!ctx) return null;
  const { decision, update } = ctx;

  // 开关关了：不显示
  if (typeof window !== 'undefined' && localStorage.getItem('ai_enabled') === 'false') {
    return null;
  }

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiRecommendation | null>(null);
  const [aiError, setAiError] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiConsented, setAiConsented] = useState(consentGiven());
  const [showKeyMissingModal, setShowKeyMissingModal] = useState(false);

  // 监听 ai-key-updated：用户在设置页改 key 后回 F7 应能立即感知
  const [, forceNav] = useState(0);
  useEffect(() => {
    const handler = () => forceNav((n) => n + 1);
    window.addEventListener('ai-key-updated', handler);
    return () => window.removeEventListener('ai-key-updated', handler);
  }, []);

  const guard = canRequest(decision);

  const handleClick = () => {
    if (aiLoading) return;
    if (!guard.ok) {
      setAiError(guard.reason);
      return;
    }
    if (!hasApiKey()) {
      setShowKeyMissingModal(true);
      return;
    }
    if (!aiConsented) {
      setShowPrivacyModal(true);
      return;
    }
    triggerAi();
  };

  const goToSettings = () => {
    setShowKeyMissingModal(false);
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'settings' } }));
  };

  const triggerAi = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const nw = normalizeWeights(decision.dimensions);
      const res = await requestRecommendation({
        category: decision.category,
        options: decision.options.map((o) => ({
          name: o.name,
          scores: Object.fromEntries(
            decision.dimensions.map((d) => [d.name, o.scores[d.id] ?? 0])
          ),
        })),
        dimensions: decision.dimensions.map((d) => ({
          name: d.name,
          weightPct: Math.round((nw[d.id] ?? 0) * 100),
        })),
        reason: decision.reason.slice(0, 600),
      });
      setAiResult(res);
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

  // 找推荐选项在用户列表里的 id（兜底拼写差异）
  const matchedOpt = aiResult
    ? decision.options.find((o) => o.name === aiResult.recommendation)
    : null;
  const isAdopted =
    !!matchedOpt && decision.selectedOptionId === matchedOpt.id;

  const adopt = () => {
    if (!matchedOpt) return;
    update({ selectedOptionId: matchedOpt.id });
  };

  const reset = () => {
    setAiResult(null);
    setAiError('');
  };

  const confidenceClass = (c: AiRecommendation['confidence']) =>
    c === '高' ? 'text-success' : c === '中' ? 'text-warning' : 'text-muted-foreground';

  return (
    <>
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={11} className="text-primary" />
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            AI 综合推荐
          </p>
          {aiResult && (
            <span className={`text-[10px] font-mono ${confidenceClass(aiResult.confidence)}`}>
              · 置信度 {aiResult.confidence}
            </span>
          )}
        </div>

        {/* 初始：触发按钮 */}
        {!aiResult && (
          <button
            onClick={handleClick}
            disabled={aiLoading || aiError !== ''}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-primary/40 rounded-md text-xs text-primary hover:bg-primary/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {aiLoading ? (
              <span className="animate-pulse">✨ AI 分析中...</span>
            ) : (
              <>
                <Sparkles size={12} />
                ✨ AI 综合推荐
              </>
            )}
          </button>
        )}

        {aiError && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md mt-1.5">
            <AlertCircle size={10} />
            {aiError}
          </div>
        )}

        {/* 结果展示 */}
        {aiResult && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mt-1 space-y-3">
            {/* 推荐选项名 */}
            <div className="flex items-center gap-2">
              <ChevronRight size={12} className="text-primary shrink-0" />
              <span className="text-sm text-primary font-medium truncate flex-1">
                {aiResult.recommendation}
              </span>
              {matchedOpt && !isAdopted && (
                <button
                  onClick={adopt}
                  className="text-[10px] py-1 px-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  采纳
                </button>
              )}
              {isAdopted && (
                <span className="flex items-center gap-0.5 text-[10px] text-success">
                  <Check size={10} /> 已采纳
                </span>
              )}
            </div>

            {!matchedOpt && (
              <p className="text-[10px] text-warning mb-2">
                AI 推荐的选项名不在当前列表中（可能你改过名字）
              </p>
            )}

            {aiResult.summary && (
              <div className="border-l-2 border-primary/50 pl-2.5">
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1">
                  核心判断
                </p>
                <p className="text-[11px] text-foreground/90 leading-relaxed">
                  {aiResult.summary}
                </p>
              </div>
            )}

            {/* 可追溯理由 */}
            {aiResult.reasons.length > 0 && (
              <div>
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1.5">
                  关键依据 / {String(aiResult.reasons.length).padStart(2, '0')}
                </p>
                <ul className="space-y-2">
                  {aiResult.reasons.map((reason, index) => (
                    <li key={`${reason.title}-${index}`} className="grid grid-cols-[18px_1fr] gap-1.5">
                      <span className="text-[9px] text-primary/70 font-mono pt-0.5">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-[11px] text-foreground font-medium mb-0.5">{reason.title}</p>
                        <p className="text-[10px] text-foreground/80 leading-relaxed">{reason.analysis}</p>
                        {reason.evidence && (
                          <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5 font-mono">
                            ↳ {reason.evidence}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.tradeoffs.length > 0 && (
              <div className="border-t border-primary/15 pt-2">
                <p className="flex items-center gap-1 text-[9px] text-warning font-mono uppercase tracking-widest mb-1.5">
                  <Scale size={10} /> 关键权衡
                </p>
                <ul className="space-y-1">
                  {aiResult.tradeoffs.map((tradeoff, index) => (
                    <li key={index} className="text-[10px] text-foreground/75 leading-relaxed flex gap-1.5">
                      <span className="text-warning/70 shrink-0">—</span>
                      <span className="flex-1">{tradeoff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.uncertainty && (
              <div className="flex gap-1.5 rounded-sm border border-dashed border-border px-2 py-1.5">
                <ShieldAlert size={10} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-0.5">不确定性</p>
                  <p className="text-[10px] text-foreground/75 leading-relaxed">{aiResult.uncertainty}</p>
                </div>
              </div>
            )}

            {aiResult.nextStep && (
              <div className="bg-primary/10 px-2 py-1.5 flex gap-1.5">
                <MoveRight size={10} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] text-primary font-mono uppercase tracking-wider mb-0.5">下一步验证</p>
                  <p className="text-[10px] text-foreground leading-relaxed">{aiResult.nextStep}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-primary/15 pt-2">
              <p className="text-[9px] text-muted-foreground">AI 分析仅作为决策草稿</p>
              <button
                onClick={reset}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <RefreshCw size={9} /> 重新分析
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 隐私弹窗 */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
          <DialogContent className="bg-card border-border rounded-md p-5 w-full max-w-sm gap-0 shadow-xl">
            <DialogTitle className="text-base text-foreground mb-2">使用 AI 综合推荐前</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-4">
              将把你的<span className="text-foreground">选项名、维度评分、权重、决策理由</span>发送至 DeepSeek（<span className="font-mono text-xs">api.deepseek.com</span>）以生成分析推荐。
              <span className="text-foreground">时间轴内容不会被发送</span>。
            </DialogDescription>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAiConsented(true);
                  setConsent();
                  setShowPrivacyModal(false);
                  triggerAi();
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md text-sm"
              >
                同意并继续
              </button>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-md text-sm"
              >
                不同意
              </button>
            </div>
          </DialogContent>
      </Dialog>

      {/* Key 缺失弹窗 */}
      <Dialog open={showKeyMissingModal} onOpenChange={setShowKeyMissingModal}>
          <DialogContent className="bg-card border-border rounded-md p-5 w-full max-w-sm gap-0 shadow-xl">
            <DialogTitle className="text-base text-foreground mb-2 flex items-center gap-2">
              <SettingsIcon size={15} className="text-primary" />
              还没配置 API Key
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-4">
              AI 综合推荐需要你的 DeepSeek API Key。Key 仅保存在浏览器，并在请求时经本站函数瞬时转发给 DeepSeek，本站不会持久化。
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
    </>
  );
}

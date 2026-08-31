import { AnimatePresence, motion } from 'motion/react';
import { useWizard } from './WizardContext';
import {
  DecisionCard,
  TitlePreview, OptionsPreview, DimensionsPreview,
  ScoringPreview, WeightsPreview, TimelinePreview, LockPreview,
} from './RightPanel.previews';
import { Button } from './ui/button';
import { AlertCircle, ArrowRight, ArrowLeft, Check, Save } from 'lucide-react';

const PREVIEW_MAP: Record<string, () => React.ReactNode> = {
  title: () => <TitlePreview />,
  options: () => <OptionsPreview />,
  dimensions: () => <DimensionsPreview />,
  scoring: () => <ScoringPreview />,
  weights: () => <WeightsPreview />,
  timeline: () => <TimelinePreview />,
  lock: () => <LockPreview />,
};

const STEP_LABELS: Record<string, string> = {
  title: '新建沙盘',
  options: '拖入选项',
  dimensions: '选择维度',
  scoring: '维度评分',
  weights: '权重配比',
  timeline: '时间轴推演',
  lock: '锁定决策',
};

export function RightPanel() {
  const ctx = useWizard();
  if (!ctx) return null;
  const step = ctx.step;
  const Preview = PREVIEW_MAP[step] ?? (() => null);

  return (
    <div className="h-full flex flex-col">
      {/* 头部：决策卡 */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-2">
          当前决策
        </p>
        <DecisionCard />
      </div>

      {/* 步骤标识 */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            {String(ctx.stepIndex + 1).padStart(2, '0')} / {String(ctx.totalSteps).padStart(2, '0')}
          </p>
          <p className="text-sm text-foreground font-medium mt-0.5">{STEP_LABELS[step]}</p>
        </div>
      </div>

      {/* 步骤内容（AnimatePresence 切换） */}
      <div className="flex-1 p-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {Preview()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部：上一步 / 下一步 / 保存 */}
      <div className="p-4 border-t border-border bg-card/40 space-y-2">
        {ctx.locked ? (
          <div className="w-full min-h-9 px-3 flex items-center justify-center text-center text-[10px] text-muted-foreground border border-dashed border-border font-mono">
            决策已锁定 · 解锁后可继续编辑
          </div>
        ) : step !== 'lock' ? (
          <Button
            onClick={ctx.goNext}
            disabled={!ctx.canGoNext}
            className="w-full h-9 text-xs"
          >
            {step === 'timeline' ? '完成推演' : '下一步'}
            <ArrowRight size={13} className="ml-1" />
          </Button>
        ) : (
          <div className="w-full min-h-9 px-3 flex items-center justify-center text-center text-[10px] text-muted-foreground border border-dashed border-border font-mono">
            在主面板选择最终选项并完成锁定
          </div>
        )}
        {!ctx.locked && <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <button
            onClick={ctx.goPrev}
            disabled={ctx.stepIndex === 0}
            className="flex items-center gap-0.5 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft size={10} /> 上一步
          </button>
          <button
            onClick={ctx.save}
            className="flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            {ctx.saveStatus === 'saved' ? (
              <Check size={10} className="text-success" />
            ) : ctx.saveStatus === 'error' ? (
              <AlertCircle size={10} className="text-danger" />
            ) : (
              <Save size={10} />
            )}
            {ctx.saveStatus === 'saved' ? '已保存' : ctx.saveStatus === 'error' ? '重试保存' : '保存'}
          </button>
        </div>}
      </div>
    </div>
  );
}

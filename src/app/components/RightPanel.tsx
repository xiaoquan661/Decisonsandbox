import { AnimatePresence, motion } from 'motion/react';
import { useWizard } from './WizardContext';
import {
  DecisionCard,
  TitlePreview, OptionsPreview, DimensionsPreview,
  ScoringPreview, WeightsPreview, TimelinePreview, LockPreview,
} from './RightPanel.previews';
import { Button } from './ui/button';
import { ArrowRight, ArrowLeft, Save } from 'lucide-react';

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
        <Button
          onClick={ctx.goNext}
          disabled={!ctx.canGoNext}
          className="w-full h-9 text-xs"
        >
          {step === 'timeline' ? '完成推演' : step === 'lock' ? '锁定决策' : '下一步'}
          <ArrowRight size={13} className="ml-1" />
        </Button>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <button
            onClick={ctx.goPrev}
            className="flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft size={10} /> 上一步
          </button>
          <button
            onClick={ctx.save}
            className="flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            <Save size={10} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

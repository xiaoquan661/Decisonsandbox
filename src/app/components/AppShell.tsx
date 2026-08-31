import { ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Brain, Check, Crosshair, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { UseWizardState } from './useWizardState';
import { WizardProvider } from './WizardContext';
import { KeyboardShortcuts } from './KeyboardShortcuts';

interface AppShellProps {
  topTitle: string;
  topMeta?: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  right: ReactNode;
  onGoSandbox: () => void;
  currentTab: 'sandbox' | 'archive' | 'settings';
  wizardState?: UseWizardState | null;
  onEscBack?: () => void;
  /** 左下角常驻导航：传了就显示。wizard 模式不传，留给 StepSidebar 占满左栏 */
  bottomNav?: ReactNode;
}

export function AppShell({
  topTitle,
  topMeta,
  sidebar,
  main,
  right,
  onGoSandbox,
  currentTab,
  wizardState,
  onEscBack,
  bottomNav,
}: AppShellProps) {
  const body = (
    <>
      {/* Top bar — 仅 logo + 当前标题（tab 导航已迁到左下角，搜索移除） */}
      <header className="h-14 shrink-0 border-b border-border bg-card/90 backdrop-blur-md flex items-center px-4 sm:px-5 gap-3 relative">
        <div className="absolute bottom-0 left-0 h-px w-28 bg-primary" />
        <button onClick={onGoSandbox} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
            <Brain size={20} strokeWidth={1.8} />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-display font-semibold tracking-[0.08em]">决策沙盘</span>
            <span className="hidden sm:inline text-[9px] text-muted-foreground font-mono tracking-widest">LAB / 01</span>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-3">
          {topMeta}
          {topTitle && (
            <div className="text-[11px] text-muted-foreground max-w-[320px] truncate font-mono tracking-wide">
              {topTitle}
            </div>
          )}
        </div>
      </header>

      {/* Three columns */}
      <div className="flex-1 flex overflow-hidden">
        <motion.aside
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="w-56 lg:w-60 shrink-0 border-r border-border bg-sidebar flex flex-col overflow-hidden relative"
        >
          <div className="absolute right-0 top-5 h-10 w-px bg-primary/70" />
          <div className="flex-1 overflow-y-auto min-h-0">
            {sidebar}
          </div>
          {bottomNav}
        </motion.aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <main
            className="flex-1 overflow-y-auto scrollbar-none instrument-grid relative focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
            tabIndex={0}
            aria-label="主要内容"
          >
            <div className="absolute inset-0 fine-noise opacity-[0.16] pointer-events-none" />
            <div className="max-w-[920px] mx-auto px-5 sm:px-8 lg:px-10 py-7 sm:py-10">
              {main}
            </div>
          </main>

          {/* 右侧预览在中等宽度隐藏时，核心流程操作仍必须可见。 */}
          {wizardState && !wizardState.locked && (
            <div className="xl:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-3 sm:px-5 py-2.5">
              <div className="max-w-[920px] mx-auto flex items-center gap-2">
                <div className="hidden md:block mr-auto min-w-28">
                  <p className="text-[9px] text-muted-foreground font-mono tracking-widest">
                    STEP {String(wizardState.stepIndex + 1).padStart(2, '0')} / {String(wizardState.totalSteps).padStart(2, '0')}
                  </p>
                  <div className="mt-1 h-0.5 bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((wizardState.stepIndex + 1) / wizardState.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={wizardState.goPrev}
                  disabled={wizardState.stepIndex === 0}
                  aria-label="上一步"
                  className="h-9 px-2 md:px-3 inline-flex items-center gap-1.5 whitespace-nowrap border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border-strong disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ArrowLeft size={13} /> <span className="hidden md:inline">上一步</span>
                </button>
                <button
                  type="button"
                  onClick={wizardState.save}
                  aria-label={wizardState.saveStatus === 'saved' ? '已保存' : wizardState.saveStatus === 'error' ? '保存失败，重试' : '保存当前决策'}
                  className="h-9 px-2 md:px-3 inline-flex items-center gap-1.5 whitespace-nowrap border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
                >
                  {wizardState.saveStatus === 'saved' ? (
                    <Check size={13} className="text-success" />
                  ) : wizardState.saveStatus === 'error' ? (
                    <AlertCircle size={13} className="text-danger" />
                  ) : (
                    <Save size={13} />
                  )}
                  <span className="hidden md:inline">
                    {wizardState.saveStatus === 'saved' ? '已保存' : wizardState.saveStatus === 'error' ? '重试保存' : '保存'}
                  </span>
                </button>
                {wizardState.step !== 'lock' ? (
                  <button
                    type="button"
                    onClick={wizardState.goNext}
                    disabled={!wizardState.canGoNext}
                    className="h-9 min-w-24 md:min-w-28 px-3 md:px-4 inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    {wizardState.step === 'timeline' ? '完成推演' : '下一步'} <ArrowRight size={13} />
                  </button>
                ) : (
                  <span className="h-9 px-3 inline-flex items-center text-[10px] text-muted-foreground border border-dashed border-border font-mono">
                    在上方完成锁定
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="hidden xl:block w-72 2xl:w-80 shrink-0 border-l border-border bg-sidebar overflow-y-auto"
        >
          {right}
        </motion.aside>
      </div>

      {/* Status bar */}
      <div className="h-7 shrink-0 border-t border-border bg-card flex items-center px-4 gap-3 text-[9px] text-muted-foreground font-mono tracking-wide">
        <span className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_8px_var(--success)]" />
        <span>LOCAL / READY</span>
        <span className="text-border-strong">/</span>
        <kbd className="bg-muted border border-border rounded px-1.5 py-px">?</kbd>
        <span>快捷键</span>
        <span className="text-border-strong">/</span>
        <kbd className="bg-muted border border-border rounded px-1.5 py-px">⌘ S</kbd>
        <span>保存</span>
        <span className="ml-auto hidden sm:flex items-center gap-1.5"><Crosshair size={10} /> MAKE IT VISIBLE</span>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {wizardState ? <WizardProvider value={wizardState}>{body}</WizardProvider> : body}
      <KeyboardShortcuts onBack={onEscBack} />
    </div>
  );
}

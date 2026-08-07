import { ReactNode } from 'react';
import { Brain, Crosshair } from 'lucide-react';
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
          <div className="relative w-8 h-8 border border-border-strong bg-background flex items-center justify-center group-hover:border-primary transition-colors">
            <Brain size={15} className="text-primary" />
            <span className="absolute -right-1 -top-1 h-2 w-2 bg-primary border-2 border-card" />
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

        <main className="flex-1 overflow-y-auto scrollbar-none instrument-grid relative">
          <div className="absolute inset-0 fine-noise opacity-[0.16] pointer-events-none" />
          <div className="max-w-[920px] mx-auto px-5 sm:px-8 lg:px-10 py-7 sm:py-10">
            {main}
          </div>
        </main>

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

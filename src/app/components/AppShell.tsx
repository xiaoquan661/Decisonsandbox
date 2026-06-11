import { ReactNode } from 'react';
import { Brain } from 'lucide-react';
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
      <header className="h-12 shrink-0 border-b border-border bg-card/60 backdrop-blur-sm flex items-center px-5 gap-3">
        <button onClick={onGoSandbox} className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
            <Brain size={15} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">决策沙盘</span>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">v1.0.0</span>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-3">
          {topMeta}
          {topTitle && (
            <div className="text-sm text-muted-foreground max-w-[320px] truncate font-mono">
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
          className="w-60 shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto min-h-0">
            {sidebar}
          </div>
          {bottomNav}
        </motion.aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[880px] mx-auto px-10 py-10">
            {main}
          </div>
        </main>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="w-80 shrink-0 border-l border-border bg-card/30 overflow-y-auto"
        >
          {right}
        </motion.aside>
      </div>

      {/* Status bar */}
      <div className="h-6 shrink-0 border-t border-border bg-card/60 flex items-center px-4 gap-4 text-[10px] text-muted-foreground font-mono">
        <span>本地存储</span>
        <span className="text-border">·</span>
        <kbd className="bg-muted border border-border rounded px-1.5 py-px">?</kbd>
        <span>快捷键</span>
        <span className="text-border">·</span>
        <kbd className="bg-muted border border-border rounded px-1.5 py-px">⌘ S</kbd>
        <span>保存</span>
        <span className="ml-auto">决策沙盘 · 把选择放上沙盘</span>
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

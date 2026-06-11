import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useDecisions } from './components/useDecisions';
import { DESIGN_PHILOSOPHY } from './lib/copy';
import { SandboxHome } from './components/SandboxHome';
import { SandboxWizard } from './components/SandboxWizard';
import { ArchivePage } from './components/ArchivePage';
import { SettingsPage } from './components/SettingsPage';
import { AppShell } from './components/AppShell';
import { StepSidebar } from './components/StepSidebar';
import { RightPanel } from './components/RightPanel';
import { PersistentLeftNav } from './components/PersistentLeftNav';
import { useWizardState } from './components/useWizardState';
import { Decision } from './components/types';

type Tab = 'sandbox' | 'archive' | 'settings';
type View = 'home' | 'wizard';

export default function App() {
  const { decisions, upsert, remove } = useDecisions();
  const [tab, setTab] = useState<Tab>('sandbox');
  const [view, setView] = useState<View>('home');
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);

  // 监听子组件发出的 navigate 事件（Step3 未配 key 时跳设置页）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: Tab }>).detail;
      if (detail?.tab) {
        setTab(detail.tab);
        setView('home');
        setActiveDecisionId(null);
      }
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  const activeDecision = activeDecisionId
    ? decisions.find((d) => d.id === activeDecisionId) ?? null
    : null;

  const openDecision = (id: string) => {
    setActiveDecisionId(id);
    setView('wizard');
    setTab('sandbox');
  };

  const startNew = () => {
    setActiveDecisionId(null);
    setView('wizard');
    setTab('sandbox');
  };

  const backToHome = () => {
    setView('home');
    setActiveDecisionId(null);
  };

  const handleSave = (d: Decision) => {
    upsert(d);
    if (!activeDecisionId) setActiveDecisionId(d.id);
  };

  const handleClearAll = () => {
    decisions.forEach((d) => remove(d.id));
  };

  return (
    <div>
      <PCLayout
        tab={tab}
        setTab={setTab}
        setView={setView}
        view={view}
        activeDecision={activeDecision}
        decisions={decisions}
        startNew={startNew}
        openDecision={openDecision}
        backToHome={backToHome}
        handleSave={handleSave}
        handleClearAll={handleClearAll}
      />
    </div>
  );
}

// ─── PC 三栏 ──────────────────────────────────────────────────────────
function PCLayout({
  tab,
  setTab,
  setView,
  view,
  activeDecision,
  decisions,
  startNew,
  openDecision,
  backToHome,
  handleSave,
  handleClearAll,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  setView: (v: View) => void;
  view: View;
  activeDecision: Decision | null;
  decisions: Decision[];
  startNew: () => void;
  openDecision: (id: string) => void;
  backToHome: () => void;
  handleSave: (d: Decision) => void;
  handleClearAll: () => void;
}) {
  const inWizard = tab === 'sandbox' && view === 'wizard';

  // 条件渲染：wizard / 非 wizard 两套 PCLayout
  if (inWizard) {
    return (
      <PCWizardLayout
        tab={tab}
        setTab={setTab}
        setView={setView}
        activeDecision={activeDecision}
        decisions={decisions}
        startNew={startNew}
        openDecision={openDecision}
        backToHome={backToHome}
        handleSave={handleSave}
        handleClearAll={handleClearAll}
      />
    );
  }
  return (
    <PCNonWizardLayout
      tab={tab}
      setTab={setTab}
      setView={setView}
      view={view}
      decisions={decisions}
      startNew={startNew}
      openDecision={openDecision}
      backToHome={backToHome}
      handleSave={handleSave}
      handleClearAll={handleClearAll}
    />
  );
}

// ─── Wizard 模式的 PC 布局（持有 wizard state） ────────────────────────
function PCWizardLayout({
  tab,
  setTab,
  setView,
  activeDecision,
  decisions,
  openDecision,
  backToHome,
  handleSave,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  setView: (v: View) => void;
  activeDecision: Decision | null;
  decisions: Decision[];
  startNew: () => void;
  openDecision: (id: string) => void;
  backToHome: () => void;
  handleSave: (d: Decision) => void;
  handleClearAll: () => void;
}) {
  const wizardState = useWizardState(activeDecision, handleSave);

  // 包装 tab 切换：离开 wizard 时一定重置 view，避免下次点沙盘 tab 又自动回 wizard
  const goArchive = () => { setTab('archive'); setView('home'); };
  const goSettings = () => { setTab('settings'); setView('home'); };
  const goSandbox = () => { setTab('sandbox'); setView('home'); };

  return (
    <AppShell
      wizardState={wizardState}
      currentTab={tab}
      onGoSandbox={goSandbox}
      topTitle={activeDecision?.title || wizardState.decision.title || '新建沙盘'}
      onEscBack={backToHome}
      bottomNav={
        <PersistentLeftNav
          currentTab={tab}
          onGoArchive={goArchive}
          onGoSettings={goSettings}
          onGoSandbox={goSandbox}
          inWizard
        />
      }
      sidebar={<StepSidebar />}
      main={
        <SandboxWizard key={activeDecision?.id ?? 'new-wizard'} onBack={backToHome} />
      }
      right={<RightPanel />}
    />
  );
}

// ─── 非 wizard 的 PC 布局（沙盘首页 / 档案 / 设置） ────────────────────
function PCNonWizardLayout({
  tab,
  setTab,
  setView,
  view,
  decisions,
  startNew,
  openDecision,
  backToHome,
  handleSave,
  handleClearAll,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  setView: (v: View) => void;
  view: View;
  decisions: Decision[];
  startNew: () => void;
  openDecision: (id: string) => void;
  backToHome: () => void;
  handleSave: (d: Decision) => void;
  handleClearAll: () => void;
}) {
  const goArchive = () => { setTab('archive'); setView('home'); };
  const goSettings = () => { setTab('settings'); setView('home'); };
  const goSandbox = () => { setTab('sandbox'); setView('home'); };

  return (
    <AppShell
      currentTab={tab}
      onGoSandbox={goSandbox}
      bottomNav={
        <PersistentLeftNav
          currentTab={tab}
          onGoArchive={goArchive}
          onGoSettings={goSettings}
          onGoSandbox={goSandbox}
          inWizard={false}
        />
      }
      sidebar={
        tab === 'sandbox' ? (
          <SandboxSidebar decisions={decisions} onNew={startNew} onOpen={openDecision} />
        ) : tab === 'archive' ? (
          <ArchiveSidebar />
        ) : (
          <SettingsSidebar />
        )
      }
      main={
        tab === 'sandbox' ? (
          <SandboxHome decisions={decisions} onNew={startNew} onOpen={openDecision} />
        ) : tab === 'archive' ? (
          <ArchivePage decisions={decisions} onOpen={openDecision} />
        ) : (
          <SettingsPage decisions={decisions} onClearAll={handleClearAll} />
        )
      }
      right={
        tab === 'archive' ? (
          <ArchiveRightPanel decisions={decisions} />
        ) : tab === 'settings' ? (
          <SettingsRightPanel />
        ) : (
          <SandboxRightPanel decisions={decisions} />
        )
      }
    />
  );
}

// ─── 占位边栏（沙盘 / 档案 / 设置） ──────────────────────────────────

function SandboxSidebar({ decisions, onNew, onOpen }: { decisions: Decision[]; onNew: () => void; onOpen: (id: string) => void }) {
  return (
    <div className="p-4 space-y-1">
      <button
        onClick={onNew}
        className="w-full text-left px-3 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/15 transition-colors flex items-center gap-2"
      >
        <Plus size={12} /> 新建沙盘
      </button>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-4 mb-1 px-2 font-mono">
        RECENT
      </p>
      {decisions.slice(0, 8).map((d) => (
        <button
          key={d.id}
          onClick={() => onOpen(d.id)}
          className="w-full text-left px-3 py-2 rounded-md text-xs text-foreground hover:bg-muted/60 transition-colors truncate"
        >
          {d.title || '未命名决策'}
        </button>
      ))}
      {decisions.length === 0 && (
        <p className="text-[11px] text-muted-foreground px-2 py-1 italic">还没有决策</p>
      )}
    </div>
  );
}

function ArchiveSidebar() {
  return (
    <div className="p-4 space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">ARCHIVE</p>
      <p className="text-xs text-muted-foreground leading-relaxed px-1">
        所有已保存的决策。<br />
        点任意一条可回看 / 解锁修改。
      </p>
    </div>
  );
}

function SettingsSidebar() {
  return (
    <div className="p-4 space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">SETTINGS</p>
      <p className="text-xs text-muted-foreground leading-relaxed px-1">
        AI 推荐 · 主题 · 字号 · 数据管理
      </p>
    </div>
  );
}

function SandboxRightPanel({ decisions }: { decisions: Decision[] }) {
  return (
    <div className="p-5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 font-mono">OVERVIEW</p>
      <div className="space-y-2">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">决策总数</p>
          <p className="font-mono text-2xl text-foreground tabular-nums mt-0.5">{decisions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">已锁定</p>
          <p className="font-mono text-2xl text-foreground tabular-nums mt-0.5">
            {decisions.filter((d) => d.status === 'locked').length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">草稿</p>
          <p className="font-mono text-2xl text-foreground tabular-nums mt-0.5">
            {decisions.filter((d) => d.status === 'draft').length}
          </p>
        </div>
      </div>
    </div>
  );
}

function ArchiveRightPanel({ decisions }: { decisions: Decision[] }) {
  const locked = decisions.filter((d) => d.status === 'locked').length;
  return (
    <div className="p-5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 font-mono">ARCHIVE</p>
      <div className="space-y-2">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">已锁定</p>
          <p className="font-mono text-2xl tabular-nums mt-0.5 text-foreground">{locked}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">草稿</p>
          <p className="font-mono text-2xl tabular-nums mt-0.5 text-foreground">
            {decisions.filter((d) => d.status === 'draft').length}
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsRightPanel() {
  return (
    <div className="p-5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 font-mono">ABOUT</p>
      <div className="space-y-2">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-[10px] text-muted-foreground">设计理念</p>
          <p className="text-xs text-foreground leading-relaxed mt-1 whitespace-pre-line">
            {DESIGN_PHILOSOPHY}
          </p>
        </div>
      </div>
    </div>
  );
}

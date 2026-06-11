// 左下角常驻导航：沙盘 / 档案 / 设置
// - 沙盘：wizard 模式下显示为"当前"状态（点击退出 wizard）
// - 档案 / 设置：始终可点跳走

import { Archive, Settings as SettingsIcon, LayoutGrid } from 'lucide-react';

interface Props {
  currentTab: 'sandbox' | 'archive' | 'settings';
  onGoArchive: () => void;
  onGoSettings: () => void;
  onGoSandbox?: () => void;
  /** wizard 模式下沙盘按钮变为"高亮 + 退出" */
  inWizard?: boolean;
}

export function PersistentLeftNav({
  currentTab,
  onGoArchive,
  onGoSettings,
  onGoSandbox,
  inWizard = false,
}: Props) {
  const sandboxActive = currentTab === 'sandbox';
  return (
    <div className="shrink-0 border-t border-border p-2 space-y-0.5">
      {/* 沙盘按钮：wizard 模式下作为"返回沙盘"快捷入口 */}
      <button
        onClick={onGoSandbox}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
          sandboxActive || inWizard
            ? 'bg-muted/60 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        }`}
      >
        <LayoutGrid size={13} />
        <span>沙盘</span>
        {inWizard && (
          <span className="ml-auto text-[9px] font-mono text-primary/80 uppercase tracking-wider">
            edit
          </span>
        )}
      </button>

      <button
        onClick={onGoArchive}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
          currentTab === 'archive'
            ? 'bg-muted/60 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        }`}
      >
        <Archive size={13} />
        <span>档案</span>
      </button>
      <button
        onClick={onGoSettings}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
          currentTab === 'settings'
            ? 'bg-muted/60 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        }`}
      >
        <SettingsIcon size={13} />
        <span>设置</span>
      </button>
    </div>
  );
}

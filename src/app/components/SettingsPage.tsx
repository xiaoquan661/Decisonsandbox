import { useState } from 'react';
import { Download, Trash2, Info, ChevronRight, Sparkles, Brain, Keyboard, ExternalLink, Check, Sun, Moon, Type } from 'lucide-react';
import { Decision } from './types';
import { LS_KEY as API_KEY_LS, SS_KEY as API_KEY_SS, hasApiKey } from '../lib/llmClient';
import { DESIGN_PHILOSOPHY } from '../lib/copy';
import { getTheme, setTheme, getFontScale, setFontScale, Theme, FontScale } from '../lib/useAppearance';

interface Props {
  decisions: Decision[];
  onClearAll: () => void;
}

export function SettingsPage({ decisions, onClearAll }: Props) {
  const [aiEnabled, setAiEnabled] = useState(() => {
    return localStorage.getItem('ai_enabled') !== 'false';
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exported, setExported] = useState(false);

  // API Key 输入（永远不回显已存 key，无明文显示）
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [rememberKey, setRememberKey] = useState(() => localStorage.getItem(API_KEY_LS) !== null);
  const keyPresent = hasApiKey();

  // 外观（主题 / 字号）—— 每次渲染读 localStorage 保证响应
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [fontScale, setFontScaleState] = useState<FontScale>(getFontScale);

  const pickTheme = (t: Theme) => {
    setThemeState(t);
    setTheme(t);
  };
  const pickFont = (s: FontScale) => {
    setFontScaleState(s);
    setFontScale(s);
  };

  const toggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    localStorage.setItem('ai_enabled', String(next));
  };

  const saveKey = () => {
    const v = apiKeyInput.trim();
    localStorage.removeItem(API_KEY_LS);
    sessionStorage.removeItem(API_KEY_SS);
    if (v) {
      if (rememberKey) localStorage.setItem(API_KEY_LS, v);
      else sessionStorage.setItem(API_KEY_SS, v);
    }
    // 关键：保存后清空 input，永不回显
    setApiKeyInput('');
    setEditingKey(false);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1500);
    // 触发自定义事件，让其他组件（如 SandboxWizard 正在跑）能立即感知
    window.dispatchEvent(new Event('ai-key-updated'));
  };

  const clearKey = () => {
    setApiKeyInput('');
    setEditingKey(false);
    localStorage.removeItem(API_KEY_LS);
    sessionStorage.removeItem(API_KEY_SS);
    window.dispatchEvent(new Event('ai-key-updated'));
  };

  const handleExport = () => {
    const data = JSON.stringify(decisions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `决策档案_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleClear = () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-10 pb-6 shrink-0">
        <h1 className="text-card-foreground">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Account */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">账号</p>
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">账号</span>
              <span className="text-xs text-muted-foreground">纯本地模式，无需登录</span>
            </div>
          </div>
        </div>

        {/* AI */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">AI 推荐</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                <div>
                  <span className="text-sm text-card-foreground block">AI 维度推荐</span>
                  <span className="text-xs text-muted-foreground">关闭后 F2 步骤不显示 AI 推荐按钮</span>
                </div>
              </div>
              <button
                onClick={toggleAi}
                className={`w-11 h-6 rounded-full transition-colors relative ${aiEnabled ? 'bg-primary' : 'bg-switch-background'}`}
              >
                <div
                  className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                    aiEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-card-foreground">DeepSeek API Key</span>
                <span className={`text-[10px] font-mono ${keyPresent ? 'text-success' : 'text-muted-foreground'}`}>
                  {keyPresent ? '● 已配置' : '○ 未配置'}
                </span>
              </div>
              {/* A 状态：已配置 + 不在编辑：只显 更换/清除 按钮，不显示 input */}
              {keyPresent && !editingKey ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingKey(true)}
                    className="flex-1 py-2 bg-card border border-border text-foreground rounded-md text-xs hover:border-primary/40 transition-colors"
                  >
                    更换 Key
                  </button>
                  <button
                    onClick={clearKey}
                    className="px-4 py-2 bg-card border border-border text-muted-foreground rounded-md text-xs hover:text-destructive hover:border-destructive/40 transition-colors"
                  >
                    清除
                  </button>
                </div>
              ) : (
                /* B 状态：未配置 或 editingKey=true：显示 password input + 保存 */
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 bg-input-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={saveKey}
                      disabled={!apiKeyInput.trim()}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-xs disabled:opacity-40"
                    >
                      {keySaved ? <Check size={14} /> : '保存'}
                    </button>
                    {editingKey && (
                      <button
                        onClick={() => { setApiKeyInput(''); setEditingKey(false); }}
                        className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-xs"
                      >
                        取消
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberKey}
                      onChange={(e) => setRememberKey(e.target.checked)}
                      className="accent-primary"
                    />
                    记住此设备（否则关闭浏览器后自动清除）
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Key 不会回显；仅在发起 AI 请求时经本站函数转发给 DeepSeek。
                  </p>
                </>
              )}
              <div className="flex items-center text-[10px] text-muted-foreground mt-2">
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <ExternalLink size={10} /> 申请 Key
                </a>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            默认仅在当前浏览器会话保存；本站函数不会持久化或记录 Key。你可以随时清除。
          </p>
        </div>

        {/* 外观 */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">外观</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* 主题颜色 */}
            <div className="px-4 py-3.5 border-b border-border">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={15} className="text-primary" /> : <Sun size={15} className="text-primary" />}
                  <span className="text-sm text-card-foreground">主题颜色</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {theme === 'dark' ? '深色' : '浅色'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => pickTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs border transition-colors ${
                    theme === 'dark'
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <Moon size={12} /> 深色
                </button>
                <button
                  onClick={() => pickTheme('light')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs border transition-colors ${
                    theme === 'light'
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <Sun size={12} /> 浅色
                </button>
              </div>
            </div>
            {/* 字号 */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Type size={15} className="text-primary" />
                  <span className="text-sm text-card-foreground">整体字号</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {fontScale === 'large' ? '大' : '标准'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => pickFont('standard')}
                  className={`py-2 rounded-md text-xs border transition-colors ${
                    fontScale === 'standard'
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  标准
                </button>
                <button
                  onClick={() => pickFont('large')}
                  className={`py-2 rounded-md text-xs border transition-colors ${
                    fontScale === 'large'
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  大
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">数据管理</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Download size={15} className="text-accent" />
                <span className="text-sm text-card-foreground">
                  {exported ? '✓ 已导出' : `导出所有决策档案`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{decisions.length} 条 · JSON</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-destructive" />
                <span className="text-sm text-destructive">清除本地所有数据</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">关于</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <span className="text-sm text-card-foreground">版本</span>
              <span className="text-xs text-muted-foreground">v1.0.0-beta</span>
            </div>
            <button
              onClick={() => setShowShortcuts(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Keyboard size={15} className="text-accent" />
                <span className="text-sm text-card-foreground">快捷键帮助</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-accent" />
                <span className="text-sm text-card-foreground">认知原理说明</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-muted-foreground" />
                <span className="text-sm text-card-foreground">反馈问题</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Cognitive principles info */}
        <div className="bg-secondary border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Brain size={12} /> 设计理念
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {DESIGN_PHILOSOPHY}
          </p>
        </div>
      </div>

      {/* Shortcuts help modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">KEYBOARD</p>
                <h3 className="text-card-foreground mt-0.5">快捷键帮助</h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-0.5">
              {[
                { keys: ['⌘ / Ctrl', 'S'], desc: '保存当前决策' },
                { keys: ['1'], desc: '跳到步骤 1 · 新建沙盘' },
                { keys: ['2'], desc: '跳到步骤 2 · 拖入选项' },
                { keys: ['3'], desc: '跳到步骤 3 · 选择维度' },
                { keys: ['4'], desc: '跳到步骤 4 · 维度评分' },
                { keys: ['5'], desc: '跳到步骤 5 · 权重配比' },
                { keys: ['6'], desc: '跳到步骤 6 · 时间轴推演' },
                { keys: ['7'], desc: '跳到步骤 7 · 锁定决策' },
                { keys: ['↵'], desc: '进入下一步（当前步骤可继续时）' },
                { keys: ['Esc'], desc: '退出当前流程' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded text-xs">
                  <div className="flex items-center gap-1 shrink-0 w-28">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground min-w-[20px] text-center"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="text-muted-foreground">{s.desc}</span>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
              <span>快捷键仅在左侧步骤导航为当前焦点时生效</span>
              <span className="font-mono">v1.0.0-beta</span>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-card-foreground mb-2">确认清除所有数据？</h3>
            <p className="text-sm text-muted-foreground mb-5">
              这将删除本地所有决策档案，操作不可恢复。建议先导出备份。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm"
              >
                确认清除
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

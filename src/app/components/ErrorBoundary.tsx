// 临时 ErrorBoundary：把运行时错误显示在页面上，方便诊断白屏
// 修好后会保留作为生产可用组件

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          color: '#E4E4E7',
          background: '#0A0A0B',
          minHeight: '100vh',
        }}>
          <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            RUNTIME ERROR
          </p>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ fontSize: 11, color: '#71717A', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: 16, padding: '8px 14px', background: '#6366F1', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}
          >
            刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

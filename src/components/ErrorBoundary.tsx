/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Terminal, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // Clear potentially corrupt local storage keys, then reload
    try {
      localStorage.removeItem('synapse_collapsed_sections');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-ink font-sans flex items-center justify-center p-4 md:p-8 relative overflow-hidden selection:bg-accent/20">
          {/* Neon background decorations */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-surface-subtle),transparent)] pointer-events-none opacity-40" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-alert/5 blur-3xl pointer-events-none" />

          <div className="relative max-w-2xl w-full soothing-card bg-surface/90 border border-border/80 rounded-3xl p-6 md:p-12 shadow-2xl flex flex-col items-center text-center">
            
            {/* Pulsing visual alert badge */}
            <div className="w-16 h-16 bg-alert/15 border border-alert/25 text-alert rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-alert/10 relative">
              <span className="absolute inset-0 rounded-2xl bg-alert/20 animate-ping opacity-75" />
              <ShieldAlert className="w-8 h-8 relative z-10" />
            </div>

            <h1 className="font-display font-black text-2xl md:text-3xl uppercase tracking-tighter text-ink mb-3 text-balance">
              SYSTEM DEREGULATION
            </h1>
            
            <p className="text-[10px] font-black text-alert uppercase tracking-[0.2em] mb-4">
              Neural OS Exception Caught
            </p>

            <p className="text-sm text-muted mb-8 max-w-md leading-relaxed text-balance">
              Synapse has intercepted a thread crash to protect data integrity. Critical databases remain safe. You can view the telemetry below or refresh the core engine.
            </p>

            {/* Diagnostic Command Strip Terminal */}
            <div className="w-full bg-black/60 border border-border/50 rounded-2xl p-4 md:p-5 text-left font-mono text-[11px] leading-relaxed text-muted mb-8 overflow-hidden select-text relative">
              <div className="flex items-center gap-2 border-b border-border/30 pb-2 mb-3">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">TELEMETRY DIAGNOSTICS</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-2 scrollbar-custom text-muted/90 pr-1 break-words">
                <p className="text-alert font-bold">ERROR: {this.state.error?.toString() || 'Unknown runtime anomaly.'}</p>
                {this.state.errorInfo && (
                  <pre className="text-[9px] leading-snug text-muted/65 whitespace-pre-wrap font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
              <button
                onClick={this.handleReset}
                className="precise-button !bg-accent !text-bg !px-8 hover:!bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin-reverse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Force Reboot OS</span>
              </button>
              <button
                onClick={() => window.location.replace('/')}
                className="precise-button !bg-surface-subtle/50 !text-muted hover:!text-ink hover:!border-dark-border !px-8 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

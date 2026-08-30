import { Camera, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { JournalMigrator } from './Manual/JournalMigrator';

interface SettingsProps {
  user: any;
  onLogin: () => void;
  onSystemReset: () => void;
  onTradeReset: () => void;
  onUpdateTradeEpoch: (timestamp: number) => void;
  onOpenApiCheck: () => void;
  onRecalculateFinancials?: () => void;
  isSyncingFinancials?: boolean;
  isSyncingTrades?: boolean;
  
  // Database audit props
  tasksCount?: number;
  transactionsCount?: number;
  budgetsCount?: number;
  notesCount?: number;
  loansCount?: number;
  openPositionsCount?: number;
}

export default function Settings({
  user,
  onLogin,
  onSystemReset,
  onTradeReset,
  onUpdateTradeEpoch,
  onOpenApiCheck,
  onRecalculateFinancials,
  isSyncingFinancials,
  isSyncingTrades,
  tasksCount = 0,
  transactionsCount = 0,
  budgetsCount = 0,
  notesCount = 0,
  loansCount = 0,
  openPositionsCount = 0,
}: SettingsProps) {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-12">
      <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">

        <section className="soothing-card p-6 md:p-8 relative overflow-hidden group" aria-labelledby="settings-profile-title">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 id="settings-profile-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Profile</h2>
              <p className="micro-label">Account and sync status</p>
            </div>
            {!user ? (
              <button 
                onClick={onLogin}
                className="precise-button px-6 py-2 text-xs"
              >
                Sign In With Google
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-xs font-black text-success uppercase tracking-widest">Connected</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 mb-4 sm:mb-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-2xl border border-border bg-surface-subtle">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user?.displayName || "User profile"} 
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
              </div>
              {user && (
                <button 
                  className="absolute bottom-[-8px] right-[-8px] bg-accent p-2.5 rounded-full shadow-lg text-white border border-white/10 hover:scale-110 transition-transform active:scale-95"
                  aria-label="Change profile photo"
                >
                  <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="space-y-4 flex-1 w-full text-center sm:text-left">
              <div className="space-y-1">
                <p className="micro-label">Name</p>
                <p className="text-lg md:text-xl font-mono font-black border-b border-border pb-1 text-ink uppercase tracking-tighter">
                  {user?.displayName || 'LOCAL_GUEST_USER'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="micro-label">Email</p>
                <p className="text-sm md:text-base font-mono font-bold border-b border-border pb-1 text-muted/60 lowercase">
                  {user?.email || 'unlinked_local_account'}
                </p>
              </div>
            </div>
          </div>

          {!user && (
            <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-accent mt-0.5" />
              <p className="text-xs font-bold text-muted uppercase tracking-wide leading-relaxed">
                Cloud persistence is currently disabled. Your data is stored locally on this device. <span className="text-accent cursor-pointer hover:underline" onClick={onLogin}>Sign in with Google</span> to sync across devices.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-alert/5 border border-alert/20 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-alert mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-alert uppercase tracking-widest">Security Protocol</p>
              <p className="text-xs font-bold text-muted uppercase tracking-wide leading-relaxed">
                When using Binance API, ensure <span className="text-alert">"Enable Withdrawals"</span> is <span className="text-alert underline underline-offset-4">UNCHECKED</span> in your Binance settings. Your secrets are stored in a private vault, but this extra layer ensures your funds remain on the exchange.
              </p>
            </div>
          </div>
        </section>

        {user && <JournalMigrator />}

        <section className="soothing-card p-6 md:p-8 hover:border-accent/40 relative overflow-hidden group" aria-labelledby="settings-api-title">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="settings-api-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">API Check</h2>
                  <p className="micro-label">Verify external data access</p>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenApiCheck}
              className="precise-button w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4"
            >
              Open API Check
            </button>
          </div>
        </section>

        {/* Tracking History Optimization */}
        <section className="soothing-card p-6 md:p-8 hover:border-teal-500/40 relative overflow-hidden group" aria-labelledby="settings-optimization-title">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <ShieldCheck className="w-32 h-32 rotate-12 text-teal-500" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-500 border border-teal-500/20">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="settings-optimization-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Optimization: Tracking History</h2>
                  <p className="micro-label !text-teal-500/80">Control how much history to sync for maximum speed</p>
                </div>
              </div>
              <p className="text-xs font-bold text-muted uppercase tracking-wide leading-relaxed max-w-md">
                Ignoring old trades significantly increases sync speed. Choose a starting point that covers your active positions.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center md:justify-end">
              <button 
                onClick={() => onUpdateTradeEpoch(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                className="precise-button !px-4 !py-2 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 text-xs"
              >
                Last 30 Days
              </button>
              <button 
                onClick={() => onUpdateTradeEpoch(Date.now() - 90 * 24 * 60 * 60 * 1000)}
                className="precise-button !px-4 !py-2 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 text-xs"
              >
                Last 90 Days
              </button>
              <button 
                onClick={() => onUpdateTradeEpoch(0)}
                className="precise-button !px-4 !py-2 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 text-xs"
              >
                All Time
              </button>
            </div>
          </div>
        </section>

        {/* Tracking Epoch */}
        <section className="soothing-card p-6 md:p-8 hover:border-teal-500/40 relative overflow-hidden group" aria-labelledby="settings-trade-reset-title">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <ShieldCheck className="w-32 h-32 rotate-12 text-teal-500" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-500 border border-teal-500/20">
                  <Camera className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="settings-trade-reset-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Trade Tracker Reset</h2>
                  <p className="micro-label !text-teal-500/80">Start the tracker from the current moment</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                if (window.confirm("This will establish the current moment as the new starting point for Trade Tracker. All past trade history will be permanently deleted from cloud storage.\n\nClick OK to Reset History, or Cancel to Keep History.")) {
                  onTradeReset();
                }
              }}
              disabled={isSyncingTrades}
              className="precise-button w-full sm:w-auto border-teal-500/30 text-teal-600 hover:bg-teal-500/10 transition-all px-6 sm:px-10 py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncingTrades ? 'Syncing…' : 'Reset Trade Tracker'}
            </button>
          </div>
        </section>
        
        {/* Financial Data Integrity */}
        {user && onRecalculateFinancials && (
          <section className="soothing-card p-6 md:p-8 hover:border-accent/40 relative overflow-hidden group" aria-labelledby="settings-sync-title">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
              <ShieldCheck className="w-32 h-32 rotate-12 text-accent" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="settings-sync-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Financial Sync</h2>
                    <p className="micro-label">Recalculate all-time savings from scratch</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-muted uppercase tracking-wide leading-relaxed max-w-md">
                  If you notice discrepancies in your all-time balance, this will perform a deep scan of every transaction in your ledger to ensure the total is 100% accurate.
                </p>
              </div>
              
              <button 
                onClick={onRecalculateFinancials}
                disabled={isSyncingFinancials}
                className="precise-button w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 disabled:opacity-50 disabled:cursor-wait"
              >
                {isSyncingFinancials ? 'Syncing…' : 'Re-sync Totals'}
              </button>
            </div>
          </section>
        )}

        {/* Database Fetch Audit Section */}
        <section className="soothing-card p-6 md:p-8 hover:border-accent/40 relative overflow-hidden group" aria-labelledby="settings-audit-title">
          <div className="flex flex-col gap-6">
            <div>
              <h2 id="settings-audit-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Database Fetch Audit</h2>
              <p className="micro-label">Startup network synchronization payload</p>
            </div>
            
            <p className="text-xs font-bold text-muted uppercase tracking-wide leading-relaxed max-w-xl">
              When you load Synapse, Firestore establishes real-time tunnels to download active document states. Below is the exact transaction read audit required to synchronize this session:
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
              {[
                { label: 'Tasks Register', count: tasksCount, suffix: 'reads' },
                { label: 'Transactions', count: transactionsCount, suffix: 'reads' },
                { label: 'Budgets & Rules', count: budgetsCount, suffix: 'reads' },
                { label: 'Notes Storage', count: notesCount, suffix: 'reads' },
                { label: 'Outstanding Loans', count: loansCount, suffix: 'reads' },
                { label: 'Open Exposures', count: openPositionsCount, suffix: 'reads' },
                { label: 'Core Vitals Doc', count: 3, suffix: 'reads' },
              ].map((item, idx) => (
                <div key={idx} className="border border-border/40 p-3 rounded-xl bg-surface-subtle/20">
                  <span className="text-xs font-black text-muted/65 uppercase tracking-wider block mb-1">{item.label}</span>
                  <span className="font-mono text-sm font-black text-ink">{item.count} {item.suffix}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border/30 pt-4 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-black text-muted/40 uppercase tracking-widest block mb-1">TOTAL INITIALIZATION VALUE</span>
                <span className="text-2xl font-mono font-black text-accent">
                  {tasksCount + transactionsCount + budgetsCount + notesCount + loansCount + openPositionsCount + 3} Reads
                </span>
              </div>
              
              <div className="text-right">
                <span className="text-xs font-black text-muted/40 uppercase tracking-widest block mb-1">Tunnel Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-success/10 text-success">
                  10 Active Tunnels
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/15 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping mt-1.5 shrink-0" />
              <p className="text-xs font-semibold text-muted uppercase tracking-wide leading-relaxed">
                <strong>Real-Time Optimization Active:</strong> After the initial payload, Firestore caches documents locally. Subsequent queries and live updates incur <strong>0 reads</strong> unless a document has been modified!
              </p>
            </div>
          </div>
        </section>

        {/* Dangerous Zone */}
        <section className="soothing-card p-6 md:p-8 hover:border-alert/40 relative overflow-hidden group" aria-labelledby="settings-system-reset-title">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <Lock className="w-32 h-32 rotate-12" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <div className="w-10 h-10 bg-alert/10 rounded-full flex items-center justify-center text-alert border border-alert/20">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="settings-system-reset-title" className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">System Reset</h2>
                  <p className="micro-label !text-alert opacity-60">Clear all app data and settings</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (window.confirm("CRITICAL WARNING: You are about to permanently purge all tasks, financial ledgers, biological logs, loans, and system configurations. This action cannot be reversed.\n\nClick OK to Purge System, or Cancel to Abort.")) {
                  onSystemReset();
                }
              }}
              className="precise-button w-full sm:w-auto !bg-alert/10 !text-alert !border-alert/20 hover:!bg-alert hover:!text-white transition-all px-6 sm:px-10 py-3 sm:py-4 shadow-xl shadow-alert/10"
            >
              System Reset
            </button>
          </div>
        </section>
      </div>

    </div>
  );
}


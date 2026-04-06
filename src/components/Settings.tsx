import { Camera, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { JournalMigrator } from './Manual/JournalMigrator';

interface SettingsProps {
  user: any;
  onLogin: () => void;
  onSystemReset: () => void;
  onOpenApiCheck: () => void;
}

export default function Settings({
  user,
  onLogin,
  onSystemReset,
  onOpenApiCheck,
}: SettingsProps) {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">

        <section className="soothing-card p-6 md:p-8 relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Identity Profile</h2>
              <p className="micro-label">System Metadata & Global Reach</p>
            </div>
            {!user ? (
              <button 
                onClick={onLogin}
                className="precise-button px-6 py-2 text-[10px]"
              >
                Sign In With Google
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-success uppercase tracking-widest">Active Sync</span>
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
                <label className="micro-label">System Operator</label>
                <p className="text-lg md:text-xl font-mono font-black border-b border-border pb-1 text-ink uppercase tracking-tighter">
                  {user?.displayName || 'LOCAL_GUEST_USER'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="micro-label">Credential Endpoint</label>
                <p className="text-sm md:text-base font-mono font-bold border-b border-border pb-1 text-muted/60 lowercase">
                  {user?.email || 'unlinked_local_account'}
                </p>
              </div>
            </div>
          </div>

          {!user && (
            <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-accent mt-0.5" />
              <p className="text-[10px] font-bold text-muted uppercase tracking-wide leading-relaxed">
                Cloud persistence is currently disabled. All metrics are stored in local buffers. <span className="text-accent cursor-pointer hover:underline" onClick={onLogin}>Establish Google Sync Protocol</span> to ensure data integrity across devices.
              </p>
            </div>
          )}
        </section>

        {user && <JournalMigrator />}

        <section className="soothing-card p-6 md:p-8 border-l-4 border-accent relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">API Checker</h2>
                  <p className="micro-label">External Data Stream Validation</p>
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

        {/* Dangerous Zone */}
        <section className="soothing-card p-6 md:p-8 border-l-4 border-alert relative overflow-hidden group">
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
                  <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Override Protocol</h2>
                  <p className="micro-label !text-alert opacity-60">Critical System Maintenance</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (window.confirm("CRITICAL WARNING: This will permanently purge all mission data, financial ledgers, and system configurations. Are you sure you want to proceed?")) {
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


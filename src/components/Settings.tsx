import { Camera, ShieldCheck, Lock, KeyRound } from 'lucide-react';

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
  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
        <section className="soothing-card p-6 md:p-10 border-l-4 border-accent">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-display font-black text-ink uppercase tracking-tight">Authentication Required</h2>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide leading-relaxed max-w-lg">
              Sign in with Google to unlock synced settings, identity profile, and persistent system preferences.
            </p>
            <button
              onClick={onLogin}
              className="precise-button px-8 py-3 text-[10px]"
            >
              Sign In With Google
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">

        <section className="soothing-card p-6 md:p-8 relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Identity Profile</h2>
              <p className="micro-label">System Metadata & Global Reach</p>
            </div>
            <button className="precise-button px-6 py-2 text-[10px]" aria-label="Calibrate identity profile">
              Calibrate Identity
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 mb-4 sm:mb-10">
            <div className="relative">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/julian/200/200"} 
                alt={user?.displayName || "User profile"} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-[var(--radius)] object-cover shadow-md border border-border"
                referrerPolicy="no-referrer"
              />
              <button 
                className="absolute bottom-[-10px] right-[-10px] bg-accent p-3 rounded-full shadow-sm text-white border border-transparent hover:scale-110 transition-transform"
                aria-label="Change profile photo"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 flex-1 w-full text-center sm:text-left">
              <div className="space-y-1">
                <label className="micro-label">Identifier</label>
                <p className="text-lg font-mono font-bold border-b border-border pb-1 text-ink uppercase tracking-tighter">
                  {user?.displayName || 'GUEST_UNIDENTIFIED'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="micro-label">Contact Point</label>
                <p className="text-base font-mono font-bold border-b border-border pb-1 text-muted lowercase">
                  {user?.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="soothing-card p-6 md:p-8 border-l-4 border-accent relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">API Checker</h2>
                  <p className="micro-label">Open only when you need credential validation</p>
                </div>
              </div>
              <p className="text-[11px] font-bold text-muted uppercase tracking-wide leading-relaxed max-w-lg">
                Run API key and secret validation from here without keeping API Check in the main navigation.
              </p>
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
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
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
              <p className="text-[11px] font-bold text-muted uppercase tracking-wide leading-relaxed max-w-md">
                Purge all transactional buffers, task directives, and structural benchmarks. This action is irreversible and requires primary authorization.
              </p>
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


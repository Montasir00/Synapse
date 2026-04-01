import { useState } from 'react';
import { Camera, Sun, Moon, ChevronDown, ShieldCheck, User, Database, ExternalLink, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  user: any;
  googleConnected?: boolean;
  onLogin: () => void;
}

export default function Settings({ user, googleConnected, onLogin }: SettingsProps) {
  const [deepWork, setDeepWork] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="pt-10 lg:pt-12 pb-28 lg:pb-16 px-4 md:px-10 w-full max-w-[1600px] mx-auto">
      <div className="grid grid-cols-12 gap-6 lg:gap-10">

        <section className="col-span-12 lg:col-span-7 glass-card p-6 md:p-8 transition-all hover:bg-white/5 relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-black text-ink uppercase tracking-tight">Identity Profile</h2>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">System Metadata & Global Reach</p>
            </div>
            <button className="precise-button px-6 py-2 text-[10px]">
              Calibrate Identity
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 mb-4 sm:mb-10">
            <div className="relative">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/julian/200/200"} 
                alt={user?.displayName || "User profile"} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-[-10px] right-[-10px] bg-accent p-3 rounded-full shadow-md text-white border border-white/20">
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <div className="space-y-4 flex-1 w-full text-center sm:text-left">
              <div className="space-y-1">
                <label className="micro-label opacity-40">Identifier</label>
                <p className="text-lg font-mono font-bold border-b border-white/5 pb-1 text-ink uppercase tracking-tighter">
                  {user?.displayName || 'GUEST_UNIDENTIFIED'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="micro-label opacity-40">Contact Point</label>
                <p className="text-base font-mono font-bold border-b border-white/5 pb-1 text-muted/60 lowercase">
                  {user?.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-12 glass-card p-10 flex flex-col lg:flex-row items-center justify-between gap-10 border-l-4 border-accent shadow-xl shadow-accent/5">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-display font-black text-ink uppercase tracking-tight">Focus Logic</h2>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">Systemic Cognitive Management</p>
              </div>
            </div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide opacity-40 leading-relaxed max-w-md">
              Define biometric communication window for peak throughput and operational flow status.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
            <div className="flex items-center justify-between p-5 bg-black/20 rounded-full border border-white/5 min-w-[200px]">
              <span className="text-[10px] font-black text-ink uppercase tracking-widest">Deep Work State</span>
              <div 
                onClick={() => setDeepWork(!deepWork)}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${deepWork ? 'bg-accent' : 'bg-white/10'}`}
              >
                <motion.div 
                   animate={{ x: deepWork ? 28 : 4 }}
                   className="absolute top-1 w-4 h-4 bg-white rounded-full" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-black/20 rounded-full border border-white/5 min-w-[200px]">
              <span className="text-[10px] font-black text-ink uppercase tracking-widest">Cognitive Alerts</span>
              <div 
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${notifications ? 'bg-accent' : 'bg-white/10'}`}
              >
                <motion.div 
                   animate={{ x: notifications ? 28 : 4 }}
                   className="absolute top-1 w-4 h-4 bg-white rounded-full" 
                />
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 glass-card p-10">
          <div className="mb-10">
            <h2 className="text-3xl font-display font-black mb-2 text-ink uppercase tracking-tight">System Parameters</h2>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">Structural Aesthetics & Logic Behavior.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h3 className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">Environment</h3>
              <div className="flex flex-col gap-4">
                <button 
                  className={`flex items-center justify-between w-full p-4 rounded-full border transition-all border-accent/20 bg-accent/5 text-accent`}
                >
                  <span className="flex items-center gap-3 font-black text-xs uppercase tracking-widest"><Moon className="w-4 h-4" /> Dark State</span>
                  <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </button>
                <p className="text-[8px] text-muted font-bold uppercase tracking-[0.2em] text-center opacity-30">Vibrant Noir enforced for cognitive sanctuary.</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">Typography</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                  <label className="block text-[8px] font-black text-muted mb-3 uppercase tracking-widest opacity-40">Geometric Stack</label>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display font-black text-lg text-ink uppercase tracking-tight">Vibrant Sans</span>
                    <span className="text-[9px] font-bold text-success uppercase tracking-widest">Active</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-accent" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">Regional</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="micro-label opacity-40">Temporal Zone</label>
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-full cursor-pointer hover:bg-white/5 transition-all border border-white/5">
                    <span className="text-[10px] font-bold text-ink uppercase tracking-widest">UTC/PHT</span>
                    <ChevronDown className="w-4 h-4 text-muted/30" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="micro-label opacity-40">Dialect</label>
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-full cursor-pointer hover:bg-white/5 transition-all border border-white/5">
                    <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Technic_Eng</span>
                    <ChevronDown className="w-4 h-4 text-muted/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 bg-accent text-white rounded-[42px] p-10 flex flex-col justify-between shadow-2xl shadow-accent/20">
          <ShieldCheck className="w-12 h-12 opacity-40" />
          <div>
            <h3 className="text-4xl font-mono font-black mb-2">1,024</h3>
            <p className="text-[10px] opacity-60 uppercase tracking-[0.2em] font-black">Protocols Purged</p>
          </div>
          <div className="mt-8">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-50 leading-relaxed">Throughput exceeds global baseline by 42%. Efficiency optimal.</p>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-8 glass-card p-8 flex items-center justify-between group cursor-pointer">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-accent shadow-sm group-hover:bg-white/10 transition-all border border-white/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Security Protocol</h3>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">MFA / Auth_State / Session_Audit</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted/30 -rotate-90 group-hover:translate-x-2 transition-transform" />
        </section>
      </div>

      <footer className="mt-20 flex justify-between items-center text-muted/40 text-[9px] uppercase tracking-[0.4em] font-black">
        <span>TASKOS_V4.4.2_PRODUCTION_BUILD</span>
        <span className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          {user ? 'CLOUD_SYNC_ACTIVE' : 'LOCAL_VOLATILE_STATE'}
        </span>
      </footer>
    </div>
  );
}


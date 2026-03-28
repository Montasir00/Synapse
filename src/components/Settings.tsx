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
    <div className="mt-16 md:mt-20 p-4 md:p-12 max-w-6xl mx-auto w-full">
      <div className="mb-10 md:mb-16">
        <h1 className="serif-text text-3xl md:text-5xl font-bold text-on-surface mb-2">Curate Your Sanctuary</h1>
        <p className="text-on-surface-variant text-sm md:text-base tracking-wide font-medium opacity-70">Tailor your digital environment for maximum cognitive clarity.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-8">
        <section className="col-span-12 glass-card rounded-3xl p-8 mb-4 border-l-4 border-accent shadow-lg shadow-accent/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-white/10 ${googleConnected ? 'bg-success/10 text-success' : 'bg-white/5 text-on-surface-variant'}`}>
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h3 className="serif-text text-2xl font-semibold text-on-surface flex items-center gap-2">
                  Google Calendar
                  {googleConnected ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-on-surface-variant opacity-30" />
                  )}
                </h3>
                <p className="text-sm text-on-surface-variant opacity-70">
                  {googleConnected 
                    ? 'Calendar events are syncing.' 
                    : 'Connect Google to sync Calendar.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {!googleConnected ? (
                <a 
                  href="/api/auth/google" 
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-accent text-black rounded-full text-sm font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-all"
                >
                  Connect Google
                </a>
              ) : (
                <div className="px-6 py-2.5 bg-success/10 border border-success/20 rounded-full text-sm font-bold text-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Firebase Status Section */}
        <section className="col-span-12 glass-card rounded-3xl p-8 mb-4 border-l-4 border-primary shadow-lg shadow-primary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-white/10 ${user ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h3 className="serif-text text-2xl font-semibold text-on-surface flex items-center gap-2">
                  Firebase Backend
                  {user ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-error" />
                  )}
                </h3>
                <p className="text-sm text-on-surface-variant opacity-70">
                  {user 
                    ? `Authenticated as ${user.email}` 
                    : 'Authentication required for cloud sync.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <div className="px-6 py-2.5 bg-success/10 border border-success/20 rounded-full text-sm font-bold text-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  System Online
                </div>
              ) : (
                <button 
                  onClick={onLogin}
                  className="px-6 py-2.5 bg-primary text-black rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-7 glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all hover:bg-white/5 relative overflow-hidden group shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="serif-text text-xl md:text-2xl font-semibold mb-1 text-on-surface">Personal Profile</h2>
              <p className="text-xs md:text-sm text-on-surface-variant opacity-60">Identity & Global Presence</p>
            </div>
            <button className="w-full sm:w-auto bg-primary text-black px-6 py-2 rounded-full font-bold text-sm transition-transform hover:scale-[1.02] shadow-lg shadow-primary/20">
              Edit Profile
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 mb-4 sm:mb-10">
            <div className="relative">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/julian/200/200"} 
                alt={user?.displayName || "User profile"} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-2xl border-2 border-[var(--glass-border)]"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-0 right-0 bg-primary p-2 rounded-full shadow-md text-black">
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <div className="space-y-4 flex-1 w-full text-center sm:text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-50">Full Name</label>
                <p className="text-base md:text-lg font-semibold border-b border-white/10 pb-1 text-on-surface">
                  {user?.displayName || 'Guest User'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-50">Email Address</label>
                <p className="text-base md:text-lg font-semibold border-b border-white/10 pb-1 text-on-surface">
                  {user?.email || 'Not signed in'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 glass-card rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <User className="text-primary w-6 h-6" />
              <h2 className="serif-text text-2xl font-semibold text-on-surface">Focus Protocol</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed opacity-70">
              Define how TaskFlow communicates with you during peak productivity windows.
            </p>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-semibold text-on-surface">Deep Work Mode</span>
                <div 
                  onClick={() => setDeepWork(!deepWork)}
                  className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${deepWork ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <motion.div 
                    animate={{ x: deepWork ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-semibold text-on-surface">Smart Notifications</span>
                <div 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${notifications ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <motion.div 
                    animate={{ x: notifications ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-on-surface-variant italic opacity-60">Next deep work session scheduled for 9:00 AM Tomorrow.</p>
          </div>
        </section>

        <section className="col-span-12 glass-card rounded-3xl p-10 shadow-sm">
          <div className="mb-10">
            <h2 className="serif-text text-3xl font-semibold mb-2 text-on-surface">System Preferences</h2>
            <p className="text-on-surface-variant opacity-60">Global aesthetics and structural behavior.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Appearance</h3>
              <div className="flex flex-col gap-4">
                <button 
                  className={`flex items-center justify-between w-full p-4 rounded-xl border transition-all border-primary bg-primary/5 text-primary`}
                >
                  <span className="flex items-center gap-3 font-bold"><Moon className="w-4 h-4" /> Dark Mode</span>
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  </div>
                </button>
                <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-widest text-center">Darkish mode enforced for sanctuary clarity.</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Typography</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block text-xs font-bold text-on-surface-variant mb-3 opacity-50">Main Font Pairing</label>
                  <div className="flex items-center justify-between mb-4">
                    <span className="serif-text text-lg text-on-surface">Editorial Serif</span>
                    <span className="text-xs text-on-surface-variant">Active</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Regional</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant opacity-50">Timezone</label>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-white/10">
                    <span className="text-sm font-semibold text-on-surface">London, GMT+0</span>
                    <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant opacity-50">Language</label>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-white/10">
                    <span className="text-sm font-semibold text-on-surface">English (UK)</span>
                    <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 bg-primary text-black rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-primary/30">
          <ShieldCheck className="w-12 h-12 opacity-20" />
          <div>
            <h3 className="serif-text text-4xl font-bold mb-2">842</h3>
            <p className="text-sm opacity-80 uppercase tracking-widest font-bold">Tasks Curated</p>
          </div>
          <div className="mt-8">
            <p className="text-xs leading-relaxed opacity-70">Your editorial streak is in the top 5% of users this month. Maintain the sanctuary.</p>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-8 glass-card rounded-3xl p-8 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform border border-white/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="serif-text text-xl font-semibold text-on-surface">Security & Authentication</h3>
              <p className="text-sm text-on-surface-variant opacity-70">Manage passwords, MFA, and active sessions.</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-on-surface-variant -rotate-90 group-hover:translate-x-2 transition-transform" />
        </section>
      </div>

      <footer className="mt-20 flex justify-between items-center text-on-surface-variant opacity-40 text-[10px] uppercase tracking-[0.3em] font-bold">
        <span>TaskFlow v4.2.0 Sanctuary Edition</span>
        <span>{user ? 'Synchronized with Firebase' : 'All modifications saved locally.'}</span>
      </footer>
    </div>
  );
}


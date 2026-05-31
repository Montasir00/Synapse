import {
  LayoutDashboard,
  CheckCircle2,
  CreditCard,
  Coins,
  Dumbbell,
  LineChart,
  Settings,
  LogOut,
  BrainCircuit
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'loans', label: 'Loans', icon: Coins },
  { id: 'exercises', label: 'Exercises', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trade Tracker', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  return (
    <aside
      className="hidden lg:flex h-screen w-64 fixed left-0 top-0 glass-surface border-r border-border/30 flex-col py-6 z-[70]"
    >
        {/* Logo + Wordmark */}
        <div className="px-5 mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(99,102,241,0.1)] shrink-0">
            <BrainCircuit className="w-4.5 h-4.5 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-display font-black text-ink tracking-tight block leading-none">Synapse</span>
            <span className="text-[10px] text-muted/50 font-medium tracking-wide">Neural OS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg ${
                  isActive ? 'text-ink' : 'text-muted hover:text-ink/80'
                }`}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-accent/10 shadow-[0_0_20px_rgba(var(--accent-rgb),0.08)] border border-accent/25 rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 transition-colors duration-150 shrink-0 relative z-10 ${
                    isActive ? 'text-accent' : 'text-muted group-hover:text-ink'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-5 mt-4 pt-4 border-t border-border/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
                <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=synapse`}
                alt={user?.displayName || 'User avatar'}
                width={36}
                height={36}
                  className="w-9 h-9 rounded-full border border-border/40 object-cover grayscale hover:grayscale-0 transition-all duration-300"
                referrerPolicy="no-referrer"
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg transition-all duration-500 ${
                  user 
                    ? 'bg-success shadow-[0_0_8px_rgba(0,212,170,0.6)] animate-pulse' 
                    : 'bg-muted/40 shadow-none'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-ink text-xs font-semibold tracking-tight truncate">
                  {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
                </p>
                <div aria-live="polite" aria-atomic="true" className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${user ? 'bg-success/10 border-success/20' : 'bg-muted/10 border-border/40'}`}>
                  <div className={`w-1 h-1 rounded-full animate-pulse ${user ? 'bg-success shadow-[0_0_8px_rgba(0,212,170,0.4)]' : 'bg-muted/40 shadow-none'}`} />
                  <span className={`text-[10px] font-semibold ${user ? 'text-success' : 'text-muted'}`}>
                    {user ? 'Synced' : 'Local'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-muted/70 truncate tracking-wide mt-0.5">{user ? 'Cloud Sync Mode' : 'Local Data Mode'}</p>
            </div>
          </div>

          {user && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted hover:text-alert hover:bg-alert/5 rounded-full border border-transparent hover:border-alert/10 transition-all group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert/50"
              aria-label="Securely sign out of current session"
            >
              <LogOut className="w-3.5 h-3.5 transition-colors group-hover:text-alert shrink-0" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold">Sign Out</span>
            </button>
          )}
        </div>
      </aside>
  );
}

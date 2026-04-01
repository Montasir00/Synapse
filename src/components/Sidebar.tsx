import {
  LayoutDashboard,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  LineChart,
  Settings,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'exercises', label: 'Exercises', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trade Tracker', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, user, onLogout }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`h-screen w-64 fixed left-0 top-0 glass-surface border-r border-white/[0.06] flex flex-col py-6 z-[70] transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-6 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-black text-ink tracking-tighter uppercase">Task<span className="text-accent ring-accent/30 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">OS</span></h1>
            <p className="micro-label mt-0.5 opacity-40">Calm Futuristic v1</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-muted hover:text-ink transition-colors hover:bg-white/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
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
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 group relative ${
                  isActive
                    ? 'text-ink bg-accent/5 shadow-[0_0_20px_rgba(99,102,241,0.06)] border border-accent/20'
                    : 'text-muted hover:text-ink/80 hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 transition-colors duration-150 shrink-0 ${
                    isActive ? 'text-accent' : 'text-muted group-hover:text-ink'
                  }`}
                />
                <span className="text-[11px] uppercase tracking-[0.1em] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-5 mt-4 pt-4 border-t border-white/[0.05] space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=taskos`}
                alt="User"
                className="w-9 h-9 rounded-full border border-white/10 object-cover grayscale hover:grayscale-0 transition-all duration-300"
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
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${user ? 'bg-success/10 border-success/20' : 'bg-muted/10 border-white/10'}`}>
                  <div className={`w-1 h-1 rounded-full animate-pulse ${user ? 'bg-success shadow-[0_0_8px_rgba(0,212,170,0.4)]' : 'bg-muted/40 shadow-none'}`} />
                  <span className={`text-[7px] font-black uppercase tracking-widest ${user ? 'text-success' : 'text-muted'}`}>
                    {user ? 'Synced' : 'Local'}
                  </span>
                </div>
              </div>
              <p className="micro-label opacity-60 truncate">{user ? 'Cloud Sync Mode' : 'Local Data Mode'}</p>
            </div>
          </div>

          {user && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted hover:text-alert hover:bg-alert/5 rounded-full border border-transparent hover:border-alert/10 transition-all group text-left"
            >
              <LogOut className="w-3.5 h-3.5 transition-colors group-hover:text-alert shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold">Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

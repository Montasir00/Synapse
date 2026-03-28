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

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, user, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'expenses', label: 'Expenses', icon: CreditCard },
    { id: 'exercises', label: 'Exercises', icon: Dumbbell },
    { id: 'trade-tracker', label: 'Trade Tracker', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`h-screen w-64 fixed left-0 top-0 glass-surface border-r border-white/5 flex flex-col py-8 z-[70] transition-transform duration-500 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-8 mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif italic text-ink tracking-tight">TaskFlow</h1>
            <p className="micro-label mt-1">Editorial Sanctuary</p>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden text-muted hover:text-ink transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1">
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
                className={`w-full flex items-center gap-3 px-8 py-3.5 transition-all duration-300 group relative ${
                  isActive 
                    ? 'text-ink bg-white/5' 
                    : 'text-muted hover:text-ink hover:bg-white/[0.02]'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-6 bg-accent rounded-r-full" 
                  />
                )}
                <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-accent' : 'group-hover:text-ink'}`} />
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-6 mt-auto space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/user/200/200"} 
                alt="User profile" 
                className="w-10 h-10 rounded-full border border-white/10 object-cover grayscale hover:grayscale-0 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${user ? 'bg-success' : 'bg-alert'} border-2 border-bg rounded-full`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-xs font-semibold tracking-tight truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
              </p>
              <p className="micro-label !opacity-40 truncate">{user ? 'Cloud Sync Active' : 'Local Only'}</p>
            </div>
          </div>
          
          {user && (
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-muted hover:text-alert hover:bg-alert/5 rounded-xl transition-all group"
            >
              <LogOut className="w-4 h-4 transition-colors group-hover:text-alert" />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold">Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

import { LayoutDashboard, CheckCircle2, CreditCard, Dumbbell, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onMenuClick: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Finances', icon: CreditCard },
  { id: 'exercises', label: 'Exercise', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trades', icon: LineChart },
  { id: 'system', label: 'System', icon: LayoutDashboard }, // Placeholder for system toggle
];

export default function MobileNav({ activeTab, setActiveTab, onMenuClick }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-surface-dark/90 backdrop-blur-3xl border border-white/5 px-6 pt-3 pb-3 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] mx-6 mb-6 rounded-full pill-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.id === 'system') {
            return (
              <button
                key="system"
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center gap-1.5 flex-1 h-14 opacity-40 hover:opacity-100 transition-all"
              >
                <Icon className="w-5 h-5 text-muted" />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted/30">Menu</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-14 transition-all duration-300"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-x-1 inset-y-1 bg-accent/20 rounded-full border border-accent/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={`relative z-10 transition-all duration-300 ${
                  isActive ? 'text-accent scale-110 w-6 h-6 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-muted/40 w-5 h-5'
                }`}
              />
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="relative z-10 text-[9px] font-extrabold uppercase tracking-[0.12em] text-accent mt-0.5"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
